import { BOX_H, BOX_W, layoutDiagram } from "../lib/diagram-layout.ts";
import type { DiagramLayout, LayoutBox } from "../lib/diagram-layout.ts";
import type { Diagram as DiagramData, EdgeKind, NodeType } from "../lib/types.ts";

const TYPE_LABEL: Record<NodeType, string> = {
	tenant: "Tenant",
	"management-group": "Management group",
	subscription: "Subscription",
	"resource-group": "Resource group",
	resource: "Resource",
	user: "User",
	group: "Group",
	"guest-user": "Guest user",
	"role-assignment": "Role assignment",
	"policy-assignment": "Policy assignment",
	lock: "Lock",
	tag: "Tag",
	budget: "Budget",
	"storage-account": "Storage account",
	container: "Container",
	blob: "Blob",
	"file-share": "File share",
	snapshot: "Snapshot",
	"virtual-network": "Virtual network",
	"private-endpoint": "Private endpoint",
	"sas-token": "SAS token",
	"access-key": "Access key",
	"virtual-machine": "Virtual machine",
	disk: "Disk",
	"scale-set": "Scale set",
	"availability-set": "Availability set",
	"availability-zone": "Availability zone",
	"container-registry": "Container registry",
	"container-instance": "Container instance",
	"container-app": "Container app",
	"app-service-plan": "App Service plan",
	"app-service": "App Service",
	"deployment-slot": "Deployment slot",
	template: "Template",
	subnet: "Subnet",
	"network-interface": "Network interface",
	"network-security-group": "NSG",
	"application-security-group": "ASG",
	"route-table": "Route table",
	"public-ip": "Public IP",
	"load-balancer": "Load balancer",
	bastion: "Bastion",
	"dns-zone": "DNS zone",
};

const EDGE_COLOR: Record<EdgeKind, string> = {
	contains: "#5c6b7a",
	"member-of": "var(--c-identity)",
	"assigned-at": "var(--c-access)",
	"applies-to": "var(--c-governance)",
	inherits: "var(--c-lead)",
	"replicates-to": "var(--c-storage-accounts)",
	"grants-access": "var(--c-storage-security)",
	deploys: "var(--c-templates)",
	"swaps-with": "var(--c-app-service)",
	"peered-with": "var(--c-virtual-networks)",
	"associated-with": "var(--c-network-security)",
	"routes-to": "var(--c-dns-load-balancing)",
};

const EDGE_DASH: Record<EdgeKind, string | undefined> = {
	contains: undefined,
	"member-of": "6 4",
	"assigned-at": undefined,
	"applies-to": "6 4",
	inherits: "2 4",
	"replicates-to": "6 4",
	"grants-access": undefined,
	deploys: undefined,
	"swaps-with": "2 4",
	"peered-with": undefined,
	"associated-with": "6 4",
	"routes-to": undefined,
};

/** Connections that run both ways get an arrowhead at each end. */
const SYMMETRIC: ReadonlySet<EdgeKind> = new Set(["peered-with", "swaps-with"]);

/** Cuts text to at most `max` characters, ending with an ellipsis when cut. */
function cut(text: string, max: number): string {
	return text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text;
}

/** Roughly how many bold 12px characters fit in a box of this width. */
function fits(w: number): number {
	return Math.max(4, Math.floor((w - 16) / 7.8));
}

/** A leaf label on up to two lines, split at a word boundary when it can be. */
function twoLines(text: string, w: number): string[] {
	const max = fits(w);
	if (text.length <= max) return [text];
	const space = text.lastIndexOf(" ", max);
	const split = space > max / 2 ? space : max;
	return [text.slice(0, split).trimEnd(), cut(text.slice(split).trimStart(), max)];
}

