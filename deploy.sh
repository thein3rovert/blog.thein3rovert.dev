#!/usr/bin/env bash

# deploy.sh - This script is using for automating my personal blog deployment which is built with astro

set -e # Exit script on fail command  TODO: Print out a message on failed command

echo "Deployment Starting..."

git pull origin dev # TODO: Add steps to choose branch types or automatically detect if its master or main

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
# sudo podman compose down

# sudo podman compose up --build -d

echo "Deployment completed successfully"
