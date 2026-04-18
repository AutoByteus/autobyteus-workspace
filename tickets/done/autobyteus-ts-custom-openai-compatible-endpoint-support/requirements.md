# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Refined`

## Goal / Problem Statement

AutoByteus must support **user-created custom OpenAI-compatible providers** without continuing to patch around the old fixed-enum provider model.

The intended refactor is:
- keep the user-facing concept **provider**,
- change provider from a hard-coded enum-only concept into a **provider object**,
- keep a stable backend behavior field such as `providerType`, and
- let both built-in providers and user-created OpenAI-compatible providers participate in one natural provider list / provider settings / provider models contract.

The immediate product need is still custom OpenAI-compatible support, but the user-approved architecture direction is to solve it by cleaning up the provider model instead of layering more source/provider-instance overlays on top of the old enum design.

## Investigation Findings

- Low-level OpenAI-compatible transport already exists in `autobyteus-ts`; the hard part is not HTTP compatibility, but fitting custom connections into the current provider model.
- The current public/provider-facing system is still organized around fixed provider enum values plus one API key per provider.
- The frontend settings UX already behaves like a provider browser: users select a provider and see its models/configuration. That UX maps naturally to provider **objects**.
- The current custom-endpoint branch introduced extra `providerInstance` / `modelSource` overlay metadata and a dedicated endpoint manager because the underlying provider model was too rigid.
- The user explicitly rejected that direction as too patchy and wants the architecture cleaned up so providers again feel intuitive.
- A cleaner model is:
  - `provider` = object shown to the user,
  - `providerType` = stable backend/runtime behavior type,
  - built-in providers = predefined provider objects,
  - custom OpenAI-compatible entries = user-created provider objects.
- The current fixed-provider secret flow was also weaker than needed because raw API keys were being returned to the frontend even though the UI only needs configured/not-configured state.
- The pre-task provider-centered API surface (`availableLlmProvidersWithModels`, `ProviderWithModels`, `reloadLlmProviderModels`, and the `llmProviderConfig.providersWithModels` store shape) was already intuitive; the refactor should reuse that surface where possible and upgrade the returned provider payload instead of inventing new source-aware top-level APIs.
- Screenshot-driven implementation review on 2026-04-17 exposed two additional UX gaps in the current in-progress branch: saved custom providers cannot be removed, and custom-provider model displays are leaking long internal identifiers instead of human-friendly model names.
- Generic Server Settings still cannot be reused for secret-bearing custom provider records, because non-`*_API_KEY` settings are exposed there.
- Official OpenAI must remain distinct from generic OpenAI-compatible providers because official OpenAI uses the Responses API path while generic OpenAI-compatible providers use the existing chat-completions-compatible path.
- Unique model identity is still required internally, but the public API no longer needs awkward `sourceId/sourceKind` overlays if models are returned under provider objects.
- Once provider becomes the primary public subject, provider names themselves must remain user-distinguishable; duplicate custom names or custom names colliding with built-in provider names would undermine the simplified provider-object model.

## Recommendations

1. Refactor the LLM provider model so the primary public/settings/catalog concept is a **provider object**, not a bare provider enum.
2. Introduce a stable `providerType` field for backend/runtime behavior resolution.
3. Represent existing built-in providers as predefined provider objects.
4. Represent custom OpenAI-compatible entries as user-created provider objects.
5. Reuse the earlier provider-centered GraphQL/store contracts where they still fit—especially `availableLlmProvidersWithModels`, `ProviderWithModels`, and provider-centered reload semantics—while upgrading the returned `provider` payload from enum/string to a provider object and avoiding separate source/source-kind APIs.
6. Remove raw fixed-provider API-key read-back to the frontend; provider objects should expose `apiKeyConfigured`, not secrets.
7. Persist custom provider secrets in a dedicated secret-bearing file store outside generic Server Settings.
8. Reload and runtime-sync custom providers per provider object, with failure isolation and cache-consistent catalog refresh.
9. Add first-class removal for saved custom OpenAI-compatible providers.
10. For custom OpenAI-compatible providers only, show human-friendly model labels based on the discovered model name while keeping the internal model identifier as the stored/runtime value.
11. Keep existing built-in provider model-label behavior unchanged in this ticket.
12. Keep official OpenAI behavior unchanged on the Responses API path.
13. Keep the first dynamic user-created provider type limited to `OPENAI_COMPATIBLE` in this ticket; broader dynamic-provider creation is future work.
14. Enforce normalized unique provider names across built-in and custom LLM providers so the provider browser/selector remains unambiguous without reintroducing a public secondary disambiguation concept.

