#!/usr/bin/env bash
# API-12 / API-21 / API-22 (autobyteus-305 step 2): the real launchers on a test-owned Docker daemon
# (docker:dind), so `upgrade --all` reaches only test nodes, never the host's autobyteus-server-0/1/2.
#   A  installed launcher (origin/personal) node on the published :beta, new launcher upgrade --all
#      to the step-2 image (first move to the starter); C1 incl. a real paired phone (API-21);
#      docker stop/start; launcher stop + plain upgrade --all
#   B  same from a step-1 image
#   C  installed launcher (v6, no server-packages volume) runs the step-2 image; new launcher plain
#      upgrade --all recreates once (v7) and mounts the volume
#   D  NEEDS_NEW_IMAGE: node ran an image labelled 1.5.12-beta.1, then retargeted to step 2 (1.5.11-beta.5)
#   E  the PowerShell launcher (Linux pwsh) new-container, storage, upgrade --all, destroy (API-22)
# Usage: api12-step2-launcher.sh <worktree> <evidence-file>
set -uo pipefail
WT="$1"; OUT="$2"
ROOT=/private/tmp/ab305-api-e2e/api12
DIND=ab305-api-dind; DIND_VOL=ab305-api-dind-lib
REG=localhost:5000/ab305/server
STEP1="$REG:step1"; STEP2="$REG:step2"; NEWER="$REG:step2-labelled-1.5.12-beta.1"
NEW_LAUNCHER="$WT/scripts/public/docker/autobyteus-docker.sh"
OLD_LAUNCHER="$ROOT/old-launcher/autobyteus-docker.sh"
PWSH_IMG=ab305-api-pwsh-docker
N=autobyteus-server-0
FAILS=0
exec > >(tee -a "$OUT") 2>&1

say() { printf '\n## %s\n' "$*"; }
check() { local d="$1"; shift; if "$@"; then printf 'CHECK PASS: %s\n' "$d"; else printf 'CHECK FAIL: %s\n' "$d"; FAILS=$((FAILS + 1)); fi; }
host() { env -u DOCKER_HOST docker "$@"; }
d() { docker "$@"; }
in_dind() { host exec "$DIND" "$@"; }
http() { in_dind curl -s -m 15 -w '\n%{http_code}' "$@"; }        # body, then the status code on its own line
code_of() { printf '%s' "$1" | tail -1; }
body_of() { printf '%s' "$1" | sed '$d'; }

printf '# API-12/21/22 step-2 launcher journeys on a test-owned Docker daemon\n'
printf '# Command: %s %s %s\n' "$0" "$WT" "$OUT"
printf '# Commit: %s; Date: %s\n' "$(git -C "$WT" rev-parse --short HEAD)" "$(date -u +%FT%TZ)"
printf '# Environment: macOS %s arm64, host Docker %s; launcher with macOS /bin/bash %s\n' \
  "$(sw_vers -productVersion)" "$(host version --format '{{.Server.Version}}')" "$(/bin/bash -c 'echo $BASH_VERSION')"

say "Setup: test root, installed launcher from origin/personal ($(git -C "$WT" rev-parse --short origin/personal)), dind"
rm -rf "$ROOT"; mkdir -p "$ROOT/old-launcher/autobyteus-docker.d/bash"
git -C "$WT" show origin/personal:scripts/public/docker/autobyteus-docker.sh > "$OLD_LAUNCHER"
for m in core.sh container-config.sh docker-runtime.sh commands.sh; do
  git -C "$WT" show "origin/personal:scripts/public/docker/autobyteus-docker.d/bash/$m" > "$ROOT/old-launcher/autobyteus-docker.d/bash/$m"
done
printf 'installed launcher: %s; new launcher: %s\n' "$(grep -h '^CONFIG_HASH_VERSION' "$ROOT/old-launcher/autobyteus-docker.d/bash/core.sh")" \
  "$(grep -h '^CONFIG_HASH_VERSION' "$WT/scripts/public/docker/autobyteus-docker.d/bash/core.sh")"
