---
title: "LTSP network on Incus"
description: "Setting up ltsp network on incus lxd journey"
publishDate: "10 January 2026"
tags: ["incus", "ltsp"]
updatedDate :"08 January 2026"
---

Today I woke up quite earlier than usual and couldn't go back to sleep, so I decided to work on something with the little time I had. I've been putting off this project for a while now because I pretend that I don't have the time, haha.

The project involves emulating a complete LTSP network. LTSP stands for Linux Terminal Server Project... it makes maintaining tens or hundreds of diskless clients as easy as maintaining a single PC. The terminals (client machines) boot over the network without needing any permanent storage attached.

In this setup, both the ltsp_server and ltsp_client run as virtual machines on a physical machine with LXD installed. The main architecture is just two computers... one for the server and one client. Later we could add any number of clients easily.

The setup aims to do two things. First, it roughly matches the physical network topology where the server has two connections... one to the internet and one to a switch. Second, it helps us get around an issue that we might run into when getting an LTSP network running with LXD.

For this setup, you need to have Incus or some sort of LXD installed on your system. I decided to go with LXD because it gives you the ability to manage both virtual machines and system containers. We could do this with just a single application in a container if we used something like Docker, but we're not doing that because we need to run an entire Linux operating system... which is possible through the Linux kernel LXC system.

I already had Incus installed on my system since I use it to spin up LXC containers for some of my services like Garage. I wanted that isolation, so I didn't need to worry about installing anything new on my server.

The setup works like this... the LTSP client is set up as a virtual machine booting via iPXE, and the LTSP server itself runs as an LXC container. iPXE is basically a network boot firmware that lets machines boot from the network instead of a local disk.

The big benefit of this setup is that it lets you have your own personal development machine without having to install something like Proxmox on bare metal or set up a dedicated server machine just for personal use.

## The Virtual Network

For the virtual network, we need two bridge networks. The first one is called lxdbr0 and the second is lxdbr1. I already had the first bridge network since it came by default when I installed Incus LXD, so I only needed to create the second one.

You can think of these bridge networks as physical switches... they basically allow containers to communicate with anything that's attached to the bridge. The client and the server will communicate through the second bridge, lxdbr1.

One really nice thing about LXD is that it provides containers with IP addresses using DHCP and gives them internet access through NAT. This means our first network lxdbr0 acts as the internet router in the physical network topology.

Since I already had the first bridge network, I just had to create the second one. This bridge network is what we'll use to connect all the instances we create. lxdbr1 uses the LTSP standard subnet which is 192.168.67.1/24. I disabled NAT, DHCP, and IPv6 addresses because LTSP will be providing a PXE-enabled DHCP for the client to enable network booting.

```
incus network create lxdbr1 \
  ipv4.address=192.168.67.1/24 \
  ipv4.nat=false \
  ipv4.dhcp=false \
  ipv6.address=none
```

After creating lxdbr1, I confirmed the network was created using this command:

```
incus network list

RESULT
+----------+----------+---------+-------------------+---------------------------+---------------------------------+---------+---------+
| lxdbr1   | bridge   | YES     | 192.168.67.1/24   | none                      | Custom: lxd tutorial bridge     | 2       | CREATED |
+----------+----------+---------+-------------------+---------------------------+---------------------------------+---------+---------
```

Perfect... now I have both bridge networks I need.

Next step was to create the server container. For the container, I went with Linux Mint since it's lightweight.

```
incus init images:mint/xia ltsp-server
```

If you want to view the list of available container images, you can use this command:

```
incus image list images: | grep mint
```

## Security Configuration

In order to get LTSP working in a server container, there are some LXD security settings we need to relax. This isn't ideal for production, but since this is for a development environment, it's fine. We need to enable security nesting and security privileged mode. The reason is that LTSP wasn't designed as a confined workload... it assumes root-level access. Without relaxing these settings, it won't function properly.

When we set security.nesting to true, this allows the container to create nested namespaces and perform operations that look like container-inside-container behavior. Setting security.privileged to true removes the user namespace mapping, giving the container near-host privileges. Without this, mounting filesystems, exporting NFS roots, or accessing kernel features needed for PXE and client boot often fail in subtle ways.

```
# Enable nesting and privileged mode
incus config set ltsp-server security.nesting true
incus config set ltsp-server security.privileged true
```

LTSP also needs access to loop devices for mounting images. This required three steps:

```
# Set cgroup permissions for loop devices
incus config set ltsp-server raw.lxc "lxc.cgroup2.devices.allow = b 7:* rwm
lxc.cgroup2.devices.allow = c 10:237 rwm"

# Add loop-control device
incus config device add ltsp-server loop-control unix-char \
  path=/dev/loop-control source=/dev/loop-control

# Count and add all loop devices from host
HOST_LOOP_COUNT=$(ls /dev/loop[0-9]* 2>/dev/null | wc -l)
echo "Found $HOST_LOOP_COUNT loop devices on host"

for i in $(seq 0 $((HOST_LOOP_COUNT - 1))); do
  if [ -e /dev/loop$i ]; then
    incus config device add ltsp-server loop$i unix-block \
      path=/dev/loop$i source=/dev/loop$i
  fi
done
```

Optionally, you can bump up the resources allocated to the server. I did this so that later, when building a compressed image of the server's filesystem, it runs quickly. Adjust these as you see fit:

```
incus config set ltsp-server limits.cpu=5
incus config set ltsp-server limits.memory=3GiB
```

## Server Network Configuration

Now for the server network configuration, we need to have two virtual network interface cards. One will be attached to lxdbr0, which will take an IP address from DHCP since it's enabled by default. The second interface card will be attached to lxdbr1, which we already disabled DHCP for. We'll also need to attach a static IP address to the second interface card. Since LTSP handles things differently, we need to use the distribution's standard method to assign an IP address from within the container itself.

The first interface card is already connected to lxdbr0 by default, so I only needed to configure the second one manually.

```
incus config device add ltsp-server eth1 nic \
  network=lxdbr1 \
  name=eth1
```

After connecting the interface, we need to start the server and confirm that the server has an IP address from DHCP on eth0 and no IPv4 on eth1.

```
incus start ltsp-server

incus exec ltsp-server -- ip --brief address
```

And as you can see below, we have an IP address on eth0 and nothing on eth1, exactly as expected.

```
lo     UNKNOWN  127.0.0.1/8
eth0   UP       10.135.108.178/24 ... <----- comes from LXD's DHCP
eth1   UP        ... <--- no IPv4 address
```

To wrap up the network configuration, we need to create a netplan file for eth1 with a static IP so it persists across reboots.

```
incus exec ltsp-server -- bash -c 'cat > /etc/netplan/60-ltsp-static.yaml << EOF
network:
  version: 2
  ethernets:
    eth1:
      addresses:
        - 192.168.67.2/24
EOF'
```

Then fix the permissions so netplan doesn't complain:

```
incus exec ltsp-server -- sh -c 'chmod 600 /etc/netplan/*.yaml'
```

And finally, apply the changes:

```
incus exec ltsp-server -- netplan apply
```

I verified again that the changes took effect:

```
incus exec ltsp-server -- ip --br -4 a
lo      UNKNOWN  127.0.0.1/8
eth0    UP       10.135.108.178/24
eth1    UP       192.168.67.2/24 # <-- now set
```

So that's all about setting up the LTSP server. I'll make a new post on setting up the client. Hope you enjoyed it.
