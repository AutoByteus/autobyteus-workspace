#!/usr/bin/env bash
# API-21 (phone part) and API-22 (PowerShell launcher), second run on the same test-owned dind daemon.
#  API-21: the phone pairs with the node's private address (the pairing policy refuses loopback, so
#          the first run's 127.0.0.1 pairing was a fixture error: REMOTE_ACCESS_PAIRING_URL_LOCAL_ONLY).
#  API-22: PowerShell new-container fails on a fresh port pick (pre-existing Get-UsedPorts bug, see
#          API-22-cause.log). The node is therefore created with a temporary patched COPY of the launcher
#          (fixture only); storage, upgrade --all, plain upgrade and destroy run the UNPATCHED launcher.
# Usage: api21-22-rerun.sh <worktree> <evidence-file>
set -uo pipefail
WT="$1"; OUT="$2"; ROOT=/private/tmp/ab305-api-e2e/api12; DIND=ab305-api-dind; N=autobyteus-server-0
REG=localhost:5000/ab305/server; STEP2="$REG:step2"; NEW_LAUNCHER="$WT/scripts/public/docker/autobyteus-docker.sh"
PWSH_IMG=ab305-api-pwsh-docker; FAILS=0
exec > >(tee -a "$OUT") 2>&1
say() { printf '\n## %s\n' "$*"; }
check() { local d="$1"; shift; if "$@"; then printf 'CHECK PASS: %s\n' "$d"; else printf 'CHECK FAIL: %s\n' "$d"; FAILS=$((FAILS + 1)); fi; }
host() { env -u DOCKER_HOST docker "$@"; }
d() { docker "$@"; }
in_dind() { host exec "$DIND" "$@"; }
http() { in_dind curl -s -m 15 -w '\n%{http_code}' "$@"; }
code_of() { printf '%s' "$1" | tail -1; }
body_of() { printf '%s' "$1" | sed '$d'; }
field() { printf '%s' "$1" | node -e 'let t="";process.stdin.on("data",c=>t+=c).on("end",()=>{let v;try{v=process.argv[1].split(".").reduce((o,k)=>o==null?o:o[k],JSON.parse(t))}catch{v="(not json)"};console.log(v===undefined?"undefined":typeof v==="object"?JSON.stringify(v):v)})' "$2"; }
health() { local ok=0 body=""; for _ in $(seq 1 240); do body="$(in_dind curl -s -m 3 "http://127.0.0.1:$1/rest/health" || true)"
  if printf '%s' "$body" | grep -q '"status":"ok"'; then ok=$((ok + 1)); [[ $ok -ge 3 ]] && { echo "health $1: $body"; return 0; }; else ok=0; fi; sleep 1; done; echo "health never ok: $body"; return 1; }
starter_status() { d exec "$N" node /opt/autobyteus/starter/cli.mjs status; }
state_json() { d exec "$N" cat /home/autobyteus/server-packages/state.json; }
has_mount() { d inspect "$N" --format '{{range .Mounts}}{{.Name}}={{.Destination}} {{end}}' | grep -q "$1=$2"; }

printf '# API-21 (phone) and API-22 (PowerShell launcher), run 2 on the test-owned dind daemon\n# Command: %s %s %s\n# Commit: %s; Date: %s\n' "$0" "$WT" "$OUT" "$(git -C "$WT" rev-parse --short HEAD)" "$(date -u +%FT%TZ)"
export DOCKER_HOST="tcp://127.0.0.1:$(host port "$DIND" 2375/tcp | head -1 | sed 's/.*://')"; unset DOCKER_CONTEXT
check "the test daemon is not the host daemon" test "$(d info --format '{{.Name}}')" != "$(host info --format '{{.Name}}')"
check "no launcher-managed container on the test daemon before this run" test -z "$(d ps -a --filter label=com.autobyteus.launcher=server-docker -q)"

