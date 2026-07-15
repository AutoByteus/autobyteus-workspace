# Design Spec — Token Meter Unit-Price Calculation Details

## Current-State Read

Token usage accounting currently follows a server-owned path:

`Runtime/provider usage -> TOKEN_USAGE_UPDATED enrichment -> TokenCostCalculator -> token_usage_ledger_events -> summary projection -> GraphQL/live frontend store -> TokenUsageMeterPanel`.

Current important owners and files:

- `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts`
  - Defines `TokenUsageUpdatedPayload`.
  - Already includes event-level unit-price fields: `input_price_per_million`, `output_price_per_million`, cached read/write unit prices, pricing source/status/snapshot, and component cost fields.
- `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts`
  - Authoritative owner that multiplies token components by selected policy unit prices.
  - Current formula is `tokens / 1_000_000 * pricePerMillion`.
  - Current reasoning/thinking cost uses the output price and is an explanatory output sub-breakdown, not an extra total added on top of output cost.
- `autobyteus-server-ts/prisma/schema.prisma` and SQL repository
  - Already persist event-level unit-price fields.
- `autobyteus-server-ts/src/token-usage/projections/token-usage-cost-summary-aggregate.ts`
  - Aggregates token counts, component costs, cost status, currency, pricing policy key, and selected tier.
  - Does **not** aggregate or expose unit-price summary fields.
- `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts`
  - Exposes aggregate/run summary DTOs but omits unit-price fields.
- `autobyteus-web/types/tokenUsageMeter.ts`, `autobyteus-web/stores/tokenUsageMeterStore.ts`, and `autobyteus-web/graphql/queries/token_usage_meter_queries.ts`
  - Frontend summary/event shape includes tokens, component costs, status, policy key, model/runtime metadata, but not unit-price fields.
- `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue`
  - Presents the current Token Meter hierarchy: `Latest prompt`, `Gross input`, `Output`, `Total estimate`, `Input breakdown`, `Pricing details`.
  - `Input breakdown` shows component tokens and costs only. It does not show unit prices or formula.
- Current docs explicitly state the frontend is presentation-only and must not import provider pricing metadata or recalculate authoritative model prices.

