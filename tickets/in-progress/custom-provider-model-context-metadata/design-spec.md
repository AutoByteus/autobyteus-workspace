# Design Spec

## Current-State Read

Status: `Design-ready after ARCH-REV-001 rework and aligned to origin/personal d5618bffd; the user-approved policy is unchanged and the package is ready for architecture re-review.`

The configured Alibaba Token Plan endpoint returns model identifiers and usage but no maximum context/input/output fields. `OpenAICompatibleEndpointDiscovery` normalizes only identifiers, and `OpenAICompatibleEndpointModel` therefore constructs a shared `LLMModel` with all capacity fields null. `resolveTokenBudget` already consumes an active override, model active context, maximum context, and maximum input; when all are absent it cannot produce the model-derived budget needed by automatic compaction.

The refreshed codebase materially changed one earlier finding. Built-in `SupportedModelDefinition` rows now own source-attributed `staticMetadata`, and `ModelMetadataProvisioningService` uses existing `ModelInfo` numeric values as static fallback. Server enrichment therefore already preserves non-null model fields. The target must populate custom models before registry/runtime use and preserve the current server behavior rather than redesigning it.

A model string is not a sufficient source identity. The observed Token Plan endpoint includes `qwen3.7-max`, and the supplied Alibaba catalog includes the wire ID `deepseek-v4-flash-0731`, while the built-in DeepSeek definition uses `deepseek-v4-flash`. The design must match endpoint plan plus exact returned wire ID; an endpoint profile may explicitly reference a different canonical built-in value when vendor evidence establishes equivalence, and plan-specific metadata overrides that reference.

## Intended Change

1. Extend the existing `/models` normalizer to retain a strict allowlist of optional top-level numeric limit aliases.
2. Add a pure custom-endpoint metadata resolver which matches an exact canonical `(protocol, hostname, port, basePath)` tuple plus exact provider-wire model value for authoritative profiles.
3. Let an endpoint profile either reference an exact `{ provider, value }` built-in definition's `staticMetadata`—the referenced value may differ from the endpoint's returned wire ID—or own source-attributed plan-specific values. Explicit plan values override references. No automatic suffix/date alias transformation is permitted.
4. When no endpoint/profile value exists, consult the existing built-in definitions by exact model identity only and mark the result as inferred. If no exact definition exists, resolve to `null`.
5. Resolve each field in order: endpoint-advertised value, endpoint-plan profile/reference, exact built-in identity fallback marked inferred, unknown.
6. Construct `OpenAICompatibleEndpointModel` with numeric limits and the existing `ResolvedModelMetadata` per-field source shape before registry/runtime use.
7. Preserve resolved source information through `ModelInfo` just far enough for server catalog enrichment to retain truthful `LIVE` versus `CURATED_*` projection while continuing to prefer server live provider metadata for built-in models.
8. Reuse the current token-budget/compaction spine unchanged and add an explicit frontend unknown-capacity state.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Current Production Path | Current Outcome | Target Production Path / Outcome | Spine IDs |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | REQ-001, REQ-005; AC-001, AC-002 | Saved provider -> secret resolution -> `/models` -> identifier-only rows -> custom models | Models run, optional metadata is discarded | Same path returns normalized rows with optional live per-field metadata; invalid optional fields remain non-fatal | DS-001, DS-004 |
| BEH-002 | System/Contract | REQ-002, REQ-003, REQ-006; AC-003, AC-004 | Built-in definition metadata and custom models are separate; custom rows have no static/profile lookup | Exact known custom models remain unknown; server preserves only what it receives | Resolver applies endpoint/profile value or reference, then exact built-in metadata as inferred fallback when higher-precedence data is absent; server catalog preserves the resolved fields/source | DS-001, DS-002, DS-004 |
| BEH-003 | System | REQ-004; AC-009, AC-010 | `createLLM` -> `resolveTokenBudget` -> compaction evaluation | Null capacity can yield no model-derived compaction budget | Known custom capacity produces the normal budget/threshold; unknown remains null unless the existing explicit override is used | DS-001, DS-003 |
| BEH-004 | Contract | REQ-002, REQ-003, REQ-005; AC-004, AC-007, AC-010 | Alibaba `/models` and completion usage provide no maximum | No generic network source exists | Pure exact profile resolves verified facts, exact built-in identity may provide inferred fallback, and unmatched models remain unknown; no extra network request or name-family inference | DS-001, DS-004 |
| BEH-005 | User | REQ-007; AC-005, AC-006 | Null denominator hides the context meter section | Missing capacity is silent | Latest prompt remains visible with “context limit unavailable”; known progress display is unchanged | DS-003 |

## Relevant Supplemental Task Artifacts

