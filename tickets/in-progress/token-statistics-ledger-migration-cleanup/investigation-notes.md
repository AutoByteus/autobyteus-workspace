# Investigation Notes

## Investigation Status

- Bootstrap Status: New follow-up ticket bootstrapped from latest `origin/personal` on 2026-07-03.
- Current Status: Design-ready investigation for architecture re-review after AR-001 corrections.
- Investigation Goal: Explain why the finalized token statistics work still leaves historical data unbackfilled and define a backfill-first follow-up scope without current-ticket physical column drop.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: Runtime/tree logic exists; remaining current-ticket work is data backfill, task-record-assisted historical correction, active-code non-use proof, migration observability, and migration tests.
- Scope Summary: Finish the Token Usage execution-address **backfill phase** by materializing deterministic historical rows and proving active code ignores old physical path columns. Physical removal of obsolete token path columns is future/post-backfill contract work, not this ticket.
- Primary Questions To Resolve:
  1. Are active Token Usage runtime/statistics paths still reading old path JSON? Current evidence says no.
  2. Did the existing migration physically remove old columns? No, and this ticket intentionally does not add a normal Prisma drop-column migration.
  3. Did any migration backfill existing rows? No; this ticket must add that app-data migration.
  4. Why do old rows still display? Because Task statistics has a no-address fallback using scalar fields, not because it reads old path JSON.
  5. Can historical task-team rows be repaired safely? Often yes, using task delegation records as a one-time migration input.

## Request Context