host run -d --privileged --name "$DIND" --label autobyteus.ab305-api=1 -e DOCKER_TLS_CERTDIR= \
  -v "$DIND_VOL:/var/lib/docker" -v "$ROOT:$ROOT" -p 127.0.0.1::2375 docker:dind \
  dockerd --host=tcp://0.0.0.0:2375 --host=unix:///var/run/docker.sock --tls=false >/dev/null
export DOCKER_HOST="tcp://127.0.0.1:$(host port "$DIND" 2375/tcp | head -1 | sed 's/.*://')"; unset DOCKER_CONTEXT
for _ in $(seq 1 60); do d info >/dev/null 2>&1 && break; sleep 1; done
check "the test daemon is not the host daemon" test "$(d info --format '{{.Name}}')" != "$(host info --format '{{.Name}}')"
check "the test daemon has no launcher-managed containers" test -z "$(d ps -a --filter label=com.autobyteus.launcher=server-docker -q)"
in_dind apk add -q --no-cache curl >/dev/null

say "Setup: images (registry inside the test daemon; published :beta from Docker Hub)"
d run -d --name ab305-registry -p 127.0.0.1:5000:5000 registry:2 >/dev/null
for pair in "autobyteus-server-305-test:step1 $STEP1" "autobyteus-server-305-test:step2 $STEP2"; do
  set -- $pair; host save "$1" | d load -q; d tag "$1" "$2"; d push -q "$2" >/dev/null; d image rm "$1" >/dev/null
done
printf 'FROM %s\nRUN node -e "const f=\x27/opt/autobyteus/server-package/server-package.json\x27;const j=require(f);j.version=\x271.5.12-beta.1\x27;require(\x27fs\x27).writeFileSync(f,JSON.stringify(j,null,2)+\x27\\n\x27)"\n' "$STEP2" > "$ROOT/Dockerfile.labelled"
cat "$ROOT/Dockerfile.labelled"
d build -q -t "$NEWER" -f "$ROOT/Dockerfile.labelled" "$ROOT" >/dev/null && d push -q "$NEWER" >/dev/null
d pull -q autobyteus/autobyteus-server:beta >/dev/null
for i in autobyteus/autobyteus-server:beta "$STEP1" "$STEP2" "$NEWER"; do
  printf '%-58s %s %s\n' "$i" "$(d image inspect "$i" --format '{{.Id}}')" "$(d run --rm --entrypoint sh "$i" -c 'cat /opt/autobyteus/server-package/server-package.json 2>/dev/null | grep "\"version\"" || echo "(no server package: /app layout)"')"
  d create --name "hold-$(printf '%s' "$i" | tr -c 'a-z0-9' '-')" "$i" >/dev/null   # keeps the image through the launcher's unused-image cleanup
done

health() { local port="$1" ok=0 body=""
  for _ in $(seq 1 240); do
    body="$(in_dind curl -s -m 3 "http://127.0.0.1:${port}/rest/health" || true)"
    if printf '%s' "$body" | grep -q '"status":"ok"'; then ok=$((ok + 1)); [[ $ok -ge 3 ]] && { printf 'health %s: %s\n' "$port" "$body"; return 0; }; else ok=0; fi
    sleep 1
  done; printf 'health %s never ok: %s\n' "$port" "$body"; return 1; }
