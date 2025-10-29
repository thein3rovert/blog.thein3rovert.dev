{
  description = "Astro + Biome development environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs";

  outputs =
    { self, nixpkgs }:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems =
        f:
        nixpkgs.lib.genAttrs supportedSystems (
          system:
          f {
            pkgs = import nixpkgs { inherit system; };
          }
        );
    in
    {
      devShells = forAllSystems (
        { pkgs }:
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              nodejs # Make dynamic later
              biome
              podman-compose
            ];
            shellHook = ''
              echo "----------------------------------------------"
              echo "👋Welcome to my Astro Blog Dev Environment!";
              echo "Using Node version: $(node --version || echo 'not installed')"
              echo "----------------------------------------------"
            '';
          };
        }
      );
    };
}
