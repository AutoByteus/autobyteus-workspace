# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Refined` — current-state investigation is complete and the user has approved the layered fallback policy below. The package is ready for architecture review.

## Goal / Problem Statement

A saved custom OpenAI-compatible provider can expose a model that AutoByteus already knows, a provider-plan variant of a known model, or a provider-specific wire alias/version of a known model, while its `/models` response contains no context-window metadata. The resulting custom `LLMModel` has no input capacity, so runtime token-budget resolution can return `null` and automatic working-context compaction has no threshold. AutoByteus must resolve trustworthy model limits for custom endpoints without assuming that a model name alone proves identical serving limits.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | Custom discovery calls `GET {baseUrl}/models`, keeps valid model identifiers, and discards all optional metadata fields. | Discovery retains recognized positive-integer context/input/output fields when an endpoint advertises them. | Credential handling, URL normalization, identifier extraction, sorting/deduplication, timeout handling, and last-known-good model preservation remain unchanged. | REQ-001, REQ-005; AC-001, AC-002 |
| BEH-002 | Built-in model definitions own source-attributed static limits, but custom endpoint models do not consult those definitions or an endpoint profile. The current server provisioning path already preserves non-null model fields field-by-field. | A custom endpoint first uses a verified exact endpoint/model profile when one exists. A profile may explicitly map a provider wire ID such as `deepseek-v4-flash-0731` to a canonical built-in `{provider, value}` such as DeepSeek `deepseek-v4-flash`; this is not automatic suffix stripping. If endpoint/profile data is absent, it may use an exact built-in model-identity match as an explicitly inferred fallback. Endpoint-plan-specific profile values always take precedence when the plan has different documented limits. | Built-in model-definition ownership, live-over-static field precedence, and server field preservation remain unchanged. | REQ-002, REQ-003, REQ-006; AC-003, AC-004 |
| BEH-003 | Runtime uses an explicit override, `activeContextTokens`, `maxContextTokens`, or `maxInputTokens` to derive a compaction budget. For the observed Alibaba custom model all are unknown, so automatic compaction has no model-derived trigger. | Resolved endpoint/profile limits, or an exact built-in inferred fallback when no higher-precedence source exists, flow into the existing `LLMModel` fields before runtime construction, allowing the existing token-budget and compaction path to calculate a best-effort threshold. | Runtime precedence, configurable overrides, output reservation, safety margin, compaction ratio, and compaction implementation remain unchanged. | REQ-004; AC-009, AC-010 |
| BEH-004 | The Alibaba Token Plan `/models` and successful completion response expose token usage but no model context limit. No universal OpenAI-compatible metadata endpoint exists. | The product uses a layered source policy: endpoint-advertised fields first; then an exact endpoint-plan/model profile; then an exact built-in model-identity fallback marked as inferred; otherwise `null`. A missing exact match remains unknown. | No speculative `/metadata`, `/model-info`, or slash-variant requests, no family/substring matching, and no universal guessed default. | REQ-002, REQ-003, REQ-005; AC-004, AC-007, AC-010 |
| BEH-005 | When prompt usage exists but effective context capacity is `null`, the token meter omits the context section. | The token meter shows the latest prompt count and an explicit “context limit unavailable” state, without a percentage or invented denominator. | Token totals, model/runtime identity, usage count, pricing state, and the existing known-capacity progress meter remain unchanged. | REQ-007; AC-005, AC-006 |

## Investigation Findings

- The configured Alibaba Token Plan endpoint returned HTTP 200 with nine model objects containing only `created`, `id`, `object`, and `owned_by`; it returned no context/input/output limit fields.
- A fresh successful `POST /chat/completions` for `qwen3.8-max-preview` also returned normal usage counts but no context-window or maximum-limit metadata.
- The live run behind the report had `latestPromptTokens=67772`, `effectiveContextWindowTokens=null`, and `contextWindowUsagePercent=null`; the missing capacity, not the usage count, is the compaction blocker.
- Current custom discovery retains identifiers only, while `OpenAICompatibleEndpointModel` constructs shared models without numeric limits.
- Current built-in model definitions now own static metadata and provenance. Current server enrichment uses each model's existing values as its static fallback, so the earlier null-clearing concern no longer exists after the ticket branch was refreshed to `origin/personal` at `d5618bffd`.
- An unmarked global model-name fallback is unsafe. AutoByteus's built-in Qwen definition records 262,144 context tokens, while the investigated Token Plan documentation describes the plan variant as 1M. Endpoint/plan identity can therefore change the effective limit even when the model identifier is identical. The approved fallback is therefore exact built-in identity only after endpoint/profile sources are absent, with inferred provenance; an endpoint/profile value overrides it.
- The investigated provider documentation lists `qwen3.8-max-preview` at a 1M context label. That is a versioned endpoint-profile fact, not data returned by the model-list API.
- The different URLs are intentional service boundaries: AutoByteus's built-in Qwen adapter uses Alibaba's older, still-supported Singapore pay-as-you-go `dashscope-intl` route, while the configured endpoint is the separately billed and entitled Token Plan gateway. Alibaba requires each plan's key and base URL to be used together, so the endpoints must not be treated as interchangeable aliases.
- See `investigation-notes.md` for exact code paths, commands, sanitized runtime/probe evidence, and source URLs.

