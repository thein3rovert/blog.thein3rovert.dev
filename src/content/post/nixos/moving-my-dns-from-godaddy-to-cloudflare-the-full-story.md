---
title: "Moving My DNS from GoDaddy to Cloudflare: The Full Story"
description: "The full story of moving my DNS from GoDaddy to Cloudflare.... importing and cleaning 25 records, switching Traefik to a Cloudflare ACME challenge, learning where the proxy fits, and bringing it all under Terraform."
publishDate: "25 october 2026"
tags: ["dns", "cloudflare", "godaddy", "terraform", "traefik", "homelab"]
---

In my last post, I mentioned moving my DNS management to Infrastructure as Code as one of the three things I worked on that day. I briefly touched on it, but the migration itself turned out to be quite an interesting experience, and I thought it deserved its own post.

This was not just about moving some DNS records from one provider to another. It involved my domain, the services running behind Traefik, my Let's Encrypt certificates, and the way I manage my infrastructure with Terraform. There were things I was worried about, things that went surprisingly smoothly, and a few mistakes I made along the way.

So, I thought I would share the whole process, including what I learned, in case someone else is planning to do something similar.

## Why I wanted to move away from GoDaddy DNS

My domain registrar is GoDaddy, where I originally purchased my domain. Until recently, I also managed all my DNS records through its web interface.

Whenever I deployed a new service in my homelab, I would log into GoDaddy, create an A record or CNAME record, and configure the other details required to make the service accessible.

There is nothing inherently wrong with doing things this way, especially when you have the time. However, as I mentioned in my previous post, time is becoming a bit of a problem for me. Between university and working part-time, I cannot always afford to spend time manually managing things that could easily be automated.

My first thought was to manage my DNS records directly through Terraform using GoDaddy. Unfortunately, GoDaddy does not offer a straightforward, well-supported integration for the workflow I wanted, so I started looking at alternatives.

Cloudflare seemed like the most sensible option. I could keep GoDaddy as my domain registrar, move my DNS hosting to Cloudflare, and use Terraform to manage my records.

On paper, the plan seemed simple enough. However, there was one thing I was particularly worried about: breaking everything.

I have around fourteen subdomains sitting behind Traefik on one machine, with Let's Encrypt certificates issued through a GoDaddy DNS challenge. If I messed up the DNS migration, I could potentially break access to several services at once. Even worse, if I damaged my mail records, I might not receive the notifications telling me something had gone wrong.

I therefore decided to map out my entire DNS zone before making any changes. Looking back, that was probably the most important decision I made throughout the migration because it gave me a clear picture of what I had, what I needed, and what I could safely remove.

## The DNS import was calmer than I expected

Once I started the migration, things were actually much smoother than I had anticipated.

Cloudflare imported 24 of my 25 existing DNS records, and for a moment, I thought something had gone missing. After investigating, I realised that the missing record was the SOA record, which is managed as part of the DNS zone infrastructure and was not something I needed to recreate manually.

So, the import itself was effectively complete.

However, importing the records also meant bringing over years of accumulated clutter. I found old GoDaddy nameserver entries sitting inside the zone, a `_domainconnect` record associated with GoDaddy's domain setup process, and five stale `_acme-challenge` TXT records left behind by previous certificate renewals.

Some of those old challenge records belonged to hosts such as `forgejo` and `s3-web`, which no longer had A records.

I went through the records, checked what was still needed, and removed the ones that were no longer useful. That brought the total down from 24 records to 16.

I also noticed something else during the process. My `jotty` service had a Traefik router configured, but it never had a corresponding DNS record in either GoDaddy or Cloudflare. That was another small issue I had overlooked, so I added it to my list of things to fix.

This was a good reminder of why reviewing existing infrastructure before migrating it is so important. You do not want to automate a mess without first understanding what you are actually managing.

## Changing the nameservers tested my patience

