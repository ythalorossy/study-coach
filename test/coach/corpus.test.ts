import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { corpusPage, learnUrlToRepoPath, readDoc, repoPathToLearnUrl, sparseDirs } from "../../src/coach/docs/corpus.ts";
import { openCoachDb } from "../../src/coach/db.ts";

describe("Learn URL to repo path", () => {
	it("maps Azure and Entra Learn URLs to repo files", () => {
		expect(learnUrlToRepoPath("https://learn.microsoft.com/en-us/azure/governance/policy/overview?tabs=x#y")).toEqual({
			repo: "azure-docs",
			path: "articles/governance/policy/overview.md",
		});
		expect(learnUrlToRepoPath("https://learn.microsoft.com/en-us/entra/fundamentals/how-to-create-delete-users/")).toEqual({
			repo: "entra-docs",
			path: "docs/fundamentals/how-to-create-delete-users.md",
		});
	});

	it("sends Azure Monitor URLs to the azure-monitor-docs repo and back", () => {
		expect(learnUrlToRepoPath("https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-overview")).toEqual({
			repo: "azure-monitor-docs",
			path: "articles/azure-monitor/alerts/alerts-overview.md",
		});
		expect(repoPathToLearnUrl("azure-monitor-docs", "articles/azure-monitor/alerts/alerts-overview.md")).toBe(
			"https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-overview",
		);
		expect(learnUrlToRepoPath("https://learn.microsoft.com/en-us/azure/monitor-something/x")?.repo).toBe("azure-docs");
	});

	it("sends compute, container registry and Advisor URLs to their own repos", () => {
		expect(learnUrlToRepoPath("https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types")).toEqual({ repo: "azure-compute-docs", path: "articles/virtual-machines/disks-types.md" });
		expect(learnUrlToRepoPath("https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/overview")?.repo).toBe("azure-compute-docs");
		expect(learnUrlToRepoPath("https://learn.microsoft.com/en-us/azure/container-instances/container-instances-overview")?.repo).toBe("azure-compute-docs");
		expect(learnUrlToRepoPath("https://learn.microsoft.com/en-us/azure/container-registry/container-registry-intro")?.repo).toBe("azure-management-docs");
		expect(learnUrlToRepoPath("https://learn.microsoft.com/en-us/azure/advisor/advisor-overview")?.repo).toBe("azure-monitor-docs");
		expect(repoPathToLearnUrl("azure-compute-docs", "articles/virtual-machines/disks-types.md")).toBe("https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types");
	});

	it("refuses other hosts, locales, products and traversal", () => {
		for (const u of [
			"https://example.com/en-us/azure/x",
			"https://learn.microsoft.com/de-de/azure/x",
			"https://learn.microsoft.com/en-us/powershell/module/az",
			"https://learn.microsoft.com/en-us/azure/",
			"https://learn.microsoft.com/en-us/azure/%2e%2e/%2e%2e/etc/passwd",
			"https://learn.microsoft.com/en-us/azure/a/%2E%2E%2F%2E%2E%2Fsecret",
			"not a url",
		]) {
			expect(learnUrlToRepoPath(u)).toBeNull();
		}
	});

	it("round-trips repo paths to Learn URLs", () => {
		expect(repoPathToLearnUrl("azure-docs", "articles/storage/common/storage-account-overview.md")).toBe(
			"https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview",
		);
		expect(repoPathToLearnUrl("entra-docs", "docs/fundamentals/how-to-manage-groups.md")).toBe(
			"https://learn.microsoft.com/en-us/entra/fundamentals/how-to-manage-groups",
		);
		expect(repoPathToLearnUrl("azure-docs", "includes/x.yml")).toBeNull();
	});

	it("lists the sparse folders per repo", () => {
		expect(
			sparseDirs([
				"https://learn.microsoft.com/en-us/azure/governance/policy/overview",
				"https://learn.microsoft.com/en-us/azure/governance/management-groups/overview",
				"https://learn.microsoft.com/en-us/entra/identity/users/groups-dynamic-membership",
			]),
		).toEqual({ "azure-docs": ["articles/governance", "includes"], "azure-compute-docs": ["includes"], "azure-management-docs": ["includes"], "azure-monitor-docs": ["includes"], "entra-docs": ["docs/identity", "includes"] });
	});
});

