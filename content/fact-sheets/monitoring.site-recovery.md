---
skill: monitoring.site-recovery
sources: 3a14c70b577089bf5f1e5057f599c1049bd5cc43e5c79545ec97f2118d995da4
built: 2026-11-05T14:29:58.490Z
---
# Configure Azure Site Recovery for Azure resources

## Key concepts

- Azure Site Recovery (ASR) provides continuous replication, failover and failback to meet recovery time objective (RTO) and recovery point objective (RPO), covering disruptions from zonal failure to full regional outage; the sibling **Backup** service in Azure Recovery Services protects data only. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-overview))

- Replication scenarios: Azure VM from one region to another; Azure Extended Zone to its connected region (preview); on-premises VMware, Hyper-V, physical (Windows/Linux) and Azure Stack VMs to Azure; AWS Windows instances to Azure; and on-premises sources to a secondary site. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-overview))

- Azure-to-Azure DR relies on four pieces: source VMs on managed disks in a supported region, source subnets/VNet, a **cache storage account** in the source region that buffers disk writes, and target resources in the recovery region. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture))

- Replication flow: the Site Recovery Mobility service extension installs itself, registers the VM, writes land in the source-region cache, ASR sends processed data to the target storage account or replica managed disks, and recovery points are produced. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture))

- Staging writes in the cache keeps the impact on production applications minimal; failover creates new Azure VMs in the target region from the replicated data. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture))

- Connectivity is outbound only: the replicated VM needs outbound access, and Site Recovery never requires inbound connectivity to the VM. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture))

- Recovery plans group machines and sequence multi-tier application failover and recovery, with scripts, manual actions and Azure Automation runbooks; today they work for region-to-region replication only, with Extended Zones planned. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-overview))

- Shared disk support protects, monitors, fails over and re-protects Windows Server Failover Clusters (WSFC) workloads on Azure VMs, such as SQL FCI, SAP ASCS and scale-out file servers. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-overview))

## Settings and limits

- Default replication policy: **Recovery point retention** = one day, **App-consistent snapshot frequency** = zero hours (disabled); change these while enabling replication, or create a policy later and apply it to VMs. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture))

- Crash-consistent recovery points are produced every five minutes by default, and that interval cannot be modified. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture))

- The app-consistent snapshot frequency must always be lower than the recovery point retention period, for example under 24 hours with the default one-day retention. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture))

- A **replication group** gives its VMs shared crash-consistent and app-consistent recovery points, but it affects workload performance, so use it only where cross-machine consistency is required. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture))

- On **Enable replication** > **Source**, set **Region**, **Subscription** and **Resource group**, keep **Virtual machine deployment model** at **Resource Manager** and **Disaster recovery between availability zones** at **No**; the **Virtual machines** step allows selecting up to 10 VMs. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-tutorial-enable-replication))

- On the **Manage** tab pick the **Replication policy**, create a **Replication group** only for VMs running the same workload, and under **Extension settings** select **Update settings** plus an **Automation account**. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-tutorial-enable-replication))

- Churn lives at **Storage** > **View/edit storage configuration** > **Churn for the VM**: **Normal Churn** is the default, while **High Churn** uses a **Premium Block Blob** storage account for high write rates. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-tutorial-enable-replication))

- **High Churn** covers Azure VM data churn up to 100 MB/s, and up to 500 MB/s in some configurations when the documented memory, disk, write-size, region, OS and Mobility service requirements are met. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-overview))

- Premium SSD v2 and Ultra Disk replicate as Premium SSD v1 replica disks but keep their source disk type for failover. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-tutorial-enable-replication))

- Default target resources: the same subscription as the source, a new target resource group and VNet/subnet with an `asr` suffix, and a target availability set with an `asr` suffix that is reused if one already exists. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture))

- Replica managed disks get an `-ASRReplica` suffix, their **Disk state** must be `ActiveSAS`, and a tag prefixed `ASR-ReplicaDisk` is added automatically. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture))

- Target VM SKU defaults to the source SKU or the next best available one, the dropdown lists only same-family (Gen 1 or Gen 2) SKUs, and availability type (single instance, set, zones) can only change after disabling and re-enabling replication. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture))

- Permissions: admin or owner on the subscription to create the vault, the **Site Recovery Contributor** role to manage Site Recovery operations in the vault, and **Virtual Machine Contributor** (or create-VM-in-VNet, write-to-storage-account and write-to-managed-disk permissions) to create target VMs. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-tutorial-enable-replication))