## Relevant Supplemental Task Artifacts

None. Sanitized probe evidence is retained in `investigation-notes.md`; no raw secret-bearing response is promoted.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Bug Fix / Behavior Change`
- Initial design issue signal (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification: `Boundary Or Ownership Issue` with a `Missing Invariant` at custom model construction
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): `Likely Not Needed`
- Evidence basis: The supported-model metadata owner and runtime token-budget owner are healthy. The missing boundary is a safe adapter from custom endpoint identity/model identity to the existing shared metadata shape. The refreshed server merge already preserves known model values, so no catalog refactor is required.
- Requirement or scope impact: The change must resolve metadata before custom `LLMModel` construction, distinguish exact endpoint-plan facts from global name matching, and retain a truthful unknown state.

## Recommendations

1. Extend custom `/models` normalization to capture a small allowlist of top-level numeric metadata aliases without making optional metadata fatal.
2. Add one pure custom-endpoint metadata resolver. It must match the canonical endpoint tuple plus the exact provider wire ID for authoritative profiles. A profile may explicitly map a provider wire alias/version to a canonical built-in `{provider, value}` reference; this mapping is code-owned and endpoint-scoped, not a generic suffix/family transform. When no endpoint/profile value exists, it may consult the existing built-in definitions by exact model identity only and mark the result as inferred. An endpoint-plan override owns documented differences or custom-only models such as `qwen3.8-max-preview`.
3. Use precedence per field: valid endpoint-advertised value, exact endpoint-plan profile value/reference, exact built-in model-identity fallback marked inferred, then `null`. Never use substring/family matching and never invent a value when there is no exact built-in match.
4. Pass the resolved fields and per-field source into `OpenAICompatibleEndpointModel`, so the current `resolveTokenBudget` and compaction flow work without provider-specific runtime branches.
5. Preserve the refreshed server provisioning behavior; add regression coverage proving it does not clear the custom model values.
6. Render an explicit unknown-capacity state in the token meter so unsupported custom models remain diagnosable.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium` — the core fix is localized to custom endpoint discovery/model construction, but trustworthy source matching, runtime/compaction proof, catalog projection, and the unknown UI state require cross-package coverage.

## In-Scope Use Cases

- UC-001: A compatible endpoint advertises recognized context/input/output fields; valid values reach the custom runtime model.
- UC-002: A custom endpoint serves an exact model already represented in the canonical built-in catalog; endpoint/profile metadata wins when available, otherwise the custom model uses that built-in static metadata as explicitly inferred fallback.
- UC-003: The Alibaba Token Plan endpoint serves a plan-specific or custom-only model; exact profile values, including `qwen3.8-max-preview`, reach runtime compaction without another network request. A documented provider wire alias such as `deepseek-v4-flash-0731` may reference canonical DeepSeek `deepseek-v4-flash` metadata only through an exact endpoint profile.
- UC-004: The endpoint/model is unknown, optional fields are malformed, or discovery fails; model discovery and last-known-good behavior remain resilient, limits remain null, and the UI explains the unknown state.

## Out of Scope

- Treating a built-in model-ID fallback as provider-confirmed metadata; the fallback is explicitly inferred and must not override endpoint/profile facts.
- Automatically stripping date/version suffixes such as `-0731` or applying fuzzy aliases across providers.
- Assuming two providers or plans enforce the same limit because their model strings match.
- Live scraping vendor documentation or probing undocumented metadata endpoints.
- User-editable per-model context overrides or a custom-provider persistence-schema change.
- Pricing, billing, tokenizer, capability, or modality inference.
- Changing the compaction algorithm, compaction strategy, or environment override contract.

## Functional Requirements