## Scope Classification (`Small`/`Medium`/`Large`)

`Large`

## In-Scope Use Cases

- `UC-001`: API Key Management can list LLM providers as provider objects rather than only hard-coded enum buckets.
- `UC-002`: Existing built-in providers still appear naturally in that provider list.
- `UC-003`: A user can create a custom OpenAI-compatible provider by entering at least a provider name, base URL, and API key.
- `UC-004`: Before saving, the user can probe/load models for a custom OpenAI-compatible provider draft.
- `UC-005`: After save, the new custom provider appears in the same provider list as other providers.
- `UC-006`: Multiple custom OpenAI-compatible providers can coexist.
- `UC-007`: General LLM model selectors can show models under their owning provider object naturally, without source/source-kind overlay semantics.
- `UC-008`: `LLMFactory.createLLM(modelIdentifier)` can instantiate a model selected from a custom OpenAI-compatible provider.
- `UC-009`: Existing fixed providers can show whether credentials are configured without returning raw secrets to the frontend.
- `UC-010`: One failing custom provider does not wipe models from healthy providers during reload.
- `UC-011`: Post-save and post-reload provider changes become visible through the real cached catalog-serving path.
- `UC-012`: Official OpenAI remains unchanged and distinct from generic OpenAI-compatible providers.
- `UC-013`: If a user enters a custom provider name that duplicates an existing custom provider or a built-in provider name, the system rejects it with a clear validation error before save.
- `UC-014`: A user can remove a previously saved custom OpenAI-compatible provider from API Key Management.
- `UC-015`: In API Key Management and general model selectors, models from custom OpenAI-compatible providers are shown with friendly model names rather than the long internal custom-provider identifier string.

## Out of Scope

- User-created dynamic providers for every provider type in this ticket.
- Replacing the official OpenAI Responses-API integration.
- Full unified secret-store migration for every provider/search secret in this ticket.
- Arbitrary custom auth/header schemes beyond the confirmed first-pass OpenAI-compatible contract unless explicitly added later.
- Full edit/disable lifecycle for custom providers unless explicitly pulled in later.
- Audio/image provider-model refactors in this ticket.

## Functional Requirements

- `R-001`: LLM provider settings and catalog contracts must use **provider objects** as the primary public-facing subject.
- `R-002`: Each provider object must expose at least a stable `id`, a user-facing `name`, a stable backend/runtime `providerType`, and enough metadata to distinguish built-in providers from user-created providers (for example `isCustom`).
- `R-003`: Existing built-in providers must be represented as predefined provider objects rather than only as bare enum buckets in public/settings APIs.
- `R-004`: The system must support user-created custom providers whose first supported dynamic `providerType` is `OPENAI_COMPATIBLE`.
- `R-005`: A custom OpenAI-compatible provider draft must accept at least `name`, `baseUrl`, and `apiKey`.
- `R-006`: The system must allow probing/loading models from an unsaved custom OpenAI-compatible provider draft before save.
- `R-007`: The system must support saving more than one custom OpenAI-compatible provider object.
- `R-008`: Provider objects returned to the frontend must expose write-only secret state such as `apiKeyConfigured`, never raw API keys.
- `R-009`: Custom provider secret-bearing persistence must live outside generic Server Settings listing/editing surfaces.
- `R-010`: Public LLM selector/catalog contracts must return providers-with-models directly and must not require public `sourceId`, `sourceLabel`, or `sourceKind` overlays to distinguish custom providers.
- `R-011`: Model metadata must identify the owning provider object directly via provider-oriented fields such as `providerId`, `providerName`, and `providerType` when model-level provider metadata is needed.
- `R-012`: `providerType` must remain the stable backend/runtime behavior discriminator; user-entered provider names must not control runtime behavior.
- `R-013`: Custom OpenAI-compatible providers must instantiate models through the existing OpenAI-compatible chat-completions path, not the official OpenAI Responses path.
- `R-014`: Official built-in OpenAI models must remain on the current Responses-API path.
- `R-015`: Provider-targeted reload/runtime sync must isolate failures per custom provider object so one broken provider does not wipe healthy providers.
- `R-016`: The system must surface per-provider health/reload status for custom providers.
- `R-017`: Provider save/reload changes that affect model availability must refresh the real catalog-serving cache path so selectors do not stay stale.
- `R-018`: Fixed-provider frontend hydration must stop reading raw API keys; configured status must flow through provider objects and/or boolean-only status projection.
- `R-019`: The provider settings/model browser UI should remain provider-centric and not require a second user-facing “source” concept for LLM providers.
- `R-020`: Automated tests must cover provider-object list contracts, write-only secret semantics, custom-provider persistence non-exposure, provider-targeted failure isolation, cache freshness after provider sync, and official OpenAI path non-regression.
- `R-021`: Provider names must be unique across built-in and custom LLM providers after one authoritative normalization rule is applied; collisions must be rejected rather than silently allowed into the public provider list.
- `R-022`: The refactor must treat the pre-task provider-centered API/store surface as the reference shape where it still fits; `availableLlmProvidersWithModels` must remain the primary LLM provider collection query, with its returned `provider` value upgraded from a string/enum-like value to a provider object.
- `R-023`: The system must support deleting a saved custom `OPENAI_COMPATIBLE` provider from the provider-management surface.
- `R-024`: Deleting a saved custom provider must remove its persisted record and refresh the authoritative catalog-serving path so the deleted provider and its models disappear from provider lists and selectors.
- `R-025`: For custom `OPENAI_COMPATIBLE` providers, the primary UI label for models must use the discovered model name (`model.name`) rather than the internal unique identifier string; the full internal identifier remains the stored/runtime selection value.
- `R-026`: Existing built-in provider model-label behavior may remain unchanged in this ticket; the friendly-label adjustment is required only for custom providers.