None. The canonical requirements and sanitized investigation notes contain all relevant intended behavior and evidence.

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix / Behavior Change`
- Root cause classification: `Boundary Or Ownership Issue` plus `Missing Invariant`
- Refactor needed now: `No broad refactor; targeted boundary extension only`
- Evidence: Current discovery, custom model construction, supported definitions, registry, runtime budget, server catalog, and UI each have clear owners. The missing owner is compound endpoint/model metadata resolution between external normalization and custom model construction.
- Design response: Add one pure resolver under the existing LLM metadata capability, extend the existing normalized row and model mapping, minimally preserve per-field source through catalog projection, and reuse the existing runtime/compaction path.
- Why no broad refactor: The refreshed built-in metadata and server merge architecture already has field-level live/static/unknown semantics. Replacing it would duplicate policy and raise regression risk.
- Deferred residual risk: Arbitrary endpoints with no advertised fields, approved profile, or exact built-in identity remain unknown; an exact built-in fallback can be wrong for a plan variant and is therefore explicitly inferred and subordinate to endpoint/profile facts; vendor profile facts can become stale.

## Terminology

- **Endpoint-advertised metadata:** Recognized fields present in the authenticated `/models` object; source kind `live`.
- **Endpoint profile:** Versioned source-attributed rules keyed by an exact canonical endpoint tuple and exact provider-wire model value.
- **Built-in reference:** A profile entry which references an exact `SupportedModelDefinition` by `{ provider, value }` and reuses its `staticMetadata` instead of copying the same fact.
- **Plan-specific value:** Static profile metadata owned by the endpoint profile because that serving plan differs from or lacks a built-in definition.
- **Compound identity:** Exact endpoint tuple `(protocol, hostname, port, basePath)` plus exact provider-wire model value for authoritative profile facts.
- **Exact built-in fallback:** A separate index keyed only by `SupportedModelDefinition.value`, used only after endpoint/profile sources are absent; it is explicitly inferred, not provider-confirmed. If exact definitions conflict, use the lowest valid value per field for conservative compaction and carry that selected candidate's source URL/date.

## Implementation Contracts Required Before Coding

### Source-bearing per-field contract

The existing `ResolvedMetadataField` shape is extended into one discriminated source union; implementation must not collapse the sources into a boolean or an untyped provenance string:

```ts
type ResolvedMetadataSource =
  | { kind: 'live' }
  | {
      kind: 'endpoint_profile';
      profileId: string;
      provenance: StaticModelMetadataProvenance;
      reference?: { provider: LLMProvider; value: string };
    }
  | {
      kind: 'inferred_builtin';
      provider: LLMProvider;
      value: string;
      provenance: StaticModelMetadataProvenance;
    }
  | { kind: 'static_definition'; provenance: StaticModelMetadataProvenance }
  | { kind: 'unknown' };

