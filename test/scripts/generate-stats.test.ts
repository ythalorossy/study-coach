import { describe, expect, it } from "vitest";
import { areaRates, flagRate } from "../../scripts/generate-stats.ts";
import { openCoachDb } from "../../src/coach/db.ts";
import { flagQuestion, insertQuestion } from "../../src/coach/questions.ts";
import { dragDropFixture, mcFixture } from "../coach/fixtures.ts";

describe("areaRates", () => {
	it("computes rejection shares over one area's attempts", () => {
		const log = `${[
			{ skillId: "identity.sspr", saved: true },
			{ skillId: "identity.sspr", saved: false, reason: "leak" },
			{ skillId: "storage.tiers", saved: false, reason: "leak" },
			{ skillId: "nope", saved: false, reason: "leak" },
		]
			.map((e) => JSON.stringify({ runId: "r", ...e }))
			.join("\n")}\n{torn`;
		expect(areaRates(log, "identity-governance")).toEqual({ attempts: 2, saved: 1, rates: { leak: 0.5 } });
		expect(areaRates(log, "storage")).toEqual({ attempts: 1, saved: 0, rates: { leak: 1 } });
	});
});

describe("flagRate", () => {
	it("is the share of the area's questions that were flagged", () => {
		const db = openCoachDb(":memory:");
		const readAt = (f: { sources: { url: string }[] }) => Object.fromEntries(f.sources.map((s) => [s.url, "x"]));
		const flagged = insertQuestion(db, mcFixture, readAt(mcFixture));
		insertQuestion(db, dragDropFixture, readAt(dragDropFixture));
		flagQuestion(db, flagged, "wrong key");
		expect(flagRate(db, "identity-governance")).toBe(0.5);
		expect(flagRate(db, "storage")).toBe(0);
	});
});
