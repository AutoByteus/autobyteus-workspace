# Credential Consumer And Transition Mapping

## Artifact Metadata

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/credential-consumer-mapping.md`.
- Purpose: retain the current source inventory and define the target mapping from source aliases to product definitions, authorized consumers, exact Store-independent LLM/media construction, preserved dual-key Gemini live metadata, legacy-source non-authority, the explicit Local import allowlist, and the external Codex exclusion.
- Scope: REQ-001, REQ-002, REQ-004, REQ-005, REQ-011, REQ-014, REQ-016, REQ-018–REQ-020 / AC-005, AC-009–AC-012, AC-018–AC-020.
- Status: `Original Gemini Metadata Preservation Reconciliation; Architecture Re-review Required`.
- Approval applicability: `Required` for target identities/mappings; prior importer/no-automatic-update/Codex/Claude outcomes remain user-approved. Corrected CR-021 records the user-confirmed original dual-key Gemini metadata behavior and authorizes no source redesign. Current-source evidence is approval `N/A`.
- Core artifacts supported: [requirements.md](./requirements.md), [investigation-notes.md](./investigation-notes.md), [design-spec.md](./design-spec.md).
- Related supplements: [use-case-spine-validation.md](./use-case-spine-validation.md), [secret-storage-architecture.md](./secret-storage-architecture.md), [secret-storage-backend-contract.md](./secret-storage-backend-contract.md), [live-test-secret-provisioning.md](./live-test-secret-provisioning.md), [threat-model-and-option-analysis.md](./threat-model-and-option-analysis.md).

## Mapping Rules

1. A stable secret definition represents one upstream credential, not one environment variable occurrence.
2. One definition may authorize multiple trusted consumers when the upstream provider credential is intentionally shared (for example OpenAI LLM plus OpenAI image/audio).
3. Runtime classes request the semantic slot `apiKey`; they do not know definition IDs or legacy aliases.
4. Server provisioning services resolve the mapping from compound consumer identity to definition ID.
5. Custom-provider secret identity derives from the immutable custom provider UUID. It is not a free-form name and is not duplicated in persisted metadata.
6. Non-secret provider configuration is passed separately. It never shares a string map with credentials.
7. Vertex Project project/location configuration is non-secret and distinct from both API-key modes. Any cloud workload identity used by the trusted provider process remains deployment-owned and is not projected to governed agent children.
8. Physical Store selection is a backend-bootstrap concern. A consumer definition and construction mapping is identical in the default Local Store, separate real-E2E Local Store, or an enterprise namespace; consumers cannot select Stores or paths.
9. Claude managed authentication reuses the upstream Anthropic definition through its own exact runtime identity. Sharing one definition does not merge the Claude, native LLM, or metadata consumer boundaries.
10. A model's displayed provider and its credential provider are distinct facts. Native registration assigns the required `credentialProviderId` once from the known credential owner; AutoByteus-runtime registration assigns `AUTOBYTEUS` because the gateway, not the downstream model creator, receives the request. The construction target omits displayed provider, so provisioning has no provider fallback.
11. Discovery and construction consumers are distinct authorizations even when they share one definition. Hosts remain non-secret configuration and never enter a consumer identity.
12. Source aliases are positive explicit-import metadata. One immutable alias-to-definition registry owns import eligibility; the non-secret configuration boundary may reuse its names for exclusion while retaining a broader independent sensitive-name predicate. That broader predicate never flows back into import. Current catalog definitions, consumer identities, runtime config, and status never expose aliases. Neither boundary accepts caller-supplied definition IDs.
13. Gemini authentication mode is a required LLM/media construction semantic; `gemini-helper.ts` maps it exhaustively to exact SDK options and never infers or retries another mode from available values. Metadata is a separate accepted contract: exact AI Studio/Vertex Express consumer selection supplies one key to the common Generative Language provider; Vertex Project supplies none and uses curated metadata.
14. Codex is not a managed secret consumer. Its external `codex login` state and pre-ticket environment/home launch remain Codex-owned and are outside the `LOCAL_HARDENED` child-environment guarantee.

## Built-In Provider Mapping

| Target Secret Definition ID | Legacy Alias(es) | Current Source Consumers | Target Authorized Consumers | Target Construction / Use Boundary | Notes |
| --- | --- | --- | --- | --- | --- |
| `provider.openai.api-key` | `OPENAI_API_KEY` | `OpenAILLM`/`OpenAIResponsesLLM`; OpenAI audio/image clients; OpenAI live tests | LLM provider `OPENAI`; LLM metadata only if later needed; media provider `OPENAI` for audio/image | `LLMProvisioningService -> LLMConstructionContext`; `MediaClientProvisioningService -> MultimediaConstructionContext` | One upstream credential; do not create media-specific copies. |
| `provider.anthropic.api-key` | `ANTHROPIC_API_KEY` | `AnthropicLLM`; `AnthropicModelMetadataProvider`; live tests; current Claude API-key auth path | LLM `ANTHROPIC`; metadata `ANTHROPIC`; agent runtime `{runtimeKind:"claude_agent_sdk", credentialSlot:"apiKey"}` only in explicit `managed-secret` | LLM/metadata provisioning; `ClaudeRuntimeAuthenticationService -> ClaudeSdkClient` for managed child delivery | One stored upstream credential. Claude default `cli` does no resolution; managed mode is separately authorized and receives child-only environment delivery. |
| `provider.mistral.api-key` | `MISTRAL_API_KEY` | `MistralLLM`; metadata provider; live tests | LLM and metadata provider `MISTRAL` | LLM/metadata provisioning | Remove constructor environment read. |
| `provider.deepseek.api-key` | `DEEPSEEK_API_KEY` | `DeepSeekLLM`; live tests | LLM `DEEPSEEK` | `LLMConstructionContext.authentication=apiKey` | OpenAI-compatible base URL remains class/model metadata. |
| `provider.grok.api-key` | `GROK_API_KEY` | `GrokLLM`; live tests | LLM `GROK` | LLM construction |  |
| `provider.kimi.api-key` | `KIMI_API_KEY` | `KimiLLM`; metadata provider; live tests | LLM and metadata `KIMI` | LLM/metadata provisioning |  |
| `provider.qwen.api-key` | `DASHSCOPE_API_KEY` | `QwenLLM`; live tests | LLM `QWEN` | LLM construction | Product definition uses provider identity. Explicit import accepts only the current DashScope spelling; runtime remains alias-free. |
| `provider.glm.api-key` | `GLM_API_KEY` | `GlmLLM`; live tests | LLM `GLM` | LLM construction |  |
| `provider.minimax.api-key` | `MINIMAX_API_KEY` | `MinimaxLLM`; live tests | LLM `MINIMAX` | LLM construction |  |
| `provider.lmstudio.api-key` | `LMSTUDIO_API_KEY` | `LMStudioLLM` optional endpoint authentication | LLM `LMSTUDIO` only when endpoint requires auth | LLM construction | Optional credential requirement. Local unauthenticated models require no secret. |
| `provider.gemini.ai-studio-api-key` | `GEMINI_API_KEY` | Gemini LLM/media helper; Gemini metadata; Settings/live tests | Gemini LLM/media plus metadata in `AI_STUDIO` mode | LLM/media `{kind:"geminiAiStudio",apiKey}` -> `GoogleGenAI({apiKey})`; metadata -> existing `GeminiModelMetadataProvider(apiKey)` -> Generative Language models endpoint | Explicit mode replaces environment-precedence selection while preserving metadata request behavior. |
| `provider.google.vertex-express-api-key` | `VERTEX_AI_API_KEY` | Gemini LLM/media helper; Gemini metadata; Settings/live tests | Gemini LLM/media plus metadata in `VERTEX_EXPRESS` mode | LLM/media `{kind:"geminiVertexExpress",apiKey}` -> `GoogleGenAI({vertexai:true,apiKey})`; metadata -> existing `GeminiModelMetadataProvider(apiKey)` -> the same Generative Language models endpoint | Exact LLM/media service selection and dual-key metadata behavior are distinct preserved contracts. |
| `provider.autobyteus.api-key` | `AUTOBYTEUS_API_KEY` | `AutobyteusModelProvider`; AutoByteus audio/image providers; `AutobyteusLLM`; AutoByteus audio/image clients; live remote tests | discovery `{kind:"modelDiscovery",modelKind:"llm"\|"audio"\|"image",providerId:"AUTOBYTEUS",credentialSlot:"apiKey"}`; construction `llm/AUTOBYTEUS/apiKey` and `media/{audio\|image}/AUTOBYTEUS/apiKey` | `AutobyteusRemoteModelDiscoveryService` for catalog requests; generic LLM/media provisioning for invocation; `AutobyteusClient` unwraps at request-client construction | One gateway credential. `AUTOBYTEUS_LLM_SERVER_HOSTS` remains non-secret. No hosts performs zero lookup. Do not resolve the downstream model provider key. |

### Gemini Vertex Project mode and deployment identity

| Current Values | Classification | Target Handling |
| --- | --- | --- |
| `VERTEX_AI_PROJECT`, `VERTEX_AI_LOCATION` | non-secret provider runtime configuration | stored through the non-secret provider configuration owner and passed as `{kind:"geminiVertexProject",project,location}` -> `GoogleGenAI({vertexai:true,project,location})` |
| ADC/service-account/metadata identity used by Google SDK | protected workload identity, not an API-key value in the catalog | available only to trusted server/provider process; absent from agent sandbox environment, mounts, home, and metadata route |

`GEMINI_SETUP_MODE` is an explicit non-secret setting with one of `AI_STUDIO`, `VERTEX_EXPRESS`, or `VERTEX_PROJECT`. LLM/media provisioning maps it to exact SDK variants. Metadata uses it only to select the exact AI Studio or Vertex Express semantic consumer; Vertex Project selects no live metadata provider. No client checks another credential or retries another definition.

Gemini credential slots and mode selection are separate subject operations. A write-only Settings action saves/removes `aiStudioApiKey` or `vertexExpressApiKey`; selecting an API-key mode succeeds only when that slot reports `CONFIGURED`. `VERTEX_PROJECT` validates and saves project/location through the non-secret config owner. Mode selection never falls back to another slot and never implicitly deletes an inactive key; explicit remove owns deletion. This avoids a cross-store pseudo-transaction and accidental key loss while making active authentication unambiguous.

## Custom OpenAI-Compatible Provider Mapping

### Current shape

```json
{
  "version": 1,
  "providers": [
    {
      "id": "<uuid>",
      "name": "...",
      "providerType": "OPENAI_COMPATIBLE",
      "baseUrl": "https://...",
      "apiKey": "<plaintext>"
    }
  ]
}
```

The current runtime also copies `apiKey` into `OpenAICompatibleEndpointModel.endpointApiKey` and passes it as an `apiKeyDefault` constructor fallback.

### Target shape

```json
{
  "version": 2,
  "providers": [
    {
      "id": "<uuid>",
      "name": "...",
      "providerType": "OPENAI_COMPATIBLE",
      "baseUrl": "https://..."
    }
  ]
}
```

Target definition ID:

```text
provider.openai-compatible.<provider-uuid>.api-key
```

The definition ID is derived; persisting both `provider.id` and `credentialSecretId` would create drift-prone duplicate identity. `OpenAICompatibleEndpointModel` retains only endpoint/provider ID, display name, and base URL. Discovery and LLM construction receive a temporary resolved `apiKey` through provisioning.

### Create sequencing

```text
GraphQL write-only input
 -> LlmProviderService normalizes/validates metadata
 -> provider discovery probe
 -> allocate provider UUID
 -> CustomLlmProviderStore.createProvider(v2 metadata)
 -> SecretManagementService.saveForConsumer(custom-provider identity, transient SecretValue)
 -> model reload
