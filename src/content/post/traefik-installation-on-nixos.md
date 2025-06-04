---
title: "How to setup Traefik on nixos"
description: "This blog provides my personal account of setting up Traefik on NixOS, highlighting its ease of configuration, integration with Let's Encrypt for SSL/TLS, and my jjourney in learning and configuring entry points, certificate resolvers, and routing for a secure and efficient server environment."
publishDate: "14 May 2025"
tags: ["traefik"]
updatedDate: 20 June 2025
---
#### 1. Introduction
Traefik is an open-source reverse proxy and load balancer, perfect for managing containerized applications in your homelab or home server and cloud server. It works well with docker, automatically detecting services, configuring routing and secure connection with SSL.

I just got a new cloud server, for me its just like getting a new laptop, i want to install everything possible on it..haha. Just kidding.

It all start with the main reason why i got the server in the first place, a well streamlined and easier development environment. I need a way to have access my services remotely anywhere, I have few services hosted on my laptop and sometimes when i need to access some content on these servies i cant access them remotely which gives me headache, also i want to be able to selfhost my personal blog. I did me research on how to make that happen and i was suggested a bunch of options, traefik happens to just stand out for me and seem easier to configure on nixos.

- **Benefits of Traefik**
I haven't use any other reverse proxy before like caddy or nginx but I love the fact that traefik was kinda easier for me to setup especially on nixos because nixos offer a better and  more effecient way to install most services, all i had to was "Set enable = true" and bam....traaaeeefik!!!.

The first 3 days I keep pronouncing traefik instead of traefik, it was so confusing..i guess that's one reason i decided to go for it...I love things that confuses me, i also love the name.

I cant really say much about the benefit as i just start using it, but um i love the fact that its:
1. Easier to setup and configure
2. It works with `letEncrypt` for easier automatic SSL/TLS
The more i get into it, i will update the benefits.

#### 2. Setting Up Traefik on NixOS
- **Enabling Traefik and Dashboard**
  Explain how to enable Traefik and its dashboard with the provided configuration.
Setting up traefik on nixos is pretty straight forward, my first thought was would i have to download from nixpkgs repository and then create a nix file and you know the nixos way.

No, it was much simpler than that, all i have to do was first create a file `traefik.nix` in my flake module.

```nix
{
  services.traefik = {
    enable = true;
  };
}
```

Imagine just that and you have it, I love how nixos makes it easier to set services like this up, though i am always worried if i don't understand how somethings or services work under the hood because most of the heavy lifting has been done for me.

Anyways, after enabling it, we can check if the services is running by entering the command.
```
sudo systemctl status traefik.service
```

After running the command we should get a result like this:
*TODO: Add a breif description of what this means*
```sh
● traefik.service - Traefik web server
     Loaded: loaded (/etc/systemd/system/traefik.service; enabled; preset: ignored)
     Active: active (running) since Sat 2025-04-19 00:35:46 UTC; 2min 7s ago
 Invocation: 801fa7b22ed248d2be019f56af928191
   Main PID: 99179 (traefik)
         IP: 0B in, 0B out
         IO: 0B read, 0B written
      Tasks: 8 (limit: 9284)
     Memory: 28.3M (peak: 28.4M)
        CPU: 695ms
     CGroup: /system.slice/traefik.service
             └─99179 /nix/store/s1arl88iqr5wyvhhimjxw4628hfhfq99-traefik-3.3.4/bin/traefik --configfile=/nix/store/rf5kmixz779mwdpk8bk1ipkd7lcjsdnq-config.toml
Apr 19 00:35:46 nixos systemd[1]: Started Traefik web server.
```
Now that is it! we have traefik installed and setup, what we have to do next is configure traefik to handle incoming request.
#### 3. Configuring Traefik
*TODO: Explain dynamic and static config option first*
- **Handling Incoming Traffic**
In other to handle incoming traefik I had to configure the entry points.
```sh
# Define entry points for different network protocols
entryPoints = {
  # HTTP entry point on port 80
  web = {
    address = ":80";
    # Redirect all HTTP traffic to HTTPS
    http.redirections.entryPoint = {
      to = "websecure";
      scheme = "https";
    };
  };
  # HTTPS entry point on port 443
  websecure = { address = ":443"; };
};
```

Entry point is crucial for web security and proper web trafficking handling, I setup port port 80 which s a standard HTTP that automatically redirect all incoming traffik to HTTPS, while the port 443 handles the secure HTTPS traffic.

The redirection happens automatically when i visit my domain, i got redirected to a secure version on port 443.

