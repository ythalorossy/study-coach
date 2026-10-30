import { describe, expect, it } from "vitest";
import type { CandidateQuestion } from "../../src/coach/questions/question-schema.ts";
import { isNearDuplicate } from "../../src/coach/questions/similarity.ts";
import { dragDropFixture, mcFixture } from "./fixtures.ts";

const clone = <T>(x: T): T => structuredClone(x);

describe("isNearDuplicate", () => {
	it("flags the same stem with reordered words", () => {
		const c = clone(mcFixture);
		c.body.stem = c.body.stem.split(" ").reverse().join(" ");
		expect(isNearDuplicate(c, [mcFixture])).toBe(true);
	});
	it("does not flag a different fact on the same subtopic", () => {
		const c: CandidateQuestion = {
			...clone(mcFixture),
			body: {
				format: "multiple-choice",
				stem: "A contractor needs to sign in to the Contoso tenant with their own employer credentials. Which setting controls whether the invitation email is redeemed automatically?",
				options: [
					{ id: "a", text: "Redemption order" },
					{ id: "b", text: "Seamless redemption" },
					{ id: "c", text: "Group-based licensing" },
					{ id: "d", text: "Conditional Access grant control" },
				],
			},
			key: { optionId: "b" },
		};
		expect(isNearDuplicate(c, [mcFixture])).toBe(false);
	});
	it("ignores identical stems in a different skill", () => {
		const c = clone(mcFixture);
		c.skillId = "identity.sspr";
		expect(isNearDuplicate(c, [mcFixture])).toBe(false);
	});
	it("only compares against same-skill entries when given all questions", () => {
		expect(isNearDuplicate(mcFixture, [dragDropFixture, mcFixture])).toBe(true);
		expect(isNearDuplicate(mcFixture, [dragDropFixture])).toBe(false);
		expect(isNearDuplicate(mcFixture, [])).toBe(false);
	});
});
