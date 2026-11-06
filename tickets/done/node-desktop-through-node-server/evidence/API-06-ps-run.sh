#!/bin/bash
# Usage: ps-run.sh <launcher root (dir holding autobyteus-docker.ps1)> <launcher args...>
# Native arm64 PowerShell 7.4.6 (official linux-arm64 tarball) in mcr.microsoft.com/dotnet/runtime-deps:8.0,
# using the host's Docker Desktop engine through its socket with a static arm64 docker CLI (from docker:cli).
B=/private/tmp/abx405-api; root="$1"; shift
exec docker run --rm --platform linux/arm64 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$B/bin/docker-arm64:/usr/local/bin/docker:ro" \
  -v "$B/pwsh-arm64/pwsh:/opt/pwsh:ro" \
  -v "$root:/launcher:ro" \
  -v "$B/ps:$B/ps" \
  -e AUTOBYTEUS_DOCKER_STATE_DIR="$B/ps/state" \
  -e AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR="$B/ps/shared" \
  -e DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1 \
  mcr.microsoft.com/dotnet/runtime-deps:8.0 \
  /opt/pwsh/pwsh -NoLogo -NoProfile -File /launcher/autobyteus-docker.ps1 "$@"
