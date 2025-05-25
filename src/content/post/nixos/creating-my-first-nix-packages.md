---
title: "Creating my first nix package"
description: "This post describes the process of creating a Nix package for the Gruvbox Factory CLI tool on NixOS, including using nix-init for initialization, handling dependency issues, and successfully building and testing the package"
publishDate: "12 April 2025"
tags: ["webmentions", "astro", "social"]
updatedDate: 12 April 2025
---
# Creating Nix Packages

## What is nix-init?
`nixinit` is a cli tool for initialising a package, from my own understanding.

>[!cite]
>My workflow involves using [nix-init](https://github.com/nix-community/nix-init) to create the package file and then the `nix build` command for make sure the pacakge file works. --li yang

## Project Goal
My goal was to package the gruvbox factory CLI tool for NixOS. After checking the nixos packages website and finding no existing package for the gruvbox tool, I decided to build it myself to learn the package creation process while working with something I wanted to use. I'm fond of the gruvbox theme for its eye-friendly colors, and while I ultimately want to apply this theme across all my applications, my immediate goal was to create a package that would let me convert images to use the gruvbox color palette. This would allow me to create custom gruvbox-themed images.

Source: https://github.com/paulopacitti/gruvbox-factory

## Steps to Create the Package

### 1. Install nix-init
Using a nix shell to access it without polluting my system just in case:
```bash
nix shell nixpkgs#nix-init
```

### 2. Run nix-init
```bash
nix-init
```

Follow the prompts:
```
Enter url
❯ https://github.com/paulopacitti/gruvbox-factory
Enter tag or revision (defaults to v2.0.0)
❯ v2.0.0
Enter version
❯ 2.0.0
Enter pname
❯ gruvbox-factory
How should this package be built?
❯ buildPythonApplication
Enter output path (leave as empty for the current directory)
❯ .
```
I kept pressing enter for the other options until I reached `How should this package be built?` where you get to select how you want the package built. I selected `buildPythonApplication` since I am following the documentation "My Nix Journey - How to Use Nix to Setup a Dev Environment" by Li Yang.

### 3. Get Flake Template
```bash
nix flake init --template github:liyangau/flake-templates#local
```

### 4. Spawn Shell with Nix File
```bash
nix develop -c $SHELL
```

## Troubleshooting Dependencies

### Initial Error
After running the nix develop command, I ran into package dependencies issues with some dependencies versions not matching due to the fact that the package from the source might have hardcoded or pinned some dependencies version and nix is trying to use an updated version or a different version of that dependencies.
![[Creating my first nix packages-1744460587273.png]]
```sh
nix develop -c $SHELL
warning: creating lock file '/home/thein3rovert/Documents/01_Project/Builds/default/flake.lock':
• Added input 'nixpkgs':
    'github:nixos/nixpkgs/d19cf9dfc633816a437204555afeb9e722386b76?narHash=sha256-lzFCg/1C39pyY2hMB2gcuHV79ozpOz/Vu15hdjiFOfI%3D'(2025-04-10)
• Added input 'systems':
    'github:nix-systems/default/da67096a3b9bf56a91d16901293e51ba5b49a27e?narHash=sha256-Vy1rq5AaRuLzOxct8nz4T6wlgyUR7zLU309k9mBC768%3D' (2023-04-09)
error: builder for '/nix/store/l576pwlj50bhngb87fk8qdrm2aazzffs-gruvbox-factory-2.0.0.drv' failed with exit code 1;
       last 25 log lines:
       > copying build/lib/factory/__main__.py -> build/bdist.linux-x86_64/wheel/./factory
       > running install_egg_info
       > Copying gruvbox_factory.egg-info to build/bdist.linux-x86_64/wheel/./gruvbox_factory-2.0.0-py3.12.egg-info
       > running install_scripts
       > creating build/bdist.linux-x86_64/wheel/gruvbox_factory-2.0.0.dist-info/WHEEL
       > creating '/build/source/dist/.tmp-a1x6ri75/gruvbox_factory-2.0.0-py3-none-any.whl' and adding 'build/bdist.linux-x86_64/wheel' to it
       > adding 'factory/__main__.py'
       > adding 'factory/gruvbox-mix.txt'
       > adding 'factory/gruvbox-pink.txt'
       > adding 'factory/gruvbox-white.txt'
       > adding 'gruvbox_factory-2.0.0.dist-info/LICENSE'
       > adding 'gruvbox_factory-2.0.0.dist-info/METADATA'
       > adding 'gruvbox_factory-2.0.0.dist-info/WHEEL'
       > adding 'gruvbox_factory-2.0.0.dist-info/entry_points.txt'
       > adding 'gruvbox_factory-2.0.0.dist-info/top_level.txt'
       > adding 'gruvbox_factory-2.0.0.dist-info/RECORD'
       > removing build/bdist.linux-x86_64/wheel
       > Successfully built gruvbox_factory-2.0.0-py3-none-any.whl
       > Finished creating a wheel...
       > Finished executing pypaBuildPhase
       > Running phase: pythonRuntimeDepsCheckHook
       > Executing pythonRuntimeDepsCheck
       > Checking runtime dependencies for gruvbox_factory-2.0.0-py3-none-any.whl
       >   - numpy==2.2.2 not satisfied by version 2.2.3
       >   - setuptools==75.8.0 not satisfied by version 75.8.2.post0
       For full logs, run 'nix log /nix/store/l576pwlj50bhngb87fk8qdrm2aazzffs-gruvbox-factory-2.0.0.drv'.
error: 1 dependencies of derivation '/nix/store/10wqs24cswkfzqgsshgax6x6p16clm5p-nix-shell-env.drv' failed to build
```

### Debugging Process
I added the following code to patch the version for the affected dependencies in my default.nix file:

```nix
postPatch = ''
  substituteInPlace pyproject.toml \
    --replace 'numpy == 2.2.2' 'numpy >= 2.2.2' \
    --replace 'setuptools == 75.8.0' 'setuptools >= 75.8.0'
'';
```

This code checks the pyproject.toml file for the package versions and updates them to accept any version higher than the specified version.

Running `nix develop -c $SHELL` again produced the same error. I checked the pyproject.toml file to verify dependencies and their location, confirming it was in the root directory as expected.

Upon reviewing the default.nix file again, I noticed an issue with the postPatch code. The original pyproject.toml had the dependencies written without spaces:

```toml
"numpy==2.2.2",
"setuptools==75.8.0",
```

But my patch code had spaces:

```nix
"numpy == 2.2.2",
"setuptools == 75.8.0",
```

After fixing the spacing, I ran `nix develop` again but encountered a new error message complaining that it couldn't find the module 'gruvbox-factory' during the pythonImportsCheckPhase.
```sh
nix develop -c $SHELL
error: builder for '/nix/store/w9wfy7wp88mr8grz8vgmcdbdfqmv9hfj-gruvbox-factory-2.0.0.drv' failed with exit code 1;
       last 25 log lines:
       > stripping (with command strip and flags -S -p) in  /nix/store/8v353k03iyxfkp0hlclidzh5ywzzys5j-gruvbox-factory-2.0.0/lib/nix/store/8v353k03iyxfkp0hlclidzh5ywzzys5j-gruvbox-factory-2.0.0/bin
       > shrinking RPATHs of ELF executables and libraries in /nix/store/xdxwy3ajnwyqpllkizb3wzga6vnpg3w4-gruvbox-factory-2.0.0-dist
       > checking for references to /build/ in /nix/store/xdxwy3ajnwyqpllkizb3wzga6vnpg3w4-gruvbox-factory-2.0.0-dist...
       > patching script interpreter paths in /nix/store/xdxwy3ajnwyqpllkizb3wzga6vnpg3w4-gruvbox-factory-2.0.0-dist
       > Rewriting #!/nix/store/f2krmq3iv5nibcvn4rw7nrnrciqprdkh-python3-3.12.9/bin/python3.12 to #!/nix/store/f2krmq3iv5nibcvn4rw7nrnrciqprdkh-python3-3.12.9
       > wrapping `/nix/store/8v353k03iyxfkp0hlclidzh5ywzzys5j-gruvbox-factory-2.0.0/bin/gruvbox-factory'...
       > Executing pythonRemoveTestsDir
       > Finished executing pythonRemoveTestsDir
       > Running phase: installCheckPhase
       > no Makefile or custom installCheckPhase, doing nothing
       > Running phase: pythonCatchConflictsPhase
       > Running phase: pythonRemoveBinBytecodePhase
       > Running phase: pythonImportsCheckPhase
       > Executing pythonImportsCheckPhase
       > Check whether the following modules can be imported: gruvbox-factory
       > Traceback (most recent call last):
       >   File "<string>", line 1, in <module>
       >   File "<string>", line 1, in <lambda>
       >   File "/nix/store/f2krmq3iv5nibcvn4rw7nrnrciqprdkh-python3-3.12.9/lib/python3.12/importlib/__init__.py", line 90, in import_module
       >     return _bootstrap._gcd_import(name[level:], package, level)
       >            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
       >   File "<frozen importlib._bootstrap>", line 1387, in _gcd_import
       >   File "<frozen importlib._bootstrap>", line 1360, in _find_and_load
       >   File "<frozen importlib._bootstrap>", line 1324, in _find_and_load_unlocked
       > ModuleNotFoundError: No module named 'gruvbox-factory'
       For full logs, run 'nix log /nix/store/w9wfy7wp88mr8grz8vgmcdbdfqmv9hfj-gruvbox-factory-2.0.0.drv'.
error: 1 dependencies of derivation '/nix/store/i8rvnijpg9b9vg9z7czds5h5rqwmzacp-nix-shell-env.drv' failed to build
```

The Nix logs can be difficult to parse, but in this case the error was clear: when trying to develop the package, Nix could not find the module named `gruvbox-factory`. This occurred during the `pythonImportCheckPhase`. Upon checking my default.nix file, I noticed the pythonImportsCheck was configured to look for "gruvbox_factory" as the module name.
```
     > wrapping `/nix/store/8v353k03iyxfkp0hlclidzh5ywzzys5j-gruvbox-factory-2.0.0/bin/gruvbox-factory'...
       > Executing pythonRemoveTestsDir
       > Finished executing pythonRemoveTestsDir
       > Running phase: installCheckPhase
       > no Makefile or custom installCheckPhase, doing nothing
       > Running phase: pythonCatchConflictsPhase
       > Running phase: pythonRemoveBinBytecodePhase
       > Running phase: pythonImportsCheckPhase
       > Executing pythonImportsCheckPhase
       > Check whether the following modules can be imported: gruvbox-factory
       > Traceback (most recent call last):
       >   File "<string>", line 1, in <module>
       >   File "<string>", line 1, in <lambda>
       >   File "/nix/store/f2krmq3iv5nibcvn4rw7nrnrciqprdkh-python3-3.12.9/lib/python3.12/importlib/__init__.py", line 90, in import_module
```

```
  pythonImportsCheck = [
    "gruvbox-factory"
  ];
```
Initially, I assumed the module name would match the package name ("gruvbox-factory"), since that seemed logical. However, upon checking the pyproject.toml file when the error occurred, I discovered that the actual module name defined in the setuptools configuration was different. The package used a different module name internally than what was exposed in the package name.

Checking the pyproject.toml revealed the actual module name:

```toml
[tool.setuptools.packages.find]
include = ["factory"]
```

I updated the pythonImportsCheck in default.nix accordingly:

```nix
pythonImportsCheck = [
    "factory"  # Changed from "gruvbox-factory"
];
```

After this change, running `nix develop` succeeded. I proceeded to run `nix build` to create the package and make it accessible in my shell.

## Building the Package
```bash
nix build \
  --impure --expr \
  'let pkgs = import <nixpkgs> { }; in pkgs.callPackage ./default.nix {}'
```

### Successful Build Result
```bash
~/Documents/01_Project/Builds/default  ls
.rw-r--r-- 1.2k thein3rovert 12 Apr 11:45  default.nix
.rw-r--r-- 1.0k thein3rovert 12 Apr 11:17  flake.lock
.rw-r--r--  586 thein3rovert 12 Apr 11:10  flake.nix
lrwxrwxrwx    - thein3rovert 12 Apr 11:48  result -> /nix/store/1wjcirbfks8xp2svp4qd9q2snq4j1j7i-gruvbox-factory-2.0.0
```

## Testing the Package
```bash
~/Documents/01_Project/Builds/default  gruvbox-factory
usage: gruvbox-factory [-h] [-p [{white,pink,mix}]] [-i IMAGES [IMAGES ...]]
A simple cli to manufacture Gruvbox themed wallpapers.
options:
  -h, --help            show this help message and exit
  -p [{white,pink,mix}], --palette [{white,pink,mix}]
                        choose your palette, panther 'pink' (default), snoopy 'white' or smooth 'mix'
  -i IMAGES [IMAGES ...], --images IMAGES [IMAGES ...]
                        path(s) to the image(s).
```

Note: This is only available through the shell when I exit the shell the built package will not be available. While I didn't try other options to fix the issue with the dependencies, I might try the options some other time when I run into similar issues regarding dependencies and I will be sure to make a blog about how I used it so stay tuned... and have a great day.

### Resources
https://tech.aufomm.com/my-nix-journey-how-to-use-nix-to-set-up-dev-environment/
https://github.com/paulopacitti/gruvbox-factory