```

If metadata persistence fails, no secret has been saved. If the secret save fails, delete the newly allocated metadata record before returning failure. A process crash between those steps may leave metadata with a missing derived secret; normal startup treats that provider as unconfigured, does not build credentialed models for it, and permits retry/delete without a separate persisted transaction-state field. If model reload fails after both durable writes, keep the provider/secret and record a value-free reload error for retry; do not destroy a successfully provisioned provider.

### Delete sequencing

```text
resolve current provider metadata
 -> if absent: return value-free success
 -> SecretManagementService.remove(custom definition ID)
 -> delete v2 metadata
 -> reload models
```

Missing provider and missing secret are both idempotent success. If metadata deletion fails, the provider remains visible but unconfigured and delete can be retried; “deletion pending” is an observable operation outcome, not a new persisted transaction field. No orphan secret remains. If model reload fails after deletion, stale in-memory models are removed/rebuilt by the existing last-known-good/reload owner according to a value-free failure status; no model contains the old key.

## Search Mapping

| Target Secret Definition ID | Legacy Alias | Non-Secret Configuration | Current Consumer | Target Boundary |
| --- | --- | --- | --- | --- |
| `search.serper.api-key` | `SERPER_API_KEY` | `DEFAULT_SEARCH_PROVIDER=serper` | `SearchClientFactory`, `SerperSearchStrategy` | `SearchProvisioningService` constructs/invokes a `SearchExecutor` with explicit api-key credentials. |
| `search.serpapi.api-key` | `SERPAPI_API_KEY` | `DEFAULT_SEARCH_PROVIDER=serpapi` | factory/`SerpApiSearchStrategy` | same |
| `search.vertex-ai.api-key` | `VERTEX_AI_SEARCH_API_KEY` | provider selection plus `VERTEX_AI_SEARCH_SERVING_CONFIG` | factory/`VertexAISearchStrategy` | same |

`GOOGLE_CSE_API_KEY`/`GOOGLE_CSE_ID` are removed from active Settings and historical importer aliases because the current core factory explicitly rejects `google_cse` as unsupported. Retaining a UI write path for an unusable provider is not compatibility worth preserving.

The `Search` tool no longer instantiates a process-global `SearchClientFactory`. Its tool definition is registered with an injected `SearchExecutor` supplied by the server. The executor resolves/refreshes the selected provider client through `SearchProvisioningService`; no credential is placed in serializable `ToolConfig`.

## Media Mapping

| Media Consumer | Current Credential Source | Target Credential Requirement | Target Change |
| --- | --- | --- | --- |
| OpenAI audio | `process.env.OPENAI_API_KEY` in `OpenAIAudioClient` | `provider.openai.api-key`, slot `apiKey` | constructor receives `MultimediaConstructionContext`; SDK client unwraps once. |
| OpenAI image | same | same | same |
| Gemini audio/image/video helpers | Gemini/Vertex environment selection | exact `geminiAiStudio`, `geminiVertexExpress`, or `geminiVertexProject` variant from the explicit mode and matching definition/configuration | `MediaClientProvisioningService` resolves before factory construction; the shared helper maps to exact SDK options with no fallback. |
| AutoByteus remote audio | `process.env.AUTOBYTEUS_API_KEY` plus `AUTOBYTEUS_LLM_SERVER_HOSTS` | `provider.autobyteus.api-key`, media `audio`, provider `AUTOBYTEUS`, slot `apiKey` | remote model keeps downstream provider but sets `credentialProviderId=AUTOBYTEUS`; media provisioning resolves gateway key for `AutobyteusAudioClient`. |
| AutoByteus remote image | same | `provider.autobyteus.api-key`, media `image`, provider `AUTOBYTEUS`, slot `apiKey` | same for `AutobyteusImageClient`. |
| Other local media | non-secret host config or no credential | `none` unless its authoritative model declares auth | no artificial secret requirement |

`MediaGenerationService` already has injectable client creators. They become asynchronous and are supplied by `MediaClientProvisioningService`; media tool code never imports secret management.

## Live Model Metadata Mapping

The supported production path is model list/reload -> GraphQL/`LlmProviderService` -> `ModelCatalogService` -> `ModelMetadataProvisioningService` -> provider -> `ModelMetadataResolver`. Target behavior:

1. Core `LLMFactory` and the catalog can always initialize from curated metadata without credentials.
2. `ModelMetadataProvisioningService` owns explicit mode/consumer selection, provider caching, and invalidation:
   - `AI_STUDIO` resolves only `{kind:"llmMetadata",providerId:"GEMINI",credentialSlot:"geminiAiStudioApiKey"}` and constructs the existing key-based metadata provider;
   - `VERTEX_EXPRESS` resolves only `{kind:"llmMetadata",providerId:"GEMINI",credentialSlot:"geminiVertexExpressApiKey"}` and constructs that same provider;
   - `VERTEX_PROJECT` constructs no live metadata provider and performs zero metadata secret lookup.
3. `GeminiModelMetadataProvider` preserves the original dual-key contract: the already-selected key authenticates the Generative Language models endpoint, and the provider maps `name`, `baseModelId`, `inputTokenLimit`, and `outputTokenLimit`. It owns no backend, mode selector, alternate credential lookup, or ambient alias.
4. `ModelMetadataResolver` preserves its live-over-curated merge and timeout/failure containment. Missing selected input or provider failure leaves curated metadata in place; it never triggers a second credential lookup, another Store, or ambient fallback.
5. Custom endpoint discovery uses the custom provider's derived secret through `LlmProviderService`, not the core static endpoint provider reading a model-held key.

## AutoByteus Remote Gateway Mapping

### Existing supported triggers

- startup/cache-preload and first catalog list;
- full LLM/audio/image reload;
- targeted `AUTOBYTEUS` LLM reload;
- saving/replacing the `AUTOBYTEUS` provider key, after which the existing web flow requests a full reload;
- constructing/invoking a selected remote LLM/audio/image model.

All remain supported. Only credential sourcing changes.

### Discovery consumers

```ts
type AutoByteusDiscoveryConsumer = {
  kind: "modelDiscovery";
  modelKind: "llm" | "audio" | "image";
  providerId: "AUTOBYTEUS";
  credentialSlot: "apiKey";
};
```

`AutobyteusRemoteModelDiscoveryService` checks normalized configured hosts first. An empty host set clears only the matching model-kind AutoByteus runtime subset without calling secret management. Otherwise it resolves the exact model-kind consumer, passes `SecretValue` through an explicit discovery-authentication shape, and invokes the corresponding core provider. The core provider unwraps only while constructing `AutobyteusClient`; it never imports server secret management.

Successful results atomically replace only that model kind's `runtime=AUTOBYTEUS` registrations. A remote OpenAI model and a native OpenAI model therefore coexist. A transient failure before an authoritative result preserves the previous remote subset and returns/logs only a stable value-free outcome; a successful authoritative empty response clears the subset. Explicit successful credential removal is authoritative lifecycle input and clears every AutoByteus runtime subset without discovery resolution.

### Construction identity

```ts
type LLMConstructionTarget = {
  credentialProviderId: string;
  authenticationRequirement: LLMAuthenticationRequirement;
};
```

Native model registration materializes the required `credentialProviderId` once from the known credential owner. Every AutoByteus-runtime model created by remote LLM/audio/image discovery materializes it as `AUTOBYTEUS`, even when `model.provider` remains `OPENAI`, `GEMINI`, or another returned provider. Generic LLM/media provisioning builds its existing consumer only from the construction target's `credentialProviderId`; displayed provider is absent and no fallback, AutoByteus conditional, or host-derived inference is added.

```text
remote model selection
 -> describe construction target
 -> credentialProviderId AUTOBYTEUS
 -> resolve llm/AUTOBYTEUS/apiKey or media/<kind>/AUTOBYTEUS/apiKey
 -> provider.autobyteus.api-key
 -> construction context
 -> AutobyteusClient gateway request