gql() { in_dind curl -s -m 15 -H 'content-type: application/json' -d "$2" "http://127.0.0.1:$1/graphql"; }
port_of() { sed -n 's/^BACKEND_PORT=//p' "$AUTOBYTEUS_DOCKER_STATE_DIR/nodes/$N.env"; }
starter_status() { d exec "$N" node /opt/autobyteus/starter/cli.mjs status; }
field() { printf '%s' "$1" | node -e 'let t="";process.stdin.on("data",c=>t+=c).on("end",()=>{const v=process.argv[1].split(".").reduce((o,k)=>o==null?o:o[k],JSON.parse(t));console.log(v===undefined?"undefined":typeof v==="object"?JSON.stringify(v):v)})' "$2"; }
state_json() { d exec "$N" cat /home/autobyteus/server-packages/state.json; }
volumes_of() { d inspect "$N" --format '{{range .Mounts}}{{if eq .Type "volume"}}{{.Name}}->{{.Destination}}{{"\n"}}{{end}}{{end}}' | sort; }
has_mount() { d inspect "$N" --format '{{range .Mounts}}{{.Name}}={{.Destination}} {{end}}' | grep -q "$1=$2"; }
hash_label() { d inspect "$N" --format '{{ index .Config.Labels "com.autobyteus.configHash" }}'; }
seed() { local port="$1" tag="$2" created
  created="$(gql "$port" "{\"query\":\"mutation(\$input:CreateAgentDefinitionInput!){createAgentDefinition(input:\$input){id name description}}\",\"variables\":{\"input\":{\"name\":\"ab305-api12-$tag\",\"role\":\"API-12 fixture\",\"description\":\"written before upgrade\",\"instructions\":\"Do not run\",\"category\":\"api-e2e\"}}}")"
  printf 'seeded: %s\n' "$created"; SEED_ID="$(printf '%s' "$created" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
  d exec "$N" sh -c "echo ab305-$tag > /root/ab305-root-home-marker"; }
read_back_ok() { local port="$1" tag="$2" r
  r="$(gql "$port" "{\"query\":\"query(\$id:String!){agentDefinition(id:\$id){id name description}}\",\"variables\":{\"id\":\"$SEED_ID\"}}")"
  printf 'read back: %s\n' "$r"; printf '%s' "$r" | grep -q "\"name\":\"ab305-api12-$tag\"" && [[ "$(d exec "$N" cat /root/ab305-root-home-marker)" == "ab305-$tag" ]]; }
starter_runs_server() { # the supervisord program is the starter; the server is its child in its own group; cwd = package
  local st="$1" spid server_pid
  spid="$(d exec "$N" supervisorctl pid autobyteus_server)"; server_pid="$(field "$st" server.pid)"
  d exec "$N" sh -c "printf 'starter %s: '; tr '\0' ' ' < /proc/$spid/cmdline; echo; printf 'server %s: '; tr '\0' ' ' < /proc/$server_pid/cmdline; echo; printf 'server ppid/pgid: '; awk '{print \$4\"/\"\$5}' /proc/$server_pid/stat; printf 'server cwd: '; readlink /proc/$server_pid/cwd; printf 'server env has AUTOBYTEUS_STARTER_SOCKET: '; tr '\0' '\n' < /proc/$server_pid/environ | grep -c '^AUTOBYTEUS_STARTER_SOCKET='" "$spid" "$server_pid"
  d exec "$N" sh -c "tr '\0' ' ' < /proc/$spid/cmdline | grep -q starter/starter.mjs && awk '{exit !(\$4==$spid)}' /proc/$server_pid/stat && [ \"\$(readlink /proc/$server_pid/cwd)\" = /opt/autobyteus/server-package ]"; }
cleanup_node() { /bin/bash "$NEW_LAUNCHER" destroy --all >/dev/null
  d volume ls -q --filter "name=$N-" | xargs -r docker volume rm >/dev/null; }

