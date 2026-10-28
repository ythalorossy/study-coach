---
skill: storage.sas-tokens
sources: eca7ad562ec77bcbc014a247afdc8be00bbd381ac376f55a9b60f0224f90ab2a
built: 2026-10-23T02:48:02.281Z
---
# Create and use shared access signature (SAS) tokens

## Key concepts

- A shared access signature (SAS) hands a client delegated access to storage without giving it account rights; you decide which resources it can reach, which permissions it holds, and how long it stays valid ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview))
- Azure Storage offers three SAS types: user delegation SAS, service SAS, and account SAS ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview))
- Authorization differs per type: a user delegation SAS is checked against **Microsoft Entra ID** because it is signed with a user delegation key derived from Entra credentials, while service SAS and account SAS are checked against **Shared Key** because the account key signs them ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview))
- Microsoft recommends a user delegation SAS whenever possible, because the account key never has to be stored in your code ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-user-delegation-sas-create-cli))
- A user delegation SAS covers Blob Storage (including Data Lake Storage and `dfs` endpoints), Queue Storage, Table Storage, or Azure Files; a service SAS stays inside one of those services; an account SAS can span one or more services and also enables service-level operations such as **Get/Set Service Properties** and **Get Service Stats**, plus read, write, and delete that a service SAS can't do ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview))
- A SAS has two shapes: an ad hoc SAS, whose start time, expiry, and permissions live in the token, and a service SAS that inherits those constraints from a stored access policy defined on a container, table, queue, or file share ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview))
- Stored access policies exist only for a service SAS; a user delegation SAS and an account SAS must always be ad hoc ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview))
- The token is a query string appended to the resource URI, and one of its parameters is the signature that the service validates; a failed signature check comes back as 403 (Forbidden) ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview))
- Minting a user delegation SAS needs an Azure RBAC role containing `Microsoft.Storage/storageAccounts/blobServices/generateUserDelegationKey`; minting a service or account SAS needs the account key or `Microsoft.Storage/storageAccounts/listkeys/action` ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-user-delegation-sas-create-cli))
- Stored access policy is the only way to kill a SAS without rotating account keys, and a single container may hold a maximum of five stored access policies ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview))
- Some copy operations force a SAS into the design: blob to blob and file to file across storage accounts, and blob-to-file or file-to-blob even within one account ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview))

## Settings and limits

- Portal path is storage account > **Settings** > **Configuration**, where **Shared access signature (SAS) expiration policy** is switched to **Enabled** ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/sas-expiration-policy))
- **Upper limit for SAS expiry interval** takes one combined days/hours/minutes/seconds value that caps every new SAS created on that account ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/sas-expiration-policy))
- Validity is signed expiry (`se`) minus signed start (`st`); anything at or below the upper limit counts as compliant ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/sas-expiration-policy))
- The expiration action is either **Log** (default: out-of-policy requests still succeed but are logged) or **Block** (out-of-policy requests are rejected) ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/sas-expiration-policy))
- With a policy in place, the signed start field becomes mandatory on every SAS, and using one without it produces a **SasExpiryStatus** entry in Azure Monitor logs ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/sas-expiration-policy))
- The policy reaches all three SAS types, but the user delegation key that signs a user delegation SAS carries its own expiry and is outside the policy's control ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/sas-expiration-policy))
- A user delegation SAS tops out at 7 days regardless of policy; an upper limit above 7 days simply has no effect on it ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/sas-expiration-policy))
- Azure File Sync requires a SAS expiry of at least 3 days, so keep **Upper limit for SAS expiry interval** at 3 days or more or renewal fails and sync plus cloud recall are interrupted ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/sas-expiration-policy))
- If **keyCreationTime** is null for **key1** or **key2**, rotate the account access keys first; otherwise configuring the policy errors out and the portal setting appears greyed out ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/sas-expiration-policy))
- Azure CLI 2.0.78 or later is required to generate a user delegation SAS, and `az --version` shows what you have ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-user-delegation-sas-create-cli))
- `az storage container generate-sas` allows Add, Create, Delete, List, Read, and Write (`acdlrw`); `az storage blob generate-sas` allows Add, Create, Delete, Read, and Write (`acdrw`) ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-user-delegation-sas-create-cli))
- Both commands require `--auth-mode login` plus `--as-user`, and adding `--full-uri` returns the resource URL with the token already attached ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-user-delegation-sas-create-cli))
- The user delegation key is created implicitly, inheriting the start and expiry values you gave the SAS ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-user-delegation-sas-create-cli))
- `az storage account revoke-delegation-keys` invalidates every user delegation key on the account and with them every SAS signed by those keys ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-user-delegation-sas-create-cli))
- Clock skew can reach 15 minutes in either direction; set the start time at least 15 minutes in the past or omit it, and expect the same tolerance on the expiry ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview))
- On REST versions older than 2012-02-12, a SAS that does not reference a stored access policy cannot exceed 1 hour ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview))
- Utilities such as AzCopy need date/times written as `+%Y-%m-%dT%H:%M:%SZ`, seconds included ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview))
- Detect violations with `StorageBlobLogs | where SasExpiryStatus startswith "Policy violated" | summarize count() by AccountName, SasExpiryStatus` after creating a diagnostic setting to a Log Analytics workspace ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/sas-expiration-policy))
- Azure Policy ships the built-in definition **Storage accounts should have shared access signature (SAS) policies configured** to audit accounts missing this setting ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/sas-expiration-policy))

## Compare and choose

- Access to a single storage service and you are comfortable handling the account key: a service SAS is enough ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview))
- You need several services at once, service-level operations, or the extra read/write/delete rights: pick an account SAS ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview))
- You want no account key in your code and the best security posture: pick a user delegation SAS ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-user-delegation-sas-create-cli))
- You need a service SAS you can revoke: bind it to a stored access policy; otherwise keep the ad hoc expiry short ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview))
- Traffic-heavy designs: route everything through an authenticating front-end that enforces business rules but must scale, or use a lightweight service that just issues SAS so clients talk to storage directly ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview))
- If the goal is simply to make every blob in a container world-readable, set the container to Public instead of issuing SAS tokens ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview))
- Roll out the expiration policy with **Log** to study real traffic, then move to **Block** for enforcement ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/sas-expiration-policy))

## Gotchas

- The token returned by the CLI and by Blob Storage excludes the `?` delimiter, so add it yourself before appending the token to a resource URL ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-user-delegation-sas-create-cli))
- A user delegation SAS asking for more than 7 days still stops working after 7 days because the signing key expires first ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-user-delegation-sas-create-cli))
- Revocation is not instant: both user delegation keys and role assignments are cached, so there is a gap between the request and the SAS going dead ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-user-delegation-sas-create-cli))
- SAS generation cannot be audited or counted; anyone holding the key or the generate permission can mint tokens without the owner knowing, and no API reports totals ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview))
- A user delegation SAS cannot use a stored access policy, and the expiration action does not apply to a user delegation SAS over HDFS or to a service SAS backed by a stored access policy ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/sas-expiration-policy))
- Once the expiration policy is enabled, a SAS with no signed start is automatically out of policy ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/sas-expiration-policy))
- Any holder of a valid SAS can use it, so distribute over HTTPS only and treat a leak as a storage compromise needing a revocation plan ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview))
- Grant the narrowest scope and prefer read-only; your account pays for every request a client makes, including repeat downloads and large uploads ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview))
- Have long-running clients renew well before expiry, leaving room for retries if the token-issuing service is briefly unavailable ([Learn](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview))
