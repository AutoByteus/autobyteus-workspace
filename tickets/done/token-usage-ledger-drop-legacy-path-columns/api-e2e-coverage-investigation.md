# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/tickets/in-progress/token-usage-ledger-drop-legacy-path-columns/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/tickets/in-progress/token-usage-ledger-drop-legacy-path-columns/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/tickets/in-progress/token-usage-ledger-drop-legacy-path-columns/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/tickets/in-progress/token-usage-ledger-drop-legacy-path-columns/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/tickets/in-progress/token-usage-ledger-drop-legacy-path-columns/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/tickets/in-progress/token-usage-ledger-drop-legacy-path-columns/code-review-report.md`
- Current Investigation Round: 2
- Trigger: Code review Round 2 failed with `COV-001`, a `Local Fix` limited to API/E2E-authored durable coverage isolation.
- Prior Investigation Reviewed: Round 1 in this artifact.
- Latest Authoritative Investigation: Round 2, this artifact.

## Current Requirement And Design Basis

The approved behavior is the contract phase for Token Usage hierarchy storage. After Prisma startup migrations and required app-data/startup cleanup, the physical SQLite table `token_usage_ledger_events` must no longer contain `team_run_path_json` or `member_path_json`. The canonical hierarchy columns `root_team_run_id` and `execution_address_json` must remain present and unchanged, and token rows, totals, unique/index constraints, repository writes/reads, and Token Usage statistics GraphQL behavior must continue to work.

Startup order is part of the contract: Prisma migrations create/expand the table first, `TokenUsageExecutionAddressBackfillMigration` must run before the guarded column-drop cleanup, and the drop cleanup must refuse to run unless the backfill migration record is terminal-successful (`SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS`). Already-absent legacy columns are an idempotent schema guard/no-op, not runtime backward compatibility. Runtime Token Usage code, GraphQL stats, and frontend Token Statistics code must not reintroduce or read the removed old path fields.

The implementation handoff's Legacy / Compatibility Removal Check was reviewed. It states no backward-compatibility mechanisms were introduced; the already-absent-column no-op is an idempotent schema guard; obsolete physical token usage ledger columns are removed when present; non-token `memberPath`/`teamRunPath` concepts remain out of scope. This matches the code and is a positive coverage signal.

