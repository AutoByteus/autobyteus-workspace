# Investigation Notes

## Investigation Status

**Requirements scope approved; design reworked after ARCH-REV-002; package pending reroute.**

## Request Context

The user asked for small but cross-cutting improvements:

1. support the latest Grok model;
2. update DeepSeek pricing after the provider's 17 August 2026 change;
3. make a missing API key in `autobyteus-ts` report an API-key-not-provided error instead of a secret-related error;
4. replace the misleading Docker-node (`http://localhost:8001`) error `Rejected ERROR: code is required`, which may have followed an insufficient provider balance;
5. replace old Gemini Flash support with `gemini-3.7-flash`;
6. support only the latest Kimi model; and
7. support only the latest GLM model.

The generalized user intent is latest-only support for the named neural-network provider families, with older entries removed rather than retained as compatibility aliases.

## Environment Discovery / Bootstrap Context

- Repository root: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`.
- Repository mode: git superrepo/monorepo with `autobyteus-ts`, server/backend, team stream contracts, web, SDK, and Docker-related packaging.
- Base refresh command: `git fetch origin personal` completed on 2026-08-22.
- Resolved base: `origin/personal` / `personal`, baseline `d487c0859905a91650387c4af41f4fc5754f214a` (`docs(delivery): record v1.4.54 rollout`).
- Dedicated ticket worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging`.
- Dedicated branch: `codex/provider-catalog-pricing-error-messaging`, based on the refreshed `origin/personal`.
- Expected finalization branch: `personal`; delivery must refresh against the tracked remote state before finalization.
- Bootstrap commands: `git fetch origin personal`; `git worktree add -b codex/provider-catalog-pricing-error-messaging /Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging origin/personal`.
- The shared checkout contained unrelated untracked `.article-work/`; it was left untouched.
- No implementation changes have been made in this worktree. Current authoritative files are the requirements and investigation artifacts.

## Stable Behavior IDs And Current-Path Summary

| Behavior ID | Evidence-backed current path | Current finding |
| --- | --- | --- |
| B-001 | `autobyteus-ts/src/llm/supported-model-definitions.ts` -> `GrokLLM` -> OpenAI-compatible xAI endpoint | Curated ID is `grok-4.5`; the repository has no `grok-4.6`. |
| B-002 | `supported-model-definitions.ts` pricing config -> `LLMFactory.getModelPricingInfo` -> `TokenPriceConfigProvider` -> `TokenCostCalculator` | DeepSeek V4 rows use flat stale prices; resolver selects input-size tiers but no time-of-day schedule. |
| B-003 | `GeminiLLM` and Gemini catalog rows | Current catalog has `gemini-3-flash-preview` and `gemini-3.5-flash`; no `gemini-3.6-flash` is present. |
| B-004 | `KimiLLM` plus `kimi-k2-7-code-policy.ts` | Catalog and normalizers are K2.6/K2.7-specific; no K3 policy exists. |
| B-005 | `GlmLLM` plus GLM catalog schema | Catalog has `glm-5.2`; adapter permits `thinking.type=disabled`; no GLM-5.3 entry exists. |
| B-006 | `SecretManagementProviderApiKeyResolver.resolve` -> `SecretManagementService.resolveForUse` -> `SecretVaultError("NOT_FOUND", ..., "SECRET_NOT_FOUND")` -> LLM adapter | Missing key is represented as a secret-vault instruction, not a provider/API-key category. |
| B-007 | `OpenAICompatibleLLM` request/stream wrappers -> `LlmPhase` catch -> error notifier | Provider errors are wrapped as generic request/stream strings before user rendering. |
| B-008 | `AgentExternalEventNotifier` -> `AgentEventStream` -> AgentRun mapper/team adapter -> team contract | Producer emits `source`; team error admission requires `code`, creating `Rejected ERROR: code is required`. |
| B-009 | `agent-run-event-message-mapper` / team websocket projector -> web `ErrorSegment.vue` | UI receives generic error text; malformed event prevents original cause from reaching it. |
| B-010 | `supported-model-definitions.ts` -> `MinimaxLLM` | `minimax-m3` / `MiniMax-M3` is already present and M2.7 is already absent, but metadata reports 204,800 context and the current pricing contract needs verification against the 1M-context M3 API. |

