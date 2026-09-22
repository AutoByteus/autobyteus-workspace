# Design Spec — Exact GPT-6 Astra And Claude Fable 5.1 Pricing Support

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Package identifier: `astra-fable-pricing-support`
- Approved requirements baseline / revision and user-approval reference: `SR-001` at commit `4fda6c4377491ab5401c029a6302d9ca78a4f7cc`, explicitly approved by the user's message `approve` on 2026-09-22.
- Behavior-defining supplements and their approval references: None.
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/investigation-notes.md`
- Workspace / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support` / `codex/astra-fable-pricing-support`
- Resolved base / revision: `origin/personal` at `d883f5620a0abaed147209ad0e42a8960df70e68`
- Finalization target: `origin/personal`; finalization is not authorized by requirements approval.

The design implements the approved behavior without changing its Standard-only, exact-identity, prospective, or no-paid-inference boundaries.

## Current-State Read

Codex App Server and Claude SDK model availability are dynamic runtime concerns. Their normalizers preserve the runtime's exact model ID, and the respective usage adapters emit that ID with `OPENAI` or `ANTHROPIC`. Server token accounting asks `TokenPriceConfigProvider`, which delegates exact lookup to the shared `LLMFactory` model catalog, selects any input-size tier in `TokenCostCalculator`, captures the resulting price/cost snapshot, and exposes it through existing projections to Token Meter and Token Statistics.

The path is structurally healthy. `gpt-6-astra` and `claude-fable-5-1` fail only because `autobyteus-ts/src/llm/supported-model-definitions.ts` lacks their exact rows. The same shared definitions also feed the AutoByteus direct-provider catalog, so each new row must remain valid for direct construction. Existing OpenAI Responses handling is model-generic. Existing Anthropic family matching already classifies `claude-fable-5-1` under `claude-fable-5-*` and suppresses invalid manual thinking and sampling fields. The target design therefore adds catalog payload, focused regression evidence, and documentation; it does not alter runtime discovery, pricing algorithms, server contracts, persistence, or frontend code.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale and supporting evidence: The production delta is local to one existing catalog file: two exact model rows, one Astra-specific direct reasoning schema, and a file-local rename/generalization of an existing long-context price constructor. Several focused tests and existing documentation files are content/evidence surfaces, not new runtime components. No new file, subsystem, public type, route, or service is required.
- Architectural risk: `Low`
- Risk rationale and supporting evidence: Existing exact lookup, runtime identity pass-through, tier selection, cost projection, direct provider adapters, and UI/status contracts already accept the added data. There is no material API, persistence, security, concurrency, deployment, lifecycle, or ownership-boundary change and no unresolved technical uncertainty. Provider-price staleness is an accepted maintenance risk with explicit provenance.
- Escalation trigger if implementation or validation discovers new impact: Return a `Design Impact` if correct support requires changing runtime discovery/normalization, a public or persisted identity/price contract, direct provider adapter logic, frontend behavior, a database migration, or pricing-mode selection. Return a `Requirement Gap` before supporting any non-Standard price variant, new Fable feature, alias, fallback, or adjacent Sonnet price correction.

### Structural Versus Payload Classification

- Payload/content surfaces: two static model definitions; exact prices, limits, provenance dates, fixtures, assertions, and documentation.
- Structural surfaces actually changed: none beyond a local private helper signature/name inside the existing catalog owner.
- Existing readers can consume the new rows through current contracts; therefore test/doc count does not inflate this task beyond `Small/Low`.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Static catalog review | `autobyteus-ts/src/llm/supported-model-definitions.ts` | Both exact IDs are absent; one helper already models OpenAI cache proportions and the 272K tier but hardcodes the GPT-5.6 effective date | Add both rows here; generalize the local helper rather than duplicate its tier policy | None |
| Exact pricing lookup review | `autobyteus-ts/src/llm/llm-model-pricing.ts`; `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts` | Provider + exact identifier/value/name/canonical match resolves a trusted policy; absence fails closed | Preserve the lookup algorithm and add exact rows only | None |
| Tier calculator review | `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts` | Inclusive `maxInputTokens` selects standard tier; a larger count selects the next tier | Test 272,000 and 272,001 synthetic Astra observations; no production calculator change | None |
| Codex metadata probe and source trace | Installed `codex-cli 0.155.1` `model/list`; Codex catalog, normalizer, and usage adapter paths recorded in investigation notes | Runtime exposes exact `gpt-6-astra`, dynamic efforts through `ultra`, and Fast capability; usage emits the exact ID | Leave Codex dynamic capability ownership untouched; direct static schema follows direct OpenAI contract instead | Future runtime catalog changes remain external and expected |
| Claude source trace | Claude SDK client/normalizer/session usage paths recorded in investigation notes | Dynamic runtime availability and exact identity already flow to accounting | Do not hardcode runtime availability; price exact emitted identity | Account-specific visibility remains external |
| Direct OpenAI request path | `autobyteus-ts/src/llm/api/openai-llm.ts`; `.../openai-responses-llm.ts` | Generic Responses adapter accepts exact model value and maps reasoning config without family gates | Reuse unchanged; add mocked Astra construction/request regression | None |
| Direct Anthropic request path | `autobyteus-ts/src/llm/api/anthropic-llm.ts` | Prefix match for `claude-fable-5-*` already removes unsupported sampling and invalid manual enabled/disabled thinking | Reuse unchanged; omit a misleading Fable 5.1 thinking toggle and add mocked regression | None |
| Provider contracts | OpenAI and Claude first-party URLs in investigation notes, verified 2026-09-22 | Exact IDs, limits, Standard prices, cache dimensions, and Astra tier are authoritative | Encode only those exact Standard values with provenance | Future provider price changes require normal catalog maintenance |
| Persistence/UI review | `autobyteus-server-ts/docs/modules/token_usage.md`; existing usage projections and frontend formatters | Prices are captured at observation time; existing UI already renders trusted and missing outcomes | No migration, repricing, new transport, or UI change | None |

