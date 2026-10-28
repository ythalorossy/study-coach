---
skill: identity.licenses
sources: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
built: 2026-10-22T20:33:33.664Z
---
# Manage licenses in Microsoft Entra ID

## Key concepts

- Group-based licensing assigns or removes a product license for a whole group instead of one account at a time; the eligible group types are security groups, mail-enabled security groups, and Microsoft 365 groups. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/concept-group-based-licensing))
- In the Microsoft 365 admin center you manage this from Billing > Licenses: pick the product, open the Assign licenses pane, search for the group, then choose the subscription the seats come from. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/concept-group-based-licensing))
- To assign licenses by group you must hold at least Groups Administrator, License Administrator, or User Administrator. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/licensing-groups-resolve-problems))
- The same group assignment can be scripted with Microsoft Graph PowerShell using Set-MgGroupLicense. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/concept-group-based-licensing))
- Direct assignment to one user: Users > Active users, select the account row, open Licenses and Apps, expand Licenses, tick the products, then Save changes. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))
- Direct assignment to many users: select the circles beside the user names, choose Manage product licenses, then Assign more: Keep the existing licenses and assign more > Next, tick products, and Save changes. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))
- On the Licenses page a directly licensed account is listed individually, while a group-based assignment appears as the group name only; to see the recipients go to Teams & groups > Active teams & groups. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))
- The Licenses page totals seats per product name across all subscriptions (for example 5 plus 8 Microsoft 365 Business Premium seats displays as 13), unlike Your products, which shows one row per subscription. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))
- A few services such as Sway are granted automatically and never need individual assignment. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))
- Deleting a user account releases that seat immediately for someone else. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))
- Group-based failures happen in the background: the failure is stored on the user object and surfaces later in the portal, whereas a direct assignment shows its error immediately. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/licensing-groups-resolve-problems))
- The per-product Errors & Issues tab lists accounts that did not receive a license and the reason, including users left unlicensed after an attempted assignment, and it is where you retry. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))

## Settings and limits

- You can assign licenses to a maximum of 20 groups in one action. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/concept-group-based-licensing))
- In the Assign licenses panel you can add up to 20 users and/or groups per batch. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))
- Reprocess retries at most 20 users per run. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/licensing-groups-resolve-problems))
- Succeeded and failed user lists paginate 999 names at a time, and the following page only appears once you reach the end of the list. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/concept-group-based-licensing))
- Nested groups are not supported: if a licensed group contains another group, only direct members of the first-level group get the license. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/concept-group-based-licensing))
- A usage location must be set before a license can be assigned, because some services are not sold in every country or region. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/concept-group-based-licensing))
- Turn apps and services on or off lets you include or exclude individual service plans inside a product for a user or a group. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))
- On the Active users page for a multi-user assignment, every service bundled with the product is enabled by default and you deselect the ones you do not want. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))
- To edit what an existing assignment includes, go to the Licenses page, select the row for the user or group, tick or untick apps and services in the details pane, then Save and Close. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))
- To unassign, select the product on Billing > Licenses, tick the user or group check boxes, and choose Unassign licenses; for a single group use the three-dot menu on the group's row > Unassign and confirm Unassign. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/concept-group-based-licensing))
- Large memberships such as 100,000 users can degrade performance, and under heavy load license changes and membership changes to licensed groups can take a long time to process. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/concept-group-based-licensing))
- Move a user between licensed groups without a service gap: add to the destination group first, confirm the license appears on that user's Licenses page, then remove them from the original group. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/licensing-groups-resolve-problems))
- To reprocess: Billing > Licenses > the product with problems > Errors & Issues > fix the underlying cause > select the affected group or user > Reprocess. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/licensing-groups-resolve-problems))
- To spot groups with errors, Billing > Licenses > Overview shows an information box listing every group that has licensing errors; open each group for detail. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/licensing-groups-resolve-problems))
- To spot user-level errors, open Groups, choose the affected group, and use the notification on the group to list the impacted users and their error details. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/licensing-groups-resolve-problems))
- To remove licenses for several users from Active users, select the users > Manage product licenses > Unassign all > Save changes, then Done. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))

