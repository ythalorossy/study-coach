---
skill: networking.bastion
sources: f01f6786f6a99899caabb8d1808e643cb50c32d496279994827667552387f1e9
built: 2026-11-03T02:25:47.668Z
---
# Implement Azure Bastion

## Key concepts

- Azure Bastion is a fully managed PaaS that delivers RDP and SSH connectivity to virtual machines over TLS, either from the Azure portal or with the native SSH/RDP client already installed on your computer. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/bastion-overview))
- The bastion host is deployed into your own virtual network and serves every VM in that VNet over private IP addresses, so target VMs need no public IP, no agent and no special client software. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/bastion-overview))
- Connections are encrypted with TLS on port 443, which also shields your VMs from external port scanning. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/bastion-overview))
- There are four SKU tiers — **Developer**, **Basic**, **Standard** and **Premium** — where **Developer** is a free SKU on shared infrastructure that supports one VM at a time, and the other three deploy dedicated to your virtual network. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/bastion-overview))
- Azure Bastion belongs to the Azure Network Security category together with Azure DDoS Protection, Azure Firewall and Azure Web Application Firewall, but it is a separate service with its own purpose. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/bastion-overview))
- Three deployment architectures exist: dedicated (Basic/Standard/Premium placed in your VNet), private-only (Premium deployed without a public IP) and Developer (shared infrastructure). ([Learn](https://learn.microsoft.com/en-us/azure/bastion/bastion-overview))
- Three connection methods exist: the browser-based HTML5 web client in the portal (all SKUs), the native client using your installed SSH/RDP software (Standard and Premium, with Microsoft Entra ID authentication and file transfer), and shareable links (Standard and Premium). ([Learn](https://learn.microsoft.com/en-us/azure/bastion/bastion-overview))
- One deployment can serve several networks through virtual network peering, which cuts management overhead. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/bastion-overview))
- You pay hourly SKU charges plus outbound data transfer, and billing begins the moment Bastion is deployed whether or not anyone connects. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/bastion-overview))

## Settings and limits

- Every SKU except Developer requires a dedicated subnet named exactly **AzureBastionSubnet**, in the same virtual network and the same resource group as the bastion host, and it may hold no other resources. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/configuration-settings))
- That subnet must be /26 or larger (e.g. /25, /24) for any Bastion deployed on or after November 2, 2021. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/configuration-settings))
- Subnets of /27 created before that date keep working, but growing them to /26 is recommended so host scaling has room for additional scale units. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/configuration-settings))
- Supply the subnet via the portal **Subnet** field, PowerShell `-subnetName`, or Azure CLI `--subnet-name`. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/configuration-settings))
- A public IP address is mandatory for Basic, Standard and Premium dedicated deployments, but not for Developer or private-only deployments. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/configuration-settings))
- That public IP must be SKU **Standard** with allocation method **Static**; an existing public IP may be reused as long as it meets those criteria and isn't already in use. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/configuration-settings))
- Set the public IP with the portal **Public IP address** field, PowerShell `-PublicIpAddress`, or Azure CLI `--public-ip create`. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/configuration-settings))
- An instance is a fully managed optimized Azure VM, also called a scale unit: the Basic SKU creates two instances, while Standard and above let you choose the count (host scaling). ([Learn](https://learn.microsoft.com/en-us/azure/bastion/configuration-settings))
- Default inbound connection ports are 3389 for RDP and 22 for SSH; custom port values are supported on Standard SKU and higher only, and you must supply that port when connecting. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/configuration-settings))
- The **Shareable Link** feature lets someone reach a VM or virtual machine scale set without entering the Azure portal; the opened page prompts for the username/password or private key configured on that target, and it requires Standard SKU or higher. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/configuration-settings))
- A private-only deployment builds a non-internet-routable bastion host reachable only by private IP, so public-IP connections to the host are refused; this architecture needs Premium. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/configuration-settings))
- **Session recording** (Premium only) captures graphical RDP and SSH sessions and, after the session is closed or disconnected, stores them in a blob container in your storage account via SAS URL, viewable on the **Session Recording** page. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/configuration-settings))
- Availability zones work only in certain regions and are in preview: East US, East US 2, Central US, West US 2, Australia East, Qatar Central, South Africa North, West Europe, North Europe, Sweden Central, UK South and Canada Central. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/configuration-settings))
- To deploy by zone you must use manually specified settings instead of the automatic defaults, you pick the zones at deployment time, and the zone assignment cannot be changed afterwards. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/configuration-settings))
- Public IP zone alignment: a Bastion in zones 1, 2, 3 needs a public IP in zones 1, 2, 3; a Bastion in zone 1 can still use a public IP covering zones 1, 2, 3; a zone-less (0) Bastion can use any public IP, zonal or not. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/configuration-settings))
- IPv6 dual stack is preview: the VNet and **AzureBastionSubnet** must be dual stack, the target VM's NIC must have IPv6 support in a dual-stack VNet, IPv6-only is not supported, IPv6 is unsupported on private-only deployments, and IPv6 is never used on the Bastion-to-VM hop. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/configuration-settings))
- To connect you need the `Reader` role on the target VM and on the network interface that holds its private IP, plus inbound RDP 3389 (Windows) or SSH 22 (Linux). ([Learn](https://learn.microsoft.com/en-us/azure/bastion/tutorial-create-host-portal))
- From the VM or VNet, open **Connect** > **Bastion**, then pick **Deploy Bastion** (default settings), **Configure manually** (full control) or the free Developer option; dedicated deployments take about 10 minutes, Developer deploys in seconds. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/tutorial-create-host-portal))
- In **Configure manually** you set **Name**, **Region** (where the VNet resides), **Availability zone**, **Tier**, **Instance count**, the virtual network, the subnet (**Subnet purpose** = Azure Bastion, IPv4 range such as 10.1.1.0/26, size /26 or larger) and the public IPv4 address (**Create new** or **Use existing**), with extras on the **Advanced** tab. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/tutorial-create-host-portal))

