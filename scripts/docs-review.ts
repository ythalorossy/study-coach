// Checks fact sheets against the pages they cite, one FactSheetReviewer run per
// skill, and writes the bullets that look wrong for a person to confirm.
//
// Usage: npm run docs:review -- --skill <id> | --area <prefix> | --all  [flags]
//   --sheets <dir>  read sheets from another folder (default content/fact-sheets)
//   --parallel <n>  skills at once (default GENERATE_PARALLEL or 6)
//
// Reads:  content/fact-sheets/, data/docs/ (pages not there are read live from Learn)
// Writes: data/review/fact-check/<skill>.json and .md
// Needs:  API key in .env (uses model quota); REVIEWER_MODEL picks the model
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import type { SourcePage } from "../src/agents/fact-sheet-writer.ts";
import { readDoc } from "../src/coach/docs/corpus.ts";
import { openCoachDb, type CoachDb } from "../src/coach/db.ts";
import { FACT_CHECK_ROOT, type FactCheckResult, formatFactCheck, sheetBody } from "../src/coach/docs/fact-check.ts";
import { skillDocUrls } from "../src/coach/docs/fact-sheets.ts";
import { SKILLS } from "../src/coach/exam/seed.ts";
import { classifyProviderFailure, ProviderFailure, runFlue, runScheduled } from "./flue-jobs.ts";

const SOURCES_DIR = "./data/fact-sheet-sources";

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

async function main(): Promise<void> {
	const { values } = parseArgs({
		options: { skill: { type: "string" }, area: { type: "string" }, all: { type: "boolean", default: false }, sheets: { type: "string" }, parallel: { type: "string" } },
	});
	const skillIds = SKILLS.map(([id]) => id);
	if (values.skill && !skillIds.includes(values.skill)) {
		console.error(`Unknown skill ${values.skill}. Known skills: ${skillIds.join(", ")}`);
		process.exit(1);
	}
	if (!values.skill && !values.area && !values.all) {
		console.error("Choose --skill <id>, --area <prefix> or --all.");
		process.exit(1);
	}
	const selected = skillIds.filter((id) => (values.skill ? id === values.skill : values.area ? id.startsWith(values.area) : true));
	const parallel = Number(values.parallel ?? process.env.GENERATE_PARALLEL ?? 6);
	const db = openCoachDb(process.env.COACH_DB_PATH ?? "./data/coach.db");
	mkdirSync(SOURCES_DIR, { recursive: true });
	mkdirSync(FACT_CHECK_ROOT, { recursive: true });
	const results = new Map<string, string>();
	let providerError: string | undefined;
	try {
		await runScheduled(
			selected.map((skillId) => ({ lane: skillId, skillId })),
			{
				parallel,
				onSlowdown: (from, to) => console.warn(`Rate limit hit: parallel ${from} → ${to}`),
				async run({ skillId }) {
					const body = sheetBody(skillId, values.sheets);
					const pages = await readPages(db, skillId);
					if (!body || !pages.length) {
						results.set(skillId, !body ? "no sheet" : "no pages could be read");
						return;
					}
					const sourcesPath = join(SOURCES_DIR, `${skillId}.review.json`);
					writeFileSync(sourcesPath, JSON.stringify(pages));
					const outPath = join(FACT_CHECK_ROOT, `${skillId}.json`);
					const startedAt = Date.now();
					const child = await runFlue("src/agents/fact-sheet-reviewer.ts", `review-${skillId}-${startedAt}`, { skillId, sheetBody: body, sourcesPath, outPath }, "Check the fact sheet.");
					if (child.status !== 0) {
						const provider = classifyProviderFailure(`${child.stdout}\n${child.stderr}`);
						if (provider) throw new ProviderFailure(`review-${skillId}: provider failure, ${provider}`, provider);
						process.stderr.write(child.stderr);
					}
					const fresh = existsSync(outPath) && (JSON.parse(readFileSync(outPath, "utf8")) as FactCheckResult).checked >= new Date(startedAt).toISOString();
					if (!fresh) {
						results.set(skillId, "failed (no findings saved)");
						return;
					}
					const result = JSON.parse(readFileSync(outPath, "utf8")) as FactCheckResult;
					writeFileSync(join(FACT_CHECK_ROOT, `${skillId}.md`), formatFactCheck(result));
					results.set(skillId, `${result.findings.length} to look at of ${result.bullets} bullets`);
					console.log(`${skillId}: ${results.get(skillId)}`);
				},
			},
		);
	} catch (e) {
		if (!(e instanceof ProviderFailure)) throw e;
		providerError = e.message;
	}
	console.log("\nSummary:");
	for (const skillId of selected) console.log(`${skillId}: ${results.get(skillId) ?? "not run"}`);
	console.log(`\nWorksheets in ${FACT_CHECK_ROOT}/`);
	if (providerError) {
		console.error(`\nStopping: ${providerError}. Fix the provider (quota, key) and rerun.`);
		process.exitCode = 2;
	}
}

if (import.meta.main) await main();
