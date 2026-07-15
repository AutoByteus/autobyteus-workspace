# Design Spec

## Current-State Read

The finalized `token-statistics-nested-task-runs` work is merged into `origin/personal`. It completed the runtime/API/UI **expand** path for new rows:

`team/task runtime -> TokenUsageContextEnricher -> TokenUsageLedgerRepository.execution_address_json -> TokenUsageTaskStatisticsTreeBuilder -> recursive GraphQL children -> frontend table`

Current facts from the follow-up investigation:

- `autobyteus-server-ts/prisma/schema.prisma` no longer exposes `teamRunPathJson` or `memberPathJson` on `TokenUsageLedgerEvent`.
- The applied Prisma migration only added `execution_address_json`; it did not backfill historical data.
- The live DB still physically contains `team_run_path_json` and `member_path_json`; active Prisma/domain/statistics code ignores them.
- Most historical rows in the live DB still have `execution_address_json = NULL`.
- The UI still displays old rows because `TokenUsageTaskStatisticsTreeBuilder` has a no-address fallback keyed by scalar fields, not because it reads old path columns.
- Task delegation records now persist `taskRun.address`, which can map old child task-team run ids back to root-team-relative address prefixes.

The target design for this ticket must finish the **backfill phase** only. It must not add a normal Prisma drop-column migration, because this application runs Prisma migrations before app-data migrations. Physical removal of legacy columns is a future/post-backfill contract phase.

Normal Token Statistics must remain self-contained in token usage ledger data. Task records may be used once during migration to write missing addresses into the ledger; they must not become query-time hierarchy authority.

## Intended Change

Add a registered app-data migration that materializes `execution_address_json` for deterministic historical token rows using:

- token usage scalar fields that remain in the ledger (`root_team_run_id`, `member_route_key`, `task_agent_run_id`, `task_id`, etc.);
- task delegation records only as one-time migration input for old task-team child rows.

Also add active-code non-use proof:

- no Token Usage runtime/statistics/API/frontend hierarchy path reads `team_run_path_json` or `member_path_json`;
- no normal Prisma drop-column migration is added in this ticket;
- normal statistics queries use token ledger data only.

Explicit non-change in this ticket:

```text
Do not physically drop team_run_path_json or member_path_json here.
```

That physical cleanup belongs to a future/post-backfill contract ticket after the app-data migration has completed and been observed.

Target historical direct member example:

```json
{
  "root_team_run_id": "nested_classroom_root",
  "execution_address_json": {
    "segments": [
      { "kind": "member", "memberRouteKey": "Teacher" }
    ]
  }
}
```

Target historical task-team correction example:

Before:

```json
{
  "root_team_run_id": "studentstudygroup_e049...",
  "member_route_key": "student_one",
  "execution_address_json": null
}
```

Task record migration input:

```json
{
  "teamRunId": "nested_classroom_root",
  "taskRun": {
    "address": {
      "segments": [
        { "kind": "member", "memberRouteKey": "StudentStudyGroup" },
        { "kind": "task_team", "taskTeamRunId": "studentstudygroup_e049..." }
      ]
    }
  }
}
```

After:

```json
{
  "root_team_run_id": "nested_classroom_root",
  "execution_address_json": {
    "segments": [
      { "kind": "member", "memberRouteKey": "StudentStudyGroup" },
      { "kind": "task_team", "taskTeamRunId": "studentstudygroup_e049..." },
      { "kind": "member", "memberRouteKey": "student_one" }
    ]
  }
}
```

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Data Migration / Cleanup.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure and Missing Invariant.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, bounded to app-data migration/backfill and active-code non-use proof.
- Evidence: Existing runtime code writes canonical addresses for new rows, but historical rows remain mostly null-address. The DB contains old physical columns, but active Prisma/domain/statistics code already ignores them.
- Design response: Add a one-time app-data backfill/correction migration now. Do not add a normal Prisma drop-column migration in this ticket. Keep normal query-time hierarchy self-contained in token usage ledger data.
- Refactor rationale: Leaving deterministic historical rows without `execution_address_json` keeps the system in a half-expanded data state. Backfilling those rows makes the ledger self-contained for historical statistics where safe.
- Intentional deferrals and residual risk, if any: Physical removal of `team_run_path_json` and `member_path_json` is deferred to a future/post-backfill contract phase. Rows without enough deterministic migration input remain fallback rows.