## User-Provided Evidence

Reference images supplied in the request:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_53d467fac85b47db8a7c6a6f587bdb2e/solution_designer_b626b35c95fa4a01964d028d4e0fc16b/context_files/ctx_0cea88998271__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_53d467fac85b47db8a7c6a6f587bdb2e/solution_designer_b626b35c95fa4a01964d028d4e0fc16b/context_files/ctx_5dbbd3622ee8__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_53d467fac85b47db8a7c6a6f587bdb2e/solution_designer_b626b35c95fa4a01964d028d4e0fc16b/context_files/ctx_25138a7b36b0__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_53d467fac85b47db8a7c6a6f587bdb2e/solution_designer_b626b35c95fa4a01964d028d4e0fc16b/context_files/ctx_8fee880749b9__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_53d467fac85b47db8a7c6a6f587bdb2e/solution_designer_b626b35c95fa4a01964d028d4e0fc16b/context_files/ctx_bb26bf1eb256__image.png`

Observed screenshot facts:

- The Docker node is shown as `http://localhost:8001`, `REMOTE`, `ready`.
- The chat shows a green `run_bash` tool card followed by a red `An Error Occurred` card with exactly `Rejected ERROR: code is required`, repeated for a later user message.
- The DeepSeek usage screenshot states that V4-Pro pricing changes take effect at 00:00 Beijing time on 17 August 2026, with peak/off-peak rates, and shows a negative topped-up balance. This supports a pricing change and makes balance a plausible hypothesis, but it is not provider response evidence for the specific chat failure.

## Local Source Evidence And Production Paths

### Curated model catalog

Source: `autobyteus-ts/src/llm/supported-model-definitions.ts`.

Current relevant rows:

| Provider | Current catalog IDs | Current metadata/policy observations |
| --- | --- | --- |
| Grok | `grok-4.5` | `GrokLLM`; 500,000 context; reasoning `low|medium|high`; flat USD 2 input / 6 output / 0.5 cache-read; verified 2026-07-09. |
| DeepSeek | `deepseek-v4-flash`, `deepseek-v4-pro` | 1,000,000 context, 384,000 max output; flat stale pricing; `deepseekV4Schema`. |
| Gemini | `gemini-3.1-pro-preview`, `gemini-3-flash-preview`, `gemini-3.5-flash` | Flash rows are pre-3.7; common schema defaults `thinking_level` to `minimal`. |
| Kimi | `kimi-k2.6`, `kimi-k2.7-code`, `kimi-k2.7-code-highspeed` | K2.7 code rows use `kimi-k2-7-code-policy.ts`; no K3 row. |
| GLM | `glm-5.2` | 1,000,000 context/output, 128,000 max output; CNY 8 input / 28 output / 2 cache-read; BigModel coding endpoint; thinking can be disabled. |
| MiniMax | `minimax-m3` / `MiniMax-M3` | M3 is already present; metadata is 204,800 context, while official M3 API material states up to 1M context. Current catalog pricing matches the official permanent-50%-off standard tiers but requires effective-date/endpoint verification. |

The current catalog also contains unrelated providers/models; the proposed latest-only scope is limited to the named provider families and Gemini Flash family.

### Provider request adapters

