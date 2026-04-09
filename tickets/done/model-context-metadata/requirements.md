# Requirements

## Status

- Current Status: `Refined`
- Previous Status: `Design-ready`
- Date: `2026-04-09`

## Goal / Problem Statement

The current model catalog path already depends on model-level token ceilings for compaction and budgeting, but the metadata is incomplete and often inaccurate:

- `LLMModel` carries `maxContextTokens`, but the exported `ModelInfo` contract does not expose it.
- several cloud models in the hardcoded catalog rely on an implicit `200000` fallback rather than provider-specific truth.
- local runtime discovery paths for LM Studio and Ollama list models without enriching them with runtime-specific context metadata.
- support policy and metadata sourcing are conflated in the current hardcoded registry, so adding or refreshing model token metadata requires editing the same behavioral catalog by hand.

Before implementing generic abort/cancel logic based on context budgets, the platform must first normalize and expose truthful model context metadata across the shared model contract, server API, and frontend consumer paths.

The refined direction is:

- keep a static supported-model registry so the product explicitly controls which models are exposed
- separate token/context metadata sourcing from that registry
- use provider-specific live metadata resolvers where the provider officially exposes trustworthy machine-readable fields
- keep curated official metadata or explicit unknowns for providers whose APIs do not expose those limits
- refresh the explicit supported cloud-model registry so it keeps only current officially supported cloud models and removes stale or deprecated entries

## Scope Classification

- Classification: `Medium`
- Rationale:
  - The ticket is cross-package across `autobyteus-ts`, `autobyteus-server-ts`, and `autobyteus-web`.
  - Provider-specific sourcing rules differ materially between local runtimes and cloud providers.
  - The work affects shared contracts and generated GraphQL/frontend types, but it remains bounded to metadata normalization rather than request execution semantics.

## In-Scope Use Cases

- `UC-000`: Audit how model context metadata is currently sourced, normalized, exported, and consumed.
- `UC-001`: A shared model-catalog consumer can read truthful maximum context metadata for a model when the provider/runtime exposes or the catalog curates it.
- `UC-002`: LM Studio discovered models expose both supported maximum context and active loaded context when LM Studio provides both.
- `UC-003`: Ollama discovered models expose model/runtime context metadata sourced from Ollama’s model detail API instead of list-only identity data.
- `UC-004`: Server and frontend model-catalog consumers receive the new metadata through the existing model info path.
- `UC-005`: Supported cloud models whose providers expose machine-readable token metadata, such as Kimi, Mistral, and Gemini, can resolve that metadata through provider-specific endpoints without hardcoding the token ceilings in the registry.
- `UC-006`: Docs-only or non-machine-readable providers such as OpenAI, DeepSeek, and Anthropic remain supported through curated official metadata where the platform has trustworthy values, and otherwise return explicit unknowns.
- `UC-007`: Token-budget and related downstream logic can use the normalized metadata path without depending on silent universal defaults.
- `UC-008`: Automated tests cover the expanded model contract and the affected provider normalization/mapping behavior.
- `UC-009`: The product does not auto-support every provider model returned by a live metadata endpoint; support allowlisting remains an explicit registry decision.
- `UC-010`: The supported cloud-model registry, provider defaults, and hardcoded live-test fixtures are refreshed to current official model IDs, and stale or deprecated cloud-model entries are removed.

## Out Of Scope / Non-Goals

- No implementation of generic request abort/cancel handling in this ticket.
- No LM Studio tool-streaming or tool-calling bug work.
- No full prompt token counting or exact live “remaining context” estimation service in this ticket.
- No requirement to fetch live metadata from every cloud provider at runtime when the official API does not expose the needed fields cleanly.
- No requirement to auto-register every provider model returned by a live model list endpoint.
- No guarantee that every provider will expose `maxInputTokens` or `maxOutputTokens`; those fields may remain unknown when the provider does not publish them reliably.
- No requirement to retain deprecated cloud-model IDs for backward compatibility once current supported replacements are identified.

## Acceptance Criteria