## Intended Change

1. Add one exact OpenAI definition for `gpt-6-astra` with source-dated limits, Standard base/cache prices, the inclusive 272K tier, the >272K full-request tier, and a direct-API reasoning schema.
2. Add one exact Anthropic definition for `claude-fable-5-1` with source-dated limits and cache-aware Standard pricing. Do not expose a manual thinking enable/disable schema for an always-on-thinking model.
3. Generalize the existing private GPT-5.6 pricing helper into a clearly named OpenAI long-context pricing constructor accepting the pricing effective date. Keep existing GPT-5.6 values and date byte-for-byte equivalent.
4. Prove exact catalog metadata, direct request compatibility, server price-policy dimensions, Astra's tier boundary, shared model-list exposure, and preservation of existing rows through deterministic non-paid tests.
5. Update existing model catalog/design/token-usage documentation. Do not add a parallel price source.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | REQ-001, REQ-002, REQ-005, REQ-010 / AC-001, AC-002, AC-005, AC-010 | Codex emits exact `OPENAI` + `gpt-6-astra` usage | Investigation source trace and non-billable `model/list` probe | Resolve trusted Standard prices and calculated cost while preserving runtime-owned capabilities | Codex selector → App Server → exact usage → shared pricing → cost snapshot (`DS-001`) → existing projections (`DS-004`) |
| BEH-002 | User/System | REQ-003, REQ-005, REQ-010 / AC-003, AC-005, AC-010 | Claude runtime emits exact `ANTHROPIC` + `claude-fable-5-1` usage | Investigation Claude catalog/session trace and official model contract | Resolve trusted cache-aware prices; preserve runtime availability and provider-valid request shape | Claude selector → SDK runtime → exact usage → shared pricing → cost snapshot (`DS-002`) → existing projections (`DS-004`) |
| BEH-003 | Contract | REQ-001–REQ-007, REQ-009, REQ-010 / AC-001–AC-007, AC-009, AC-010 | Existing shared catalog/pricing APIs receive an exact compound identity | Exact-match/fail-closed and observation-time evidence in investigation notes | Add only the two exact rows; retain unknown-model failure and historical snapshots | Shared catalog/direct consumers (`DS-003`); accounting return path (`DS-004`) |
| BEH-004 | Operational | REQ-008, REQ-009 / AC-008, AC-009 | Engineering validation executes without target-provider inference | User constraint and prior repository practice | Static, unit, synthetic, mocked, type/build, and doc checks provide evidence; no paid prompt | Focused test/docs sequence; validates `DS-001`–`DS-004` without a production provider call |

## Relevant Supplemental Task Artifacts

None. `requirements-doc.md`, `investigation-notes.md`, and `solution-revision-record.md` are canonical solution artifacts rather than behavior-defining supplements. No Product Design or prototype artifact applies because existing UI behavior is preserved.

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Root cause classification: `Local Implementation Defect`
- Refactor needed now: `Yes` — bounded, file-local naming/generalization only.
- Evidence: Both exact runtime/provider IDs reach the established shared lookup, which fails closed because their authoritative catalog rows are missing. The current `createOpenAIGpt56Pricing` implementation already matches Astra's tier mechanics but its model-family name and hardcoded date would make direct reuse misleading.
- Design response: Add exact source-backed rows at the existing catalog owner; rename/generalize the private price constructor and require each caller to pass its effective date; preserve all outer boundaries.
- Refactor rationale: Duplicating the tier code or calling a GPT-5.6-named helper for GPT-6 Astra would create policy drift. A local parameterized rename is the smallest clean correction and lets GPT-5.6 retain its original behavior.
- Intentional deferrals and residual risk: Mode-specific pricing and the adjacent stale Sonnet 5 row remain separate concerns. Static official pricing may later change, mitigated by exact source/effective/verification metadata. No structural debt is introduced for the approved scope.

## Terminology

