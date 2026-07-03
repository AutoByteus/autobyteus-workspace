# Design Spec

## Current-State Read

The two upstream Token Statistics tickets established the new canonical hierarchy model:

```text
root_team_run_id + execution_address_json
```

Current active flow:

```text
runtime token event -> TokenUsageContextEnricher -> TokenUsageLedgerRepository.executionAddressJson -> TokenUsageStatisticsProvider -> TokenUsageTaskStatisticsTreeBuilder -> recursive Task statistics rows
```

Current state on latest `origin/personal`:

- `schema.prisma` no longer contains `teamRunPathJson` or `memberPathJson` on `TokenUsageLedgerEvent`.
- `TokenUsageLedgerRepository` writes/reads `executionAddressJson` and does not map the old path fields.
- `TokenUsageExecutionAddressBackfillMigration` is registered and does not read old physical path columns.
- The original table creation migration still created `team_run_path_json` and `member_path_json`, and no later migration drops them.
- Therefore fresh and upgraded databases still physically carry obsolete columns even though the active model ignores them.

This ticket is the delayed **contract phase** of the previous expand/backfill/contract plan.

## Intended Change

Add a guarded schema contract cleanup that physically removes the obsolete Token Usage ledger columns only when they are present:

```text
team_run_path_json
member_path_json
```

The canonical schema keeps:

```text
root_team_run_id
execution_address_json
member_agent_run_id
member_route_key
task_agent_instance_id
task_agent_run_id
task_id
...all token/cost/display fields...
```

No runtime hierarchy, API, or frontend behavior should change. The cleanup must not use an unconditional `ALTER TABLE ... DROP COLUMN` because SQLite has no `DROP COLUMN IF EXISTS` syntax and a missing-column drop fails; it must inspect schema first and treat already-absent legacy columns as a no-op success.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / schema contract migration.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, bounded schema debt.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure / Shared Structure Looseness.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, a small physical schema contract migration is needed.
- Evidence: Active Prisma/domain/statistics code no longer owns the old fields, but the physical table still includes them.
- Design response: Add a focused guarded schema cleanup that removes only the two obsolete columns when present; verify data preservation, backfill compatibility, drifted-schema no-op behavior, and runtime statistics compatibility.
- Refactor rationale: Keeping unused physical hierarchy columns preserves a parallel representation that the current model intentionally replaced.
- Intentional deferrals and residual risk, if any: No further hierarchy cleanup in this ticket. Non-token domains may still use member paths legitimately and are out of scope.

## Terminology

- **Contract migration**: the physical schema cleanup after expand/backfill have made the old representation unnecessary.
- **Obsolete path columns**: `team_run_path_json` and `member_path_json` in `token_usage_ledger_events`.
- **Canonical hierarchy columns**: `root_team_run_id` and `execution_address_json`.
- **Skipped-version upgrade**: a user upgrading from a version before the backfill app-data migration directly to this version. Prisma migrations run first, then required app-data/startup migrations run in registry order.
- **Guarded drop**: read `PRAGMA table_info(token_usage_ledger_events)`, issue `ALTER TABLE ... DROP COLUMN` only for legacy columns listed by the pragma, and treat an already-absent legacy column as a successful no-op. Do not swallow unrelated SQL failures.
- **Expand/backfill/contract order**: the new guarded drop migration is registered after `TokenUsageExecutionAddressBackfillMigration` and verifies that migration has a terminal-success record before DDL.

## Design Reading Order