The user-approved UI direction is recorded in:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/tickets/in-progress/token-meter-unit-price-transparency/ui-specification.md`

## Intended Change

Add an inline expandable **Calculation details** disclosure inside the existing **Pricing details** card. The collapsed Token Meter remains visually close to today. When expanded, the panel shows server-provided calculation basis:

- formula: `tokens ÷ 1,000,000 × unit price`;
- component tokens;
- server-provided unit price per 1M tokens;
- server-provided component cost;
- input/output/total subtotals;
- explicit handling for thinking/reasoning, mixed pricing, missing pricing, and local/no-bill status.

Implementation must extend the server summary/API/store contract so the frontend displays the prices the server actually used. The frontend must not hard-code provider price tables.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / UX transparency enhancement.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, localized to summary/API/UI explainability.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue and Shared Structure Looseness.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, small targeted data-shape refactor.
- Evidence:
  - The backend event/persistence path already owns and stores unit-price fields.
  - The summary/GraphQL/frontend path drops those fields, so the Token Meter cannot expose the calculation basis.
  - Screenshot costs reconcile exactly with the backend catalog values for `gpt-5.5`, proving display transparency would answer the user's trust concern without changing pricing logic.
- Design response:
  - Add a reusable server-owned unit-price summary structure to token usage aggregates.
  - Expose that structure through GraphQL and frontend store types.
  - Render the user-approved expandable `Calculation details` UI inside `Pricing details`.
- Refactor rationale:
  - Pushing a hard-coded frontend price table would bypass the authoritative pricing boundary.
  - Reusing event-level unit-price fields directly in every caller would duplicate merge/mixed/missing policy.
  - A compact summary-owned unit-price structure keeps ownership clear and prevents frontend inference.
- Intentional deferrals and residual risk, if any:
  - A full per-call pricing ledger for mixed aggregates is deferred. Mixed summaries should display `varies by call` instead of pretending a single unit price exists.
  - Invoice-grade reconciliation, taxes, credits, and enterprise discounts remain out of scope.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.
- `Unit price`: the price per 1,000,000 tokens for a billable component.
- `Unit-price summary`: server summary of whether a component has one displayable price, mixed prices, missing price, not-applicable, partial missing, or local/no-bill status.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: the design does not keep a legacy hidden-calculation UI path as an alternate mode. It extends the current Token Meter with the approved disclosure and updates tests/docs accordingly.
- Obsolete behavior in scope: pricing details that show only model/runtime/status/report count while hiding the unit prices used to produce displayed costs.
- Clean replacement: pricing details include an expandable calculation disclosure driven by server-owned unit-price summary fields.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Ledger token usage events with unit prices | Run/team/member unit-price summary | Token Usage Summary Projection | Converts event-level prices into a safe UI summary, including mixed/missing states. |
| DS-002 | Primary End-to-End | Token usage summary GraphQL query/live event | Token Meter Calculation details UI | Frontend Token Usage Meter | Ensures live and hydrated Token Meter show the same calculation basis. |
| DS-003 | Bounded Local | User clicks Calculation details | Expanded inline calculation panel | TokenUsageMeterPanel | Preserves clean default UI while exposing detailed validation on demand. |

## Primary Execution Spine(s)

- DS-001: `TokenUsageLedgerEvent[] -> buildTokenUsageCostSummaryAggregate -> unit price summary builder -> TokenUsageCostSummaryAggregate`
- DS-002: `TokenUsageCostSummaryAggregate -> TokenUsageCostSummaryAggregateGraphql -> token_usage_meter_queries.ts -> tokenUsageMeterStore -> TokenUsageMeterPanel`
- DS-003: `Pricing details card -> Calculation details disclosure button -> calculation table rows -> user manual validation`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Persisted events already contain unit prices. The summary projection collapses those event-level prices into per-component display states: one price, mixed, missing, partial missing, not applicable, or local/no-bill. | Ledger event, unit-price component, aggregate summary | Token Usage Summary Projection | Component token relevance, missing dimensions, mixed policy detection. |
| DS-002 | The server exposes unit-price summary fields through the existing GraphQL summary. The frontend store preserves/merges the same structure for live updates and hydration. | GraphQL DTO, frontend summary store, Token Meter UI | Frontend Token Usage Meter | Localization, formatting, responsive layout. |
| DS-003 | The user keeps the current concise Token Meter by default and clicks Calculation details only when they want the formula/unit prices. | Pricing details card, disclosure state, calculation row | TokenUsageMeterPanel | Accessibility, collapsed default state, rounded display. |

## Spine Actors / Main-Line Nodes

- `TokenUsageUpdatedPayload` event unit-price fields.
- `buildTokenUsageCostSummaryAggregate`.
- New unit-price summary structure/builder under the token usage projection/domain owner.
- `TokenUsageCostSummaryAggregateGraphql` / `TokenUsageRunSummaryGraphql`.
- `TokenUsageRunSummary` frontend type and `tokenUsageMeterStore`.
- `TokenUsageMeterPanel.vue` calculation disclosure.

## Ownership Map

| Owner | Owns | Must Not Own |
| --- | --- | --- |
| `TokenCostCalculator` | Authoritative price calculation and selected event unit-price fields. | UI disclosure state or display-only formula layout. |
| Token usage summary projection | Aggregating event-level unit prices into safe per-component summary states. | Provider catalog lookup or frontend rendering. |
| GraphQL token usage API | Transporting server-owned unit-price summaries. | Deriving prices from model names. |
| Frontend token usage store | Holding hydrated/live summary fields and merging live event unit prices without recalculating authoritative costs. | Importing model catalogs or replacing server costs. |
| Token Meter UI | Rendering the approved disclosure, formula, rows, and status messages. | Becoming the pricing authority. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `get*TokenUsageSummary` queries | Token usage summary projection | Hydration boundary for Token Meter. | Unit-price derivation independent of projection. |
| `tokenUsageHandler.handleTokenUsageUpdated` | Frontend token usage store | Live event entrypoint. | Pricing math or provider-specific price lookup. |
| `TokenUsageMeterPanel.vue` | Frontend Token Meter UI | User-facing presentation boundary. | Provider pricing catalog or authoritative cost recomputation. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Hidden-only calculation basis in Pricing details | User cannot validate estimated costs. | Expandable `Calculation details` disclosure. | In This Change | Existing model/runtime/status rows remain. |
| Any temptation to add a frontend hard-coded price table | Would bypass server pricing authority. | Server-owned unit-price summary fields. | In This Change | Explicitly forbid in implementation guidance/tests. |
| A fake single unit price for mixed aggregates | Misleading for multi-model/provider calls. | Unit-price status `mixed` / `varies by call`. | In This Change | Full per-call details deferred. |

## Return Or Event Spine(s) (If Applicable)

The live event spine remains:

`Server TOKEN_USAGE_UPDATED -> tokenUsageHandler -> tokenUsageMeterStore.applyTokenUsageUpdated -> TokenUsageMeterPanel`.

Live event payloads should include the event-level unit-price fields already present in the backend contract. The store should merge them into the same `unitPrices` structure used by hydrated GraphQL summaries so live state and reload state converge.

## Bounded Local / Internal Spines (If Applicable)

Inside `TokenUsageMeterPanel.vue`:

`Disclosure button click -> local expanded state toggle -> calculate display rows from summary -> render table/stacked rows`.

This local spine matters because the expanded panel must not cause a network fetch, mutate cost data, or clutter the default Token Meter.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Unit-price formatting | DS-002, DS-003 | Token Meter UI | Format `$5.00 / 1M tokens`, `varies by call`, `same as output`. | Keeps UI consistent/localized. | Hard-coded strings and inconsistent status display. |
| Accessibility state | DS-003 | TokenUsageMeterPanel | `aria-expanded`, keyboard toggle, controlled panel id. | Disclosure is interactive UI. | Inaccessible hidden detail. |
| Mixed/missing classification | DS-001 | Summary projection | Decide whether one unit price is safe to display. | Prevents misleading UI. | Frontend guessing from null values. |
| Rounding note | DS-003 | Token Meter UI | Explain rounded displayed costs. | Avoids confusion when manual calculation differs by fractions of a cent. | User perceives mismatch as a bug. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Event price ownership | `autobyteus-server-ts/src/token-usage/pricing` | Reuse | Existing calculator already owns prices. | N/A |
| Summary aggregation | `token-usage/projections/token-usage-cost-summary-aggregate.ts` | Extend | Existing summary owner should classify unit-price display states. | N/A |
| GraphQL transport | `src/api/graphql/types/token-usage-stats.ts` | Extend | Existing token usage API boundary. | N/A |
| Frontend Token Meter formatting | `components/workspace/usage/tokenUsageFormatting.ts` | Extend | Existing formatter owner. | N/A |
| Token Meter UI | `TokenUsageMeterPanel.vue` | Extend | Existing right-side Token tab UI owner. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server token usage projection | Unit-price summary status and aggregation | DS-001 | Summary projection | Extend | Add shared unit-price summary types/helpers near projections/domain. |
| GraphQL token usage API | Unit-price summary exposure | DS-002 | API boundary | Extend | Applies to run/team/member summaries and stats aggregate if same fragment is reused. |
| Frontend token usage state | Hydrated/live unit-price fields | DS-002 | Token Meter store | Extend | Keep same data shape for live and GraphQL. |
| Token Meter UI | Disclosure and calculation table | DS-003 | TokenUsageMeterPanel | Extend | Follow `ui-specification.md`. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-unit-price-summary.ts` | Server token usage projection | Unit-price summary builder | Define status/type/helpers for safe unit-price aggregation. | Reusable projection concern, avoids bloating aggregate file. | Yes |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-cost-summary-aggregate.ts` | Server token usage projection | Aggregate builder | Attach unit-price summary to aggregate. | Existing aggregate owner. | Yes |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | GraphQL token usage API | DTO mapper | Add GraphQL object fields/mapping for unit prices. | Existing API owner. | Yes |
| `autobyteus-web/types/tokenUsageMeter.ts` | Frontend token usage state | DTO types | Add unit-price summary interfaces and event flat fields. | Existing token meter type owner. | Yes |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | Frontend token usage state | Live/hydrated store | Initialize and merge unit-price summary from events. | Existing store owner. | Yes |
| `autobyteus-web/graphql/queries/token_usage_meter_queries.ts` | Frontend API query | Token Meter summary query | Fetch unit-price fields. | Existing query fragment owner. | Yes |
| `autobyteus-web/components/workspace/usage/tokenUsageFormatting.ts` | Token Meter UI | Formatter | Format unit prices/status text. | Existing UI formatting owner. | Yes |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Token Meter UI | Panel renderer | Add disclosure and calculation rows. | Existing UI owner. | Yes |
| `autobyteus-web/localization/messages/en/shell.ts` | Localization | Copy catalog | Add copy keys from UI spec. | Existing shell/token usage copy owner. | N/A |
| Tests | Coverage | Regression | Add backend GraphQL/projection and frontend component/store assertions. | Existing test locations. | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Unit-price display status per component | `token-usage-unit-price-summary.ts` and frontend type mirror | Token usage projection / frontend DTO | Same six components need the same status/price shape. | Yes | Yes | A broad pricing calculator. |
| Unit-price formatting | `tokenUsageFormatting.ts` | Frontend UI | Shared rows need consistent text. | Yes | Yes | Provider catalog lookup. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TokenUsageUnitPriceSummary` | Yes | Yes | Low | Fields: `status`, `pricePerMillion`. No component-specific token/cost duplication. |
| `TokenUsageUnitPrices` | Yes | Yes | Low | Component keys match existing token/cost components. |
| `unitPriceSummaryStatus` if implemented as overall field | Medium | Yes | Medium | Prefer per-component statuses over one ambiguous overall status. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-unit-price-summary.ts` | Server token usage projection | Unit-price summary builder | Component status and single/mixed/missing/local classification. | Keeps projection policy reusable/testable. | N/A |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-cost-summary-aggregate.ts` | Server token usage projection | Cost summary aggregate | Include `unit_prices`/equivalent in aggregate. | Existing aggregate file. | Yes |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | GraphQL API | Token usage DTO mapper | Expose `unitPrices` object. | Existing GraphQL file. | Yes |
| `autobyteus-web/types/tokenUsageMeter.ts` | Frontend DTO | Summary and live payload types | Add `unitPrices` and event flat unit-price fields. | Existing type file. | Yes |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | Frontend state | Token Meter store | Merge event unit prices into summary state; preserve GraphQL `unitPrices`. | Existing live/hydration owner. | Yes |
| `autobyteus-web/graphql/queries/token_usage_meter_queries.ts` | Frontend GraphQL | Query fragment | Fetch unit prices. | Existing query file. | Yes |
| `autobyteus-web/components/workspace/usage/tokenUsageFormatting.ts` | Frontend UI | Formatting | Format per-million unit prices and unit-price statuses. | Existing formatter. | Yes |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Frontend UI | Token Meter panel | Add Calculation details disclosure/table. | Existing UI owner. | Yes |
| `autobyteus-web/localization/messages/en/shell.ts` | Localization | Shell token usage copy | Add calculation detail copy keys. | Existing catalog. | N/A |
| `autobyteus-server-ts/docs/modules/token_usage.md`, `autobyteus-web/docs/settings.md`, `autobyteus-web/docs/agent_execution_architecture.md` | Docs | Durable docs | Update after implementation to mention calculation disclosure and server-owned unit-price summary. | Existing docs. | N/A |