## Acceptance Criteria

- `AC-001`: The provider settings UI can render a list of LLM providers from provider objects, not just enum names.
- `AC-002`: Built-in providers still appear naturally in that list.
- `AC-003`: A user can enter `name`, `baseUrl`, and `apiKey` for a custom OpenAI-compatible provider draft.
- `AC-004`: The user can probe the draft and see discovered models or a clear validation/error result before save.
- `AC-005`: After save, the custom provider appears in the provider list and can coexist with additional custom providers.
- `AC-006`: Provider objects returned to the frontend expose `apiKeyConfigured` or equivalent but never raw API keys.
- `AC-007`: Custom provider secrets are not exposed through generic Server Settings surfaces.
- `AC-008`: General LLM selectors can show models under provider objects naturally without public source/source-kind overlay fields.
- `AC-009`: A model chosen from a custom OpenAI-compatible provider instantiates against that provider’s base URL/API key.
- `AC-010`: If one custom provider fails during reload, healthy providers remain available.
- `AC-011`: After provider save/reload, the next selector/catalog query reflects the refreshed provider-backed models without requiring an unrelated manual reload.
- `AC-012`: Existing fixed-provider settings no longer fetch raw API keys into the frontend.
- `AC-013`: Official OpenAI remains on the Responses API path and does not regress.
- `AC-014`: Automated tests fail if provider-object contracts regress back into enum-only/public-source-overlay behavior, if secrets are returned to the frontend, if custom provider persistence leaks through generic Server Settings, or if cache refresh is skipped after provider sync.
- `AC-015`: Creating a custom provider whose normalized name matches an existing built-in provider or existing custom provider fails with a clear validation error before the duplicate enters the provider list.
- `AC-016`: The main LLM provider collection query remains `availableLlmProvidersWithModels`, and its returned provider payload carries provider-object fields such as `id`, `name`, `providerType`, and `apiKeyConfigured` instead of only a provider string.
- `AC-017`: A saved custom provider can be removed from API Key Management, and after the authoritative refresh completes the provider no longer appears in the provider list or model selectors.
- `AC-018`: In API Key Management and general model dropdowns, custom-provider models are shown by friendly model name (for example `gemma-4-31b-it`) rather than by the long internal identifier (for example `openai-compatible:provider_<id>:gemma-4-31b-it`).
- `AC-019`: Built-in provider model labels keep their current behavior in this ticket; only custom-provider labels are changed.

## Constraints / Dependencies

