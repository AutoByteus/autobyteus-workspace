#!/bin/bash
# Round 5 final live durable runs on the final commit (sequential; in-process server, shared e2e DB): CCR-E2E-001..004, OLR-E2E-010.
W=/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse; T=$W/tickets/in-progress/compaction-prompt-cache-reuse/api-e2e-evidence/round5
getk() { grep "^$1=" /Users/normy/.autobyteus/server-data/.env | head -1 | cut -d= -f2- | sed -e "s/^[\"']//" -e "s/[\"']\$//"; }
$T/run-ccr.sh r1
cd $W/autobyteus-server-ts; H=$(mktemp -d /tmp/olr-e2e-home-XXXX)
env -i PATH="$PATH" HOME="$H" TMPDIR="${TMPDIR:-/tmp}" LANG=en_US.UTF-8 RUN_NATIVE_OUTPUT_LIMIT_E2E=1 DEEPSEEK_API_KEY="$(getk DEEPSEEK_API_KEY)" OUTPUT_LIMIT_E2E_EVIDENCE_DIR="$T/live-olr010" ./node_modules/.bin/vitest run tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts --no-watch -t "OLR-E2E-010" > "$T/live-olr010.log" 2>&1; echo "exit $?" >> "$T/live-olr010.log"; rm -rf "$H"
sed 's/\x1b\[[0-9;]*m//g' "$T/live-olr010.log" | grep -E "✓|×|Test Files|^ *Tests|exit" | tail -5
