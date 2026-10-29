import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { openCoachDb, type CoachDb } from "../../src/coach/db.ts";
import {
	exportQuestionBank,
	importQuestionBank,
	importQuestionBankIfEmpty,
	readBankFile,
} from "../../src/coach/question-bank.ts";
import { flagQuestion, insertQuestion } from "../../src/coach/questions.ts";
import { dragDropFixture, mcFixture } from "./fixtures.ts";

const readAt = (urls: string[]) => Object.fromEntries(urls.map((u) => [u, "2026-04-17T00:00:00.000Z"]));
const add = (db: CoachDb, c: typeof mcFixture) => insertQuestion(db, c, readAt(c.sources.map((s) => s.url)));

let db: CoachDb;
let root: string;
beforeEach(() => {
	db = openCoachDb(":memory:");
	root = mkdtempSync(join(tmpdir(), "bank-"));
});

describe("question bank", () => {
	it("exports verified questions per skill and leaves flagged ones out", () => {
		const keep = add(db, mcFixture);
		const flagged = add(db, dragDropFixture);
		flagQuestion(db, flagged, "wrong key");
		expect(exportQuestionBank(db, root)).toEqual({ skills: 1, questions: 1 });
		const file = readBankFile(join(root, `${mcFixture.skillId}.json`));
		expect(file.questions.map((q) => q.id)).toEqual([keep]);
		expect(file.questions[0].reviewed).toBe(false);
		expect(file.questions[0].sources).toEqual([{ url: mcFixture.sources[0].url }]);
	});

	it("keeps reviewed marks when exporting again", () => {
		add(db, mcFixture);
		exportQuestionBank(db, root);
		const path = join(root, `${mcFixture.skillId}.json`);
		const file = readBankFile(path);
		file.questions[0].reviewed = true;
		writeFileSync(path, JSON.stringify(file));
		exportQuestionBank(db, root);
		expect(readBankFile(path).questions[0].reviewed).toBe(true);
	});

	it("imports into an empty database and is idempotent", () => {
		const id = add(db, mcFixture);
		exportQuestionBank(db, root);
		const fresh = openCoachDb(":memory:");
		expect(importQuestionBank(fresh, root)).toEqual({ added: 1, existing: 0, invalid: [] });
		expect(importQuestionBank(fresh, root)).toEqual({ added: 0, existing: 1, invalid: [] });
		const row = fresh.raw.prepare("SELECT status, skill_id FROM questions WHERE id = ?").get(id);
		expect(row).toMatchObject({ status: "verified", skill_id: mcFixture.skillId });
	});

	it("only fills a database that has no questions", () => {
		add(db, mcFixture);
		exportQuestionBank(db, root);
		const fresh = openCoachDb(":memory:");
		expect(importQuestionBankIfEmpty(fresh, root)?.added).toBe(1);
		expect(importQuestionBankIfEmpty(fresh, root)).toBeNull();
	});

	it("skips questions that fail validation and files for unknown skills", () => {
		add(db, mcFixture);
		exportQuestionBank(db, root);
		const path = join(root, `${mcFixture.skillId}.json`);
		const file = readBankFile(path);
		file.questions[0].key = { optionId: "zzz" };
		writeFileSync(path, JSON.stringify(file));
		writeFileSync(join(root, "nope.json"), JSON.stringify({ skill: "nope.skill", questions: [] }));
		const fresh = openCoachDb(":memory:");
		const res = importQuestionBank(fresh, root);
		expect(res.added).toBe(0);
		expect(res.invalid).toHaveLength(2);
		expect(res.invalid[0]).toContain("unknown option");
	});

	it("does nothing when the bank folder is missing", () => {
		expect(importQuestionBank(db, join(root, "missing"))).toEqual({ added: 0, existing: 0, invalid: [] });
	});
});

describe("first run through openCoachDb", () => {
	it("loads the bank into a new file database, and skips it when told to", () => {
		add(db, mcFixture);
		exportQuestionBank(db, root);
		const count = (d: CoachDb) => (d.raw.prepare("SELECT COUNT(*) AS n FROM questions").get() as { n: number }).n;
		expect(count(openCoachDb(join(root, "a", "coach.db"), { questionBank: root }))).toBe(1);
		expect(count(openCoachDb(join(root, "b", "coach.db"), { questionBank: false }))).toBe(0);
	});
});
