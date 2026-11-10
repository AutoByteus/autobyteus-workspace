#!/usr/bin/env bash
# Probe (autobyteus-workspace-3): does one setup-code attempt of the bash launcher stay bounded when the node's
# control socket accepts the connection but never answers (a stuck or frozen node process)?
# Runs the launcher's own SETUP_CODE_CLIENT_JS with the real `node` against a real Unix socket on the host.
# No Docker, no user node. Usage: bash probes/silent-socket-attempt.sh <repo-root> [limit-seconds]
# Exit 0: the attempt ended within the limit. Exit 1: it was still running at the limit (unbounded attempt).
set -euo pipefail
repo="${1:?repo root}" limit="${2:-15}"
work="$(mktemp -d /tmp/sc-probe.XXXXXX)"
trap 'kill "${server_pid:-0}" "${client_pid:-0}" 2>/dev/null || true; rm -rf "$work"' EXIT
sock="$work/local-control.sock"

# A socket that accepts and then stays silent forever (never writes, never closes).
node -e 'require("net").createServer(()=>{}).listen(process.argv[1],()=>console.log("listening"))' "$sock" > "$work/server.log" &
server_pid=$!
for _ in $(seq 1 50); do [[ -S "$sock" ]] && break; sleep 0.1; done

# The client exactly as the launcher defines it.
eval "$(grep -E '^SETUP_CODE_CLIENT_JS=' "$repo/scripts/public/docker/autobyteus-docker.d/bash/commands.sh")"
start=$SECONDS
node -e "$SETUP_CODE_CLIENT_JS" "$sock" > "$work/client.out" 2> "$work/client.err" &
client_pid=$!
while kill -0 "$client_pid" 2>/dev/null && (( SECONDS - start < limit )); do sleep 0.2; done
if kill -0 "$client_pid" 2>/dev/null; then
  echo "UNBOUNDED: the attempt was still waiting after ${limit}s"
  exit 1
fi
wait "$client_pid" && code=0 || code=$?
echo "BOUNDED: the attempt ended after $((SECONDS - start))s with exit ${code}: $(cat "$work/client.err")"
