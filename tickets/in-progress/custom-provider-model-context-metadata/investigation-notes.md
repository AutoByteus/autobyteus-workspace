# Investigation Notes

## Investigation Status

- Status: `Complete for SR-011 architecture re-review`
- Task posture: user-driven rework after the prior implementation, reviews, API/E2E evidence, documentation sync, and delivery build.
- Current authority: `requirements.md`, this investigation, `design-spec.md`, `qwen-native-provider-setup-ui-spec.md`, and `solution-revision-record.md` through `SR-011`.
- Superseded result: `ARCH-REV-003` and the downstream implementation/review/delivery artifacts prove the earlier endpoint-profile design, not the newly approved design. They remain historical evidence and must not be treated as approval of SR-010.

## Request Context

The user began with custom providers whose `/models` endpoint omits context limits. The direction evolved after distinguishing model producers from inference providers and recognizing that Alibaba supplies multiple user-/region-/plan-specific Base URLs:

1. Keep the custom-provider solution generic and minimal.
2. Use exact internal `value` metadata for a custom model when provider-advertised metadata is absent.
3. Leave unknown custom values without context rather than guessing.
4. Remove all Alibaba endpoint profiles, regional logic, and wire-alias/reference mappings from custom-provider metadata.
5. Make Qwen a real native configurable provider whose users enter the Alibaba Base URL and matching key in the frontend.
6. Add native Qwen-served exact values `qwen3.8-max`, `deepseek-v4-pro`, and `glm-5.2` with context metadata.
7. Remove `qwen3.8-max-preview` from the target design because the user reports the production model is no longer preview.
8. Do not introduce a generalized model-offering/producer/deployment schema or unused attributes.

## Environment Discovery / Bootstrap Context

| Item | Result |
| --- | --- |
| Repository root | `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata` |
| Repository mode | Git super-repository worktree |
| Dedicated branch | `codex/custom-provider-model-context-metadata` |
| Current HEAD | `36ebd83fb87df7608cbdbbd8de26750d4ee49ed9` |
| Expected base/finalization branch | `personal`, tracked as `origin/personal` |
| Latest recorded tracked base ref | `c2ae6634d3d3aa59c196dfb54bfaf8971a5e5d93` |
| Divergence on 2026-08-06 | Ticket branch ahead 5, behind 62 |
| Worktree suitability | Dedicated ticket worktree; authoritative artifact location is correct |
| Integration ownership | Do not merge here. Delivery engineer must refresh against the latest tracked base after rework passes all stages. |
| Dirty state | Delivery documentation plus current solution artifacts are modified/untracked; do not overwrite historical downstream artifacts. |

Bootstrap commands:

```bash
git branch --show-current
git rev-parse HEAD
git rev-parse origin/personal
git rev-list --left-right --count HEAD...origin/personal
git worktree list --porcelain
```

## Supplemental Task Artifact Inventory

