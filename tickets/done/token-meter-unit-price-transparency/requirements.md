# Requirements Doc — Token Meter Unit-Price Transparency

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — approved by user on 2026-07-02.

## Goal / Problem Statement

The right-side Token tab already shows cumulative tokens, estimated input/output/total costs, cache-hit percentage, input cost breakdown, model/runtime, and price status. However, it does not show the unit prices used to calculate those costs. This makes the meter less transparent: users can see numbers such as `10.41 $` input cost and `12.98 $` total estimate, but cannot immediately validate the formula.

The goal is to expose the calculation basis in the Token Meter: per-category unit prices for uncached/full-price input, cache-hit/discounted input, cache-write input when present, output, and thinking/reasoning output semantics, plus enough formula context for a user to manually reconcile the displayed subtotal/total within rounding tolerance.

## Investigation Findings

- The backend token event contract already includes price-per-million fields: `input_price_per_million`, `output_price_per_million`, `cached_input_read_price_per_million`, `cached_input_write_price_per_million`, and cache-write subtype prices.
- The Prisma ledger already persists those unit-price fields on `token_usage_ledger_events`.
- The server cost calculator already uses those fields to compute component costs. For current reasoning/thinking tokens, it prices reasoning with the output price and treats reasoning as an output sub-breakdown, not an additional cost added on top of output.
- The current run summary aggregate/GraphQL/frontend summary shape exposes component token counts and component costs, but not the unit prices used to calculate them.
- The frontend Token Meter is intentionally presentation-only and must not import provider pricing metadata or hard-code prices.
- The screenshot's visible numbers reconcile cleanly with the current catalog price for `gpt-5.5` (`$5/M` input, `$0.50/M` cached input, `$30/M` output):
  - `943,918 / 1,000,000 × $5 = $4.71959` → `$4.72`
  - `11,381,248 / 1,000,000 × $0.50 = $5.690624` → `$5.69`
  - `85,526 / 1,000,000 × $30 = $2.56578` → `$2.57`
  - total ≈ `$12.98`

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / UX transparency enhancement.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, but localized to summary/API/UI explainability rather than pricing calculation correctness.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / Shared Structure Looseness.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Small targeted refactor likely needed in summary data shape.
- Evidence basis: Pricing owner stores and uses unit prices, but the run summary DTO and Token Meter UI omit those fields.
- Requirement or scope impact: Add unit-price transparency through server-owned summary data; do not move pricing authority into the frontend.

## Recommendations

1. Implement this. It is a good idea because it improves trust and debuggability without changing billing logic.
2. Add unit-price fields to the server-owned token usage summary contract, not as frontend hard-coded catalog values.
3. Display the formula at the component level: `tokens ÷ 1,000,000 × unit price = cost`.
4. Present thinking/reasoning carefully: current accounting treats thinking tokens as included in output tokens and output cost, so the UI should show `same as output price` / `included in output cost`, not a separately added cost.
5. If a run has mixed models/currencies/pricing policies, show `mixed / varies by call` rather than pretending one unit price explains the whole aggregate. A later detailed per-call view can handle mixed pricing fully.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium. Backend summary/API/store data shape must be extended, but pricing calculation itself already exists.

## In-Scope Use Cases

- UC-001: A user opens the Token Meter and can see unit prices used for full-price input, cached input, cache-write input when present, output, and thinking/reasoning semantics.
- UC-002: A user can manually validate input subtotal, output subtotal, and total estimate with normal rounding tolerance.
- UC-003: A user can see when pricing is unavailable, partial, local/no-bill, or mixed instead of assuming a hidden formula exists.

## Out of Scope

- Changing provider pricing values or billing formulas.
- Fetching public provider prices directly from the frontend.
- Invoice-grade billing reconciliation, taxes, credits, enterprise discounts, or organization-specific pricing.
- A full per-call billing ledger viewer.
- The later Token Statistics task-agent/team hierarchy request; that is explicitly excluded from this workflow.

## Functional Requirements

