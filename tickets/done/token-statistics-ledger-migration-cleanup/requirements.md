# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — follow-up ticket bootstrapped on 2026-07-03 from latest `origin/personal` after the finalized `token-statistics-nested-task-runs` ticket exposed a migration/backfill gap during local Electron verification. Revised after architecture review round 1 to make scope unambiguous: this ticket implements app-data backfill/correction plus active-code non-use proof only. Physical column removal is a future/post-backfill contract phase, not current implementation scope.

## Goal / Problem Statement

Complete the data side of the Token Statistics execution-address migration so historical token usage rows become self-contained where deterministic data exists, while preserving the existing clean runtime/query model for new rows.

The finalized `token-statistics-nested-task-runs` ticket successfully introduced runtime writing of `execution_address_json` and backend-built recursive Task statistics for new data. However, verification of the user's live Electron database showed the migration story is incomplete:

- the Prisma migration only adds `execution_address_json`;
- physical legacy columns `team_run_path_json` and `member_path_json` remain in `token_usage_ledger_events`;
- there is no registered data/app-data migration that backfills historical team rows;
- most historical rows still have `execution_address_json = NULL`;
- old task-team child rows that were previously stored under the child task-team run id remain flat/legacy unless materialized into the new address model.

This ticket must perform the **backfill phase** of the industry expand/backfill/contract sequence. It must not perform the physical drop/contract phase as a normal Prisma migration, because Prisma migrations run before app-data migrations in this application.

## Investigation Findings

