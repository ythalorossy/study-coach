---
skill: compute.app-service-backup
sources: e91d122370f6fc9dec950f9fd550d8d170a1992bf4fbdf208239c4efe40c5cb9
built: 2026-10-24T15:11:00.140Z
---
# Configure backup for an App Service

## Key concepts

- **Azure App Service** backup and restore is available in the **Basic**, **Standard**, **Premium**, and **Isolated** tiers. On **Basic**, only the production slot can be backed up or restored. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- App Service offers two backup types. **Automatic backups** are created by the platform, while **custom backups** are configured by you and then run on demand or on a schedule; both types are offered in the same four tiers. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Automatic backups work without any setup. Custom backups need initial configuration, including a **Storage account**, before you can create one. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Automatic backups are a platform-managed safety net: they run every hour, are kept for **30 days**, and their timing and retention can't be changed. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Custom backups are the flexible option: you control when they run and how long they're kept, can download them as **Azure Storage** blobs, and can include a linked database until support ends. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Backups are mainly for recovering app content when redeploying code is difficult or the app stores state on disk; they protect against some risks that availability features don't cover. ([Learn](https://learn.microsoft.com/en-us/azure/reliability/reliability-app-service))
- Most production designs shouldn't rely on backups alone; pair them with the measures that handle transient faults, availability-zone outages, and regional outages. ([Learn](https://learn.microsoft.com/en-us/azure/reliability/reliability-app-service))
- App Service is a single-region service, so a regional outage takes the app offline. Surviving that scenario means deploying plans in multiple regions, arranging load balancing and failover, and replicating data between those regions. ([Learn](https://learn.microsoft.com/en-us/azure/reliability/reliability-app-service))
- Zone redundancy is a separate feature rather than a backup. On **Premium v2**, **Premium v3**, and **Premium v4** plans, it spreads plan instances across availability zones, covers every app hosted on the plan, and needs at least two instances. ([Learn](https://learn.microsoft.com/en-us/azure/reliability/reliability-app-service))

## Settings and limits

- The maximum automatic-backup size is **30 GB**, while a custom backup is capped at **10 GB**. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Inside the **10 GB** custom-backup limit, no more than **4 GB** can be used for the linked database. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- A custom backup schedule can run as often as every **2 hours**, and the service allows at most **12 backups per day** in total. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- The daily custom-backup allowance counts both on-demand and scheduled backups, so manual runs reduce the room left in that day's schedule. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Custom backup retention is configurable from **0 to 30 days**, or can be set to **indefinite**. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Automatic backups always run hourly, and that frequency isn't configurable. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Automatic backups always expire after **30 days**, and that retention period isn't configurable. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Within the automatic **30 days** of retention, backups are thinned over time: hourly copies for days **1–3**, every third hourly copy for days **4–14**, and every sixth hourly copy for days **15–30**. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Custom backups support **partial backups**; automatic backups don't. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Custom backups can be made across a virtual network; automatic backups can't. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Custom backups can be downloaded as **Azure Storage** blobs; automatic backups can't be downloaded. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- A **Storage account** is required for custom backups but not for automatic backups. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Until **March 31, 2028**, a custom backup can include a linked **SQL Database**, **Azure Database for MySQL**, **Azure Database for PostgreSQL**, or **MySQL in-app**. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- **Azure Database for MySQL - Flexible Server** and **Azure Database for PostgreSQL - Flexible Server** aren't supported as linked databases in custom backups. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- From **March 31, 2028**, custom backups stop supporting linked databases; recovery for the database then belongs to that database product's native backup and restore tools. ([Learn](https://learn.microsoft.com/en-us/azure/reliability/reliability-app-service))
- In the portal, open the app and choose **Backups** from the left menu; that page lists all automatic and custom backups together with each one's status. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Restoring stops the destination app or slot while the operation runs, which means the target is unavailable for that period. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Under **Choose a destination**, choose **Create new** under **App Service** for a new app or **Create new** under **Deployment slot** for a new slot. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- If you restore over an existing slot, its entire filesystem is erased first and then replaced with the backup contents. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- The production slot carries the same name as the app, so a restore aimed there overwrites production rather than a side slot. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Picking a backup fills the **Backup details** section for you, and **Advanced options** lets you decide whether site configuration is restored with the content. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))

## Compare and choose

- Pick automatic backups when you want no configuration, platform-managed hourly coverage, and the larger **30 GB** ceiling. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Pick custom backups when you need an on-demand copy, a schedule you control, **partial backups**, downloadable results, or a backup over a virtual network. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Pick custom backups when your retention needs differ from the automatic fixed **30 days**, especially if you need **indefinite** retention or a shorter period. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Pick custom backups for a linked database only before **March 31, 2028**; after that date, pick the linked database service's own backup and restore tooling instead. ([Learn](https://learn.microsoft.com/en-us/azure/reliability/reliability-app-service))
- Restore into a new deployment slot first and then swap it into production if your priority is limiting production downtime. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Restore into a new app if you want the recovered copy to stay independent of the original app and its slots. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Use zone redundancy for availability-zone resilience, but don't treat it as a backup: it requires **Premium v2**, **Premium v3**, or **Premium v4**, applies at plan level, and starts at two instances. ([Learn](https://learn.microsoft.com/en-us/azure/reliability/reliability-app-service))
- For protection from a regional outage, use multiple regional deployments plus cross-region data replication; a backup by itself doesn't keep the app running in another region. ([Learn](https://learn.microsoft.com/en-us/azure/reliability/reliability-app-service))

## Gotchas

- Custom backups don't begin until you've configured them and supplied a **Storage account**; assuming they're active just because the app is in a supported tier is a common mistake. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Remember that the **12 backups per day** ceiling includes manual and scheduled custom backups combined, and no scheduled interval can be shorter than **2 hours**. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- A custom backup holds at most **10 GB**, with only **4 GB** of that available to a linked database, so it isn't a full database-backup solution. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Don't plan a custom database backup around **Azure Database for MySQL - Flexible Server** or **Azure Database for PostgreSQL - Flexible Server**; neither is supported. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Treat **March 31, 2028** as a migration deadline for linked database capture: custom backups lose that feature, so move database recovery to native tools. ([Learn](https://learn.microsoft.com/en-us/azure/reliability/reliability-app-service))
- Plan for a disruptive restore: the target app or slot is stopped, and an existing slot's filesystem is deleted and overwritten. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- On the **Basic** tier, backup and restore are restricted to the production slot, so a slot-based restore workflow isn't available there. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Automatic retention isn't an hourly copy for a full month; hourly copies are kept only for the first three days before the schedule is thinned. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- Automatic backups can't be downloaded, can't be partial, and can't cross a virtual network; choose custom backups if any of those matter. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/manage-backup))
- With zone redundancy, an availability-zone outage can still terminate requests already running on instances in the failed zone, so those requests should be retried. ([Learn](https://learn.microsoft.com/en-us/azure/reliability/reliability-app-service))
- Zone redundancy adds no separate feature charge, but the two-instance minimum can increase what you pay for the plan. ([Learn](https://learn.microsoft.com/en-us/azure/reliability/reliability-app-service))
