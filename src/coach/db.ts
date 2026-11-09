import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { importQuestionBankForEmptySkills } from "./questions/question-bank.ts";
import { specialistArea } from "./exam/instructors.ts";
import { AREAS, GUIDE_VERSION, SKILLS } from "./exam/seed.ts";

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

/** `questionBank`: the folder to load for skills with no questions (default content/questions), or false to skip loading. */
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
		const loaded = importQuestionBankForEmptySkills(db, opts.questionBank);
		if (loaded) console.log(`Loaded ${loaded.added} questions from the question bank (${loaded.invalid.length} invalid).`);
	}
	return db;
}

// Areas and skills from the exam data. New rows are added; existing rows get their name, instructor and
// doc pages refreshed from the data, and keep their position.
export function seedCoachDb(db: CoachDb): void {
	const area = db.raw.prepare(
		`INSERT INTO areas (id, name, weight_min, weight_max, position) VALUES (?, ?, ?, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET name = excluded.name, weight_min = excluded.weight_min, weight_max = excluded.weight_max`,
	);
	const skill = db.raw.prepare(
		`INSERT INTO skills (id, area_id, specialist, name, position, guide_version, doc_urls) VALUES (?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET specialist = excluded.specialist, name = excluded.name, doc_urls = excluded.doc_urls`,
	);
	db.raw.exec("BEGIN");
	try {
		AREAS.forEach(([id, name, min, max], i) => {
			area.run(id, name, min, max, i + 1);
		});
		// Positions count within each area; an existing row keeps the position it has.
		const inArea = new Map<string, number>();
		for (const [id, specialist, name, docUrls] of SKILLS) {
			const areaId = specialistArea(specialist);
			const position = (inArea.get(areaId) ?? 0) + 1;
			inArea.set(areaId, position);
			skill.run(id, areaId, specialist, name, position, GUIDE_VERSION, JSON.stringify(docUrls));
		}
		db.raw.exec("COMMIT");
	} catch (error) {
		db.raw.exec("ROLLBACK");
		throw error;
	}
}

let singleton: CoachDb | undefined;

export function getCoachDb(): CoachDb {
	singleton ??= openCoachDb(process.env.COACH_DB_PATH ?? "./data/coach.db");
	return singleton;
}
