#!/usr/bin/env bash
# API-13 (autobyteus-305 step 2): compose with the step-2 image (docker-start.sh up --no-build, the image
# tagged autobyteus-server:latest by this run); the starter keeps its state in the project's
# server-packages volume across a compose restart. Usage: api13-step2-compose.sh <worktree> <evidence-file>
set -uo pipefail
WT="$1"; OUT="$2"; P=ab305-api-compose; C="${P}-autobyteus-server-1"; FAILS=0
exec > >(tee -a "$OUT") 2>&1
check() { local d="$1"; shift; if "$@"; then printf 'CHECK PASS: %s\n' "$d"; else printf 'CHECK FAIL: %s\n' "$d"; FAILS=$((FAILS + 1)); fi; }
health() { local ok=0 body=""; for _ in $(seq 1 240); do body="$(curl -s -m 3 "http://127.0.0.1:$1/rest/health" || true)"
  if printf '%s' "$body" | grep -q '"status":"ok"'; then ok=$((ok + 1)); [[ $ok -ge 3 ]] && { echo "health: $body"; return 0; }; else ok=0; fi; sleep 1; done; echo "health never ok: $body"; return 1; }
printf '# API-13 compose with the step-2 image: docker-start.sh up --no-build -p %s\n# Commit: %s; Date: %s; Environment: macOS arm64, Docker %s, %s\n' "$P" \
  "$(git -C "$WT" rev-parse --short HEAD)" "$(date -u +%FT%TZ)" "$(docker version --format '{{.Server.Version}}')" "$(docker compose version)"
check "no autobyteus-server:latest exists before the run" bash -c '! docker image inspect autobyteus-server:latest >/dev/null 2>&1'
check "no volumes of project $P exist before the run" test -z "$(docker volume ls -q --filter name=${P}_)"
docker tag autobyteus-server-305-test:step2 autobyteus-server:latest
cd "$WT/autobyteus-server-ts/docker" || exit 1
env -u AUTOBYTEUS_SERVER_HOST ./docker-start.sh up --no-build -p "$P" 2>&1 | grep -E 'Volume|Started|is up|Backend'
# shellcheck disable=SC1090
source ".runtime/${P}.env"
check "compose node healthy" health "$AUTOBYTEUS_BACKEND_PORT"
docker inspect "$C" --format '{{range .Mounts}}{{.Name}} -> {{.Destination}}{{"\n"}}{{end}}'
check "server-packages volume mounted" bash -c "docker inspect $C --format '{{range .Mounts}}{{.Name}}={{.Destination}} {{end}}' | grep -q '${P}_autobyteus-server-server-packages=/home/autobyteus/server-packages'"
st="$(docker exec "$C" node /opt/autobyteus/starter/cli.mjs status)"; echo "cli.mjs status: $st"
check "starter running the built-in package" bash -c "printf '%s' '$st' | grep -q '\"state\":\"running\"' && printf '%s' '$st' | grep -q '\"source\":\"builtIn\"'"
state1="$(docker run --rm -v ${P}_autobyteus-server-server-packages:/v:ro alpine cat /v/state.json)"; echo "state.json in the volume: $state1"
check "state.json is in the project's server-packages volume" bash -c "printf '%s' '$state1' | grep -q '\"current\"'"
docker compose -p "$P" -f docker-compose.yml --env-file ".runtime/${P}.env" restart 2>&1 | tail -1
check "healthy after compose restart" health "$AUTOBYTEUS_BACKEND_PORT"
check "state.json unchanged after the restart" test "$(docker run --rm -v ${P}_autobyteus-server-server-packages:/v:ro alpine cat /v/state.json)" = "$state1"
./docker-start.sh down -p "$P" --volumes --delete-state 2>&1 | tail -2
check "project container and volumes removed" bash -c "! docker inspect $C >/dev/null 2>&1 && test -z \"\$(docker volume ls -q --filter name=${P}_)\""
docker image rm autobyteus-server:latest >/dev/null && echo "untagged autobyteus-server:latest"
printf '\nCHECK FAILURES: %s\n' "$FAILS"
