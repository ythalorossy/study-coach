// Rejection and flag rates for one area, to compare a generation run with the
// first area's v1 baseline: `npm run generate:stats -- --area <id>`.
import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { GENERATE_LOG_PATH } from "../src/agents/question-writer.ts";
import { openCoachDb, type CoachDb } from "../src/coach/db.ts";
import { AREAS } from "../src/coach/seed.ts";
import { areaOfSkill } from "../src/coach/instructors.ts";

export interface AreaRates {
	attempts: number;
	saved: number;
	/** Each rejection reason's share of attempts, 0 to 1. */
	rates: Record<string, number>;
}

function inArea(skillId: string, areaId: string): boolean {
	try {
		return areaOfSkill(skillId) === areaId;
	} catch {
		return false;
	}
}

export function areaRates(logText: string, areaId: string): AreaRates {
	let attempts = 0;
	let saved = 0;
	const counts: Record<string, number> = {};
	for (const line of logText.split("\n")) {
		if (!line.trim()) continue;
		let e: { skillId?: string; saved?: boolean; reason?: string };
		try {
			e = JSON.parse(line);
		} catch {
			continue;
		}
		if (!e.skillId || !inArea(e.skillId, areaId)) continue;
		attempts++;
		if (e.saved) saved++;
		else if (e.reason) counts[e.reason] = (counts[e.reason] ?? 0) + 1;
	}
	const rates = Object.fromEntries(Object.entries(counts).map(([r, n]) => [r, n / attempts]));
	return { attempts, saved, rates };
}

/** Flagged questions as a share of all the area's questions (flagging moves a question out of 'verified'). */
export function flagRate(db: CoachDb, areaId: string): number {
	const row = db.raw
		.prepare(
			`SELECT COUNT(*) AS total, SUM(q.status = 'flagged') AS flagged
			 FROM questions q JOIN skills s ON s.id = q.skill_id WHERE s.area_id = ?`,
		)
		.get(areaId) as { total: number; flagged: number | null };
	return row.total ? (row.flagged ?? 0) / row.total : 0;
}

function percent(x: number): string {
	return `${(100 * x).toFixed(1)}%`;
}

function main(): void {
	const { values } = parseArgs({ options: { area: { type: "string" } } });
	const ids = AREAS.map(([id]) => id);
	if (!values.area || !ids.includes(values.area)) {
		console.error(`Usage: npm run generate:stats -- --area <id>. Areas: ${ids.join(", ")}`);
		process.exit(1);
	}
	const log = existsSync(GENERATE_LOG_PATH) ? readFileSync(GENERATE_LOG_PATH, "utf8") : "";
	const r = areaRates(log, values.area);
	const db = openCoachDb(process.env.COACH_DB_PATH ?? "./data/coach.db");
	console.log(`Area ${values.area}: ${r.attempts} attempts, ${r.saved} saved (${percent(r.saved / Math.max(1, r.attempts))})`);
	const reasons = Object.entries(r.rates).sort((a, b) => b[1] - a[1]);
	console.log(`Rejections: ${reasons.length ? reasons.map(([k, v]) => `${k} ${percent(v)}`).join(", ") : "none"}`);
	console.log(`Flagged: ${percent(flagRate(db, values.area))} of the area's questions`);
}

if (import.meta.main) main();
