---
title: "Themeing | Oh-my-posh themes"
description: "The notes reflect on changing Oh-my-posh themes in Nix-OS, detailing the use of Kitty terminal and ZSH shell, and addressing configuration challenges with custom solutions."
publishDate: "15 Aug 2024"
tags: ["on-my-posh", "nixos", "productivity"]
updatedDate: 28 Nov 2024
---
On this day, I open my `nixos` terminal which i recently installed alongside `hyperland` ,  the terminal name is `kitty`, other that knows about better terminal might be wondering why i chose `kitty`, it's simple the name is lovely also i wanted to try umm `wezterm` and `alacritty` but based on my research I found out `hyprland` mostly support `kitty` so I went for it.
After installing `kitty` I installed the `ZSH` and configure it, it was pretty with `ZSH`, it has some useful plugins like auto-completing which i love so much and will take about in later blogs.
Back to the main issue, I wanted to make `Kitty`...`Pretty`..haha so i decided to use configure it with `OH-MY-POSH`.
> [!important]
> Make sure to talk a litle about oh-my-posh and add the official link.

Here is how my kitty looks like before and after OH-MY-POSH, `Kitty` wasn't so `Pretty` .

So i will explain how i was able to configure it, the issue I came across while trying to configure it and how I solved it so you don't have to go through the same issue.

> [!Disclaimer]
> Disclaimer, I am not sure about other Linux distro but I think its the same process just slight difference in you're using `bash` and not `zsh`


You can find the documentation, i used that helped me while I was configuring and changing oh-my-posh themes below.

## Installing Oh-my-posh
I would say the perfect documentation to use is the official oh-my-posh documentation, but in case it's not helpful to you and you're using Nixos, then you can check my blog.
Since installing software and packages on `nixos` require a different approach, this blog will help you.

If you are installing as a system package head over to your configuration.nix file and add `oh-my-posh `to your section. It should look like this
```nix
# Add code - configuration.nix pkgs
  environment.systemPackages = with pkgs; [
    vim
    git
    oh-my-posh
   ];
```

If your are managing your `nixos` with home-manager then you should have a home.nix file, you can add `oh-my-posh` to the home pkgs section, it should look like this:

```nix
  home.packages = with pkgs; [
    oh-my-posh
];
```

After adding them to your either file, you then need to rebuild your nix file, here is the code if your using either method.
- Nixos
```nix
nixos-rebuild switch # For configuration.nix

sudo nixos-rebuild switch # For configuration.nix
```
- Home-manager
```bash
home-manager rebuild switch
```
I am sure most of you are familiar with the prompt above since its the most usedprompt in `nixos`.

If you are managing both your system and home-manager with `flakes` then you need a different prompt for rebuilding.

```nix
home-manager rebuild switch --flake .#yourusername
sudo nixos-rebuild switch --flake .#yourhostname
```

After rebuilding you can check if its installed by using shell command:
```zsh
which oh-my-posh
```
After you need to add your configurations to your `~/.zshrc` file so open the file with your favourite text editor and add the following like to your file.
```json
if [ "$TERM_PROGRAM" != "Apple_Terminal" ]; then
  eval "$(oh-my-posh init zsh)"
fi
```

Then run this command in your kitty terminal to make kitty pretty, you will get a default themes after running this command, however oh-my-posh offers various themes you can choose from, more about that below.
```bash
exec zsh
```

Welcome to pretty `Kitty`.

## Issue with Configuration and Changing themes
Here is what made me want to write this blog, i just don't want someone to be stuck at this stage when they plan to change their themes.

Prior to add the following line of code to your `~/.zshrc` file, some people might have these issue especially if you are handling your home-manager and System with flake.  This makes the `~/.zshrc` file read-only so you cannot edit or write to it. If that is your case then inside your home-manager folder create a new `dir`.
```bash
mkdir apps
```

Make sure to `cd` inside the apps file and then create a new file called `zsh.nix`, here you can put your custom config for `zsh` but be sure to import this to your home.nix file so it can access it.
```nix
  imports = [
    ./apps/zsh.nix
  ]
```

Because my `zshrc` file is `read only` I cannot make changes to it, so instead i created a custom `zsh.nix` file, that is where i put all my configurations including the oh-my-posh configuration.

Here is how the config looks like, it is likely to change over time
```json
{
  programs.zsh = {
    enable = true;
    enableCompletion = true;
    enableAutosuggestions = true;
    enableSyntaxHighlighting = true;
    oh-my-zsh = {
      enable = true;
      plugins = [ "docker-compose" "docker" ];
      theme = "dst";
    };
    initExtra = ''
      bindkey '^f' autosuggest-accept

      # OH-MY-POSH
      if [ "$TERM_PROGRAM" != "Apple_Terminal" ]; then
        eval "$(oh-my-posh init zsh --config ~/.poshthemes/velvet.omp.json )"
      fi
    '';
  };

  programs.fzf = {
    enable = true;
    enableZshIntegration = true;
  };
}
```

After adding these to your config then do use the home-manager rebuild command.
### Changing themes
Make sure to browse the theme you want in the oh-my-posh official website, here is a link to help with that,
https://ohmyposh.dev/docs/themes.
After create a new `dir` in your home folder
```
mkdir .themes
```

Inside the `dir` we will download all the `oh-my-posh` themes, so we can have then on the system for use anytime, in other to do that we need to pull them from `github` so use this command, make sure you `cd` inside the newly created `dir`.

```bash
wget https://github.com/JanDeDobbeleer/oh-my-posh/releases/latest/download/themes.zip -O ~/.poshthemes/themes.zip
```

Then we need to unzip the file, this can either be down using the default file manager or you can use this command:
```bash
unzip ~/.poshthemes/themes.zip -d ~/.poshthemes
```
Then we need to `chmod` all the themes so that it can be accessible and executable.

```bash
chmod u+rw ~/.poshthemes/*.json
```

Then we can now change our themes we just simply need to head down to our `zsh.nix` file created earlier in our home-manager `dir` and then and this to file.


The first resources helped with the theme installation and the second resources when understanding how to work with the themes and change my themes.
```bash
eval "$(oh-my-posh init zsh --config ~/.poshthemes/{theme}.omp.json )"
```
Make sure to replace the "theme" with the name of your preferred theme after that run the home-manager build command.

Thank you.

![[Pasted image 20240814231631.png]]
#### Resources
https://search.nixos.org/packages?channel=24.05&show=oh-my-posh&from=0&size=50&sort=relevance&type=packages&query=oh-my-posh
https://calebschoepp.com/blog/2021/how-to-setup-oh-my-posh-on-ubuntu/
https://dev.to/karleeov/wsl-arch-setup-for-oh-my-posh-51pa