```

### Settings and status

The existing built-in provider row `AUTOBYTEUS` uses the same write-only editor/status projection as other API-key providers. It is no longer skipped as not applicable. Save/replace retains the established full refresh. Idempotent successful remove clears all AutoByteus-runtime LLM/audio/image subsets without resolving the removed definition. `AUTOBYTEUS_LLM_SERVER_HOSTS` remains in the existing endpoint Settings surface. The frontend receives backend health and `MISSING|CONFIGURED`, never the saved value. No generic gateway-secret UI or new server route is introduced.

## LLM Construction Mapping

### Core non-serializable types

```ts
type ResolvedLLMAuthentication =
  | { kind: "none" }
  | { kind: "apiKey"; apiKey: SecretValue }
  | { kind: "geminiAiStudio"; apiKey: SecretValue }
  | { kind: "geminiVertexExpress"; apiKey: SecretValue }
  | { kind: "geminiVertexProject"; project: string; location: string };

// Multimedia reuses ResolvedLLMAuthentication.
// Metadata receives only one exact selected key at its existing provider boundary.

type LLMConstructionContext = {
  config: LLMConfig;
  authentication: ResolvedLLMAuthentication;
};
```

`LLMConstructionContext` is intentionally not named `LLMRuntimeConfig`:

- `LLMConfig` remains model/request behavior configuration and stays serializable;
- authentication is a runtime dependency resolved by a higher service;
- combining them under a generic config object invites accidental cloning/transport and blurs ownership.

### Target OpenAI path

```text
AutoByteusAgentRunBackendFactory
 -> LLMProvisioningService.createLLM(modelIdentifier, configInput)
 -> LLMFactory.describeConstructionTarget(modelIdentifier)
 -> target {credentialProviderId: OPENAI, authenticationRequirement: {kind: apiKey, credentialSlot: apiKey}}
 -> SecretManagementService.resolveForUse({kind: llm, providerId: target.credentialProviderId, credentialSlot: target.authenticationRequirement.credentialSlot})
 -> SecretManagementService resolves provider.openai.api-key through its internal catalog
 -> LLMFactory.createLLM(modelIdentifier, { configInput, authentication })
 -> OpenAILLM/OpenAIResponsesLLM
 -> new OpenAIClient({ apiKey: authentication.apiKey.revealToTrustedConsumer() })