## Terminology

- **Expand phase**: the already-merged original ticket that added `execution_address_json` and new runtime/API/UI behavior.
- **Backfill phase**: this ticket's one-time app-data migration that writes missing execution addresses for historical rows.
- **Future contract phase**: a later/post-backfill schema cleanup that physically removes obsolete path columns. It is not this ticket's implementation scope.
- **Canonical token execution address**: token-usage-owned JSON address stored in `execution_address_json` with typed ordered segments.
- **Task record migration input**: task delegation records used only during migration to materialize missing ledger addresses.

## Design Reading Order

1. Backfill data-flow spine.
2. Backfill classification rules.
3. Active-code non-use proof.
4. File responsibilities and dependency boundaries.
5. Validation and coverage.
6. Future contract note.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required current-ticket action: remove/decommission old path columns as active runtime/query authority by proving no Token Usage hierarchy path reads them.
- Required current-ticket action: do not add any new active reader of old path columns.
- Required current-ticket action: do not let Task statistics query task records to repair hierarchy at read time.
- Deferred action: physically remove `team_run_path_json` and `member_path_json` in a future/post-backfill contract phase.
- Allowed bounded exception: no-address fallback may remain for unreconstructable rows, but it uses only remaining scalar token ledger fields and does not guess task-team ancestry.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Server startup app-data migration | Backfilled/corrected token ledger rows | App-data migration runner + Token Usage migration | Materializes historical execution addresses without dropping old physical columns first. |
| DS-002 | Primary End-to-End | Token Statistics API request | Recursive Task statistics rows | Token Usage statistics provider | Verifies normal query path remains self-contained after migration. |
| DS-003 | Bounded Local | Token row + task-team run index | Target root/address decision | Backfill classifier | Prevents unsafe heuristics and ensures deterministic updates only. |
| DS-004 | Bounded Local | Runtime source/API/test scan | Old-column non-use proof | Token Usage implementation/tests | Ensures old physical columns, while temporarily present, are ignored by active hierarchy code. |

## Primary Execution Spine(s)

- DS-001: `Server startup -> AppDataMigrationRunner.runPending() -> TokenUsageExecutionAddressBackfillMigration -> task-team run index + token row scan -> batched SQL updates -> app_data_migration_records summary`
- DS-002: `GraphQL tokenUsageTaskStatisticsInPeriod -> TokenUsageStatisticsProvider -> TokenUsageLedgerRepository -> TokenUsageTaskStatisticsTreeBuilder -> recursive children rows -> frontend display`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Startup runs registered app-data migrations after schema expand has added `execution_address_json`. The new migration builds a task-team run index from task records, scans token rows, computes deterministic target root/address values, updates changed rows, and records a summary. | AppDataMigrationRunner, TokenUsageExecutionAddressBackfillMigration, token ledger rows, task records | App-data migration + Token Usage | Batching, idempotency, skip reasons, summary counts. |
| DS-002 | Normal statistics requests read token ledger data only. Addressed rows build the recursive hierarchy; unreconstructable no-address rows remain fallback. No task records are queried. | TokenUsageStatisticsProvider, TokenUsageTaskStatisticsTreeBuilder, GraphQL resolver, frontend table | Token Usage statistics provider | Aggregate preservation, fallback visibility. |
| DS-003 | Inside the migration, each candidate row is classified as task-team correction, task-agent backfill, direct member backfill, already-addressed, standalone skip, or insufficient-data skip. | Backfill classifier, task-team run index, address builder | Token Usage migration | Deterministic rule order. |
| DS-004 | Tests/code checks prove this ticket does not reintroduce old path columns as active hierarchy authority and does not add a normal Prisma drop-column migration. | Source checks, migration tests, API tests | Token Usage implementation/tests | Future contract remains deferred. |

## Spine Actors / Main-Line Nodes

