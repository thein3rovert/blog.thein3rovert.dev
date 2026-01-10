---
title: "Optimizing todo for AI workflow"
description: "Optimizing my ticket creating workflow"
publishDate: "27 December 2025"
tags: ["ai", "automation"]
updatedDate :"30 December 2025"
---

I maintain a `now.txt.md` note in Obsidian where I capture all my daily ideas and tasks. I built an n8n workflow that reads this note and uses GitHub Copilot CLI to automatically create tickets from my TODOs. The problem was that I was sending the entire note every time, which sometimes contains hundreds of words of context that wasn't needed. This approach meant higher API costs and, worse, creating duplicate tickets when Copilot encountered the same tasks it had already processed.

You might be wondering why I even want to automate this process. I think automating ticket creation from notes removes the friction between having an idea and getting it tracked in my project management system. But I had some concerns. Sending large notes repeatedly to AI services was getting expensive. Without tracking what had been processed, I kept getting duplicate tickets. And sometimes I wanted to reprocess old dates or extract specific days, but my workflow wasn't flexible enough for that.

## My Initial Solution

I needed a bash script that could extract just the `## Tasks` section from my note instead of passing everything. Simple enough... but the real challenge was preventing duplicates while maintaining flexibility.

## What I Built

The solution evolved into a smart extraction script with state tracking. Here's how it works:

```zsh
#!/usr/bin/env zsh

# Extract specific date
./extract_todos.sh now.txt.md --date 2025-12-27

# Extract only new dates (default)
./extract_todos.sh now.txt.md

# Extract everything
./extract_todos.sh now.txt.md --all

# Reset state
./extract_todos.sh now.txt.md --reset
```

The script identifies dates in `YYYY-MM-DD` format and extracts everything under each date until the next date appears. So if I have a note structured like this:

```markdown
## Tasks

2025-12-11

- [x] Completed task
- [ ] Incomplete task

2025-12-22

- [ ] Another task
  > Additional context
```

The script tracks which dates have been processed in a `.processed` file to avoid duplicates. The first time I run it, it processes all dates. The second time, it only processes new dates and won't reprocess the dates from December 11th and 22nd:

```zsh
# First run: processes all dates
./extract_todos.sh now.txt.md | gh copilot suggest

# Second run: only processes new dates
./extract_todos.sh now.txt.md | gh copilot suggest
```

If I need to reprocess an old date, I can use the `--date` flag:

```zsh
./extract_todos.sh now.txt.md --date 2025-12-11
```

## What Didn't Work

My first attempt didn't go too well. I only extracted incomplete tasks and filtered out completed ones along with their notes. I quickly realized this wasn't giving me the full picture. I wanted the complete context of each day, including what I'd accomplished and any notes I'd attached to tasks. The incomplete tasks by themselves didn't tell the whole story.

## What Did Work

The final approach extracts entire date sections while maintaining a simple state file. The script uses AWK to parse the markdown structure:

```zsh
awk '
/^## Tasks/ { in_tasks=1; next }
/^## / && in_tasks { exit }
in_tasks && /^[0-9]{4}-[0-9]{2}-[0-9]{2}/ {
    if (current_date && content) {
        print current_date
        print content
    }
    current_date=$0
    content=""
    next
}
in_tasks && current_date {
    if (content) content = content "\n" $0
    else content = $0
}
' now.txt.md
```

Now my workflow feels much more natural. I jot down ideas in `now.txt.md` throughout the day, run the extraction script when I'm ready to create tickets, and only the new date sections get sent to GitHub Copilot CLI. No more duplicate tickets, much lower API costs, and I can still go back and reprocess specific dates when I need to. The friction between capturing an idea and having it tracked properly is almost gone. 4. Tickets are created without duplicates 5. API costs stay minimal

The script respects my note format (which I didn't have to change), tracks state automatically, and gives me control when I need to reprocess specific dates. Simple, effective, and cost-efficient.
