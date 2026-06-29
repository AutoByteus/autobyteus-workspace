# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/code-review-report.md`
- Current Investigation Round: 2
- Trigger: Full refresh code review passed for the authoritative Round 5 implementation and requested API/E2E coverage investigation/execution after a power-off interruption.
- Prior Investigation Reviewed: Round 1 at this canonical path was reviewed and is superseded where it described earlier coverage updates before the Round 5 full-refresh implementation review. The Round 1 durable coverage additions are now existing repository-resident coverage, not new additions for this round.
- Latest Authoritative Investigation: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/api-e2e-coverage-investigation.md`

## Current Requirement And Design Basis

The current authoritative Round 5 basis is the requirements/design package plus `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/design-rework-round5-final-field-policy.md` and the full refresh code review report. Settings > Token Statistics is a usage/cost report, not a live team roster viewer. It must default to `By Task`, keep `By Model` as secondary runtime/model diagnostics, use observed usage-period filtering with a compact `Usage during period` affordance, and expose no `rangeMode` or `Tasks created in period` selector.

Round 5 requires exactly five new self-contained persisted display fields for Settings task rows: `teamName`, `agentName`, `runSummary`, `runCreatedAt`, and `memberName`. Existing ledger fields remain authoritative for run/team/member grouping, paths, runtime/model identity, token/cache/reasoning facts, costs, currency/status, and missing-price dimensions. `TokenUsageStatisticsProvider` owns Settings projections; GraphQL maps provider DTOs only; frontend store/components render and sort without local price math.

Task rows must group top-level standalone agent runs and root team runs by selected-period usage events, keep repeated runs separate, avoid double-counting team members as standalone rows, and show member rows only as expanded usage-derived children. Inactive/no-usage roster members, `periodUsageState`, member-created-time persistence/API fields, configured no-usage runtime/model labels, workspace display fields, roster order, and broad display-context/snapshot metadata are intentionally out of scope. Top-level `Created Time` uses `runCreatedAt` when available, falls back to earliest `observedAt` labelled `First usage observed`, and is the last visible `By Task` column. Member `Created Time` renders as a placeholder (`—` in the implementation) and does not imply a separately persisted member timestamp.

The implementation handoff's `Legacy / Compatibility Removal Check` was read. It records no backward-compatibility mechanisms for the removed roster/no-usage Settings shape, no retained old behavior in scope, obsolete roster/no-usage artifacts removed, and tight shared structures. Static inspection of the current Round 5 source scope found no `rangeMode`, `Tasks created in period`, `getStatisticsPerModel`, `periodUsageState`, `listTeamAgentMemberRoster`, `buildNoUsageTokenUsageCostSummaryAggregate`, `TokenUsageTeamMemberRosterEntry`, workspace display fields, member-created-time fields, or roster-order fields in the Settings/token-statistics implementation scope.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Five persisted display fields for Settings usage rows | Added / tightened | REQ-031..036, REQ-039; Round 5 field policy; implementation handoff | Existing display-field capturer coverage is still required and valid; GraphQL task E2E should also prove persisted display fields flow through row names/summaries/created time/member names. |
| Usage-derived team expansion only | Changed from earlier Round 3 direction; preserved in Round 5 | REQ-030; Round 5 team expansion policy; code review conclusions | Existing provider/web tests that omit no-usage roster rows are valid; no stale roster/no-usage coverage should be retained. |
| Member Created Time removed from Settings statistics API/UI | Removed / tightened | REQ-016, REQ-022; Round 5 created-time policy; code review scope | Existing GraphQL E2E still queries/asserts member `createdAt` and `createdTimeSource`; this is stale and must be updated before final execution. UI test that member cells render `—` remains valid. |
| Task grouping/no double counting/repeated runs | Added / preserved from redesign | REQ-003..007, REQ-020, AC-002, AC-007, AC-018 | Provider, GraphQL E2E, store, and task-table tests should be retained/run after validity update. |
| Runtime/model diagnostics grouped by runtime/model pair | Changed | REQ-026..028, AC-019..021; design spec DS-002 | Provider, GraphQL E2E, store, and model-table tests remain valid and should be run. |
| Compact observed-period date semantics with no `rangeMode` | Changed / removed old/future selector | REQ-018, REQ-019, REQ-029; UI matrix `range_meaning_compact` | Store/page tests and static scan remain required. |
| Cost breakdown, cache, reasoning, partial/missing/mixed status | Preserved / exposed in new task view | REQ-013..017, AC-009..010, AC-013; examples C/F | Existing aggregate/provider, GraphQL E2E, and task/model component coverage remains valid after the member-field update. |
| Generated GraphQL artifacts/codegen consistency | Operational validation | Implementation handoff risk; code review residual risk | Run a temporary built-schema codegen compatibility probe; do not persist generated output unless a real source change is required. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | GraphQL focused summaries, model diagnostics, and prior task-statistics GraphQL scenario | API boundary for REQ-003..017, REQ-022..028 | Needs Update | Static inspection of current file shows the task-statistics query still requests member `createdAt`/`createdTimeSource` and asserts those fields, but Round 5 removed member-created-time from Settings statistics. The current GraphQL type exposes member row id/route/run/name/path/models/runtime/aggregate only. | Update this file before final execution: remove stale member created-time query/assertions and add persisted display-field flow assertions for top-level/member rows. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts` | Provider aggregates runtime/model pairs, cost statuses, task rows, usage-derived team members, no double counting, and no no-usage roster rows | Provider boundary for REQ-003..017, REQ-026..030 | Still Valid | Current tests include `keeps expanded team rows usage-derived and omits no-usage roster members`; code review reran all 6 provider tests successfully. | Retain and run. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-display-field-capturer.integration.test.ts` | Captures standalone/team/member display fields, does not produce roster rows, preserves imported display fields | REQ-031..039; Round 5 five-field policy | Still Valid | Current tests cover standalone `agent_name`, team/member `team_name`/`member_name`, and imported display fields winning over metadata. | Retain and run. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts` | Ledger store focused run/team/member summaries, cache/reasoning/cost status semantics | Existing ledger/focused Token Meter preservation; REQ-038 | Still Valid | Code review reran with provider tests successfully; focused summaries are preserved separately from Settings projections. | Retain and run. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` | Provider-specific GraphQL cost semantics for local/no-bill and missing prices | Cost/status preservation | Still Valid / optional for this focused round | Historical Settings projection coverage is covered by provider and task GraphQL E2E; this E2E remains valid but not mandatory for the current changed path. | Do not edit; run only if needed/time permits. |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Real runtime token event production and GraphQL summary behavior, env-gated | Runtime production, not Settings projection | Out Of Scope for mandatory local run | Existing env-gated runtime test is not required for historical projection/UI changes. | Do not require local run. |
| `autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts` | Store queries task/model stats with only `startTime`/`endTime`, no `rangeMode`, normalization/fallback/error behavior | REQ-018, REQ-029, AC-011..012, AC-019..021 | Still Valid | Current test asserts no `rangeMode`, task/member aggregate normalization, runtime/model Unknown fallback, and GraphQL error state. | Retain and run. |
| `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts` | Settings page default tab/date fetch, compact usage-period affordance, empty states, tab switching | REQ-001, REQ-018..019, REQ-021, REQ-029; AC-001, AC-011..014 | Still Valid | Current test asserts `By Task` default, compact title tooltip, no `Tasks created in period`/`rangeMode`, shared date range, and empty copy. | Retain and run. |
| `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` | Task table column order, default created-time sort, fallback label, expand/collapse, member attachment, cost details, no roster/no-usage copy | REQ-006..017, REQ-020, REQ-023..025, REQ-030; AC-002..010, AC-013, AC-015, AC-017 | Still Valid | Current test asserts Created Time is last visible column, `First usage observed`, mixed runtime/model, member rows attached after total-cost sorting, no inactive roster member/no-usage copy, and cost breakdown/missing dimensions. | Retain and run. |
| `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts` | Model diagnostics table/runtime column, same model under different runtimes, Unknown fallback, cache/thinking/status/chart labels | REQ-026..028; AC-019..021 | Still Valid | Current test covers runtime/model distinct rows and Unknown fallback. | Retain and run. |
| `autobyteus-web/graphql/queries/token_usage_statistics_queries.ts` | GraphQL documents for task/model queries | REQ-018, REQ-029; GraphQL schema compatibility | Still Valid but needs executable probe | Static inspection shows only `startTime`/`endTime`; code review codegen probe passed. | Run built-schema codegen compatibility probe and restore any generated drift. |
| Other Settings/run-history/memory tests | Unrelated Settings cards and run-history behavior | Not the changed Settings token-statistics boundary | Out Of Scope | No current requirement change to those surfaces. | No action. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` task-statistics member selection | Member rows expose `createdAt` and `createdTimeSource` through GraphQL. | Round 5 explicitly removes member-created-time from Settings statistics; member `Created Time` is a UI placeholder and no member-created-time field is persisted/API-exposed. | REQ-016, REQ-022; Round 5 created-time policy; code review scope and GraphQL type inspection. | Updated GraphQL E2E will query only current member fields and continue proving member row identity, display name, path/runtime/model, aggregate, and no double counting. UI task-table spec proves member Created Time renders `—`. | No separate GraphQL replacement for member-created-time because the field is intentionally out of scope. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None as a new file/scenario in this round | N/A | Existing focused durable coverage already covers the needed surfaces after update. | N/A | This round only needs to update stale existing GraphQL E2E assertions for Round 5, not add new files. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-001-R2 | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` task statistics scenario | Remove member `createdAt`/`createdTimeSource` query/assertions; add helper/payload support for five display fields; assert task row display names/summaries/`runCreatedAt` and member names flow through GraphQL while legacy rows still fall back to `Unknown`/`FIRST_USAGE_OBSERVED`; keep no-double-counting and runtime/model diagnostics assertions. | REQ-003..017, REQ-022..036, REQ-039; Round 5 final field policy | Repository-resident durable coverage update required after this investigation, so successful validation must route back to `code_reviewer`. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | No test file/scenario needs deletion; only stale fields within an otherwise valid GraphQL E2E scenario need update. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| PROBE-001-R2 | Static scan for `rangeMode`, `Tasks created in period`, `periodUsageState`, roster/no-usage helpers, broad display-context fields in the current Settings/token-statistics scope | Confirms no removed Round 3/4 or future range-mode paths remain in current source | Static evidence only; durable tests already assert important absence behavior. |
| PROBE-002-R2 | Build server GraphQL schema from built dist with `buildGraphqlSchema()` | Confirms current GraphQL schema builds with Round 5 task/runtime-model types | Build/schema probe is validation evidence, not repository coverage. |
| PROBE-003-R2 | Built-schema GraphQL codegen compatibility probe using a temporary `/tmp` schema file and restoring generated output if changed | Confirms frontend GraphQL documents match the built schema and records generated artifact drift | Codegen is a maintenance command, not durable test coverage. |
| PROBE-004-R2 | Focused grep of broad web typecheck log for `TokenUsage`, `token-usage`, or `tokenUsageStatistics` if broad typecheck remains red | Confirms known broad baseline typecheck failure is unrelated to this change | Baseline failure evidence only. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full browser/Electron visual smoke of Settings page | Repository component tests and GraphQL E2E are the practical automated coverage in this pass; no dedicated Playwright/Electron Settings harness was found. | Real browser spacing/overflow can still differ from component rendering. | Delivery/user verification may perform manual visual scan if desired; no API/E2E blocker. |
| Real provider/runtime token generation through Codex/Claude/Autobyteus | The changed behavior is historical projection and Settings UI, not runtime token event production; env-gated runtime E2E remains separate. | Low risk for runtime production regression. | No escalation; leave env-gated runtime E2E for runtime-specific validation. |
| Future `Tasks created in period` mode | Explicitly out of scope and must remain absent. | N/A | None for this task. |
| Performance of large period backfill metadata lookups | Accepted implementation/design risk; not practical to load-test in this API/E2E pass without production-like data. | Large date ranges could be slower. | Delivery notes should preserve accepted residual risk. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None requiring upstream reroute before validation | N/A | Requirements, Round 5 design, implementation handoff, code review, and current source inspection align. The only finding is stale durable coverage in an existing GraphQL E2E scenario. | N/A |

## Execution Plan

1. Update `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` according to API-001-R2.
2. Run focused backend API/E2E and integration coverage:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts`
   - `pnpm -C autobyteus-server-ts exec vitest run tests/integration/token-usage/providers/statistics-provider.integration.test.ts tests/integration/token-usage/providers/token-usage-display-field-capturer.integration.test.ts tests/integration/token-usage/providers/token-usage-store.integration.test.ts`
3. Run focused frontend Settings/store/component coverage:
   - `pnpm -C autobyteus-web exec vitest run components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts stores/__tests__/tokenUsageStatistics.spec.ts components/settings/__tests__/TokenUsageStatistics.spec.ts components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts`
4. Run static/quality checks and probes: `git diff --check`, forbidden-term scan, server TypeScript/build, built schema, web guards/localization/Nuxt prepare, codegen compatibility probe, and broad web typecheck with token-statistics grep if time permits.
5. Restore temporary generated/codegen artifacts after probes unless a real reviewed source change is required.
6. Write/update `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/api-e2e-execution-coverage-report.md` with latest evidence.
7. Because repository-resident durable coverage will be updated after the full refresh code review, route the cumulative package back to `code_reviewer` on pass.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: The current implementation appears aligned with Round 5. The only pre-execution coverage finding is a stale GraphQL E2E member-created-time assertion that must be updated locally before final validation.
