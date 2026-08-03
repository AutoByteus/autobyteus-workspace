# Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete` — dedicated ticket worktree and branch created from refreshed `origin/personal`; requirements started as `Draft`.
- Current Status: `Reworked after ARCH-REV-001 Design Impact; the user-approved fallback remains unchanged, and the source/index/normalization contracts are now explicit for architecture re-review.`
- Investigation Goal: Trace custom-provider model discovery through catalog, server projection, runtime token-budget calculation, and token UI; probe the configured Alibaba endpoint without exposing its credential; determine whether context metadata is missing in our code, absent from the provider contract, or both.
- Scope Classification (`Small`/`Medium`/`Large`): `Medium`
- Scope Classification Rationale: The root cause is localized to the existing model metadata spine, but the fix crosses shared LLM metadata, custom endpoint discovery, server enrichment, GraphQL provenance, frontend unknown-state rendering, and durable coverage.
- Scope Summary: The user's endpoint returns model identifiers but no context metadata in `/models`. Custom discovery also discards optional metadata from other compatible gateways. After the branch refresh, server enrichment already preserves existing model values; the remaining gap is trustworthy metadata resolution before custom `LLMModel` construction. The target is layered endpoint capture, exact canonical endpoint/profile matching, an exact `SupportedModelDefinition.value` fallback index when higher-precedence data is absent, mandatory non-secret source propagation through catalog projection, existing-runtime reuse, and a truthful unknown state when no exact match exists.
- Primary Questions To Resolve:
  1. What exact fields does custom discovery capture today?
  2. What does the configured Alibaba Cloud endpoint actually return?
  3. How does context metadata reach the screenshot's Token Meter?
  4. Is there a universal metadata endpoint for arbitrary OpenAI-compatible providers?
  5. Can Alibaba's documented model metadata be safely applied to this endpoint family?
  6. Does the change affect persisted custom-provider configuration?

## Request Context

The user reports that a Product Prototyper agent using a configured Alibaba Cloud custom provider shows token usage but no context information. The user suspects either that all models expose a metadata endpoint or that the custom provider already returns metadata which Autobyteus fails to capture. The supplied screenshot shows usage totals and a custom model identifier beginning `openai-compatible:provider_...`; the context section is absent.

