# Credential Consumer And Migration Mapping

## Artifact Metadata

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/credential-consumer-mapping.md`.
- Purpose: retain the current source inventory and define the target mapping from legacy aliases to product definitions, authorized consumers, Store-independent construction boundaries, and migration outcomes.
- Scope: REQ-001, REQ-002, REQ-005, REQ-011, REQ-014, REQ-016, REQ-018 / AC-005, AC-009–AC-012, AC-018.
- Status: `User Approved — AR-007 / MP-002 Evidence Reassessment; Architecture Re-review Requested`.
- Approval applicability: `Required` for target identities/mappings; current-source evidence is approval `N/A`.
- Core artifacts supported: [requirements.md](./requirements.md), [investigation-notes.md](./investigation-notes.md), [design-spec.md](./design-spec.md).
- Related supplements: [use-case-spine-validation.md](./use-case-spine-validation.md), [secret-storage-architecture.md](./secret-storage-architecture.md), [secret-storage-backend-contract.md](./secret-storage-backend-contract.md), [live-test-secret-provisioning.md](./live-test-secret-provisioning.md), [threat-model-and-option-analysis.md](./threat-model-and-option-analysis.md).

## Mapping Rules

1. A stable secret definition represents one upstream credential, not one environment variable occurrence.
2. One definition may authorize multiple trusted consumers when the upstream provider credential is intentionally shared (for example OpenAI LLM plus OpenAI image/audio).
3. Runtime classes request the semantic slot `apiKey`; they do not know definition IDs or legacy aliases.
4. Server provisioning services resolve the mapping from compound consumer identity to definition ID.
5. Custom-provider secret identity derives from the immutable custom provider UUID. It is not a free-form name and is not duplicated in persisted metadata.
6. Non-secret provider configuration is passed separately. It never shares a string map with credentials.
7. Workload identity is an authentication mode, not an API-key secret. Its node identity/mount/capability is still protected from agent children.
8. Physical Store selection is a backend-bootstrap concern. A consumer definition and construction mapping is identical in the default Local Store, separate real-E2E Local Store, or an enterprise namespace; consumers cannot select Stores or paths.
9. Claude managed authentication reuses the upstream Anthropic definition through its own exact runtime identity. Sharing one definition does not merge the Claude, native LLM, or metadata consumer boundaries.

## Built-In Provider Mapping

| Target Secret Definition ID | Legacy Alias(es) | Current Source Consumers | Target Authorized Consumers | Target Construction / Use Boundary | Notes |
| --- | --- | --- | --- | --- | --- |
| `provider.openai.api-key` | `OPENAI_API_KEY` | `OpenAILLM`/`OpenAIResponsesLLM`; OpenAI audio/image clients; OpenAI live tests | LLM provider `OPENAI`; LLM metadata only if later needed; media provider `OPENAI` for audio/image | `LLMProvisioningService -> LLMConstructionContext`; `MediaClientProvisioningService -> MultimediaConstructionContext` | One upstream credential; do not create media-specific copies. |
| `provider.anthropic.api-key` | `ANTHROPIC_API_KEY` | `AnthropicLLM`; `AnthropicModelMetadataProvider`; live tests; current Claude API-key auth path | LLM `ANTHROPIC`; metadata `ANTHROPIC`; agent runtime `{runtimeKind:"claude_agent_sdk", credentialSlot:"apiKey"}` only in explicit `managed-secret` | LLM/metadata provisioning; `ClaudeRuntimeAuthenticationService -> ClaudeSdkClient` for managed child delivery | One stored upstream credential. Claude default `cli` does no resolution; managed mode is separately authorized and receives child-only environment delivery. |
| `provider.mistral.api-key` | `MISTRAL_API_KEY` | `MistralLLM`; metadata provider; live tests | LLM and metadata provider `MISTRAL` | LLM/metadata provisioning | Remove constructor environment read. |
| `provider.deepseek.api-key` | `DEEPSEEK_API_KEY` | `DeepSeekLLM`; live tests | LLM `DEEPSEEK` | `LLMConstructionContext.authentication=apiKey` | OpenAI-compatible base URL remains class/model metadata. |
| `provider.grok.api-key` | `GROK_API_KEY` | `GrokLLM`; live tests | LLM `GROK` | LLM construction |  |
| `provider.kimi.api-key` | `KIMI_API_KEY` | `KimiLLM`; metadata provider; live tests | LLM and metadata `KIMI` | LLM/metadata provisioning |  |
| `provider.qwen.api-key` | `DASHSCOPE_API_KEY` | `QwenLLM`; live tests | LLM `QWEN` | LLM construction | Product definition uses provider identity, not vendor env spelling. |
| `provider.glm.api-key` | `GLM_API_KEY` | `GlmLLM`; live tests | LLM `GLM` | LLM construction |  |
| `provider.minimax.api-key` | `MINIMAX_API_KEY` | `MinimaxLLM`; live tests | LLM `MINIMAX` | LLM construction |  |
| `provider.lmstudio.api-key` | `LMSTUDIO_API_KEY` | `LMStudioLLM` optional endpoint authentication | LLM `LMSTUDIO` only when endpoint requires auth | LLM construction | Optional credential requirement. Local unauthenticated models require no secret. |
| `provider.gemini.ai-studio-api-key` | `GEMINI_API_KEY` | Gemini LLM/media helper; Gemini metadata; Settings/live tests | Gemini LLM/metadata/media in `AI_STUDIO` mode | `ResolvedLLMAuthentication { kind: "apiKey" }` and analogous media context | Explicit mode replaces environment-precedence selection. |
| `provider.google.vertex-express-api-key` | `VERTEX_AI_API_KEY` | Gemini helper; Settings/live tests | Gemini LLM/metadata/media in `VERTEX_EXPRESS` mode | resolved api-key authentication | Separate from AI Studio even though the same SDK is used. |

### Gemini workload-identity mode

| Current Values | Classification | Target Handling |
| --- | --- | --- |
| `VERTEX_AI_PROJECT`, `VERTEX_AI_LOCATION` | non-secret provider runtime configuration | stored through non-secret provider configuration and passed as `ResolvedLLMAuthentication { kind: "googleWorkloadIdentity", project, location }` |
| ADC/service-account/metadata identity used by Google SDK | protected workload identity, not an API-key value in the catalog | available only to trusted server/provider process; absent from agent sandbox environment, mounts, home, and metadata route |

`GEMINI_SETUP_MODE` becomes an explicit non-secret setting with one of `AI_STUDIO`, `VERTEX_EXPRESS`, or `VERTEX_PROJECT`. The client does not choose a mode by checking which environment variable happens to exist.

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
 -> SecretManagementService.remove(custom definition ID)
 -> delete v2 metadata
 -> reload models
```

