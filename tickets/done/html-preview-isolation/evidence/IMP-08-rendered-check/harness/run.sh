#!/bin/bash
# usage: run.sh <out-dir>
set -u
R=/tmp/hpi-scripts/rendered
OUT="$1"; mkdir -p "$OUT"
ELECTRON=${HPI_ELECTRON:-/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/node_modules/.bin/electron}
HPI_LOG="$OUT/server-log.txt" HPI_WORKSPACE_ROOT="$R/workspace" HPI_CDN_ROOT="$R/cdn" node "$R/harness.mjs" &
SERVER=$!
for i in $(seq 1 30); do grep -q listening "$OUT/server-log.txt" 2>/dev/null && break; sleep 0.3; done
HPI_OUT="$OUT" env -u ELECTRON_RUN_AS_NODE "$ELECTRON" "$R/main.cjs" 2>&1 | grep PROBE > "$OUT/electron-output.txt"
kill $SERVER; wait $SERVER 2>/dev/null
env -u ELECTRON_RUN_AS_NODE "$ELECTRON" --version