1. Schema contract spine.
2. Backfill compatibility spine.
3. Runtime statistics compatibility.
4. File responsibilities and validation.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: physically remove `team_run_path_json` and `member_path_json` from `token_usage_ledger_events`.
- Required action: do not revive old fields in Prisma model, domain payloads, GraphQL Token Usage stats, or frontend Token Statistics types.
- Required action: verify app-data backfill does not depend on the removed columns.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Server startup after Prisma migrate deploy | Contracted token ledger physical schema | App-data migration runner + guarded token-usage schema cleanup | Actually removes the obsolete columns after the execution-address backfill has reached terminal success, while tolerating already-absent legacy columns. |
| DS-002 | Primary End-to-End | Pending execution-address backfill before schema contract | Backfilled/corrected token rows | App-data migration runner + backfill migration | Protects skipped-version users by preserving expand/backfill/contract order. |
| DS-003 | Primary End-to-End | Token Statistics API request | Recursive Task statistics rows | Token Usage statistics provider | Verifies runtime behavior remains self-contained and unchanged. |
| DS-004 | Bounded Local | Migration test DB | Final table/row/index verification | Migration tests | Ensures data and indexes survive the contract. |

## Primary Execution Spine(s)

- DS-001: `Server startup -> Prisma migrate deploy -> AppDataMigrationRunner.runPending() -> TokenUsageExecutionAddressBackfillMigration terminal success -> guarded token ledger schema cleanup -> PRAGMA table_info -> drop present legacy columns -> token_usage_ledger_events without team_run_path_json/member_path_json`
- DS-002: `Server startup -> AppDataMigrationRunner.runPending() -> TokenUsageExecutionAddressBackfillMigration -> reads remaining scalar/address columns -> updates execution_address_json/root_team_run_id -> app_data_migration_records terminal success`
- DS-003: `GraphQL tokenUsageTaskStatisticsInPeriod -> TokenUsageStatisticsProvider -> TokenUsageLedgerRepository -> TokenUsageTaskStatisticsTreeBuilder -> recursive rows`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Guarded cleanup contracts the physical token ledger table by removing only present obsolete path columns while preserving every other column and index. | Guarded schema cleanup, token ledger table | Startup/app-data migration system | SQLite drop-column support, PRAGMA existence guard, prerequisite backfill record check, table rebuild fallback only if direct drop unsupported. |
| DS-002 | If a user has not yet run the app-data backfill, it runs before the schema contract cleanup and materializes deterministic execution addresses. | AppDataMigrationRunner, TokenUsageExecutionAddressBackfillMigration | App-data migration runner + Token Usage migration | Skipped-version upgrade fixture. |
| DS-003 | Normal statistics queries remain unchanged and read canonical token ledger data only. | TokenUsageStatisticsProvider, TokenUsageTaskStatisticsTreeBuilder | Token Usage statistics provider | Aggregate preservation, no old-field access. |
| DS-004 | Tests assert final physical schema, row counts, aggregate totals, and index presence. | Migration test/probe | Test suite | Prevent silent data loss. |

## Spine Actors / Main-Line Nodes

- New guarded token-usage schema cleanup: physical schema owner for this contract.
- `token_usage_ledger_events`: persisted token ledger table.
- `TokenUsageExecutionAddressBackfillMigration`: must remain compatible after contract.
- `TokenUsageLedgerRepository`: active persistence mapper, already independent of old fields.
- `TokenUsageStatisticsProvider` / `TokenUsageTaskStatisticsTreeBuilder`: active query path, already independent of old fields.

## Ownership Map

| Node | Owns |
| --- | --- |
| New guarded schema cleanup | Physical removal of obsolete columns after execution-address backfill terminal success, preserving the table's remaining contract and no-oping already-absent legacy columns. |
| Backfill migration | Historical execution-address materialization using remaining scalar/address columns. |
| Token Usage repository | Runtime SQL/Prisma row mapping for current model. |
| Token Usage statistics provider | Query-time hierarchy projection from canonical ledger data. |
| Tests | Verification across fresh install, existing upgrade, and pending-backfill upgrade paths. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `runMigrations()` | Prisma migration system | Startup deterministic schema migration entrypoint. | Guarded legacy-column cleanup logic unless that cleanup is explicitly wired after Prisma. |
| `AppDataMigrationRunner.runPending()` | App-data/startup migration definitions | Startup one-time guarded corrections with status records and ordered backfill-before-contract execution. | Token statistics runtime query behavior. |
| GraphQL Token Usage stats resolver | `TokenUsageStatisticsProvider` | API transport. | Any fallback read of removed columns. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `token_usage_ledger_events.team_run_path_json` physical column | Obsolete, unpopulated/incomplete, not in current Prisma model. | `root_team_run_id` + `execution_address_json`. | In This Change | Drop only if present. |
| `token_usage_ledger_events.member_path_json` physical column | Obsolete local-only path, not in current Prisma model. | `execution_address_json` member segments + scalar route/display fields. | In This Change | Drop only if present. |
| Any old-field assumptions in tests/docs for Token Usage schema | Would preserve a removed representation. | Contracted schema assertions. | In This Change | Only token usage schema/docs/tests in scope. |

