---
title: "A Day Well Spent: Stabilising and Automating My Homelab"
description: "A weekend spent stabilising and automating my homelab.... Tailscale credential rotation, DNS as code with Terraform and Cloudflare, and a dedicated Kestra node."
publishDate: "25 october 2026"
tags: ["homelab", "tailscale", "terraform", "cloudflare", "kestra"]
---

Today, I decided to spend some time working on a few things in my homelab. And when I say a few things, I mean it has been a while since I last had the time to properly work on it.

Since resuming university, things have been quite hectic. Between university and working part-time at my company, most of my attention has been focused on those two commitments. I cannot lie, though; I miss my homelab.

Yesterday, Saturday, I went on a very long hike in Wendover with my hiking group. I mainly wanted to clear my head because the week leading up to Saturday had been a lot. I needed some time to free my mind and organise my thoughts. It was a 20-kilometre hike that took around five or six hours. It was tough, but also very therapeutic and helpful.

During the hike, I had time to think about my homelab and, more specifically, how I could improve and stabilise it.

My homelab is now over two and a half years old, and it has been one of the most important parts of my IT journey, if not the most important. Building one was a very good decision, and I am still surprised by how much it has grown over the years. Sometimes, it is almost scary to think about how far it has come.

However, not having enough time to work on it has made me realise some of its weaknesses that I might not have noticed when I had more free time. Some services experience significant downtime, several operations still require manual intervention, and many things that should be automated are not.

I think part of the problem is that I genuinely enjoy fixing things. When I had more time, I could jump into the homelab, troubleshoot an issue, make a few changes, and move on to the next thing. I did not mind dealing with all those little fixes because I had the time to do so.

Now, things are different. I have realised that I would rather automate many of these tasks so I no longer have to deal with them repeatedly. That would give me more time to focus on other things.

The biggest reason for this change is that some of the services running in my homelab have become essential to my daily life. I rely on them so much that I cannot comfortably go a day without them. Yet, I have been experiencing serious downtime, including with smaller services such as my bookmark manager, note-taking application, and a few other tools I use every day.

When something breaks, I sometimes have to wait until I get home before I can fix it and use the service again. That is not sustainable, especially when university and work keep me busy.

I realised that I cannot continue operating my homelab this way. I need to make it more stable and reliable.

So, this weekend, I decided to tackle a few things.

## 1. Automating Tailscale Credential Rotation

One of the most frustrating and unreliable aspects of my homelab has been Tailscale authentication key expiry.

Previously, I never really bothered automating credential rotation because I could always log into the Tailscale console, generate a new key, copy it, and update it on the relevant server. I did get frustrated with this process at one point, so I wrote an Ansible playbook to generate Tailscale authentication keys automatically.

However, that was only a partial solution. I mainly used the playbook when provisioning a new node. I had not really thought about what would happen when an existing key expired.

How could I automatically detect when a key was about to expire? How could I rotate it before it expired, without requiring me to intervene manually?

These were questions I had not properly addressed, even though expired Tailscale authentication keys were responsible for a significant amount of downtime in my homelab.

I decided it was time to fix this properly.

I improved my existing playbook and added automation to query my Tailscale environment for information about my nodes and their associated credentials. The process retrieves details such as the secret name, creation date, last updated date, and expiry date in JSON format.

The automation then checks whether any credentials are due to expire within the next 14 days. If it identifies a key approaching its expiry date, it automatically rotates the credential and updates it accordingly.

I also added a daily check that sends me a Discord notification containing information about the credentials, including their ages and expiry dates. This gives me visibility into what is happening without requiring me to manage the process manually.

I really enjoy building automations like this, and this particular project was also inspired by something I recently worked on at my current job.

I recently contributed to the end-to-end automation of credential rotation across different services, including GCP, Azure, Terraform, and GitHub. It was a substantial project, and working on it made me realise that I could apply the same principles to my own homelab.

So, I did exactly that.

It is satisfying to take something I have learned at work and apply it to my own infrastructure. More importantly, I have now reduced the amount of manual work required to keep my homelab running reliably.

## 2. Moving DNS Management to Infrastructure as Code

The second thing I worked on was DNS management.

This is something I have wanted to improve for a while. I have been gradually moving more of my infrastructure management towards Infrastructure as Code because it makes everything easier to track, maintain, and reproduce.

My domain registrar is GoDaddy, where I originally purchased my domain. Until now, I have also managed my domain's DNS records through the GoDaddy DNS interface.