After importing and cleaning up the records, the next step was to update the nameservers at GoDaddy to the two nameservers assigned to me by Cloudflare.

I made the change, ran my usual checks, and my terminal insisted that nothing had changed. Everywhere I looked, I was still seeing the old GoDaddy nameservers.

At that point, I started wondering whether I had edited the wrong page or selected the wrong option somewhere. It was one of those moments when you start questioning everything you have just done.

Fortunately, it turned out to be a caching issue.

The parent `.dev` registry already showed Cloudflare's nameservers, and direct queries against the Cloudflare nameservers returned the correct answers. A second public resolver also confirmed that the new delegation was visible within minutes.

My default resolver, however, was still holding on to the old answer until its cache expired.

That experience changed how I approached the rest of the migration. Instead of trusting a single DNS lookup, I started checking the delegation chain and comparing results from independent resolvers.

These were the commands I used:

```
dig NS thein3rovert.dev +trace +nodnssec | tail -n 6
dig NS thein3rovert.dev @8.8.8.8 +short
dig A memos.thein3rovert.dev @ace.ns.cloudflare.com +short
```

Each command helped me verify a different part of the process: the delegation chain, what a public resolver could see, and whether Cloudflare's authoritative nameserver was returning the expected record.

Once those checks agreed, I had much more confidence that the migration was working, even when my default resolver was still showing the old information.

It was a useful lesson in troubleshooting DNS. Sometimes, the change is correct, but the information you are looking at has not caught up yet.

## Updating Traefik to use Cloudflare

With DNS successfully moved, I still had another important task to complete.

My Traefik configuration was using GoDaddy as its DNS challenge provider for Let's Encrypt. Since I had moved DNS hosting to Cloudflare, I needed to update that configuration; otherwise, future certificate renewals would fail.

I considered keeping both providers around as a fallback, but that would have added unnecessary complexity. I decided to switch the configuration over to Cloudflare instead.

The resolver configuration now looks like this:

```
certificatesResolvers = {
  cloudflare = {
    acme = {
      email = "myemail@gmail.com";
      storage = "/var/lib/traefik/acme.json";
      dnsChallenge = {
        provider = "cloudflare";
        resolvers = [ "1.1.1.1:53" "8.8.8.8:53" ];
        propagation.delayBeforeChecks = 30;
      };
    };
  };
};
```

One thing I liked about this change was reducing the DNS propagation delay from 90 seconds to 30 seconds. Cloudflare's API and DNS infrastructure made it possible to use a shorter delay for my setup.

I also needed to update how Traefik received its DNS credentials. I manage my secrets using age-encrypted files, so I created a new encrypted file for Cloudflare containing the required API token.

The relevant Nix configuration looks like this:

```
cloudflare = {
  file = "${self.inputs.secrets}/cloudflare/cloudflare.age";
  path = "/home/thein3rovert/.secrets/.traefik-cloudflare";
};
```

The token itself was scoped to DNS editing for my domain rather than giving Traefik broader access than it needed.

I kept my existing `acme.json`, 
which meant I did not have to discard my existing certificates and start from scratch. After updating the configuration, I deployed the changes and watched the certificate process complete successfully.

Nine files changed, one dry build, and no outage.

That was probably one of the most satisfying moments of the migration. I had changed a critical part of my infrastructure without interrupting the services that depended on it.

## Then I got a little too confident with Cloudflare's proxy

Once Cloudflare showed my domain as active, I decided to enable proxying for almost all my DNS records.

At the time, it seemed like a good idea. I would get Cloudflare's proxy in front of my services and benefit from its filtering and other features.

Unfortunately, I had not thought carefully enough about which services should actually be proxied.

Things started going wrong when MinIO returned a `526` error, and my S3 tooling stopped working as expected. The error indicated a problem with Cloudflare validating the SSL certificate presented by the origin server.