# ---- API-21: phone ----
export AUTOBYTEUS_DOCKER_STATE_DIR="$ROOT/state-F"
say "API-21: new launcher new-container --image $STEP2"
/bin/bash "$NEW_LAUNCHER" new-container --image "$STEP2" | grep -E 'Started|Backend'
port="$(sed -n 's/^BACKEND_PORT=//p' "$AUTOBYTEUS_DOCKER_STATE_DIR/nodes/$N.env")"
check "step-2 node healthy" health "$port"
ip="$(host inspect "$DIND" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')"; base="http://${ip}:${port}"
printf 'node private address (the test daemon host on the Docker bridge): %s\n' "$base"
r="$(http "$base/rest/node-update")"; printf 'no credential, via the private address: %s %s\n' "$(code_of "$r")" "$(body_of "$r" | cut -c1-120)"
check "C1 without a credential via the private address: 200 available" test "$(code_of "$r") $(field "$(body_of "$r")" inPlaceUpdate)" = "200 available"
r="$(http -X PUT -H 'content-type: application/json' -d '{"phoneAccessEnabled":true}' "$base/rest/remote-access/settings")"; printf 'enable phone access -> %s\n' "$(code_of "$r")"
r="$(http -X POST -H 'content-type: application/json' -d "{\"serverBaseUrl\":\"$base\",\"serverName\":\"API-21 node\",\"trustedPrivateHttpAcknowledged\":true}" "$base/rest/remote-access/pairing-sessions")"
printf 'pairing session -> %s %s\n' "$(code_of "$r")" "$(body_of "$r" | sed 's/"pairingCode":"[^"]*"/"pairingCode":"<redacted>"/g; s/pairing=[A-Za-z0-9_%.-]*/pairing=<redacted>/g' | cut -c1-200)"
check "pairing session created (201)" test "$(code_of "$r")" = 201
pcode="$(field "$(body_of "$r")" payload.pairingCode)"; murl="$(field "$(body_of "$r")" mobileUrl | sed 's/?.*//')"
r="$(http -X POST -H 'content-type: application/json' -d "{\"pairingCode\":\"$pcode\",\"serverBaseUrl\":\"$murl\",\"deviceName\":\"API-21 phone\"}" "$base/rest/remote-access/pairing-exchanges")"
cred="$(field "$(body_of "$r")" credential)"; device="$(field "$(body_of "$r")" device.deviceId)"
printf 'pairing exchange -> %s, credential %s… (redacted), device %s\n' "$(code_of "$r")" "${cred:0:4}" "$device"
check "phone paired through the public flow (201, credential mra_…)" bash -c "[[ '$(code_of "$r")' == 201 && '$cred' == mra_* ]]"
r="$(http -H "authorization: Bearer $cred" -H 'content-type: application/json' -d '{"query":"{ __typename }"}' "$base/graphql")"
printf 'control: phone credential on GraphQL -> %s %s\n' "$(code_of "$r")" "$(body_of "$r")"
check "control: the phone credential is accepted on a phone route (GraphQL 200)" test "$(code_of "$r")" = 200
r="$(http -H "authorization: Bearer mra_not_a_real_credential" -H 'content-type: application/json' -d '{"query":"{ __typename }"}' "$base/graphql")"
printf 'control: an unknown mra_ credential on GraphQL -> %s %s\n' "$(code_of "$r")" "$(body_of "$r" | cut -c1-140)"
check "control: an unknown mra_ credential is refused on GraphQL (so the 200 above is the real credential)" test "$(code_of "$r")" != 200
r="$(http -H "authorization: Bearer $cred" "$base/rest/node-update")"
printf 'phone credential on C1 -> %s %s\n' "$(code_of "$r")" "$(body_of "$r")"
check "phone credential on C1: 403 REMOTE_ACCESS_AUTH_INVALID" test "$(code_of "$r") $(field "$(body_of "$r")" code)" = "403 REMOTE_ACCESS_AUTH_INVALID"
r="$(http -X DELETE "$base/rest/remote-access/devices/$device")"; printf 'revoke device -> %s\n' "$(code_of "$r")"
check "test phone revoked" test "$(code_of "$r")" = 200
r="$(http -H "authorization: Bearer $cred" -H 'content-type: application/json' -d '{"query":"{ __typename }"}' "$base/graphql")"
check "revoked credential no longer accepted" test "$(code_of "$r")" != 200
d logs "$N" >/dev/null 2>&1
check "the credential value appears in no container log" bash -c "! docker exec $N sh -c 'grep -rl \"$cred\" /var/log/supervisor/ /home/autobyteus/data/logs 2>/dev/null' | grep -q ."
/bin/bash "$NEW_LAUNCHER" destroy --all >/dev/null; d volume ls -q --filter "name=$N-" | xargs -r docker volume rm >/dev/null

# ---- API-22: PowerShell ----
say "API-22: PowerShell launcher (Linux pwsh 7.4 in the test daemon's network namespace)"
rm -rf "$ROOT/ps-patched"; cp -R "$WT/scripts/public/docker" "$ROOT/ps-patched"
perl -0pi -e 's/(function Get-UsedPorts \{.*?\n)  \$ports\n\}/$1  ,\$ports\n}/s' "$ROOT/ps-patched/autobyteus-docker.d/powershell/DockerRuntime.ps1"
printf 'fixture patch (temporary copy only, for new-container):\n'; diff "$WT/scripts/public/docker/autobyteus-docker.d/powershell/DockerRuntime.ps1" "$ROOT/ps-patched/autobyteus-docker.d/powershell/DockerRuntime.ps1"
pslaunch() { local dir="$1"; shift; host run --rm --network "container:$DIND" -e DOCKER_HOST=tcp://127.0.0.1:2375 \
  -e AUTOBYTEUS_DOCKER_STATE_DIR="$ROOT/state-E" -e AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR="$ROOT/state-E/shared-workspace" \
  -v "$ROOT:$ROOT" -v "$dir:/launcher:ro" "$PWSH_IMG" pwsh -NoLogo -NoProfile -File /launcher/autobyteus-docker.ps1 "$@" 2>&1 | perl -pe 's/\e\[[0-9;]*m//g' | grep -v 'Pulling\|Digest:\|Waiting\|Download\|Verifying\|Pull complete\|Already exists'; }
rm -rf "$ROOT/state-E"
say "API-22: new-container --tag beta with the PATCHED copy (fixture)"
pslaunch "$ROOT/ps-patched" new-container --tag beta | grep -E 'Started|Backend|error|ERR'
psport() { d inspect "$N" --format '{{(index (index .NetworkSettings.Ports "8000/tcp") 0).HostPort}}'; }
check "PowerShell node on :beta healthy" health "$(psport)"
check "the PowerShell node has the server-packages volume from creation" has_mount "$N-server-packages" /home/autobyteus/server-packages
cat "$ROOT/state-E/nodes/$N.json" 2>/dev/null | head -20 || ls -R "$ROOT/state-E" | head
cid="$(d inspect "$N" --format '{{.Id}}')"; hash_before="$(d inspect "$N" --format '{{ index .Config.Labels "com.autobyteus.configHash" }}')"
say "API-22: storage with the UNPATCHED launcher"
pslaunch "$WT/scripts/public/docker" storage | tee "$ROOT/ps-storage.txt" | grep -E 'storage:|server-packages'
check "PowerShell storage lists the server-packages volume" grep -q "$N-server-packages -> /home/autobyteus/server-packages" "$ROOT/ps-storage.txt"
say "API-22: upgrade --all --image $STEP2 with the UNPATCHED launcher"
pslaunch "$WT/scripts/public/docker" upgrade --all --image "$STEP2" | grep -E 'Image changed|config changed|Started|recreat|error|ERR|Keeping|Removed'
check "PowerShell upgrade recreated the node" test "$(d inspect "$N" --format '{{.Id}}')" != "$cid"
check "same config-hash-relevant ports kept (no fresh port pick)" health "$(psport)"
st="$(starter_status)"; printf 'cli.mjs status: %s\nstate.json: %s\n' "$st" "$(state_json | tr -d '\n ')"
check "starter running the built-in package; state.json in the volume" test "$(field "$st" state) $(field "$st" server.source) $(field "$(state_json)" current.source)" = "running builtIn builtIn"
check "no removed env from the PowerShell launcher" bash -c "! docker inspect $N --format '{{range .Config.Env}}{{.}} {{end}}' | grep -Eq 'AUTOBYTEUS_WORKSPACE_ROOT=|AUTOBYTEUS_SKIP_SYNC='"
cid="$(d inspect "$N" --format '{{.Id}}')"
say "API-22: plain upgrade --all with the UNPATCHED launcher"
pslaunch "$WT/scripts/public/docker" upgrade --all | grep -E 'already|recreat|Started|error|ERR'
check "PowerShell plain upgrade keeps the container" test "$(d inspect "$N" --format '{{.Id}}')" = "$cid"
say "API-22: destroy --all with the UNPATCHED launcher"
pslaunch "$WT/scripts/public/docker" destroy --all | grep -E 'Removed|kept|error|ERR' | head -3
check "container removed" bash -c "! docker inspect $N >/dev/null 2>&1"
check "PowerShell destroy kept the five volumes" test "$(d volume ls -q --filter name=$N- | sort | tr '\n' ' ')" = "$N-chromium-profile $N-data $N-root-home $N-server-packages $N-workspace "
d volume ls -q --filter "name=$N-" | xargs -r docker volume rm >/dev/null
say "API-22: the bug itself, with the UNPATCHED launcher (expected to fail until fixed)"
rm -rf "$ROOT/state-E"
pslaunch "$WT/scripts/public/docker" new-container --tag beta | grep -E 'Started|null-valued|error' | head -3
if docker inspect "$N" >/dev/null 2>&1; then echo 'BUG NOT REPRODUCED: the unpatched new-container created a container'; else echo 'BUG REPRODUCED: the unpatched new-container created no container (pre-existing Get-UsedPorts bug, FU in follow-ups.md)'; fi
say "Result"
printf 'CHECK FAILURES: %s\n' "$FAILS"
