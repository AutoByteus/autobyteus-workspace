#!/usr/bin/env bash
# API-31/32/33/36 (autobyteus-305 step 3): the real launchers' `update` and `status` against real
# starters, on a test-owned Docker daemon (docker:dind), never the host's autobyteus-server-0/1/2.
# The test daemon mirrors docker.io to its own registry (127.0.0.1:5000), which serves the step-3
# test-key image as autobyteus/autobyteus-server:{beta,latest,1.5.11-beta.5} (O-7). A local release
# source in the test daemon serves packages signed with a throwaway key (O-8, O-9).
#   phase 1 (API-31)  step-2 node -> upgrade -> update by track; update --all over four tracks; status;
#                     stopped and pre-starter nodes; new :beta images after the in-place update (AC-006)
#   phase 2 (API-32)  rollback (1.5.14), no retry, restart, a second update; refusals through the launcher
#   phase 3 (API-33)  a node of the step-1 (v6) launcher: NO_PACKAGES_VOLUME, then upgrade --all
#   phase 4 (API-36)  PowerShell status and update
# Usage: api3x-launcher-update.sh <worktree> <evidence-file> <test root>
set -uo pipefail
WT="$1"; OUT="$2"; R="$3"
DIND=ab305-api-dind; DIND_VOL=ab305-api-dind-lib
REG=127.0.0.1:5000; IMG=autobyteus/autobyteus-server
L_NEW="$WT/scripts/public/docker/autobyteus-docker.sh"; L_S2="$R/launcher-s2/autobyteus-docker.sh"; L_S1="$R/launcher-s1/autobyteus-docker.sh"
PWSH_IMG=ab305-api-pwsh-docker; FAILS=0
exec > >(tee -a "$OUT") 2>&1
say() { printf '\n## %s\n' "$*"; }
check() { local d="$1"; shift; if "$@"; then printf 'CHECK PASS: %s\n' "$d"; else printf 'CHECK FAIL: %s\n' "$d"; FAILS=$((FAILS + 1)); fi; }
host() { env -u DOCKER_HOST docker "$@"; }
d() { docker "$@"; }
in_dind() { host exec "$DIND" "$@"; }
field() { printf '%s' "$1" | node -e 'let t="";process.stdin.on("data",c=>t+=c).on("end",()=>{let v;try{v=process.argv[1].split(".").reduce((o,k)=>o==null?o:o[k],JSON.parse(t))}catch{v="(not json)"};console.log(v===undefined||v===null?"-":typeof v==="object"?JSON.stringify(v):v)})' "$2"; }
port_of() { sed -n 's/^BACKEND_PORT=//p' "$AUTOBYTEUS_DOCKER_STATE_DIR/nodes/$1.env"; }
health() { local ok=0 body=""; for _ in $(seq 1 300); do body="$(in_dind curl -s -m 3 "http://127.0.0.1:$1/rest/health" || true)"
  if printf '%s' "$body" | grep -q '"status":"ok"'; then ok=$((ok + 1)); [[ $ok -ge 3 ]] && return 0; else ok=0; fi; sleep 1; done; echo "health $1 never ok: $body"; return 1; }
st() { d exec "$1" node /opt/autobyteus/starter/cli.mjs status 2>/dev/null; }
sv() { field "$(st "$1")" "$2"; }
state_json() { d exec "$1" cat /home/autobyteus/server-packages/state.json 2>/dev/null | tr -d ' \n'; }
db_has() { d exec "$1" sh -c "cat /home/autobyteus/data/db/production.db* 2>/dev/null | grep -a -c 'CREATE TABLE \"$2\"' || true"; }
gql() { in_dind curl -s -m 15 -H 'content-type: application/json' -d "$2" "http://127.0.0.1:$1/graphql"; }
seed() { local created; created="$(gql "$(port_of "$1")" "{\"query\":\"mutation(\$input:CreateAgentDefinitionInput!){createAgentDefinition(input:\$input){id name}}\",\"variables\":{\"input\":{\"name\":\"ab305-api3x-$2\",\"role\":\"API-3x fixture\",\"description\":\"written before the update\",\"instructions\":\"Do not run\",\"category\":\"api-e2e\"}}}")"
  printf 'seeded on %s: %s\n' "$1" "$created"; printf -v "SEED_$(printf '%s' "$2" | tr -c 'a-zA-Z0-9' '_')" '%s' "$(printf '%s' "$created" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"; }
