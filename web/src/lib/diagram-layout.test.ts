import { describe, expect, it } from "vitest";
import { layoutDiagram } from "./diagram-layout.ts";
import type { Diagram } from "./types.ts";

function box(layout: ReturnType<typeof layoutDiagram>, id: string) {
	const b = layout.boxes.find((x) => x.id === id);
	if (!b) throw new Error(`no box ${id}`);
	return b;
}

const nested: Diagram = {
	nodes: [
		{ id: "sub", type: "subscription", label: "Contoso Prod" },
		{ id: "rg", type: "resource-group", label: "rg-web", parent: "sub" },
		{ id: "vm", type: "resource", label: "vm-web-01", parent: "rg" },
		{ id: "u1", type: "user", label: "Ana" },
	],
	edges: [{ from: "u1", to: "rg", kind: "assigned-at", label: "Contributor" }],
	highlight: ["rg"],
};

describe("layoutDiagram", () => {
	it("positions a child resource group inside its subscription's box", () => {
		const layout = layoutDiagram(nested);
		const sub = box(layout, "sub");
		const rg = box(layout, "rg");
		const vm = box(layout, "vm");
		expect(rg.x).toBeGreaterThan(sub.x);
		expect(rg.y).toBeGreaterThan(sub.y);
		expect(rg.x + rg.w).toBeLessThan(sub.x + sub.w);
		expect(rg.y + rg.h).toBeLessThan(sub.y + sub.h);
		expect(vm.x).toBeGreaterThan(rg.x);
		expect(vm.x + vm.w).toBeLessThan(rg.x + rg.w);
		expect(vm.y + vm.h).toBeLessThan(rg.y + rg.h);
		expect(vm).toMatchObject({ w: 160, h: 56, type: "resource", label: "vm-web-01" });
	});

	it("lays 6 top-level nodes out in 2 rows of at most 4", () => {
		const d: Diagram = {
			nodes: Array.from({ length: 6 }, (_, i) => ({ id: `n${i}`, type: "user" as const, label: `User ${i}` })),
			edges: [],
			highlight: [],
		};
		const layout = layoutDiagram(d);
		const rows = new Set(layout.boxes.map((b) => b.y));
		expect(rows.size).toBe(2);
		const firstRow = layout.boxes.filter((b) => b.y === Math.min(...rows));
		expect(firstRow.map((b) => b.id)).toEqual(["n0", "n1", "n2", "n3"]);
		const xs = firstRow.map((b) => b.x);
		expect(xs).toEqual([...xs].sort((a, b) => a - b));
	});

	it("marks only the highlighted box", () => {
		const layout = layoutDiagram(nested);
		expect(box(layout, "rg").highlighted).toBe(true);
		expect(layout.boxes.filter((b) => b.highlighted).map((b) => b.id)).toEqual(["rg"]);
	});

	it("passes edges through as lines", () => {
		expect(layoutDiagram(nested).lines).toEqual([{ from: "u1", to: "rg", kind: "assigned-at", label: "Contributor" }]);
	});

	it("is deterministic", () => {
		expect(layoutDiagram(nested)).toEqual(layoutDiagram(structuredClone(nested)));
	});

	it("treats nodes in a parent cycle as top-level instead of looping", () => {
		const d: Diagram = {
			nodes: [
				{ id: "a", type: "group", label: "A", parent: "b" },
				{ id: "b", type: "group", label: "B", parent: "a" },
			],
			edges: [],
			highlight: [],
		};
		expect(layoutDiagram(d).boxes.map((b) => b.id).sort()).toEqual(["a", "b"]);
	});
});
