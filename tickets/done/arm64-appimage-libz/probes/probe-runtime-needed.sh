#!/usr/bin/env bash
# For each published Linux AppImage, fetch the first 256 KiB (the AppImage runtime ELF)
# and list its NEEDED zlib entry. Usage: probe-runtime-needed.sh ASSETS_TSV DATA_DIR
set -u
assets="$1"; data="$2"
while IFS=$'\t' read -r tag pre name url; do
  out="$data/$name.head"
  [ -s "$out" ] || curl -sSL -r 0-262143 -o "$out" "$url"
  z=$(readelf -d "$out" 2>/dev/null | grep -o 'libz\.so[.0-9]*' | tr '\n' ' ')
  bid=$(file -b "$out" | grep -o 'BuildID\[sha1\]=[0-9a-f]*' | cut -d= -f2)
  echo -e "$tag\t$pre\t$name\t${z:-none}\t${bid:-nobid}"
done < "$assets"
