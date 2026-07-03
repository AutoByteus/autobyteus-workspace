# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/in-progress/token-statistics-ledger-migration-cleanup/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/in-progress/token-statistics-ledger-migration-cleanup/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/in-progress/token-statistics-ledger-migration-cleanup/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/in-progress/token-statistics-ledger-migration-cleanup/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/in-progress/token-statistics-ledger-migration-cleanup/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/in-progress/token-statistics-ledger-migration-cleanup/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/in-progress/token-statistics-ledger-migration-cleanup/api-e2e-coverage-investigation.md`
- Current Execution Round: `1`
- Trigger: Code review passed and requested API/E2E coverage investigation/execution for the Token Usage execution-address backfill migration.
- Prior Round Reviewed: N/A.
- Latest Authoritative Round: Round 1.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code review handoff to API/E2E | N/A | No unresolved final failures. One frontend test command initially failed because `.nuxt/tsconfig.json` had not been generated; `nuxi prepare` resolved it and rerun passed. | Pass | Yes | Added durable migration-specific GraphQL E2E coverage, executed focused server/web checks, and recorded no reroute findings. |

## Execution Basis

Execution followed the canonical coverage investigation. Current behavior to prove: historical token usage rows are migrated into canonical `execution_address_json` where deterministic data exists; old task-team child-root rows become nested task-team rows in Token Statistics; aggregate token/cost math is unchanged; migration status/log summaries expose category counts and skip reasons; and runtime Token Statistics paths remain ledger-only without old path-column hierarchy authority. Physical old-column removal remains deferred by reviewed design.

## Pre-Execution Coverage Investigation

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/in-progress/token-statistics-ledger-migration-cleanup/api-e2e-coverage-investigation.md`
- Completed before final test execution, durable coverage edits, durable coverage removals, or failure rerouting: `Yes`
- Existing durable coverage inventory reviewed: `Yes`
- Existing tests treated as authority without current-requirement validity review: `No`
- Stale or obsolete coverage found: `No`
- New durable coverage needed: `Yes`
- Reroute required from investigation: `No`
- Notes: Investigation decided to add a narrow migration-specific GraphQL E2E file instead of changing existing broad Token Usage GraphQL coverage.

## Existing Durable Coverage Decision Summary

| Path / Scenario | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Action Taken | Evidence |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-execution-address-backfill-migration.test.ts` | `Still Valid` | Executed. | Passed in final focused command, 3 tests. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | `Still Valid` | Executed as supporting GraphQL regression. | Passed, 3 tests. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts` | `Still Valid` | Executed as supporting aggregate/unit-price regression. | Passed, 1 test. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` | `Still Valid` | Executed as supporting provider semantics regression. | Passed, 1 test. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-model-list.e2e.test.ts` | `Still Valid` | Executed as supporting Token Usage GraphQL surface regression. | Passed, 1 test. |
| `autobyteus-web/stores/__tests__/appDataMigrationsStore.spec.ts` | `Still Valid` | Executed after `nuxi prepare`. | Passed, 2 tests. |
| `autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts` and `components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` | `Still Valid` | Executed after `nuxi prepare`. | Passed, 4 tests across 2 files. |
| Active old-column source guard and no-drop migration guard | `Still Valid` | Executed as command scans and through the migration unit test. | Active hierarchy scan passed across 11 files; no current drop-column migration found. |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`. The only retained behavior is the explicitly approved bounded no-address fallback for unreconstructable rows.
- Compatibility-only or legacy-retention behavior observed in implementation: `No` invalid behavior observed. Physical old columns remain only as deferred contract scope; active hierarchy code ignores them.
- Durable coverage added or retained only for compatibility-only behavior: `No`.
- If compatibility-related invalid scope was observed, reroute classification used: N/A.
- Upstream recipient notified: N/A.

## Execution Surfaces / Modes

- Server GraphQL E2E against real Prisma SQLite test DB.
- App-data migration runner execution against real Prisma migration records/log file output.
- Token Usage GraphQL task/model/statistics queries.
- Frontend store/component unit tests for migration summary and Token Statistics recursive row handling.
- Static/source command scans for legacy path-column non-use and no drop-column migration.
- Build-scoped TypeScript compile.

## Platform / Runtime Targets

- Local macOS development environment.
- Node/Vitest server test runtime.
- SQLite Prisma test DB reset by Vitest global setup.
- Nuxt web test runtime after generated `.nuxt` types via `pnpm -C autobyteus-web exec nuxi prepare`.

## Lifecycle / Upgrade / Restart / Migration Checks

- Added durable migration lifecycle E2E through `AppDataMigrationRunner.runPending()` using the new `TokenUsageExecutionAddressBackfillMigration` and real `AppDataMigrationRecordRepository`.
- The new E2E seeds realistic historical DB rows before the app-data migration, including old task-team child-root rows, then checks GraphQL Token Statistics before and after migration.
- The test verifies migration record status and log output rather than only calling the migration class directly.

## Coverage Matrix

