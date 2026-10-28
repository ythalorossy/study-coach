import { describe, expect, it } from "vitest";
import { parseRoute } from "./route.ts";

describe("parseRoute", () => {
	it("parses the home route", () => {
		expect(parseRoute("#/")).toEqual({ name: "home" });
		expect(parseRoute("")).toEqual({ name: "home" });
	});

	it("parses room, practice and coverage routes", () => {
		expect(parseRoute("#/room/abc")).toEqual({ name: "room", sessionId: "abc" });
		expect(parseRoute("#/practice/abc")).toEqual({ name: "practice", sessionId: "abc" });
		expect(parseRoute("#/coverage")).toEqual({ name: "coverage" });
	});

	it("falls back to home for unknown routes", () => {
		expect(parseRoute("#/nope")).toEqual({ name: "home" });
		expect(parseRoute("#/room/")).toEqual({ name: "home" });
	});

	it("falls back to home on a malformed escape", () => {
		expect(parseRoute("#/room/%")).toEqual({ name: "home" });
	});

	it("keeps dots in session ids intact", () => {
		expect(parseRoute("#/room/lesson-identity.sspr-202610201530")).toEqual({
			name: "room",
			sessionId: "lesson-identity.sspr-202610201530",
		});
	});

	it("parses docs routes", () => {
		const u = "https://learn.microsoft.com/en-us/azure/governance/policy/overview";
		expect(parseRoute("#/docs")).toEqual({ name: "docs", tab: "sheet" });
		expect(parseRoute("#/docs/governance.policy")).toEqual({ name: "docs", skillId: "governance.policy", tab: "sheet" });
		expect(parseRoute("#/docs/governance.policy/sheet")).toEqual({ name: "docs", skillId: "governance.policy", tab: "sheet" });
		expect(parseRoute("#/docs/governance.policy/pages")).toEqual({ name: "docs", skillId: "governance.policy", tab: "pages" });
		expect(parseRoute(`#/docs/governance.policy/pages/${encodeURIComponent(u)}`)).toEqual({
			name: "docs",
			skillId: "governance.policy",
			tab: "pages",
			pageUrl: u,
		});
		expect(parseRoute("#/docs/governance.policy/pages/%E0%A4%A")).toEqual({ name: "home" });
		expect(parseRoute("#/docs/governance.policy/other")).toEqual({ name: "home" });
	});
});