Honestly I am new to all this, I am not an expert or anything, but based on my research and posts from reddits, this seem like the proper way to configure the entry-point.

- **SSL/TLS Configuration**
Detail the certificate resolver setup for automatic SSL management.
Now about the ssl certificate, i got my domain from  go daddy and it came with a free ssl certificate, i thought i was just so lucky but i then later found out that when you get a `.dev` domain it always come with free ssl.
However traefik uses Let's encrypt to handle automatic SSL/TLS certificate so i didnt need my free ssl certification which mean it gets terminated when i switch to letencrypt. The benefit i get from using let encrypt is that it automatically renew my certificate before the expiration every 90 days and also i have more control over my certificate since its stored in my local system.

Here is my traefik certificate resolver config:
```nix
certificatesResolvers = {
      godaddy = { # you can add your own provider
        acme = {
          email = "yourmain@gmail.com";
          storage = "/var/lib/traefik/acme.json";
          caserver = "https://acme-v02.api.letsencrypt.org/directory";
          dnsChallenge = {
            provider = "godaddy";
            resolvers = [ "1.1.1.1:53" "8.8.8.8:53" ];
          };
        };
      };
    };
  };
```

Acme is a protocol by Let's Encrypt in automating the process of creating SSL/TLS certification. It require the following option (acme email, cs server, storage and finally dns challenge) to setup a basic config, there are other useful options but this is the default..for me option you can check out their docs.[acme documentation](https://doc.traefik.io/traefik/reference/install-configuration/tls/certificate-resolvers/acme/).

I've provided my email so i can get important notification from let Encrypt for expiry notice or important information i might need to know, i've also specify a storage location where i want my acme data like my certificate and keys, also let encrypt has two `casever`, caserver are basically acme server url used to request certificates, one for testing and the other for production and then lastly a configuration to use DNS_01 challenge, if you dont know what dns-01 mean like i do... its basically a method used by Let's encrypy to verify that you own the domain. It does these by putting a TXT record on the domain DNS.

>[!question] What does it mean to resolve certificates?
> Resolving certificate means to automatically request, validate and obtains a new SSL certificate from a certificate authority like Let's Encrypt. It certificate is then stored and used for HTTPS.

>[!Question] Why is godaddy inside the certificate resolver? can other domain provided be in the certificate resolver?
>Yes, in this case since use godaddy as the dns provider, traefik uses godaddy api to automatically create the require TXT record during domain verification.
>We can definately use other provider like Cloudfare, DigitalOcean and more and these can be found in the traefik documentation.
#### 4. Routing with Traefik
Finally i setup the router, the router helps to tell traefik where to route the domain request, in my case i only have my traefik dashboard running for now so i created a route for that using websecure as the entry point which is running on port 443 and then finally i apply authentication because the dashboard is available to the public and without authentication anybody can access it, the authentication method i used is basic authentication which i passed into the middleware.

```nix
routers = {
  api = {                                    # Name of the router (can be any identifier)
    rule = "Host(`thein3rovert.dev`)";      # Matches requests to this domain
    service = "api@internal";                # Routes to Traefik's internal API/dashboard
    entryPoints = [ "websecure" ];           # Use HTTPS endpoint (port 443)
    middlewares = [ "auth" ];                # Apply authentication middleware

    tls = {                                  # TLS/HTTPS configuration
      certResolver = "godaddy";              # Use GoDaddy DNS challenge for Let's Encrypt
      domains = [{
        main = "thein3rovert.dev";          # Primary domain for the certificate
        # sans = ["*.thein3rovert.dev"];    # Subdomains to include in certificate
      }];
    };
  };
};
```
#### 5. Conclusion
So i am sure this blog is not well written..i am new to writing blogs and my aim is to gradually improve in how I write and explain things and i don't want to use artificial intelligence to clean it up because i want it to sound as real as possible like i would explain it to my friend also if i want to improve in my writing then I need to do it the hard way, which means without artificial intelligence.
> [!Takeaways]
>
##### Resources
[[Traefik Setup on nixos cloud server]]
[[Traefik Setup]]
[[How to Configure Path domain and Sub domain to traefik]]
https://medium.com/@svenvanginkel/the-ultimate-guide-to-setting-up-traefik-650bd68ae633
**West: Similar**
https://medium.com/@svenvanginkel/the-ultimate-guide-to-setting-up-traefik-650bd68ae633

**East: Opposite**

**North: Theme / Questions** ^9622da

**South: What does this leads to**
