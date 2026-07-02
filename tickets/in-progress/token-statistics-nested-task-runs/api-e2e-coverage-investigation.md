# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-nested-task-runs/tickets/in-progress/token-statistics-nested-task-runs/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-nested-task-runs/tickets/in-progress/token-statistics-nested-task-runs/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-nested-task-runs/tickets/in-progress/token-statistics-nested-task-runs/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-nested-task-runs/tickets/in-progress/token-statistics-nested-task-runs/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-nested-task-runs/tickets/in-progress/token-statistics-nested-task-runs/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-nested-task-runs/tickets/in-progress/token-statistics-nested-task-runs/code-review-report.md`
- Current Investigation Round: `1`
- Trigger: Code review passed and routed to API/E2E for Token Statistics nested task/task-agent row validation.
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: `Round 1`

## Current Requirement And Design Basis

Current approved behavior requires Token Usage to be self-contained. New team-context token usage events must persist `root_team_run_id` plus a canonical `execution_address_json` / `execution_address` / `executionAddress` snapshot whose ordered segments identify direct members, delegated task-team executions, delegated task-agent executions, and nested task execution prefixes. `team_run_path_json`, `member_path_json`, payload `team_run_path` / `member_path`, GraphQL `teamRunPath` / `memberPath`, and Task statistics `members` are decommissioned as active hierarchy surfaces. The backend `TokenUsageStatisticsProvider.getTaskStatisticsInPeriod` must build recursive rows from ledger-owned data only and expose `children` rows with row kinds `TEAM_RUN`, `AGENT_RUN`, `MEMBER_RUN`, `TASK_TEAM_RUN`, and `TASK_AGENT_RUN`. The frontend renders backend-provided `children` only.

