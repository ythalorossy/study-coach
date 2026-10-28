import type { CoachDb } from "./db.ts";
import { type Readiness, skillReadiness } from "./readiness.ts";

export interface SkillProgress {
	id: string;
	areaId: string;
	specialist: string;
	name: string;
	taught: boolean;
	readiness: Readiness;
}

/** Skills in guide order (area, then position) with taught flag and readiness, computed from attempts. */
export function skillProgress(db: CoachDb): SkillProgress[] {
	const skills = db.raw
		.prepare("SELECT s.* FROM skills s JOIN areas a ON a.id = s.area_id ORDER BY a.position, s.position")
		.all();
	const taught = new Set(db.raw.prepare("SELECT skill_id FROM taught").all().map((r) => r.skill_id as string));
	const attempts = new Map<string, { correct: boolean; answeredAt: string }[]>();
	for (const r of db.raw.prepare("SELECT skill_id, correct, answered_at FROM attempts ORDER BY answered_at DESC, id DESC").all()) {
		const list = attempts.get(r.skill_id as string) ?? [];
		list.push({ correct: r.correct === 1, answeredAt: r.answered_at as string });
		attempts.set(r.skill_id as string, list);
	}
	return skills.map((s) => ({
		id: s.id as string,
		areaId: s.area_id as string,
		specialist: s.specialist as string,
		name: s.name as string,
		taught: taught.has(s.id as string),
		readiness: skillReadiness(attempts.get(s.id as string) ?? []),
	}));
}