first_move() { # first_move <phase> <create-args...>: installed launcher creates the node, new launcher moves it to step 2
  local phase="$1"; shift
  export AUTOBYTEUS_DOCKER_STATE_DIR="$ROOT/state-$phase"
  say "Phase $phase: installed launcher new-container $*"
  /bin/bash "$OLD_LAUNCHER" new-container "$@" | grep -E 'Image|Started|Backend'
  local port; port="$(port_of)"
  check "phase $phase: node healthy before the move" health "$port"
  local hash_before cid_before vols_before; hash_before="$(hash_label)"; cid_before="$(d inspect "$N" --format '{{.Id}}')"; vols_before="$(volumes_of)"
  printf 'before: hash %s, %s volumes\n%s\n' "$hash_before" "$(printf '%s\n' "$vols_before" | grep -c .)" "$vols_before"
  seed "$port" "$phase"
  say "Phase $phase: new launcher upgrade --all --image $STEP2"
  /bin/bash "$NEW_LAUNCHER" upgrade --all --image "$STEP2" | grep -E 'Image changed|config changed|Started|Keeping|Removed'
  port="$(port_of)"
  check "phase $phase: recreated (new container ID)" test "$(d inspect "$N" --format '{{.Id}}')" != "$cid_before"
  check "phase $phase: config hash label changed (v7)" test "$(hash_label)" != "$hash_before"
  check "phase $phase: server-packages volume mounted at /home/autobyteus/server-packages" has_mount "$N-server-packages" /home/autobyteus/server-packages
  check "phase $phase: the four earlier volumes kept at the same places" test -z "$(comm -23 <(printf '%s\n' "$vols_before") <(volumes_of))"
  volumes_of
  check "phase $phase: step-2 node healthy" health "$port"
  local st; st="$(starter_status)"; printf 'cli.mjs status: %s\n' "$st"
  check "phase $phase: starter state running, version 1.5.11-beta.5, built-in package" test "$(field "$st" state) $(field "$st" version) $(field "$st" server.source)" = "running 1.5.11-beta.5 builtIn"
  check "phase $phase: supervisord runs the starter; the server is its child, cwd the built-in package, socket in env" starter_runs_server "$st"
  printf 'state.json: %s\n' "$(state_json)"
  check "phase $phase: state.json records the built-in package as current" test "$(field "$(state_json)" current)" = '{"source":"builtIn","version":"1.5.11-beta.5"}'
  check "phase $phase: data and root-home kept" read_back_ok "$port" "$phase"
  /bin/bash "$NEW_LAUNCHER" storage | grep -E 'server-packages|storage:'
  check "phase $phase: launcher storage lists the server-packages volume" bash -c "/bin/bash '$NEW_LAUNCHER' storage | grep -q '$N-server-packages -> /home/autobyteus/server-packages'"
}

