#!/usr/bin/env bash
# API-12 (autobyteus-305 step 1): the real launcher's new-container and upgrade --all, from
# the published :beta image to the step-1 image, on a test-owned Docker daemon (Docker in
# Docker). The host daemon's launcher-labelled nodes (the user's autobyteus-server-0/1/2) are
# invisible to it, so upgrade --all reaches only test nodes.
#
# Phase A: node created by the launcher of origin/personal (what users have installed) on
#          :beta, data seeded, then the NEW launcher (this worktree) runs upgrade --all.
# Phase B: same start, but the OLD launcher runs upgrade --all (users who have not reinstalled
#          the launcher); then the new launcher's plain upgrade --all must keep the container.
# Usage: api12-launcher-upgrade.sh <worktree> <evidence-file>
set -uo pipefail
WT="$1"; OUT="$2"
ROOT=/private/tmp/ab305-api-e2e/api12
DIND=ab305-api-dind
DIND_VOL=ab305-api-dind-lib
STEP1_LOCAL=autobyteus-server-305-test:step1
STEP1_REF=localhost:5000/autobyteus-server-305-test:step1
NEW_LAUNCHER="$WT/scripts/public/docker/autobyteus-docker.sh"
OLD_LAUNCHER="$ROOT/old-launcher/autobyteus-docker.sh"
FAILS=0
exec > >(tee -a "$OUT") 2>&1

say() { printf '\n## %s\n' "$*"; }
check() { # check <description> <command...>
  local d="$1"; shift
  if "$@"; then printf 'CHECK PASS: %s\n' "$d"; else printf 'CHECK FAIL: %s\n' "$d"; FAILS=$((FAILS + 1)); fi
}
host() { env -u DOCKER_HOST docker "$@"; }   # the host daemon, only for dind itself
d() { docker "$@"; }                          # DOCKER_HOST points at dind below
in_dind() { host exec "$DIND" "$@"; }

printf '# API-12 launcher upgrade journey (:beta -> step-1 image) on a test-owned Docker daemon\n'
printf '# Command: %s %s %s\n' "$0" "$WT" "$OUT"
printf '# Commit: %s; Date: %s\n' "$(git -C "$WT" rev-parse --short HEAD)" "$(date -u +%FT%TZ)"
printf '# Environment: macOS %s arm64, host Docker %s; dind docker:dind; launcher run with macOS /bin/bash %s\n' \
  "$(sw_vers -productVersion)" "$(host version --format '{{.Server.Version}}')" "$(/bin/bash -c 'echo $BASH_VERSION')"

say "Setup: test root, old launcher from origin/personal, dind daemon"
rm -rf "$ROOT"; mkdir -p "$ROOT/old-launcher/autobyteus-docker.d/bash"
git -C "$WT" show origin/personal:scripts/public/docker/autobyteus-docker.sh > "$OLD_LAUNCHER"
for m in core.sh container-config.sh docker-runtime.sh commands.sh; do
  git -C "$WT" show "origin/personal:scripts/public/docker/autobyteus-docker.d/bash/$m" > "$ROOT/old-launcher/autobyteus-docker.d/bash/$m"
done
grep -c 'AUTOBYTEUS_SKIP_SYNC\|AUTOBYTEUS_WORKSPACE_ROOT' "$ROOT/old-launcher/autobyteus-docker.d/bash/container-config.sh" | sed 's/^/old launcher: removed env lines present = /'
grep -c 'AUTOBYTEUS_SKIP_SYNC\|AUTOBYTEUS_WORKSPACE_ROOT' "$WT/scripts/public/docker/autobyteus-docker.d/bash/container-config.sh" | sed 's/^/new launcher: removed env lines present = /'
host run -d --privileged --name "$DIND" --label autobyteus.ab305-api=1 -e DOCKER_TLS_CERTDIR= \
  -v "$DIND_VOL:/var/lib/docker" -v "$ROOT:$ROOT" -p 127.0.0.1::2375 docker:dind \
  dockerd --host=tcp://0.0.0.0:2375 --host=unix:///var/run/docker.sock --tls=false >/dev/null
DIND_PORT="$(host port "$DIND" 2375/tcp | head -1 | sed 's/.*://')"
export DOCKER_HOST="tcp://127.0.0.1:${DIND_PORT}"
unset DOCKER_CONTEXT
for _ in $(seq 1 60); do d info >/dev/null 2>&1 && break; sleep 1; done
printf 'DOCKER_HOST=%s; dind server %s %s\n' "$DOCKER_HOST" "$(d version --format '{{.Server.Version}}')" "$(d info --format '{{.Name}}')"
check "the test daemon is not the host daemon (different daemon name)" test "$(d info --format '{{.Name}}')" != "$(host info --format '{{.Name}}')"
check "the test daemon has no launcher-managed containers before the run" test -z "$(d ps -a --filter label=com.autobyteus.launcher=server-docker -q)"

