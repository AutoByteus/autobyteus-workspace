#!/bin/bash
# Round 2 server checks by impact (serialized in this worktree): integration prepare, typecheck, unit, integration, then the impact e2e subset in a clean env with a resolved temp HOME.
W=/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task
E=$W/tickets/in-progress/link-existing-run-to-task/evidence/api-e2e/round2
cd $W
pnpm -C autobyteus-server-ts test:integration:prepare > $E/R0-integration-prepare.log 2>&1; echo "integration-prepare $?"
pnpm -C autobyteus-server-ts typecheck > $E/R1-typecheck.log 2>&1; echo "typecheck $?"
pnpm -C autobyteus-server-ts test:unit > $E/R2-unit.log 2>&1; echo "unit $?"
pnpm -C autobyteus-server-ts test:integration > $E/R3-integration.log 2>&1; echo "integration $?"
H=$(cd "$(mktemp -d)" && pwd -P)
env -i PATH="$PATH" HOME="$H" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$W/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
  pnpm -C autobyteus-server-ts exec vitest run $(cat $E/E2E-impact-files.txt) --no-watch > $E/E2E-impact.log 2>&1; echo "e2e-impact $?"
rm -rf "$H"