type ResolvedMetadataField<T> = {
  value: T | null;
  source: ResolvedMetadataSource;
};
```

`live` means the value was accepted from the current endpoint/provider response. `endpoint_profile` means a matched, source-dated profile fact or a valid value from its exact `{provider, value}` reference. `inferred_builtin` means the separate exact-value fallback index supplied the value; it is never provider confirmation. `static_definition` remains the source for ordinary built-in model resolution. `unknown` has a null value and no provenance. Every non-unknown static/profile/inferred field carries the source URL and verification date that supplied that field; when a conservative duplicate merge selects a field, the selected candidate's provenance travels with it.

`LLMModel.toModelInfo()` must copy `resolvedModelMetadata` into a non-secret internal `resolved_model_metadata` field. `ModelMetadataProvisioningService` must merge per field as follows: preserve an existing custom `live`, `endpoint_profile`, or `inferred_builtin` field with a valid value; otherwise use the existing provider resolver result, so built-in provider live metadata still overrides built-in static values. The service returns the merged non-secret resolution on `EnrichedModelInfo`. It derives the unchanged coarse GraphQL value without exposing the new source union: any `live` field yields `LIVE`; otherwise an `endpoint_profile` or `inferred_builtin` value yields `CURATED_FALLBACK`; otherwise the existing provider fallback/static-only mapping yields `CURATED_FALLBACK` or `CURATED_ONLY` as currently appropriate. No source is labeled `LIVE` merely because it came from a profile or inferred built-in definition.

### Exact built-in fallback index and profile reference

The fallback index is constructed once from `SUPPORTED_MODEL_DEFINITIONS` (or the existing exported definition list) as:

```ts
type BuiltInFallbackCandidate = {
  provider: LLMProvider;
  value: string; // exact SupportedModelDefinition.value
  staticMetadata: StaticModelMetadata;
};
type BuiltInFallbackIndex = ReadonlyMap<string, readonly BuiltInFallbackCandidate[]>;
```

Only a non-empty `definition.value` is indexed. The map key is the exact provider-wire value after the existing discovery trim; do not use `name`, `canonicalName`, display labels, case folding, `models/` stripping/addition, provider-family aliases, substring matching, or nearest-model matching. All candidates with the same exact value are retained, including candidates from different built-in providers. A profile reference is always `{ provider, value }`; its `value` is the canonical built-in definition value and may differ from the profile's exact endpoint `modelValue`. Resolve it by exact provider plus exact `SupportedModelDefinition.value`, never through `resolveLookupKeys` or another generic multi-key lookup.

For each intrinsic numeric field independently, discard null/non-finite/non-integer/non-positive candidate values, choose the lowest remaining value, then choose provenance deterministically among ties by `(provider, sourceUrl, verifiedAt)` ascending. The resulting field source is `inferred_builtin` with the selected candidate's `{ provider, value, sourceUrl, verifiedAt }`. If every candidate is invalid/missing for a field, that field remains `unknown` and can still fall through independently from other fields. Profile explicit values beat profile references; any valid profile field beats the built-in fallback index. A profile reference is the only permitted bridge between different wire IDs, for example `modelValue: 'deepseek-v4-flash-0731'` with `reference: { provider: DEEPSEEK, value: 'deepseek-v4-flash' }`. If that exact profile is absent, the differing wire ID does not hit the fallback index and remains unknown.

### Advertised aliases, duplicate precedence, and invalid fall-through

Only top-level JSON object properties are read. The accepted aliases and precedence order are:

| Resolved field | Alias precedence, first valid value wins |
| --- | --- |
| `maxContextTokens` | `context_window`, `contextWindow`, `context_window_tokens`, `contextWindowTokens`, `max_context_tokens`, `maxContextTokens`, `context_length`, `contextLength`, `max_context_length`, `maxContextLength` |
| `maxInputTokens` | `max_input_tokens`, `maxInputTokens`, `input_token_limit`, `inputTokenLimit`, `max_prompt_tokens`, `maxPromptTokens`, `max_input_length`, `maxInputLength` |
| `maxOutputTokens` | `max_output_tokens`, `maxOutputTokens`, `output_token_limit`, `outputTokenLimit`, `max_completion_tokens`, `maxCompletionTokens`, `max_output_length`, `maxOutputLength` |

A valid value is only a JSON number that is finite, an integer, and greater than zero. Numeric strings, booleans, null, arrays, objects, nested `limits`/`capabilities` values, and ambiguous aliases such as generic `max_tokens` are ignored. An invalid earlier alias does not block a later valid alias. The model ID extractor retains its current `id` then `name` then `model` precedence. For duplicate rows with the same trimmed exact model ID, retain one row and merge each intrinsic field by first valid value in payload order; later duplicates may fill an absent/invalid field but never replace an earlier valid field. A field with no valid advertised value is a per-field miss and falls through to the matched profile, then exact built-in fallback, then unknown.

### Canonical endpoint identity and profile match

Profiles use an exact key:

```ts
type CanonicalEndpointIdentity = {
  protocol: 'http' | 'https';
  hostname: string;
  port: number | null;
  basePath: string;
};
type EndpointModelProfile = CanonicalEndpointIdentity & {
  profileId: string;
  modelValue: string; // exact returned provider wire ID

  provenance: StaticModelMetadataProvenance;
  explicit?: PartialResolvedModelMetadata;
  reference?: { provider: LLMProvider; value: string };
};
```

Canonicalization lowercases the protocol and hostname, removes one trailing hostname dot, normalizes default ports (`80` for HTTP and `443` for HTTPS) to `null`, preserves non-default numeric ports, resolves URL dot segments, ensures a leading path slash, and removes trailing path slashes (`/` becomes the empty base path). Query strings and fragments are excluded from the identity and never participate in profile matching; a plan distinguishable only by query is not profile-addressable and uses advertised/fallback resolution. Profiles have no wildcard or substring host matching. A match requires exact protocol, hostname, normalized port, base path, and exact `modelValue`; any near host, protocol, port, or path is a miss. Profile explicit values are validated with the same positive-integer normalizer; invalid/absent profile fields fall through to the profile reference, then the exact built-in fallback, independently per field.

## Legacy Removal Policy (Mandatory)

- Replace the identifier-only discovered-row shape with the metadata-bearing shape in the same discovery path; do not retain parallel DTOs.
- No compatibility wrapper, second custom model registry, unmarked global curated model-ID map, or undocumented metadata HTTP path is introduced. The resolver owns a separate exact fallback index keyed by `SupportedModelDefinition.value`; it must not reuse the current generic multi-key metadata lookup.
- The earlier proposed server null-overwrite fix is removed from this task because refreshed source already implements field preservation.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject: Version 2 custom-provider records in `/Users/normy/.autobyteus/server-data/llm/custom-llm-providers.json`; secrets remain in the separate vault.
- Relevant change: None. Metadata is derived during discovery/model construction and is not written to provider configuration.
- Normal reader/writer behavior: Existing records provide provider identity/name/type/base URL; runtime sync rebuilds discovered models.
- Decision: `Not Affected`
- Rationale: There is no stored metadata to transform. Migration would add stale-data and secret-handling risk without a correctness benefit.
- Required invariants: Preserve provider IDs, endpoint URLs, secret references, discovered model identifiers, and last-known-good behavior.

### Migration Plan (Only When Decision Is `Migration Required`)

`N/A — no persisted schema or data transformation.`

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behaviors | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001–BEH-004 | Saved custom provider + credential | Runtime `LLMModel` with known or null capacity | Custom endpoint sync/discovery/model owners | Supplies the model facts compaction consumes |
| DS-002 | Primary End-to-End | BEH-002 | Registry model | GraphQL `ModelDetail` | Model catalog/provisioning owner | Preserves numeric fields and truthful coarse provenance |
| DS-003 | Return/Event | BEH-003, BEH-005 | Runtime model + prompt usage | Compaction decision and token meter | Token-budget/LLM phase and token-usage projection | Proves the original blocker is removed without changing compaction policy |
| DS-004 | Bounded Local | BEH-001, BEH-002, BEH-004 | One `/models` candidate | One normalized resolved row | Endpoint discovery/profile resolver | Owns validation, identity matching, and precedence |

## Primary Execution Spine(s)

- DS-001: `Saved provider -> CustomLlmProviderRuntimeSyncService -> OpenAICompatibleEndpointDiscovery -> OpenAICompatibleEndpointModelMetadataResolver -> OpenAICompatibleEndpointModelProvider -> LLMFactory registry -> createLLM`
- DS-002: `LLMModel.toModelInfo -> AutobyteusModelCatalog -> ModelMetadataProvisioningService -> GraphQL ModelDetail -> settings/model consumers`

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Main Domain Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Server sync resolves the secret and receives normalized discovered rows. The custom model provider invokes the pure metadata resolver with endpoint identity, row metadata, and canonical definitions. The constructor receives one resolved shape and the registry exposes a normal shared model. | Provider record, discovered row, endpoint profile, resolved metadata, custom model, registry | Runtime sync for lifecycle; discovery for transport normalization; endpoint metadata resolver for source policy; custom model provider for construction sequencing | Secret handling, timeout, stale preservation |
| DS-002 | Catalog projection starts from already-resolved model values. Server live provider metadata may still win for built-ins; otherwise existing per-field sources/values survive. GraphQL maps the current coarse provenance vocabulary truthfully. | ModelInfo, resolved fields, enriched row, ModelDetail | ModelMetadataProvisioningService | Provider metadata timeouts and generated API types |
| DS-003 | LLM phase reads the custom model through existing `resolveTokenBudget`. A known limit yields the existing threshold and usage fields; null remains null. The frontend chooses known-progress or explicit-unknown presentation. | LLMModel, TokenBudget, compaction decision, usage event/summary, UI | Token-budget/LLM phase for runtime; token meter for presentation | Pricing and usage aggregation |
| DS-004 | A candidate's ID and optional limit aliases are normalized under the fixed allowlist. Endpoint profile matching uses the canonical protocol/host/port/base-path tuple, then exact model value. Valid endpoint values override profile/reference values per field; invalid/absent values fall through. | Raw candidate, normalized aliases, canonical identity, profile entry, fallback index, resolved row | OpenAICompatibleEndpointModelMetadataResolver | No network, no secret, no raw payload retention |

## Spine Actors / Main-Line Nodes

- `CustomLlmProviderRuntimeSyncService`: credential and reload/status lifecycle.
- `OpenAICompatibleEndpointDiscovery`: `/models` transport and external response normalization.
- `OpenAICompatibleEndpointModelMetadataResolver`: canonical endpoint identity, fixed alias normalization, exact profile/reference lookup, exact-value fallback index, source union, and per-field resolution.
- `OpenAICompatibleEndpointModelProvider`: fresh/stale construction sequencing.
- `OpenAICompatibleEndpointModel`: mapping into canonical `LLMModel` fields.
- `LLMFactory`: registry and runtime instance construction.
- `ModelMetadataProvisioningService`: server live/static projection and coarse provenance.
- `resolveTokenBudget` / LLM phase: effective input capacity and compaction threshold.
- `TokenUsageMeterPanel`: known/unknown presentation.

## Ownership Map

- Discovery owns transport/payload parsing but not vendor-plan facts.
- Endpoint metadata resolver owns pure source composition and exact endpoint/model policy; it never receives the API key.
- Supported model definitions remain the sole owner of static metadata for built-in selectable models.
- Endpoint profile owns only endpoint-specific matching, custom-only facts, and explicit plan overrides/references.
- Custom model provider owns invoking resolution during model construction and retaining last-known-good resolved models.
- Server provisioning owns later live-provider enrichment and truthful API provenance, not custom endpoint probing.
- Runtime consumes canonical model fields and must not infer provider facts.
- UI consumes usage summary and must not infer capacity from model names.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `CustomLlmProviderRuntimeSyncService` | Discovery, provider, factory | Secret/status server boundary | Alias parsing or profile facts |
| `OpenAICompatibleEndpointModelProvider.reloadSavedEndpoints` | Resolver + model constructor | Fresh/stale model lifecycle | Vendor HTTP calls beyond discovery |
| GraphQL resolver/map | ModelCatalogService/provisioning | API transport | Metadata inference |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| Identifier-only discovered-model contract | Cannot carry approved endpoint metadata | Metadata-bearing row in the same discovery module | In This Change | Clean-cut type replacement |
| Model-name-only fallback proposal | Same ID can have plan-specific limits | Compound endpoint/model profile | In This Change | Must never land in source |
| Proposed server null-overwrite work | Upstream already fixed preservation | Current resolver/service behavior + regression tests | In This Change | Remove from design/change inventory |
| Silent unknown context UI branch | Hides a meaningful supported state | Explicit unavailable state | In This Change | Known display unchanged |

## Return Or Event Spine(s) (If Applicable)

DS-003: `LLMModel -> TokenBudget -> compaction evaluation -> LLM usage observation -> server ledger/projection -> GraphQL token summary -> TokenUsageMeterPanel`. No event schema change is required because effective capacity is already nullable and present.

## Bounded Local / Internal Spines (If Applicable)

DS-004: `candidate -> ID extraction -> fixed alias normalization -> canonical endpoint/profile match -> exact profile/reference field -> exact-value fallback index if profile misses -> per-field precedence/source union -> ResolvedModelMetadata`. The chain stays pure and synchronous after the single existing `/models` request.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Risk If Misplaced |
| --- | --- | --- | --- | --- |
| Secret resolution | DS-001 | Runtime sync | Reveal key only to discovery transport | Credential leakage into profile/model DTOs |
| Endpoint profile facts | DS-001, DS-004 | Metadata resolver | Source-dated exact endpoint/model values/references | Global misapplication or stale facts |
| Built-in inferred fallback | DS-001, DS-004 | Metadata resolver | Exact existing definition match after profile miss | Provider-confirmed claim or family/substring inference |
| Built-in definition lookup | DS-004 | Metadata resolver | Exact `SupportedModelDefinition.value` index; lowest valid conflicting field value | Duplicated static metadata catalog or family/substring match |
| Server metadata timeout/cache | DS-002 | Provisioning | Preserve existing live enrichment | Custom discovery latency/coupling |
| Locale/generated UI surfaces | DS-003 | Token meter | Render approved unknown text | Missing or inconsistent UI state |

## Ownership Boundaries

The external contract boundary remains `OpenAICompatibleEndpointDiscovery`; callers do not parse raw payloads. The metadata authority for a custom row is the endpoint metadata resolver, which composes the already-normalized endpoint fields with a pure profile/reference and, only after that lookup misses, an exact built-in inferred fallback. The model provider calls that boundary once during fresh construction. `OpenAICompatibleEndpointModel` maps, but does not independently infer, facts. Server catalog and runtime consume the canonical model rather than bypassing it.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Required Callers | Forbidden Bypass | If API Too Thin |
| --- | --- | --- | --- | --- |
| `probeEndpoint` | URL validation, `/models`, payload/alias normalization | Server probe/runtime sync | Caller raw-payload parsing or extra route probing | Return the metadata-bearing normalized row |
| Endpoint metadata resolver | URL-family parsing, profile/reference lookup, field precedence | Custom model provider | Model-name lookup in runtime/server/UI | Strengthen typed input/output, not ad hoc lookups |
| Custom model provider | Fresh/stale construction lifecycle | LLMFactory sync | Factory mutating model fields after construction | Pass resolver dependency explicitly |
| `enrichBestEffort` | Server provider live/static composition | Model catalog | GraphQL/manual field merge | Preserve internal resolved source on ModelInfo |
| `resolveTokenBudget` | Effective capacity/input budget/threshold | LLM phase | Provider-specific compaction branch | Supply canonical model metadata |

## Dependency Rules

- Discovery may depend on shared metadata types, but not server, GraphQL, memory, or frontend code.
- Endpoint metadata resolver may depend on pure URL/model identity, endpoint profiles, `StaticModelMetadata`, and an exact built-in definition lookup; it must not depend on credentials or network clients. The built-in lookup is fallback-only and must emit inferred provenance.
- Endpoint profiles must not duplicate built-in static facts when an exact reference is semantically valid; plan differences must be explicit profile values.
- Custom model provider may call the resolver and constructor; LLMFactory continues to own registry replacement.
- Server provisioning may consume resolved source carried by `ModelInfo`; it must not query custom endpoints.
- Runtime/UI must not match provider/model strings to infer limits; only the metadata resolver owns the exact fallback.
- No legacy identifier-only parallel path or unmarked generic model-ID fallback.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `probeEndpoint(input)` | Endpoint discovery | Return normalized rows with optional advertised fields | Normalized base URL + secret input | Secret never returned |
| `resolve({ endpoint, discoveredModel })` | Custom endpoint model metadata | Return complete per-field resolved metadata | Endpoint base URL + exact discovered ID | Pure, no network; exact built-in fallback is inferred only after profile miss |
| Endpoint profile entry | Endpoint-plan facts | Static value or built-in reference | Profile ID + canonical endpoint tuple + exact model value | Source URL/date required; reference uses `{provider, value}` |
| `OpenAICompatibleEndpointModelInput` | Custom model construction | Carry discovered identity + resolved metadata | Provider record + row + resolution | Constructor performs no lookup |
| `ModelInfo` resolved metadata field | Internal catalog projection | Preserve per-field source/value/provenance | Same model row identity | Non-secret internal field; existing GraphQL coarse provenance remains unchanged |

## Interface Boundary Check

| Interface | Singular Responsibility | Explicit Identity | Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `probeEndpoint` | Yes | Yes | Low | Extend normalized output only |
| Endpoint resolver | Yes | Yes | Medium | Require canonical protocol/host/port/base-path tuple + exact model value for profiles; exact built-in fallback is separate and lower precedence |
| Built-in reference lookup | Yes | Yes | Medium | Profile references use `{provider, value}`; fallback index uses exact `value` and lowest valid conflicting field value |
| `enrichBestEffort` | Yes | Yes | Low | Merge source per field, not by whole-row label |

## Main Domain Subject Naming Check

| Subject | Proposed Name | Clear | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Normalized row | `OpenAICompatibleEndpointDiscoveredModel` | Yes | Low | Add metadata fields/source without raw payload |
| Source resolver | `OpenAICompatibleEndpointModelMetadataResolver` | Yes | Low | Keep endpoint/model subject explicit |
| Profile | `OpenAICompatibleEndpointModelMetadataProfile` | Yes | Low | Include endpoint-plan identity |
| UI state | `context limit unavailable` | Yes | Low | Stable locale/test selector |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Numeric metadata and source | `ResolvedModelMetadata` | Reuse/extend | Discriminated live/profile/inferred/static/unknown per field |
| Built-in facts | `SupportedModelDefinition.staticMetadata` | Reuse by reference | Current canonical owner |
| Endpoint transport | Custom discovery | Extend | Already owns `/models` normalization |
| Plan-specific facts | LLM metadata subsystem | Create one profile/resolver file | No current endpoint-scoped owner |
| Runtime compaction | Token budget/LLM phase | Reuse | Already correct once model fields exist |
| Unknown presentation | Token meter | Extend | Existing UI owner |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spines | Decision | Notes |
| --- | --- | --- | --- | --- |
| Custom endpoint discovery | `/models`, ID and alias normalization | DS-001, DS-004 | Extend | No extra network request |
| LLM metadata | Endpoint profiles, compound identity, exact built-in fallback, precedence | DS-001, DS-004 | Extend with one resolver/profile boundary | Pure |
| Custom model lifecycle | Fresh/stale resolved model construction | DS-001 | Extend | Preserve previous resolved models on failure |
| Server catalog | Live/static merge and API provenance | DS-002 | Minimal extension/regression | Existing numeric preservation stays |
| Agent runtime | Token budget/compaction | DS-003 | Reuse | No provider branch |
| Workspace usage UI | Known/unknown state | DS-003 | Extend | No model inference |

## Draft File Responsibility Mapping

| Candidate File | Owner | Concern | Why One File | Shared Structure |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-discovery.ts` | Discovery | Alias extraction and row normalization | Existing external boundary | `PartialResolvedModelMetadata` semantics |
| `autobyteus-ts/src/llm/metadata/openai-compatible-endpoint-model-metadata.ts` | Endpoint metadata resolver/profile | Canonical identity, fixed aliases, exact profile/reference, fallback index, source union, precedence | Small pure source-policy unit | `ResolvedModelMetadata`, `StaticModelMetadata` |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-provider.ts` | Model lifecycle | Invoke resolver during fresh model construction | Existing construction coordinator | Resolved row/model input |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-model.ts` | Model mapping | Map resolution into LLMModel | Existing DTO-to-domain owner | `LLMModelOptions` |
| `autobyteus-ts/src/llm/models.ts` | Shared model projection | Mandatory propagation of resolved source/provenance in ModelInfo | Existing canonical projection | `ResolvedModelMetadata` |
| `model-metadata-provisioning-service.ts` | Server catalog | Preserve custom source-bearing resolution; prefer provider live fields only for built-in/static resolution | Existing enrichment owner | ModelInfo/resolver |
| `TokenUsageMeterPanel.vue` | UI | Explicit unknown state | Existing token meter owner | Token summary |