read_back() { local var="SEED_$(printf '%s' "$2" | tr -c 'a-zA-Z0-9' '_')" r; r="$(gql "$(port_of "$1")" "{\"query\":\"query(\$id:String!){agentDefinition(id:\$id){id name}}\",\"variables\":{\"id\":\"${!var}\"}}")"
  printf 'read back on %s: %s\n' "$1" "$r"; printf '%s' "$r" | grep -q "\"name\":\"ab305-api3x-$2\""; }
cid() { d inspect "$1" --format '{{.Id}}'; }
iid() { d inspect "$1" --format '{{.Image}}'; }
spid() { d exec "$1" supervisorctl pid autobyteus_server; }
run_l() { local launcher="$1"; shift; printf '$ autobyteus-docker %s\n' "$*"; /bin/bash "$launcher" "$@" 2>&1 | tee "$R/last.txt"; return "${PIPESTATUS[0]}"; }
destroy_all() { /bin/bash "$L_NEW" destroy --all >/dev/null 2>&1; d volume ls -q --filter name=autobyteus-server- | xargs -r docker volume rm >/dev/null; }

printf '# API-31/32/33/36 step-3 launcher update journeys on a test-owned Docker daemon\n# Command: %s %s %s %s\n# Commit: %s; Date: %s\n' "$0" "$WT" "$OUT" "$R" "$(git -C "$WT" rev-parse --short HEAD)" "$(date -u +%FT%TZ)"
printf '# Environment: macOS %s arm64, host Docker %s; launchers run by macOS /bin/bash %s\n' "$(sw_vers -productVersion)" "$(host version --format '{{.Server.Version}}')" "$(/bin/bash -c 'echo $BASH_VERSION')"

say "Setup: launchers"
for pair in "launcher-s2 origin/personal" "launcher-s1 77fb8bf2d1"; do set -- $pair
  mkdir -p "$R/$1/autobyteus-docker.d/bash"; git -C "$WT" show "$2:scripts/public/docker/autobyteus-docker.sh" > "$R/$1/autobyteus-docker.sh"
  for m in $(git -C "$WT" ls-tree --name-only "$2" scripts/public/docker/autobyteus-docker.d/bash/); do git -C "$WT" show "$2:$m" > "$R/$1/autobyteus-docker.d/bash/$(basename "$m")"; done
  printf '%s from %s (%s): %s\n' "$1" "$2" "$(git -C "$WT" rev-parse --short "$2")" "$(grep -h '^CONFIG_HASH_VERSION' "$R/$1/autobyteus-docker.d/bash/core.sh")"
done
printf 'new launcher: %s\n' "$(grep -h '^CONFIG_HASH_VERSION' "$WT/scripts/public/docker/autobyteus-docker.d/bash/core.sh")"

say "Setup: test daemon with a docker.io mirror at its own registry"
host run -d --privileged --name "$DIND" --label autobyteus.ab305-api=1 -e DOCKER_TLS_CERTDIR= -v "$DIND_VOL:/var/lib/docker" -v "$R:$R" -p 127.0.0.1::2375 docker:dind \
  dockerd --host=tcp://0.0.0.0:2375 --host=unix:///var/run/docker.sock --tls=false --registry-mirror=http://$REG --insecure-registry=$REG >/dev/null
export DOCKER_HOST="tcp://127.0.0.1:$(host port "$DIND" 2375/tcp | head -1 | sed 's/.*://')"; unset DOCKER_CONTEXT
for _ in $(seq 1 60); do d info >/dev/null 2>&1 && break; sleep 1; done
check "the test daemon is not the host daemon" test "$(d info --format '{{.Name}}')" != "$(host info --format '{{.Name}}')"
check "no launcher-managed container on the test daemon" test -z "$(d ps -a --filter label=com.autobyteus.launcher=server-docker -q)"
d info --format 'mirrors: {{json .RegistryConfig.Mirrors}}'
in_dind apk add -q --no-cache curl >/dev/null
d run -d --name ab305-registry -p 127.0.0.1:5000:5000 registry:2 >/dev/null

