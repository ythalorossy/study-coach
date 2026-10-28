import type { Diagram, EdgeKind, NodeType } from "./types.ts";

export type LayoutBox = {
	id: string;
	x: number;
	y: number;
	w: number;
	h: number;
	type: NodeType;
	label: string;
	highlighted: boolean;
};
export type LayoutLine = { from: string; to: string; kind: EdgeKind; label?: string };
export type DiagramLayout = { boxes: LayoutBox[]; lines: LayoutLine[]; width: number; height: number };

export const BOX_W = 160;
export const BOX_H = 56;
/** Inner padding of a container box. */
const PAD = 12;
/** Space at the top of a container box for its own type and label. */
const HEADER = 40;
/** Space between sibling boxes, wide enough for a short line label. */
const GAP = 40;
/** Space around the whole diagram. */
const MARGIN = 16;
const PER_ROW = 4;

type Tree = { node: Diagram["nodes"][number]; children: Tree[]; w: number; h: number };

/** Parent ids that lead back to the node itself (or a missing id) are dropped, so those nodes sit at the top level. */
function effectiveParents(d: Diagram): Map<string, string | undefined> {
	const byId = new Map(d.nodes.map((n) => [n.id, n]));
	const out = new Map<string, string | undefined>();
	for (const n of d.nodes) {
		let ok = n.parent !== undefined && byId.has(n.parent);
		const seen = new Set([n.id]);
		for (let p = n.parent; ok && p !== undefined; p = byId.get(p)?.parent) {
			if (seen.has(p) || !byId.has(p)) ok = false;
			seen.add(p);
		}
		out.set(n.id, ok ? n.parent : undefined);
	}
	return out;
}

/** Sizes of children laid out left to right, wrapping after PER_ROW. */
function rowsOf(children: Tree[]): Tree[][] {
	const rows: Tree[][] = [];
	for (let i = 0; i < children.length; i += PER_ROW) rows.push(children.slice(i, i + PER_ROW));
	return rows;
}

function measureRows(children: Tree[]): { w: number; h: number } {
	let w = 0;
	let h = 0;
	for (const [i, row] of rowsOf(children).entries()) {
		w = Math.max(w, row.reduce((s, c) => s + c.w, 0) + GAP * (row.length - 1));
		h += Math.max(...row.map((c) => c.h)) + (i > 0 ? GAP : 0);
	}
	return { w, h };
}

function measure(t: Tree): void {
	for (const c of t.children) measure(c);
	if (t.children.length === 0) {
		t.w = BOX_W;
		t.h = BOX_H;
		return;
	}
	const inner = measureRows(t.children);
	t.w = Math.max(BOX_W, inner.w + PAD * 2);
	t.h = HEADER + inner.h + PAD;
}

function place(children: Tree[], x0: number, y0: number, highlight: Set<string>, out: LayoutBox[]): void {
	let y = y0;
	for (const row of rowsOf(children)) {
		let x = x0;
		for (const c of row) {
			const { id, type, label } = c.node;
			out.push({ id, x, y, w: c.w, h: c.h, type, label, highlighted: highlight.has(id) });
			place(c.children, x + PAD, y + HEADER, highlight, out);
			x += c.w + GAP;
		}
		y += Math.max(...row.map((c) => c.h)) + GAP;
	}
}

/** Positions every node as a box: children nest inside their parent, siblings run left to right in rows of 4. */
export function layoutDiagram(d: Diagram): DiagramLayout {
	const parents = effectiveParents(d);
	const trees = new Map<string, Tree>(d.nodes.map((n) => [n.id, { node: n, children: [], w: 0, h: 0 }]));
	const roots: Tree[] = [];
	for (const n of d.nodes) {
		const t = trees.get(n.id)!;
		const p = parents.get(n.id);
		if (p === undefined) roots.push(t);
		else trees.get(p)!.children.push(t);
	}
	for (const r of roots) measure(r);
	const boxes: LayoutBox[] = [];
	place(roots, MARGIN, MARGIN, new Set(d.highlight), boxes);
	const size = measureRows(roots);
	const lines = d.edges.map((e) => ({ from: e.from, to: e.to, kind: e.kind, ...(e.label !== undefined ? { label: e.label } : {}) }));
	return { boxes, lines, width: size.w + MARGIN * 2, height: size.h + MARGIN * 2 };
}