function center(b: LayoutBox) {
	return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

function inside(inner: LayoutBox, outer: LayoutBox): boolean {
	return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;
}

/** Where the ray from the box's center toward `to` leaves the box. */
function borderPoint(b: LayoutBox, to: { x: number; y: number }) {
	const c = center(b);
	const dx = to.x - c.x;
	const dy = to.y - c.y;
	if (dx === 0 && dy === 0) return c;
	const s = Math.min(dx === 0 ? Infinity : b.w / 2 / Math.abs(dx), dy === 0 ? Infinity : b.h / 2 / Math.abs(dy));
	return { x: c.x + dx * s, y: c.y + dy * s };
}

/** End points of a line between two separate boxes, on their borders. */
function endpoints(from: LayoutBox, to: LayoutBox) {
	return [borderPoint(from, center(to)), borderPoint(to, center(from))];
}

type Rect = { x: number; y: number; w: number; h: number };

function overlaps(a: Rect, b: Rect): boolean {
	return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

type Placed = {
	key: number;
	kind: EdgeKind;
	title: string;
	p: { x: number; y: number };
	q: { x: number; y: number };
	text: string;
	at: { x: number; y: number } | null;
};

/** Each drawable line with its label set at the first spot along it that clears unrelated boxes. */
function placeLines(boxes: LayoutBox[], lines: DiagramLayout["lines"]): Placed[] {
	const byId = new Map(boxes.map((b) => [b.id, b]));
	const out: Placed[] = [];
	lines.forEach((l, key) => {
		const from = byId.get(l.from);
		const to = byId.get(l.to);
		// Nesting already shows a box inside another; the legend still lists the connection.
		if (!from || !to || from === to || inside(from, to) || inside(to, from)) return;
		const [p, q] = endpoints(from, to);
		// On the line only what fits between the boxes; the legend below has every label in full.
		const room = Math.floor((Math.hypot(q.x - p.x, q.y - p.y) - 32) / 6);
		const text = room < 4 ? "" : cut(l.label ?? l.kind, room);
		const tw = text.length * 6 + 8;
		// The end boxes and the boxes holding them may sit under a label; any other box may not.
		const obstacles = boxes.filter((b) => b !== from && b !== to && !inside(from, b) && !inside(to, b));
		let at: Placed["at"] = null;
		if (text) {
			for (const t of [0.5, 0.4, 0.6, 0.3, 0.7]) {
				const c = { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
				const rect = { x: c.x - tw / 2, y: c.y - 8, w: tw, h: 16 };
				if (!obstacles.some((b) => overlaps(rect, b))) {
					at = c;
					break;
				}
			}
		}
		const title = `${from.label} ${l.kind} ${to.label}${l.label ? `: ${l.label}` : ""}`;
		out.push({ key, kind: l.kind, title, p, q, text: at ? text : "", at });
	});
	return out;
}

export function Diagram({ diagram }: { diagram: DiagramData | null }) {
	if (!diagram) {
		return (
			<div className="diagram diagram-empty">
				<p className="muted">The whiteboard is empty. The instructors draw the scenario here.</p>
			</div>
		);
	}
	const layout = layoutDiagram(diagram);
	const byId = new Map(layout.boxes.map((b) => [b.id, b]));
	const isContainer = (b: LayoutBox) => layout.boxes.some((o) => o !== b && inside(o, b));
	const containers = layout.boxes.filter(isContainer);
	const leaves = layout.boxes.filter((b) => !isContainer(b));
	const placed = placeLines(layout.boxes, layout.lines);
	const renderBox = (b: LayoutBox) => (
		<g key={b.id} className="dg-node" data-type={b.type} data-id={b.id}>
			<title>{`${TYPE_LABEL[b.type]}: ${b.label}`}</title>
			<rect className="dg-box" data-highlighted={b.highlighted} x={b.x} y={b.y} width={b.w} height={b.h} rx={2} />
			<text className="dg-type" x={b.x + 8} y={b.y + 16}>
				{cut(TYPE_LABEL[b.type], fits(b.w))}
			</text>
			{b.w === BOX_W && b.h === BOX_H ? (
				twoLines(b.label, b.w).map((line, i) => (
					<text key={i} className="dg-label" x={b.x + 8} y={b.y + 32 + i * 14}>
						{line}
					</text>
				))
			) : (
				<text className="dg-label" x={b.x + 8} y={b.y + 32}>
					{cut(b.label, fits(b.w))}
				</text>
			)}
		</g>
	);
	return (
		<div className="diagram">
			<svg
				viewBox={`0 0 ${layout.width} ${layout.height}`}
				width={layout.width}
				role="img"
				aria-label="Scenario diagram"
				// Small diagrams grow a little to fill the board; large ones shrink to fit it.
				style={{ width: `min(100%, ${Math.round(layout.width * 1.35)}px)`, height: "auto" }}
			>
				<defs>
					{(Object.keys(EDGE_COLOR) as EdgeKind[]).map((k) => (
						<marker key={k} id={`dg-arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
							<path d="M0,0 L10,5 L0,10 z" style={{ fill: EDGE_COLOR[k] }} />
						</marker>
					))}
				</defs>
				{/* Containers, then lines, then leaf boxes: a line crossing a leaf passes behind it. */}
				{containers.map(renderBox)}
				{placed.map((l) => (
					<line
						key={l.key}
						className="dg-line"
						data-kind={l.kind}
						x1={l.p.x}
						y1={l.p.y}
						x2={l.q.x}
						y2={l.q.y}
						style={{ stroke: EDGE_COLOR[l.kind] }}
						strokeWidth={1.5}
						strokeDasharray={EDGE_DASH[l.kind]}
						markerStart={SYMMETRIC.has(l.kind) ? `url(#dg-arrow-${l.kind})` : undefined}
						markerEnd={`url(#dg-arrow-${l.kind})`}
					>
						<title>{l.title}</title>
					</line>
				))}
				{leaves.map(renderBox)}
				{placed.map(
					(l) =>
						l.at && (
							<g key={l.key} className="dg-line-label-group">
								<rect
									className="dg-line-label-bg"
									x={l.at.x - (l.text.length * 6 + 8) / 2}
									y={l.at.y - 8}
									width={l.text.length * 6 + 8}
									height={16}
									rx={2}
								/>
								<text className="dg-line-label" x={l.at.x} y={l.at.y + 4} textAnchor="middle" style={{ fill: EDGE_COLOR[l.kind] }}>
									{l.text}
								</text>
							</g>
						),
				)}
			</svg>
			{layout.lines.length > 0 && (
				<ul className="dg-legend" aria-label="Connections">
					{layout.lines.map((l, i) => (
						<li key={i} style={{ borderColor: EDGE_COLOR[l.kind] }}>
							<strong>{byId.get(l.from)?.label}</strong> <span style={{ color: EDGE_COLOR[l.kind] }}>{l.kind}</span>{" "}
							<strong>{byId.get(l.to)?.label}</strong>
							{l.label ? `: ${l.label}` : ""}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
