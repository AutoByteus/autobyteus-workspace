# Design Spec

## Current-State Read

`autobyteus-ts` has a static built-in LLM catalog in
`src/llm/supported-model-definitions.ts`. GPT-5.6 Sol, Terra, and Luna share
`createOpenAIGpt56Pricing(input, output)`, which owns cache-read, cache-write,
and long-context tier derivation. `LLMFactory` registers those definitions and
projects provider-neutral pricing and metadata to callers. The server consumes
that projection through `TokenPriceConfigProvider` and applies it generically
in `TokenCostCalculator`; it has no duplicate provider price table.

Anthropic model definitions in the same catalog use `AnthropicLLM`, a shared
adaptive-thinking schema for current models, and Anthropic-specific 5-minute /
1-hour cache pricing fields. The adapter's private
`resolveAnthropicModelRequestPolicy` decides whether a model gets adaptive
thinking, whether disabled thinking is supported, and whether sampling fields
must be removed. Opus 5 is absent from both the catalog and that adaptive
family list. Curated model limits are separately owned by
`src/llm/metadata/curated-model-metadata.ts`.

The OpenAI issue is stale policy data. The Claude issue is a missing catalog
identity plus a missing local runtime invariant entry. Neither exposes a
boundary or ownership problem: the existing owners and public interfaces are
healthy and can be extended in place.

The 2026-07-31 pricing audit confirms that the active Fable 5, Opus 4.8, Opus
4.7, and Sonnet 4.6 rows match Anthropic's current standard price table, and
the planned Opus 5 values match as well. Sonnet 5 is intentionally recorded at
its durable standard `$3/$15` and corresponding cache rates, while Anthropic's
current page advertises a temporary `$2/$10` introductory rate through
2026-08-31. `TokenPricingConfig` has one effective date but no expiry or
temporal policy selector, so selecting the temporary rate would create a
known post-expiry stale policy. This design therefore retains the standard row;
the user confirmed that durable-pricing policy on 2026-07-31.

## Intended Change

1. Change GPT-5.6 Terra/Luna standard price inputs to the July 30 values,
   update the shared GPT-5.6 pricing effective date to `2026-07-30`, and let
   the existing helper derive cache/tier prices. Keep Sol unchanged.
2. Add one exact Anthropic catalog definition named/value/canonical name
   `claude-opus-5`, with standard Opus 5 cache-aware pricing effective
   `2026-07-24`, `AnthropicLLM`, and `claudeAdaptiveThinkingSchema`.
3. Add curated Opus 5 metadata from the official Claude overview: 1,000,000
   context/input tokens and 128,000 output tokens, verified `2026-07-31`.
4. Add `claude-opus-5` to the existing Anthropic adaptive-model family list so
   the current request sanitizer emits adaptive thinking and removes unsupported
   fixed-budget/sampling fields.
5. Extend focused catalog, metadata, and Anthropic request-shape tests and
   update active provider/module-design documentation. Do not change server
   accounting, transport, persistence, or introduce Fast-mode pricing.

## Claude Pricing Audit Decision Gate

- **Verified:** Fable 5, Opus 4.8, Opus 4.7, and Sonnet 4.6 standard prices
  match the current Anthropic pricing page. Planned Opus 5 standard and cache
  prices also match.
- **Policy difference:** Sonnet 5's source row uses standard `$3/$15`, while
  Anthropic's current introductory promotion is `$2/$10` through 2026-08-31
  and reverts to `$3/$15` on 2026-09-01; its cache rates change proportionally.
- **Resolved decision:** Keep the durable standard row. The user selected this
  final policy on 2026-07-31. The current
  catalog has no validity interval, automatic expiry, or time-based pricing
  lookup, so a temporary discount cannot be represented safely as a permanent
  static row.
- **Implementation consequence:** Keep Sonnet 5 at standard `(3,15,0.3,3.75,6)`
  pricing and add regression coverage that no temporary promotion/expiry path
  is introduced. The current Opus 5/OpenAI work package is otherwise unchanged.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001–REQ-003; AC-001–AC-004 | GPT-5.6 catalog and `LLMFactory.getModelPricingInfo` | Exact rows exist; Terra/Luna inputs are stale; formulas are centralized. | Update row inputs/date, preserve identity, Sol, trust, formulas, and threshold. | DS-001; DS-003 |
