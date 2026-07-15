# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/code-review-report.md`
- Current Investigation Round: `3`
- Trigger: Code review round 6 passed after an implementation-owned Local Fix return that retained CR-001/CR-002 and DS-007 fixes and added Token Meter UI polish/live browser verification. The reviewer explicitly marked prior API/E2E, docs, and delivery artifacts stale as current sign-off for this latest UI-polished state.
- Prior Investigation Reviewed: Round 2 investigation in this file; it passed for the DS-007 runtime-token-event baseline but predated the latest Token Meter UI polish.
- Latest Authoritative Investigation: `3`

## Current Requirement And Design Basis

The current approved behavior combines the previously validated token accounting/runtime/provider package with the latest implementation-owned Token Meter UI polish:

- Token Meter visible copy and structure remain governed by `AC-001` through `AC-005`: the tab label is `Token`; the panel shows Input, Output, and Total paired cards; thinking/reasoning output appears only when reasoning tokens are non-zero; no noisy empty thinking line is shown.
- The reviewed design keeps frontend code presentation-only: server/runtime/provider paths produce canonical summary fields; the web store consumes live/fetched summaries; `TokenUsageMeterPanel.vue` renders those values without provider pricing logic.
- Round 6 implementation handoff adds browser-backed UI polish evidence: compact token cards, quiet cost labels, hidden unknown context-pressure details, auto-fit card grid for narrow panes, price-status metadata as one quiet line, and native thinking-token disclosure with chevron and explanatory copy.
- DS-007 / `REQ-019` and `REQ-020` remain active: Codex app-server cache/reasoning/context fields map to canonical token events; Claude Agent SDK accounting comes only from terminal `result.usage` / `modelUsage`; runtime probe evidence remains durable.
- Prior accounting findings remain fixed and are still part of the required executable confidence: cumulative snapshots delta-normalize calculator-consumed cache/reasoning/billable fields and clear cost-affecting fields on invalid cumulative snapshots; cache-write pricing and missing write-price partial behavior remain covered.
- Existing provider/model/mixed-currency/MiniMax/codegen constraints remain active: provider normalizer fixtures and probe harnesses must remain valid; MiniMax M2.7 must stay absent; mixed currencies must not aggregate under a single currency; web GraphQL codegen is still environment-blocked without a live backend schema endpoint at `http://localhost:8000/graphql`.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Token Meter cards are compact, paired, and auto-fit narrow panes instead of the older six-card/overwide layout. | Changed | `implementation-handoff.md` Token Meter UI Layout Verification And Polish; `code-review-report.md` round 6 review scope and browser screenshot inspection. | Existing component coverage was updated by implementation and is valid. API/E2E should rerun it and record browser artifact visual evidence; no new durable coverage from API/E2E is required. |
| Cost labels are quiet/secondary but accessible via labels/titles; Total is subtly highlighted. | Changed | `TokenUsageMeterPanel.vue`; round 6 code review. | Existing component test asserts cost labels and accessible `aria-label`s. Rerun. |
| Unknown context pressure is hidden; context-pressure block renders only when a numeric pressure percentage exists with an effective context budget. | Changed | `implementation-handoff.md` lines describing unknown context-pressure suppression; `TokenUsageMeterPanel.vue` `hasKnownContextPressure`. | Existing component/source inspection is sufficient for validity; no additional durable coverage needed because this is local UI rendering and screenshot evidence covers the no-context case. |
| Reasoning/thinking output appears as a native disclosure chip with chevron and expands an explanatory tip. | Changed | `implementation-handoff.md`; browser artifact `/Users/normy/.autobyteus/browser-artifacts/6b2c05-1782396115079.png`; component test. | Existing component test asserts `details`, `summary`, chevron SVG, accessible label, closed/open behavior. Rerun. |
| DS-007 Codex/Claude runtime-native token event behavior remains unchanged after UI polish. | Preserved | `code-review-report.md` round 6; implementation handoff retained DS-007 notes. | Rerun focused runtime/accounting/unit and API/E2E coverage from prior round. |
| DS-007 API/GraphQL/live store coverage from Round 2 remains required. | Preserved | Prior API/E2E Round 2 coverage; code review says prior coverage is stale as sign-off but useful context. | Rerun existing server integration/GraphQL E2E/store coverage; no planned edits. |
| Provider/model/policing scenarios remain unchanged by UI polish. | Preserved | Requirements/design and code review round 6 checks. | Rerun focused shared provider/catalog tests and probe syntax checks. |
| Web GraphQL codegen needs a live backend/schema endpoint. | Preserved environment constraint | Implementation handoff/code review residual risks. | Attempt again and record pass/blocker; do not classify `ECONNREFUSED` without backend as implementation failure. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Compact paired cards, quiet/accessibly labeled cost rows, positive thinking-token native disclosure with chevron and expandable explanatory tip, and no thinking line when reasoning tokens are zero. | `AC-003`, `AC-004`, `AC-005`; UI polish handoff. | Still Valid | Inspected current spec; it asserts `details`/`summary`, chevron SVG, open toggle, accessible labels, and no-thinking state. | Rerun in focused web validation. |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Presentation-only Token Meter rendering from server/store summary fields; auto-fit grid; hidden unknown context pressure. | Design `TokenUsageMeterPanel` owner; UI polish. | Still Valid | Source inspection confirms `repeat(auto-fit, minmax(11rem, 1fr))`, `hasKnownContextPressure`, local `MetricPairCard`, no pricing policy. | Validate via component test and screenshot artifact; no edit planned. |
| Browser artifact `/Users/normy/.autobyteus/browser-artifacts/6b2c05-1782396115079.png` | Live Codex/GPT-5.5 Token tab screenshot showing compact cards, Token tab label, model/runtime metadata, and expanded thinking-token disclosure. | UI polish handoff and code review round 6. | Still Valid | Visual inspection confirms compact cards, auto-fit/narrow layout, expanded disclosure, no unknown context-pressure card. | Record as non-repository visual evidence. |
| `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` | Live/fetched summary aggregation, DS-007 Codex runtime-like reasoning/cost/context/runtime fields, mixed status, idempotency. | `AC-016`, DS-007 live summary. | Still Valid | Existing Round 2 API/E2E-added store coverage still matches current store behavior; UI polish did not change store contract. | Rerun in focused web validation. |
| `autobyteus-web/composables/__tests__/useRightSideTabs.spec.ts` | User-visible right-side tab label is `Token`. | `AC-001`. | Still Valid | UI polish screenshot and test continue to prove visible label. | Rerun in focused web validation. |
| `autobyteus-web/pages/__tests__/settings.spec.ts` | Settings token-statistics copy/navigation. | `AC-002`. | Still Valid | UI polish does not affect settings. | Rerun in focused web validation. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts` | Ledger summary aggregation and DS-007 first-class cache/reasoning/context persistence. | `REQ-012`, `REQ-019`, `AC-016`, `AC-021`. | Still Valid | Round 2 coverage remains behaviorally required and implementation unchanged. | Rerun in focused server validation. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | GraphQL summaries/statistics expose reasoning/context/runtime fields, mixed-currency safety, MiniMax M2.7 absence, and first-class persisted cache/reasoning fields. | `REQ-012`, `REQ-013`, `AC-006`, `AC-016`, `AC-021`. | Still Valid | Round 2 API/E2E coverage remains current behavior; stale only as sign-off before UI polish. | Rerun in focused server validation. |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Opt-in real runtime websocket/GraphQL token usage E2E for AutoByteus, Codex app-server, Claude Agent SDK. | DS-007 real runtime boundary. | Still Valid / Opt-in | Test remains intentionally skipped unless `RUN_RUNTIME_TOKEN_USAGE_E2E=1`; no default paid/runtime execution required. | Include in focused run and record skipped status if env not set. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` | Codex token usage mapping and total fallback semantics. | `REQ-019`, `AC-021`. | Still Valid | Code review round 6 reran and passed; source unchanged by UI polish. | Rerun in focused server validation. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts` | Codex backend dispatch forwards canonical runtime token fields. | DS-007. | Still Valid | Round 6 review passed. | Rerun in focused server validation. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-token-usage.test.ts` | Claude terminal-result-only accounting, no assistant chunk accounting, null/future numeric thinking semantics. | `REQ-019`, `AC-022`. | Still Valid | Round 6 review passed. | Rerun in focused server validation. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts` | Claude session token event conversion to agent-run event. | DS-007 transport. | Still Valid | Round 6 review passed. | Rerun in focused server validation. |
| `autobyteus-server-ts/tests/unit/agent-execution/events/token-usage-event-enrichment-transformer.test.ts` | Canonical event context enrichment, delta, and price pipeline. | DS-007 spine. | Still Valid | Round 6 review passed. | Rerun in focused server validation. |
| `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-snapshot-delta-normalizer.test.ts` | Cumulative snapshot cache/reasoning/billable deltas and invalid snapshot clearing. | `CR-001`, DS-007 cumulative snapshots. | Still Valid | Round 6 review says `CR-001` remains resolved. | Rerun in focused server validation. |
| `autobyteus-server-ts/tests/unit/token-usage/pricing/token-cost-calculator.test.ts` | Cache-write/read pricing, missing write-price partial status, billable output and reasoning subcost. | `CR-002`, `AC-015`. | Still Valid | Round 6 review says `CR-002` remains resolved. | Rerun in focused server validation. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts` | Reasoning/mixed-currency/partial-price statistics. | `REQ-012`, `REQ-013`. | Still Valid | UI polish does not affect server statistics. | Rerun in focused server validation. |
| `autobyteus-ts/tests/unit/llm/utils/llm-config.test.ts`, `supported-model-definitions.test.ts`, `token-usage-normalizers.test.ts`, `deepseek-llm.test.ts` | Provider/catalog/pricing/MiniMax/provider-normalizer/DeepSeek scenarios. | `REQ-011`, `AC-006`-`AC-014`, `AC-018`-`AC-020`. | Still Valid | Round 6 review passed shared tests; UI polish does not change provider semantics. | Rerun focused shared validation. |
| `tickets/done/token-usage-pricing-ui/provider-usage-probe.mjs` | Opt-in provider usage probe harness syntax. | `REQ-016`, `REQ-017`, `AC-018`-`AC-020`. | Still Valid | Probe remains durable opt-in evidence only. | Run `node --check`; do not run paid probes. |
| `tickets/done/token-usage-pricing-ui/claude-agent-sdk-runtime-probe.mjs` | Opt-in Claude runtime probe script syntax. | `REQ-020`, `AC-022`, `AC-023`. | Still Valid | Durable runtime probe evidence remains current unless opt-in rerun is requested. | Run `node --check`; do not run live Claude probe. |
| `autobyteus-web/graphql/queries/token_usage_meter_queries.ts`, `autobyteus-web/generated/graphql.ts` | Web token summary GraphQL query/type surface. | `AC-016`; code review residual risk. | Environment-Limited / Still Valid through consumers | Focused web consumers pass; live codegen endpoint remains unavailable unless backend is running. | Attempt codegen and record result. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Prior content of `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` as current sign-off | Round 2 conclusions as final current-state validation. | They predate the latest implementation-owned Token Meter UI polish and browser verification. | `code-review-report.md` round 6 says prior API/E2E/docs/delivery artifacts are stale context to refresh. | This Round 3 investigation and execution report. | N/A |

