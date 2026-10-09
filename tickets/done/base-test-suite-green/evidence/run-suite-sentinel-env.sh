#!/usr/bin/env bash
# AC-002/AC-004: runs a server vitest target with the agent shell's inherited variables,
# except that every data/memory/database/package-root variable is re-pointed at a disposable
# sentinel folder with seeded marker files. Afterwards the sentinel must be byte-identical.
# Never points at the real ~/.autobyteus: the run is refused if any variable still does.
# Usage: run-suite-sentinel-env.sh <label> <vitest target...>
set -u
EVID="$(cd "$(dirname "$0")" && pwd)"
SERVER="$EVID/../../../../autobyteus-server-ts"
LABEL="$1"; shift
SENTINEL="$(mktemp -d /tmp/base-green-sentinel-XXXXXX)"
for d in server-data/db server-data/memory server-data/agents server-data/applications agents skills definitions apps; do
  mkdir -p "$SENTINEL/$d"
  echo "sentinel $d" > "$SENTINEL/$d/MARKER.txt"
done
echo "sentinel db" > "$SENTINEL/server-data/db/production.db"

export AUTOBYTEUS_DATA_DIR="$SENTINEL/server-data"
export AUTOBYTEUS_MEMORY_DIR="$SENTINEL/server-data/memory"
export DB_NAME="$SENTINEL/server-data/db/production.db"
export DATABASE_URL="file:$SENTINEL/server-data/db/production.db"
export AUTOBYTEUS_AGENT_PACKAGE_ROOTS="$SENTINEL/agents"
export AUTOBYTEUS_DEFINITION_SOURCE_PATHS="$SENTINEL/definitions"
export AUTOBYTEUS_SKILLS_PATHS="$SENTINEL/skills"
export AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS="$SENTINEL/apps"

if env | grep -q "$HOME/.autobyteus"; then
  echo "refusing: a variable still points at $HOME/.autobyteus:" >&2
  env | grep "$HOME/.autobyteus" | cut -d= -f1 >&2
  exit 3
fi

snapshot() { (cd "$SENTINEL" && find . -print | sort && find . -type f -print0 | sort -z | xargs -0 shasum -a 256); }
snapshot > "$EVID/$LABEL.sentinel-before.txt"

cd "$SERVER"
node ./node_modules/vitest/vitest.mjs run "$@" --no-watch --reporter=default --reporter=json \
  --outputFile.json="$EVID/$LABEL.json" > "$EVID/$LABEL.log" 2>&1
code=$?

snapshot > "$EVID/$LABEL.sentinel-after.txt"
if cmp -s "$EVID/$LABEL.sentinel-before.txt" "$EVID/$LABEL.sentinel-after.txt"; then
  sentinel_result="sentinel unchanged"
else
  sentinel_result="SENTINEL CHANGED"
fi
echo "exit $code; $sentinel_result (SENTINEL=$SENTINEL)" >> "$EVID/$LABEL.log"
echo "exit $code; $sentinel_result"
exit $code
