# Investigation Notes

## Investigation Status

- Bootstrap Status: `Completed`
- Current Status: `Refined after user-approved provider-object architecture pivot, ARC-005 provider-name collision clarification, 2026-04-17 baseline-API reuse revision, and screenshot-driven custom-provider UX correction`
- Investigation Goal: `Determine the cleanest architecture for supporting custom OpenAI-compatible providers by refactoring the LLM provider model from enum-centric public contracts to provider objects with stable providerType behavior.`
- Scope Classification (`Small`/`Medium`/`Large`): `Large`
- Scope Classification Rationale:
  - The need still spans `autobyteus-web`, `autobyteus-server-ts`, and `autobyteus-ts`.
  - The user-approved pivot changes upstream architecture direction, not just one API shape.
  - The current task workspace already contains an in-progress endpoint-specific/source-aware implementation direction that the new design intentionally cleans up.
- Scope Summary: `Refactor LLM provider handling so provider becomes an object with stable providerType behavior, built-in providers become predefined provider objects, custom OpenAI-compatible connections become user-created provider objects, fixed-provider secret reads become write-only to the frontend, and the earlier source/source-kind overlay direction is removed from the public design.`
- Primary Questions Resolved / Being Resolved:
  - Is the core problem OpenAI-compatible HTTP transport, or the provider model? `Resolved: provider model`
  - Should the user-facing concept stay `provider`? `Resolved: yes`
  - What stable field should drive backend/runtime behavior? `Resolved: providerType`
  - Should the prior endpoint-specific/source-aware patch remain the target architecture? `Resolved: no`
  - Can this refactor keep the current provider-browser UX mostly intact? `Resolved: yes, if backend/API contracts are cleaned up`

## Request Context

- Original user request: `currently in the autobyteus-ts project, one user want us to support their custom open-ai compatible endpoint. Please analyse and help for this.`
- Earlier clarified UX direction:
  - settings should allow adding custom OpenAI-compatible entries,
  - users should be able to enter name + endpoint + API key,
  - users should be able to load models before saving,
  - multiple saved entries should be supported.
- Earlier upstream design direction (now superseded):
  - dedicated endpoint manager,
  - dedicated endpoint store,
  - source/source-kind overlay metadata for selectors.
- User-approved architecture pivot on 2026-04-17:
  - the prior patch felt awkward,
  - provider should remain the intuitive user-facing concept,
  - provider should become an object instead of a hard-coded enum-only public model,
  - a stable `providerType` field should drive backend/runtime behavior,
  - custom OpenAI-compatible entries should become user-created providers rather than a special overlay concept.
- Additional retained security direction:
  - raw provider API keys should not be returned to the frontend; configured-status semantics are sufficient.
- Additional user-approved UX correction on 2026-04-17:
  - saved custom providers must be removable,
  - custom-provider model labels should show friendly model names rather than the long internal custom-provider identifier string,
  - built-in provider label behavior can stay unchanged for now.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/tickets/in-progress/autobyteus-ts-custom-openai-compatible-endpoint-support`
- Current Branch: `codex/autobyteus-ts-custom-openai-compatible-endpoint-support`
- Bootstrap Base Branch: `origin/personal`
- Bootstrap Blockers: `None`
- Notes For Downstream Agents:
  - The authoritative upstream work remains in the dedicated task worktree.
  - The current task workspace contains in-progress implementation changes from the earlier endpoint-specific/source-aware direction; the new upstream design may intentionally remove or reshape parts of that work.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Repo`/`Issue`/`Command`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-17 | Command | `git status --short --branch && git worktree list && git remote show origin` | Confirm repo state, base branch, and whether a dedicated task worktree already existed | Current checkout was shared `personal`; no matching task worktree existed; remote HEAD branch is `personal` | No |
