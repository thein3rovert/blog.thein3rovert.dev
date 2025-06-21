#!/usr/bin/env bash

# deploy.sh - This script is using for automating my personal blog deployment which is built with astro

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

read -p "Use sudo for Docker Compose? (y/N): " USE_SUDO
COMPOSE_CMD="podman compose"
if [[ "$USE_SUDO" == [yY] ]]; then
  COMPOSE_CMD="sudo $COMPOSE_CMD"
fi

echo "Now using '$COMPOSE_CMD' "

# $COMPOSE_CMD down
# $COMPOSE_CMD up --build -d

echo "🚀 Deployment completed successfully"