- `autobyteus-ts/src/llm/api/grok-llm.ts`: xAI Chat Completions endpoint. Current model normalization handles reasoning restrictions, but the catalog/schema must add Grok 4.6 `xhigh` and long-context pricing tiers.
- `autobyteus-ts/src/llm/api/gemini-llm.ts`: Gemini request construction currently defaults thinking to `minimal`, maps it to numeric `thinkingBudget`, and sends sampling parameters. Gemini 3.7 documentation requires supported thinking levels (`low|medium|high`, default medium) and a current request shape; model-specific normalization is required.
- `autobyteus-ts/src/llm/api/kimi-llm.ts`: extends `OpenAICompatibleLLM` against `https://api.moonshot.ai/v1`; K2.6/K2.7 behavior is explicit and unknown models fall through generic kwargs. K3 needs a dedicated policy (reasoning effort `low|high|max`, thinking always enabled, official fixed/omitted sampling behavior).
- `autobyteus-ts/src/llm/api/kimi-k2-7-code-policy.ts`: K2-only policy file becomes obsolete if K2 rows are removed and should be replaced or removed cleanly, not retained as a compatibility path.
- `autobyteus-ts/src/llm/api/glm-llm.ts`: extends `OpenAICompatibleLLM` with base URL `https://open.bigmodel.cn/api/coding/paas/v4/`; `normalizeGlmExtraParams` maps `thinking_type` into `thinking.type` and deletes reasoning effort when disabled. GLM 5.3 requires always-enabled thinking, so this policy must contract rather than preserve the disabled branch.
- `autobyteus-ts/src/llm/api/minimax-llm.ts`: extends `OpenAICompatibleLLM` with `https://api.minimax.io/v1`; the current M3 row sends `MiniMax-M3`, so the main MiniMax gap is metadata/pricing freshness and endpoint-contract verification, not a missing model identifier.
- `autobyteus-ts/src/llm/api/openai-compatible-llm.ts`: resolves API key, then wraps request/stream errors as generic `Error in API request: ...` / `Error in API streaming: ...`; this is the shared provider-error boundary that must stop replacing the original provider message. The only intentional local translation is the missing/blank API-key configuration case.

### Schema and provider-adapter path

- `autobyteus-ts/src/utils/parameter-schema.ts` is the model configuration schema exposed to callers/UI. Its current `validateConfig` implementation checks required parameters but does not implement an exhaustive unknown-key rejection policy; the schema is therefore a documented/configuration surface, not a complete provider request firewall.
- `autobyteus-ts/src/llm/api/provider-request-kwargs.ts` removes only internal framework keys and explicitly controlled tool keys. Other non-null extra fields are passed through by `applySafeProviderRequestKwargs`.
- `autobyteus-ts/src/llm/api/openai-compatible-request-builder.ts` combines the common config with `extraParams` and invocation kwargs, preserving this pass-through behavior.
- This is not a separate “request compatibility” product feature. It is the normal latest-model production path: the catalog schema supplies the configuration shown to the user, the factory resolves the selected model, and the provider adapter constructs that model’s current request. Current model-specific branches are the reason this path must be updated: Kimi contains explicit K2 policy code, Gemini defaults to the obsolete `minimal` thinking setting, and GLM translates a disabled-thinking branch.

### DeepSeek pricing path

Current chain:

`TokenPricingConfig` (`autobyteus-ts/src/llm/utils/llm-config.ts`) -> `LLMFactory.getModelPricingInfo` (`autobyteus-ts/src/llm/llm-factory.ts`) -> `TokenPriceConfigProvider.toPolicy` -> `TokenCostCalculator.selectTier/applyPolicy`.

Current limitations:

- `TokenPricingConfig` stores flat input/output/cache values, an effective date string, and optional input-size tiers.
- `TokenPriceConfigProvider.toPolicy` currently sets `effective_from`, `effective_to`, and `version` to null even when a catalog pricing effective date exists.
- `TokenCostCalculator` uses `payload.observed_at` only as input to the resolver; it does not select a time schedule.
- Usage events already persist `pricing_snapshot_json`, `pricing_policy_key`, `selected_pricing_tier_id`, `pricing_source`, and `observed_at` in `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts` and related persistence/DTO paths.

Recommended target: add the latest DeepSeek schedule representation and select its peak/off-peak branch by request time-of-day before existing input-size tier selection. Use UTC half-open intervals and record the applied latest schedule/provenance in `pricing_snapshot_json` if useful for auditability. Do not retain prior price segments, select prices by event date, or implement historical repricing.