| BEH-002 | System | REQ-004; AC-005–AC-006 | Future token usage with OpenAI model identity | Server resolves generic policy, applies tier/cache math, and snapshots results. | Preserve lookup/accounting and historical snapshots; future resolutions receive new values. | DS-001; DS-003 |
| BEH-003 | Contract | REQ-005, REQ-007; AC-008, AC-011 | Claude model discovery and Anthropic message request | Opus 5 is absent; adaptive policy controls request shaping for current rows. | Add exact catalog row and one adaptive-family membership entry; preserve adapter and existing model policies. | DS-002; DS-003 |
| BEH-004 | Contract | REQ-006; AC-009–AC-010 | Claude pricing/metadata lookup | Curated metadata has no Opus 5 row; cache-aware pricing shape already exists. | Add standard price fields/date and official 1M/128k metadata. | DS-002; DS-003 |
| BEH-005 | Operational | REQ-003, REQ-006; AC-007, AC-012 | Maintainer reads active catalog/module docs | Current docs contain stale GPT-5.6 values and omit Opus 5. | Update active docs; leave historical tickets untouched and state out-of-scope modifiers. | DS-004 |
| BEH-006 | Contract | REQ-008; AC-013 | Sonnet 5 durable standard catalog policy | Source row already has standard `$3/$15` and corresponding cache rates; temporary promotion is a separate current offer. | Preserve standard row and explicitly exclude temporary promotional/expiry behavior. | DS-003 |

## Relevant Supplemental Task Artifacts

None. Investigation notes contain the complete source log and no separate
intended-behavior supplement is required.

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` plus `Behavior Change`.
- Current design issue found: `No` for the existing architecture; the missing
  Opus 5 row/policy entry is a local implementation gap.
- Root cause classification: `Local Implementation Defect` / `Missing Invariant`
  for Opus 5 absence; `No Design Issue Found` for ownership and boundaries.
- Refactor needed now: `No`.
- Evidence: the catalog owns model facts and default config, curated metadata
  has one resolver-owned source, `AnthropicLLM` owns request invariants, and
  `LLMFactory`/server pricing are provider-neutral.
- Design response: extend the existing files and tests in place; do not create
  a new schema, adapter, pricing framework, server branch, or compatibility
  seam.
- Intentional deferrals/residual risk: Fast mode, Batch, data residency,
  fallback routing, cloud-specific variants, and Opus effort controls remain
  out of scope because the current catalog has no processing-mode/variant
  identity for them. Static support does not prove provider entitlement.

## Terminology

- **GPT-5.6 standard tier:** Existing input tier at or below 272,000 input
  tokens.
- **GPT-5.6 long-context tier:** Existing `long_context_gt_272k` tier above
  272,000 input tokens.
- **Anthropic standard cache pricing:** Existing input/output, cache-read,
  5-minute cache-write, and 1-hour cache-write dimensions in
  `TokenPricingConfig`.
- **Adaptive-thinking model:** A model recognized by the Anthropic adapter's
  request policy as using `thinking: { type: "adaptive" }` rather than the
  fixed-budget `type: "enabled"` shape.

## Design Reading Order

Read the behavior map and spines first, then ownership and file mappings. The
implementation is an in-place extension of existing catalog, metadata, and
adapter policy owners. The server and persistence paths are described to make
their unchanged boundary explicit.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove stale active policy literals`
  without retaining runtime fallbacks.
- Replace stale GPT-5.6 Terra/Luna inputs in the active catalog, focused test,
  and current docs. Historical launch tickets remain unchanged.
- Add Opus 5 as the exact current ID; do not add aliases, date-based routing,
  fallback IDs, or cloud-specific compatibility wrappers.
- Do not make the server infer Fast mode or historical rates from current model
  identity.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject/location: `autobyteus-server-ts` token-usage events and
  snapshots store the price/cost outcome for each event; static catalog code is
  not a mutable persisted policy record.
- Relevant change: no serialization, schema, or stored-record change.
- Normal readers/writers: future resolution reads current catalog policy;
  historical readers return their stored snapshot and do not recalculate it.