The live probe below was performed against the user's configured endpoint on the local server. The API key was resolved in-process through the existing secret-vault runtime and was never printed, stored in an artifact, or sent to a shell command.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata`
- Current Branch: `codex/custom-provider-model-context-metadata`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed before worktree creation; worktree base was `34f3fe97a` (`docs(delivery): complete v1.4.29 cleanup handoff`).
- Latest Solution Refresh: On 2026-08-01, the dedicated branch was fast-forwarded to current `origin/personal` at `d5618bffd` (`docs(memory): record v1.4.35 delivery`) before the requirements/design reconciliation. The ticket artifacts remained untracked and isolated in this worktree.
- Task Branch: `codex/custom-provider-model-context-metadata`
- Expected Base Branch (if known): `personal` / tracked `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: `None`
- Notes For Downstream Agents: The user's shared checkout was dirty and remains untouched. All authoritative artifacts and future implementation changes belong in this dedicated worktree.

## Supplemental Task Artifact Inventory

No supplement has been promoted. The live probe result is sanitized and durable enough in this note; the credential-bearing setup and raw response are intentionally not retained as a separate file.

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | N/A | N/A | N/A | N/A |

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-30 | Setup | `git fetch origin --prune`; `git worktree add -b codex/custom-provider-model-context-metadata ... origin/personal` | Establish isolated task workspace from fresh tracked base | Dedicated branch/worktree created successfully at `34f3fe97a` | No |
| 2026-08-01 | Setup | `git merge --ff-only origin/personal` in the dedicated task worktree | Reconcile the solution with the latest tracked base before approval | Fast-forwarded `34f3fe97a..d5618bffd`; no tracked task changes were overwritten | No |
| 2026-08-01 | Code/Doc | `autobyteus-ts/src/llm/supported-model-definition.ts`; `supported-model-definitions.ts`; `supported-model-static-metadata.ts`; `metadata/model-metadata-resolver.ts`; `docs/provider_model_catalogs.md` | Re-read the current static-metadata ownership after base refresh | Each built-in supported definition now owns source-attributed `staticMetadata`; the resolver applies live then static then unknown per field; `activeContextTokens` stays dynamic | No |
| 2026-08-01 | Code | `autobyteus-server-ts/src/llm-management/services/model-metadata-provisioning-service.ts` at `d5618bffd` | Revalidate the earlier null-clearing finding | The service now wraps existing `ModelInfo` values as static fallback and resolves per field, so an unsupported custom provider no longer clears a non-null custom model field | No |
| 2026-08-01 | Code | `autobyteus-ts/src/agent/token-budget.ts`; `autobyteus-ts/src/agent/loop/llm-phase.ts`; `llm-phase-compaction.ts` | Revalidate the exact compaction blocker after the memory/compaction refresh | Runtime already derives capacity from override, active context, max context, then max input; supplying custom model metadata before runtime construction is sufficient and no compaction algorithm change is needed | No |
| 2026-08-01 | Code/Web | `autobyteus-ts/src/llm/api/qwen-llm.ts`; [Alibaba Token Plan Team quick start](https://www.alibabacloud.com/help/en/model-studio/token-plan-team-quickstart); [Alibaba OpenAI-compatible Chat](https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope) | Explain why the built-in Qwen URL differs from the configured Alibaba endpoint | Built-in Qwen targets the still-supported legacy Singapore pay-as-you-go gateway `dashscope-intl`; Token Plan is a separately billed/entitled gateway at `token-plan.ap-southeast-1.maas.aliyuncs.com`. Alibaba requires plan-specific keys and base URLs to be used as matching pairs. Current pay-as-you-go docs recommend workspace-specific regional domains while stating the legacy domain remains functional. | No design change; reinforces compound endpoint-plan identity |
| 2026-07-30 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/design-principles.md` | Apply shared design and evidence rules | Spine-first ownership, truthful unknown metadata, no speculative reachability, explicit persisted-data decision | No |
| 2026-07-30 | Code | `autobyteus-ts/src/llm/openai-compatible-endpoint-discovery.ts` | Verify the custom endpoint contract and normalizer | Discovery calls `{baseUrl}/models`; current DTO and mapper retain only identifier fields | No |
| 2026-07-30 | Code | `autobyteus-ts/src/llm/openai-compatible-endpoint-model.ts`; `openai-compatible-endpoint-provider.ts`; `llm-factory.ts` | Trace discovery-to-runtime model construction | Custom model constructor leaves shared metadata nullable; provider reload and factory preserve the existing stale/error lifecycle | No |
| 2026-07-30 | Code | `autobyteus-server-ts/src/llm-management/services/custom-llm-provider-runtime-sync-service.ts`; `llm-provider-service.ts`; custom provider store | Verify server entrypoint, credential boundary, persistence, and probe API | Server resolves the secret, probes `/models`, syncs runtime models, and persists only provider id/name/type/base URL | No |
| 2026-07-30 | Code | `autobyteus-ts/src/llm/models.ts`; then-current `metadata/model-metadata-resolver.ts`; then-current `curated-model-metadata.ts` at base `34f3fe97a` | Inspect shared metadata/provenance capabilities | Nullable context/input/output fields existed; provider strategies were provider-specific and no `OPENAI_COMPATIBLE` strategy existed. The curated file was later removed by the refreshed base. | Re-read completed on 2026-08-01 |
| 2026-07-30 | Code | Then-current `model-metadata-provisioning-service.ts` and `model-catalog-service.ts` at base `34f3fe97a` | Trace server enrichment | The older service assigned resolver values directly and could clear custom values. This finding was superseded by base commit `544cc980d`, which introduced per-field live/static resolution. | Superseded; no implementation change now required |
| 2026-07-30 | Code | `autobyteus-ts/src/agent/token-budget.ts`; `autobyteus-ts/src/agent/loop/llm-phase.ts`; token usage server projections | Trace effective context capacity into usage summary | Capacity is derived from active override, model active context, or model max context; null propagates to the usage summary | No |
| 2026-07-30 | Code | `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue`; `token_usage_meter_queries.ts`; `TokenUsageMeterPanel.spec.ts` | Verify the screenshot's UI condition and existing coverage | The context card requires a non-null denominator and is otherwise omitted; token totals remain visible | No |
| 2026-07-30 | Data | `/Users/normy/.autobyteus/server-data/llm/custom-llm-providers.json` | Inspect the user's real persisted custom-provider record | Version 2 record contains `provider_25bbbdb1e3af4f4d958c597a3577d1fa`, name `alibaba_cloud`, type `OPENAI_COMPATIBLE`, and base URL `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`; no metadata is persisted | No |
| 2026-07-30 | Probe | Authenticated request to `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/models` through the existing secret-vault runtime | Determine whether the user's provider returns metadata | HTTP 200 JSON; nine model rows; each inspected row contains only `created`, `id`, `object`, `owned_by`; no context/input/output limit fields | No |
| 2026-07-30 | Probe | Authenticated request to the same endpoint with a trailing `/models/` path | Avoid assuming a slash variant is a metadata endpoint | HTTP 400 with `code`, `message`, and `request_id`; no alternate contract adopted | No |
| 2026-07-30 | Trace | GraphQL `getAgentRunTokenUsageSummary(runId: "product_prototyper_5e5dfa42520d455a80e1a7e86ef41dc3")` against `http://127.0.0.1:29695/graphql` | Verify the exact live run state behind the screenshot | `latestPromptTokens=67772`, `effectiveContextWindowTokens=null`, `contextWindowUsagePercent=null`, latest model `qwen3.8-max-preview`, 22 usage reports | No |
| 2026-07-30 | Data/Trace | Read the five most recent `raw_usage_json` values from the local `token_usage_ledger_events` rows for run `product_prototyper_5e5dfa42520d455a80e1a7e86ef41dc3` | Verify whether a successful Alibaba completion response carries context-limit metadata in its usage object | Raw usage contains `prompt_tokens`, `completion_tokens`, `total_tokens`, cached/text token details, and reasoning details; it contains no context-window or maximum-limit field | No |
| 2026-07-30 | Probe | One direct `POST {baseUrl}/chat/completions` using the existing vault-resolved credential, model `qwen3.8-max-preview`, one short message, `max_tokens: 1`, and `stream: false`; output was restricted to status and JSON keys/usage | Directly verify the fresh OpenAI-compatible completion response rather than relying only on stored ledger data | HTTP 200; top-level keys are `choices`, `created`, `id`, `model`, `object`, `usage`; usage keys are `completion_tokens`, `completion_tokens_details`, `prompt_tokens`, `prompt_tokens_details`, `total_tokens`; no context-window/max-limit field | No |
| 2026-07-30 | Trace | GraphQL `availableLlmProvidersWithModels(runtimeKind: "autobyteus")` against the local server | Verify current catalog projection | Alibaba custom provider is READY; nine models expose null context/input/output metadata and `metadataProvenance=CURATED_ONLY` | No |
| 2026-07-30 | Web | `https://help.aliyun.com/en/model-studio/text-generation-model/` | Check current Alibaba model context documentation | Official table lists qwen3.7/deepseek current models at 1M and glm-5.2 at 198k; qwen3.8 is identified as Token Plan only but not given a context number on this page | Yes: profile source should use the more specific QwenCloud table for qwen3.8 |
| 2026-07-30 | Web | `https://docs.qwencloud.com/developer-guides/getting-started/text-generation-models` | Find a first-party model table for the exact Token Plan model | Official QwenCloud table lists `qwen3.8-max-preview` at 1M, plus qwen3.7, qwen3.6-flash, and deepseek-v4-pro at 1M; it distinguishes exact model IDs and Token Plan availability | No |
| 2026-07-30 | Web | `https://help.aliyun.com/en/model-studio/token-plan-team-quickstart` | Verify endpoint family and plan separation | Token Plan uses a dedicated OpenAI-compatible base URL and credentials; Token Plan, Coding Plan, and pay-as-you-go endpoints/keys are isolated | No |
| 2026-07-30 | Web | `https://help.aliyun.com/en/model-studio/model-deployment-api` | Check whether a vendor API exposes context metadata | Deployment management responses can expose `max_context_length`, but that is for deployed models and is not the generic Token Plan `/models` contract | No |
| 2026-08-03 | User evidence/Web | Supplied Alibaba model catalog screenshot showing `deepseek-v4-flash-0731` and `deepseek-v4-pro`; [DeepSeek Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing); [DeepSeek Create Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion) | Determine how a provider wire ID that differs from the built-in DeepSeek ID should be handled | Alibaba exposes the wire ID `deepseek-v4-flash-0731`; official DeepSeek documentation uses canonical IDs `deepseek-v4-flash` and `deepseek-v4-pro` and documents 1M context. The suffix may represent a dated/revisioned wire ID, but identifier similarity alone is not proof of endpoint equivalence. | Yes: add an explicit endpoint-profile alias/reference case, not automatic suffix stripping |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | User saves an OpenAI-compatible custom provider and selects a model discovered from it. | Saved provider -> server credential resolution -> `OpenAICompatibleEndpointDiscovery.probeEndpoint` -> `LLMFactory.syncOpenAICompatibleEndpointModels` -> `OpenAICompatibleEndpointModel` -> shared registry/catalog -> agent `createLLM`. | Valid IDs remain discoverable, selectable, and runnable; custom model metadata is null because the discovery/model boundary carries no optional metadata. | Discovery/model source read; live GraphQL catalog; live `/models` probe. |
| BEH-002 | Contract | OpenAI-compatible provider responds to `GET {baseUrl}/models` as an array, `{data: []}`, or `{models: []}`. | HTTP response -> JSON -> `extractModelsArray` -> `extractModelId` (`id`, `name`, `model`) -> sorted/deduplicated identifier rows. | Identifier normalization is resilient; arbitrary extra fields are discarded; optional metadata is not part of the current normalized contract. | `openai-compatible-endpoint-discovery.ts:59-115`; live response keys. |
| BEH-003 | System | Model catalog is listed/refreshed for a runtime. | `LLMModel.toModelInfo` -> `ModelCatalogService.listModels` -> `ModelMetadataProvisioningService.enrichBestEffort` -> GraphQL `ModelDetail`. | At refreshed base `d5618bffd`, per-field resolution uses the model's existing numeric values as static fallback; unsupported custom providers remain unknown only because their constructed model has no values. Existing known fields are preserved. | Current `model-metadata-provisioning-service.ts:22-66`; refreshed source read; live GraphQL evidence predates the source refresh and still shows all-null input rows. |
| BEH-004 | System | Agent receives a provider response with token usage. | LLM phase resolves `TokenBudget` -> emits `effective_context_window_tokens` and usage -> server ledger/projection -> GraphQL token summary -> `TokenUsageMeterPanel`. | Prompt and total usage are preserved; context percentage is null when capacity is unknown. | `token-budget.ts:38-97`; live run GraphQL summary; UI `hasCurrentPrompt`. |
| BEH-005 | Contract | User-visible token panel receives a run summary. | `TokenUsageMeterPanel` renders the context section only if denominator, latest prompt, and percentage are all non-null. | Unknown context is silently absent rather than explicitly explained. | `TokenUsageMeterPanel.vue:11-24,225-227`; existing component tests. |

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Bug Fix / Behavior Change`
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Missing Invariant` plus targeted `Boundary Or Ownership Issue`
- Refactor posture evidence summary: Existing owners are correctly placed. The parser owns external normalization, the endpoint model owns shared model construction, supported definitions own built-in static facts, the provisioning service owns server enrichment, and the token meter owns presentation. The refreshed base already fixed field preservation. The remaining missing boundary is compound endpoint/model resolution before custom model construction; a broad refactor would add risk without improving ownership.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-discovery.ts` | The discovered-model type has only `id`, `name`, `value`, and `canonicalName`; the mapper discards all other object fields. | Local capture gap exists for compatible gateways that do advertise metadata. Extend this boundary rather than creating a parallel catalog. | Define supported aliases and validation in the design. |
| Authenticated Alibaba `/models` probe | The actual payload has no context/input/output fields. | The user's exact absence is a provider-contract limitation, not only an Autobyteus capture bug. A generic parser alone cannot solve qwen3.8. | Use a verified endpoint profile, then an exact built-in inferred fallback where available, otherwise retain unknown. |
| Current `model-metadata-provisioning-service.ts` at `d5618bffd` | Enrichment resolves live/static/unknown per field and uses the model's existing numeric values as static fallback. | The earlier null-clearing defect has already been removed upstream; this task must preserve and regression-test the current behavior, not redesign it. | No server merge implementation change unless source propagation proves insufficient. |
| `TokenUsageMeterPanel.vue` | Unknown denominator suppresses the context card entirely. | UI gives no explanation for a known usage/unknown limit state. | Add explicit unknown state without fake percentage. |
| Existing `LLMModel`, `ResolvedModelMetadata`, definition `staticMetadata`, and GraphQL numeric fields | Shared nullable numeric fields and internal per-field provenance already exist; custom models simply do not populate them. | No parallel general metadata schema is necessary. | Reuse the current shapes and preserve coarse GraphQL provenance truthfully. |
| Qwen metadata comparison | Built-in `qwen3.7-max` records 262,144 context tokens, while the investigated Token Plan docs label the same ID as 1M. | Model ID alone is not authoritative across plans, but an exact built-in value is still useful as a marked best-effort fallback when no endpoint/profile data exists. | Require compound endpoint family/path plus exact model ID for authoritative profiles; then permit exact built-in fallback with inferred provenance; plan-specific overrides win. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-discovery.ts` | Custom `/models` HTTP request and response normalizer | Identifier-only mapping; timeout and payload-shape handling are already centralized. | Own optional metadata alias parsing and endpoint-profile application; preserve its existing best-effort boundary. |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-model.ts` | Convert normalized discovery rows to `LLMModel` | No context/input/output constructor values are passed. | Map the normalized shared metadata fields and source/provenance. |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-provider.ts` | Reload per-endpoint models and preserve stale models | Failed probes preserve last-known-good rows. | Carry metadata on both fresh and stale rows; do not change status semantics. |
| `autobyteus-ts/src/llm/models.ts` | Shared model metadata and `ModelInfo` projection | Nullable max/active/input/output fields already exist; `toModelInfo()` is the common projection but currently drops resolved source. | Add one generic non-secret `resolved_model_metadata` projection using the shared source union; do not add provider-specific fields here. |
| `autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts` | Per-field live/static/unknown resolution | Current strategies are provider-specific; the resolver requires explicit static metadata and has no custom endpoint strategy. | Reuse its `ResolvedModelMetadata` field/source shape; do not make it infer endpoint identity. |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` and `supported-model-definition.ts` | Built-in selectable model definitions and their source-attributed static metadata | A built-in definition is the canonical fact owner for that supported provider/model, but custom-only or plan-specific models do not belong in this list merely to supply metadata. | An endpoint profile may reference exact `{provider, value}`; the separate fallback index may match only exact `value` and must not use the generic multi-key lookup. |
| `autobyteus-server-ts/src/llm-management/services/custom-llm-provider-runtime-sync-service.ts` | Secret resolution, custom probe, runtime sync/status | Correct credential boundary; should not parse vendor payload or log keys. | Pass endpoint context to the discovery/profile owner only. |
| `autobyteus-server-ts/src/llm-management/services/model-metadata-provisioning-service.ts` | Server best-effort catalog enrichment | Refreshed implementation already preserves model numeric fields as static fallback and keeps active context unchanged. | Preserve this owner and add regression proof; only extend source projection if required for truthful existing provenance values. |
| `autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts` | List/reload catalog and invoke enrichment | Existing reload is the natural recomputation boundary. | Keep refresh orchestration; do not introduce a second catalog. |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | GraphQL model projection and provenance enum | Nullable metadata fields already exposed. | Preserve API shape; extend enum only if profile/discovery provenance needs an explicit durable value. |
| `autobyteus-ts/src/agent/token-budget.ts` / `agent/loop/llm-phase.ts` | Resolve effective context and emit usage fields | Correctly propagates null when capacity is unknown. | Keep runtime fallback-free; verify endpoint/profile metadata and exact built-in inferred metadata reach this path, while unmatched custom models remain null. |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Token-meter layout and known/unknown rendering | `hasCurrentPrompt` hides the context section when capacity is null. | Add a distinct unknown-capacity state while preserving known meter behavior. |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Frontend component coverage | Has known-context fixtures and unknown token values but no explicit unknown-context UI assertion. | Add known/unknown state assertions. |
| `/Users/normy/.autobyteus/server-data/llm/custom-llm-providers.json` | Persisted custom-provider records | No model metadata stored; version 2 reader/writer owns endpoint identity only. | No migration; derived metadata remains derived. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-30 | Probe | Read the saved provider record, resolve its `llmMetadata`/`apiKey` secret through the existing `SecretVaultRuntime`, then issue `GET https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/models` with `Authorization: Bearer <in-process secret>` and `Accept: application/json`. | HTTP 200; top-level keys `data`, `first_id`, `has_more`, `last_id`, `object`; nine models. Every model object inspected has only `created`, `id`, `object`, `owned_by`. | There is no context metadata in this endpoint response for the parser to capture. |
| 2026-07-30 | Probe | Repeat the request against `{baseUrl}/models/`. | HTTP 400; body keys `code`, `message`, `request_id`. | Do not add slash-variant probing or treat it as a metadata route. |
| 2026-07-30 | Trace | POST the sanitized token-summary GraphQL query for run `product_prototyper_5e5dfa42520d455a80e1a7e86ef41dc3` to local port `29695`. | `latestPromptTokens=67772`; `effectiveContextWindowTokens=null`; `contextWindowUsagePercent=null`; latest model `openai-compatible:provider_25bbbdb1e3af4f4d958c597a3577d1fa:qwen3.8-max-preview`; `usageReportCount=22`. | The UI omission is driven by the null effective capacity, not a missing prompt count or GraphQL field. |
| 2026-07-30 | Trace | Query `availableLlmProvidersWithModels(runtimeKind: "autobyteus")` for the live catalog. | Alibaba provider is READY; nine custom model rows all expose null max/active/input/output metadata and `CURATED_ONLY` provenance. | Confirms the catalog state shown by the user and identifies the server enrichment result. |

### Sanitized Alibaba model IDs observed

`deepseek-v4-pro`, `glm-5.2`, `qwen-audio-3.0-tts-plus`, `qwen3.6-flash`, `qwen3.7-max`, `qwen3.7-plus`, `qwen3.8-max-preview`, `wan2.7-image`, `wan2.7-image-pro`.

No API key, authorization header, raw response body, or secret-vault ciphertext is retained in this artifact.

## External / Public Source Findings

- Public API / spec / issue / upstream source: [Alibaba text generation models](https://help.aliyun.com/en/model-studio/text-generation-model/), [QwenCloud text generation models](https://docs.qwencloud.com/developer-guides/getting-started/text-generation-models), [Alibaba Token Plan quick start](https://help.aliyun.com/en/model-studio/token-plan-team-quickstart), and [Alibaba model deployment API](https://help.aliyun.com/en/model-studio/model-deployment-api).
- Version / tag / commit / freshness: Pages fetched on 2026-07-30; vendor docs are current web documents, not repository-pinned APIs.
- Relevant contract, behavior, or constraint learned:
  - Alibaba/QwenCloud documents context windows in model tables. QwenCloud lists `qwen3.8-max-preview` (Token Plan only), qwen3.7-max/plus/flash, qwen3.6-flash, and deepseek-v4-pro at 1M context.
  - Alibaba's model page lists `glm-5.2` at 198k and other model-specific values.
  - Alibaba separates Token Plan, Coding Plan, and pay-as-you-go keys/base URLs; endpoint identity matters.
  - Alibaba deployment APIs can expose `max_context_length` for deployed models, but that does not establish a generic metadata contract for the current Token Plan `/models` endpoint.
  - Alibaba explicitly isolates Token Plan, Coding Plan, and pay-as-you-go API keys/base URLs. Token Plan uses its `token-plan...maas.aliyuncs.com` gateway; the built-in Qwen adapter uses the older Singapore pay-as-you-go `dashscope-intl` gateway.
  - Alibaba's current OpenAI-compatible documentation recommends workspace-specific regional domains for standard Model Studio inference and says the legacy `dashscope-intl` Singapore domain remains functional. The built-in Qwen URL is therefore an older supported pay-as-you-go route, not the Token Plan route.
- Why it matters: A provider/endpoint-scoped curated profile can safely address the exact Alibaba Token Plan case. When no profile or advertised field exists, an exact built-in definition can provide a clearly marked best-effort fallback; unrelated or unmatched custom gateways remain unknown. The observed `/models` response still needs optional-field parsing for other compatible providers.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: The local Autobyteus server was already running at `http://127.0.0.1:29695/graphql` using `/Users/normy/.autobyteus/server-data`; no service restart or fixture mutation was needed.
- Required config, feature flags, env vars, or accounts: Existing local custom-provider record and secret-vault entry. The secret was resolved only in-process and not printed.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; dedicated `git worktree add`; read-only GraphQL queries; read-only authenticated `/models` probes.
- Cleanup notes for temporary investigation-only setup: No temporary files, credentials, or provider configuration were created or changed.