### Secret/API-key path

Current chain:

`ProviderApiKeyResolver.resolve` -> `SecretManagementProviderApiKeyResolver` -> `SecretManagementService.resolveForUse` -> `SecretVaultRepository.readEntry`.

When no record exists, `resolveForUse` throws `new SecretVaultError("NOT_FOUND", false, "SECRET_NOT_FOUND")`. `OpenAICompatibleLLM.initializeClient` does not translate this condition, and request wrappers catch/flatten errors. Existing unit coverage includes a synthetic missing-key case but does not cover the server vault `NOT_FOUND` path or a stable API-key category.

Recommended target: map only “no credential record/blank credential” to `missing_api_key`; preserve vault locked/unavailable/corrupt/access-denied categories, and otherwise retain the provider/transport error message after secret redaction. Do not introduce a semantic provider-error taxonomy that replaces provider wording.

### Verified Docker/team error root cause

Source chain:

1. `autobyteus-ts/src/agent/loop/llm-phase.ts` catches a provider/stream error, builds `Error processing your request with the LLM: ...`, and calls `notifyAgentErrorOutputGeneration` with `source: 'LlmPhase.stream'`, `message`, and `details`.
2. `autobyteus-ts/src/agent/events/notifiers.ts` defines `AgentErrorNotification` with required `source` and emits payload `{ source, message, details, error_scope, error_effect, turn_id }`.
3. `autobyteus-ts/src/agent/streaming/events/stream-event-payload-lifecycle.ts` defines `ErrorEventData` requiring `source` and `message`.
4. `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts` maps an ERROR event as `{ code: payload.code, message: payload.message, ... }`; it does not translate `source` to `code`.
5. `autobyteus-server-ts/src/agent-team-execution/services/team-agent-event-adapter.ts` handles an ERROR event as `{ code: required(p.code, "code"), message: ..., ... }`; `required` throws `code is required` when `p.code` is absent.
6. The adapter catches admission errors and returns `message: Rejected ${event.eventType}: ${error.message}`.
7. `autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts` independently requires a non-empty `code` in `errorCore`.

Therefore `Rejected ERROR: code is required` is confirmed as a local event-contract mismatch. It is not the literal provider balance response. A provider balance/quota rejection may still be the original error that entered `LlmPhase`, but that causal part requires a safe provider fixture or runtime response.

Recommended clean-cut correction: keep the required transport `code` separate from the display `message`, populate the code from provider metadata when available or an internal non-empty fallback when the protocol requires one, and preserve the original provider message after secret redaction. Update notifier callsites and stream/mapper/team/websocket contract fixtures so the mismatch cannot produce `Rejected ERROR: code is required`. Do not add a compatibility alias that allows the mismatch to survive.

### User-visible error path

- `autobyteus-web/components/conversation/segments/ErrorSegment.vue` renders the received error message under the generic heading.
- `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts`/related stream handlers pass server error payloads to the UI.
- The web surface should receive the original safe provider/transport message; provider-error classification or replacement does not belong in the component or an upstream wrapper.

## External / Public Source Findings

All provider facts below are time-sensitive and must be re-verified by implementation. Direct URLs are recorded for the downstream package.

### Grok 4.6 (xAI)

- Model page: https://docs.x.ai/developers/models/grok-4.6
- Reasoning/API guide: https://docs.x.ai/developers/grok-4-6
- Pricing: https://docs.x.ai/developers/pricing
- Release notes: https://docs.x.ai/developers/changelog
- Evidence at investigation date: Grok 4.6 is the latest flagship; 500,000 context; short-context input $2/M, cached $0.50/M, output $6/M; long-context (at least 200,000 tokens) input $4/M, cached $1/M, output $12/M; reasoning `low|medium|high|xhigh`, default `high`.
- Design consequence: replace Grok 4.5, add `xhigh`, and represent the 200,000-token pricing tier instead of a single flat rate.

### Gemini 3.7 Flash (Google)

