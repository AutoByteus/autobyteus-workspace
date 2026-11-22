# IR-005 validation summary (implementation engineer, 2026-11-22)

- Server typecheck: production 0 errors; test files 974 in 300 files (= baseline). PASS.
- `org-follows-definition.test.ts`: 18/18 pass.
  - The two F-5 positive cases (`viewFor` keeps the rule and plans `/writer`; the reopen follows) fail with `org-membership-planner.ts` at HEAD and pass with the fix.
  - The invalid-endpoint cases (unknown placement, Agent intermediate, three segments, empty rules) are refused both ways, as intended.
- Suite run, alone (no concurrent vitest): `tests/architecture`, `tests/unit/agent-collaboration`, `tests/unit/agent-org-execution`, `tests/unit/agent-communication`, `tests/unit/remote-collaboration`, `tests/unit/run-history`, `tests/unit/agent-memory`, `tests/unit/api`, the identity allocator test, `tests/integration/agent-org-execution`, `tests/integration/agent-collaboration`, `tests/app-data-migrations`, `tests/unit/projects`, `tests/unit/agent-team-execution`, `tests/unit/services`, `tests/unit/agent-org-definition`, `tests/unit/agent-team-definition`, `tests/unit/collaboration-definition-admission` and `tests/integration/collaboration-definition-admission`.
  - Result: 451 files, 3355 tests pass, 2 skipped, and 1 failure, `upgrade-paths/definition-nonmutation-startup.test.ts`, under the full parallel load.
  - Rerun alone, that test passes 4/4, and `tests/app-data-migrations` passes 74/74 (636 tests). It passed in IR-004's run too, and this change does not touch migrations, so it was a one-off under load.
- Built server (`pnpm build`, scripted AGY): `org-follows-definition` passes 6/6. The launch path is unchanged; this run is a regression check.
- Not rerun here (API/E2E's, per CRR-006): the OC file (OC-13).
