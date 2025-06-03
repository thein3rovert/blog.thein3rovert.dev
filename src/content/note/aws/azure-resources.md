---
title: 02 Azure Resources
description: Continuing the Azure course, this note delves into Azure resources, explaining the concept of resources, resource groups, and the Azure Resource Manager. It covers best practices for organizing resources for effective management and tracking.
publishDate: "2025-04-07T00:00:00Z"
---


## What are Azure Resources?

When you create a service in Azure, you always get a **resource** back that you can either use yourself or provide to developers who need it.

In cloud terminology, anything you create on Azure is called a **resource**:
- Virtual machines = resources
- Databases = resources
- Storage accounts = resources

> [!info]
> **Key Concept**: A resource is an instance of a service
>
> What you see in the UI or CLI are called **services**, but when you create them, they become **resources**.

## How Resources are Created

When you create a service (e.g., a Ubuntu virtual machine):

1. You provide specific properties/parameters for that VM
2. When you click "Create", Azure takes all those details
3. Azure passes the parameters to the **Azure Resource Manager**

> [!info]
> **Azure Resource Manager** is responsible for creating the resources you request based on your provided parameters.

For example, if you're creating a Linux virtual machine, the Resource Manager will provision that VM according to your specifications.

## Resource Groups

**Resource Groups** are logical containers that group related resources together. Azure provides this functionality to help users organize and manage multiple resources efficiently.

### Examples of grouping:
- Virtual machines + databases + storage for a single project
- All resources used by a specific team or department

> [!info]
> **Definition**: A Resource Group is a combination of related resources

## Why Group Resources?

### Benefits of Resource Grouping:

**Better Management & Tracking**
- Example: A company has three teams (Finance, UI, Payment), each using different Azure services
- By grouping resources by team, you can easily monitor and track each team's resource usage

**Modular Resource Management**
- Improved access control and permissions
- Enhanced security management
- Better auditing capabilities
- Simplified cost tracking
- Streamlined resource lifecycle management

## How to Group Resources

### Common Grouping Strategies:

1. **By Team/Department**: Group resources used by specific teams
2. **By Project and Environment** (Industry Best Practice):

**Example: Payment Team Structure**
```
Project: Payment System
Environments: Development, QA, Production

Resource Groups:
├── payment_dev
├── payment_qa
└── payment_prod
```

This approach creates separate resource groups for each environment within a project, enabling:
- Environment-specific access controls
- Independent scaling and management
- Clear cost separation
- Simplified deployment pipelines

## Important Resource Group Rules

> [!warning]
> **1:1 Relationship**: Each resource can only belong to **one** resource group at a time. You cannot have a resource in multiple resource groups simultaneously.

## Key Takeaways

- Resources are instances of Azure services
- Azure Resource Manager handles resource creation
- Resource Groups provide logical organization
- Group by project and environment for best practices
- Each resource belongs to exactly one resource group
