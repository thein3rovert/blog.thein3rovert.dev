---
title: "agenix -> ragenix"
description: "Easy switch to ragenix"
publishDate: "08 september 2025"
tags: ["agenix", "ragenix"]
updatedDate: 08 september 2025
---

Recently, I made the switch from **agenix** to **ragenix**. Ragenix is essentially an improved version of agenix, and, interestingly, it’s written in Rust. The transition felt pretty smooth overall.

To be honest, I didn’t have to change much to get things working. The main thing I did was update the URL path in my `flake.nix`:

```diff
agenix = {
  inputs.nixpkgs.follows = "nixpkgs";
- url = "github:ryantm/agenix";
+ url = "github:yaxitech/ragenix";
};
```

That was pretty much it for the migration. I appreciated how straightforward it was.

However, I did notice a couple of differences. With agenix, whenever I added a new secret to my `secret.nix` file and specified a path, running the secret creation command would automatically create the directory structure for me. Ragenix doesn’t do this yet, so I have to make sure the directories exist beforehand. It’s a small thing, but it stood out to me.

Another thing I observed is that the `--rekey` command in ragenix only works on all secrets at once, not on individual secrets. I’m hoping this will change in the future, as it would be nice to have more granular control.

Here are the updated commands I’m using for creating and rekeying secrets:

```sh
# Using nix run
nix run github:yaxitech/ragenix -- -e <path-to-secret.age> --identity <path-to-ssh-key>
nix run github:yaxitech/ragenix -- --rekey --identity <path-to-ssh-key>

# If installed as CLI
agenix -e <path-to-secret.age> --identity <path-to-ssh-key>
agenix --rekey --identity <path-to-ssh-key>
```

The move to ragenix has been pretty painless, and I’m looking forward to seeing how it evolves. I’ll keep an eye out for updates, especially around secret path creation and more flexible rekeying.
