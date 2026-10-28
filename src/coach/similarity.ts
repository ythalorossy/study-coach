import type { CandidateQuestion } from "./question-schema.ts";

function words(text: string): Set<string> {
	const tokens = text.toLowerCase().match(/[a-z0-9#@._-]+/g) ?? [];
	return new Set(tokens.filter((t) => t.length >= 3));
}

function correctText(c: CandidateQuestion): string {
	const { body, key } = c;
	const k = key as Record<string, string>;
	if (body.format === "multiple-choice") {
		return body.options.find((o) => o.id === k.optionId)?.text ?? "";
	}
	if (body.format === "drag-drop") {
		return body.slots.map((s) => body.items.find((i) => i.id === k[s.id])?.text ?? "").join(" ");
	}
	return body.slots.map((s) => s.options.find((o) => o.id === k[s.id])?.text ?? "").join(" ");
}

function signature(c: CandidateQuestion): Set<string> {
	const ex = c.body.exhibit;
	const exhibit = !ex ? "" : ex.kind === "table" ? [...ex.columns, ...ex.rows.flat()].join(" ") : ex.text;
	return words([c.body.stem, exhibit, correctText(c)].join(" "));
}

function jaccard(a: Set<string>, b: Set<string>): number {
	if (a.size === 0 && b.size === 0) return 0;
	let shared = 0;
	for (const w of a) if (b.has(w)) shared++;
	return shared / (a.size + b.size - shared);
}

/** Jaccard >= 0.7 against any existing question of the same skill. */
export function isNearDuplicate(candidate: CandidateQuestion, existing: CandidateQuestion[]): boolean {
	const sig = signature(candidate);
	return existing.some((e) => e.skillId === candidate.skillId && jaccard(sig, signature(e)) >= 0.7);
}
