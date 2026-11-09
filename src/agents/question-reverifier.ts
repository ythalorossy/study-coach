'use agent';
// Answers a batch of stored questions blind, from one skill's fact sheet only. `npm run questions:reverify`
// writes the questions (without keys) to a file first and compares the answers with the keys afterwards.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { defineTool, useInitialData, useModel, useTool } from "@flue/runtime";
import type { AgentProps } from "@flue/runtime";
import * as v from "valibot";
import { modelFor } from "../coach/models.ts";
import { buildReverifyPrompt, type Answer } from "../coach/questions/reverify.ts";
import type { QuestionBody } from "../coach/questions/question-schema.ts";

const MAX_ATTEMPTS = 3;

const Init = v.object({ sheetBody: v.string(), questionsPath: v.string(), outPath: v.string() });
type Init = v.InferOutput<typeof Init>;

export interface SubmitDeps {
	ids: string[];
	outPath: string;
	attempts: { n: number };
}

export function makeSubmitAnswersTool(deps: SubmitDeps) {
	return defineTool({
		name: "submit_answers",
		description: "Submit one answer per question. Returns { saved: true } or { saved: false, problems }.",
		input: v.object({ answers: v.array(v.object({ id: v.string(), answer: v.record(v.string(), v.string()) })) }),
		run({ data }) {
			deps.attempts.n++;
			const answers: Answer[] = data.answers;
			const got = new Set(answers.map((a) => a.id));
			const missing = deps.ids.filter((id) => !got.has(id));
			if (missing.length && deps.attempts.n < MAX_ATTEMPTS) {
				return { output: { saved: false, problems: [`no answer for: ${missing.join(", ")}`], attemptsLeft: MAX_ATTEMPTS - deps.attempts.n } };
			}
			mkdirSync(dirname(deps.outPath), { recursive: true });
			writeFileSync(deps.outPath, JSON.stringify(answers.filter((a) => deps.ids.includes(a.id)), null, 2));
			return { output: { saved: true }, terminate: true };
		},
	});
}

// One `flue run` process per batch, so attempts are counted per instance id.
const attemptsByRun = new Map<string, { n: number }>();

export function QuestionReverifier(props: AgentProps) {
	useModel(modelFor("verifier"));
	const init = useInitialData<Init>();
	const questions = JSON.parse(readFileSync(init.questionsPath, "utf8")) as { id: string; body: QuestionBody }[];
	let attempts = attemptsByRun.get(props.id);
	if (!attempts) attemptsByRun.set(props.id, (attempts = { n: 0 }));
	useTool(makeSubmitAnswersTool({ ids: questions.map((q) => q.id), outPath: init.outPath, attempts }));
	return buildReverifyPrompt(init.sheetBody, questions);
}
QuestionReverifier.agentName = "question-reverifier";
QuestionReverifier.initialData = Init;
QuestionReverifier.durability = { timeoutMs: 900_000 };
