// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../lib/api.ts";
import type { CoverageResponse, SkillsResponse } from "../lib/types.ts";
import { Coverage } from "./Coverage.tsx";

vi.mock("../lib/api.ts", () => ({ getCoverage: vi.fn(), getSkills: vi.fn() }));
afterEach(cleanup);

describe("Coverage", () => {
	it("groups skills under their area", async () => {
		const zero = { "multiple-choice": 0, "drag-drop": 0, "complete-sentence": 0 };
		vi.mocked(api.getCoverage).mockResolvedValue({
			target: { "multiple-choice": 8, "drag-drop": 6, "complete-sentence": 6 },
			skills: [
				{ id: "identity.sspr", areaId: "identity-governance", name: "SSPR", counts: zero, subtopics: {} },
				{ id: "storage.tiers", areaId: "storage", name: "Tiers", counts: zero, subtopics: {} },
			],
			flags: [],
		} as CoverageResponse);
		vi.mocked(api.getSkills).mockResolvedValue({
			areas: [
				{ id: "identity-governance", name: "Manage Azure identities and governance" },
				{ id: "storage", name: "Implement and manage storage" },
			],
		} as unknown as SkillsResponse);
		render(<Coverage />);
		const heading = await screen.findByRole("rowheader", { name: "Implement and manage storage" });
		const rows = screen.getAllByRole("row").map((r) => r.textContent ?? "");
		const at = rows.findIndex((t) => t.includes("Implement and manage storage"));
		expect(heading).toBeTruthy();
		expect(rows[at + 1]).toContain("Tiers");
		expect(rows.findIndex((t) => t.includes("SSPR"))).toBeLessThan(at);
	});
});