## Reusable Owned Structures Check

| Repeated Structure | Owner | Decision | Must Not Become |
| --- | --- | --- | --- |
| Numeric field source/value | `ResolvedModelMetadata` | Reuse directly | A raw vendor bag |
| Static fact provenance | `StaticModelMetadata` | Reuse for built-in references and profile static values | A second global metadata catalog |
| Positive integer normalization | LLM metadata/discovery | Use one fixed semantic normalizer for aliases, profiles, and fallback candidates | Generic coercion utility |

## Shared Structure / Data Model Tightness Check

| Structure | Clear Meaning | Parallel Risk | Corrective Action |
| --- | --- | --- | --- |
| Discovered model | Yes after extension | Low | Store normalized numeric semantics only, no alias/raw fields |
| Resolved metadata | Yes | Low | Keep existing three intrinsic fields; active context remains dynamic |
| ModelInfo source field | Yes, mandatory internal resolution | Medium | Carry the same discriminated source type, not a second coarse custom enum |
| Profile entry | Yes | Medium | Discriminated static value vs built-in reference; exact identity required |

## Final File Responsibility Mapping

| File | Change | Responsibility |
| --- | --- | --- |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-discovery.ts` | Modify | Normalize optional aliases into the discovered row |
| `autobyteus-ts/src/llm/metadata/openai-compatible-endpoint-model-metadata.ts` | Add | Pure profiles, exact matching, built-in references, inferred fallback, per-field precedence |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-provider.ts` | Modify | Resolve metadata before fresh model construction |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-model.ts` | Modify | Populate numeric fields and `resolvedModelMetadata` |
| `autobyteus-ts/src/llm/models.ts` | Modify (mandatory) | Carry resolved source through ModelInfo |
| `autobyteus-server-ts/src/llm-management/services/model-metadata-provisioning-service.ts` | Modify (mandatory) | Prefer server live for built-ins; otherwise retain constructed custom source/value and map coarse provenance truthfully |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` and locale/test files | Modify | Explicit unknown context state |
| Respective test files | Modify/Add | Alias, profile, construction, budget, catalog, UI, stale/error coverage |

