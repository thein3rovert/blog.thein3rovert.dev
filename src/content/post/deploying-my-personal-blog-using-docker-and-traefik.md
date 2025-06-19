---
title: "Deploying my personal blog using  Docker and Traefik"
description: "Deploying my Astro blog using Docker with nginx - figuring out static vs dynamic builds, Docker configuration, and Traefik integration challenges along the way."
publishDate: "28 May 2025"
tags: ["docker", "traefik", "deployment"]
updatedDate: 28 May 2025
---

Well, I'm finally ready to deploy my first real web app to a live server!
## Initial Local Deployment
Before i decided to deploy the application i have to first perform the following build the project locally on my machine, i did this because It make sure to always test before deployment as a good practise and also if something breaks I can easily identify and fix it. So I:
- Building the project
- Creating Docker configuration files (docker-compose.yml, .dockerignore, Dockerfile)
- Building Docker images
- Successfully accessing it on my local machine

More details about that local deployment process can be found here [[Deploying my astro blog to docker]].
After testing the project i then decided to take it further by deploying it publicly to my VPS which has traefik running.

I recently set up traefik on server and it of the best thing i my life at the moment, i have never worked or configure a reverse proxy before or even perform deployment without the user of a third party deployment tools but being about to make use of a reverse proxy like traefik is a really good game changer for me and also taught me a lot about SSL\TLS, domain and more.

## Building the Project

I cloned my project into my projects folder, then I first ran the project locally on my server using `npm run dev`, i had to do this in other to make sure that the project is running successfully.

The project ran successfully, then i realised I couldn't view it directly in a browser since it's running over SSH without a GUI. But that's fine - I just needed confirmation that it worked.

I tried exposing the port over the network using `npm run dev -- --host` but had issues accessing it through my IP address. I suspect this is due to firewall rules on my server blocking access, when I got my server i had to set some firewall rules in other to secure it.

Next, I built the project:

```sh
npm run build
```

The build completed quickly, giving me a `dist` folder containing all the static files:

```sh
drwxr-xr-x    - thein3rovert 28 May 20:50 -I  dist
```

I also previewed the build:

```sh
npm run preview
```

Which showed success:

```sh
npm run preview
> personal-blog@6.4.0 preview
> astro preview
 astro  v5.6.2 ready in 6 ms
┃ Local    http://localhost:4321/
┃ Network  use --host to expose
```

Now that the project builds successfully, I turned my attention to Docker deployment.

## Docker Deployment Options

I considered two approaches for Docker deployment:

### Option 1: Direct Docker Deployment with Traefik

Why do i have two options? Well i have hosted a few self hosted application using docker with traefik, i use nix to manage my docker application so I don’t really need a docker compose as i can just use `nix-oci-container` to set it up and write the compose file with nix. This is the only way i know how to self host or deploy an application and since my project is using a compose file i need a way to convert the compose file to nix so i can manage it.
1. Update docker-compose.yml with Traefik labels:
```yml
version: '3.9'
services:
  myapp:
    build: .
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp.rule=Host(`myapp.local`)"
      - "traefik.http.routers.myapp.entrypoints=web"
      - "traefik.http.services.myapp.loadbalancer.server.port=80"
    networks:
      - traefik_proxy
networks:
  traefik_proxy:
    external: true
```

2. Create an external Docker network:
```sh
docker network create traefik_proxy
```

3. Enable Docker provider in my Traefik config:
```nix
services.traefik = {
  enable = true;
  staticConfigOptions = {
    entryPoints.web.address = ":80";
    providers.docker = {
      endpoint = "unix:///var/run/docker.sock";
      exposedByDefault = false; # Enable services only if they have traefik.enable=true
    };
  };
};
```

4. Grant Traefik access to Docker:
```nix
users.users.traefik.extraGroups = [ "docker" ];
```

### Option 2: Docker Hub Deployment
This option require me to push my project to docker hub then pull the images using the nix ico container just like how I manage my other self hosted application.
The downside to this is that i have to do this manually each time i make changes to my application and i am not ready for that yet so this is just a plan b.

1. Tag and push image to Docker Hub:
```sh
# Tag your image
docker tag myapp your-dockerhub-username/myapp:latest
# Push it to Docker Hub
docker push your-dockerhub-username/myapp:latest
```

2. Update docker-compose.yml to use Docker Hub image:
```sh
version: '3.9'
services:
  myapp:
    image: your-dockerhub-username/myapp:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp.rule=Host(`myapp.local`)"
      - "traefik.http.routers.myapp.entrypoints=web"
      - "traefik.http.services.myapp.loadbalancer.server.port=80"
    networks:
      - traefik_proxy
networks:
  traefik_proxy:
    external: true
 ```

3. Ensure traefik_proxy network exists

## Implementation Challenges

I decided to try Option 1 first. Here's what I did:

1. Updated my docker-compose.yml file with Traefik labels
2. Added network configurations
3. Enabled Docker provider in Traefik config

However, I ran into errors in my journalctl logs:
```
May 28 21:34:50 nixos traefik[172041]: 2025-05-28T21:34:50Z ERR github.com/traefik/traefik/v3/pkg/provider/docker/pdocker.go:157 > Provider error, retrying in 2.176440789s error="Cannot connect to the Docker daemon at unix:///var/run/docke r.sock. Is the docker daemon running?" providerName=docker
```

I realized this was likely due to permission issues with Traefik accessing the Docker socket. After some research and talking with a friend, I understood that Traefik needs proper permissions to access Docker/Podman.

## The Solution

I configured NixOS to add the Traefik user to the Podman group:

```nix
users.users.traefik = {
  group = "traefik";
  isSystemUser = true;
  extraGroups = [ "podman" "docker" ];
};
```

This configuration ensures Traefik has the necessary permissions to work with containers, because in other for traefik to connect with docker it need to be able to access the docker socket.

## Final Deployment

I verified the traefik_proxy network existed using `podman network ls`, then built the Docker compose file:

```sh
sudo podman compose up --build id
```

The deployment was successful, and I could see the service in my Traefik dashboard.

## Lessons Learned

This deployment journey taught me several valuable lessons:

1. **Permission Management is Critical**: Understanding how different system users (like Traefik) interact with services like Docker/Podman was crucial. The solution wasn't obvious at first, but learning about user groups and socket permissions was enlightening.

2. **Configuration Order Matters**: Sometimes issues aren't with the current configuration but with the sequence of operations. Restarting after applying configuration changes is important to verify persistence.

3. **Declarative Systems Require Declarative Thinking**: Working with NixOS's declarative configuration taught me to think more systematically about infrastructure setup.

4. **Traefik Integration Needs Specific Labels**: Learning how Traefik discovers services and requires specific labels helped me understand service mesh concepts better.

5. **Debugging is a Process**: Using tools like journalctl and understanding log messages became essential skills during this process.

While the process was challenging and sometimes frustrating, seeing the service appear in Traefik was incredibly rewarding. This marks my first successful deployment of a personal project to a live environment - a significant milestone in my development journey.
