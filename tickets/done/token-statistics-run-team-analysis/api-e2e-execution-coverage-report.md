# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/api-e2e-coverage-investigation.md`
- Current Execution Round: 2
- Trigger: Full refresh Round 5 code review passed and requested API/E2E coverage investigation/execution after power-off recovery.
- Prior Round Reviewed: Round 1 at this canonical report path was reviewed. Its durable coverage additions are now existing coverage; its result is superseded by the Round 5 full-refresh implementation review and this Round 2 execution.
- Latest Authoritative Round: Round 2 in this report.

Round rules:
- Scenario IDs from Round 1 were reused where the same API/UI boundary remained in scope.
- A new suffix `-R2` is used only where the Round 5 refresh changed the coverage decision for an existing scenario.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Original API/E2E after earlier implementation/code review | N/A | None | Pass | No | Superseded by later Round 5 field-policy implementation and full refresh code review. |
| 2 | Full refresh Round 5 code review handoff to API/E2E | No prior unresolved failures; prior durable coverage was re-inventoried for Round 5 validity | None after coverage update | Pass | Yes | Existing GraphQL E2E had stale member-created-time fields and was updated before final execution; all focused API/E2E checks passed. |

## Execution Basis

Execution followed the current Round 5 requirements/design package, the implementation handoff, the full refresh code review report, and the refreshed coverage investigation. The API/E2E focus was the live GraphQL/schema path, task/team/member statistics projection, runtime/model diagnostics, Settings store/page/table behavior, static absence of superseded range/roster artifacts, and generated-document/schema compatibility.

## Pre-Execution Coverage Investigation

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/api-e2e-coverage-investigation.md`
- Completed before final test execution, durable coverage edits, durable coverage removals, or failure rerouting: `Yes`
- Existing durable coverage inventory reviewed: `Yes`
- Existing tests treated as authority without current-requirement validity review: `No`
- Stale or obsolete coverage found: `Yes`
- New durable coverage needed: `No` new files; `Yes` update to an existing GraphQL E2E scenario
- Reroute required from investigation: `No`
- Notes: The only stale coverage found was in `token-usage-ledger-graphql.e2e.test.ts`: the existing task-statistics query still requested member `createdAt` and `createdTimeSource`, which Round 5 intentionally removed from Settings statistics. The scenario was updated before final execution.

## Existing Durable Coverage Decision Summary

| Path / Scenario | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Action Taken | Evidence |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Needs Update | Updated task-statistics scenario to remove stale member-created-time query/assertions and assert Round 5 persisted display fields (`teamName`, `agentName`, `runSummary`, `runCreatedAt`, `memberName`) plus `memberPath` flow through GraphQL. | Focused GraphQL E2E passed, 1 file / 3 tests. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts` | Still Valid | Retained and executed. | Passed, 6 tests in combined provider/store/capturer run. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-display-field-capturer.integration.test.ts` | Still Valid | Retained and executed. | Passed, 3 tests in combined run. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts` | Still Valid | Retained and executed. | Passed, 7 tests in combined run. |
| `autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts` | Still Valid | Retained and executed. | Passed, 2 tests. |
| `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts` | Still Valid | Retained and executed. | Passed, 3 tests. |
| `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` | Still Valid | Retained and executed. | Passed, 2 tests. |
| `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts` | Still Valid | Retained and executed. | Passed, 1 test. |
| Env-gated runtime token usage E2E | Out Of Scope for mandatory local run | Not executed. | Historical Settings statistics projection changed, not token event production. |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

Evidence:
- Implementation handoff `Legacy / Compatibility Removal Check` was reviewed before final execution.
- Static source scan across current Settings/token-statistics scope produced no matches for `rangeMode`, `Tasks created in period`, `getStatisticsPerModel`, `periodUsageState`, `listTeamAgentMemberRoster`, `buildNoUsageTokenUsageCostSummaryAggregate`, `TokenUsageTeamMemberRosterEntry`, `workspaceName`, `workspaceRootPath`, `memberCreatedAt`, or `memberOrder`.
- The updated GraphQL E2E no longer queries member-created-time fields and validates the current Round 5 member row shape.

## Execution Surfaces / Modes

