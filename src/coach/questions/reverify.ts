// Re-checks stored questions against a fact sheet: a blind model answers them from the sheet alone
// (no keys), and the answers are compared with the stored keys.
import { renderChoices, renderExhibit, responseShape } from "./admit.ts";
import { checkAnswer, type Key, type QuestionBody } from "./question-schema.ts";

export interface StoredQuestion {
	id: string;
	body: QuestionBody;
	key: Key;
}

export interface Answer {
	id: string;
	answer: Record<string, string>;
}

export interface ReverifyResult {
	agree: string[];
	/** Questions the sheet-only answer got wrong, or that the model did not answer. */
	disagree: { id: string; given: Record<string, string> | null }[];
}

/** One prompt for a batch of questions: the sheet once, then each question without its key. */
export function buildReverifyPrompt(sheetBody: string, questions: Pick<StoredQuestion, "id" | "body">[]): string {
	const rendered = questions.map(({ id, body }) => {
		const parts = [`Question id: ${id}`, `Question:\n${body.stem}`];
		if (body.exhibit) parts.push(`Exhibit:\n${renderExhibit(body.exhibit)}`);
		parts.push(renderChoices(body));
		parts.push(`Answer with ${responseShape(body)}.`);
		return parts.join("\n\n");
	});
	return [
		"You are checking exam questions. Answer every question using only the fact sheet below. Do not rely on other knowledge; if the sheet does not decide a question, give your best answer from the sheet.",
		`Fact sheet:\n${sheetBody}`,
		...rendered.map((q, i) => `--- Question ${i + 1} of ${questions.length}\n${q}`),
		"Submit all answers with submit_answers as { \"answers\": [ { \"id\": \"<question id>\", \"answer\": <the object described for that question> } ] }.",
	].join("\n\n");
}

export function compareAnswers(questions: StoredQuestion[], answers: Answer[]): ReverifyResult {
	const byId = new Map(answers.map((a) => [a.id, a.answer]));
	const result: ReverifyResult = { agree: [], disagree: [] };
	for (const q of questions) {
		const given = byId.get(q.id) ?? null;
		if (given && checkAnswer(q.body, q.key, given)) result.agree.push(q.id);
		else result.disagree.push({ id: q.id, given });
	}
	return result;
}