- `Standard`: Default first-party API pricing represented by the current shared catalog; excludes Fast, Batch, Flex, regional/inference-geography, partner, negotiated, subscription, and credit-specific charging.
- `Runtime catalog`: Dynamic Codex App Server or Claude SDK model availability/capabilities. It is distinct from the shared static AutoByteus model/pricing catalog.
- `Direct catalog`: AutoByteus's static provider model list and construction path based on `supportedModelDefinitions`.
- `Exact identity`: Provider plus exact model identifier/value/canonical identity; no fuzzy family alias for pricing resolution.

## Design Reading Order

Current/evidence → behavior map → data/state/removal decisions → execution spines and ownership → concrete file mapping → sequence, tradeoffs, risks, and implementation guidance.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete in-scope item: private identifier `createOpenAIGpt56Pricing` and its hardcoded effective date.
- Required clean cut: replace it with one file-local OpenAI long-context pricing constructor whose arguments include input, output, and effective date; update all GPT-5.6 callers and use it for Astra; delete the old name rather than keep an alias/wrapper.
- No model definition is removed. Existing Fable 5 is current supported behavior, not legacy.
- Do not add compatibility aliases such as `gpt-6`, `astra`, `claude-fable-5.1`, or Fable 5.1-to-Fable 5 mapping.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Existing token-usage run records and analytics store observation-time provider/model identity, pricing policy/snapshot, component costs, and status under `autobyteus-server-ts/src/token-usage`; arbitrary existing volume.
- Relevant code-model, serialization, semantic, or physical-store change: None. Only future catalog resolution gains two known rows.
- Normal reader/writer behavior and representative evidence: The usage accumulator resolves and writes a snapshot at observation time; projections/GraphQL/events/frontend read that captured state. `autobyteus-server-ts/docs/modules/token_usage.md` explicitly treats captured estimates as observation-time facts.
- Required semantics and invariants under direct use: Existing rows retain exact token counts, price/cost values, policy keys, and missing states. Only observations processed after the new catalog is loaded can resolve the new models.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: No schema/index/storage change; no rewrite, downtime, backup, or rebuild is justified.
- Decision: `Not Affected`
- Decision rationale: The catalog is read for new enrichment only. Migrating or recalculating stored rows would violate REQ-007 and create I/O and audit risk without an approved benefit.
- Acceptance criteria or design constraints supported: REQ-006, REQ-007, REQ-010 / AC-006, AC-007, AC-010.

### Migration Plan

N/A — decision is `Not Affected`; no migration file, startup task, dual read/write, or historical decoder is permitted.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003 | User selects runtime-advertised Astra | Enriched Astra usage/cost snapshot is accepted by existing projections | Codex run/usage lifecycle, then server token-usage accounting at its boundary | Proves the reported missing-price path uses exact catalog data without runtime changes |
| DS-002 | Primary End-to-End | BEH-002, BEH-003 | User selects runtime-advertised Fable 5.1 | Enriched cache-aware Fable usage/cost snapshot is accepted by existing projections | Claude run/usage lifecycle, then server token-usage accounting at its boundary | Proves conditional dynamic availability and exact price support remain separate concerns |
| DS-003 | Primary End-to-End | BEH-003 | Direct model catalog enumeration or exact model construction | Existing OpenAI/Anthropic adapter receives exact value and produces provider-valid request shape | `LLMFactory` and provider adapter boundary | Shared rows also affect direct model consumers and must be safe without paid requests |
| DS-004 | Return-Event | BEH-001–BEH-003 | Price policy and component usage are available | Persisted run/analytics snapshot and current Token Meter/Statistics presentation | Token-usage accumulator/projection capability | Confirms no new transport or UI owner is needed |

## Primary Execution Spine(s)

- `DS-001`: Existing Codex model selector → Codex App Server `model/list` identity → Codex run → `codex-thread-token-usage` exact observation → `TokenPriceConfigProvider` → `LLMFactory`/`supportedModelDefinitions` Astra row → `TokenCostCalculator` tier selection → existing usage accumulator.
- `DS-002`: Existing Claude selector → Claude SDK descriptor identity → Claude run → `claude-session-token-usage` exact observation → `TokenPriceConfigProvider` → `LLMFactory`/`supportedModelDefinitions` Fable 5.1 row → `TokenCostCalculator` component calculation → existing usage accumulator.
- `DS-003`: Existing AutoByteus provider catalog/GraphQL consumer → `LLMFactory` static model → exact model construction → existing `OpenAILLM`/`AnthropicLLM` request builder → provider-shaped request (mocked for validation).

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Codex continues to supply Astra's exact identity and capabilities. Usage accounting resolves the new static row; the calculator selects Standard through 272K inclusive and long-context above it. | Codex runtime catalog, Codex run, usage observation, price policy, cost snapshot | Runtime owns availability; token-usage capability owns enrichment | First-party provenance, tier boundary tests, variant exclusion |
| DS-002 | Claude continues to supply whatever the installed/account runtime exposes. Exact Fable 5.1 usage resolves its own row rather than inheriting Fable 5 pricing, including the lower cache-read rate. | Claude runtime catalog, Claude run, usage observation, price policy, cost snapshot | Runtime owns availability; token-usage capability owns enrichment | Direct request sanitization, cache-dimension tests |
| DS-003 | Static catalog consumers enumerate each new exact row once and can construct the existing generic provider adapter. Mocked request tests prove the shared-catalog side effect is valid. | `LLMFactory`, model definition, provider adapter, request payload | `autobyteus-ts` LLM catalog/factory | Direct schema fidelity, no live API call |
| DS-004 | Enriched payloads are folded and exposed using the current immutable snapshot and projection path; the UI naturally changes from missing to estimated for future matching observations. | Enriched usage, run record, analytics/projection, UI consumer | Server token-usage capability | Observation-time immutability, existing display formatting |