- Required invariant: historical values remain immutable; future OpenAI and
  Claude Opus 5 events resolve the current catalog values. `Yes`.
- Decision: `Directly Usable — No Migration`.
- Rationale: migration would incorrectly rewrite historical accounting and add
  I/O, rollout, recovery, and corruption risk without a semantic benefit.

### Migration Plan (Only When Decision Is `Migration Required`)

N/A — no migration is required.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002 | GPT-5.6 definition | Future token-cost snapshot/live/GraphQL result | LLM catalog plus server token-cost subsystem | Carries refreshed OpenAI policy to the meaningful accounting outcome. |
| DS-002 | Primary End-to-End | BEH-003, BEH-004 | Claude Opus 5 definition | Anthropic Messages API response/token usage | LLM catalog plus `AnthropicLLM` | Proves new identity, pricing, metadata, and request policy are on the real runtime path. |
| DS-003 | Return-Event | BEH-001–BEH-004, BEH-006 | `LLMFactory` lookup/metadata request | Trusted model pricing/metadata or provider request | `LLMFactory` and provider-specific owners | Keeps callers on the existing public lookup boundaries and durable Sonnet 5 policy. |
| DS-004 | Primary End-to-End | BEH-005 | Official provider source | Active maintainer documentation | `autobyteus-ts/docs` owners | Keeps durable docs aligned without making docs a runtime dependency. |

## Primary Execution Spine(s)

`GPT-5.6 definition -> LLMModel registration -> LLMFactory.getModelPricingInfo -> TokenPriceConfigProvider.resolvePolicy -> TokenCostCalculator.selectTier/applyPolicy -> token-usage snapshot/live/GraphQL result`

`Claude Opus 5 definition -> LLMModel registration -> LLMFactory.createLLM -> AnthropicLLM request-policy resolution -> adaptive/sanitized Messages request -> Anthropic response/token-usage normalization`

`Official OpenAI/Anthropic sources -> maintained provider catalog/module docs`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The OpenAI definition supplies trusted standard/cache/tier values; factory lookup projects them; server policy resolution selects the tier and calculator applies component prices; the event stores the resulting snapshot. | GPT-5.6 catalog, `LLMFactory`, `TokenPriceConfigProvider`, `TokenCostCalculator` | Catalog owns price facts; server owns application/persistence. | Unit assertions, docs, and official source evidence. |
| DS-002 | The exact Opus 5 definition registers an Anthropic model with cache-aware pricing and adaptive schema. Factory creation passes it to `AnthropicLLM`, whose family policy strips invalid sampling/fixed-thinking fields and builds an adaptive request before response normalization. | Opus 5 definition, `LLMFactory`, `AnthropicLLM`, Anthropic Messages API, token-usage normalizer | Catalog owns identity/defaults; adapter owns request invariants. | Metadata resolver, unit/integration tests, provider entitlement. |
| DS-003 | A caller requests provider-neutral pricing/metadata or creates an LLM by exact model identity. The factory remains the public registry boundary; no caller imports private catalog helpers or policy lists. | `LLMFactory`, `LLMModel`, metadata resolver, provider adapters | Factory/metadata subsystem | Missing-model status and custom overrides remain existing branches. |
| DS-004 | Maintainers compare official source dates and price dimensions with active docs. Docs mirror source code and first-party evidence but never participate in runtime accounting. | Provider catalog docs and module-design docs | `autobyteus-ts` maintainers | Historical tickets and external pages are evidence only. |

## Spine Actors / Main-Line Nodes

- `supportedModelDefinitions` and `createOpenAIGpt56Pricing` for OpenAI pricing.
- The new `claude-opus-5` definition and existing `claudeAdaptiveThinkingSchema`.
- `LLMFactory` registration, identity lookup, creation, pricing, and metadata
  projection.
- `resolveAnthropicModelRequestPolicy` and existing request parameter helpers.
- `TokenPriceConfigProvider` / `TokenCostCalculator` for unchanged server use.
- Anthropic token-usage normalization and active provider documentation.

## Ownership Map