## Return Or Event Spine(s) (If Applicable)

No runtime event spine changes are required. The meaningful return path is verification:

```text
migration execution -> schema probe/test -> pass/fail evidence
```

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: guarded token-usage schema cleanup
  - Chain: `existing ledger table -> verify execution-address backfill terminal-success record -> PRAGMA table_info -> drop each present legacy column -> skip already-absent legacy columns -> preserve remaining columns/indexes -> cleanup recorded or no-oped`
  - Why it matters: This is a persisted DB contract change.

- Parent owner: migration/backfill compatibility test
  - Chain: `seed old-schema DB -> run Prisma migrations -> run pending execution-address backfill -> run guarded schema cleanup -> verify execution_address_json/backfill summary and final schema`
  - Why it matters: Users can skip versions, so app-data backfill may still be pending when this contract cleanup is introduced.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| SQLite drop strategy | DS-001 | Guarded schema cleanup | Verify prerequisite backfill status, check column existence, then choose direct `ALTER TABLE DROP COLUMN` for present columns or table rebuild fallback. | Must work in packaged runtime and drifted local DBs. | Startup migration failure. |
| Data preservation checks | DS-001, DS-004 | Tests | Verify row counts/totals. | Dropping columns must not alter accounting. | Silent data loss. |
| Backfill compatibility fixture | DS-002 | Tests | Prove pending app-data backfill runs before guarded drop and cleanup verifies the terminal-success record. | Protect skipped-version upgrades. | Users who skipped prior version fail migration/backfill. |
| Runtime stats smoke | DS-003 | Tests | Verify query path after contract. | Ensure removed columns were not hidden dependencies. | Runtime regression. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Guarded physical schema cleanup | App-data/startup migration system plus Prisma raw SQL | Extend | Existing startup/app-data migration system already owns one-time local corrective migrations with status records; the guard is needed because Prisma SQL migrations cannot express SQLite `DROP COLUMN IF EXISTS`. | N/A |
| Historical data correction | Existing backfill app-data migration | Reuse/verify | Already implemented and independent of old columns. | N/A |
| Token stats query | Existing Token Usage statistics provider | Keep | No behavior change needed. | N/A |
| Migration validation | Existing test infrastructure | Extend | Need focused schema/backfill compatibility tests. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Startup/app-data migration system | Guarded physical table contract cleanup. | DS-001 | Token Usage persistence | Extend | Main change; should record summary and no-op already-absent columns. |
| App-data migrations | Backfill compatibility after contract. | DS-002 | Token Usage migration | Reuse/verify | No code change expected unless tests expose dependency. |
| Token Usage persistence/statistics | Runtime compatibility. | DS-003 | API/UI | Keep | No old fields. |
| Test suite | Schema/data/query verification. | DS-004 | Delivery confidence | Extend | Must include upgrade path. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/app-data-migrations/migrations/<token usage legacy path column drop migration>.ts` or equivalent guarded startup cleanup module | App-data/startup migrations | Guarded cleanup | Verify execution-address backfill terminal success, inspect schema, drop present obsolete columns, record/no-op already-absent columns. | Conditional SQLite DDL belongs in TypeScript-guarded startup code, not unconditional raw migration SQL. | N/A |
| Migration/backfill compatibility test file under server test suite | Tests | Migration validation | Seed old schema, run backfill, run guarded cleanup, assert schema/data. | Focused coverage for this contract. | Existing migration/backfill code. |
| Existing backfill migration file | App-data migrations | Data migration | Should remain unchanged unless tests reveal a hidden dependency. | Already correct. | Token address domain. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Full token ledger column list for table rebuild, if needed | Cleanup implementation/test fixture only | Guarded schema cleanup | Only needed if direct drop is unsafe. | Yes | Yes | Runtime schema duplicator. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `root_team_run_id` | Yes | Yes | Low | Keep. |
| `execution_address_json` | Yes | Yes | Low | Keep. |
| `team_run_path_json` | No longer active | No | High if kept | Drop. |
| `member_path_json` | No longer active | No | High if kept | Drop. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/app-data-migrations/migrations/<token usage legacy path column drop migration>.ts` or equivalent guarded startup cleanup module | App-data/startup migrations | Guarded cleanup | Confirm backfill terminal success, remove `team_run_path_json` and `member_path_json` only when present, summarize dropped/skipped columns. | Single physical contract change with SQLite guard. | N/A |
| Test file(s) selected by implementation | Tests | Migration/runtime validation | Verify fresh install, upgrade, pending-backfill compatibility, and runtime stats. | Coverage responsibility. | Existing fixtures/helpers. |