The user verified a local Electron build based on the finalized `token-statistics-nested-task-runs` implementation. New Nested Classroom task-team rows render correctly using `execution_address_json`, but the live DB still contains old physical columns and most historical rows have no execution address. The user asked whether the migration is incomplete and whether industry practice requires a phased migration. After discussion, the agreed follow-up is a new ticket for backfill + active-code non-use proof, while physical column removal is deferred to a future/post-backfill contract phase because normal Prisma migrations run before app-data migrations.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/in-progress/token-statistics-ledger-migration-cleanup`.
- Current Branch: `codex/token-statistics-ledger-migration-cleanup`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: `git fetch origin personal` completed before worktree creation.
- Task Branch: `codex/token-statistics-ledger-migration-cleanup` tracking `origin/personal`.
- Expected Base Branch (if known): `origin/personal`.
- Expected Finalization Target (if known): `personal` / `origin/personal`.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Do not treat `tickets/done/token-statistics-nested-task-runs` as reopened; it is upstream context for this new follow-up ticket.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-03 | Command | `git fetch origin personal`; `git worktree add ... origin/personal`; `git branch -m codex/token-statistics-ledger-migration-cleanup`; `git worktree move ...` | Bootstrap new follow-up ticket from latest merged state. | Worktree is based on `5832196cca5215f4771b29a72d4f3fe20a0a8d8b`. | No |
| 2026-07-03 | Doc | `tickets/done/token-statistics-nested-task-runs/requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | Understand finalized upstream scope and known follow-up notes. | Upstream notes physical old-column removal as a sequencing follow-up; implementation removed active surfaces but did not physically drop columns. | Use as upstream context only. |
| 2026-07-03 | Code | `autobyteus-server-ts/prisma/schema.prisma` | Check current Prisma model. | `TokenUsageLedgerEvent` has `executionAddressJson`; no `teamRunPathJson` / `memberPathJson` fields. | Active model is already clean; DB may still have extra ignored columns. |
| 2026-07-03 | Code | `autobyteus-server-ts/prisma/migrations/20260702093000_token_usage_execution_address/migration.sql` | Check schema migration. | Migration only adds `execution_address_json`. It does not drop old columns or update data. | Add app-data backfill migration now; schedule physical drop as future contract. |
| 2026-07-03 | Code | `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | Check registered data migrations. | No token usage execution-address backfill migration is registered. | Add one. |
| 2026-07-03 | Code | `autobyteus-server-ts/src/server-runtime.ts` | Check migration execution order. | Startup runs `runMigrations()` first, then `getAppDataMigrationRunner().runPending()`. | Do not add a normal Prisma drop-column migration in this ticket. |
| 2026-07-03 | Code | `autobyteus-server-ts/src/token-usage/providers/task-statistics-tree-builder.ts` | Explain why old rows still display. | Addressed rows use `execution_address`; no-address team rows go through `fallbackGroups` keyed by `member_agent_run_id ?? member_route_key ?? run_id`. | Keep bounded fallback but do not use old path columns. |
| 2026-07-03 | Code | `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts` | Check persistence mapping. | Repository maps `executionAddressJson` and no longer maps old path JSON fields. | Backfill must use app-data/raw SQL access for historical rows. |
| 2026-07-03 | Data | Read-only SQLite probe of `$HOME/.autobyteus/server-data/db/production.db` with `PRAGMA table_info(token_usage_ledger_events)` and counts. | Verify user's live DB schema/data. | Physical old columns remain; new column exists; most historical rows have null `execution_address_json`. | Backfill now; physical drop later/ordered after backfill. |
| 2026-07-03 | Data | SQLite count queries for no-address root/member/task-team patterns. | Estimate backfillability. | `team_run_path_json` was empty in the probed DB; many no-address rows have `root_team_run_id` + `member_route_key`; old task-team child root ids exist. | Direct and task-record-assisted backfill are feasible. |
| 2026-07-03 | Data | Scan `$HOME/.autobyteus/server-data/memory/**/task_delegation_records.json`. | Check if task records contain task-team run addresses for old rows. | Records contain `taskRun.address` such as `member(StudentStudyGroup) -> task_team(studentstudygroup_...)`; can map child task-team run id back to original root team. | Use only in one-time migration, not statistics query. |
| 2026-07-03 | Review | `design-review-report.md` round 1 | Capture AR-001 design impact. | Review failed because artifacts still implied physical drop in current scope. | Revised artifacts to current-ticket backfill + active-code non-use proof only. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Server startup runs Prisma migrations, then app-data migrations, then runtime services.
- Current execution flow:
  1. Runtime emits token usage.
  2. `TokenUsageContextEnricher` adds root team and execution address for new team-context events.
  3. `TokenUsageLedgerRepository` persists `execution_address_json` for new rows.
  4. `TokenUsageTaskStatisticsTreeBuilder` builds recursive rows for addressed events.
  5. Events without an address are grouped under fallback rows.
- Ownership or boundary observations:
  - Token Usage owns the persisted execution address and statistics tree.
  - Task Delegation owns task records; those may be used by a one-time migration to materialize historical addresses, but not as query-time authority.
  - Prisma schema has removed old fields from the active model, but the DB physical schema has not contracted. That contraction is not this ticket's implementation scope.
- Current behavior summary: New data is correct; old data is visible but not migrated; physical obsolete columns remain ignored by active code.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Data Migration / Cleanup.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure and Missing Invariant.
- Refactor posture evidence summary: The authoritative runtime model is correct, but migration sequencing stopped at expand. The invariant "deterministic historical team rows use the canonical address" is not true for upgraded DBs.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Prisma schema | Old fields removed from model. | Active code is mostly clean. | Prove no active old-column hierarchy reads. |
| Prisma migration SQL | Only adds new column. | Expand-only migration; no backfill. | Add app-data backfill migration. |
| Live DB | Old columns remain and most rows have null address. | User's concern is valid. | Backfill now; physical drop later/ordered after backfill. |
| Task records | `taskRun.address` maps task-team run id to parent root address. | Historical task-team repair is possible without runtime query dependency. | Add app-data migration. |
| Statistics tree builder | No-address fallback explains old UI rows. | Old rows displaying is expected but incomplete. | Keep bounded fallback for unreconstructable rows only. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/prisma/schema.prisma` | Prisma model for token ledger. | Model has `executionAddressJson` and no old path fields. | Do not revive old fields. |
| `autobyteus-server-ts/prisma/migrations/20260702093000_token_usage_execution_address/migration.sql` | Expand migration. | Adds only `execution_address_json`. | Do not edit applied migration; do not add current-ticket drop migration. |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | Registers app-data migrations. | No token usage backfill migration. | Register new backfill/correction migration. |
| `autobyteus-server-ts/src/server-runtime.ts` | Startup sequencing. | Runs schema migrations before app-data migrations. | Physical drop must be future/post-backfill, not a normal Prisma migration in this ticket. |
| `autobyteus-server-ts/src/token-usage/domain/execution-address.ts` | Token usage address type/normalizer. | Already supports canonical segments. | Reuse for migration serialization/validation. |
| `autobyteus-server-ts/src/token-usage/providers/task-statistics-tree-builder.ts` | Backend Task statistics tree builder. | Uses `execution_address`; fallback uses scalar fields for no-address rows. | No query-time task-record lookup. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/records/task-delegation-records-service.ts` | Task record access by root team. | Records live in root team memory directory. | Migration can scan memory files directly or via service. |
| `$HOME/.autobyteus/server-data/db/production.db` | User's live local DB. | Old columns remain; many old rows lack address. | Real backfill needed. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-03 | Probe | `PRAGMA table_info(token_usage_ledger_events)` against `$HOME/.autobyteus/server-data/db/production.db` read-only. | Columns include `team_run_path_json`, `member_path_json`, and `execution_address_json`. | Old physical columns exist but are not current-ticket drop scope. |
| 2026-07-03 | Probe | `_prisma_migrations` query for `20260702093000_token_usage_execution_address`. | Migration applied successfully. | The existing migration did exactly what it declares; it is not a failed migration. |
| 2026-07-03 | Probe | Counts for `execution_address_json` null/non-null. | Majority of historical rows lacked execution address. | Need data backfill/correction. |
| 2026-07-03 | Probe | Counts for old path columns. | `team_run_path_json` empty in inspected DB; `member_path_json` populated for many local members. | Do not depend on old paths as authoritative. |
| 2026-07-03 | Probe | Scan memory `task_delegation_records.json`. | Task-team records contain `taskRun.address` with task-team run ids. | One-time migration can reparent old task-team child rows. |

## External / Public Source Findings

No external/public sources were needed. This is an internal repository/data migration design.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for investigation; read-only SQLite probes used the user's local app DB.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: New git worktree/branch created from `origin/personal`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. The current implementation is correct for new runtime rows and the new backend-built tree.
2. The migration is expand-only and not a full data migration.
3. Old physical columns remain because no drop migration exists, but dropping them is intentionally future/post-backfill work.
4. Historical rows still display because no-address fallback is intentionally present; this is not evidence that old path JSON is still active.
5. A safe backfill exists for direct member rows using `member_route_key`.
6. Physical column drop is intentionally not part of the immediate follow-up because normal Prisma migrations run before app-data migrations; dropping first could destroy useful migration input.
7. A safe correction exists for many old task-team child rows by using task delegation records to map child task-team run ids back to root team ids and task-run address prefixes.
8. A bounded fallback is still needed for rows missing enough deterministic data.

## Constraints / Dependencies / Compatibility Facts

- Do not edit the already-applied migration; add app-data migration for backfill.
- Do not add a normal Prisma drop-column migration in this ticket.
- Schema migrations run before app-data migrations.
- Prisma model cannot access removed old columns through generated types; raw SQL may be needed for migration candidate row scans/updates.
- Normal statistics queries must remain self-contained and must not query task records.
- Future physical drop must be designed separately or explicitly post-backfill.

## Open Unknowns / Risks

- Exact historical coverage depends on available task records. Rows without enough deterministic data remain fallback.
- If simple SQL backfill uses SQLite JSON functions, verify JSON support in packaged runtime; otherwise perform JSON serialization in TypeScript migration code.
- Future physical column drop still requires separate sequencing and SQLite/Electron compatibility verification.

## Notes For Architect Reviewer

User has approved architecture review. This revision responds to AR-001 by making current implementation scope unambiguous: app-data backfill/correction + active-code non-use proof only. Physical column drop, `PRAGMA old columns absent`, and Prisma contract migration mapping are future/post-backfill contract topics, not current implementation/coverage.
