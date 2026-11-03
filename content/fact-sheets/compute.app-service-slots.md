---
skill: compute.app-service-slots
sources: 848a272beb5d130ee8ae3cf5f64a980f330353587057224e7fd8cfb851a4ba5b
built: 2026-10-24T15:13:23.014Z
---
# Configure deployment slots for an App Service

## Key concepts

- A deployment slot is a separate, live App Service environment with its own hostname, not merely another name for the production app. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- A slot can exchange application content and eligible configuration with another slot, including the production slot. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- Deploying to a nonproduction slot provides a place to validate a candidate release before it reaches production users. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- A swap warms the source slot's instances to the production scale before redirecting traffic, making the transition continuous without dropping requests. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- A swap is reversible: the staging slot receives the former production app, and another immediate swap restores that last-known-good release. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- Each slot has a management page and independently editable configuration; the portal labels it **App Service (Slot)** and also lists it as a separate app in the resource group. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- Deployment slots themselves have no separate charge, although the plan tier determines how many slots an app may use. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- Auto swap automates the slot-to-production promotion when pre-swap validation isn't required. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- The recommended code-release pattern is to deploy to a nonproduction slot, validate the changes, run smoke tests, and then swap the accepted build into production. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices))
- For custom containers, staging and swapping can also prevent deployment downtime, but the required automation is more involved than for code. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices))

## Settings and limits

- In the portal, choose **Deployment** > **Deployment slots** > **Add**; the **Add Slot** dialog requires a slot name and asks whether to copy configuration from an existing slot. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- Slot creation requires the Standard, Premium, or Isolated plan tier; otherwise, the portal directs you to select **Upgrade** and then use the **Scale** tab. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- The Standard tier permits at most five slots, so an app with more than five cannot be scaled down to Standard. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- A target tier must accommodate the app's existing slot count, and Premium and Isolated have their own tier-dependent allowances. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- A newly added slot starts with **Traffic %** = `0`, leaving all customer traffic on production. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- Configuration cloning can copy app settings, connection strings, language framework versions, WebSockets, HTTP version, and platform bitness. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- A private endpoint isn't cloned between slots, so a deployment that depends on one must account for that endpoint separately. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- The caller must have the Azure permissions required for the requested slot operation; the **Microsoft.Web** provider's operation list can be searched for `slot` to identify the relevant permission. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- **Slot settings**, also called sticky settings, are configuration exceptions that stay with their slot instead of moving to the other slot during a swap. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- Slot-specific app settings and connection strings aren't exchanged by a swap, even though connection strings can be copied when a new slot is created. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- Auto swap can be configured with warm-up so that a pipeline deploying a new build triggers promotion without a manual swap. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- For Node.js or .NET apps built by a separate build service, set `SCM_DO_BUILD_DURING_DEPLOYMENT` to `false`; otherwise Kudu runs `npm install` or `dotnet build` during deployment. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices))
- When local cache is used, pair it with deployment slots to prevent downtime from the deployment. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices))
- If CPU or memory consumption exceeds `90%`, temporarily increasing the instance count can help the deployment complete; return to the previous count afterward. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices))

## Compare and choose

- Choose a staging slot and a manual swap when pre-swap validation matters: deploy, validate, smoke-test, and then promote the accepted build. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices))
- Choose auto swap when no pre-swap validation is required, because it turns a new deployment into an automatic promotion workflow. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- Map testing, QA, and staging branches to separate slots so stakeholders can evaluate each continuously deployed branch. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices))
- Keep continuous deployment off for the production slot; deploy the production branch, often `main`, to a nonproduction slot and release it by swapping. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices))
- For containers, prepare a slot and swap it rather than changing the production image tag directly, so the staged release is ready before traffic moves. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices))
- Container automation has three distinct actions: construct and tag an image, push that tagged image to the registry, and write its tag into the target slot. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices))
- Identify container images with the Git commit ID, a timestamp, or another traceable value instead of `latest`, because a mutable tag makes the running build difficult to determine. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices))
- Changing a slot's container image tag restarts the site and causes it to retrieve the new image. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices))
- A version-controlled repository such as **GitHub**, **Bitbucket**, or **Azure Repos** is the usual production deployment source, whereas a local project suits development and testing. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices))
- **Kudu** supplies HTTP deployment endpoints such as `zipdeploy/` and handles continuous deployment; it runs as a separate process on Windows and as a second container on Linux. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices))
- **FTP** and **WebDeploy** upload files with site or user credentials and bypass Kudu, while tools such as **Azure Pipelines**, **Jenkins**, and editor plugins ultimately use a supported deployment mechanism. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices))

## Gotchas

- Don't expect a new slot to receive production traffic automatically: its initial **Traffic %** value is `0`. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- Don't treat cloning as a complete environment copy, because private endpoints aren't included in the cloned configuration. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- A slot's separate hostname needs consideration for exposure; use App Service access restrictions when it shouldn't be publicly accessible. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- Don't continuously deploy the production branch to the production slot, because that bypasses the validation gate and the quick swap-back rollback. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices))
- Don't use the mutable `latest` container tag for releases, because identifying and debugging the deployed code becomes difficult. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices))
- Account for the restart caused by a container image-tag update when deciding where that update occurs in the release pipeline. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices))
- Local cache isn't recommended for content-management sites such as **WordPress**. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices))
- A deployment on a plan already using more than `90%` of CPU or memory may struggle; add instances temporarily instead of deploying at that load. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices))
- A swap changes more than files: eligible configuration moves with the app, while slot-specific settings stay behind. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- Before scaling, check that the destination tier supports every slot already in use; the no-extra-charge rule doesn't remove the tier quota. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots))
- The **Deployment Center** can create a continuous-delivery pipeline for a container repository and branch, automatically building, tagging, and deploying each new commit to the selected slot. ([Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices))
