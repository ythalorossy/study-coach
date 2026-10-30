// Review sheets: a skill's fact sheet beside a sample of its questions, so a person can
// check both against the linked Learn pages. Written to data/review/ (git-ignored).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FACT_SHEETS_ROOT } from "../docs/fact-sheets.ts";
import type { BankQuestion } from "./question-bank.ts";

export function sampleQuestions(questions: BankQuestion[], count: number): BankQuestion[] {
	if (questions.length <= count) return questions;
	// Spread the sample across the sorted list so each format tends to appear.
	return Array.from({ length: count }, (_, i) => questions[Math.floor(((i + 0.5) * questions.length) / count)]);
}

function renderBody(q: BankQuestion): string[] {
	const b = q.body;
	const out = [b.stem];
	if (b.exhibit?.kind === "table") {
		out.push("", `| ${b.exhibit.columns.join(" | ")} |`, `|${b.exhibit.columns.map(() => "---").join("|")}|`);
		for (const row of b.exhibit.rows) out.push(`| ${row.join(" | ")} |`);
	} else if (b.exhibit?.kind === "code") {
		out.push("", `\`\`\`${b.exhibit.language}`, b.exhibit.text, "```");
	}
	if (b.format === "multiple-choice") {
		const key = (q.key as { optionId: string }).optionId;
		out.push("", ...b.options.map((o) => `- ${o.id === key ? "**[key]**" : "[ ]"} ${o.id}. ${o.text}`));
	} else if (b.format === "drag-drop") {
		const key = q.key as Record<string, string>;
		const item = (id: string) => b.items.find((i) => i.id === id)?.text ?? id;
		out.push("", ...b.slots.map((s) => `- ${s.label} → **${item(key[s.id])}**`), "", `Items: ${b.items.map((i) => i.text).join("; ")}`);
	} else {
		const key = q.key as Record<string, string>;
		out.push("", b.statement, ...b.slots.map((s) => `- ${s.id}: **${s.options.find((o) => o.id === key[s.id])?.text ?? key[s.id]}** (of: ${s.options.map((o) => o.text).join("; ")})`));
	}
	return out;
}

export function renderReviewSheet(skill: string, questions: BankQuestion[], count: number, factSheetRoot = FACT_SHEETS_ROOT): string {
	const sheet = readFileSync(join(factSheetRoot, `${skill}.md`), "utf8").replace(/^---\n[\s\S]*?\n---\n/, "");
	const reviewed = questions.filter((q) => q.reviewed).length;
	const lines = [
		`# Review: ${skill}`,
		"",
		`${reviewed} of ${questions.length} questions reviewed. Check each fact against its Learn link; then check the sample questions. Fix mistakes in \`content/fact-sheets/${skill}.md\` or \`content/questions/${skill}.json\`, then run \`npm run questions:review -- --skill ${skill}\`.`,
		"",
		"## Fact sheet",
		"",
		sheet.trim(),
		"",
		`## Sample questions (${Math.min(count, questions.length)} of ${questions.length})`,
	];
	for (const q of sampleQuestions(questions, count)) {
		lines.push("", `### ${q.id} (${q.body.format})${q.reviewed ? " ✓ reviewed" : ""}`, "", ...renderBody(q));
		lines.push("", `**Why:** ${q.explanation.correct}`, "", "Sources: " + q.sources.map((s) => s.url).join(", "));
	}
	return `${lines.join("\n")}\n`;
}
