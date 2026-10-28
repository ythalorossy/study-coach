import { beforeEach, describe, expect, it } from "vitest";
import { openCoachDb, type CoachDb } from "../../src/coach/db.ts";
import { GUIDE_VERSION } from "../../src/coach/seed.ts";
import {
	checkAnswer,
	responseSchemaFor,
	validateCandidate,
	type CandidateQuestion,
} from "../../src/coach/question-schema.ts";
import {
	flagQuestion,
	followupQuestion,
	insertQuestion,
	nextPracticeQuestion,
	recordAttempt,
	toPublicQuestion,
	UnknownQuestionError,
} from "../../src/coach/questions.ts";
import * as v from "valibot";
import {
	completeSentenceCorrect,
	completeSentenceFixture,
	dragDropCorrect,
	dragDropFixture,
	mcCorrect,
	mcFixture,
} from "./fixtures.ts";

const clone = <T>(x: T): T => structuredClone(x);
const readAt = (c: CandidateQuestion) =>
	Object.fromEntries(c.sources.map((s) => [s.url, "2026-04-17T00:00:00.000Z"]));

describe("checkAnswer", () => {
	it("multiple choice: right and wrong option", () => {
		expect(checkAnswer(mcFixture.body, mcFixture.key, mcCorrect)).toBe(true);
		expect(checkAnswer(mcFixture.body, mcFixture.key, { optionId: "a" })).toBe(false);
	});
	it("drag-drop: all slots right, no partial credit", () => {
		expect(checkAnswer(dragDropFixture.body, dragDropFixture.key, dragDropCorrect)).toBe(true);
		expect(checkAnswer(dragDropFixture.body, dragDropFixture.key, { ...dragDropCorrect, s3: "rg" })).toBe(false);
	});
	it("complete-sentence: missing slot or extra slot is wrong", () => {
		const { body, key } = completeSentenceFixture;
		expect(checkAnswer(body, key, completeSentenceCorrect)).toBe(true);
		expect(checkAnswer(body, key, { s1: "a" })).toBe(false);
		expect(checkAnswer(body, key, { ...completeSentenceCorrect, s9: "a" })).toBe(false);
	});
	it("malformed responses are false", () => {
		for (const f of [mcFixture, dragDropFixture, completeSentenceFixture]) {
			for (const bad of [null, undefined, "b", 3, [], ["b"], {}, { optionId: 1 }]) {
				expect(checkAnswer(f.body, f.key, bad)).toBe(false);
			}
		}
		expect(checkAnswer(dragDropFixture.body, dragDropFixture.key, JSON.parse('{"__proto__":"x"}'))).toBe(false);
	});
});

describe("validateCandidate", () => {
	it("accepts the three fixtures", () => {
		for (const f of [mcFixture, dragDropFixture, completeSentenceFixture]) {
			expect(validateCandidate(f)).toEqual({ ok: true, value: f });
		}
	});
	it("rejects 3 options for multiple choice", () => {
		const c = clone(mcFixture);
		if (c.body.format === "multiple-choice") c.body.options.pop();
		expect(validateCandidate(c).ok).toBe(false);
	});
	it("rejects a key naming an unknown option", () => {
		const c = clone(mcFixture);
		c.key = { optionId: "z" };
		const r = validateCandidate(c);
		expect(r.ok).toBe(false);
	});
	it("rejects a statement marker with no slot", () => {
		const c = clone(completeSentenceFixture);
		if (c.body.format === "complete-sentence") c.body.statement += " Then {{s9}}.";
		const r = validateCandidate(c);
		expect(r).toMatchObject({ ok: false });
		expect(!r.ok && r.reason).toContain("{{s9}}");
	});
	it("rejects a slot missing from the statement", () => {
		const c = clone(completeSentenceFixture);
		if (c.body.format === "complete-sentence") c.body.statement = "Enable {{s1}} only.";
		expect(validateCandidate(c).ok).toBe(false);
	});
	it("rejects a missing perChoice entry for each format", () => {
		const mc = clone(mcFixture);
		delete mc.explanation.perChoice.c;
		const dd = clone(dragDropFixture);
		delete dd.explanation.perChoice.sub;
		const cs = clone(completeSentenceFixture);
		delete cs.explanation.perChoice["s2:c"];
		for (const c of [mc, dd, cs]) expect(validateCandidate(c).ok).toBe(false);
	});
	it("rejects drag-drop keys that reuse an item or name an unknown one", () => {
		const reuse = clone(dragDropFixture);
		reuse.key = { s1: "mg", s2: "mg", s3: "res" };
		const unknown = clone(dragDropFixture);
		unknown.key = { s1: "mg", s2: "rg", s3: "nope" };
		expect(validateCandidate(reuse).ok).toBe(false);
		expect(validateCandidate(unknown).ok).toBe(false);
	});
	it("rejects non-kebab subtopics, bad sources and non-objects", () => {
		const c = clone(mcFixture);
		c.subtopics = ["Not Kebab"];
		expect(validateCandidate(c).ok).toBe(false);
		expect(validateCandidate(null).ok).toBe(false);
		expect(validateCandidate({ ...mcFixture, sources: [] }).ok).toBe(false);
	});
});