## Findings From Code / Docs / Data / Logs

1. **No universal metadata endpoint:** Different built-in providers expose different metadata routes and field names. The custom contract currently guarantees only `/models`; the live Alibaba endpoint provides no limit fields there. A generic follow-up HTTP request would be speculative and could break or slow arbitrary providers.
2. **The remaining defect is before custom model construction:** custom discovery drops optional object fields and has no compound endpoint/model metadata resolver. The refreshed server enrichment no longer clears known fields. For the current Alibaba response, payload parsing alone still cannot recover a limit because the payload lacks it; a verified profile is required.
3. **Runtime propagation is already correct:** `resolveTokenBudget` prefers active override, then model active context, then model maximum context, and can also use a provider maximum-input field for the effective input capacity. If the custom model receives sufficient context or input metadata, the existing LLM phase can calculate a compaction budget without a new event schema.
4. **UI state is silently incomplete:** the token panel checks `Boolean(effectiveContextWindowTokens)` and hides the entire context card when false. This should become an explicit unavailable state so users can distinguish “not reported yet” from “provider limit unavailable.”
5. **Provider wire IDs can be explicit aliases of canonical built-in models:** The supplied Alibaba catalog exposes `deepseek-v4-flash-0731`, while the built-in DeepSeek definition and official DeepSeek API use `deepseek-v4-flash`. This is not an exact fallback-index match. If vendor/plan evidence confirms equivalence, an endpoint profile must explicitly key the returned Alibaba wire ID and reference `{provider: DEEPSEEK, value: deepseek-v4-flash}`; no generic `-0731` stripping or fuzzy aliasing is allowed. The profile can carry Alibaba-specific context overrides.
6. **Endpoint-plan identity is semantically important:** Alibaba has separate plan-specific endpoints and credentials. More strongly, the same observed `qwen3.7-max` ID is documented with a different Token Plan context label than AutoByteus's built-in Qwen definition. A built-in value cannot be presented as provider-confirmed for an arbitrary endpoint. The approved policy is endpoint-advertised data, then exact endpoint-plan profile, then exact built-in model identity as explicitly inferred fallback, then unknown. Match normalized endpoint family/path plus exact model ID for authoritative profiles and let plan-specific values override the fallback.
7. **Successful response usage does not contain the limit either:** The live Alibaba run's persisted raw usage objects contain actual per-call usage (`prompt_tokens`, `completion_tokens`, `total_tokens`, cache details, and reasoning details), but no maximum context field. Inspecting completion responses can improve actual-usage accounting, but cannot recover the model's maximum context for this provider.
8. **Fresh direct completion probe confirms the same result:** A minimal live call returned HTTP 200 with standard OpenAI-compatible top-level fields and usage details only. Alibaba did not add a context-window field in the fresh response either.
9. **The two URLs represent different commercial/service channels, not two interchangeable aliases:** Qwen is the model family. Standard Model Studio/DashScope pay-as-you-go, Coding Plan, and Token Plan are separate gateways with separate keys, billing, entitlements, and potentially different model catalogs/limits. This explains why the custom Token Plan endpoint works through the generic compatible adapter but cannot safely inherit the built-in Qwen endpoint contract globally.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: `/Users/normy/.autobyteus/server-data/llm/custom-llm-providers.json`, version 2, with one or more records shaped as `{id,name,providerType,baseUrl}`. API keys are in the separate secret store. The live user's record has no model metadata.
- Relevant code-model, serialization, semantic, or physical-store change: Proposed metadata remains derived in discovery/model/catalog memory; no custom-provider JSON field or secret format changes.
- Normal readers and writers, including unknown/extra-field behavior: `CustomLlmProviderStore` reads/writes the version 2 provider envelope; runtime sync recomputes models from the saved endpoint and secret. Model metadata is emitted from the in-memory `LLMModel`/`ModelInfo` projection and is not written back to the provider store.
- Representative direct-read or compatibility evidence: The live JSON record was read successfully by the normal server data path; no metadata fields are required to load it. Existing provider records remain valid with the proposed code because the new data is optional and derived.
- Required semantics and invariants preserved by direct use: `Yes` — provider identity, base URL, credential reference, and stale-model behavior remain unchanged; missing optional metadata remains representable as null.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Never persist API keys, raw provider payloads, or vendor documentation snapshots. Discovery remains timeout-bounded and logs remain credential-free.
- Concrete benefit, cost, and risk of migration if it remains a candidate: Migration provides no benefit because there is no stored metadata to transform; adding one would introduce stale-data and secret-handling risk.
- Existing migration framework or lifecycle constraints, only if migration may be required: Not applicable.

