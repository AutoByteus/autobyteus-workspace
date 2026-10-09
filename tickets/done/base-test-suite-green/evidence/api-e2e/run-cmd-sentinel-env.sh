#!/usr/bin/env bash
# API/E2E (AC-002/AC-004, SCN-004): runs a documented command with the agent shell's inherited
# live-app variables, except that every data/memory/database/package-root variable is re-pointed
# at a disposable seeded sentinel folder. Refuses to run if any variable still points at
# ~/.autobyteus. Afterwards: sentinel must be byte-identical; a read-only summary of files under
# ~/.autobyteus modified during the run is recorded (counts per top-level folder + test-signature hits).
# Usage: run-cmd-sentinel-env.sh <label> <cwd> <cmd...>
set -u
EV="$(cd "$(dirname "$0")" && pwd)"; LABEL="$1"; CWD="$2"; shift 2
SENTINEL="$(mktemp -d /tmp/apie2e-sentinel-XXXXXX)"
for d in server-data/db server-data/memory server-data/agents server-data/applications agents skills definitions apps; do
  mkdir -p "$SENTINEL/$d"; echo "sentinel $d" > "$SENTINEL/$d/MARKER.txt"
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
  echo "refusing: a variable still points at $HOME/.autobyteus:" >&2; env | grep "$HOME/.autobyteus" | cut -d= -f1 >&2; exit 3
fi
snapshot() { (cd "$SENTINEL" && find . -print | sort && find . -type f -print0 | sort -z | xargs -0 shasum -a 256); }
snapshot > "$EV/$LABEL.sentinel-before.txt"
MARK="$(mktemp /tmp/apie2e-mark-XXXXXX)"; sleep 1
echo "inherited AUTOBYTEUS_* vars: $(env | grep -c '^AUTOBYTEUS_'); provider *_API_KEY vars: $(env | grep -c '_API_KEY=')" > "$EV/$LABEL.log"
cd "$CWD"; start=$(date +%s)
"$@" >> "$EV/$LABEL.log" 2>&1
code=$?
snapshot > "$EV/$LABEL.sentinel-after.txt"
if cmp -s "$EV/$LABEL.sentinel-before.txt" "$EV/$LABEL.sentinel-after.txt"; then s="sentinel unchanged"; else s="SENTINEL CHANGED"; fi
{
  echo "# files under ~/.autobyteus modified during the run (read-only; counts per top-level entry)"
  find "$HOME/.autobyteus" -newer "$MARK" -type f 2>/dev/null | sed "s#^$HOME/.autobyteus/##" | awk -F/ '{ if ($2=="memory") print $1"/"$2"/"$3"/"$4; else print $1"/"$2 }' | sort | uniq -c
  echo "# test-signature hits (vitest/tmp/fixture/test-run names):"
  find "$HOME/.autobyteus" -newer "$MARK" -type f 2>/dev/null | grep -iE 'vitest|fixture|test-|_test|\.tmp/|sentinel|apie2e' | sed "s#^$HOME/.autobyteus/##" || true
} > "$EV/$LABEL.home-autobyteus-watch.txt"
echo "exit $code; $s; $(( $(date +%s) - start ))s (cwd=$CWD; SENTINEL=$SENTINEL; cmd=$*)" | tee -a "$EV/$LABEL.log"
exit $code
