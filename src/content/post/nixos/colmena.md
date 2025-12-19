---
title: Issue with Colmena
description: Resolving Colmena integration issues with Nix flakes by correctly configuring inputs and addressing infinite recursion errors
publishDate: "2025-07-21T10:55:00Z"
tags: ["nixos", "deployment"]
updatedDate: 23 Nov 2025
---

So, I’ve been having this issue with Colmena. I added the Colmena input to my `flake.nix` for my system and also exposed it as an output so both my flake and NixOS can make use of it. But here’s the problem—it’s not visible to my system. When I try to use it, it’s just not there.

At first, I thought maybe I messed up the configuration or missed an update in the documentation. For now, I’ve been using it via `nix-shell`, which works, but I have to pass the `--impure` flag, and honestly, I’m not a fan of that. Let’s fix this.

---

### Step 1: Adding Colmena Input to Flake
First, I added Colmena as an input in my `flake.nix`:
```nix
    # ADDED: Colmena input
    colmena.url = "github:zhaofengli/colmena";
```

Then, I added it to the outputs:
```nix
  outputs =
    {
      self,
      home-manager,
      nixpkgs,
      nix-colors,
      ghostty,
      agenix,
      disko,
      colmena,
      ...
  };
```

---

### Step 2: Running `nix flake check`
When I ran `nix flake check`, I got these warnings:
```
warning: unknown flake output 'colmena'
warning: unknown flake output 'colmenaHive'
```

