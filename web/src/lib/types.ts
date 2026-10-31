export type QuestionFormat = "multiple-choice" | "drag-drop" | "complete-sentence";
export type SessionKind = "lesson" | "practice";
export type AnswerPurpose = "practice" | "lesson-check" | "followup";

export type Readiness = {
	status: "not-enough-data" | "ok";
	score: number | null;
	attempts: number;
};

export type SkillSummary = {
	id: string;
	areaId: string;
	specialist: string;
	name: string;
	taught: boolean;
	readiness: Readiness;
	questionCounts: Record<QuestionFormat, number>;
};

export type AreaSummary = {
	id: string;
	name: string;
	weightMin: number;
	weightMax: number;
	/** False for an area without skills yet. */
	ready: boolean;
	skillCount: number;
};

export type SkillsResponse = {
	skills: SkillSummary[];
	areas: AreaSummary[];
	readyAreas: number;
	totalAreas: number;
	/** Every area is ready. */
	ready: boolean;
};

export type CreatedSession = {
	id: string;
	kind: SessionKind;
	skillIds: string[];
	/** The area the session belongs to; null for a lead's choice from before areas. */
	areaId: string | null;
	title: string;
};

export type SessionSummary = CreatedSession & {
	createdAt: string;
	updatedAt: string;
};

export type Exhibit =
	| { kind: "table"; columns: string[]; rows: string[][] }
	| { kind: "code"; language: "powershell" | "bash" | "json" | "text"; text: string };

export type Choice = { id: string; text: string };

export type QuestionBody =
	| { format: "multiple-choice"; stem: string; exhibit?: Exhibit; options: Choice[] }
	| {
			format: "drag-drop";
			stem: string;
			exhibit?: Exhibit;
			items: Choice[];
			slots: { id: string; label: string }[];
	  }
	| {
			format: "complete-sentence";
			stem: string;
			exhibit?: Exhibit;
			statement: string;
			slots: { id: string; options: Choice[] }[];
	  };

export type SlotMap = Record<string, string>;
export type Key = { optionId: string } | SlotMap;
/** MC `{ optionId }`; drag-drop and complete-sentence map slot id to item or option id. */
export type QuestionResponse = { optionId: string } | SlotMap;
/** perChoice keys: option id (MC), item id (drag-drop), `${slotId}:${optionId}` (complete-sentence). */
export type Explanation = { correct: string; perChoice: Record<string, string> };

export type PublicQuestion = {
	id: string;
	skillId: string;
	format: QuestionFormat;
	body: QuestionBody;
};

export type InstructorId =
	| "lead"
	| "identity"
	| "access"
	| "governance"
	| "storage-security"
	| "storage-accounts"
	| "files-blobs"
	| "templates"
	| "virtual-machines"
	| "containers"
	| "app-service"
	| "virtual-networks"
	| "network-security"
	| "dns-load-balancing";

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

export type Diagram = {
	nodes: { id: string; type: NodeType; label: string; parent?: string }[];
	edges: { from: string; to: string; kind: EdgeKind; label?: string }[];
	highlight: string[];
};

export type AnswerResult = {
	correct: boolean;
	key: Key;
	explanation: Explanation;
	sources: { url: string; readAt: string }[];
};

export type CoverageSkill = {
	areaId: string;
	id: string;
	name: string;
	counts: Record<string, number>;
	subtopics: unknown;
};

export type CoverageFlag = {
	questionId: string;
	skillId: string;
	reason: string;
	createdAt: string;
	stem: string;
};

export type CoverageResponse = {
	target: unknown;
	skills: CoverageSkill[];
	flags: CoverageFlag[];
};

export type DocsSkill = {
	skillId: string;
	name: string;
	factSheet: { html: string; status: "fresh" | "stale" } | null;
	pages: { url: string; title: string; local: boolean }[];
};

export type DocsPage = {
	url: string;
	title: string;
	/** Sanitized on the server. */
	html: string;
	source: { repo: "azure-docs" | "entra-docs"; githubUrl: string; license: string };
};