## Ownership Boundaries

- Prisma migrations own deterministic schema history. This ticket intentionally uses a guarded startup/app-data-style cleanup for the physical drop because SQLite cannot express `DROP COLUMN IF EXISTS` in raw migration SQL and local app databases can be drifted. To preserve migration order, register the cleanup after the execution-address backfill and add an explicit prerequisite status check.
- App-data migration owns historical data correction. It must remain valid after physical cleanup.
- Token Usage statistics provider owns query behavior. It should remain untouched except for test coverage if needed.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Guarded token-usage schema cleanup | Conditional SQL/table contract cleanup. | Server startup after Prisma migrations. | Runtime statistics query attempting to handle old columns. | Keep conditional DDL in the cleanup boundary. |
| App-data migration runner | Historical data migrations/status. | Server startup. | Prisma migration trying to do task-record backfill. | Keep data migration in app-data subsystem. |
| Token Usage statistics provider | Ledger query/tree projection. | GraphQL resolver. | Query-time use of removed columns. | Use canonical fields only. |

## Dependency Rules

Allowed:

- Guarded startup/app-data-style cleanup may inspect `token_usage_ledger_events` with `PRAGMA table_info` and alter the table to drop present legacy columns after the execution-address backfill migration is terminal-successful.
- Tests may inspect SQLite schema with `PRAGMA table_info`.
- Tests may run/instantiate the existing backfill migration before schema contract and verify the guarded cleanup refuses to proceed when the prerequisite record is failed/missing.

Forbidden:

- Do not edit already-applied historical migrations.
- Do not add an unconditional raw `ALTER TABLE ... DROP COLUMN ...` migration that fails when a legacy column is already absent.
- Do not reintroduce `teamRunPathJson` / `memberPathJson` in Prisma schema.
- Do not change active Token Usage hierarchy logic to read old path columns before dropping them.
- Do not swallow broad DDL errors; only already-absent legacy columns are no-op success cases.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| Guarded schema cleanup execute method | Token ledger physical schema | Drop obsolete columns only when present. | Table name + fixed legacy column names. | No runtime API. |
| `TokenUsageExecutionAddressBackfillMigration.execute()` | Historical data correction | Continue to run after contract. | Existing DB rows + task records. | No old columns. |
| `tokenUsageTaskStatisticsInPeriod` | Runtime statistics | Return recursive rows. | Date range. | No behavior change. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Guarded schema cleanup | Yes | Yes | Low | Keep as two-column contract with PRAGMA guard. |
| Backfill migration | Yes | Yes | Low | Verify only. |
| Token stats query | Yes | Yes | Low | Keep unchanged. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Migration | `drop_token_usage_legacy_path_columns` | Yes | Low | Use explicit legacy path wording. |
| Columns | `team_run_path_json`, `member_path_json` | Historical names | Low | Remove from final schema. |