- **REQ-001 — Normalize endpoint metadata:** Read only the documented top-level alias allowlist: context (`context_window`, `contextWindow`, `context_window_tokens`, `contextWindowTokens`, `max_context_tokens`, `maxContextTokens`, `context_length`, `contextLength`, `max_context_length`, `maxContextLength`); input (`max_input_tokens`, `maxInputTokens`, `input_token_limit`, `inputTokenLimit`, `max_prompt_tokens`, `maxPromptTokens`, `max_input_length`, `maxInputLength`); and output (`max_output_tokens`, `maxOutputTokens`, `output_token_limit`, `outputTokenLimit`, `max_completion_tokens`, `maxCompletionTokens`, `max_output_length`, `maxOutputLength`). Only JSON numbers that are finite, integer, and positive are accepted; numeric strings, booleans, nested fields, and unrelated aliases are rejected. Invalid or absent optional fields must not reject an otherwise valid model.
- **REQ-002 — Resolve with bounded identity fallback:** Authoritative endpoint-profile metadata must require a normalized endpoint-family/path match and exact model identity. If no endpoint/profile value is available, an exact built-in model identity from the existing definitions may provide an explicitly inferred fallback, regardless of which built-in provider owns it. Substring, family, and display-name matches are forbidden. If multiple exact built-in definitions disagree, resolve each field conservatively to the lowest valid value; if no exact match exists, resolve to `null`.
- **REQ-003 — Support endpoint-plan profiles:** A versioned, source-attributed profile must support exact canonical endpoint/model facts, explicit provider-wire aliases that reference canonical built-in metadata, and references to canonical built-in static metadata. The profile's returned wire ID and referenced built-in `value` may differ only through this explicit entry. Explicit plan-specific facts override a referenced built-in value for that endpoint only. The Alibaba Token Plan family is the first profile.
- **REQ-004 — Enable existing compaction:** Resolved fields must be present on the custom `LLMModel` before `LLMFactory.createLLM` returns the runtime instance. The existing token-budget path must derive a non-null budget when endpoint/profile metadata or an exact built-in inferred fallback supplies sufficient capacity.
- **REQ-005 — Preserve discovery resilience and security:** Metadata resolution must be pure/bounded after the existing `/models` response, must not add network requests, expose credentials, persist raw payloads, or change stale/error status behavior.
- **REQ-006 — Preserve source truth:** Endpoint-advertised (`live`), endpoint-profile (`endpoint_profile`), inferred built-in (`inferred_builtin`), built-in static definition (`static_definition`), and unknown (`unknown`) values must remain distinguishable in the internal per-field resolution. `LLMModel.toModelInfo()` must carry the non-secret per-field resolution, and `ModelMetadataProvisioningService` must preserve it while applying its existing built-in live-over-static behavior. Existing GraphQL provenance may map these sources to its current `LIVE`/`CURATED_*` vocabulary only where truthful; no new public enum is required merely for wording.
- **REQ-007 — Expose unknown capacity:** If usage is known but capacity is not, the token meter must render an explicit unavailable-limit state and omit percentage/denominator calculations.
- **REQ-008 — Keep persisted configuration stable:** Existing custom-provider records and secrets remain directly usable; metadata remains derived and is not written into provider configuration.
- **REQ-009 — Define source propagation:** The internal `ResolvedMetadataField` source contract must carry the source kind plus non-secret provenance details: endpoint-profile ID and source URL/date for profile facts; selected built-in model value and source URL/date for inferred facts; and the existing static provenance for built-in definitions. `LLMModel.toModelInfo()` must expose this resolution in memory, and server enrichment must retain it in `EnrichedModelInfo` while deriving coarse GraphQL provenance as `LIVE` only for endpoint/provider live fields, `CURATED_FALLBACK` for a verified curated/profile/inferred value, and `CURATED_ONLY` only for static-only/unknown fallback where that remains the existing truthful classification.
- **REQ-010 — Define exact built-in fallback identity:** The fallback index must be a separate exact map keyed only by non-empty `SupportedModelDefinition.value` (the provider-wire model identifier), retaining all provider/value candidates. It must not use `name`, `canonicalName`, display names, case folding, `models/` transformations, substrings, families, or nearest matches. Profile references must use `{ provider, value }`. For duplicate exact values, each numeric field selects the lowest valid positive value independently; the selected candidate's source URL/date accompanies that field, with deterministic provider/source tie-breaking.
- **REQ-011 — Canonicalize endpoint/profile identity:** Profile matching must compare exact `(protocol, hostname, port, basePath, exact model value)` tuples: lowercase `http`/`https`, lowercase hostname with one trailing dot removed, default ports normalized away and non-default ports retained, base path with dot segments resolved and trailing slashes removed (`/` becomes empty), and query/fragment excluded from identity. A host, protocol, port, or path near-match does not match; query-dependent plans cannot use a profile and remain subject to advertised/fallback resolution. Advertised fields are per-field misses when absent or invalid, so resolution falls through independently to profile, inferred built-in, and unknown.
- **REQ-012 — Support explicit wire aliases:** A provider wire ID that differs from an existing built-in `value` may inherit built-in metadata only when an exact endpoint profile names both the returned wire ID and the canonical `{provider, value}` reference. Without that profile, the differing wire ID is unmatched and follows the normal unknown result.

