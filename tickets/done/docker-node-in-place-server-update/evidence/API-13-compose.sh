#!/usr/bin/env bash
# API-13 (autobyteus-305 step 1): compose start with docker-start.sh up --build-local, test-owned
# project ab305-api-compose (own volumes, own ports). Usage: api13-compose.sh <worktree> <evidence-file> <build-log>
set -uo pipefail
WT="$1"; OUT="$2"; BUILD_LOG="$3"
P=ab305-api-compose
C="${P}-autobyteus-server-1"
FAILS=0
exec > >(tee -a "$OUT") 2>&1
check() { local d="$1"; shift; if "$@"; then printf 'CHECK PASS: %s\n' "$d"; else printf 'CHECK FAIL: %s\n' "$d"; FAILS=$((FAILS + 1)); fi; }
printf '# API-13 compose start: docker-start.sh up --build-local -p %s\n' "$P"
printf '# Commit: %s; Date: %s; Environment: macOS arm64, Docker %s, %s\n' "$(git -C "$WT" rev-parse --short HEAD)" "$(date -u +%FT%TZ)" \
  "$(docker version --format '{{.Server.Version}}')" "$(docker compose version)"
check "no autobyteus-server:latest image exists before the run (so the tag is this run's)" bash -c '! docker image inspect autobyteus-server:latest >/dev/null 2>&1'
check "no volumes of project $P exist before the run" test -z "$(docker volume ls -q --filter name=${P}_)"
cd "$WT/autobyteus-server-ts/docker" || exit 1
printf '\n## up --build-local (build output in %s)\n' "$BUILD_LOG"
./docker-start.sh up --build-local -p "$P" > "$BUILD_LOG" 2>&1; rc=$?
grep -v '^#[0-9]' "$BUILD_LOG" | tail -12
check "docker-start.sh up exited 0" test "$rc" = 0
# shellcheck disable=SC1090
source ".runtime/${P}.env"
printf '\n## container and volumes\n'
docker inspect "$C" --format 'container {{.Id}} image {{.Image}} ({{.Config.Image}})
{{range .Mounts}}{{.Type}} {{.Name}} -> {{.Destination}} rw={{.RW}}
{{end}}env {{range .Config.Env}}{{.}} {{end}}'
check "server-packages volume mounted at /home/autobyteus/server-packages" bash -c "docker inspect $C --format '{{range .Mounts}}{{.Name}}={{.Destination}} {{end}}' | grep -q '${P}_autobyteus-server-server-packages=/home/autobyteus/server-packages'"
check "five project volumes exist" test "$(docker volume ls -q --filter name=${P}_ | wc -l | tr -d ' ')" = 5
docker volume ls --filter name=${P}_
ok=0; body=""
for _ in $(seq 1 240); do
  body="$(curl -s -m 3 "http://127.0.0.1:${AUTOBYTEUS_BACKEND_PORT}/rest/health" || true)"
  if printf '%s' "$body" | grep -q '"status":"ok"'; then ok=$((ok + 1)); [[ $ok -ge 3 ]] && break; else ok=0; fi
  sleep 1
done
printf 'health: %s\n' "$body"
check "compose node healthy 3x on http://127.0.0.1:${AUTOBYTEUS_BACKEND_PORT}" test "$ok" -ge 3
cwd="$(docker exec "$C" sh -c 'readlink /proc/$(supervisorctl pid autobyteus_server)/cwd')"; printf 'server cwd: %s\n' "$cwd"
check "server runs from /opt/autobyteus/server-package" test "$cwd" = /opt/autobyteus/server-package
check "no AUTOBYTEUS_WORKSPACE_ROOT or AUTOBYTEUS_SKIP_SYNC or git-sync variables in the container env" \
  bash -c "! docker inspect $C --format '{{range .Config.Env}}{{.}} {{end}}' | grep -Eq 'AUTOBYTEUS_WORKSPACE_ROOT=|AUTOBYTEUS_SKIP_SYNC=|AUTOBYTEUS_REPO|GIT_'"
check "server-packages volume is empty (step 1 writes nothing there)" test -z "$(docker exec "$C" ls -A /home/autobyteus/server-packages)"
docker exec "$C" cat /opt/autobyteus/server-package/server-package.json; echo
check "/mobile/ served (200)" test "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${AUTOBYTEUS_BACKEND_PORT}/mobile/")" = 200
docker exec "$C" supervisorctl status
printf '\n## down --volumes --delete-state\n'
./docker-start.sh down -p "$P" --volumes --delete-state
check "project container removed" bash -c "! docker inspect $C >/dev/null 2>&1"
check "project volumes removed" test -z "$(docker volume ls -q --filter name=${P}_)"
printf '\nCHECK FAILURES: %s\n' "$FAILS"