Round 2 local-fix update: code review found `COV-001`, where the new destructive schema-drop E2E used the shared default Vitest Prisma DB and left `team_run_path_json` / `member_path_json` physically absent for later tests. The current coverage requirement is unchanged, but the durable E2E must prove the same contract behavior without mutating the shared suite database. Decision: update the E2E to create and use an isolated temporary SQLite database plus dynamically imported GraphQL/runtime modules bound to that temp `DATABASE_URL`, then restore process environment/module cache during teardown.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Required app-data/startup cleanup `20260703_drop_token_usage_legacy_path_columns` physically drops `team_run_path_json` and `member_path_json` after the backfill prerequisite. | Added / Removed | `FR-001`, `FR-004`, `AC-001`, `AC-004`; design DS-001/DS-002; code review pass scope. | Add durable E2E that runs the realistic Prisma-migrated test DB through app-data runner order and asserts final schema. |
| Canonical columns `root_team_run_id` and `execution_address_json` and all token/cost fields are preserved. | Preserved | `FR-002`, `FR-003`, `AC-002`, `AC-003`; design DS-004. | Durable E2E must verify schema, row count, token totals, cost totals, and representative index presence after direct SQLite drop. |
| Token Usage Task statistics continues to query ledger canonical fields only and returns recursive rows after the contracted schema. | Preserved | `FR-005`, `AC-005`; design DS-003. | Durable GraphQL E2E must query `tokenUsageTaskStatisticsInPeriod` after the drop. Existing token usage GraphQL coverage remains valid but does not prove post-contract schema. |
| App-data migration status/log surfaces should make prerequisite failure and dropped-column summary understandable. | Added / Changed | Code review residual risks; design review residual risks; implementation summary details. | Add durable E2E for missing-prerequisite failure through runner/status/log; success path should assert summary/log details for dropped columns. |
| No old-field revival in Prisma/domain/API/frontend active paths and no normal Prisma drop-column migration. | Preserved / Removed | `FR-006`, `AC-006`; design forbidden rules; code review static checks. | Retain/update static durable test language so it no longer says physical drop is deferred, while preserving no-active-reference and no-Prisma-drop assertions. |
| Drifted/already-contracted DBs with one/both legacy columns absent no-op successfully. | Preserved guard | `FR-008`, `AC-008`; SQLite investigation. | Reviewed unit coverage is still the right durable layer; no additional API/E2E needed unless unit coverage fails. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-legacy-path-columns-drop-migration.test.ts` | New reviewed unit coverage for registry order, direct drop, drift/no-op, missing/failed prerequisite, row/totals/index preservation, and pending-backfill runner order. | `FR-001`-`FR-004`, `FR-008`, `AC-001`-`AC-004`, `AC-008`. | Still Valid | Code review verified 5 tests pass and quality is acceptable. | Execute as final validation; no update planned. |
| `autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-execution-address-backfill-migration.test.ts` static scenario currently named `keeps active token usage hierarchy paths off legacy path columns and defers physical column drop`. | Verifies active token usage hierarchy files do not reference old path fields and no normal Prisma migration drops the legacy columns. The name/old intent still says physical drop is deferred, which is obsolete for this contract ticket. | `FR-006`, `AC-006`; design forbids old-field revival and normal Prisma unconditional drop. | Needs Update | Current ticket intentionally performs the physical drop via app-data migration, so "defers physical column drop" is stale language even though the no-active-reference/no-Prisma-drop assertions are still useful. | Update test name/intent to "keeps active token usage hierarchy paths off legacy path columns and keeps the physical drop out of normal Prisma migrations". |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-execution-address-backfill-graphql.e2e.test.ts` | Seeds historical rows, runs execution-address backfill, verifies reparenting, totals, summary/log details, and GraphQL task stats. | Upstream backfill ticket; current `FR-004`, `FR-005`, `AC-004`, `AC-005`. | Still Valid | Backfill must still run before contract and remains independent of old columns. | Execute focused E2E with new contract E2E. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Verifies ledger append and GraphQL projections/statistics from canonical execution address fields. | `FR-005`, `AC-005`. | Still Valid | Runtime Token Usage stats behavior is preserved. Existing test is baseline but not enough to prove post-drop schema. | Execute focused GraphQL E2E if runtime smoke beyond new contract E2E is needed. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` | Verifies provider semantics around ledger events. | `FR-005`. | Still Valid | Uses active ledger repository/model paths and not removed columns. | Execute if time permits; otherwise covered by focused GraphQL contract E2E plus existing code-review validations. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts` and `token-usage-model-list.e2e.test.ts` | Verifies token usage pricing/model GraphQL surfaces. | Token/cost display preservation, but not hierarchy-schema contract directly. | Still Valid | Should not require updates; no old path fields observed. | Not required for final execution unless broader token usage regression run is chosen. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts` | Verifies statistics provider grouping/tree behavior from canonical execution addresses. | `FR-005`, `AC-005`. | Still Valid | Existing integration layer remains a useful runtime grouping proof. | Execute focused integration if needed; not a replacement for contract E2E. |
| `autobyteus-web/stores/__tests__/appDataMigrationsStore.spec.ts` | Verifies frontend store fetches/runs app-data migration statuses including summary/log fields generically. | Status/log visibility residual risk. | Still Valid | No frontend shape change; GraphQL returns same `summary`/`logPath` fields. | No update needed; run if frontend checks are included. |
| `autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts`, `components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` | Verifies frontend Token Statistics mapping/rendering from GraphQL executionAddress rows. | `FR-005`, `FR-006`. | Still Valid | No frontend query/type changes and no old path field references observed. | No update needed; optional focused web validation. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-execution-address-backfill-migration.test.ts` scenario name/intent phrase "defers physical column drop" | Physical drop remains deferred. | This ticket is explicitly the contract phase that physically drops the columns via guarded app-data migration. | `FR-001`, design Removal / Decommission Plan, implementation handoff What Changed. | Rename/update the scenario intent while retaining no-active-reference and no-normal-Prisma-drop assertions; add contract E2E below. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `LDROP-E2E-001` | Realistic startup/app-data order on a Prisma-migrated SQLite test DB: missing backfill record -> backfill migration runs -> guarded drop migration runs -> final schema is contracted. | `FR-001`, `FR-002`, `FR-003`, `FR-004`, `FR-007`, `AC-001`, `AC-002`, `AC-003`, `AC-004`, design DS-001/DS-002/DS-004. | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-legacy-path-columns-drop-startup.e2e.test.ts` | Unit coverage proves migration internals; this E2E proves integrated runner order, Prisma-migrated schema, runtime SQLite direct drop behavior, records/logs, and data preservation. |
| `LDROP-E2E-002` | Token Usage GraphQL task statistics and total-cost query still work after the schema is contracted and rows are backfilled. | `FR-005`, `AC-005`, design DS-003. | Same E2E file. | Existing stats tests do not necessarily execute after the physical columns have been dropped in the same process/DB. |
| `LDROP-E2E-003` | App-data migration status/log surfaces missing prerequisite failure and dropped-column success details. | Code review residual risk; design review residual risk; implementation summary contract. | Same E2E file. | Needed so API/E2E evidence covers user-visible app-data migration records rather than only direct migration return values. |
| `LDROP-E2E-004` | Suite-safe destructive schema-drop coverage lifecycle. | Code review Round 2 `COV-001`; durable coverage must not leak contracted schema into the shared Vitest DB. | Same E2E file. | Required local fix so the E2E remains order-safe when combined with existing durable coverage that expects the pre-contract test schema. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `LDROP-UNIT-001` | `autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-execution-address-backfill-migration.test.ts` static scenario name | Rename stale "defers physical column drop" wording to current contract-aware wording; keep assertions. | `FR-006`, `AC-006`; current design says physical drop is in scope but not through a normal Prisma migration. | Repository-resident durable coverage update; must return through code review after execution. |
| `LDROP-E2E-004` | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-legacy-path-columns-drop-startup.e2e.test.ts` | Move destructive schema contract path off the shared default Vitest DB by using an isolated temp SQLite DB/PrismaClient and dynamic GraphQL/runtime imports bound to the temp `DATABASE_URL`; restore env/module cache in teardown. | Code review Round 2 `COV-001`. | Local durable coverage fix only; no production implementation change. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No durable coverage needs deletion. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `LDROP-PROBE-001` | Static scans for normal Prisma drop migrations and active old-field references. | Confirms no old-field revival and no unconditional normal Prisma column-drop migration. | The scan is execution evidence for this ticket; the durable static assertion remains in the unit test. |
| `LDROP-PROBE-002` | `PRAGMA table_info` / `PRAGMA index_list` checks inside E2E and optional local command output. | Confirms final physical schema and indexes after runtime drop. | The assertions remain durable in E2E; any extra manual command output is only execution evidence. |
| `LDROP-PROBE-003` | Built-server startup lifecycle probe against an isolated temporary data directory with a seeded representative SQLite DB. | Confirms `node dist/app.js --data-dir ...` runs Prisma deploy, app-data backfill, legacy-column drop, status/log recording, final schema, and live GraphQL Token Usage statistics. | This is environment/lifecycle evidence for this task; the durable coverage remains the repository E2E file. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full desktop/browser UI workflow for viewing app-data migration status. | No frontend code or UX contract changed in this ticket; GraphQL/store status shape is already generic and this stage can prove API status/logs directly. | Low; UI could still have styling or presentation limits unrelated to this schema contract. | Delivery can decide docs/UX no-impact. Browser run is not required for this backend schema contract unless later evidence shows UI-specific breakage. |
| Real user's production DB mutation. | Do not mutate local production/user database during API/E2E. | Low; representative Prisma-migrated SQLite test DB exercises the same DDL and schema path. | None. |
| Table rebuild fallback. | Direct drop is the implemented path and unit/E2E will validate it in current Prisma/SQLite runtime. | Low unless runtime direct drop fails. | If direct drop fails, classify as implementation local fix for fallback strategy. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| Direct `ALTER TABLE ... DROP COLUMN` fails in current Prisma/SQLite E2E runtime. | `Local Fix` | Would contradict implementation assumption and reviewed fallback plan. | `implementation_engineer` |
| Backfill migration reads removed legacy columns or fails after physical drop. | `Local Fix` | Would violate `FR-004` and design DS-002. | `implementation_engineer` |
| Runtime Token Usage API still references removed old columns. | `Local Fix` | Would violate `FR-005`/`FR-006`. | `implementation_engineer` |
| Requirements demand browser verification despite no frontend contract change. | `Requirement Gap` only if user/team changes acceptance criteria. | Current requirements target schema/API/status-log behavior, not UI styling. | `solution_designer` if new acceptance criteria are introduced. |