- `AppDataMigrationRunner`: existing startup entrypoint for app-data migrations.
- `TokenUsageExecutionAddressBackfillMigration`: new one-time migration owner.
- Task-team run index: migration-local map from `taskTeamRunId` to root team and address prefix.
- Token ledger row scanner/updater: migration-local raw SQL/Prisma access for rows to backfill/correct.
- `TokenUsageTaskStatisticsTreeBuilder`: existing normal query projection; remains self-contained.
- Active-code non-use checks/tests: ensure no hierarchy path reads old physical columns.

## Ownership Map

| Node | Owns |
| --- | --- |
| `TokenUsageExecutionAddressBackfillMigration` | One-time historical materialization of canonical execution addresses. |
| Task-team run index | Migration-only lookup from persisted task records to task-team address prefixes. |
| Backfill classifier | Deterministic row classification and target address construction. |
| Token ledger updater | Batched, idempotent SQL updates and summary counts. |
| `TokenUsageStatisticsProvider` | Runtime statistics use-case boundary; no migration-specific task-record dependency. |
| Active-code non-use tests/checks | Guard that old physical columns are not active hierarchy authority. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AppDataMigrationRunner.runPending()` | Individual migration definitions | Startup runner and status recording. | Token-specific address construction policy. |
| GraphQL `tokenUsageTaskStatisticsInPeriod` | `TokenUsageStatisticsProvider` | Transport boundary for settings UI. | Backfill or task-record lookup. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Active hierarchy authority of `team_run_path_json` | Unpopulated/incomplete and no longer in Prisma/domain model. | `execution_address_json` plus `root_team_run_id`. | In This Change | Prove active code does not read it; do not physically drop it here. |
| Active hierarchy authority of `member_path_json` | Local-only and no longer in Prisma/domain model. | `execution_address_json` member segments plus scalar `member_route_key` for display/filter. | In This Change | Prove active code does not read it; do not physically drop it here. |
| Historical direct-member no-address rows | Half-migrated data state. | App-data backfill writes `member(memberRouteKey)`. | In This Change | Data-state decommission, not schema drop. |
| Historical child-task-team root rows | Incorrect old attribution state. | App-data correction writes root team id + task-team-prefixed address. | In This Change | Correct where task records exist. |
| Physical `team_run_path_json` / `member_path_json` columns | Obsolete physical schema after backfill is complete. | Future contract migration/cleanup. | Follow-up | Not current implementation scope. |

## Return Or Event Spine(s) (If Applicable)

Migration status return path:

`TokenUsageExecutionAddressBackfillMigration summary -> AppDataMigrationRunner -> app_data_migration_records -> App-data migration GraphQL/status UI`

This gives the user/operator evidence of how many rows were changed, skipped, already addressed, or failed.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `TokenUsageExecutionAddressBackfillMigration`
  - Chain: `scan task_delegation_records.json -> build taskTeamRunId index -> scan token rows -> classify row -> build target address -> update if changed -> record count/detail`
  - Why it matters: This is the safety boundary that prevents heuristic hierarchy reconstruction.

- Parent owner: active-code non-use proof
  - Chain: `source/test scan -> assert no Token Usage hierarchy read of old path columns -> assert no normal Prisma drop-column migration -> API/statistics coverage remains ledger-only`
  - Why it matters: Old physical columns may remain temporarily, so correctness depends on active code ignoring them.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Task record scanning | DS-001 | Backfill migration | Build task-team run index from files. | Needed only for historical repair. | If placed in statistics provider, violates self-contained query boundary. |
| Address normalization/serialization | DS-001, DS-003 | Backfill classifier | Produce canonical `execution_address_json`. | Avoid malformed JSON/address rows. | Duplicated ad-hoc address JSON. |
| Batching/transactions | DS-001 | Ledger updater | Avoid long locks and partial inconsistent writes. | Local SQLite DB can be large. | Startup stalls or half-updated rows. |
| Migration summary | DS-001 | App-data migration runner | Count updates/skips/failures. | User needs evidence migration worked. | Hard-to-debug silent data changes. |
| Fallback display | DS-002 | Statistics tree builder | Keep unconvertible rows visible. | Some old rows cannot be safely migrated. | Heuristic reparenting or hidden usage. |
| Old-column non-use check | DS-004 | Implementation/tests | Prevent reintroducing old path hierarchy authority. | Physical columns remain until future contract. | Hidden legacy dependence. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| App-data migration execution/status | `app-data-migrations` | Extend | Existing runner records status and summaries. | N/A |
| Address shape/normalization | `token-usage/domain/execution-address.ts` | Reuse | Canonical token address type already exists. | N/A |
| Task delegation records | `agent-team-execution/task-delegation` record shape/store | Reuse as input | Records contain task-run addresses. | Not a runtime statistics dependency. |
| Runtime statistics tree | `TokenUsageTaskStatisticsTreeBuilder` | Keep/extend minimally | Already correct for addressed rows. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| App-data migrations | One-time historical data correction. | DS-001, DS-003 | Token Usage migration | Extend | Add token-specific migration definition. |
| Token Usage domain | Address type and canonical JSON shape. | DS-001, DS-002 | Token Usage | Reuse | Avoid duplicate address formats. |
| Task Delegation records | Historical task-team address source. | DS-001 | Migration only | Reuse as read-only input | No query-time dependency. |
| Token Usage statistics provider | Normal query projection. | DS-002 | API/UI | Keep | Should not know about task records. |
| Tests/source checks | Active old-column non-use proof. | DS-004 | Implementation/review | Extend | Guards temporary physical-column retention. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-execution-address-backfill-migration.ts` | App-data migrations | Migration definition | Scan task records, classify token rows, update addresses/root ids, emit summary. | One cohesive one-time data correction owner. | Token address domain, task record types. |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | App-data migrations | Registry | Register migration. | Existing registry owner. | N/A |
| `autobyteus-server-ts/src/app-data-migrations/migrations/__tests__/token-usage-execution-address-backfill-migration.test.ts` | Tests | Migration coverage | Backfill/correction/idempotency/summary tests. | Focused migration tests. | Test fixtures. |
| `autobyteus-server-ts/src/token-usage/providers/task-statistics-tree-builder.ts` | Token Usage statistics | Runtime query | Optional small fallback label/quality guard only if tests require. | Existing owner for fallback rows. | Existing models. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Canonical execution address serialization | Existing `token-usage/domain/execution-address.ts` | Token Usage | Needed by runtime, repository, statistics, and migration. | Yes | Yes | A generic task-record address kitchen sink. |
| Backfill row classification | Keep internal to migration file unless tests justify extraction. | App-data migration | Single-use policy. | Yes | Yes | A shared runtime helper used by statistics queries. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `execution_address_json` | Yes | Yes | Low | Keep as sole hierarchy address. |
| `root_team_run_id` | Yes | Yes | Low | Keep as root grouping/index key. |
| `member_route_key` | Yes | N/A | Medium if treated as hierarchy alone | Use as display/filter/backfill input, not competing parentage authority. |
| Task record `taskRun.address` | Yes in task subsystem | N/A | Medium if queried at runtime | Use only inside migration. |
| Physical old path columns | No longer active authority | N/A | Low if ignored | Do not read in active hierarchy code; future contract removes physically. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-execution-address-backfill-migration.ts` | App-data migrations | Migration definition | Historical token row backfill/correction and summary. | One migration owner with bounded internal helpers. | `TokenUsageExecutionAddress`; task record types. |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | App-data migrations | Registry | Include the new migration after existing address/task record migrations that establish task record shape. | Existing registration point. | N/A |
| `autobyteus-server-ts/src/app-data-migrations/migrations/__tests__/token-usage-execution-address-backfill-migration.test.ts` | Test suite | Migration tests | Verify direct, task-team, task-agent, skip, idempotency, no-drop behavior, summary. | Focused coverage. | Fixture address builders. |
| `autobyteus-server-ts/src/token-usage/providers/task-statistics-tree-builder.ts` | Token Usage statistics | Runtime query projection | Keep no-address fallback bounded; no task-record lookup. | Existing runtime query owner. | Existing address parser. |

## Ownership Boundaries

- App-data migration owns one-time historical correction. It may depend on task records as migration input because it writes the result into token usage rows.
- Token Usage statistics provider owns query-time hierarchy projection. It must depend only on token usage ledger rows and token usage address parsing.
- Frontend owns display only; no hierarchy reconstruction or migration logic.
- Future physical schema cleanup is outside this ticket; current implementation must not add a normal Prisma drop-column migration.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TokenUsageStatisticsProvider` | Ledger query, address parsing, tree builder, fallback grouping. | GraphQL resolver. | GraphQL/frontend querying task records to complete hierarchy. | Extend provider result model, not frontend reconstruction. |
| `AppDataMigrationRunner` | Migration status, duplicate-run guard, summary persistence. | Server startup and app-data GraphQL mutation. | Ad-hoc startup script outside migration records. | Add migration definition and summary. |

