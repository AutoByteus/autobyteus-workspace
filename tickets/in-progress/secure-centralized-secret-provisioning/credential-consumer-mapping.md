# Credential Consumer Mapping — Provider-Owned Slots

## Artifact Metadata

| Field | Value |
|---|---|
| Status | `Design-ready — user-approved for architecture review; custom-provider-v1 migration mapping included` |
| Purpose | Canonical mapping from product consumer/provider slot and fixed custom-provider-v1 identity to one `SecretId`, including explicit-import aliases |
| Related requirements | `REQ-001`, `REQ-005`–`REQ-012`, `REQ-014`, `REQ-017` |
| Related acceptance criteria | `AC-004`–`AC-008`, `AC-010`, `AC-013`, `AC-015` |
| Approval applicability | Existing provider-owned-slot behavior and the fixed custom-provider migration mapping are user-approved for architecture review |

This supplement is normative. It is subordinate to [requirements.md](./requirements.md) and aligned with [design-spec.md](./design-spec.md) and [encrypted-secret-vault-contract.md](./encrypted-secret-vault-contract.md). The historical custom-provider boundary is defined by [custom-provider-v1-migration-contract.md](./custom-provider-v1-migration-contract.md).

## Mapping Principles

1. A `SecretId` identifies a provider or integration credential slot, never a model.
2. Models, model metadata, catalogs, GraphQL model DTOs, and inference configuration contain no secret ID or authentication descriptor.
3. A concrete client selects its provider and optional slot at point of use.
4. `ProviderApiKeyResolver` is a core-owned, storage-neutral port. The server adapter authorizes the consumer and delegates to `SecretManagementService`.
5. The resolver has no fallback. A failed/missing slot never retries a different slot, environment alias, Store, or provider.
6. Import aliases are input translation only. They are not runtime credential sources.
7. Google AI Studio and Vertex Express are separate Google-owned credential slots. Vertex Project has no API-key slot.
8. The fixed custom-provider-v1 migration derives the same deterministic custom `SecretId` from each preserved provider ID; it is not an import alias or runtime credential source.
9. The API-key Settings read represents each provider once as `ProviderSettingsGroup { provider, llmModels, audioModels, imageModels, videoModels }`. It reuses the existing `LlmProviderObject` and `ModelDetail` contracts; `apiKeyConfigured` is computed once by the provider owner; ordinary providers use the exact vault slot, while Gemini preserves its established any-complete-option aggregate without selecting active mode. GraphQL selection sets request only the fields each consumer needs. Existing catalog query fields remain for supported consumers, but the API-key page no longer combines four repeated provider collections or derives credential state from them.

## Core Resolver Contract

```ts
export type ProviderApiKeySlot =
  | 'apiKey'
  | 'geminiAiStudioApiKey'
  | 'geminiVertexExpressApiKey';

export interface ProviderApiKeyResolver {
  resolve(providerId: string, slot?: ProviderApiKeySlot): Promise<SecretValue>;
}
```

- omitted `slot` means exactly `apiKey`;
- `getStatus` is not part of the core resolver; Settings obtains value-free status from its own server query;
- `SecretValue.revealToTrustedConsumer()` is allowed only at the exact SDK/client construction or request boundary;
- the resolver never returns paths, ciphertext, root-key state, backend identity, or provider configuration.

## Built-In Provider Mapping

| Provider/runtime ID | Slot | Canonical `SecretId` | Import alias | Production consumers | Notes |
|---|---|---|---|---|---|
| `OPENAI` | `apiKey` | `provider.openai.api-key` | `OPENAI_API_KEY` | OpenAI LLM, Responses, audio, image | One provider key shared by capabilities. |
| `ANTHROPIC` | `apiKey` | `provider.anthropic.api-key` | `ANTHROPIC_API_KEY` | Native Anthropic LLM; Claude `managed-secret` | Claude `cli` performs no Store lookup. |
| `MISTRAL` | `apiKey` | `provider.mistral.api-key` | `MISTRAL_API_KEY` | Mistral LLM | No environment fallback. |
| `DEEPSEEK` | `apiKey` | `provider.deepseek.api-key` | `DEEPSEEK_API_KEY` | DeepSeek LLM | No environment fallback. |
| `GROK` | `apiKey` | `provider.grok.api-key` | `GROK_API_KEY` | Grok LLM | No environment fallback. |
| `KIMI` | `apiKey` | `provider.kimi.api-key` | `KIMI_API_KEY` | Kimi LLM | No environment fallback. |
| `QWEN` | `apiKey` | `provider.qwen.api-key` | `DASHSCOPE_API_KEY` | Qwen/DashScope LLM | `QWEN_API_KEY` is deliberately unmapped and non-blocking. |
| `GLM` | `apiKey` | `provider.glm.api-key` | `GLM_API_KEY` | GLM LLM | `ZHIPU_API_KEY` is deliberately unmapped and non-blocking. |
| `MINIMAX` | `apiKey` | `provider.minimax.api-key` | `MINIMAX_API_KEY` | MiniMax LLM | No environment fallback. |
| `LMSTUDIO` | `apiKey` | `provider.lmstudio.api-key` | `LMSTUDIO_API_KEY` | LM Studio when configured to require a key | Local no-key operation remains supported where the provider permits it. |
| `AUTOBYTEUS` | `apiKey` | `provider.autobyteus.api-key` | `AUTOBYTEUS_API_KEY` | Remote model discovery, LLM, audio, image | Discovery and invocation share one provider key; catalog remains available if endpoint is unavailable. |