## Compare and choose

- **Developer**: free and backed by shared infrastructure rather than a dedicated host, supports one VM at a time, is limited to select regions and targets development and testing; it can be upgraded to a paid SKU later. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/bastion-overview))
- **Basic**: dedicated deployment with fixed capacity (two instances) for production with moderate connection requirements; it lacks the native client, shareable links, IP-based connections, custom ports and file transfer. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/bastion-overview))
- **Standard**: everything in Basic plus native client, shareable links, IP-based connections, custom ports, file transfer, and the ability to pick the number of scale units (host scaling). ([Learn](https://learn.microsoft.com/en-us/azure/bastion/bastion-overview))
- **Premium**: everything in Standard plus session recording for compliance and private-only deployment without a public IP. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/bastion-overview))
- Pick Premium when you need session recording or a public-IP-free host, Standard when you need native client, file transfer, shareable links, custom ports or a chosen instance count, Basic for a straightforward dedicated production deployment, and Developer for free dev/test of one VM. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/bastion-overview))
- The one-click **Deploy Bastion** path uses the Standard SKU with default settings and completes in roughly 10 minutes, after which you can still adjust settings or upgrade the SKU. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/tutorial-create-host-portal))

## Gotchas

- The VM you connect to is not part of the Bastion configuration and never becomes a bastion host; the bastion host is the Bastion resource itself. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/tutorial-create-host-portal))
- Availability zone settings are fixed at deployment time: the default one-click path gives you no zone choice, and the zones can't be edited later. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/configuration-settings))
- A /27 **AzureBastionSubnet** from before November 2, 2021 still works, but it limits how many scale units host scaling can add — resize to /26 or larger first. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/configuration-settings))
- Custom ports exist only from Standard upward, and the custom value must be given at connection time or the connection won't work. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/configuration-settings))
- Dual stack must be chosen when the Bastion is created; an existing IPv4-only Bastion can't be converted, and IPv6 never applies between Bastion and the target VM. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/configuration-settings))
- Shareable link recipients never see the Azure portal; they authenticate with the username/password or private key configured on the target resource. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/configuration-settings))
- Bastion keeps billing after you disconnect, so delete it (and the resource group) when a tutorial or test ends, and remove the VM's public IP by dissociating it from the NIC and then deleting the public IP resource. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/tutorial-create-host-portal))
- Azure Bastion works with Azure Private DNS zones but with restrictions, so check the Azure Bastion FAQ before depending on it. ([Learn](https://learn.microsoft.com/en-us/azure/bastion/tutorial-create-host-portal))
