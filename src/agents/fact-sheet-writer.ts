'use agent';
// Writes one skill's fact sheet from its documentation pages. `npm run docs:sheets`
// reads the pages (local or live) into a sources file first, because agent
// functions are synchronous.
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { defineTool, useInitialData, useModel, useTool } from "@flue/runtime";
import type { AgentProps } from "@flue/runtime";
import * as v from "valibot";
import { DOCS_ROOT } from "../coach/corpus.ts";
import {
	FACT_SHEETS_ROOT,
	formatFactSheet,
	skillDocUrls,
	sourceHash,
	validateFactSheetBody,
} from "../coach/fact-sheets.ts";
import { modelFor } from "../coach/models.ts";
import { SKILLS } from "../coach/seed.ts";

export const FACT_SHEET_LOG_PATH = "./data/fact-sheet-log.jsonl";

const MAX_ATTEMPTS = 3;

const SheetInit = v.object({ skillId: v.string(), sourcesPath: v.string() });
type SheetInit = v.InferOutput<typeof SheetInit>;

export interface SourcePage {
	url: string;
	markdown: string;
}

function skillName(skillId: string): string {
	const skill = SKILLS.find(([id]) => id === skillId);
	if (!skill) throw new Error(`Unknown skill ${skillId}`);
	return skill[2];
}

export function factSheetInstructions(skillId: string, pages: SourcePage[]): string {
	return `You write a fact sheet for one AZ-104 exam skill: "${skillName(skillId)}" (${skillId}).

A learner reads it to revise, and a question writer uses it as its only documentation, so it must hold every fact an exam question on this skill could need: the settings, limits, comparisons and which-one-to-use points the exam tests.

Rules:
- Use exactly these sections, as ## headings, in this order: ## Key concepts, ## Settings and limits, ## Compare and choose, ## Gotchas. No other headings.
- Every fact is one bullet ("- "). Every bullet ends with a link to the page it came from, written as ([Learn](<page URL>)). Use only these page URLs:
${pages.map((p) => `  - ${p.url}`).join("\n")}
- Write in your own words; never copy a sentence or a long phrase from the pages. Keep the exact names of products, roles, settings and values, and mark them: portal labels and setting names in **bold**, commands, permissions and code in \`code\`.
- Be specific: numbers, defaults, scopes, who can do what, and what happens when settings combine.
- At least 10 bullets. Aim for 8,000 to 13,000 characters; the limit is 16,000.
- Submit the sheet with save_fact_sheet as { "body": "<the sections>" }. If it reports problems, fix them and submit again; you have ${MAX_ATTEMPTS} attempts.

Documentation pages:

${pages.map((p, i) => `--- Page ${i + 1}: ${p.url}\n${p.markdown}`).join("\n\n")}

Your messages are not shown to anyone; only the saved sheet matters.`;
}

export interface SaveFactSheetDeps {
	skillId: string;
	root: string;
	docsRoot: string;
	pages: SourcePage[];
	/** Attempts so far in this run. */
	attempts: { n: number };
	now: () => Date;
	logPath: string;
}

function appendLog(path: string, entry: Record<string, unknown>): void {
	mkdirSync(dirname(path), { recursive: true });
	appendFileSync(path, `${JSON.stringify(entry)}\n`);
}

export function makeSaveFactSheetTool(deps: SaveFactSheetDeps) {
	return defineTool({
		name: "save_fact_sheet",
		description: "Submit the finished fact sheet body. Returns { saved: true } or { saved: false, problems }.",
		input: v.object({ body: v.string() }),
		run({ data }) {
			deps.attempts.n++;
			const problems = validateFactSheetBody(data.body, {
				allowedUrls: skillDocUrls(deps.skillId),
				sourceTexts: deps.pages.map((p) => p.markdown),
			});
			const entry = { ts: deps.now().toISOString(), skillId: deps.skillId, attempt: deps.attempts.n };
			if (problems.length) {
				appendLog(deps.logPath, { ...entry, saved: false, problems });
				const attemptsLeft = MAX_ATTEMPTS - deps.attempts.n;
				if (attemptsLeft <= 0) return { output: { saved: false, problems, gaveUp: true }, terminate: true };
				return { output: { saved: false, problems, attemptsLeft } };
			}
			const body = `# ${skillName(deps.skillId)}\n\n${data.body.trim()}`;
			const sheet = { skillId: deps.skillId, sources: sourceHash(deps.skillId, deps.docsRoot), built: entry.ts, body };
			mkdirSync(deps.root, { recursive: true });
			writeFileSync(join(deps.root, `${deps.skillId}.md`), formatFactSheet(sheet));
			appendLog(deps.logPath, { ...entry, saved: true });
			return { output: { saved: true }, terminate: true };
		},
	});
}

// One `flue run` process per sheet, so attempts are counted per instance id.
const attemptsByRun = new Map<string, { n: number }>();

export function FactSheetWriter(props: AgentProps) {
	useModel(modelFor("sheet"));
	const init = useInitialData<SheetInit>();
	const pages = JSON.parse(readFileSync(init.sourcesPath, "utf8")) as SourcePage[];
	let attempts = attemptsByRun.get(props.id);
	if (!attempts) attemptsByRun.set(props.id, (attempts = { n: 0 }));
	useTool(
		makeSaveFactSheetTool({
			skillId: init.skillId,
			root: FACT_SHEETS_ROOT,
			docsRoot: DOCS_ROOT,
			pages,
			attempts,
			now: () => new Date(),
			logPath: FACT_SHEET_LOG_PATH,
		}),
	);
	return factSheetInstructions(init.skillId, pages);
}
FactSheetWriter.agentName = "fact-sheet-writer";
FactSheetWriter.initialData = SheetInit;
FactSheetWriter.durability = { timeoutMs: 900_000 };
