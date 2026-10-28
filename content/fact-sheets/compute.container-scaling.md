---
skill: compute.container-scaling
sources: 2d4552ca21189f5e8027294cc9c88386a6bdcfd358cb7f23ca8934b1afdb365f
built: 2026-10-24T15:14:41.355Z
---
# Manage sizing and scaling for containers, including Azure Container Instances and Azure Container Apps

## Key concepts

- Azure Container Apps (ACA) scales a container app **revision** horizontally and automatically by creating new instances of that revision on demand; each instance is a **replica**. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- The autoscaling engine is **KEDA** (Kubernetes Event-driven Autoscaling), which scales on HTTP requests, queue messages, CPU, memory and event sources such as Azure Service Bus, Azure Event Hubs, Apache Kafka and Redis. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- Scaling combines three things: **limits** (min/max replicas per revision), **rules** (criteria for adding or removing replicas, implemented as HTTP, TCP or custom) and **behavior** (how rules plus limits drive decisions over time). ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- Adding or editing a scale rule creates a **new revision**, an immutable snapshot of the app; each revision keeps the scale rules it was created with. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- During platform upgrades the service pre-warms replicas before shifting traffic, so you can briefly see more replicas than configured; the extras are removed automatically and production traffic is unaffected. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- Vertical scaling (resizing CPU/memory of a running revision) is not supported; a resource change means a new revision. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- Replica quantities are a target amount, not a guarantee. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- Azure Container Instances (ACI) has no built-in autoscaling; it is bounded by per-deployment **resource limits** and per-subscription **quota**. ([Learn](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits))
- ACI limits split into **unchangeable (hard)** limits, which a quota request can never raise, and **changeable** limits, which Azure may raise after a support request. ([Learn](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits))
- ACI's published values are the maximum resources for a **single container group deployment**; a group can still fail to deploy if the region is under heavy load. ([Learn](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits))

## Settings and limits

- `minReplicas` defaults to 0 and `maxReplicas` defaults to 10; the lowest allowed `minReplicas` is 0, the lowest allowed `maxReplicas` is 1, and 1,000 replicas is the highest configurable value. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- The HTTP rule property `concurrentRequests` has a default of 10 and a minimum of 1; crossing it adds another replica, continuing up to `maxReplicas`. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- HTTP and TCP concurrency is recalculated every 15 seconds as (requests or connections in the past 15 seconds) ÷ 15. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- Custom (KEDA `ScaledObject`) rules default to a **polling interval** of 30 seconds and a **cool down period** of 300 seconds. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- Platform scale behavior defaults: polling interval 30 s, cool down period 300 s, scale up stabilization window 0 s, scale down stabilization window 300 s, scale up step 1 then 4, 8, 16, 32 ... up to the configured maximum, scale down step 100% of the replicas that must shut down. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- Replicas are computed as `desiredReplicas = ceil(currentMetricValue / targetMetricValue)` and then applied as `min(maxReplicaCount, desiredReplicas, max(4, 2*currentReplicaCount))`. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- With no scale rule defined, a default rule applies: trigger **HTTP**, `minReplicas` 0, `maxReplicas` 10. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- Set `properties.configuration.activeRevisionsMode` to `single` when using non-HTTP event scale rules. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- KEDA scaler authentication parameters are supplied from **Container Apps secrets** or from the app's **managed identity**. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- Event-driven **Container Apps jobs** trigger executions with scaling rules and build custom rules from KEDA `ScaledJob` scalers. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- Container settings live in the app's `template` configuration: main and sidecar containers in the `containers` array, init containers in the `initContainers` array; changing `template` creates a new revision. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/containers))
- Per-container settings include `image`, `name`, `command` (the Docker entrypoint), `args`, `env` (use `secretRef`, not `value`, for secrets), `resources.cpu`, `resources.memory`, `volumeMounts` and `probes`. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/containers))
- On the **Consumption** plan the summed CPU and memory of all containers in one app must match a fixed pair, from `0.25` vCPU/`0.5Gi` through `4.0` vCPU/`8.0Gi` (for example `0.5`/`1.0Gi`, `1.0`/`2.0Gi`, `2.0`/`4.0Gi`). ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/containers))
- Consumption-plan apps in a **Consumption only** environment are capped at 2 cores and 4Gi of memory. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/containers))
- The Consumption workload profile supports container images totaling up to 8 GB per app or job replica; Dedicated workload profiles allow larger images but share disk space with other apps and jobs on the profile. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/containers))
- Only Linux `linux/amd64` images are supported, and privileged containers with host-level access are not allowed. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/containers))
- Private registries are declared in the `registries` array under `properties.configuration`, where `passwordSecretRef` names the secret that holds the password. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/containers))
- For managed-identity pulls the identity must be enabled on the app and hold the `acrPull` role in the registry; set the registry `identity` property to `system` or to the user-assigned identity resource ID, and set no username or password. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/containers))
- ACI hard limits per container group: 60 containers, 20 volumes, and 5 ports per IP. ([Learn](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits))
- ACI log size limits: 4 MB for a running instance and 16 KB or 1,000 lines for a stopped instance. ([Learn](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits))
- ACI changeable quotas per region per subscription: 100 Standard SKU container groups, 100 Standard SKU cores, 300 container group creates per hour, 100 per 5 minutes, 300 deletes per hour, 100 per 5 minutes; raise them by opening an Azure support request with issue type **Quota**. ([Learn](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits))
- Standard SKU container group maximums (hard): 31 vCPUs and 240 GB memory, also 31 vCPUs and 240 GB in a virtual network deployment, with 50 GB storage. ([Learn](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits))
- Confidential container group maximums (hard): 31 vCPUs and 180 GB memory, 32 vCPUs and 180 GB in a virtual network deployment, with 50 GB storage. ([Learn](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits))
- Spot container groups (preview) allow 4 vCPUs, 16 GB memory and 50 GB storage, have no virtual network support, and exist only in **East US 2**, **West Europe** and **West US**. ([Learn](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits))
- ACI supports only x64 (AMD64) images; deploying an ARM64-only image may leave the container unable to start. ([Learn](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits))
- GPU container resources were retired on July 14, 2025. ([Learn](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits))
- Review current quota consumption for a region and subscription with the **List Usage** API. ([Learn](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits))

