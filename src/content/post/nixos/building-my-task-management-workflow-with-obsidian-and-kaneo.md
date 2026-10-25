---
title: "Building My Task Management Workflow with Obsidian and Kaneo"
description: "Cycling through todo systems until something sticks.... Obsidian as the source of truth, a small extraction script, an AI agent for the boring parts, and Kaneo for the project view."
publishDate: "26 june 2026"
tags: ["obsidian", "kaneo", "productivity", "automation", "ai"]
---

I do a lot of things at the same time. That's not a brag; it's closer to a design flaw.

I usually have multiple projects running simultaneously, and every single one of them is interesting enough that I want to work on all of them. The problem is that my todos end up scattered across different places faster than I can keep track of them. Eventually, I stop looking at the list altogether because it becomes too noisy to be useful.

Over the past year, I've tried a few different approaches to managing this. Each one solved a problem but introduced another. I've been trying to find something that gives me a clear view of everything I'm working on without adding another layer of work just to maintain the system.

Here's where I've landed so far, and why I think this approach might actually stick.

## Everything in One File

My first proper system was simple: a single `Now.md` file in Obsidian, with todos organised under dates. Nothing complicated. Every morning, I would open it and see everything I needed to do.

It worked well in the sense that I knew what was going on, but it was terrible when it came to understanding which project each task belonged to.

I'd scan a list of twenty items and mentally sort them into their respective projects, reading each description to figure out the context. It worked, but it was exhausting.

The obvious solution was to introduce tags. Adding something like `#homelab` or `#ptta` to each todo would make it easier to separate tasks by project.

However, tagging every todo as I wrote it introduced friction. Sometimes I'd forget to add a tag. Other times, I'd spend more time deciding which tag to use than actually writing the task down.

It helped, but the process wasn't seamless enough to become a lasting habit.

## Linear and the Automation Trap

At some point, I decided to build a more complete system around this problem.