Implementation handoff `Legacy / Compatibility Removal Check` was reviewed. It records no introduced backward-compatibility mechanisms, no retained old behavior in active scope, and active removal/decommission of old Token Usage source/API/client path surfaces. The only non-blocking legacy item is physical cleanup of dormant SQLite columns `team_run_path_json` and `member_path_json`; they are not active hierarchy authority. API/E2E coverage cleanup remains downstream-owned.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Ledger event hierarchy identity is `root_team_run_id + execution_address_json`. | Added / Changed | `FR-001` to `FR-008`; design DS-001/DS-002; implementation handoff What Changed. | API/E2E fixtures must insert/query `execution_address` / `executionAddress`, not old path fields. |
| Task statistics response uses recursive `children` rows. | Changed | `FR-009` to `FR-011`; `AC-007`; design removal plan; code review pass. | Existing GraphQL E2E queries that request `members` are stale and must be updated. |
| Task row kinds include `MEMBER_RUN`, `TASK_TEAM_RUN`, and `TASK_AGENT_RUN`. | Added | `FR-010`; `AC-002` to `AC-006`; design examples. | API/E2E must assert task-team/task-agent/nested row placement and aggregate containment. |
| Multiple same-target delegated executions remain separate by run id/address. | Added / Changed | `FR-015`; `AC-004`; code review residual risk. | Durable API/E2E should add same logical task-team/task-agent repeated execution evidence. |
| Runtime/model statistics and unit-price aggregate semantics remain unchanged. | Preserved | `FR-017`; `AC-009`; implementation handoff preserved runtime/model math. | Existing API/E2E semantic tests are still valid after replacing old task child query shape. |
| Legacy no-address rows remain visible without guessed task parentage. | Preserved with changed fallback labeling | `FR-016`; `AC-010`; design DS-005; implementation handoff. | API/E2E must preserve fallback team child visibility and assert no old path heuristic parentage. |
| Active `members`, `teamRunPath`, `memberPath`, `team_run_path`, and `member_path` Token Usage hierarchy surfaces. | Removed | `FR-011`, `FR-012`; design removal/decommission plan; code review legacy verdict. | Durable tests asserting these active fields are stale; update rather than route as implementation defect. |
| GraphQL client query has finite recursive depth while backend model is recursive. | Preserved limitation / Deferred | Implementation handoff Important Assumptions; code review residual risk. | Record as deferred follow-up if product needs deeper visible trees; API/E2E will assert current practical depth, not unbounded query recursion. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` — run/team/member summaries, settings statistics. | GraphQL summaries/statistics hydrate accounting fields and aggregate totals. | `FR-017`, `AC-009`; Token Meter summary preservation. | `Needs Update` | Summary scenario remains valid, but helper still accepts/writes `team_run_path`/`member_path`; task statistics scenario queries `members` and `memberPath`. | Update helper to use `execution_address`; keep summary/runtime/model assertions; update Task statistics assertions to `children`. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` — task statistics rows without double counting. | Old one-level `members` rows under `TEAM_RUN`; old path fields appear in expected member rows. | Replaced by `FR-009` to `FR-016`, `AC-002` to `AC-011`. | `Needs Update` | Static inspection found GraphQL query `members { ... memberPath }` and expectations `newerTeam.members`. These fields are intentionally removed. | Convert to recursive `children`; add task-team, task-agent, nested task-agent, same-target repeated execution, legacy fallback, no standalone duplicated child rows, and no `members` schema field checks. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts`. | Unit-price hydration on summaries, task stats aggregates, and runtime stats. | `FR-017`, `AC-009`; implementation says unit-price and runtime/model math preserved. | `Needs Update` | Unit-price semantics still current, but task stats query uses `members` and fixtures write `member_path` / `team_run_path`. | Replace team member fixtures with `execution_address` direct member segments and query child rows via `children`. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts`. | Provider-specific token semantics, local no-bill, missing price, historical unknown rows through GraphQL summaries. | `FR-017`; unrelated to task hierarchy shape. | `Still Valid` | No `tokenUsageTaskStatisticsInPeriod`, `members`, `teamRunPath`, or `memberPath` references in relevant query. | Execute as current valid Token Usage GraphQL API coverage. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-model-list.e2e.test.ts`. | Settings-facing model-list coverage. | Not part of Token Statistics task hierarchy change. | `Out Of Scope` | No task statistics or ledger hierarchy behavior. | Do not modify for this task. Run only if broad token-usage e2e command is chosen. |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts`. | Gated real-runtime standalone token usage persistence and GraphQL exposure. | `FR-017` and producer-side token usage ingestion generally. | `Still Valid` for standalone runtime; `Out Of Scope` for nested task hierarchy. | It is gated behind `RUN_RUNTIME_TOKEN_USAGE_E2E=1`, and current environment has this unset. It does not cover nested task-team/task-agent hierarchy. | Do not edit. Run only if explicitly enabled; otherwise record as not executed. |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`. | Gated live mixed-runtime task-agent and task-team delegation activation flows. | Runtime propagation residual risk; `AC-001`, `AC-005`, `AC-006` adjacent. | `Still Valid` existing live task-delegation coverage; `Needs Expansion` would be separate future live token-stat coverage. | Existing file validates task activation notifications, not token usage statistics. It is gated by `RUN_MIXED_TASK_DELEGATION_E2E=1` or both `RUN_LMSTUDIO_E2E=1` and `RUN_CODEX_E2E=1`; current environment has these unset. | Do not edit in this round. Use durable GraphQL ledger API coverage plus source-level checks; record live nested runtime execution as deferred/not run unless env becomes available. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts`. | Provider-level recursive rows, legacy fallback, nested task-team/task-agent behavior. | `FR-008` to `FR-016`, `AC-002` to `AC-006`, `AC-010`. | `Still Valid`, with a residual gap for repeated same-target executions. | Code review ran it successfully. It is integration/source-level, not GraphQL API/E2E. | Execute as supporting coverage. API/E2E will add repeated same-target GraphQL coverage. |
| `autobyteus-server-ts/tests/unit/agent-execution/events/token-usage-event-enrichment-transformer.test.ts`. | Enricher copies runtime `tokenUsageExecutionScope` into token usage payload. | `FR-001` to `FR-007`, `AC-001`, `AC-005`. | `Still Valid` | Code review ran it successfully; source-level producer-side check. | Execute as supporting coverage. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/member-team-context-builder.test.ts`. | Runtime member context builds direct/subteam scopes and communication manifests. | `FR-004`, runtime propagation part of `FR-001` to `FR-007`. | `Still Valid` | Code review ran it successfully; source-level runtime context check. | Execute as supporting coverage. |
| `autobyteus-web/graphql/queries/token_usage_statistics_queries.ts`, `autobyteus-web/stores/tokenUsageStatistics.ts`, `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts`, `autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts`. | Frontend query/store/table consume recursive `children` and `executionAddress`. | `FR-009`, `FR-011`, `AC-007`, `AC-008`. | `Still Valid` | Static inspection shows current query requests `children` and `executionAddress`; focused tests were updated and code-review executed them. | Execute focused web tests as supporting UI coverage if time permits after API checks. |
| `autobyteus-server-ts/tests/e2e/workspaces/*`, `autobyteus-server-ts/tests/e2e/runtime/*roundtrip*`, and frontend run-history stores using `members` or `memberPath`. | Run-history/team metadata `members` and `memberPath` contracts, not Token Usage Task statistics. | Out of scope; design only removes Token Usage Task statistics `members`/path surfaces. | `Out Of Scope` | Static inspection shows these are run-history/team communication metadata, not `tokenUsageTaskStatisticsInPeriod`. | Do not edit for this task. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` task statistics query. | GraphQL `TokenUsageTaskStatisticsRowGraphql.members` exists and member child rows expose `memberPath`. | Active API contract intentionally replaced member-only children with recursive `children`; old paths are removed/decommissioned hierarchy surfaces. | `FR-009` to `FR-012`; `AC-007`; design removal plan; code review legacy verdict. | Updated same test file will query `children`, `rowKind`, `executionAddress`, task run ids, and aggregates. | N/A |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts` task stats unit-price query. | Unit-price aggregate assertions read child rows through `members`. | The aggregate behavior remains valid, but child transport shape changed to recursive `children`. | `FR-011`; implementation handoff preserved unit-price math and replaced `members`. | Updated query will find the direct `MEMBER_RUN` child in `children` and assert the same unit-price aggregate semantics. | N/A |
| Token-usage E2E fixture fields `teamRunPath` / `memberPath` used as hierarchy data. | Synthetic events populate old path fields instead of `execution_address`. | Old path fields are no longer active hierarchy authority and are ignored by current parser/repository. | `FR-001`, `FR-012`; design legacy removal policy; implementation handoff. | E2E fixtures will use `executionAddress` with direct member, task-team, and task-agent segments. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `API-TASK-001` | GraphQL Task statistics exposes `children` and `executionAddress`, not `members`. | `FR-009`, `FR-011`, `AC-007`; no dual compatibility path. | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Prevents stale API compatibility from reappearing and validates the transport boundary. |
| `API-TASK-002` | Delegated task-team members nest under a `TASK_TEAM_RUN` row and do not appear as top-level unknown team rows. | `AC-001`, `AC-002`, `AC-003`; design screenshot fix. | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Main user-facing failure must have API-level evidence, not only provider unit/integration evidence. |
| `API-TASK-003` | Delegated task-agent row appears under owning team context and nested task-agent appears under nearest task-team prefix. | `AC-005`, `AC-006`; design execution-node scanning rule. | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Covers task-agent row kind and ordered-prefix parentage through GraphQL. |
| `API-TASK-004` | Same logical target repeated as two task-team executions and two task-agent executions remains separate by run id/address. | `FR-015`, `AC-004`; code review residual risk. | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Reviewer identified this as a residual risk not separately asserted by focused source tests. |
| `API-TASK-005` | Legacy/no-address team usage remains visible as fallback direct child and is not attached to task-team/task-agent hierarchy by heuristics. | `FR-016`, `AC-010`; design DS-005. | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Ensures compatibility data visibility does not become invalid old-path hierarchy inference. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `API-TASK-006` | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` existing task statistics scenario. | Replace old path fixture inputs with `executionAddress`; replace `members` assertions with recursive `children`; keep runtime/model diagnostics assertions. | `FR-009` to `FR-017`, `AC-007`, `AC-009`. | This is an update, not an implementation defect; old assertions were intentionally removed behavior. |
| `API-TASK-007` | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts` task stats unit-price child assertion. | Use direct member `executionAddress` fixtures and `children` child lookup. | `FR-017`, `AC-009`, `FR-011`. | Unit-price semantics remain unchanged. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None planned. | Existing relevant E2E files remain useful after updates. | N/A | Update stale assertions in place. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `TEMP-SCHEMA-001` | Run focused GraphQL E2E schema/tests after edits; include a negative schema query/introspection if useful to confirm `members` is absent. | API contract cleanup from `members` to `children`. | The durable test assertions will live in the E2E test file; no separate probe file should remain. |
| `TEMP-LIVE-001` | Check environment gates for live task-delegation/runtime token usage E2E (`RUN_MIXED_TASK_DELEGATION_E2E`, `RUN_LMSTUDIO_E2E`, `RUN_CODEX_E2E`, `RUN_RUNTIME_TOKEN_USAGE_E2E`). | Determines whether live nested runtime execution is feasible in this run. | Environment discovery is task evidence, not durable code. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full live nested LLM task-team/task-agent execution producing real token ledger rows. | Current environment has `RUN_MIXED_TASK_DELEGATION_E2E`, `RUN_LMSTUDIO_E2E`, `RUN_CODEX_E2E`, and `RUN_RUNTIME_TOKEN_USAGE_E2E` unset. Existing live mixed task-delegation E2E is gated and model/service dependent; forcing it on without configured LM Studio/Codex task-delegation model would not be a reliable validation path. | A missed live runtime propagation path could still produce fallback rows despite source-level and API ledger coverage. | Record as deferred live-environment validation. Durable GraphQL API coverage will prove persistence/projection/API behavior from ledger rows; source-level runtime scope tests remain supporting evidence. No requirement/design reroute is needed because upstream already names live execution as residual risk, not a blocking acceptance condition for this local environment. |
| Unbounded GraphQL recursive depth beyond current frontend query depth. | GraphQL client selection is finite by implementation assumption. Backend model is recursive; product has not required unlimited visible depth. | Deep trees beyond selected query depth may be truncated in the web client. | Record delivery follow-up/documentation note; no API/E2E defect unless product requires deeper visible nesting now. |
| Physical DB drop of `team_run_path_json` and `member_path_json`. | Implementation explicitly sequenced physical cleanup as non-blocking migration follow-up. | Dormant columns remain in old migration history/local DB. | Delivery should preserve follow-up visibility; active code/API/E2E must not rely on them. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently. | N/A | Upstream package explicitly defines new hierarchy/address model, old surface removal, legacy fallback, and finite query-depth risk. | N/A |

## Execution Plan

1. Update `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` to use `executionAddress` fixtures and recursive `children` assertions, including `TASK_TEAM_RUN`, `TASK_AGENT_RUN`, nested task-agent, repeated same-target task-team/task-agent executions, legacy fallback, aggregate containment, and no duplicate standalone rows for team children.
2. Update `autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts` to use direct-member `executionAddress` fixtures and assert unit-price aggregates through `children`.
3. Run focused formatting/static checks where applicable (`git diff --check`, server build typecheck).
4. Run focused API/E2E GraphQL coverage: token-usage ledger GraphQL, unit-price GraphQL, and provider semantics GraphQL tests. Include the provider integration/unit enrichment/context tests as supporting execution evidence.
5. Run focused frontend recursive Token Statistics tests if the server API checks pass, because the API response shape feeds the UI query/store/table.
6. Write the canonical execution coverage report and route back to `code_reviewer`, because repository-resident durable API/E2E coverage will be updated after the prior code review.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing stale coverage asserts intentionally removed `members`/path behavior, so the correct action is durable coverage update, not implementation reroute. Live nested LLM runtime execution is not feasible in the current ungated environment; this is recorded as deferred residual risk while API-level ledger/projection coverage is added and executed.
