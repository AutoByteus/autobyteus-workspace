#!/usr/bin/env bash
# collect-facts.sh DIST_DIR OUT_DIR : image tree, asar list, resources tree, yml keys, runtime facts
set -euo pipefail
dist="$1"; out="$2"; mkdir -p "$out"
img="$(ls "$dist"/*.AppImage)"
basename "$img" > "$out/artifact-names.txt"; (cd "$dist" && ls -1 | grep -v -e unpacked -e builder-debug) > "$out/dist-files.txt"
node /tmp/ab28/appimage-facts.mjs "$img" > "$out/runtime.json"
off=$(node -p "JSON.parse(require('fs').readFileSync('$out/runtime.json')).squashfsOffset")
unsquashfs -o "$off" -lls "$img" | awk 'NR>3{ $4=""; $5=""; print }' | sed 's/  */ /g' | sort -k4 > "$out/image-tree-lls.txt"
unsquashfs -o "$off" -l "$img" | sed -n '4,$p' | sort > "$out/image-tree.txt"
unpacked="$(ls -d "$dist"/linux-*unpacked)"
(cd "$unpacked" && find . -path ./resources/app.asar.unpacked -prune -o -type f -print | sort) > "$out/unpacked-files.txt"
(cd "$unpacked" && find resources/app.asar.unpacked -type f | sort) > "$out/asar-unpacked-files.txt"
node /tmp/ab28/asar-list.mjs "$unpacked/resources/app.asar" > "$out/asar-list.txt"
node -e 'const y=require("fs").readFileSync(process.argv[1],"utf8");console.log(y.split("\n").map(l=>l.replace(/:.*$/,":")).join("\n"))' "$(ls "$dist"/latest-linux*.yml)" > "$out/yml-shape.txt"
(cd "$unpacked" && sha256sum resources/app.asar) > "$out/asar-sha256.txt"
wc -l "$out"/*.txt
