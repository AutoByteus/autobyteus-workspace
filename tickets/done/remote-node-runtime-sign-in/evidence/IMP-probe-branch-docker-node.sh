#!/usr/bin/env bash
# IMP-09: the branch's server on a throwaway Docker node (implementation check, not API/E2E sign-off).
# Runs the published image with this worktree's `autobyteus-server-ts/dist` mounted read-only over the
# image's dist (TESTING.md "Docker server nodes"), on 127.0.0.1 with fresh anonymous volumes, so its
# runtime CLIs start signed out. Never touches the user's node containers.
# Checks: the node reports agentRuntimeSignInBrowserAvailable=true; a Codex and a Grok sign-in started
# through the node's GraphQL open the vendor page in the node's Chromium; Cancel ends them.
# Usage: IMP-probe-branch-docker-node.sh <worktree> [image]   (image default autobyteus/autobyteus-server:beta)
set -euo pipefail
WORKTREE="$1"
IMAGE="${2:-autobyteus/autobyteus-server:beta}"
NAME=imp-signin-probe
GQL=http://127.0.0.1:18091/graphql
q() { curl -s -X POST "$GQL" -H 'content-type: application/json' -d "$1"; echo; }
tabs() { docker exec "$NAME" bash -lc 'curl -s http://127.0.0.1:9222/json | grep "\"url\"" | grep -v "chrome" | sed -E "s/\?.*$/?<query redacted>/"'; }
cleanup() { docker rm -f -v "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --name "$NAME" --security-opt seccomp=unconfined --cap-add SYS_ADMIN \
  -p 127.0.0.1:18091:8000 -p 127.0.0.1:16091:6080 \
  -v "$WORKTREE/autobyteus-server-ts/dist:/app/autobyteus-server-ts/dist:ro" \
  -e AUTOBYTEUS_SERVER_HOST=http://localhost:18091 -e AUTOBYTEUS_VNC_SERVER_HOSTS=localhost:16091 \
  "$IMAGE" >/dev/null
for _ in $(seq 1 60); do
  curl -s -o /dev/null -w '%{http_code}' -X POST "$GQL" -H 'content-type: application/json' -d '{"query":"{ __typename }"}' | grep -q 200 && break
  sleep 2
done
sleep 10
echo "== node fact"
q '{"query":"{ agentRuntimeSignInBrowserAvailable }"}'
q '{"query":"mutation { checkAgentRuntimes }"}'
sleep 20
q '{"query":"{ agentRuntimes { runtimeKind installed installedVersion signInRoute account { state } } agentRuntimeSignInBrowserAvailable }"}'

for kind in codex_app_server grok_build; do
  echo "== start sign-in: $kind"
  q "{\"query\":\"mutation { startAgentRuntimeSignIn(runtimeKind: \\\"$kind\\\") }\"}"
  sleep 10
  tabs
  q '{"query":"{ agentRuntimes { runtimeKind operation { kind state command step error } } }"}'
  q "{\"query\":\"mutation { cancelAgentRuntimeSignIn(runtimeKind: \\\"$kind\\\") }\"}"
  sleep 5
  q '{"query":"{ agentRuntimes { runtimeKind operation { kind state } account { state } } }"}'
done
echo "== server log lines mentioning auth hosts (expect none)"
docker exec "$NAME" bash -lc 'grep -rhoE "https://(auth\.openai\.com|accounts\.x\.ai)[^ \"]*" /root/.autobyteus /app/autobyteus-server-ts/logs 2>/dev/null | head -5 || true'