| Main-Line Node | Concrete Ownership |
| --- | --- |
| Static model catalog | Exact built-in model identity, provider/runtime class, default config, trusted pricing/date, and config schema. |
| GPT-5.6 pricing helper | Shared OpenAI cache/tier formula; it receives only standard input/output values. |
| Curated metadata map | Official context/input/output limits and verification/source records for known model IDs. |
| `AnthropicLLM` request policy | Model-family request invariants: adaptive thinking, fixed-thinking sanitization, and sampling removal. |
| `LLMFactory` | Registration and provider-neutral lookup/creation/metadata projection. |
| `TokenPriceConfigProvider` | Server adaptation from factory pricing to resolved provider-neutral policy. |
| `TokenCostCalculator` | Tier selection and component cost application, not provider facts. |
| Token-usage persistence/projection | Historical snapshots and output projections; never current-catalog repricing. |
| Active docs | Maintainer-facing source/date/model/policy record; never runtime authority. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `LLMFactory.getModelPricingInfo` / metadata lookup | Catalog definitions plus metadata resolver | Stable provider-neutral lookup boundary. | Provider-specific literals, request shaping, or duplicate fallback catalog. |
| `LLMFactory.createLLM` | Registered definition and provider class | Creates configured runtime model from exact identity. | Anthropic family policy or server accounting. |
| `AnthropicLLM` request methods | Anthropic adapter and private policy helper | Own provider wire invariants at the external API boundary. | Catalog pricing/metadata or server cost algorithms. |
| `TokenPriceConfigProvider.resolvePolicy` | Server token-cost subsystem | Maps public factory result to server policy and local/missing status. | OpenAI/Anthropic price constants or model-specific request rules. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Stale active GPT-5.6 Terra/Luna launch-price literals | No longer current provider policy. | Updated helper inputs/date, test expectations, and active docs. | In This Change | Historical tickets remain unchanged. |
| Opus 5 absence assumptions in active current-model lists/tests/docs | New model is now supported. | Exact `claude-opus-5` catalog/metadata/policy row and coverage. | In This Change | No alias or fallback. |
| No other runtime/persistence files | No obsolete boundary or duplicate owner found. | N/A | N/A | Avoid addition-only refactoring. |

## Return Or Event Spine(s) (If Applicable)

`TokenPriceConfigProvider.resolvePolicy -> LLMFactory.getModelPricingInfo -> trusted ModelPricingInfo -> ResolvedTokenPricingPolicy -> TokenCostCalculator`

`LLMFactory.createLLM / metadata lookup -> AnthropicLLM or curated metadata result -> caller/runtime`

These return paths preserve existing shape/trust behavior. New Opus 5 data
enters through the same provider-neutral lookup; no event/callback is added.

## Bounded Local / Internal Spines (If Applicable)

The Anthropic request-policy helper is a bounded local policy decision inside
`AnthropicLLM`: model family match -> policy flags -> sanitize incoming
thinking/sampling -> build adaptive thinking parameter. It remains private and
does not become a cross-provider policy framework.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Catalog/metadata unit tests | DS-001–DS-003 | Catalog/factory boundary | Assert identity, trust, dates, prices, metadata, and schemas. | Executable contract. | Tests could become runtime policy branches. |
| Anthropic adapter tests | DS-002 | `AnthropicLLM` | Assert default/adaptive/sanitized streaming and sync request shapes. | Provider wire-contract evidence. | Runtime behavior could be duplicated in catalog. |
| Active provider/module docs | DS-004 | Maintainers | Record source, current rows, pricing, and out-of-scope modifiers. | Durable context. | Docs could be mistaken for runtime authority. |
| Official provider pages | DS-004 | Maintainers | Supply current external facts. | Source evidence. | Runtime network dependency would harm determinism. |
| Historical ledger snapshots | DS-001 | Persistence/projection | Preserve old event prices/costs. | Accounting integrity. | Repricing would corrupt history. |

## Ownership Boundaries

- `supported-model-definitions.ts` owns built-in facts and default config. The
  GPT-5.6 helper owns only GPT-5.6 formula derivation.
- `curated-model-metadata.ts` owns official limits; it does not own pricing or
  request shaping.