## Acceptance Criteria

- **AC-001:** The exact advertised alias allowlist and JSON-number validation normalize deterministically into context/input/output fields; numeric strings, booleans, nested fields, and unrelated aliases are ignored.
- **AC-002:** Missing/malformed optional metadata, duplicate IDs, and mixed string/object rows preserve the current valid discovered-model set. Within a row, aliases are evaluated in the documented order and the first valid value wins; an invalid earlier alias falls through to the next alias. Duplicate model rows merge per field in payload order using the first valid advertised value, and an absent/invalid advertised field falls through to profile/fallback resolution.
- **AC-003:** Catalog enrichment/reload preserves known endpoint/profile fields and their truthful source classification; an unknown later resolution does not clear them and built-in live-over-static behavior remains green.
- **AC-004:** Resolution uses `endpoint payload > exact endpoint-plan profile/reference > exact built-in model identity as inferred fallback > null`. The exact Alibaba Token Plan family plus `qwen3.8-max-preview` resolves `1_000_000` from its profile; a host/path/model near-match does not use that profile; a matching built-in model from any built-in provider with no endpoint/profile value may supply inferred metadata; conflicting exact built-in values use the lowest valid value per field; a conflicting plan value always wins; and an unmatched model remains `null`.
- **AC-005:** Given usage and a known effective context capacity, the token meter preserves its existing percentage and prompt/capacity display.
- **AC-006:** Given usage but no effective context capacity, the token meter renders prompt usage plus “context limit unavailable” and no percentage/denominator.
- **AC-007:** Custom discovery timeout/failure or malformed provider data preserves last-known-good models/metadata where applicable, and no key/raw response appears in logs, fixtures, or persisted provider data.
- **AC-008:** Existing built-in metadata, custom-provider discovery/stale behavior, GraphQL model metadata, token-budget/compaction, and token-meter suites remain green or change only for the approved behavior.
- **AC-009:** A custom `LLMModel` with endpoint/profile metadata, or with an exact built-in inferred fallback when no endpoint/profile metadata exists, produces a non-null `TokenBudget`, effective context capacity, input budget, and compaction trigger threshold through the existing runtime code.
- **AC-010:** An unmatched custom model with no endpoint/profile metadata and no exact built-in definition remains runnable but has no fabricated context limit or model-derived compaction threshold; the existing explicit active-context override remains available and unchanged.
- **AC-011:** A custom model's four-way per-field source and non-secret provenance survive `LLMModel.toModelInfo()` and `ModelMetadataProvisioningService`; endpoint-advertised fields remain `live`, endpoint-profile fields remain `endpoint_profile`, inferred fields remain `inferred_builtin`, and unknown fields remain `unknown`. Coarse GraphQL provenance is `LIVE` only for live fields and never falsely claims that an inferred/profile value came from the provider response.
- **AC-012:** The separate built-in fallback index uses exact `SupportedModelDefinition.value` keys and profile references use `{provider, value}`. `name`, `canonicalName`, `models/` variants, case/family/substring/nearest matching are rejected. Duplicate exact values select the lowest valid value per field and carry the selected candidate's source URL/date.
- **AC-013:** Endpoint profile matching canonicalizes protocol, hostname, default/non-default port, base path, and excludes query/fragment as specified; exact endpoint/model matches resolve, while near-host/path/protocol/port or query-only differences do not. Invalid/absent advertised values fall through independently per field.
- **AC-014:** An exact Alibaba profile may map wire ID `deepseek-v4-flash-0731` to canonical built-in reference `{ provider: DEEPSEEK, value: deepseek-v4-flash }`, with any Alibaba-specific override taking precedence. The mapping is marked `endpoint_profile`; the same wire ID on an unrecognized endpoint, or without the profile, does not inherit metadata by suffix stripping and remains subject to exact fallback/unknown resolution.

