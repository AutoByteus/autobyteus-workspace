#!/bin/bash
# CCR-E2E-001..003 on the current HEAD. Keys read in-process from the user's server .env (never printed).
N=$1; W=/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse; T=$W/tickets/in-progress/compaction-prompt-cache-reuse/api-e2e-evidence/round6
getk() { grep "^$1=" /Users/normy/.autobyteus/server-data/.env | head -1 | cut -d= -f2- | sed -e "s/^[\"']//" -e "s/[\"']\$//"; }
cd $W/autobyteus-server-ts; H=$(mktemp -d /tmp/ccr-e2e-home-XXXX)
env -i PATH="$PATH" HOME="$H" TMPDIR="${TMPDIR:-/tmp}" LANG=en_US.UTF-8 RUN_COMPACTION_CACHE_E2E=1 COMPACTION_CACHE_E2E_ANTHROPIC_MODEL="${CCR_MODEL:-claude-opus-5-5}" ANTHROPIC_API_KEY="$(getk ANTHROPIC_API_KEY)" VERTEX_AI_API_KEY="$(getk VERTEX_AI_API_KEY)" COMPACTION_CACHE_E2E_EVIDENCE_DIR="$T/live-ccr-$N" ./node_modules/.bin/vitest run tests/e2e/runtime/autobyteus-compaction-cache-reuse-live.e2e.test.ts --no-watch ${CCR_FILTER:+-t "$CCR_FILTER"} > "$T/live-ccr-$N.log" 2>&1; echo "exit $?" >> "$T/live-ccr-$N.log"; rm -rf "$H"
sed 's/\x1b\[[0-9;]*m//g' "$T/live-ccr-$N.log" | grep -E "✓|×|Test Files|^ *Tests|exit" | tail -8
