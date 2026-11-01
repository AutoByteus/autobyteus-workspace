#!/usr/bin/env bash
# autobyteus-305 step 3 proof on real Docker nodes: test-owned containers and volumes only (labelled
# autobyteus.validation=ab305-s3), the step-3 image built from a clean clone with a test public key,
# and a local release source on the host (host.docker.internal). Usage: run-proof.sh <case>...
set -uo pipefail
IMG="autobyteus-server-305-test:step3-testkey"
OUT="/tmp/ab305/proof/out"
LABEL="autobyteus.validation=ab305-s3"
mkdir -p "$OUT"

cli() { local c="$1"; shift; docker exec "$c" node /opt/autobyteus/starter/cli.mjs "$@"; }
field() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);const v=process.argv[1].split(".").reduce((o,k)=>o==null?o:o[k],j);console.log(typeof v==="object"?JSON.stringify(v):String(v))})' "$1"; }
port_of() { docker port "$1" 8000/tcp | head -1 | cut -d: -f2; }
health() { curl -fsS -m 3 "http://127.0.0.1:$(port_of "$1")/rest/health" 2>/dev/null; }

# start <container> <packages volume or "none" or "tmpfs:<size>"> <data volume>
start() {
  local c="$1" sp="$2" data="$3" mounts=()
  case "$sp" in
    none) ;;
    tmpfs:*) docker volume create --label "$LABEL" --driver local --opt type=tmpfs --opt device=tmpfs --opt "o=size=${sp#tmpfs:}" "${c}-sp" >/dev/null; mounts+=(-v "${c}-sp:/home/autobyteus/server-packages") ;;
    *) docker volume create --label "$LABEL" "$sp" >/dev/null; mounts+=(-v "$sp:/home/autobyteus/server-packages") ;;
  esac
  docker volume create --label "$LABEL" "$data" >/dev/null
  docker run -d --name "$c" --label "$LABEL" -p 127.0.0.1::8000 ${mounts[@]+"${mounts[@]}"} -v "$data:/home/autobyteus/data" "$IMG" >/dev/null
  wait_health "$c"
}
wait_health() { for _ in $(seq 1 180); do health "$1" >/dev/null && return 0; sleep 1; done; echo "NO HEALTH: $1"; return 1; }

# result <container> <target>: waits for the update to <target> to end; prints its update state
result() {
  local c="$1" target="$2" s
  for _ in $(seq 1 600); do
    s="$(cli "$c" status 2>/dev/null)" || { sleep 1; continue; }
    if [[ "$(field update.targetVersion <<< "$s")" == "$target" && "$(field update.state <<< "$s")" =~ ^(succeeded|failed|refused)$ ]]; then
      field update <<< "$s"; return 0
    fi
    sleep 1
  done
  echo "NO RESULT for $target"
}
steps_until() { # <container> <step>: waits until the update reaches <step>
  for _ in $(seq 1 600); do [[ "$(cli "$1" status 2>/dev/null | field update.step)" == "$2" ]] && return 0; sleep 0.5; done; echo "never reached $2"
}
snapshot() { # one line: version, server pid, state.json
  local c="$1" s; s="$(cli "$c" status)"
  printf 'version=%s pid=%s source=%s state.json=%s\n' "$(field version <<< "$s")" "$(field server.pid <<< "$s")" "$(field server.source <<< "$s")" \
    "$(docker exec "$c" cat /home/autobyteus/server-packages/state.json 2>/dev/null | tr -d ' \n')"
}
# Lines naming <table> in the SQLite database and its write-ahead log (0: the table does not exist).
db_has() { docker exec "$1" sh -c "cat /home/autobyteus/data/db/production.db* 2>/dev/null | grep -a -c 'CREATE TABLE \"$2\"' || true"; }
files() { docker exec "$1" sh -c 'cd /home/autobyteus/server-packages && ls -A; ls -A packages 2>/dev/null | sed "s/^/packages\//"'; }
cleanup() { for c in "$@"; do docker rm -f -v "$c" >/dev/null 2>&1; done; docker volume ls -q --filter "label=$LABEL" | xargs -r docker volume rm >/dev/null 2>&1; }
header() { echo "# $1"; echo "# image: $IMG $(docker image inspect "$IMG" --format '{{.Id}}'); release source: AUTOBYTEUS_SERVER_PACKAGE_SOURCE in the image"; echo "# date: $(date -u +%Y-%m-%dT%H:%MZ)"; echo; }

