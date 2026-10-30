import { randomBytes } from "node:crypto";
import type { CoachDb } from "../db.ts";
import { GUIDE_VERSION } from "../exam/seed.ts";
import {
	checkAnswer,
	type CandidateQuestion,
	type Explanation,
	type Key,
	type PublicQuestion,
	type QuestionBody,
	shuffleBody,
} from "./question-schema.ts";
import type { AttemptPurpose, QuestionFormat } from "../exam/types.ts";

export type { CandidateQuestion, Explanation, Key, PublicQuestion, QuestionBody };

export interface StoredSource {
	url: string;
	readAt: string;
}

interface QuestionRow {
	id: string;
	skillId: string;
	format: QuestionFormat;
	body: QuestionBody;
	key: Key;
	explanation: Explanation;
	sources: StoredSource[];
	subtopics: string[];
}

export class UnknownQuestionError extends Error {
	constructor(questionId: string) {
		super(`Unknown question: ${questionId}`);
		this.name = "UnknownQuestionError";
	}
}

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function newQuestionId(): string {
	let time = "";
	let t = Date.now();
	for (let i = 0; i < 10; i++) {
		time = CROCKFORD[t % 32] + time;
		t = Math.floor(t / 32);
	}
	const rand = Array.from(randomBytes(16), (b) => CROCKFORD[b % 32]).join("");
	return `q_${time}${rand}`;
}

function parseRow(r: Record<string, unknown>): QuestionRow {
	return {
		id: r.id as string,
		skillId: r.skill_id as string,
		format: r.format as QuestionFormat,
		body: JSON.parse(r.body as string),
		key: JSON.parse(r.key as string),
		explanation: JSON.parse(r.explanation as string),
		sources: JSON.parse(r.sources as string),
		subtopics: JSON.parse(r.subtopics as string),
	};
}

function getRow(db: CoachDb, id: string): QuestionRow | null {
	const r = db.raw.prepare("SELECT * FROM questions WHERE id = ?").get(id);
	return r ? parseRow(r) : null;
}

export function toPublicQuestion(
	row: { id: string; skillId: string; format: QuestionFormat; body: QuestionBody },
	rng: () => number = Math.random,
): PublicQuestion {
	return { id: row.id, skillId: row.skillId, format: row.format, body: shuffleBody(row.body, rng) };
}

export function insertQuestion(db: CoachDb, c: CandidateQuestion, readAt: Record<string, string>): string {
	const id = newQuestionId();
	const sources: StoredSource[] = c.sources.map((s) => ({ url: s.url, readAt: readAt[s.url] }));
	db.raw
		.prepare(
			`INSERT INTO questions (id, skill_id, format, body, key, explanation, sources, subtopics, guide_version, status, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?)`,
		)
		.run(
			id,
			c.skillId,
			c.body.format,
			JSON.stringify(c.body),
			JSON.stringify(c.key),
			JSON.stringify(c.explanation),
			JSON.stringify(sources),
			JSON.stringify(c.subtopics),
			GUIDE_VERSION,
			new Date().toISOString(),
		);
	return id;
}

function sessionAttempted(db: CoachDb, sessionId: string): Set<string> {
	const rows = db.raw
		.prepare("SELECT DISTINCT question_id FROM attempts WHERE session_id = ?")
		.all(sessionId);
	return new Set(rows.map((r) => r.question_id as string));
}