- Model page: https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash
- Latest-model guide: https://ai.google.dev/gemini-api/docs/gemini-3-7
- Pricing: https://ai.google.dev/gemini-api/docs/pricing
- Changelog: https://ai.google.dev/gemini-api/docs/changelog
- Evidence at investigation date: exact stable ID `gemini-3.7-flash`; 1,048,576 input context and 65,536 output; thinking levels `low|medium|high`; default medium; introductory input/output/cache rates $0.75/$3.75/$0.075 per million through 31 December 2026, with later rates $1.50/$7.50/$0.15.
- Repository discrepancy: source contains 3.5 Flash and 3 Flash Preview, not 3.6 Flash. Requirements therefore remove all pre-3.7 Flash rows.
- Design consequence: the Gemini adapter must not default 3.7 to `minimal`, must use current thinking-level semantics, and must avoid deprecated sampling/request parameters when the provider rejects them.

### Kimi K3 (Moonshot)

- Model list: https://platform.kimi.ai/docs/models
- K3 quickstart: https://platform.kimi.ai/docs/guide/kimi-k3-quickstart
- K3 pricing: https://platform.kimi.ai/docs/pricing/chat-k3
- Evidence at investigation date: `kimi-k3` is the flagship; 1M context; reasoning effort `low|high|max`, default max; thinking always enabled; K2 series is deprecated and documentation directs clients to K3; K3 uses `https://api.moonshot.ai/v1`.
- Pricing evidence from the provider home/pricing material: input $3/M, output $15/M, cache hit $0.30/M; implementation must re-verify the exact table before trusting it.
- Design consequence: remove K2 rows and K2 policy file; add a K3 model policy and tests.

### MiniMax M3

- Official M3 model page: https://www.minimaxi.com/models/text/m3
- Official API pricing: https://platform.minimax.io/docs/guides/pricing-paygo
- Official OpenAI-compatible model list: https://platform.minimax.io/docs/api-reference/models/openai/list-models
- Official model release page: https://platform.minimaxi.com/docs/release-notes/models
- Evidence at investigation date: MiniMax M3 is the current text/coding flagship, released 1 June 2026; the official model value is `MiniMax-M3`; API context supports up to 1M tokens; the API pricing page lists ≤512K input at $0.30 input / $1.20 output / $0.06 cache-read and >512K input at $0.60 / $2.40 / $0.12 under the permanent 50%-off standard pricing shown by the provider.
- The repository already uses `minimax-m3` / `MiniMax-M3` and its tier prices match those discounted values, but `createStaticModelMetadata` is configured with 204,800 context/input. The catalog should be updated to the official 1,000,000 context/input limit and the pricing effective date/source should be re-verified.
- The provider also documents a `chatcompletion_v2` endpoint at `https://api.minimaxi.com/v1/text/chatcompletion_v2`, while the OpenAI-compatible model-list/API path uses `https://api.minimax.io/v1`. The implementation must confirm which endpoint contract the existing OpenAI-compatible client is intended to use; do not change endpoints solely from domain spelling.
- Older text entries such as M2.7 and M2.5 are listed by the provider as available/legacy-adjacent, but the requested latest-only policy supports only M3 in the curated MiniMax text catalog.

### GLM 5.3 (Z.ai / BigModel)

- Official release: https://z.ai/blog/glm-5.3
- API platform: https://z.ai/model-api
- Z.ai HTTP endpoint guidance: https://docs.z.ai/guides/develop/http/introduction
- BigModel quick start: https://docs.bigmodel.cn/cn/guide/start/quick-start
- BigModel coding endpoint: https://docs.bigmodel.cn/cn/coding-plan/quick-start
- Evidence at investigation date: GLM-5.3 is the current release; thinking is always enabled; supported effort values are `low|high|max`; disabled thinking is no longer supported.
- Open fact: the repository’s current BigModel coding endpoint and CNY GLM-5.2 price source must be reconciled with the deployment’s actual GLM-5.3 endpoint/credential and official current price. No unverified GLM-5.3 price is asserted in this artifact.
- Design consequence: replace the row and contract, but keep pricing untrusted/unpriced until endpoint-specific official pricing is established.

