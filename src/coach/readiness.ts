import type { QuestionFormat } from "./exam/types.ts";

export const COVERAGE_TARGET: Record<QuestionFormat, number> = {
	"multiple-choice": 8,
	"drag-drop": 6,
	"complete-sentence": 6,
};

export interface Readiness {
	status: "not-enough-data" | "ok";
	score: number | null;
	attempts: number;
}

const WINDOW = 20;
const MIN_ATTEMPTS = 5;
const DECAY = 0.9;
const READY_SCORE = 0.8;

/** Recency-weighted accuracy over the newest 20 attempts (weight 0.9^i, i = 0 newest). */
export function skillReadiness(attempts: { correct: boolean; answeredAt: string }[]): Readiness {
	if (attempts.length < MIN_ATTEMPTS) {
		return { status: "not-enough-data", score: null, attempts: attempts.length };
	}
	const newest = [...attempts]
		.sort((a, b) => (a.answeredAt < b.answeredAt ? 1 : a.answeredAt > b.answeredAt ? -1 : 0))
		.slice(0, WINDOW);
	let hit = 0;
	let total = 0;
	newest.forEach((a, i) => {
		const w = DECAY ** i;
		total += w;
		if (a.correct) hit += w;
	});
	return { status: "ok", score: hit / total, attempts: attempts.length };
}

export function overallReady(skills: Readiness[]): boolean {
	return skills.every((s) => s.status === "ok" && s.score !== null && s.score >= READY_SCORE);
}
