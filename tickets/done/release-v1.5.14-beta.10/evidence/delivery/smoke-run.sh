#!/bin/bash
# autobyteus-629 pre-tag release smoke: one `python3 scripts/release_smoke.py` run, no imposed load, with load samples
# every 30 s and Grok's own log (timing and model-catalog fields only) from the offset taken before the run.
# usage: smoke-run.sh <worktree> <run label> <evidence dir>
set -u
WT="$1"; LABEL="$2"; E="$3"
mkdir -p "$E"; OUT="$E/$LABEL"; LOGF="$HOME/.grok/logs/unified.jsonl"
OFFSET=$(stat -f %z "$LOGF")
{ echo "# $LABEL: AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault python3 scripts/release_smoke.py at $(git -C "$WT" rev-parse --short HEAD); no load imposed"
  echo "# start $(date -u +%FT%TZ); grok log offset $OFFSET; load before: $(uptime | sed 's/.*averages: //'); fseventsd $(ps -Ao pcpu,comm | grep fseventsd | grep -v grep | awk '{print $1}' | head -1)%"; } > "$OUT.log"
( while sleep 30; do echo "load $(date -u +%T) $(uptime | sed 's/.*averages: //')"; done ) >> "$OUT.load-samples.log" & SAMPLER=$!
( cd "$WT" && AUTOBYTEUS_TEST_VAULT="$HOME/.autobyteus-test/vault" python3 scripts/release_smoke.py ) >> "$OUT.log" 2>&1; CODE=$?
kill $SAMPLER 2>/dev/null
echo "# smoke exit: $CODE; end $(date -u +%FT%TZ); load after: $(uptime | sed 's/.*averages: //')" >> "$OUT.log"
python3 -I "$(dirname "$0")/grok-log-extract.py" "$OFFSET" > "$OUT.grok-startups.jsonl"
exit $CODE
