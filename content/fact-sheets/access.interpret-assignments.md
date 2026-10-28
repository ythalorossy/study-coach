---
skill: access.interpret-assignments
sources: 6513ff7b607887b4d5cdc4ffdb20cd6b9c3589900f7df1f45a96f0db9a9bf550
built: 2026-10-22T20:28:22.407Z
---
# Interpret access assignments

## Key concepts

- A role assignment binds three things — a security principal, a role definition (role), and a scope — and that combination is what grants access under Azure RBAC. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps))
- Assignable principals are User, Group, Service principal, and Managed identity; assigning to a group passes the role to every member of that group. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps))
- A managed identity is an Azure-managed directory identity, normally used so applications don't have to manage their own credentials. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps))
- A role definition bundles permissions; roles fall into job function roles (such as Virtual Machine Contributor, which manages VMs) and privileged administrator roles that apply to all resource types. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps))
- Scope has four levels — management group, subscription, resource group, resource — arranged parent to child, and permissions assigned high up flow down to lower scopes. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps))
- Assignments appear on the Access control (IAM) page, which exists at management group, subscription, resource group and resource level; the Role assignments tab lists assignments and the Roles tab lists built-in and custom roles. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/rbac-and-directory-admin-roles))
- Each assignment carries one of four states: Active permanent, Active time-bound, Eligible permanent, or Eligible time-bound. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-portal))
- Reading role assignments requires Microsoft.Authorization/roleAssignments/read, a permission already contained in Reader. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-portal))
- The Check access tab returns both Azure RBAC assignments and deny assignments created with Azure Blueprints or Azure managed apps. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-portal))
- With Microsoft Entra ID Free or Microsoft Entra ID P1 you get a single Role assignments tab; with Microsoft Entra ID P2 or Microsoft Entra ID Governance, management group, subscription and resource group scopes split into Active assignments and Eligible assignments tabs. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-portal))

## Settings and limits

- A subscription can hold up to 5000 role assignments, and that cap covers subscription, resource group and resource scopes together. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-portal))
- A management group can hold up to 500 role assignments. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps))
- Eligible assignments and assignments scheduled to start in the future don't count toward those quotas. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps))
- Approaching the 5000 cap triggers a warning in the Add role assignment pane, and the Role assignments tab shows a chart with the subscription's current assignment count. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-portal))
- Creating an assignment needs Microsoft.Authorization/roleAssignments/write at that scope (for example Role Based Access Control Administrator); removing one needs Microsoft.Authorization/roleAssignments/delete. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps))
- Without write permission the portal rejects the change with an authorization error that names the roleAssignments write action as the denied operation — contact the subscription administrators instead. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps))
- A service principal assigning a role commonly fails with an insufficient-privileges error because it can't read the directory — grant it directory read permission, or supply the assignee object ID with Azure CLI to bypass the directory lookup. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps))
- Download role assignments lets you tick Inherited, At current scope and Children, then choose CSV or JSON and supply a file name. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-portal))
- The Children checkbox is disabled at management group scope. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-portal))
- Without directory read permission such as Directory Readers, downloaded files leave DisplayName, SignInName and ObjectType blank. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-portal))
- Downloads skip assignments whose security principal has been deleted, and skip access granted to classic administrators. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-portal))
- Select Edit columns and then Start time and End time to surface assignment dates; a start date can be set in the future. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-portal))
- The Privileged tab filters the list to privileged administrator role assignments at the current scope; the Privileged card shows their count, and View assignments opens a page for adding a condition or removing the assignment. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-portal))
- Reaching Azure role assignments > Subscriptions from the Intune admin center throws an expected outage-style error — use the Azure portal or Microsoft Entra admin center instead. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-portal))
- Role assignments authorized through Azure Lighthouse aren't shown in these lists, and service provider tenant users can't see customer tenant assignments. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-portal))

## Compare and choose

- Owner and Contributor both manage every resource, but only Owner can assign Azure RBAC roles; Contributor also can't manage Azure Blueprints assignments or share image galleries. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps))
- Reader is the view-only role across all resource types and is what supplies Microsoft.Authorization/roleAssignments/read. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/rbac-and-directory-admin-roles))
- Role Based Access Control Administrator and User Access Administrator both manage user access, assign roles, and can grant Owner — but only User Access Administrator manages access through other mechanisms such as Azure Policy. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps))
- Reservations Administrator manages all reservations in the tenant and can assign roles only for reservations. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps))
- If a principal only reads blobs, pick Storage Blob Data Reader instead of Storage Blob Data Contributor or Storage Blob Data Owner. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps))
- Azure roles govern Azure resources and are scoped at management group, subscription, resource group or resource; Microsoft Entra roles govern directory objects and are scoped at tenant, administrative unit or a single object. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/rbac-and-directory-admin-roles))
- Both systems allow custom roles, but Azure role data is read via Azure portal, CLI, PowerShell, ARM templates and REST, while Microsoft Entra role data is read via the portal, admin centers, Microsoft Graph and Microsoft Graph PowerShell. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/rbac-and-directory-admin-roles))
- Global Administrator covers Microsoft Entra ID and Microsoft 365 but has no Azure resource access by default; enabling the Access management for Azure resources switch grants User Access Administrator on all subscriptions in the tenant. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/rbac-and-directory-admin-roles))
- Service Administrator and Co-Administrator historically matched Owner access at subscription scope; classic administrator roles retired on August 31, 2024, conversions to Owner began December 2025, and they were fully retired as of May 2026. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/rbac-and-directory-admin-roles))
- Classic limits were 1 Account Administrator per Azure account, 1 Service Administrator per subscription, and 200 Co-Administrators per subscription. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/rbac-and-directory-admin-roles))

## Gotchas

- Azure RBAC assignments aren't honored by the classic deployment model APIs — only the Azure portal and Azure Resource Manager APIs support them. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/rbac-and-directory-admin-roles))
- Check access shows assignments made at the selected scope plus ones inherited into it, but never assignments at child scopes. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-portal))
- Every list shows only the role assignments you have permission to read. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-portal))
- In the Role assignments list, This resource means the role was assigned directly at that scope and (Inherited) means it comes from a parent scope. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-portal))
- Reader at management group scope lets the principal read everything in every subscription inside that management group. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps))
- Billing Reader assigned to a group at subscription scope exposes billing data for every resource group and resource in that subscription. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps))
- Contributor at resource group scope manages all resource types in that group but nothing in other resource groups of the same subscription. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps))
- Least privilege is the recommended default: choose the narrowest scope and most restrictive role, since tighter assignments shrink the damage if the principal is compromised. ([Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps))
