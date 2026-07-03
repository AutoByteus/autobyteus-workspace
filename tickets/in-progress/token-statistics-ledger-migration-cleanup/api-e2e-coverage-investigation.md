# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/in-progress/token-statistics-ledger-migration-cleanup/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/in-progress/token-statistics-ledger-migration-cleanup/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/in-progress/token-statistics-ledger-migration-cleanup/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/in-progress/token-statistics-ledger-migration-cleanup/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/in-progress/token-statistics-ledger-migration-cleanup/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/in-progress/token-statistics-ledger-migration-cleanup/code-review-report.md`
- Current Investigation Round: `1`
- Trigger: Code review passed for `token-statistics-ledger-migration-cleanup` and requested API/E2E coverage investigation/execution.
- Prior Investigation Reviewed: N/A for this API/E2E stage. Upstream finalized ticket context in `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/done/token-statistics-nested-task-runs` was reviewed as background.
- Latest Authoritative Investigation: Round 1.

## Current Requirement And Design Basis

The approved current-ticket behavior is the backfill phase of the Token Statistics execution-address migration. The reviewed implementation adds registered startup app-data migration `20260703_token_usage_execution_address_backfill`, which scans historical token usage ledger rows, builds a migration-local task-team run index from persisted `task_delegation_records.json`, and writes deterministic `root_team_run_id` plus `execution_address_json` corrections. Normal Token Statistics API/frontend paths must remain ledger-only at runtime and must not query task delegation records or old physical `team_run_path_json` / `member_path_json` columns. Physical removal of the old columns is intentionally out of current scope.

Coverage must prove the integrated user-facing effects that unit review did not fully prove:

