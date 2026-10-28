'use agent';
// Writes original AZ-104-style questions for one skill and format. Every candidate
// goes through admitQuestion; the verifier runs in the harness's scratch
// conversation and sees only buildVerifierPrompt (never the key or explanation).
import { AsyncLocalStorage } from "node:async_hooks";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { defineTool, useInitialData, useModel, usePersistentState, useTool } from "@flue/runtime";
import type { AgentProps, FlueHarness } from "@flue/runtime";
import * as v from "valibot";
import { admitQuestion, buildVerifierPrompt, type AdmitDeps, type AdmitResult } from "../coach/admit.ts";
import { getCoachDb, type CoachDb } from "../coach/db.ts";
import { modelFor } from "../coach/models.ts";
import { readDoc } from "../coach/corpus.ts";
import { areaName, areaOfSkill } from "../coach/instructors.ts";
import { readFactSheet, skillDocUrls } from "../coach/fact-sheets.ts";
import { CandidateQuestionSchema, responseSchemaFor, type CandidateQuestion } from "../coach/question-schema.ts";
import { listSkillCandidates } from "../coach/questions.ts";
import { SKILLS } from "../coach/seed.ts";
import type { QuestionFormat } from "../coach/types.ts";
import { makeReadMsDocsTool } from "../tools/read-ms-docs.ts";
import { recordUsage } from "../coach/usage-log.ts";

export const GENERATE_LOG_PATH = "./data/generate-log.jsonl";

// Token usage per model call, for comparing writer models (`flue run` loads only this module).
recordUsage();

const WriterInit = v.object({
	skillId: v.string(),
	format: v.picklist(["multiple-choice", "drag-drop", "complete-sentence"]),
	count: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(10)),
});
export type WriterInit = v.InferOutput<typeof WriterInit>;

export interface SaveQuestionDeps {
	init: WriterInit;
	/** The instance id, recorded in the log so generate.ts can find this batch's results. */
	runId: string;
	getDb: () => CoachDb;
	fetchDoc: AdmitDeps["fetchDoc"];
	/** The current totals, read at call time. */
	totals: () => Totals;
	/** Counts one attempt (and one save when saved) and returns the new totals. */
	record: (saved: boolean) => Totals;
	logPath: string;
	/** The skill's fact sheet; when present the verifier answers from it instead of the cited pages. */
	factSheet?: { skillId: string; body: string };
}

type Totals = { saved: number; attempts: number };

// The verifier's scratch conversation inherits this agent's instructions and
// tools (Flue passes the session's config and agentTools to the action harness),
// so every writer tool refuses to run inside a verification.
const verification = new AsyncLocalStorage<true>();

function refuseDuringVerification(tool: string): void {
	if (verification.getStore()) {
		throw new Error(`${tool} is not available during verification: answer from the documentation in the prompt only.`);
	}
}

/** A Learn page's path without locale, query, hash or trailing slash, for comparing citations. */
function learnPageKey(url: string): string {
	try {
		const u = new URL(url);
		return `${u.hostname}${u.pathname.replace(/^\/[a-z]{2}-[a-z]{2}\//, "/").replace(/\/$/, "")}`;
	} catch {
		return url;
	}
}

// One admission at a time per run, so parallel calls see each other's saves.
const lanes = new Map<string, Promise<unknown>>();

function inLane<T>(runId: string, task: () => Promise<T>): Promise<T> {
	const next = (lanes.get(runId) ?? Promise.resolve()).then(task);
	const tail = next.catch(() => {});
	lanes.set(runId, tail);
	void tail.then(() => {
		if (lanes.get(runId) === tail) lanes.delete(runId);
	});
	return next;
}

function appendLog(path: string, entry: Record<string, unknown>): void {
	mkdirSync(dirname(path), { recursive: true });
	appendFileSync(path, `${JSON.stringify(entry)}\n`);
}

