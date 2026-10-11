#!/bin/bash
# Round 6 (IR-008 + delivery merge): Anthropic live cases on merged code, then server checks with harnesses idle.
W=/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse; T=$W/tickets/in-progress/compaction-prompt-cache-reuse/api-e2e-evidence/round6
$T/run-ccr.sh opus
CCR_MODEL=claude-sonnet-5-5 CCR_FILTER="CCR-E2E-001" $T/run-ccr.sh sonnet55
CCR_MODEL=claude-haiku-5-5 CCR_FILTER="CCR-E2E-001" $T/run-ccr.sh haiku55
cd $W/autobyteus-server-ts
pnpm typecheck > "$T/server-typecheck.log" 2>&1; echo "exit $?" >> "$T/server-typecheck.log"; tail -1 "$T/server-typecheck.log"
pnpm test:unit > "$T/server-unit.log" 2>&1; echo "exit $?" >> "$T/server-unit.log"
sed 's/\x1b\[[0-9;]*m//g' "$T/server-unit.log" | grep -E "Test Files|^ *Tests|^exit" | tail -3
