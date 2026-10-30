// Builds the fact sheets that are missing or stale (or all with --all), one
// FactSheetWriter run per skill, several skills at once.
//
// Usage: npm run docs:sheets [-- <flags>]
//   --skill <id>    one skill only
//   --all           rebuild every sheet, not just missing or stale ones
//   --parallel <n>  skills at once (default GENERATE_PARALLEL or 6)
//
// Reads:  data/docs/ (from `npm run docs:sync`; pages not there are read live from Learn), data/coach.db (COACH_DB_PATH)
// Writes: content/fact-sheets/<skill>.md (committed), data/fact-sheet-sources/, data/fact-sheet-log.jsonl
// Needs:  API key in .env (uses model quota)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { FACT_SHEET_LOG_PATH, type SourcePage } from "../src/agents/fact-sheet-writer.ts";
import { readDoc } from "../src/coach/docs/corpus.ts";
import { openCoachDb, type CoachDb } from "../src/coach/db.ts";
import { factSheetStatus, readFactSheet, skillDocUrls } from "../src/coach/docs/fact-sheets.ts";
import { SKILLS } from "../src/coach/exam/seed.ts";
import { classifyProviderFailure, ProviderFailure, runFlue, runScheduled } from "./flue-jobs.ts";

const SOURCES_DIR = "./data/fact-sheet-sources";

// The skill's doc pages as markdown; a page that can't be read is skipped
async function readPages(db: CoachDb, skillId: string): Promise<SourcePage[]> {
	const pages: SourcePage[] = [];
	for (const url of skillDocUrls(skillId)) {
		try {
			pages.push({ url, markdown: (await readDoc(db, url)).text });
		} catch (e) {
			console.warn(`${skillId}: skipping ${url} (${e instanceof Error ? e.message : String(e)})`);
		}
	}
	return pages;
}

// Problems the writer logged on its latest attempt for this skill since `since`
function lastProblems(skillId: string, since: string): string[] {
	if (!existsSync(FACT_SHEET_LOG_PATH)) return [];
	const entries = readFileSync(FACT_SHEET_LOG_PATH, "utf8")
		.split("\n")
		.filter(Boolean)
		.map((l) => JSON.parse(l) as { ts: string; skillId: string; problems?: string[] })
		.filter((e) => e.skillId === skillId && e.ts >= since);
	return entries.at(-1)?.problems ?? [];
}

async function main(): Promise<void> {
	const { values } = parseArgs({
		options: {
			skill: { type: "string" },
			all: { type: "boolean", default: false },
			parallel: { type: "string" },
		},
	});
	const skillIds = SKILLS.map(([id]) => id);
	if (values.skill && !skillIds.includes(values.skill)) {
		console.error(`Unknown skill ${values.skill}. Known skills: ${skillIds.join(", ")}`);
		process.exit(1);
	}
	const parallel = Number(values.parallel ?? process.env.GENERATE_PARALLEL ?? 6);
	// Skills to build: the --skill one, and only missing/stale sheets unless --all
	const selected = skillIds
		.filter((id) => !values.skill || id === values.skill)
		.filter((id) => values.all || factSheetStatus(id) !== "fresh");
	if (!selected.length) {
		console.log("Every fact sheet is fresh. Use --all to rebuild them anyway.");
		return;
	}

	const db = openCoachDb(process.env.COACH_DB_PATH ?? "./data/coach.db");
	mkdirSync(SOURCES_DIR, { recursive: true });
	const results = new Map<string, string>(); // outcome line per skill
	const started = new Date().toISOString();
	let providerError: string | undefined;
	try {
		await runScheduled(
			selected.map((skillId) => ({ lane: skillId, skillId })), // one job per skill
			{
				parallel,
				onSlowdown: (from, to) => console.warn(`Rate limit hit: parallel ${from} → ${to}`),
				async run({ skillId }) {
					const pages = await readPages(db, skillId);
					if (!pages.length) {
						results.set(skillId, "failed (no pages could be read)");
						return;
					}
					// The writer reads the pages from a file, not from the prompt
					const sourcesPath = join(SOURCES_DIR, `${skillId}.json`);
					writeFileSync(sourcesPath, JSON.stringify(pages));
					console.log(`${skillId}: writing from ${pages.length} page(s)`);
					const runId = `sheet-${skillId}-${Date.now()}`;
					const child = await runFlue("src/agents/fact-sheet-writer.ts", runId, { skillId, sourcesPath }, "Write the fact sheet.");
					if (child.status !== 0) {
						// Quota/key/rate-limit errors stop or slow the whole run
						const provider = classifyProviderFailure(`${child.stdout}\n${child.stderr}`);
						if (provider) throw new ProviderFailure(`${runId}: provider failure, ${provider}`, provider);
						process.stderr.write(child.stderr);
					}
					// Saved in this run, not an older sheet still on disk.
					const saved = (readFactSheet(skillId)?.built ?? "") >= started;
					results.set(skillId, saved ? "saved" : `failed (${lastProblems(skillId, started).join("; ") || "no sheet saved"})`);
					console.log(`${skillId}: ${results.get(skillId)}`);
				},
			},
		);
	} catch (e) {
		if (!(e instanceof ProviderFailure)) throw e;
		providerError = e.message;
	}

	// Summary in plan order; skills never reached show as "not run"
	console.log("\nSummary:");
	for (const skillId of selected) console.log(`${skillId}: ${results.get(skillId) ?? "not run"}`);
	if (providerError) {
		console.error(`\nStopping: ${providerError}. Fix the provider (quota, key) and rerun.`);
		process.exitCode = 2;
	}
}

if (import.meta.main) await main();