## Compare and choose

- Pick **HTTP** rules for request-driven web apps, **TCP** for connection-count-driven workloads, and **custom** rules for CPU, memory or event sources such as Service Bus, Event Hubs, Kafka and Redis. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- If you define more than one rule, the app starts scaling as soon as the first condition of any rule is met. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- Use `ScaledObject`-based custom rules for long-running services and `ScaledJob`-based custom rules for event-driven **Container Apps jobs**. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- Set `minReplicas` to 1 or higher when a revision must always have a running instance, for example to keep one instance always up. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- Choose the **Consumption** workload profile for scale-to-zero serverless apps; choose **Dedicated** when you need larger images, larger CPU/memory allocations or a dedicated compute footprint. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/containers))
- Prefer managed identity with the `acrPull` role over storing registry usernames and passwords as app secrets. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/containers))
- Use init containers for setup work that must complete before the main container starts; use sidecars only for tightly coupled processes, since all containers in one app share disk, network and lifecycle. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/containers))
- Deploy each microservice as its own container app rather than packing multiple containers into one app. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/containers))
- For ACI, treat hard limits as the ceiling for one deployment and changeable quotas as the ceiling for your subscription in a region; size workloads to fit inside both. ([Learn](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits))

## Gotchas

- If **ingress** is disabled and you set neither `minReplicas` nor a custom scale rule, the app scales to zero and has no way to start back up. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- The cool down period only applies when scaling in from the final replica to 0; it does not slow the removal of any other replica. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- The polling interval does not apply to HTTP and TCP scale rules. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- **Container Apps jobs** support neither HTTP nor TCP scale rules. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- Azure Functions on Container Apps get scale rules generated from triggers and bindings; the portal disables the **Add scale rules** button, and customer-defined rules require `allowScalingRuleOverride`. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- In **multiple revisions** mode a new scale trigger creates a new revision while the old revision stays available with its previous rules; manage traffic allocation from the **Revision management** page. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- Scaling to zero is not supported for apps using **Dapr** actors, because their in-memory state is not tied to the actor identity or lifetime. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- Changing KEDA proxies through the `proxies` settings is unsupported; instead use a Workload Profile with a NAT Gateway or a User Defined Route (UDR) to send traffic to a network appliance. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- An app scaled to zero incurs no usage charges, but replicas that stay in memory without processing are billed at a lower **idle** rate. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- You must enable data protection for all .NET apps running on Container Apps. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/scale-app))
- Init containers on the **Dedicated** plan or in a **Consumption only** environment cannot access a managed identity at run time. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/containers))
- Docker Hub caps image downloads; once the cap is reached, containers in your app fail to start, so use a registry with sufficient limits such as Azure Container Registry. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/containers))
- Avoid static image tags such as `latest`; they cause caching problems and make troubleshooting hard, so use a unique tag per deployment such as a Git hash or a date-time stamp. ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/containers))
- ACI deployment failures with more than 4 vCPUs and 16 GB of memory usually indicate regional capacity pressure rather than a quota breach; deploy with lower resource settings, retry later, or choose another region. ([Learn](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits))
- Quota increase requests are not guaranteed to be approved, and requests against hard limits are never approved. ([Learn](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits))
- A container group can still fail to deploy even when it is within all limits, because the region may be under heavy load. ([Learn](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits))
