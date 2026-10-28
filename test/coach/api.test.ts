import { beforeEach, describe, expect, it } from "vitest";
import { createCoachApi } from "../../src/coach/api.ts";
import { openCoachDb, type CoachDb } from "../../src/coach/db.ts";
import { flagQuestion, insertQuestion } from "../../src/coach/questions.ts";
import {
	completeSentenceFixture,
	dragDropFixture,
	mcCorrect,
	mcFixture,
} from "./fixtures.ts";

let db: CoachDb;
let api: ReturnType<typeof createCoachApi>;
const NOW = new Date(2026, 9, 20, 15, 30);

function seed(f: Parameters<typeof insertQuestion>[1]) {
	return insertQuestion(db, f, Object.fromEntries(f.sources.map((s) => [s.url, "2026-10-01"])));
}
// Response whose json() is untyped, so assertions can index into bodies.
type Res = Omit<Response, "json"> & { json(): Promise<any> };
function get(path: string): Promise<Res> {
	return Promise.resolve(api.request(path));
}
function post(path: string, body: unknown): Promise<Res> {
	return Promise.resolve(api.request(path, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	}));
}

beforeEach(() => {
	db = openCoachDb(":memory:");
	api = createCoachApi(() => db, { now: () => NOW });
});

describe("GET /skills", () => {
	it("lists all 56 skills with zero counts on an empty bank", async () => {
		const res = await get("/skills");
		const body = await res.json();
		expect(res.status).toBe(200);
		expect(body.skills).toHaveLength(56);
		expect(body.ready).toBe(false);
		expect(body.skills[0].questionCounts).toEqual({
			"multiple-choice": 0,
			"drag-drop": 0,
			"complete-sentence": 0,
		});
		expect(body.skills[0].taught).toBe(false);
		expect(body.skills[0].readiness.status).toBe("not-enough-data");
	});
});

describe("practice and answers", () => {
	it("404s no-questions on an empty bank", async () => {
		const res = await post("/practice/next", { skillIds: ["identity.external-users"], sessionId: "s" });
		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: "no-questions" });
	});

	it("rejects unknown skill ids", async () => {
		const res = await post("/practice/next", { skillIds: ["nope"], sessionId: "s" });
		expect(res.status).toBe(400);
		expect((await res.json()).error).toBe("invalid-request");
	});

	it("honours excludeIds and validates it", async () => {
		const id = seed(mcFixture);
		const skillIds = ["identity.external-users"];
		const skipped = await post("/practice/next", { skillIds, sessionId: "s", excludeIds: [id] });
		expect(skipped.status).toBe(404);
		expect((await post("/practice/next", { skillIds, sessionId: "s", excludeIds: [] })).status).toBe(200);
		expect((await post("/practice/next", { skillIds, sessionId: "s", excludeIds: [1] })).status).toBe(400);
	});

	it("serves a question without its key", async () => {
		seed(mcFixture);
		const res = await post("/practice/next", { skillIds: ["identity.external-users"], sessionId: "s" });
		expect(res.status).toBe(200);
		const q = await res.json();
		expect(q.skillId).toBe("identity.external-users");
		expect(q.key).toBeUndefined();
	});

	it("returns the key for a wrong answer and marks the skill taught on lesson-check", async () => {
		const id = seed(mcFixture);
		const res = await post("/answers", {
			questionId: id,
			response: { optionId: "a" },
			purpose: "lesson-check",
			sessionId: "s",
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.correct).toBe(false);
		expect(body.key).toEqual(mcCorrect);
		const skills = (await (await get("/skills")).json()).skills;
		const s = skills.find((x: { id: string }) => x.id === "identity.external-users");
		expect(s.taught).toBe(true);
		expect(s.questionCounts["multiple-choice"]).toBe(1);
		expect(s.readiness.attempts).toBe(1);
	});

	it("400s a missing questionId and 404s an unknown question", async () => {
		const bad = await post("/answers", { response: {}, purpose: "practice", sessionId: "s" });
		expect(bad.status).toBe(400);
		const unknown = await post("/answers", {
			questionId: "q_nope",
			response: {},
			purpose: "practice",
			sessionId: "s",
		});
		expect(unknown.status).toBe(404);
		expect(await unknown.json()).toEqual({ error: "unknown-question" });
	});

	it("records an answer for an unknown session without creating it", async () => {
		const id = seed(mcFixture);
		const res = await post("/answers", { questionId: id, response: mcCorrect, purpose: "practice", sessionId: "ghost" });
		expect(res.status).toBe(200);
		expect(db.raw.prepare("SELECT COUNT(*) AS n FROM attempts").get()?.n).toBe(1);
		expect(db.raw.prepare("SELECT COUNT(*) AS n FROM sessions").get()?.n).toBe(0);
	});

	it("touches the session's updated_at", async () => {
		const id = seed(mcFixture);
		const s = await (await post("/sessions", { kind: "practice", skillIds: ["identity.external-users"] })).json();
		db.raw.prepare("UPDATE sessions SET updated_at = '2000-01-01T00:00:00.000Z' WHERE id = ?").run(s.id);
		await post("/answers", { questionId: id, response: mcCorrect, purpose: "practice", sessionId: s.id });
		const row = db.raw.prepare("SELECT updated_at FROM sessions WHERE id = ?").get(s.id);
		expect(row?.updated_at).not.toBe("2000-01-01T00:00:00.000Z");
	});
});

