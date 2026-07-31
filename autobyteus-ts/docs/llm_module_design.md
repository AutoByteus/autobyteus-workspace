# LLM Module Design and Implementation

## 1. Overview

The `src/llm` module provides a unified, extensible interface for interacting
with various Large Language Models (LLMs). It abstracts away the differences
between providers (OpenAI, Anthropic, Mistral, DeepSeek, Kimi/Moonshot,
Gemini, etc.) and runtimes (cloud APIs, local servers like Ollama/LM Studio,
and user-configured OpenAI-compatible endpoints), allowing the rest of the
Autobyteus framework to treat all models uniformly.

## 2. Core Architecture

The architecture relies on a **Factory Pattern** combined with a **Registry** to manage model instantiation and discovery.

### 2.1 Class Hierarchy

- **`BaseLLM` (Abstract Base Class):**
  The foundation for all LLM implementations. It manages:
  - **Message History:** `addUserMessage`, `addAssistantMessage`.
  - **System Prompts:** Configuration and dynamic updates.
  - **Extensions:** Registry for optional lifecycle hooks; authoritative token accounting is emitted from provider usage observations, not from an auto-registered extension.
  - **Hooks:** `beforeInvoke` and `afterInvoke` lifecycle hooks.
  - **Abstract Methods:** Subclasses must implement `_sendUserMessageToLLM` (unary) and `_streamUserMessageToLLM` (streaming).

- **`LLMModel`:**
  Represents the _metadata_ of a model, not the active instance. It contains:
  - **Identifier:** A globally unique string (e.g., `gpt-4o`,
    `llama3:latest:ollama@localhost:11434`,
    `openai-compatible:provider_1234567890abcdef:custom-chat-model`).
  - **Provider Identity:** `providerId`, `providerName`, and `providerType`.
    Built-in providers use stable enum IDs (for example `OPENAI`), while custom
    OpenAI-compatible providers keep their own generated provider IDs.
  - **Runtime:** Where the model is hosted (e.g., `API`,
    `OPENAI_COMPATIBLE`, `OLLAMA`).
  - **Config Schema:** A JSON schema defining model-specific configuration parameters (e.g., `thinking_level` for reasoning models).
  - **Multimodal capabilities:** Provider-neutral `image`, `audio`, and `video`
    states (`supported`, `unsupported`, or `unknown`). Built-in definitions
    carry verified states; discovered and unverified models default to unknown.
  - **Resolved metadata:** Numeric context/input/output limits retain per-field
    provenance (`live`, `static_definition`, or `unknown`) through
    `resolvedModelMetadata`. `activeContextTokens` remains runtime state and is
    never taken from static catalog metadata.
  - **Factory Method:** `LLMFactory.createLLM(...)` instantiates the concrete `BaseLLM` for this model.

- **`LLMFactory` (Singleton):**
  The central access point.
  - **Registry:** Maps unique identifiers to `LLMModel` instances.
  - **Discovery:** Registers built-in API models at startup, discovers local
    runtime models, and can later sync saved custom OpenAI-compatible
    providers into the same registry.
  - **Reloading:** Supports provider-scoped reloads for reloadable built-in
    providers and custom-provider sync through
    `syncOpenAICompatibleEndpointModels(...)`.
  - **Creation:** `createLLM(identifier)` is the standard way to get a usable LLM object.
  - **Pricing lookup:** `getModelPricingInfo(...)` exposes trusted/missing/placeholder API-price metadata for server-side cost estimates.

### 2.2 Provider Identity vs. Provider Type vs. Runtime

A key architectural distinction is made between **provider identity**,
**provider type**, and **runtime**:

- **Provider Identity:** Which concrete provider record owns the model?
  - Built-ins use fixed IDs such as `OPENAI`, `ANTHROPIC`, or `LMSTUDIO`.
  - Custom OpenAI-compatible providers use generated stable IDs such as
    `provider_<uuid>`.
- **`LLMProvider`:** What kind of provider is it?
  - Examples: `OPENAI`, `ANTHROPIC`, `MISTRAL`, `OPENAI_COMPATIBLE`.