c1_checks() { # API-21 on the phase A node
  local port="$1" r cred device
  say "API-21: C1 GET /rest/node-update on a real node (through the published port)"
  for q in "" "?target=1.5.12" "?target=1.5.11-beta.5" "?target=1.5.10" "?target=latest"; do
    r="$(http "http://127.0.0.1:${port}/rest/node-update$q")"; printf 'GET /rest/node-update%s -> %s %s\n' "$q" "$(code_of "$r")" "$(body_of "$r")"
  done
  r="$(http "http://127.0.0.1:${port}/rest/node-update")"
  check "C1 no target: 200, inPlaceUpdate available, version 1.5.11-beta.5, update.state idle" test "$(code_of "$r") $(field "$(body_of "$r")" inPlaceUpdate) $(field "$(body_of "$r")" version) $(field "$(body_of "$r")" update.state)" = "200 available 1.5.11-beta.5 idle"
  r="$(http "http://127.0.0.1:${port}/rest/node-update?target=1.5.12")"
  check "C1 target 1.5.12: relation newer" test "$(field "$(body_of "$r")" target.relation)" = newer
  r="$(http "http://127.0.0.1:${port}/rest/node-update?target=1.5.11-beta.5")"
  check "C1 target 1.5.11-beta.5: relation same" test "$(field "$(body_of "$r")" target.relation)" = same
  r="$(http "http://127.0.0.1:${port}/rest/node-update?target=1.5.10")"
  check "C1 target 1.5.10: relation older" test "$(field "$(body_of "$r")" target.relation)" = older
  r="$(http "http://127.0.0.1:${port}/rest/node-update?target=latest")"
  check "C1 target latest: 400 INVALID_VERSION passed on" test "$(code_of "$r") $(field "$(body_of "$r")" code)" = "400 INVALID_VERSION"
  say "API-21: a real paired phone credential"
  r="$(http -X PUT -H 'content-type: application/json' -d '{"phoneAccessEnabled":true}' "http://127.0.0.1:${port}/rest/remote-access/settings")"; printf 'enable phone access -> %s\n' "$(code_of "$r")"
  r="$(http -X POST -H 'content-type: application/json' -d "{\"serverBaseUrl\":\"http://127.0.0.1:${port}\",\"serverName\":\"API-21 node\",\"trustedPrivateHttpAcknowledged\":true}" "http://127.0.0.1:${port}/rest/remote-access/pairing-sessions")"
  printf 'pairing session -> %s\n' "$(code_of "$r")"
  local code base; code="$(field "$(body_of "$r")" payload.pairingCode)"; base="$(field "$(body_of "$r")" mobileUrl | sed 's/?.*//')"
  r="$(http -X POST -H 'content-type: application/json' -d "{\"pairingCode\":\"$code\",\"serverBaseUrl\":\"$base\",\"deviceName\":\"API-21 phone\"}" "http://127.0.0.1:${port}/rest/remote-access/pairing-exchanges")"
  cred="$(field "$(body_of "$r")" credential)"; device="$(field "$(body_of "$r")" device.deviceId)"
  printf 'pairing exchange -> %s, credential %s… (redacted), device %s\n' "$(code_of "$r")" "${cred:0:4}" "$device"
  check "phone paired through the public flow (credential mra_…)" bash -c "[[ '$cred' == mra_* ]]"
  r="$(http -H "authorization: Bearer $cred" -H 'content-type: application/json' -d '{"query":"{ __typename }"}' "http://127.0.0.1:${port}/graphql")"
  printf 'control: phone credential on GraphQL -> %s %s\n' "$(code_of "$r")" "$(body_of "$r")"
  check "control: the phone credential is accepted on a phone route (GraphQL 200)" test "$(code_of "$r")" = 200
  r="$(http -H "authorization: Bearer $cred" "http://127.0.0.1:${port}/rest/node-update")"
  printf 'phone credential on C1 -> %s %s\n' "$(code_of "$r")" "$(body_of "$r")"
  check "phone credential on C1: 403 REMOTE_ACCESS_AUTH_INVALID" test "$(code_of "$r") $(field "$(body_of "$r")" code)" = "403 REMOTE_ACCESS_AUTH_INVALID"
  r="$(http -X DELETE "http://127.0.0.1:${port}/rest/remote-access/devices/$device")"; printf 'revoke device -> %s\n' "$(code_of "$r")"
  check "test phone revoked" test "$(code_of "$r")" = 200
}