### DeepSeek V4 pricing

- Official pricing page: https://api-docs.deepseek.com/quick_start/pricing/
- Direct probe command used: `curl -L --max-time 20 -sS 'https://api-docs.deepseek.com/quick_start/pricing' > /tmp/deepseek-page.html`, then inspected the returned pricing table.
- Effective change: 00:00 Beijing on 17 August 2026 = `2026-08-16T16:00:00Z`.
- Peak UTC windows: 01:00–04:00 and 06:00–10:00; all other times off-peak.
- Rates per million tokens:

| Model | Off-peak cache hit | Peak cache hit | Off-peak cache miss | Peak cache miss | Off-peak output | Peak output |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| V4 Flash | 0.007 | 0.014 | 0.22 | 0.44 | 0.66 | 1.32 |
| V4 Pro | 0.022 | 0.044 | 0.66 | 1.32 | 1.98 | 3.96 |

The values and schedule must be rechecked before implementation because they are current provider data.

## Commands And Search Evidence

Commands run in the dedicated worktree included:

- `git fetch origin personal`
- `rg -n -C 12 "grok-4.5|deepseek-v4|gemini-3|kimi-k|glm-5.2|createKimi" autobyteus-ts/src/llm/supported-model-definitions.ts`
- `sed`/`rg` reads of the adapter, pricing, secret, agent-loop, stream-contract, and team-adapter files listed above.
- `rg -n -C 8 'selected_pricing|pricing_snapshot|ResolvedTokenPricingPolicy|resolvePolicy|TokenUsageUpdatedPayload' autobyteus-server-ts/src`
- `rg -n -i -C 3 'llmModelIdentifier|modelIdentifier' --glob '*.ts' --glob '*.json'`
- Official web searches for the current Grok, Gemini, Kimi, GLM, DeepSeek, and MiniMax provider documentation.

## Runtime / Probe Findings

- No live Docker-node request was made from this environment; the user’s node may run a different build.
- No provider credential or account response was accessed.
- The `Rejected ERROR: code is required` path is verified statically from source and is reproducible with an ERROR payload containing `source` but no `code` at the team adapter boundary.
- The balance hypothesis remains unverified and must be tested with deterministic safe fixtures, not an account credential; the fixture should verify preservation of the provider's original message rather than a new application-authored classification.

## Persisted Data Transition Evidence

- Usage event shape contains `observed_at`, model identifiers, selected pricing tier, pricing policy key, and `pricing_snapshot_json`; normal readers accept the JSON snapshot as an opaque record. The applied latest schedule may be stored as audit metadata, but no historical price table or repricing path is required. Existing records must not be rewritten.
- Launch/application configuration shapes store model identifiers as strings (`llmModelIdentifier`) in default launch configs, application manifests, and launch profiles. Removing catalog IDs can make an existing saved profile invalid. The required behavior is to reject a removed ID and require explicit current-model reselection; no automatic migration or silent remapping is desired.
- Current decision: existing usage/pricing records remain directly usable as immutable recorded results; the system does not recalculate them with retired prices. Saved model strings remain directly readable, but current-model validation is required before a saved configuration is presented as runnable or a run is created. Migration or silent remapping is out of scope.

### Architecture-review rework evidence (ARCH-DI-001 through ARCH-DI-005)

