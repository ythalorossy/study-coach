// Lists questions with structural problems, worst skills first. Writes data/review/lint.md.
// Usage: npm run questions:lint [-- --skill <id>]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { type LintIssue, keyPositions, lintQuestion, sheetUrls } from "../src/coach/questions/bank-lint.ts";
import { FACT_SHEETS_ROOT } from "../src/coach/docs/fact-sheets.ts";
import { type BankQuestion, QUESTION_BANK_ROOT, readBankFile } from "../src/coach/questions/question-bank.ts";
import { SKILLS } from "../src/coach/exam/seed.ts";

const { values } = parseArgs({ options: { skill: { type: "string" } } });
const ids = SKILLS.map(([id]) => id).filter((id) => !values.skill || id === values.skill); // --skill narrows to one
const flagged: { skill: string; q: BankQuestion; issues: LintIssue[] }[] = [];
const perCode: Record<string, number> = {}; // issue count by check
const all: BankQuestion[] = [];
let total = 0;

// Lint every question of every skill that has a bank file
for (const skill of ids) {
	const path = join(QUESTION_BANK_ROOT, `${skill}.json`);
	if (!existsSync(path)) continue;
	// The skill's fact sheet gives the URLs a question may cite
	const sheetPath = join(FACT_SHEETS_ROOT, `${skill}.md`);
	const sheet = sheetUrls(existsSync(sheetPath) ? readFileSync(sheetPath, "utf8") : "");
	for (const q of readBankFile(path).questions) {
		total++;
		all.push(q);
		const issues = lintQuestion(q, sheet);
		for (const i of issues) perCode[i.code] = (perCode[i.code] ?? 0) + 1;
		if (issues.length > 0) flagged.push({ skill, q, issues });
	}
}

// Flagged questions per skill, to rank the worst
const bySkill = new Map<string, number>();
for (const f of flagged) bySkill.set(f.skill, (bySkill.get(f.skill) ?? 0) + 1);

// Build the report: totals, by check, key positions, then each flagged question
const lines = [`# Question bank lint`, "", `${flagged.length} of ${total} questions flagged.`, "", "## By check", ""];
for (const [code, n] of Object.entries(perCode).sort((a, b) => b[1] - a[1])) lines.push(`- ${code}: ${n}`);
lines.push("", "## Multiple-choice key positions", "", JSON.stringify(keyPositions(all)), "", "## Questions", "");
for (const { skill, q, issues } of flagged) {
	lines.push(`- \`${skill}\` ${q.id} (${q.body.format})`);
	for (const i of issues) lines.push(`  - ${i.code}: ${i.message}`);
}
mkdirSync("data/review", { recursive: true });
writeFileSync("data/review/lint.md", `${lines.join("\n")}\n`);

// Console shows only the head of the report (title, totals, by-check, key positions)
console.log(lines.slice(0, 2 + 2 + Object.keys(perCode).length + 5).join("\n"));
console.log("\nSkills with most flagged questions:");
for (const [s, n] of [...bySkill].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`  ${s}: ${n}`);
console.log("\nFull list in data/review/lint.md");