- Historical old direct member rows are backfilled to `member(memberRouteKey)`.
- Historical old task-team child rows whose `root_team_run_id` is a task-team run id are re-rooted under the original team and nested under a `TASK_TEAM_RUN` row when task records exist.
- Repeated task-team executions for the same logical target stay separate by task-team run id.
- Task-agent rows are backfilled to task-agent execution addresses.
- Standalone rows and insufficient/conflicting rows are skipped without hidden hierarchy guessing and remain visible through approved fallback.
- Aggregate token/cost totals over a fixed range are preserved before/after migration.
- App-data migration status/log summary exposes category counts and skip reasons.
- Runtime Token Statistics API/frontend hierarchy paths remain ledger-only and old physical path columns are not active authority.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Startup app-data migration backfills `execution_address_json` for deterministic historical rows. | Added | `FR-004` to `FR-009`, `AC-001` to `AC-003`, design DS-001. | Add durable integrated API/E2E coverage using real Prisma DB rows, task records, migration runner, and GraphQL Token Statistics assertions. |
| Old task-team child-root rows are corrected from child task-team root id to original root team id. | Changed | `FR-005`, `AC-002`, `AC-009`; implementation handoff classification order. | Add durable scenario matching Nested Classroom/StudentStudyGroup shape and assert old child task-team top-level rows disappear when records exist. |
| Aggregate token/cost math is unchanged by backfill/reparenting. | Preserved | `FR-013`, `AC-010`; design says migration only changes root/address. | Capture fixed-range totals before and after migration in durable E2E. |
| App-data migration summary/status details include category counts and skip reasons. | Added | `FR-009`, `AC-012`; design migration status return path. | Add durable runner/GraphQL status evidence and log-file check. |
| Runtime Token Statistics API/frontend hierarchy code must not read task records or legacy path columns. | Preserved/decommissioned | `FR-003`, `FR-007`, `AC-008`; implementation source guard. | Retain source-guard unit coverage and add source/API command checks as supporting execution evidence. |
| Physical `team_run_path_json` / `member_path_json` drop. | Removed from current scope / Deferred | `FR-002`, `AC-007`; design review AR-001 resolution. | Do not add drop-column coverage except no-drop guard. Record future contract follow-up. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-execution-address-backfill-migration.test.ts` | Focused migration behavior with in-memory DB and Prisma expanded-schema smoke; active old-column non-use and no normal drop-column scan. | `FR-002` to `FR-014`, `AC-001` to `AC-008`, `AC-011`, `AC-012`. | `Still Valid` | Code review ran it successfully; inspection shows direct member, task-team, repeated task-team, task-agent, standalone/insufficient/already-addressed, idempotency, schema, old-column non-use, and no-drop assertions. | Execute as supporting coverage. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | GraphQL Token Usage summaries and recursive Task statistics from already-addressed ledger rows. | Prior ticket `FR-008` to `FR-017`; current `FR-007`, `FR-010`, `FR-013`. | `Still Valid` but not sufficient for migration startup/backfill. | It seeds canonical addressed events and legacy no-address fallback, not historical app-data migration execution. | Execute as supporting GraphQL regression; add a new migration-specific E2E rather than overloading this broad file. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts` | GraphQL unit-price hydration through recursive task rows. | Current `FR-013` aggregate/cost preservation adjacent. | `Still Valid` | It verifies unit-price/aggregate semantics after the prior recursive row contract. | Execute as supporting coverage. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` and `token-usage-model-list.e2e.test.ts` | Provider/model GraphQL semantics unrelated to hierarchy migration. | `FR-013` non-Task statistics preservation. | `Still Valid` | Existing Token Usage E2E coverage. | Execute focused token-usage E2E suite if time permits. |
| `autobyteus-server-ts/tests/unit/app-data-migrations/app-data-migration-runner.test.ts` | Runner status, duplicate run, stale running, listing registered migrations. | `FR-009`, `AC-012`. | `Still Valid` but not migration-specific. | Verifies runner mechanics, not the new migration summary categories. | Execute as supporting coverage or cover runner/status through new E2E. |
| `autobyteus-server-ts/tests/integration/app-data-migrations/team-run-metadata-member-tree-history.integration.test.ts` | Existing historical app-data migration runner integration for team metadata. | App-data migration subsystem behavior, not Token Usage. | `Out Of Scope` for Token Usage row correctness. | Uses the same runner pattern but not Token Usage ledger. | Reference only; no edits. |
| `autobyteus-web/stores/__tests__/appDataMigrationsStore.spec.ts` and `components/settings/ServerMigrationsManager.vue` | Frontend renders app-data migration summary/details returned by GraphQL/store. | `FR-009`, `AC-012`. | `Still Valid` for UI mechanics; not migration-specific. | UI displays generic summary counts/details; new migration uses the existing shape. | No durable UI changes planned; execute only if frontend migration UI changes occur. |
| `autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts`, `components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` | Frontend consumes recursive task rows. | Current `FR-007`, `FR-013`; prior recursive API/UI behavior. | `Still Valid` | Current ticket does not change frontend Token Statistics rendering. | Execute focused web tests as supporting no-regression if practical. |
| `autobyteus-server-ts/prisma/migrations/*/migration.sql` no-drop scan. | Ensures current ticket does not add a normal drop-column migration for old physical columns. | `FR-002`, `AC-007`. | `Still Valid` | Code review ran a no-drop scan. | Execute again as a command check. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None found. | N/A | Existing relevant coverage remains useful. | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `MIG-TOKEN-001` | Real Prisma historical ledger rows are migrated by the new app-data migration and then appear through GraphQL Task statistics as root team -> task-team -> member, not unrelated top-level task-team rows. | `FR-004`, `FR-005`, `FR-007`, `AC-001`, `AC-002`, `AC-009`, DS-001/DS-002. | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-execution-address-backfill-graphql.e2e.test.ts` | Unit tests do not prove the GraphQL Task statistics boundary after historical DB correction. |
| `MIG-TOKEN-002` | Two historical task-team run ids for the same logical target remain separate after backfill. | `AC-003`; prior ticket repeated-target risk. | Same new E2E file. | Prevents regression where migration collapses rows by display/member name. |
| `MIG-TOKEN-003` | Fixed date-range token/cost totals are identical before and after migration except hierarchy reparenting. | `FR-013`, `AC-010`. | Same new E2E file. | Migration updates identity fields only; durable API evidence should catch accidental token/cost changes. |
| `MIG-TOKEN-004` | App-data migration status/log exposes category counts and skip reasons, including insufficient-data and conflict skip reasons. | `FR-009`, `AC-006`, `AC-012`; code-review residual risks. | Same new E2E file. | Existing unit summary assertions are useful but do not prove runner record/log/API visibility. |
| `MIG-TOKEN-005` | Conflict/missing-data rows remain visible via fallback and are not guessed into a hierarchy. | `FR-010`, `AC-006`. | Same new E2E file. | Code review called conflict/malformed/missing records residual risks; conflict is deterministic and cheap to cover. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None planned. | N/A | N/A | N/A | Add a narrow migration-specific E2E file instead of widening existing broad GraphQL files. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None planned. | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `TEMP-SCAN-001` | Command scan of active Token Usage API/frontend/source paths for `team_run_path_json`, `member_path_json`, `teamRunPathJson`, and `memberPathJson`. | Active hierarchy paths do not read old path columns. | The durable unit test already contains a source guard; command output is execution evidence. |
| `TEMP-SCAN-002` | Command scan of normal Prisma migrations for drop-column statements on old path columns. | Current ticket does not perform physical contract phase too early. | The durable unit test already contains a no-drop guard; command output is execution evidence. |
| `TEMP-STARTUP-001` | If durable E2E does not stand up a full server process, use `AppDataMigrationRunner` with real Prisma DB and log writing as startup-equivalent app-data migration execution. | Startup migration semantics, status record, and log shape. | The durable E2E file will own this as deterministic coverage; no separate temporary script should remain. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Physical removal of `team_run_path_json` / `member_path_json`. | Explicitly out of current scope; design defers it to future/post-backfill contract phase. | Dormant physical columns remain visible in SQLite schema. | Delivery should preserve future contract cleanup note. |
| Perfect repair of rows with missing/malformed/deleted task records. | Requirements forbid heuristic repair. | Some historical task-team rows remain fallback/top-level if deterministic records are unavailable. | Summary skip reasons and fallback visibility are the intended behavior. |
| Full Electron UI startup against the user's production DB. | API/E2E should avoid mutating the user's real DB; deterministic test DB coverage is safer. | Environment-specific drift could remain. | Optional delivery/user verification can run backup-based Electron validation if requested. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently. | N/A | Upstream artifacts explicitly define backfill-only scope, skip behavior, no-drop policy, and ledger-only runtime query. | N/A |

## Execution Plan

1. Add a focused durable E2E file `autobyteus-server-ts/tests/e2e/token-usage/token-usage-execution-address-backfill-graphql.e2e.test.ts` that seeds historical ledger rows and task delegation record files, captures Token Statistics totals/shape before migration, runs `TokenUsageExecutionAddressBackfillMigration` through `AppDataMigrationRunner` against the real test Prisma DB, and verifies GraphQL Token Statistics hierarchy/status/log evidence after migration.
2. Run `git diff --check`.
3. Run focused migration unit coverage: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/app-data-migrations/token-usage-execution-address-backfill-migration.test.ts`.
4. Run new focused E2E: `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/token-usage-execution-address-backfill-graphql.e2e.test.ts`.
5. Run supporting Token Usage GraphQL E2E coverage that proves recursive rows and aggregate semantics remain valid.
6. Run build-scoped TypeScript: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`.
7. Run no-drop and active old-column non-use command scans.
8. Write canonical execution coverage report. Because repository-resident durable coverage will be added after code review, return the cumulative package to `code_reviewer` for coverage-code re-review.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing migration unit tests are strong but do not cover integrated historical DB -> migration runner/status/log -> GraphQL Token Statistics behavior. A narrow durable E2E file is required and sufficient for the residual risks identified by code review.
