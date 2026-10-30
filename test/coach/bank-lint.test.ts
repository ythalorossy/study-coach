import { describe, expect, it } from "vitest";
import { keyPositions, lintQuestion, sheetUrls } from "../../src/coach/questions/bank-lint.ts";
import type { BankQuestion } from "../../src/coach/questions/question-bank.ts";
import { mcFixture } from "./fixtures.ts";

const bank = (over: Partial<BankQuestion> = {}): BankQuestion => ({
	id: "q1",
	body: mcFixture.body,
	key: mcFixture.key,
	explanation: mcFixture.explanation,
	sources: mcFixture.sources,
	subtopics: [],
	reviewed: false,
	...over,
});
const sheet = sheetUrls("A fact ([Learn](https://learn.microsoft.com/en-us/entra/external-id/what-is-b2b#x)).");
const codes = (q: BankQuestion) => lintQuestion(q, sheet).map((i) => i.code);

describe("bank lint", () => {
	it("passes a sound question", () => {
		expect(codes(bank())).toEqual([]);
	});
	it("flags a source the fact sheet does not link, ignoring locale and anchors", () => {
		expect(codes(bank({ sources: [{ url: "https://learn.microsoft.com/azure/other/page" }] }))).toContain("source-not-in-sheet");
	});
	it("flags a stem that points to an exhibit that is missing", () => {
		const body = { ...mcFixture.body, exhibit: undefined, stem: `${mcFixture.body.stem} See the exhibit.` };
		expect(codes(bank({ body }))).toContain("missing-exhibit");
	});
	it("flags a correct option much longer than every distractor", () => {
		const body = structuredClone(mcFixture.body);
		if (body.format !== "multiple-choice") throw new Error("fixture");
		body.options[1].text = "A very long correct option that spells out far more than any of the others do";
		expect(codes(bank({ body }))).toContain("long-key");
	});
	it("flags an explanation that refers to an option by letter", () => {
		const explanation = { ...mcFixture.explanation, correct: `Option b is right. ${mcFixture.explanation.correct}` };
		expect(codes(bank({ explanation }))).toContain("letter-reference");
	});
	it("treats options that differ only by case as different, but flags identical ones", () => {
		const body = structuredClone(mcFixture.body);
		if (body.format !== "multiple-choice") throw new Error("fixture");
		body.options[0].text = "finance-reports";
		body.options[2].text = "Finance-Reports";
		expect(codes(bank({ body }))).not.toContain("duplicate-options");
		body.options[2].text = "finance-reports";
		expect(codes(bank({ body }))).toContain("duplicate-options");
	});
	it("counts multiple-choice key positions", () => {
		expect(keyPositions([bank(), bank(), bank({ key: { optionId: "a" } })])).toEqual({ b: 2, a: 1 });
	});
});