restart_checks() { # CR2-S3 and RU-26 on the phase A node
  local port="$1" st pid1 pid2 state1
  say "Phase A: docker stop / docker start"
  st="$(starter_status)"; pid1="$(field "$st" server.pid)"; state1="$(state_json)"
  d stop "$N" >/dev/null; d start "$N" >/dev/null
  check "after docker start: healthy" health "$port"
  st="$(starter_status)"; printf 'cli.mjs status: %s\n' "$st"
  check "after docker start: running the same package (built-in 1.5.11-beta.5)" test "$(field "$st" state) $(field "$st" version) $(field "$st" server.source)" = "running 1.5.11-beta.5 builtIn"
  check "after docker start: state.json unchanged" test "$(state_json)" = "$state1"
  check "after docker start: data kept" read_back_ok "$port" A
  say "Phase A: launcher stop, then plain upgrade --all (the launcher's docker start path)"
  local cid; cid="$(d inspect "$N" --format '{{.Id}}')"
  /bin/bash "$NEW_LAUNCHER" stop --all | head -1
  check "launcher stop: container stopped" test "$(d inspect "$N" --format '{{.State.Status}}')" = exited
  /bin/bash "$NEW_LAUNCHER" upgrade --all | grep -E 'Started|already|recreat'
  check "plain upgrade --all started the same container" test "$(d inspect "$N" --format '{{.Id}}')" = "$cid"
  check "after launcher start: healthy" health "$port"
  st="$(starter_status)"
  check "after launcher start: running built-in 1.5.11-beta.5, state.json unchanged" test "$(field "$st" state) $(field "$st" server.source) $(state_json | tr -d '\n')" = "running builtIn $(printf '%s' "$state1" | tr -d '\n')"
  /bin/bash "$NEW_LAUNCHER" upgrade --all | grep -E 'already|recreat'
  check "second plain upgrade --all: same container" test "$(d inspect "$N" --format '{{.Id}}')" = "$cid"
  say "Phase A: destroy --all keeps all five named volumes"
  /bin/bash "$NEW_LAUNCHER" destroy --all >/dev/null
  check "five named volumes kept" test "$(d volume ls -q --filter name=$N- | sort | tr '\n' ' ')" = "$N-chromium-profile $N-data $N-root-home $N-server-packages $N-workspace "
  d volume ls -q --filter "name=$N-" | xargs -r docker volume rm >/dev/null
}

# ---- A: :beta -> step 2 ----
first_move A --tag beta
c1_checks "$(port_of)"
restart_checks "$(port_of)"

# ---- B: step 1 -> step 2 ----
first_move B --image "$STEP1"
cleanup_node

# ---- C: installed (v6) launcher runs the step-2 image, then the new launcher ----
export AUTOBYTEUS_DOCKER_STATE_DIR="$ROOT/state-C"
say "Phase C: installed launcher (v6) new-container --image $STEP2"
/bin/bash "$OLD_LAUNCHER" new-container --image "$STEP2" | grep -E 'Started|Backend'
port="$(port_of)"
check "phase C: healthy" health "$port"
st="$(starter_status)"; printf 'cli.mjs status: %s\n' "$st"
check "phase C: starter running the built-in package" test "$(field "$st" state) $(field "$st" server.source)" = "running builtIn"
check "phase C: no server-packages volume (the installed launcher has none); state.json in the container layer" bash -c "! docker inspect $N --format '{{range .Mounts}}{{.Destination}} {{end}}' | grep -q /home/autobyteus/server-packages && docker exec $N test -f /home/autobyteus/server-packages/state.json"
seed "$port" C; cid="$(d inspect "$N" --format '{{.Id}}')"
say "Phase C: new launcher plain upgrade --all (same image, v7 config)"
/bin/bash "$NEW_LAUNCHER" upgrade --all | grep -E 'Image changed|config changed|already|Started'
check "phase C: recreated once for the launcher config" test "$(d inspect "$N" --format '{{.Id}}')" != "$cid"
check "phase C: server-packages volume now mounted" has_mount "$N-server-packages" /home/autobyteus/server-packages
check "phase C: healthy after the recreate" health "$port"
check "phase C: data and root-home kept" read_back_ok "$port" C
st="$(starter_status)"; check "phase C: starter running built-in, state.json in the volume" test "$(field "$st" state) $(field "$(state_json)" current.source)" = "running builtIn"
cid="$(d inspect "$N" --format '{{.Id}}')"; /bin/bash "$NEW_LAUNCHER" upgrade --all | grep -E 'already|recreat'
check "phase C: next plain upgrade keeps the container" test "$(d inspect "$N" --format '{{.Id}}')" = "$cid"
cleanup_node

