# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/tickets/in-progress/token-meter-unit-price-transparency/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/tickets/in-progress/token-meter-unit-price-transparency/investigation-notes.md`
- UI Specification: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/tickets/in-progress/token-meter-unit-price-transparency/ui-specification.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/tickets/in-progress/token-meter-unit-price-transparency/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/tickets/in-progress/token-meter-unit-price-transparency/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/tickets/in-progress/token-meter-unit-price-transparency/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/tickets/in-progress/token-meter-unit-price-transparency/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review passed and routed to API/E2E for Token Meter unit-price calculation transparency.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved task adds transparent unit-price calculation details to the right-side Token Meter without changing pricing formulas. The authoritative server pricing/runtime summary path must provide per-component unit-price summaries; the frontend must remain presentation-only. Current behavior to prove:

- Server-owned summaries expose unit prices for uncached/full-price input, cache-hit input, cache-write input including 5m/1h subtype rows, output, and reasoning/thinking output semantics.
- GraphQL hydrated summaries for run, team, member, task-statistics aggregates, and runtime/model statistics aggregates carry `unitPrices` with explicit per-component `status` and `pricePerMillion`.
- Single trusted component prices are shown as one price; component-relevant mixed prices produce `mixed`; zero-token price/policy churn is ignored; missing/partial-missing/local states are explicit.
- Reasoning/thinking uses the output unit price and is included in output cost, not double-counted.
- Live event store summaries and ledger-hydrated summaries converge on the same `unitPrices` shape for equivalent data.
- Existing concise Token Meter UI remains collapsed by default; expanded `Calculation details` renders formula/unit prices without frontend provider-price catalog lookup.

