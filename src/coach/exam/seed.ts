import type { SpecialistId } from "./types.ts";

export const GUIDE_VERSION = "2026-04-17";

export const AREAS: [id: string, name: string, min: number, max: number][] = [
	["identity-governance", "Manage Azure identities and governance", 20, 25],
	["storage", "Implement and manage storage", 15, 20],
	["compute", "Deploy and manage Azure compute resources", 20, 25],
	["networking", "Implement and manage virtual networking", 15, 20],
	["monitoring", "Monitor and maintain Azure resources", 10, 15],
];

const L = "https://learn.microsoft.com/en-us";
const S = `${L}/azure/storage`;
const T = `${L}/azure/azure-resource-manager/templates`;
const B = `${L}/azure/azure-resource-manager/bicep`;
const V = `${L}/azure/virtual-machines`;
const AS = `${L}/azure/app-service`;
const N = `${L}/azure/virtual-network`;
const NW = `${L}/azure/network-watcher`;
const LB = `${L}/azure/load-balancer`;

// Exported so specialist instructions list the same doc URLs the database is seeded with.
export const SKILLS: [id: string, specialist: SpecialistId, name: string, docUrls: string[]][] = [
	[
		"identity.create-users-groups",
		"identity",
		"Create users and groups",
		[
			`${L}/entra/fundamentals/how-to-create-delete-users`,
			`${L}/entra/fundamentals/how-to-manage-groups`,
			`${L}/entra/fundamentals/concept-learn-about-groups`,
		],
	],
	[
		"identity.user-group-properties",
		"identity",
		"Manage user and group properties",
		[
			`${L}/entra/fundamentals/how-to-manage-user-profile-info`,
			`${L}/entra/fundamentals/how-to-manage-groups`,
			`${L}/entra/identity/users/groups-dynamic-membership`,
		],
	],
	[
		"identity.licenses",
		"identity",
		"Manage licenses in Microsoft Entra ID",
		[
			`${L}/entra/fundamentals/concept-group-based-licensing`,
			`${L}/entra/fundamentals/license-users-groups`,
			`${L}/entra/fundamentals/licensing-groups-resolve-problems`,
		],
	],
	[
		"identity.external-users",
		"identity",
		"Manage external users",
		[
			`${L}/entra/external-id/what-is-b2b`,
			`${L}/entra/external-id/add-users-administrator`,
			`${L}/entra/external-id/external-collaboration-settings-configure`,
		],
	],
	[
		"identity.sspr",
		"identity",
		"Configure self-service password reset (SSPR)",
		[
			`${L}/entra/identity/authentication/concept-sspr-howitworks`,
			`${L}/entra/identity/authentication/tutorial-enable-sspr`,
			`${L}/entra/identity/authentication/concept-sspr-policy`,
		],
	],
	[
		"access.builtin-roles",
		"access",
		"Manage built-in Azure roles",
		[
			`${L}/azure/role-based-access-control/overview`,
			`${L}/azure/role-based-access-control/built-in-roles`,
			`${L}/azure/role-based-access-control/custom-roles`,
		],
	],
	[
		"access.role-scopes",
		"access",
		"Assign roles at different scopes",
		[
			`${L}/azure/role-based-access-control/scope-overview`,
			`${L}/azure/role-based-access-control/role-assignments-portal`,
			`${L}/azure/role-based-access-control/overview`,
		],
	],
	[
		"access.interpret-assignments",
		"access",
		"Interpret access assignments",
		[
			`${L}/azure/role-based-access-control/role-assignments-list-portal`,
			`${L}/azure/role-based-access-control/role-assignments-steps`,
			`${L}/azure/role-based-access-control/rbac-and-directory-admin-roles`,
		],
	],
	[
		"governance.policy",
		"governance",
		"Implement and manage Azure Policy",
		[
			`${L}/azure/governance/policy/overview`,
			`${L}/azure/governance/policy/concepts/definition-structure-basics`,
			`${L}/azure/governance/policy/tutorials/create-and-manage`,
		],
	],
	[
		"governance.locks",
		"governance",
		"Configure resource locks",
		[
			`${L}/azure/azure-resource-manager/management/lock-resources`,
			`${L}/azure/azure-resource-manager/management/overview`,
		],
	],
	[
		"governance.tags",
		"governance",
		"Apply and manage tags on resources",
		[
			`${L}/azure/azure-resource-manager/management/tag-resources`,
			`${L}/azure/azure-resource-manager/management/tag-policies`,
			`${L}/azure/azure-resource-manager/management/tag-support`,
		],
	],
	[
		"governance.resource-groups",
		"governance",
		"Manage resource groups",
		[
			`${L}/azure/azure-resource-manager/management/manage-resource-groups-portal`,
			`${L}/azure/azure-resource-manager/management/move-resource-group-and-subscription`,
			`${L}/azure/azure-resource-manager/management/overview`,
		],
	],
	[
		"governance.subscriptions",
		"governance",
		"Manage subscriptions",
		[
			`${L}/azure/cost-management-billing/manage/create-subscription`,
			`${L}/azure/cost-management-billing/manage/cancel-azure-subscription`,
			`${L}/azure/cost-management-billing/manage/billing-subscription-transfer`,
		],
	],
	[
		"governance.costs",
		"governance",
		"Manage costs by using alerts, budgets, and Azure Advisor recommendations",
		[
			`${L}/azure/cost-management-billing/costs/tutorial-acm-create-budgets`,
			`${L}/azure/cost-management-billing/costs/cost-mgt-alerts-monitor-usage-spending`,
			`${L}/azure/advisor/advisor-overview`,
			`${L}/azure/advisor/advisor-cost-recommendations`,
		],
	],
	[
		"governance.management-groups",
		"governance",
		"Configure management groups",
		[
			`${L}/azure/governance/management-groups/overview`,
			`${L}/azure/governance/management-groups/create-management-group-portal`,
			`${L}/azure/governance/management-groups/manage`,
		],
	],
	[
		"storage.firewalls",
		"storage-security",
		"Configure Azure Storage firewalls and virtual networks",
		[
			`${S}/common/storage-network-security`,
			`${S}/common/storage-network-security-virtual-networks`,
			`${S}/common/storage-network-security-set-default-access`,
			`${S}/common/storage-private-endpoints`,
		],
	],
	[
		"storage.sas-tokens",
		"storage-security",
		"Create and use shared access signature (SAS) tokens",
		[
			`${S}/common/storage-sas-overview`,
			`${S}/blobs/storage-blob-user-delegation-sas-create-cli`,
			`${S}/common/sas-expiration-policy`,
		],
	],
	[
		"storage.stored-access-policies",
		"storage-security",
		"Configure stored access policies",
		[
			`${S}/common/storage-sas-overview`,
			`${S}/common/storage-stored-access-policy-define-dotnet`,
		],
	],
	[
		"storage.access-keys",
		"storage-security",
		"Manage access keys",
		[
			`${S}/common/storage-account-keys-manage`,
			`${S}/common/shared-key-authorization-prevent`,
		],
	],
	[
		"storage.files-identity",
		"storage-security",
		"Configure identity-based access for Azure Files",
		[
			`${S}/files/storage-files-active-directory-overview`,
			`${S}/files/storage-files-identity-ad-ds-enable`,
			`${S}/files/storage-files-identity-assign-share-level-permissions`,
			`${S}/files/storage-files-identity-configure-file-level-permissions`,
		],
	],
	[
		"storage.accounts",
		"storage-accounts",
		"Create and configure storage accounts",
		[
			`${S}/common/storage-account-overview`,
			`${S}/common/storage-account-create`,
		],
	],
	[
		"storage.redundancy",
		"storage-accounts",
		"Configure Azure Storage redundancy",
		[
			`${S}/common/storage-redundancy`,
			`${S}/common/redundancy-migration`,
			`${S}/common/storage-disaster-recovery-guidance`,
		],
	],
	[
		"storage.object-replication",
		"storage-accounts",
		"Configure object replication",
		[
			`${S}/blobs/object-replication-overview`,
			`${S}/blobs/object-replication-configure`,
		],
	],
	[
		"storage.encryption",
		"storage-accounts",
		"Configure storage account encryption",
		[
			`${S}/common/storage-service-encryption`,
			`${S}/common/customer-managed-keys-overview`,
			`${S}/common/infrastructure-encryption-enable`,
			`${S}/blobs/encryption-scope-overview`,
		],
	],
	[
		"storage.explorer-azcopy",
		"storage-accounts",
		"Manage data by using Azure Storage Explorer and AzCopy",
		[
			`${S}/common/storage-use-azcopy-v10`,
			`${S}/common/storage-use-azcopy-authorize-user-identity`,
			`${S}/storage-explorer/vs-azure-tools-storage-manage-with-storage-explorer`,
		],
	],
	[
		"storage.file-shares",
		"files-blobs",
		"Create and configure a file share in Azure Files",
		[
			`${S}/files/storage-files-introduction`,
			`${S}/files/create-classic-file-share`,
			`${S}/files/storage-files-planning`,
		],
	],
	[
		"storage.blob-containers",
		"files-blobs",
		"Create and configure a container in Azure Blob Storage",
		[
			`${S}/blobs/storage-blobs-introduction`,
			`${S}/blobs/storage-quickstart-blobs-portal`,
			`${S}/blobs/anonymous-read-access-configure`,
		],
	],
	[
		"storage.tiers",
		"files-blobs",
		"Configure storage tiers",
		[
			`${S}/blobs/access-tiers-overview`,
			`${S}/blobs/access-tiers-online-manage`,
			`${S}/blobs/archive-rehydrate-overview`,
		],
	],
	[
		"storage.blob-soft-delete",
		"files-blobs",
		"Configure soft delete for blobs and containers",
		[
			`${S}/blobs/soft-delete-blob-overview`,
			`${S}/blobs/soft-delete-container-overview`,
			`${S}/blobs/soft-delete-blob-enable`,
		],
	],
	[
		"storage.files-snapshots",
		"files-blobs",
		"Configure snapshots and soft delete for Azure Files",
		[
			`${S}/files/storage-snapshots-files`,
			`${S}/files/storage-files-prevent-file-share-deletion`,
		],
	],
	[
		"storage.lifecycle",
		"files-blobs",
		"Configure blob lifecycle management",
		[
			`${S}/blobs/lifecycle-management-overview`,
			`${S}/blobs/lifecycle-management-policy-configure`,
		],
	],
	[
		"storage.versioning",
		"files-blobs",
		"Configure blob versioning",
		[
			`${S}/blobs/versioning-overview`,
			`${S}/blobs/versioning-enable`,
		],
	],
	[
		"compute.templates-interpret",
		"templates",
		"Interpret an Azure Resource Manager template or a Bicep file",
		[
			`${T}/overview`,
			`${T}/syntax`,
			`${B}/overview`,
			`${B}/file`,
		],
	],
	[
		"compute.arm-modify",
		"templates",
		"Modify an existing Azure Resource Manager template",
		[
			`${T}/template-tutorial-create-first-template`,
			`${T}/parameters`,
			`${T}/template-functions`,
		],
	],
	[
		"compute.bicep-modify",
		"templates",
		"Modify an existing Bicep file",
		[
			`${B}/file`,
			`${B}/parameters`,
			`${B}/modules`,
		],
	],
	[
		"compute.templates-deploy",
		"templates",
		"Deploy resources by using an Azure Resource Manager template or a Bicep file",
		[
			`${T}/deploy-portal`,
			`${T}/deploy-cli`,
			`${B}/deploy-cli`,
			`${T}/deployment-modes`,
		],
	],
	[
		"compute.templates-export",
		"templates",
		"Export a deployment as an Azure Resource Manager template or convert an Azure Resource Manager template to a Bicep file",
		[
			`${T}/export-template-portal`,
			`${B}/decompile`,
		],
	],
	[
		"compute.vm-create",
		"virtual-machines",
		"Create a virtual machine",
		[
			`${V}/overview`,
			`${V}/windows/quick-create-portal`,
			`${V}/linux/quick-create-portal`,
		],
	],
	[
		"compute.vm-encryption-host",
		"virtual-machines",
		"Configure encryption at host for Azure virtual machines",
		[
			`${V}/disk-encryption-overview`,
			`${V}/disks-enable-host-based-encryption-portal`,
		],
	],
	[
		"compute.vm-move",
		"virtual-machines",
		"Move a virtual machine to another resource group, subscription, or region",
		[
			`${L}/azure/azure-resource-manager/management/move-resource-group-and-subscription`,
			`${L}/azure/azure-resource-manager/management/move-limitations/virtual-machines-move-limitations`,
			`${L}/azure/resource-mover/tutorial-move-region-virtual-machines`,
		],
	],
	[
		"compute.vm-sizes",
		"virtual-machines",
		"Manage virtual machine sizes",
		[
			`${V}/sizes/overview`,
			`${V}/sizes/resize-vm`,
		],
	],
	[
		"compute.vm-disks",
		"virtual-machines",
		"Manage virtual machine disks",
		[
			`${V}/managed-disks-overview`,
			`${V}/disks-types`,
			`${V}/windows/attach-managed-disk-portal`,
		],
	],
	[
		"compute.vm-availability",
		"virtual-machines",
		"Deploy virtual machines to availability zones and availability sets",
		[
			`${V}/availability`,
			`${V}/availability-set-overview`,
			`${L}/azure/reliability/availability-zones-overview`,
		],
	],
	[
		"compute.vmss",
		"virtual-machines",
		"Deploy and configure an Azure Virtual Machine Scale Sets",
		[
			`${L}/azure/virtual-machine-scale-sets/overview`,
			`${L}/azure/virtual-machine-scale-sets/flexible-virtual-machine-scale-sets-portal`,
			`${L}/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-autoscale-overview`,
		],
	],
	[
		"compute.acr",
		"containers",
		"Create and manage an Azure Container Registry",
		[
			`${L}/azure/container-registry/container-registry-intro`,
			`${L}/azure/container-registry/container-registry-get-started-portal`,
			`${L}/azure/container-registry/container-registry-skus`,
		],
	],
	[
		"compute.aci",
		"containers",
		"Provision a container by using Azure Container Instances",
		[
			`${L}/azure/container-instances/container-instances-overview`,
			`${L}/azure/container-instances/container-instances-quickstart-portal`,
			`${L}/azure/container-instances/container-instances-restart-policy`,
		],
	],
	[
		"compute.container-apps",
		"containers",
		"Provision a container by using Azure Container Apps",
		[
			`${L}/azure/container-apps/overview`,
			`${L}/azure/container-apps/quickstart-portal`,
			`${L}/azure/container-apps/environment`,
		],
	],
	[
		"compute.container-scaling",
		"containers",
		"Manage sizing and scaling for containers, including Azure Container Instances and Azure Container Apps",
		[
			`${L}/azure/container-apps/scale-app`,
			`${L}/azure/container-apps/containers`,
			`${L}/azure/container-instances/container-instances-resource-and-quota-limits`,
		],
	],
	[
		"compute.app-service-plan",
		"app-service",
		"Provision an App Service plan",
		[
			`${AS}/overview-hosting-plans`,
			`${AS}/app-service-plan-manage`,
		],
	],
	[
		"compute.app-service-scaling",
		"app-service",
		"Configure scaling for an App Service plan",
		[
			`${AS}/manage-scale-up`,
			`${AS}/manage-automatic-scaling`,
			`${L}/azure/azure-monitor/autoscale/autoscale-get-started`,
		],
	],
	[
		"compute.app-service-create",
		"app-service",
		"Create an App Service",
		[
			`${AS}/overview`,
			`${AS}/getting-started`,
			`${AS}/configure-common`,
		],
	],
	[
		"compute.app-service-tls",
		"app-service",
		"Configure certificates and Transport Layer Security (TLS) for an App Service",
		[
			`${AS}/configure-ssl-certificate`,
			`${AS}/configure-ssl-bindings`,
			`${AS}/overview-tls`,
		],
	],
	[
		"compute.app-service-dns",
		"app-service",
		"Map an existing custom DNS name to an App Service",
		[
			`${AS}/app-service-web-tutorial-custom-domain`,
			`${AS}/manage-custom-dns-migrate-domain`,
		],
	],
	[
		"compute.app-service-backup",
		"app-service",
		"Configure backup for an App Service",
		[
			`${AS}/manage-backup`,
			`${L}/azure/reliability/reliability-app-service`,
		],
	],
	[
		"compute.app-service-networking",
		"app-service",
		"Configure networking settings for an App Service",
		[
			`${AS}/networking-features`,
			`${AS}/overview-vnet-integration`,
			`${AS}/overview-access-restrictions`,
		],
	],
	[
		"compute.app-service-slots",
		"app-service",
		"Configure deployment slots for an App Service",
		[
			`${AS}/deploy-staging-slots`,
			`${AS}/deploy-best-practices`,
		],
	],
	[
		"networking.vnet-subnets",
		"virtual-networks",
		"Create and configure virtual networks and subnets",
		[
			`${N}/virtual-networks-overview`,
			`${N}/manage-virtual-network`,
			`${N}/virtual-network-manage-subnet`,
		],
	],
	[
		"networking.vnet-peering",
		"virtual-networks",
		"Create and configure virtual network peering",
		[
			`${N}/virtual-network-peering-overview`,
			`${N}/virtual-network-manage-peering`,
		],
	],
	[
		"networking.public-ip",
		"virtual-networks",
		"Configure public IP addresses",
		[
			`${N}/ip-services/public-ip-addresses`,
			`${N}/ip-services/virtual-network-public-ip-address`,
		],
	],
	[
		"networking.user-defined-routes",
		"virtual-networks",
		"Configure user-defined routes",
		[
			`${N}/virtual-networks-udr-overview`,
			`${N}/manage-route-table`,
		],
	],
	[
		"networking.troubleshoot-connectivity",
		"virtual-networks",
		"Troubleshoot network connectivity",
		[
			`${NW}/ip-flow-verify-overview`,
			`${NW}/next-hop-overview`,
			`${NW}/connection-troubleshoot-overview`,
		],
	],
	[
		"networking.nsg-asg",
		"network-security",
		"Create and configure network security groups (NSGs) and application security groups",
		[
			`${N}/network-security-groups-overview`,
			`${N}/application-security-groups`,
			`${N}/manage-network-security-group`,
		],
	],
	[
		"networking.nsg-effective-rules",
		"network-security",
		"Evaluate effective security rules in NSGs",
		[
			`${N}/network-security-group-how-it-works`,
			`${N}/diagnose-network-traffic-filter-problem`,
		],
	],
	[
		"networking.bastion",
		"network-security",
		"Implement Azure Bastion",
		[
			`${L}/azure/bastion/bastion-overview`,
			`${L}/azure/bastion/configuration-settings`,
			`${L}/azure/bastion/tutorial-create-host-portal`,
		],
	],
	[
		"networking.service-endpoints",
		"network-security",
		"Configure service endpoints for Azure platform as a service (PaaS)",
		[
			`${N}/virtual-network-service-endpoints-overview`,
			`${N}/virtual-network-service-endpoint-policies-overview`,
			`${N}/tutorial-restrict-network-access-to-resources`,
		],
	],
	[
		"networking.private-endpoints",
		"network-security",
		"Configure private endpoints for Azure PaaS",
		[
			`${L}/azure/private-link/private-endpoint-overview`,
			`${L}/azure/private-link/private-endpoint-dns`,
			`${L}/azure/private-link/create-private-endpoint-portal`,
		],
	],
	[
		"networking.azure-dns",
		"dns-load-balancing",
		"Configure Azure DNS",
		[
			`${L}/azure/dns/dns-overview`,
			`${L}/azure/dns/dns-zones-records`,
			`${L}/azure/dns/private-dns-overview`,
			`${L}/azure/dns/dns-delegate-domain-azure-dns`,
		],
	],
	[
		"networking.load-balancer",
		"dns-load-balancing",
		"Configure an internal or public load balancer",
		[
			`${LB}/load-balancer-overview`,
			`${LB}/components`,
			`${LB}/skus`,
		],
	],
	[
		"networking.load-balancer-troubleshoot",
		"dns-load-balancing",
		"Troubleshoot load balancing",
		[
			`${LB}/load-balancer-troubleshoot`,
			`${LB}/load-balancer-custom-probe-overview`,
			`${LB}/load-balancer-standard-diagnostics`,
		],
	],
];