## Applied Patterns (If Any)

- **Guarded schema cleanup**: startup/app-data-style migration for physical database contract where conditional SQLite DDL is required.
- **Compatibility test**: pending app-data backfill before guarded schema contract protects skipped-version upgrade path.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/app-data-migrations/migrations/<token usage legacy path column drop migration>.ts` or equivalent guarded startup cleanup module | File | Guarded schema cleanup | Check execution-address backfill terminal success, drop obsolete token usage ledger columns only when present, and record dropped/skipped columns. | Existing startup app-data migration framework can express conditional logic, prerequisite checks, and status records; exact placement should preserve the schema-cleanup boundary. | Runtime token statistics logic. |
| Server test file(s) chosen by implementation | File | Tests | Validate schema/data/backfill/query compatibility. | Existing test suite should own evidence. | Production migration logic outside fixtures. |

## Migration Strategy

Preferred strategy: guarded direct drop.

1. Verify `20260703_token_usage_execution_address_backfill` has terminal-success status (`SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS`) before DDL.
2. Read `PRAGMA table_info(token_usage_ledger_events)`.
3. For each fixed legacy column in [`team_run_path_json`, `member_path_json`]:
   - if present, execute `ALTER TABLE "token_usage_ledger_events" DROP COLUMN "<column>"`;
   - if absent, record it as skipped/no-op, not as a failure.
4. Re-read `PRAGMA table_info(token_usage_ledger_events)` and fail if either legacy column remains.
5. Record a summary with prerequisite status, dropped columns, skipped already-absent columns, and final schema status.

Reason: SQLite supports direct `DROP COLUMN` in modern versions but does not support `DROP COLUMN IF EXISTS`; dropping a missing column fails. The implementation must therefore guard before DDL instead of relying on unconditional raw SQL.

Fallback only if direct drop for present columns is not supported in the packaged Prisma/SQLite runtime: use a guarded table-rebuild cleanup that:

1. creates a new table with all current non-obsolete columns;
2. copies all rows and all non-obsolete data without referencing old columns;
3. recreates unique constraints and indexes;
4. swaps the table names;
5. verifies final schema excludes only the two obsolete columns.

Do not edit the original creation migration.

## Validation / Coverage Plan

- Schema verification:
  - final `PRAGMA table_info(token_usage_ledger_events)` excludes `team_run_path_json` and `member_path_json`;
  - guarded cleanup test covers both columns present, one column already absent, and both columns already absent;
  - final schema includes `root_team_run_id` and `execution_address_json`.
- Data preservation:
  - representative seeded row count unchanged;
  - token/cost aggregate totals unchanged;
  - unique/index constraints remain present.
- Backfill/contract compatibility:
  - run `TokenUsageExecutionAddressBackfillMigration` before the guarded cleanup in a skipped-version fixture with no app-data migration records;
  - verify it can backfill/correct rows using remaining fields only;
  - verify guarded cleanup does not read old-column data;
  - verify guarded cleanup refuses/fails clearly if the prerequisite backfill record is missing or failed.
- Runtime compatibility:
  - token usage repository write/read smoke passes;
  - Task statistics recursive query/tree smoke passes.
- Static/source check:
  - no active Token Usage schema/model/domain/API/frontend hierarchy path reintroduces old fields.

## Examples

### Good final schema shape

```text
token_usage_ledger_events
  root_team_run_id
  execution_address_json
  member_agent_run_id
  member_route_key
  task_agent_run_id
  task_id
  token/cost/display fields
```

### Bad shape rejected

```text
token_usage_ledger_events
  root_team_run_id
  team_run_path_json
  member_path_json
  execution_address_json
```

The old path fields are no longer authoritative and should not remain physically present after this contract ticket.

## Implementation Notes / Non-Goals

- Do not change Token Usage statistics tree behavior unless tests reveal a hidden dependency.
- Do not change the execution-address backfill migration unless tests reveal it depends on dropped columns.
- Do not remove path/member fields from unrelated team communication, run history, workspace display, or frontend tree domains.