## Applied Patterns (If Any)

- Adapter/normalizer at the external `/models` boundary.
- Pure strategy/profile lookup under one metadata owner.
- Existing registry/factory for model lifecycle.
- Per-field source precedence rather than whole-object replacement.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/metadata/` | Folder | LLM metadata | Shared resolution types and endpoint profile | Secrets, HTTP, UI |
| `.../openai-compatible-endpoint-model-metadata.ts` | File | Endpoint metadata resolver | Canonical identity, aliases, profile/fallback index, source/precedence | Runtime calls or docs scraping |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-discovery.ts` | File | Discovery | Transport and normalized payload fields | Vendor plan tables |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-provider.ts` | File | Model lifecycle | Fresh/stale construction | Secret resolution |
| `autobyteus-web/components/workspace/usage/` | Folder | Usage UI | Known/unknown rendering | Provider inference |

## Folder Boundary Check

| Path | Structural Depth | Clear | Split Risk | Justification |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/` | Main domain/provider adapter | Yes | Low | Existing flat endpoint files stay readable |
| `autobyteus-ts/src/llm/metadata/` | Off-spine metadata concern | Yes | Low | Profile facts and resolution policy belong together |
| Server `llm-management/services/` | Main server control | Yes | Low | Existing catalog owner remains |
| Web `components/workspace/usage/` | UI concern | Yes | Low | Existing component owner |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoid | Why |
| --- | --- | --- | --- |
| Compound identity | `https + token-plan.ap-southeast-1.maas.aliyuncs.com + no explicit port + /compatible-mode/v1 + qwen3.8-max-preview` | `modelId === qwen3.8-max-preview` globally or a near host/path | Same strings can have endpoint-specific limits; protocol/host/port/path are exact |
| Built-in reuse | Profile entry references `{ provider: DEEPSEEK, value: deepseek-v4-pro }` when semantics match | Copy the same static facts into two catalogs or use `id`/`canonicalName` lookup | Preserves one fact owner and uses the actual definition identity |
| Plan override | Token Plan `qwen3.7-max` owns its documented 1M value | Reuse built-in Qwen 262,144 merely because ID matches | Serving plan changes the safe limit |
| Explicit wire alias | Alibaba profile maps exact `deepseek-v4-flash-0731` to `{ provider: DEEPSEEK, value: deepseek-v4-flash }`, with profile overrides | Strip `-0731` or fuzzy-match it on every endpoint | Wire IDs can identify dated/revisioned deployments; equivalence must be explicit and endpoint-scoped |
| Inferred fallback | Exact built-in `qwen3.7-max` value after endpoint/profile miss, marked inferred; lowest valid value if exact definitions conflict | Use a family, substring, or nearest-model match | Keeps unknown truthful when no exact definition exists and avoids overestimating capacity |
| Per-field precedence | `validAdvertised.value ?? validProfile.value ?? validInferredBuiltin.value ?? null` for each field | Treat invalid advertised data as an explicit block or replace the whole metadata object | Providers can supply partial data and malformed optional fields must fall through independently |
| Unknown UI | `Latest prompt 67,772 · Context limit unavailable` | Hide card or show `/ 0` | Truthful diagnosis without false precision |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Clean Target |
| --- | --- | --- |
| Parallel identifier-only and metadata-aware discovery DTOs | Rejected | Replace the existing row type/callers |
| Unmarked global custom-model name lookup | Rejected | Endpoint/profile first, exact built-in identity fallback second |
| Extra `/metadata`, `/model-info`, `/models/` probes | Rejected | One existing `/models` request plus pure profile |
| Duplicate static metadata catalog | Rejected | Reference canonical built-in definition or own endpoint-only fact |
| Persist resolved metadata in provider JSON | Rejected | Recompute at normal discovery boundary |
| Provider-specific compaction branch | Rejected | Populate canonical LLMModel fields |

