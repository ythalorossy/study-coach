import { describe, expect, it } from "vitest";
import { COVERAGE_TARGET, overallReady, skillReadiness } from "../../src/coach/readiness.ts";

// Newest first or not: the function sorts by answeredAt itself.
function at(i: number, correct: boolean) {
	return { correct, answeredAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString() };
}

describe("skillReadiness", () => {
	it("needs 5 attempts", () => {
		const r = skillReadiness([at(0, true), at(1, true), at(2, true), at(3, true)]);
		expect(r).toEqual({ status: "not-enough-data", score: null, attempts: 4 });
	});

	it("scores 1 for five correct", () => {
		expect(skillReadiness([0, 1, 2, 3, 4].map((i) => at(i, true)))).toEqual({
			status: "ok",
			score: 1,
			attempts: 5,
		});
	});

	it("weights the newest attempt most", () => {
		// newest wrong, 4 older right: weights 1, .9, .81, .729, .6561
		const r = skillReadiness([at(0, true), at(1, true), at(2, true), at(3, true), at(4, false)]);
		expect(r.status).toBe("ok");
		expect(r.score).toBeCloseTo(0.7558, 3);
	});

	it("counts only the newest 20", () => {
		const attempts = Array.from({ length: 25 }, (_, i) => at(i, i >= 5));
		const r = skillReadiness(attempts);
		expect(r.score).toBe(1);
		expect(r.attempts).toBe(25);
	});
});

describe("overallReady", () => {
	const ok = (score: number) => ({ status: "ok" as const, score, attempts: 10 });
	it("is false with insufficient data or a low score", () => {
		expect(overallReady([ok(0.9), { status: "not-enough-data", score: null, attempts: 2 }])).toBe(false);
		expect(overallReady([ok(0.9), ok(0.79)])).toBe(false);
	});
	it("is true when every skill is at least 0.8", () => {
		expect(overallReady([ok(0.8), ok(1)])).toBe(true);
	});
});

it("targets 20 questions per skill", () => {
	expect(Object.values(COVERAGE_TARGET).reduce((a, b) => a + b, 0)).toBe(20);
});