export function makeSaveQuestionTool(deps: SaveQuestionDeps) {
	const { init } = deps;
	const done = (t: Totals) => t.saved >= init.count || t.attempts >= 3 * init.count;

	async function admit(data: CandidateQuestion, harness: FlueHarness): Promise<AdmitResult> {
		if (data.skillId !== init.skillId || data.body.format !== init.format) {
			return {
				saved: false,
				reason: "invalid",
				detail: `off-target: this run writes ${init.format} questions for ${init.skillId}, got ${data.body.format} for ${data.skillId}`,
			};
		}
		const sheet = deps.factSheet;
		if (sheet) {
			// The verifier reads only the sheet, so sources must be pages the sheet links.
			const allowed = new Set(skillDocUrls(sheet.skillId).map(learnPageKey));
			const outside = data.sources.map((s) => s.url).filter((u) => !allowed.has(learnPageKey(u)));
			if (outside.length) {
				return {
					saved: false,
					reason: "invalid",
					detail: `sources must be pages the fact sheet links; not linked: ${outside.join(", ")}`,
				};
			}
		}
		return admitQuestion(deps.getDb(), data, {
			fetchDoc: deps.fetchDoc,
			verifierDocs: sheet ? [{ url: `fact sheet for ${sheet.skillId}`, text: sheet.body }] : undefined,
			verify: async (input) => {
				const prompt = buildVerifierPrompt(input);
				const result = responseSchemaFor(input.body.format);
				const model = modelFor("verifier");
				return (await verification.run(true, () => harness.prompt(prompt, { result, model }))).data;
			},
		});
	}

	return defineTool({
		name: "save_question",
		description:
			"Submit one finished question. It is validated, checked for duplicates, its sources are fetched, and an independent verifier answers it from those sources alone. Returns { saved: true, id } or { saved: false, reason, detail }.",
		input: CandidateQuestionSchema,
		harness: true,
		run({ data, harness }) {
			refuseDuringVerification("save_question");
			return inLane(deps.runId, async () => {
				const before = deps.totals();
				// Calls after done (or queued behind the call that finished) admit nothing.
				if (done(before)) return { output: { done: true, ...before }, terminate: true };
				const result = await admit(data, harness);
				appendLog(deps.logPath, {
					ts: new Date().toISOString(),
					runId: deps.runId,
					skillId: data.skillId,
					format: data.body.format,
					...result,
				});
				const totals = deps.record(result.saved);
				if (done(totals)) return { output: { done: true, ...totals }, terminate: true };
				return { output: result };
			});
		},
	});
}

const SHAPES: Record<QuestionFormat, string> = {
	"multiple-choice": `body: {
  "format": "multiple-choice",
  "stem": string,
  "exhibit"?: Exhibit,
  "options": [{ "id": string, "text": string }]   // exactly 4 options, single correct answer
}
key: { "optionId": "<id of the one correct option>" }
explanation: {
  "correct": "why the keyed option is right",
  "perChoice": { "<option id>": "why this option is wrong" }   // one entry for every option except the key
}`,
	"drag-drop": `body: {
  "format": "drag-drop",
  "stem": string,
  "exhibit"?: Exhibit,
  "items": [{ "id": string, "text": string }],   // 2 to 8 draggable items
  "slots": [{ "id": string, "label": string }]   // 2 to 6 targets, never more slots than items
}
key: { "<slot id>": "<item id>", ... }   // every slot exactly once, each item used at most once
explanation: {
  "correct": "why the keyed placement is right",
  "perChoice": { "<item id>": "where this item belongs, or why it fits no slot" }   // one entry for every item id
}`,
	"complete-sentence": `body: {
  "format": "complete-sentence",
  "stem": string,
  "exhibit"?: Exhibit,
  "statement": "a sentence with one {{slotId}} marker per slot",   // each slot id appears exactly once
  "slots": [{ "id": string, "options": [{ "id": string, "text": string }] }]   // 1 to 3 slots, 2 to 4 options each
}
key: { "<slot id>": "<option id>", ... }   // every slot exactly once
explanation: {
  "correct": "why the keyed completion is right",
  "perChoice": { "<slot id>:<option id>": "why this option is wrong in this slot" }   // one entry for every option that is not its slot's key
}`,
};

const EXHIBIT_RULE: Record<QuestionFormat, string> = {
	"multiple-choice":
		"At least half of the questions you save carry an exhibit (a table or code block) holding configuration, state, assignments or command output that the learner must interpret to reach the answer.",
	"drag-drop": "Use an exhibit (a table or code block) where that is natural.",
	"complete-sentence": "Use an exhibit (a table or code block) where that is natural.",
};

