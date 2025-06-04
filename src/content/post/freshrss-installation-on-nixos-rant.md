---
title: "Freshrss installation on nixos rant"
description: "My journey of setting up FreshRSS on NixOS, highlighting the challenges faced with configuration, database choices, and the eventual decision to use Docker for simplicity."
publishDate: "25 May 2025"
tags: ["freshrss", "traefik", "docker"]
updatedDate: 1 June 2025
---

I need FreshRSS because I consume too much content on the internet. Some content I don't need to consume and some I do - I need a way to only consume the right content that I need without getting distracted.

I have a few blogs, YouTube channels, and Reddit subs that align well with my mindset and goals, and I need to consume them intentionally...hahaha.
Also, I plan to create a dashboard for my server for monitoring my self-hosted services and other system services, and I want to be able to have some of the content from my RSS feed on there.

I can't remember much now but I will update as I remember, so let's go.

### Quick Google Search
I got this option from a web search so I will try it, but first I need to gather a few other resources that might be helpful.
>[!cite]
>To install and configure FreshRSS on NixOS, you'll need to modify your `configuration.nix`

I don't like to add packages to my configuration files, so instead I will just create a freshrss.nix file and have it there. I love modularizing my config.

### FreshRSS with nginx**
```
services.freshrss = {
  enable = true; # Enable the FreshRSS service
  # Additional configuration options (see below)
};
services.nginx = {
  enable = true; # Enable Nginx for serving FreshRSS
  # Additional Nginx configuration options
};
```

We can also have the database setting in the config. That is nice - I'm not sure if I should use my PostgreSQL database or MySQL. I have a PostgreSQL instance running with nothing to do with it so I will just use that instead.
```
Database settings (choose your preferred database type)
database = {    type = "sqlite"; # Example: using SQLite    # For MySQL or PostgreSQL, configure the database connection details
```

We can also set up the user setting because by default the user will be freshrss but I am not freshrss..lol I am meeeeeee :). So I will need to change the `freshrss` to `me`. There are a few other options for the user setting - Google is not listing them all but I will have to check their documentation for that.

```services.freshrss = {
  enable = true;
  # Database settings (choose your preferred database type)
  database = {
    type = "sqlite"; # Example: using SQLite
    # For MySQL or PostgreSQL, configure the database connection details here
  };
  # User under which FreshRSS runs (default is "freshrss")
  user = "freshrss";
  # Other FreshRSS options:
  #  - authType: "form" (default) or "http_auth" or "none"
  #  - pool: Name of the php-fpm pool (default is "freshrss")
  #  - passwordFile: Path to the password file
  #  - baseUrl: Base URL for FreshRSS (e.g., "https://freshrss.example.com")
};
```
Then I can configure our reverse proxy. Here's the thing - on my mini PC I don't have a reverse proxy setup and I also need to be able to access my NixOS remotely from anywhere over the web. Though I can just download an RSS reader, I don't just want that - I am trying to understand how to self-host stuff so my plan is to install it on my mini PC which will be like the dev stage and then later move to production that will be on my cloud server. I use Traefik for my reverse proxy so I hope they work the same.
```
services.nginx = {
  enable = true;
  virtualHosts = {
    "your-domain.com" = { # Replace with your domain
      forceSSL = true; # Optional: Enable HTTPS
      enableACME = true; # Optional: Enable automatic SSL certificate renewal
      locations = {
        "/" = {
          proxyPass = {
            url = "http://localhost:8000"; # FreshRSS listens on port 8000
          };
          proxyPassHeaders = {
            "X-Forwarded-Proto" = "https"; # Optional: For HTTPS
          };
        };
      };
    };
  };
};
```

