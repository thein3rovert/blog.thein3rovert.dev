---
title: "Deploying my personal blog using  Docker and Traefik"
description: "Deploying my Astro blog using Docker with nginx - figuring out static vs dynamic builds, Docker configuration, and Traefik integration challenges along the way."
publishDate: "28 May 2025"
tags: ["docker", "traefik", "deployment"]
updatedDate: 28 May 2025
---

I'm at a stable phase in development of my personal blog and want to deploy it to my server with Docker. I chose Docker because it's easier for me to deploy Docker images on my server, and I can easily connect it with Traefik, add load balancers, and monitor it. Also, I don't know other deployment methods yet, so for now, this is what I need to get my blog up and running.

## Pre-deployment Research

### Static vs Dynamic Site Detection

Before deployment, I needed to check if my blog is static or dynamic. Based on blog posts I read, a dynamic Astro site requires a different build process - you need to install adapters like enabling SSR with Node.js using the Node.js adapter.

For dynamic sites, you'd need to install the adapter:

```sh
npx astro add node
```

This adjusts your `astro.config.mjs` file. Since I don't have this file in my project folder, my site is static, so I don't need to worry about SSR configuration.

**Reference**: [Astro.js Docker deployment guide](https://deployn.de/en/blog/astrojs-docker/#the-tools-preparing-your-development-environment)

For a static site, all I need to do is:

```sh
npm run build
```

This builds my project and generates a `dist` folder containing everything needed to deploy the blog anywhere - no Node.js server required at runtime.

### Docker + Nginx Strategy

Most examples I found show nginx configuration but not Traefik integration. Since I don't know much about nginx yet and don't want to fall into another rabbit hole, I needed to find a Docker-based solution.

**Key insight**: I don't need to install nginx on my system. The nginx in the Dockerfile runs completely inside the container. Docker pulls the nginx image and runs it in the container, while Traefik handles the reverse proxy to my containerized nginx instance.

## Docker Configuration

### Dockerfile

I used a multi-stage build approach:

```dockerfile
# Dockerfile (for static site)

# ---- Build Stage ----
# Use an official Node.js image as the base for building
# 'alpine' versions are smaller
FROM node:22-alpine AS builder
# Set the working directory inside the container
WORKDIR /app

# Copy package.json and lock file first to leverage Docker cache
COPY package*.json ./
# Install project dependencies
RUN npm install

# Copy the rest of the application code (respects .dockerignore)
COPY . .
# Build the Astro site for production
RUN npm run build
# The static files are now in /app/dist

# ---- Runtime Stage ----
# Use an official Nginx image as the base for serving
FROM nginx:1.27-alpine AS runtime
# Set the working directory for Nginx files
WORKDIR /usr/share/nginx/html

# Remove default Nginx welcome page
RUN rm -rf ./*

# Copy the built static files from the 'builder' stage
COPY --from=builder /app/dist .

# Copy our custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (standard HTTP port)
EXPOSE 80

# Command to run Nginx in the foreground when the container starts
CMD ["nginx", "-g", "daemon off;"]
```

### Initial Docker Compose with Traefik

Here's my initial Traefik configuration:

```yaml
version: '3'
services:
  astro:
    build: .
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.astro.rule=Host(`your-domain.com`)"
      - "traefik.http.services.astro.loadbalancer.server.port=80"
    networks:
      - traefik-public

networks:
  traefik-public:
    external: true
```

### Adapted Configuration

I found a reference configuration and adapted it for my needs:

```yaml
services:
  astro-app:
    build:
      context: .
      dockerfile: Dockerfile
    image: my-astro-project:latest
    container_name: my-astro-container
    ports:
      - "8080:80"  # Changed to 8080 to avoid conflicts with other services
    restart: unless-stopped
    networks:
      - traefik-public
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.astro.rule=Host(`your-domain.com`)"
      - "traefik.http.services.astro.loadbalancer.server.port=80"

networks:
  traefik-public:
    external: true
```

## Testing and Troubleshooting

### Local Build Test

First, I tested the build locally:

```sh
npm run build  # Built successfully
npm run preview  # Served at http://localhost:4321
```

### First Docker Build Attempt

I created all necessary files (`Dockerfile`, `nginx.conf`, `docker-compose.yml`, `.dockerignore`) and ran:

```sh
docker compose up --build -d
```

**Error encountered**:

```
[+] Running 1/1
 ✔ astro-app  Built                                                          0.0s
network traefik-public declared as external, but could not be found
```

**Problem**: Docker was trying to connect to a `traefik-public` network that doesn't exist because I don't have Traefik installed on my local system.

### Solution Options

I had two options:
1. Create the network: `docker network create traefik-public`
2. Remove Traefik settings and use local network for testing
I chose option 2 since this is my test environment before moving to the server.
### Updated Configuration for Local Testing

```yaml
networks:
  - local
#   - traefik-public
# labels:
#   - "traefik.enable=true"
#   - "traefik.http.routers.astro.rule=Host(`your-domain.com`)"
#   - "traefik.http.services.astro.loadbalancer.server.port=80"

networks:
  local:
    driver: bridge
  # traefik-public:
  #   external: true
```

### Successful Build

Second attempt was successful:

**Result**:

```
 ✔ astro-app                     Built                                           0.0s
 ✔ Network personal_blog_local   Created
```

**Container Status**:

```sh
CONTAINER ID   IMAGE                     COMMAND                  CREATED              STATUS              PORTS                                                          NAMES
67115dcdb6c1   my-astro-project:latest   "/docker-entrypoint.…"   About a minute ago   Up About a minute   0.0.0.0:8080->80/tcp, [::]:8080->80/tcp                        my-astro-container
```

The container is running successfully and accessible on `http://localhost:8080`.

> [!Takeaways] **Key learnings from this deployment:**
>
> - **Static vs Dynamic detection**: Check for `astro.config.mjs` and SSR adapters to determine site type
> - **Multi-stage Docker builds**: Separate build and runtime stages for smaller final images
> - **Network dependencies**: External networks must exist before referencing them in compose files
> - **Local testing strategy**: Comment out production configs for local development
>
> **What worked well:**
>
> - Multi-stage Dockerfile approach kept the final image lightweight
> - Using nginx:alpine as runtime base was efficient
> - Port mapping to 8080 avoided conflicts with other local services
>
> **What I'd do differently:**
>
> - Set up a proper local Traefik instance for full testing
> - Create environment-specific compose files (dev vs prod)
> - Add health checks to the container configuration
>
> **Next steps:**
>
> - Deploy to server with actual Traefik setup
> - Configure proper domain and SSL certificates
> - Add monitoring and logging for the containerized application
> - Explore nginx configuration optimization for static sites

##### Resources
https://deployn.de/en/blog/astrojs-docker/#the-tools-preparing-your-development-environment

**West: Similar**

**East: Opposite**

**North: Theme / Questions**

**South: What does this lead to**
