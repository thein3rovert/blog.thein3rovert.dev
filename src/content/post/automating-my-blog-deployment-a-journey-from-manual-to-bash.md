---
title: "Automating My Blog Deployment: A Journey from Manual to Bash"
description: "My attempt at automating my blog deployment with bash scripting as a complete beginner, documenting all the mistakes, errors, and small wins along the way to finally getting ./deploy.sh to work."
publishDate: "21 June 2025"
tags: ["docker", "bash", "deployment", "automation"]
updatedDate: 21 June 2025
---

I've been manually deploying my blog for way too long, and honestly, it was getting tedious. After reading this great article about [From bash to github action](https://medium.com/bugbountywriteup/from-bash-to-github-actions-automating-ci-cd-for-a-real-world-saas-project-d89b251cd371), I got inspired to finally automate my deployment process. My plan is simple: start with bash scripting to learn the fundamentals, then eventually graduate to proper CI/CD pipelines.

## Starting Simple: My First Deployment Script

I'm currently using zsh, so my script will likely have some zsh syntax initially, but I'll make sure to keep it bash-compatible as I go. Here's what I came up with for my first attempt:

```bash
#!/bin/bash

# deploy.sh - This script is using for automating my personal blog deployment which is built with astro

set -e # Exit script on fail command  TODO: Print out a message on failed command

echo "Deployment Starting..."

git pull origin master # TODO: Add steps to choose branch types or automatically detect if its master or main

npm ci # Install dependencies ( Clean install )

npm run test #  Run test to make sure everything is good

# TODO: Check if the container is currently running
# and if it is terminate and build again

npm run build # Build the application by running the build script in the package.json

# Run database migration by running the migration script in the package.json ( I dont have one now so)
# Add option to select of migration script exit and if not echo a message
npm run migrate

pm2 restart all # Restart all application managed by Node process manager
```

Writing this script was actually pretty enlightening. I found myself adding TODO comments as ideas popped up - things like giving developers feedback on what's happening, handling different branch types, and checking if containers are already running. It felt natural to think through these edge cases as I was coding.

I also learned a few things while writing this. The `ci` in `npm ci` stands for "clean install" - I've probably used this command before but never really thought about what it meant. And `pm2` is a Node process manager, which was completely new to me.

## Reality Check: First Deployment Attempt

Of course, nothing ever works on the first try. I immediately hit this error:

```
zsh: ./deploy.sh: bad interpreter: /bin/bash: no such file or directory
```

Had to change the shebang to work with my system. Then the build failed because I don't actually have test scripts set up yet - there should definitely be a conditional check for that. Next, `pm2` wasn't installed, which made me realize I need better dependency checking.

But here's the thing that really clicked for me: my site is static! I'm doing static hosting with Docker, so I don't need pm2 at all - that's only for SSR or custom Node servers. The Docker container handles serving my static `dist` folder just fine.

## Iteration 2: Docker-Focused Approach

This realization led me to completely rethink my approach. Here's the updated script:

```bash
#!/usr/bin/env bash

# deploy.sh - This script is using for automating my personal blog deployment which is built with astro

set -e # Exit script on fail command  TODO: Print out a message on failed command

echo "Deployment Starting..."

git pull origin master # TODO: Add steps to choose branch types or automatically detect if its master or main

npm ci # Install dependencies ( Clean install )

# npm run test #  Run test to make sure everything is good

# TODO: Check if the container is currently running
# and if it is terminate and build again

npm run build # Build the application by running the build script in the package.json

# Run database migration by running the migration script in the package.json ( I dont have one now so)
# Add option to select of migration script exit and if not echo a message
# npm run migrate

# pm2 restart all # Restart all application managed by Node process manager ( Not needed for static files )

echo "Building application completed successfully"

echo "Stoping the running application..."

# Confirm is using sudo or user
sudo podman compose down

sudo podman compose up --build -d

echo "Deployment completed successfully"
```

Much cleaner! I commented out the parts I don't need and focused on what actually matters for my setup. But I still couldn't run this on my server because I needed more safety checks.

## Adding Safety and Flexibility

Running deployment scripts can be dangerous if you're not careful. I realized I needed two important safety measures:

1. **Branch verification** - Make sure I'm deploying from the right branch
2. **Root user safety** - Avoid running everything as root

Here's my final version with these improvements:

```bash
#!/usr/bin/env bash

# deploy.sh - Deploy Astro project with Docker Compose

set -e # Exit script on fail command  TODO: Print out a message on failed command

ALLOWED_BRANCH="master" # Branch used for deplyoment ( main or master)

# Get the current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Check the correct branch
if [ "$CURRENT_BRANCH" != "$ALLOWED_BRANCH" ]; then
  echo "You are on the branch '$CURRENT_BRANCH'. Please switch to '$ALLOWED_BRANCH' before deploying."
  exit 1
fi

echo "Now on the correct branch: $CURRENT_BRANCH"

echo "Deployment Starting..."

git pull origin "$ALLOWED_BRANCH"

npm ci # Install dependencies ( Clean install )

npm run build # Build the application by running the build script in the package.json

echo "Building application completed successfully"

echo "Stoping the running application..."

read -p "Use sudo for Docker Compose? (y/N): " USE_SUDO
COMPOSE_CMD="podman compose"
if [[ "$USE_SUDO" == [yY] ]]; then
  COMPOSE_CMD="sudo $COMPOSE_CMD"
fi

echo "Now using '$COMPOSE_CMD' "

$COMPOSE_CMD down
$COMPOSE_CMD up --build -d

echo "🚀 Deployment completed successfully"
```

The branch check is straightforward - it gets the current branch and compares it to what's allowed. If you're on the wrong branch, it stops you right there. No accidental deployments from feature branches!

The sudo prompt gives me flexibility. Sometimes I need root permissions for Docker operations, sometimes I don't. Rather than hardcoding it, I can decide at runtime.

## Success! First Automated Deployment

Finally ran the script on my server and got this satisfying output:

```
Stoping the running application...
Use sudo for Docker Compose? (y/N): y
Now using 'sudo podman compose'
🚀 Deployment completed successfully
```

That little rocket emoji at the end felt like such a win!

## What I Learned and What's Next

This whole process taught me a few things:

- **Start simple** - My first script shouldn't way more complex than needed
- **Understand your stack** - Realizing I needed Docker commands instead of pm2 was a game-changer
- **Safety first** - Branch checks and user prompts prevent costly mistakes
- **Iterate quickly** - Each failure taught me something valuable

I know this script is pretty basic, but I'm enjoying the learning process and don't want to overcomplicate things yet. There's obviously a lot more I could add but my goal is to learn gradually and understand each piece.

Next up, I want to explore some improvements to this script. Maybe add some logging, better error messages, or even a simple configuration file. Then eventually, I'll take what I've learned here and apply it to a proper CI/CD pipeline with GitHub Actions.

The journey from manual deployment to automation is pretty satisfying, even in these small steps. Every time I run `./deploy.sh` instead of remembering all those commands manually, I feel like I'm becoming a slightly better developer.