- **Behavior-ID authority:** `requirements.md` is the approved authority. The stable table above now uses exactly: B-001 Grok, B-002 DeepSeek pricing, B-003 Gemini Flash, B-004 Kimi, B-005 GLM, B-006 missing API key, B-007 provider-message passthrough, B-008 canonical error-event repair, B-009 web-visible message, and B-010 MiniMax. `REQ-012`/`AC-018` covers stale saved configuration without repurposing B-010.
- **Saved-model validation owner/path:** `ApplicationExecutionResourceConfigurationService.buildConfigurationView` is the owner for persisted application configuration readiness. It loads the persisted profile, resolves the selected resource, and calls `normalizeLaunchProfileForWrite`; the target derives effective `{ runtimeKind, llmModelIdentifier }` pairs for every agent/team/member. The canonical lookup remains `LLMFactory` (`ensureInitialized` plus a current-identifier lookup/guard) only for `RuntimeKind.AUTOBYTEUS`; Claude/Codex pairs are retained for their external backend factories. A stale AutoByteus ID becomes `CURRENT_MODEL_SELECTION_REQUIRED` with “The selected model is no longer supported. Select a current supported model.” and an `INVALID_SAVED_CONFIGURATION` view; the saved string is retained for editing. `ApplicationRunBindingLaunchService.startAgentRunBinding` and `startAgentTeamRunBinding` repeat the runtime-aware check on effective launch pairs before `createAgentRun`, `allocateTeamRunId`, or `createTeamRun`, so a direct launch cannot bypass the persisted-view check. No AutoByteus provider client is constructed or called on a stale AutoByteus leg, and valid external-runtime launches are not rejected by the AutoByteus guard.
- **Provider-error evidence boundary:** The target typed shape is `ProviderErrorEvidence { message, providerStatus?, providerCode?, providerRequestId?, details? }`. `autobyteus-ts/src/llm/errors/provider-error.ts` extracts common SDK fields (`status`, `code`, `request_id`, safe request-id headers), redacts credential/header/payload material, and never classifies balance/quota/authentication. `OpenAICompatibleLLM`, Gemini request paths, and `LlmPhase` use the same shape; generic request/stream prefixes and the 1000-character replacement are removed. `AgentErrorNotification`, `ErrorEventData`, AgentRun mapping, `TeamAgentEventAdapter`, `TeamAgentEvent`/team DTO schemas, websocket projectors, `messageTypes.ts`/`messageParser.ts`, web stream adapters, and `ErrorSegment` carry the safe message and optional metadata. Missing provider metadata is omitted/null; the required transport `code` is provider code when safe and otherwise `LLM_PROVIDER_ERROR`, never the display replacement.
- **Missing-key owner:** `SecretManagementProviderApiKeyResolver` owns the vault-to-credential mapping. A `NOT_FOUND` record (and any resolver-visible blank value) raises the shared `MissingApiKeyError`; `LlmPhase` translates only that error into `missing_api_key` plus provider setup text. Vault health, corruption, authorization, and provider authentication errors remain on the general evidence path.
- **DeepSeek pricing interface:** The current schedule is serialized in `TokenPricingConfig` and exported by `LLMFactory.ModelPricingInfo` as `pricing_schedule`. `TokenPriceConfigProvider.resolvePolicy(payload)` selects a period from `observed_at` UTC minute using half-open windows `[60,240)` and `[360,600)`, otherwise `off_peak`; it builds the existing `ResolvedTokenPricingPolicy` from that period, derives `trusted_dimensions` from the selected period, then lets existing `selectTier` operate on the resolved base. `ResolvedTokenPricingPolicy` and `pricing_snapshot_json` record `pricing_schedule_id`, `pricing_schedule_period_id`, `pricing_schedule_effective_from`, and `pricing_schedule_timezone`. The policy key is current schedule plus selected period, not event date. Invalid scheduled timestamps produce `pricing_schedule_time_invalid` rather than a guessed price.
- **Runtime-aware model ownership (ARCH-DI-005):** `RuntimeKind` is an existing application contract with `AUTOBYTEUS`, `CLAUDE_AGENT_SDK`, and `CODEX_APP_SERVER`. `ApplicationRunBindingLaunchService` already forwards `runtimeKind`, and `AgentRunManager.resolveBackendFactory` dispatches those values to the AutoByteus, Claude, and Codex backend factories respectively. The Claude factory (`autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend-factory.ts`) and Codex factory (`autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.ts`) bootstrap their own SDK/thread contexts from `AgentRunConfig.llmModelIdentifier`; they do not use the AutoByteus `LLMFactory` catalog. Therefore the current-model invariant is an effective pair `{ runtimeKind, llmModelIdentifier }`: only the `AUTOBYTEUS` pair is checked against the AutoByteus catalog by `LLMFactory.requireCurrentModelIdentifier`; Claude/Codex pairs remain owned by their external-runtime factories and are not sent through that guard. For saved profiles and direct launches, normalize unknown/blank runtime values with the existing `runtimeKindFromString(..., RuntimeKind.AUTOBYTEUS)` behavior, expand every effective team member pair, validate only AutoByteus pairs, and perform all checks before run/team allocation or creation. This preserves B-001, B-003–B-005, and B-010 for unrelated external-runtime launches while retaining explicit reselection for removed AutoByteus IDs.