## Derived Layering (If Useful)

`Endpoint transport -> normalized discovered row -> compound profile/reference resolution -> canonical custom LLMModel -> registry/runtime -> catalog/event projection -> UI`.

## Change / Refactor Sequence

1. Add focused tests for current identifier discovery, custom model null capacity, and known server field preservation.
2. Extend discovery row/alias normalization with strict positive-integer validation.
3. Add pure endpoint profile/resolver and tests for exact Alibaba family, exact/near model IDs, explicit `deepseek-v4-flash-0731` -> `deepseek-v4-flash` reference, built-in references, plan override conflicts, and unknowns.
4. Invoke resolution in custom model provider and map fields/source in the model constructor; prove stale models retain prior resolution.
5. Prove `resolveTokenBudget` and compaction evaluation produce a threshold for the Alibaba fixture and for an exact built-in inferred fallback, while remaining null/override-driven for unmatched models.
6. Mandatory: carry the source-bearing resolution through `ModelInfo`, merge it in `ModelMetadataProvisioningService` with built-in live-over-static precedence, and run source/provenance plus built-in live/static regressions.
7. Add unknown-capacity UI/locale/component coverage while preserving known progress rendering.
8. API/E2E engineer validates with a synthetic compatible endpoint and current system paths; no user secret in durable coverage.