### I found another source on NixOS config
The guy was having a mental breakdown having a hard time hosting both FreshRSS and RSS Bridge on his server. He posted his config on the discourse and I borrowed it. Here you can have it too partner [Borrowed config](https://discourse.nixos.org/t/new-to-nix-help-me-fix-config/56577). I am going to use it as one of my sources and you should also do the same.

So here is what I have borrowed so far from the config, quite the stress!!!!
```
{
  services.freshrss = {
    enable = true;
    user = "freshrss";
    baseUrl = "https://freshrss.example.com";
  };
}
```

I think this is all I needed. Then I ran nixos-rebuild switch and lo and behold got the following error:
```sh
    error:
    Failed assertions:
    - `passwordFile` must be supplied when using "form" authentication!
```
So I'm saving you the stress my friends - be sure to add your password file. I don't even know how to do that yet...but let me do some research and get back to you.

So what we need to do is create a password file manually and then add the path to the passwordFile option:
```
echo "your-temp-password" | sudo tee /etc/nixos/freshrss-password.txt > /dev/null
sudo chmod 600 /etc/nixos/freshrss-password.txt
```

After doing that, add the option:
```
{let
  freshrssPassword = "/etc/nixos/freshrss-password.txt";
in
{
  services.freshrss = {
    enable = true;
    user = "freshrss";
    baseUrl = "https://freshrss.example.com";
    authType = "form";
    passwordFile = freshrssPassword; # Here for the password file
  };
}
```

After adding the above, I ran the `nixos-rebuild` command and then it was installed successfully, at least I thought it did.... *cryyyyyyy...ing*

I ran the systemctl command to check if the service is running and I got nothing:
```
systemctl status fressrss.service
OUTPUT: NULLY
```

I thought I did something wrong. The installation was successful, but I was just being naive. After the NixOS rebuild I should have checked the output for the services that were started. If I had, like you should, I would have seen this:
```
the following new units were started: freshrss-config.service, freshrss-updater.ti
mer, NetworkManager-dispatcher.service, nginx.service, phpfpm-freshrss.service, ph
pfpm.target, sysinit-reactivation.target, system-phpfpm.slice, systemd-tmpfiles-re
setup.service
```

Also the internet was confusing me - I mean ChatGPT told me I need to setup nginx.. Come on, I just want to know if my service is running... please chill.

Anyway, I ran the below command and indeed it was running:
```sh
sudo systemctl status phpfpm-freshrss.service

● phpfpm-freshrss.service - PHP FastCGI Process Manager service for pool freshrss
     Loaded: loaded (/etc/systemd/system/phpfpm-freshrss.service; enabled; preset>
     Active: active (running) since Sun 2025-05-25 09:11:34 BST; 14min ago
 Invocation: 2a0130d8093246e1b0445797cec5a14f
       Docs: man:php-fpm(8)
   Main PID: 19792 (.php-fpm-wrappe)
     Status: "Processes active: 0, idle: 2, Requests: 2, slow: 0, Traffic: 0.00re>
         IP: 0B in, 0B out
         IO: 2M read, 0B written
      Tasks: 3 (limit: 18719)
     Memory: 17.1M (peak: 17.4M)
        CPU: 111ms
     CGroup: /system.slice/system-phpfpm.slice/phpfpm-freshrss.service
             ├─19792 "php-fpm: master process (/nix/store/pq9ns3h110yz6f68f8yl5z9>
             ├─19824 "php-fpm: pool freshrss"
             └─19825 "php-fpm: pool freshrss"

May 25 09:11:34 nixos systemd[1]: Starting PHP FastCGI Process Manager service fo>
May 25 09:11:34 nixos php-fpm[19792]: [NOTICE] fpm is running, pid 19792
May 25 09:11:34 nixos php-fpm[19792]: [NOTICE] ready to handle connections
May 25 09:11:34 nixos systemd[1]: Started PHP FastCGI Process Manager service for>
May 25 09:11:34 nixos php-fpm[19792]: [NOTICE] systemd monitor interval set to 10>
```

Now I can visit `http://localhost/` to view my installed FreshRSS.

![[Setting up freshrss on nixos-1748162052476.png]]

So I keep getting permission denied error when FreshRSS is trying to view my password.
```
May 25 11:01:34 nixos systemd[1]: Starting Set up the state directory for FreshRS>
May 25 11:01:34 nixos freshrss-config-start[44254]: Reconfiguring FreshRSS…
May 25 11:01:34 nixos freshrss-config-start[44259]: cat: /etc/nixos/freshrss-pass>
May 25 11:01:34 nixos freshrss-config-start[44260]: FreshRSS updating user "admin>
May 25 11:01:34 nixos freshrss-config-start[44260]: ℹ️ Remember to re-apply the ap
```

I couldn't figure out how to make it work with the password file so I borrowed another risky alternative, at least until I figure out a better way:
```
  freshrssPassword = pkgs.writeText "password" "secret";
```

Yes, it's hardcoded now. Keep in mind this is just for testing purposes - I will figure out how to make it work with a password file before I move it to my server, or I could just use a hashed password instead.

![[Setting up freshrss on nixos-1748169325388.png]]

Yay, now it's working and I can experiment.

### My next step
My next step will be setting it up on my server, however the simpliest way to set it up on my server is to use docker so i wont be using the nixos option because it is a bit too much or overkill as i will need to set up **routing rules** in Traefik to forward requests to the PHP app via a backend (typically served by `php-fpm` + `lighttpd` or similar), or via a **Unix socket + FastCGI** bridge. I don't want to do all that when docker just simplifies all for me.

> [!Takeaways]
>
##### Resources
https://github.com/FreshRSS/FreshRSS/tree/edge/Docker
https://danielpersson.dev/2023/03/20/freshrss-tutorial-install-sort-by-date-and-more/
https://discourse.nixos.org/t/new-to-nix-help-me-fix-config/56577
https://discourse.nixos.org/t/permission-denied-when-reading-passwordfile/58823

**West: Similar**

**East: Opposite**

**North: Theme / Questions**

**South: What does this leads to**
