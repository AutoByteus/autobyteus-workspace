# Investigation Notes

## Investigation Status

- Bootstrap Status: New contract cleanup ticket bootstrapped from latest `origin/personal` on 2026-07-03.
- Current Status: Design-ready investigation; user approved guarded-drop direction for architecture review.
- Investigation Goal: Verify the current post-backfill state and define a safe physical schema cleanup for token usage legacy path columns.
- Scope Classification (`Small`/`Medium`/`Large`): Small-to-Medium.
- Scope Classification Rationale: Expected code change is a schema migration plus tests, but persisted SQLite upgrade safety matters.
- Scope Summary: Physically drop obsolete Token Usage ledger columns `team_run_path_json` and `member_path_json` with a guarded schema cleanup that checks whether each column exists before dropping it.
- Primary Questions To Resolve:
  1. Does current active Token Usage code need the old columns? No evidence found.
  2. Does the app-data backfill migration need the old columns? No; its row query does not select them.
  3. Can a normal Prisma migration safely drop them? Unconditional drop is not safe for drifted local DBs because missing-column drops fail and SQLite has no `DROP COLUMN IF EXISTS`. Use guarded schema cleanup or a guarded table-rebuild fallback.
  4. What should the order be? Keep expand/backfill/contract: register the guarded drop after the execution-address backfill and make it check the backfill's terminal-success record before dropping.

## Request Context

The user stated that the data migration/backfill ticket is finalized and asked to bootstrap the planned future ticket. The future ticket is the physical database contract cleanup that was intentionally deferred from the backfill ticket: remove `team_run_path_json` and `member_path_json` from `token_usage_ledger_events` now that backfill has been added and active code ignores them. During design discussion the user preferred a safer "drop only if exists" approach; investigation confirmed SQLite requires an explicit guard because it has no `DROP COLUMN IF EXISTS` syntax.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/tickets/in-progress/token-usage-ledger-drop-legacy-path-columns`.
- Current Branch: `codex/token-usage-ledger-drop-legacy-path-columns`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: `git fetch origin personal` completed; latest `origin/personal` is `289173a6e4d0f17376c7e2df9c422fbd3f5a4f63`.
- Task Branch: `codex/token-usage-ledger-drop-legacy-path-columns` tracking `origin/personal`.
- Expected Base Branch (if known): `origin/personal`.
- Expected Finalization Target (if known): `personal` / `origin/personal`.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: This ticket depends on the finalized backfill ticket at `tickets/done/token-statistics-ledger-migration-cleanup`.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-03 | Command | `git fetch origin personal`; `git worktree add -b codex/token-usage-ledger-drop-legacy-path-columns ... origin/personal` | Bootstrap from latest integration branch. | New worktree created at base `289173a6e4d0f17376c7e2df9c422fbd3f5a4f63`. | No |
| 2026-07-03 | Code | `autobyteus-server-ts/prisma/schema.prisma` | Inspect current Token Usage model. | `TokenUsageLedgerEvent` has `executionAddressJson`; no `teamRunPathJson` or `memberPathJson`. | No model field removal needed. |
| 2026-07-03 | Code | `autobyteus-server-ts/prisma/migrations/20260624090000_add_token_usage_ledger_events/migration.sql` | Find origin of old columns. | Creation migration created `team_run_path_json` and `member_path_json`. | New migration must drop them. |
| 2026-07-03 | Code | `autobyteus-server-ts/prisma/migrations/20260702093000_token_usage_execution_address/migration.sql` | Confirm canonical address addition. | Migration adds `execution_address_json`. | Preserve this column. |
| 2026-07-03 | Code | `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-execution-address-backfill-migration.ts` | Check whether backfill depends on old columns. | Backfill query selects only `id`, `usage_event_id`, `run_id`, `root_team_run_id`, `execution_address_json`, `member_route_key`, `task_agent_run_id`, `task_id`; it does not select old path columns. | Register guarded cleanup after this backfill and test skipped-version order. |
| 2026-07-03 | Code | `autobyteus-server-ts/src/server-runtime.ts`, `autobyteus-server-ts/src/startup/migrations.ts` | Confirm startup ordering. | Prisma migrations run before app-data migrations. | Ensure guarded cleanup is ordered after execution-address backfill in the app-data/startup migration phase. |
| 2026-07-03 | Data | Read-only SQLite probe of `$HOME/.autobyteus/server-data/db/production.db` | Check local live state. | Old columns still exist; app-data backfill record succeeded locally; no team-context rows remain without execution address in sampled query. | Physical drop remains. |
| 2026-07-03 | Probe | `sqlite3 :memory: 'CREATE TABLE t (a INT); ALTER TABLE t DROP COLUMN IF EXISTS b;'`; `sqlite3 :memory: 'CREATE TABLE t (a INT); ALTER TABLE t DROP COLUMN b;'` | Verify missing-column/drop-if-exists behavior. | `DROP COLUMN IF EXISTS` is a syntax error; dropping missing `b` fails with `no such column`; SQLite version in local shell is `3.51.0`. | Design must guard with `PRAGMA table_info` before each drop. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Server startup calls Prisma `migrate deploy`, then app-data migrations.
- Current execution flow:
  1. Prisma migrations create token ledger table with old columns, later add `execution_address_json`.
  2. App-data backfill migration fills/corrects `execution_address_json` for deterministic historical rows.
  3. Token Usage repository and statistics use the Prisma model, which already ignores old path columns.
- Ownership or boundary observations:
  - Prisma migrations own deterministic schema history; this ticket needs a guarded local schema contract cleanup because SQLite raw migrations cannot express `DROP COLUMN IF EXISTS`.
  - Token Usage app-data migration owns historical data correction and already avoids old path columns.
  - Token Usage statistics provider owns query projection and uses `execution_address_json` / scalar fields only.
- Current behavior summary: Functional behavior is correct, but physical schema still carries obsolete columns.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / schema contract migration.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure / Shared Structure Looseness.
- Refactor posture evidence summary: Active code is clean; physical persistence contract remains loose until obsolete columns are removed.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Prisma schema | Old fields absent. | Active model already clean. | Add guarded physical schema cleanup only. |
| Original migration | Old columns created. | Fresh install still temporarily creates old columns before later migrations. | New final migration must drop them. |
| Backfill migration | Does not read old columns. | Drop can be safe around pending app-data migration. | Test pending-backfill path. |
| Live DB | Old columns still exist. | Contract cleanup not yet done. | Add migration. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/prisma/schema.prisma` | Prisma model. | Already omits old fields. | No model-field deletion needed. |
| `autobyteus-server-ts/prisma/migrations/20260624090000_add_token_usage_ledger_events/migration.sql` | Original ledger table creation. | Contains old columns. | Do not edit; later migration drops. |
| `autobyteus-server-ts/src/app-data-migrations/migrations/<new token usage ledger legacy path column drop migration>.ts` or equivalent guarded startup cleanup module | Proposed guarded schema cleanup. | Should run after execution-address backfill, verify that backfill's app-data migration record is terminal-successful, inspect table columns, drop only present legacy columns, record/no-op already-absent columns, and preserve all else. | Main implementation artifact; exact placement should keep startup migration ownership clear. |
| `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-execution-address-backfill-migration.ts` | Historical data backfill. | Does not depend on old columns. | Must run before guarded drop in startup order and remain independent of old columns. |
| `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts` | Ledger repository. | Maps `executionAddressJson`; no old fields. | Should be unaffected. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-03 | Probe | `PRAGMA table_info(token_usage_ledger_events)` against local production DB read-only. | Old columns present alongside `execution_address_json`. | Physical cleanup remains. |
| 2026-07-03 | Probe | `app_data_migration_records` query for `20260703_token_usage_execution_address_backfill`. | Local status is `SUCCEEDED`; summary reported migrated rows and zero failures. | Local DB is ready for contract cleanup. |
| 2026-07-03 | Probe | Token row count/address count query. | Local sampled count had no team-context rows without address. | Backfill behaved as intended locally. |
| 2026-07-03 | Probe | Local SQLite missing-column/drop-if-exists commands. | `DROP COLUMN IF EXISTS` unsupported; missing-column drop errors. | Implementation must guard before issuing DDL. |

