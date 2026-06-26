# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/investigation-notes.md`
- Provider Probe Matrix: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/provider-probe-matrix.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review passed and handed the implementation to API/E2E coverage investigation and execution.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior requires one server-owned, provider-aware token usage and pricing path from runtime/provider token usage events through ledger persistence, GraphQL hydration, live WebSocket/frontend store updates, and Token Meter presentation. The critical externally visible behavior to prove at API/E2E or broader executable level is:

- GraphQL run/team/member summaries expose component fields using the new public names: `grossInputTokens`, `standardInputTokens`, cache read/write/subtype tokens, output/reasoning/billable output, cache rates, cache state, component costs, missing dimensions, pricing policy/tier metadata, current prompt/context fields, and `usageReportCount`.
- Historical hydration and live `TOKEN_USAGE_UPDATED` updates converge on the same Token Meter shape and values.
- Cached gross-input providers show gross input, cache read tokens/rate, uncached/standard tokens, and component costs.
- Anthropic/base-excludes-cache style data uses additive gross input and cache-write subtype fields rather than the removed global `input - cache` invariant.
- Missing or partial pricing stays explicit; custom OpenAI-compatible endpoints without trusted pricing do not show trusted zero cost.
- Local/no-provider-bill usage is labeled/statused as `local_no_api_bill`.
- Mixed currencies keep token totals but return null aggregate monetary totals and `mixed` status.
- Historical/unknown semantic rows are not reinterpreted through the old flat formula; they remain unknown/partial where unsafe.
- Runtime live WebSocket coverage remains valid but may be gated behind real runtime environment variables/credentials.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanisms were introduced, old global cache-subtraction pricing and custom endpoint trusted-zero behavior were replaced, frontend accounting-token fallback was removed, and ambiguous `Input`/raw `events` primary UI was replaced. The coverage signal from that section is to avoid adding or retaining tests that assert old public names (`inputTokens`, `eventCount`, `latestContextInputTokens`, `effectiveContextBudgetTokens`, `contextPressurePercent`) for the Token Meter/GraphQL summary boundary.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| GraphQL run/team/member token usage summary public DTO | Changed | REQ-001/002/008/011/018/021/030; design GraphQL mapping; implementation handoff key files | Existing GraphQL E2E must be updated from broad/old fields to expanded component fields and current prompt names. |
| Live `TOKEN_USAGE_UPDATED` payload consumed by frontend store | Changed | REQ-005/007/008; design DS-004; implementation removed frontend accounting fallback | Durable frontend store/component coverage remains valid, and runtime WebSocket E2E should assert new event fields when gated live runtime coverage is executed. |
| Token Meter UI hierarchy and labels | Changed | Approved Token Meter UI shape; REQ-005/006/013/017/018/024/030/031 | Existing component coverage is still valid after implementation; API/E2E should execute it as UI executable coverage. No raw `events` primary label tests should be kept. |
| Provider-specific input semantics and component pricing | Added/Changed | Probe matrix; REQ-003/015/016/022/023; design component-basis resolver | Integration/API coverage should include gross provider, Anthropic additive/cache-write, missing price dimensions, custom missing price, local no-bill, and mixed currency. |
| Historical rows without semantics | Changed | Design risk/sequence; implementation assumptions | Add or update durable coverage to confirm unknown/partial behavior instead of legacy formula. |
| Runtime live token usage GraphQL/WebSocket E2E | Preserved but changed field names | Existing `runtime/token-usage-runtime-graphql.e2e.test.ts`; code review residual risks | Keep scenario, update assertions to new field names. Execute only if live runtime env is enabled; otherwise record not executed. |
| Settings statistics `promptTokens`/`assistantTokens` API | Preserved | Existing `UsageStatistics` DTO still uses settings-facing names | Existing statistics integration/GraphQL assertions remain valid; they do not need to become Token Meter component-summary tests. |
| Primary raw `events` label and old broad GraphQL fields | Removed | Design removal/decommission plan; implementation handoff legacy check | Any tests asserting old public fields in Token Meter/GraphQL summary are stale and must be updated, not treated as implementation defects. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Inserts ledger events and verifies GraphQL run/team/member summaries, settings statistics, and mixed currency behavior. The pre-existing model-list regression is split into a focused sibling file after the update. | AC-001/002/003/005/012/013/015/020/021/030; GraphQL hydration boundary | Needs Update | Static inspection shows queries/assertions still use removed summary fields: `inputTokens`, `eventCount`, `latestContextInputTokens`, `effectiveContextBudgetTokens`, `contextPressurePercent`. | Update to expanded summary fields and add coverage for cached gross input, Anthropic additive/cache-write, custom missing price, local/no-bill, historical unknown/partial, and mixed currency. |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Gated real-runtime WebSocket -> ledger -> GraphQL E2E for AutoByteus/LMStudio, Codex app server, and Claude Agent SDK. | AC-003/008/025/030/031; live WebSocket/GraphQL convergence | Needs Update | Static inspection shows old event and GraphQL fields: `latest_context_input_tokens`, `inputTokens`, `eventCount`. The scenario remains valuable but public field names changed. | Update assertions/query to new event/summary fields. Execute only if `RUN_RUNTIME_TOKEN_USAGE_E2E=1`; otherwise record gated/not run. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-model-list.e2e.test.ts` | Settings-facing model-list regression split from the prior token usage GraphQL E2E file. | Existing model-list regression; MiniMax M2.7 removal | Still Valid | The scenario is orthogonal to expanded token summaries but was preserved while splitting the large GraphQL E2E file. | Execute with token-usage E2E group. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts` | Verifies ledger store aggregation, mixed currency, runtime cache/reasoning/context fields, team/member summaries. | AC-001/002/005/013/020/021/030; ledger summary boundary | Needs Update | Static inspection shows old summary property assertions (`input_tokens`, `event_count`, old context field names) and test payloads still use old context names. | Update to `gross_input_tokens`, `usage_report_count`, current prompt/context field names, component fields, and add local/custom/historical provider scenarios. |
| `autobyteus-server-ts/tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts` | Verifies SQL ledger event persistence/idempotency/snapshot retrieval. | Persistence support for AC-001/002/013/014/030 | Needs Update | Round-trip test only verifies old raw/cache/reasoning fields; new schema columns need durable round-trip coverage. | Add assertions for input semantic, standard/cache miss/cache write subtypes, cache state, billable output, component costs, missing dimensions, policy/tier, and latest prompt/context fields. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts` | Verifies settings-facing statistics aggregate nullable/mixed/partial cost behavior by model. | Existing statistics API; AC-007/021 indirectly | Still Valid | Statistics DTO still intentionally exposes `promptTokens`/`assistantTokens`; code review did not require stats API rename. | Retain; execute targeted integration. Optional minor status update only if required by failing execution. |
| `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` | Verifies live payload merging, idempotency, team aggregation, mixed currency, and ledger-backed reload replacement using new frontend DTO fields. | AC-003/006/008/021; live/hydration convergence in frontend state | Still Valid | Implementation-updated test already uses `grossInputTokens`, `usageReportCount`, cache/cost fields, and reload replacement. | Execute as frontend executable coverage. |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Verifies approved Token Meter hierarchy/labels and display-only component rendering. | AC-003/005/009/019/024/030/031 UI boundary | Still Valid | Implementation-updated test asserts `Current prompt`, `Gross input`, `Input breakdown`, `Pricing details`, `Usage reports`, and absence of `Events`. | Execute as frontend executable coverage. |
| `autobyteus-ts/tests/unit/llm/api/token-usage-normalizers.test.ts` and related `autobyteus-ts` unit tests | Verifies provider normalizer and catalog behavior with deterministic fixtures. | AC-013/014/015/016/017/018/020/022/023/026 | Still Valid | Code review re-ran these and they exercise implementation-scoped provider semantics. API/E2E may reuse as broader executable confidence. | Execute after API/E2E changes to ensure no coverage updates regress provider semantics. |
| Server unit tests listed in code review | Verify component basis/pricing/event enrichment/runtime adapters. | AC-001/002/005/013/014/017/020/021/030 | Still Valid | Code review passed; they are implementation-scoped but relevant regression evidence. | Re-run targeted subset after durable API/E2E edits. |
| Implementation visual evidence files | Running app visual QA with realistic Codex token data. | REQ-031 / AC-031 | Still Valid evidence, not durable test code | Handoff records backend/frontend commands, run ID, summary JSON, UI report, and screenshot. | Reference in execution report; no repository-resident edit. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` old summary field assertions | Public GraphQL fields `inputTokens`, `eventCount`, `latestContextInputTokens`, `effectiveContextBudgetTokens`, `contextPressurePercent` | Summary contract was intentionally renamed/expanded to `grossInputTokens`, `usageReportCount`, `latestPromptTokens`, `effectiveContextWindowTokens`, and `contextWindowUsagePercent`. | Design removal plan and implementation handoff legacy check. | Update same durable E2E to new fields and richer scenarios. | N/A |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` old live event/context field assertions | Event/summary names from pre-change context-pressure API | Current prompt/context stats are not compaction pressure status and use new names. | REQ-030, design current prompt section, implementation handoff. | Update existing gated live E2E. | N/A |
| `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts` old ledger summary property assertions | `input_tokens`, `event_count`, old context field names | Summary payload changed and old field names no longer represent approved public/internal names. | Design summary field list; implementation handoff. | Update same integration tests. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-COV-001 | GraphQL cached gross-input summary exposes gross, standard, cache read, cache rate, component costs, current prompt fields, and usage report count. | AC-001/002/003/010/011/030 | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Proves GraphQL hydration contract, not just unit calculator/store logic. |
| API-COV-002 | GraphQL summary handles Anthropic/base-excludes-cache additive gross input and cache-write 5m/1h subtype fields/costs. | AC-013/014 | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` | Proves provider-specific semantic components survive persistence and GraphQL. |
| API-COV-003 | GraphQL summary surfaces partial/missing dimensions for custom OpenAI-compatible endpoint without trusted pricing. | AC-005/012/015/023 | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` and ledger-store integration | Prevents regression to trusted-zero or silent-missing pricing. |
| API-COV-004 | GraphQL summary surfaces local/no-provider-bill usage as `local_no_api_bill` with zero cost. | AC-020 | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` and ledger-store integration | Proves local usage is not displayed as paid-provider estimate. |
| API-COV-005 | Historical/unknown semantic rows remain unknown/partial and do not use old flat pricing. | AC-005/023 plus implementation assumption | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` and ledger-store integration | Explicitly locks no-legacy behavior for old/incomplete rows. |
| API-COV-006 | Repository round-trips new ledger columns for semantics, cache state/subtypes, component costs, missing dimensions, policy/tier, billable output, and context stats. | Persistence support for AC-001/002/013/014/030 | `autobyteus-server-ts/tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts` | Migration/schema columns must remain durable, not only in-memory. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-UPD-001 | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` plus new `token-usage-ledger-provider-semantics.e2e.test.ts` | Replace old summary query/assertions with expanded fields; split provider-specific semantics/status scenarios into a focused E2E file to keep file size controlled. | AC-001/002/003/005/010/011/013/014/015/020/021/030 | Primary API/E2E durable edit. |
| API-UPD-002 | `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Update gated live WebSocket/GraphQL assertions to new field names and component/status fields. | AC-003/008/025/030 | Execution may be skipped unless live env is enabled. |
| API-UPD-003 | `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts` | Update helper payloads and assertions to new ledger summary names; add local/custom/historical cases. | AC-001/005/015/020/021/030 | Covers ledger store independent of GraphQL. |
| API-UPD-004 | `autobyteus-server-ts/tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts` | Round-trip new columns and current prompt names. | Persistence support for new schema | Needed before final integration run. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None planned | Existing scenarios remain useful after updates. | N/A | Update, do not delete. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TMP-001 | Run targeted server E2E/integration commands after coverage edits. | Confirms GraphQL, ledger store, SQL repository, and stats coverage execute in current local environment. | The commands are validation evidence; the tests themselves remain durable coverage. |
| TMP-002 | Run existing frontend store/component tests after server coverage edits. | Confirms live-store/hydration convergence and UI hierarchy still pass. | Existing durable frontend tests already cover this; no new browser harness required unless a failure appears. |
| TMP-003 | Optionally inspect implementation visual evidence and, if lightweight, run no additional browser app because implementation already performed REQ-031. | Confirms UI visual evidence remains in artifact package. | Browser screenshot was already captured by implementation; duplicating paid/runtime browser setup is not needed for the API/E2E code change unless tests fail. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real paid-provider live probes | Already completed upstream; API/E2E durable CI must not require provider credentials or paid calls. | Low; evidence files and probe matrix exist. | Reference upstream evidence; no reroute. |
| Gated real-runtime `runtime/token-usage-runtime-graphql.e2e.test.ts` execution | Requires `RUN_RUNTIME_TOKEN_USAGE_E2E=1` plus runtime/model access; default CI/local run skips it. | Medium residual for real WebSocket runtime paths; mitigated by unit/implementation visual evidence and updated gated test code. | Record skipped unless env is enabled; delivery can decide if manual runtime run is needed. |
| Full browser app E2E after API/E2E edits | Implementation already captured running-app visual QA; API/E2E edits are server/integration test-focused. | Low; UI unit/component coverage and implementation screenshot cover layout. | Run frontend component/store tests; no blocker. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None found in current investigation. | N/A | Upstream requirements/design are explicit, implementation handoff legacy check is clean, and code review passed. | N/A |

## Execution Plan

1. Update stale server token-usage integration/E2E tests to the new event and GraphQL summary contract.
2. Add durable GraphQL/ledger scenarios for cached gross input, Anthropic additive/cache-write subtypes, custom OpenAI-compatible missing price, local/no-bill, historical unknown/partial behavior, and mixed currency. Provider/status scenarios may live in a focused sibling E2E file rather than the original GraphQL projection file.
3. Update the gated real-runtime WebSocket/GraphQL E2E assertions to the new live event and summary field names without making it mandatory by default.
4. Run targeted server token-usage integration/E2E tests.
5. Run targeted frontend token usage store/component tests and relevant implementation unit tests from code review to ensure durable coverage edits did not regress core behavior.
6. If repository-resident durable coverage is changed and checks pass, write the execution coverage report and route the cumulative package back to `code_reviewer` for coverage-code re-review before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing relevant durable coverage is stale but its scenarios remain valid. Update coverage instead of routing implementation defects or deleting tests. Because durable coverage will be edited after code review, pass state must return through `code_reviewer` before delivery.
