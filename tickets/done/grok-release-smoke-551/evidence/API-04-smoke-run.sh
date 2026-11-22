#!/bin/bash
# API-04 (autobyteus-551 AC-006, AC-003 stale case): one release-smoke run at load >= 40 made by a concurrent test run.
# usage: API-04-smoke-run.sh <worktree> <run label> <evidence dir> [not-before epoch]
set -u
WT="$1"; LABEL="$2"; E="$3"; NOT_BEFORE="${4:-0}"
while [ "$(date +%s)" -lt "$NOT_BEFORE" ]; do sleep 60; done
mkdir -p "$E"; OUT="$E/$LABEL"; LOGF="$HOME/.grok/logs/unified.jsonl"
OFFSET=$(stat -f %z "$LOGF")
{ echo "# $LABEL: python3 scripts/release_smoke.py at $(git -C "$WT" rev-parse --short HEAD); concurrent load: pnpm -C autobyteus-server-ts test:unit + pnpm -C autobyteus-web test:nuxt (run 2 on; run 1 had test:unit only)"
  echo "# start $(date -u +%FT%TZ); grok log offset $OFFSET; last grok log entry before: $(tail -c 2000 "$LOGF" | tail -1 | python3 -I -c 'import json,sys; print(json.loads(sys.stdin.read()).get("ts"))')"; } > "$OUT.log"
( cd "$WT" && pnpm -C autobyteus-server-ts test:unit > "$OUT.concurrent-test-unit.log" 2>&1 ) & LOADPID=$!
( cd "$WT" && pnpm -C autobyteus-web test:nuxt > "$OUT.concurrent-test-nuxt.log" 2>&1 ) & LOADPID2=$!
# Start the smoke only once the 1-minute load holds >= 40 for two samples in a row (up to 15 min).
OK=0; for i in $(seq 1 60); do L=$(uptime | sed 's/.*averages: //' | awk '{print $1}'); if [ "${L%.*}" -ge 40 ]; then OK=$((OK+1)); else OK=0; fi; [ $OK -ge 2 ] && break; sleep 15; done
echo "# load before smoke: $(uptime | sed 's/.*averages: //'); fseventsd $(ps -Ao pcpu,comm | grep fseventsd | grep -v grep | awk '{print $1}' | head -1)%" >> "$OUT.log"
( while sleep 30; do echo "load $(date -u +%T) $(uptime | sed 's/.*averages: //')"; done ) >> "$OUT.load-samples.log" & SAMPLER=$!
( cd "$WT" && python3 scripts/release_smoke.py ) >> "$OUT.log" 2>&1; CODE=$?
kill $SAMPLER 2>/dev/null
echo "# smoke exit: $CODE; end $(date -u +%FT%TZ); load after: $(uptime | sed 's/.*averages: //')" >> "$OUT.log"
# Stop this run's own load (its vitest processes run from this worktree's node_modules), then its pnpm wrappers.
pkill -f "$WT/autobyteus-server-ts/node_modules/.bin/../vitest/vitest.mjs run tests/unit" 2>/dev/null
pkill -f "$WT/autobyteus-web/node_modules/.bin/../vitest/vitest.mjs" 2>/dev/null
for P in $LOADPID $LOADPID2; do pkill -P $P 2>/dev/null; kill $P 2>/dev/null; done
python3 -I "$(dirname "$0")/API-04-grok-log-extract.py" "$OFFSET" > "$OUT.grok-startups.jsonl"
exit $CODE