## Key Tradeoffs

- **Useful reuse versus unsafe inference:** endpoint/profile reuse is authoritative only behind compound identity. When those sources are absent, exact built-in reuse is allowed as an explicitly inferred best-effort fallback, which preserves compaction for known models while remaining visibly less certain.
- **Profile facts versus network discovery:** code-owned source-dated facts can become stale, but they are bounded and reviewable; undocumented network probes are less reliable.
- **Source projection complexity:** retaining the discriminated per-field source through ModelInfo is a small cross-boundary change required by the source-truth invariant. It remains internal; numeric compaction behavior must not depend on the coarse UI/API enum.
- **Unknown UI versus hidden state:** the extra branch is small and makes unsupported providers diagnosable without inventing capacity.

## Risks

- Preview/plan documentation can change; exact profile entries need source dates and deliberate updates.
- URL matching can be too broad; parse protocol/hostname/path and anchor every component rather than substring matching.
- Built-in fallback lookup retains all definitions under exact `value` keys; profile references use exact `{provider, value}`. Resolve conflicting numeric fields to the lowest valid value and preserve the selected candidate's source URL/date as inferred provenance.
- Incorrect plan data directly affects compaction safety; endpoint/profile facts must override inferred built-in values, and a missing exact built-in match remains unknown rather than receiving an unverified guess.
- Carrying resolved source through ModelInfo can accidentally alter built-in provenance; field-level regression coverage is mandatory.