| Canonical Path | Purpose | Scope / Related IDs | Status | Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/qwen-native-provider-setup-ui-spec.md` | Qwen Base URL + API-key user journey and states | REQ-005, REQ-006, REQ-008, REQ-010–REQ-012; AC-007, AC-008, AC-011–AC-014 | Refined | Approved through explicit user direction; aligned by SR-011 architecture rework |

Sanitized live-probe evidence remains embedded below. No raw provider response or secret-bearing artifact is promoted.

## Source Log

### Repository sources

| Date | Source / Command | Purpose | Material Result |
| --- | --- | --- | --- |
| 2026-08-06 | `autobyteus-ts/src/llm/api/qwen-llm.ts` | Inspect runtime endpoint ownership | Constructor hardcodes `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`. |
| 2026-08-06 | `autobyteus-ts/src/llm/supported-model-definitions.ts` | Inspect native Qwen/direct-provider definitions | Qwen owns `qwen3.7-max` and `qwen3-max`; direct GLM owns `glm-5.2`; direct DeepSeek owns `deepseek-v4-pro`. Definitions own static metadata/provenance. |
| 2026-08-06 | `autobyteus-ts/src/llm/supported-model-definition.ts` | Check available definition attributes | `modelIdentifierOverride` already exists through `LLMModelOptions`; `hostUrl` is intentionally excluded from static definitions. No new identity attribute is needed. |
| 2026-08-06 | `autobyteus-ts/src/llm/models.ts` and `llm-factory.ts` | Check identifier/runtime behavior | API model identifiers default to model `name`; duplicate identifiers replace prior registry entries. Provider-specific identifier overrides are required for duplicated exact values. |
| 2026-08-06 | `autobyteus-ts/src/llm/metadata/openai-compatible-endpoint-model-metadata.ts` | Inspect prior implementation | File owns hardcoded Alibaba profiles, canonical URL matching, exact built-in fallback, and alias/reference behavior. Only exact built-in fallback remains desired. |
| 2026-08-06 | `autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts` | Inspect source representation | Current source union includes `endpoint_profile`; this variant becomes obsolete. |
| 2026-08-06 | `autobyteus-ts/src/llm/openai-compatible-endpoint-discovery.ts` | Inspect generic discovery | Current branch already recognizes a strict top-level positive-integer metadata alias set and preserves model discovery resilience. |
| 2026-08-06 | `autobyteus-server-ts/src/llm-management/llm-providers/domain/models.ts` and GraphQL `llm-provider.ts` | Check provider configuration shape | `LlmProviderRecord` and `LlmProviderObject` already expose nullable `baseUrl`. |
| 2026-08-06 | `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts` | Inspect settings/secret owner | Built-in key save is owned here; custom provider probe already validates a Base URL/key pair with the shared discovery boundary. |
| 2026-08-06 | `autobyteus-server-ts/src/config/app-config.ts` | Inspect non-secret persistence | `AppConfig.set/delete` persist allowed non-secret settings to `.env` and update `process.env`; `QWEN_API_KEY` is forbidden from generic config writes. |
| 2026-08-06 | `autobyteus-server-ts/src/secret-management/catalog/provider-credential-catalog.ts` | Inspect existing Qwen secret | Existing secret identity is `provider.qwen.api-key`. |
| 2026-08-06 | `autobyteus-server-ts/src/secret-management/services/secret-management-service.ts` | Verify bounded compensation capabilities after `ARCH-DESIGN-004` | The service exposes `getStatusForConsumer`, `resolveForUse`, `saveForConsumer`, and `removeForConsumer`. A previous `SecretValue` can be retained only within command scope and restored without serializing or logging plaintext. |
| 2026-08-06 | `autobyteus-server-ts/src/config/app-config.ts:502-578` | Verify the architecture-review durability premise | Current `set` updates memory first and catches direct `.env` write failure, logging that the change is session-only. It has no strict/durable result and the direct file overwrite is not an all-or-old replacement. |
| 2026-08-06 | `autobyteus-web/components/settings/ProviderAPIKeyManager.vue`, `ProviderApiKeyEditor.vue`, and `useProviderApiKeySectionRuntime.ts` | Inspect frontend setup | Qwen currently receives the generic key-only editor; custom providers already demonstrate Base URL + key UX but also require a provider name and create a custom record. |
| 2026-08-06 | `autobyteus-ts/src/agent/token-budget.ts` | Confirm compaction dependency | `resolveTokenBudget` uses active context, then maximum context, and can derive an input/trigger budget from context even when output is unknown. |

### Runtime / probe evidence retained from the initial investigation

| Date | Evidence | Sanitized Result | Consequence |
| --- | --- | --- | --- |
| 2026-07-30 | Local GraphQL token-summary trace for the reported run | `latestPromptTokens=67772`, `effectiveContextWindowTokens=null`, `contextWindowUsagePercent=null`; latest model was the then-current `qwen3.8-max-preview` custom value | Missing capacity, not missing usage, blocked model-derived compaction. |
| 2026-07-30 | Authenticated `GET {baseUrl}/models` through the saved custom provider | HTTP 200; rows contained `created`, `id`, `object`, `owned_by`; no context/input/output fields | Generic discovery cannot recover capacity from this Alibaba response. |
| 2026-07-30 | Minimal authenticated `POST {baseUrl}/chat/completions`, `max_tokens:1` | HTTP 200; usage counts but no model-limit field | Completion responses do not supply the missing metadata either. |
| 2026-07-30 | Sanitized observed text model IDs | `deepseek-v4-pro`, `glm-5.2`, `qwen3.6-flash`, `qwen3.7-max`, `qwen3.7-plus`, `qwen3.8-max-preview` | Earlier endpoint evidence is historical; the user now explicitly replaces the preview value with `qwen3.8-max`. |

### External / public sources

| Date | URL | Finding | Design Use |
| --- | --- | --- | --- |
| 2026-08-06 | `https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio` | Alibaba's Base URL varies by region/workspace; OpenAI-compatible calls use the configured Base URL and API key. | Qwen endpoint must be user-configurable, not compiled to one region. |
| 2026-08-06 | `https://www.alibabacloud.com/help/en/model-studio/deepseek-api` | Service endpoints vary by region; `deepseek-v4-pro` is an exact Alibaba-served model ID. | Supports exact native Qwen wire value and rejects hardcoded custom-provider endpoint identity. |
| 2026-08-06 | `https://www.alibabacloud.com/help/en/model-studio/text-generation-model` | Current recommended-model table lists `deepseek-v4-pro` at 1M context and `glm-5.2` at 198k. | Alibaba-route static context values for native Qwen definitions. |
| 2026-08-06 | `https://www.alibabacloud.com/help/en/model-studio/token-plan-overview` | Current Token Plan lists exact `deepseek-v4-pro` and `glm-5.2`; the plan supplies a dedicated Base URL/key. | Confirms models are legitimate Alibaba/Qwen inference offerings and endpoint/key pairing belongs to native configuration. |
| 2026-07-30 | `https://docs.qwencloud.com/developer-guides/getting-started/text-generation-models` | The preceding Qwen3.8 preview line was documented at 1M context and Token Plan availability. | Context provenance basis for production `qwen3.8-max`, combined with the user's explicit production-ID update; must be refreshed when final vendor docs stabilize. |
| 2026-08-06 | `https://www.alibabacloud.com/help/en/model-studio/models` | Exact `deepseek-v4-pro` model and multiple workspace/region endpoints are exposed. | Corroborates exact value and dynamic URL requirement. |