## Ownership Boundaries

The authoritative pricing boundary remains server-side. The frontend may show arithmetic using server-provided unit prices and server-provided costs, but must not own the price table or decide which provider/model rates apply.

The unit-price summary builder is a projection concern, not a pricing calculator. It only decides whether already-stored event unit prices collapse to one displayable value for each component.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TokenCostCalculator` | Price policy application and component costs | Event enrichment/persistence | Frontend imports catalog and recomputes price | Extend token usage summary/API fields. |
| Token usage summary projection | Unit-price summary classification | GraphQL resolvers, stats providers | UI guesses mixed/missing from null prices alone | Add explicit component status. |
| GraphQL token usage summary | Transport contract | Frontend store/UI | Store reaching into raw DB/event JSON | Add fields to GraphQL summary. |

## Dependency Rules

Allowed:

- `token-usage-cost-summary-aggregate.ts` may depend on `token-usage-unit-price-summary.ts`.
- GraphQL DTO mapping may depend on summary aggregate types.
- Frontend store/UI may depend on GraphQL/live DTO fields and formatter helpers.

Forbidden:

- `autobyteus-web` must not import `autobyteus-ts` model catalogs or server pricing policy code.
- `TokenUsageMeterPanel.vue` must not hard-code `gpt-5.5` or other provider price values.
- GraphQL resolver must not implement separate provider price lookup outside the token usage projection/pricing owners.
- Mixed pricing must not be collapsed into a fake single price.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TokenUsageUnitPriceSummary` | One component unit-price display state | Represent `single/mixed/missing/partial_missing/not_applicable/local_no_api_bill`. | Component key, price per million. | Prefer nested component object. |
| `TokenUsageCostSummaryAggregate.unit_prices` | Aggregate unit prices | Carry component unit-price summaries alongside costs. | Aggregate scope events. | Server-owned. |
| GraphQL `TokenUsageRunSummaryFields` | Run/team/member summary | Fetch unit price summaries. | Run id/team id/member selector. | Same fragment reused for Token Meter. |
| `tokenUsageMeterStore.applyTokenUsageUpdated` | Live summary update | Merge event flat unit price fields into summary `unitPrices`. | `TokenUsageUpdatedPayload`. | Merge should mark mixed if values differ. |
| `TokenUsageMeterPanel` disclosure | UI details | Render calculation details. | `TokenUsageRunSummary`. | No pricing authority. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TokenUsageUnitPriceSummary` | Yes | Yes | Low | N/A |
| GraphQL summary queries | Yes | Yes | Low | Existing selectors remain. |
| `applyTokenUsageUpdated` | Yes | Yes | Low | Add unit-price merge helper, not price lookup. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Unit-price summary | `TokenUsageUnitPriceSummary` | Yes | Low | N/A |
| Calculation UI | `Calculation details` | Yes | Low | Match user-approved wording. |
| Component price | `pricePerMillion` / `price_per_million` | Yes | Low | Include unit scale in UI copy. |

## Applied Patterns (If Any)

- **Projection helper**: `token-usage-unit-price-summary.ts` classifies event values into a display-safe aggregate. It serves the summary projection owner.
- **Disclosure/accordion UI**: local interactive pattern inside `TokenUsageMeterPanel.vue` to keep default UI concise while exposing detail on demand.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-unit-price-summary.ts` | File | Summary projection | Build per-component unit-price summaries from events. | Projection owns aggregate display data. | Provider catalog lookup. |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-cost-summary-aggregate.ts` | File | Summary projection | Add unit prices to aggregate. | Existing aggregate owner. | UI copy. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | File | GraphQL API | Add GraphQL unit-price types and mappings. | Existing summary API owner. | Pricing decisions. |
| `autobyteus-web/types/tokenUsageMeter.ts` | File | Frontend DTO | Add unit-price types. | Existing type owner. | Catalog values. |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | File | Frontend store | Merge/preserve unit-price summaries. | Existing state owner. | Authoritative cost recomputation. |
| `autobyteus-web/graphql/queries/token_usage_meter_queries.ts` | File | GraphQL query | Fetch unit-price summary. | Existing query owner. | UI layout. |
| `autobyteus-web/components/workspace/usage/tokenUsageFormatting.ts` | File | Formatter | Unit-price and status formatting. | Existing formatting owner. | Provider-specific rates. |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | File | Token Meter UI | Render Calculation details disclosure. | Existing panel owner. | Server pricing logic. |
| `autobyteus-web/localization/messages/en/shell.ts` | File | Localization | Add copy keys. | Existing messages owner. | Logic. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/projections` | Main-Line Domain-Control | Yes | Low | Unit-price summary is aggregate/projection data. |
| `autobyteus-server-ts/src/api/graphql/types` | Transport | Yes | Low | DTO mapping only. |
| `autobyteus-web/components/workspace/usage` | UI | Yes | Low | Token Meter UI and formatting already live here. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Placement | `Pricing details -> Calculation details ▸` | Always-on unit-price column in main cards | Keeps main meter clean. |
| Formula | `943,918 tokens · $5.00 / 1M = $4.72` | Hidden tooltip only | User can validate directly. |
| Thinking | `same as output · included in output cost` | Add thinking as a second output charge | Prevents double-counting. |
| Mixed pricing | `varies by call` | Blended/fake single unit price | Avoids false transparency. |
| Boundary | Server summary provides `unitPrices.input.pricePerMillion` | Frontend maps `gpt-5.5 -> 5.00` | Preserves pricing authority. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep summary contract unchanged and let frontend infer unit prices from component cost / tokens | Avoids API change | Rejected | Expose server-owned unit-price summary; inference fails with rounding, mixed, missing, and local states. |
| Hard-code known model prices in frontend | Fast UI-only implementation | Rejected | Add server/API fields from authoritative pricing path. |
| Show one blended rate for mixed pricing | Gives a number everywhere | Rejected | Show `varies by call` until per-call viewer exists. |
| Modal calculation viewer | More space | Rejected for first implementation | Inline disclosure inside Pricing details. |

