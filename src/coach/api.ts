import { Hono } from "hono";
import * as v from "valibot";
import type { CoachDb } from "./db.ts";
import { createDocsApi, type DocsApiOptions } from "./docs/docs-api.ts";
import { flagQuestion, nextPracticeQuestion, recordAttempt, UnknownQuestionError } from "./questions/questions.ts";
import { skillProgress } from "./progress.ts";
import { COVERAGE_TARGET, overallReady } from "./readiness.ts";
import type { QuestionFormat } from "./exam/types.ts";

const FORMATS = Object.keys(COVERAGE_TARGET) as QuestionFormat[];

const SessionBody = v.object({
	kind: v.picklist(["lesson", "practice"]),
	skillIds: v.array(v.string()),
	areaId: v.optional(v.string()),
});
const PracticeBody = v.object({
	skillIds: v.array(v.string()),
	sessionId: v.string(),
	excludeIds: v.optional(v.array(v.string())),
});
const AnswerBody = v.object({
	questionId: v.string(),
	response: v.unknown(),
	purpose: v.picklist(["practice", "lesson-check", "followup"]),
	sessionId: v.string(),
});
const FlagBody = v.object({ reason: v.pipe(v.string(), v.minLength(1), v.maxLength(500)) });

function emptyCounts(): Record<QuestionFormat, number> {
	return Object.fromEntries(FORMATS.map((f) => [f, 0])) as Record<QuestionFormat, number>;
}

function pad(n: number): string {
	return String(n).padStart(2, "0");
}

