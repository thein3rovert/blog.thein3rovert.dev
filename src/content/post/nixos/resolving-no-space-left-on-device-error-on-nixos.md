---
title: "Resolving No Space Left on Device Error on NixOS"
description: "Learn how to resolve the 'No space left on device' error on NixOS by optimizing tmpfs and swap space for seamless package installations."
publishDate: "12 Aug 2024"
tags: ["nixos" ]
updatedDate: 19 June 2025
---

Recently, I encountered a "No space left on device" error while trying to install IntelliJ on my NixOS system. Despite having 70 GB of available space, the issue persisted. As a newcomer to NixOS, dual-booting with Windows, I was puzzled by this problem.

**Understanding the Issue:**
The error wasn't due to a lack of total disk space but was likely related to the temporary directory (/tmp) or the Nix store (/nix/store) running out of space. This is a common issue in NixOS, especially with large package installations. I suspected the Nix store was full, so I tried the following commands to free up space:

- `nix store --optimize`
- `nix store --gc`

Unfortunately, these didn't resolve the issue.
I turned to Reddit and other online resources, hoping to find others who faced similar issues. However, documentation was sparse, and solutions were not clearly explained.
**Solutions Tried:**
Here are some options I explored:
1. **Checking /tmp Directory:** Ensured it wasn't full.
2. **Increasing Nix Store Size:** Considered adjusting the Nix store size.
3. **Clearing Cache:** Attempted to clear any unnecessary cache files.

4. **Increase the tmpfs size**: You can try increasing the tmpfs size by adding the following line to your `/etc/nixos/configuration.nix` file:
```nix
boot.runSize = "10G";  # adjust the size as needed
```
Then, restart your system and try installing the package again.

2. **Use a larger swap partition**: If you have a swap partition, ensure it's large enough to accommodate the temporary build process. You can check the current swap size using `swapon -s`.

3. **Mount the Nix store with a larger size**: You can remount the Nix store with a larger size using the following command:
```bash
mount -o remount,size=10G,noatime /nix/.rw-store
```
Adjust the size as needed.

4. **Clear temporary files**: Try clearing temporary files and directories, including `/tmp` and `/var/tmp`, to free up space.


None of those solution seem to solve the problem i was having each time i build a package I keep getting the no space left on device error. Then i came across a blog post that solve the issue i was having.
**Solutions Explored:**

1. **Increase tmpfs Size:**
    - **Explanation:** tmpfs stores files in volatile memory. Increasing its size allows more files to be stored in memory.
    - **How to Apply:**
        - Add the following line to `/etc/nixos/configuration.nix`:
            ```nix
            boot.tmpfsSize = "4G";  # Adjust this size as needed
            ```
        - Apply the changes with:
            ```bash
            sudo nixos-rebuild switch
            ```
    - **Consideration:** Ensure enough free RAM or swap to support the increased size.
2. **Increase Swap Space:**
    - **Explanation:** Swap space acts as overflow memory when RAM is full, supporting resource-heavy operations.
3. **Check Temporary File Storage:**
    - Use the following command to check current tmpfs usage:
        ```bash
        df -h | grep tmpfs
        ```

    - If low, increase `/tmp` size by setting `boot.tmpfsSize` in the NixOS configuration.
**Conclusion:**
After adjusting the tmpfs size, the error was resolved. This experience taught me valuable lessons about managing disk space on NixOS, and I hope it helps others facing similar issues.

#### Resources
https://nixos.wiki/wiki/Storage_optimization
