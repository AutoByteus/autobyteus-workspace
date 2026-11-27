#!/bin/bash
# API/E2E 661 T-3: upgrade the released nodes in place (same volumes, same ports) to this commit's server package.
set -e
cd /tmp/661-api/rel
PKG=/tmp/661-api/pkg
read PA PB < ports
PC=$(cat port-c)
for n in a b c; do
  case $n in a) P=$PA;; b) P=$PB;; c) P=$PC;; esac
  docker run -d --name 661-api-new-$n -e AUTOBYTEUS_SERVER_HOST=http://localhost:$P -p 127.0.0.1:$P:8000 \
    -v 661-api-rel-$n-data:/home/autobyteus/data -v $PKG:/opt/autobyteus/server-package:ro autobyteus/autobyteus-server:beta >/dev/null
done
for n in a b c; do
  case $n in a) P=$PA;; b) P=$PB;; c) P=$PC;; esac
  for i in $(seq 1 150); do curl -sf -o /dev/null http://127.0.0.1:$P/rest/health && break; sleep 2; done
  echo "$n health $(curl -s -o /dev/null -w %{http_code} http://127.0.0.1:$P/rest/health)"
  docker exec 661-api-new-$n sh -c 'cat /opt/autobyteus/server-package/server-package.json' | head -3 | tail -1
done