say "Setup: images"
for pair in "autobyteus-server-305-test:step1 $REG/ab305/step1" "autobyteus-server-305-test:step2 $REG/ab305/step2" "autobyteus-server-305-test:step3 $REG/ab305/step3"; do
  set -- $pair; host save "$1" | d load -q >/dev/null; d tag "$1" "$2"; d push -q "$2" >/dev/null; d image rm "$1" >/dev/null; done
GW="$(d network inspect bridge --format '{{(index .IPAM.Config 0).Gateway}}')"; SOURCE="http://$GW:18080/releases"
d run -d --name ab305-source -p 18080:18080 -v "$R/proof/source:/s:ro" -v "$R/IMP3-proof-release-source.mjs:/r.mjs:ro" --entrypoint node "$REG/ab305/step3" /r.mjs /s 18080 1.5.12 1.5.13,1.5.12 >/dev/null
mkdir -p "$R/ctx"; cp "$R/keys/test.pub" "$R/ctx/test.pub"
printf 'FROM %s/ab305/step3\nCOPY test.pub /opt/autobyteus/starter/server-package-signing-key.pem\nENV AUTOBYTEUS_SERVER_PACKAGE_SOURCE=%s\n' "$REG" "$SOURCE" > "$R/ctx/Dockerfile.T"
printf 'FROM %s/autobyteus/autobyteus-server:beta\nLABEL ab305.variant=b\n' "$REG" > "$R/ctx/Dockerfile.B"
printf 'FROM %s/autobyteus/autobyteus-server:beta\nRUN node -e "const f=\x27/opt/autobyteus/server-package/server-package.json\x27;const j=require(f);j.version=\x271.5.21\x27;require(\x27fs\x27).writeFileSync(f,JSON.stringify(j,null,2)+\x27\\n\x27)"\n' "$REG" > "$R/ctx/Dockerfile.C"
cat "$R/ctx/Dockerfile.T"
d build -q -t "$REG/$IMG:beta" -f "$R/ctx/Dockerfile.T" "$R/ctx" >/dev/null
for t in latest 1.5.11-beta.5; do d tag "$REG/$IMG:beta" "$REG/$IMG:$t"; done; d tag "$REG/$IMG:beta" "$REG/ab305/custom:s3"
for t in "$IMG:beta" "$IMG:latest" "$IMG:1.5.11-beta.5" ab305/custom:s3; do d push -q "$REG/$t" >/dev/null; done
d build -q -t "$REG/ab305/beta-b" -f "$R/ctx/Dockerfile.B" "$R/ctx" >/dev/null; d build -q -t "$REG/ab305/beta-c" -f "$R/ctx/Dockerfile.C" "$R/ctx" >/dev/null
TEST_IMAGE_ID="$(d image inspect "$REG/$IMG:beta" --format '{{.Id}}')"
printf 'test image %s; release source %s\n' "$TEST_IMAGE_ID" "$SOURCE"
d run --rm --entrypoint node "$REG/$IMG:beta" -e "fetch(process.env.AUTOBYTEUS_SERVER_PACKAGE_SOURCE+'/latest',{redirect:'manual'}).then(r=>console.log('from a container: /latest',r.status,r.headers.get('location')))"
d pull -q "$IMG:beta" >/dev/null; check "docker pull of $IMG:beta resolves to the test image through the mirror" test "$(d image inspect "$IMG:beta" --format '{{.Id}}')" = "$TEST_IMAGE_ID"
d image rm "$IMG:beta" >/dev/null

