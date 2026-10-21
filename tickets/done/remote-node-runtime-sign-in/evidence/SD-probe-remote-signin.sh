#!/usr/bin/env bash
# Reproduces SD-03/SD-04: a sign-in started through the Docker node's own GraphQL API opens the
# vendor's sign-in page in the node's Chromium (the desktop seen through VNC).
# Uses a throwaway container with fresh anonymous volumes; never touches the user's nodes.
# Usage: SD-probe-remote-signin.sh [image]   (default autobyteus/autobyteus-server:beta)
set -euo pipefail
IMAGE="${1:-autobyteus/autobyteus-server:beta}"
NAME=sd-signin-probe
GQL=http://localhost:18090/graphql
q() { curl -s -X POST "$GQL" -H 'content-type: application/json' -d "$1"; echo; }
tabs() { docker exec "$NAME" bash -lc 'curl -s http://127.0.0.1:9222/json | grep "\"url\"" | grep -v "chrome" | sed -E "s/\?.*$/?<query redacted>/"'; }
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

# Chromium needs the same security options the user's nodes run with (seccomp unconfined, SYS_ADMIN).
docker run -d --name "$NAME" --security-opt seccomp=unconfined --cap-add SYS_ADMIN \
  -p 18090:8000 -p 16090:6080 \
  -e AUTOBYTEUS_SERVER_HOST=http://localhost:18090 -e AUTOBYTEUS_VNC_SERVER_HOSTS=localhost:16090 \
  "$IMAGE" >/dev/null
for _ in $(seq 1 60); do
  curl -s -o /dev/null -w '%{http_code}' -X POST "$GQL" -H 'content-type: application/json' -d '{"query":"{ __typename }"}' | grep -q 200 && break
  sleep 2
done
sleep 10
q '{"query":"mutation { checkAgentRuntimes }"}'
sleep 20
q '{"query":"{ agentRuntimes { runtimeKind installed installedVersion signInRoute account { state } } }"}'

for kind in codex_app_server grok_build; do
  echo "== start sign-in: $kind"
  q "{\"query\":\"mutation { startAgentRuntimeSignIn(runtimeKind: \\\"$kind\\\") }\"}"
  sleep 10
  tabs
  q '{"query":"{ agentRuntimes { runtimeKind operation { kind state } } }"}'
  q "{\"query\":\"mutation { cancelAgentRuntimeSignIn(runtimeKind: \\\"$kind\\\") }\"}"
  sleep 5
done