```

`LLMFactory` composes model defaults with the caller config and creates the context. `describeConstructionTarget` returns exactly `{credentialProviderId, authenticationRequirement}`; displayed/creator provider and a duplicate top-level slot are absent. The server provisioning service uses only the returned credential owner and the requirement-owned slot; the individual LLM resolves neither. No static global resolver setter is introduced.

### Model credential requirement declaration

`LLMModel`/supported model definitions gain non-secret requirements:

```ts
type LLMAuthenticationRequirement =
  | { kind: "apiKey"; credentialSlot: "apiKey"; required: boolean }
  | { kind: "geminiAuthenticationMode" }
  | { kind: "none" };
```

The declaration says what the LLM/media client needs. It does not contain a secret definition ID. Server binding maps provider identity and explicit Gemini mode to the exact slot/definition; `gemini-helper.ts` exhaustively constructs AI Studio, Vertex Express, or Vertex Project SDK options. Metadata keeps the separate consumer/provider mapping above. Missing/invalid mode/input fails without inference, alternate-definition retry, or fallback.

### Exact Gemini construction paths

```text
AI_STUDIO LLM/media -> subject provisioning -> resolve selected geminiAiStudioApiKey -> geminiAiStudio -> gemini-helper -> GoogleGenAI({apiKey}) -> subject operation
VERTEX_EXPRESS LLM/media -> subject provisioning -> resolve selected geminiVertexExpressApiKey -> geminiVertexExpress -> gemini-helper -> GoogleGenAI({vertexai:true,apiKey}) -> subject operation
VERTEX_PROJECT LLM/media -> subject provisioning -> validate project/location with zero secret lookup -> geminiVertexProject -> gemini-helper -> GoogleGenAI({vertexai:true,project,location}) -> subject operation

