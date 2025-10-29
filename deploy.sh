#!/usr/bin/env bash

# === This script is using for automating my personal blog deployment which is built with astro ===

# === Exit script on fail command. TODO: Print out a message on failed command ===
set -e

# === Branch used for deployment (main or master) ===
ALLOWED_BRANCH="master"

# === Get the current branch ===

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
# CURRENT_BRANCH=$ALLOWED_BRANCH

# === Check if on the correct branch ===
 if [ "$CURRENT_BRANCH" != "$ALLOWED_BRANCH" ]; then
   echo "You are on the branch '$CURRENT_BRANCH'. Please switch to '$ALLOWED_BRANCH' before deploying."
   exit 1
 fi

 echo "Now on the correct branch: $CURRENT_BRANCH"

echo "Deployment Starting..."


git pull origin "$ALLOWED_BRANCH"

# === Install dependencies (Clean install) ===
npm ci

# === Run test to make sure everything is good ===
# npm run test

# === TODO: Check if container is running and terminate if needed before rebuilding ===

# === Build the application using package.json build script ===
npm run build

# === Run database migrations (Not implemented yet) ===
# === Add option to select migration script exit and echo message if none ===
# npm run migrate

# === Restart all PM2 managed applications (Not needed for static files) ===
# pm2 restart all
echo "Building application completed successfully"

read -p "Use sudo for Docker Compose? (y/N): " USE_SUDO
COMPOSE_CMD="podman compose"
if [[ "$USE_SUDO" == [yY] ]]; then
  COMPOSE_CMD="sudo $COMPOSE_CMD"
fi

echo "Now using '$COMPOSE_CMD' "
echo "Stoping the running application..."
$COMPOSE_CMD down

echo "Building and Restarting the applicationn"
$COMPOSE_CMD up --build -d

echo "🚀 Deployment completed successfully"
