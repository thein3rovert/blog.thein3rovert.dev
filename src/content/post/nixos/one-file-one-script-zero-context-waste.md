---
title: "One File, One Script, Zero Context Waste"
description: "For months my AI agent had no idea what I'd been doing.... One file, one bash script, zero context waste."
publishDate: "03 may 2026"
tags: ["obsidian", "ai", "bash", "productivity"]
---

**UPDATE 2026-10-25:** I've stopped using this workflow..haha..time flies..it was great while it lasted. I now use backlog.md which i will write a post about it soon.


For the past few months I've been wrestling with a problem that sounds trivial until you actually live with it: my AI agent has no idea what I've been doing. Every time I ask "what's going on with the Meraki workflow?" or "what didn't I finish last week?", it goes hunting through my Obsidian vault like someone flipping through a stranger's filing cabinet. It loads everything. Old thoughts, random debugging notes, that one time I rambled about Kubernetes for three paragraphs. It all goes into context.

That's expensive in tokens, sure. But the real cost is the noise. By the time the agent has waded through 500 lines of my brain dumps, the signal is buried. I'd get answers that missed the point, hallucinated completions, or just gave me a vague summary that felt like it came from someone who skimmed my notes rather than actually read them.

I knew the file was only going to get bigger. Every day I add more. Loading all of it forever wasn't just wasteful....it was going to break. I needed the agent to get exactly what it needed and nothing else. And I didn't want to solve this by splitting my notes into twenty tiny files. I've been down that road. It doesn't last.

## How I Got Here

I looked at how I was already writing. Not how I thought I should write, or how a productivity system told me to write. Just...how I actually showed up and dumped my thoughts into a file at the end of the day.

Every entry sat under a date. That was the pattern. I had month headers grouping things visually, and under each month, daily entries tagged inline with whatever project or status felt right in the moment:

```
# May
## 2026-05-03
- need to build the end-to-end vlan change demo for tomorrow #cisco/todo
- issue has been fixed, was reading header offsets wrong #cisco/fixed
- I am thinking the atomics aren't using the parent target group properly #cisco/thoughts
```

No separate tag section. No frontmatter beyond the bare Obsidian fields I already used. Just me, writing like I talk, with hashtags sprinkled in where they made sense.

The realization hit me while I was staring at the file: dates are an index. If every entry lives under a predictable `## YYYY-MM-DD` header, then bash can parse this like a database. `sed` can grab a date range. `awk` can stop at the next header. I don't need a vector search or a knowledge graph. I just need a few well-placed grep commands.

## The Script

I didn't want a Python script with dependencies. I didn't want to think about virtual environments or package managers for something this simple. Bash is already on my machine. `awk` and `sed` have been there since before I knew what a terminal was. Ripgrep is the only extra, and I already had it installed.

The whole thing is 90 lines:

```bash
# what did I do today?
./memory.sh --file "Everything ~ Network.md" --today

# what was I working on this past week?
./memory.sh --file "Everything ~ Now.md" --week

# what cisco todos are still open?
./memory.sh --file "Everything ~ Network.md" --tag "#cisco/todo"
```

Under the hood it finds the date header you asked for, prints everything underneath until it bumps into the next date, and stops. That's the entire algorithm. For the week query it grabs the last seven dates from the file and loops through them. For tags it delegates to `rg` which screams through even enormous files without breaking a sweat.

The agent runs one command, gets back thirty lines instead of five hundred, and answers my question from that. Token waste drops to nearly nothing. The hallucination problem gets better by default because there's simply less irrelevant context to confuse things.

## Teaching It to Read Between the Lines

Extracting the right text was only half the problem. I also needed the agent to understand what it was looking at. I don't religiously use `- [ ]` checkbox syntax. Sometimes I do, but most of the time my entries read like normal sentences: "I need to fix the python script" or "issue has been fixed."

So rather than forcing myself into a checkbox habit (which I knew I'd abandon within a week), I baked some lightweight heuristics into the agent's instructions. "Need to" and "going to" mean pending. "Fixed" and "done" mean completed. "I am thinking" or "maybe" means it's just a thought, not an action. Combine that with the inline tags and the agent can now look at a week of entries and tell me: here's what's still open, here's what got closed, and here's what you were just musing about.

I didn't change how I write. I taught the agent how I write instead.

## Why This Stuck

I've lost count of the productivity systems I've tried. Bullet journals that lasted three weeks. PARA folders that grew into a maze of nested vaults I stopped navigating. GTD setups that turned maintaining the system into more work than the work itself. Every single one collapsed under its own weight because the friction of upkeep eventually outweighed the benefit of organization.

This isn't a system. It's a convention. One file per project. Dates as headers. Tags inline. A bash script that knows how to read it. There's nothing to maintain because there's nothing to break.

The file is human-first. I open it in Obsidian and it looks exactly like a normal daily log. No weird syntax I have to remember. No metadata blocks I'll forget to update.

The query layer is machine-first. The agent doesn't read my notes....it queries them. It treats my file like a database because the structure is predictable enough to be queried like one.

I think that's the part I've been chasing without realizing it: a format that serves both audiences equally. Me, the human who just wants to type and move on. And the agent, the machine that needs to pull out exactly what's relevant without drowning in everything else. It shouldn't have been this hard to find. But I'm glad I did.

It took about an hour to build. I'll probably use it for the next ten years.