## Execution Plan

1. Update the stale unit test scenario name/intent without changing its assertion scope.
2. Add `autobyteus-server-ts/tests/e2e/token-usage/token-usage-legacy-path-columns-drop-startup.e2e.test.ts` with:
   - missing-prerequisite failure through `AppDataMigrationRunner`, plus GraphQL `getAppDataMigrations`/log evidence;
   - skipped-version startup success with `TokenUsageExecutionAddressBackfillMigration` followed by `TokenUsageLegacyPathColumnsDropMigration` on the Prisma-migrated test DB;
   - final `PRAGMA table_info` excludes legacy columns and retains canonical columns;
   - row count, token totals, cost totals, representative indexes, and backfilled `execution_address_json` preserved;
   - GraphQL task statistics and total cost work after the physical drop;
   - migration status/log details expose dropped-column counts.
3. Run focused final checks: `git diff --check`, drop/backfill unit tests, new E2E plus existing backfill GraphQL E2E, build-scoped TypeScript, and static old-field/no-Prisma-drop scans. Add focused web store/statistics tests if Nuxt test setup is available without new unrelated blockers.
4. Write the execution coverage report and, because repository-resident durable coverage will be added/updated, hand the cumulative package back to `code_reviewer` for coverage-code re-review.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Round 2 keeps the same behavior coverage scope and adds a local coverage-code isolation fix for `COV-001`. The fix is confined to the API/E2E-authored durable E2E; no implementation/design reroute is required.
