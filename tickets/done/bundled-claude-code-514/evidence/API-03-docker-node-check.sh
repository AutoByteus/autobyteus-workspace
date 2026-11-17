#!/bin/bash
# API-03: run this worktree's server package (/tmp/sp-514) in a test-owned container of the published image, with fresh
# volumes, on a free 127.0.0.1 port; check health, the starter's status, the image's `claude`, the server package in use,
# and through the node's API: Claude runtime availability and the Agent Runtimes row. Credentials stay in this process.
set -u
IMAGE="${IMAGE:-autobyteus/autobyteus-server:beta}"; NAME=ab514-test; SP=/tmp/sp-514
PORT=$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1])')
echo "# API-03 docker node check; image $IMAGE ($(docker image inspect -f '{{.Id}}' "$IMAGE" | cut -c1-19)); server package $( [ "${BASELINE:-0}" = 1 ] && echo "BUILT-IN (baseline)" || echo $SP); port $PORT; $(date -u +%FT%TZ)"
docker rm -f -v $NAME >/dev/null 2>&1
for v in data home; do docker volume rm ab514-$v >/dev/null 2>&1; docker volume create ab514-$v >/dev/null; done
docker run -d --name $NAME -p 127.0.0.1:$PORT:8000 -e AUTOBYTEUS_SERVER_HOST=http://localhost:$PORT \
  -v ab514-data:/home/autobyteus/data -v ab514-home:/root $( [ "${BASELINE:-0}" = 1 ] || echo "-v $SP:/opt/autobyteus/server-package:ro" ) "$IMAGE" >/dev/null || exit 2
echo "## started $NAME"
for i in $(seq 1 90); do curl -fsS -m 3 http://127.0.0.1:$PORT/rest/health >/dev/null 2>&1 && break; sleep 2; done
echo "## health: $(curl -sS -m 5 http://127.0.0.1:$PORT/rest/health)"
echo "## starter status: $(docker exec $NAME node /opt/autobyteus/starter/cli.mjs status 2>&1 | head -c 400)"
echo "## server process: $(docker exec $NAME sh -c 'ps -eo pid,args | grep -E "server-package/dist/app.js" | grep -v grep' | head -2)"
echo "## image claude: $(docker exec $NAME sh -c 'command -v claude; claude --version' 2>&1 | tr '\n' ' ')"
echo "## server package in use, SDK entries:"
docker exec $NAME sh -c 'cd /opt/autobyteus/server-package/node_modules && ls -d @anthropic-ai/* .pnpm/@anthropic-ai+* .pnpm/node_modules/@anthropic-ai/* 2>/dev/null'
CODE=$(docker exec $NAME node /opt/autobyteus/server-package/dist/node-access-cli.js setup-code --data-dir /home/autobyteus/data 2>/dev/null | sed -n 's/^Setup code: *//p' | head -1)
KEY=$(curl -sS -m 10 -X POST -H 'content-type: application/json' -d "{\"setupCode\":\"$CODE\",\"desktopName\":\"api-e2e-514\"}" http://127.0.0.1:$PORT/rest/node-access/setup-exchanges \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("credential") or "")')
[ -n "$KEY" ] && echo "## node key: obtained (not printed)" || echo "## node key: NOT obtained"
gql() { curl -sS -m 120 -X POST -H 'content-type: application/json' -H "authorization: Bearer $KEY" -d "$1" http://127.0.0.1:$PORT/graphql; }
echo "## runtimeAvailability(claude_agent_sdk): $(gql '{"query":"{ runtimeAvailability(runtimeKind: \"claude_agent_sdk\") { runtimeKind enabled reason } }"}')"
echo "## checkAgentRuntimes: $(gql '{"query":"mutation { checkAgentRuntimes }"}' | head -c 300)"
for i in $(seq 1 30); do
  ROW=$(gql '{"query":"query { agentRuntimes { runtimeKind installed installedVersion updates { state latestVersion } account { state } checkedAt } }"}' | python3 -c 'import json,sys; d=json.load(sys.stdin); r=[x for x in d["data"]["agentRuntimes"] if x["runtimeKind"]=="claude_agent_sdk"][0]; print("DONE" if r["checkedAt"] else "WAIT")')
  [ "$ROW" = DONE ] && break; sleep 2; done
echo "## agentRuntimes (claude row):"
gql '{"query":"query { agentRuntimes { runtimeKind installed installedVersion updates { state latestVersion } account { state } checkedAt } }"}' | python3 -c 'import json,sys; d=json.load(sys.stdin); print(json.dumps([r for r in (d.get("data") or {}).get("agentRuntimes",[]) if "claude" in r["runtimeKind"]] or d))'
echo "## server log tail (errors):"; docker exec $NAME sh -c 'grep -iE "error|claude-agent-sdk|Native CLI" /var/log/supervisor/autobyteus_server.log | tail -5' | cut -c1-300
if [ "${KEEP:-0}" != 1 ]; then docker rm -f -v $NAME >/dev/null; docker volume rm ab514-data ab514-home >/dev/null; echo "## removed $NAME and its volumes"; fi