Searches used on 2026-08-06 included:

- `site:alibabacloud.com/help/en/model-studio qwen3.8-max deepseek-v4-pro glm-5.2`
- `site:docs.qwencloud.com qwen3.8-max deepseek-v4-pro glm-5.2`
- exact searches for `"qwen3.8-max"` and `"qwen3.8-max-preview"`

## Relevant Existing Behavior And Production Paths

| Behavior ID | Supported Trigger / Contract | Current Production Path | Evidence-Backed Current Result |
| --- | --- | --- | --- |
| BEH-001 | User probes/saves/reloads a custom provider | Settings -> GraphQL -> `LlmProviderService` -> shared endpoint discovery -> custom runtime sync -> custom `LLMModel` | Valid identifiers and recognized optional numeric fields are retained; failures preserve last-known-good models. |
| BEH-002 | Custom endpoint returns a model with missing numeric fields | Discovered row -> endpoint metadata resolver -> custom constructor | Current branch checks endpoint profiles/aliases, then exact built-in values. User rejects the first two mechanisms. |
| BEH-003 | Agent uses a custom model and token usage is projected | Model -> runtime -> `resolveTokenBudget` -> compaction -> token summary -> token meter | Known context enables a trigger; unknown context remains explicit and does not invent a denominator. |
| BEH-004 | User selects Qwen in Settings and saves a key | Generic key editor -> save-provider-key mutation -> secret vault | No Base URL is accepted or returned as Qwen configuration. |
| BEH-005 | Runtime creates any Qwen-owned model | `LLMFactory` -> `QwenLLM` -> OpenAI client | Every call uses the compiled Singapore pay-as-you-go Base URL. |
| BEH-006 | Registry initializes Qwen, DeepSeek, and GLM definitions | Static definitions -> `LLMModel` -> identifier map | Shared model `value`s across providers are possible, but shared default API model identifiers collide unless `modelIdentifierOverride` is used. |

## Design Health Assessment Evidence