Missing secret is idempotent. If metadata deletion fails, the provider remains visible but unconfigured/deletion-pending and delete can be retried. No orphan secret remains. If model reload fails after deletion, stale in-memory models are removed/rebuilt by the existing last-known-good/reload owner according to a value-free failure status; no model contains the old key.

## Search Mapping

| Target Secret Definition ID | Legacy Alias | Non-Secret Configuration | Current Consumer | Target Boundary |
| --- | --- | --- | --- | --- |
| `search.serper.api-key` | `SERPER_API_KEY` | `DEFAULT_SEARCH_PROVIDER=serper` | `SearchClientFactory`, `SerperSearchStrategy` | `SearchProvisioningService` constructs/invokes a `SearchExecutor` with explicit api-key credentials. |
| `search.serpapi.api-key` | `SERPAPI_API_KEY` | `DEFAULT_SEARCH_PROVIDER=serpapi` | factory/`SerpApiSearchStrategy` | same |
| `search.vertex-ai.api-key` | `VERTEX_AI_SEARCH_API_KEY` | provider selection plus `VERTEX_AI_SEARCH_SERVING_CONFIG` | factory/`VertexAISearchStrategy` | same |

`GOOGLE_CSE_API_KEY`/`GOOGLE_CSE_ID` are removed from active Settings and migration aliases because the current core factory explicitly rejects `google_cse` as unsupported. Retaining a UI write path for an unusable provider is not compatibility worth preserving.