I created a workflow where an AI agent would scan my Obsidian notes, extract todos, and push them to Linear through its API. It handled things like status mapping, labels, and project assignment. The whole process was automated, and I even [wrote about it](https://blog.thein3rovert.dev).

For a while, it was exactly what I wanted. Everything was separated into projects, properly categorised, and easy to view. I finally had the organisation I had been missing.

Then I hit Linear's free-tier limit of 250 issues.

I could have paid for a subscription. Linear is genuinely a good product, and I'd recommend it to anyone looking for a proper project management tool. But I've been trying to cut down on subscriptions, and adding another one just for personal task management didn't sit right with me.

So, I let it go and returned to Obsidian, trying to figure out how I could recreate that project separation without relying on Linear to do the heavy lifting.

## The SecondBrain Approach

My next attempt was to create a folder in Obsidian containing separate, initially empty files for each project.

Inside each file, I kept the same date-based format I had used in `Now.md`, but with an extra layer of organisation.

For example:

```
# May

## 2026-05-15
- [ ] Set up VLAN change workflow
- [x] Fix SSH node parameter passing

## 2026-05-14
- [ ] Review ServiceNow webhook retry logic
```

Each file belonged to a particular project, with months as top-level headings, dates as subheadings, and todos underneath.

Obsidian makes navigating this surprisingly easy because you can jump between headings within a file, regardless of how large it becomes.

I've been using this system for a while now, and it works well. Every project has its own file, and every file maintains its own history. I know exactly where to look for something without having to mentally sort through a flat list of unrelated tasks.

However, there was still something missing.

I missed having a proper project management view. I wanted to see task statuses at a glance, filter by labels, and move tasks between columns. Having a collection of Markdown files in a folder is useful, but it doesn't give me the visual overview of a project board.

I had solved the organisation problem, but I still wanted a better way to interact with the tasks themselves.

## Discovering Kaneo

A few days ago, I was scrolling through LinkedIn when I came across someone talking about a project they had been building.

It looked a bit like Linear, but simpler and cleaner. It was also open source and self-hostable.

I decided to check it out, and it turned out to be exactly the kind of thing I had been looking for.

[Kaneo](https://kaneo.app) is an open-source project management tool that supports a REST API and MCP. I could run it on my homelab server, import issues, apply labels, and organise everything into projects.

Essentially, I could get the project management experience I liked about Linear without adding another subscription to my list.

I commented on the LinkedIn post, and the maintainers confirmed the API and MCP support. That was enough to get me interested, and I started building the integration that same evening.

## The Script That Does the Heavy Lifting

My first instinct was to use an AI agent to search my Obsidian vault and extract todos directly.

However, my vault has grown considerably over the years. It contains hundreds of notes and thousands of lines of text, including journals, project notes, meeting notes, and other information.

Having an agent crawl through everything just to find a handful of todos seemed wasteful. It would consume tokens, take longer than necessary, and could still miss things.

So, I decided to approach the problem differently.

Instead of asking the agent to figure everything out, I wrote a script to handle the extraction and formatting. The agent only needs to run a single command:

```
./extract_todos.sh --last 7 --output json
```

The script searches through my SecondBrain folder and daily journal, identifies the relevant date sections from the past week, extracts the todos, and formats them into the JSON structure expected by Kaneo's import endpoint.

It also handles labels, project assignments, and status mapping.

Once the script has done its job, the agent simply takes the output and uploads it to Kaneo.

I like this approach because each component has a clear responsibility. The script handles the predictable work of parsing Markdown and structuring the data, while the agent handles the integration with Kaneo.

This is something I've been thinking about more generally when building automation with AI agents. Rather than building everything _with_ AI and hoping the agent figures out the details, I've been trying to build systems _for_ AI to work with.

Give the agent structured, well-defined inputs, limit the scope of what it needs to understand, and let it focus on the part where it is actually useful.

The script does the parsing. The agent does the uploading. Neither needs to take on the other's job.

For me, that makes the whole system easier to reason about, maintain, and improve.

## Handling Duplicates

One problem I still have to deal with is duplicate tasks.

Imagine writing a todo today, not finishing it, and copying it into tomorrow's journal. You might even rephrase it slightly. Before long, the same task appears in multiple places.

If I simply extracted every todo and uploaded it, I would end up creating duplicate issues in Kaneo.

For now, I've kept things simple by limiting the extraction window to the previous seven days. This reduces the amount of data the agent has to process and makes it easier to identify potential duplicates before uploading them.

It also helps reduce the problem of old, unfinished tasks accumulating indefinitely.

From my initial observations, this seems to eliminate a large proportion of the duplicates I encounter, although I still need to test the approach over a longer period.

Eventually, I may need a more reliable deduplication mechanism, perhaps one that compares task descriptions or tracks which todos have already been imported. For now, I'm happy to start with something simple and improve it as I discover where the actual problems are.

## Final Thoughts

I'm still building this out, so I won't pretend to have a complete retrospective just yet. I want to let the system run for a couple of weeks before deciding what works, what doesn't, and what needs to change.

However, the overall design feels right.

I have Obsidian as my source of truth for notes and daily todos, a script that extracts and structures the tasks, an AI agent that handles the synchronisation, and Kaneo providing the project management interface I've been missing.

Everything runs on my own infrastructure, and I don't have to pay for another subscription just to manage my personal projects.

More importantly, I'm not trying to replace my existing workflow with an entirely new one. I'm building on top of the tools I already use and adding just enough structure to make them work better together.

I think that's what I enjoy most about building things like this. Instead of forcing myself to adapt to someone else's idea of how a workflow should operate, I can experiment until I find something that fits the way I actually work.

I'll share more once the system has been running for a couple of weeks and I have a better idea of how well it holds up.

If you've found yourself cycling through productivity tools the way I have, perhaps the answer isn't always another subscription or a more complicated system. Sometimes, it's building something small that solves the specific problem you're dealing with.

It might take less time than you think.

Have a good day!