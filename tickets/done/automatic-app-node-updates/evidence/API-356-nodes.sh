#!/usr/bin/env bash
# TEMPORARY API/E2E harness (autobyteus-356), kept as evidence; not repository test code.
# Test-owned Docker nodes for the node cases (never the user's autobyteus-server-0/1/2 or their volumes):
# label autobyteus.an356-api=1, fresh volumes <name>-data / <name>-packages, fixed 127.0.0.1 ports (a restarted node
# keeps its address, the lesson of 305's API-41 R), the local release source on the host, and one logging proxy per
# node (API-356-node-proxy.mjs) at the address the desktop registers.
#   node      image           package source variant  host port  proxy port
#   n-old     an356-node:7    good                    47951      47961   older than the desktop (1.5.11-beta.10)
#   n-fail    an356-node:7    fail                    47952      47962   its 1.5.11-beta.10 exits 30 s after start
#   n-stop    an356-node:7    good                    47953      47963   stopped when its switch turns on
#   n-same    an356-node:10   good                    47954      47964   built-in labelled 1.5.11-beta.10
#   n-new     an356-node:12   good                    47955      47965   built-in labelled 1.5.11-beta.12
# Usage: API-356-nodes.sh up <run root> <evidence dir> | down <run root>
set -euo pipefail
CMD="$1"; R="$2"; E="${3:-}"
LABEL=autobyteus.an356-api=1
NODES="n-old:7:good:47951:47961 n-fail:7:fail:47952:47962 n-stop:7:good:47953:47963 n-same:10:good:47954:47964 n-new:12:good:47955:47965"
if [ "$CMD" = up ]; then
  nohup node "$E/API-356-release-source.mjs" "$R/release" 47941 1.5.11-beta.10 > "$R/logs/release-source.log" 2>&1 & echo $! > "$R/release-source.pid"
  for spec in $NODES; do IFS=: read -r name tag variant port proxy <<< "$spec"; c="an356-$name"
    for v in data packages; do docker volume create --label "$LABEL" "$c-$v" > /dev/null; done
    docker run -d --name "$c" --label "$LABEL" -p "127.0.0.1:$port:8000" --cap-add SYS_ADMIN --security-opt seccomp=unconfined \
      -v "$c-data:/home/autobyteus/data" -v "$c-packages:/home/autobyteus/server-packages" \
      -e "AUTOBYTEUS_SERVER_PACKAGE_SOURCE=http://host.docker.internal:47941/$variant/releases" "an356-node:$tag" > /dev/null
    nohup node "$E/API-356-node-proxy.mjs" "$proxy" "$port" "$R/logs/proxy-$name.jsonl" > /dev/null 2>&1 & echo $! > "$R/proxy-$name.pid"
    echo "started $c image an356-node:$tag source $variant port $port proxy $proxy"
  done
else
  for spec in $NODES; do IFS=: read -r name _ _ _ _ <<< "$spec"; c="an356-$name"
    [ -f "$R/proxy-$name.pid" ] && kill "$(cat "$R/proxy-$name.pid")" 2>/dev/null || true
    docker rm -f -v "$c" > /dev/null 2>&1 || true
    for v in data packages; do docker volume rm "$c-$v" > /dev/null 2>&1 || true; done
  done
  [ -f "$R/release-source.pid" ] && kill "$(cat "$R/release-source.pid")" 2>/dev/null || true
  docker ps -a --filter "label=$LABEL" --format '{{.Names}}'; docker volume ls --filter "label=$LABEL" --format '{{.Name}}'
  echo "down"
fi
