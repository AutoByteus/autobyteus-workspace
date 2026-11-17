#!/bin/bash
# autobyteus-458 API/E2E (temporary): runs one step and appends its exact command and output to the journey transcript
# (evidence/api-e2e/android/journey.md). Usage: step.sh <case-id> ph|api <step> [args]
DIR=$(cd "$(dirname "$0")" && pwd); E=$(cd "$DIR/.." && pwd)/${JOURNEY_DIR:-android}; mkdir -p "$E/shots"
CASE=$1; TOOL=$2; shift 2
OUT=$(SHOTS="$E/shots" node "$DIR/$TOOL.mjs" "$@" 2>&1); RC=$?
{ echo "## $CASE · $TOOL $* · $(date -u +%FT%TZ) · exit $RC"; echo '```json'; echo "$OUT"; echo '```'; echo; } >> "$E/journey.md"
echo "$OUT"
