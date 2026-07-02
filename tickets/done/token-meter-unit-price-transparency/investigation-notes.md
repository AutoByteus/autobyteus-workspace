# Investigation Notes — Token Meter Unit-Price Transparency

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: First requirement investigated; requirements draft updated for user approval.
- Investigation Goal: Determine whether the Token Meter can expose unit prices for input/cache/output/thinking token categories, whether this is a good UX/product idea, and what target shape preserves pricing authority and transparency.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: Unit prices already exist in backend event/pricing/persistence layers, but summary GraphQL/store/UI data shape needs extension.
- Scope Summary: Add visible unit-price and formula transparency to the right-side Token tab's Token Meter.
- Primary Questions Resolved:
  - Where are token usage and cost summaries computed? Server token usage ledger/projections and `TokenCostCalculator`.
  - Does the frontend receive unit prices? Not in the current `TokenUsageRunSummary`/GraphQL summary shape.
  - Can the UI calculate/display them? It should display server-provided unit prices, not calculate authoritative prices itself.
  - How should thinking tokens be handled? Current calculator uses output price for reasoning/thinking and includes it in output cost.

## Request Context

User asked whether the right-side Token tab's Token Meter can also show input, cache, output, and thinking token unit prices so users can independently calculate and validate pricing. The user frames this as a transparency improvement because totals without formula/price inputs make it hard to trust whether the calculation is correct.

