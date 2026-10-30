import { describe, expect, it } from "vitest";
import { EDGE_KINDS as SERVER_EDGES, NODE_TYPES as SERVER_NODES } from "../../../src/coach/diagram-schema.ts";
import { SPECIALISTS } from "../../../src/coach/exam/instructors.ts";
import { instructorsFor, WEB_INSTRUCTORS } from "./instructors.ts";
import { EDGE_KINDS, NODE_TYPES } from "./types.ts";

describe("web instructors", () => {
	it("matches the server's specialists", () => {
		expect(WEB_INSTRUCTORS.filter((i) => i.id !== "lead").map((i) => [i.id, i.areaId])).toEqual(
			SPECIALISTS.map((s) => [s.id, s.areaId]),
		);
	});

	it("matches the server's diagram vocabulary", () => {
		expect([...NODE_TYPES]).toEqual([...SERVER_NODES]);
		expect([...EDGE_KINDS]).toEqual([...SERVER_EDGES]);
	});

	it("shows the lead and the area's three specialists", () => {
		expect(instructorsFor("storage").map((i) => i.id)).toEqual(["lead", "storage-security", "storage-accounts", "files-blobs"]);
		expect(instructorsFor("identity-governance").map((i) => i.id)).toEqual(["lead", "identity", "access", "governance"]);
		expect(instructorsFor("compute").map((i) => i.id)).toEqual(["lead", "templates", "virtual-machines", "containers", "app-service"]);
		expect(instructorsFor(null)).toHaveLength(11);
	});
});
