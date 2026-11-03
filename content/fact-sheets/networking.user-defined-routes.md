---
skill: networking.user-defined-routes
sources: dddaadfad299705a3a6e7d100af9ec5e63389ddfb9b5d167861f9edb10979acc
built: 2026-11-03T02:23:07.811Z
---
# Configure user-defined routes

## Key concepts

- Azure creates system routes for every subnet automatically; you cannot create or delete them, but a custom route can override some of them. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- Default system routes per subnet include one route for each address range in the virtual network address space (next hop type **Virtual network**) plus `0.0.0.0/0` with next hop type **Internet**. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- Next hop type **None** drops traffic instead of sending it outside the subnet; Azure creates it for `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `100.64.0.0/10`, `127.0.0.0/8`, `157.59.0.0/16`, `104.147.0.0/16` and `104.146.0.0/17`. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- If one of those reserved ranges is part of the virtual network address space, Azure changes that route's next hop type from **None** to **Virtual network**. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- A route whose next hop type is **Virtual network gateway** with the `0.0.0.0/0` prefix causes the default system routes that use **None** to be removed. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- Optional default routes appear only when the related capability is enabled: **Virtual network peering** routes for the peered address ranges, **Virtual network gateway** routes for BGP-advertised on-premises prefixes, and `VirtualNetworkServiceEndpoint` routes for enabled service endpoints. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- Custom routes come in two forms: user-defined routes (UDRs) you create, and BGP routes exchanged with an on-premises network gateway. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- A route table holds the UDRs and is attached to subnets, never to virtual networks: each subnet can have zero or one route table, and one route table can be associated to zero or many subnets. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/manage-route-table))

- When a route table is associated to a subnet, its UDRs are combined with that subnet's default routes and with any routes propagated from on-premises; on conflict the UDR wins. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- Azure selects a route with the longest prefix match: with `10.0.0.0/24` and `10.0.0.0/16` in the same table, traffic to `10.0.0.5` follows the `/24` while traffic to `10.0.1.5` follows the `/16`. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- When several routes carry the identical prefix, the priority order is user-defined route, then BGP route, then system route. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- A service tag can be used as the address prefix of a UDR so you don't have to track IP range changes; you can create 25 or fewer routes that use service tags in each route table. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- With an exact match between a service tag route and an explicit-prefix route, the explicit prefix wins; among service tag routes the evaluation order is regional tag, top-level tag, `AzureCloud` regional tag, then `AzureCloud`. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

## Settings and limits

- Creating a route table in the portal asks for **Name**, **Subscription**, **Resource group**, **Location** and **Propagate gateway routes**, which is the **Virtual network gateway route propagation** Enabled/Disabled setting. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/manage-route-table))

- A route requires a unique **Route name**, an **Address prefix** in CIDR notation, a **Next hop type**, and — only when the type is **Virtual appliance** — a **Next hop address**. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/manage-route-table))

- A prefix cannot be duplicated in two routes of the same table, but one prefix may fall inside another, for example `10.0.0.0/16` together with `10.0.0.0/22`. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/manage-route-table))

- A route table holds up to 400 UDRs by default, and up to 1,000 UDRs when the Azure Virtual Network Manager routing configuration is used. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- The maximum number of route tables per subscription and per location, and the maximum routes per table, are also bounded by the Azure networking limits. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/manage-route-table))

- Set **Virtual network gateway route propagation** to **Disabled** when the virtual network connects to on-premises through a VPN gateway and you don't want the on-premises routes propagated to the subnet's network interfaces. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/manage-route-table))

- Route table commands: `az network route-table create`, `New-AzRouteTable`, `az network route-table list`, `Get-AzRouteTable`, `az network route-table show`, `az network route-table update`, `Set-AzRouteTable`, `az network route-table delete`, `Remove-AzRouteTable`. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/manage-route-table))

- Route commands: `az network route-table route create` with `New-AzRouteConfig`, plus `az network route-table route list`, `route show`, `route update` (`Set-AzRouteConfig`) and `route delete` (`Remove-AzRouteConfig`). ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/manage-route-table))

- Associate or dissociate a table with `az network vnet subnet update` or `Set-AzVirtualNetworkSubnetConfig`; in the portal you set the subnet's **Route table** field, or **None** to remove the association. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/manage-route-table))

- For troubleshooting, `az network nic show-effective-route-table` and `Get-AzEffectiveRouteTable` list the effective routes of a network interface, and `az network watcher show-next-hop` with `Get-AzNetworkWatcherNextHop` reports the next hop type and route ID for a source/destination pair (requires Network Watcher). ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/manage-route-table))

- Route table work needs the **Network contributor** role or a custom role holding `Microsoft.Network/routeTables/read`, `Microsoft.Network/routeTables/write`, `Microsoft.Network/routeTables/delete`, `Microsoft.Network/routeTables/join/action`, `Microsoft.Network/routeTables/routes/read`, `Microsoft.Network/routeTables/routes/write`, `Microsoft.Network/routeTables/routes/delete`, `Microsoft.Network/networkInterfaces/effectiveRouteTable/action` and `Microsoft.Network/networkWatchers/nextHop/action`. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/manage-route-table))

- Next hop type names differ by tool: **Virtual network gateway** is `VirtualNetworkGateway`, **Virtual network** is `VNetLocal`, **Virtual appliance** is `VirtualAppliance`, plus **Internet**, **None** and `VirtualNetworkServiceEndpoint`. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

## Compare and choose

- UDR beats BGP route beats system route when prefixes are identical, so use a UDR for a deliberate static override and BGP for dynamic on-premises prefixes. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- Choose next hop type **Virtual appliance** to force traffic through a network virtual appliance firewall; you must supply the appliance's private IP address. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- Choose **Virtual network gateway** when the next hop must be the virtual network's gateway; this is supported only when that gateway is a VPN gateway, not an ExpressRoute, RouteServer or Virtual WAN hub router. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- Choose **None** to deliberately blackhole traffic to a prefix instead of forwarding it to any destination. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- Choose **Virtual network** to override default routing inside the virtual network, and **Internet** to send a prefix explicitly to the internet or to keep traffic to Azure services with public IPs on the Azure backbone. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- **Virtual network peering** and `VirtualNetworkServiceEndpoint` cannot be chosen as a UDR next hop type; Azure adds those routes itself when you configure the peering or the service endpoint. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- For the address prefix, prefer a service tag over explicit IP ranges to avoid chasing address changes; where both exist, the explicit prefix wins on exact match and the most specific (regional) service tag wins over broader tags. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- With an **ExpressRoute** gateway you cannot create UDRs that force traffic to the gateway itself, although you can use UDRs to force traffic coming from ExpressRoute to a virtual appliance. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- Keep gateway route propagation **Enabled** when you want the gateway's learned on-premises prefixes in the subnet; disable it to keep them out and reach on-premises via custom routes whose next hop type is **Virtual network gateway**. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

## Gotchas

- Never disable route propagation on **GatewaySubnet**; with it disabled the gateway does not function. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- Do not associate a route table containing a `0.0.0.0/0` route with the **GatewaySubnet** of a VPN-connected virtual network, because that can prevent the gateway from working. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/manage-route-table))

- Deploy a virtual appliance into a different subnet than the resources whose traffic it should inspect; same-subnet deployment combined with a route table can create routing loops where traffic never leaves the subnet. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- The next hop IP address must have direct connectivity without traversing an ExpressRoute gateway or Virtual WAN; a next hop without direct connectivity makes the UDR configuration invalid. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- Any network interface attached to a VM that forwards traffic to an address other than its own must have **Enable IP forwarding** turned on, and the guest OS may need forwarding enabled as well. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- If **Next hop IP address** shows **None** while **Next hop type** shows **Virtual network gateway** or **Virtual appliance**, the device is usually not running or not fully configured. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- A UDR for `0.0.0.0/0` with next hop **Virtual appliance** or **Virtual network gateway** also captures traffic destined for Azure service public IPs, unlike the default **Internet** route; enable service endpoints to keep that traffic on the backbone. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- Overriding `0.0.0.0/0` removes direct internet access to resources in the subnet; the appliance must be reachable from the internet, hold a public IP, have no NSG rule blocking it, and be able to NAT, forward or proxy inbound traffic. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- When a UDR shares a prefix with a system route, the system route turns **Invalid** while the UDR stays **Active**; that state is expected, not an error. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))

- You cannot delete a route table that is still associated with subnets; set the subnet's **Route table** to **None** everywhere first. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/manage-route-table))

- A route table can only be associated to subnets of a virtual network that lives in the same location and the same subscription as the route table. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/manage-route-table))

- Routes with a service endpoint next hop type can't be overridden by a route table, and the **Virtual network peering** and `VirtualNetworkServiceEndpoint` next hop types are only added for virtual networks created with the Azure Resource Manager deployment model. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview))