## Constraints / Dependencies / Compatibility Facts

- The shared nullable metadata fields and token usage GraphQL fields already exist; the design should reuse them.
- The custom `/models` request must remain the only required discovery request for arbitrary endpoints.
- Optional metadata must be positive finite integers after normalization. No provider response may make a valid model undiscoverable solely because an optional field is malformed.
- Profile values must be endpoint-scoped, exact-model keyed, source-attributed, and easy to update when vendor docs change. Built-in fallback values must retain inferred provenance and must never override a profile.
- Existing built-in provider resolver behavior and GraphQL provenance values must not be weakened by the custom-provider change.
- The implementation must not use compatibility wrappers or maintain a legacy identifier-only and metadata-aware dual path.

## Open Unknowns / Risks

- Alibaba's public pages use rounded labels such as `1M`; exact enforcement for a particular Token Plan region/plan can differ. The profile should present the documented integer convention and provenance, not claim a provider guarantee beyond the source.
- The observed current endpoint's qwen3.8 model is a preview and vendor docs can change quickly. Profile updates must be a deliberate code/data revision.
- Some `/models` entries are image/audio models and may not be meaningful text-agent models. This task does not change eligibility or modality classification.
- A future requirement for user-entered per-model overrides would change persisted-data and UI scope; it is explicitly deferred.
- Dated provider wire IDs such as `deepseek-v4-flash-0731` require explicit source-backed endpoint profiles; absent such a profile, the differing ID remains unknown even if it appears semantically related to a built-in model.