## Compare and choose

- Pick the Licenses page when your task is product-first, for example assigning or removing particular groups for one product; pick Active users when it is user-first, giving specific people specific products. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))
- For large numbers of people, assign by group rather than one account at a time. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))
- Add-on products with prerequisites belong in the same group assignment as their prerequisite plan: Microsoft Workplace Analytics needs Exchange Online Plan 1 or Plan 2, so enable only Exchange Online Plan 2 on Office 365 E3 in that group and add Microsoft Workplace Analytics, which spares a second full-suite seat. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/licensing-groups-resolve-problems))
- Conflicting plans happen when a product arrives by group on top of a direct one, such as Office 365 E1 assigned directly plus Office 365 E3 through a group where Exchange Online Plan 1 clashes with Exchange Online Plan 2; disable one plan, remove the redundant direct license, or change the group assignment. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/licensing-groups-resolve-problems))
- Dependency errors: Audio Conferencing needs Skype for Business, so dropping a group license that carries Skype for Business can fail or turn the inherited license into a direct assignment; remove or reassign the dependent service first. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/licensing-groups-resolve-problems))
- When one product fails for seat shortage, conflicts, or dependencies on a multi-product group, the group's other products can fail too; inspect the affected users to identify which product caused it. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/licensing-groups-resolve-problems))
- Strip a group's licenses before deleting the group, because dependency or proxy address problems can block cleanup, and an inherited license may be converted into a direct assignment for users holding a dependent service. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/licensing-groups-resolve-problems))
- Duplicate proxy addresses between two users block Exchange Online licensing; correct the duplicate, then reprocess the user or the group. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/licensing-groups-resolve-problems))
- Changing a license assignment can force recalculation of the user's mail and ProxyAddresses attributes, so trace the underlying source of the change rather than the license itself. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/licensing-groups-resolve-problems))
- LicenseAssignmentAttributeConcurrencyException in audit logs means several groups assigned the same license at once; take no action because retries clear it automatically. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/licensing-groups-resolve-problems))
- For a seat shortage, buy more licenses, drop unused direct assignments, or free seats held by other groups or users. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/licensing-groups-resolve-problems))
- For a usage location error: give the account a supported location, drop members sitting in unsupported regions from that licensed group, and populate location whenever accounts are created. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/licensing-groups-resolve-problems))

## Gotchas

- A user with no usage location inherits the tenant location during group-based assignment, which is a frequent hidden cause of location failures. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/concept-group-based-licensing))
- Leaving the source group before joining the destination one leaves the user unlicensed until the new assignment processes, and in large or busy tenants that gap lasts longer than expected. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/licensing-groups-resolve-problems))
- Reprocess retries only up to 20 users and error lists page at 999 users, so confirm that every member was really retried rather than assumed to be fixed. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/licensing-groups-resolve-problems))
- Group-based assignment reports nothing at the moment it runs, so check Errors & Issues later instead of waiting for an immediate failure notice. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/licensing-groups-resolve-problems))
- If only part of a group was licensed, the assignment status message offers View errors and issues for the per-user breakdown, and the retry happens after you fix the cause. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))
- You cannot assign or unassign seats from a self-service purchase or trial subscription that a user bought; take over that subscription first. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))
- Some subscriptions can only be cancelled inside a short window after purchase or renewal; once it passes, turn off recurring billing so the subscription ends at the end of the term. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))
- As a CSP partner you cannot use Your products for some items such as perpetual software; use the Licenses page for those. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))
- After unassignment, Exchange Online data is kept for 30 days and then deleted with no recovery, although retention labels still keep matching content for discovery; OneDrive for Business files survive unless the account itself is deleted or removed through Active Directory synchronization. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))
- Once a license is removed the mailbox is no longer searchable with Content Search or eDiscovery (Premium); Enterprise subscriptions such as Office 365 Enterprise E3 can preserve it as an inactive mailbox in Exchange Online. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))
- People who keep the Microsoft 365 apps installed after losing a license hit Unlicensed Product and activation errors in Office. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))
- Seats you release and never reassign are still billed, so remove them from the subscription. ([Learn](https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups))
