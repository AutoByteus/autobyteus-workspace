#!/bin/sh
# Runs inside a throwaway alpine container; /rel is the downloaded artifacts (read-only), /work a scratch dir.
set -u
apk add -q squashfs-tools 7zip python3 >/dev/null 2>&1 || { echo "apk failed"; exit 3; }
offset() { python3 -c 'import struct,sys; d=open(sys.argv[1],"rb").read(64); shoff=struct.unpack("<Q",d[0x28:0x30])[0]; sz,n=struct.unpack("<HH",d[0x3A:0x3E]); print(shoff+sz*n)' "$1"; }
for f in /rel/linux-x64/*.AppImage /rel/linux-arm64/*.AppImage; do
  echo "## $(basename $f) (squashfs at offset $(offset $f))"
  unsquashfs -o "$(offset $f)" -l "$f" > /work/list.txt 2>/dev/null || echo "unsquashfs failed"
  echo "entries listed: $(wc -l < /work/list.txt)"
  echo "claude-agent-sdk-<platform> paths: $(grep -cE 'claude-agent-sdk-(darwin|linux|win32|android)' /work/list.txt)"
  grep -E 'resources/server/node_modules/(@anthropic-ai/[^/]+|\.pnpm/@anthropic-ai\+[^/]+|\.pnpm/node_modules/@anthropic-ai/[^/]+)$' /work/list.txt | sed 's#.*resources/server/##'
  echo "SDK package.json: $(grep -cE 'node_modules/@anthropic-ai/claude-agent-sdk/package.json$' /work/list.txt)"
done
f=$(ls /rel/windows-x64/*.exe)
echo "## $(basename $f)"
7z l "$f" > /work/outer.txt 2>&1; grep -E '\.7z$' /work/outer.txt | awk '{print $NF}'
inner=$(grep -oE '\$PLUGINSDIR/app-64\.7z' /work/outer.txt | head -1)
cd /work && 7z e -y "$f" "$inner" >/dev/null 2>&1 && 7z l app-64.7z > /work/inner.txt 2>&1
echo "entries listed: $(grep -c 'resources' /work/inner.txt)"
echo "claude-agent-sdk-<platform> paths: $(grep -cE 'claude-agent-sdk-(darwin|linux|win32|android)' /work/inner.txt)"
grep -E 'resources[\\/]server[\\/]node_modules[\\/]@anthropic-ai[\\/][^\\/]+$' /work/inner.txt | awk '{print $NF}'
grep -E 'node_modules[\\/]@anthropic-ai[\\/]claude-agent-sdk[\\/]package\.json$' /work/inner.txt | awk '{print $NF}'
