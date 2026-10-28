import * as v from "valibot";
import type { QuestionFormat } from "./types.ts";

const text = v.pipe(v.string(), v.minLength(1));
const id = v.pipe(v.string(), v.minLength(1));

export const ExhibitSchema = v.variant("kind", [
	v.object({
		kind: v.literal("table"),
		columns: v.pipe(v.array(text), v.minLength(1)),
		rows: v.pipe(v.array(v.array(v.string())), v.minLength(1)),
	}),
	v.object({
		kind: v.literal("code"),
		language: v.picklist(["powershell", "bash", "json", "text"]),
		text,
	}),
]);

const choice = v.object({ id, text });

export const MultipleChoiceBodySchema = v.object({
	format: v.literal("multiple-choice"),
	stem: text,
	exhibit: v.optional(ExhibitSchema),
	options: v.pipe(v.array(choice), v.length(4)),
});

export const DragDropBodySchema = v.object({
	format: v.literal("drag-drop"),
	stem: text,
	exhibit: v.optional(ExhibitSchema),
	items: v.pipe(v.array(choice), v.minLength(2), v.maxLength(8)),
	slots: v.pipe(v.array(v.object({ id, label: text })), v.minLength(2), v.maxLength(6)),
});

export const CompleteSentenceBodySchema = v.object({
	format: v.literal("complete-sentence"),
	stem: text,
	exhibit: v.optional(ExhibitSchema),
	statement: text,
	slots: v.pipe(
		v.array(
			v.object({
				id,
				options: v.pipe(v.array(choice), v.minLength(2), v.maxLength(4)),
			}),
		),
		v.minLength(1),
		v.maxLength(3),
	),
});

export const QuestionBodySchema = v.variant("format", [
	MultipleChoiceBodySchema,
	DragDropBodySchema,
	CompleteSentenceBodySchema,
]);

const slotMapSchema = v.record(v.string(), v.string());
export const MultipleChoiceKeySchema = v.object({ optionId: id });
export const KeySchema = v.union([MultipleChoiceKeySchema, slotMapSchema]);

export const ExplanationSchema = v.object({
	correct: text,
	perChoice: v.record(v.string(), text),
});

export const CandidateQuestionSchema = v.object({
	skillId: id,
	body: QuestionBodySchema,
	key: KeySchema,
	explanation: ExplanationSchema,
	sources: v.pipe(v.array(v.object({ url: id })), v.minLength(1), v.maxLength(4)),
	subtopics: v.pipe(
		v.array(v.pipe(v.string(), v.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/))),
		v.minLength(1),
		v.maxLength(3),
	),
});

export type Exhibit = v.InferOutput<typeof ExhibitSchema>;
export type QuestionBody = v.InferOutput<typeof QuestionBodySchema>;
export type Key = v.InferOutput<typeof KeySchema>;
export type Explanation = v.InferOutput<typeof ExplanationSchema>;
export type CandidateQuestion = v.InferOutput<typeof CandidateQuestionSchema>;
export interface PublicQuestion {
	id: string;
	skillId: string;
	format: QuestionFormat;
	body: QuestionBody;
}

/** Valibot schema for the response shape of a format (used as an LLM result schema). */
export function responseSchemaFor(format: QuestionFormat) {
	return format === "multiple-choice" ? v.object({ optionId: v.string() }) : v.record(v.string(), v.string());
}

export type ValidationResult = { ok: true; value: CandidateQuestion } | { ok: false; reason: string };

function dupes(ids: string[]): boolean {
	return new Set(ids).size !== ids.length;
}

function isMap(x: unknown): x is Record<string, string> {
	return typeof x === "object" && x !== null && !Array.isArray(x);
}