## Guidance For Implementation

- Keep API keys solely in the current runtime sync/discovery transport boundary.
- Use pure functions for the fixed alias normalization, endpoint canonicalization, exact profile/reference lookup, exact-value fallback-index construction, conservative field selection, and per-field resolution.
- Do not infer provider identity from the custom provider's display name.
- Use exact model identity for built-in fallback only after endpoint/profile lookup misses; label its source as inferred and never use substring/family matching.
- Do not add `qwen3.8-max-preview` as a built-in Qwen selectable model merely to host metadata unless its built-in runtime support is independently verified and separately scoped.
- Preserve `activeContextTokens` as dynamic runtime state; profiles resolve only intrinsic maximum context/input/output fields.
- Keep current server field preservation and compaction algorithms unchanged unless focused tests prove a real remaining gap.
- Test Alibaba exact profile match, same model on an unrecognized endpoint, explicit `deepseek-v4-flash-0731` wire-alias reference to canonical DeepSeek metadata, exact built-in fallback on a profile miss, no exact-match unknown behavior, same ID with conflicting plan values, exact duplicate built-in values and selected provenance, every advertised alias/type/fall-through rule, endpoint canonicalization/near-match rejection, stale reload, compaction threshold, ModelInfo/server source projection, GraphQL coarse provenance, and known/unknown UI states.