const LEAK_RULE: Record<QuestionFormat, string> = {
	"multiple-choice":
		"a word in the correct option that no wrong option uses must not appear in the stem or the exhibit. An exhibit that lists every option alike (for example all four accounts) is fine.",
	"drag-drop": "a word that only an item uses must not appear in the label of the slot that item belongs to.",
	"complete-sentence":
		"for each slot, a word in the keyed option that the slot's other options do not use must not appear in the stem, the exhibit or the statement.",
};

const EXHIBIT_SHAPE = `Exhibit (optional) is either
  { "kind": "table", "columns": [string], "rows": [[string]] }
or
  { "kind": "code", "language": "powershell" | "bash" | "json" | "text", "text": string }`;

export interface WriterContext {
	/** The skill's fact sheet body; when present it replaces reading the doc URLs. */
	factSheet?: string;
	/** Stems already in the bank, listed inline instead of calling list_existing. */
	existingStems?: string[];
}

export function writerInstructions(init: WriterInit, ctx: WriterContext = {}): string {
	const skill = SKILLS.find(([id]) => id === init.skillId);
	if (!skill) throw new Error(`Unknown skill ${init.skillId}`);
	const [skillId, , name, docUrls] = skill;
	const max = 3 * init.count;
	const sheet = ctx.factSheet;
	const stems = ctx.existingStems ?? [];
	const documentation = sheet
		? `Fact sheet for this skill (your documentation):\n${sheet}`
		: `Documentation for this skill:\n${docUrls.map((u) => `- ${u}`).join("\n")}`;
	const readStep = sheet
		? "1. Use the fact sheet above as your documentation. Read a page with read_ms_docs only when the sheet lacks a detail you need."
		: "1. Read the skill's doc URLs first with read_ms_docs, before writing anything. You may read other https://learn.microsoft.com/ pages they link to.";
	const existingStep = !sheet
		? "2. Call list_existing and do not repeat or closely paraphrase any of its stems."
		: stems.length
			? `2. Do not repeat or closely paraphrase any of these existing stems:\n${stems.map((s) => `- ${s}`).join("\n")}`
			: "2. There are no questions for this skill yet.";
	const sourcesRule = sheet
		? "- Cite in sources the Learn pages the fact sheet links for the facts you used (1 to 4 https://learn.microsoft.com/ URLs). An independent verifier answers the question from the fact sheet alone, without the key, so the facts that decide the keyed answer must be in the sheet."
		: "- Cite the pages you used in sources (1 to 4 https://learn.microsoft.com/ URLs you actually read). An independent verifier answers the question from those pages alone, without the key, so the cited pages must contain everything needed to reach the keyed answer.";
	return `You write original practice questions for the AZ-104 exam, area "${areaName(areaOfSkill(skillId))}".

Skill: ${skillId} "${name}"
Format: ${init.format}
Questions to save: ${init.count}

${documentation}

Workflow:
${readStep}
${existingStep}
3. Write one question at a time and submit it with save_question. When ${init.count} are saved the tool reports done and the run ends.
4. On a saved: false result, read the reason and detail, then write a different question (a new scenario, not a small edit). Give up after ${max} attempts in total; the tool ends the run then.

Question rules:
- Write original questions in the pattern "You have… You need… Which… should you…?": a short scenario, a requirement, then the question.
- ${EXHIBIT_RULE[init.format]} The exhibit shows facts (settings and their values, assignments, object properties, command output), not conclusions: the learner applies what they know to those facts.
- Neither the stem nor the exhibit may state the answer, the rule that decides it, or the name or wording of the correct option. Synonyms of the correct option's name count as leaks too, including in exhibit titles and headings. State the requirement as a business goal or an observed symptom, never as a definition of the feature that meets it.
- Never quote documentation sentences, in the exhibit, the explanation or anywhere else: paraphrase in your own words.
- save_question rejects leaks mechanically (reason "leak"): ${LEAK_RULE[init.format]} Words are compared by stem, so invite, invitation and Inviter count as one word, and "sign-up" matches "sign up". The detail lists the offending words.
- Before each save_question, check the stem and exhibit against the key: if they repeat the correct choice's distinguishing words, or paraphrase what the correct option does, rewrite them first.
- The preferred fix is parallel distractors: write wrong choices that share the key's vocabulary (for example four "… Administrator" roles, or four settings from the same page), so the stem cannot be answered by matching a name. Parallel wording across choices is good exam style.
- Never replace a real Microsoft product, feature or role term with an invented synonym to get past the check. Use the exact names the documentation uses for roles, user types, settings and features, and make the wrong choices share them.
- ${init.format === "multiple-choice" ? "Four short options, exactly one correct." : "Keep every choice short."}
- Give a perChoice explanation for every wrong choice, following the coverage rule below.
- Explanations must be factually accurate and consistent with the documentation.
${sourcesRule}
- Never copy question text from any site. No exam dumps, no third-party question sites, and no text copied from any source: write every stem, option and explanation in your own words.

save_question input (JSON):
{
  "skillId": "${skillId}",
  "body": ...,
  "key": ...,
  "explanation": ...,
  "sources": [{ "url": "https://learn.microsoft.com/..." }],   // 1 to 4
  "subtopics": ["kebab-case-topic"]   // 1 to 3, lowercase words joined by hyphens
}

Arrays are plain JSON arrays, for example "options": [{ "id": "a", "text": "..." }, ...], never wrapped as {"item": [...]}. A table exhibit's rows are an array of arrays of strings, for example
  "exhibit": { "kind": "table", "columns": ["Property", "Value"], "rows": [["Invitation state", "Pending acceptance"], ["User type", "Guest"]] }

Shape of body, key and explanation for ${init.format}:
${SHAPES[init.format]}

${EXHIBIT_SHAPE}

Your messages are not shown to anyone; only saved questions matter.`;
}

