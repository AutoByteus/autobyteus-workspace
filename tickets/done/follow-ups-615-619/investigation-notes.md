# Investigation Notes

## Investigation Meta

- Package identifier: `follow-ups-615-619` (autobyteus-619)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/follow-ups-615-619`
- Branch: `codex/follow-ups-615-619`
- Base: `origin/personal` @ `dad158474c`
- Finalization target: `origin/personal`
- Bootstrap result: worktree created; `pnpm install`, `pnpm -C autobyteus-server-ts build` (`/tmp/619-install.log`, `/tmp/619-build.log`)
- Current solution revision ID: `SR-001`
- Authorities read: the requirements and design gates (read in this conversation; the 2026-11-23 skill update reviewed), `DESIGN.md` (rule 7), `TESTING.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` (via 29's predecessor comments)
- Investigation status: complete

## Temporary diagnostics (finding-the-cause.md)

All diagnostics were in this worktree only and are removed; none is committed. Verified with `git status` and a `grep` for `DIAG619`.

- `tests/e2e/app-data-migrations/collaborators-to-delegated-runs-startup.e2e.test.ts`: on a GraphQL error, printed the server log and `getAppDataMigrations`. Restored with `git checkout`.
- `dist/run-history/services/root-run-package-readiness-index.js` (build output): logged the readiness diagnostics. Removed by hand.
- `test-support/live-e2e/test-runtime-bootstrap.mjs`: printed the GraphQL errors and the non-terminal migrations. Restored with `git checkout`.
- `tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts`: printed the team entries. Restored with `git checkout`.

## Findings

| ID | Method | Observation | Established |
| --- | --- | --- | --- |
| F-1 | `vitest run tests/e2e/app-data-migrations/collaborators-to-delegated-runs-startup.e2e.test.ts` on `dad158474c` | Fails as reported. Readiness: `org-root` refused, "AgentOrg package is not a container: a released Org tree that was not converted." Migrations on that start: `20260824_team_run_execution_tree_v2` FAILED ("1 TeamRun execution tree could not be upgraded"); `20260901_agent_org_flat_team_families_v1`, `20260905_agent_org_history_first_message_summary_v1` and `20260926_…` NOT_RUN; `20261018_append_only_message_logs_v1` FAILED; `20261122_agent_org_units_own_runs_v1` SUCCEEDED_WITH_WARNINGS, with the Org left waiting. | Reproduced |
| F-2 | `agent-org-units-own-runs-v1-app-data-migration.ts:16-26` | `READER_PREDECESSORS` includes `20260905_…`: while it is not terminal, "every Org is left as it is" | Read |
| F-3 | The test's setup (`:126-148`) | Writes released-shape trees (`toTreeBefore461(testExecutionTree(…))`) with no ledger, so every historical migration runs on them | Read |
| F-4 | `append-only-message-logs-startup.e2e.test.ts:144-160`, `agent-org-units-conversion-cost.e2e.test.ts:88-93` | The established faithful-upgrade pattern: a first start on an empty folder makes the ledger; the rows of migrations the release never ran are deleted; then the released data is placed | Read |
| F-5 | The founder's ledger (read-only `sqlite3`, statuses only) | `20260824_team_run_execution_tree_v2` SUCCEEDED; `20261018_append_only_message_logs_v1` SUCCEEDED_WITH_WARNINGS; FAILED: `20260801_drop_token_usage_legacy_route_column`, `20260801_team_canonical_identity` (neither is in 29's predecessor lists); 29's migration not yet run | Measured |
| F-6 | `removed-skill-access-mode-history-graphql.e2e.test.ts` with the error printed | "AgentOrg package is not admitted." Non-terminal: `20260824_…_v2` FAILED ("2 TeamRun execution trees could not be upgraded"), then the same NOT_RUN chain and append-only "Waiting for …" | Reproduced |
| F-7 | `memory-collaboration-graphql.e2e.test.ts`, the entries printed | Two definitions: `gql-org-a-1-engineering-def` (the Org's Team unit, `teamRunCount 1`) and `gql-writing-team`. The fixture writes an Org container (`writeStoredOrgContainer`, `:50-56`). | Reproduced |
| F-8 | 29's `requirements-doc.md:71` (REQ-006, Preserved) | "The Org view, run tree rows …, Memory page and run history show the Org and its units as today" | Read |
| F-9 | `agent-org-stream-handler.ts:183-196` | The summary (`recordRunActivity`) is awaited before the command acknowledgement is sent | Read |
| F-10 | `tests/e2e/helpers/restore-by-member-message.ts:49-58` | Returns when the run is active and a second snapshot arrived; never waits for the acknowledgement | Read |
| F-11 | `received-files.ts:41-46, 136-140`; `org-units-remote-files-and-renewal.test.ts:62-79`; `remote-files-composition.ts:24-26` | `inside()` compares `path.resolve` forms; the test gives `memoryDir` as `realpath(tmpdir)` and the folders under `tmpdir`; the product passes one configured `memoryDir` | Read; 615 `DEL-09` (Measured: 4/4 with a canonical TMPDIR) |
| F-12 | `git log -S` on `docs/design-cases.md` | 591's Case 26 (`fca9214b2c`, 2026-11-21), 28's Case 27 (`cf5e3f2b7f`, 2026-11-21), 599's Case 26 (`c419bb4b36`) and Case 27 (`edd1501ae8`, 2026-11-22). Citations only in archived ticket records. | Read |

## Persisted Data

- Not affected.

## Risks

| ID | Description | Status |
| --- | --- | --- |
| RSK-001 | 29's gate: a predecessor that stays `FAILED` in a real ledger keeps every Org unconverted and refused (DESIGN.md rule 7, contain bad data to its own run) | FU-001 (not reached on the founder's ledger, F-5) |