# ===================== phase 1: API-31 =====================
export AUTOBYTEUS_DOCKER_STATE_DIR="$R/state-1"
N0=autobyteus-server-0; N1=autobyteus-server-1; N2=autobyteus-server-2; N3=autobyteus-server-3; N4=autobyteus-server-4
say "API-31: the step-2 launcher creates a node on the step-2 image (with its volume)"
run_l "$L_S2" new-container --image "$REG/ab305/step2" | grep -E 'Started|Backend'
check "step-2 node healthy" health "$(port_of $N0)"
seed $N0 p1
check "step-2 node has its server-packages volume" bash -c "docker inspect $N0 --format '{{range .Mounts}}{{.Name}} {{end}}' | grep -q $N0-server-packages"
say "API-31: new launcher upgrade --all --tag beta (the step-3 image)"
run_l "$L_NEW" upgrade --all --tag beta | grep -E 'Image changed|config changed|Started|Keeping|Removed'
check "node 0 now runs the step-3 test image" test "$(iid $N0)" = "$TEST_IMAGE_ID"
check "node 0 healthy after the upgrade" health "$(port_of $N0)"
check "node 0 status running 1.5.11-beta.5" test "$(sv $N0 state) $(sv $N0 version)" = "running 1.5.11-beta.5"; check "node 0 data kept after the upgrade" read_back $N0 p1
run_l "$L_NEW" status
check "status line for node 0 shows the starter's version" grep -q 'server: 1.5.11-beta.5' "$R/last.txt"
C0="$(cid $N0)"; I0="$(iid $N0)"
say "API-31: update --name $N0 (no version: beta track -> newest in the feed)"
run_l "$L_NEW" update --name $N0; rc=$?
check "update exit 0" test "$rc" = 0
check "launcher printed the steps and the result" bash -c "grep -q 'updating to 1.5.13' '$R/last.txt' && grep -q 'downloading\|checking' '$R/last.txt' && grep -q 'restarting' '$R/last.txt'"
check "same container and same image after the update" test "$(cid $N0) $(iid $N0)" = "$C0 $I0"
check "node 0 runs 1.5.13, installed" test "$(sv $N0 version) $(sv $N0 server.source) $(sv $N0 update.state)" = "1.5.13 installed succeeded"
check "the 1.5.13 migration ran (table present)" test "$(db_has $N0 Test305_1_5_13)" -ge 1
check "data written by 1.5.11-beta.5 kept" read_back $N0 p1
check "no data copy left after the commit" bash -c "! docker exec $N0 test -e /home/autobyteus/server-packages/data-copy"
r="$(in_dind curl -s "http://127.0.0.1:$(port_of $N0)/rest/node-update?target=1.5.13")"; printf 'C1: %s\n' "$r"
check "C1 reports 1.5.13 (relation same)" test "$(field "$r" version) $(field "$r" target.relation)" = "1.5.13 same"
printf 'state.json: %s\n' "$(state_json $N0)"

