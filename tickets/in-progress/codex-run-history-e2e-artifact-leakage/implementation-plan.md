# Implementation Plan

- Ticket: `codex-run-history-e2e-artifact-leakage`
- Stage: `6 - Source Implementation`

## Planned Changes

1. Add isolated app-data bootstrap helper for Codex live E2E suites.
- Target files:
  - `autobyteus-server-ts/tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
- Behavior:
  - create suite temp data directory,
  - write suite-local `.env`,
  - call `appConfigProvider.config.setCustomAppDataDir(tempDir)` before suite operations,
  - remove suite temp data directory in teardown.

2. Add explicit cleanup utility for leaked Codex E2E run-history rows.
- Target file:
  - `autobyteus-server-ts/scripts/cleanup-codex-e2e-run-history.mjs`
- Behavior:
  - supports `--memory-dir`, `--dry-run`,
  - matches known codex E2E workspace prefixes,
  - removes matching run dirs under `memory/agents/<runId>`,
  - rewrites `run_history_index.json` without matching rows.

3. Add automated tests for cleanup utility logic.
- Target file:
  - `autobyteus-server-ts/tests/unit/scripts/cleanup-codex-e2e-run-history.test.ts`
- Verify:
  - dry-run removes nothing,
  - non dry-run removes only prefix-matched rows,
  - non-target rows remain intact.

4. Add npm script entry for cleanup command.
- Target file:
  - `autobyteus-server-ts/package.json`

## Verification Plan

- Unit:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/scripts/cleanup-codex-e2e-run-history.test.ts`
- Live Codex E2E (targeted):
  - `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts -t "restores a terminated codex run in the same workspace after continueRun" --maxWorkers=1`
- Regression command to verify no new contamination in default index (file diff/check).