| 2026-04-17 | Command | `git fetch origin && git worktree add -b codex/autobyteus-ts-custom-openai-compatible-endpoint-support ... origin/personal` | Perform mandatory bootstrap isolation | Dedicated task worktree/branch created successfully from refreshed `origin/personal` | No |
| 2026-04-17 | Code | `autobyteus-ts/src/llm/api/openai-compatible-llm.ts` | Verify whether protocol support already exists | Chat-completions transport, streaming, and OpenAI-style tool-call normalization already exist | No |
| 2026-04-17 | Code | `autobyteus-ts/src/llm/api/openai-llm.ts`, `autobyteus-ts/src/llm/api/openai-responses-llm.ts` | Compare official OpenAI path to generic OpenAI-compatible path | Official OpenAI models use Responses API, not chat completions | No |
| 2026-04-17 | Code | `autobyteus-web/components/settings/ProviderAPIKeyManager.vue`, `autobyteus-web/components/settings/providerApiKey/ProviderModelBrowser.vue`, `autobyteus-web/components/settings/providerApiKey/ProviderApiKeyEditor.vue`, `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts` | Inspect the existing provider UX and whether it already behaves like a provider-object browser | The UI already behaves like a provider list + selected provider panel; it maps naturally to provider objects | No |
| 2026-04-17 | Code | `autobyteus-web/stores/llmProviderConfig.ts`, `autobyteus-web/graphql/queries/llm_provider_queries.ts`, `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | Inspect current GraphQL/store contracts | The public contract is still centered on provider enums/strings; the newer branch added extra source/source-kind overlays to compensate | Yes |
| 2026-04-17 | Code | `origin/personal:autobyteus-server-ts/src/api/graphql/types/llm-provider.ts`, `origin/personal:autobyteus-web/stores/llmProviderConfig.ts`, `origin/personal:autobyteus-web/graphql/queries/llm_provider_queries.ts` | Recheck the pre-task provider-centered baseline the user wants as the reference | The baseline already had intuitive provider-centered APIs (`availableLlmProvidersWithModels`, `ProviderWithModels`, `reloadLlmProviderModels`, `providersWithModels`) and did not need the later source-aware public additions | No |
| 2026-04-17 | Code | `autobyteus-ts/src/llm/providers.ts`, `autobyteus-web/types/llm.ts` | Inspect current provider typing | Current `LLMProvider` is an enum in both runtime and web layers, which is the root rigidity problem for public provider modeling | Yes |
| 2026-04-17 | Code | `autobyteus-ts/src/llm/models.ts` | Inspect current model identity/provider metadata | The in-progress branch added `providerInstance` and `modelSource` metadata overlays because the provider model itself was too rigid | Yes |
| 2026-04-17 | Code | `autobyteus-ts/src/llm/llm-factory.ts` | Inspect registry and reload assumptions | Registry still centers on provider enum keys; custom OpenAI-compatible sync is currently patched in under `OPENAI_COMPATIBLE` | Yes |
| 2026-04-17 | Code | `autobyteus-server-ts/src/api/graphql/types/openai-compatible-endpoint.ts`, `autobyteus-server-ts/src/llm-management/openai-compatible-endpoints/services/openai-compatible-endpoint-service.ts`, `autobyteus-server-ts/src/llm-management/openai-compatible-endpoints/domain/models.ts` | Inspect the current in-progress endpoint-specific branch | The current branch split custom OpenAI-compatible handling into a parallel endpoint subject instead of cleaning up the provider object model | Yes |
| 2026-04-17 | Code + Screenshot | User-provided screenshots plus `autobyteus-web/components/settings/ProviderAPIKeyManager.vue`, `autobyteus-web/components/settings/providerApiKey/ProviderModelBrowser.vue`, `autobyteus-web/utils/modelSelectionLabel.ts`, `autobyteus-ts/src/llm/openai-compatible-endpoint-model.ts`, `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts`, `autobyteus-server-ts/src/llm-management/llm-providers/stores/custom-llm-provider-store.ts`, `autobyteus-web/graphql/mutations/llm_provider_mutations.ts` | Explain the two concrete UX issues reported from the in-progress app state | Custom-provider delete is not implemented anywhere end-to-end, and custom-provider model UIs are showing internal unique identifiers because the identifier builder includes `openai-compatible:${providerId}:...` and the frontend is rendering `modelIdentifier` instead of a friendlier custom-provider label | No |
| 2026-04-17 | Code | `autobyteus-ts/src/llm/openai-compatible-endpoint-config.ts`, `autobyteus-ts/src/llm/openai-compatible-endpoint-model.ts` | Inspect the current in-progress persisted/runtime shapes | The current branch uses endpoint-specific naming and source metadata; those shapes are candidates for generalization or removal under the provider-object refactor | Yes |
| 2026-04-17 | Code | `autobyteus-server-ts/src/services/server-settings-service.ts`, `autobyteus-server-ts/src/config/app-config.ts` | Reconfirm secret persistence constraints | Generic Server Settings still expose non-`*_API_KEY` settings; built-in provider API keys are still persisted through `${PROVIDER}_API_KEY` settings | No |
| 2026-04-17 | Code | `autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts`, `autobyteus-server-ts/src/llm-management/services/autobyteus-model-catalog.ts`, `autobyteus-server-ts/src/llm-management/providers/cached-autobyteus-llm-model-provider.ts`, `autobyteus-server-ts/src/llm-management/providers/autobyteus-llm-model-provider.ts` | Reconfirm the real selector-serving cache path | Selector-visible model data still flows through the cached Autobyteus catalog path; provider refactor must preserve that authoritative refresh path | No |
| 2026-04-17 | Doc | `tickets/in-progress/autobyteus-ts-custom-openai-compatible-endpoint-support/design-review-report.md` | Record the state of the earlier design-review loop | The earlier endpoint-specific/source-aware design passed round 3, but the user then explicitly changed the architecture direction to a cleaner provider-object refactor | No |
| 2026-04-17 | Doc | `tickets/in-progress/autobyteus-ts-custom-openai-compatible-endpoint-support/design-review-report.md` (round 5) | Capture the one remaining blocker against the provider-object direction | The only remaining blocker is provider-name collision/disambiguation; the review explicitly asks for one authoritative policy for duplicate custom names and collisions with built-in provider names | No |

## Current Behavior / Current Flow

- Current first observable boundaries:
  - Frontend: `ProviderAPIKeyManager.vue`
  - Backend GraphQL: `LlmProviderResolver`
  - Runtime registry: `LLMFactory`
- Current user-facing flow:
  - the settings UI lists providers in a sidebar,
  - the selected provider shows models and configuration UI,
  - save/reload behavior is driven by provider selection.
- Current architectural mismatch:
  - public/provider-facing UX already feels provider-object oriented,
  - but the underlying contracts are still enum-centric,
  - so custom OpenAI-compatible support had to be patched in via endpoint-specific APIs and source/source-kind overlays.
- Additional confirmed current-state facts:
  - fixed-provider secrets were previously returned to the frontend even though the UI only needs configured status,
  - custom secret-bearing records still cannot go through generic Server Settings,
  - selector-visible model updates still require the real cached catalog refresh path,
  - official OpenAI remains a different runtime path from generic OpenAI-compatible providers.

## Findings From Code / Docs / Data

- The main problem is not raw OpenAI-compatible invocation; it is the mismatch between the requested feature and the current enum-centric provider model.
- The current provider browser UX is already intuitive; the architecture became awkward because the backend/runtime model was too rigid, not because the frontend concept of provider was wrong.
- The current source/source-kind/provider-instance overlay direction is a compensating patch for that rigidity, not the clean target model.
- The user-approved cleaner direction is:
  - keep the user-facing concept **provider**,
  - add a stable `providerType`,
  - make built-in providers predefined provider objects,
  - make custom OpenAI-compatible entries user-created provider objects.
- The provider-object model would naturally absorb the earlier fixed-provider write-only secret hardening, because provider objects can expose `apiKeyConfigured` directly.
- The cleanest public refactor is to keep the pre-task provider-centered API shape and upgrade its returned provider payload, rather than introducing brand-new top-level provider/source query names.
- The current in-progress branch has no remove/delete lifecycle for custom providers: no delete GraphQL mutation, no delete service method, no delete store method, and no remove control in the custom-provider detail UI.
- The current in-progress branch leaks custom-provider internal identifiers into both API Key Management and runtime model dropdowns because the custom model identifier is built as `openai-compatible:${providerId}:${modelName}` and the frontend currently renders `modelIdentifier` for those surfaces.
- The user-approved display target is narrower than a full relabeling pass: built-in provider label behavior can stay as-is, but custom-provider models should use friendly model names while keeping the full identifier as the internal stored selection value.
- Unique model identity is still required internally, but the public API no longer needs a second user-facing `source` concept if models are nested under providers.
- The current provider browser renders provider names directly in the sidebar and selected-provider header, so once provider becomes the primary public subject, duplicate provider names would create first-class UX ambiguity.
- The cleanest way to keep the provider-object design intuitive is to reserve built-in provider names and reject normalized duplicate custom-provider names instead of reintroducing a second public disambiguation concept.
- The current task branch already contains some useful pieces that may be reusable under new names/owners:
  - dedicated secret-bearing file persistence pattern,
  - OpenAI-compatible probe/discovery logic,
  - per-provider/per-endpoint reload status logic,
  - cache-consistent refresh path.
- The in-progress branch also contains pieces likely to be removed or folded back into the provider object model:
  - endpoint-specific GraphQL subject,
  - dedicated `openAiCompatibleEndpoints` public API,
  - `providerInstance` / `modelSource` public overlays.
- The user explicitly wants the refactor judged against the pre-task baseline rather than against the current patched branch, so design reuse should start from the earlier provider-centered contracts and only change return shapes/internal ownership where needed.

## Constraints / Dependencies / Compatibility Facts

- Official OpenAI must remain distinct from generic OpenAI-compatible runtime behavior.
- `OpenAICompatibleLLM` should remain the reusable transport/runtime implementation for generic OpenAI-compatible providers.
- Current built-in providers do not all share one identical configuration schema (for example Gemini), so the provider-object refactor must preserve provider-type-specific settings behavior where needed.
- Built-in provider secret persistence may remain where it is for this ticket, but raw read-back to the frontend must not remain.
- The real catalog-serving path still goes through `ModelCatalogService -> AutobyteusModelCatalog -> CachedAutobyteusLlmModelProvider`; the provider-object refactor must not bypass it.
- The task workspace already contains in-progress implementation code from the superseded design direction; implementation will need a deliberate removal/rename plan, not another incremental patch.

## Open Unknowns / Risks

- How much of the current in-progress branch should be deleted outright versus retained under renamed generic provider ownership.
- Whether custom-provider edit should remain follow-up once delete is added.
- Whether `/models` fallback/manual model entry is needed later.
- Whether plaintext app-data secret persistence is acceptable for the first dynamic-provider pass.

## Notes For Architecture Reviewer

- The earlier endpoint-specific/source-aware design is intentionally superseded by a user-approved upstream architecture pivot.
- The new review should judge whether the provider-object architecture is cleaner and more coherent than the prior source/source-kind patch direction.
- The revised package should be checked specifically for:
  1. **Provider object clarity**: provider is the primary user-facing subject; `providerType` is the stable behavior discriminator.
  2. **Removal of awkward overlays**: the public design should no longer require a user-facing source/source-kind concept for LLM providers.
  3. **Provider-targeted lifecycle coherence**: list/probe/save/reload should all center on provider objects instead of a mix of provider enums and endpoint-specific side subjects.
  4. **Secret handling**: fixed-provider and custom-provider frontend flows must remain write-only for secrets.
  5. **Provider-name uniqueness**: built-in provider names should be reserved and normalized duplicate custom-provider names should be rejected before save so the provider browser remains unambiguous.
  6. **Baseline API reuse**: the design should reuse earlier provider-centered contracts such as `availableLlmProvidersWithModels` / `ProviderWithModels` where they still fit, instead of inventing unnecessary replacement APIs.
  7. **Delete lifecycle completeness**: saved custom providers should be removable end-to-end, including persistence removal and authoritative selector-visible refresh after delete.
  8. **Custom-only label correction**: custom-provider model labels should become human-friendly without regressing current built-in provider label behavior.
  9. **Cache coherence**: the cleaner provider model must still preserve the real cached catalog-serving refresh path.
- Keep official OpenAI Responses behavior isolated from generic OpenAI-compatible providers.