say "API-31: more nodes: latest, pinned 1.5.11-beta.5, a custom image"
run_l "$L_NEW" new-container | grep -E 'Started|Backend'
run_l "$L_NEW" new-container --tag 1.5.11-beta.5 | grep -E 'Started|Backend'
run_l "$L_NEW" new-container --image "$REG/ab305/custom:s3" | grep -E 'Started|Backend'
for n in $N1 $N2 $N3; do health "$(port_of $n)" || echo "health failed for $n"; done
say "API-31: update --all (no version)"
run_l "$L_NEW" update --all; rc=$?
check "update --all exits non-zero (some nodes refused)" test "$rc" != 0
check "node 0 (beta, 1.5.13): refused NOT_NEWER" grep -q "$N0: refused (NOT_NEWER)" "$R/last.txt"
check "node 1 (latest): stable track -> 1.5.12" grep -q "$N1: updating to 1.5.12" "$R/last.txt"
check "node 1 runs 1.5.12 installed" test "$(sv $N1 version) $(sv $N1 server.source)" = "1.5.12 installed"
check "node 2 (pinned): 'pinned to 1.5.11-beta.5; pass --version'" grep -q "$N2: This node is pinned to 1.5.11-beta.5; pass --version." "$R/last.txt"
check "node 3 (custom image): 'custom image …; pass --version'" grep -q "$N3: This node uses a custom image ($REG/ab305/custom:s3); pass --version." "$R/last.txt"
say "API-31: update --all --version 1.5.12"
run_l "$L_NEW" update --all --version 1.5.12; rc=$?
check "nodes 0 and 1 refused NOT_NEWER" bash -c "grep -q '$N0: refused (NOT_NEWER)' '$R/last.txt' && grep -q '$N1: refused (NOT_NEWER)' '$R/last.txt'"
check "nodes 2 and 3 updated to 1.5.12" test "$(sv $N2 version) $(sv $N3 version)" = "1.5.12 1.5.12"
say "API-31: status for running, stopped and pre-starter nodes"
d stop $N3 >/dev/null
run_l "$L_NEW" new-container --image "$REG/ab305/step1" | grep -E 'Started|Backend'; health "$(port_of $N4)"
run_l "$L_NEW" status
check "status: node 0 server 1.5.13" grep -q 'server: 1.5.13' "$R/last.txt"
check "status: stopped node 3 'not available (container exited)'" grep -q 'server: not available (container exited)' "$R/last.txt"
check "status: pre-starter node 4 'not available (no starter answer…)'" grep -q 'server: not available (no starter answer; images before the starter have none)' "$R/last.txt"
run_l "$L_NEW" update --name $N3 --version 1.5.13
check "update of the stopped node: 'the container is not running; start it first.'" grep -q "$N3: the container is not running; start it first." "$R/last.txt"
run_l "$L_NEW" update --name $N4 --version 1.5.13
check "update of the pre-starter node: names upgrade --all" grep -q "$N4: the node's starter did not answer.*run: autobyteus-docker upgrade --all" "$R/last.txt"
say "API-31 (AC-006): a new :beta image with an older built-in package (1.5.11-beta.5, another image ID)"
d tag "$REG/ab305/beta-b" "$REG/$IMG:beta"; d push -q "$REG/$IMG:beta" >/dev/null
d rm -f $N4 >/dev/null; rm -f "$R/state-1/nodes/$N4.env"; d start $N3 >/dev/null
run_l "$L_NEW" upgrade --all | grep -E 'Image changed|already|Started|config changed'
check "node 0 recreated on the new :beta image" test "$(cid $N0)" != "$C0"
health "$(port_of $N0)"
check "node 0 keeps the installed 1.5.13 (built-in 1.5.11-beta.5 is older)" test "$(sv $N0 version) $(sv $N0 server.source)" = "1.5.13 installed"
check "node 0 data kept" read_back $N0 p1
say "API-31 (AC-006): a new :beta image with a newer built-in package (labelled 1.5.21)"
d tag "$REG/ab305/beta-c" "$REG/$IMG:beta"; d push -q "$REG/$IMG:beta" >/dev/null
run_l "$L_NEW" upgrade --all | grep -E 'Image changed|already|Started'
health "$(port_of $N0)"
check "node 0 runs the image's 1.5.21 (built-in)" test "$(sv $N0 version) $(sv $N0 server.source)" = "1.5.21 builtIn"
printf 'state.json: %s\n' "$(state_json $N0)"
d tag "$REG/$IMG:latest" "$REG/$IMG:beta"; d push -q "$REG/$IMG:beta" >/dev/null   # :beta back to the plain test image
destroy_all

# ===================== phase 2: API-32 =====================
export AUTOBYTEUS_DOCKER_STATE_DIR="$R/state-2"
say "API-32: a fresh node on beta"
run_l "$L_NEW" new-container --tag beta | grep -E 'Started|Backend'; health "$(port_of $N0)"; seed $N0 p2
P0="$(spid $N0)"; S0="$(state_json $N0)"; C0="$(cid $N0)"
say "API-32: update --version 1.5.14 (migrates, then exits 30 s after its start)"
run_l "$L_NEW" update --name $N0 --version 1.5.14; rc=$?
check "the launcher reports the failure and exits non-zero" bash -c "test $rc != 0 && grep -q '$N0: failed (FAILED_AFTER_SWITCH)' '$R/last.txt'"
health "$(port_of $N0)"
check "the old version runs again, same container" test "$(sv $N0 version) $(sv $N0 server.source) $(cid $N0)" = "1.5.11-beta.5 builtIn $C0"
check "the 1.5.14 migration is gone (data restored)" test "$(db_has $N0 Test305_1_5_14)" = 0
check "data kept" read_back $N0 p2
check "no data copy or 1.5.14 package left" bash -c "! docker exec $N0 sh -c 'test -e /home/autobyteus/server-packages/data-copy || test -e /home/autobyteus/server-packages/packages/1.5.14'"
U1="$(field "$(st $N0)" update)"; printf 'update after the rollback: %s\n' "$U1"
say "API-32: the failed version is not retried by itself (90 s, then a container restart)"
sleep 90
check "90 s later: same update record, still 1.5.11-beta.5" test "$(field "$(st $N0)" update) $(sv $N0 version)" = "$U1 1.5.11-beta.5"
d restart $N0 >/dev/null; health "$(port_of $N0)"
check "after a restart: still 1.5.11-beta.5, the update record unchanged" test "$(field "$(st $N0)" update) $(sv $N0 version)" = "$U1 1.5.11-beta.5"
check "the starter log has exactly one update request for 1.5.14" test "$(d exec $N0 sh -c 'grep -c "update-requested.*1.5.14" /var/log/supervisor/autobyteus_server.log' )" = 1
d exec $N0 sh -c 'grep -E "update-requested|update-failed|rolled|trial" /var/log/supervisor/autobyteus_server.log | cut -c1-220'
say "API-32: a second update after the rollback (1.5.12)"
run_l "$L_NEW" update --name $N0 --version 1.5.12; rc=$?
check "second update succeeded" test "$rc $(sv $N0 version) $(sv $N0 server.source)" = "0 1.5.12 installed"
check "data kept" read_back $N0 p2
say "API-32: refusals through the launcher; each leaves the server and state.json as they were"
P0="$(spid $N0)"; S0="$(state_json $N0)"
for v in 1.5.12 latest 1.5.15 1.5.16 1.5.17 1.5.18 1.5.19; do
  run_l "$L_NEW" update --name $N0 --version "$v"; rc=$?
  line="$(grep "$N0:" "$R/last.txt" | tail -1)"
  printf 'RESULT %s -> exit %s: %s\n' "$v" "$rc" "$line"
  check "update $v: refused or failed with exit 1, the same starter pid, state.json unchanged, still 1.5.12" test "$rc $(spid $N0) $(state_json $N0) $(sv $N0 version)" = "1 $P0 $S0 1.5.12"