- **`LLMRuntime`:** Where is the model _running_?
  - `API`: Cloud-hosted (e.g., accessing GPT-4 via OpenAI's API).
  - `OPENAI_COMPATIBLE`: A user-configured OpenAI-style endpoint reached by
    base URL + API key and modeled as its own runtime.
  - `OLLAMA`: Locally hosted via `ollama serve`.
  - `LMSTUDIO`: Locally hosted via LM Studio.
  - `AUTOBYTEUS`: Internal or custom serving layer.

This allows a model like `Llama 3` to exist as both an API model (via a cloud
provider) and a local model (via Ollama), while also allowing a user-configured
OpenAI-compatible endpoint to keep its own provider identity without adding a
new built-in enum value for every saved endpoint.

## 3. Usage Flow

1.  **Initialization:**
    `LLMFactory.ensureInitialized()` is called. It:
    - Registers supported built-in API models from
      `src/llm/supported-model-definitions.ts` (for example `gpt-5.5`,
      current Anthropic rows such as `claude-opus-5`, `claude-fable-5`, `claude-opus-4.8`,
      and `claude-sonnet-5`, `deepseek-v4-flash`, `gemini-3.5-flash`, and
      the Kimi `kimi-k2.6` / `kimi-k2.7-code` /
      `kimi-k2.7-code-highspeed` rows).
    - Resolves each built-in definition's colocated static metadata through
      `ModelMetadataResolver`. Numeric fields use live provider metadata first,
      then static definition values, then `unknown`; the definition remains the
      source of multimodal capability states and provenance.
    - Probes local runtimes (Ollama, LM Studio) to discover available models.
    - Leaves custom OpenAI-compatible provider sync to the caller that owns
      persisted provider records.

2.  **Instantiation:**
    The system requests a model by ID:

    ```ts
    const llm = await LLMFactory.createLLM('gpt-5.5');
    // or
    const llm = await LLMFactory.createLLM('llama3:latest:ollama@localhost:11434');
    // or
    const llm = await LLMFactory.createLLM('openai-compatible:provider_1234567890abcdef:custom-chat-model');
    ```

3.  **Interaction:**
    The agent interacts with the uniform `BaseLLM` interface:
    ```ts
    await llm.sendUserMessage(userMessage);
    // or
    for await (const chunk of llm.streamUserMessage(userMessage)) {
      process(chunk);
    }
    ```

## 4. Extensibility

### 4.1 Adding a New Built-In Cloud Model

Add built-in cloud models in `src/llm/supported-model-definitions.ts`, not by
editing `LLMFactory.initializeRegistry()` directly. Each definition must carry
`staticMetadata` from `src/llm/supported-model-static-metadata.ts`, including
docs-backed numeric limits, multimodal capabilities, source URL, and verification
date. `LLMFactory` maps resolved numeric fields explicitly and does not maintain
a second curated metadata authority. Provider-specific request-shape rules belong
in the provider adapter under `src/llm/api/`.

### 4.1.1 Media capability, sanitization, and request recovery

Working context remains canonical and provider-neutral. Before rendering, the
`LLMRequestAssembler` creates a provider-facing copy through
`src/llm/utils/media-input-sanitizer.ts`:

- known-unsupported image/audio/video inputs are removed according to the
  selected model's capability states;
- image sources are validated through the shared media formatter so empty files,
  empty data URIs, empty raw base64, and empty downloads cannot reach a provider;
- the canonical `Message[]` is not mutated, and bounded media diagnostics are
  returned with the request package; and
- provider adapters receive `outboundMessages`, not an unsanitized canonical
  request.

`LlmPhase` opens a named `MemoryManager` LLM request-recovery boundary before
system-prompt insertion, compaction, or request append. A successful response
commits the boundary. Assembly or provider-stream failure restores the working
context and compaction flags, persists the restored snapshot, records a
correlated raw-trace recovery marker, and returns one diagnostic without an
automatic retry. Raw traces and already committed tool facts are preserved.

Current examples of provider-specific model rules:

- `gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-5.6-luna` remain exact,
  entitlement-neutral built-in OpenAI rows on the existing Responses path.
  They share a GPT-5.6-only reasoning schema with `medium` default and `max`
  support, plus trusted cache-read/cache-write and >272K input-tier pricing.
  Do not add the unsuffixed `gpt-5.6` alias as a fourth row or broaden older
  OpenAI schemas with `max`.
- Current Anthropic adaptive-thinking rows (`claude-opus-5`,
  `claude-opus-4.8`, `claude-opus-4.7`, `claude-sonnet-5`, and
  `claude-fable-5`) use adaptive
  thinking rather than fixed-budget extended thinking. The adapter strips
  provider-invalid manual thinking budgets and unsupported sampling fields
  (`temperature`, `top_p`, `top_k`) for these rows. Do not add a
  `claude-sonnet-4.8` alias unless Anthropic publishes that exact API ID, and
  do not make Fable 5 a default or fallback without a separate product
  decision.
- `deepseek-v4-flash` and `deepseek-v4-pro` use the existing DeepSeek
  OpenAI-compatible adapter with a flat user-facing V4 thinking schema; the
  adapter maps that schema to the provider request shape.
- `gemini-3.5-flash` uses the existing Gemini adapter, the shared Gemini
  thinking schema, docs-backed curated token limits, and explicit API-key /
  Vertex identity mapping in `src/utils/gemini-model-mapping.ts`.
- `grok-4.5` is the sole built-in Grok row, uses the existing xAI Chat
  Completions path, and exposes always-on `low`/`medium`/`high` reasoning with
  `high` as the default. Its adapter removes xAI-invalid stop and penalty
  fields locally before the shared OpenAI-compatible request builder runs.
- `glm-5.2` replaces `glm-5.1` as the active GLM model and exposes
  `thinking_type` plus `reasoning_effort` schema fields. `GlmLLM` maps the flat
  thinking key to provider-native `thinking.type` and omits
  `reasoning_effort` when thinking is disabled.
- `kimi-k2.6` remains the general-purpose Kimi model. It disables thinking
  automatically for tool workflows when the caller has not supplied an explicit
  thinking override and normalizes provider-safe K2.6 temperature defaults.
- `kimi-k2.7-code` and `kimi-k2.7-code-highspeed` are distinct official Kimi
  K2.7 Code serving routes. They share the Kimi K2.7 family policy in
  `src/llm/api/kimi-k2-7-code-policy.ts`, keep thinking on, and normalize fixed
  sampling/tool-choice constraints locally in `KimiLLM` before the shared
  request builder runs.
- `minimax-m3` is the active MiniMax LLM entry. MiniMax M2.7 is removed from the
  built-in registry and curated metadata without a compatibility alias.

See `docs/provider_model_catalogs.md` for the catalog ownership map across LLM,
audio/TTS, and image models.

### 4.2 Adding a New Cloud Provider

1.  **Create concrete LLM class:** Subclass `BaseLLM` (e.g., `NewProviderLLM`) in `src/llm/api/`. Implement `_send...` and `_stream...` methods.
2.  **Update Enums:** Add the provider to `LLMProvider`.
3.  **Register Models:** Add supported model definitions and metadata so
    `LLMFactory.initializeRegistry()` can build and register `LLMModel`
    entries.

### 4.3 Token Usage Observations And Extensions

Provider adapters surface authoritative provider/runtime usage through
`LlmTokenUsageObservation`, carried on `ChunkResponse.usage` and
`CompleteResponse.usage`. The observation keeps input/output/total tokens,
usage scope, model identity, provider input-token semantic
(`gross_includes_cache`, `base_excludes_cache`, or `unknown`), cache reporting
state, cache miss/read/write buckets, reasoning/billable output details where
available, latest prompt/context-window hints, raw provider JSON, and quality
flags. `LlmPhase` emits these observations as `TOKEN_USAGE_UPDATED` stream
events; the server token-usage ledger owns canonical run/team identity,
component-basis derivation, accounting deltas, cost calculation, GraphQL
summaries, and persistence.

Provider adapters must normalize what the provider reported, not what it costs.
OpenAI-compatible/gross providers should report gross prompt/input plus cache
read, write, or miss buckets when available. In particular, documented OpenAI
`input_tokens_details.cache_write_tokens` or
`prompt_tokens_details.cache_write_tokens` maps to the existing generic
cache-creation input component without changing gross-input semantics.
Anthropic-style providers should mark `base_excludes_cache` so the server can
derive gross input as base input plus cache read/write buckets. Local runtime
estimates must never be used as persisted paid-provider accounting.

Direct OpenAI API observations and Codex app-server token notifications are
different source contracts. The direct Responses path can map a documented
`cache_write_tokens` quantity, but the Codex protocol verified on 2026-07-10
exposes cached reads and no write count. Codex cache creation must remain
unknown/null; do not infer it from gross input minus cached reads, and do not
produce a write cost merely because catalog pricing contains a trusted write
rate. Any future Codex write field requires generated-protocol verification and
an explicit runtime-adapter mapping review with its cumulative `total`/`last`
semantics. Do not route Codex raw events through the direct OpenAI normalizer.

`BaseLLM` still supports optional extensions that hook into the request/response
lifecycle, but token accounting must not depend on an auto-registered extension
or local token estimation. The old `TokenUsageTracker` utility is retained only
for non-authoritative/debug compatibility paths and must not feed persisted
business accounting.

- **Provider token usage normalizers:** Live under `src/llm/api/*token-usage-normalizer.ts` and convert provider usage payloads into `LlmTokenUsageObservation`.
- **Custom Extensions:** Can be registered via `registerExtension` for logging, rate limiting, or PII redaction when explicitly needed.

## 5. Directory Structure

```text
src/llm/
├── api/                                # Concrete BaseLLM implementations
├── extensions/                         # Optional explicit lifecycle extensions
├── metadata/                           # Live model metadata resolvers
├── transport/                          # Shared transport helpers
├── utils/                              # Config, message/usage observation types, pricing models
├── base.ts                             # Abstract base class
├── custom-llm-provider-config.ts       # Persisted custom-provider schema
├── llm-factory.ts                      # Singleton registry and factory
├── models.ts                           # LLMModel metadata definition
├── supported-model-static-metadata.ts  # Built-in static limits/capabilities/provenance
├── multimodal-capabilities.ts          # Provider-neutral media capability states
├── openai-compatible-endpoint-discovery.ts
├── openai-compatible-endpoint-model.ts
├── openai-compatible-endpoint-provider.ts
├── provider-display-names.ts
├── providers.ts                        # Provider enum
└── runtimes.ts                         # Runtime enum
```

## 6. Configuration

`LLMConfig` controls model behavior:

- **`temperature`**: Sampling randomness.
- **`maxTokens`**: Output limit.
- **`systemMessage`**: Default system prompt.
- **`pricingConfig`**: Built-in catalog API-price metadata. It can carry
  currency, trusted input/output/cache-read/cache-write prices, provider
  source/effective-date identifiers, cache-write subtype prices, input-token
  tiers, and local/no-bill or missing/placeholder status. Missing dimensions
  remain untrusted; server-side accounting decides whether estimated costs can
  be shown and must not treat constructor/default zero values as free pricing.
- **`extraParams`**: Dictionary of model-specific parameters (validates against `configSchema`).

`LLMConfig` is the effective configuration object passed to provider
instances. Factory-created runtime paths compose that effective config in this
order:

```text
base `LLMConfig` defaults
-> model registry `LLMModel.defaultConfig`
-> explicit user/run raw `llmConfig` overrides only
-> provider/model invariant enforcement
-> request builder/provider SDK
```

`LLMFactory.createLLM(identifier, configInput?)` starts from a clone of the
selected model's `defaultConfig` when present, otherwise from a fresh
`LLMConfig`. Passing an `LLMConfig` means the caller already has an effective
config, so the factory merges it over the model defaults. Passing a plain object
means the caller is providing a sparse raw run/default-launch `llmConfig`;
`llm-config-overrides.ts` applies only explicitly present fields. Missing
standard fields do not override model defaults, standard keys such as
`temperature`, `top_p`, `max_tokens`, penalties, and stop sequences become
first-class `LLMConfig` fields, and unknown provider-specific keys are preserved
in `extraParams`. Standard/reserved keys are filtered out of nested
`extra_params` / `extraParams` containers to avoid first-class-field collisions.

Server runtime boundaries should pass persisted raw `llmConfig` records to
`LLMFactory` directly. They should not turn the entire raw record into
`new LLMConfig({ extraParams: rawConfig })`, because that loses absence
semantics and lets standard fields reach the provider as accidental extras.

For OpenAI-compatible Chat Completions providers, `OpenAICompatibleRequestBuilder`
is the single request-body construction boundary. It maps `LLMConfig`
generation controls to provider fields (`temperature`, `top_p`,
`frequency_penalty`, `presence_penalty`, `stop`, and
`max_completion_tokens`), merges `extraParams` for provider-specific extensions,
uses the shared provider-request kwarg sanitizer for framework-internal kwargs
such as `logicalConversationId` and `requestId`, attaches `tools`, and passes
`tool_choice` only when a lower-level direct caller explicitly supplies
`kwargs.tool_choice`. The same sanitizer is used by external provider adapters
such as Anthropic and Mistral so agent bookkeeping identifiers do not leak to
provider SDK request payloads. `logicalConversationId` remains valid for
`AutobyteusLLM`; external adapters filter it at their request boundary instead
of requiring upstream callers to remove it.
Provider adapters can still normalize provider-specific request legality before
delegating to this builder. For example, `KimiLLM` keeps `kimi-k2.6` on
Moonshot-safe temperature defaults unless a caller explicitly passes a
per-request `temperature`, while the `kimi-k2.7-code` and
`kimi-k2.7-code-highspeed` variants enforce fixed temperature, sampling, and
tool-choice values to keep requests provider-valid. `GlmLLM` owns GLM
`thinking_type` to `thinking.type` conversion and
omits stale effort values when thinking is disabled. `DeepSeekLLM` similarly
owns V4 thinking request normalization: user-facing `thinking_type` is converted
to top-level `thinking.type`, stale caller-supplied `thinking` and
`extra_body.thinking` values are dropped, and disabled thinking omits
`reasoning_effort` instead of sending an OpenAI-style `none` effort.

Prompt renderers, not `OpenAICompatibleRequestBuilder`, own provider-visible
message-history extensions. The default `OpenAIChatRenderer` is conservative and
omits internal `Message.reasoning_content` from generic OpenAI-compatible
requests. `DeepSeekLLM` explicitly installs `DeepSeekChatRenderer`, which
replays preserved assistant `Message.reasoning_content` as DeepSeek
`reasoning_content` on assistant messages, including assistant messages that also
carry `tool_calls` for thinking-mode continuation. Custom OpenAI-compatible
endpoints and LM Studio stay on the generic non-emitting renderer unless a future
provider-capability design opts them in.

## 6.1 Local Runtime Transport Hardening

LM Studio and Ollama can spend minutes in prompt processing before they emit the
first response body bytes for a large local request. The TypeScript runtime now
keeps that policy explicit and provider-owned instead of broadening it to every
OpenAI-compatible caller:

- `src/llm/transport/local-long-running-fetch.ts` owns a shared `undici.Agent`
  with `bodyTimeout: 0` and `headersTimeout: 0` for long-running local calls.
- `LMStudioLLM` injects that fetch helper and also sets a high finite OpenAI SDK
  timeout (`LOCAL_PROVIDER_SDK_TIMEOUT_MS`, currently `24h`) because the SDK
  default is shorter and `timeout: 0` is not a true disable path there.
- In native API tool-call mode, `LMStudioLLM` uses `OpenAIChatRenderer` so prior
  tool calls/results are sent as structured OpenAI-compatible history
  (`assistant.tool_calls` plus `role: "tool"` messages). The legacy
  `[TOOL_CALL]` / `[TOOL_RESULT]` text history renderer is scoped to explicit
  text-parser modes only. Native tool-result continuations do not append an
  additional aggregate `role: "user"` message containing the same tool results.
- `OllamaLLM` injects the same shared fetch helper through its adapter.
- Non-local / cloud OpenAI-compatible providers keep default SDK transport
  behavior unless a separate review explicitly widens that policy.

This hardening still matters to compaction when the selected visible compactor
agent uses a local model and sends a large request before the next parent-agent
LLM leg is allowed to continue.

## 6.2 Native API Tool-Call History Rendering

In native API tool-call mode, working-context tool history stays semantic until
the final provider renderer boundary. The runtime stores assistant tool calls as
`ToolCallPayload` and tool outputs as `ToolResultPayload`; the selected provider
renderer then maps those entries to provider-native request history instead of
legacy prompt text.

Current native mappings are:

| Provider path | Native history shape |
| --- | --- |
| OpenAI-compatible Chat / LM Studio | `assistant.tool_calls` plus matching `role: "tool"` messages. Generic `OpenAIChatRenderer` omits internal `Message.reasoning_content`. |
| DeepSeek OpenAI-compatible path | Same OpenAI-compatible tool-call/result shape, with `DeepSeekChatRenderer` replaying preserved assistant `Message.reasoning_content` as DeepSeek `reasoning_content` for thinking-mode continuation. |
| Gemini | model `functionCall` parts plus user `functionResponse` parts, preserving call ids when available. |
| Ollama | assistant `tool_calls` plus `role: "tool"` result messages with `tool_name`. |
| Anthropic | assistant `tool_use` blocks plus immediately-following user `tool_result` blocks. |
| Mistral | assistant `tool_calls` plus `role: "tool"` messages with `tool_call_id` and `name`. |
| OpenAI Responses | Captured `response.output` items replayed once when available, including required `reasoning` items before `function_call` items, followed by `function_call_output` items keyed by `call_id`. Matching function calls keep provider item metadata but use the final normalized `ToolCallSpec` id/name/arguments. |

Renderer selection is mode-aware. `api_tool_call` selects the native provider
renderer; `xml`, `json`, and `sentinel` select explicit text-history renderers
so non-native parser modes continue to emit their configured
`[TOOL_CALL]` / `[TOOL_RESULT]`-style history. Native text-only tool-result
continuation does not append an additional aggregate user message such as `The
following tool executions have completed...`, legacy `Tool: <name> (ID: ...)`
lines, or aggregate `Status: Success` markers; the next LLM request is assembled
from the existing working context and rendered through the provider's native
channel. If a continuation carries context-file media, the request may append a
user/media carrier, but its text is limited to semantic completed-tool wording
such as `The read_media_file tool call completed successfully.` and must not
include internal continuation labels or generated tool-call formatting guidance.

OpenAI Responses is stricter than Chat Completions-style history for reasoning
models. When a streamed Responses turn records `responseOutputItems` on the
native tool-call context, `OpenAIResponsesRenderer` treats that completed
provider sequence as authoritative for replay ordering. It preserves reasoning
items and replayable encrypted reasoning content, normalizes only the matching
function-call `call_id`/`name`/`arguments` from the final `ToolCallSpec`, and then
adds matching `function_call_output` items. `OpenAIResponsesLLM` requests
`reasoning.encrypted_content` whenever tools or prior Responses tool/reasoning
items are present, while preserving caller-supplied `include` entries.

For parallel tool-call batches, renderers replay results in the original
assistant tool-call order rather than result completion order. Gemini and
Anthropic coalesce adjacent result payloads into one provider-valid user result
turn/block group. Streaming converters may preserve provider-native metadata in
`nativeToolCallContext` for stateless replay, but the normalized stored
`id`, `name`, and arguments remain authoritative in the rendered request.

## 6.3 Provider Media Payload Rendering

`Message.image_urls`, `Message.audio_urls`, and `Message.video_urls` represent
declared current-turn media input. The image/audio/video extension policy lives
in the shared `src/utils/media-file-kind.ts` classifier; `ContextFileType` and
`src/llm/utils/media-payload-formatter.ts` must use that classifier rather than
maintaining independent allowlists.

Provider prompt renderers own only provider wire shape. For direct Gemini,
declared local media is converted by the media payload formatter and sent as
`inlineData` with the formatter-resolved MIME type, so a local `.m4a` audio file
renders as `audio/mp4` inline data. If a declared media source cannot be
converted, the renderer must fail with an actionable error before provider
invocation instead of silently continuing with a text-only request.

## 7. Dynamic Model Reloading

For reloadable built-in runtimes (`OLLAMA`, `LMSTUDIO`, `AUTOBYTEUS`),
`LLMFactory.reloadModels(provider)` performs a provider-scoped reload:

1.  **Fetch** the latest model list for that provider.
2.  **Replace on success** so the provider's registry slice becomes the new
    discovered set.
3.  **Preserve on failure** so a failed fetch does not silently wipe the last
    known provider models.

Custom OpenAI-compatible providers use a different boundary:
`LLMFactory.syncOpenAICompatibleEndpointModels(savedProviders)`.

Anthropic provider-scoped reload is not dynamic discovery. It returns the
current static Anthropic catalog count until
`src/llm/supported-model-definitions.ts` is updated.

- Each saved provider is probed independently through its `/models` endpoint.
- Successful providers contribute fresh `OPENAI_COMPATIBLE` runtime models.
- The synced model set is authoritative to the current saved-provider list, so
  deleting a saved custom provider removes that provider's models from the next
  sync and from future cold-start registry state.
- A provider that previously loaded successfully can keep its last-known-good
  models with a `STALE_ERROR` status when a later refresh fails.
- A provider that has never loaded successfully reports an error without wiping
  healthy providers.

This isolation is important because one broken custom endpoint must not remove
healthy custom providers or the built-in registry.

## 8. Provider Configuration Mapping

Provider config schemas are the source of truth for both runtime payload shaping
and frontend model-config display. The UI displays explicit config values first
and valid schema defaults second, but it does not write displayed defaults into
`llmConfig` unless the user changes a control or an existing apply-defaults flow
requires it. The top-level **Thinking** state is schema/default-driven and must
not be inferred from model names. In editable primary/global launch config,
**Advanced** opens by default when effective **Thinking** is ON and starts
collapsed when effective **Thinking** is OFF or unavailable; toggling a supported
**Thinking** control ON opens **Advanced**.

| Provider   | Param Name         | Type    | UI Control | Runtime / Provider Request Effect |
| ---------- | ------------------ | ------- | ---------- | ---------------------------- |
| GPT-5.5          | `reasoning_effort` | ENUM    | Dropdown / schema-backed Thinking state | `{reasoning_effort: "high"}` |
| Gemini 3 / 3.5 Flash | `thinking_level`   | ENUM    | Dropdown / schema-backed Thinking state | `{thinking_level: "high"}`   |
| Current Claude adaptive rows | `thinking_enabled` | BOOLEAN | Basic Thinking toggle | `{thinking: {type: "adaptive"}}` |
| Current Claude adaptive rows | `thinking_display` | ENUM    | Dropdown   | `{thinking: {type: "adaptive", display: "summarized"}}` |
| DeepSeek V4      | `thinking_type`    | ENUM    | Basic Thinking toggle | `{thinking: {type: "enabled"}}` |
| DeepSeek V4      | `reasoning_effort` | ENUM    | Dropdown   | `{reasoning_effort: "max"}` |
| Zhipu GLM 5.2     | `thinking_type`    | ENUM    | Basic Thinking toggle | `{thinking: {type: "enabled"}}`   |
| Zhipu GLM 5.2     | `reasoning_effort` | ENUM    | Dropdown   | `{reasoning_effort: "max"}` |
