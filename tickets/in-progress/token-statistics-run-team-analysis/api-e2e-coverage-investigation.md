# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review passed and requested API/E2E coverage investigation for the Token Statistics task/team run redesign.
- Prior Investigation Reviewed: N/A — first API/E2E coverage investigation round.
- Latest Authoritative Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/api-e2e-coverage-investigation.md`

## Current Requirement And Design Basis

The approved requirements and reviewed design require Settings > Token Statistics to default to a task-oriented `By Task` view, keep the model diagnostics as a secondary `By Model` tab, use the existing usage-observed date range semantics with static `Usage during period` help text, and avoid any `rangeMode` argument or UI selector. The API must expose task rows grouped by standalone agent run and root team run, render team members only under their parent team row, sort top-level task rows by created time descending, preserve repeated team runs as separate rows, and surface run-history metadata when available with explicit `First usage observed` fallback when metadata is missing. The model diagnostics API must group by runtime/model pair, expose runtime, cache, thinking, pricing status, and use `Unknown` fallbacks for missing runtime/model values. The UI must show ordered columns, expandable team rows, member rows attached to parents, cost detail breakdowns with thinking included in output, missing price dimensions, empty/loading/error copy, and no double counting.

The implementation handoff's `Legacy / Compatibility Removal Check` was read. It states no in-scope backward-compatibility mechanisms were introduced, old model-only UI/default behavior was removed, the model operation remains only as a valid secondary diagnostics entrypoint, and stale private aggregation paths were removed. Static inspection did not identify compatibility wrappers, dual-path range controls, or old model-only default UI in changed source.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| GraphQL `tokenUsageTaskStatisticsInPeriod` task/team projection | Added | REQ-003 through REQ-017; design spec backend GraphQL task rows; implementation handoff key files | Add durable GraphQL E2E coverage for task rows, root team rows, nested members, no standalone duplication, fallback metadata, aggregate cost/status fields, and sorting. |
| GraphQL `usageStatisticsInPeriod` runtime/model diagnostics | Changed | REQ-026 through REQ-028; AC-019 through AC-021; implementation changed provider from model-only to runtime/model pair | Update/add durable GraphQL E2E coverage that same model under different runtimes produces separate rows and runtime/aggregate fields are exposed. Existing model statistics tests remain valid only if interpreted as secondary diagnostics. |
| Settings > Token Statistics default view and date semantics | Changed | REQ-001, REQ-018, REQ-019, REQ-029; AC-001, AC-022; UI prototype spec | Add durable component/store coverage for `By Task` default, static `Usage during period` help, no range-mode UI/query variable, and fetch behavior. |
| Team member display/no double counting in UI | Added | REQ-005, REQ-016, AC-004 through AC-007, UI behavior matrix `task_stats_expand_team` | Add durable component coverage for expand/collapse, member row attachment, cost detail, and top-level sorting that keeps members under parent. |
| Created-time metadata and fallback display | Added | REQ-006, REQ-022 through REQ-025; AC-016 through AC-018 | Cover API fallback in GraphQL when metadata is absent and UI `First usage observed` label. Existing provider integration mock already covers run-history source behavior; retain as still valid. |
| Cost breakdown, partial/missing/mixed status, thinking semantics | Added/Changed | REQ-013 through REQ-017; AC-009, AC-010, AC-013; examples C/F | Add durable UI component coverage for breakdown rows, missing price dimensions, thinking included copy, and runtime/model diagnostics table. Backend provider tests already cover status math; retain and run focused set. |
| Old model-only default and fake range-mode selector | Removed | REQ-029, design rework AR-001, code review legacy verdict | Do not retain or add compatibility coverage for old default/range selector; assert absence in UI/query behavior instead. |
| Frontend generated GraphQL artifacts | Unclear operationally, not behavior authority | Implementation handoff and code review residual risk: codegen needs live backend URL; runtime code uses local interfaces | Execute live-backend codegen consistency as a temporary validation probe if practical. Do not treat generated files as runtime coverage; record whether generated output was restored or requires downstream finalization. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts` | Provider-level total cost, runtime/model grouping, mixed currencies, partial price, task grouping, team members, no standalone duplication, mocked run-history/fallback behavior | Backend grouping and status requirements REQ-003..017 and REQ-026..028 | Still Valid | Static review shows it targets `TokenUsageStatisticsProvider` directly and was updated by implementation; code review reran it successfully. It is provider/integration coverage, not full GraphQL/API coverage. | Retain and run focused integration test as part of final executable checks. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts` | Ledger store aggregation/focused run/team/member summary semantics | Existing ledger accounting and focused Token Meter summary preservation | Still Valid | Implementation changed ledger-store summary delegation to run-summary adapter; code review reran successfully. | Retain and run with provider integration. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | GraphQL focused run/team/member summaries, total cost, and historical model statistics from persisted ledger events | GraphQL token usage boundary; model diagnostics preservation | Needs Update | Existing assertions still prove focused summary path but do not cover new task statistics query, runtime/model fields, or no-double-count task rows. | Update this E2E file with a task-statistics/runtime-model scenario rather than adding a parallel fixture helper. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` | Provider-specific token/cost semantics over GraphQL, local/no-bill and missing-price rows | Cost status and provider semantics preserved | Still Valid | It exercises GraphQL cost semantics that the aggregate builder still owns. Not a task/UI coverage substitute. | Retain; focused run optional unless time permits after new E2E. |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Real runtime token usage event persistence and GraphQL summary behavior, gated by env | Runtime/lifecycle token reporting | Still Valid / Out Of Scope for mandatory local run | It is real-runtime and skipped unless `RUN_RUNTIME_TOKEN_USAGE_E2E=1`; current task changes historical statistics projection, not runtime production. | Do not require real runtime run for this local pass; record as out-of-scope gated coverage. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-model-list.e2e.test.ts` | Token usage model listing | Not materially changed by Settings statistics redesign | Out Of Scope | No requirement changes to model listing. | No action. |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` and `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` | Live/focused Token Meter UI/store behavior | Preserved existing focused token meter, not Settings historical view | Still Valid for preserved area / Out Of Scope for new Settings coverage | Requirements preserve existing focused summaries but add historical Settings view. | Retain; no need to update unless shared formatter regression appears. |
| Existing `autobyteus-web/components/settings/__tests__/*` | Settings component tests for other cards/managers | Settings test conventions | Out Of Scope | No TokenUsageStatistics Settings component test currently exists. | Use patterns to add new component coverage. |
| `autobyteus-web/stores/tokenUsageStatistics.ts` (no existing spec) | Store queries task/model stats and normalizes response | GraphQL query boundary from UI to backend; no `rangeMode` variable | Needs Update (coverage missing) | Static inspection shows new store has no durable test. | Add store spec for both GraphQL queries, variables, normalization, fallbacks, and error path as needed. |
| `autobyteus-web/components/settings/TokenUsageStatistics.vue` (no existing spec) | Page shell, default tab, date controls, loading/error/empty states | AC-001, AC-011, AC-012, AC-014, AC-022 | Needs Update (coverage missing) | No component test for new default view/static help. | Add component spec with mocked store. |
| `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` (no existing spec) | Sortable task table, team expansion, member rows, cost detail | AC-002 through AC-010, AC-013, AC-015, AC-017 | Needs Update (coverage missing) | New component has no durable coverage. | Add component spec for default sort, expand/collapse, member attachment, fallback label, and cost breakdown. |
| `autobyteus-web/components/settings/token-usage/TokenUsageModelStatisticsTable.vue` (no existing spec) | Runtime/model diagnostics table/chart | AC-019 through AC-021 | Needs Update (coverage missing) | New component has no durable coverage. | Add focused component assertions for runtime column, separate same-model rows by runtime, Unknown fallback, thinking diagnostic, cache copy, and chart labels. |
| `autobyteus-web/graphql/queries/token_usage_statistics_queries.ts` | GraphQL documents for task/model queries | No `rangeMode`, aggregate fragment, runtime/model query | Needs Update (coverage missing) | Runtime code uses local interfaces, so generated GraphQL is not authoritative. | Store spec should assert query calls have only `startTime`/`endTime`; codegen probe validates document/schema consistency. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None identified | N/A | Static inventory did not find a test that asserts old model-only default Settings behavior or a `rangeMode` selector. | Code review legacy verdict; `rg rangeMode` expected to remain absent. | New coverage will assert no range-mode variable/UI. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-001 | GraphQL task statistics returns standalone and root team rows, team members nested, member runs not top-level, repeated team runs separate, fallback metadata explicit, and aggregates/status fields correct | REQ-003..017, REQ-022..023; AC-002..007, AC-017..018 | Update `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Provider integration does not prove GraphQL schema/resolver/transport mapping. |
| API-002 | GraphQL model diagnostics groups same model by runtime/model pair and exposes runtime plus aggregate fields | REQ-026..028; AC-019..021 | Update `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Existing E2E still only checks legacy alias fields. |
| WEB-STORE-001 | Frontend store sends task and model queries with only `startTime`/`endTime`, normalizes task/member/model aggregate payloads, and applies `Unknown`/fallback statuses | REQ-018, REQ-029; AC-011, AC-012, AC-019..022 | Add `autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts` | Runtime code intentionally avoids stale generated types; store is the critical UI/API boundary. |
| WEB-UI-001 | Settings page defaults to `By Task`, renders static `Usage during period`, has no `Tasks created in period` or `rangeMode`, fetches with selected dates, and switches tabs without date reset | REQ-001, REQ-018, REQ-019, REQ-029; AC-001, AC-011, AC-012, AC-022 | Add `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts` | This is the primary user-facing behavior and currently lacks durable coverage. |
| WEB-UI-002 | Task table default sort, team expand/collapse, member row attachment, fallback time label, missing price dimensions, and cost breakdown thinking-included copy | AC-002..010, AC-013, AC-015, AC-017 | Add `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` | Component behavior is too important to rely solely on static review. |
| WEB-UI-003 | Model diagnostics table renders runtime/model rows distinctly, including same model under two runtimes and Unknown fallback | REQ-026..028; AC-019..021 | Add `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts` | Store/API coverage does not prove user-visible runtime/model table labels and chart row labels. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-001/API-002 | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Add a new GraphQL E2E scenario querying `tokenUsageTaskStatisticsInPeriod` and enhanced `usageStatisticsInPeriod` fields | REQ-003..017, REQ-026..028; AC-002..007, AC-019..021 | Existing assertions remain valid for focused summaries and alias compatibility in the secondary diagnostics query. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| PROBE-001 | Build server GraphQL schema from built dist with `buildGraphqlSchema()` | Schema compiles with added task aggregate GraphQL types | Existing review ran this; rerun as validation evidence, not a new durable test. |
| PROBE-002 | Temporary local built Fastify GraphQL server plus `pnpm -C autobyteus-web codegen` with `BACKEND_GRAPHQL_BASE_URL` | Frontend GraphQL documents are consistent with live schema and reveal whether generated artifacts are stale | Codegen itself is a maintenance command; generated output is not coverage and will be restored if modified unless finalization decides to persist it. |
| PROBE-003 | Focused static grep for `rangeMode` / `Tasks created in period` in changed source | Confirms no fake MVP range-mode control or variable | Static probe is evidence, not durable coverage. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full browser visual/Electron rendering with live backend data | No existing Playwright/browser E2E harness for this Settings page was found in the repository; component tests plus GraphQL E2E cover the practical boundary locally. | Visual spacing/overflow nuances could still differ in real Electron/browser. | Delivery/user verification should include manual visual scan if desired; no requirement/design gap. |
| Real runtime token production through Codex/Claude/Autobyteus | Existing real-runtime test is env-gated and the change is historical projection/UI, not token event production. | Runtime production regressions are unlikely from this change; event shape is covered by existing runtime tests. | No escalation; keep gated runtime E2E for runtime-specific runs. |
| `Tasks created in period` mode | Explicitly out of scope for MVP and must not be implemented. | N/A | No follow-up in this task. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently requiring reroute | N/A | Upstream requirements/design/code review align and no compatibility wrapper was found during investigation. | N/A |

## Execution Plan

1. Add/update durable coverage listed above: one backend GraphQL E2E update plus focused frontend store/page/table component specs.
2. Run focused backend tests: updated token-usage GraphQL E2E and provider/store integration tests.
3. Run focused frontend tests: new token usage store/component specs.
4. Run static/probe checks: `rg rangeMode`, frontend guards/localization audit, Nuxt prepare/typecheck status as feasible, server build/schema build.
5. Execute live-backend codegen consistency probe using built server GraphQL; restore generated output if the probe modifies `autobyteus-web/generated/graphql.ts`, then record whether generated artifacts remain stale for downstream finalization.
6. Write `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/api-e2e-execution-coverage-report.md` with pass/fail evidence.
7. Because repository-resident durable coverage will be added/updated after the prior code review, hand the cumulative package back to `code_reviewer` rather than `delivery_engineer` on pass.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Coverage gaps are local to API/E2E durable tests and executable validation. No requirement/design gap or implementation compatibility violation was identified before validation.