describe("flags", () => {
	it("stops serving a flagged question and lists it in coverage", async () => {
		const id = seed(mcFixture);
		const res = await post(`/questions/${id}/flag`, { reason: "ambiguous" });
		expect(res.status).toBe(204);
		const next = await post("/practice/next", { skillIds: ["identity.external-users"], sessionId: "s" });
		expect(next.status).toBe(404);
		const cov = await (await get("/coverage")).json();
		expect(cov.flags).toHaveLength(1);
		expect(cov.flags[0]).toMatchObject({ questionId: id, skillId: "identity.external-users", reason: "ambiguous" });
		expect(cov.flags[0].stem).toContain("fabrikam.example");
		const ext = cov.skills.find((s: { id: string }) => s.id === "identity.external-users");
		expect(ext.counts["multiple-choice"]).toBe(0);
	});

	it("validates the reason and the question", async () => {
		const id = seed(mcFixture);
		expect((await post(`/questions/${id}/flag`, { reason: "" })).status).toBe(400);
		expect((await post(`/questions/${id}/flag`, { reason: "x".repeat(501) })).status).toBe(400);
		const res = await post("/questions/q_nope/flag", { reason: "x" });
		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: "unknown-question" });
	});
});

describe("sessions", () => {
	it("creates ids from local time and titles", async () => {
		const a = await post("/sessions", { kind: "lesson", skillIds: ["identity.sspr"] });
		expect(a.status).toBe(201);
		const aj = await a.json();
		expect(aj.id).toBe("lesson-identity.sspr-202610201530");
		expect(aj.title).toBe(
			db.raw.prepare("SELECT name FROM skills WHERE id = 'identity.sspr'").get()?.name,
		);
		const b = await (await post("/sessions", { kind: "lesson", skillIds: [] })).json();
		expect(b).toMatchObject({ id: "lesson-202610201530", title: "Lead's choice" });
		const c = await (await post("/sessions", { kind: "practice", skillIds: ["identity.sspr", "access.role-scopes"] })).json();
		expect(c).toMatchObject({ id: "practice-202610201530", title: "Practice: 2 skills" });
		const d = await (await post("/sessions", { kind: "practice", skillIds: ["identity.sspr"] })).json();
		expect(d.id).toBe("practice-202610201530-2");
		const e = await (await post("/sessions", { kind: "practice", skillIds: ["identity.sspr"] })).json();
		expect(e.id).toBe("practice-202610201530-3");
	});

	it("rejects empty practice, unknown skills and bad kinds", async () => {
		expect((await post("/sessions", { kind: "practice", skillIds: [] })).status).toBe(400);
		expect((await post("/sessions", { kind: "lesson", skillIds: ["nope"] })).status).toBe(400);
		expect((await post("/sessions", { kind: "quiz", skillIds: [] })).status).toBe(400);
	});

	it("gets a session by id even beyond the 20 most recent, and 404s an unknown id", async () => {
		for (let i = 0; i < 22; i++) {
			db.raw
				.prepare("INSERT INTO sessions (id, kind, skill_ids, title, created_at, updated_at) VALUES (?, 'practice', '[\"identity.sspr\"]', 't', ?, ?)")
				.run(`s${i}`, "2026-01-01", `2026-01-${String(i + 1).padStart(2, "0")}`);
		}
		const res = await get("/sessions/s0");
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			id: "s0",
			kind: "practice",
			skillIds: ["identity.sspr"],
			areaId: "identity-governance",
			title: "t",
			createdAt: "2026-01-01",
			updatedAt: "2026-01-01",
		});
		const missing = await get("/sessions/nope");
		expect(missing.status).toBe(404);
		expect(await missing.json()).toEqual({ error: "unknown-session" });
	});

	it("lists the 20 most recently updated", async () => {
		for (let i = 0; i < 22; i++) {
			db.raw
				.prepare("INSERT INTO sessions (id, kind, skill_ids, title, created_at, updated_at) VALUES (?, 'practice', '[\"identity.sspr\"]', 't', ?, ?)")
				.run(`s${i}`, "2026-01-01", `2026-01-${String(i + 1).padStart(2, "0")}`);
		}
		const body = await (await get("/sessions")).json();
		expect(body.sessions).toHaveLength(20);
		expect(body.sessions[0].id).toBe("s21");
	});
});