## Google / Gemini Mapping

| Explicit `GEMINI_SETUP_MODE` | Runtime selection | Provider/slot resolution | Canonical `SecretId` | SDK construction | Metadata policy |
|---|---|---|---|---|---|
| `AI_STUDIO` | `{kind:'aiStudio'}` | `GEMINI`, `geminiAiStudioApiKey` | `provider.google.ai-studio.api-key` | `new GoogleGenAI({apiKey})` | Gemini Developer API live enrichment; curated fallback with provenance. |
| `VERTEX_EXPRESS` | `{kind:'vertexExpress'}` | `GEMINI`, `geminiVertexExpressApiKey` | `provider.google.vertex-express-api-key` | `new GoogleGenAI({vertexai:true, apiKey})` | Curated-only until a current official product-suitable list contract exists. |
| `VERTEX_PROJECT` | `{kind:'vertexProject', project, location}` | no API-key resolution | none | `new GoogleGenAI({vertexai:true, project, location})` | Curated-only. Workload/application-default identity remains outside this vault. |
| absent/invalid/incomplete | closed | none | none | `GEMINI_RUNTIME_UNCONFIGURED` | Curated catalog with `CURATED_ONLY`; active mode is `NOT_SELECTED`/invalid. |

The server injects a separate `GeminiRuntimeResolver` function into Gemini clients. It returns only the non-secret selection. The Gemini client then resolves exactly the selected API-key slot when one is required. Neither API-key presence nor save order chooses the mode.

### Gemini option operations

- saving AI Studio changes only `provider.google.ai-studio.api-key`;
- saving Vertex Express changes only `provider.google.vertex-express-api-key`;
- saving Vertex Project changes only non-secret `VERTEX_AI_PROJECT` and `VERTEX_AI_LOCATION`;
- `Use this mode` changes only `GEMINI_SETUP_MODE` after the option validates as configured;
- removal changes only the chosen option; if it is active, the service clears active mode before removal and does not select another;
- `Save and use this mode` is an explicit compound command. It returns the same authoritative Gemini setup state as the query and other commands; configured option plus actual active mode truthfully exposes full or partial completion without a parallel outcome DTO.

## Search Mapping

| Search provider | Canonical `SecretId` | Import alias | Consumer |
|---|---|---|---|
| `serper` | `search.serper.api-key` | `SERPER_API_KEY` | Serper search client |
| `serpapi` | `search.serpapi.api-key` | `SERPAPI_API_KEY` | SerpAPI search client |
| `vertex_ai_search` | `search.vertex-ai.api-key` | `VERTEX_AI_SEARCH_API_KEY` | Vertex AI Search client |

## Custom OpenAI-Compatible Providers

For normalized custom provider ID `<provider-id>`:

```text
provider.openai-compatible.<normalized-provider-id>.api-key
```

Rules:

- the current custom-provider v2 metadata record stores only provider ID, display name, server-owned `OPENAI_COMPATIBLE` type, and base URL; it stores no credential value or duplicated `secret_id` column;
- the exact `SecretId` is derived deterministically from the provider ID, so every capability for that custom provider resolves one credential subject;
- the secret is written through the same `SecretManagementService`;
- the concrete OpenAI-compatible client resolves its own custom slot at initialization;
- current create and delete use bounded compensation because JSON metadata and the application DB are different physical stores; no post-creation update command is introduced;
- remove is idempotent; orphaned ciphertext or metadata is non-authoritative and never a credential fallback;
- the fixed-path v1 migration preserves provider IDs, derives these exact IDs, requires every target `MISSING`, and creates the complete credential set in one create-only transaction;
- any configured target/invalid source/failure aborts preservation without overwrite and deletes the legacy v1 file; frontend reconfiguration uses new generated provider IDs;
- no backup/recovery file is created, and no runtime v1 reader exists;
- custom Probe/Create accepts only name, base URL, and transient key; the server owns the sole type/runtime;
- custom Probe returns only discovered `{id,name}` models, Create only the assigned provider ID, and Delete only success; input/type/runtime echoes are not part of the API.

## Credential-Free Consumers

| Surface | Credential behavior |
|---|---|
| Built-in provider/model catalog | Never resolves a secret. |
| Curated model metadata | Never resolves a secret. |
| Ollama | No managed API-key slot. |
| Vertex Project | Uses explicit non-secret project/location plus platform identity; no Store key. |
| Claude `cli` | Uses its established external local account state; no Store lookup. |
| Codex | Preserves established external `codex login` state; no Store owner is added. |
| Governed child launchers | Receive no credential alias, root key, or application DB descriptor. |

## Positive Import Registry

