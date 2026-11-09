import { describe, expect, it } from "vitest";
import { type Finding, formatFactCheck, sheetBullets, validateFindings } from "../../src/coach/docs/fact-check.ts";

const body = "## Settings\n\n- Passwords must be 8 to 256 characters long. ([Learn](https://x/a))\n- Accounts lock after 10 wrong tries. ([Learn](https://x/a))";
const pages = [{ url: "https://x/a", markdown: "Passwords must be\n8 to 128 characters.  Lockout after 10 tries." }];
const finding = (over: Partial<Finding> = {}): Finding => ({
	bullet: "Passwords must be 8 to 256 characters",
	verdict: "contradicted",
	pageUrl: "https://x/a",
	evidence: "8 to 128 characters",
	explanation: "The page says 128.",
	...over,
});

describe("fact check", () => {
	it("lists the fact bullets", () => {
		expect(sheetBullets(body)).toHaveLength(2);
	});
	it("accepts a finding that quotes the sheet and the page", () => {
		expect(validateFindings([finding()], body, pages)).toEqual([]);
	});
	it("rejects a bullet that is not in the sheet", () => {
		expect(validateFindings([finding({ bullet: "Passwords must be 12 to 64 characters" })], body, pages)).toHaveLength(1);
	});
	it("rejects evidence that is not in the page, and contradicted without evidence", () => {
		expect(validateFindings([finding({ evidence: "8 to 64 characters" })], body, pages)).toHaveLength(1);
		expect(validateFindings([finding({ evidence: "" })], body, pages)).toHaveLength(1);
	});
	it("accepts unsupported without evidence, and rejects an unknown page", () => {
		expect(validateFindings([finding({ verdict: "unsupported", evidence: "" })], body, pages)).toEqual([]);
		expect(validateFindings([finding({ pageUrl: "https://x/z" })], body, pages)).toHaveLength(1);
	});
	it("formats a worksheet", () => {
		const md = formatFactCheck({ skillId: "s", model: "m", bullets: 2, findings: [finding()], checked: "" });
		expect(md).toContain("1 to look at");
		expect(md).toContain("8 to 128 characters");
		expect(formatFactCheck({ skillId: "s", model: "m", bullets: 2, findings: [], checked: "" })).toContain("Nothing flagged");
	});
	it("says so when findings were dropped, and never claims a sheet is clear then", () => {
		const md = formatFactCheck({ skillId: "s", model: "m", bullets: 2, findings: [], dropped: 2, checked: "" });
		expect(md).toContain("2 more finding(s) could not be checked");
		expect(md).not.toContain("Nothing flagged");
	});
});