/** Local time as yyyyMMddHHmm. */
function timestamp(d: Date): string {
	return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function createCoachApi(getDb: () => CoachDb, opts: { now?: () => Date; docs?: DocsApiOptions } = {}): Hono {
	const now = opts.now ?? (() => new Date());
	const api = new Hono();
	api.route("/docs", createDocsApi(opts.docs));

	async function parse<T extends v.GenericSchema>(
		c: { req: { json(): Promise<unknown> } },
		schema: T,
	): Promise<{ ok: true; data: v.InferOutput<T> } | { ok: false; detail: string }> {
		let raw: unknown;
		try {
			raw = await c.req.json();
		} catch {
			return { ok: false, detail: "Body must be JSON" };
		}
		const res = v.safeParse(schema, raw);
		if (res.success) return { ok: true, data: res.output };
		return { ok: false, detail: res.issues.map((i) => i.message).join("; ") };
	}

	function unknownSkills(db: CoachDb, skillIds: string[]): string[] {
		const known = new Set(db.raw.prepare("SELECT id FROM skills").all().map((r) => r.id as string));
		return skillIds.filter((id) => !known.has(id));
	}

	api.get("/skills", (c) => {
		const db = getDb();
		const counts = new Map<string, Record<QuestionFormat, number>>();
		for (const r of db.raw
			.prepare("SELECT skill_id, format, COUNT(*) AS n FROM questions WHERE status = 'verified' GROUP BY skill_id, format")
			.all()) {
			const m = counts.get(r.skill_id as string) ?? emptyCounts();
			m[r.format as QuestionFormat] = r.n as number;
			counts.set(r.skill_id as string, m);
		}
		const out = skillProgress(db).map((s) => ({ ...s, questionCounts: counts.get(s.id) ?? emptyCounts() }));
		const areas = (db.raw.prepare("SELECT * FROM areas ORDER BY position").all() as Record<string, unknown>[]).map((a) => {
			const skills = out.filter((s) => s.areaId === a.id);
			return {
				id: a.id as string,
				name: a.name as string,
				weightMin: a.weight_min as number,
				weightMax: a.weight_max as number,
				// An area without skills yet ("coming later") is never ready.
				ready: skills.length > 0 && overallReady(skills.map((s) => s.readiness)),
				skillCount: skills.length,
			};
		});
		const readyAreas = areas.filter((a) => a.ready).length;
		return c.json({ skills: out, areas, readyAreas, totalAreas: areas.length, ready: readyAreas === areas.length });
	});

	api.post("/sessions", async (c) => {
		const db = getDb();
		const p = await parse(c, SessionBody);
		if (!p.ok) return c.json({ error: "invalid-request", detail: p.detail }, 400);
		const { kind, skillIds, areaId } = p.data;
		const area = areaId ? (db.raw.prepare("SELECT name FROM areas WHERE id = ?").get(areaId) as { name: string } | undefined) : undefined;
		if (areaId && !area) return c.json({ error: "invalid-request", detail: `Unknown area: ${areaId}` }, 400);
		if (kind === "practice" && skillIds.length === 0) {
			return c.json({ error: "invalid-request", detail: "A practice session needs at least one skill" }, 400);
		}
		const bad = unknownSkills(db, skillIds);
		if (bad.length > 0) return c.json({ error: "invalid-request", detail: `Unknown skills: ${bad.join(", ")}` }, 400);

		const at = now();
		const ts = timestamp(at);
		const names = skillIds.map((id) => db.raw.prepare("SELECT name FROM skills WHERE id = ?").get(id)?.name as string);
		let title: string;
		if (kind === "lesson") title = names[0] ?? (area ? `Lead's choice: ${area.name}` : "Lead's choice");
		else title = names.length === 1 ? names[0] : `Practice: ${names.length} skills`;
		const base = kind === "lesson" ? (skillIds[0] ? `lesson-${skillIds[0]}-${ts}` : `lesson-${ts}`) : `practice-${ts}`;
		let id = base;
		for (let n = 2; db.raw.prepare("SELECT 1 FROM sessions WHERE id = ?").get(id); n++) id = `${base}-${n}`;
		const iso = at.toISOString();
		db.raw
			.prepare("INSERT INTO sessions (id, kind, skill_ids, title, created_at, updated_at, area_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
			.run(id, kind, JSON.stringify(skillIds), title, iso, iso, areaId ?? null);
		return c.json({ id, kind, skillIds, title, areaId: areaId ?? areaOfSkills(db, skillIds) }, 201);
	});

	function areaOfSkills(db: CoachDb, skillIds: string[]): string | null {
		if (!skillIds.length) return null;
		const row = db.raw.prepare("SELECT area_id FROM skills WHERE id = ?").get(skillIds[0]) as { area_id: string } | undefined;
		return row?.area_id ?? null;
	}

	function sessionJson(r: Record<string, unknown>) {
		const skillIds = JSON.parse(r.skill_ids as string) as string[];
		return {
			id: r.id,
			kind: r.kind,
			skillIds,
			// Sessions from before areas have no area_id; their first skill tells.
			areaId: (r.area_id as string | null) ?? areaOfSkills(getDb(), skillIds),
			title: r.title,
			createdAt: r.created_at,
			updatedAt: r.updated_at,
		};
	}

	api.get("/sessions", (c) => {
		const rows = getDb()
			.raw.prepare("SELECT * FROM sessions ORDER BY updated_at DESC, created_at DESC LIMIT 20")
			.all();
		return c.json({ sessions: rows.map(sessionJson) });
	});

	api.get("/sessions/:id", (c) => {
		const row = getDb().raw.prepare("SELECT * FROM sessions WHERE id = ?").get(c.req.param("id"));
		if (!row) return c.json({ error: "unknown-session" }, 404);
		return c.json(sessionJson(row));
	});

	api.post("/practice/next", async (c) => {
		const db = getDb();
		const p = await parse(c, PracticeBody);
		if (!p.ok) return c.json({ error: "invalid-request", detail: p.detail }, 400);
		const bad = unknownSkills(db, p.data.skillIds);
		if (bad.length > 0) return c.json({ error: "invalid-request", detail: `Unknown skills: ${bad.join(", ")}` }, 400);
		const q = nextPracticeQuestion(db, p.data);
		if (!q) return c.json({ error: "no-questions" }, 404);
		return c.json(q);
	});

	api.post("/answers", async (c) => {
		const db = getDb();
		const p = await parse(c, AnswerBody);
		if (!p.ok) return c.json({ error: "invalid-request", detail: p.detail }, 400);
		try {
			const at = now();
			const result = recordAttempt(db, { ...p.data, now: at });
			db.raw.prepare("UPDATE sessions SET updated_at = ? WHERE id = ?").run(at.toISOString(), p.data.sessionId);
			return c.json(result);
		} catch (e) {
			if (e instanceof UnknownQuestionError) return c.json({ error: "unknown-question" }, 404);
			throw e;
		}
	});

	api.post("/questions/:id/flag", async (c) => {
		const p = await parse(c, FlagBody);
		if (!p.ok) return c.json({ error: "invalid-request", detail: p.detail }, 400);
		try {
			flagQuestion(getDb(), c.req.param("id"), p.data.reason);
		} catch (e) {
			if (e instanceof UnknownQuestionError) return c.json({ error: "unknown-question" }, 404);
			throw e;
		}
		return c.body(null, 204);
	});

	api.get("/coverage", (c) => {
		const db = getDb();
		const skills = db.raw
			.prepare("SELECT s.id, s.name, s.area_id FROM skills s JOIN areas a ON a.id = s.area_id ORDER BY a.position, s.position")
			.all();
		const bySkill = new Map<string, { counts: Record<QuestionFormat, number>; subtopics: Record<string, number> }>();
		for (const r of db.raw
			.prepare("SELECT skill_id, format, subtopics FROM questions WHERE status = 'verified'")
			.all()) {
			const e = bySkill.get(r.skill_id as string) ?? { counts: emptyCounts(), subtopics: {} };
			e.counts[r.format as QuestionFormat]++;
			for (const t of JSON.parse(r.subtopics as string) as string[]) e.subtopics[t] = (e.subtopics[t] ?? 0) + 1;
			bySkill.set(r.skill_id as string, e);
		}
		const flags = db.raw
			.prepare(
				`SELECT f.question_id, f.reason, f.created_at, q.skill_id, q.body
				 FROM flags f JOIN questions q ON q.id = f.question_id ORDER BY f.id`,
			)
			.all()
			.map((r) => ({
				questionId: r.question_id,
				skillId: r.skill_id,
				reason: r.reason,
				createdAt: r.created_at,
				stem: (JSON.parse(r.body as string) as { stem: string }).stem,
			}));
		return c.json({
			target: COVERAGE_TARGET,
			skills: skills.map((s) => ({
				id: s.id,
				name: s.name,
				areaId: s.area_id,
				counts: bySkill.get(s.id as string)?.counts ?? emptyCounts(),
				subtopics: bySkill.get(s.id as string)?.subtopics ?? {},
			})),
			flags,
		});
	});

	return api;
}