say "Setup: step-1 image into the test daemon's registry (localhost:5000)"
d run -d --name ab305-registry -p 127.0.0.1:5000:5000 registry:2 >/dev/null 2>&1 || {
  host save registry:2 | d load >/dev/null; d run -d --name ab305-registry -p 127.0.0.1:5000:5000 registry:2 >/dev/null; }
host save "$STEP1_LOCAL" | d load
d tag "$STEP1_LOCAL" "$STEP1_REF"
d push -q "$STEP1_REF"
d image rm "$STEP1_LOCAL" >/dev/null
printf 'step-1 in test daemon: %s\n' "$(d image inspect "$STEP1_REF" --format '{{.Id}} {{json .RepoDigests}}')"

health() { # health <backend port>: 3 consecutive ok within 240 s, via the published port inside dind
  local port="$1" ok=0 body
  for _ in $(seq 1 240); do
    body="$(in_dind wget -qO- -T 3 "http://127.0.0.1:${port}/rest/health" 2>/dev/null || true)"
    if printf '%s' "$body" | grep -q '"status":"ok"'; then ok=$((ok + 1)); [[ $ok -ge 3 ]] && { printf 'health %s: %s\n' "$port" "$body"; return 0; }; else ok=0; fi
    sleep 1
  done
  printf 'health %s never ok; last body: %s\n' "$port" "$body"; return 1
}
gql() { # gql <port> <json body>
  in_dind wget -qO- -T 15 --header 'content-type: application/json' --post-data "$2" "http://127.0.0.1:$1/graphql"
}
state_val() { sed -n "s/^$2=//p" "$ROOT/$1/nodes/autobyteus-server-0.env"; }
server_cwd() { d exec "$1" sh -c 'readlink /proc/$(supervisorctl pid autobyteus_server)/cwd'; }
describe_node() { # describe_node <container>
  d inspect "$1" --format 'container {{.Id}}
image {{.Image}} ({{.Config.Image}})
volumes {{range .Mounts}}{{if eq .Type "volume"}}{{.Name}}->{{.Destination}} {{end}}{{end}}
binds {{range .Mounts}}{{if eq .Type "bind"}}{{.Source}}->{{.Destination}} {{end}}{{end}}
env {{range .Config.Env}}{{.}} {{end}}'
  printf 'server cwd: %s\n' "$(server_cwd "$1")"
}
volumes_of() { d inspect "$1" --format '{{range .Mounts}}{{if eq .Type "volume"}}{{.Name}}->{{.Destination}}{{"\n"}}{{end}}{{end}}' | sort; }
has_env() { d inspect "$1" --format '{{range .Config.Env}}{{.}}{{"\n"}}{{end}}' | grep -q "^$2="; }