describe("GET /coverage", () => {
	it("counts verified questions by format and subtopic", async () => {
		seed(mcFixture);
		seed(dragDropFixture);
		seed(completeSentenceFixture);
		const flagged = seed(mcFixture);
		flagQuestion(db, flagged, "dup");
		const cov = await (await get("/coverage")).json();
		expect(cov.target).toEqual({ "multiple-choice": 8, "drag-drop": 6, "complete-sentence": 6 });
		expect(cov.skills).toHaveLength(56);
		const ext = cov.skills.find((s: { id: string }) => s.id === "identity.external-users");
		expect(ext.counts).toEqual({ "multiple-choice": 1, "drag-drop": 0, "complete-sentence": 0 });
		expect(ext.subtopics).toEqual({ "guest-users": 1, "b2b-invitations": 1 });
		const sspr = cov.skills.find((s: { id: string }) => s.id === "identity.sspr");
		expect(sspr.counts["complete-sentence"]).toBe(1);
	});
});

describe("areas", () => {
	function attempt(skillId: string, i: number) {
		db.raw
			.prepare(
				"INSERT INTO attempts (question_id, skill_id, format, response, correct, purpose, session_id, answered_at) VALUES (?, ?, 'multiple-choice', '{}', 1, 'practice', NULL, ?)",
			)
			.run(`q-${skillId}-${i}`, skillId, `2026-10-20T10:00:0${i}.000Z`);
	}

	it("summarises readiness per area", async () => {
		const body = await (await get("/skills")).json();
		expect(body.totalAreas).toBe(5);
		expect(body.readyAreas).toBe(0);
		expect(body.areas.map((a: { id: string }) => a.id)).toEqual(["identity-governance", "storage", "compute", "networking", "monitoring"]);
		expect(body.areas.find((a: { id: string }) => a.id === "networking")).toMatchObject({ skillCount: 0, ready: false });
		expect(body.areas.find((a: { id: string }) => a.id === "storage")).toMatchObject({
			name: "Implement and manage storage",
			skillCount: 17,
			weightMin: 15,
			weightMax: 20,
			ready: false,
		});
	});

	it("marks an area ready when every skill in it scores 0.8 or more", async () => {
		const ids = (db.raw.prepare("SELECT id FROM skills WHERE area_id = 'identity-governance'").all() as { id: string }[]).map((r) => r.id);
		for (const id of ids) for (let i = 0; i < 5; i++) attempt(id, i);
		const body = await (await get("/skills")).json();
		expect(body.readyAreas).toBe(1);
		expect(body.areas[0].ready).toBe(true);
		expect(body.areas[1].ready).toBe(false);
		expect(body.ready).toBe(false);
	});

	it("creates a lead-choice lesson scoped to an area", async () => {
		const res = await post("/sessions", { kind: "lesson", skillIds: [], areaId: "storage" });
		expect(res.status).toBe(201);
		expect(await res.json()).toMatchObject({ title: "Lead's choice: Implement and manage storage", areaId: "storage" });
		expect((await post("/sessions", { kind: "lesson", skillIds: [], areaId: "nope" })).status).toBe(400);
	});

	it("derives the area of an older session from its skill", async () => {
		db.raw
			.prepare("INSERT INTO sessions (id, kind, skill_ids, title, created_at, updated_at) VALUES ('old', 'lesson', ?, 'Tiers', 'x', 'x')")
			.run(JSON.stringify(["storage.tiers"]));
		expect(await (await get("/sessions/old")).json()).toMatchObject({ areaId: "storage" });
		db.raw
			.prepare("INSERT INTO sessions (id, kind, skill_ids, title, created_at, updated_at) VALUES ('old2', 'lesson', '[]', 'Lead', 'x', 'x')")
			.run();
		expect(await (await get("/sessions/old2")).json()).toMatchObject({ areaId: null });
	});

	it("tags coverage rows with their area", async () => {
		const cov = await (await get("/coverage")).json();
		expect(cov.skills[0]).toMatchObject({ id: "identity.create-users-groups", areaId: "identity-governance" });
		expect(cov.skills[15]).toMatchObject({ id: "storage.firewalls", areaId: "storage" });
	});
});

