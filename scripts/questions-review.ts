// Marks a skill's questions as reviewed (or not) in content/questions/<skill>.json.
// Set it only after checking the questions against their linked Learn pages.
//
// Usage: npm run questions:review -- --skill <id> [--id <questionId>]... [--undo]
//   --skill <id>  the skill whose file to change (required)
//   --id <q>      only this question; repeat for several (default: every question of the skill)
//   --undo        clear the mark instead of setting it
//
// Reads:  content/questions/<skill>.json
// Writes: the same file (committed)
// Needs:  nothing (no API key, no network)
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { QUESTION_BANK_ROOT, readBankFile } from "../src/coach/questions/question-bank.ts";

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
const only = values.id ? new Set(values.id) : null; // --id limits the change to these questions
let changed = 0;
for (const q of file.questions) {
	if (only && !only.has(q.id)) continue;
	if (q.reviewed === !values.undo) continue; // already in the wanted state
	q.reviewed = !values.undo;
	changed++;
}
writeFileSync(path, `${JSON.stringify(file, null, "\t")}\n`);
const reviewed = file.questions.filter((q) => q.reviewed).length;
console.log(`${values.skill}: ${changed} changed, ${reviewed} of ${file.questions.length} reviewed.`);