| Signal | Evidence | Classification | Required Response |
| --- | --- | --- | --- |
| Alibaba custom-profile policy is route-specific | Current resolver contains one exact Token Plan hostname/path and a dated DeepSeek alias | Ownership issue | Delete it; native Qwen owns Alibaba route configuration and served models. |
| Same context need can be served generically | Built-in definitions already own static metadata and custom resolver already builds an exact value index | Healthy reusable owner | Keep only exact value fallback and inferred source. |
| Native Qwen route is compiled | `QwenLLM` constructor contains the literal | Local ownership defect | Resolve effective URL from Qwen configuration at runtime. |
| General data model is sufficient | `baseUrl`, secret credential identity, `value`, `modelIdentifierOverride`, and static metadata already exist | No generalized schema gap | Reuse them; do not add offering/producer/plan/region fields. |
| Duplicate values collide by default identifiers | `LLMModel.generateIdentifier()` returns `name` for API runtime; registry replaces same identifier | Missing invariant for cross-provider offerings | Require explicit unique identifiers for Qwen-served DeepSeek/GLM definitions. |
| Qwen pair success can be non-durable | `AppConfig.set` swallows `.env` write failure after the new secret can already be saved | Reachable durability defect (`PREM-QWEN-001`, `ARCH-DESIGN-004`) | Add strict atomic AppConfig write; use key-first ordering with an old-key snapshot and compensation on URL failure; never return false success. |
| Default versus configured URL is not projected | Effective `baseUrl` plus key flag cannot distinguish an absent setting from an explicitly configured equal URL | Missing observable state (`ARCH-DESIGN-005`) | Add narrow Qwen setup status with effective URL, `DEFAULT|CONFIGURED`, and key flag. |

Refactor decision: `Required now`. The current endpoint-profile machinery directly contradicts the approved simplification and must be removed, not left dormant.

## Relevant Files / Components

### Core runtime and metadata

- `autobyteus-ts/src/llm/api/qwen-llm.ts`
- `autobyteus-ts/src/llm/supported-model-definitions.ts`
- `autobyteus-ts/src/llm/supported-model-definition.ts`
- `autobyteus-ts/src/llm/models.ts`
- `autobyteus-ts/src/llm/llm-factory.ts`
- `autobyteus-ts/src/llm/openai-compatible-endpoint-discovery.ts`
- `autobyteus-ts/src/llm/openai-compatible-endpoint-provider.ts`
- `autobyteus-ts/src/llm/metadata/openai-compatible-endpoint-model-metadata.ts`
- `autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts`
- `autobyteus-ts/src/agent/token-budget.ts`

### Server configuration and catalog

- `autobyteus-server-ts/src/config/app-config.ts`
- `autobyteus-server-ts/src/secret-management/catalog/provider-credential-catalog.ts`
- `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts`
- `autobyteus-server-ts/src/llm-management/llm-providers/builtins/built-in-llm-provider-catalog.ts`
- `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts`
- `autobyteus-server-ts/src/llm-management/services/model-metadata-provisioning-service.ts`

### Frontend

- `autobyteus-web/components/settings/ProviderAPIKeyManager.vue`
- `autobyteus-web/components/settings/providerApiKey/ProviderApiKeyEditor.vue`
- `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts`
- `autobyteus-web/stores/llmProviderConfig.ts`
- `autobyteus-web/graphql/queries/llm_provider_queries.ts`
- `autobyteus-web/graphql/mutations/llm_provider_mutations.ts`
- localization and component/store tests

## Persisted Data Transition Evidence (When Applicable)

- Existing Qwen key lives under `provider.qwen.api-key`; the approved change does not alter that consumer identity or secret value shape.
- Built-in provider records are currently generated, not persisted as custom-provider rows.
- `AppConfig` already persists non-secret settings in `.env` and updates `process.env`; an optional `QWEN_BASE_URL` therefore fits existing configuration semantics.
- The existing best-effort `set` is insufficient for the supported Settings command. A strict method can reuse environment-line serialization but must exclusively create a same-directory temporary file with the existing `.env` mode, write/fsync/close it, and atomically rename it over `.env` before updating `configData/process.env`. Rename is the commit point; the method throws only for pre-commit failure, cleans the temporary path, and cannot report failure after replacing the authoritative file.
- No custom-provider or database schema is changed.
- Decision: `Directly Usable — No Migration`. Absence of `QWEN_BASE_URL` has a deliberate default meaning.