## Derived Layering (If Useful)

- Server pricing layer: policy selection and cost computation.
- Server projection/API layer: unit-price display summary and GraphQL exposure.
- Frontend state/UI layer: preserve and render summary fields.

No frontend layer depends on pricing catalog internals.

## Migration / Refactor Sequence

1. Add `TokenUsageUnitPriceSummary` / `TokenUsageUnitPrices` server types/helpers.
2. Extend `TokenUsageCostSummaryAggregate` to include unit prices.
3. Update aggregate builder to classify component unit prices from event rows.
4. Extend GraphQL DTOs/mappers and queries.
5. Update frontend `TokenUsageRunSummary`, live payload type, empty summary, and store merge logic.
6. Add formatter helpers and localization keys.
7. Implement `Calculation details` disclosure inside `TokenUsageMeterPanel.vue` following `ui-specification.md`.
8. Add/update tests:
   - server projection helper single/mixed/missing/local cases;
   - GraphQL summary exposes unit-price fields;
   - frontend store merges live unit prices and marks mixed when necessary;
   - Token Meter collapsed and expanded UI rendering.
9. Update durable docs to mention server-owned unit-price calculation details.

## Key Tradeoffs

- Inline disclosure rather than modal: less disruptive and easier to compare against visible totals, but less room for very large mixed/per-call detail. Acceptable because per-call viewer is out of scope.
- Per-component status rather than only overall status: more data-shape work, but avoids ambiguity and frontend guessing.
- No blended unit price: less numeric detail for mixed aggregates, but more honest and safer.

## Risks

- Existing aggregate tests may need fixture updates if GraphQL fragments change.
- Live store merging must avoid marking mixed too aggressively when a component has zero tokens.
- Component rows must avoid double-counting reasoning/thinking cost.
- UI may become dense in narrow right-side panels; use responsive stacked rows per UI spec.

## Guidance For Implementation

- Treat `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/tickets/in-progress/token-meter-unit-price-transparency/ui-specification.md` as the concrete UI behavior reference.
- Keep the frontend presentation-only. Use server-provided unit-price summary data.
- Prefer a new small projection helper file for unit-price summary classification.
- For a component with positive tokens:
  - one unique non-null price => show `$x.xx / 1M tokens`;
  - multiple unique prices => `varies by call`;
  - no price and missing dimension => `price missing`;
  - local/no-bill => local message;
  - no tokens => omit/not applicable.
- Use existing component cost fields for displayed costs; any formula output is explanatory and must match server costs within rounding tolerance.