const POLICY = "https://learn.microsoft.com/en-us/azure/governance/policy/overview";
const SYNCED_AT = "2026-10-22T10:00:00.000Z";

function corpus(files: Record<string, string>, synced = true): string {
	const root = mkdtempSync(join(tmpdir(), "corpus-"));
	for (const [path, text] of Object.entries(files)) {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), text);
	}
	if (synced) {
		const state = { syncedAt: SYNCED_AT, commits: {}, licenses: {}, missing: [] };
		writeFileSync(join(root, "sync.json"), JSON.stringify(state));
	}
	return root;
}

function liveFetch() {
	return vi.fn(async (input: string | URL | Request) => {
		const res = new Response("<main><p>Live page text</p></main>", { status: 200 });
		Object.defineProperty(res, "url", { value: String(input) });
		return res;
	});
}

describe("readDoc", () => {
	const policy = { "azure-docs/articles/governance/policy/overview.md": "---\ntitle: Overview\n---\n# Overview\nAzure Policy helps." };

	it("reads a synced page locally without fetching", async () => {
		const fetchImpl = liveFetch();
		const doc = await readDoc(openCoachDb(":memory:"), POLICY, { root: corpus(policy), fetchImpl: fetchImpl as unknown as typeof fetch });
		expect(doc.text).toContain("Azure Policy helps");
		expect(doc.readAt).toBe(SYNCED_AT);
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("falls back to the live fetch for a page outside the corpus", async () => {
		const fetchImpl = liveFetch();
		const url = "https://learn.microsoft.com/en-us/azure/advisor/advisor-overview";
		const doc = await readDoc(openCoachDb(":memory:"), url, { root: corpus(policy), fetchImpl: fetchImpl as unknown as typeof fetch });
		expect(doc.text).toBe("Live page text");
		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});

	it("falls back to the live fetch when nothing was ever synced", async () => {
		const fetchImpl = liveFetch();
		const root = corpus(policy, false);
		await readDoc(openCoachDb(":memory:"), POLICY, { root, fetchImpl: fetchImpl as unknown as typeof fetch });
		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});
});

describe("corpusPage", () => {
	it("resolves relative and ~/ includes inside the repo", () => {
		const root = corpus({
			"entra-docs/docs/fundamentals/page.md": "# Page\n[!INCLUDE [a](../includes/a.md)]\n[!INCLUDE [b](~/includes/b.md)]",
			"entra-docs/docs/includes/a.md": "Relative include",
			"entra-docs/docs/includes/b.md": "Tilde include",
		});
		const page = corpusPage("https://learn.microsoft.com/en-us/entra/fundamentals/page", root);
		expect(page).toMatchObject({ repo: "entra-docs", path: "docs/fundamentals/page.md", title: "Page" });
		expect(page?.markdown).toContain("Relative include");
		expect(page?.markdown).toContain("Tilde include");
	});

	it("never resolves an include outside the repo folder", () => {
		const root = corpus({
			"azure-docs/articles/governance/policy/overview.md": "# O\n[!INCLUDE [x](../../../../secret.md)]",
			"secret.md": "TOP SECRET",
		});
		expect(corpusPage(POLICY, root)?.markdown).not.toContain("TOP SECRET");
	});

	it("returns null without a sync state or a file", () => {
		expect(corpusPage(POLICY, corpus({ "azure-docs/articles/governance/policy/overview.md": "# O" }, false))).toBeNull();
		expect(corpusPage(POLICY, corpus({}))).toBeNull();
	});
});
