---
title: My Nixos Sever Kernel Issue
description: Explaining a weird kernel issue I had with my server after update
publishDate: "2025-04-20T10:55:00Z"
---

Today, i decided to update my nixos server to the latest version. Since i'm now managing my nixos with flake, it's quite easy to upgrade. All i need to run is:

```sh
nix flake update
```

And this will handle the rest - it updates the flake.lock file and pulls the latest version. After that, running nixos-rebuild builds the system with the new changes:

```sh
nixos-rebuild switch --flake .#<hostname>
```

Each time i run a nix upgrade i keep having issues (i guess its skill issues 🤣). Anyways, i'm always curious so i see it as a new game challenge for me to overcome.

My first time running a nix flake upgrade, i had issues with the latest nixos version - the warbler version which i'm currently using... it freaked me out as i took the risk of upgrading my one and only machine in the middle of my semester! It had all my university files and other important files... you might be thinking "well, back it up!!!"

I did back it up but still wasn't so sure i backed up everything i needed. But i really wanted to upgrade my system because of some latest packages version upgrades that i needed to further my semester successfully. It was a stupid decision but i had no choice.

Anyways i've been going off the topic here, snap!!! umm yea when i upgrade the system then it broke, as it was the latest version it came with broken changes i was so scared.

Fortunately nixos had a roll back option - nixos rollback is one of the best things that has ever happened to me! It made me love nixos and now my server is running on nixos... look at that!!!!

Anyways i rolled back to a stable generation and for a very long time i didn't upgrade my system 🤣 scared little me. I was still very curious tho because i don't like giving up... kept researching and reading docs finding a better way to upgrade without breaking my system. I joined some discord nixos communities, discussed with few members who happened to have the same issue and had to roll back to a stable version.

After a few months, i decided to upgrade again. It was like hitting replay in a game or something, full focused... zen mode!!! Long story short i made it... never felt so happy.

This is starting to become a story book... hahaha sorry about that! So yea today i had some other issue when i upgraded my system, this is a kernel related issue. The kernel is trying to use a specific version but couldn't find it in my nix store... which is weird. I viewed the available kernel in my nix store and it was there... then why is nix not seeing it?

I did my research - there were a lot of options about what could have gone wrong: corrupted nix store, kernel not available, nix version and a lot more. All these were suggested by chatgpt but i didn't blindly want to follow what it was suggesting and actually consulted some docs and see what others are saying online.

I found a conversation from a while ago, https://discourse.nixos.org/t/unable-to-nixos-rebuild-switch-with-flake/11789 and it pointed out that:

>[!cite]
>Containers run under the "host" kernel, thus don't have/need their own. But you've set this as a toplevel configuration and so the bootloader generator is going to try to generate boot entries for it.

Which made me believe my server is running on a container. It suggested that we add the following code to my configuration.nix file:

```nix
# Added because it is present in nix flakes examples.
boot.isContainer = true;
```

So i did and ran nix rebuild again and viola! My system got upgraded and fixed... but my curiosity didn't end there. I wasn't so sure my server was a container as i purchased a dedicated server, so i consulted chatgpt as i needed a way to check if my server is running on a container.

Here are the commands i ran in case you might also need it some day:
1. Check if you're in a container:
```sh
systemd-detect-virt
```

2. Check virtualization type:
```sh
lscpu | grep Virtualization
```

Which shows that my system is indeed not running on a container:
```sh
[thein3rovert-cloud@nixos:~/thein3rovert-flake]$ systemd-detect-virt
kvm

[thein3rovert-cloud@nixos:~/thein3rovert-flake]$ lscpu | grep Virtualization
Virtualization type:                  full
```

My server is running on KVM (Kernel-based Virtual Machine) environment, which is different from a container:

>[!cite]
>- KVM is a full virtualization solution:
>- You DO have your own kernel
>- You CAN manage your own kernel packages
>- You have more control than in a container

So i guess i was just lucky or i definitely missed something but i will keep doing my research and update this note when i fully understand what happened.
