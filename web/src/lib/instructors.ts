// The room's instructors as the page shows them. Must list the same specialists,
// in the same order, as src/coach/instructors.ts (a test checks this); each needs
// a --c-<id> colour token in styles.css.
import type { InstructorId } from "./types.ts";

export interface WebInstructor {
	id: InstructorId;
	/** null for the lead, who teaches every area. */
	areaId: string | null;
	name: string;
	initials: string;
	topic: string;
}

export const WEB_INSTRUCTORS: WebInstructor[] = [
	{ id: "lead", areaId: null, name: "Lead", initials: "L", topic: "Runs the room" },
	{ id: "identity", areaId: "identity-governance", name: "Identity", initials: "ID", topic: "Users, groups, guests" },
	{ id: "access", areaId: "identity-governance", name: "Access", initials: "AC", topic: "Roles and RBAC" },
	{ id: "governance", areaId: "identity-governance", name: "Governance", initials: "GV", topic: "Policy, locks, cost" },
	{ id: "storage-security", areaId: "storage", name: "Storage security", initials: "SS", topic: "Firewalls, SAS, keys" },
	{ id: "storage-accounts", areaId: "storage", name: "Storage accounts", initials: "SA", topic: "Redundancy, encryption" },
	{ id: "files-blobs", areaId: "storage", name: "Files and blobs", initials: "FB", topic: "Shares, tiers, versions" },
	{ id: "templates", areaId: "compute", name: "Templates", initials: "TP", topic: "ARM and Bicep" },
	{ id: "virtual-machines", areaId: "compute", name: "Virtual machines", initials: "VM", topic: "Sizes, disks, scale sets" },
	{ id: "containers", areaId: "compute", name: "Containers", initials: "CT", topic: "Registry, instances, apps" },
	{ id: "app-service", areaId: "compute", name: "App Service", initials: "AP", topic: "Plans, TLS, slots" },
];

/** The lead plus the area's specialists; everyone when the area is unknown. */
export function instructorsFor(areaId: string | null): WebInstructor[] {
	if (!areaId) return WEB_INSTRUCTORS;
	return WEB_INSTRUCTORS.filter((i) => i.areaId === null || i.areaId === areaId);
}