Reference screenshot path: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_91fe7d6cd2bc49988bec1fb6f1a0ceae/solution_designer_2a086d0d11ec4c7aac3e8da9e116f786/context_files/ctx_6621126e0079__image.png`.

Scope reset: the user later introduced a separate Token Statistics task-agent/team hierarchy idea, then explicitly asked to forget that second requirement and work only on this first Token Meter unit-price transparency requirement. The second idea is out of scope here.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/tickets/in-progress/token-meter-unit-price-transparency`.
- Current Branch: `codex/token-meter-unit-price-transparency`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-07-02.
- Task Branch: `codex/token-meter-unit-price-transparency`.
- Expected Base Branch (if known): `origin/personal`.
- Expected Finalization Target (if known): `personal`.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Dedicated worktree created from latest tracked `origin/personal`; user shared worktree was not used.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-02 | Command | `pwd && git status --short --branch && git remote -v && git branch --show-current && git rev-parse --show-toplevel && ls -la` | Discover initial repository context | User started in shared `personal` worktree with unrelated untracked files | No |
| 2026-07-02 | Command | `git remote show origin`; `git worktree list --porcelain` | Resolve base branch and existing worktrees | Remote HEAD is `personal`; no exact first-requirement worktree existed | No |
| 2026-07-02 | Command | `git fetch origin --prune` | Refresh tracked refs before worktree creation | Fetch succeeded | No |
| 2026-07-02 | Command | `git worktree add -b codex/token-meter-unit-price-transparency ... origin/personal` | Create dedicated task worktree | Worktree created at commit `57185192` from `origin/personal` | No |
| 2026-07-02 | Other | User screenshot | Understand UI and pain point | Token Meter shows totals, component costs, and pricing details but no unit prices/formula | No |
| 2026-07-02 | Code | `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Inspect Token Meter UI | Renders Gross input, Output, Total estimate, Input breakdown, Pricing details. Input breakdown rows show tokens and cost only. | Yes: add unit-price display |
| 2026-07-02 | Code | `autobyteus-web/types/tokenUsageMeter.ts` | Inspect frontend summary/event shape | `TokenUsageRunSummary` exposes component tokens/costs and pricing policy key, but no unit-price fields. Live payload type also omits unit-price fields. | Yes |
| 2026-07-02 | Code | `autobyteus-web/graphql/queries/token_usage_meter_queries.ts` | Inspect GraphQL summary fields | Query fetches component token/cost fields, not unit-price fields. | Yes |
| 2026-07-02 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts` | Inspect backend token event contract | Backend `TokenUsageUpdatedPayload` already includes price-per-million fields and cost fields. | No |
| 2026-07-02 | Code | `autobyteus-server-ts/prisma/schema.prisma` | Inspect persistence | `TokenUsageLedgerEvent` already persists `inputPricePerMillion`, `outputPricePerMillion`, cached read/write prices. | No |
| 2026-07-02 | Code | `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts` | Inspect pricing authority | Calculator applies selected policy to component tokens. Reasoning cost uses output price and is an explanatory output sub-cost. | No |
| 2026-07-02 | Code | `autobyteus-server-ts/src/token-usage/projections/token-usage-cost-summary-aggregate.ts` | Inspect summary projection | Aggregates tokens/costs/policy key, but not unit prices. Mixed policy can be inferred only indirectly through `pricing_policy_key` single/null. | Yes |
| 2026-07-02 | Code | `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | Inspect GraphQL DTO | `TokenUsageCostSummaryAggregateGraphql` exposes component costs, status, policy key, but no price-per-million fields. | Yes |
| 2026-07-02 | Code | `autobyteus-ts/src/llm/supported-model-definitions.ts` | Validate screenshot arithmetic source | `gpt-5.5` catalog pricing is input `5.0`, output `30.0`, cached input read `0.5`. Screenshot costs reconcile with these values. | No |
| 2026-07-02 | Doc | `autobyteus-server-ts/docs/modules/token_usage.md`; `autobyteus-web/docs/settings.md` | Check documented ownership | Docs say frontend Token Meter is presentation-only and must not recalculate model prices; component costs are server-owned. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Right-side app tab `Token` opens `TokenUsageMeterPanel.vue`.
- Current execution flow:
  1. Runtime/provider emits `TOKEN_USAGE_UPDATED`.
  2. Server normalizes usage and resolves pricing through `TokenPriceConfigProvider`.
  3. `TokenCostCalculator` writes component costs and price-per-million fields into the event payload.
  4. Ledger persists event token, cost, and unit-price fields.
  5. Summary projection aggregates token and cost fields, but drops unit prices.
  6. GraphQL/frontend summary displays tokens/costs/status but not unit prices.
- Ownership or boundary observations:
  - Server pricing subsystem is the authoritative pricing owner.
  - Frontend Token Meter is presentation-only and should not hard-code provider pricing tables.
- Current behavior summary: Users see calculated costs but cannot see the rate inputs that produced those costs.

## Design Health Assessment Evidence

- Change posture: Feature / UX transparency enhancement.
- Candidate root cause classification: Boundary Or Ownership Issue / Shared Structure Looseness.
- Refactor posture evidence summary: Add summary unit-price data under server-owned token usage projection and extend frontend types/UI. No pricing formula refactor needed.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Backend event contract | Unit prices already exist per event | Pricing authority already has the data | Summarize/expose safely |
| GraphQL summary | Unit prices not exposed | Transparency gap is in summary/API boundary | Add fields/shape |
| Token Meter UI | Input rows show tokens+cost only | UI cannot support manual validation | Add unit-price/formula rows |
| Cost calculator | Reasoning cost uses output unit price | UI must avoid double-counting thinking | Label thinking as included in output |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts` | Apply pricing policy to token components | Already has the real formula and selected unit prices | Keep authority here |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-cost-summary-aggregate.ts` | Build run/team/member summary aggregate | Drops unit-price fields | Extend with safe unit-price summary or mixed marker |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | Expose summary DTOs | No unit-price fields | Add GraphQL fields |
| `autobyteus-web/types/tokenUsageMeter.ts` | Frontend Token Meter types | No unit-price fields | Add nullable/mixed-capable fields |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | Live summary store | Sums server cost fields; no price merging | Merge unit prices by equality or mark mixed |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Render Token Meter | Current hierarchy is good; needs unit price detail | Add unit-price column/section |
| `autobyteus-web/components/workspace/usage/tokenUsageFormatting.ts` | Format costs/tokens/status | No per-million price formatter | Add `formatUnitPricePerMillion` |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-02 | Script | Manual Node arithmetic from screenshot values | Screenshot values reconcile with `$5/M`, `$0.50/M`, `$30/M` | Unit-price display would immediately prove formula correctness |

## External / Public Source Findings

None. Current implementation should use repository-local pricing catalog/server policy as authority rather than browsing public price pages at render time.

## Findings From Code / Docs / Data / Logs

The feature is feasible and low-risk if implemented as a summary/API/UI explainability extension. The important design constraint is mixed pricing: a run with multiple pricing policies should not display a single rate unless that rate is explicitly an `effective/blended` rate. For user trust, prefer showing true unit prices when uniform and `mixed / varies by call` when not uniform.

## Constraints / Dependencies / Compatibility Facts

- Existing docs explicitly forbid frontend pricing authority.
- Current `apiCostStatus` semantics must remain authoritative.
- Unit-price display must respect `local_no_api_bill`, `price_missing`, `partial_price_missing`, and `mixed`.

## Open Unknowns / Risks

- Whether to place unit prices as a new column in `Input breakdown` or as a separate `Unit prices / Calculation` subsection is a UI design choice.
- Full mixed-policy explainability may require a future per-call detail view.

## Notes For Architect Reviewer

If this proceeds to design, the target should be a narrow extension of the existing token usage summary contract. Do not introduce a frontend pricing catalog or duplicate price calculation logic.


## UI Refinement From User — Clickable Calculation Details

The user suggested not cluttering the main Token Meter UI. Preferred direction is now an explicit clickable/expandable `Calculation details` section. This should preserve the existing high-level summary cards while giving users a way to inspect unit prices and formulas on demand. Design implication: add a disclosure/accordion near `Pricing details` or `Total estimate`; default collapsed; expanded panel is presentation-only and uses server-provided unit-price fields.

## UI Specification Artifact — 2026-07-02

Created `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/tickets/in-progress/token-meter-unit-price-transparency/ui-specification.md` to pin down the preferred user journey and production UI behavior. Key decision: place a collapsed `Calculation details` disclosure inside `Pricing details`, expanded inline on click, using server-provided unit prices and formulas.