This confused me because I followed the exact setup from the official Colmena documentation on using flakes: [Colmena Using Flakes](https://colmena.cli.rs/unstable/tutorial/flakes.html).

Here’s my current Colmena config in the flake:
```nix
  colmenaHive = colmena.lib.makeHive self.outputs.colmena;
      colmena = {
        meta = {
          nixpkgs = import nixpkgs {
            system = "x86_64-linux";
          };
        };

        # Deployment Nodes
        demo = {
          deployment = {
            targetHost = "demo";
            targetPort = 22;
            targetUser = "thein3rovert";
            buildOnTarget = true;
            tags = [ "homelab" ]; # TODO: Change tag later
          };
          imports = [
            ./hosts/demo
            inputs.disko.nixosModules.disko
          ];
          time.timeZone = "Europe/London";
        };
      };
```

The issue is that my flake isn’t detecting the `colmena` output. It says Colmena now uses a new output called `colmenaHive`, which I already exposed. For now, I’ll hold off on using Colmena from the input flake and try it with `nix-shell` instead:

```sh
nix shell github:zhaofengli/colmena
```

---

### Second Issue: Infinite Recursion in Shell
When I tried running Colmena commands from the shell, I hit another error:
```
error: infinite recursion encountered
       at /nix/store/126fp22lvqmnfv1p290vcpmbf8yab4a5-source/lib/modules.nix:652:66:
          651|       extraArgs = mapAttrs (
          652|         name: _: addErrorContext (context name) (args.${name} or config._module.args.${name})
             |                                                                  ^
          653|       ) (functionArgs f);
[ERROR] -----
[ERROR] Operation failed with error: Child process exited with error code: 1
Hint: Backtrace available - Use `RUST_BACKTRACE=1` environment variable to display a backtrace
```

I wasn’t sure where this recursion was coming from, but based on the error, I suspected it was caused by excessive use of:
```nix
specialArgs = { inherit inputs outputs nix-colors; };
```

The infinite recursion error was likely caused by passing the `inputs` argument to modules that were already declared elsewhere. Since I have a common folder shared between hosts, this was creating conflicts.

Using `--show-trace`, I traced the issue to this part of my config:
```
 from call site
         at /nix/store/wnj1d9ysl3k95rpajdkdm8a5igl7ywa7-source/hosts/common/default.nix:12:5:
           11|     ./users
           12|     inputs.home-manager.nixosModules.home-manager
             |     ^
           13|   ];
...
   … while evaluating the module argument `inputs' in "/nix/store/wnj1d9ysl3k95rpajdkdm8a5igl7ywa7-source/hosts/common":

       error: infinite recursion encountered
```

To troubleshoot, I removed the Colmena config from my `flake.nix` input and the hive config entirely. Using only the Colmena shell, I ran `colmena apply` again and got this error:
```
[INFO ] Using flake: git+file:///home/thein3rovert/thein3rovert-flake
error: flake 'git+file:///home/thein3rovert/thein3rovert-flake' does not provide attribute 'packages.x86_64-linux.colmenaHive', 'legacyPackages.x86_64-linux.colmenaHive' or 'colmenaHive'
[ERROR] -----
[ERROR] Operation failed with error: Child process exited with error code: 1
Hint: Backtrace available - Use `RUST_BACKTRACE=1` environment variable to display a backtrace
```

Turns out, Colmena expects the `colmenaHive` output to be present. To fix this, I stopped adding the common config to the new VM, so it doesn’t contain the conflicting `home-manager` configuration.

### The Fix
I finally figured out the issue. Colmena behaves differently from `nixos-rebuild` when it comes to passing flake inputs. With `nixos-rebuild`, flake inputs are automatically passed to all modules. With Colmena, you need to explicitly pass them.

Initially, I was doing this:
```nix
{
  inputs = {
    # ... existing inputs

    # Uncomment and fix Colmena input
    colmena = {
      url = "github:zhaofengli/colmena";
    };
  };

  # ...
}
```

But this only passes the Colmena GitHub URL without including the flake inputs. Here’s the correct way:
```nix
{
  inputs = {
    # ... existing inputs

    # Uncomment and fix Colmena input
    colmena = {
      url = "github:zhaofengli/colmena";
      inputs.nixpkgs.follows = "nixpkgs"; # Pass in the flake input
    };
  };

  # ...
}
```

Then, in the Colmena configuration within the flake, I needed to pass the inputs to all nodes using the `specialArgs` function:
```nix
colmena = {
  meta = {
    nixpkgs = import nixpkgs {
      system = "x86_64-linux";
    };
    # Pass inputs to all nodes
    specialArgs = { inherit inputs outputs; };
  };
};
```

According to the latest Colmena release, if you’re using the newest version, the `colmenaHive` output must be present in your flake. As stated in the documentation:
> Colmena reads the `colmenaHive` output in your Flake, generated with `colmena.lib.makeHive`.

You can read more about it in their official documentation [here](https://colmena.cli.rs/unstable/tutorial/flakes.html).

Since I’m running the older version of Colmena via `nix-shell`, I don’t need to worry about the `colmenaHive` output. However, when deploying a new node, I still have to add the `--impure` flag:
```bash
colmena apply --on <nodename> --impure
```

And it should deploy successfully:
```
INFO ] Selected all 1 nodes.
      🕑 4s 1 running
 demo 🕑 4s     'github:nixos/nixpkgs/77b584d61ff80b4cef9245829a6f1dfad5afdfa3?narHash=sha256-bmEPmSjJakAp/JojZRrUvNcDX2R5/nuX6b
```

---

### Key Insights and Takeaways
1. **Explicit Input Passing**: Unlike `nixos-rebuild`, Colmena requires you to explicitly pass flake inputs to all modules using `specialArgs`.
2. **ColmenaHive Requirement**: If you’re using the latest version of Colmena, ensure your flake exposes the `colmenaHive` output.
3. **Avoid Infinite Recursion**: Be cautious when sharing configurations between hosts. Conflicts in `specialArgs` or overlapping inputs can lead to infinite recursion errors.
4. **Use `--show-trace`**: This flag is invaluable for debugging issues in your configuration.

### What I’d Do Differently
- **Read the Docs Thoroughly**: I would double-check the latest Colmena documentation before diving into implementation.
- **Test Incrementally**: Instead of adding everything at once, I’d test each part of the configuration step-by-step to catch issues early.
- **Avoid Legacy Methods**: While using `nix-shell` worked as a temporary fix, I’d aim to transition fully to the latest Colmena features and workflows.
