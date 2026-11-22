# IR-007 validation summary (implementation engineer, 2026-11-22)

- Server typecheck: production 0 errors; test files 973 in 300 files (= baseline). PASS.
- `tests/architecture`, `tests/app-data-migrations`, `tests/unit/agent-org-execution`, `tests/unit/remote-collaboration`: 132 files, 1030 tests pass. Run alone.
- CR-008: `agent-org-units-path-rewrite.test.ts` passes 12/12. The new Windows pass case fails with the old `agent_orgs/<orgRunId>/` pre-check (filesParsed 0) and passes with the move-derived needles.
- CR-009: `org-units-remote-files-and-renewal.test.ts` passes 4/4, the agent unit's cross-node file included.
- Built server (`pnpm build`, scripted AGY CLI), conversion paths: `org-container-package` and `stopped-org-workspace-graphql` 14/14; `append-only-message-logs-startup` 2/2.
