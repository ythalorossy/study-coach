---
skill: storage.object-replication
sources: 77401b21b1931fce6c4b1988682f229c8d3efdef60c2817fea0685905225aeef
built: 2026-10-23T02:56:12.977Z
---
# Configure object replication

## Key concepts

- Object replication copies block blobs asynchronously from a source storage account into a destination account, mainly to cut read latency, spread data across regions, run compute close to the data, and lower long-term storage cost. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Two features must be switched on first: the **Change feed** on the source account and **Blob versioning** on both accounts. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Only general-purpose v2 and premium block blob accounts work, and the source plus the destination must both be one of those types. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Scope is block blobs only: append blobs, page blobs and blob snapshots are never replicated, and accounts with a hierarchical namespace are unsupported. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Blobs written through Data Lake Storage Gen2 APIs can't be replicated, and blobs encrypted with a customer-provided key fail; Microsoft-managed and customer-managed keys both work. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- You build the policy on the destination account through the Azure Storage resource provider, then attach the identical policy ID to the source account before anything replicates. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- One source can feed at most two destination accounts (one policy each) and one destination can accept at most two policies; only a single policy is allowed per source/destination pair, and the accounts may sit in different regions, subscriptions, or Microsoft Entra tenants. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- A policy holds up to 1,000 rules; a rule maps exactly one source container to one destination container and a container may appear in only one rule, so 1,000 source and 1,000 destination containers at most. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- The Azure portal caps you at 10 container pairs per policy; anything beyond that, up to 1,000, needs a JSON policy definition file. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-configure))

- Both containers must already exist, and while the policy is live, writes to the destination container fail with error code 409 (Conflict) while reads and deletes still work. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- On an update the service versions the source blob and copies the current plus previous versions, but it copies blobs rather than version IDs, so the destination is given a newly assigned version ID. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Deleting a source blob turns its current version into a previous version and that state is replicated, yet any snapshots on it are not. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Priority replication is an opt-in performance mode: with source and destination in the same continent it guarantees 99.0% of objects replicate within 15 minutes under an SLA. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Two metrics, **Operations pending for replication** and **Bytes pending for replication**, can be enabled per policy and are bucketed as 0–5, 5–10, 10–15, 15–30 min, 30 min–2 h, 2–8 h, 8–24 h and >24 h. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

## Settings and limits

- Enabling the prerequisites (blob versioning and change feed) needs `Microsoft.Storage/storageAccounts/blobServices/write`, and creating a policy requires the Azure Resource Manager **Contributor** role scoped to the storage account or above. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-configure))

- Hot, cool and cold tiers all work and the two accounts may sit in different tiers, but archiving a blob on either side breaks replication, and rehydrating it won't restart replication until the blob data is written again. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Immutability on the destination (retention or legal hold at container or version level) doesn't block source writes, but the matching updates or deletes then fail to replicate. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Blob versioning can't be disabled on an account that has any replication policy; delete the policies first. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Each rule takes up to 5 prefix matches in the portal; a prefix can include a virtual directory but never wildcard characters. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-configure))

- New blobs only is the default copy scope; changing it lets you backfill everything already in the container or everything created on or after a given `minCreationTime` — use `1601-01-01T00:00:00Z` to mean all blobs. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- In a hand-written JSON policy file for the destination, set `policyId` to `default` and every `ruleId` to an empty string so Azure Storage generates them; on the source side reuse the IDs that come back when you download the destination's rules file. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- `sourceAccount` and `destinationAccount` must be full Azure Resource Manager resource IDs of the form `/subscriptions/<subscriptionId>/resourceGroups/<resource-group>/providers/Microsoft.Storage/storageAccounts/<storage-account>`. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- The full ID is mandatory when the account disallows cross-tenant replication, because Azure Storage reads it to confirm both accounts belong to the same Microsoft Entra tenant. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- **AllowCrossTenantReplication** is `false` by default on accounts created from December 15, 2023 onward; setting it to `false` on an account that already carries cross-tenant policies is refused until those policies are deleted. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Azure Policy can audit or enforce **AllowCrossTenantReplication** across storage accounts, for example a `deny` effect that blocks creating or editing an account with the value `true`. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Configuring replication is free, but you pay for source write transactions and blob/version storage, the change feed record, change feed reads, destination reads and writes plus blob/version storage, cool or cold retrieval, and network egress — and egress transfers the whole version, not just unique blocks. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Customer-managed failover is unsupported on both the source and the destination of a replication policy. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- A source blob's replication status shows *Complete* or *Failed* along with the policy ID and rule ID, but only once replication has finished, and there's no progress percentage while it's in flight. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Deleting and re-creating a policy on the same container pair yields a brand-new policy ID, kills the earlier replication tasks, and re-locks the destination container without carrying over prior state. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-configure))

- After such a re-creation, an existing blob only re-replicates when it still has a previous version on the destination; otherwise only writes made after the new policy are copied. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-configure))

## Compare and choose

- Portal for both ends when you can reach the source and need 10 container pairs or fewer, since it sets up the policy on both accounts in one flow; JSON file when you own only the destination, need more than 10 pairs, or the two accounts sit in different Microsoft Entra tenants. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-configure))

- Full resource ID over bare account name in the JSON file: it's required when cross-tenant replication is disallowed and is the recommended practice regardless. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- `minCreationTime` unset to replicate only future blobs, a chosen timestamp to backfill from that date onward, or `1601-01-01T00:00:00Z` to replicate every existing blob too. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Turn on priority replication when both accounts share a continent and you need the 15-minute SLA; otherwise leave it off. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Enable **Enable tags replication** per rule only when blob index tags must land on replicas — it's preview, and the source account must first be registered for the **EnableObjectReplicationTags** preview feature. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-configure))

- Pick GPv2 for the widest feature and tiering coverage, including moving replicas to archive, and premium block blob for premium performance; steer clear of hierarchical namespace, Data Lake Storage Gen2 uploads, customer-managed failover and customer-provided keys, since each breaks replication. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Put the destination near your read clients for latency, then combine replication with lifecycle management policies that archive older replicas to save money. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

## Gotchas

- Destination writes fail with 409 (Conflict) while a rule is active — delete the rule or the whole policy first if you need to write there. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Archiving a blob on either side stops replication for it, and rehydration alone doesn't restart it; the blob data must be updated after rehydration. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Snapshots are never replicated, so don't expect a destination snapshot after a source snapshot. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Source blobs encrypted with a customer-provided key make replication fail — use Microsoft-managed or customer-managed keys instead. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Tier changes on a source blob never carry to the replica; call `Set Blob Tier` on the destination blob if you want it archived. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Tag replication is preview-only and needs the **EnableObjectReplicationTags** registration on the source account, so don't depend on it for production. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-configure))

- Replication status stays empty until replication completes or fails and offers no percentage, so watch **Operations pending for replication** and **Bytes pending for replication** instead. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- A destination container that was just deleted, or is mid-deletion (which can take up to 30 seconds), causes replication to fail. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Re-creating a policy doesn't resume old work: previously replicated blobs come across again only when a previous version still exists on the destination. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-configure))

- Blob versioning can't be switched off while any replication policy exists on the account. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))

- Bills are easy to underestimate because every version transfers in full for egress, so trial the feature in an account holding few objects and measure before going to production. ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview))
