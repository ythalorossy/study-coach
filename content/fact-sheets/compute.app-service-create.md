---
skill: compute.app-service-create
sources: 53b7145464b685e195f2724221a3beeea5b6d78f56f003df9a7e100f52f84619
built: 2026-10-24T15:11:06.437Z
---
# Create an App Service

## Key concepts

- **Azure App Service** provides managed hosting for web applications through a platform as a service (PaaS) model, removing infrastructure upkeep from the application team. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/getting-started))
- The service can host web applications, mobile back ends, and RESTful APIs, so it covers both front-end web hosting and API workloads. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
- Supported stacks include .NET, Java (Java SE, Tomcat, and JBoss), Node.js, Python, and PHP, and App Service workloads can run on Windows or Linux. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
- A containerized application is deployed as a custom container. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
- A first .NET app can be created with **Visual Studio**, **Visual Studio Code**, the command line, **Azure PowerShell**, or the **Azure portal**. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/getting-started))
- Purpose-built deployment tools exist for **Visual Studio**, **Visual Studio Code**, **IntelliJ**, and **Eclipse**, while command-line deployments can use Maven, Gradle, **Azure Developer CLI**, **Azure CLI**, and **Azure PowerShell**. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
- Continuous delivery is supported through **GitHub Actions**, **Azure Pipelines**, and other CI/CD systems, while deployment slots support staging environments. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
- Capacity can be scaled up or out, including automatic scaling in response to demand. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
- Applications can be deployed to data centers around the world for global reach. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
- Ready-made **Azure Marketplace** templates include WordPress, Joomla, Django, Node.js, and Drupal. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
- Built-in social sign-in supports Google, Facebook, X, and Microsoft accounts. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
- For brand protection, use an **App Service domain** with a free managed certificate, or supply a custom domain and certificate. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
- **Azure Virtual Network** integration can protect application ingress and egress. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
- Reliability features include a robust SLA and zone redundancy, and supported compliance standards include ISO, SOC, and PCI. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
- Students can use the free tier and **Azure for Students Starter**; generally, billing follows the resources actually used. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
- Memory-optimized `P*mv3` tiers support high-density hosting, while **Azure savings plans** and reserved instances can reduce predictable-workload costs by up to 55%. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))

## Settings and limits

- Common configuration guidance covers web apps, mobile back ends, and API apps. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common))
- An app setting is a variable that App Service passes to application code as an environment variable. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common))
- App setting names accept only letters, digits (`0-9`), periods (`.`), and underscores (`_`). ([Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common))
- Special characters in a value must be escaped for the target operating system; on Linux, for example, `pa\$\$w0rd\\` escapes the dollar signs and final backslash. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common))
- For Linux apps and custom containers, App Service supplies each app setting to the container through the `--env` flag. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common))
- The supplied settings are injected into the app environment at startup, while other language stacks receive them as environment variables at runtime. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common))
- For ASP.NET and ASP.NET Core, app settings correspond to entries in `<appSettings>` in `Web.config` or `appsettings.json`. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common))
- App setting values are always encrypted while stored at rest. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common))
- For production credentials, **Azure Key Vault** references are the recommended way to keep secrets outside the app setting value itself. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common))
- Managed identity can authenticate to back-end resources without keeping connection secrets in app settings. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common)) ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-managed-identity))
- In the portal, search for and select **App Services**, open the app, then choose **Settings** > **Environment variables** > **App settings**. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common))
- Select **Add** to create a setting, or select an existing setting to modify it. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common))
- The setting dialog can mark a setting as sticky to the current deployment slot. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common))
- Save by selecting **Apply** in the setting dialog and then **Apply** again on the **Environment variables** page. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common))

## Compare and choose

- Use **Managed Instance** for legacy Windows applications tied to operating-system internals. Its plan-scoped isolation suits workloads that depend on COM objects, registry manipulation, MSI deployment, mapped drives, or tighter network boundaries. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
- Compatible **Managed Instance** scenarios include Windows-hosted .NET or Java apps, COM and registry use, MSI packages, mapped drives, managed identity, private network integration, MSMQ clients, CI/CD, and Entra ID sign-in. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
- Startup PowerShell scripts for **Managed Instance** can install dependencies and update COM, registry, IIS, and ACL configuration, plus execute MSI packages. At plan level, registry definitions can reference secrets held in **Azure Key Vault**, and supported SMB/UNC paths can be mapped or referenced through drive-letter access. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
- **Managed Instance** excludes Linux workloads, container deployment, App Service environments, remote debugging, and every SKU family apart from `PV4` and `PMV4`. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
- For **Managed Instance**, **Azure Bastion** provides the RDP route for troubleshooting rather than routine administration, and lasting configuration has to be implemented by script. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
- Use a standard **App Service plan** instead when the application must run on Linux or as a container, or when Azure should handle operating-system and runtime updates across a wide selection of runtimes. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
- Select an **App Service environment (ASE)** for isolated deployment of many apps on dedicated networking and virtual machines, instead of requesting custom operating-system features shared at the plan level. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
- For **Azure Functions**, use the Functions app settings reference rather than the App Service common-settings guidance. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common))

## Gotchas

- App setting values are concealed by default in the portal: under **Value**, **Show value** reveals one value, while **Show values** reveals all hidden values. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common))
- Viewing this portal section requires `Read/Write` user permissions; **Owner**, **Contributor**, and **Website Contributor** have sufficient RBAC access, but **Reader** alone cannot open the page. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common))
- Adding, removing, or editing an app setting triggers an App Service restart, so configuration changes can interrupt a running production app. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common))
- On a default Linux app service or custom Linux container, nested JSON names need different separators: replace each colon (`:`) with a double underscore (`__`) and each period (`.`) with a single underscore (`_`); `ApplicationInsights:InstrumentationKey` therefore becomes `ApplicationInsights__InstrumentationKey`. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common))
- In ASP.NET and ASP.NET Core, App Service values take precedence over matching values in `Web.config` or `appsettings.json`, so local files can retain development settings while Azure supplies production values. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common))
- Encryption at rest does not make app settings the best place for production secrets; prefer **Azure Key Vault** references, and use managed identity for back-end connectivity when credentials can be eliminated. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common)) ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview-managed-identity))
- Before adopting **Managed Instance** in production, validate Application Insights/logging telemetry, certificate automation, and operational processes. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
- Changes made during an RDP session on **Managed Instance** are not preserved; use configuration or install scripts for every lasting change. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/overview))
