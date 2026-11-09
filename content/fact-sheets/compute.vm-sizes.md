---
skill: compute.vm-sizes
sources: 446dd3401570a7b3e02296d9d96df97dc5ef867b60432146359907baa796bc8a
built: 2026-11-09T20:48:33.536Z
---
# Manage virtual machine sizes

## Key concepts

- A VM size is one specific configuration of virtual CPUs, memory, storage and network bandwidth; Azure organizes sizes in three levels — **Type** (broad workload bucket), **Series** (sizes sharing similar hardware and features) and **Size** (the exact configuration). ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview))
- Azure splits sizes into workload-oriented types: General purpose, Compute optimized, Memory optimized, Storage optimized, GPU accelerated, FPGA accelerated and High performance compute. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview))
- Each size name encodes its features: family letter, subfamily letter, CPU vendor letter (`a` = AMD, `p` = ARM such as Microsoft Cobalt or Ampere Altra, and no CPU letter = Intel x86-64), then optional feature letters such as premium storage or included accelerators. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview))
- Most families are one letter but GPU families use two (`ND`, `NV`); a size name may carry zero, one or several extra feature letters; a version number appears only when a series has more than one version (first versions such as `HB` or `B` often omit it). ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview))
- Not every size has subfamilies, accelerator support or a stated CPU vendor, so a name alone does not prove a feature. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview))
- After creation you can scale a VM up or down by changing its size; this works whether the VM is running or already deallocated. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
- Deallocation is only required in some cases — typically when the target size is not offered on the hardware cluster that currently hosts the VM. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
- Any size change on a VM that is up and running restarts it, so a resize is a disruptive operation and needs special care for stateful workloads. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
- Deallocating the VM also releases any dynamic IP address assigned to it, while the OS and data disks are left untouched. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))

## Settings and limits

- Portal path to resize: open **Virtual machines**, pick the VM, then in the left menu under **Availability + scale** choose **size**, select a compatible size from the list and click **Resize**. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
- If the VM is still running and the size you want is missing from the list, stopping the virtual machine may reveal more sizes. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
- Failure behavior to remember: when a resize does not succeed, the VM model still reports the size you asked for, but the machine keeps running on its previous size until the new allocation completes. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
- Whatever the portal or a GET call shows you is the most recently applied configuration, not the size the VM is actually running at. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
- Resize limitation for temp disks: moving between a size that has a local temp disk and one that has none is supported for Linux VMs. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
- For Windows VMs only two resize combinations are allowed: size with local temp disk to size with local temp disk, and size with no local temp disk to size with no local temp disk. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
- Windows workaround for a missing temp-disk combination: snapshot the VM, create a disk from the snapshot, then create a new VM from that disk using a size that supports a local temp disk. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
- A SCSI-based VM cannot be resized to a remote NVMe-enabled VM size; a dedicated workaround article covers that migration. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
- Premium Storage requires the `s` version of a size — pick `Standard_E4s_v3` rather than `Standard_E4_v3`. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
- Discover which sizes a region sells with `az vm list-skus --location <region> --output table`. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview))
- SKU discovery is also exposed over REST: one call enumerates the sizes a given VM can be resized to, another (`resources/skus`) returns every SKU available to a subscription, and a third lists the sizes usable inside an availability set. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview))
- Regional availability is also published under "Products available by region", and overall VM limits sit under "Azure subscription and service limits, quotas, and constraints". ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview))
- Scope difference between the two articles: the sizes overview applies to Linux VMs, Windows VMs, Flexible scale sets and Uniform scale sets, while the resize how-to applies to Linux VMs, Windows VMs and Flexible scale sets. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))

## Compare and choose

- CPU-heavy workload such as a database server or high-traffic web server → more CPU cores → Compute optimized sizes (F-family, FX-family). ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
- Memory-heavy workload such as a machine learning model or big data application → more memory → Memory optimized sizes (E, Eb, EC, M families). ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
- Short on storage capacity, or needing heavy disk throughput and IO for Big Data, SQL/NoSQL, data warehousing and OLTP databases (Cassandra, MongoDB, Cloudera, Redis) → Storage optimized sizes (L-family). ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
- Even CPU-to-memory balance for dev and QA work, small and mid-sized databases, and web servers with light or moderate traffic → General purpose (A-family entry-level economical, B-family burstable, D-family enterprise-grade plus relational databases, in-memory caching and data analytics, DC-family for confidential computing). ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview))
- Compute-intensive, graphics-intensive or visualization workloads → GPU accelerated sizes: NC (compute/graphics/visualization), ND (same but with large memory), NG (Virtual Desktop Infrastructure and cloud gaming), NV (VDI, single-precision compute, video encoding and rendering). ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview))
- Field-programmable workloads such as machine learning inference, video transcoding, database search and analytics → FPGA accelerated NP-family sizes. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview))
- HPC workloads: HB for high memory bandwidth (fluid dynamics, weather modeling), HC for high density compute (finite element analysis, molecular dynamics, computational chemistry), HX for large memory capacity and Electronic Design Automation. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview))
- Memory optimized variants differ by feature: Eb is E with high remote storage performance, EC is E with confidential computing; M covers extremely large databases and very large memory. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview))
- Selection helpers: the Azure VM Selector matches workload type, OS and software and deployment region; pricing is on the Linux/Windows VM pricing pages and the Pricing Calculator. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview))
- Instead of only scaling up, scale out by running multiple VM instances; Virtual Machine Scale Set autoscaling is referenced for that purpose. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))

## Gotchas

- An unsuccessful resize leaves the portal and every GET reporting the requested size while the VM actually runs on the old one — verify the outcome instead of trusting the displayed value. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
- Resizing a running VM restarts it; treat every resize as planned downtime for stateful workloads. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
- Deallocation as part of the resize releases the dynamic IP address, so re-check addressing afterwards; OS and data disks are unaffected. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
- Not every size is offered in every region, and the running VM's hardware cluster can hide sizes — verify with `az vm list-skus --location <region> --output table` or the region availability list first. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview))
- Choosing a non-`s` size for a VM that uses Premium Storage silently loses premium storage support — always take the `s` version. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
- The classic Windows trap: you cannot resize a Windows VM from a size with a local temp disk to one without (or the reverse) directly; use the snapshot → disk → new VM workaround. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
- A SCSI-based VM cannot be resized straight to a remote NVMe-enabled size, which blocks some seemingly valid upgrade paths. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
- HC-series (including `Standard_HC44rs`, `Standard_HC44-16rs`, `Standard_HC44-32rs`) is retiring on May 31, 2027; afterwards remaining HC VMs are deallocated, stop running and lose SLA and support, and 1-year and 3-year Reserved Instance sales ended on April 2, 2026 — for new deployments consider HBv5-series or HX-series. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview))
- Every family also lists "End of Life" series; prefer current-generation sizes rather than retired ones when choosing or resizing. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview))
- The sizes overview covers Uniform scale sets as well, but the resize how-to targets Flexible scale sets only — check which scale set model you are working with. ([Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm))
