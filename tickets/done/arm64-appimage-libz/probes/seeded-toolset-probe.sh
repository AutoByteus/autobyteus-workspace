#!/usr/bin/env bash
# Premise probe for SR-002: electron-builder 25's app-builder builds an AppImage from a prepared
# toolset folder ($ELECTRON_BUILDER_CACHE/appimage/appimage-12.0.1) whose runtime-arm64 is the static
# runtime, and the result runs in a clean Ubuntu 24.04 root.
# Usage (root, arm64 Linux): seeded-toolset-probe.sh APP_BUILDER_BIN SEVENZA UBUNTU_BASE_TARBALL WORKDIR
set -euo pipefail
AB="$1"; Z="$2"; BASE="$3"; W="$4"; HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$W/dl" "$W/cache/appimage" "$W/app" "$W/stage" "$W/out"
curl -sSL -o "$W/dl/appimage-12.0.1.7z" https://github.com/electron-userland/electron-builder-binaries/releases/download/appimage-12.0.1/appimage-12.0.1.7z
echo "d12ff7eb8f1d1ec4652ca5237a7fbdca33acc0c758045636feca62dc6ecb8ec4  $W/dl/appimage-12.0.1.7z" | sha256sum -c
curl -sSL -o "$W/dl/static.tar.gz" "https://github.com/electron-userland/electron-builder-binaries/releases/download/appimage%401.0.3/appimage-tools-runtime-20251108.tar.gz"
echo "84021a78ee214ae6fd33a2d62a92ba25542dd10bc86bf117a9b2d0bba44e7665  $W/dl/static.tar.gz" | sha256sum -c
"$Z" x -y -o"$W/cache/appimage/appimage-12.0.1" "$W/dl/appimage-12.0.1.7z" >/dev/null
tar xzf "$W/dl/static.tar.gz" -C "$W/dl" ./runtimes/runtime-arm64
install -m 755 "$W/dl/runtimes/runtime-arm64" "$W/cache/appimage/appimage-12.0.1/runtime-arm64"
echo "00cbdfcf917cc6c0ff6d3347d59e0ca1f7f45a6df1a428a0d6d8a78664d87444  $W/cache/appimage/appimage-12.0.1/runtime-arm64" | sha256sum -c
printf '#!/bin/sh\necho fake-app-ran\n' > "$W/app/autobyteus"; chmod +x "$W/app/autobyteus"
CFG='{"productName":"AutoByteus","productFilename":"AutoByteus","desktopEntry":"[Desktop Entry]\nName=AutoByteus\nExec=AppRun %U\nTerminal=false\nType=Application\nIcon=autobyteus\nCategories=Utility;\n","executableName":"autobyteus","icons":[{"file":"'"$HERE/../../../../autobyteus-web/build/icons/512x512.png"'","size":512}],"fileAssociations":[]}'
ELECTRON_BUILDER_CACHE="$W/cache" "$AB" appimage --stage "$W/stage" --arch arm64 --output "$W/out/test.AppImage" --app "$W/app" --configuration "$CFG"; echo
cmp -n "$(stat -c %s "$W/cache/appimage/appimage-12.0.1/runtime-arm64")" "$W/out/test.AppImage" "$W/cache/appimage/appimage-12.0.1/runtime-arm64" && echo "AppImage prefix == pinned static runtime"
echo "NEEDED entries: $(readelf -d "$W/out/test.AppImage" | grep -c NEEDED || true)"
"$HERE/clean-root-runtime-probe.sh" "$BASE" "$W/out/test.AppImage" --appimage-extract AppRun
"$HERE/clean-root-runtime-probe.sh" "$BASE" "$W/out/test.AppImage" --appimage-extract-and-run
