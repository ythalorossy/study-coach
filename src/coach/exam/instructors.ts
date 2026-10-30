// The specialist instructors, each owning skills in one exam area. A skill's
// area is its specialist's area. Adding an area means adding its specialists
// here, its skills in seed.ts, and the matching web list (web/src/lib/instructors.ts).
import { AREAS, SKILLS } from "./seed.ts";

interface Specialist {
	id: string;
	areaId: string;
	/** How the instructor is named in speech ("the storage security instructor"). */
	title: string;
	description: string;
}

export const SPECIALISTS = [
	{
		id: "identity",
		areaId: "identity-governance",
		title: "identity",
		description:
			"Identity instructor: users and groups, their properties, licenses, external (guest) users and self-service password reset in Microsoft Entra ID.",
	},
	{
		id: "access",
		areaId: "identity-governance",
		title: "access control",
		description: "Access instructor: Azure RBAC built-in roles, role assignments at different scopes, and interpreting access assignments.",
	},
	{
		id: "governance",
		areaId: "identity-governance",
		title: "governance",
		description:
			"Governance instructor: Azure Policy, resource locks, tags, resource groups, subscriptions, cost management and management groups.",
	},
	{
		id: "storage-security",
		areaId: "storage",
		title: "storage security",
		description:
			"Storage security instructor: storage firewalls and virtual networks, shared access signatures, stored access policies, access keys, and identity-based access for Azure Files.",
	},
	{
		id: "storage-accounts",
		areaId: "storage",
		title: "storage accounts",
		description:
			"Storage accounts instructor: creating and configuring storage accounts, redundancy, object replication, encryption, and Azure Storage Explorer and AzCopy.",
	},
	{
		id: "files-blobs",
		areaId: "storage",
		title: "files and blobs",
		description:
			"Files and blobs instructor: Azure Files shares, Blob Storage containers, access tiers, soft delete, snapshots, lifecycle management and blob versioning.",
	},
	{
		id: "templates",
		areaId: "compute",
		title: "templates",
		description:
			"Templates instructor: reading, modifying and deploying Azure Resource Manager templates and Bicep files, exporting deployments and converting ARM templates to Bicep.",
	},
	{
		id: "virtual-machines",
		areaId: "compute",
		title: "virtual machines",
		description:
			"Virtual machines instructor: creating VMs, encryption at host, moving VMs, sizes, managed disks, availability zones and sets, and Virtual Machine Scale Sets.",
	},
	{
		id: "containers",
		areaId: "compute",
		title: "containers",
		description:
			"Containers instructor: Azure Container Registry, Azure Container Instances, Azure Container Apps, and sizing and scaling containers.",
	},
	{
		id: "app-service",
		areaId: "compute",
		title: "App Service",
		description:
			"App Service instructor: App Service plans and their scaling, creating apps, certificates and TLS, custom domains, backup, networking and deployment slots.",
	},
] as const satisfies readonly Specialist[];

export function specialistArea(specialistId: string): string {
	const s = SPECIALISTS.find((x) => x.id === specialistId);
	if (!s) throw new Error(`Unknown specialist ${specialistId}`);
	return s.areaId;
}

export function areaOfSkill(skillId: string): string {
	const skill = SKILLS.find(([id]) => id === skillId);
	if (!skill) throw new Error(`Unknown skill ${skillId}`);
	return specialistArea(skill[1]);
}

export function areaName(areaId: string): string {
	const area = AREAS.find(([id]) => id === areaId);
	if (!area) throw new Error(`Unknown area ${areaId}`);
	return area[1];
}
