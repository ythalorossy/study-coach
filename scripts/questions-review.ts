// Marks a skill's questions as reviewed (or not) in content/questions/<skill>.json.
// Usage: npm run questions:review -- --skill <id> [--undo] [--id <questionId>]
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { QUESTION_BANK_ROOT, readBankFile } from "../src/coach/question-bank.ts";

const { values } = parseArgs({
	options: { skill: { type: "string" }, id: { type: "string", multiple: true }, undo: { type: "boolean" } },
});
if (!values.skill) {
	console.error("Usage: npm run questions:review -- --skill <id> [--id <questionId>]... [--undo]");
	process.exit(1);
}
const path = join(QUESTION_BANK_ROOT, `${values.skill}.json`);
if (!existsSync(path)) {
	console.error(`No question file for skill ${values.skill} (looked for ${path})`);
	process.exit(1);
}
const file = readBankFile(path);
const only = values.id ? new Set(values.id) : null;
let changed = 0;
for (const q of file.questions) {
	if (only && !only.has(q.id)) continue;
	if (q.reviewed === !values.undo) continue;
	q.reviewed = !values.undo;
	changed++;
}
writeFileSync(path, `${JSON.stringify(file, null, "\t")}\n`);
const reviewed = file.questions.filter((q) => q.reviewed).length;
console.log(`${values.skill}: ${changed} changed, ${reviewed} of ${file.questions.length} reviewed.`);
