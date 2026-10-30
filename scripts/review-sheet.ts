// Writes a review sheet per skill: its fact sheet next to a few sample questions,
// to check against the linked Learn pages before marking them reviewed.
//
// Usage: npm run review:sheet -- --skill <id> | --area <prefix> | --all  [--count <n>]
//   --skill <id>       one skill
//   --area <prefix>    every skill of an area (e.g. storage)
//   --all              every skill
//   --count <n>        sample questions per sheet (default 3)
//
// Reads:  content/questions/*.json, content/fact-sheets/
// Writes: data/review/<skill>.md
// Needs:  nothing (no API key, no network)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { QUESTION_BANK_ROOT, readBankFile } from "../src/coach/questions/question-bank.ts";
import { renderReviewSheet } from "../src/coach/questions/review-sheet.ts";
import { SKILLS } from "../src/coach/exam/seed.ts";

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
