---
skill: networking.public-ip
sources: ff13e815febea4a6b043dc3b68762a7f430a5ea5d2bfde66cfcee146fdba4449
built: 2026-11-03T02:27:29.471Z
---
# Configure public IP addresses

## Key concepts

- A public IP address is an Azure Resource Manager resource with its own properties, separate from the resource it serves. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- Attaching one enables inbound traffic from the Internet and outbound connectivity through a known, predictable address. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
- The address stays dedicated to that resource until you detach it or delete the resource it is attached to. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- Without a public IP, Azure still supplies a dynamic outbound address, but it isn't reserved for the resource and can change over time. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- Supported targets: VM NICs, Virtual Machine Scale Sets, public load balancer front ends, VPN and ExpressRoute gateways, NAT gateways, Application Gateways, Azure Firewall, Bastion hosts, Route Servers and API Management. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- Scale Set instances have no individual public IP objects; a Public IP Prefix generates their addresses. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
- An address can be IPv4, IPv6 or dual-stack: the portal's **Both** deploys two resources, while each PowerShell or CLI command creates one. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
- SKU choices are **Standard (v1 or v2)** and **Basic**; the SKU governs allocation method, feature support and eligible resources. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- **Basic** was retired on September 30, 2025, so remaining **Basic** addresses must be upgraded to **Standard**. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- Public IPv4 addresses carry a nominal charge; public IPv6 addresses are free. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- The service runs in every region of the Public and US Gov clouds, and customer data stays in the deployment region. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
- A **Standard** address can move to another resource group while attached (except a virtual network gateway), to another subscription only while detached, and never to another region. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))

## Settings and limits

- **IP Version** is required: **IPv4**, **IPv6** or **Both**, and **Both** creates one IPv4 resource plus one IPv6 resource. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
- **SKU** is required at creation and isn't freely editable later; **Standard** supports virtual machines, load balancers and Azure Firewall, is required for a Standard Load Balancer, and a **Basic** address reaches **Standard** through the documented upgrade path. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
- **Tier** is required: **Regional** for one region or **Global** for anycast across regions; **Global** is preview, **Standard** only, and used with Cross-region Azure Load Balancer. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
- **Name** is required and unique within the resource group; a dual-stack deployment needs a second, different name. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
- **IP address assignment** is required and offers **Dynamic** or **Static**. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
- **Dynamic** addresses arrive only after the address is associated and the resource starts; they are released when the association is removed and can change after deallocate/start, but not on reboot or guest-OS stop. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
- **Static** addresses are allocated at creation and held until the public IP resource is deleted, after which they can't be recovered; Azure picks the value from a free pool in the location. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- **Routing preference** is required and defaults to **Microsoft network**. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
- **Routing preference** can't change after creation, needs **Standard**, and is unsupported on **Standard v2** and on IPv6. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- **Idle timeout (minutes)** sets the inbound TCP/HTTP idle connection lifetime, adjustable from 4 to 30 with a default of 4; outbound-originated flows always close after 4 minutes and IPv6 is fixed at 4. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- **DNS name label** is optional but unique within the location across all subscriptions and customers; **contoso** in **West US** becomes **contoso.westus.cloudapp.azure.com** with IPv4 **A** and IPv6 **AAAA** records, and a dual-stack pair shares one name. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- A custom domain instead needs Azure DNS or an external DNS provider with a matching record. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- **Domain Name Label Scope** is creation-only preview: **TenantReuse**, **SubscriptionReuse**, **ResourceGroupReuse** or **NoReuse**; it inserts a scope hash and isn't recommended for production. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- **Subscription** and **Location** must match the resource that uses the address, while **Resource group** may match or differ. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
- **Availability zone** appears only for supported locations and address types; **Basic** and **Global** have no zone choice, and **Zone-redundant** is the default where zones exist. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
- IP quotas count per region and per subscription; request an increase through Azure Support. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- Management needs the **Network Contributor** role or a custom role with `Microsoft.Network/publicIPAddresses/read`, `Microsoft.Network/publicIPAddresses/write`, `Microsoft.Network/publicIPAddresses/delete` and `Microsoft.Network/publicIPAddresses/join/action`. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
- Inspect with `Get-AzPublicIpAddress` or `az network public-ip show`, list with `az network public-ip list`, and update with `Set-AzPublicIpAddress` or `az network public-ip update`. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
- Delete with `Remove-AzPublicIpAddress` or `az network public-ip delete` once detached; on a VM detach from the NIC with `Set-AzNetworkInterface` or `az network nic ip-config update --public-ip-address`. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
- Scale Set instance addresses are listed with `Get-AzPublicIpAddress -VirtualMachineScaleSetName` or `az Virtual Machine Scale Set list-instance-public-ips`. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))