| Scenario ID | Surface | Behavior Proven | Durable / Temporary | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| `MIG-TOKEN-001` | Migration runner + GraphQL Task statistics | Historical task-team child-root rows are re-rooted under original root and render as `TEAM_RUN -> TASK_TEAM_RUN -> MEMBER_RUN`; old task-team run ids no longer appear as unrelated top-level rows when task records exist. | Durable | Pass | New `token-usage-execution-address-backfill-graphql.e2e.test.ts` passed. |
| `MIG-TOKEN-002` | Migration + GraphQL Task statistics | Two task-team runs for the same logical `StudentStudyGroup` target remain separate by task-team run id. | Durable | Pass | New E2E asserts two `TASK_TEAM_RUN` rows with distinct ids. |
| `MIG-TOKEN-003` | GraphQL totals before/after migration | Fixed-range total cost is unchanged before/after migration; root aggregate reflects expected reparenting only. | Durable | Pass | New E2E captures `totalCostInPeriod` before and after and compares with close numeric equality. |
| `MIG-TOKEN-004` | App-data migration status/log | Migration summary/log exposes scanned/migrated/skipped/failed counts, category details, task-record index count, and skip reasons including conflict/insufficient data. | Durable | Pass | New E2E verifies runner result, log file content, and GraphQL `getAppDataMigrations` summary. |
| `MIG-TOKEN-005` | Migration skip/fallback behavior | Conflicting task-team records and insufficient rows are not guessed into hierarchy; they remain visible through fallback rows. | Durable | Pass | New E2E verifies conflict row remains top-level fallback and insufficient root row remains fallback child with `executionAddress: null`. |
| `SUPPORT-001` | Migration unit/schema/source guards | Direct member/task-agent/task-team classification, idempotency, already-addressed rows, standalone/insufficient skips, old-column non-use, and no-drop guard remain valid. | Existing durable | Pass | Unit migration test passed, 1 file / 3 tests. |
| `SUPPORT-002` | Existing Token Usage GraphQL E2E | Recursive task rows, provider semantics, model list, unit-price semantics, and non-migration Token Usage aggregates remain valid. | Existing durable | Pass | Token Usage E2E command passed, 5 files / 7 tests plus new file. |
| `SUPPORT-003` | Web app-data migrations and Token Statistics UI state | Existing frontend store/component handling of migration summaries and recursive Token Statistics rows remains valid. | Existing durable | Pass | Web Vitest passed, 3 files / 6 tests after `nuxi prepare`. |
| `TEMP-SCAN-001` | Source command scan | Active Token Usage API/frontend hierarchy files do not reference `team_run_path_json`, `member_path_json`, `teamRunPathJson`, or `memberPathJson`. | Temporary evidence plus unit guard | Pass | Python source scan passed across 11 active files. |
| `TEMP-SCAN-002` | Prisma migration command scan | No normal Prisma migration drops `team_run_path_json` or `member_path_json` in current ticket. | Temporary evidence plus unit guard | Pass | Python migration scan found no drop-column migration. |

## Test Scope

In scope:
- Historical Token Usage DB shapes with missing `execution_address_json`.
- Direct member, task-team, repeated task-team, task-agent, standalone, already-addressed, insufficient-data, and conflict cases.
- Migration runner status/log summary and GraphQL status visibility.
- Token Statistics GraphQL hierarchy before/after migration.
- Aggregate total preservation and fallback visibility.
- No active old path-column hierarchy reads and no current-ticket normal drop-column migration.

Out of scope:
- Mutating the user's real production DB.
- Physical removal of old physical columns.
- Full Electron packaged startup UI verification.
- Heuristic repair of rows without deterministic task records/scalar inputs.

## Execution Setup / Environment

- Server Vitest global setup reset the SQLite test DB and applied migrations through `20260702093000_token_usage_execution_address`.
- New migration E2E used temporary memory/log directories under `/tmp` and deleted them after execution.
- New migration E2E seeded old historical rows directly into `token_usage_ledger_events` to represent upgraded DB state before app-data backfill.
- Web tests initially required generated Nuxt types; `pnpm -C autobyteus-web exec nuxi prepare` generated `.nuxt` before rerunning.

## Tests Implemented Or Updated