The `Search` tool no longer instantiates a process-global `SearchClientFactory`. Its tool definition is registered with an injected `SearchExecutor` supplied by the server. The executor resolves/refreshes the selected provider client through `SearchProvisioningService`; no credential is placed in serializable `ToolConfig`.

## Media Mapping

| Media Consumer | Current Credential Source | Target Credential Requirement | Target Change |
| --- | --- | --- | --- |
| OpenAI audio | `process.env.OPENAI_API_KEY` in `OpenAIAudioClient` | `provider.openai.api-key`, slot `apiKey` | constructor receives `MultimediaConstructionContext`; SDK client unwraps once. |
| OpenAI image | same | same | same |
| Gemini audio/image/video helpers | Gemini/Vertex environment selection | explicit Gemini authentication mode and matching definition/workload identity | `MediaClientProvisioningService` resolves before factory construction. |
| AutoByteus/other local media | non-secret host config or no credential | `none` unless provider declares auth | no artificial secret requirement |

`MediaGenerationService` already has injectable client creators. They become asynchronous and are supplied by `MediaClientProvisioningService`; media tool code never imports secret management.

## Live Model Metadata Mapping

Current default `ModelMetadataResolver` creates provider metadata clients that read API keys during static `LLMFactory` initialization. Target behavior:

1. Core `LLMFactory` can always initialize from curated metadata without credentials.
2. Server `ModelMetadataProvisioningService` requests credentials for the `llm-metadata` consumer identity, constructs a credential-aware provider metadata client, and applies returned metadata through an explicit registry refresh API.
3. Missing/locked/unavailable credentials leave curated metadata in place and produce value-free enrichment status; they do not make model listing read environment or fail globally.
4. Custom endpoint discovery uses the custom provider's derived secret through `LlmProviderService`, not the core static endpoint provider reading a model-held key.

## LLM Construction Mapping

### Core non-serializable types

```ts
type ResolvedLLMAuthentication =
  | { kind: "apiKey"; apiKey: SecretValue }
  | { kind: "googleWorkloadIdentity"; project: string; location: string }
  | { kind: "none" };

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
 -> SecretManagementService.resolveForUse({kind: llm, providerId: OPENAI, credentialSlot: apiKey})
 -> SecretManagementService resolves provider.openai.api-key through its internal catalog
 -> LLMFactory.createLLM(modelIdentifier, { configInput, authentication })
 -> OpenAILLM/OpenAIResponsesLLM
 -> new OpenAIClient({ apiKey: authentication.apiKey.revealToTrustedConsumer() })
```

`LLMFactory` composes model defaults with the caller config and creates the context. The server provisioning service resolves authentication; the individual LLM does neither. No static global resolver setter is introduced.

### Model credential requirement declaration

`LLMModel`/supported model definitions gain non-secret requirements:

```ts
type LLMAuthenticationRequirement =
  | {
      kind: "apiKey";
      credentialSlot: "apiKey" | "geminiAiStudioApiKey" | "geminiVertexExpressApiKey";
      required: boolean;
    }
  | { kind: "googleAuthenticationMode" }
  | { kind: "none" };
```

The declaration says what the client needs. It does not contain a secret definition ID. Server binding maps provider identity to catalog definition.

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

Generic server settings reject catalog legacy aliases and sensitive-looking names matching API key/token/password/secret/private-key/credential patterns. `AppConfig.setLlmApiKey/getLlmApiKey` are removed.

