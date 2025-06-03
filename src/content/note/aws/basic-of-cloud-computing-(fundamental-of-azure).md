---
title: 01 Fundamentals of Azure
description: This note is part of a course on Azure, covering essential cloud computing concepts such as server management, cloud types, virtualization, APIs, regions, load balancing, and key features like scalability and high availability.
publishDate: "2025-04-06T00:00:00Z"
---

Necessary concept to understand before starting cloud, these concept are very important and can be reusable in  any cloud.

- Server is a computer that has some local storage,use less cpu, less ram, it helps to run application or processes..for example a Linux machine can be a server or a small laptop can also be a server.
- System Admin manages multiple server like creating the server,setting up the server and connecting them to router.
> - Challenges of server
> 1. Has to be up 24.7
> 2. Overhead
> 3. Maintenance

Due to the challenges of server AWS comes into place to help those running on a private cloud.
They decided to setup data centres globally. Example:
> - 5 data centre us
> - 2 data centre india
> - 3 data centre uk

- Public cloud is the process of making server(vm) available to users globally regardless of the location.
- Private cloud is the process of setting of racks of server locally in a secure location cannot be use by other company only the company where is it setup.
![[01-Basic of cloud computing - Fundamentals of Azure-1743904541678.png|497x244]]
Some company still run private cloud because of security reasons, for example Banking company, financial company mostly legacy company.

- Hybrid Cloud is the mixture of private cloud and public cloud
- ![[01-Basic of cloud computing - Fundamentals of Azure-1743905038578.png|448x284]]
### What is cloud computing
In basic term it mean the process of running an application on a cloud server or performing task on a cloud server.
### Vocabulary
- Virtualisation: This is the process of using hypervisor as a form of virtualisation basically allowing multiple users to make use of a server.
Basically the process of having multiple users make use of one server by making use of hypervisor which can also be called virtual machines.
![[01-Basic of cloud computing - Fundamentals of Azure-1743939881279.png]]

- API: An API is a form of accessing an application pro grammatically, this is mostly done by developers and engineers that want to perform some programming on the application.
- Regions and Availability zone: Availability zone is a data center in a location while region are places in the world that contains the data centre.
We can have more than one region in a country only, can have a east-region, west-region, south-region in the us..so let say one region goes down in the us, the other up and running region can handling the workload will the faulty data centre is been fixed.
- Load Balance: This helps to balance or share the traffics coming between diff servers. The advantage of load balance is the split the request load between difference server replicas and if a server goes down it knows to stop sending request to that server.

### Features of Cloud Computing
-  Scalability: This is the idea of making sure a sever to handle as many users possible, in case where thy is a spike is request in an application scalability is to make sure that the server can scale automatically according to the request. This is mostly done using auto scaling there are many other options but in cloud it is called auto scaling. It is called automatically because it is done automatically and if it is done manually it is called manual scaling.
We also have some other concept called horizontal calling or vertical scaling but we will come to that later.
![[01-Basic of cloud computing - Fundamentals of Azure-1743941476316.png]]

- High availability: This means making the application available most of the time for example Instagram, Facebook.
- Disaster Recovery (DR): This a mechanism where have a actionable gplan to recover from a disaster when an application goes down basically it means having a backup plan for when a server goes down.
## Resources
[[Azure Concepts PKM]]
https://github.com/iam-veeramalla/Azure-zero-to-hero