1. `AC-001`: The shared text-model metadata contract includes at least `maxContextTokens` and supports nullable optional fields for `activeContextTokens`, `maxInputTokens`, and `maxOutputTokens`.
2. `AC-002`: Truthful unknowns are represented as `null`/missing in the normalized contract instead of falling back to a universal hardcoded context limit that looks authoritative.
3. `AC-003`: LM Studio model discovery uses a metadata source that can populate `maxContextTokens` and `activeContextTokens` when the LM Studio runtime exposes them.
4. `AC-004`: Ollama model discovery uses a metadata source richer than list-only identity data and can populate `maxContextTokens` and, when available, a configured/runtime context value.
5. `AC-005`: The shared `ModelInfo` expansion is propagated through `autobyteus-server-ts` GraphQL types/mappers and through `autobyteus-web` query/store/generated-type consumers without breaking existing model-selection flows.
6. `AC-006`: The implementation separates supported-model registry ownership from metadata sourcing, so token-limit metadata is not hardcoded in the behavioral registry when a provider offers a trustworthy machine-readable metadata endpoint.
7. `AC-007`: The implementation uses a provider-appropriate sourcing strategy: native runtime/API discovery where it fits the existing discovery boundary and yields trustworthy metadata without degrading catalog availability, otherwise curated official metadata or explicit unknown values.
8. `AC-008`: Supported-model metadata resolution includes at least one cloud-provider dynamic path beyond local runtimes, with Kimi, Mistral, and Gemini treated as candidates where official endpoints expose the needed fields.
9. `AC-009`: Providers whose official model-list APIs are too thin, such as OpenAI and DeepSeek today, remain supported through curated official metadata or explicit unknown values instead of fake universal defaults.
10. `AC-010`: The token-budget path consumes the normalized model metadata and continues to behave safely when a model’s context metadata is unknown.
11. `AC-011`: Tests cover the expanded shared contract plus the affected provider normalization/mapping paths for local runtimes and any newly introduced cloud-provider metadata resolvers.
12. `AC-012`: The explicit supported cloud-model registry is refreshed to current official provider model IDs, and stale or deprecated cloud-model entries are removed from product support.
13. `AC-013`: Provider defaults, curated metadata keys, and hardcoded integration/live-test fixtures are updated so they no longer reference removed stale cloud-model IDs.

## Constraints / Dependencies