Whenever I deployed a new service, I would log into the console and manually create an A record, CNAME record, or whatever else was required.

There is nothing inherently wrong with doing this manually, especially when you have the time. However, given how busy I have become, I wanted a better approach.

My first thought was to manage my DNS records directly through Terraform. Unfortunately, GoDaddy does not provide a straightforward, well-supported integration for the workflow I wanted, so I started looking at alternatives.

One option that made sense was Cloudflare.

The plan was to keep GoDaddy as my domain registrar while moving DNS hosting and management to Cloudflare. This would allow me to manage my DNS records through Terraform instead of manually creating and modifying them through a web interface.

I therefore migrated my existing DNS records, including A and CNAME records, to Cloudflare and began setting up Terraform to manage them.

What I like about this approach is that I can now create, update, and delete DNS records through code. I can also track changes alongside the rest of my infrastructure configuration, making it easier to understand what exists and how it is managed.

For me, that is one of the biggest benefits of Infrastructure as Code. It is not just about automation; it is also about having a clear, consistent, and maintainable way to manage infrastructure.

This was another useful learning experience, and it reminded me why I enjoy working on my homelab so much.

## 3. Improving and Scaling My Kestra Instance

The third thing I worked on was improving how I run Kestra in my homelab.

For those unfamiliar with it, Kestra is a workflow orchestration platform that I use primarily to automate infrastructure-related tasks. It can do much more than that, but infrastructure automation is my main use case.

I initially used n8n for some of these workflows. However, when I came across Kestra, I really liked its interface and the visibility it provides into workflow executions. I eventually decided to move towards Kestra instead.

At work, I have also used Ansible Automation Platform (AAP), which provides a way to manage, execute, and monitor Ansible playbooks. I wanted something similar for my homelab, but there is no freely available, open-source version of AAP that provides the same complete experience for homelab users.

So, I decided to use Kestra as my own automation orchestration platform.

In my homelab, Kestra mainly executes Ansible playbooks. These playbooks are pulled from GitHub at runtime and used to perform different tasks, including backing up sensitive data such as PostgreSQL data to a GCP storage bucket, collecting metrics and error logs from my Kubernetes cluster, sending data to my S3-compatible storage, and running my Tailscale credential rotation workflow.

It has become an important part of how I manage and automate my infrastructure.

However, I have been running into a problem: Kestra is quite resource-intensive, particularly when it comes to memory consumption. Since it runs on the JVM, it can require a substantial amount of memory, especially depending on the workload and configuration.

I decided to dedicate a separate node to Kestra rather than have it compete for resources with other services in my homelab.

For this, I repurposed an old laptop of mine called Marcos. It does not have much else to do, so I thought it would be a good fit for running Kestra and handling the orchestration of my workflows.

However, even after giving Kestra its own node, I still wanted to improve the execution process and reduce unnecessary overhead.

I therefore created a custom worker image containing the packages and tools required by my workflows. Instead of repeatedly downloading and installing these dependencies at runtime, the worker can reuse an environment that already has what it needs.

The architecture is now split across two machines. Kestra runs on Marcos, while its dedicated worker runs inside an LXC container on my Proxmox cluster.

This separation allows Kestra to handle workflow orchestration while the worker provides the environment needed to execute the jobs. It also helps avoid repeatedly installing the same dependencies for every execution.

The result is a setup that better fits the way I want to manage automation in my homelab: with a dedicated orchestration service and a reusable execution environment.

## Final Thoughts

Honestly, I got quite a lot done today, and I am glad I finally made the time to work on these things.

I think this is one of the biggest benefits of having a homelab. You can experiment with different tools, try out ideas, build systems that resemble enterprise environments, and learn from the problems you encounter along the way. You have the freedom to design things however you want, break things, fix them, and improve them as your needs change.

More importantly, my homelab has grown alongside me. The way I managed it when I first started was perfectly reasonable for the time, but my needs have changed. I now rely on it much more heavily, and I have less time available to maintain it manually.

That means I need to start thinking differently about how I operate it. Instead of constantly fixing individual problems, I need to build systems that prevent those problems from happening in the first place, or at least detect and resolve them automatically.

I suppose that is part of the journey: learning that building infrastructure is only one side of the equation. Keeping it reliable, reducing manual intervention, and making it easier to maintain are just as important.

Anyway, it was a productive and enjoyable day, and I thought I would share what I had been working on.

Have a good day!
