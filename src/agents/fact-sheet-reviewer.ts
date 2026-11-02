'use agent';
// Checks one fact sheet against the pages it cites and reports the bullets that
// look wrong. `npm run docs:review` writes the pages to a sources file first.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { defineTool, useInitialData, useModel, useTool } from "@flue/runtime";
import type { AgentProps } from "@flue/runtime";
import * as v from "valibot";
import { type FactCheckResult, type Finding, sheetBullets, validateFindings } from "../coach/docs/fact-check.ts";
import { modelFor } from "../coach/models.ts";
import type { SourcePage } from "./fact-sheet-writer.ts";

const MAX_ATTEMPTS = 3;

const ReviewInit = v.object({ skillId: v.string(), sheetBody: v.string(), sourcesPath: v.string(), outPath: v.string() });
type ReviewInit = v.InferOutput<typeof ReviewInit>;

export function reviewerInstructions(sheetBody: string, pages: SourcePage[]): string {
	return `You fact-check one study fact sheet against the Microsoft documentation pages it cites. A person will confirm what you report, so report only what you can point to.

Check each bullet against the page its link names. Report a bullet when:
- contradicted: the page says something different (a number, limit, default, name, role, scope, order, or an absolute such as "only" or "never");
- unsupported: the page does not say it at all.

Do not report style, wording, missing facts, or bullets that are accurate paraphrases. Bold and code marks are formatting. A bullet whose link is not in the page list below cannot be checked: skip it.

Submit with report_findings as { "findings": [ ... ] }, an empty list if every checkable bullet holds. Each finding:
{ "bullet": "<the first 60 or more characters of the bullet, copied exactly from the sheet>", "verdict": "contradicted" | "unsupported", "pageUrl": "<the page the bullet links to>", "evidence": "<for contradicted: the passage from the page that disagrees, copied exactly; for unsupported: empty>", "explanation": "<one sentence>" }
If it reports problems, fix them and submit again; you have ${MAX_ATTEMPTS} attempts.

Fact sheet:

${sheetBody}

Documentation pages:

${pages.map((p, i) => `--- Page ${i + 1}: ${p.url}\n${p.markdown}`).join("\n\n")}

Your messages are not shown to anyone; only the submitted findings matter.`;
}

const FindingShape = v.object({
	bullet: v.string(),
	verdict: v.picklist(["contradicted", "unsupported"]),
	pageUrl: v.string(),
	evidence: v.string(),
	explanation: v.string(),
});

export interface ReportDeps {
	skillId: string;
	model: string;
	sheetBody: string;
	pages: SourcePage[];
	outPath: string;
	attempts: { n: number };
	now: () => Date;
}

export function makeReportFindingsTool(deps: ReportDeps) {
	return defineTool({
		name: "report_findings",
		description: "Submit the bullets that look wrong. Returns { saved: true } or { saved: false, problems }.",
		input: v.object({ findings: v.array(FindingShape) }),
		run({ data }) {
			deps.attempts.n++;
			const findings: Finding[] = data.findings;
			const problems = validateFindings(findings, deps.sheetBody, deps.pages);
			if (problems.length && deps.attempts.n < MAX_ATTEMPTS) return { output: { saved: false, problems, attemptsLeft: MAX_ATTEMPTS - deps.attempts.n } };
			// On the last attempt keep only the findings that quote real text.
			const kept = problems.length ? findings.filter((f) => validateFindings([f], deps.sheetBody, deps.pages).length === 0) : findings;
			const result: FactCheckResult = {
				skillId: deps.skillId,
				model: deps.model,
				bullets: sheetBullets(deps.sheetBody).length,
				findings: kept,
				checked: deps.now().toISOString(),
			};
			mkdirSync(dirname(deps.outPath), { recursive: true });
			writeFileSync(deps.outPath, JSON.stringify(result, null, 2));
			return { output: { saved: true }, terminate: true };
		},
	});
}

// One `flue run` process per sheet, so attempts are counted per instance id.
const attemptsByRun = new Map<string, { n: number }>();

export function FactSheetReviewer(props: AgentProps) {
	const model = modelFor("reviewer");
	useModel(model);
	const init = useInitialData<ReviewInit>();
	const pages = JSON.parse(readFileSync(init.sourcesPath, "utf8")) as SourcePage[];
	let attempts = attemptsByRun.get(props.id);
	if (!attempts) attemptsByRun.set(props.id, (attempts = { n: 0 }));
	useTool(makeReportFindingsTool({ skillId: init.skillId, model, sheetBody: init.sheetBody, pages, outPath: init.outPath, attempts, now: () => new Date() }));
	return reviewerInstructions(init.sheetBody, pages);
}
FactSheetReviewer.agentName = "fact-sheet-reviewer";
FactSheetReviewer.initialData = ReviewInit;
FactSheetReviewer.durability = { timeoutMs: 900_000 };
