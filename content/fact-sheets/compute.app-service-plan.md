---
skill: compute.app-service-plan
sources: 7794c62eca5345901dd14390ebb5ae30c518c34fb2577c3d115b69aaeee5805e
built: 2026-10-24T15:09:45.055Z
---
# Provision an App Service plan

## Key concepts

- An App Service plan is the bundle of compute resources a web app runs on, and every App Service app always runs in exactly one plan ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- Creating a plan in a region creates that plan's compute in that region, and every app you later add runs on those resources ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- A plan fixes five properties: operating system (Windows or Linux), region, number of VM instances, VM instance size (small, medium, large) and pricing tier ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- Tiers fall into three groups: shared compute (**Free**, **Shared**), dedicated compute (**Basic**, **Standard**, **Premium**, **PremiumV2**, **PremiumV3**, **PremiumV4**) and isolated compute (**IsolatedV2**) ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- **Free** and **Shared** apps run on the same Azure VM as other App Service apps, including other customers' apps, and each app is given a CPU quota ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- **Basic** through **PremiumV4** apps run on Azure VMs dedicated to that plan, and only apps inside the same plan share those VMs ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- **IsolatedV2** runs apps on dedicated VMs attached to a dedicated Azure virtual network, adding network isolation on top of compute isolation ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- The tier decides which App Service features you get, such as custom domains, TLS/SSL certificates, autoscaling, deployment slots, backups and Azure Traffic Manager integration ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- The tiers available to you depend on the operating system, the region and other factors ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- With per-app scaling disabled, an app runs on all of the plan's VM instances, and several apps plus all of an app's deployment slots share the same instances ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- Enabling diagnostic logs, running backups and running WebJobs also consume CPU cycles and memory on those same instances ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- Scaling the plan, manually or by autoscale rule, affects every app in the plan because the compute is shared ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- With per-app scaling enabled, each app or slot can be capped at a subset of the plan's instances, while capacity and billing stay at plan level and active replicas never exceed the instance count ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- **Free** and **Shared** apps receive CPU minutes on a shared VM and cannot scale out ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- Billing outside **Free**: **Shared** charges each app for its CPU quota, dedicated tiers charge each VM instance, and **IsolatedV2** charges each worker in the App Service Environment ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- Dedicated compute belongs to the plan, not the app, so apps in one plan share it with each other; isolating an app means giving it its own plan ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- Custom domains, TLS/SSL certificates, deployment slots and backups add no charge, but App Service domains and certificates are paid on purchase and on every yearly renewal ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- IP-based TLS connections bill hourly per connection (some Standard-or-higher tiers include one free), while SNI TLS connections are free ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- **Managed Instance** is a plan-scoped hosting option for Windows web apps needing OS customization, optional private networking and legacy Windows components without managing VMs ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- It adds PowerShell scripts for repeatable OS and middleware setup, and registry adapters that draw their secrets from Azure Key Vault ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- On top of that it offers private DNS plus virtual network integration scoped to the plan, mountable storage such as Azure Files, UNC paths and local temporary disk, on-demand RDP diagnostics through Azure Bastion, and managed identities at plan level ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- It ships with .NET Framework 3.5 and 4.8 plus .NET 8, supports custom runtimes, and is generally available for Windows web apps in select regions only, limited to **Pv4** and **Pmv4** SKUs with no Linux and no containers ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- Check regional availability of a SKU with `az appservice list-locations --managed-instance-enabled --sku <sku>` on Azure CLI 2.82.0 or later ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))

## Settings and limits