# ---- D: NEEDS_NEW_IMAGE by retargeting to an older image ----
export AUTOBYTEUS_DOCKER_STATE_DIR="$ROOT/state-D"
say "Phase D: new launcher new-container --image $NEWER (an image of 'a newer release', labelled 1.5.12-beta.1)"
/bin/bash "$NEW_LAUNCHER" new-container --image "$NEWER" | grep -E 'Started|Backend'
port="$(port_of)"
check "phase D: the newer node is healthy" health "$port"
st="$(starter_status)"; printf 'cli.mjs status: %s\nstate.json: %s\n' "$st" "$(state_json)"
check "phase D: running 1.5.12-beta.1 (built-in of that image), recorded current" test "$(field "$st" version) $(field "$(state_json)" current.version)" = "1.5.12-beta.1 1.5.12-beta.1"
say "Phase D: upgrade --all --image $STEP2 (built-in 1.5.11-beta.5, older than what ran)"
/bin/bash "$NEW_LAUNCHER" upgrade --all --image "$STEP2" | grep -E 'Image changed|Started|docker run failed'
check "phase D: the launcher started the container (it reports it running)" test "$(d inspect "$N" --format '{{.State.Running}}')" = true
sleep 15
st="$(starter_status)"; printf 'cli.mjs status: %s\n' "$st"
check "phase D: C2 state needsNewImage, version 1.5.12-beta.1, no server" test "$(field "$st" state) $(field "$st" version) $(field "$st" server)" = "needsNewImage 1.5.12-beta.1 undefined"
check "phase D: message names the image needed and the launcher command" bash -c "printf '%s' '$(field "$st" message)' | grep -q 'autobyteus-docker upgrade --all --tag 1.5.12-beta.1'"
spid1="$(d exec "$N" supervisorctl pid autobyteus_server)"; sleep 60; spid2="$(d exec "$N" supervisorctl pid autobyteus_server)"
d exec "$N" supervisorctl status autobyteus_server
check "phase D: starter up with the same pid after 60 s (no restart loop)" test "$spid1" = "$spid2"
check "phase D: no node server process" bash -c "! docker exec $N sh -c 'ps -eo args | grep -v grep | grep -q server-package/dist/app.js'"
check "phase D: nothing listens on 8000 (health refused)" bash -c "! docker exec $N curl -s -m 3 http://127.0.0.1:8000/rest/health >/dev/null"
check "phase D: state.json not overwritten by the older image (current still 1.5.12-beta.1)" test "$(field "$(state_json)" current.version)" = 1.5.12-beta.1
printf 'starter log (needs-new-image lines):\n'; d exec "$N" sh -c 'grep -i "needs\|new image\|newImage" /var/log/supervisor/autobyteus_server.log | tail -3'
check "phase D: the node log names the refusal" bash -c "docker exec $N grep -qi 'needsNewImage\|needs-new-image\|NEEDS_NEW_IMAGE' /var/log/supervisor/autobyteus_server.log"
printf 'launcher status (CR2-N1: no starter state until step 3):\n'; /bin/bash "$NEW_LAUNCHER" status
say "Phase D: back to the newer image"
/bin/bash "$NEW_LAUNCHER" upgrade --all --image "$NEWER" | grep -E 'Image changed|Started'
check "phase D: the newer image runs again" health "$port"
st="$(starter_status)"; check "phase D: running 1.5.12-beta.1" test "$(field "$st" state) $(field "$st" version)" = "running 1.5.12-beta.1"
cleanup_node

# ---- E: PowerShell launcher (API-22) ----
say "Phase E (API-22): PowerShell launcher, Linux pwsh in the test daemon's network namespace"
host build -q -t "$PWSH_IMG" - >/dev/null <<'EOF'
FROM docker:cli AS cli
FROM mcr.microsoft.com/dotnet/sdk:8.0
COPY --from=cli /usr/local/bin/docker /usr/local/bin/docker
EOF
pslaunch() { host run --rm --network "container:$DIND" -e DOCKER_HOST=tcp://127.0.0.1:2375 \
  -e AUTOBYTEUS_DOCKER_STATE_DIR="$ROOT/state-E" -e AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR="$ROOT/state-E/shared-workspace" \
  -v "$ROOT:$ROOT" -v "$WT/scripts/public/docker:/launcher:ro" "$PWSH_IMG" pwsh -NoLogo -NoProfile -File /launcher/autobyteus-docker.ps1 "$@"; }