## Constraints / Dependencies

- `LLMModel`, `ResolvedModelMetadata`, and per-definition `staticMetadata` are canonical; do not introduce a second general model-metadata catalog.
- The endpoint profile may reference a canonical built-in definition but must own endpoint-specific differences explicitly.
- The custom-provider contract remains a credentialed `GET {baseUrl}/models` with the existing timeout.
- Profile entries are code-owned, source-attributed facts that can become stale; an exact built-in fallback is allowed only as explicitly inferred best effort, while an unknown result remains preferable to an invented or ambiguous value.
- Durable tests must use synthetic endpoints/fixtures and must not contain the user's API key.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Custom-provider configuration in `/Users/normy/.autobyteus/server-data/llm/custom-llm-providers.json`; credentials are stored separately in the secret vault.
- Required outcome: `Not Affected`
- Existing data to preserve: Every provider identity/name/type/base URL record and secret reference.
- Unacceptable data loss or corruption: Losing or changing a provider, credential reference, endpoint, discovered model identity, or last-known-good model solely because metadata is absent.
- Rollout constraints: No migration or maintenance window; normal provider discovery rebuilds derived model metadata.
- Related IDs: REQ-005, REQ-008; AC-009.

## Assumptions

- The configured Alibaba endpoint is the Token Plan OpenAI-compatible endpoint family and its returned IDs are vendor model IDs rather than user-defined deployment aliases.
- The approved profile may encode the documented rounded `1M` value as `1_000_000`; provenance must not imply a more exact provider-side guarantee. Built-in fallback values must likewise be labeled inferred rather than provider-confirmed.

## Risks / Open Questions

- Preview-model documentation can change; profile facts need an easy, source-dated update path.
- Equivalent model IDs can have different limits across endpoint plans, as the investigated Qwen example demonstrates; endpoint/profile values must override the inferred built-in fallback.
- Future providers may return conflicting aliases; deterministic precedence and strict validation are mandatory.
- Editable user overrides are a separate product feature and are not included.

## Requirement-To-Use-Case Coverage

| Requirement | UC-001 | UC-002 | UC-003 | UC-004 |
| --- | --- | --- | --- | --- |
| REQ-001 | X |  |  | X |
| REQ-002 |  | X | X | X |
| REQ-003 |  | X | X | X |
| REQ-004 | X | X | X |  |
| REQ-005 | X | X | X | X |
| REQ-006 | X | X | X | X |
| REQ-007 |  |  |  | X |
| REQ-008 |  | X | X | X |
| REQ-009 | X | X | X | X |
| REQ-010 |  | X | X | X |
| REQ-011 | X | X | X | X |
| REQ-012 |  | X | X | X |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001–AC-002 | Unit coverage for the exact advertised alias allowlist, duplicate alias/row precedence, invalid-field fall-through, payload normalization, and discovery resilience. |
| AC-003 | Server catalog/source-preservation regression coverage. |
| AC-004 | Unit/integration coverage for compound identity, precedence, Alibaba exact match, conflicting built-in value, and near-match rejection. |
| AC-005–AC-006 | Frontend component coverage for known and unknown capacity states. |
| AC-007 | Discovery failure, stale model, and secret-hygiene coverage. |
| AC-008 | Cross-package regression suite intent. |
| AC-009–AC-010 | Runtime integration coverage for compaction budget known/unknown behavior and preserved override behavior. |
| AC-011–AC-014 | Source-bearing model/catalog projection, exact built-in index/provenance, endpoint canonicalization, profile/fallback precedence, and explicit provider-wire alias coverage. |

## Approval Status

`Approved by user`:

1. use provider/endpoint metadata when available;
2. otherwise use an exact matching built-in model definition as a best-effort inferred fallback, without treating it as provider-confirmed;
3. if no exact built-in match exists, provide no context limit and keep the state unknown; and
4. preserve an explicit “context limit unavailable” token-meter state for genuinely unknown models; and
5. support explicit endpoint-scoped wire aliases, such as mapping Alibaba `deepseek-v4-flash-0731` to canonical DeepSeek `deepseek-v4-flash`, only when the profile records that equivalence.

The architecture-review package still includes endpoint-scoped profiles so documented plan-specific values can override the inferred built-in fallback (for example, Alibaba Token Plan facts).
