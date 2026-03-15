---
title: "Building a Self-Hosted GitHub Runner"
description: "Setting up a self-hosted GitHub Actions runner on Proxmox to speed up Terraform and NixOS builds"
publishDate: "14 Mar 2026"
tags: ["github-actions", "ci-cd", "terraform", "infrastructure", "nixos", "proxmox"]
updatedDate: 14 Mar 2026
---

The problem with most of my infrastructure projects is the feedback loop when i make a change, push it and have to wait 20 minutes for the build.. and then discover i have made a typo. I repeat this a few times and and realise i've burned an entire afternoon. I got introduced to github runner from someone at work place and I've decided it's time i build mine.

What I'm really after is building and deploying my NixOS infrastructure with fastee iteration cycles. But i have to start somewhere..first i'd like to use it to run my terraform infra workflow, you know the fmt, validate, plan and apply...after i'd want to use it for my nixos build for each of my server which as of today takes over 27min of build time.
## The Runner Problem

As it's my first time building a custom runner, i wasn't to familiar with the specs i'd need or what is enough so i went with the following.
Image: Ubuntu 22.04
core: 2
Memory: 4gb
Disk size: 30gb
Network: Tailscale

The reason why i am using tailscale is because i want to keep my runner within my tailnet, as all my server also run within my tailnet, exposing it over the internet is risky especially for self hosted github runner in a public repo and additionally, i have other services that will be needed by my workflow like `hasicorp vault` that is running within my tailnet, i use it to store my secrets for terraform and othher things.

I already had Terraform managing my LXC containers on Proxmox, so spinning up a dedicated GitHub Actions runner was straightforward. I added a new module to my dev environment:

```hcl
# GitHub Actions Runner (Ubuntu 22.04)
module "github_runner" {
  source = "../../modules/lxc"

  target_node = var.target_node
  password    = var.root_password
  hostname    = "github-runner"
  vmid        = 120
  ostemplate  = "local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst"
  cores       = 2
  memory      = 4096
  swap        = 1024
  disk_size   = "30G"
  storage     = var.rootfs_storage
  ssh_keys    = file(var.ssh_public_key_path)

  gateway         = var.gateway
  cidr_suffix     = var.cidr_suffix
  ip_base         = var.ip_base
  bridge          = var.bridge
  container_id    = 120
  proxmox_host_ip = var.proxmox_host_ip
  os_type         = "ubuntu"
  extra_tags      = ["github-runner", "ci"]
}
```

After applying that, I SSH'd into the container and set it up as a GitHub Actions runner. GitHub provides the download links and token when you add a new runner in your repository settings. The setup process looks like this:

```bash
# Create a runner user and switch to it
useradd -m -s /bin/bash runner
su - runner

# Download and extract the runner
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.332.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.332.0/actions-runner-linux-x64-2.332.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.332.0.tar.gz

# Configure the runner
./config.sh --url https://github.com/YOUR_USER/nixos-config --token YOUR_TOKEN

# Exit back to root and install as a service
exit
cd /home/runner/actions-runner
sudo ./svc.sh install runner
sudo ./svc.sh start
```

The important part is installing it as a systemd service so it survives reboots and runs automatically.

Next i installed tailscale on the runner, along with a few other dependencies. Installing Tailscale is just `curl -fsSL https://tailscale.com/install.sh | sh` followed by `tailscale up`. For the other tools, I installed Node.js 20 (the GitHub runner needs this), Terraform, Vault CLI, unzip, and the usual bosses like curl and git.

I didnt want to store the secrets directly on github. That works, but it means duplicating secrets across different systems. I already had everything in Vault: Proxmox credentials, S3 credentials for Terraform state, SSH keys. So duplication there wasnt just necessary. The workflow starts by pulling everything from Vault:
```yaml
- name: Get S3 credentials from Vault
  id: vault
  run: |
    export VAULT_ADDR="${{ secrets.VAULT_ADDR }}"
    export VAULT_TOKEN="${{ secrets.VAULT_TOKEN }}"

    # Fetch S3 credentials from Vault
    S3_ACCESS_KEY=$(vault kv get -field=access_key_id secret/s3)
    S3_SECRET_KEY=$(vault kv get -field=secret_access_key secret/s3)

    # Fetch SSH public key from Vault
    SSH_PUB_KEY=$(vault kv get -field=ssh_public_keys secret/ssh)

    echo "::add-mask::$S3_ACCESS_KEY"
    echo "::add-mask::$S3_SECRET_KEY"
    echo "S3_ACCESS_KEY_ID=$S3_ACCESS_KEY" >> $GITHUB_ENV
    echo "S3_SECRET_ACCESS_KEY=$S3_SECRET_KEY" >> $GITHUB_ENV
    echo "SSH_PUBLIC_KEY=$SSH_PUB_KEY" >> $GITHUB_ENV
```

The only secrets stored in GitHub are `VAULT_ADDR` and `VAULT_TOKEN`. Everything else comes from Vault at runtime. I added the `::add-mask::` lines, this ensures that these values don't leak into logs.

## The Full Pipeline

The complete workflow runs on pull requests and manual triggers. I specifically excluded pushes to main since I didn't want plans running on production commits. The workflow runs in parallel for both dev and prod environments using a matrix strategy:

```yaml
jobs:
  terraform-validate:
    runs-on: self-hosted
    strategy:
      matrix:
        environment:
          - dev
          - prod
```

Each environment goes through the same steps: format checking, initialization with the S3 backend, validation, and finally plan. The format check is set to `continue-on-error: true` so it doesn't block the rest of the pipeline, but the workflow fails at the end if formatting is off:

```yaml
- name: Terraform fmt check
  id: fmt
  run: terraform fmt -check -recursive
  working-directory: terraform/
  continue-on-error: true

# ... other steps ...

- name: Fail on fmt error
  if: steps.fmt.outcome == 'failure'
  run: |
    echo "Terraform fmt check failed. Run 'terraform fmt -recursive' to fix."
    exit 1
```

The init step needs both S3 credentials for the backend and Vault credentials for the provider. Terraform reads S3 credentials from `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables, while Vault credentials are passed as Terraform variables:

```yaml
- name: Terraform init (${{ matrix.environment }})
  id: init
  run: terraform init -reconfigure
  working-directory: terraform/envs/${{ matrix.environment }}
  env:
    AWS_ACCESS_KEY_ID: ${{ env.S3_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ env.S3_SECRET_ACCESS_KEY }}

- name: Terraform plan (${{ matrix.environment }})
  id: plan
  run: terraform plan -no-color
  working-directory: terraform/envs/${{ matrix.environment }}
  env:
    AWS_ACCESS_KEY_ID: ${{ env.S3_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ env.S3_SECRET_ACCESS_KEY }}
    TF_VAR_vault_address: ${{ secrets.VAULT_ADDR }}
    TF_VAR_vault_token: ${{ secrets.VAULT_TOKEN }}
  continue-on-error: true
```

## Conclusion

Right now this one runs validates, fmt and plan for Terraform changes and shows what would happen if I applied them. Great,  but the real goal for me is speeding up NixOS build which takes around 20 minutes and I want to get that under 5 minutes or less using this same self-hosted setup.

For now though, I have a working Terraform CI pipeline that doesn't leak secrets all over GitHub and runs on hardware I control. That's a solid foundation to build on.

Looking forward to what's next....Happy Learning.
Have a blessssssssssssssssed day.. :)