host run --rm "$PWSH_IMG" sh -c 'pwsh -NoLogo -NoProfile -Command "\$PSVersionTable.PSVersion.ToString()"; docker --version'
pslaunch new-container --tag beta 2>&1 | grep -E 'Image|Started|Backend|error'
export AUTOBYTEUS_DOCKER_STATE_DIR="$ROOT/state-E"
psport="$(d inspect "$N" --format '{{(index (index .NetworkSettings.Ports "8000/tcp") 0).HostPort}}')"
check "phase E: PowerShell new-container node on :beta healthy" health "$psport"
hash_before="$(hash_label)"; cid="$(d inspect "$N" --format '{{.Id}}')"
check "phase E: the PowerShell node has the server-packages volume from the start" has_mount "$N-server-packages" /home/autobyteus/server-packages
pslaunch storage 2>&1 | grep -E 'storage:|server-packages'
check "phase E: PowerShell storage lists the server-packages volume" bash -c "docker run --rm --network container:$DIND -e DOCKER_HOST=tcp://127.0.0.1:2375 -e AUTOBYTEUS_DOCKER_STATE_DIR=$ROOT/state-E -e AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR=$ROOT/state-E/shared-workspace -v $ROOT:$ROOT -v $WT/scripts/public/docker:/launcher:ro $PWSH_IMG pwsh -NoLogo -NoProfile -File /launcher/autobyteus-docker.ps1 storage 2>&1 | grep -q '$N-server-packages -> /home/autobyteus/server-packages'"
pslaunch upgrade --all --image "$STEP2" 2>&1 | grep -E 'Image changed|Started|recreat|error'
psport="$(d inspect "$N" --format '{{(index (index .NetworkSettings.Ports "8000/tcp") 0).HostPort}}')"
check "phase E: PowerShell upgrade recreated the node" test "$(d inspect "$N" --format '{{.Id}}')" != "$cid"
check "phase E: step-2 node healthy" health "$psport"
st="$(starter_status)"; printf 'cli.mjs status: %s\n' "$st"
check "phase E: starter running the built-in package; state.json in the volume" test "$(field "$st" state) $(field "$st" server.source) $(field "$(state_json)" current.source)" = "running builtIn builtIn"
check "phase E: no removed env (AUTOBYTEUS_WORKSPACE_ROOT, AUTOBYTEUS_SKIP_SYNC) from the PowerShell launcher" bash -c "! docker inspect $N --format '{{range .Config.Env}}{{.}} {{end}}' | grep -Eq 'AUTOBYTEUS_WORKSPACE_ROOT=|AUTOBYTEUS_SKIP_SYNC='"
cid="$(d inspect "$N" --format '{{.Id}}')"; pslaunch upgrade --all 2>&1 | grep -E 'already|recreat|Started'
check "phase E: PowerShell plain upgrade keeps the container" test "$(d inspect "$N" --format '{{.Id}}')" = "$cid"
pslaunch destroy --all 2>&1 | grep -E 'Removed|kept' | head -2
check "phase E: PowerShell destroy kept the five volumes" test "$(d volume ls -q --filter name=$N- | wc -l | tr -d ' ')" = 5
d volume ls -q --filter "name=$N-" | xargs -r docker volume rm >/dev/null
host image rm "$PWSH_IMG" mcr.microsoft.com/dotnet/sdk:8.0 docker:cli >/dev/null 2>&1

say "Result"
printf 'CHECK FAILURES: %s\n' "$FAILS"
