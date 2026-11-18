#!/bin/bash
# API-02 Docker probe, launcher part (autobyteus-437, temporary). Test-owned state, image and containers only; the docker
# CLI is the guarded wrapper (/tmp/abtest437/bin/docker) that refuses any command on the user's node containers.
set -u
export PATH=/tmp/abtest437/bin:$PATH
export AUTOBYTEUS_DOCKER_STATE_DIR=/tmp/abtest437/docker-state AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR=/tmp/abtest437/docker-shared AUTOBYTEUS_DOCKER_INSTALL_DIR=/tmp/abtest437/docker-install
OLD=/tmp/abtest437/launcher-old/scripts/public/docker/autobyteus-docker.sh
NEW=/tmp/abtest437/launcher-new/scripts/public/docker/autobyteus-docker.sh
LAN=192.168.2.158; TS=100.127.30.107
red() { sed -E 's/(Setup code for [^:]+: )[A-Za-z0-9_-]+/\1<redacted>/; s/(Setup code: )[A-Za-z0-9_-]+/\1<redacted>/'; }
probe() { printf '%-44s ' "$1"; curl -s -m 6 -o /tmp/abtest437/body -w '%{http_code}' "${@:2}"; rc=$?; [[ $rc -ne 0 ]] && printf ' curl-exit=%s' $rc; printf ' %s\n' "$(head -c 120 /tmp/abtest437/body 2>/dev/null)"; : > /tmp/abtest437/body; }
wait_health() { for i in $(seq 1 120); do curl -s -m 2 -o /dev/null "http://127.0.0.1:$1/rest/health" && return 0; sleep 2; done; echo "node on $1 did not start"; return 1; }
echo "# API-02 Docker launcher probe; commit $(git -C /Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437 rev-parse --short HEAD); $(date -u +%FT%TZ)"
echo "# image abtest437/autobyteus-server:test = autobyteus/autobyteus-server:beta with this worktree's server package (API-02-server-package-build.log)"
echo; echo "## A. A node created by the released launcher (v9, base b690a5dfdb), running this worktree's server (NAS-34)"
bash "$OLD" new-container --image abtest437/autobyteus-server --tag test 2>&1 | red | tail -8
N3=$(ls $AUTOBYTEUS_DOCKER_STATE_DIR/nodes | head -1 | sed 's/\.env$//'); eval "$(grep -E "^(BACKEND_PORT|CONTAINER_NAME)=" $AUTOBYTEUS_DOCKER_STATE_DIR/nodes/$N3.env)"
P3=$BACKEND_PORT; echo "node $N3 container $CONTAINER_NAME port $P3"
echo "published: $(docker port $CONTAINER_NAME 8000 | tr '\n' ' ')"
wait_health $P3
ID_BEFORE=$(curl -s http://127.0.0.1:$P3/rest/remote-access/status | python3 -c 'import sys,json;print(json.load(sys.stdin)["nodeId"])'); echo "nodeId before: $ID_BEFORE"
probe "NAS-34 LAN health (old publishing)" http://$LAN:$P3/rest/health
probe "NAS-34 LAN graphql no key" -X POST -H 'content-type: application/json' -d '{"query":"{__typename}"}' http://$LAN:$P3/graphql
probe "NAS-34 LAN workspace file no key" http://$LAN:$P3/rest/workspaces/temp_ws_default/static/x.txt
echo; echo "## B. The new launcher's setup-code (v10): recreates with the new publishing, keeps the volumes, prints a code (NAS-03, NAS-32, NAS-27, UNK-006)"
bash "$NEW" setup-code --name $N3 > /tmp/abtest437/setup-code-1.txt 2>&1; echo "exit $?"; red < /tmp/abtest437/setup-code-1.txt | tail -6
echo "published: $(docker port $CONTAINER_NAME 8000 | tr '\n' ' ')"
docker inspect $CONTAINER_NAME --format 'labels config hash: {{ index .Config.Labels "autobyteus.config-hash" }}  restart: {{ .HostConfig.RestartPolicy.Name }}'
wait_health $P3
ID_AFTER=$(curl -s http://127.0.0.1:$P3/rest/remote-access/status | python3 -c 'import sys,json;print(json.load(sys.stdin)["nodeId"])'); echo "nodeId after: $ID_AFTER (same: $([[ $ID_BEFORE == $ID_AFTER ]] && echo yes || echo NO))"
probe "NAS-27 LAN health (new publishing)" http://$LAN:$P3/rest/health
probe "UNK-006 Tailscale health" http://$TS:$P3/rest/health
probe "UNK-006 Tailscale graphql no key" -X POST -H 'content-type: application/json' -d '{"query":"{__typename}"}' http://$TS:$P3/graphql
probe "loopback health" http://127.0.0.1:$P3/rest/health
probe "NAS-02 loopback graphql no key" -X POST -H 'content-type: application/json' -d '{"query":"{__typename}"}' http://127.0.0.1:$P3/graphql
CODE=$(sed -nE 's/.*Setup code for [^:]+: ([A-Za-z0-9_-]+).*/\1/p' /tmp/abtest437/setup-code-1.txt | head -1)
echo "code printed: $([[ -n $CODE ]] && echo yes || echo NO); code in launcher state files: $(grep -rl -- "$CODE" $AUTOBYTEUS_DOCKER_STATE_DIR 2>/dev/null | wc -l | tr -d ' '); code in container logs: $(docker logs $CONTAINER_NAME 2>&1 | grep -c -- "$CODE")"
probe "NAS-13 setup exchange, wrong code" -X POST -H 'content-type: application/json' -d '{"setupCode":"wrong-code-123456","desktopName":"API-02"}' http://127.0.0.1:$P3/rest/node-access/setup-exchanges
curl -s -X POST -H 'content-type: application/json' -d "{\"setupCode\":\"$CODE\",\"desktopName\":\"API-02 probe\"}" http://127.0.0.1:$P3/rest/node-access/setup-exchanges > /tmp/abtest437/exchange.json
OWNER=$(python3 -c 'import json;print(json.load(open("/tmp/abtest437/exchange.json")).get("credential",""))'); echo "NAS-03 exchange returned a credential: $([[ $OWNER == own_* ]] && echo yes || echo NO)"
probe "NAS-03 graphql with the owner credential" -X POST -H 'content-type: application/json' -H "authorization: Bearer $OWNER" -d '{"query":"{__typename}"}' http://127.0.0.1:$P3/graphql
probe "NAS-03 node update check with it" -H "authorization: Bearer $OWNER" "http://127.0.0.1:$P3/rest/node-update"
probe "NAS-13 replay of the used code" -X POST -H 'content-type: application/json' -d "{\"setupCode\":\"$CODE\",\"desktopName\":\"again\"}" http://127.0.0.1:$P3/rest/node-access/setup-exchanges
bash "$NEW" setup-code --name $N3 > /tmp/abtest437/setup-code-2.txt 2>&1; echo "second setup-code exit $? (no recreate: $(docker inspect $CONTAINER_NAME --format '{{.State.StartedAt}}'))"
echo; echo "## C. new-container --allow-local-network (NA-4)"
bash "$NEW" new-container --allow-local-network --image abtest437/autobyteus-server --tag test 2>&1 | red | tail -4
N4=$(ls $AUTOBYTEUS_DOCKER_STATE_DIR/nodes | grep -v "^$N3.env" | head -1 | sed 's/\.env$//'); P4=$(grep '^BACKEND_PORT=' $AUTOBYTEUS_DOCKER_STATE_DIR/nodes/$N4.env | cut -d= -f2); C4=$(grep '^CONTAINER_NAME=' $AUTOBYTEUS_DOCKER_STATE_DIR/nodes/$N4.env | cut -d= -f2)
echo "node $N4 port $P4 published: $(docker port $C4 8000 | tr '\n' ' ') ALLOW_LOCAL_NETWORK=$(grep '^ALLOW_LOCAL_NETWORK=' $AUTOBYTEUS_DOCKER_STATE_DIR/nodes/$N4.env | cut -d= -f2)"
wait_health $P4
probe "NA-4 LAN health (allowed)" http://$LAN:$P4/rest/health
probe "NA-1 LAN graphql no key" -X POST -H 'content-type: application/json' -d '{"query":"{__typename}"}' http://$LAN:$P4/graphql
echo "$N3 $CONTAINER_NAME $P3 $N4 $C4 $P4" > /tmp/abtest437/docker-nodes.txt
echo "credential/code strings in this log: (checked by the caller)"