case_happy() { # AC-001 (request through C1 is step 4; here by command), AC-002, AC-008, AC-006, migration copy, AC-012
  local c=ab305-s3-a; cleanup "$c"; header "S3-01 updates by command: plain, with a data migration, NOT_NEWER, and an image recreation (AC-002, AC-006, AC-008)"
  start "$c" ab305-s3-a-sp ab305-s3-a-data
  local id image; id="$(docker inspect --format '{{.Id}}' "$c")"; image="$(docker inspect --format '{{.Image}}' "$c")"
  echo "before: $(snapshot "$c")"; echo "container $id image $image"
  echo "\$ cli.mjs update --version 1.5.12  (exit code next)"; cli "$c" update --version 1.5.12; echo "exit=$?"
  echo "result: $(result "$c" 1.5.12)"
  echo "after: $(snapshot "$c")"
  echo "same container: $([[ "$(docker inspect --format '{{.Id}}' "$c")" == "$id" ]] && echo yes || echo NO), same image: $([[ "$(docker inspect --format '{{.Image}}' "$c")" == "$image" ]] && echo yes || echo NO)"
  echo "C1: $(curl -sS "http://127.0.0.1:$(port_of "$c")/rest/node-update?target=1.5.12")"
  echo "files: $(files "$c" | tr '\n' ' ')"
  echo; echo "## a data migration (1.5.13 adds prisma migration 20261030120000_test_305_1_5_13)"
  echo "table before: $(db_has "$c" Test305_1_5_13)"
  cli "$c" update --version 1.5.13 >/dev/null; steps_until "$c" confirming
  echo "data copy during the trial: $(docker exec "$c" sh -c 'test -d /home/autobyteus/server-packages/data-copy && echo present || echo absent')"
  echo "result: $(result "$c" 1.5.13)"
  echo "after: $(snapshot "$c")"
  echo "table after: $(db_has "$c" Test305_1_5_13); data copy after: $(docker exec "$c" sh -c 'test -d /home/autobyteus/server-packages/data-copy && echo present || echo absent')"
  echo "packages kept (current and previous): $(files "$c" | grep '^packages/' | tr '\n' ' ')"
  echo; echo "## AC-008: not newer"
  for v in 1.5.13 1.5.12; do echo "\$ update --version $v: $(cli "$c" update --version $v; echo " exit=$?")"; done
  echo "after: $(snapshot "$c")"
  echo; echo "## AC-012: no key material or credentials in the node's logs and state"
  docker exec "$c" sh -c 'cat /var/log/supervisor/autobyteus_server*.log /home/autobyteus/server-packages/*.json' > "$OUT/s3-01-logs.txt"
  echo "log and state bytes scanned: $(wc -c < "$OUT/s3-01-logs.txt")"
  echo "PRIVATE KEY: $(grep -c 'PRIVATE KEY' "$OUT/s3-01-logs.txt"); test key body lines: $(grep -c -F -f <(sed '1d;$d' /tmp/ab305/proof/keys/test.key) "$OUT/s3-01-logs.txt")"
  echo "starter log lines:"; docker exec "$c" grep -h '"starter"' /var/log/supervisor/autobyteus_server.log | grep -E 'update|self-check' | head -20
  echo; echo "## AC-006: the container is recreated from the same image (built-in 1.5.11-beta.5 is older than the installed 1.5.13)"
  docker rm -f "$c" >/dev/null
  docker run -d --name "$c" --label "$LABEL" -p 127.0.0.1::8000 -v ab305-s3-a-sp:/home/autobyteus/server-packages -v ab305-s3-a-data:/home/autobyteus/data "$IMG" >/dev/null
  wait_health "$c"; echo "after recreation: $(snapshot "$c")"
  cleanup "$c"
}

