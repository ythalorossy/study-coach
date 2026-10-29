import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { importQuestionBankIfEmpty } from "./question-bank.ts";
import { seedCoachDb } from "./seed.ts";

export interface CoachDb {
	raw: DatabaseSync;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS areas (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	weight_min INTEGER NOT NULL,
	weight_max INTEGER NOT NULL,
	position INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS skills (
	id TEXT PRIMARY KEY,
	area_id TEXT NOT NULL REFERENCES areas(id),
	specialist TEXT NOT NULL,
	name TEXT NOT NULL,
	position INTEGER NOT NULL,
	guide_version TEXT NOT NULL,
	doc_urls TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS questions (
	id TEXT PRIMARY KEY,
	skill_id TEXT NOT NULL REFERENCES skills(id),
	format TEXT NOT NULL,
	body TEXT NOT NULL,
	key TEXT NOT NULL,
	explanation TEXT NOT NULL,
	sources TEXT NOT NULL,
	subtopics TEXT NOT NULL,
	guide_version TEXT NOT NULL,
	status TEXT NOT NULL CHECK (status IN ('verified', 'flagged')),
	created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS attempts (
	id INTEGER PRIMARY KEY,
	question_id TEXT NOT NULL,
	skill_id TEXT NOT NULL,
	format TEXT NOT NULL,
	correct INTEGER NOT NULL,
	response TEXT NOT NULL,
	purpose TEXT NOT NULL,
	session_id TEXT,
	answered_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS taught (
	skill_id TEXT PRIMARY KEY,
	taught_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS flags (
	id INTEGER PRIMARY KEY,
	question_id TEXT NOT NULL,
	reason TEXT NOT NULL,
	created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
	id TEXT PRIMARY KEY,
	kind TEXT NOT NULL CHECK (kind IN ('lesson', 'practice')),
	skill_ids TEXT NOT NULL,
	title TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS doc_cache (
	url TEXT PRIMARY KEY,
	text TEXT NOT NULL,
	read_at TEXT NOT NULL
);
`;

/** Additive, idempotent changes for databases created by an earlier version. */
function migrate(raw: DatabaseSync): void {
	const columns = (raw.prepare("PRAGMA table_info(sessions)").all() as { name: string }[]).map((c) => c.name);
	// The area a lead-choice lesson was started in; null for sessions from before areas.
	if (!columns.includes("area_id")) raw.exec("ALTER TABLE sessions ADD COLUMN area_id TEXT");
}

/** `questionBank`: the folder to load on first run (default content/questions), or false to skip loading. */
export function openCoachDb(path: string, opts: { questionBank?: string | false } = {}): CoachDb {
	if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
	const raw = new DatabaseSync(path);
	if (path !== ":memory:") {
		// generate and the dev server share this file: let writers wait instead of failing with SQLITE_BUSY.
		raw.exec("PRAGMA journal_mode = WAL");
		raw.exec("PRAGMA busy_timeout = 5000");
	}
	raw.exec(SCHEMA);
	migrate(raw);
	const db: CoachDb = { raw };
	seedCoachDb(db);
	// A database on disk with no questions yet gets the committed bank; in-memory ones start empty.
	if (path !== ":memory:" && opts.questionBank !== false) {
		const loaded = importQuestionBankIfEmpty(db, opts.questionBank);
		if (loaded) console.log(`Loaded ${loaded.added} questions from the question bank (${loaded.invalid.length} invalid).`);
	}
	return db;
}

let singleton: CoachDb | undefined;

export function getCoachDb(): CoachDb {
	singleton ??= openCoachDb(process.env.COACH_DB_PATH ?? "./data/coach.db");
	return singleton;
}
