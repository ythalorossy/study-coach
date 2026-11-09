// Re-checks a skill's stored questions against its current fact sheet. A blind model answers them from the
// sheet alone (no keys) and the answers are compared with the stored keys; the ones that disagree are listed
// for a person to inspect. Nothing is flagged or changed.
//
// Usage: npm run questions:reverify -- --skill <id>
//
// Reads:  data/coach.db (COACH_DB_PATH), content/fact-sheets/<skill>.md
// Writes: data/review/reverify/<skill>.json and .md
// Needs:  API key in .env (one model call); VERIFIER_MODEL picks the model
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { openCoachDb } from "../src/coach/db.ts";
import { readFactSheet } from "../src/coach/docs/fact-sheets.ts";
import { SKILLS } from "../src/coach/exam/seed.ts";
import { type Answer, compareAnswers, type StoredQuestion } from "../src/coach/questions/reverify.ts";
import { classifyProviderFailure, runFlue } from "./flue-jobs.ts";

const OUT = "./data/review/reverify";

async function main(): Promise<void> {
	const { values } = parseArgs({ options: { skill: { type: "string" } } });
	const skillId = values.skill;
	if (!skillId || !SKILLS.some(([id]) => id === skillId)) {
		console.error(`Choose --skill <id>. Known skills: ${SKILLS.map(([id]) => id).join(", ")}`);
		process.exit(1);
	}
	const sheet = readFactSheet(skillId);
	if (!sheet) {
		console.error(`No fact sheet for ${skillId}.`);
		process.exit(1);
	}
	const db = openCoachDb(process.env.COACH_DB_PATH ?? "./data/coach.db");
	const rows = db.raw.prepare("SELECT id, body, key FROM questions WHERE skill_id = ? AND status = 'verified' ORDER BY id").all(skillId);
	const questions: StoredQuestion[] = rows.map((r) => ({ id: r.id as string, body: JSON.parse(r.body as string), key: JSON.parse(r.key as string) }));
	db.raw.close();
	if (!questions.length) {
		console.log(`${skillId} has no verified questions.`);
		return;
	}
	mkdirSync(OUT, { recursive: true });
	const questionsPath = join(OUT, `${skillId}.questions.json`);
	const outPath = join(OUT, `${skillId}.json`);
	writeFileSync(questionsPath, JSON.stringify(questions.map(({ id, body }) => ({ id, body })))); // no keys
	if (existsSync(outPath)) writeFileSync(outPath, "[]");
	const child = await runFlue("src/agents/question-reverifier.ts", `reverify-${skillId}-${Date.now()}`, { sheetBody: sheet.body, questionsPath, outPath }, "Answer the questions.");
	if (child.status !== 0) {
		const provider = classifyProviderFailure(`${child.stdout}\n${child.stderr}`);
		console.error(provider ? `Provider failure: ${provider}. Rerun later.` : child.stderr);
		process.exit(2);
	}
	const answers = JSON.parse(readFileSync(outPath, "utf8")) as Answer[];
	const result = compareAnswers(questions, answers);
	const lines = [`# Re-check: ${skillId}`, "", `${questions.length} questions answered from the current fact sheet without their keys: ${result.agree.length} agree, ${result.disagree.length} to look at.`, ""];
	for (const d of result.disagree) {
		const q = questions.find((x) => x.id === d.id)!;
		lines.push(`## ${d.id}`, "", q.body.stem.replace(/\s+/g, " "), "", `Stored key: \`${JSON.stringify(q.key)}\``, `Sheet-only answer: \`${JSON.stringify(d.given)}\``, "");
	}
	writeFileSync(join(OUT, `${skillId}.md`), `${lines.join("\n")}\n`);
	console.log(`${skillId}: ${result.agree.length} agree, ${result.disagree.length} to look at (data/review/reverify/${skillId}.md)`);
	for (const d of result.disagree) console.log(`  ${d.id}`);
}

if (import.meta.main) await main();