## Spine Actors / Main-Line Nodes

- Dynamic runtime catalogs: own selectable exact IDs and runtime-specific capabilities.
- Codex/Claude run adapters: own provider execution and exact usage identity emission.
- `TokenPriceConfigProvider`: owns conversion from exact catalog pricing to server pricing policy.
- `LLMFactory` + `supportedModelDefinitions`: own trusted built-in model identity, metadata, configuration, and prices.
- `TokenCostCalculator`: owns tier selection and component cost math.
- Token-usage accumulator/projections: own observation-time snapshots and existing consumer output.
- Direct provider adapters: own provider-valid request construction for shared static model entries.

## Ownership Map

`LLMFactory` is the authoritative public catalog/pricing boundary; `supportedModelDefinitions.ts` remains its internal built-in data source. Runtime catalogs do not consult or mutate that data to decide availability. `TokenPriceConfigProvider` depends on the public factory price lookup, not the definition array directly. `TokenCostCalculator` receives an already-resolved policy and must not know model names. Provider adapters receive a constructed model/config and must not own price policy. Frontend consumers render server summaries and must not add model-price tables.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `LLMFactory.getModelPricingInfo` | Shared LLM model/pricing catalog | Stable exact price lookup for server consumers | Runtime availability, billing mode inference, historical repricing |
| `TokenPriceConfigProvider.resolvePolicy` | Server token-pricing capability | Converts catalog response into server pricing policy/snapshot shape | Model aliases or provider capability discovery |
| Provider model catalog GraphQL/service path | Runtime-specific catalog or shared static catalog, selected by runtime kind | Existing settings/model selection transport | A second hardcoded target-model list |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `createOpenAIGpt56Pricing` private name and hardcoded date | Astra shares the same mechanics; retaining model-family naming or copying code would drift | Generalized file-local OpenAI long-context constructor in `supported-model-definitions.ts` with explicit effective date | In This Change | Update GPT-5.6 callers; retain identical effective date and values |
| Any proposed alias/fuzzy target lookup | Exact runtime IDs are proven and current lookup intentionally fails closed | Exact `name`/`value`/`canonicalName` rows | In This Change | Do not add in the first place; tests should prove misspellings stay missing |
| Separate frontend/runtime price table proposal | Existing shared policy and UI projection already own the behavior | Current `LLMFactory` → pricing provider → projection path | In This Change | No frontend production file should change |

## Return Or Event Spine(s) (If Applicable)

`DS-004`: enriched usage payload → current run-record accumulator → observation-time price/cost snapshot → current analytics contribution/aggregate → existing GraphQL/event projection → existing frontend stores → Token Meter/Token Statistics. The only observable delta is that future exact target observations carry `trusted`/`estimated` data instead of `price_missing`.

## Bounded Local / Internal Spines (If Applicable)

N/A. No event loop, state machine, queue, callback cycle, or lifecycle owner changes. Tier selection is an existing pure calculation and is covered as a boundary case, not redesigned as a new spine.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Static metadata provenance | DS-001–DS-003 | Shared LLM catalog | Record first-party URL and verification date | Makes limits/model identity auditable | Runtime discovery could be incorrectly frozen to static data |
| Direct reasoning schema | DS-003 | Shared LLM catalog/direct OpenAI construction | Expose only official direct Astra effort values | Shared row is visible to direct consumers | Codex-only `ultra` could leak into direct API configuration |
| Anthropic request sanitization regression | DS-002, DS-003 | Anthropic adapter | Prove existing Fable-family policy covers 5.1 | Prevent shared row from enabling invalid requests | Catalog file would start owning provider request rules |
| Deterministic price/tier tests | DS-001, DS-002, DS-004 | Catalog and token pricing owners | Prove all trusted dimensions and boundary math | Replaces costly live validation | Tests could accidentally require network/provider keys |
| Durable documentation | All | Future maintainers/operators | Record exact IDs, prices, limits, dates, exclusions, prospective semantics | Pricing changes over time | Documentation could become an alternate executable source |

## Ownership Boundaries

