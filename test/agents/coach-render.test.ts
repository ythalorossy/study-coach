import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { Coach, leadInstructions, sessionLine } from "../../src/agents/coach.ts";

describe("Coach agent statics", () => {
	it("is registered as coach", () => {
		expect(Coach.agentName).toBe("coach");
	});
	it("accepts a lesson with no skills chosen", () => {
		expect(v.safeParse(Coach.initialData, { kind: "lesson", skillIds: [] }).success).toBe(true);
	});
	it("rejects an unknown session kind", () => {
		expect(v.safeParse(Coach.initialData, { kind: "quiz" }).success).toBe(false);
	});
	it("starts its module with the use agent directive", () => {
		const firstLine = readFileSync(new URL("../../src/agents/coach.ts", import.meta.url), "utf8").split("\n")[0];
		expect(firstLine).toBe("'use agent';");
	});
});

describe("Coach instructions", () => {
	const source = readFileSync(new URL("../../src/agents/coach.ts", import.meta.url), "utf8");

	// A phase change mid-response would change the system prompt, and the runtime then
	// re-prompts the model with "System instructions updated.".
	it("does not render the lesson phase into its instructions", () => {
		expect(source).not.toMatch(/\$\{phase\}/);
	});
	it("forbids drawing the check question before it is answered", () => {
		expect(source).toMatch(/Never redraw or extend the diagram about the check question before it is answered/);
	});
	it("ends a correct answer with one short lead speak", () => {
		expect(source).toMatch(/correct="true": speak one short line of praise as "lead", and end your turn/);
	});
	it("allows one follow-up per wrong answer and none after a wrong follow-up", () => {
		expect(source).toMatch(/A follow-up question is presented at most once per wrong answer/);
		expect(source).toMatch(/wrong answer to a follow-up question \(purpose="followup"\) gets the explanation but no further follow-up/);
	});
});

describe("lead instructions across areas", () => {
	it("lists every specialist with its area", () => {
		const t = leadInstructions("This is a practice session.");
		expect(t).toContain("- storage-security: storage security (Implement and manage storage)");
		expect(t).toContain("- identity: identity (Manage Azure identities and governance)");
		expect(t).toContain(
			'- storage.sas-tokens "Create and use shared access signature (SAS) tokens" (Implement and manage storage): owned by storage-security',
		);
		expect(t).not.toContain("three specialist");
		expect(t).toContain("pick the weakest skill of the session's area that is not yet taught");
		expect(t).toContain("if every one is taught, pick its weakest skill");
		expect(t).toContain("storage account, container, file share, SAS token, private endpoint");
	});

	it("scopes the lead's choice to the session's area", () => {
		expect(sessionLine({ kind: "lesson", skillIds: [], areaId: "storage" })).toBe(
			'This is a lesson session in the area "Implement and manage storage". No skill is chosen yet: pick one from this area with get_progress.',
		);
		expect(sessionLine({ kind: "lesson", skillIds: [] })).toBe("This is a lesson session. No skill is chosen yet: pick one with get_progress.");
		expect(sessionLine({ kind: "practice", skillIds: ["storage.tiers"] })).toBe("This is a practice session.");
	});

	it("accepts an area in its initial data", () => {
		expect(v.safeParse(Coach.initialData, { kind: "lesson", skillIds: [], areaId: "storage" }).success).toBe(true);
	});
});

