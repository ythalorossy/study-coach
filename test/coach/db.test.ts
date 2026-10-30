import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { openCoachDb, seedCoachDb } from "../../src/coach/db.ts";

type Row = Record<string, unknown>;

describe("coach db", () => {
	it("seeds five areas and 56 skills (15 identity and governance, 17 storage, 24 compute)", () => {
		const db = openCoachDb(":memory:");
		const areas = db.raw.prepare("SELECT COUNT(*) AS n FROM areas").get() as Row;
		const skills = db.raw.prepare("SELECT COUNT(*) AS n FROM skills").get() as Row;
		expect(areas.n).toBe(5);
		expect(skills.n).toBe(56);
		const sspr = db.raw.prepare("SELECT * FROM skills WHERE id = ?").get("identity.sspr") as Row;
		expect(sspr.specialist).toBe("identity");
		expect(sspr.area_id).toBe("identity-governance");
		expect(sspr.guide_version).toBe("2026-04-17");
	});

	it("seeding is idempotent", () => {
		const db = openCoachDb(":memory:");
		seedCoachDb(db);
		seedCoachDb(db);
		const skills = db.raw.prepare("SELECT COUNT(*) AS n FROM skills").get() as Row;
		expect(skills.n).toBe(56);
	});

	it("every skill has 2 to 4 learn.microsoft.com doc URLs", () => {
		const db = openCoachDb(":memory:");
		const rows = db.raw.prepare("SELECT id, doc_urls FROM skills").all() as Row[];
		expect(rows).toHaveLength(56);
		for (const row of rows) {
			const urls = JSON.parse(row.doc_urls as string) as string[];
			expect(urls.length).toBeGreaterThanOrEqual(2);
			expect(urls.length).toBeLessThanOrEqual(4);
			for (const url of urls) expect(url.startsWith("https://learn.microsoft.com/")).toBe(true);
		}
	});

	it("rejects an unknown question status", () => {
		const db = openCoachDb(":memory:");
		expect(() =>
			db.raw
				.prepare(
					"INSERT INTO questions (id, skill_id, format, body, key, explanation, sources, subtopics, guide_version, status, created_at) VALUES ('q1','identity.sspr','multiple-choice','{}','{}','{}','[]','[]','2026-04-17','rejected','now')",
				)
				.run(),
		).toThrow();
	});
});

describe("file-backed db", () => {
	it("uses WAL and a busy timeout so concurrent writers wait", () => {
		const dir = mkdtempSync(join(tmpdir(), "coach-db-"));
		try {
			const db = openCoachDb(join(dir, "coach.db"), { questionBank: false });
			expect((db.raw.prepare("PRAGMA journal_mode").get() as Row).journal_mode).toBe("wal");
			expect((db.raw.prepare("PRAGMA busy_timeout").get() as Row).timeout).toBeGreaterThan(0);
			db.raw.close();
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("adds sessions.area_id to a database created before it existed, keeping its sessions", () => {
		const path = join(mkdtempSync(join(tmpdir(), "migrate-")), "coach.db");
		const old = new DatabaseSync(path);
		old.exec(`CREATE TABLE sessions (
	id TEXT PRIMARY KEY,
	kind TEXT NOT NULL CHECK (kind IN ('lesson', 'practice')),
	skill_ids TEXT NOT NULL,
	title TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
)`);
		old.prepare("INSERT INTO sessions VALUES ('s1', 'lesson', '[\"identity.sspr\"]', 'Old', 'x', 'x')").run();
		old.close();
		const db = openCoachDb(path, { questionBank: false });
		const cols = (db.raw.prepare("PRAGMA table_info(sessions)").all() as { name: string }[]).map((c) => c.name);
		expect(cols).toContain("area_id");
		expect({ ...db.raw.prepare("SELECT id, title, area_id FROM sessions").get() }).toEqual({ id: "s1", title: "Old", area_id: null });
		db.raw.close();
		expect(() => openCoachDb(path, { questionBank: false })).not.toThrow();
	});
});
