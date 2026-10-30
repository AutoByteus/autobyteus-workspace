#!/usr/bin/env bash
# API-15 (autobyteus-305 step 1): the amd64 step-1 image starts its built-in package (QEMU on arm64).
# Usage: api15-amd64.sh <evidence-file>
set -uo pipefail
OUT="$1"; IMG=autobyteus-server-305-test:step1-amd64; C=ab305-api15-amd64; FAILS=0
exec > >(tee -a "$OUT") 2>&1
check() { local d="$1"; shift; if "$@"; then printf 'CHECK PASS: %s\n' "$d"; else printf 'CHECK FAIL: %s\n' "$d"; FAILS=$((FAILS + 1)); fi; }
printf '# API-15 amd64 image start: docker run -d --platform linux/amd64 --name %s -p 127.0.0.1::8000 %s (no volumes)\n' "$C" "$IMG"
printf '# Image %s; Date %s; Environment: macOS arm64 host, Docker %s, amd64 under QEMU emulation\n' \
  "$(docker image inspect "$IMG" --format '{{.Id}} {{.Architecture}}')" "$(date -u +%FT%TZ)" "$(docker version --format '{{.Server.Version}}')"
docker run -d --platform linux/amd64 --name "$C" --label autobyteus.ab305-api=1 -p 127.0.0.1::8000 "$IMG" >/dev/null
port="$(docker port "$C" 8000/tcp | head -1 | sed 's/.*://')"; t0=$(date +%s); ok=0; body=""
for _ in $(seq 1 600); do
  body="$(curl -s -m 3 "http://127.0.0.1:${port}/rest/health" || true)"
  if printf '%s' "$body" | grep -q '"status":"ok"'; then ok=$((ok + 1)); [[ $ok -ge 3 ]] && break; else ok=0; fi
  sleep 1
done
printf 'health after %ss: %s\n' "$(( $(date +%s) - t0 ))" "$body"
check "amd64 node healthy 3x" test "$ok" -ge 3
pid="$(docker exec "$C" supervisorctl pid autobyteus_server)"
printf 'server cwd: %s\n' "$(docker exec "$C" readlink /proc/$pid/cwd)"
check "server runs from /opt/autobyteus/server-package" test "$(docker exec "$C" readlink /proc/$pid/cwd)" = /opt/autobyteus/server-package
printf 'node arch: %s\n' "$(docker exec "$C" node -p 'process.arch + " " + process.versions.modules')"
check "Node in the container is x64" test "$(docker exec "$C" node -p process.arch)" = x64
docker exec "$C" cat /opt/autobyteus/server-package/server-package.json; echo
check "server-package.json says linux-x64" bash -c "docker exec $C node -p 'require(\"/opt/autobyteus/server-package/server-package.json\").arch' | grep -qx x64"
docker exec "$C" sh -c 'grep -E "Using Prisma engine overrides|Database migrations completed" /var/log/supervisor/autobyteus_server.log'
check "Prisma used the bundled x64 engines and migrations completed" bash -c "docker exec $C grep -q 'overrides from bundled: .*debian-openssl\|Using Prisma engine overrides from bundled' /var/log/supervisor/autobyteus_server.log && docker exec $C grep -q 'Database migrations completed successfully' /var/log/supervisor/autobyteus_server.log"
check "/mobile/ served (200)" test "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${port}/mobile/")" = 200
gq="$(curl -s -m 15 -H 'content-type: application/json' -d '{"query":"{ __typename }"}' "http://127.0.0.1:${port}/graphql")"; printf 'graphql: %s\n' "$gq"
check "GraphQL answers" bash -c "printf '%s' '$gq' | grep -q '__typename'"
docker rm -f -v "$C" >/dev/null
check "container removed" bash -c "! docker inspect $C >/dev/null 2>&1"
printf '\nCHECK FAILURES: %s\n' "$FAILS"