done
check "1.5.12 again: NOT_NEWER" grep -q 'RESULT 1.5.12 -> exit 1: .*(NOT_NEWER)' "$OUT"
check "latest: INVALID_VERSION" grep -q 'RESULT latest -> exit 1: .*(INVALID_VERSION)' "$OUT"
check "1.5.15: NEEDS_NEW_IMAGE with the launcher command" grep -q 'RESULT 1.5.15 -> exit 1: .*(NEEDS_NEW_IMAGE).*autobyteus-docker upgrade --all --tag' "$OUT"
check "1.5.16: ARCHIVE_MISMATCH" grep -q 'RESULT 1.5.16 -> exit 1: .*(ARCHIVE_MISMATCH)' "$OUT"
check "1.5.17: DESCRIPTION_MISMATCH" grep -q 'RESULT 1.5.17 -> exit 1: .*(DESCRIPTION_MISMATCH)' "$OUT"
check "1.5.18: SIGNATURE_INVALID" grep -q 'RESULT 1.5.18 -> exit 1: .*(SIGNATURE_INVALID)' "$OUT"
check "1.5.19: NO_PACKAGE_FOR_VERSION" grep -q 'RESULT 1.5.19 -> exit 1: .*(NO_PACKAGE_FOR_VERSION)' "$OUT"
say "API-32 (AC-012): no secrets in the node's logs and starter state"
d exec $N0 sh -c 'cat /var/log/supervisor/*.log /home/autobyteus/server-packages/*.json' > "$R/node-logs.txt" 2>/dev/null
printf 'scanned %s bytes of node logs and starter state\n' "$(wc -c < "$R/node-logs.txt" | tr -d ' ')"
check "no 'PRIVATE KEY' and no line of the test private key in the node's logs" bash -c "! grep -q 'PRIVATE KEY' '$R/node-logs.txt' && ! grep -F -f <(sed -n '2,\$p' '$R/keys/test.key' | grep -v '^-----') '$R/node-logs.txt' >/dev/null"
destroy_all

# ===================== phase 3: API-33 =====================
export AUTOBYTEUS_DOCKER_STATE_DIR="$R/state-3"
say "API-33: the step-1 (v6) launcher creates a node on beta (no server-packages volume)"
run_l "$L_S1" new-container --tag beta | grep -E 'Started|Backend'; health "$(port_of $N0)"
run_l "$L_NEW" status
check "status names the blocker" grep -q 'in-place update unavailable: ' "$R/last.txt"
run_l "$L_NEW" update --name $N0 --version 1.5.12
check "update refused NO_PACKAGES_VOLUME" grep -q "$N0: refused (NO_PACKAGES_VOLUME)" "$R/last.txt"
run_l "$L_NEW" upgrade --all | grep -E 'config changed|Image changed|Started'
health "$(port_of $N0)"
run_l "$L_NEW" status
check "after upgrade --all: no blocker in status, server-packages volume mounted" bash -c "! grep -q 'in-place update unavailable' '$R/last.txt' && docker inspect $N0 --format '{{range .Mounts}}{{.Name}} {{end}}' | grep -q $N0-server-packages"
destroy_all

