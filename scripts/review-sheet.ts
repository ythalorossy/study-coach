// Writes review sheets to data/review/<skill>.md.
// Usage: npm run review:sheet -- --skill <id> | --area <prefix> | --all  [--count 3]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { QUESTION_BANK_ROOT, readBankFile } from "../src/coach/question-bank.ts";
import { renderReviewSheet } from "../src/coach/review-sheet.ts";
import { SKILLS } from "../src/coach/seed.ts";

const { values } = parseArgs({
	options: { skill: { type: "string" }, area: { type: "string" }, all: { type: "boolean" }, count: { type: "string" } },
});
const count = Number(values.count ?? 3); // questions to put on each sheet
// Pick skills by --all, --skill or --area prefix (skill ids look like "<area>.<skill>")
const ids = SKILLS.map(([id]) => id).filter((id) =>
	values.all ? true : values.skill ? id === values.skill : values.area ? id.startsWith(`${values.area}.`) : false,
);
if (ids.length === 0 || !Number.isInteger(count) || count < 1) {
	console.error("Usage: npm run review:sheet -- --skill <id> | --area <prefix> | --all  [--count 3]");
	process.exit(1);
}
mkdirSync("data/review", { recursive: true });
// One sheet per skill
for (const id of ids) {
	const { questions } = readBankFile(join(QUESTION_BANK_ROOT, `${id}.json`));
	writeFileSync(join("data/review", `${id}.md`), renderReviewSheet(id, questions, count));
}
console.log(`Wrote ${ids.length} review sheet(s) to data/review/.`);
