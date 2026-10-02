#!/bin/bash
# R6: live AGY suites (installed agy, real model calls). Run from autobyteus-server-ts.
EV="$1"
unset ANTIGRAVITY_CLI_COMMAND
run() { local name="$1"; shift; echo "=== $name start $(date -u +%FT%TZ)" >> "$EV/R6-summary.txt"
  env "$@" > "$EV/R6-$name.log" 2>&1; local rc=$?
  echo "=== $name exit=$rc $(date -u +%FT%TZ) $(sed 's/\x1b\[[0-9;]*m//g' "$EV/R6-$name.log" | grep -E 'Tests ' | tail -1)" >> "$EV/R6-summary.txt"; }
run unit-live AGY_LIVE=1 AGY_LIVE_EVIDENCE_DIR="$EV/agy-live-unit" pnpm exec vitest run tests/unit/agent-execution/backends/antigravity/agy-production-live.test.ts tests/unit/agent-execution/backends/antigravity/agy-restore-live.test.ts tests/unit/agent-execution/backends/antigravity/agy-mcp-team-live.test.ts --no-watch --fileParallelism=false
run capability RUN_AGY_CAPABILITY_E2E=1 pnpm exec vitest run tests/e2e/runtime/agy-native-image-app-chat.e2e.test.ts tests/e2e/runtime/agy-native-image-codex-skill.e2e.test.ts --no-watch --fileParallelism=false
run team-org RUN_AGY_E2E=1 pnpm exec vitest run tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts --no-watch
run background RUN_AGY_BACKGROUND_E2E=1 pnpm exec vitest run tests/e2e/runtime/agy-background-task-live.e2e.test.ts tests/e2e/runtime/agy-background-task-updates-live.e2e.test.ts --no-watch --fileParallelism=false
run recovery RUN_AGY_RECOVERY_E2E=1 pnpm exec vitest run tests/e2e/runtime/agy-runtime-stop-recovery-live.e2e.test.ts --no-watch
echo "=== ALL DONE $(date -u +%FT%TZ)" >> "$EV/R6-summary.txt"