No repository-resident durable test removal is planned. The current durable tests still represent approved behavior.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | Existing implementation-owned component/store/server coverage already covers the latest UI polish and retained DS-007/API boundaries. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | No API/E2E-owned durable coverage edits are planned this round. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No stale repository-resident durable coverage found. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `VISUAL-UI-001` | Inspect `/Users/normy/.autobyteus/browser-artifacts/6b2c05-1782396115079.png` and `/Users/normy/.autobyteus/browser-artifacts/433a53-1782395338526.png`. | Live Token Meter UI shows Token tab, compact cards, model/runtime metadata, and thinking disclosure. | Browser artifact already exists; visual inspection is per-run evidence, not a repo test. |
| `PROBE-001` | `node --check tickets/done/token-usage-pricing-ui/provider-usage-probe.mjs`. | Provider probe harness remains syntactically executable. | Script is durable; syntax check evidence is per-run. |
| `PROBE-DS007-001` | `node --check tickets/done/token-usage-pricing-ui/claude-agent-sdk-runtime-probe.mjs`. | Claude runtime probe script remains syntactically executable. | Script/output are durable; live probe is opt-in/cost-bearing. |
| `CODEGEN-001` | `pnpm -C autobyteus-web run codegen`. | Web GraphQL codegen readiness against configured live endpoint. | Codegen is a project command; failure without backend is environment evidence. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live paid provider probes. | Requirements make probes opt-in; no credential/budget request was made in this API/E2E round. | Provider response drift over time. | Keep probe harness/results durable; rerun only with explicit opt-in credentials/budget. |
| Live Codex/Claude runtime E2E in test suite. | `RUN_RUNTIME_TOKEN_USAGE_E2E=1` is not enabled by default; implementation handoff already includes a live Codex browser smoke run for UI evidence. | Runtime drift over time. | Include opt-in file in focused test run; record skipped status unless env is explicitly enabled. |
| Web GraphQL codegen without backend. | Requires live backend/schema endpoint at `http://localhost:8000/graphql`. | Generated types remain manually updated until codegen can run. | Attempt and record exact result; delivery should regenerate if integrated backend endpoint is available. |
| Full browser automation rerun. | Browser screenshot evidence from implementation and code review exists; focused component tests cover current UI states deterministically. | Low visual regression risk. | No reroute; delivery may run broader smoke checks if required. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently. | N/A | Requirements/design/code review are explicit; no stale durable test or compatibility-only behavior was found. | N/A |

## Execution Plan

1. No durable coverage edits or removals this round.
2. Run probe script syntax checks:
   - `node --check tickets/done/token-usage-pricing-ui/provider-usage-probe.mjs`
   - `node --check tickets/done/token-usage-pricing-ui/claude-agent-sdk-runtime-probe.mjs`
3. Rerun focused shared provider/catalog tests.
4. Rerun focused server runtime/accounting/integration/GraphQL/API-E2E tests, including the opt-in runtime E2E file to record its default skipped status.
5. Rerun Nuxt prep and focused web Token Meter/store/settings/tab tests with `NUXT_TEST=true` for the latest UI polish.
6. Rerun web boundary/localization/audit guards.
7. Attempt `pnpm -C autobyteus-web run codegen` and record pass/blocker.
8. Run `git diff --check`.
9. Update `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/api-e2e-execution-coverage-report.md` with Round 3 evidence.
10. If no durable coverage changes are made and execution passes, route the cumulative package to `delivery_engineer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Prior API/E2E artifacts are stale as current sign-off but current durable tests remain valid. The latest UI polish is already covered by implementation-owned component tests and live browser evidence; API/E2E will refresh execution evidence without adding repository-resident coverage.