describe("responseSchemaFor", () => {
	it("matches each format's response shape", () => {
		expect(v.is(responseSchemaFor("multiple-choice"), mcCorrect)).toBe(true);
		expect(v.is(responseSchemaFor("multiple-choice"), dragDropCorrect)).toBe(false);
		expect(v.is(responseSchemaFor("drag-drop"), dragDropCorrect)).toBe(true);
		expect(v.is(responseSchemaFor("complete-sentence"), completeSentenceCorrect)).toBe(true);
		expect(v.is(responseSchemaFor("complete-sentence"), "x")).toBe(false);
	});
});

describe("question bank", () => {
	let db: CoachDb;
	beforeEach(() => {
		db = openCoachDb(":memory:");
	});
	const add = (c: CandidateQuestion) => insertQuestion(db, c, readAt(c));

	it("insertQuestion stores a verified row with sources and guide version", () => {
		const id = add(mcFixture);
		expect(id).toMatch(/^q_[0-9A-Z]{26}$/);
		const row = db.raw.prepare("SELECT * FROM questions WHERE id = ?").get(id)!;
		expect(row.status).toBe("verified");
		expect(row.guide_version).toBe(GUIDE_VERSION);
		expect(JSON.parse(row.sources as string)).toEqual([
			{ url: mcFixture.sources[0].url, readAt: "2026-04-17T00:00:00.000Z" },
		]);
	});

	it("toPublicQuestion has no key, explanation or sources", () => {
		const id = add(mcFixture);
		const out = nextPracticeQuestion(db, { skillIds: [mcFixture.skillId], sessionId: "s" })!;
		expect(out.id).toBe(id);
		expect(Object.keys(out).sort()).toEqual(["body", "format", "id", "skillId"]);
		const pub = toPublicQuestion({ ...out, key: mcFixture.key, explanation: mcFixture.explanation } as never);
		for (const k of ["key", "explanation", "sources"]) expect(pub).not.toHaveProperty(k);
	});

	describe("nextPracticeQuestion", () => {
		const skill = mcFixture.skillId;
		const variant = (n: number): CandidateQuestion => {
			const c = clone(mcFixture);
			c.body.stem = `${c.body.stem} Variant ${n}.`;
			return c;
		};
		it("returns null for an empty bank or empty skill list", () => {
			expect(nextPracticeQuestion(db, { skillIds: [skill], sessionId: "s" })).toBeNull();
			expect(nextPracticeQuestion(db, { skillIds: [], sessionId: "s" })).toBeNull();
		});
		it("never returns a flagged question", () => {
			const id = add(mcFixture);
			flagQuestion(db, id, "wrong");
			expect(nextPracticeQuestion(db, { skillIds: [skill], sessionId: "s" })).toBeNull();
			expect(db.raw.prepare("SELECT reason FROM flags WHERE question_id = ?").get(id)).toEqual({ reason: "wrong" });
		});
		it("never returns an excluded id", () => {
			const a = add(mcFixture);
			const b = add(variant(2));
			for (let i = 0; i < 10; i++) {
				const q = nextPracticeQuestion(db, { skillIds: [skill], sessionId: "s", excludeIds: [a], rng: () => i / 10 });
				expect(q?.id).toBe(b);
			}
			expect(nextPracticeQuestion(db, { skillIds: [skill], sessionId: "s", excludeIds: [a, b] })).toBeNull();
		});
		it("skips questions attempted in the same session only", () => {
			const id = add(mcFixture);
			recordAttempt(db, { questionId: id, response: mcCorrect, purpose: "practice", sessionId: "s1" });
			expect(nextPracticeQuestion(db, { skillIds: [skill], sessionId: "s1" })).toBeNull();
			expect(nextPracticeQuestion(db, { skillIds: [skill], sessionId: "s2" })?.id).toBe(id);
		});
		it("prefers never-attempted, then the oldest last attempt", () => {
			const a = add(variant(1));
			const b = add(variant(2));
			const c = add(variant(3));
			const at = (iso: string) => new Date(iso);
			recordAttempt(db, { questionId: a, response: mcCorrect, purpose: "practice", sessionId: "old", now: at("2026-01-02T00:00:00Z") });
			recordAttempt(db, { questionId: b, response: mcCorrect, purpose: "practice", sessionId: "old", now: at("2026-01-01T00:00:00Z") });
			recordAttempt(db, { questionId: b, response: mcCorrect, purpose: "practice", sessionId: "old2", now: at("2026-03-01T00:00:00Z") });
			const opts = { skillIds: [skill], sessionId: "new" };
			expect(nextPracticeQuestion(db, opts)?.id).toBe(c);
			recordAttempt(db, { questionId: c, response: mcCorrect, purpose: "practice", sessionId: "old3", now: at("2026-06-01T00:00:00Z") });
			// a's last attempt (Jan 2) is older than b's last (Mar 1), even though b has an older first attempt
			expect(nextPracticeQuestion(db, opts)?.id).toBe(a);
		});
		it("breaks ties deterministically with rng", () => {
			const ids = [add(variant(1)), add(variant(2)), add(variant(3))].sort();
			const opts = { skillIds: [skill], sessionId: "s" };
			expect(nextPracticeQuestion(db, { ...opts, rng: () => 0 })?.id).toBe(ids[0]);
			expect(nextPracticeQuestion(db, { ...opts, rng: () => 0.5 })?.id).toBe(ids[1]);
			expect(nextPracticeQuestion(db, { ...opts, rng: () => 0.999 })?.id).toBe(ids[2]);
		});
	});

	describe("followupQuestion", () => {
		it("picks a question sharing a subtopic, excluding the original", () => {
			const base = add(mcFixture);
			const other = clone(mcFixture);
			other.body.stem = "Different stem entirely about invitations.";
			other.subtopics = ["unrelated-topic"];
			const sharing = clone(mcFixture);
			sharing.body.stem = "Another guest scenario.";
			sharing.subtopics = ["b2b-invitations"];
			add(other);
			const sharedId = add(sharing);
			expect(followupQuestion(db, { questionId: base, sessionId: "s" })?.id).toBe(sharedId);
		});
		it("falls back to the same skill, skips attempted, and returns null when alone", () => {
			const base = add(mcFixture);
			expect(followupQuestion(db, { questionId: base, sessionId: "s" })).toBeNull();
			const other = clone(mcFixture);
			other.subtopics = ["unrelated-topic"];
			const otherId = add(other);
			expect(followupQuestion(db, { questionId: base, sessionId: "s" })?.id).toBe(otherId);
			recordAttempt(db, { questionId: otherId, response: mcCorrect, purpose: "followup", sessionId: "s" });
			expect(followupQuestion(db, { questionId: base, sessionId: "s" })).toBeNull();
		});
		it("ignores other skills", () => {
			const base = add(mcFixture);
			add(dragDropFixture);
			expect(followupQuestion(db, { questionId: base, sessionId: "s" })).toBeNull();
		});
	});

	describe("recordAttempt", () => {
		it("stores correct and purpose, and returns key, explanation and sources", () => {
			const id = add(mcFixture);
			const res = recordAttempt(db, { questionId: id, response: { optionId: "a" }, purpose: "practice", sessionId: "s" });
			expect(res.correct).toBe(false);
			expect(res.key).toEqual(mcFixture.key);
			expect(res.explanation).toEqual(mcFixture.explanation);
			expect(res.sources[0].url).toBe(mcFixture.sources[0].url);
			const row = db.raw.prepare("SELECT * FROM attempts").get()!;
			expect(row).toMatchObject({ correct: 0, purpose: "practice", session_id: "s", skill_id: mcFixture.skillId });
			expect(JSON.parse(row.response as string)).toEqual({ optionId: "a" });
		});
		it("a wrong lesson-check answer still marks the skill taught", () => {
			const id = add(mcFixture);
			recordAttempt(db, { questionId: id, response: { optionId: "a" }, purpose: "lesson-check", sessionId: "s" });
			expect(db.raw.prepare("SELECT skill_id FROM taught").all()).toEqual([{ skill_id: mcFixture.skillId }]);
		});
		it("a practice answer does not mark it taught", () => {
			const id = add(mcFixture);
			recordAttempt(db, { questionId: id, response: mcCorrect, purpose: "practice", sessionId: "s" });
			expect(db.raw.prepare("SELECT * FROM taught").all()).toEqual([]);
		});
		it("keeps working when taught already exists", () => {
			const id = add(mcFixture);
			for (let i = 0; i < 2; i++) {
				recordAttempt(db, { questionId: id, response: mcCorrect, purpose: "lesson-check", sessionId: `s${i}` });
			}
			expect(db.raw.prepare("SELECT * FROM taught").all()).toHaveLength(1);
		});
		it("throws UnknownQuestionError for an unknown id", () => {
			expect(() =>
				recordAttempt(db, { questionId: "q_nope", response: null, purpose: "practice", sessionId: "s" }),
			).toThrow(UnknownQuestionError);
			expect(() => flagQuestion(db, "q_nope", "x")).toThrow(UnknownQuestionError);
		});
	});
});