## Dependency Rules

Allowed:

- New app-data migration may read task delegation records and token ledger rows.
- New app-data migration may reuse token usage execution address normalizers/builders.
- Statistics provider may read token ledger rows and parse `execution_address_json`.

Forbidden:

- Statistics provider, GraphQL resolver, or frontend must not query task delegation records to reconstruct hierarchy.
- Active runtime/statistics code must not use `team_run_path_json` or `member_path_json` as hierarchy authority.
- This ticket must not add a normal Prisma migration that drops `team_run_path_json` or `member_path_json`.
- New runtime code must not reintroduce `team_run_path` / `member_path` token hierarchy payloads.
- Frontend must not reconstruct parent/child relationships from display names, timestamps, or task records.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AppDataMigrationDefinition.execute()` for new migration | Token usage historical data correction | Run once and report summary. | No public input; uses configured memory dir and DB. | Idempotent and restart-safe. |
| Raw token row scan/update inside migration | Token ledger rows | Fetch/update migration candidate rows. | Row `id`, `root_team_run_id`, scalar member/task fields, `execution_address_json`. | Internal only. |
| `tokenUsageTaskStatisticsInPeriod` | Runtime statistics | Return recursive rows. | Date range. | No task-record dependency. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| New app-data migration | Yes | Yes | Low | Keep migration-only. |
| Token statistics query | Yes | Yes | Low | Do not add task-record selector input. |
| Raw SQL update helpers | Yes | Yes | Medium | Keep internal and typed/validated. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Backfill migration | `TokenUsageExecutionAddressBackfillMigration` | Yes | Low | Use this or similarly explicit name. |
| Task-team lookup | `taskTeamRunIndex` | Yes | Low | Keep migration-local. |
| Future contract | `TokenUsageLedgerPathColumnContract` or similar | Yes | Low | Mention only in future contract note, not current file mapping. |

## Applied Patterns (If Any)

- **Migration**: app-data migration for data correction and status recording.
- **Repository/Raw SQL boundary**: Migration uses internal raw SQL/Prisma access for efficient candidate scans and batch updates.
- **Classifier**: Migration-local deterministic classification, not a runtime strategy.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-execution-address-backfill-migration.ts` | File | App-data migration | Backfill/correct historical token rows. | Existing app-data migration subsystem. | Runtime statistics query code or frontend logic. |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | File | Migration registry | Register new migration. | Existing registry. | Migration implementation logic. |
| `autobyteus-server-ts/src/app-data-migrations/migrations/__tests__/token-usage-execution-address-backfill-migration.test.ts` | File | Tests | Migration behavior coverage. | Nearby migration tests are easiest to maintain. | End-to-end UI assumptions. |
| `autobyteus-server-ts/src/token-usage/providers/task-statistics-tree-builder.ts` | File | Token Usage statistics | Runtime no-address fallback only. | Existing query owner. | Task-record lookup/backfill logic. |

