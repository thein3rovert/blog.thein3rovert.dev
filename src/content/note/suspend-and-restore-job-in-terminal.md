---
title: Suspend and Restore Background Job and Foreground in shell
description: How to pause and resume foreground and background jobs in the shell.
publishDate: "2025-06-15T10:55:00Z"
---

The following commands are used for pausing and resuming foreground and background jobs in the shell.

I didn't want to use the commands directly, so I created an alias for easier use.

```sh
# Alias to suspend the shell
alias suspend='kill -TSTP $$'

# Alias to bring the last suspended job to the foreground
alias restore='fg'
```

*Update:*
The alias didn't work as expected, so let's stick to running the commands directly:

```sh
CTRL+Z # Suspend
fg     # Restore
```

After suspending, you will see something like this:
![Alt text](/suspend_and_append.webp)

You can continue doing other tasks in the terminal while it's suspended. When you're done and want to restore, just use the `fg` command to bring the job back to the foreground.

This is particularly effective when working with Neovim.

Credit: *Sylvan Franklin* on YouTube.