## Constraints / Dependencies / Compatibility Facts

- One native Qwen endpoint per installation is sufficient for this scope.
- Existing key-only users must retain the current default route until they explicitly save another pair.
- The Qwen Base URL and API key must be supplied together for configuration replacement; a failed probe must not mutate the active configuration.
- The pair command snapshots the prior secret, saves the new key, and only then invokes strict URL persistence. URL failure triggers previous-secret restoration or removal of the newly created key. Success is returned only after both commits; compensation failure is a distinct repair-required result and cannot claim all-old.
- The server, not the browser, determines whether `QWEN_BASE_URL` is absent (`DEFAULT`) or present (`CONFIGURED`). A configured value equal to the historical default remains `CONFIGURED`.
- `deepseek-v4-pro` and `glm-5.2` are duplicate exact values across providers, so their Qwen model identifiers must be unique without changing wire values.
- Custom exact fallback can see multiple definitions with the same value; lowest-valid-per-field selection remains the conservative deterministic policy.
- The user's required `qwen3.8-max` is authoritative product scope even while public documentation indexing lags the production rename.

## Open Unknowns / Risks

- Final first-party `qwen3.8-max` production documentation should replace the preview-era source URL/date when available. This does not justify keeping the preview value.
- GLM-5.2 vendor pages have conflicted between approximately 198k and 1M. The Alibaba route uses the conservative 198k current overview value; direct GLM remains separately sourced.
- AppConfig and secret vault are separate stores. Strict URL persistence plus bounded secret compensation provides all-or-old for individual write failures without a generalized transaction manager. A bounded double failure remains possible and is explicitly surfaced as repair-required rather than hidden.
- The branch is materially behind `origin/personal`; integration conflicts may appear later and belong to delivery refresh, not solution design.

## Notes For Architecture Reviewer

- Treat `SR-011` as the focused correction to the `SR-010` material replacement, not a change to its approved custom/Qwen model direction.
- Confirm complete removal of custom endpoint identity/profile/alias policy.
- Confirm the native Qwen configuration boundary is minimal: one optional non-secret Base URL plus the existing key secret.
- Confirm the global model-identifier collision invariant is handled with existing `modelIdentifierOverride` rather than a new schema.
- Confirm source-dated route-specific context values and the conservative GLM decision.
- Confirm `ARCH-DESIGN-004` is closed by the concrete strict AppConfig method, key-first ordering, previous-secret snapshot, compensation/removal, success gate, and two sanitized failure outcomes.
- Confirm `ARCH-DESIGN-005` is closed by the Qwen-specific setup status `{effectiveBaseUrl, endpointSource, apiKeyConfigured}` and that no generalized provider/model attributes or browser URL comparison are introduced.
- Prior implementation/review/test/delivery reports are historical and must be rerun downstream after this design passes and implementation is reworked.

## Architecture Review Rework Evidence

### ARCH-REV-004

- Canonical report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`
- Chronological record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/architecture-review-revision-record.md`
- Decision: `Fail — Design Impact`.
- Confirmed sound: exact-only custom metadata, endpoint-profile/alias removal, native Qwen endpoint ownership, exact required values, identifier overrides, reduced source union, no generalized offering schema, and no migration.
- `ARCH-DESIGN-004`: the prior command could report success after a session-only URL write and restart with old/default URL plus new key. `SR-011` specifies strict atomic file replacement before runtime mutation, key-first ordering with a retained previous secret, bounded secret compensation, a success gate, `QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED`, and `QWEN_CONFIGURATION_REPAIR_REQUIRED`.
- `ARCH-DESIGN-005`: effective URL plus key flag could not represent the approved key-only/default state. `SR-011` adds a Qwen-specific setup status with only the effective URL, `DEFAULT|CONFIGURED`, and key flag; query/mutation/UI consume it directly.