- REQ-001: The Token Meter shall show the unit price used for each displayed billable token component when the summary has a single trusted unit price for that component.
- REQ-002: The Token Meter shall show unit price scale and currency clearly, e.g. `$5.00 / 1M tokens`.
- REQ-003: The Token Meter shall show or imply the formula `tokens ÷ 1,000,000 × unit price = component cost` for input/output breakdown rows.
- REQ-004: The Token Meter shall distinguish uncached/full-price input, cache-hit/discounted input, cache-write input when present, output, and thinking/reasoning output semantics.
- REQ-005: Thinking/reasoning tokens shall be labelled as included in output cost when the pricing owner prices them through output price, preventing user double-counting.
- REQ-006: Unit-price data shall come from the server/runtime token usage summary path; the frontend shall remain presentation-only.
- REQ-007: Mixed, missing, partial, and local/no-bill pricing states shall display explicit markers instead of silently omitting unit-price context.
- REQ-008: The existing summary cards and current Token Meter hierarchy shall remain readable; unit prices shall be available through an explicit clickable/expandable `Calculation details` section, not always-on clutter in the main summary cards.

## Acceptance Criteria

- AC-001: In a complete single-policy estimate, Input breakdown includes unit-price values for uncached input and cache-hit input, and cache-write input if cache-write tokens are positive.
- AC-002: Output details include output unit price and, when thinking tokens are positive, a thinking/reasoning row or note showing that thinking uses the output unit price and is included in output cost.
- AC-003: A user can reconcile component costs using displayed tokens and unit prices within normal currency rounding tolerance.
- AC-004: For `price_missing` or `partial_price_missing`, unavailable component unit prices render as `price missing` / `not available` and missing dimensions remain visible.
- AC-005: For `mixed`, the UI does not show a misleading single unit price; it shows `mixed / varies by call` or equivalent.
- AC-006: For `local_no_api_bill`, the UI labels the run as local/no API bill instead of rendering paid-provider unit prices.
- AC-007: Frontend tests verify the collapsed default state keeps the main Token Meter concise, and expanding/clicking `Calculation details` shows unit prices/formulas without a frontend provider price table. Backend/GraphQL tests verify summary unit-price fields are server-provided.

## Constraints / Dependencies

- Must preserve the current token accounting owner: `TokenCostCalculator` and token usage summary projections remain server-side authorities.
- Must support providers with no cache price, no thinking tokens, or mixed pricing.
- Must avoid double-counting reasoning/thinking cost.

## Assumptions

- Most focused Token Meter runs use one model/pricing policy, so a single per-component unit price can often be shown.
- For mixed-provider/model aggregates, transparent `mixed` messaging is better than a fake blended unit price.

## Risks / Open Questions

- Should mixed runs eventually expose a per-call expandable pricing ledger? Recommended follow-up, not required now.
- Should the UI add a dedicated `Output breakdown` section or extend `Pricing details` with a `Unit prices` table? Design can choose during UI implementation.

## Requirement-To-Use-Case Coverage

- UC-001: REQ-001, REQ-002, REQ-004, REQ-005
- UC-002: REQ-003, REQ-006, REQ-008
- UC-003: REQ-007

## Acceptance-Criteria-To-Scenario Intent

- AC-001: Input unit-price transparency.
- AC-002: Output/thinking unit-price transparency without double-counting.
- AC-003: Manual validation.
- AC-004: Missing/partial transparency.
- AC-005: Mixed pricing safety.
- AC-006: Local runtime safety.
- AC-007: Ownership and regression protection.

## Approval Status

Approved by user on 2026-07-02 ("Cool, I completely agree with you. Let's do it. Kick off the task now.").


## UI Refinement Decision

Preferred presentation: add a clickable/expandable `Calculation details` control rather than showing unit prices permanently in the main meter. The collapsed state preserves the current clean Token Meter. The expanded state shows the server-provided calculation basis: component tokens, unit price per 1M tokens, formula, component cost, rounding note, and pricing status/missing/mixed markers.

## UI Specification Artifact

Detailed proposed UI/user journey is recorded at `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/tickets/in-progress/token-meter-unit-price-transparency/ui-specification.md`. Preferred placement is inside `Pricing details` as a collapsed `Calculation details` disclosure that expands inline.