AI_STUDIO metadata -> resolve exact geminiAiStudioApiKey consumer -> GeminiModelMetadataProvider(selected key) -> Generative Language models endpoint -> live-over-curated mapping
VERTEX_EXPRESS metadata -> resolve exact geminiVertexExpressApiKey consumer -> GeminiModelMetadataProvider(selected key) -> same Generative Language models endpoint -> live-over-curated mapping
VERTEX_PROJECT metadata -> zero secret lookup -> no live metadata provider -> curated mapping
```

No path checks another slot/configuration or retries another definition. The LLM/media union is not widened into metadata because the accepted metadata request contract is different. Curated metadata is the established secret-free result fallback, including the Vertex Project metadata path.

## Configuration Classification

| Data | Secret? | Target Owner / Storage |
| --- | --- | --- |
| API key/token/password/private key | Yes | Secret Storage Backend via `SecretManagementService` |
| provider selection/mode | No | non-secret `AppConfig`/provider config store |
| base URL/host | Usually no; validate to prevent credential exfiltration | provider metadata/config store |
| project/location/serving config/model ID | No | provider/search config store |
| backend kind/Store paths/namespace/endpoint | No, but security-sensitive configuration | `SecretStorageConfigurationService`; tracked test file names the canonical real-E2E database/key and read-only mode |
| Local Store key bytes, Vault token, cloud service-account key | Yes/identity | machine/deployment identity outside checkout and agent processes; never ordinary `AppConfig` |
| operation correlation ID/status | No | value-free operation event/status boundary |
| Claude authentication mode (`cli` or `managed-secret`) | No | validated server startup/runtime configuration; omitted means `cli`; no UI secret field required |
| `AUTOBYTEUS_LLM_SERVER_HOSTS` | No | existing non-secret server endpoint Settings/AppConfig; validated before use and admitted independently while credential aliases stay excluded |

Generic server settings reject catalog legacy aliases and sensitive-looking names matching API key/token/password/secret/private-key/credential patterns. `AppConfig.setLlmApiKey/getLlmApiKey` are removed.

## Legacy Source Non-Authority Mapping

| Legacy Source | Target Detection Boundary | Automatic Source Treatment | Current Runtime Treatment | Explicit Operator Path |
| --- | --- | --- | --- | --- |
| canonical application-data `${serverDataDir}/.env` | non-secret `AppConfig` reader classifies names before retaining values | byte-for-byte unchanged; no import, scrub, delete, rewrite, or parent-alias mutation | approved non-secret names only; catalogued sensitive aliases are absent from `get`, `getAll`, persistence state, logs, and child environments; no fallback | UI/Settings or UC-019 with an explicitly supplied absolute source |
| canonical `${serverDataDir}/llm/custom-llm-providers.json` schema v1 | current custom-provider store detects unsupported v1 shape | byte-for-byte unchanged; no credential or metadata conversion/preservation | no v1 provider is loaded into current metadata; return stable value-free `CUSTOM_PROVIDER_LEGACY_RECONFIGURATION_REQUIRED` | operator moves/deletes v1 and recreates the provider through current UI/Settings; approved assignment aliases may separately be imported through UC-019 |
| package/worktree `.env.test` or renamed/copied assignment file | no startup/test reader; UC-019 verifies only the operator-selected absolute file | unchanged; never searched, inferred, or imported automatically | test runner does not load credential assignments | operator may explicitly choose it for UC-019 or use hidden input; cleanup/rotation remains operator-owned |
| Nuxt public `googleSpeechApiKey` | source-code removal | no persisted-data rewrite | field/environment alias absent from current public runtime | no import mapping because no supported consumer exists |
| parent process recognized credential aliases | empty-base runtime/child environment policy and name-first config exclusion | parent environment remains unchanged | server consumers and children receive no alias; no supported fallback | provision Store explicitly; parent cleanup remains operator-owned |
| `CLAUDE_AGENT_SDK_AUTH_MODE` set to `auto` or `api-key` | exact non-secret configuration validation | source is not rewritten | legacy value rejected with value-free remediation | operator selects `cli` or `managed-secret`; omitted defaults to `cli` |
| canonical application `AUTOBYTEUS_API_KEY` | non-secret environment projection boundary | line and inherited alias remain unchanged | AutoByteus remote consumers use `provider.autobyteus.api-key` from Store only; hosts remain usable non-secret config | provision through Settings or import the approved alias explicitly through UC-019 |

UC-015 has no automatic request, plan, mutation result, affected-ID record, Store transaction, phase ledger, or compatibility branch. Physical legacy plaintext may remain until the operator cleans it up; this is a documented `LOCAL_HARDENED` same-user residual, never runtime authority.

## Explicit Local Positive Import Registry

The immutable mapping below is the only approved value-alias set for `pnpm secrets:local:import`. Only an exact name in this table may cause a right-hand side to be parsed or enter a Store plan. The non-secret configuration boundary may reuse these names for exclusion but does not read their values. Importer code must not contain a second map, negative secret-like classifier, or caller-defined mapping.

| Legacy Source Alias | Current Definition ID | Import Eligibility | Notes |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | `provider.openai.api-key` | Yes | shared LLM/audio/image upstream credential |
| `ANTHROPIC_API_KEY` | `provider.anthropic.api-key` | Yes | authorizes native Anthropic and explicit managed Claude through separate consumers |
| `MISTRAL_API_KEY` | `provider.mistral.api-key` | Yes |  |
| `DEEPSEEK_API_KEY` | `provider.deepseek.api-key` | Yes |  |
| `GROK_API_KEY` | `provider.grok.api-key` | Yes |  |
| `KIMI_API_KEY` | `provider.kimi.api-key` | Yes |  |
| `DASHSCOPE_API_KEY` | `provider.qwen.api-key` | Yes | current Qwen runtime and integration-test spelling |
| `GLM_API_KEY` | `provider.glm.api-key` | Yes |  |
| `MINIMAX_API_KEY` | `provider.minimax.api-key` | Yes |  |
| `LMSTUDIO_API_KEY` | `provider.lmstudio.api-key` | Yes | optional endpoint authentication |
| `AUTOBYTEUS_API_KEY` | `provider.autobyteus.api-key` | Yes | hosts remain separate non-secret configuration |
| `GEMINI_API_KEY` | `provider.gemini.ai-studio-api-key` | Yes | does not select/change authentication mode |
| `VERTEX_AI_API_KEY` | `provider.google.vertex-express-api-key` | Yes | established real Gemini E2E mode uses this definition |
| `SERPER_API_KEY` | `search.serper.api-key` | Yes |  |
| `SERPAPI_API_KEY` | `search.serpapi.api-key` | Yes |  |
| `VERTEX_AI_SEARCH_API_KEY` | `search.vertex-ai.api-key` | Yes | distinct from Vertex Express LLM/media definition |

Absence from this registry is intentional non-eligibility, not an error classification. `QWEN_API_KEY`, `ZHIPU_API_KEY`, `DATABASE_URL`, `OLLAMA_API_KEY`, `GOOGLE_CSE_API_KEY`, `CLAUDE_CODE_API_KEY`, its descriptor alias, and every other unlisted name are ignored/non-blocking; none is mapped, retained, or reported by name. In particular, GLM has only the current `GLM_API_KEY` alias, and legacy ZHIPU support is not preserved.

Importer mapping rules:

1. Every mapped definition must exist in the current catalog before target access or prompt.
2. A syntactically valid recognized assignment whose post-unquote/outer-whitespace-normalized value is empty is absent/non-selected. It creates no credential, plan/output metadata, warning, or error and does not participate in duplicate tracking. One populated occurrence selects normally; two populated occurrences of the same recognized spelling reject even if values match. Populated dynamic values reject. Missing/empty aliases preserve target records. Each definition has exactly one supported import spelling; Qwen uses only `DASHSCOPE_API_KEY`.
3. The scanner recognizes first and parses second. Every line not selected by the positive registry is ignored without right-hand-side interpretation, regardless of name shape or unrelated syntax. Output carries no ignored-line metadata.
4. Importing a value never changes non-secret mode/provider/host configuration. For example, `VERTEX_AI_API_KEY` provisions only the Vertex Express definition; it does not select `VERTEX_EXPRESS` mode.
5. Target `default|e2e` changes only physical custody. The logical mapping and authorized consumer set are identical. The importer opens only the selected target and never reads/copies another Store.
6. Output may list only current definition IDs, closed plan/result states, action counts, and stable codes. Alias names, values, ignored-line metadata, and source paths do not appear in evidence. Filename/extension has no mapping or format-selection meaning.

## Agent Process And Identity Exposure Mapping

Removing consumer environment reads is necessary but not sufficient. The following current spawn groups must use a central `AgentProcessEnvironmentPolicy` and, for strict mode, an isolated launcher:

| Spawn / Tool Group | Current Risk | Target Rule |
| --- | --- | --- |
| non-interactive shell/background process | resolver defaults to/copies `process.env` | explicit allowlist, sandbox HOME/TMP, sandbox filesystem/identity |
| direct/isolated PTY, bridge, WSL/tmux | parent env/cwd propagated | same policy encoded once and passed to every backend; no real home/Store files/backend identity |
| Codex app-server | established client defaults to `process.env` and real HOME/CODEX_HOME; ticket helper replaced that with a synthetic home | restore/preserve the single pre-ticket `options.env ?? process.env` launch so Codex-owned external `codex login` state remains available; no Store resolve, account RPC, mode/status/rotation owner, synthetic home, or fallback; explicitly outside the `LOCAL_HARDENED` child-environment claim |
| Claude SDK/client | starts from full env, accepts caller `env`, removes only some keys in one mode, and loads broad setting sources | exact `cli` or `managed-secret`; both build from empty base and reject caller `env`. CLI receives no key and deliberately maps the existing node-local account home/config root, not a new empty directory. Managed receives exactly `ANTHROPIC_API_KEY` in the exact child, empty setting sources, `tools: []`, and strict explicitly materialized AutoByteus MCP; no other child receives it |
| MCP servers | may inherit server env or user config | build a sanitized operational base, then add the exact explicitly configured server-specific `config.env` map through the additions boundary; do not treat that map as the parent or inherit unrelated product/Store credentials |
| browser/application/file-watcher workers, including `application-engine/runtime/application-worker-supervisor.ts` | the supported application worker currently spreads `process.env` and executes with the server filesystem identity | classify trusted support worker versus application/agent-controlled worker; each receives its own empty-base allowlist; first delivery also denies Store paths through built-in file tools but does not claim arbitrary same-user filesystem denial |
| Electron embedded server | platform managers spread parent env | server receives non-secret startup config and constructs the in-process Local backend against canonical default database/key; custody remains unavailable to renderer and agent runtime |

For governed launchers, the policy never uses a secret-name denylist over `{...process.env}`; it builds from a minimal allowlist. Codex is the explicit external-runtime exclusion and does not use that policy. First delivery reports only `LOCAL_HARDENED` after the governed environment/descriptor/file-tool checks and states that Codex inheritance is not covered. A future `STRONG_AGENT_ISOLATION` tier would additionally require enforceable launcher identity/mount/network separation and is not part of this delivery.

## Codex External Authentication Preservation

Codex intentionally has no row in the secret-definition/consumer tables. The exact path is:

```text
Codex runtime selection -> existing client manager -> CodexAppServerClient.start
 -> options.env ?? process.env plus real HOME/CODEX_HOME
 -> codex app-server uses Codex-owned login/configuration state
 -> existing sanitized result/failure
