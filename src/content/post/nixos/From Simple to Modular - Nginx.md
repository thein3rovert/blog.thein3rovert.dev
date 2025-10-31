---
title: "From Simple to Modular"
description: "Learning nix through nginx configuration"
publishDate: "18 Oct 2025"
tags: ["nginx", "nix", "nixos" ]
updatedDate: 20 Oct 2025
---
# My NixOS Nginx Configuration Journey

When I first started configuring Nginx on NixOS, I did what most people do. I followed the [NixOS Wiki](https://nixos.wiki/wiki/Nginx) and created a straightforward, working configuration. It served my needs perfectly... until I realized I had multiple hosts to manage, and copying the same configuration with minor tweaks wasn't just tedious—it felt wrong in the declarative world of Nix.

This is the story of how I transformed a simple Nginx configuration into a reusable, modular system. It's a journey that taught me more about Nix than any tutorial could, and if you're learning NixOS, I hope it helps you too.

## The Beginning: A Simple Nginx Setup

My initial configuration was straightforward and looked something like this:

```nix
{ config, lib, ... }:
let
  inherit (lib) mkIf mkEnableOption;
  if-nginx-enable = mkIf config.nixosSetup.services.nginx.enable;
in
{
  options.nixosSetup.services.nginx = {
    enable = mkEnableOption "Nginx Server";
  };

  config = if-nginx-enable {
    services.nginx = {
      enable = true;
      virtualHosts."localhost" = {
        root = "/var/www/localhost";
        listen = [
          {
            addr = "0.0.0.0";
            port = 80;
          }
        ];
        locations."/" = {
          index = "index.html";
        };
      };
    };

    systemd.tmpfiles.rules = [
      "d /var/www/localhost 0755 root root -"
      "L+ /var/www/localhost/index.html - - - - ${builtins.toFile "index.html" ''
        <!DOCTYPE html>
        <html>
          <head><title>Hello from thein3rovert</title></head>
          <body>
            <h1>Hello from the in3rovert Nginx on Nixos!</h1>
            <p>Served from a nixos declarative config 😎</p>
          </body>
        </html>
      ''}"
    ];
  };
}
```

This worked beautifully! I had a basic enable option, a hardcoded virtual host, and a simple HTML page served from the Nix store. Everything was declarative, and I felt pretty good about it.
![[From Simple to Modular - Nginx-1760748694607.png]]
### The Nix Store Symlink Discovery

One interesting challenge I encountered early on was getting the HTML content to actually appear in `/var/www/localhost/index.html`. Initially, I tried using `C!` (force copy) with systemd-tmpfiles, but I kept getting a file that just contained the Nix store path instead of the actual HTML content.

The solution? Use `L+` instead, which creates a symlink to the Nix store. This is actually more "Nix-like" anyway—instead of copying files around, we point to immutable content in the store. It's elegant and exactly how NixOS is meant to work.

## The "Wait, I Need This Everywhere" Moment

Then came the moment every NixOS user experiences: I needed to configure Nginx on another host. And then another. Each time, I found myself copying the configuration and manually changing:

- The server name
- The IP addresses
- The ports
- The HTML content
- The root directory

It felt... wrong. I was repeating myself, and if there's one thing Nix teaches you, it's that repetition is a code smell. I could already feel the maintenance burden building up. What if I wanted to add SSL to all hosts? What if I needed to change the default port? I'd be hunting through multiple files making the same change over and over.

Plus, let's be honest—sometimes I can just be a bit crazy about optimization and making things "proper." 😄

## The Transformation: Building a Reusable Module

I decided to take the plunge and create a proper, reusable module. This wasn't just about solving my immediate problem—it was about learning Nix more deeply. Here's what I wanted to achieve:

**Multiple virtual hosts**: Support any number of sites per server
**Flexible configuration**: Make everything configurable with sensible defaults
**Type safety**: Leverage Nix's type system to catch errors early
**Reusability**: Share the module across all my hosts with minimal duplication

### Understanding the Building Blocks

First, I needed to understand the NixOS module system better. Here are the key concepts I learned:

#### Options Define the Interface

Options are how you expose configuration to users (including future you). Each option needs:
- A **type** - What kind of data it accepts
- A **default** - A sensible fallback value
- A **description** - Documentation for what it does
#### Submodules for Complex Structures

When you need nested configuration (like listen addresses within a virtual host), you use submodules. They're like mini-modules within your module.

#### mapAttrs for Transformation

The `mapAttrs` function is your friend for transforming your custom options into the format that `services.nginx` expects.

### The Implementation

Here's the modular configuration I built:

```nix
{ config, lib, ... }:
let
  inherit (lib)
    mkIf
    mkEnableOption
    types
    mkOption
    ;

  createOption = mkOption;
  mapAttribute = lib.mapAttrs;
  if-nginx-enable = mkIf config.nixosSetup.services.nginx.enable;
  cfg = config.nixosSetup.services.nginx;

  # Type aliases for readability
  attributeSetOf = types.attrsOf;
  subModule = types.submodule;
  string = types.str;
  list = types.listOf;
  boolean = types.bool;
  port = types.port;

  # Configurable defaults
  serverName = "localhost";
  baseListenAddress = "0.0.0.0";
  basePort = 80;
in
{
  options.nixosSetup.services.nginx = {
    enable = mkEnableOption "Nginx Server";

    virtualHosts = mkOption {
      type = attributeSetOf (subModule {
        options = {
          root = createOption {
            type = string;
            default = "/var/www/${config.networking.hostName}";
            description = "Root directory for virtual host";
          };

          serverName = createOption {
            type = string;
            default = "${serverName}";
            description = "Server name from virtual host";
          };

          listenAddresses = createOption {
            type = list (subModule {
              options = {
                addr = createOption {
                  type = string;
                  default = "${baseListenAddress}";
                  description = "IP address to listen on";
                };

                port = createOption {
                  type = port;
                  default = basePort;
                  description = "Port to listen on";
                };

                ssl = mkOption {
                  type = boolean;
                  default = false;
                  description = "Enable SSL for this listener";
                };
              };
            });

            default = [
              {
                addr = "${baseListenAddress}";
                port = basePort;
                ssl = false;
              }
            ];
            description = "List of address and ports to listen on";
          };

          webPage = createOption {
            type = string;
            default = "index.html";
            description = "Simple Webpage";
          };

          webPageContent = createOption {
            type = string;
            default = ''
              <!DOCTYPE html>
              <html>
                <head><title>Welcome to ${config.networking.hostName}</title></head>
                <body>
                  <h1>Hello from ${config.networking.hostName}!</h1>
                  <p>Served from Nixos declarative config</p>
                </body>
              </html>
            '';
            description = "My Simple HomePage";
          };
        };
      });
      default = { };
      description = "Virtual Host Configuration";
    };
  };

  config = if-nginx-enable {
    services.nginx = {
      enable = true;

      virtualHosts = mapAttribute (name: vhostName: {
        serverName = vhostName.serverName;
        root = vhostName.root;
        listen = vhostName.listenAddresses;
        locations."/" = {
          index = vhostName.webPage;
        };
      }) cfg.virtualHosts;
    };

    # Create directories and symlink HTML files for each virtual host
    systemd.tmpfiles.rules = lib.flatten (
      lib.mapAttrsToList (name: vhost: [
        "d ${vhost.root} 0755 root root -"
        "L+ ${vhost.root}/${vhost.webPage} - - - - ${builtins.toFile "${name}-${vhost.webPage}" vhost.webPageContent}"
      ]) cfg.virtualHosts
    );
  };
}
```

### Key Design Decisions

Let me break down some of the choices I made:
#### 1. Type Aliases for Readability

```nix
attributeSetOf = types.attrsOf;
subModule = types.submodule;
string = types.str;
```

I created these aliases to make the code more readable. Yes, they're just wrappers, but `attributeSetOf` is more self-documenting than `types.attrsOf`.
#### 2. Smart Defaults

```nix
default = "/var/www/${config.networking.hostName}";
```

The default root directory uses the hostname, which means each host automatically gets a unique path without manual configuration. Small touches like this reduce the cognitive load when setting up new hosts.

#### 3. Nested Submodules for Listen Addresses

```nix
listenAddresses = createOption {
  type = list (subModule {
    options = {
      addr = createOption { ... };
      port = createOption { ... };
      ssl = mkOption { ... };
    };
  });
```

This allows for multiple listen addresses per virtual host, each with its own IP, port, and SSL settings. It's flexible without being complicated.

#### 4. Transformation with mapAttrs

```nix
virtualHosts = mapAttribute (name: vhostName: {
  serverName = vhostName.serverName;
  root = vhostName.root;
  listen = vhostName.listenAddresses;
  locations."/" = {
    index = vhostName.webPage;
  };
}) cfg.virtualHosts;
```

This is where the magic happens. I take my custom options and transform them into the format that `services.nginx.virtualHosts` expects. It's a clean separation between the interface I want to provide and the underlying NixOS options.

## Using the Module Across Hosts

Now here's where it all pays off. On any host, I can configure Nginx with minimal code:

### Host `WellsJaha` Simple Setup

```nix
{
  nixosSetup.services.nginx = {
    enable = true;
    virtualHosts.default = {
      serverName = "localhost";
    };
  };
}
```

That's it! Everything else uses smart defaults.

### Host `Octavia` Multiple Virtual Hosts

```nix
{
  nixosSetup.services.nginx = {
    enable = true;

    virtualHosts = {
      main = {
        serverName = "example.com";
        root = "/var/www/example";
        listenAddresses = [
          { addr = "0.0.0.0"; port = 80; }
          { addr = "0.0.0.0"; port = 443; ssl = true; }
        ];
      };

      api = {
        serverName = "api.example.com";
        root = "/var/www/api";
        listenAddresses = [
          { addr = "10.10.10.6"; port = 443; ssl = true; }
        ];
        webPageContent = ''
          <!DOCTYPE html>
          <html>
            <head><title>API Server</title></head>
            <body><h1>API Documentation</h1></body>
          </html>
        '';
      };
    };
  };
}
```

### Host `Bellamy` Custom Everything

```nix
{
  nixosSetup.services.nginx = {
    enable = true;
    virtualHosts.custom = {
      serverName = "custom.local";
      root = "/srv/www/custom";
      webPage = "home.html";
      listenAddresses = [
        { addr = "192.168.1.100"; port = 8080; }
      ];
      webPageContent = builtins.readFile ./custom-page.html;
    };
  };
}
```

## What I Learned
This journey taught me several important lessons about NixOS and Nix:

#### Start Simple, Refactor When Needed
My simple configuration wasn't wrong—it was the right solution for that moment. Refactoring came naturally when I hit a real need. Don't over-engineer from the start.
#### The Module System is Powerful
NixOS modules aren't just about organizing code—they're about creating interfaces. Good modules hide complexity and expose just what's needed.
#### Types Are Your Friend
The type system caught several bugs during development. When you declare `type = types.port`, Nix validates the input. This is huge for maintainability.
### Defaults Matter
Thoughtful defaults reduce configuration burden. The `${config.networking.hostName}` trick means I rarely need to specify the root directory explicitly.
### The Nix Store is Central
Understanding how to work with the Nix store (like using `L+` for symlinks) is fundamental to writing good Nix code. Fight with it and you'll suffer; work with it and everything becomes elegant.

## Conclusion

Refactoring my Nginx configuration from a simple, hardcoded setup to a flexible, reusable module wasn't just about making my life easier (though it definitely did). It was about learning to think in Nix about understanding options, types, submodules, and the art of creating good abstractions.

If you're learning NixOS, I encourage you to try something similar. Take a simple configuration you've written, identify the parts you'd want to reuse, and try making it modular. You'll learn more in the process than you would from any tutorial.

And remember: sometimes being a bit crazy about optimization is exactly what pushes you to learn something new. 😄