I also realised that object storage was not a good fit for the free Cloudflare proxy in my setup because of its upload limitations. Large Git pushes to Forgejo raised similar concerns, and SSH connections were never something I should have tried to route through a standard HTTP proxy in the first place.

This was a good lesson in understanding the difference between simply enabling a feature and knowing whether it is appropriate for a particular service.

I eventually settled on a more deliberate approach. My interactive web applications would use Cloudflare's proxy, while infrastructure-related services that needed direct connections would remain DNS-only.

For example, my MinIO record is managed through Terraform like this:

```
minio = {
  name    = "minio.thein3rovert.dev"
  type    = "A"
  content = var.origin_ip
  proxied = false
  ttl     = 1
  comment = "minio - DNS only (S3 uploads)"
}
```

My blog, gallery, memos, and other suitable web applications sit behind the proxy. Services such as S3, Forgejo, SSH-related endpoints, and my apex domain remain direct where required by my setup.

I also added comments to my Terraform configuration explaining why certain records should remain DNS-only. That way, if I revisit the configuration months from now, I will not have to rediscover the reasoning behind those decisions.

Another thing I realised is that using Cloudflare's proxy does not automatically hide my origin IP if other DNS records still point directly to it. I therefore stopped treating the proxy as a way to conceal my infrastructure and started thinking of it primarily in terms of filtering, caching, and protecting suitable web services.

## Bringing everything under Terraform and Vault

The final part of the migration was making the entire setup reproducible.

After all, the original reason for doing this was to stop manually managing DNS records through a web interface.

I created a small reusable Terraform module and called it from my production environment, defining all sixteen DNS records in code.

I also wanted Terraform to retrieve the Cloudflare API token from Vault at plan time, using the same approach I already use for my Proxmox credentials.

The configuration looks like this:

```
data "vault_kv_secret_v2" "cloudflare" {
  mount = "secret"
  name  = "cloudflare"
}

provider "cloudflare" {
  api_token = trimspace(data.vault_kv_secret_v2.cloudflare.data["dns-token"])
}
```

This is where I encountered another issue, and this one was entirely my fault.

Terraform rejected my Cloudflare API token because it contained invalid characters. I spent around twenty minutes trying to understand what was wrong before realising that I had stored the entire environment variable line in Vault instead of just the token itself.

In other words, I had stored `CF_DNS_API_TOKEN=...` when Terraform expected only the token value.

That extra text was the problem. Once I corrected the secret, everything worked as expected.

I kept `trimspace()` in the configuration as a small safeguard against accidental leading or trailing whitespace, such as a newline at the end of the stored value.

After that, I imported the sixteen existing DNS records into Terraform state and ran my first plan. It made no meaningful changes to the records themselves; the only changes were to comments.

That was exactly what I wanted. I was adopting the existing infrastructure into Terraform management rather than accidentally recreating or modifying records that were already working.

There was one final lesson from this stage.

My first full Terraform plan also revealed unrelated drift in the SSH metadata of a GCP virtual machine. Had I applied everything together without checking the plan carefully, I could have ended up changing SSH keys on a live machine as part of a DNS migration.

That would have been completely unnecessary.

For targeted DNS operations, I therefore use:

```
terraform plan -target=module.dns
terraform apply -target=module.dns
```

This limits the operation to the DNS module when appropriate. However, targeted operations are not a replacement for reviewing the full plan, and I would still check for dependencies and unrelated drift before applying changes.

The experience reinforced something I already knew but sometimes forget: just because Terraform can manage multiple parts of my infrastructure does not mean every change should affect all of them at once.

## Final thoughts

The migration reminded me of why I enjoy maintaining a homelab. It gives me the freedom to experiment with tools and architectures, make mistakes, troubleshoot real problems, and apply the lessons I learn to the infrastructure I depend on every day.

My homelab has grown from a playground into something I rely on regularly, and the way I manage it also needs to reflect that. 

Hehe..if you're gotten this far..umm thanks you!!!! 