- Dynamic Codex/Claude catalogs are authoritative for selectable runtime models and capabilities; the static catalog must not filter or override them.
- `autobyteus-ts` owns exact built-in model metadata/pricing and direct adapter selection.
- Server token usage owns price-policy conversion, tier selection, cost enrichment, persistence, and projections; it consumes the shared factory boundary rather than duplicating definitions.
- Provider adapters own request-shape validity; this change verifies and reuses them rather than moving their policy into model definitions.
- Frontend code owns presentation only and remains unchanged.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `LLMFactory` catalog/pricing API | `supportedModelDefinitions`, exact matcher, pricing DTO projection | Server pricing and direct/static catalog consumers | Server/frontend imports definition rows and reimplements lookup | Return to design; do not add a duplicate table |
| `TokenPriceConfigProvider` | Factory lookup and server policy projection | Usage enrichment/calculator | Calculator switches on model identifier | Extend policy representation only with approved contract changes |
| Runtime-specific catalog | App Server `model/list` or Claude SDK descriptors and normalizers | Runtime selection/settings paths | Static shared row asserts runtime availability or capability | Keep runtime response authoritative |
| OpenAI/Anthropic adapter | Provider request mapping/sanitization | `LLMFactory.createLLM` callers | Model-definition-specific request mutation outside adapter | Correct adapter under a Design Impact if evidence requires it |

## Dependency Rules

