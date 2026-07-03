# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — user approved the safer guarded-drop direction on 2026-07-03. Ready for architecture review.

## Goal / Problem Statement

Finish the Token Usage ledger schema contract by physically removing obsolete legacy hierarchy columns from `token_usage_ledger_events`:

- `team_run_path_json`
- `member_path_json`

The preceding tickets already replaced active hierarchy behavior with `root_team_run_id` + `execution_address_json` and added an app-data backfill migration for deterministic historical rows. The current Prisma model no longer has `teamRunPathJson` or `memberPathJson`; however, the physical SQLite table still contains those old columns because no contract migration has dropped them.

This ticket should align the physical database schema with the current Token Usage model without changing runtime token accounting, hierarchy projection, or execution-address backfill behavior. Because SQLite does not support `DROP COLUMN IF EXISTS` and an unconditional drop errors when a local database has already lost a column, the contract cleanup must be guarded: inspect the table schema first, drop only columns that are present, and treat already-absent legacy columns as a successful no-op.

## Investigation Findings

- New worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns`.
- Branch: `codex/token-usage-ledger-drop-legacy-path-columns` tracking `origin/personal`.
- Base: `origin/personal` at `289173a6e4d0f17376c7e2df9c422fbd3f5a4f63`.
- Upstream finalized tickets are present under:
  - `tickets/done/token-statistics-nested-task-runs`
  - `tickets/done/token-statistics-ledger-migration-cleanup`
- Current Prisma model `TokenUsageLedgerEvent` exposes `executionAddressJson` and no longer exposes `teamRunPathJson` or `memberPathJson`.
- Original creation migration still created `team_run_path_json` and `member_path_json`; later migrations never dropped them.
- Current app-data backfill migration `20260703_token_usage_execution_address_backfill` reads only these token row fields: `id`, `usage_event_id`, `run_id`, `root_team_run_id`, `execution_address_json`, `member_route_key`, `task_agent_run_id`, and `task_id`. It does **not** need `team_run_path_json` or `member_path_json`.
- SQLite probe confirmed `ALTER TABLE ... DROP COLUMN IF EXISTS ...` is invalid syntax and `ALTER TABLE ... DROP COLUMN <missing_column>` fails with `no such column`; therefore the safer implementation must perform an explicit schema existence check before issuing each drop.
- Live DB probe showed:
  - old columns still exist physically;
  - backfill migration record succeeded in the local DB;
  - no team-context rows remain without `execution_address_json` in the sampled local DB.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / schema contract migration.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, bounded cleanup issue.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure / Shared Structure Looseness.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Small cleanup needed now.
- Evidence basis: Physical DB schema still contains columns that the current Prisma/domain model and active Token Usage hierarchy no longer own.
- Requirement or scope impact: Add a guarded schema contract cleanup that drops obsolete physical columns only when present while proving the pending/previous backfill path and runtime statistics path do not depend on them.

## Recommendations

- Add a guarded token-usage schema contract cleanup that inspects `PRAGMA table_info(token_usage_ledger_events)` and drops only the legacy columns that are present.
- Prefer a startup/app-data migration style implementation with explicit status/summary recording over an unconditional raw Prisma SQL `DROP COLUMN`, because SQLite has no `DROP COLUMN IF EXISTS` form.
- Register the guarded cleanup after `TokenUsageExecutionAddressBackfillMigration` in startup migration order and make the cleanup fail/skip clearly if the prerequisite backfill record is not in a terminal successful status (`SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS`).
- Do not change `schema.prisma` unless verification shows generated metadata needs adjustment; the model already omits these fields.
- Do not edit already-applied migrations.
- Verify the execution-address backfill migration runs before the guarded cleanup in skipped-version startup order and still does not use the old columns.
- Verify normal Token Statistics queries and token ledger repository behavior still pass with the contracted schema.

## Scope Classification (`Small`/`Medium`/`Large`)

Small-to-Medium.

Rationale: The target code change should be a small guarded schema cleanup plus focused validation, but SQLite migration safety, local-database drift tolerance, and upgrade-path testing matter because this is a persisted user database.

## In-Scope Use Cases

- Fresh database creation reaches a final `token_usage_ledger_events` schema without the old path columns.
- Existing database that already ran the backfill migration can drop any still-present old path columns without losing token/cost data.
- Existing database that has not yet run the execution-address backfill migration runs that backfill first, then the guarded schema cleanup, preserving the industry expand/backfill/contract order.
- Token Statistics Task grouping remains based on `root_team_run_id` + `execution_address_json`.
- Runtime/model grouping, costs, and standalone agent statistics remain unchanged.

## Out of Scope

- Reworking token usage hierarchy, execution address shape, or task statistics tree logic.
- Re-running or redesigning the app-data backfill migration.
- Reading or migrating data from `team_run_path_json` or `member_path_json`.
- Removing unrelated `memberPath` concepts from team communication, run history, frontend workspace trees, or non-token-usage domains.
- Changing token accounting, pricing, cache semantics, or display formatting.

## Functional Requirements

- `FR-001` Physical column removal: `token_usage_ledger_events` must no longer contain physical columns `team_run_path_json` or `member_path_json` after startup migrations/required startup cleanup complete.
- `FR-002` Canonical hierarchy preservation: `root_team_run_id` and `execution_address_json` must remain present and unchanged by the schema contract.
- `FR-003` Data preservation: All token usage rows and token/cost/display/scalar columns other than the two obsolete path columns must be preserved.
- `FR-004` Backfill/contract ordering: `TokenUsageExecutionAddressBackfillMigration` must run before the guarded drop cleanup in required startup migration order, and the cleanup must not proceed unless the backfill record is terminal-successful (`SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS`).
- `FR-005` Runtime compatibility: Token usage repository reads/writes and Token Statistics queries must work against the contracted schema.
- `FR-006` No old-field revival: The Prisma model, token usage domain payloads, GraphQL Token Usage stats surfaces, and frontend Token Statistics code must not reintroduce old path fields.
- `FR-007` Fresh install final schema: A new database migrated from scratch must end with the old columns absent.
- `FR-008` Upgrade final schema: An existing database upgraded through this cleanup must end with the old columns absent, including the case where one or both legacy columns are already absent before the cleanup starts.

## Acceptance Criteria

- `AC-001` After required startup migrations/cleanup, `PRAGMA table_info(token_usage_ledger_events)` does not list `team_run_path_json` or `member_path_json`.
- `AC-002` After migrations, `PRAGMA table_info(token_usage_ledger_events)` still lists `root_team_run_id` and `execution_address_json`.
- `AC-003` A seeded database containing representative token rows retains row count and aggregate token/cost totals after the migration.
- `AC-004` In a skipped-version fixture with no execution-address backfill record, startup required migrations run the backfill before the guarded drop cleanup; final schema is contracted and the cleanup summary records dropped/skipped legacy columns.
- `AC-005` Token Usage Task statistics still returns recursive rows from `execution_address_json`; it does not attempt to read the removed columns.
- `AC-006` Static/code review confirms no Token Usage schema/model/domain/API/frontend hierarchy path reintroduces `teamRunPathJson`, `memberPathJson`, `team_run_path_json`, or `member_path_json`.
- `AC-007` Fresh database migration path succeeds and final schema excludes the old columns.
- `AC-008` Upgrade database cleanup path succeeds from a schema that still has both old columns and from a drifted schema where either old column is already absent.

## Constraints / Dependencies

- Prisma migrations run before app-data migrations during server startup.
- SQLite supports `ALTER TABLE ... DROP COLUMN ...` but not `DROP COLUMN IF EXISTS`; missing-column drops fail. The implementation must therefore guard each drop with a schema existence check instead of relying on unconditional raw SQL.
- Current backfill migration should remain independent of the dropped columns, but the required startup order for this ticket is still expand/backfill/contract: execution-address backfill first, guarded legacy-column cleanup second.
- Do not edit historical migrations that may already be applied in user databases.
- The cleanup must fail loudly for unexpected SQL/data-preservation errors; only already-absent legacy columns are no-op success cases.

## Assumptions

- The backfill migration's current selected column list remains sufficient and does not include the old path columns.
- Current Prisma/SQLite runtime used by packaged Electron supports direct column drops for present columns; if implementation validation disproves this, the guarded cleanup must use a safer table-rebuild fallback that also tolerates already-absent legacy columns.
- No active Token Usage code depends on old path columns because the current Prisma model has already removed them.

## Risks / Open Questions

- Direct `ALTER TABLE DROP COLUMN` compatibility for present columns should be validated against the packaged Prisma/SQLite engine.
- The guard must not swallow broad SQL errors; it should only no-op when a legacy column is already absent.
- If table rebuild is required, the migration must carefully preserve indexes, unique constraints, defaults, and all non-obsolete columns.

## Requirement-To-Use-Case Coverage

| Use Case | Requirements |
| --- | --- |
| Fresh database final schema | `FR-001`, `FR-002`, `FR-003`, `FR-007` |
| Existing DB upgrade / drifted local DB | `FR-001`, `FR-002`, `FR-003`, `FR-008` |
| Backfill still pending / skipped-version upgrade | `FR-004` |
| Runtime/token statistics compatibility | `FR-005`, `FR-006` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| `AC-001` | Verifies physical contract actually happened. |
| `AC-002` | Verifies canonical address model remains. |
| `AC-003` | Verifies no token/cost data loss. |
| `AC-004` | Protects skipped-version upgrade users and enforces expand/backfill/contract ordering. |
| `AC-005` | Verifies runtime stats compatibility. |
| `AC-006` | Guards old-field revival. |
| `AC-007` | Verifies fresh install path. |
| `AC-008` | Verifies normal upgrade and already-absent-column drift paths. |

## Approval Status

Approved by user for architecture review on 2026-07-03 after guarded-drop clarification.
