import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { licenseName, syncCommands, syncCorpus } from "../../scripts/docs-sync.ts";
import { readSyncState } from "../../src/coach/docs/corpus.ts";

const POLICY = "https://learn.microsoft.com/en-us/azure/governance/policy/overview";
const LOCKS = "https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources";
const NOW = () => new Date("2026-10-22T10:00:00.000Z");

/** A fake git: clone creates the policy page only, rev-parse answers abc123. */
function fakeGit(calls: string[][], fail?: string) {
	return (argv: string[]) => {
		calls.push(argv);
		if (fail && argv[1] === fail) return { status: 128, stdout: "" };
		if (argv[1] === "clone") {
			const file = join(argv[argv.length - 1], "articles/governance/policy/overview.md");
			mkdirSync(dirname(file), { recursive: true });
			mkdirSync(join(argv[argv.length - 1], ".git"), { recursive: true });
			writeFileSync(file, "# Policy");
			writeFileSync(join(argv[argv.length - 1], "LICENSE"), "MIT License\n\nCopyright (c) Microsoft Corporation.");
		}
		if (argv.includes("rev-parse")) return { status: 0, stdout: "abc123\n" };
		return { status: 0, stdout: "" };
	};
}

describe("syncCommands", () => {
	it("clones shallow and sparse the first time", () => {
		expect(syncCommands("azure-docs", "/r/azure-docs", ["articles/governance", "includes"], false)).toEqual([
			[
				"git",
				"clone",
				"--depth",
				"1",
				"--filter=blob:none",
				"--sparse",
				"--branch",
				"main",
				"https://github.com/MicrosoftDocs/azure-docs.git",
				"/r/azure-docs",
			],
			["git", "-C", "/r/azure-docs", "sparse-checkout", "set", "--no-cone", "/*", "!/*/", "/articles/governance/**/*.md", "/includes/**/*.md"],
		]);
	});

	it("updates in place on later runs", () => {
		expect(syncCommands("entra-docs", "/r/entra-docs", ["docs/identity", "includes"], true)).toEqual([
			["git", "-C", "/r/entra-docs", "sparse-checkout", "set", "--no-cone", "/*", "!/*/", "/docs/identity/**/*.md", "/includes/**/*.md"],
			["git", "-C", "/r/entra-docs", "fetch", "--depth", "1", "origin", "main"],
			["git", "-C", "/r/entra-docs", "reset", "--hard", "FETCH_HEAD"],
		]);
	});
});

describe("licenseName", () => {
	it("names the licenses MicrosoftDocs repos use", () => {
		expect(licenseName("Attribution 4.0 International (CC BY 4.0)")).toBe("CC BY 4.0");
		expect(licenseName("    MIT License\n\nCopyright (c) Microsoft Corporation.")).toBe("MIT");
		expect(licenseName("")).toBe("see the repository's LICENSE");
	});
});

describe("syncCorpus", () => {
	it("records commits, the sync time and URLs with no local file", () => {
		const root = mkdtempSync(join(tmpdir(), "sync-"));
		const calls: string[][] = [];
		const state = syncCorpus({ root, urls: [POLICY, LOCKS], run: fakeGit(calls), now: NOW });
		expect(state).toEqual({
			syncedAt: "2026-10-22T10:00:00.000Z",
			commits: { "azure-docs": "abc123" },
			licenses: { "azure-docs": "MIT" },
			missing: [LOCKS],
		});
		expect(readSyncState(root)).toEqual(state);
		// No Entra URL, so entra-docs is not cloned.
		expect(calls.some((c) => c.includes("https://github.com/MicrosoftDocs/entra-docs.git"))).toBe(false);
	});

	it("treats a directory without .git as not cloned, so an interrupted first sync recovers", () => {
		const root = mkdtempSync(join(tmpdir(), "sync-"));
		mkdirSync(join(root, "azure-docs", "articles"), { recursive: true });
		writeFileSync(join(root, "azure-docs", "articles", "partial.md"), "x");
		const calls: string[][] = [];
		syncCorpus({ root, urls: [POLICY], run: fakeGit(calls), now: NOW });
		expect(calls[0][1]).toBe("clone");
		expect(existsSync(join(root, "azure-docs", "articles", "partial.md"))).toBe(false);
	});

	it("fails without writing sync.json when a git command fails", () => {
		const root = mkdtempSync(join(tmpdir(), "sync-"));
		expect(() => syncCorpus({ root, urls: [POLICY], run: fakeGit([], "clone"), now: NOW })).toThrow(/git clone/);
		expect(readSyncState(root)).toBeNull();
	});
});
