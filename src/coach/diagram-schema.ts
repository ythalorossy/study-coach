import * as v from "valibot";

export const NODE_TYPES = [
	"tenant",
	"management-group",
	"subscription",
	"resource-group",
	"resource",
	"user",
	"group",
	"guest-user",
	"role-assignment",
	"policy-assignment",
	"lock",
	"tag",
	"budget",
	"storage-account",
	"container",
	"blob",
	"file-share",
	"snapshot",
	"virtual-network",
	"private-endpoint",
	"sas-token",
	"access-key",
	"virtual-machine",
	"disk",
	"scale-set",
	"availability-set",
	"availability-zone",
	"container-registry",
	"container-instance",
	"container-app",
	"app-service-plan",
	"app-service",
	"deployment-slot",
	"template",
	"subnet",
	"network-interface",
	"network-security-group",
	"application-security-group",
	"route-table",
	"public-ip",
	"load-balancer",
	"bastion",
	"dns-zone",
] as const;
export const EDGE_KINDS = [
	"contains",
	"member-of",
	"assigned-at",
	"applies-to",
	"inherits",
	"replicates-to",
	"grants-access",
	"deploys",
	"swaps-with",
	"peered-with",
	"associated-with",
	"routes-to",
] as const;

export type NodeType = (typeof NODE_TYPES)[number];
export type EdgeKind = (typeof EDGE_KINDS)[number];

const Node = v.object({
	id: v.pipe(v.string(), v.minLength(1)),
	type: v.picklist(NODE_TYPES),
	label: v.pipe(v.string(), v.minLength(1), v.maxLength(80)),
	parent: v.optional(v.string()),
});
const Edge = v.object({
	from: v.string(),
	to: v.string(),
	kind: v.picklist(EDGE_KINDS),
	label: v.optional(v.pipe(v.string(), v.maxLength(80))),
});

/** An Azure scope, identity or storage diagram; every id it mentions must be a node. */
export const DiagramSchema = v.pipe(
	v.object({
		nodes: v.pipe(v.array(Node), v.minLength(1), v.maxLength(30)),
		edges: v.pipe(v.array(Edge), v.maxLength(40)),
		highlight: v.array(v.string()),
	}),
	v.check((d) => new Set(d.nodes.map((n) => n.id)).size === d.nodes.length, "Node ids must be unique"),
	v.forward(
		v.check((d) => {
			const ids = new Set(d.nodes.map((n) => n.id));
			return d.edges.every((e) => ids.has(e.from) && ids.has(e.to));
		}, "Every edge must connect existing node ids"),
		["edges"],
	),
	v.forward(
		v.check((d) => {
			const ids = new Set(d.nodes.map((n) => n.id));
			return d.nodes.every((n) => n.parent === undefined || ids.has(n.parent));
		}, "Every node parent must be an existing node id"),
		["nodes"],
	),
	v.forward(
		v.check((d) => {
			const ids = new Set(d.nodes.map((n) => n.id));
			return d.highlight.every((h) => ids.has(h));
		}, "Every highlight must be an existing node id"),
		["highlight"],
	),
);

export type Diagram = v.InferOutput<typeof DiagramSchema>;