## Migration Ordering Decision

Chosen recommendation for this ticket: **data backfill now; physical drop later.**

Reason: the application startup order is `runMigrations()` followed by `AppDataMigrationRunner.runPending()`. A normal Prisma migration that drops `team_run_path_json` / `member_path_json` would run before the TypeScript app-data migration. Preserving old columns until the backfill is recorded is safer and matches the standard expand/backfill/contract pattern.

Therefore this ticket cleans active code and historical data state, and records the physical schema contract as future work. It must not include a normal Prisma drop-column migration.

## Backfill Classification Rules

Evaluate each token ledger row in this order:

1. **Task-team correction wins first**
   - If `row.root_team_run_id` matches a `taskTeamRunId` found in task delegation records:
     - target root becomes the record file's root `teamRunId`;
     - target address starts with that record's `taskRun.address.segments`;
     - append terminal segment from the token row:
       - if `task_agent_run_id` exists and `member_route_key` exists: append `member(member_route_key) -> task_agent(task_agent_run_id)`;
       - else if `member_route_key` exists: append `member(member_route_key)`;
       - else skip with `MISSING_MEMBER_ROUTE_KEY`.
   - Update even if the row already has a direct/member-only address, because old rows may have been partially backfilled before task-record correction.

2. **Direct task-agent backfill**
   - If no address, `root_team_run_id` exists, `task_agent_run_id` exists, and `member_route_key` exists:
     - target address is `member(member_route_key) -> task_agent(task_agent_run_id)`.

