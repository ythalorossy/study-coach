import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeReportFindingsTool } from "../../src/agents/fact-sheet-reviewer.ts";
import type { FactCheckResult } from "../../src/coach/docs/fact-check.ts";

const URL = "https://learn.microsoft.com/en-us/azure/x/y";
const pages = [{ url: URL, markdown: "Passwords must be 8 to 128 characters." }];
const sheetBody = `## Settings\n\n- Passwords must be 8 to 256 characters long. ([Learn](${URL}))\n- Accounts lock after 10 wrong tries. ([Learn](${URL}))`;

const real = { bullet: "Passwords must be 8 to 256 characters", verdict: "contradicted" as const, pageUrl: URL, evidence: "8 to 128 characters", explanation: "The page says 128." };
const made = { ...real, bullet: "This bullet is not in the sheet at all", explanation: "invented" };

function setup() {
	const outPath = join(mkdtempSync(join(tmpdir(), "review-")), "out.json");
	const tool = makeReportFindingsTool({ skillId: "s", model: "m", sheetBody, pages, outPath, attempts: { n: 0 }, now: () => new Date("2026-11-09T10:00:00.000Z") });
	const run = (findings: unknown[]) => tool.run({ data: { findings }, toolCallId: "t", log: console } as never) as Promise<{ output: Record<string, unknown>; terminate?: boolean }>;
	return { outPath, run };
}

describe("FactSheetReviewer report tool", () => {
	it("saves valid findings and ends the run", async () => {
		const { outPath, run } = setup();
		const r = await run([real]);
		expect(r.output).toEqual({ saved: true });
		expect(r.terminate).toBe(true);
		const saved = JSON.parse(readFileSync(outPath, "utf8")) as FactCheckResult;
		expect(saved.findings).toHaveLength(1);
		expect(saved.dropped).toBe(0);
	});

	it("sends invalid findings back until the last attempt", async () => {
		const { run } = setup();
		const first = await run([made]);
		expect(first.output).toMatchObject({ saved: false, attemptsLeft: 2 });
		expect(first.terminate).toBeUndefined();
	});

	it("on the last attempt keeps the valid findings and counts what it dropped", async () => {
		const { outPath, run } = setup();
		await run([made]);
		await run([made]);
		const last = await run([real, made]);
		expect(last.output).toEqual({ saved: true });
		const saved = JSON.parse(readFileSync(outPath, "utf8")) as FactCheckResult;
		expect(saved.findings).toHaveLength(1);
		expect(saved.dropped).toBe(1);
	});
});