case_refusals() { # AC-003, AC-005, AC-013, SELF_CHECK not here; FAILED_AFTER_SWITCH (exit at start)
  local c=ab305-s3-b; cleanup "$c"; header "S3-02 refusals and failures before anything changes, and a trial that exits at start (AC-003, AC-004, AC-005, AC-013)"
  start "$c" ab305-s3-b-sp ab305-s3-b-data
  local before; before="$(snapshot "$c")"; echo "before: $before"
  for v in 1.5.15 1.5.16 1.5.17 1.5.18 1.5.19; do
    cli "$c" update --version "$v" >/dev/null
    echo "$v: $(result "$c" "$v" | node -pe 'const u=JSON.parse(require("fs").readFileSync(0));`${u.state} ${u.code}: ${u.message}`')"
    echo "   node: $(snapshot "$c") $([[ "$(snapshot "$c")" == "$before" ]] && echo '(unchanged)' || echo '(CHANGED)')"
    echo "   files: $(files "$c" | tr '\n' ' ')"
  done
  echo; echo "## 1.5.20 exits at start under the starter (passes its self-check, which has no starter socket)"
  cli "$c" update --version 1.5.20 >/dev/null
  echo "1.5.20: $(result "$c" 1.5.20 | node -pe 'const u=JSON.parse(require("fs").readFileSync(0));`${u.state} ${u.code}: ${u.message}`')"
  wait_health "$c"; echo "after: $(snapshot "$c") health: $(health "$c")"
  echo "files: $(files "$c" | tr '\n' ' ')"
  cleanup "$c"
}

case_rollback() { # AC-004 with a data migration; container stops during copy, trial and restore
  local c=ab305-s3-c; cleanup "$c"; header "S3-03 a version that migrates the data then fails, and container stops during the copy, the trial and the restore"
  start "$c" ab305-s3-c-sp ab305-s3-c-data
  echo "## AC-004: 1.5.14 migrates (table Test305_1_5_14), then exits 30 s after its start"
  cli "$c" update --version 1.5.14 >/dev/null; steps_until "$c" confirming; sleep 20
  echo "table during the trial: $(db_has "$c" Test305_1_5_14)"
  echo "result: $(result "$c" 1.5.14)"
  wait_health "$c"; echo "after: $(snapshot "$c"); table after rollback: $(db_has "$c" Test305_1_5_14); files: $(files "$c" | tr '\n' ' ')"

  echo; echo "## a container stop during the trial (1.5.14 running, its migration applied)"
  cli "$c" update --version 1.5.14 >/dev/null; steps_until "$c" confirming; sleep 15
  echo "before stop: table $(db_has "$c" Test305_1_5_14); state.json $(docker exec "$c" cat /home/autobyteus/server-packages/state.json | tr -d ' \n')"
  docker stop "$c" >/dev/null; docker start "$c" >/dev/null; wait_health "$c"
  echo "after restart: $(snapshot "$c"); update: $(cli "$c" status | field update)"
  echo "table: $(db_has "$c" Test305_1_5_14); files: $(files "$c" | tr '\n' ' ')"

  echo; echo "## a container stop during the data copy (a 1.5 GB file in the data folder makes the copy take seconds)"
  docker exec "$c" sh -c 'head -c 1500000000 /dev/zero > /home/autobyteus/data/large-test-file'
  cli "$c" update --version 1.5.14 >/dev/null; steps_until "$c" restarting
  for _ in $(seq 1 200); do docker exec "$c" test -d /home/autobyteus/server-packages/data-copy.partial && break; sleep 0.1; done
  echo "before stop: $(docker exec "$c" sh -c 'ls -d /home/autobyteus/server-packages/data-copy* ; du -sh /home/autobyteus/server-packages/data-copy.partial') state.json $(docker exec "$c" cat /home/autobyteus/server-packages/state.json | tr -d ' \n')"
  docker stop "$c" >/dev/null; docker start "$c" >/dev/null; wait_health "$c"
  echo "after restart: $(snapshot "$c"); update: $(cli "$c" status | field update)"
  echo "files: $(files "$c" | tr '\n' ' ')"

  echo; echo "## the container is killed (power loss) when the rollback of 1.5.14 starts its restore (the 1.5 GB file makes it take a while)"
  cli "$c" update --version 1.5.14 >/dev/null; steps_until "$c" rollingBack
  docker kill "$c" >/dev/null
  echo "state.json at the kill: $(docker run --rm -v ab305-s3-c-sp:/sp --entrypoint cat "$IMG" /sp/state.json | tr -d ' \n')"
  echo "data folder at the kill: $(docker run --rm -v ab305-s3-c-data:/d --entrypoint sh "$IMG" -c 'ls /d | tr "\n" " "')"
  docker start "$c" >/dev/null; wait_health "$c"
  echo "after restart: $(snapshot "$c"); update: $(cli "$c" status | field update)"
  echo "table: $(db_has "$c" Test305_1_5_14); large file intact: $(docker exec "$c" sh -c 'stat -c %s /home/autobyteus/data/large-test-file'); files: $(files "$c" | tr '\n' ' ')"
  cleanup "$c"
}