3. **Direct member backfill**
   - If no address, `root_team_run_id` exists, and `member_route_key` exists:
     - target address is `member(member_route_key)`.

4. **Standalone skip**
   - If `root_team_run_id` is null:
     - leave as standalone agent row; no execution address needed.

5. **Insufficient-data skip**
   - If no deterministic route/address can be built:
     - leave row unchanged and record skip reason.

## Validation / Coverage Plan

- Unit/integration migration tests with seeded SQLite rows:
  - direct member no-address row -> one member segment;
  - old task-team child root row -> parent root + task-team-prefixed address;
  - two task-team runs same logical target -> separate addresses;
  - task-agent row -> task-agent segment;
  - standalone row -> unchanged;
  - insufficient row -> skipped summary;
  - already-correct row -> unchanged;
  - partial/direct-address child task-team row -> corrected by task-team rule.
- Active-code non-use checks:
  - no Token Usage hierarchy code reads `team_run_path_json` or `member_path_json`;
  - no new normal Prisma migration drops `team_run_path_json` or `member_path_json` in this ticket.
- Existing Token Usage API/E2E coverage should remain valid:
  - recursive `children` tree;
  - `executionAddress` on descendant rows;
  - no query-time old path fields;
  - aggregate totals preserved.
- Migration observability:
  - app-data migration summary records direct backfills, task-team corrections, task-agent backfills, already-addressed rows, standalone skips, insufficient-data skips, and failures.

## Examples

### Good current-ticket shape

```text
Current ticket:
  app-data migration reads task records once
  writes root_team_run_id + execution_address_json into token ledger
  Token Statistics query reads token ledger only
  old physical columns may still exist but are ignored
```

### Bad current-ticket shape rejected

```text
Current ticket:
  normal Prisma migration drops team_run_path_json/member_path_json
  app-data migration runs afterward
```

This is rejected because Prisma migrations run before app-data migrations and could destroy possible migration inputs.

### Bad runtime query shape rejected

```text
Token Statistics query
  reads token ledger
  sees missing address
  queries task_delegation_records.json
  reconstructs parentage at display time
```

This violates self-contained statistics and must not be implemented.

## Future Contract Phase Note

A future/post-backfill contract ticket should physically remove `team_run_path_json` and `member_path_json` after the backfill migration has completed and been observed in user databases. That future design should verify SQLite/Electron support for direct `DROP COLUMN` or use a safe table rebuild. Its validation may include `PRAGMA table_info(token_usage_ledger_events)` excluding old columns. That validation is intentionally **not** part of the current ticket.

## Implementation Notes / Non-Goals

- Do not edit the already-applied `20260702093000_token_usage_execution_address` migration.
- Do not revive `teamRunPathJson` or `memberPathJson` in Prisma schema.
- Do not add a current-ticket normal Prisma migration that drops old path columns.
- Do not use old path columns as runtime/query hierarchy authority.
- Do not remove fallback for unreconstructable no-address rows in this ticket unless migration proves none can remain.
