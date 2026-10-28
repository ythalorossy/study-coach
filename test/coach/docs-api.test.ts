import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { createCoachApi } from "../../src/coach/api.ts";
import { openCoachDb } from "../../src/coach/db.ts";
import { formatFactSheet, sourceHash } from "../../src/coach/fact-sheets.ts";

const POLICY = "https://learn.microsoft.com/en-us/azure/governance/policy/overview";

function setup(withSheet: boolean) {
	const docsRoot = mkdtempSync(join(tmpdir(), "api-docs-"));
	const sheetsRoot = mkdtempSync(join(tmpdir(), "api-sheets-"));
	const file = join(docsRoot, "azure-docs/articles/governance/policy/overview.md");
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, "---\ntitle: Overview of Azure Policy\n---\n# What is Azure Policy?\nPolicy text. [Basics](./concepts/definition-structure-basics.md)");
	const state = { syncedAt: "x", commits: {}, licenses: { "azure-docs": "CC BY 4.0" }, missing: [] };
	writeFileSync(join(docsRoot, "sync.json"), JSON.stringify(state));
	writeFileSync(join(docsRoot, "secret.md"), "TOP SECRET");
	if (withSheet) {
		const body = `# Implement and manage Azure Policy\n\n## Key concepts\n- A fact ([Learn](${POLICY}))`;
		const sheet = { skillId: "governance.policy", sources: sourceHash("governance.policy", docsRoot), built: "x", body };
		writeFileSync(join(sheetsRoot, "governance.policy.md"), formatFactSheet(sheet));
	}
	const api = createCoachApi(() => openCoachDb(":memory:"), { docs: { docsRoot, sheetsRoot } });
	const get = async (path: string) => {
		const res = await api.request(path);
		return { status: res.status, body: (await res.json()) as any };
	};
	return { get };
}

describe("GET /docs/:skillId", () => {
	it("returns the fact sheet and page list for a skill", async () => {
		const { get } = setup(true);
		const { status, body } = await get("/docs/governance.policy");
		expect(status).toBe(200);
		expect(body.name).toBe("Implement and manage Azure Policy");
		expect(body.factSheet.status).toBe("fresh");
		expect(body.factSheet.html).toContain(`href="#/docs/governance.policy/pages/${encodeURIComponent(POLICY)}"`);
		expect(body.pages).toHaveLength(3);
		expect(body.pages.filter((p: { local: boolean }) => p.local)).toEqual([{ url: POLICY, title: "Overview of Azure Policy", local: true }]);
		expect(body.pages[1]).toEqual({
			url: "https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-basics",
			title: "definition-structure-basics",
			local: false,
		});
	});

	it("returns a null fact sheet when none was built", async () => {
		const { get } = setup(false);
		expect((await get("/docs/governance.policy")).body.factSheet).toBeNull();
	});

	it("404s an unknown skill", async () => {
		const { get } = setup(false);
		expect((await get("/docs/nope")).status).toBe(404);
	});
});

describe("GET /docs/:skillId/page", () => {
	it("renders a synced page with its source and license", async () => {
		const { get } = setup(false);
		const { status, body } = await get(`/docs/governance.policy/page?url=${encodeURIComponent(POLICY)}`);
		expect(status).toBe(200);
		expect(body.title).toBe("Overview of Azure Policy");
		expect(body.html).toContain("What is Azure Policy?");
		expect(body.source).toEqual({
			repo: "azure-docs",
			githubUrl: "https://github.com/MicrosoftDocs/azure-docs/blob/main/articles/governance/policy/overview.md",
			license: "CC BY 4.0",
		});
	});

	it("404s other hosts, traversal, unsynced pages and a missing url", async () => {
		const { get } = setup(false);
		for (const q of [
			"https://example.com/x",
			"https://learn.microsoft.com/en-us/azure/%2e%2e/%2e%2e/secret",
			"https://learn.microsoft.com/en-us/azure/../../secret",
			"https://learn.microsoft.com/en-us/azure/storage/not-synced",
		]) {
			const res = await get(`/docs/governance.policy/page?url=${encodeURIComponent(q)}`);
			expect(res.status).toBe(404);
			expect(JSON.stringify(res.body)).not.toContain("TOP SECRET");
		}
		expect((await get("/docs/governance.policy/page")).status).toBe(404);
	});
});