- Added `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/autobyteus-server-ts/tests/e2e/token-usage/token-usage-execution-address-backfill-graphql.e2e.test.ts`:
  - seeds historical direct member, two old task-team child-root rows, direct task-agent row, standalone row, insufficient row, already-addressed row, and conflicting task-team row;
  - writes task delegation record files with task-team address prefixes;
  - captures Token Statistics top-level rows and `totalCostInPeriod` before migration;
  - runs the new app-data migration through `AppDataMigrationRunner.runPending()` with real migration record/log persistence;
  - asserts category summary/log details;
  - asserts raw migrated DB `root_team_run_id`/`execution_address_json` values;
  - asserts GraphQL Task statistics after migration shows nested task-team rows and preserved totals;
  - asserts GraphQL app-data migration status exposes the summary/log path.

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| None removed. | N/A | N/A | Existing relevant coverage remains valid. |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/autobyteus-server-ts/tests/e2e/token-usage/token-usage-execution-address-backfill-graphql.e2e.test.ts`
- Paths removed: None.
- If `Yes`, returned through `code_reviewer` before delivery: `Pending via this handoff; required next recipient is code_reviewer`.
- Post-API/E2E coverage code review artifact: Pending.

## Other Execution Artifacts

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/in-progress/token-statistics-ledger-migration-cleanup/api-e2e-coverage-investigation.md`
- Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/in-progress/token-statistics-ledger-migration-cleanup/api-e2e-execution-coverage-report.md`

## Temporary Execution Methods / Scaffolding

- No temporary repository files were left behind.
- Temporary migration memory/log directories were created by the new E2E test under the OS temp directory and removed in `afterAll`.
- Command scans were one-off execution evidence and did not create repo files.

## Dependencies Mocked Or Emulated

- No external service was required.
- Historical DB rows and task delegation records were deterministic fixtures in the test DB/temp memory directory.
- The app-data migration runner and migration record repository were real local code paths; no external runtime/model calls were mocked.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | First execution round. | N/A |

Within Round 1, the first attempt to run selected web tests failed before test collection because `.nuxt/tsconfig.json` had not been generated in this worktree. This was environment setup, not a product/test failure. Running `pnpm -C autobyteus-web exec nuxi prepare` resolved it; the same selected web tests then passed.

## Scenarios Checked

- Historical direct team member row backfill to `member(Teacher)` execution address.
- Old task-team child rows with `root_team_run_id = taskTeamRunId` corrected to the original root team id.
- Same-target repeated task-team runs remain separate by task-team run id.
- Direct task-agent row backfill to `member(Codex) -> task_agent(taskAgentRunId)`.
- Standalone no-root rows remain standalone and unaddressed.
- Already-addressed rows are left unchanged.
- Insufficient rows are skipped and remain visible through fallback.
- Conflicting task-team task records are skipped with `CONFLICTING_TASK_TEAM_RECORDS` and remain visible through fallback.
- Token/cost totals before/after migration are preserved.
- App-data migration summary/log and GraphQL status expose category details and skip reasons.
- Active hierarchy source paths do not reference old path columns.
- No normal Prisma migration drops old path columns.
- Existing recursive Token Statistics GraphQL and frontend store/table behavior remains valid.

## Passed

- `git diff --check` — Passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/app-data-migrations/token-usage-execution-address-backfill-migration.test.ts tests/e2e/token-usage/token-usage-execution-address-backfill-graphql.e2e.test.ts tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts tests/e2e/token-usage/token-usage-model-list.e2e.test.ts` — Passed, 6 files / 10 tests.
- `pnpm -C autobyteus-web exec nuxi prepare` — Passed.
- `pnpm -C autobyteus-web exec vitest run stores/__tests__/appDataMigrationsStore.spec.ts components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts stores/__tests__/tokenUsageStatistics.spec.ts` — Passed, 3 files / 6 tests.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — Passed.
- Active hierarchy legacy path source scan across 11 files — Passed.
- No-drop-column Prisma migration scan — Passed.
- Final focused rerun: `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/token-usage-execution-address-backfill-graphql.e2e.test.ts --typecheck=false` — Passed, 1 file / 1 test.

## Failed

No unresolved final failures.

Resolved during round:
- Initial web selected test command failed because `.nuxt/tsconfig.json` was missing. Running `nuxi prepare` generated Nuxt types; rerun passed.

## Not Tested / Out Of Scope

- Physical removal of `team_run_path_json` / `member_path_json`: explicitly future/post-backfill contract work.
- User production DB mutation: intentionally avoided; deterministic test DB coverage used the same historical shape.
- Full Electron packaged UI: not required for this API/E2E round; migration status/log and Token Statistics API/frontend units cover the affected surfaces.
- Malformed JSON task-record files: migration logs unreadable files and skips unavailable input; conflict and insufficient-data deterministic skip paths were covered.

## Blocked

None.

## Cleanup Performed

- New E2E deletes seeded token usage events by `usage_event_id`.
- New E2E deletes the app-data migration record for `20260703_token_usage_execution_address_backfill` after execution.
- New E2E removes temporary memory/log directories.
- Vitest global setup resets the server SQLite test DB at test process start.

## Classification

- `Local Fix`: N/A.
- `Design Impact`: N/A.
- `Requirement Gap`: N/A.
- `Unclear`: N/A.

No reroute classification applies. Coverage passed. Because repository-resident durable E2E coverage was added after code review, the next required recipient is `code_reviewer` for coverage-code re-review.

## Recommended Recipient

`code_reviewer`

## Evidence / Notes

- The coverage investigation was written before durable E2E coverage was added.
- The new durable E2E directly addresses the residual risks named in code review: realistic historical DB shape, task-team rows no longer top-level when records exist, aggregate preservation, migration status/log details, skip reasons, and ledger-only runtime paths.
- Physical old-column cleanup remains an intentional delivery/future contract note.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: API/E2E coverage passed with one new repository-resident durable E2E file. Return package to `code_reviewer` before delivery.
