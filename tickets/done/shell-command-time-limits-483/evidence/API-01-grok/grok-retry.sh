#!/bin/bash
# Retries LCL-LONG-GROK-BG (35-min job) until the Grok plan accepts a turn; stops after a pass/other failure or the deadline.
# usage: grok-retry.sh <worktree> <evidence dir> <deadline epoch seconds>
WT="$1"; E="$2"; DEADLINE="$3"; n=0
mkdir -p "$E"
while [ "$(date +%s)" -lt "$DEADLINE" ]; do
  n=$((n+1)); echo "attempt $n at $(date -u +%H:%M:%SZ)" >> "$E/attempts.log"
  cd "$WT" && env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" SHELL=/bin/bash LANG=en_US.UTF-8 \
    AUTOBYTEUS_TEST_VAULT="$HOME/.autobyteus-test/vault" RUN_LONG_COMMAND_LIMITS_E2E=1 LONG_COMMAND_E2E_EVIDENCE_DIR="$E" \
    pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/long-command-time-limits-live.e2e.test.ts --no-watch -t "LCL-LONG-GROK" > "$E/vitest.log" 2>&1
  code=$?
  echo "attempt $n exit $code" >> "$E/attempts.log"
  if [ $code -eq 0 ]; then echo PASS >> "$E/attempts.log"; exit 0; fi
  if ! grep -q "free-usage-exhausted\|429\|discovery timed out\|is unsupported" "$E/vitest.log"; then echo "OTHER FAILURE" >> "$E/attempts.log"; exit 1; fi
  sleep 900
done
echo "DEADLINE" >> "$E/attempts.log"; exit 2