run_phase() { # run_phase <A|B> <upgrade launcher>
  local phase="$1" up_launcher="$2" state="$ROOT/state-$1" port cid1 cid2 vols1 vols2 created id read_back
  export AUTOBYTEUS_DOCKER_STATE_DIR="$state"
  say "Phase $phase: old launcher new-container --tag beta (pulls the published :beta from Docker Hub)"
  /bin/bash "$OLD_LAUNCHER" new-container --tag beta
  port="$(sed -n 's/^BACKEND_PORT=//p' "$state/nodes/autobyteus-server-0.env")"
  check "phase $phase: :beta node healthy on its published port" health "$port"
  describe_node autobyteus-server-0
  printf 'beta package path present: %s\n' "$(d exec autobyteus-server-0 sh -c 'test -e /opt/autobyteus/server-package && echo yes || echo no')"
  cid1="$(d inspect autobyteus-server-0 --format '{{.Id}}')"; vols1="$(volumes_of autobyteus-server-0)"

  say "Phase $phase: seed data through the public API, and a root-home file"
  created="$(gql "$port" "{\"query\":\"mutation(\$input:CreateAgentDefinitionInput!){createAgentDefinition(input:\$input){id name description instructions}}\",\"variables\":{\"input\":{\"name\":\"ab305-api12-$phase\",\"role\":\"API-12 upgrade fixture\",\"description\":\"Written by the :beta server before upgrade\",\"instructions\":\"Do not run\",\"category\":\"api-e2e\"}}}")"
  printf 'created: %s\n' "$created"
  id="$(printf '%s' "$created" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
  check "phase $phase: definition created on :beta" test -n "$id"
  d exec autobyteus-server-0 sh -c "echo ab305-api12-$phase > /root/ab305-root-home-marker"

  say "Phase $phase: upgrade --all --image $STEP1_REF with the $( [[ $up_launcher == "$NEW_LAUNCHER" ]] && echo NEW || echo OLD ) launcher"
  /bin/bash "$up_launcher" upgrade --all --image "$STEP1_REF"
  check "phase $phase: saved image ref is the step-1 ref" test "$(state_val "state-$phase" IMAGE_REF)" = "$STEP1_REF"
  port="$(state_val "state-$phase" BACKEND_PORT)"
  cid2="$(d inspect autobyteus-server-0 --format '{{.Id}}')"; vols2="$(volumes_of autobyteus-server-0)"
  check "phase $phase: container recreated (new container ID)" test "$cid1" != "$cid2"
  check "phase $phase: container runs the step-1 image" test "$(d inspect autobyteus-server-0 --format '{{.Image}}')" = "$(d image inspect "$STEP1_REF" --format '{{.Id}}')"
  check "phase $phase: same named volumes mounted at the same places" test "$vols1" = "$vols2"
  printf '%s\n' "$vols2"
  check "phase $phase: step-1 node healthy" health "$port"
  describe_node autobyteus-server-0
  check "phase $phase: server runs from /opt/autobyteus/server-package" test "$(server_cwd autobyteus-server-0)" = /opt/autobyteus/server-package
  check "phase $phase: no /app/autobyteus-server-ts/dist in the step-1 container" d exec autobyteus-server-0 sh -c '! test -e /app/autobyteus-server-ts/dist'
  check "phase $phase: no autobyteus-bootstrap.sh in the step-1 container" d exec autobyteus-server-0 sh -c '! test -e /usr/local/bin/autobyteus-bootstrap.sh'
  d exec autobyteus-server-0 cat /opt/autobyteus/server-package/server-package.json; echo
  read_back="$(gql "$port" "{\"query\":\"query(\$id:String!){agentDefinition(id:\$id){id name description instructions}}\",\"variables\":{\"id\":\"$id\"}}")"
  printf 'read back: %s\n' "$read_back"
  check "phase $phase: definition written by :beta read back unchanged by step 1" test "$(printf '%s' "$read_back" | sed 's/{"data":{"agentDefinition":\(.*\)}}/\1/')" = "$(printf '%s' "$created" | sed 's/{"data":{"createAgentDefinition":\(.*\)}}/\1/')"
  check "phase $phase: root-home file kept" test "$(d exec autobyteus-server-0 cat /root/ab305-root-home-marker)" = "ab305-api12-$phase"
  check "phase $phase: /mobile/ served (200)" in_dind wget -q -O /dev/null "http://127.0.0.1:${port}/mobile/"
  if [[ "$up_launcher" == "$NEW_LAUNCHER" ]]; then
    check "phase $phase: new launcher passes no AUTOBYTEUS_WORKSPACE_ROOT" bash -c "! docker inspect autobyteus-server-0 --format '{{range .Config.Env}}{{.}} {{end}}' | grep -q AUTOBYTEUS_WORKSPACE_ROOT="
    check "phase $phase: new launcher passes no AUTOBYTEUS_SKIP_SYNC" bash -c "! docker inspect autobyteus-server-0 --format '{{range .Config.Env}}{{.}} {{end}}' | grep -q AUTOBYTEUS_SKIP_SYNC="
  else
    check "phase $phase: old launcher still passes its dead env (harmless to the new image)" has_env autobyteus-server-0 AUTOBYTEUS_SKIP_SYNC
  fi
  say "Phase $phase: new launcher plain upgrade --all (saved ref) keeps the container"
  /bin/bash "$NEW_LAUNCHER" upgrade --all | tee "$ROOT/plain-upgrade-$phase.log"
  check "phase $phase: plain upgrade reports already running" grep -q 'already running with the current image and launcher config' "$ROOT/plain-upgrade-$phase.log"
  check "phase $phase: plain upgrade kept the same container" test "$(d inspect autobyteus-server-0 --format '{{.Id}}')" = "$cid2"
  /bin/bash "$NEW_LAUNCHER" storage
  say "Phase $phase: new launcher destroy --all keeps the named volumes"
  /bin/bash "$NEW_LAUNCHER" destroy --all
  check "phase $phase: container gone" bash -c '! docker inspect autobyteus-server-0 >/dev/null 2>&1'
  check "phase $phase: all four named volumes kept" test "$(d volume ls -q --filter name=autobyteus-server-0- | sort | tr '\n' ' ')" = "autobyteus-server-0-chromium-profile autobyteus-server-0-data autobyteus-server-0-root-home autobyteus-server-0-workspace "
  # Each phase starts from fresh node volumes (test-owned, inside the test daemon only).
  d volume rm autobyteus-server-0-chromium-profile autobyteus-server-0-data autobyteus-server-0-root-home autobyteus-server-0-workspace >/dev/null
}

# The published :beta from Docker Hub; a stopped holder container keeps it in the test daemon
# between phases (the launcher removes images no container uses after an upgrade).
say "Setup: published :beta from Docker Hub into the test daemon"
d pull autobyteus/autobyteus-server:beta | tail -2
d image inspect autobyteus/autobyteus-server:beta --format 'beta in test daemon: {{.Id}} {{json .RepoDigests}}'
d create --name ab305-keep-beta autobyteus/autobyteus-server:beta >/dev/null
run_phase A "$NEW_LAUNCHER"
run_phase B "$OLD_LAUNCHER"

say "Result"
printf 'CHECK FAILURES: %s\n' "$FAILS"
