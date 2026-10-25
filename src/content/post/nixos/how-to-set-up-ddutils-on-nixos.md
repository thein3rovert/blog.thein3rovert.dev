---
title: "ddutils on Nixos"
description: "This post provides a guide on installing and configuring ddcutil on NixOS"
publishDate: "04 Aug 2024"
tags: ["nixos", "ddutils"]
updatedDate: 6 December 2024
---
## Installation and Configuration
- Search nix search for `ddcutil` package or simple add this command to your nix-configuration pkg config.
```bash
 environment.systemPackages = with pkgs; [
	ddcutil
];
```
Add it to configuration.nix and sudo rebuild
```
sudo rebuild switch
```
2. Verify it its installed by running `ddcutil detect` command, if you get an error like unable to find `/ddc/dev/12c`. directory.
```bash
sudo ddcutil detect
```

You should get something like this:
```
   I2C bus:  /dev/i2c-4
   DRM connector:           card1-HDMI-A-1
   EDID synopsis:
      Mfg id:               SEM - Samsung Electronics Company Ltd
      Model:                DM700A-H
      Product code:         804  (0x0324)
      Serial number:
      Binary serial number: 0 (0x00000000)
      Manufacture year:     2012,  Week: 0

Invalid display
   I2C bus:  /dev/i2c-12
   DRM connector:           card1-eDP-1
   EDID synopsis:
      Mfg id:               BOE - BOE
      Model:
      Product code:         2449  (0x0991)
      Serial number:
      Binary serial number: 0 (0x00000000)
      Manufacture year:     2020,  Week: 33
   This is a laptop display.  Laptop displays support DDC/CI
```

If you get that error that says you dont have the `i2c` kernel modules ,we need to load it manually by using the following command
```bash
sudo modprobe i2c-dev
```
you should get an i2c kernel modules 1 - 16 .

You can verify your `i2c` by usng this command this will list all the i2c needed.
```bash
`lc /dev/12c-*`
```
Then run the i2c detect again, you should get information about all the monitor you're connected to.

Before setting the brightness, make sure that you know the current brightness you are currently i so make sure you run the command below,  this will show you the current brightness if your monitors.
```bash
sudo ddcutil getvpc 10`
```
After that then try increase and decrease the brightness by running the
```bash
sudo ddcutil setvcp 10 +100 #Higher number
```
for increased brightness.

Then
```bash
sudo ddcutil setvcp 10 +10 # lower number
```
or increase brightness.

 You can also verify if your monitor supports brightness control by running the
 ```bash
 sudo ddcutil capabilities | grep "Feature: 10"
```

The next thing to DO is to create a `udev` rules, this gives `i2c` groups the read and writer permissions so non-root users can access and control the I2C devices and using the tools like `ddcutil` without having to use `sudo` everytime. We can do that by using this command.
```sh
sudo cp /usr/share/ddcutil/data/60-ddcutil-i2c.rules /etc/udev/rules.d

```
If you encounter an error in this process it because `nixos` has a different way of handling file systems and package management so we need to find the `share` directory. Basically it cannot find the share folder that contains the data we want to copy so we have to find the share folder. After a successful research..ha foufn out the if the share folder is not in the` /usr/share/` then it can be found in the `/run/current-system/sw/share/ddcutil` son then we can run this command again with the correct path.
```sh
sudo cp /run/current-system/sw/share/ddcutil/data/60-ddcutil-i2c.rules /etc/udev/rules.d
```
On other `linux` distro this approach will work but as we all know as a nix user every thing got to be declarative so what we will have to do in other to solve the error.
```
sudo cp /run/current-system/sw/share/ddcutil/data/60-ddcutil-i2c.rules /etc/udev/rules.d
cp: cannot create regular file '/etc/udev/rules.d/60-ddcutil-i2c.rules': Read-only file system
```
We need to add the following line to our configuration.nix files.
```conf
services.udev.packages = [ (pkgs.runCommand "custom-udev-rules" { buildInputs = [ pkgs.coreutils ]; } '' mkdir -p $out/lib/udev/rules.d cp ${pkgs.ddcutil}/share/ddcutil/data/60-ddcutil-i2c.rules $out/lib/udev/rules.d/ '') ];
```
This will add the `60-ddcutil-i2c.rules` directly to our udev rule to your NixOS system.
After doing that save the changes and run the following command:
```sh
sudo nixos-rebuild switch
```
After rebuilding in other to apply the changes we need to reboot our system but there is a better way to reload the `i2c` without rebooting out system.
```
sudo groupadd --system i2c

sudo usermod $USER -aG i2c
```
You might be wondering why its important to creating i2c group or groups in general, this is because creating groups are important steps that should be taken for managing permissions perfectly on devices and their resources. In relation to the i2c, some devices require group permission in other to access `i2c` devices, `ddcutil`
needed access to i`/dev/i2c-*` devices in other to interact with monitor settings.

Now that we have created a group for ic2 we need to verify the group we can do that use the command:
```bash
groups $USER
```
You can also check the `i2c` group file to see if the user is listed in the group:
```bash
grep i2c /etc/group
```
You should get a result like this:
```
i2c:x:544:$USER
```
Next we need to also make sure we can load the `i2c-dev` automatically, we can do that using this command:
```bash
sudo touch /etc/modules-load.d/i2c.conf
```

```bash
sudo sh -c 'echo "i2c-dev" >> /etc/modules-load.d/i2c.conf'
```
Then we reboot for the changes to take full effect
```
sudo reboot
```

### Resources
https://www.ddcutil.com/i2c_permissions_using_group_i2c/
https://discourse.nixos.org/t/proper-way-to-access-share-folder/20495
https://github.com/daitj/gnome-display-brightness-ddcutil/blob/master/README.md
https://search.nixos.org/packages?channel=24.05&show=gnomeExtensions.brightness-control-using-ddcutil&from=0&size=50&sort=relevance&type=packages&query=ddcutil
https://github.com/NixOS/nixpkgs/issues/292049