Only the following names select credential values:

```text
OPENAI_API_KEY
ANTHROPIC_API_KEY
MISTRAL_API_KEY
DEEPSEEK_API_KEY
GROK_API_KEY
KIMI_API_KEY
DASHSCOPE_API_KEY
GLM_API_KEY
MINIMAX_API_KEY
LMSTUDIO_API_KEY
AUTOBYTEUS_API_KEY
GEMINI_API_KEY
VERTEX_AI_API_KEY
SERPER_API_KEY
SERPAPI_API_KEY
VERTEX_AI_SEARCH_API_KEY
```

`GEMINI_API_KEY` maps to `provider.google.ai-studio.api-key`.

Importer rules:

- exact positive recognition is the only eligibility rule;
- an empty recognized assignment is absent and creates no plan entry or warning;
- any unrecognized assignment, including `DATABASE_URL`, `QWEN_API_KEY`, `ZHIPU_API_KEY`, `GOOGLE_CSE_API_KEY`, and `OLLAMA_API_KEY`, is ignored without blocking and without being described as a secret; source-file `DATABASE_URL` never selects or overrides the importer target, which comes only from required CLI `--database-url`;
- duplicate populated aliases for one name, duplicate/conflicting mappings to one `SecretId`, malformed selected syntax, dynamic values, unsafe selected values, or all-recognized-empty/absent input fail with stable value-free outcomes;
- the runtime never reads these aliases as credentials.

## Consumer Authorization Matrix

| Consumer kind | Allowed provider/slot | Denied examples |
|---|---|---|
| `llm` | provider `apiKey`; selected Gemini slot; custom provider slot | search IDs, wrong Gemini slot, arbitrary `SecretId` |
| `media` | OpenAI `apiKey`; selected Gemini slot; supported AutoByteus media | Anthropic/search/custom unsupported media |
| `search` | exact search provider slot | LLM/provider IDs |
| `modelDiscovery` | AutoByteus `apiKey`; optional AI Studio live metadata slot | Vertex key sent to Developer API, arbitrary provider key |
| `agentRuntime` | Claude managed -> Anthropic `apiKey` | Claude CLI, Codex, arbitrary provider |
| `settings` | exact provider option save/remove/status | raw read/decrypt, arbitrary secret ID |
| `importer` | exact positive registry plan | arbitrary supplied `SecretId`, Store target, DB/key path |
| `customProviderV1Migration` | only deterministic custom-provider IDs derived from the complete fixed v1 file | built-in IDs, arbitrary source/path/ID, overwrite/read/compare/delete of current secret |

The authorization registry is server-owned. Core providers never receive `SecretId`; the adapter translates provider/slot plus subject to the exact ID.

## Forbidden Shapes

- `authenticationRequirement`, `credentialProviderId`, `secretId`, or secret status on a model definition;
- a `ResolvedAuthentication` or construction-context object passed through model/catalog layers;
- `process.env.*_API_KEY` or legacy-file fallback inside a provider client;
- returning a plural API-key bag;
- resolver lookup by arbitrary raw `SecretId` from core/provider code;
- Gemini slot selection from key presence, status priority, model identity, or last-saved option;
- old `provider.gemini.ai-studio-api-key` alias or dual read;
- Qwen fallback from `DASHSCOPE_API_KEY` to `QWEN_API_KEY`;
- API-key-page credential authority repeated across four capability result collections, a parallel client credential map, or cross-provider fallback;
- a replacement reduced provider/model DTO family, capability availability wrapper, or vault-health/instruction protocol added only for the API-key Settings read;
- constant custom-provider type/runtime or echoed command inputs/results;
- runtime custom-provider-v1 parsing, backup/recovery-file machinery, or migration overwrite/use of an already configured target;
- Gemini operation/outcome/stage/instruction fields parallel to the authoritative setup state;
- runtime fallback between the application database and any second Store.

## Validation Obligations

1. A static scan proves model/catalog/GraphQL model shapes contain no credential fields.
2. Unit matrices cover every row above and reject every unauthorized provider/slot/consumer combination.
3. GraphQL/generated-web shape tests prove `ProviderSettingsGroup` reuses `LlmProviderObject` and `ModelDetail`, returns one provider plus four named non-null lists, and adds no replacement provider/model DTO or availability wrapper; assembled Apollo/Settings tests prove OpenAI `apiKeyConfigured` appears once and is never sourced from another provider or array order.
4. Representative OpenAI, Anthropic, Grok, Qwen, Gemini, search, AutoByteus, custom, audio, image, and video construction proves point-of-use resolution.
5. Canaries prove no value appears in logs, GraphQL, errors, snapshots, reports, or artifacts.
6. Gemini matrices prove exact active-mode selection, exact slot, exact SDK options, and zero cross-mode retry.
7. Importer tests prove the exact positive registry, empty-as-absent, and unrelated-name non-blocking behavior.
8. Custom-provider migration tests prove preserved-ID derivation, all-targets-missing authorization, complete create-only batch, collision rejection, failed-migration deletion without a backup copy, new-ID reconfiguration, and no runtime fallback.
