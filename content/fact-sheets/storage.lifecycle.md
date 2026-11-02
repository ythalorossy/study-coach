---
skill: storage.lifecycle
sources: da0d1844ed4d13a14f8fb6b6e733832c2086a5dacdfa03331f5e55f9950cdc8d
built: 2026-10-23T02:59:28.030Z
---
# Configure blob lifecycle management

## Key concepts

- A blob lifecycle management policy is a set of rules, stored as one JSON document, that automatically moves blob data to cheaper access tiers or expires it so you control storage cost without manual work ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- A policy can move current versions, previous versions, and snapshots to a cooler tier when those objects have not been accessed or modified for a chosen period, and can move blobs back from cool to hot as soon as they are accessed ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- A policy can delete current versions, previous versions, and snapshots at the end of their lifecycle, which is the action you use instead of tiering when data has no future value ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- Policy scope choices run from the whole storage account, to selected containers, down to a subset of blobs selected by name prefix or blob index tags; Azure Storage Actions is the option for running data operations across multiple accounts at once ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- Each rule is built from conditions, actions, and filters, and every rule needs at least one action to do something with matching blobs, for instance a move to the cool tier or a deletion ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- Conditions are evaluated against three blob properties only: Creation Time, Last Modified Time, and Last Accessed Time, where Last Accessed Time exists only if access time tracking is enabled on the account ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- Filters restrict a rule to part of the account using path prefixes and blob tags; when more than one filter is defined a logical AND is applied to all of them ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- Policies can be applied on general-purpose v2, premium block blob, and Blob Storage accounts, where they govern block blobs and append blobs; containers that Azure manages itself, such as `$logs` and `$web`, are always skipped ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- The service runs an active policy once per day, so rule changes are never instant ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure)).
- Policy runs show up as the **LifecyclePolicyCompleted** event, and failures can be diagnosed with metrics and logs rather than by inspecting blobs one by one ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- Policies themselves cost nothing: you pay the standard operation charge for the `Set Blob Tier` calls a run makes, deletions are free of charge, and each last access time update counts as an "other transaction" billed at most once every 24 hours per object, separately from read transactions ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).

## Settings and limits

- Portal path for all policy work: open the storage account, then under **Data management** choose **Lifecycle management**, where **List View** shows saved rules and **Code View** lets you edit the policy JSON directly ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure)).
- Authoring in the portal means selecting **Add a rule** and naming it on the **Details** form, where you also set **Rule scope**, **Blob type**, and **Blob subtype** ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure)).
- Choosing a rule scope that filters blobs, or ticking **Limit blobs with filters** on the **Details** page, reveals the **Filter set** tab, where you add an optional prefix or tag filter such as blobs whose name starts with *log* in container *sample-container* ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure)).
- Conditions are set on the **Base blobs** page, for example a rule that moves blobs to cool when they have not been modified for 30 days ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure)).
- The **Last accessed** condition only appears if access time tracking is enabled and **Block blobs** was chosen as the blob type, so it is unavailable for other blob types ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure)).
- Access time tracking is turned on with the **Enable access tracking** checkbox on the **Lifecycle management** blade under **Data management**; without it you cannot condition rules on read or write activity ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure)).
- Selecting **Add** saves the policy, the new rule is then listed in **List View**, and Azure Storage runs the policy once per day ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure)).
- Per rule limits: up to 10 case-sensitive path prefixes and up to 10 blob index tag conditions, so a rule needing broader targeting has to be split into several rules ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- A policy must be read or written as a complete document; the service rejects partial updates, which is why **Code View** edits always replace the whole JSON ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure)).
- Timing: after you add or edit rules it can take up to 24 hours for the change to take effect and for the first execution to start ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- Removing a policy stops new runs from being scheduled, but a run already in progress finishes and you are still billed for the actions it completes; disabling all rules makes the policy inactive and stops an in-flight run within 24 hours, so the recommended order is disable, wait 24 hours, then delete ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- Run duration scales with the number of blobs evaluated, and evaluation slows when the account approaches its request-rate limit, because policy requests share the same per-second limit and workload requests are prioritised ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).

## Compare and choose

- Use a Last Modified Time condition when you want to react to writes only; it works for every supported blob type with no extra setup ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- Use a Last Accessed Time condition when data should age out based on whether it is actually being read; this requires access time tracking to be enabled first ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- Restrict last-accessed rules to **Block blobs**, because the **Last accessed** option is only offered for that blob type ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure)).
- Use **Blob subtype** to decide whether the rule targets current versions only, or also previous versions and snapshots, since each of those can be tiered or deleted independently ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure)).
- Choose a tiering action when data must still be readable: it triggers billable `Set Blob Tier` operations; choose a delete action when the data has reached end of life, since deletions are free ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- Combine prefix and tag filters in one rule only when you want the intersection of both, because multiple filters are ANDed; if you want a different set of blobs, write an additional rule rather than trying to exclude blobs ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- Use **List View** for everyday rule management and **Code View** when you need to paste or review the policy JSON, for example a rule that cools block blobs whose name begins with *log* after 30 days without modification ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure)).
- Prefer disabling a policy over deleting it when you only need a temporary pause, and delete it only after the disabled state has settled ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- On a premium block blob account, plan delete-based rules rather than tiering rules, because tiering is not available there ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).

## Gotchas

- A policy cannot rehydrate archived blobs into an online tier, but it can move a blob from cool back to hot when it is accessed ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- Tiering is unsupported in premium block blob storage accounts, and on every other account it applies only to block blobs, never to append or page blobs ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- The delete action does not work on blobs in an immutable container, because immutability allows creates and reads but blocks modification and deletion ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- With soft delete enabled, a policy delete does not remove data immediately: the blob lands in a soft-deleted state for the soft-delete retention period, and the action cannot delete a blob that is already in that state ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- A policy cannot move a blob that uses an encryption scope to the archive tier ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- Prefix filters are case-sensitive and capped at 10 per rule, so a prefix that looks right but does not match will simply leave the blobs unmanaged ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- Rules never apply to system containers such as `$logs` and `$web`, even with a broad rule scope ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- Editing rules is not instant: allow up to 24 hours before the change takes effect and the first execution starts, so a just-added rule doing nothing is expected ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- A delete action can fail if an Azure Storage Action tries to delete the same blob at the same time ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- Even though the policy is free, add-on services such as Microsoft Defender for Storage can charge for operations carried out through a lifecycle policy ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)).
- If **Last accessed** is missing from the rule form, check both prerequisites in order: access time tracking enabled and blob type set to **Block blobs** ([Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure)).