- Backend GraphQL E2E against the TypeGraphQL schema and test SQLite ledger store.
- Backend provider/ledger/display-field-capturer integration tests.
- Frontend Pinia store and Vue component tests under Nuxt/Vitest/happy-dom.
- Static source scan for superseded Round 3/4 and future range-mode artifacts.
- Backend TypeScript/build and built GraphQL schema probe.
- Frontend boundary/localization/Nuxt prepare checks.
- Temporary built-schema GraphQL codegen compatibility probe.
- Broad Nuxt typecheck status capture against the known repository-wide baseline.

## Platform / Runtime Targets

- Host/worktree: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Backend: `autobyteus-server-ts`, Prisma SQLite test DB at `autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db`, Vitest 4, Node 22.
- Frontend: `autobyteus-web`, Nuxt/Vitest happy-dom tests.
- No real external LLM provider/runtime invocation was required for this historical projection/UI validation.

## Lifecycle / Upgrade / Restart / Migration Checks

No native desktop lifecycle, installer, updater, restart, or cross-version migration scenario is in scope for this API/E2E pass. The Prisma migration `20260629120000_add_token_usage_display_fields` was applied during backend E2E/integration test database resets.

## Coverage Matrix

| Scenario ID | Surface | Behavior Covered | Result | Evidence |
| --- | --- | --- | --- | --- |
| API-001-R2 | Backend GraphQL E2E | `tokenUsageTaskStatisticsInPeriod` returns root team/standalone rows without double-counting team members; persisted display fields drive top-level names/summaries/created time and member names; member path/runtime/model/aggregate fields map through; legacy missing display fields fall back to `Unknown`/`FIRST_USAGE_OBSERVED`. | Pass | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` passed, 1 file / 3 tests. |
| API-002 | Backend GraphQL E2E | `usageStatisticsInPeriod` groups the same model under separate runtime/model rows and exposes aggregate status/cost fields. | Pass | Same GraphQL E2E run passed. |
| API-003 | Backend provider/capturer/store integration | Provider grouping, usage-derived team expansion/no no-usage roster rows, five-field capture/backfill behavior, imported display fields winning over metadata, ledger cache/reasoning/cost status preservation. | Pass | Combined backend integration run passed, 3 files / 16 tests. |
| WEB-STORE-001 | Frontend store | Store sends only `startTime`/`endTime`, no `rangeMode`, normalizes task/member/model rows, Unknown/status fallbacks, and GraphQL errors. | Pass | Frontend focused Vitest run passed, store spec 2 tests. |
| WEB-UI-001 | Settings page | `By Task` default, compact `Usage during period` affordance, no range-mode/created-period text, shared date range, empty states. | Pass | Frontend focused Vitest run passed, page spec 3 tests. |
| WEB-UI-002 | Task table | Created Time last visible column and default sort, fallback label, mixed runtime/model display, expand/collapse, usage-derived member rows only, member rows attached after cost sorting, member Created Time placeholder, cost breakdown/missing dimensions/thinking included. | Pass | Frontend focused Vitest run passed, task-table spec 2 tests. |
| WEB-UI-003 | Model table | Runtime column, same model under separate runtimes, Unknown fallback, cache/thinking/status/chart labels. | Pass | Frontend focused Vitest run passed, model-table spec 1 test. |
| PROBE-001-R2 | Static source scan | No superseded Round 3/4/future range-mode artifacts remain in current source scope. | Pass | `rg` scan produced no matches. |
| PROBE-002-R2 | Build/schema | Backend TypeScript, full server build, and built GraphQL schema load. | Pass | `tsc`, `pnpm -C autobyteus-server-ts build`, and `schema ok` probe passed. |
| PROBE-003-R2 | Codegen compatibility | Frontend GraphQL documents are compatible with the built server schema. | Pass with residual drift note | `BACKEND_GRAPHQL_BASE_URL=/tmp/token-round5-schema.graphql pnpm -C autobyteus-web codegen` passed; generated output would change by 619 lines (606 insertions / 13 deletions) and was restored. |
| PROBE-004-R2 | Broad web typecheck | Captured known broad baseline status. | Known baseline failure, not API/E2E failure | `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C autobyteus-web exec nuxi typecheck` exited 1 on broad repository issues; focused token-statistics source/tests passed. Token-usage log matches were from copied built server sources under `electron-dist/.../resources/server`, not active web source. |

## Test Scope

In scope:
- Backend task/team/member and runtime/model GraphQL statistics mapping.
- Round 5 five display fields and legacy fallback labels/timestamps.
- Usage-derived expanded team rows and no double counting.
- Settings store/page/task-table/model-table behavior.
- Cost/cache/reasoning/status/missing-dimension display and aggregation.
- Static absence of removed roster/no-usage/range-mode artifacts.
- Schema/codegen compatibility checks.

Out of scope:
- Full browser/Electron visual smoke.
- Real provider/runtime token event generation.
- Future `Tasks created in period` reporting mode.
- Performance/load testing for large date-range display-field backfill.

## Execution Setup / Environment

- Backend Vitest resets applied all migrations through `20260629120000_add_token_usage_display_fields` against the test SQLite DB.
- Frontend Vitest used existing Nuxt test setup. Expected warnings observed: KaTeX quirks-mode warning and non-Electron server initialization messages.
- Built schema was printed to `/tmp/token-round5-schema.graphql` using `buildGraphqlSchema()` from `autobyteus-server-ts/dist`.
- Codegen probe backed up `autobyteus-web/generated/graphql.ts` to `/tmp/token-round5-generated-graphql.before.ts`, ran schema-file codegen, recorded drift, and restored the repository file.
- Broad web typecheck log: `/tmp/token-round5-web-typecheck.log`.

## Tests Implemented Or Updated

Updated during this API/E2E round:

- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts`
  - Added helper support for existing path fields and the five Round 5 display fields: `team_name`, `agent_name`, `run_summary`, `run_created_at`, and `member_name`.
  - Updated task-statistics GraphQL query to include top-level `summary` and member `memberPath`.
  - Removed stale member `createdAt` and `createdTimeSource` query/assertions.
  - Added assertions that persisted display fields drive team/agent display names, summaries, `RUN_HISTORY` created time, and member names while legacy rows still fall back explicitly.

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| None removed as a whole file/scenario | N/A | N/A | Only stale member-created-time fields inside an otherwise valid GraphQL E2E scenario were updated. |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts`
- Paths removed: None
- If `Yes`, returned through `code_reviewer` before delivery: `Pending` — this handoff must route to `code_reviewer`.
- Post-API/E2E coverage code review artifact: Pending.

## Other Execution Artifacts

- `/tmp/token-round5-schema.graphql` — built GraphQL schema used for codegen compatibility probe.
- `/tmp/token-round5-generated-graphql.before.ts` and `/tmp/token-round5-generated-graphql.before-inspect.ts` — temporary backups used to restore generated output after codegen probes.
- `/tmp/token-round5-codegen-inspect.log` — successful codegen probe log.
- `/tmp/token-round5-web-typecheck.log` — broad web typecheck failure log.

## Temporary Execution Methods / Scaffolding

- Temporary schema/codegen files were written under `/tmp` only.
- One initial schema-print attempt from the superrepo cwd failed because `reflect-metadata` was not resolvable from that cwd; the probe was immediately rerun from `autobyteus-server-ts` and succeeded.
- `autobyteus-web/generated/graphql.ts` was restored after codegen probes. No temporary repository-resident scaffolding remains.

## Dependencies Mocked Or Emulated

- Backend E2E wrote synthetic token usage ledger events through `TokenUsageLedgerStore` and used absent run-history metadata for fallback rows.
- Backend integration tests mock provider/capturer dependencies where appropriate.
- Frontend tests mock Apollo client/store/localization dependencies through existing test patterns.
- No external LLM provider or runtime was called.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| Round 1 | No unresolved failures; Round 1 report recorded pass but was before the final Round 5 refresh review. | N/A | Re-inventoried. Existing coverage was treated as evidence, not authority. | Refreshed investigation found one stale GraphQL E2E member-created-time assertion and updated it. | Round 2 is latest authoritative API/E2E result. |

## Scenarios Checked

Latest command outcomes:

- `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` — passed, 1 file / 3 tests.
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/token-usage/providers/statistics-provider.integration.test.ts tests/integration/token-usage/providers/token-usage-display-field-capturer.integration.test.ts tests/integration/token-usage/providers/token-usage-store.integration.test.ts` — passed, 3 files / 16 tests.
- `pnpm -C autobyteus-web exec vitest run components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts stores/__tests__/tokenUsageStatistics.spec.ts components/settings/__tests__/TokenUsageStatistics.spec.ts components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts` — passed, 4 files / 8 tests.
- `git diff --check` — passed.
- `rg -n "rangeMode|Tasks created in period|getStatisticsPerModel|periodUsageState|listTeamAgentMemberRoster|buildNoUsageTokenUsageCostSummaryAggregate|TokenUsageTeamMemberRosterEntry|workspaceName|workspaceRootPath|memberCreatedAt|memberOrder" autobyteus-server-ts/src/token-usage autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts autobyteus-web/components/settings/TokenUsageStatistics.vue autobyteus-web/components/settings/token-usage autobyteus-web/stores/tokenUsageStatistics.ts autobyteus-web/graphql/queries/token_usage_statistics_queries.ts autobyteus-web/types/tokenUsageStatistics.ts --glob '!**/__tests__/**'` — no matches.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-server-ts build` — passed.
- From `autobyteus-server-ts`: `node -e "import('reflect-metadata').then(() => import('./dist/api/graphql/schema.js')).then(async m => { await m.buildGraphqlSchema(); console.log('schema ok'); })"` — passed with `schema ok`.
- `pnpm -C autobyteus-web guard:web-boundary && pnpm -C autobyteus-web guard:localization-boundary && pnpm -C autobyteus-web audit:localization-literals && pnpm -C autobyteus-web exec nuxi prepare` — passed; localization audit emitted only the known Node module-type warning.
- Built-schema codegen probe: `BACKEND_GRAPHQL_BASE_URL=/tmp/token-round5-schema.graphql pnpm -C autobyteus-web codegen` — passed; generated drift detected and restored.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C autobyteus-web exec nuxi typecheck` — failed on known broad repository baseline issues. Focused token-statistics tests passed; token-usage-related log matches were from copied built server sources under `electron-dist/.../resources/server`, not active Settings/web source.