## External / Public Source Findings

No external/public sources were needed.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for investigation.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: new worktree from `origin/personal`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. Physical legacy columns are now pure schema debt for Token Usage.
2. Current Prisma model and active Token Usage code do not own old fields.
3. App-data backfill migration can run without old columns, which makes this contract cleanup safe for skipped-version upgrades if verified by tests.
4. The cleanup must preserve every other token ledger column, unique constraint, and index.
5. SQLite cannot express `DROP COLUMN IF EXISTS`; a direct missing-column drop errors, so the design must guard using table metadata before dropping.

## Constraints / Dependencies / Compatibility Facts

- Do not edit already-applied historical migrations.
- Prisma migrations run before app-data migrations.
- Expand/backfill/contract ordering is mandatory: backfill migration first, guarded physical drop second.
- SQLite direct `DROP COLUMN` for present columns must be verified in the packaged runtime.
- SQLite does not support `DROP COLUMN IF EXISTS`; missing legacy columns must be handled by an explicit schema-existence guard before DDL.
- Unexpected DDL/data-preservation errors must fail loudly; only absent legacy columns are no-op success.
- The guarded drop should verify the execution-address backfill record is `SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS` before DDL, so a failed prerequisite does not silently proceed.

## Open Unknowns / Risks

- Whether Prisma's packaged SQLite engine supports direct `ALTER TABLE DROP COLUMN` for present columns in all shipped environments.
- If table rebuild is required, exact full table definition must be handled carefully and must tolerate already-absent legacy columns.
- Local user DB has backfill succeeded, but skipped-version users may still have pending app-data backfill.

## Notes For Architect Reviewer

Review should focus on: whether the guarded schema cleanup is the right owner/placement for SQLite persisted local DBs, whether its prerequisite check and registry order correctly implement expand/backfill/contract, whether it is now safe to physically drop columns given the finalized backfill migration no longer depends on them, and whether the validation plan adequately protects fresh install, existing upgrade, drifted-schema, and skipped-version upgrade paths.