1. Runtime catalog/usage code may emit exact identities but must not depend on static prices to determine availability.
2. Server pricing depends on `LLMFactory.getModelPricingInfo`, never directly on `supportedModelDefinitions` or frontend constants.
3. `TokenCostCalculator` remains model-agnostic and selects generic policy tiers from `accounting_input_tokens`.
4. Static model definitions may select an existing adapter and declare config schema, but may not encode runtime-only Codex capabilities or implement request sanitization.
5. Tests may import internal owners appropriate to their layer; production code may not gain test-only flags or network calls.
6. Documentation describes the code-owned source; it does not become another loaded price source.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `LLMFactory.getModelPricingInfo(input)` | Built-in model pricing | Resolve trusted/missing pricing | Exact provider plus identifier/value/canonical name | No fuzzy matching |
| `TokenPriceConfigProvider.resolvePolicy(payload)` | Observation pricing policy | Project catalog data and observation-time schedule into server policy | Runtime kind, provider, exact model identity, observed time | No mode guess from model name |
| `TokenCostCalculator.enrichCost(payload, policy)` | Cost enrichment | Select input-size tier and compute trusted component costs | Generic usage counts + resolved policy | Model-independent |
| `LLMFactory.listModelsByProvider/createLLM` | Direct static catalog/model | Enumerate or construct exact model | Exact catalog model identifier | New rows intentionally appear here |
| Codex `model/list` / Claude `listModels` | Runtime availability | Return runtime-owned model descriptors | Runtime-provided exact identifier | Unchanged |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Factory price lookup | Yes | Yes | Low | Preserve exact provider/model matching |
| Server policy resolution | Yes | Yes | Low | Preserve Standard-only catalog basis |
| Cost enrichment | Yes | Yes | Low | Keep model identity out of price math |
| Runtime catalog listing | Yes | Yes | Low | Do not mix static direct catalog data into dynamic runtime result |
| Provider adapter construction | Yes | Yes | Low | Cover exact new model values with mocked tests |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Static model definitions | `supportedModelDefinitions` | Yes | Low | Keep existing owner |
| OpenAI tier constructor | Proposed `createOpenAILongContextPricing` | Yes | Low | Include explicit effective-date parameter; remove GPT-5.6-only name |
| Price boundary | `TokenPriceConfigProvider` | Yes | Low | No change |
| Cost boundary | `TokenCostCalculator` | Yes | Low | No change |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Exact model metadata/pricing | `autobyteus-ts` LLM catalog | Extend | It is already the single executable built-in owner | N/A |
| Astra tier pricing | Existing OpenAI long-context pricing logic | Extend | Same documented proportions and boundary | N/A |
| Fable request validity | Anthropic adapter family policy | Reuse | Prefix match already covers 5.1 | N/A |
| Server pricing/cost | Token-usage pricing capability | Reuse | Generic exact lookup and tier dimensions already fit | N/A |
| UI display | Existing token usage projections/components | Reuse | Trusted summary automatically replaces missing status | N/A |
| Validation | Existing Vitest suites | Extend | Non-network seams already exist | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared LLM catalog (`autobyteus-ts`) | Exact rows, metadata, pricing, direct schema/adapter selection | DS-001–DS-003 | `LLMFactory` | Extend | Only production source delta |
| Provider request adapters (`autobyteus-ts`) | Existing OpenAI/Anthropic request validity | DS-003 | Provider adapter classes | Reuse | Tests change; production adapters do not |
| Server token-usage pricing | Policy projection, tiers, costs | DS-001, DS-002, DS-004 | Provider + calculator | Reuse | Tests change; production server does not |
| Model-catalog transport | Existing static/dynamic model listing | DS-001–DS-003 | Runtime/catalog services | Reuse | E2E assertion only |
| Documentation | Durable catalog and accounting explanation | All | Existing doc owners | Extend | No new doc hierarchy |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Shared LLM catalog | Built-in definition owner | Add both rows, Astra schema, generalized pricing constructor | Existing canonical data/policy assembly point | Yes — current config, schema, metadata types |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Shared LLM catalog tests | Definition contract | Exact identity, metadata, prices, tier/provenance, no aliases, preserved rows | Existing static catalog contract suite | Yes |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Shared LLM catalog tests | Factory boundary | Listing/config schema/direct construction | Existing factory integration suite | Yes |
| `autobyteus-ts/tests/unit/llm/api/provider-native-request-payloads.test.ts` | Provider adapter tests | OpenAI adapter boundary | Exact Astra Responses request and supported effort mapping | Existing captured-request seam | Yes |
| `autobyteus-ts/tests/unit/llm/api/anthropic-llm.test.ts` | Provider adapter tests | Anthropic adapter boundary | Fable 5.1 default and invalid override sanitization | Existing captured-request seam | Yes |
| `autobyteus-server-ts/tests/unit/token-usage/pricing/token-price-config-provider.test.ts` | Server pricing tests | Price-policy boundary | Exact trusted prices/cache dimensions and unknown preservation | Existing synthetic resolver suite | Yes |
| `autobyteus-server-ts/tests/unit/token-usage/pricing/token-cost-calculator.test.ts` | Server pricing tests | Calculator boundary | Astra 272,000/272,001 tier selection and component cost | Existing pure synthetic calculator suite | Yes |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-model-list.e2e.test.ts` | Model-catalog transport test | Existing GraphQL catalog | Each new exact static entry appears once with limits | Existing non-network GraphQL seam | Yes |
| Existing model/provider docs | Documentation | Existing doc owners | IDs, limits, pricing, provenance, variant/no-paid-test notes | Current durable catalog documentation | Yes |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Documentation | Token-usage contract | Prospective-only resolution and Standard-estimate boundary | Existing accounting semantics owner | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| OpenAI 272K two-tier price construction | Keep file-local in `supported-model-definitions.ts` as `createOpenAILongContextPricing` | Shared LLM catalog | GPT-5.6 and Astra share exact tier mechanics | Yes — one explicit effective-date input replaces hardcode | Yes — no duplicated Astra tier builder | A generic cross-provider pricing framework or exported public API |
| Reasoning schema construction | Existing `createOpenAIReasoningSchema` | Shared LLM catalog | Direct Astra needs a different enum but identical shape | Yes | Yes | Runtime Codex capability source |
| Anthropic current-family request policy | Existing `resolveAnthropicModelRequestPolicy` prefix matching | Anthropic adapter | Fable 5.1 already shares provider constraints | Yes | Yes | Static availability or pricing registry |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `SupportedModelDefinition` | Yes | Yes | Low | Use exact name/value/canonical identity; do not introduce aliases |
| `TokenPricingConfig` tiers | Yes | Yes | Low | Encode both complete Astra tiers through current fields |
| Generalized OpenAI long-context constructor | Yes | Yes | Low | Keep private and require effective date |
| Astra direct reasoning schema | Yes | Yes | Low | Exclude Codex-only `ultra`; dynamic runtime remains separate |
| Fable 5.1 config schema | N/A — intentionally absent | Yes | Low | Let provider default own always-on thinking; adapter still sanitizes invalid kwargs |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Shared LLM catalog | `LLMFactory` internal definitions | Exact Astra/Fable 5.1 definitions and local helper cleanup | Single existing executable source of truth | Yes |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Shared LLM catalog tests | Definition contract | Complete exact catalog assertions and preservation | Same test owner | Yes |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Shared LLM catalog tests | Factory contract | Static enumeration, schemas, construction | Same boundary | Yes |
| `autobyteus-ts/tests/unit/llm/api/provider-native-request-payloads.test.ts` | Adapter tests | OpenAI request boundary | Astra Responses payload | Same provider-native captured seam | Yes |
| `autobyteus-ts/tests/unit/llm/api/anthropic-llm.test.ts` | Adapter tests | Anthropic request boundary | Fable 5.1 always-on-safe sanitization | Same provider captured seam | Yes |
| `autobyteus-server-ts/tests/unit/token-usage/pricing/token-price-config-provider.test.ts` | Server pricing tests | Price-policy boundary | Both exact trusted policies | Same resolver suite | Yes |
| `autobyteus-server-ts/tests/unit/token-usage/pricing/token-cost-calculator.test.ts` | Server pricing tests | Calculator boundary | Exact Astra tier boundary and cost | Same pure calculator suite | Yes |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-model-list.e2e.test.ts` | Model catalog transport tests | Existing GraphQL API | Static model-list presence/limits | Same public non-network catalog seam | Yes |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Catalog docs | Static/dynamic catalog documentation | Add exact entries and authority distinction | Existing primary catalog doc | Yes |
| `autobyteus-ts/docs/llm_module_design.md` | LLM docs | Language-neutral design doc | Current supported identities/pricing note | Existing design doc | Yes |
| `autobyteus-ts/docs/llm_module_design_nodejs.md` | LLM docs | Node implementation doc | Node catalog/request specifics | Existing implementation doc | Yes |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Token-usage docs | Accounting contract | Standard-only/prospective exact resolution | Existing server semantics doc | Yes |

