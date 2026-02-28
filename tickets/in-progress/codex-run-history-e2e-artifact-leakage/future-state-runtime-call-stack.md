# Future-State Runtime Call Stack

- Ticket: `codex-run-history-e2e-artifact-leakage`
- Stage: `4 - Runtime Modeling`
- Scope: `Medium`

## Use Case UC-001: Codex live E2E run does not pollute default run-history

1. Test suite `beforeAll` creates isolated temp app data directory.
2. Test suite writes minimal `.env` into isolated app data directory (`AUTOBYTEUS_SERVER_HOST`, `APP_ENV=test`).
3. Test suite calls `appConfigProvider.config.setCustomAppDataDir(tempDir)` before first GraphQL operation.
4. GraphQL resolver path executes and run-history services resolve memory dir under isolated app data root.
5. Codex run lifecycle persists manifests/index only in isolated temp memory path.
6. Test suite `afterAll` removes isolated app data directory.
7. Default developer memory index remains unchanged by these test runs.

## Use Case UC-002: Existing leaked codex e2e history entries are safely cleaned

1. Operator runs cleanup utility command.
2. Cleanup utility locates target memory root and loads run-history index.
3. Utility filters rows by approved workspace prefix list:
   - `codex-continue-workspace-e2e-`
   - `codex-workspaceid-continue-e2e-`
   - (optional additional codex runtime e2e prefixes explicitly listed)
4. For each matched row, utility removes corresponding run manifest directory and index row.
5. Utility keeps unmatched rows intact.
6. Utility prints summary: matched/removed/skipped/errors.
7. Workspace history listing no longer includes removed artifacts.

## Use Case UC-003: Regression safety in affected tests

1. Codex runtime E2E tests run with `RUN_CODEX_E2E=1` under isolated profile.
2. Test assertions verify expected behavior still passes (continue/terminate/workspace mapping/team send_message_to).
3. Additional test assertion checks no writes occurred in default index path for known e2e prefixes (or verifies isolation root usage).

## Boundary and Responsibility Map

- Test harness boundary:
  - Owns sandbox app-data setup/teardown and does not alter production logic.
- Run-history runtime boundary:
  - Keeps existing persistence semantics; no special-casing test prefixes in runtime listing logic.
- Cleanup utility boundary:
  - Performs explicit offline maintenance with strict prefix targeting.

## Error/Fallback Paths

- If temp app data setup fails, test suite fails fast and does not run mutable test operations.
- If cleanup script cannot parse index JSON, it exits with non-zero status and no partial deletion.
- If a matched run directory is missing, script removes index row and logs as partial cleanup.