# ===================== phase 4: API-36 (PowerShell) =====================
say "API-36: PowerShell launcher (Linux pwsh in the test daemon's network namespace)"
host build -q -t "$PWSH_IMG" - >/dev/null <<'EOF'
FROM docker:cli AS cli
FROM mcr.microsoft.com/dotnet/sdk:8.0
COPY --from=cli /usr/local/bin/docker /usr/local/bin/docker
EOF
rm -rf "$R/ps-patched"; cp -R "$WT/scripts/public/docker" "$R/ps-patched"
perl -0pi -e 's/(function Get-UsedPorts \{.*?\n)  \$ports\n\}/$1  ,\$ports\n}/s' "$R/ps-patched/autobyteus-docker.d/powershell/DockerRuntime.ps1"
export AUTOBYTEUS_DOCKER_STATE_DIR="$R/state-4"
psl() { local dir="$1"; shift; printf '$ pwsh autobyteus-docker.ps1 %s\n' "$*"; host run --rm --network "container:$DIND" -e DOCKER_HOST=tcp://127.0.0.1:2375 \
  -e AUTOBYTEUS_DOCKER_STATE_DIR="$R/state-4" -e AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR="$R/state-4/shared-workspace" \
  -v "$R:$R" -v "$dir:/launcher:ro" "$PWSH_IMG" pwsh -NoLogo -NoProfile -File /launcher/autobyteus-docker.ps1 "$@" 2>&1 | perl -pe 's/\e\[[0-9;]*m//g' | grep -v 'Pulling\|Digest:\|Waiting\|Download\|Verifying\|Pull complete\|Already exists' | tee "$R/last.txt"; return "${PIPESTATUS[0]}"; }
psl "$R/ps-patched" new-container --tag beta | grep -E 'Started|Backend|error'
PSP="$(d inspect $N0 --format '{{(index (index .NetworkSettings.Ports "8000/tcp") 0).HostPort}}')"; health "$PSP"
psl "$WT/scripts/public/docker" status
check "PowerShell status shows the starter's version" grep -q 'server: 1.5.11-beta.5' "$R/last.txt"
C0="$(cid $N0)"
psl "$WT/scripts/public/docker" update --name $N0; rc=$?
check "PowerShell update (beta track) exit 0" test "$rc" = 0
check "PowerShell update printed the target and steps" bash -c "grep -q 'updating to 1.5.13' '$R/last.txt' && grep -q 'restarting' '$R/last.txt'"
check "the node runs 1.5.13 installed, same container" test "$(sv $N0 version) $(sv $N0 server.source) $(cid $N0)" = "1.5.13 installed $C0"
psl "$WT/scripts/public/docker" status
check "PowerShell status shows 1.5.13" grep -q 'server: 1.5.13' "$R/last.txt"
psl "$WT/scripts/public/docker" update --name $N0 --version 1.5.12; rc=$?
check "PowerShell: 1.5.12 refused NOT_NEWER, exit non-zero" bash -c "test $rc != 0 && grep -q 'NOT_NEWER' '$R/last.txt'"
d stop $N0 >/dev/null
psl "$WT/scripts/public/docker" status
check "PowerShell status of a stopped container: not available" grep -q 'server: not available (container exited)' "$R/last.txt"
psl "$WT/scripts/public/docker" update --name $N0 --version 1.5.13
check "PowerShell update of a stopped container: not running" grep -qi 'not running' "$R/last.txt"
psl "$WT/scripts/public/docker" destroy --all >/dev/null
d volume ls -q --filter name=autobyteus-server- | xargs -r docker volume rm >/dev/null
host image rm "$PWSH_IMG" mcr.microsoft.com/dotnet/sdk:8.0 docker:cli >/dev/null 2>&1

say "Result"
printf 'CHECK FAILURES: %s\n' "$FAILS"