Implementation handoff's Legacy / Compatibility Removal Check was reviewed. It reports no backward-compatibility mechanisms, no legacy old-behavior retention, and no frontend catalog-price fallback/fake blended rate. Code review independently passed the same no-compatibility/no-legacy checks.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Server projection attaches per-component `unit_prices` to cost summary aggregate | Added | Design DS-001; implementation handoff “Added server-owned per-component unit-price summary types and projection logic” | Existing unit projection tests are valid; add API/E2E GraphQL hydration coverage because unit tests do not prove the transport boundary. |
| GraphQL summary DTO exposes `unitPrices` | Added | Design DS-002; code review residual risk asks to investigate GraphQL/hydration | Add durable GraphQL E2E coverage for run/team/member and aggregate stats. |
| Frontend GraphQL fragment fetches nested `unitPrices` | Added | Implementation handoff key files; code review notes generated GraphQL artifacts not regenerated | Existing UI/store tests cover handwritten fragment consumers; decide codegen generated artifact is not required for runtime sign-off because Token Meter does not import generated token-usage operation types and codegen depends on external schema config. Record as delivery/codegen follow-up if project policy later requires generated artifact refresh. |
| Frontend live store merges event unit prices into hydrated summary shape | Added | Design return-event spine; implementation handoff “live-store unit-price merge logic” | Existing store tests are valid; add/update durable store convergence check so live-event and ledger-hydrated summaries remain aligned for unit-price shape. |
| Calculation details disclosure UI | Added | Requirements AC-007; UI specification | Existing component tests are valid and sufficient for collapsed/expanded/mixed/reasoning UI; run them as executable evidence. |
| Reasoning/thinking included semantics | Preserved/Clarified | Requirements REQ-005; design concrete examples | Existing projection/UI tests cover output unit price semantics; GraphQL E2E should also assert reasoning unit price mirrors output on hydrated summary. |
| Mixed aggregate display safety | Preserved/Changed | Requirements AC-005; design rejects fake blended price | Unit/store/component tests are valid; GraphQL E2E should assert component-relevant mixed status in aggregate stats. |
| No frontend provider price table | Preserved | Requirements REQ-006; design forbidden dependency; code review passed | Run focused tests and static inventory; no additional durable test needed beyond UI/store behavior and code review evidence. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-unit-price-summary.test.ts` | Unit projection classifies single, mixed, missing, partial missing, local/no-bill, zero-token churn, tolerance, and reasoning-output unit prices. | REQ-001, REQ-004, REQ-005, REQ-007; DS-001 | Still Valid | Test file directly exercises `buildTokenUsageCostSummaryAggregate` and was run by implementation/code review. | Retain and run as focused server evidence. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Ledger-backed GraphQL summaries/statistics expose token and cost fields for run/team/member/task/statistics. | REQ-006; DS-002 GraphQL hydration | Still Valid, but insufficient for new `unitPrices` boundary | Existing query assertions do not request or assert `unitPrices`. | Do not mutate this large existing file; add a focused new GraphQL E2E file for unit-price hydration. |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Optional real-runtime E2E persists token usage from live runtime turns and exposes GraphQL summaries/statistics. | Return-event spine and real runtime persistence | Still Valid but not final mandatory evidence for this task | Suite is gated by `RUN_RUNTIME_TOKEN_USAGE_E2E=1` and depends on external runtime/model availability. | Do not rely on it for final sign-off; use direct ledger GraphQL E2E plus store live convergence. |
| `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` | Live event store idempotency, team aggregation, currency mix, unit-price merging, zero-token price churn, reload replacement. | DS-002 return-event store path; live/hydrated shape parity | Needs Update | Existing tests cover live unit-price merge and hydrated replacement, but do not directly compare live-event `unitPrices` against an equivalent ledger-hydrated summary shape. | Add narrow convergence assertion/test or update existing store coverage. |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Collapsed default state, expanded calculation details, mixed display, reasoning included copy. | AC-001 through AC-007; UI spec acceptance checklist | Still Valid | Existing test assertions match approved UI behavior. | Retain and run focused component evidence. |
| `autobyteus-web/graphql/queries/token_usage_meter_queries.ts` | Handwritten Token Meter GraphQL fragment requests unit-price fields. | REQ-006; DS-002 | Still Valid | Static inspection shows nested `unitPrices` fields in the fragment. | Covered indirectly by GraphQL E2E schema field assertions and focused web tests. |
| `autobyteus-web/generated/graphql.ts` | Generated GraphQL types/documents from `graphql/**/*.ts`. | Generated operation parity, not direct Token Meter runtime path | Out Of Scope for API/E2E sign-off; possible delivery/codegen policy follow-up | Static inspection shows generated token-usage fragment lacks new `unitPrices`, but current Token Meter code does not import generated token-usage operation types; implementation handoff notes codegen depends on external schema endpoint. | Do not regenerate during this coverage pass. Record in execution report for delivery/codegen policy awareness. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts` | Provider aggregates statistics rows from mocked ledger events. | Stats aggregate behavior | Still Valid, but lower-value for GraphQL transport | It exercises provider aggregation but not GraphQL object mapping or unit-price DTO exposure. | Retain. New GraphQL E2E will cover aggregate DTOs. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No stale/obsolete coverage found in changed scope. | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-E2E-001 | Ledger-hydrated GraphQL summaries expose per-component `unitPrices` for standalone run, team run, team member, task-statistics aggregate/member aggregate, and runtime/model statistics aggregate. | REQ-001, REQ-004, REQ-006, REQ-007; AC-001 through AC-006; DS-001/DS-002; code review downstream note | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts` | Unit tests do not prove GraphQL schema/mapper/hydration exposes the new fields across public summary surfaces. |
| API-E2E-002 | Hydrated GraphQL handles single trusted prices, cache-write generic and subtype prices, reasoning output as output price, component-relevant mixed prices, zero-token price churn ignored, partial-missing, and local/no-bill. | AC-001 through AC-006; design risk list and implementation assumptions | Same new GraphQL E2E file | These are acceptance-critical edge states on the API boundary. |
| WEB-EXEC-001 | Live-event `unitPrices` summary shape converges with an equivalent hydrated GraphQL summary shape in the frontend store. | DS-002 return-event spine; code review downstream note | `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` | Existing store tests cover live and reload separately; a direct convergence assertion reduces risk that live Token Meter differs from reload-hydrated Token Meter. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| WEB-EXEC-001 | `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` | Add a narrow convergence test/assertion for equivalent live-event and hydrated summary `unitPrices`. | DS-002 return-event/hydration parity; implementation handoff downstream hint | Repository-resident durable coverage update; must return to `code_reviewer` before delivery. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No removals planned. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-001 | Static inspection of `autobyteus-web/generated/graphql.ts` and imports | Generated token-usage operation types are stale but not imported by Token Meter runtime path | This is a policy/maintenance check, not a runtime behavior assertion; record evidence instead of adding generated-code churn now. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real external runtime turn with live websocket event, persistence, and GraphQL unit-price convergence | Existing real-runtime E2E requires external model/runtime availability and is gated by `RUN_RUNTIME_TOKEN_USAGE_E2E=1`; direct ledger GraphQL plus store convergence can prove the changed boundaries deterministically. | Low/medium residual: actual provider payload peculiarities are not exercised in this pass. | No reroute; existing optional real-runtime suite remains available for environment-specific release validation. |
| Regenerating `autobyteus-web/generated/graphql.ts` | Codegen config depends on external GraphQL schema endpoint; current Token Meter uses handwritten gql documents/types and does not import generated token-usage operation types. | Low residual unless project policy treats generated artifacts as mandatory parity for all gql documents. | Record as delivery/codegen policy awareness; no API/E2E blocker. |
| Browser visual/manual right-side panel E2E | Existing component tests cover collapsed/expanded UI copy/accessibility basics; no browser E2E harness is required for the server/API hydration change. | Low residual responsive visual risk. | Delivery/manual product review can inspect UI if desired; no reroute. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | Upstream requirements/design are specific enough for coverage; no compatibility wrappers or legacy behavior observed during investigation. | N/A |

## Execution Plan

1. Add focused durable GraphQL E2E coverage in a new `token-usage-unit-prices-graphql.e2e.test.ts` file rather than expanding the already-large ledger GraphQL file.
2. Add/update narrow frontend store coverage proving equivalent live-event and hydrated summary `unitPrices` converge.
3. Run focused checks:
   - `git diff --check`
   - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/token-usage/projections/token-usage-unit-price-summary.test.ts`
   - `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts`
   - `pnpm -C autobyteus-web exec vitest run stores/__tests__/tokenUsageMeterStore.spec.ts components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts`
4. If checks pass and only durable coverage changed, write/update the execution coverage report and route the cumulative package back to `code_reviewer` for coverage-code re-review before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing coverage is valid but insufficient at GraphQL/hydrated API boundaries. New durable coverage will be added/updated, so successful API/E2E validation must return through `code_reviewer` before delivery.
