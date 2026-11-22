# IR-004 validation summary (implementation engineer, 2026-11-22)

- Server typecheck: production 0 errors; test files 974 in 300 files (= baseline). PASS.
- `pnpm exec vitest run tests/architecture tests/unit/agent-collaboration tests/unit/agent-org-execution tests/unit/agent-communication
  tests/unit/remote-collaboration tests/unit/run-history tests/unit/agent-memory tests/unit/api tests/unit/agent-execution/agent-run-identity-allocator.test.ts
  tests/integration/agent-org-execution tests/integration/agent-collaboration tests/app-data-migrations tests/unit/projects
  tests/unit/agent-team-execution tests/unit/services`: 438 files, 3188 tests pass, 1 skipped (run alone, no concurrent vitest).
- Each new test fails with its fix reverted, and passes with it:
  - F-1, F-2 and F-3: `org-view-composition.test.ts` ("F-1 (AC-002)") and `org-container-stored.integration.test.ts` (the F-1, F-2 and F-3 cases). All 4 fail with the five F-1/F-3 source files at HEAD.
  - F-4: `team-run-current-package-schema.test.ts` (a former member's cross-unit lines load) fails with the validator at HEAD. `remote-message-receiver.test.ts` checks the `REMOTE_TARGET_ROOT_UNAVAILABLE` log line.
  - SR-015: `org-follows-definition.test.ts`, all 3 cases fail with `collaboration-tree.ts` at HEAD:
    - idle (former), stopped;
    - leaving, stopped;
    - leaving, live (stored file unread).
- Built server (`pnpm build`; scripted AGY CLI; run one after the other):
  - `org-follows-definition` OF-01 … OF-06 pass (6/6). OF-04 now also refuses the direct agent's message to the removed writer at `/team/writer` with the exact former-member text (`org-follows-e2e/OF-04.json`, `refusedMember`).
  - `append-only-message-logs-startup` (AOML-1/2) passes (2/2).
- Receipts: `org-follows-e2e/` (server output checked: no credentials).
- Not rerun here (API/E2E's, per CRR-004): the OC file, OCL-02, the OCU probe, the two-server file, `stopped-org-workspace-graphql`.