export function validateCandidate(c: unknown): ValidationResult {
	const parsed = v.safeParse(CandidateQuestionSchema, c);
	if (!parsed.success) {
		const issue = parsed.issues[0];
		const path = issue.path?.map((p) => String(p.key)).join(".");
		return { ok: false, reason: `schema: ${issue.message}${path ? ` at ${path}` : ""}` };
	}
	const value = parsed.output;
	const fail = (reason: string): ValidationResult => ({ ok: false, reason });
	const { body, key, explanation } = value;
	const covered = (needed: string[]): string | undefined =>
		needed.find((n) => !Object.hasOwn(explanation.perChoice, n));

	if (body.format === "multiple-choice") {
		const ids = body.options.map((o) => o.id);
		if (dupes(ids)) return fail("duplicate option ids");
		const k = v.safeParse(MultipleChoiceKeySchema, key);
		if (!k.success || Object.keys(key).length !== 1) return fail("key must be { optionId }");
		if (!ids.includes(k.output.optionId)) return fail(`key names unknown option ${k.output.optionId}`);
		const missing = covered(ids.filter((i) => i !== k.output.optionId));
		if (missing) return fail(`perChoice missing entry for ${missing}`);
	} else if (body.format === "drag-drop") {
		const itemIds = body.items.map((i) => i.id);
		const slotIds = body.slots.map((s) => s.id);
		if (dupes(itemIds) || dupes(slotIds)) return fail("duplicate item or slot ids");
		if (body.slots.length > body.items.length) return fail("more slots than items");
		if (!isMap(key)) return fail("key must map slot ids to item ids");
		const map: Record<string, string> = key;
		const keySlots = Object.keys(key);
		if (keySlots.length !== slotIds.length || slotIds.some((s) => !Object.hasOwn(key, s))) {
			return fail("key must cover exactly the slots");
		}
		const used = slotIds.map((s) => map[s]);
		if (used.some((u) => !itemIds.includes(u))) return fail("key names unknown item");
		if (dupes(used)) return fail("key uses an item more than once");
		const missing = covered(itemIds);
		if (missing) return fail(`perChoice missing entry for ${missing}`);
	} else {
		const slotIds = body.slots.map((s) => s.id);
		if (dupes(slotIds)) return fail("duplicate slot ids");
		for (const s of body.slots) {
			if (dupes(s.options.map((o) => o.id))) return fail(`duplicate option ids in slot ${s.id}`);
		}
		const markers = [...body.statement.matchAll(/\{\{([^{}]*)\}\}/g)].map((m) => m[1]);
		const unknown = markers.find((m) => !slotIds.includes(m));
		if (unknown !== undefined) return fail(`statement marker {{${unknown}}} has no slot`);
		const bad = slotIds.find((s) => markers.filter((m) => m === s).length !== 1);
		if (bad !== undefined) return fail(`slot ${bad} must appear exactly once in the statement`);
		if (!isMap(key)) return fail("key must map slot ids to option ids");
		const map: Record<string, string> = key;
		const keySlots = Object.keys(key);
		if (keySlots.length !== slotIds.length || slotIds.some((s) => !Object.hasOwn(key, s))) {
			return fail("key must cover exactly the slots");
		}
		for (const s of body.slots) {
			if (!s.options.some((o) => o.id === map[s.id])) return fail(`key names unknown option for slot ${s.id}`);
		}
		const needed = body.slots.flatMap((s) =>
			s.options.filter((o) => o.id !== map[s.id]).map((o) => `${s.id}:${o.id}`),
		);
		const missing = covered(needed);
		if (missing) return fail(`perChoice missing entry for ${missing}`);
	}
	return { ok: true, value };
}

function sameMap(slotIds: string[], key: Record<string, string>, response: unknown): boolean {
	if (!isMap(response)) return false;
	if (Object.keys(response).length !== slotIds.length) return false;
	return slotIds.every(
		(s) => Object.hasOwn(response, s) && Object.hasOwn(key, s) && response[s] === key[s],
	);
}

/** Exact match: every slot must be right, and anything malformed is wrong. */
export function checkAnswer(body: QuestionBody, key: Key, response: unknown): boolean {
	if (body.format === "multiple-choice") {
		if (!isMap(response) || !Object.hasOwn(response, "optionId")) return false;
		if (!Object.hasOwn(key, "optionId")) return false;
		return typeof response.optionId === "string" && response.optionId === key.optionId;
	}
	if (!isMap(key)) return false;
	return sameMap(
		body.slots.map((s) => s.id),
		key,
		response,
	);
}