```

Remove only the ticket-added child-environment helper use from the client. Add no managed Codex consumer, Store definition, login UI/API, account RPC, auth status, rotation, synthetic account root, or compatibility fallback. Real Codex auth files/state are neither inspected nor migrated.

## Claude Runtime Authentication Cutover

Claude Agent SDK does not receive `LLMConstructionContext` and never accesses `SecretManagementService`, the catalog, or a backend directly. Its server-owned `ClaudeRuntimeAuthenticationService` is a specialized consumer-provisioning owner over the existing generic service.

```ts
type ClaudeRuntimeConsumer = {
  kind: "agentRuntime";
  runtimeKind: "claude_agent_sdk";
  credentialSlot: "apiKey";
};
```

CLI path:

```text
Claude model-discovery/run request (mode omitted or `cli`)
 -> ClaudeSdkClient public launch/list-model boundary
 -> ClaudeRuntimeAuthenticationService selects external CLI/account auth
 -> zero SecretManagementService calls
 -> return {kind: cli} to ClaudeSdkClient
 -> internal empty-base CLI environment
 -> Claude Code child
 -> sanitized result/error
```

Managed path:

```text
Claude model-discovery/run request (`managed-secret`)
 -> ClaudeSdkClient public launch/list-model boundary
 -> ClaudeRuntimeAuthenticationService
 -> SecretManagementService.resolveForUse(ClaudeRuntimeConsumer)
 -> catalog authorizes provider.anthropic.api-key
 -> selected Store-bound backend decrypts SecretValue
 -> return {kind: managedApiKey, apiKey} to ClaudeSdkClient
 -> internal empty-base environment
 -> set only ANTHROPIC_API_KEY for exact SDK child
 -> SDK child construction
 -> drop AutoByteus temporary references
 -> sanitized result/error
```

`ClaudeSdkClient` unwraps at the last child-environment boundary. The authentication service does not expose a raw string or environment to sessions/model-catalog callers. The client input no longer accepts arbitrary `env`. Managed mode loads no user/project/local settings, hooks, plugins, API-key helper, or external MCP configuration; passes `tools: []`; and uses strict explicitly materialized AutoByteus MCP configuration only. AutoByteus-owned tool execution uses a separate sanitized server environment. Parent, siblings, other runtime children, and tool children never receive the key.

Legacy `auto`, legacy `api-key`, and unknown values fail `CLAUDE_RUNTIME_AUTH_MODE_INVALID` before lookup or spawn. Missing/non-ready Store, invalid binding, spawn, and provider-auth outcomes are value-free and never fall back. The authorized Claude process/SDK can observe its own environment; this intentional trust grant is documented as a `LOCAL_HARDENED` limit rather than hidden.
