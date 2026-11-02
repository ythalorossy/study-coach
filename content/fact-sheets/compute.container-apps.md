---
skill: compute.container-apps
sources: 245bc0727ca63f048d2fa9af662d7499e7e5757914bde2523c183e8aac7e6440
built: 2026-10-24T15:17:07.179Z
---
# Provision a container by using Azure Container Apps

## Key concepts

- Azure Container Apps is a serverless platform for running containerized apps where Azure supplies the up-to-date servers, orchestration and deployment plumbing for you ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/overview))
- Typical workloads are API endpoints, background processing jobs, event-driven processing and microservices ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/overview))
- Container apps can be created and managed with the Azure CLI extension, the Azure portal, or ARM templates ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/overview))
- Ingress can be published over HTTPS or TCP without standing up any other Azure infrastructure ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/overview))
- Internal-only ingress plus DNS-based service discovery is built in, so private endpoints and app-to-app name resolution need no extra components ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/overview))
- Images can come from any public or private registry, including Docker Hub and Azure Container Registry (ACR) ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/overview))
- Dapr is available for building microservices and for using its distributed application APIs ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/overview))
- Azure Functions can run inside a Container Apps environment for event-driven work, keeping triggers, bindings and automatic scaling ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/overview))
- Jobs come in three forms: on-demand, scheduled, and event-triggered ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/overview))
- Each deployed version of an app is a revision, and traffic can be split across revisions for Blue/Green deployments and A/B testing ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/overview))
- Secrets can be stored and referenced securely by the app instead of being baked into the container image ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/overview))
- Log monitoring is handled with Azure Log Analytics ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/overview))
- Specialized hardware is offered through dedicated plans for workloads that need extra compute resources ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/overview))
- A Container Apps environment is the secure boundary that contains one or more container apps and jobs; the Container Apps runtime handles OS upgrades, scale operations, failover procedures and resource balancing inside it ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))
- Every environment sits on a virtual network that enforces its secure boundary — the platform creates one with limited network capabilities for you, or you bring your own ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))
- Apps in the same environment share that virtual network and write to the same logging destination ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))
- Azure Functions and Azure Spring Apps can be added to an existing environment for multi-service integration ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))
- Centralized logging comes from the built-in integration with Azure Monitor and Application Insights ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))
- Collected log data covers container `stdout`/`stderr` streams, container app scaling events, Dapr sidecar logs when Dapr is enabled, and system-level metrics and events ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))
- Environment health and status can be monitored with Azure Monitor alerts, the Azure portal, or the Azure CLI ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))

## Settings and limits

- Prerequisites are an Azure account with an active subscription and the `Microsoft.App` resource provider registered in that subscription ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/quickstart-portal))
- Portal entry point: search **Container Apps** in the top search bar, select **Container Apps** in the results, then choose **Create** > **Container App** ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/quickstart-portal))
- On the **Basics** tab under **Project details**, set **Subscription** to the Azure subscription you want to deploy into ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/quickstart-portal))
- On the **Basics** tab under **Project details**, choose **Create new** for **Resource group** and name it **my-container-apps** ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/quickstart-portal))
- On the **Basics** tab under **Project details**, enter **my-container-app** in **Container app name** ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/quickstart-portal))
- **Optimize for Azure Functions** stays unselected for a regular container app; select it only when you want to create a function app ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/quickstart-portal))
- **Deployment source** is set to **Container image** when you deploy from a registry image ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/quickstart-portal))
- Under **Container Apps environment** on the **Basics** tab, pick a **Region** near you and leave **Container Apps environment** at its default value ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/quickstart-portal))
- Select **Next: Container**, then **Use quickstart image** to deploy a sample container without supplying your own image ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/quickstart-portal))
- Select **Review + create**; the **Create** button only becomes enabled when validation reports no errors ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/quickstart-portal))
- On validation failure the tab holding the error gets a red dot, the bad fields are highlighted in red or marked with a red *X*, and you fix them before choosing **Review + create** again ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/quickstart-portal))
- After **Create**, the portal reports *Deployment is in progress* and then *Your deployment is complete* on success ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/quickstart-portal))
- Use **Go to resource**, then click the link beside **Application Url** to open the running app in a browser ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/quickstart-portal))
- Cleanup happens at resource-group level: from the container app **Overview** page select the **my-container-apps** entry in **Essentials**, choose **Delete resource group**, type the name **my-container-apps**, select **Delete** and confirm; it can take a few minutes ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/quickstart-portal))
- Environment-level log routing is set through the API property `properties.appLogsConfiguration`, which points at the Log Analytics workspace that receives logs for all apps in the environment ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))
- Dapr tracing is set through the API property `properties.containerAppsConfiguration.daprAIInstrumentationKey`, the App Insights instrumentation key handed to Dapr ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))
- An environment is removed automatically when one of these states persists for more than 90 days: sitting idle with nothing deployed and running, having failed because of virtual network or Azure Policy settings, or being unable to take infrastructure updates because of those same settings ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))
- Quota values relevant to an environment are listed on the **Quotas for Azure Container Apps** page, with the authoritative numbers on the Azure subscription service limits page ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))

## Compare and choose

- Most apps scale to zero, but apps that scale on CPU or memory load can never scale to zero ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/overview))
- Scale triggers you can choose from are HTTP traffic, event-driven processing, CPU or memory load, and any KEDA-supported scaler ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/overview))
- Use a single environment when the apps are related, belong on the same virtual network, call each other through the Dapr service invocation API, share Dapr configuration, or share one log destination ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))
- Use multiple environments when apps must never share compute resources, must not use built-in Dapr service invocation between them, or must be isolated by team or usage such as test versus production ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))
- The default environment type, workload profiles environments, supports both the Consumption and Dedicated plans, while consumption only environments (legacy) support only the Consumption plan ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))
- Within a workload profiles environment you can run apps on either plan or both by placing them on separate workload profiles ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))
- Choose the Dedicated plan when you need customized hardware and steadier cost prediction: on top of the per-instance charges you pay a set management fee for the environment as a whole, and that fee does not shrink or grow with the number of workload profiles you add ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))
- Choose the Consumption only environment for serverless scale-to-zero with pay-per-use billing on individual container apps, since the environment itself carries no cost ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))
- Supply your own virtual network instead of the generated one when you need fine-grained control over the environment's networking ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))

## Gotchas

- CPU- and memory-based scaling is the exception to scale-to-zero, so those apps keep at least one instance running and are billed for it ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/overview))
- If `Microsoft.App` is not registered in the subscription, registration is listed as a prerequisite for creating a container app in the portal ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/quickstart-portal))
- Ticking **Optimize for Azure Functions** produces a function app, not a plain container app, which changes the runtime and available features ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/quickstart-portal))
- **Container Apps environment** the quickstart says to use the default value ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/quickstart-portal))
- Deleting a single container app is done by deleting its whole resource group, which also removes the environment and every other app inside it ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/quickstart-portal))
- All apps in an environment publish to one Log Analytics workspace by default, so per-app log separation depends on how you configure `properties.appLogsConfiguration` ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))
- An idle environment can vanish after 90 days — keep at least one container app or job running, keep virtual network and Azure Policy configuration valid, and respond to notifications about a problematic environment state ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))
- On the Dedicated plan the environment-level management fee applies even for lightly used environments, so weigh it against consumption-only pricing ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))
- Dapr service invocation does not cross environment boundaries out of the box; inter-environment calls need third-party solutions, which affects how you split environments ([Learn](https://learn.microsoft.com/en-us/azure/container-apps/environment))