export function nextPracticeQuestion(
	db: CoachDb,
	opts: { skillIds: string[]; sessionId: string; excludeIds?: string[]; rng?: () => number },
): PublicQuestion | null {
	const rng = opts.rng ?? Math.random;
	if (opts.skillIds.length === 0) return null;
	const marks = opts.skillIds.map(() => "?").join(", ");
	const rows = db.raw
		.prepare(
			`SELECT q.*, (SELECT MAX(a.answered_at) FROM attempts a WHERE a.question_id = q.id) AS last_attempt
			 FROM questions q WHERE q.status = 'verified' AND q.skill_id IN (${marks})
			 ORDER BY q.id`,
		)
		.all(...opts.skillIds);
	const seen = sessionAttempted(db, opts.sessionId);
	const excluded = new Set(opts.excludeIds ?? []);
	const pool = rows.filter((r) => !seen.has(r.id as string) && !excluded.has(r.id as string));
	if (pool.length === 0) return null;
	// Never attempted sorts before any timestamp (ISO strings sort chronologically).
	const rank = (r: Record<string, unknown>) => (r.last_attempt as string | null) ?? "";
	const best = pool.reduce((m, r) => (rank(r) < m ? rank(r) : m), rank(pool[0]));
	const tied = pool.filter((r) => rank(r) === best);
	return toPublicQuestion(parseRow(tied[Math.min(Math.floor(rng() * tied.length), tied.length - 1)]), rng);
}

export function followupQuestion(
	db: CoachDb,
	opts: { questionId: string; sessionId: string; rng?: () => number },
): PublicQuestion | null {
	const origin = getRow(db, opts.questionId);
	if (!origin) return null;
	const seen = sessionAttempted(db, opts.sessionId);
	const candidates = db.raw
		.prepare("SELECT * FROM questions WHERE status = 'verified' AND skill_id = ? AND id != ? ORDER BY id")
		.all(origin.skillId, origin.id)
		.filter((r) => !seen.has(r.id as string))
		.map(parseRow);
	const shared = candidates.find((c) => c.subtopics.some((s) => origin.subtopics.includes(s)));
	const pick = shared ?? candidates[0];
	return pick ? toPublicQuestion(pick, opts.rng) : null;
}

export function recordAttempt(
	db: CoachDb,
	opts: { questionId: string; response: unknown; purpose: AttemptPurpose; sessionId: string; now?: Date },
): { correct: boolean; key: Key; explanation: Explanation; sources: StoredSource[] } {
	const q = getRow(db, opts.questionId);
	if (!q) throw new UnknownQuestionError(opts.questionId);
	const correct = checkAnswer(q.body, q.key, opts.response);
	const at = (opts.now ?? new Date()).toISOString();
	db.raw
		.prepare(
			`INSERT INTO attempts (question_id, skill_id, format, correct, response, purpose, session_id, answered_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.run(
			q.id,
			q.skillId,
			q.format,
			correct ? 1 : 0,
			JSON.stringify(opts.response ?? null),
			opts.purpose,
			opts.sessionId,
			at,
		);
	if (opts.purpose === "lesson-check") {
		// Taught means the learner answered the check; correctness only affects readiness.
		db.raw
			.prepare("INSERT INTO taught (skill_id, taught_at) VALUES (?, ?) ON CONFLICT(skill_id) DO NOTHING")
			.run(q.skillId, at);
	}
	return { correct, key: q.key, explanation: q.explanation, sources: q.sources };
}

export function flagQuestion(db: CoachDb, questionId: string, reason: string): void {
	const res = db.raw.prepare("UPDATE questions SET status = 'flagged' WHERE id = ?").run(questionId);
	if (res.changes === 0) throw new UnknownQuestionError(questionId);
	db.raw
		.prepare("INSERT INTO flags (question_id, reason, created_at) VALUES (?, ?, ?)")
		.run(questionId, reason, new Date().toISOString());
}

/** Every stored question of a skill, whatever its status, as candidates (for the duplicate check). */
export function listSkillCandidates(db: CoachDb, skillId: string): (CandidateQuestion & { id: string })[] {
	return db.raw
		.prepare("SELECT * FROM questions WHERE skill_id = ? ORDER BY id")
		.all(skillId)
		.map(parseRow)
		.map((r) => ({
			id: r.id,
			skillId: r.skillId,
			body: r.body,
			key: r.key,
			explanation: r.explanation,
			sources: r.sources.map((s) => ({ url: s.url })),
			subtopics: r.subtopics,
		}));
}
