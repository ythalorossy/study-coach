import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	copiedRun,
	factSheetStatus,
	formatFactSheet,
	readFactSheet,
	sourceHash,
	validateFactSheetBody,
} from "../../src/coach/docs/fact-sheets.ts";

const LOCKS = "https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources";
const ARM = "https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/overview";
const LOCKS_FILE = "azure-docs/articles/azure-resource-manager/management/lock-resources.md";

function docsRoot(files: Record<string, string> = { [LOCKS_FILE]: "# Lock your resources\nLocks override permissions." }): string {
	const root = mkdtempSync(join(tmpdir(), "sheet-docs-"));
	for (const [path, text] of Object.entries(files)) {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), text);
	}
	writeFileSync(join(root, "sync.json"), JSON.stringify({ syncedAt: "x", commits: {}, licenses: {}, missing: [] }));
	return root;
}

const bullets = Array.from({ length: 10 }, (_, i) => `- Fact number ${i} about locks ([Learn](${LOCKS}#section-${i}))`);
const good = `## Key concepts\n${bullets.join("\n")}`;
const ctx = { allowedUrls: [LOCKS, ARM], sourceTexts: ["Locks override permissions."] };

describe("fact sheet files", () => {
	it("round-trips the file format", () => {
		const root = mkdtempSync(join(tmpdir(), "sheets-"));
		const sheet = { skillId: "governance.locks", sources: "abc", built: "2026-10-22T10:00:00.000Z", body: good };
		writeFileSync(join(root, "governance.locks.md"), formatFactSheet(sheet));
		expect(readFactSheet("governance.locks", root)).toEqual(sheet);
		expect(readFactSheet("governance.tags", root)).toBeNull();
	});

	it("reports missing, fresh and stale", () => {
		const sheetsRoot = mkdtempSync(join(tmpdir(), "sheets-"));
		const docs = docsRoot();
		const opts = { sheetsRoot, docsRoot: docs };
		expect(factSheetStatus("governance.locks", opts)).toBe("missing");
		const hash = sourceHash("governance.locks", docs);
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
		writeFileSync(join(sheetsRoot, "governance.locks.md"), formatFactSheet({ skillId: "governance.locks", sources: hash!, built: "x", body: good }));
		expect(factSheetStatus("governance.locks", opts)).toBe("fresh");
		writeFileSync(join(docs, LOCKS_FILE), "# Lock your resources\nChanged upstream.");
		expect(factSheetStatus("governance.locks", opts)).toBe("stale");
	});

	it("hashes the same text for a skill with no local pages, so its sheet stays fresh", () => {
		const docs = docsRoot({});
		expect(sourceHash("governance.locks", docs)).toBe(sourceHash("identity.licenses", docs));
	});
});

describe("validateFactSheetBody", () => {
	it("accepts a sheet whose every bullet links to the skill's pages", () => {
		expect(validateFactSheetBody(good, ctx)).toEqual([]);
	});

	it("rejects a bullet without an allowed link", () => {
		expect(validateFactSheetBody(`${good}\n- Locks apply to everyone.`, ctx).join()).toMatch(/link/);
		expect(validateFactSheetBody(`${good}\n- Other ([x](https://learn.microsoft.com/en-us/azure/other))`, ctx).join()).toMatch(/link/);
	});

	it("rejects sheets over 16,000 characters, saying how much to cut, and with fewer than 10 bullets", () => {
		const long = `${good}\n${"x".repeat(16_000)}`;
		expect(validateFactSheetBody(long, ctx).join()).toMatch(/16,000/);
		expect(validateFactSheetBody(long, ctx).join()).toContain(`cut at least ${long.length - 16_000} characters`);
		expect(validateFactSheetBody(`${good}\n${"x".repeat(13_000)}`, ctx)).toEqual([]);
		expect(validateFactSheetBody(`## Key concepts\n${bullets.slice(0, 9).join("\n")}`, ctx).join()).toMatch(/10 bullets/);
	});

	it("allows only ## headings", () => {
		expect(validateFactSheetBody(`# Title\n${good}`, ctx).join()).toMatch(/##/);
		expect(validateFactSheetBody(`${good}\n### Deep`, ctx).join()).toMatch(/##/);
	});

	it("lets runs of table numbers through, but not prose", () => {
		const table = "Standard_D2s_v5 2 8 4 000 8 000 16 16 000 4 000 32 32 000 8 000 64";
		expect(copiedRun("- Sizes: 2 8 4 000 8 000 16 16 000 4 000 32 32 000 8 000 64 IOPS by size", [table])).toBeNull();
		const prose = "Azure Policy evaluates resources in Azure by comparing the properties of those resources to business rules";
		expect(copiedRun(`- ${prose}`, [prose])).not.toBeNull();
		// The line: a 12-word window needs at least 6 tokens with letters to be checked.
		const sixWords = "the premium tier allows up to 20 000 40 000 60 000";
		expect(copiedRun(sixWords, [sixWords])).toBe(sixWords);
		const fiveWords = "premium tier allows up to 20 000 40 000 60 000 80";
		expect(copiedRun(fiveWords, [fiveWords])).toBeNull();
	});

	it("lets exact names through when marked as bold or code", () => {
		const src = "Allow user to only assign selected roles to selected principals (fewer privileges) is the recommended option";
		expect(copiedRun("- Choose **Allow user to only assign selected roles to selected principals (fewer privileges)** here", [src])).toBeNull();
		const perms = "Microsoft.Management/managementGroups/write on the child subscription or management group and Microsoft.Management/managementGroups/write on the parent";
		expect(copiedRun("- You need `Microsoft.Management/managementGroups/write` on the child subscription or management group and `Microsoft.Management/managementGroups/write` on the parent", [perms])).toBeNull();
	});

	it("rejects copied documentation text", () => {
		const src = "Azure Policy evaluates resources in Azure by comparing the properties of those resources to business rules";
		expect(copiedRun(`- Policy ${src} ([x](${LOCKS}))`, [src])).toMatch(/^azure policy evaluates/);
		expect(copiedRun("- Policy compares resource properties with your rules", [src])).toBeNull();
		const copied = `${good}\n- ${src} ([x](${LOCKS}))`;
		expect(validateFactSheetBody(copied, { ...ctx, sourceTexts: [src] }).join()).toMatch(/copied/);
	});
});
