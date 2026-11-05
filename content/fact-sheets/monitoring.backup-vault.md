---
skill: monitoring.backup-vault
sources: bca88f3d5473e93f83e71502b518bbdb1d3fd71fa13c669fdc8b6cc6e9727d1c
built: 2026-11-05T14:28:26.191Z
---
# Create an Azure Backup vault

## Key concepts

- A **Backup vault** is an Azure storage entity that holds backup data for the newer workloads Azure Backup supports, for example Azure Blob (vaulted backup), Azure Database for PostgreSQL servers, and workloads added later. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- The vault stores the recovery points it accumulates over time and acts as the control surface where you trigger on-demand backups, run restores and define backup policies. ([Learn](https://learn.microsoft.com/en-us/azure/backup/create-manage-backup-vault))
- A Backup vault follows the Azure Resource Manager resource model, which lets Azure Backup protect cloud backup copies with extra security controls so you can still recover data even if the production and backup servers are breached. ([Learn](https://learn.microsoft.com/en-us/azure/backup/create-manage-backup-vault))
- Data isolation: the data is kept in a Microsoft-managed subscription and tenant. Guests and other external users have no direct route to that storage or its contents, so a compromised source environment cannot be used to alter or wipe existing backups. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- Access uses Azure RBAC for fine-grained access management: because Backup vaults work with RBAC, only the user roles you assign can reach backup and restore operations, and Azure Backup supplies three built-in roles for recovery point management. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- RBAC on the vault can also be tuned per workload: which Azure Disks or PostgreSQL servers may be backed up and how far, including the Key Vaults used for encryption key management. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- RBAC is enforced through the vault's managed identities, and there are two kinds: **System Assigned Managed Identity**, generated with the vault and bound to its lifecycle (you may switch it off), and **User Assigned Managed Identity**, a standalone resource you can attach to one or several vaults whose lifecycle is independent of them. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- Whoever creates or updates a backup instance must be able to read the source resources, for example by holding the **Reader** role on the source; that grant belongs to that user or service identity, not to the vault's managed identity. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- All of your V2 workloads can be watched in one place, from backup jobs up to alerts, with matching reporting available in the Resiliency blade. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))

## Settings and limits

- Backup data is encrypted by default with **Microsoft managed keys**; you can bring your own key through the **Customer Managed Keys** option under **Encryption settings** on the Backup vault. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- For that encryption the **Backup Management Service** app is what reaches into Azure Key Vault — the managed identity of the Backup vault is not the actor. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- The service manages the vault's underlying storage for you; the one storage choice you make is the redundancy level you set at creation. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- Portal path: search for **Backup vaults**, pick **Backup vaults** under **Services**, then select **Add**. ([Learn](https://learn.microsoft.com/en-us/azure/backup/create-manage-backup-vault))
- On the **Basics** tab, **Project details** holds the subscription and resource group; **Create new** creates a fresh group, named `myResourceGroup` in the example. ([Learn](https://learn.microsoft.com/en-us/azure/backup/create-manage-backup-vault))
- **Instance details** collects the **Backup vault name** (example `myVault`), the **Region** (example East US) and the **Storage redundancy** value; finish with **Review + create**. ([Learn](https://learn.microsoft.com/en-us/azure/backup/create-manage-backup-vault))
- Once items are protected in the vault, the redundancy level is locked, so pick it at creation time. ([Learn](https://learn.microsoft.com/en-us/azure/backup/create-manage-backup-vault))
- The redundancy levels referenced are **Geo-redundant** (GRS), **Zone-redundant** and **Locally redundant** (LRS). ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- Cross Region Restore for PostgreSQL: with GRS the backups replicate to the paired Azure region, and normally the secondary copy opens up only after Microsoft declares an outage in the primary region. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- Turning on Cross Region Restore lets you run restores from recovery points sitting in the secondary region at any time, with no outage declared in the primary region, which supports regional resiliency drills. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- A vault with Cross Region Restore enabled is billed automatically at RA-GRS rates for the PostgreSQL backups it holds. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- In **preview**, cross-tenant restore recovers vaulted data from a source tenant into a target vault in a different tenant, by mapping the source vault to that target vault. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- The preview feature works for Azure Database for PostgreSQL - Flexible Server, and also covers vaulted backup for Azure Blobs, Azure Cosmos DB and Azure Data Lake Storage, plus AKS backups, and only in supported regions. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- Deletion is refused while the vault still holds protected data sources (for example an Azure database for PostgreSQL server) or any backup data. ([Learn](https://learn.microsoft.com/en-us/azure/backup/create-manage-backup-vault))
- The portal blocks the delete with the message `Cannot delete the Backup vault as there are existing backup instances or backup policies in the vault. Delete all backup instances and backup policies that are present in the vault and then try deleting the vault.` ([Learn](https://learn.microsoft.com/en-us/azure/backup/create-manage-backup-vault))
- Open **Backup Instances** in the left navigation bar first and remove every entry you find there. ([Learn](https://learn.microsoft.com/en-us/azure/backup/create-manage-backup-vault))
- With the vault emptied, pick **Delete** on its dashboard and answer **Yes** in the confirmation prompt; the portal then lands back on the **New** service menu. ([Learn](https://learn.microsoft.com/en-us/azure/backup/create-manage-backup-vault))

## Compare and choose

- **Microsoft managed keys** need no key-management effort and are the default for every new vault; **Customer Managed Keys** let you control the key in Azure Key Vault when you want your own key lifecycle. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- The vault's storage redundancy is chosen as **Locally redundant**, **Zone-redundant** or **Geo-redundant**; the page links to the Azure Storage redundancy articles for the differences. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- If Azure is where you keep the primary copy of your backed-up data, the guidance is to leave the default **Geo-redundant** option in place; choose **Locally redundant** when it is not, to cut Azure storage spend. ([Learn](https://learn.microsoft.com/en-us/azure/backup/create-manage-backup-vault))
- **System Assigned Managed Identity** is the simplest option for a single vault and disappears with the vault; **User Assigned Managed Identity** outlives vault deletion or recreation and can be shared across vaults, with several of them attached to one vault. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- With GRS alone, the paired region's copies stay sealed until Microsoft declares an outage; Cross Region Restore lets you pull restores from that region at will to rehearse PostgreSQL recovery, billed at RA-GRS rates. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- Ordinary restores stay inside one tenant; the preview cross-tenant feature is the way to bring vaulted data into a vault in another tenant, limited to the supported services listed. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- Backup vaults are meant for the newer Azure Backup workloads; for the other vault options the overview points to an FAQ entry listing every vault type available for backup and restore. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))

## Gotchas

- Redundancy is frozen once items are protected, so a wrong choice cannot be edited in place afterwards. ([Learn](https://learn.microsoft.com/en-us/azure/backup/create-manage-backup-vault))
- Removing a vault cannot be undone: every backup item and all of its backup data for the protected servers disappear permanently. ([Learn](https://learn.microsoft.com/en-us/azure/backup/create-manage-backup-vault))
- Before deleting, work through each **Datasource type** filter in **Resiliency**; a single leftover instance or policy hiding under one filter value keeps the vault undeletable. ([Learn](https://learn.microsoft.com/en-us/azure/backup/create-manage-backup-vault))
- A vault can hold both backup instances and backup policies, and both have to be removed before the vault itself goes away. ([Learn](https://learn.microsoft.com/en-us/azure/backup/create-manage-backup-vault))
- Permissions you give the vault's managed identity in Key Vault are not what makes CMK work — the **Backup Management Service** app performs the key read. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- Switching off the **System Assigned Managed Identity** removes that identity from the RBAC picture, so line up a **User Assigned Managed Identity** beforehand if workloads need least-privilege access. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- Whoever creates or updates a backup instance must hold read access on the source resource, e.g. **Reader** on a PostgreSQL server or Azure Disk; permissions on the vault alone will not satisfy that. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- Turning on Cross Region Restore quietly shifts PostgreSQL backups to RA-GRS billing, which is dearer than standard GRS. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- Cross-tenant restore is preview-only and limited to specific services and supported regions, so treat it as unavailable for anything else. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
- Because the data sits in a Microsoft-managed subscription and tenant, external users and guests have no direct access to that storage. ([Learn](https://learn.microsoft.com/en-us/azure/backup/backup-vault-overview))