## Compare and choose

- Choose **Static** when firewall allow-lists, DNS **A** records, IP-based security models or TLS/SSL certificates depend on a fixed address. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- Choose **Dynamic** when nothing depends on the address value and a change after deallocate/start is acceptable. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- **Standard** allows only **Static** allocation for IPv4 and IPv6; **Basic** allows **Dynamic** or **Static** IPv4 but only **Dynamic** IPv6. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- **Standard** is closed to inbound traffic by default so an NSG must permit the flow; **Basic** is open by default with the NSG optional. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- **Standard** supports availability zones, **Internet** routing preference and **Global** tier; **Basic** supports none of the three. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- **Standard v2** is always zone-redundant, lacks routing preference, doesn't yet support **Global** tier, and works only with the **Standard v2 NAT Gateway**. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- **Zone-redundant** keeps the address available through one zone failure; **Zonal** ties it to a single zone's health; **Non-zonal** only fits regions without zones. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- Keep **Microsoft network** routing normally; select **Internet** to reduce time on Microsoft's network and lower egress charges for supported resources. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- Pick **Regional** tier for regional workloads; **Global** only for a Standard cross-region Load Balancer, because it is preview and narrow in scope. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
- NAT gateway, Azure Firewall, Bastion host, Route Server and API Management require **Static** allocation and offer no IPv6. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- VPN gateway supports **Dynamic** IPv4 only in non-zone-redundant setups and no IPv6; ExpressRoute gateway supports **Dynamic** and **Static** IPv4 plus preview **Dynamic** IPv6, but no **Static** IPv6. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- Application Gateway takes **Dynamic** IPv4 on v1 and **Static** IPv4 on v2 with no IPv6; VM NICs and public load balancer front ends accept both allocation methods and IPv6. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- Backend VMs of a public load balancer need no public IP of their own; if they have one, load balancer and public IP SKUs must match, and Basic and Standard can't be mixed in one availability set, scale set or standalone VM design. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))

## Gotchas

- A **Standard** public IP on a VM NIC passes no traffic until an NSG is attached and explicitly allows the intended inbound flow. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
- Switching **Static** to **Dynamic** requires removing the address from the IP configuration first and loses the original address; Azure DNS keeps its mapping, but the address can change on a later start. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
- A public IP must be detached from every IP configuration and NIC before deletion, and a deleted address can't be recovered. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
- Deleting the resource that holds the address also releases its dedicated address, so detach it first if it must survive. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- Availability zones can't change after creation; former **Standard** non-zonal addresses now count as zone-redundant in regions with zones, and zone-redundant addresses need regions with three live zones. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- **Routing preference** is locked after creation, so choose **Microsoft network** or **Internet** before deploying. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
- **Global** tier is preview and **Standard** only; it is unavailable with **Basic** and **Standard v2**. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- **Standard v2** addresses attach only to the **Standard v2 NAT Gateway**, never to another product or component. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- IPv6-only virtual machines and scale sets aren't supported; every NIC needs at least one IPv4 configuration, so IPv6 deployments must be dual-stack. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- A VPN gateway can't serve an IPv6-enabled virtual network, directly or when peered using **UseRemoteGateway**. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- IPv6 ranges can't join a virtual network that has resource navigation links, and IPv6 container communication and IPv6 reverse DNS are unsupported. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses))
- A **DNS name label** clash blocks deployment because uniqueness spans the whole location across all customers, not just your resource group. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address))
