// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../lib/api.ts";
import type { AreaSummary, SkillSummary, SkillsResponse } from "../lib/types.ts";
import { Home } from "./Home.tsx";

vi.mock("../lib/api.ts", () => ({ getSkills: vi.fn(), listSessions: vi.fn(), createSession: vi.fn() }));

const counts = { "multiple-choice": 8, "drag-drop": 6, "complete-sentence": 6 };
const skill = (id: string, areaId: string, specialist: string, name: string): SkillSummary => ({
	id,
	areaId,
	specialist,
	name,
	taught: false,
	readiness: { status: "not-enough-data", score: null, attempts: 0 },
	questionCounts: counts,
});
const area = (id: string, name: string, weightMin: number, weightMax: number, skillCount: number): AreaSummary => ({
	id,
	name,
	weightMin,
	weightMax,
	ready: false,
	skillCount,
});

const data: SkillsResponse = {
	skills: [
		skill("identity.sspr", "identity-governance", "identity", "Configure self-service password reset (SSPR)"),
		skill("storage.tiers", "storage", "files-blobs", "Configure storage tiers"),
	],
	areas: [
		area("identity-governance", "Manage Azure identities and governance", 20, 25, 1),
		area("storage", "Implement and manage storage", 15, 20, 1),
		area("compute", "Deploy and manage Azure compute resources", 20, 25, 0),
		area("networking", "Implement and manage virtual networking", 15, 20, 0),
		area("monitoring", "Monitor and maintain Azure resources", 10, 15, 0),
	],
	readyAreas: 0,
	totalAreas: 5,
	ready: false,
};

beforeEach(() => {
	vi.mocked(api.getSkills).mockResolvedValue(data);
	vi.mocked(api.listSessions).mockResolvedValue([]);
	vi.mocked(api.createSession).mockReturnValue(new Promise(() => {}));
});
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("Home", () => {
	it("shows how many areas are ready", async () => {
		render(<Home />);
		expect(await screen.findByText("0 of 5 areas ready")).toBeTruthy();
	});

	it("shows each area with its weight and badge, and later areas as coming later", async () => {
		render(<Home />);
		const storage = await screen.findByRole("region", { name: "Implement and manage storage" });
		expect(within(storage).getByText("15–20% of the exam")).toBeTruthy();
		expect(within(storage).getByText("Not ready yet")).toBeTruthy();
		const compute = screen.getByRole("region", { name: "Deploy and manage Azure compute resources" });
		expect(within(compute).getByText("Coming later")).toBeTruthy();
		expect(within(compute).queryByRole("button")).toBeNull();
	});

	it("starts a lead-choice lesson in the area it was clicked in", async () => {
		render(<Home />);
		const storage = await screen.findByRole("region", { name: "Implement and manage storage" });
		fireEvent.click(within(storage).getByRole("button", { name: "Let the lead choose" }));
		expect(api.createSession).toHaveBeenCalledWith("lesson", [], "storage");
	});

	it("groups a storage skill under its instructor", async () => {
		render(<Home />);
		const storage = await screen.findByRole("region", { name: "Implement and manage storage" });
		expect(within(storage).getByText("Files and blobs")).toBeTruthy();
		expect(within(storage).getByText("Configure storage tiers")).toBeTruthy();
		expect(within(storage).queryByText("Configure self-service password reset (SSPR)")).toBeNull();
	});
});