- New ticket worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup`.
- New ticket branch: `codex/token-statistics-ledger-migration-cleanup` tracking `origin/personal`.
- Base commit after refresh: `5832196cca5215f4771b29a72d4f3fe20a0a8d8b` (`docs(delivery): record token statistics finalization`).
- Finalized upstream ticket artifacts remain in `tickets/done/token-statistics-nested-task-runs`.
- Current Prisma model has `executionAddressJson @map("execution_address_json")` and no `teamRunPathJson` / `memberPathJson` fields, so active Prisma/domain code decommissioned the old path fields.
- Current migration `autobyteus-server-ts/prisma/migrations/20260702093000_token_usage_execution_address/migration.sql` only contains:

```sql
ALTER TABLE "token_usage_ledger_events" ADD COLUMN "execution_address_json" TEXT;
```

- No migration currently drops `team_run_path_json` or `member_path_json`. That physical drop is intentionally deferred out of this ticket.
- No app-data migration currently backfills token usage `execution_address_json`; that is the current ticket's implementation target.
- Live DB probe of `$HOME/.autobyteus/server-data/db/production.db` showed:
  - `token_usage_ledger_events` still has physical columns `team_run_path_json`, `member_path_json`, and `execution_address_json`;
  - `_prisma_migrations` records `20260702093000_token_usage_execution_address` as applied;
  - sampled count at investigation time: about `14k` token rows total, about `13.9k` without `execution_address_json`, and a few hundred with the new address;
  - `team_run_path_json` had zero non-empty rows in the probed DB;
  - many old team rows have `root_team_run_id` + `member_route_key` and can be directly backfilled to `member(memberRouteKey)`;
  - old delegated task-team child rows can often be recognized because their `root_team_run_id` equals a task-team run id recorded in `task_delegation_records.json`.
- Current `TokenUsageTaskStatisticsTreeBuilder` does not read old path JSON columns. Old rows still display because it intentionally groups no-address rows through a legacy fallback using scalar fields such as `root_team_run_id`, `member_agent_run_id`, `member_route_key`, and `run_id`.
- Existing task delegation records persist `taskRun.address` with typed segments such as `member(StudentStudyGroup) -> task_team(<taskTeamRunId>)`. A one-time migration can use these records to materialize missing addresses into token usage rows without making the runtime statistics query depend on task records.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Data Migration / Cleanup following a finalized behavior-change ticket.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure plus Missing Migration Invariant / Shared Structure Looseness.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Data migration cleanup needed now; physical schema contraction deferred.
- Evidence basis: The new runtime model is correct for new rows, but historical rows were not transformed. Current UI behavior for old rows depends on no-address fallback rather than the canonical self-contained address model.
- Requirement or scope impact: This ticket must define and implement a durable data migration/backfill and active-code non-use proof. It must not redesign token accounting, reintroduce frontend hierarchy reconstruction, or physically drop legacy columns in the current implementation.

## Recommendations

- Treat the finalized original ticket as the completed **expand** phase: new column, new writer, new API/tree reader.
- Implement the **backfill** phase in this ticket: a registered app-data migration that materializes `execution_address_json` for deterministic historical rows.
- Do **not** introduce a normal Prisma drop-column migration in this ticket. In this repository Prisma migrations run before app-data migrations at startup, so such a migration would execute too early.
- Treat physical removal of `team_run_path_json` and `member_path_json` as a separate future/post-backfill **contract** phase.
- Use task delegation records only inside the one-time migration for task-team historical correction; do not make normal Token Statistics queries depend on task records.
- Keep Token Statistics queries self-contained after migration: the query path must read only token usage ledger rows and must not call task record services.
- Keep a bounded no-address fallback only for rows that cannot be deterministically converted; the fallback must not read removed/legacy path columns or guess hierarchy.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

Rationale: The new runtime/tree implementation already exists. This follow-up crosses app-data migration registration/execution, migration observability, tests, and active-code non-use checks.

## In-Scope Use Cases

- Upgrade an existing local database that already ran the expand migration and still has historical rows without `execution_address_json`.
- Upgrade an older local database that has token usage rows but has not yet run the expand migration; after schema expand, the app-data backfill should run safely.
- Backfill direct root-team member token rows into `execution_address_json`.
- Backfill old delegated task-team child rows by using task delegation records to change their root grouping to the original root team and materialize task-team-prefixed addresses.
- Backfill old delegated task-agent rows where scalar fields are sufficient.
- Prove active Token Usage runtime/statistics/API/frontend hierarchy code does not read `team_run_path_json` or `member_path_json`.
- Keep standalone agent rows visible without requiring `execution_address_json`.
- Keep unreconstructable team rows visible through a bounded legacy/no-address fallback.

## Out of Scope

- Physically dropping `team_run_path_json` or `member_path_json` from the database schema in this ticket.
- Adding a normal Prisma drop-column migration for the token usage ledger in this ticket.
- Changing token accounting, pricing, cache, runtime/model grouping, or aggregate math.
- Changing task delegation lifecycle, task record authoring, or team communication semantics.
- Rebuilding hierarchy on the frontend.
- Querying task records during normal Token Statistics API requests.
- Heuristic reconstruction by timestamp, display name, memory directory guessing, or fuzzy matching.
- Reopening the finalized `token-statistics-nested-task-runs` ticket artifacts as the authoritative ticket.

## Functional Requirements

- `FR-001` Migration status clarity: The follow-up ticket must explicitly model the original merged work as the expand phase, this work as the backfill phase, and physical column removal as a future/post-backfill contract phase.
- `FR-002` No current physical drop: This ticket must not add an ordinary Prisma migration that drops `team_run_path_json` or `member_path_json`.
- `FR-003` No active old path authority: No active token usage persistence/statistics/API/frontend hierarchy code may read `team_run_path_json` or `member_path_json` as runtime hierarchy authority after this follow-up.
- `FR-004` Direct member backfill: Historical team rows with `root_team_run_id` and `member_route_key` but no execution address must receive `execution_address_json = { segments: [member(member_route_key)] }` unless a more specific task-team/task-agent correction applies.
- `FR-005` Task-team historical correction: Historical rows whose `root_team_run_id` is actually a task-team run id recorded in task delegation records must be rewritten to the original root team id and receive an execution address formed from the recorded `taskRun.address` plus the row's terminal member/task-agent segment.
- `FR-006` Task-agent historical correction: Historical rows with task-agent scalar identity must receive an address ending in `member(<logical route>) -> task_agent(<taskAgentRunId>)` when sufficient scalar information exists.
- `FR-007` Self-contained post-migration statistics: Normal Task statistics queries must build hierarchy from token usage ledger fields only, primarily `root_team_run_id` and `execution_address_json`.
- `FR-008` Idempotent migration behavior: The backfill/correction migration must be safe to evaluate on databases with no matching rows, partially migrated rows, or rows already corrected by a previous attempt.
- `FR-009` Migration observability: The app-data migration must record counts for corrected task-team rows, direct member backfills, task-agent backfills, already-addressed rows, skipped standalone rows, skipped insufficient-data rows, and failures.
- `FR-010` Bounded fallback: Rows that cannot be deterministically backfilled must remain visible through the existing no-address fallback, but that fallback must not use old path columns or infer task-team ancestry.
- `FR-011` Fresh install compatibility: A fresh database created after this ticket must pass migrations and produce canonical token usage hierarchy data. If physical legacy columns still exist temporarily, active code must ignore them until a future contract phase removes them.
- `FR-012` Upgrade compatibility: A database created before the original expand migration must upgrade through expand and backfill without data loss, and must not drop legacy columns before all backfill logic has run.
- `FR-013` Aggregate preservation: Backfill and reparenting must not change token/cost math; it may only change which root/task/member row owns the existing events.
- `FR-014` Durable coverage: Tests must cover direct backfill, task-team reparent/backfill, already-addressed rows, unreconstructable fallback, no active old-column hierarchy reads, no new normal Prisma drop-column migration, and migration summary/status recording.

## Acceptance Criteria

- `AC-001` Given a DB with old direct team member rows where `root_team_run_id = rootA`, `member_route_key = Teacher`, and `execution_address_json IS NULL`, after migration those rows have `execution_address_json` with one `member(Teacher)` segment.
- `AC-002` Given a DB with old delegated task-team rows where `root_team_run_id = taskTeamRun1`, `member_route_key = student_one`, and task records map `taskTeamRun1` to root `rootA` with `taskRun.address = member(StudentStudyGroup) -> task_team(taskTeamRun1)`, after migration those token rows have `root_team_run_id = rootA` and address `member(StudentStudyGroup) -> task_team(taskTeamRun1) -> member(student_one)`.
- `AC-003` Given two old task-team run ids for the same logical target, migration keeps them as separate addresses keyed by their distinct task-team run ids.
- `AC-004` Given standalone agent rows with no `root_team_run_id`, migration does not force an execution address and the rows remain visible as standalone agent statistics.
- `AC-005` Given rows already containing a valid `execution_address_json` and correct root, migration leaves them unchanged.
- `AC-006` Given rows with insufficient data to construct a safe address, migration skips them, records the skip reason, and Task statistics still displays them through bounded fallback.
- `AC-007` This ticket introduces no normal Prisma migration that drops `team_run_path_json` or `member_path_json`.
- `AC-008` Code/tests prove active Token Usage runtime/statistics/API/frontend hierarchy paths do not read `team_run_path_json` or `member_path_json`.
- `AC-009` Task statistics for the user's historical Nested Classroom rows no longer shows old task-team child runs as unrelated top-level team rows when matching task delegation records exist.
- `AC-010` Runtime/model grouping totals and total token/cost sums for the same date range are unchanged before/after migration, except for expected hierarchy reparenting in Task grouping.
- `AC-011` Tests verify the migration can run on both a pre-expand schema path and an already-expanded schema path.
- `AC-012` App-data migration status/summary records the number of direct member backfills, task-team corrections, task-agent backfills, already-addressed rows, standalone skips, insufficient-data skips, and failures.

## Constraints / Dependencies

- Prisma schema migrations run before app-data migrations during server startup; therefore this ticket must not use an ordinary Prisma drop-column migration for old path columns.
- App-data migrations are registered in `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` and run via `getAppDataMigrationRunner().runPending()` after `runMigrations()`.
- Historical task-team correction needs persisted task delegation records from the memory directory; this is acceptable only inside the one-time migration, not in normal statistics queries.
- The canonical runtime/statistics model remains `root_team_run_id` + `execution_address_json`.
- Old path columns are not reliable: `team_run_path_json` was unpopulated in the inspected DB and `member_path_json` is local-only.

## Assumptions

- `member_route_key` is present for the majority of historical team rows that can be safely backfilled.
- Task delegation records are available for many old task-team runs that need reparenting.
- Rows that cannot be reconstructed safely are acceptable as explicit fallback rows rather than guessed hierarchy.
- Future physical contract cleanup will be handled in a later ticket or explicitly post-backfill mechanism after this migration has been observed/recorded.

## Risks / Open Questions

- Some old rows may lack task records because memory files were deleted, moved, or never written; those rows must remain fallback.
- If implementation uses SQL JSON functions for simple backfill, verify JSON support in packaged runtime; otherwise prefer TypeScript/app-data JSON serialization.
- Future physical column drop still needs a separate ordered contract design and SQLite/Electron compatibility verification.

## Requirement-To-Use-Case Coverage

| Use Case | Requirements |
| --- | --- |
| Direct member historical rows | `FR-004`, `FR-008`, `FR-009`, `FR-013`, `FR-014` |
| Task-team historical rows | `FR-005`, `FR-007`, `FR-008`, `FR-009`, `FR-013`, `FR-014` |
| Task-agent historical rows | `FR-006`, `FR-007`, `FR-008`, `FR-014` |
| Active old-column non-use | `FR-002`, `FR-003`, `FR-011`, `FR-012`, `FR-014` |
| Safe leftovers/fallback | `FR-010`, `FR-013` |
| Upgrade/fresh install | `FR-001`, `FR-008`, `FR-011`, `FR-012` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| `AC-001` | Verifies simple historical direct-member conversion. |
| `AC-002` | Verifies the old task-team root bug is materially repaired, not merely displayed through fallback. |
| `AC-003` | Protects repeated task-team executions from merging. |
| `AC-004` | Preserves standalone agent semantics. |
| `AC-005` | Verifies idempotency and new-row safety. |
| `AC-006` | Verifies no heuristic/unsafe migration. |
| `AC-007` | Prevents accidental current-ticket Prisma drop-column migration. |
| `AC-008` | Verifies active code ignores old physical columns. |
| `AC-009` | Verifies the user's observed historical UI problem is corrected where data exists. |
| `AC-010` | Protects token/cost math. |
| `AC-011` | Protects upgrade sequencing. |
| `AC-012` | Verifies migration observability. |

## Approval Status

User approved kickoff and architecture review on 2026-07-03. Revised after architecture review round 1 to remove contradictory physical-drop scope from the current ticket.
