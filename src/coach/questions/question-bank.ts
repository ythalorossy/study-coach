// The committed question bank: content/questions/<skillId>.json, one file per skill.
// `exportQuestionBank` writes it from a database; `importQuestionBank` loads it into one.
// Learner data (attempts, sessions, flags) never goes into these files.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CoachDb } from "../db.ts";
import { type CandidateQuestion, validateCandidate } from "./question-schema.ts";
import { GUIDE_VERSION } from "../exam/seed.ts";

export const QUESTION_BANK_ROOT = "./content/questions";

export interface BankQuestion {
	id: string;
	body: CandidateQuestion["body"];
	key: CandidateQuestion["key"];
	explanation: CandidateQuestion["explanation"];
	sources: { url: string }[];
	subtopics: string[];
	/** True once a person has checked the question against its Learn pages. */
	reviewed: boolean;
}

export interface BankFile {
	skill: string;
	questions: BankQuestion[];
}

export interface ImportResult {
	added: number;
	existing: number;
	invalid: string[];
}

function bankFiles(root: string): string[] {
	return existsSync(root) ? readdirSync(root).filter((f) => f.endsWith(".json")).sort() : [];
}

export function readBankFile(path: string): BankFile {
	return JSON.parse(readFileSync(path, "utf8")) as BankFile;
}

/** Writes every verified question, grouped by skill. A question keeps its `reviewed` mark across exports. */
export function exportQuestionBank(db: CoachDb, root = QUESTION_BANK_ROOT): { skills: number; questions: number } {
	mkdirSync(root, { recursive: true });
	const rows = db.raw
		.prepare("SELECT * FROM questions WHERE status = 'verified' ORDER BY skill_id, id")
		.all();
	const bySkill = new Map<string, BankQuestion[]>();
	for (const r of rows) {
		const skill = r.skill_id as string;
		const path = join(root, `${skill}.json`);
		const reviewedIds = new Set(
			existsSync(path) ? readBankFile(path).questions.filter((q) => q.reviewed).map((q) => q.id) : [],
		);
		const sources = JSON.parse(r.sources as string) as { url: string }[];
		const list = bySkill.get(skill) ?? [];
		list.push({
			id: r.id as string,
			body: JSON.parse(r.body as string),
			key: JSON.parse(r.key as string),
			explanation: JSON.parse(r.explanation as string),
			sources: sources.map((s) => ({ url: s.url })),
			subtopics: JSON.parse(r.subtopics as string),
			reviewed: reviewedIds.has(r.id as string),
		});
		bySkill.set(skill, list);
	}
	for (const [skill, questions] of bySkill) {
		const file: BankFile = { skill, questions };
		writeFileSync(join(root, `${skill}.json`), `${JSON.stringify(file, null, "\t")}\n`);
	}
	return { skills: bySkill.size, questions: rows.length };
}

/** Loads the bank into the database, or only the skills in `only`. Questions already there (same id) are left alone; invalid ones are reported and skipped. */
export function importQuestionBank(db: CoachDb, root = QUESTION_BANK_ROOT, only?: Set<string>): ImportResult {
	const result: ImportResult = { added: 0, existing: 0, invalid: [] };
	const knownSkills = new Set(db.raw.prepare("SELECT id FROM skills").all().map((r) => r.id as string));
	const insert = db.raw.prepare(
		`INSERT OR IGNORE INTO questions (id, skill_id, format, body, key, explanation, sources, subtopics, guide_version, status, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?)`,
	);
	const now = new Date().toISOString();
	for (const name of bankFiles(root)) {
		const file = readBankFile(join(root, name));
		if (only && !only.has(file.skill)) continue;
		if (!knownSkills.has(file.skill)) {
			result.invalid.push(`${name}: unknown skill ${file.skill}`);
			continue;
		}
		for (const q of file.questions) {
			const candidate = {
				skillId: file.skill,
				body: q.body,
				key: q.key,
				explanation: q.explanation,
				sources: q.sources,
				subtopics: q.subtopics,
			};
			const checked = validateCandidate(candidate);
			if (!checked.ok || typeof q.id !== "string" || !q.id) {
				result.invalid.push(`${name} ${q.id}: ${checked.ok ? "missing id" : checked.reason}`);
				continue;
			}
			const res = insert.run(
				q.id,
				file.skill,
				q.body.format,
				JSON.stringify(q.body),
				JSON.stringify(q.key),
				JSON.stringify(q.explanation),
				JSON.stringify(q.sources.map((s) => ({ url: s.url, readAt: now }))),
				JSON.stringify(q.subtopics),
				GUIDE_VERSION,
				now,
			);
			if (res.changes > 0) result.added++;
			else result.existing++;
		}
	}
	return result;
}

/** A skill with no questions at all (not even flagged ones) gets its questions from the committed bank, so a new area reaches an existing database; skills that have questions are left alone. */
export function importQuestionBankForEmptySkills(db: CoachDb, root = QUESTION_BANK_ROOT): ImportResult | null {
	const empty = new Set(
		db.raw
			.prepare("SELECT s.id FROM skills s WHERE NOT EXISTS (SELECT 1 FROM questions q WHERE q.skill_id = s.id)")
			.all()
			.map((r) => r.id as string),
	);
	return empty.size ? importQuestionBank(db, root, empty) : null;
}
