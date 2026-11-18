#!/usr/bin/env bash
# API-13 (autobyteus-416 AC-006, REQ-005, design D7 "Electron dev"): Electron development mode works with no manual setting.
# Electron dev mode is `BUILD_TARGET=electron nuxt dev` in autobyteus-web: the Nuxt electron module builds electron/main.ts
# and preload into dist/electron and starts `electron . --no-sandbox` with VITE_DEV_SERVER_URL=http://localhost:<nuxt port>;
# the unpacked app is `isDev`, loads its renderer from that URL and runs its embedded node from resources/server
# (prepared by the packaged build of API-07). The run is isolated with the app's own e2e launch profile (own data root and
# server port), inherited by the Electron process, so no user data is touched.
# Evidence: the embedded node's process environment (AUTOBYTEUS_ALLOWED_ORIGINS must hold the dev renderer origin that
# electronApplication passes as developmentRendererOrigin); established WebSocket connections from the Electron renderer
# to the embedded node (the renderer's own streams were accepted); the node log has no refusal line while the renderer
# runs; controls: the dev origin is accepted, an unlisted localhost origin is refused.
# Usage: api-13-electron-dev.sh <worktree> <output dir>
set -uo pipefail
worktree="$1"; out="$2"; mkdir -p "$out"
root="$(cd "$(mktemp -d /tmp/api416-13-XXXX)" && pwd -P)"
port="$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1])')"
log="$out/nuxt-electron-dev.log"
{
  echo "# API-13 Electron dev mode; commit $(git -C "$worktree" rev-parse --short HEAD) (source da207045a5); $(date -u +%FT%TZ)"
  echo "# BUILD_TARGET=electron nuxt dev --port 3000 (autobyteus-web), AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=e2e, data root $root, server port $port"
} > "$out/API-13-summary.txt"
cd "$worktree/autobyteus-web"
cdp="$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1])')"
probes="$(cd "$(dirname "$0")" && pwd)"
env -u ELECTRON_RUN_AS_NODE NODE_OPTIONS="--require $probes/api-13-cdp-switch.cjs" API416_CDP_PORT="$cdp" BUILD_TARGET=electron AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=e2e AUTOBYTEUS_ELECTRON_DATA_ROOT="$root" \
  AUTOBYTEUS_ELECTRON_SERVER_PORT="$port"  \
  pnpm exec nuxt dev --port 3000 > "$log" 2>&1 &
pid=$!
echo "nuxt pid $pid" >> "$out/API-13-summary.txt"
for i in $(seq 1 180); do curl -sf "http://127.0.0.1:$port/rest/health" > /dev/null && break; sleep 2; done
# Let the renderer start, re-optimize (cold Nuxt dev: dependencies are optimized and the page reloads) and open its
# streams: wait up to 5 minutes for established connections from Electron's processes to the embedded node, then 20 s more.
seen=""
for i in $(seq 1 150); do
  if lsof -nP -iTCP:"$port" -sTCP:ESTABLISHED 2>/dev/null | awk 'NR>1 && $1 ~ /^Electron/' | grep -q .; then seen="after $((i*2)) s"; break; fi
  sleep 2
done
node "$probes/api-13-renderer-check.mjs" "$worktree" "$cdp" "$port" "$out" >> "$out/API-13-summary.txt" 2>&1
echo "renderer connections to the embedded node first seen: ${seen:-never (300 s)}" >> "$out/API-13-summary.txt"
sleep 20
serverpid="$(pgrep -f "$worktree/autobyteus-web/resources/server/dist/app.js" | head -1)"
{
  echo; echo "== embedded node health"; curl -s "http://127.0.0.1:$port/rest/health"; echo
  echo; echo "== embedded node process $serverpid: AUTOBYTEUS_ALLOWED_ORIGINS from its environment (ps eww)"
  ps eww -p "$serverpid" | tr ' ' '\n' | grep -E '^AUTOBYTEUS_(ALLOWED_ORIGINS|ELECTRON_LAUNCH_PROFILE)=' || echo "(not found)"
  echo; echo "== renderer URL Electron loaded (app log)"
  grep -h -m3 -E "localhost:3000|Loading|loadURL|start URL" "$root"/logs/app.log 2>/dev/null | cut -c1-220
  echo; echo "== established TCP connections to the embedded node's port, by process"
  lsof -nP -iTCP:"$port" -sTCP:ESTABLISHED | awk 'NR>1{print $1, $2, $9}' | sort | uniq -c
  echo; echo "== controls (curl, Origin header as a page would send it)"
  printf 'Origin http://localhost:3000 (the dev renderer): '; curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'content-type: application/json' -H 'Origin: http://localhost:3000' --data '{"query":"{ __typename }"}' "http://127.0.0.1:$port/graphql?f=api13-dev-origin"
  printf 'Origin http://localhost:5173 (unlisted): '; curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'content-type: application/json' -H 'Origin: http://localhost:5173' --data '{"query":"{ __typename }"}' "http://127.0.0.1:$port/graphql?f=api13-unlisted"
  sleep 1
  echo; echo "== refusal lines in the embedded node log (server-data/logs/server.log)"
  grep -h -E "Remote Access request refused|Remote Access WebSocket rejected" "$root"/server-data/logs/server.log || echo "(none)"
} >> "$out/API-13-summary.txt" 2>&1
cp "$root"/server-data/logs/server.log "$out/embedded-node-server.log" 2>/dev/null
cp "$root"/logs/app.log "$out/electron-app.log" 2>/dev/null
# Stop: the Nuxt dev process tree (Electron, its embedded node).
pkill -TERM -P "$pid" 2>/dev/null; kill -TERM "$pid" 2>/dev/null
sleep 5
pkill -f "$worktree/.*electron/dist/Electron.app" 2>/dev/null
pkill -f "$worktree/autobyteus-web/resources/server/dist/app.js" 2>/dev/null
sleep 3
{
  echo; echo "== cleanup"
  echo "processes left with the worktree's Electron: $(pgrep -f "$worktree/.*electron/dist/Electron.app" | wc -l | tr -d ' ')"
  echo "embedded node left: $(pgrep -f "$worktree/autobyteus-web/resources/server/dist/app.js" | wc -l | tr -d ' ')"
  echo "port 3000 listeners: $(lsof -nP -iTCP:3000 -sTCP:LISTEN | wc -l | tr -d ' ')"
} >> "$out/API-13-summary.txt"
rm -rf "$root"
echo "data root removed: $root" >> "$out/API-13-summary.txt"
cat "$out/API-13-summary.txt"