case_volume() { # NOT_ENOUGH_SPACE before the stop; NO_PACKAGES_VOLUME; tracks
  local c=ab305-s3-d; cleanup "$c"; header "S3-04 NOT_ENOUGH_SPACE before the stop, NO_PACKAGES_VOLUME, and the stable and beta tracks"
  echo "## a 900 MB server-packages volume: the package needs its archive, its unpacked size and 512 MB"
  start "$c" tmpfs:900m ab305-s3-d-data
  local before; before="$(snapshot "$c")"; echo "before: $before"
  cli "$c" update --version 1.5.12 >/dev/null
  echo "result: $(result "$c" 1.5.12)"
  echo "after: $(snapshot "$c") $([[ "$(snapshot "$c")" == "$before" ]] && echo '(unchanged)' || echo '(CHANGED)')"
  cleanup "$c"
  echo; echo "## a 1.9 GB server-packages volume: room for the package, not for the package and a data copy (1.5.13 brings a migration)"
  start "$c" tmpfs:1900m ab305-s3-d-data
  before="$(snapshot "$c")"; echo "before: $before"
  cli "$c" update --version 1.5.13 >/dev/null
  echo "result: $(result "$c" 1.5.13)"
  echo "after: $(snapshot "$c") $([[ "$(snapshot "$c")" == "$before" ]] && echo '(unchanged)' || echo '(CHANGED)')"
  cleanup "$c"
  echo; echo "## no server-packages volume"
  start "$c" none ab305-s3-d-data
  echo "status: $(cli "$c" status)"
  echo "\$ update --version 1.5.12: $(cli "$c" update --version 1.5.12; echo " exit=$?")"
  echo "C1: $(curl -sS "http://127.0.0.1:$(port_of "$c")/rest/node-update")"
  cleanup "$c"
  echo; echo "## tracks (the source's latest redirect names 1.5.12; its feed lists 1.5.13, 1.5.12, 1.5.11-beta.5)"
  start "$c" ab305-s3-d-sp ab305-s3-d-data
  echo "\$ update --track stable: $(cli "$c" update --track stable)"; result "$c" 1.5.12 >/dev/null
  echo "\$ update --track beta: $(cli "$c" update --track beta)"; echo "result: $(result "$c" 1.5.13 | field state)"
  cleanup "$c"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  for name in "$@"; do "case_$name" 2>&1 | tee "$OUT/$name.log"; done
fi