## Passed

All focused API/E2E-owned scenarios passed after updating the stale GraphQL E2E coverage. Backend GraphQL, provider/store/capturer integration, Settings store/page/task table/model table, server build/schema, web guards/localization/Nuxt prepare, static absence scan, and codegen document/schema compatibility passed.

## Failed

No API/E2E failure requiring implementation, design, or requirements reroute.

Known broad baseline failure:
- `pnpm -C autobyteus-web exec nuxi typecheck` remains red on repository-wide pre-existing issues. The captured log includes many unrelated active web-source errors and copied built-server decorator errors under `electron-dist/.../resources/server`. Focused token-statistics validation passed.

## Not Tested / Out Of Scope

- Full browser/Electron visual smoke for Settings > Token Statistics.
- Real provider/runtime token usage generation.
- Future `Tasks created in period` mode.
- Large-range performance/load testing for display-field backfill.

## Blocked

None for API/E2E pass.

Residual notes for downstream review/finalization:
- Codegen document/schema compatibility passed, but schema-file codegen would rewrite `autobyteus-web/generated/graphql.ts` by 619 lines (606 insertions / 13 deletions) and was restored because API/E2E did not intentionally take a generated-source refresh beyond coverage updates. The code reviewer/delivery path should decide whether generated output normalization belongs in this branch finalization.
- Broad web typecheck remains blocked by existing repository-wide baseline issues outside the focused validation scope.

## Cleanup Performed

- Restored `autobyteus-web/generated/graphql.ts` after codegen probes.
- Left only `/tmp` logs/schema/backups outside the repository.
- No temporary repository-resident scaffolding remains.

## Classification

No reroute classification required; result is Pass. Because repository-resident durable coverage was updated, the required next recipient is `code_reviewer` for coverage-code re-review before delivery.

## Recommended Recipient

`code_reviewer`

## Evidence / Notes

- Coverage investigation was refreshed before editing durable coverage or final execution.
- Durable coverage update was narrow and boundary-local to the stale GraphQL E2E scenario.
- The Round 5 no-compatibility/no-legacy-retention constraint was enforced: stale member-created-time coverage was removed from the GraphQL query, and no roster/no-usage/range-mode coverage was retained.
- Runtime/model, token/cache/reasoning/cost, missing-price, fallback, empty/error/loading, and UI interaction behavior all have focused executable evidence.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: API/E2E validation passed for the current Round 5 implementation after one durable GraphQL E2E coverage update. Route the cumulative package back to `code_reviewer` for the required coverage-code re-review.
