#!/bin/bash
# autobyteus-473 API/E2E (temporary): runs one journey command and appends its exact command and output to the transcript
# (android/journey.md); moves its screenshots into android/shots/. Usage: run-step.sh <case-id> <script> [args]
DIR=$(cd "$(dirname "$0")" && pwd); E=$(cd "$DIR/.." && pwd)/android; mkdir -p "$E/shots"
CASE=$1; SCRIPT=$2; shift 2
OUT=$(node "$DIR/$SCRIPT" "$@" 2>&1); RC=$?
{ echo "## $CASE · $(date -u +%FT%TZ) · node scripts/$SCRIPT $* · exit $RC"; echo '```json'; echo "$OUT"; echo '```'; echo; } >> "$E/journey.md"
for f in /tmp/abtest473/*.png; do [ -f "$f" ] && mv "$f" "$E/shots/$CASE-$(basename "$f")"; done
echo "$OUT"
