---
title: "jnix"
description: "A Just-based CLI Tool for NixOS"
publishDate: "07 november 2025"
tags: ["jnix","nix"]
updatedDate: 10 november 2025
---

A few nights ago, I was going through a git repository when I came across a CLI program called `njust`. Like `jnix`, it's a command-line tool built using `just`.

Just is a command-line runner similar to `make`. Make is a command-line tool similar to `just` 🤣. Just kidding, it never ends...haha.

> **Make** is a [command-line interface](https://en.wikipedia.org/wiki/Command-line_interface) [software tool](https://en.wikipedia.org/wiki/Software_tool) that performs actions ordered by configured [dependencies](https://en.wikipedia.org/wiki/Dependence_analysis) as defined in a [configuration file](https://en.wikipedia.org/wiki/Configuration_file) called a _makefile_.

Commands run using Just are called `recipes` and are usually stored in a file called `Justfile` that has a similar syntax to `make`.

In order to run a command, we can simply run:

```
just <RECIPE>
```

There are plenty of use cases for using this tool, but in my case I just wanted to experiment with it and I wanted a way to use it to run some common commands I use daily on my NixOS homelab like for example:
- Rebuilding my NixOS config
- Deploying config changes to remote hosts
- Sending files over to remote hosts
- Garbage cleaning my system
- and more.

Obviously there are commands that do these things already, but I just think it'd be cool to have my own CLI tool that acts as a wrapper around these commands.
## The Nix Way

The simpler way to do this is to create a Justfile anywhere inside a folder, but I decided to do it the Nix way... being that it will be created as a module and can be shared between all my hosts.

Also, Nix offers a function called `writeShellApplication` which is a **higher-level helper** used for creating a **shell script or CLI program** from a bash script. We can also specify the dependencies needed by these scripts. Nix pulls the dependencies from the Nix repository during runtime and creates a Nix derivation with it alongside the script, which in this case is our Justfile.

### Merging Recipes

First, I created a Nix variable called `mergeContentIntoJustFile`, responsible for concatenating all the recipes (Just commands) that I will be creating and merging them into a Justfile:

```nix
mergeContentIntoJustFile = ''
  _default:
    @printf '\033[1;36mjnix\033[0m\n'
    @printf 'Just-based recipe runner for NixOS.\n\n'
    @printf '\033[1;33mUsage:\033[0m jnix <recipe> [args...]\n\n'
    @jnix --list --list-heading $'Available recipes:\n\n'

  ${concatenateString "\n" (attributeValues cfg.recipes)}
'';
```

Then comes a new variable for validating the Justfile syntax. This validation will be done during build time so I can catch errors early. Saves me time from having to debug after the build.

```nix
validatedJustfile =
  pkgs.runCommand "jnix-justfile-validated"
    {
      nativeBuildInputs = [ pkgs.just ];
      preferLocalBuild = true;
    }
    ''
      # Write the merged justfile content to a temporary file
      echo ${escapeShellArgument mergeContentIntoJustFile} > justfile

      # Validate justfile syntax using 'just --summary'
      echo "Validating jnix cli justfile syntax..."
      just --justfile justfile --summary >/dev/null || {
          echo "ERROR: jnix justfile has syntax errors!"
          echo "justfile content:"
          cat justfile
          exit 1
        }
      # Copy validated justfile to the nix store output path
      cp justfile $out
      echo "jnix justfile validation successful"
    '';
```

Nix also offers a function called `pkgs.runCommand` which is a low-level Nix function for creating a derivation by running arbitrary shell commands. You give it:
- A name for the derivation
- A set of environment variables
- A shell script to run

So we will pass into the function a Just package as a dependency which it will use to validate the syntax during runtime.

### Creating the CLI Application

Using the `pkgs.writeShellApplication` function, I created a shell application used with the merged Justfile containing all the gathered recipes:

```nix
jnixScript = pkgs.writeShellApplication {
  name = "jnix";
  runtimeInputs = [
    pkgs.jq
    pkgs.just
  ];
  text = ''
    # Execute 'just' with the merged justfile, preserving current directory
    exec just --working-directory "$PWD" --justfile ${mergedJustfile} "$@"
  '';
};
```

## Example Recipe
Here is an example of a recipe I have in my created Justfile:

```nix
system = ''
  # Show system info
  [group('system')]
  info:
    @echo "Hostname: $(hostname)"
    @echo "Nixos Version: $(nixos-version)"
    @echo "Kernel: $(uname -r)"
    @echo "Generation: $(sudo nix-env --list-generations -p /nix/var/nix/profiles/system | tail -1 | awk '{print $1}')"
    @echo "Revison: $(nixos-version --json | jq -r '.configurationRevision // "unknown"')"
'';
```

It's used to check for Nix system information when I run the command `jnix info`:

```
 jnix info
Hostname: nixos
Nixos Version: 25.11.20250924.e643668 (Xantusia)
Kernel: 6.12.48
Generation: 74
Revison: unknown
```