## Legacy Migration Mapping

| Legacy Source | Detection | Preserved | Discarded / Removed | Current Runtime After Migration |
| --- | --- | --- | --- | --- |
| application-data `.env` known aliases above | key-name/presence only | unrelated non-secret lines/order/comments where practical; current Gemini precedence is materialized once as explicit non-secret mode before key removal | catalogued lines; corresponding inherited `process.env` entries deleted at earliest bootstrap | `AppConfig` cannot read/write the aliases; provider status is reprovision-required/missing |
| custom provider JSON v1 | migration-owned v1 decoder | ID/name/type/base URL | `apiKey`; v1 file after atomic replacement | store accepts v2 only |
| package/worktree `.env.test` | active setup/docs/source reference scan | verified non-secret settings may remain tracked; canonical scenario/Store data moves to `test-config/live-e2e.json` | all credential fields/loaders and any cross-Store copy workflow; operator deletes/rotates old files separately | tests do not search/load credential dotenv; dedicated E2E credentials are provisioned directly into the E2E Store |
| Nuxt public `googleSpeechApiKey` | source removal | N/A (no consumer found) | public runtime field and environment alias | no browser-public key path |
| parent process recognized credential aliases | presence only at startup | none | delete from current server process before any agent child; warn with alias only | no supported environment fallback |
| `CLAUDE_AGENT_SDK_AUTH_MODE` set to `auto` or `api-key` | exact non-secret configuration value | none | legacy value rejected with remediation; no implicit rewrite to another mode | operator selects `cli` or `managed-secret`; omitted defaults to `cli` |

The migration ledger records only alias/definition/provider IDs and outcomes. It never records value length, hash, prefix, or suffix.

## Agent Process And Identity Exposure Mapping

Removing consumer environment reads is necessary but not sufficient. The following current spawn groups must use a central `AgentProcessEnvironmentPolicy` and, for strict mode, an isolated launcher:

| Spawn / Tool Group | Current Risk | Target Rule |
| --- | --- | --- |
| non-interactive shell/background process | resolver defaults to/copies `process.env` | explicit allowlist, sandbox HOME/TMP, sandbox filesystem/identity |
| direct/isolated PTY, bridge, WSL/tmux | parent env/cwd propagated | same policy encoded once and passed to every backend; no real home/Store files/backend identity |
| Codex app-server | defaults to `process.env` | purpose-specific non-secret launch env; account/session auth classified separately |
| Claude SDK/client | starts from full env, accepts caller `env`, removes only some keys in one mode, and loads broad setting sources | exact `cli` or `managed-secret`; both build from empty base and reject caller `env`. CLI receives no key. Managed receives exactly `ANTHROPIC_API_KEY` in the exact Claude child, empty setting sources, `tools: []`, and strict explicitly materialized AutoByteus MCP; no other child receives it |
| MCP servers | may inherit server env or user config | server-specific allowlist and sandbox; no product credentials unless the MCP server is itself a separately authorized trusted consumer |
| browser/application/file-watcher workers, including `application-engine/runtime/application-worker-supervisor.ts` | the supported application worker currently spreads `process.env` and executes with the server filesystem identity | classify trusted support worker versus application/agent-controlled worker; each receives its own empty-base allowlist; first delivery also denies Store paths through built-in file tools but does not claim arbitrary same-user filesystem denial |
| Electron embedded server | platform managers spread parent env | server receives non-secret startup config and constructs the in-process Local backend against canonical default database/key; custody remains unavailable to renderer and agent runtime |

The policy never uses a secret-name denylist over `{...process.env}`. It builds from a minimal allowlist. First delivery reports only `LOCAL_HARDENED` after these environment/descriptor/file-tool checks. A future `STRONG_AGENT_ISOLATION` tier would additionally require enforceable launcher identity/mount/network separation and is not part of this delivery.

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