export function makeReadDocsTool(getDb: () => CoachDb) {
	const tool = makeReadMsDocsTool(getDb);
	return defineTool({
		...tool,
		run(context) {
			refuseDuringVerification(tool.name);
			return tool.run(context);
		},
	});
}

export function makeListExistingTool(getDb: () => CoachDb, skillId: string) {
	return defineTool({
		name: "list_existing",
		description: "List the stems of every question already in the bank for this skill, to avoid repeats.",
		input: v.object({}),
		run() {
			refuseDuringVerification("list_existing");
			return { output: { stems: listSkillCandidates(getDb(), skillId).map((q) => q.body.stem) } };
		},
	});
}

const readDocsTool = makeReadDocsTool(getCoachDb);

export function QuestionWriter(props: AgentProps) {
	useModel(modelFor("writer"));
	const init = useInitialData<WriterInit>();
	const [, setSaved] = usePersistentState("saved", 0);
	const [, setAttempts] = usePersistentState("attempts", 0);
	const sheet = readFactSheet(init.skillId);
	const factSheet = sheet ? { skillId: init.skillId, body: sheet.body } : undefined;

	useTool(readDocsTool);
	useTool(makeListExistingTool(getCoachDb, init.skillId));
	useTool(
		makeSaveQuestionTool({
			init,
			runId: props.id,
			getDb: getCoachDb,
			fetchDoc: (url) => readDoc(getCoachDb(), url),
			// Updaters resolve at call time, so they read (and write) the latest values.
			totals() {
				const totals = { saved: 0, attempts: 0 };
				setAttempts((n) => (totals.attempts = n));
				setSaved((n) => (totals.saved = n));
				return totals;
			},
			record(saved) {
				const totals = { saved: 0, attempts: 0 };
				setAttempts((n) => (totals.attempts = n + 1));
				setSaved((n) => (totals.saved = saved ? n + 1 : n));
				return totals;
			},
			logPath: GENERATE_LOG_PATH,
			factSheet,
		}),
	);

	const existingStems = sheet ? listSkillCandidates(getCoachDb(), init.skillId).map((q) => q.body.stem) : undefined;
	return writerInstructions(init, { factSheet: sheet?.body, existingStems });
}
QuestionWriter.agentName = "question-writer";
QuestionWriter.initialData = WriterInit;
QuestionWriter.durability = { timeoutMs: 1_800_000 };