- Continue in the dedicated worktree:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/model-context-metadata`
- Finalization target defaults to:
  - `origin/personal`
- Respect unrelated uncommitted changes in other worktrees and do not modify them.
- The source of truth for text-model metadata should remain in `autobyteus-ts`; server and frontend should project/consume the normalized contract rather than invent provider-specific logic.
- Supported-model exposure policy should remain explicit; metadata discovery must not automatically broaden the product’s supported model set.
- The refreshed support policy should prefer current stable or currently recommended provider model IDs and should remove deprecated aliases when the official catalog indicates a newer replacement.
- Provider sourcing must use official provider/runtime metadata or curated official documentation in a provider-appropriate way; the design must not force model listing to depend on live authenticated provider calls when that would degrade availability or reliability.
- The design must not assume that OpenAI-compatible `/v1/models` is sufficient for providers that have richer native model list/detail endpoints.

## Assumptions

- `maxContextTokens` is the minimum viable normalized field and must be first-class.
- Local runtimes that distinguish “supported maximum context” from “currently loaded/configured context” should expose both values when available.
- `maxInputTokens` and `maxOutputTokens` should be optional fields populated only when the provider/runtime publishes them reliably.
- It is acceptable for some providers to remain curated rather than dynamically discovered when the official API does not expose the needed metadata.
- It is acceptable for the same overall registry to mix dynamic metadata resolvers and curated metadata entries, as long as the normalized output contract stays uniform.
- Existing hardcoded model identifiers may change in this ticket when the official provider catalog shows that the current supported entry is stale, deprecated, preview-only, or replaced by a newer current model.
- The latest-only support policy may still keep more than one model for a provider when those entries are all current and represent distinct product-relevant capability classes, such as flagship versus low-cost or reasoning versus non-reasoning.

## Open Questions / Risks

1. Should `activeContextTokens` be surfaced for all providers or only for local runtimes that actually expose a configured runtime window?
2. Which cloud providers should get live metadata resolvers in this ticket versus remain curated for now?
3. Should the normalized contract expose an explicit metadata-source indicator (`resolved`, `curated`, `unknown`) or is that unnecessary for current consumers?
4. How should existing downstream code behave when `maxContextTokens` becomes `null` for models that previously inherited the implicit `200000` fallback?
5. Which providers should keep multiple current model entries versus a single flagship entry under the latest-only support policy?

## Requirement IDs

- `R-000`: Rework the shared model-metadata path so truthful context metadata can flow from provider/runtime sources to server and frontend consumers.
- `R-001`: Normalize `maxContextTokens` as a first-class shared field and support nullable `activeContextTokens`, `maxInputTokens`, and `maxOutputTokens`.
- `R-002`: Replace silent universal context fallback behavior with truthful provider-specific values or explicit unknowns.
- `R-003`: Enrich LM Studio model discovery with LM Studio native context metadata.
- `R-004`: Enrich Ollama model discovery with per-model detail metadata needed for context limits.
- `R-005`: Keep supported-model registry ownership explicit and separate from metadata sourcing so support policy is not coupled to token-limit data maintenance.
- `R-006`: Add provider-specific metadata resolvers for providers whose official APIs expose machine-readable token/context limits and fit the existing discovery boundary.
- `R-007`: Preserve or improve support for curated cloud-provider catalogs for providers whose official APIs do not expose the needed metadata.
- `R-008`: Propagate the expanded metadata contract through server GraphQL and frontend query/store/generated-type consumers.
- `R-009`: Preserve safe token-budget behavior when metadata is known and when it remains unknown.
- `R-010`: Add automated validation for the expanded contract and affected discovery/mapping paths.
- `R-011`: Refresh the explicit supported cloud-model registry, provider defaults, and stale hardcoded fixtures to current official model IDs while removing deprecated cloud-model entries.

## Requirement To Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| `R-000` | `UC-000`, `UC-001`, `UC-004` |
| `R-001` | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-006` |
| `R-002` | `UC-001`, `UC-006` |
| `R-003` | `UC-002`, `UC-008` |
| `R-004` | `UC-003`, `UC-008` |
| `R-005` | `UC-005`, `UC-009` |
| `R-006` | `UC-005`, `UC-008` |
| `R-007` | `UC-006`, `UC-008` |
| `R-008` | `UC-004`, `UC-008` |
| `R-009` | `UC-007`, `UC-008` |
| `R-010` | `UC-008` |
| `R-011` | `UC-009`, `UC-010` |

## Acceptance-Criteria To Scenario Intent Mapping

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001` | Shared model info consumers can read normalized context/output metadata fields from one contract |
| `AC-002` | Models with unknown provider metadata no longer appear to have a fake authoritative context window |
| `AC-003` | Listing LM Studio models yields supported and loaded context metadata when the runtime reports them |
| `AC-004` | Listing Ollama models yields context metadata derived from `show` details rather than list-only identity |
| `AC-005` | GraphQL and frontend model-catalog consumers continue to work with the expanded contract |
| `AC-006` | Supported-model registry remains explicit while metadata is sourced independently |
| `AC-007` | Provider-specific sourcing follows official API/runtime capabilities instead of one forced strategy |
| `AC-008` | At least one supported cloud provider resolves token metadata dynamically from an official API |
| `AC-009` | Docs-only providers remain truthful through curated metadata or explicit unknowns |
| `AC-010` | Token-budget logic remains safe for both known and unknown metadata cases |
| `AC-011` | Automated tests fail if the shared contract or discovery/mapping logic regresses |
| `AC-012` | Supported cloud models are current official entries rather than stale or deprecated identifiers |
| `AC-013` | Provider defaults and hardcoded fixtures move in lockstep with the supported model registry refresh |