- In the portal you start from **Create App Service Plan** and complete **Project Details** before the plan settings ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- In **App Service Plan details** you name the plan and pick **Operating System** and **Region**, which is where the plan gets created ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- In **Pricing Tier** you select a **Pricing plan**, or choose **Explore pricing plans** to see further detail ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- In **Zone redundancy** you select **Enabled** or **Disabled** depending on your needs ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- To place a plan in an App Service Environment, create the environment first, wait for its deployment to complete, then select that environment in the **Region** list ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- Creating a plan in an existing resource group can fail with `The pricing tier is not allowed in this resource group` or `<SKU_NAME> workers are not available in resource group <RESOURCE_GROUP_NAME>` because of tier, region, OS, availability zone, Function app or web app mismatches; the remedy is a new resource group ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- Density guidance for isolating a busy app: **B1**, **S1**, **P1v2**, **I1v1** hold up to 8 apps, **B2**, **S2**, **P2v2**, **I2v1** up to 16, **B3**, **S3**, **P3v2**, **I3v1** up to 32, and **P0v3**, **P0v4** up to 8 ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- Larger sizes allow more apps: **P1v3**, **P1v4**, **I1v2** up to 16, **P2v3**, **P2v4**, **I2v2**, **P1mv3**, **P1mv4** up to 32, **P3v3**, **P3v4**, **I3v2**, **P2mv3** up to 64 ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- The largest sizes, **I4v2**, **I5v2**, **I6v2**, **P3mv3**, **P3mv4**, **P4mv3**, **P4mv4**, **P5mv3**, **P5mv4**, have no fixed app cap and are bounded by vCPU usage instead ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- To move an app, the source and target plans must share the same resource group, geographical region and OS type; changing type, such as Windows to Linux, isn't supported ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- Any virtual network integration configured on the app must be disabled before the plan change ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- The portal path is **App services**, the app, then **App Service plan** in the left pane, then **Change plan**, where only plans in the same resource group and region are listed, then **Save** ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- Each plan is deployed into an internal deployment unit called a webspace, and plans created with the same resource group, region and OS land in the same webspace ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- An app can only move between plans in the same webspace, and plans cannot change webspaces after creation, so moving a plan to another resource group never puts it in that resource group's webspace ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- You can change a plan's pricing tier up or down at any time, so you can start on a low tier and raise it when you need more capabilities ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- Async scaling (preview) lets you request a target instance count and lets the platform scale to it in the background instead of retrying with a lower count ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- Async scaling is supported on all Basic, Standard and Premium pricing plans and can be used at plan creation or during scale-out ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- For plans created in an App Service Environment the behaviour isn't configurable: they always scale asynchronously ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- During an async scale up or down to another SKU no other plan property can be changed, and the operation can fail if there aren't enough instances to satisfy the request fully ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- An in-progress async operation is cancelled only by changing **TargetWorkerCount**; other property changes, including the SKU, don't cancel it, and instance count changes that can't complete synchronously are ignored unless **TargetWorkerCount** also changes ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- To cancel explicitly set **TargetWorkerCount** to 0, for example `az appservice plan update -g <resourceGroupName> -n <App Service Plan Name> --async-scaling-enabled true --number-of-workers <number of workers to scale out to>` ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- Deleting the last app of a plan deletes the plan by default; to keep the plan, change it to the **Free** tier so you're not charged ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- A plan with no apps still incurs charges because it keeps reserving its configured VM instances ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))

## Compare and choose

- Start on **Free** for testing at no cost, accepting shared VMs, CPU minutes only and no scale-out ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- Use **Basic**, **Standard**, **Premium**, **PremiumV2**, **PremiumV3** or **PremiumV4** for production on dedicated VMs, paying per VM instance while all apps in the plan share that compute ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- Choose **IsolatedV2** when you need isolation from other customers at both the network and compute level, on dedicated VMs in a dedicated virtual network ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- Choose **Managed Instance** for a Windows app needing OS-level customization, plan-level private networking or legacy Windows components, on a **Pv4** or **Pmv4** SKU in a supported region ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- Rule out **Managed Instance** for Linux apps, container apps, or anything on **Free**, **Shared** or the standard dedicated tiers ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- Add the app to an existing plan to save money, provided that plan still has capacity for the combined resource needs of all its apps ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- Create a new plan when the app is resource intensive, when it must scale independently of the other apps in its current plan, or when it needs a different geographical region ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- A plan's region cannot be changed, so to relocate an app use **Clone App** in the **Development Tools** section, which copies it into a new or existing plan in any region ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))

## Gotchas

- Apps in one plan share compute, so one noisy app or one autoscale rule impacts every other app in that plan ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- An active deployment slot counts as an active app because it competes for resources in the same plan ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
- Downgrading can remove capabilities: moving an app from **D1** to **F1** can fail with `Cannot update the site with hostname '<app_name>' because its current TLS/SSL configuration 'SNI based SSL enabled' is not allowed in the target compute mode. Allowed TLS/SSL configuration is 'Disabled'.` ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- An empty plan is not free: it keeps reserving VM instances and billing until you drop it to the **Free** tier ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- Plan moves are tightly constrained: same resource group, same region, same OS, virtual network integration disabled first, and both plans in the same webspace ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- Creating a plan in an existing resource group can hit tier or SKU availability errors even where the tier is valid elsewhere; create it in a new resource group instead ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- In an App Service Environment the environment must be fully deployed before you create the plan, and async scaling can't be turned off ([Learn](https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage))
- **Free** and **Shared** tiers never scale out, and IP-based TLS connections bill hourly while SNI stays free ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans))