- Allow these outbound URLs from the VM: `*.blob.core.windows.net`, `login.microsoftonline.com`, `*.hypervrecoverymanager.windowsazure.com`, `*.servicebus.windows.net`, plus `*.vault.azure.net` (ADE-enabled VMs via portal) and `*.automation.ext.azure.com` (mobility agent auto-upgrade via portal). ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture))

- With NSGs, allow HTTPS outbound on port 443 to the service tags `Storage.<region-name>`, `AzureActiveDirectory`, `EventHub.<region-name>`, `AzureSiteRecovery`, `AzureKeyVault` and `GuestAndHybridManagement`, for both the source and the target region. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture))

- Multi-VM consistency members exchange data over port 20004, and the Mobility agent queries IMDS, so bypass the IP `169.254.169.254` in any proxy configuration. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture)) ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-tutorial-enable-replication))

## Compare and choose

- Crash-consistent vs app-consistent: crash-consistent keeps only on-disk data, like a pulled power cord, and fits OS replication and services such as DHCP or print servers; app-consistent adds memory contents and in-flight transactions via VSS (`VSS_BT_COPY`), is slower and impacts app performance. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture))

- Normal Churn vs High Churn: stay on **Normal Churn** for typical workloads; choose **High Churn** with a **Premium Block Blob** account when the write rate exceeds normal limits. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-tutorial-enable-replication))

- Planned vs unplanned failover: planned failover for expected outages loses no data; unplanned failover for an unexpected disaster loses only what accrued since the last recovery point — Azure and VMware VM replication is continuous, and Hyper-V can replicate as often as every 30 seconds, so a tighter cadence shrinks the gap. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-overview))

- Site Recovery vs Azure Backup: Site Recovery reproduces whole VMs and orchestrates failover/failback across regions; Azure Backup only saves and restores data, so use Site Recovery for VM-level DR with RPO/RTO targets. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-overview))

- Single VM vs replication group: protect VMs individually when they are self-contained; group them only when a multi-tier app must fail over to one shared consistent point, accepting the performance impact. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture))

- Target availability type: choose single instance, availability set or availability zones; for zone-to-zone recovery pick a logical zone that maps to a different physical zone in the target subscription, since equal logical numbers don't mean equal physical zones. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture))

## Gotchas

- The Recovery Services vault cannot sit in the source region of the VMs it protects, and Azure-to-Azure DR doesn't support vaults created in South Central India or North East US 5 — those regions can still be source or target when the vault is in a supported Site Recovery region. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-tutorial-enable-replication))

- Setting the app-consistent snapshot frequency equal to or above the recovery point retention is a misconfiguration; with the default 24-hour retention, keep it under 24 hours. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture))

- A long recovery point retention raises storage cost, because more recovery points are saved. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture))

- Registration with Site Recovery fails on outdated certificates: install the latest Windows updates on Windows VMs, and update trusted root certificates and the certificate revocation list (CRL) on Linux. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-tutorial-enable-replication))

- Site Recovery doesn't support an authentication proxy to control VM connectivity — use URL allow-lists, NSG service tags or IP ranges instead. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-tutorial-enable-replication))

- A firewall appliance blocking internal traffic on port 20004 breaks multi-VM consistency between group members, and on Linux that outbound port must be opened manually. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture))

- Proxies must bypass the IP `169.254.169.254`, otherwise the Mobility agent can't reach IMDS for the VM security type. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-tutorial-enable-replication))

- The target SKU dropdown shows only same-family (Gen 1 or Gen 2) SKUs and may fall back to the next best size, so confirm the recovery region can host the VM size, disks and networking and that the subscription has capacity. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-architecture))

- The Windows Client license isn't preserved after an Azure-to-Azure failover; validate and set the correct licensing on the recovered VM yourself. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-tutorial-enable-replication))

- Cluster disks that are shared need special handling: skip the generic **Add disks** operation and instead turn protection off and back on for the whole cluster setup. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-tutorial-enable-replication))

- The tutorial assumes VMs aren't encrypted; ADE-enabled VMs need a separate enable-replication flow. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-tutorial-enable-replication))

- Extended Zones to region replication is still preview, and recovery plans aren't offered for that scenario yet. ([Learn](https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-overview))