- `AnthropicLLM` owns Anthropic wire invariants and family policy. It may match
  exact model-family values but must not import the catalog to decide pricing.
- `LLMFactory` is the public registry/projection boundary. Server consumers do
  not read definitions or private helpers.
- `TokenPriceConfigProvider` and `TokenCostCalculator` own server adaptation and
  application, not provider facts.
- Persistence owns historical snapshots and must not ask the current catalog to
  recalculate them.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `LLMFactory` pricing/metadata lookup | Definitions, `LLMModel.defaultConfig`, `TokenPricingConfig`, curated metadata resolver | Server pricing, runtime metadata consumers, public catalog tests | Server importing definitions or duplicating price literals. | Add provider-neutral fields only if an actual generic need appears; current shape is sufficient. |
| `AnthropicLLM` request construction | Family policy, thinking sanitizer, sampling filter, provider-safe kwargs | `LLMFactory.createLLM` runtime path | Caller-side model-name branches or fixed-budget payload wrappers. | Extend private policy membership; do not add a public selector. |
| `TokenPriceConfigProvider` | Factory result to resolved server policy mapping | `TokenCostCalculator` | Calculator reaching into provider catalog. | Add provider-neutral policy field only for a real shared dimension. |
| Persistence/projection | Stored event price/cost snapshot and generic summaries | API/live/GraphQL consumers | Re-reading current catalog for historical events. | Use stored snapshots; no change needed. |

## Dependency Rules

- Catalog definitions may depend on config/schema/model/provider types and
  adapter classes in the existing direction.
- Curated metadata may depend on metadata types only; it must not call a live
  provider or own request construction.
- `AnthropicLLM` may depend on its adapter policy and provider-safe request
  helpers; it must not import server accounting or use pricing literals to
  shape a request.
- The server may consume only provider-neutral factory pricing/metadata; it must
  not import `supportedModelDefinitions` or Anthropic private policy helpers.
- Tests/docs may reference current identities and policy. Docs are never a
  runtime dependency.
- No remote fetch, alias, date-conditional branch, fallback wrapper, or
  historical rewrite is permitted.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `LLMFactory.getModelPricingInfo(input)` | Built-in model pricing | Resolve trusted provider-neutral price/tier metadata. | Existing explicit provider plus model identifier/value; new exact Opus 5 ID is accepted by registration. | Unchanged interface. |
