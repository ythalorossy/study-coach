import { describe, expect, it } from "vitest";
import { buildReverifyPrompt, compareAnswers } from "../../src/coach/questions/reverify.ts";
import { dragDropFixture, mcFixture } from "./fixtures.ts";

const mc = { id: "q1", body: mcFixture.body, key: mcFixture.key };
const dd = { id: "q2", body: dragDropFixture.body, key: dragDropFixture.key };

describe("question re-check", () => {
	it("puts the sheet once and every question in the prompt, without the keys", () => {
		const prompt = buildReverifyPrompt("SHEET TEXT", [mc, dd]);
		expect(prompt.split("SHEET TEXT")).toHaveLength(2);
		expect(prompt).toContain("Question id: q1");
		expect(prompt).toContain("Question id: q2");
		expect(prompt).toContain(mcFixture.body.stem);
		expect(prompt).not.toContain(JSON.stringify(mcFixture.key));
	});

	it("separates agreeing answers from wrong and missing ones", () => {
		const right = mcFixture.key as Record<string, string>;
		const wrong = { optionId: right.optionId === "a" ? "b" : "a" };
		const result = compareAnswers([mc, dd], [{ id: "q1", answer: wrong }]);
		expect(result.agree).toEqual([]);
		expect(result.disagree).toEqual([
			{ id: "q1", given: wrong },
			{ id: "q2", given: null },
		]);
		const ok = compareAnswers([mc], [{ id: "q1", answer: right }]);
		expect(ok).toEqual({ agree: ["q1"], disagree: [] });
	});
});
