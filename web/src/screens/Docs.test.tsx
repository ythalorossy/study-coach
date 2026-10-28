// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../lib/api.ts";
import type { DocsSkill, SkillsResponse } from "../lib/types.ts";
import { Docs } from "./Docs.tsx";

vi.mock("../lib/api.ts", () => ({ getSkills: vi.fn(), getDocsSkill: vi.fn(), getDocsPage: vi.fn() }));

const POLICY = "https://learn.microsoft.com/en-us/azure/governance/policy/overview";
const BASICS = "https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-basics";

const skills = {
	ready: false,
	readyAreas: 0,
	totalAreas: 2,
	areas: [
		{ id: "identity-governance", name: "Manage Azure identities and governance", weightMin: 20, weightMax: 25, ready: false, skillCount: 1 },
		{ id: "storage", name: "Implement and manage storage", weightMin: 15, weightMax: 20, ready: false, skillCount: 1 },
	],
	skills: [
		{ id: "governance.policy", areaId: "identity-governance", name: "Implement and manage Azure Policy", specialist: "governance" },
		{ id: "storage.tiers", areaId: "storage", name: "Configure storage tiers", specialist: "files-blobs" },
	],
} as unknown as SkillsResponse;

function docsSkill(factSheet: DocsSkill["factSheet"]): DocsSkill {
	return {
		skillId: "governance.policy",
		name: "Implement and manage Azure Policy",
		factSheet,
		pages: [
			{ url: BASICS, title: "definition-structure-basics", local: false },
			{ url: POLICY, title: "Overview of Azure Policy", local: true },
		],
	};
}

beforeEach(() => {
	vi.mocked(api.getSkills).mockResolvedValue(skills);
	vi.mocked(api.getDocsPage).mockResolvedValue({
		url: POLICY,
		title: "Overview of Azure Policy",
		html: '<h2 id="rules">Rules</h2><p>Page body</p><a href="#" data-anchor="rules">to rules</a>',
		source: { repo: "azure-docs", githubUrl: "https://github.com/MicrosoftDocs/azure-docs/blob/main/a.md", license: "CC BY 4.0" },
	});
});
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("Docs", () => {
	it("lists skills by instructor and asks for a choice when none is selected", async () => {
		render(<Docs tab="sheet" />);
		const link = await screen.findByRole("link", { name: "Implement and manage Azure Policy" });
		expect(link.getAttribute("href")).toBe("#/docs/governance.policy");
		expect(screen.getByText("Governance")).toBeTruthy();
		expect(screen.getByText("Choose a skill to read its fact sheet and source pages.")).toBeTruthy();
	});

	it("groups the skill list by area", async () => {
		render(<Docs tab="sheet" />);
		const storage = await screen.findByRole("region", { name: "Implement and manage storage" });
		expect(within(storage).getByText("Files and blobs")).toBeTruthy();
		expect(within(storage).getByRole("link", { name: "Configure storage tiers" })).toBeTruthy();
		expect(within(storage).queryByText("Implement and manage Azure Policy")).toBeNull();
	});

	it("shows the fact sheet with a stale badge", async () => {
		vi.mocked(api.getDocsSkill).mockResolvedValue(docsSkill({ html: "<p>Sheet text</p>", status: "stale" }));
		render(<Docs skillId="governance.policy" tab="sheet" />);
		expect(await screen.findByText("Sheet text")).toBeTruthy();
		expect(screen.getByText("stale")).toBeTruthy();
	});

	it("shows the empty message when there is no fact sheet", async () => {
		vi.mocked(api.getDocsSkill).mockResolvedValue(docsSkill(null));
		render(<Docs skillId="governance.policy" tab="sheet" />);
		expect(await screen.findByText("No fact sheet yet. Run npm run docs:sheets.")).toBeTruthy();
	});

	it("lists pages and offers Learn for pages not synced", async () => {
		vi.mocked(api.getDocsSkill).mockResolvedValue(docsSkill(null));
		render(<Docs skillId="governance.policy" tab="pages" />);
		const local = await screen.findByRole("link", { name: "Overview of Azure Policy" });
		expect(local.getAttribute("href")).toBe(`#/docs/governance.policy/pages/${encodeURIComponent(POLICY)}`);
		const learn = screen.getByRole("link", { name: "definition-structure-basics (Open on Learn)" });
		expect(learn.getAttribute("href")).toBe(BASICS);
		expect(learn.getAttribute("target")).toBe("_blank");
	});

	it("renders the first local page and its license footer on the pages tab", async () => {
		vi.mocked(api.getDocsSkill).mockResolvedValue(docsSkill(null));
		render(<Docs skillId="governance.policy" tab="pages" />);
		expect(await screen.findByText("Page body")).toBeTruthy();
		expect(api.getDocsPage).toHaveBeenCalledWith("governance.policy", POLICY);
		expect(document.querySelector(".doc-page footer")?.textContent).toContain(
			"From MicrosoftDocs/azure-docs on GitHub, licensed CC BY 4.0.",
		);
	});

	it("scrolls to an anchor without changing the route", async () => {
		vi.mocked(api.getDocsSkill).mockResolvedValue(docsSkill(null));
		const scroll = vi.fn();
		Element.prototype.scrollIntoView = scroll;
		window.location.hash = `#/docs/governance.policy/pages/${encodeURIComponent(POLICY)}`;
		render(<Docs skillId="governance.policy" tab="pages" pageUrl={POLICY} />);
		fireEvent.click(await screen.findByText("to rules"));
		await waitFor(() => expect(scroll).toHaveBeenCalled());
		expect(window.location.hash).toBe(`#/docs/governance.policy/pages/${encodeURIComponent(POLICY)}`);
	});
});
