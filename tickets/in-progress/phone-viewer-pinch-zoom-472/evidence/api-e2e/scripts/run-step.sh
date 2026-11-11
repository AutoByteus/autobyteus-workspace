#!/bin/bash
# autobyteus-472 API/E2E (temporary): runs one journey step (step.mjs) and appends its exact command and output to the
# journey transcript; copies the step's screenshot(s) into the evidence. Usage: run-step.sh <case-id> <step> [args]
DIR=$(cd "$(dirname "$0")" && pwd); E=$(cd "$DIR/.." && pwd)/android; mkdir -p "$E/shots"
CASE=$1; shift
OUT=$(node "$DIR/step.mjs" "$@" 2>&1); RC=$?
{ echo "## $CASE · step $* · $(date -u +%FT%TZ) · exit $RC"; echo '```json'; echo "$OUT"; echo '```'; echo; } >> "$E/journey.md"
for f in /tmp/abtest472/*.png; do [ -f "$f" ] && mv "$f" "$E/shots/$CASE-$(basename "$f")"; done
echo "$OUT"