## Supplemental Task Artifact Inventory

| Path | Purpose | Status | Related Requirements / Acceptance Criteria | Approval Applicability |
| --- | --- | --- | --- | --- |
| `provider-error-and-pricing-contract.md` | Provider model/pricing facts, latest-only schedule-selection contract, request normalization, provider-message passthrough, and event field contract. | Created in the dedicated worktree as a design supplement. | REQ-001–REQ-012; AC-001–AC-018. | Intended behavior is aligned to the approved requirements basis; implementation must keep it synchronized. |

## Design Health Assessment Evidence

This is not a narrow catalog edit:

- **Boundary/ownership issue:** error producer and team contract disagree on `source` vs `code`.
- **Missing invariant:** every error event admitted to the team stream must have a canonical non-empty code.
- **Shared-structure looseness:** provider errors are wrapped into generic request/stream text, and the event producer/consumer disagree on the required field; the solution must preserve provider text while carrying safe status/code/request-id metadata separately.
- **Duplicated policy/legacy pressure:** Grok, Gemini, Kimi, and GLM model semantics are split between catalog defaults and adapter-specific branches, and K2/GLM-5.2 rows encode obsolete behavior.
- **Schema/adapter ownership:** the model schema and provider adapter are part of the normal model-selection path; the target updates them together and removes obsolete transforms instead of adding a separate defensive request-rejection feature.
- **Pricing design gap:** a scalar pricing model cannot represent the latest DeepSeek peak/off-peak time windows. The target is a current schedule only, not historical effective-date versioning.

The design should refactor these boundaries now; a UI-only patch or a compatibility alias would leave the confirmed root cause in place.

## Open Unknowns / Requirement Gaps

1. Exact provider deployment evidence for GLM-5.3 and MiniMax M3 remains an implementation verification gate; stale-profile validation and error/pricing ownership are now concrete in the design.
2. Endpoint and official pricing source for GLM-5.3 in this deployment.
3. Safe provider response fixtures that prove original balance/quota/authentication/request messages are preserved after redaction, including provider-specific status/code signals; no semantic classification is required.
4. Exact MiniMax endpoint contract and pricing effective date for the deployment; the repository currently uses `api.minimax.io/v1` while the M3 research page demonstrates `api.minimaxi.com/v1/text/chatcompletion_v2`.
5. Exact Docker build/commit and whether its stream contract is synchronized with this repository baseline.

## Notes For Architecture Reviewer

The requirements scope is approved. Following ARCH-REV-001 and ARCH-REV-002, the package was reworked without changing approved behavior: stable IDs were reconciled, persisted-model validation/reselection was assigned to the application configuration/run-binding path with the factory scoped to AutoByteus catalog ownership, provider evidence was mapped through every runtime/team/web boundary, and the DeepSeek schedule was projected onto the existing pricing structures. The new runtime-aware rule is explicit: AutoByteus selections use the AutoByteus catalog guard; Claude/Codex selections remain with their external runtime factories. The key confirmed root cause for the screenshot is the local event field mismatch, while the balance hypothesis and Docker build identity remain unproven. The package is ready for rerouted architecture review; implementation remains blocked until that review passes.