| `LLMFactory` metadata lookup | Curated model limits | Resolve context/input/output limits and schema metadata. | Existing provider/model identity; `claude-opus-5` is added. | Unchanged interface. |
| `LLMFactory.createLLM(modelId, config)` | Runtime model creation | Instantiate `AnthropicLLM` for exact Opus 5 identity. | Exact `claude-opus-5`; no alias. | Unchanged interface. |
| `AnthropicLLM` request methods | Anthropic wire request | Apply adaptive/no-sampling invariant based on model value. | Existing model value, including `claude-opus-5`. | Private policy extension only. |
| `TokenPriceConfigProvider.resolvePolicy(payload)` | Server pricing policy | Adapt factory result to resolved policy. | Existing provider/model/runtime payload. | Unchanged. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `LLMFactory` pricing/metadata lookup | Yes | Yes | Low | No change. |
| `LLMFactory.createLLM` | Yes | Yes | Low | Register exact Opus 5 only. |
| `AnthropicLLM` request policy | Yes | Yes | Low | Add one family value; no new selector. |
| `TokenPriceConfigProvider.resolvePolicy` | Yes | Yes | Low | No change. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural / Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Catalog | `supportedModelDefinitions` | Yes | Low | Keep. |
| GPT pricing helper | `createOpenAIGpt56Pricing` | Yes | Low | Keep family-specific owner. |
| Anthropic model policy | `resolveAnthropicModelRequestPolicy` | Yes | Low | Extend membership, not rename. |
| Opus 5 identity | `claude-opus-5` | Yes; official API ID | Low | Use exact name/value/canonical ID. |
| Factory lookup | `getModelPricingInfo` | Yes | Low | Keep provider-neutral name. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why |
| --- | --- | --- | --- |
| OpenAI GPT-5.6 pricing formulas | LLM catalog helper | Extend | Existing helper already owns formulas/dimensions. |
| Claude Opus 5 identity/default pricing/schema | LLM catalog | Extend | Existing Anthropic rows provide the same shape. |
| Claude model limits | Curated metadata map | Extend | One current owner and resolver already exist. |
| Adaptive/no-sampling request policy | `AnthropicLLM` private policy | Extend | Existing current-model policy is the correct boundary. |
| Server policy application | Server token-usage pricing | Reuse | Generic and already supports both price shapes. |
| Maintainer evidence | Active provider/module docs | Extend | Existing durable docs are the correct record. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spines | Decision | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-ts` LLM catalog | OpenAI/Anthropic exact identity, default config, trusted pricing/schema | DS-001–DS-003 | Extend | Add Opus 5 and refresh GPT-5.6 inputs/date. |
| `autobyteus-ts` metadata | Official context/input/output limits | DS-002, DS-003 | Extend | Add one Opus 5 row. |
| Anthropic adapter | Model-family request invariants | DS-002 | Extend | Add Opus 5 to existing adaptive list. |
| LLM catalog/adapter tests | Executable contracts | DS-001–DS-003 | Extend | Add exact prices/metadata/request-shape cases. |
| Active docs | Source/date/model/policy record | DS-004 | Extend | Update current lists and tables. |
| Server token usage | Policy application/history | DS-001, DS-003 | Reuse | No source changes. |

## Draft File Responsibility Mapping

| Candidate File | Owner / Boundary | Concrete Concern | Why This Is One File |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Catalog owner | GPT-5.6 inputs/date and Opus 5 identity/default pricing/schema. | Existing definitions are cohesive and already centralize all rows. |
| `autobyteus-ts/src/llm/api/anthropic-llm.ts` | Anthropic adapter | Opus 5 adaptive/no-sampling family membership. | Private model policy and request shaping already live together. |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Metadata owner | Opus 5 1M/128k limits/source/date. | Existing curated map is the single metadata owner. |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Catalog contract | Exact identity, prices, trust, dates, schemas. | Existing test groups these catalog assertions. |
| `autobyteus-ts/tests/unit/llm/api/anthropic-llm.test.ts` | Adapter contract | Opus 5 sync/stream adaptive request behavior. | Existing parameterized current-model policy coverage. |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Factory contract | Opus 5 metadata/schema projection. | Existing integration contract covers current rows. |
| Active docs listed below | Maintainer docs | Current model/pricing/policy explanation. | Existing documents are durable current-state references. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Why Shared | Must Not Become |
| --- | --- | --- | --- |
| GPT-5.6 cache/tier formulas | Existing private helper | Prevents three rows from duplicating derived policy. | Generic all-provider framework or server dependency. |
| Claude adaptive request shape | Existing `claudeAdaptiveThinkingSchema` and adapter helpers | Opus 5 has the same current adaptive contract. | A second schema or caller-side branch. |
| Anthropic cache subtype fields | Existing `TokenPricingConfig` fields | Already express 5m/1h/read dimensions. | New provider-specific pricing model. |
| Provider-neutral lookup types | Existing factory/server types | Existing downstream contract is complete. | OpenAI/Anthropic-specific server fields. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TokenPricingConfig` / tiers | Yes | Yes | Low | Reuse; preserve generic OpenAI tiers and Anthropic cache subtypes. |
| `ParameterSchema` | Yes | Yes | Low | Reuse adaptive schema; do not add Opus-specific effort field. |
| Curated metadata record | Yes | Yes | Low | Add official Opus 5 limits/source/date. |
| `ModelPricingInfo` / resolved policy | Yes | Yes | Low | Reuse provider-neutral projection. |

## Final File Responsibility Mapping

