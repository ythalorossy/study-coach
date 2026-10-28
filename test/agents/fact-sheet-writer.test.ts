import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { FactSheetWriter, factSheetInstructions, makeSaveFactSheetTool } from "../../src/agents/fact-sheet-writer.ts";
import { readFactSheet, sourceHash } from "../../src/coach/fact-sheets.ts";

const LOCKS = "https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources";
const pages = [{ url: LOCKS, markdown: "# Lock your resources\nA CanNotDelete lock lets authorized users read and modify a resource." }];
const good = `## Key concepts\n${Array.from({ length: 10 }, (_, i) => `- Fact ${i} about locks ([Learn](${LOCKS}))`).join("\n")}`;

function setup() {
	const root = mkdtempSync(join(tmpdir(), "sheets-"));
	const docsRoot = mkdtempSync(join(tmpdir(), "sheet-docs-"));
	const file = join(docsRoot, "azure-docs/articles/azure-resource-manager/management/lock-resources.md");
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, pages[0].markdown);
	writeFileSync(join(docsRoot, "sync.json"), JSON.stringify({ syncedAt: "x", commits: {}, licenses: {}, missing: [] }));
	const logPath = join(root, "log.jsonl");
	const tool = makeSaveFactSheetTool({
		skillId: "governance.locks",
		root,
		docsRoot,
		pages,
		attempts: { n: 0 },
		now: () => new Date("2026-10-22T10:00:00.000Z"),
		logPath,
	});
	const run = (body: string) =>
		tool.run({ data: { body }, toolCallId: "t", log: console } as never) as Promise<{ output: Record<string, unknown>; terminate?: boolean }>;
	return { root, docsRoot, run, logPath };
}

describe("FactSheetWriter", () => {
	it("starts with the use agent directive and is registered", () => {
		const src = readFileSync(new URL("../../src/agents/fact-sheet-writer.ts", import.meta.url), "utf8");
		expect(src.split("\n")[0]).toBe("'use agent';");
		expect(FactSheetWriter.agentName).toBe("fact-sheet-writer");
		expect(FactSheetWriter.durability).toEqual({ timeoutMs: 900_000 });
		expect(v.safeParse(FactSheetWriter.initialData, { skillId: "governance.locks", sourcesPath: "x.json" }).success).toBe(true);
	});

	it("instructs original wording, one link per bullet and the exam focus", () => {
		const t = factSheetInstructions("governance.locks", pages);
		expect(t).toContain("Every bullet ends with a link to the page it came from");
		expect(t).toContain("Write in your own words; never copy a sentence");
		expect(t).toContain("settings, limits, comparisons and which-one-to-use");
		for (const s of ["## Key concepts", "## Settings and limits", "## Compare and choose", "## Gotchas"]) expect(t).toContain(s);
		expect(t).toContain(pages[0].markdown.slice(0, 40));
		expect(t).toContain(LOCKS);
		expect(t).toContain("Aim for 8,000 to 13,000 characters; the limit is 16,000.");
	});
});

describe("save_fact_sheet", () => {
	it("saves a valid sheet with the source hash and terminates", async () => {
		const { root, docsRoot, run, logPath } = setup();
		const r = await run(good);
		expect(r).toEqual({ output: { saved: true }, terminate: true });
		const sheet = readFactSheet("governance.locks", root);
		expect(sheet?.sources).toBe(sourceHash("governance.locks", docsRoot));
		expect(sheet?.body.startsWith("# Configure resource locks\n")).toBe(true);
		expect(sheet?.built).toBe("2026-10-22T10:00:00.000Z");
		expect(JSON.parse(readFileSync(logPath, "utf8").trim())).toMatchObject({ skillId: "governance.locks", saved: true });
	});

	it("returns problems for an invalid sheet and gives up after 3 attempts without writing", async () => {
		const { root, run } = setup();
		const first = await run("## Key concepts\n- No link here.");
		expect(first.terminate).toBeFalsy();
		expect(first.output).toMatchObject({ saved: false, attemptsLeft: 2 });
		expect((first.output.problems as string[]).join()).toMatch(/link/);
		await run("bad");
		const last = await run("bad");
		expect(last).toMatchObject({ output: { saved: false, gaveUp: true }, terminate: true });
		expect(readFactSheet("governance.locks", root)).toBeNull();
	});
});
