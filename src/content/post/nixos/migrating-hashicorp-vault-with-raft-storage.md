---
title: "Migrating HashiCorp Vault with Raft Storage"
description: "Moving Vault to its own LXC container with proper snapshot migration."
publishDate: "03 April 2026"
tags: ["homelab", "vault", "proxmox"]
---

Yea, she's becca, my new Hasicorp vault running on proxmox, named after Becca Franco...the woman who built the bunker, forged the Flame, and kept humanity's secrets safe.

I've been running HashiCorp Vault on my management server, emily. It worked fine, but it always felt wrong...i personally believe a secrets manager shouldn't be sharing a host with anything else especially if all other services are also on the same server.

If something goes sideways on emily, I don't want Vault caught in the blast radius. So I've decided to move it to its own LXC on Proxmox, a little container I named **becca**.

My plan now is to migrate the existing data from the vault to the new vault successfully with out loosing the data.

Vault on emily was running as a Podman container using integrated Raft storage. The data lived at `/vault/data` inside the container, and the config looked like this:

```hcl
ui            = true
disable_mlock = true

storage "raft" {
  path    = "/vault/data"
  node_id = "vault-node-1"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = true
}

api_addr     = "http://<EMILYS_IP>:8200"
cluster_addr = "http://<EMILYS_IP>:8201"
```

My first instinct was to just copy the data files directly. Vault's Raft backend is a SQLite database...`vault.db` and a `raft/` directory.

```bash
# Back up on emily
cp -r /var/lib/vault ~/vault-backup

# Copy to becca
sudo chmod -R 755 /tmp/vault-migrate/
rsync -av /tmp/vault-migrate/ root@<BECCA_IP>:/var/lib/vault/
```

This technically worked, but I ran into an immediate problem, Vault was starting up and reporting as a **standby** node, with the active node address pointing back to emily's Tailscale IP. Becca thought emily was still the leader and kept trying to reach it.

The issue is that Raft bakes cluster membership and peer addresses into the database itself. Just copying the files moves the data but not the cluster identity. Becca saw the same cluster state emily had...and emily was listed as the leader.

By this time i hope you've havent lost thought which is becca and which is emily :).

I tried a few things to break out of this. Clearing the `raft/` directory and restarting but this didnt fix it, vault was still read the old cluster state from `vault.db`), I then ran `vault server -recovery` to try and fix things in recovery mode but the unseal API isn't available in recovery mode, so this went nowhere fast, i also tried adding `retry_join` pointing to becca's own IP, well didn't help either, it was already joined...just as a follower

None of it worked cleanly. Eventually I reverted to emily and went looking for the proper way to do this.

## Raft Snapshots

So i went on to do some research on reddit as to what is the best way yo migrate data on vault, which points me in the right direction of using ` vault operator raft snapshot`.

This takes a complete point-in-time backup of your Vault data that can be restored to a fresh instance.

Since emily didn't have the Vault CLI installed (it was running in a container), I used the API directly.

**Step 1..Take a snapshot from emily:**

```bash
curl -s --header "X-Vault-Token: <root-token>" \
  http://<EMILYS_IP>:8200/v1/sys/storage/raft/snapshot \
  -o ~/vault-snapshot.snap
```

**Step 2: Copy it to becca:**

```bash
scp ~/vault-snapshot.snap root@<BECCA_IP>:/root/
```

**Step 3: On becca, install Vault and configure it:**

```bash
apt install gpg -y
wget -O - https://apt.releases.hashicorp.com/gpg | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com jammy main" | tee /etc/apt/sources.list.d/hashicorp.list
apt update && apt install vault -y
```

Becca's final config:

```hcl
ui            = true
disable_mlock = true

storage "raft" {
  path    = "/opt/vault/data"
  node_id = "becca"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = true
}

api_addr     = "http://<BECCA_IP>:8200"
cluster_addr = "http://<BECCA_IP>:8201"
```

**Step 4: Initialize becca fresh, unseal it, then restore the snapshot:**

```bash
vault operator init -key-shares=3 -key-threshold=3
vault operator unseal # x3 with new temp keys

# Restore emily's snapshot
curl -s --header "X-Vault-Token: <new-temp-root-token>" \
  --request POST \
  --data-binary @/root/vault-snapshot.snap \
  http://<BECCA_IP>:8200/v1/sys/storage/raft/snapshot-force
```

The `snapshot-force` endpoint is key here, it overwrites the current Vault state entirely with the snapshot, including the seal configuration. After restoring, you restart Vault and unseal with your **original keys from emily**.

**Step 5: Restart and unseal with emily's original keys:**

```bash
systemctl restart vault
export VAULT_ADDR="http://<BECCA_IP>:8200"
vault operator unseal # x3 with emily's original keys
```

And that was it. `vault status` came back with `HA Mode: active` and the cluster name from emily. All secrets intact.