## Applied Patterns (If Any)

- **Centralized exact catalog:** one definition row is consumed by factory, pricing, and static model-list projections.
- **Fail closed:** unknown/variant identities remain missing rather than inheriting a nearby family price.
- **Runtime capability authority:** dynamic Codex/Claude discovery stays separate from static price/metadata support.
- **Observation-time snapshot:** new code affects future enrichment only; stored history remains authoritative.
- **Mocked provider boundary:** request compatibility is proven by captured payloads, not paid inference.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | File | Shared LLM catalog | Production delta described above | Existing canonical owner; compact file-local reuse is clearer than a new subsystem | Dynamic runtime availability, UI logic, server persistence |
| `autobyteus-ts/tests/{unit,integration}/llm/**` | Folder | Shared catalog/provider validation | Static/factory/request regressions | Existing layer-specific suites | Paid/network target calls |
| `autobyteus-server-ts/tests/{unit,e2e}/token-usage/**` | Folder | Server pricing/public catalog validation | Policy/tier/public list regressions | Existing server seams | New production pricing tables |
| `autobyteus-ts/docs/**` | Folder | Shared LLM documentation | Exact model/catalog/direct adapter facts | Existing documentation owner | Alternative executable pricing data |
| `autobyteus-server-ts/docs/modules/token_usage.md` | File | Token-usage documentation | Prospective snapshot behavior and pricing basis | Existing accounting contract | Provider capability ownership |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm` | Main-Line Domain-Control / Off-Spine catalog data | Yes | Low | Existing model/factory/provider ownership is established; no new folder needed for two rows |
| `autobyteus-server-ts/src/token-usage/pricing` | Main-Line Domain-Control | Yes | Low | Read-only in production; focused tests prove reuse |
| `autobyteus-ts/tests` | Mixed justified by test layer | Yes | Low | Unit adapter and integration factory seams remain separated |
| `autobyteus-server-ts/tests` | Mixed justified by test layer | Yes | Low | Pure pricing tests and public GraphQL catalog test remain distinct |
| Existing docs folders | Off-Spine Concern | Yes | Low | Each doc retains its current audience/owner |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Exact identity | `{ provider: OPENAI, name/value/canonicalName: 'gpt-6-astra' }` | Aliases `gpt-6`, `astra`, or prefix price fallback | Preserves fail-closed pricing |
| Astra tier boundary | `maxInputTokens: 272_000` then unbounded tier; test 272,000 and 272,001 | `>= 272_000` long-context switch or output-only multiplier | Official contract is above 272K for the full request |
| Runtime versus direct schema | Direct Astra enum ends at `max`; Codex uses live App Server enum including `ultra` | Static row overwrites Codex runtime schema | Two authorities serve different execution paths |
| Fable thinking | No static toggle; default request omits `thinking`; adapter strips invalid manual fixed/disabled shapes | UI offers disable/fixed budget for an always-on model | Prevents misleading configuration and provider errors |
| Price variants | Encode Standard only and document exclusions | Infer Fast because Codex metadata says `priority` is available | Usage identity does not prove which billable price variant applies |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `createOpenAIGpt56Pricing` and wrap/alias it for Astra | Avoid touching existing callers | Rejected | Rename once, add explicit effective-date argument, update all callers |
| Map `claude-fable-5-1` to Fable 5 | Similar family and existing row | Rejected | Exact new row with Fable 5.1's distinct $0.25 cache-read price |
| Prefix/fuzzy price matching | Future suffixes may appear | Rejected | Exact provider/model catalog rows; unknowns stay missing |
| Reprice historical missing observations | Could make old UI totals appear complete | Rejected | Prospective observation-time snapshots only |
| Add frontend price constants/fallback | Could hide the current symptom | Rejected | Fix the shared server-consumed catalog owner |
| Add Fast/Batch/Flex/regional fallbacks | Provider variants are documented | Rejected | Standard only until a separately approved variant identity contract exists |

## Derived Layering (If Useful)

`Dynamic runtime identity → usage adapter → server pricing boundary → shared static catalog → generic cost calculator → observation-time persistence/projection → existing UI`. Direct catalog consumers use `LLMFactory → existing provider adapter`; they do not pass through runtime discovery. These two entry paths intentionally meet at shared exact definitions but retain separate capability ownership.

## Change / Refactor Sequence

1. In `supported-model-definitions.ts`, rename/generalize the long-context OpenAI price constructor and update GPT-5.6 callers without changing outputs.
2. Add the direct Astra schema and exact Astra definition; add the exact Fable 5.1 definition without a manual thinking config schema. Keep ordering near the corresponding model families.
3. Add shared-library static/factory/request tests, including exact metadata/provenance, no aliases, direct Astra payload, and Fable 5.1 sanitization.
4. Add server synthetic policy assertions for both models and an Astra 272,000/272,001 full-request tier/cost test. Extend the existing non-network GraphQL model-list test for exact static entries.
5. Update the existing catalog/LLM/token-usage docs with IDs, limits, all supported Standard dimensions, provenance dates, variant exclusions, prospective semantics, and no-paid-inference validation decision.
6. Run focused tests, then affected package typechecks/builds and diff/search review. Do not supply real target-provider keys or execute billable inference.
7. If validation reveals an adapter or contract change is required, stop and return a `Design Impact`; do not silently expand production scope.

No temporary dual path is required. The helper rename and new rows can land atomically.

## Key Tradeoffs

- One static row makes each model visible to direct AutoByteus consumers as well as token pricing. This is accepted because the existing adapters are compatible and tests cover the side effect; creating a hidden price-only table would duplicate identity/pricing ownership.
- Fable 5.1 has no static thinking toggle. This sacrifices optional advanced controls in this package to keep always-on behavior honest and avoid exposing the excluded effort beta.
- Standard-only prices may differ from a user's subscription or runtime mode. Honest documented estimates are preferable to guessing a variant that the usage identity does not capture.
- Focused deterministic tests do not prove provider availability for every account, but they prove the repository-owned defect without incurring the explicitly rejected cost of live inference.

## Risks

- Provider prices/specifications may change after 2026-09-22. Mitigation: exact first-party URLs, dates, and targeted assertions make later maintenance auditable.
- A test might accidentally conflate Codex runtime `ultra` with direct OpenAI effort support. Mitigation: separate dynamic normalizer expectations from the static direct Astra schema.
- Fable family prefix behavior could regress. Mitigation: add `claude-fable-5-1` to the current adaptive-model request matrix and explicitly test invalid manual thinking/sampling removal.
- Astra tier tests could verify policy data but not actual selection. Mitigation: exercise `TokenCostCalculator.enrichCost` on both sides of the boundary and assert selected tier plus calculated component prices/cost.
- Adjacent Sonnet 5 price remains stale. It is explicitly out of scope and should be raised as a separate package rather than bundled into this approved change.

## Guidance For Implementation

- Use numeric USD-per-million values exactly as approved: Astra base `10/1/12.5/50`, long-context `20/2/25/75`; Fable 5.1 `10/50/0.25/12.5/20` for input/output/cache-read/5m-write/1h-write.
- Set Astra static metadata to context `1_050_000`, max input `null`, max output `128_000`, source `https://developers.openai.com/api/docs/models/gpt-6-astra`, verified `2026-09-22`. Use `2026-09-22` as this catalog entry's price effective/verification baseline rather than inventing an earlier undocumented date.
- Set Fable 5.1 metadata to context/input `1_000_000`, output `128_000`, source `https://platform.claude.com/docs/en/models/fable-5-1/overview`, verified `2026-09-22`; use official release/pricing effective date `2026-09-01`.
- Preserve GPT-5.6 price effective date `2026-07-30` and all existing values after helper generalization.
- Astra direct schema: `reasoning_effort` values `low`, `medium`, `high`, `xhigh`, `max`, default `medium`; retain current reasoning-summary behavior. Do not add `none` or Codex-only `ultra` unless new first-party direct API evidence causes a Design Impact.
- Fable 5.1 definition: omit `configSchema`; do not copy the Fable 5 toggle. The adapter's current family-prefix policy should remain production-unchanged.
- Assert Fable 5 keeps its existing `$1` cache-read rate and GPT-5.6 rows remain unchanged.
- Assert wrong/alias IDs remain `model_not_found`/missing.
- Validation must be credential-free for the target models. Captured client stubs/mocks and synthetic token payloads are required; no Astra/Fable 5.1 generation call.
- Suggested focused commands from repository root (implementation owner may adjust to the package's current runner syntax):
  - `pnpm -C autobyteus-ts exec vitest run tests/unit/llm/supported-model-definitions.test.ts tests/integration/llm/llm-factory-metadata-resolution.test.ts tests/unit/llm/api/provider-native-request-payloads.test.ts tests/unit/llm/api/anthropic-llm.test.ts`
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/token-usage/pricing/token-price-config-provider.test.ts tests/unit/token-usage/pricing/token-cost-calculator.test.ts tests/e2e/token-usage/token-usage-model-list.e2e.test.ts`
  - Affected package typecheck/build per repository practice.
- Validation reporting must state explicitly that no paid Astra or Fable 5.1 inference was run and distinguish successful deterministic coverage from untested account-specific availability.