| File | Owner / Boundary | Concrete Concern | Reuses Shared Structure? |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Built-in catalog | Refresh GPT-5.6 and add exact Opus 5 row. | Yes: config, schemas, adapters. |
| `autobyteus-ts/src/llm/api/anthropic-llm.ts` | Anthropic request boundary | Add `claude-opus-5` to adaptive family policy. | Yes: policy/sanitizer helpers. |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Curated metadata | Add Opus 5 official limits/source/date. | Yes: metadata record shape. |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Catalog/factory test boundary | OpenAI exact values and Opus 5 identity/pricing/schema. | Yes: factory projection. |
| `autobyteus-ts/tests/unit/llm/api/anthropic-llm.test.ts` | Adapter test boundary | Opus 5 adaptive/no-sampling sync/stream requests. | Yes: existing model matrix. |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Factory metadata test boundary | Opus 5 metadata/schema resolution. | Yes: existing factory contract. |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Provider docs | Current rows, prices, limits, policy, dates. | N/A. |
| `autobyteus-ts/docs/llm_module_design.md` | Module design docs | Current Anthropic adaptive list and GPT-5.6 references. | N/A. |
| `autobyteus-ts/docs/llm_module_design_nodejs.md` | Module design docs | Current Anthropic catalog reference. | N/A. |

## Applied Patterns (If Any)

- Existing static built-in model catalog: identity/default config in one file.
- Existing family pricing factory: shared GPT-5.6 derived policy in one helper.
- Existing curated metadata fallback/resolver: docs-backed limits by provider/model.
- Existing adapter-owned request invariant: Anthropic policy stays at the
  external request boundary.
- Existing provider-neutral server pricing projection: catalog facts flow to
  accounting without provider branches.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | File | LLM catalog | GPT-5.6 values/date and exact Opus 5 row/pricing/schema. | Server cost logic, Fast/Batch mode, remote fetch. |
| `autobyteus-ts/src/llm/api/anthropic-llm.ts` | File | Anthropic adapter | Add Opus 5 adaptive/no-sampling policy membership. | Pricing/metadata or server logic. |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | File | Metadata resolver | Official Opus 5 1M/128k limits/source/date. | Request shaping or pricing formulas. |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | File | Catalog/factory tests | Exact OpenAI/Claude identity, pricing, trust, dates, schema. | Runtime branches or duplicate production policy. |
| `autobyteus-ts/tests/unit/llm/api/anthropic-llm.test.ts` | File | Adapter tests | Sync/stream Opus 5 request-policy regression. | Live credential dependency. |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | File | Factory tests | Metadata/schema projection. | Provider transport calls. |
| `autobyteus-ts/docs/provider_model_catalogs.md` | File | Provider docs | Current provider rows, prices, limits, request policies, source dates. | Runtime authority/history rewrite. |
| `autobyteus-ts/docs/llm_module_design.md` | File | Module docs | Current Anthropic adaptive list and GPT-5.6 references. | New implementation logic. |
| `autobyteus-ts/docs/llm_module_design_nodejs.md` | File | Module docs | Current Anthropic model list. | Runtime authority. |

## Folder Boundary Check