- Official OpenAI currently uses `OpenAIResponsesLLM`; that must remain isolated from generic OpenAI-compatible handling.
- `OpenAICompatibleLLM` already exists and should remain the transport/runtime path for generic OpenAI-compatible providers.
- The current codebase already has provider-enum assumptions in frontend stores, GraphQL contracts, `LLMModel`, and `LLMFactory`; this refactor must update those assumptions coherently instead of adding more overlays.
- The current task workspace already contains an in-progress endpoint-specific/source-aware implementation direction; this refactor intentionally supersedes parts of that patchy direction.
- Generic Server Settings still expose non-`*_API_KEY` settings, so secret-bearing custom provider records cannot be stored there.
- The real selector-serving model path still goes through `ModelCatalogService -> AutobyteusModelCatalog -> CachedAutobyteusLlmModelProvider`.
- Built-in providers do not all share identical configuration shapes (for example Gemini), so provider objects need a clean common shape plus provider-type-specific configuration handling where necessary.
- The provider browser/sidebar already renders provider labels directly, so ambiguous duplicate provider names would be a first-class UX ambiguity unless the backend enforces or projects one authoritative collision policy.

## Assumptions

- The user-approved direction is to keep the user-facing term **provider**.
- The stable runtime behavior field should be named `providerType`.
- The first user-created dynamic provider type in this ticket is `OPENAI_COMPATIBLE`.
- Keeping provider settings/model browser UX mostly intact is valuable; the backend should absorb most of the architectural cleanup.
- It is acceptable in this ticket for built-in providers to keep their existing at-rest storage paths while custom providers use a dedicated secret-bearing file store.
- The cleanest collision policy for this ticket is normalized unique-name validation rather than deterministic duplicate-label projection.

## Risks / Open Questions

- How much of the current in-progress endpoint-specific implementation should be removed outright versus renamed/reused under the provider-object design?
- Should custom-provider edit remain follow-up after delete is added now?
- Do all target OpenAI-compatible providers expose `/models`, or is manual model entry needed later?
- Is plaintext app-data secret persistence acceptable for the first dynamic-provider pass, or must secret storage be hardened immediately?

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| `R-001`, `R-002`, `R-003` | `UC-001`, `UC-002` |
| `R-004`, `R-005`, `R-006`, `R-007` | `UC-003`, `UC-004`, `UC-005`, `UC-006` |
| `R-008`, `R-009`, `R-018` | `UC-009` |
| `R-010`, `R-011`, `R-019` | `UC-001`, `UC-005`, `UC-007` |
| `R-012`, `R-013`, `R-014` | `UC-008`, `UC-012` |
| `R-015`, `R-016` | `UC-010` |
| `R-017` | `UC-011` |
| `R-021` | `UC-001`, `UC-005`, `UC-013` |
| `R-022` | `UC-001`, `UC-002`, `UC-007` |
| `R-023`, `R-024` | `UC-014` |
| `R-025`, `R-026` | `UC-015` |
| `R-020` | `UC-001` - `UC-015` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001`, `AC-002` | The provider browser remains intuitive while moving to provider objects |
| `AC-003`, `AC-004`, `AC-005` | Custom OpenAI-compatible providers behave like first-class providers |
| `AC-006`, `AC-007`, `AC-012` | Secret handling is write-only to the frontend and custom-provider persistence does not leak |
| `AC-008` | General selectors stay natural without source/source-kind awkwardness |
| `AC-009`, `AC-013` | Runtime behavior stays correct and official OpenAI remains distinct |
| `AC-010`, `AC-011` | Provider-targeted reload/sync remains durable and selector-visible |
| `AC-014` | The main architectural regressions are caught automatically |
| `AC-015` | The provider browser stays unambiguous because duplicate provider names are rejected before save |
| `AC-016` | The pre-task provider-centered API stays recognizable while its provider payload is upgraded |
| `AC-017` | Saved custom providers can be removed cleanly |
| `AC-018`, `AC-019` | Custom-provider model labels become human-friendly without changing built-in label behavior |

## Approval Status

`Core custom OpenAI-compatible support direction was user-approved on 2026-04-17. On 2026-04-17 the user explicitly redirected the architecture toward refactoring provider from an enum-only concept into a provider object with providerType, and approved taking that cleaner provider-object direction as the new upstream design basis.`
