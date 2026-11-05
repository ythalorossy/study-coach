// Structural checks on the question bank. These find questions worth a person's eye first;
// they do not prove a question right. No model is called.
import type { BankQuestion } from "./question-bank.ts";

export interface LintIssue {
	code: string;
	message: string;
}

function normalizeUrl(url: string): string {
	return url.replace(/[#?].*$/, "").replace(/\/$/, "").replace(/^https?:\/\/learn\.microsoft\.com\/(en-us\/)?/i, "");
}

export function sheetUrls(sheetText: string): Set<string> {
	return new Set((sheetText.match(/https:\/\/learn\.microsoft\.com\/[^\s)>\]]+/g) ?? []).map(normalizeUrl));
}

export function lintQuestion(q: BankQuestion, sheet: Set<string>): LintIssue[] {
	const issues: LintIssue[] = [];
	const add = (code: string, message: string) => issues.push({ code, message });
	const b = q.body;
	const stem = b.stem;

	if (/\b(exhibit|shown below|table below|following (table|output|template|code))\b/i.test(stem) && !b.exhibit) {
		add("missing-exhibit", "the stem points to an exhibit or table but the question has none");
	}
	if (b.format === "multiple-choice") {
		const key = (q.key as { optionId: string }).optionId;
		const lengths = b.options.map((o) => o.text.length);
		const keyLen = b.options.find((o) => o.id === key)?.text.length ?? 0;
		const others = b.options.filter((o) => o.id !== key).map((o) => o.text.length);
		const longestOther = Math.max(...others);
		if (keyLen > 40 && keyLen > longestOther * 1.8) add("long-key", "the correct option is much longer than every distractor");
		if (new Set(b.options.map((o) => o.text.trim())).size < lengths.length) add("duplicate-options", "two options have the same text");
	}
	if (b.format === "drag-drop") {
		if (new Set(b.items.map((i) => i.text.trim())).size < b.items.length) add("duplicate-items", "two items have the same text");
	}
	// Choices are shown without letters and in random order, so a letter means nothing to the learner.
	const choiceTexts =
		b.format === "multiple-choice"
			? b.options.map((o) => o.text)
			: b.format === "drag-drop"
				? b.items.map((i) => i.text)
				: [b.statement, ...b.slots.flatMap((sl) => sl.options.map((o) => o.text))];
	const texts = [stem, q.explanation.correct, ...Object.values(q.explanation.perChoice), ...choiceTexts];
	// A lowercase "a" is usually the article ("a choice a team makes"), so it counts only before punctuation or a verb.
	const LETTER = /\b(?:[Oo]ptions?|[Cc]hoices?)\s+(?:\(?[b-dB-D]\)?(?![\w-])|\(?A\)?(?![\w-])|\(a\)|a(?=\s*[,.;:)]|\s+(?:is|are|was|and|or|would|does|says|describes|names|states|gives|has|can|cannot|fails|works)\b|$))/;
	if (texts.some((t) => LETTER.test(t))) {
		add("letter-reference", "the text refers to an option by letter, but choices are shown without letters in random order");
	}
	if (stem.length < 60) add("short-stem", "the stem is under 60 characters");
	if (q.sources.length === 0) add("no-sources", "the question cites no page");
	const outside = q.sources.filter((s) => !sheet.has(normalizeUrl(s.url)));
	if (outside.length > 0) add("source-not-in-sheet", `cited but not linked in the fact sheet: ${outside.map((s) => s.url).join(", ")}`);
	if (q.explanation.correct.trim().length < 40) add("thin-explanation", "the explanation is under 40 characters");
	return issues;
}

/** Share of multiple-choice keys per option id, to spot a skew toward B or C. */
export function keyPositions(questions: BankQuestion[]): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const q of questions) {
		if (q.body.format !== "multiple-choice") continue;
		const id = (q.key as { optionId: string }).optionId;
		counts[id] = (counts[id] ?? 0) + 1;
	}
	return counts;
}