| Path / Folder | Structural Depth | Ownership Boundary Clear? | Mixed-Layer Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm` | Main-line domain/control | Yes | Low | Existing catalog/factory ownership. |
| `autobyteus-ts/src/llm/api` | Transport/provider boundary | Yes | Low | Anthropic request policy belongs at provider wire boundary. |
| `autobyteus-ts/src/llm/metadata` | Domain metadata | Yes | Low | Curated limits have a dedicated existing owner. |
| `autobyteus-ts/tests/unit/integration/llm` | Off-spine verification | Yes | Low | Existing tests mirror runtime boundaries without coupling. |
| `autobyteus-ts/docs` | Off-spine maintainer context | Yes | Low | Docs are durable but non-runtime. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why It Matters |
| --- | --- | --- | --- |
| OpenAI refresh | `createOpenAIGpt56Pricing(0.2, 1.2)` derives Luna cache/tier values in the existing owner. | Add Luna branches to `TokenCostCalculator` or a second server table. | Keeps policy facts at the catalog boundary. |
| Opus 5 catalog | One definition with `name/value/canonicalName: 'claude-opus-5'`, adaptive schema, and standard cache fields. | Add `claude-opus-5-fast`, alias to Opus 4.8, or a generic unversioned `claude-opus`. | Preserves official identity and avoids ambiguous billing. |
| Opus 5 request | Add `'claude-opus-5'` to the existing adaptive family list; `thinking_enabled: true` becomes adaptive and sampling fields are removed. | Make callers inspect model names or send fixed-budget thinking manually. | Keeps provider invariants in `AnthropicLLM`. |
| Historical data | Future events use current policies; old snapshots remain unchanged. | Rewrite historical ledger costs. | Preserves accounting auditability. |
| Fast mode | Document `$10/$50` as separate/out of scope because no speed selector exists. | Treat Fast mode as base Opus 5 price for all requests. | Avoids inventing a billing dimension. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why Considered | Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep stale GPT-5.6 launch prices as fallback | Could preserve old caller expectations. | Rejected | Replace active policy directly; snapshots preserve historical values. |
| Add Opus 5 alias/fallback to Opus 4.8 | Could serve callers before registration. | Rejected | Register exact official ID; missing IDs remain missing. |
| Add date-based dual pricing | Could distinguish old/new rates. | Rejected | Current catalog serves future events; stored snapshots serve history. |
| Add Fast/Batch/cloud variant wrapper | Could represent more provider offerings. | Rejected | Defer until processing/variant identity and accounting contract are designed. |
| Add remote pricing fetch | Could reduce future staleness. | Rejected | Keep source-controlled deterministic catalog updates. |

## Derived Layering (If Useful)

The target remains: static catalog facts -> factory registration/projection ->
provider-specific adapter policy at the wire boundary -> provider-neutral server
policy application/persistence. Metadata is a parallel curated lookup layer,
not a second runtime catalog. No new layer is introduced.

## Change / Refactor Sequence

1. Confirm this combined design-ready package and the official OpenAI/Anthropic
   source facts.
2. Update GPT-5.6 helper date/inputs and add the exact Opus 5 definition in
   `supported-model-definitions.ts`, reusing existing schemas/price fields.
3. Add Opus 5 curated metadata and extend the Anthropic adaptive family list.
4. Extend catalog pricing/identity tests, factory metadata tests, and
   Anthropic sync/stream request-policy tests.
5. Update active provider catalog and module-design docs, including standard
   Opus 5 cache-aware prices and explicit Fast-mode exclusion.
6. Run implementation-scoped checks and then API/E2E coverage proportionately;
   review active source/docs for stale GPT-5.6 values and missing Opus 5 refs.
   Do not change server algorithms, persistence, or historical tickets.

## Key Tradeoffs

- Reusing the GPT helper and Anthropic adaptive policy minimizes duplication and
  keeps the change within current owners.
- Recording Opus 5 standard pricing only avoids conflating Fast/Batch/data-zone
  modifiers with base catalog rates.
- Exposing no new effort control preserves the current project config contract,
  while official adaptive thinking remains supported through existing fields.
- No migration preserves historical accounting but means historical reports do
  not retroactively use new prices.

## Risks

- Provider prices/availability can change; source/effective dates make the next
  explicit refresh auditable.
- Static registration does not prove provider entitlement or live API access.
- A custom saved price override can intentionally replace catalog values through
  existing behavior; that is outside this task.
- The main implementation omission risk is an active test/doc list that fails to
  include Opus 5; the mapped file set addresses that risk.

## Guidance For Implementation

- GPT-5.6 expected standard `(input, output, cacheRead, cacheWrite)` values per
  million tokens: Sol `(5,30,0.5,6.25)`, Terra `(2,12,0.2,2.5)`, Luna
  `(0.2,1.2,0.02,0.25)`; long-context values are Sol `(10,45,1,12.5)`, Terra
  `(4,18,0.4,5)`, Luna `(0.4,1.8,0.04,0.5)`.
- Claude Opus 5 expected `(input, output, cacheRead, cacheWrite5m,
  cacheWrite1h)` values are `(5,25,0.5,6.25,10)` per million tokens, effective
  `2026-07-24`, with 1M context and 128k output metadata.
- Add only the exact `claude-opus-5` identity and add it to the existing
  adaptive/no-sampling policy family. Reuse `claudeAdaptiveThinkingSchema`; do
  not add `thinking_budget_tokens` or a new effort field.
- Do not modify `LLMFactory` interfaces, server token-cost code, frontend code,
  persistence schema, or historical ticket records.
- Keep active docs linked to the first-party OpenAI and Anthropic sources and
  distinguish verification date `2026-07-31` from effective/launch dates.
