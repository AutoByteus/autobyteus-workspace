# Design Review Report — Token Meter Unit-Price Calculation Details

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/tickets/in-progress/token-meter-unit-price-transparency/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/tickets/in-progress/token-meter-unit-price-transparency/investigation-notes.md`
- Reviewed UI Specification: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/tickets/in-progress/token-meter-unit-price-transparency/ui-specification.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/tickets/in-progress/token-meter-unit-price-transparency/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review requested by `solution_designer` for the user-approved first requirement only.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed the design package and spot-checked current code in the task worktree, including `agent-run-token-usage.ts`, `token-cost-calculator.ts`, `token-usage-cost-summary-aggregate.ts`, `token-usage-run-summary-adapter.ts`, `token-usage-stats.ts`, frontend Token Meter types/store/query/panel/formatters, and Prisma ledger fields.

Round rules:
- Reuse the same finding IDs across reruns for the same unresolved design-review issues.
- Create new finding IDs only for newly discovered issues.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design review | N/A | No | Pass | Yes | Design is ready for implementation with residual implementation notes only. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/tickets/in-progress/token-meter-unit-price-transparency/design-spec.md` together with the user-approved requirements, investigation notes, and UI specification.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design classifies the work as a feature / UX transparency enhancement. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design identifies a localized boundary/shared-structure gap: pricing events/persistence have unit prices while summary/API/frontend DTOs drop them. Code spot-check confirms event and Prisma fields exist and current aggregate/GraphQL/frontend types omit unit prices. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design requires a small targeted data-shape refactor, not pricing formula refactor. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | File mapping, reusable structure section, boundary map, and migration sequence all route the refactor through the token usage summary/API/store path. Mixed per-call ledger remains explicitly deferred. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First review round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End: ledger events to unit-price aggregate | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Primary End-to-End: server summary to frontend Token Meter | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Bounded Local: disclosure interaction | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server token usage projection | Pass | Pass | Pass | Pass | Correct owner for collapsing event-level prices into display-safe component summaries. |
| GraphQL token usage API | Pass | Pass | Pass | Pass | Existing transport boundary should expose, not derive, unit-price summary fields. |
| Frontend token usage state | Pass | Pass | Pass | Pass | Store preserves/merges server-provided data and remains non-authoritative for pricing. |
| Token Meter UI | Pass | Pass | Pass | Pass | Disclosure belongs inside existing Pricing details card per approved UI scope. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Per-component unit-price display status | Pass | Pass | Pass | Pass | New projection helper is justified; same status/price shape applies across input, cache, output, and reasoning rows. |
| Unit-price/status formatting | Pass | Pass | Pass | Pass | Existing Token Meter formatter is the correct UI-local owner. |
| Live/hydrated summary shape parity | Pass | Pass | Pass | Pass | Design calls for one frontend `unitPrices` structure across GraphQL hydration and live events. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TokenUsageUnitPriceSummary` | Pass | Pass | Pass | Pass | Pass | `status` plus `pricePerMillion` is tight enough and avoids duplicating tokens/costs. |
| `TokenUsageUnitPrices` | Pass | Pass | Pass | Pass | Pass | Component keys map to existing token/cost components; per-component status avoids an ambiguous overall-only marker. |
| GraphQL/frontend mirrors | Pass | Pass | Pass | Pass | Pass | Transport mirrors should remain DTOs, not pricing owners. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Hidden-only calculation basis in Pricing details | Pass | Pass | Pass | Pass | Replaced by expandable Calculation details disclosure. |
| Frontend hard-coded price table temptation | Pass | Pass | Pass | Pass | Explicitly rejected; replacement is server-owned summary fields. |
| Fake blended/single price for mixed aggregates | Pass | Pass | Pass | Pass | Explicitly rejected; replacement is `mixed` / `varies by call`. |
| Modal/always-on pricing UI alternatives | Pass | Pass | Pass | Pass | UI spec rejects these for this first implementation. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-unit-price-summary.ts` | Pass | Pass | Pass | Pass | New projection helper owns classification only, not price calculation. |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-cost-summary-aggregate.ts` | Pass | Pass | Pass | Pass | Existing aggregate owner attaches `unit_prices`/equivalent. |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-run-summary-adapter.ts` / `TokenUsageRunSummaryPayload` | Pass | Pass | N/A | Pass | Design says to extend the server summary contract; implementer should carry aggregate unit prices through this adapter/payload so GraphQL does not drop them. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | Pass | Pass | Pass | Pass | Existing DTO mapper should expose summary fields only. |
| `autobyteus-web/types/tokenUsageMeter.ts` | Pass | Pass | Pass | Pass | Frontend type mirror is the right place for DTO fields and live event flat price fields. |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | Pass | Pass | Pass | Pass | Store may merge event unit prices into the summary shape; no provider catalog lookup. |
| `autobyteus-web/graphql/queries/token_usage_meter_queries.ts` | Pass | Pass | N/A | Pass | Existing fragment owner should fetch the new object. |
| `autobyteus-web/components/workspace/usage/tokenUsageFormatting.ts` | Pass | Pass | Pass | Pass | Formatting remains presentation-only. |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Pass | Pass | Pass | Pass | Disclosure rendering belongs in the existing panel. |
| `autobyteus-web/localization/messages/en/shell.ts` | Pass | Pass | N/A | Pass | Copy-only concern. |
| Durable docs paths named in the design | Pass | Pass | N/A | Pass | Documentation impact is correctly deferred to delivery after implementation state is known. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Token pricing authority | Pass | Pass | Pass | Pass | Frontend must not import catalogs or recalculate authoritative prices. |
| Summary projection | Pass | Pass | Pass | Pass | GraphQL/UI should consume projection output rather than DB/event internals. |
| Frontend Token Meter | Pass | Pass | Pass | Pass | UI may format/display server-provided arithmetic only. |
| Mixed pricing handling | Pass | Pass | Pass | Pass | Design explicitly forbids fake single prices. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `TokenCostCalculator` | Pass | Pass | Pass | Pass | Price application remains server-side. |
| Token usage summary projection | Pass | Pass | Pass | Pass | Mixed/missing classification is owned here, not guessed in the UI. |
| GraphQL token usage summary | Pass | Pass | Pass | Pass | Store/UI consume transport contract. |
| `TokenUsageMeterPanel.vue` | Pass | Pass | Pass | Pass | Presentation boundary only; no pricing authority. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `TokenUsageUnitPriceSummary` | Pass | Pass | Pass | Low | Pass |
| `TokenUsageCostSummaryAggregate.unit_prices` / equivalent | Pass | Pass | Pass | Low | Pass |
| `TokenUsageRunSummaryPayload` / GraphQL summary DTO | Pass | Pass | Pass | Low | Pass |
| `TokenUsageRunSummaryFields` GraphQL fragment | Pass | Pass | Pass | Low | Pass |
| `tokenUsageMeterStore.applyTokenUsageUpdated` | Pass | Pass | Pass | Low | Pass |
| Calculation details disclosure | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/projections` | Pass | Pass | Low | Pass | Projection helper and aggregate are placed under the summary owner. |
| `autobyteus-server-ts/src/api/graphql/types` | Pass | Pass | Low | Pass | Existing GraphQL type/resolver file is the current token usage API boundary. |
| `autobyteus-web/types` and `autobyteus-web/stores` | Pass | Pass | Low | Pass | DTO/state ownership is unchanged. |
| `autobyteus-web/components/workspace/usage` | Pass | Pass | Low | Pass | UI and formatter changes stay inside existing Token Meter capability area. |
| `autobyteus-web/localization/messages/en/shell.ts` | Pass | Pass | Low | Pass | Existing copy catalog. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Price policy ownership | Pass | Pass | N/A | Pass | Existing calculator remains authority. |
| Unit-price aggregation | Pass | Pass | Pass | Pass | New helper is justified within projections to avoid bloating aggregate and duplicating policy. |
| API exposure | Pass | Pass | N/A | Pass | Extend existing GraphQL token usage boundary. |
| Frontend state/query | Pass | Pass | N/A | Pass | Extend existing store/query/types. |
| UI disclosure | Pass | Pass | N/A | Pass | Extend existing Token Meter panel. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Frontend inference from cost/tokens | No | Pass | Pass | Rejected. |
| Frontend provider price table | No | Pass | Pass | Rejected. |
| Blended/fake mixed rate | No | Pass | Pass | Rejected. |
| Parallel modal UI | No | Pass | Pass | Rejected for this scoped task. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Server projection/types | Pass | Pass | Pass | Pass |
| GraphQL API/query | Pass | Pass | Pass | Pass |
| Frontend store/type parity | Pass | Pass | Pass | Pass |
| Token Meter UI and localization | Pass | Pass | Pass | Pass |
| Tests and docs | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Placement | Yes | Pass | Pass | Pass | UI spec shows collapsed and expanded placement inside Pricing details. |
| Formula | Yes | Pass | Pass | Pass | Screenshot arithmetic example is clear. |
| Thinking/reasoning | Yes | Pass | Pass | Pass | Design repeatedly forbids double-counting. |
| Mixed pricing | Yes | Pass | Pass | Pass | `varies by call` is specified and fake blended rate is rejected. |
| Boundary ownership | Yes | Pass | Pass | Pass | Server summary vs frontend price table contrast is clear. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Per-call detailed mixed pricing ledger | Needed for full mixed aggregate explainability but explicitly outside approved scope. | Defer; show `varies by call` for this task. | Controlled residual risk. |
| Exact GraphQL field naming for nested unit prices | Implementation detail affects schema/tests. | Keep nested per-component summary and avoid an ambiguous overall-only status. | Non-blocking implementation decision. |
| Carrying unit prices through `TokenUsageRunSummaryPayload`/adapter | Current code has a typed summary adapter between aggregate and GraphQL. | Update alongside aggregate/API so the new fields are not dropped. | Non-blocking implementation note; no design rework required. |
| Price comparison precision for mixed detection | Floating values should not mark equivalent catalog values mixed because of tiny representation differences. | Use a stable normalization/tolerance if needed in helper tests. | Non-blocking implementation note. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking design findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- The implementation must remember the current typed summary adapter path: `TokenUsageCostSummaryAggregate -> buildTokenUsageRunSummary -> TokenUsageRunSummaryPayload -> GraphQL`. The design direction covers this as “server summary contract,” but the adapter/payload are easy places to accidentally drop `unitPrices`.
- Mixed detection should be based on component-relevant positive-token events and stable price comparison, not merely on policy key churn or zero-token rows.
- The expanded panel can get dense in the right-side UI; follow the UI specification’s stacked responsive layout if table columns become cramped.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Architecture approves implementation. The design preserves pricing authority on the server, gives the summary projection ownership of mixed/missing unit-price classification, keeps GraphQL/frontend as DTO/presentation layers, and implements the user-approved collapsed `Calculation details` disclosure without broadening scope.