## Notes For Architecture Reviewer

The current evidence supports a targeted extension, not a universal metadata endpoint assumption. The user-approved resolution order is endpoint-advertised data, exact endpoint-plan profile/reference, exact built-in model identity as inferred fallback, then unknown. Architecture review should focus on the compound identity boundary, the endpoint-plan profile's relationship to canonical built-in `staticMetadata`, the fallback's explicit inferred provenance, and truthful per-field resolution. Current server field preservation is an invariant to retain and regression-test, not an implementation gap. Unsupported arbitrary custom providers with no exact built-in match must remain truthful and runnable with unknown limits.


## Architecture Review Rework Evidence

- `ARCH-REV-001` returned `Fail (Design Impact)` with `ARCH-DESIGN-001`–`ARCH-DESIGN-003`. The approved SR-005 precedence was confirmed; the review identified only implementation-contract omissions.
- `ARCH-DESIGN-001` required a discriminated internal source union and mandatory propagation. The revised design now distinguishes `live`, `endpoint_profile`, `inferred_builtin`, `static_definition`, and `unknown`; carries source URL/date, profile ID/reference, or selected built-in provider/value without secrets; copies the resolution through `LLMModel.toModelInfo()`; and defines the server merge/coarse GraphQL mapping.
- `ARCH-DESIGN-002` required an actionable exact identity. The revised design indexes only `SupportedModelDefinition.value`, retains all exact candidates, uses `{ provider, value }` for profile references, selects the lowest valid value per numeric field, and carries the selected candidate's provenance with deterministic tie-breaking. It explicitly forbids the current generic `name`/`canonicalName`/`models/` multi-key lookup.
- `ARCH-DESIGN-003` required parsing and endpoint canonicalization contracts. The revised design enumerates every accepted top-level alias in a fixed allowlist, accepts only finite positive JSON integers, defines first-valid alias and duplicate-row precedence, defines per-field invalid fall-through, and defines exact protocol/hostname/port/base-path matching with query/fragment exclusion and near-match rejection.
- The alias case is a design clarification supported by the supplied catalog screenshot and official DeepSeek API documentation; no new authenticated probe or secret-bearing fixture was needed. Implementation and API/E2E coverage remain downstream.
