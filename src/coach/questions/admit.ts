import type { CoachDb } from "../db.ts";
import { DocFetchError } from "../docs/docs.ts";
import { checkAnswer, validateCandidate, type QuestionBody } from "./question-schema.ts";
import { findLeak } from "./leak.ts";
import { insertQuestion, listSkillCandidates } from "./questions.ts";
import { isNearDuplicate } from "./similarity.ts";

/** What the verifier sees. Deliberately without the key or the explanation. */
export interface VerifierInput {
	body: QuestionBody;
	docs: { url: string; text: string }[];
}

export interface AdmitDeps {
	fetchDoc: (url: string) => Promise<{ text: string; readAt: string }>;
	verify: (input: VerifierInput) => Promise<unknown>;
	/** What the verifier reads instead of the fetched sources (the skill's fact sheet). Sources are still fetched. */
	verifierDocs?: { url: string; text: string }[];
}

export type AdmitResult =
	| { saved: true; id: string }
	| {
			saved: false;
			reason: "invalid" | "leak" | "duplicate" | "source-unavailable" | "verifier-disagrees" | "verifier-failed";
			detail: string;
	  };

export function renderExhibit(exhibit: NonNullable<QuestionBody["exhibit"]>): string {
	if (exhibit.kind === "table") {
		return [exhibit.columns.join(" | "), ...exhibit.rows.map((r) => r.join(" | "))].join("\n");
	}
	return `\`\`\`${exhibit.language}\n${exhibit.text}\n\`\`\``;
}

export function renderChoices(body: QuestionBody): string {
	if (body.format === "multiple-choice") {
		return `Options:\n${body.options.map((o) => `- ${o.id}: ${o.text}`).join("\n")}`;
	}
	if (body.format === "drag-drop") {
		return [
			`Items:\n${body.items.map((i) => `- ${i.id}: ${i.text}`).join("\n")}`,
			`Slots:\n${body.slots.map((s) => `- ${s.id}: ${s.label}`).join("\n")}`,
		].join("\n\n");
	}
	return [
		`Statement: ${body.statement}`,
		...body.slots.map((s) => `Slot ${s.id} options:\n${s.options.map((o) => `- ${o.id}: ${o.text}`).join("\n")}`),
	].join("\n\n");
}

export function responseShape(body: QuestionBody): string {
	if (body.format === "multiple-choice") return `{ "optionId": "<id of the one correct option>" }`;
	const what = body.format === "drag-drop" ? "item" : "option";
	return `a JSON object mapping every slot id to the id of its correct ${what}, for example { ${body.slots
		.map((s) => `"${s.id}": "<${what} id>"`)
		.join(", ")} }`;
}

export function buildVerifierPrompt(input: VerifierInput): string {
	const { body, docs } = input;
	const parts = [
		"You are checking an exam question. Answer it using only the documentation provided below. Do not rely on other knowledge.",
		`Question:\n${body.stem}`,
	];
	if (body.exhibit) parts.push(`Exhibit:\n${renderExhibit(body.exhibit)}`);
	parts.push(renderChoices(body));
	parts.push(docs.map((d, i) => `Documentation ${i + 1} (${d.url}):\n${d.text}`).join("\n\n"));
	parts.push(`Respond with ${responseShape(body)}.`);
	return parts.join("\n\n");
}

function message(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}

export async function admitQuestion(db: CoachDb, raw: unknown, deps: AdmitDeps): Promise<AdmitResult> {
	const checked = validateCandidate(raw);
	if (!checked.ok) return { saved: false, reason: "invalid", detail: checked.reason };
	// Use the parsed value, never the raw input: unknown keys are stripped.
	const candidate = checked.value;

	const leak = findLeak(candidate);
	if (leak) return { saved: false, reason: "leak", detail: leak.join(", ") };

	const dup = listSkillCandidates(db, candidate.skillId).find((e) => isNearDuplicate(candidate, [e]));
	if (dup) return { saved: false, reason: "duplicate", detail: dup.id };

	const docs: { url: string; text: string }[] = [];
	const readAt: Record<string, string> = {};
	for (const { url } of candidate.sources) {
		try {
			const doc = await deps.fetchDoc(url);
			docs.push({ url, text: doc.text });
			readAt[url] = doc.readAt;
		} catch (e) {
			const why = e instanceof DocFetchError ? e.reason : message(e);
			return { saved: false, reason: "source-unavailable", detail: `${url}: ${why}` };
		}
	}

	let response: unknown;
	try {
		response = await deps.verify({ body: candidate.body, docs: deps.verifierDocs ?? docs });
	} catch (e) {
		return { saved: false, reason: "verifier-failed", detail: message(e) };
	}
	if (!checkAnswer(candidate.body, candidate.key, response)) {
		return { saved: false, reason: "verifier-disagrees", detail: JSON.stringify(response) ?? "undefined" };
	}
	return { saved: true, id: insertQuestion(db, candidate, readAt) };
}
