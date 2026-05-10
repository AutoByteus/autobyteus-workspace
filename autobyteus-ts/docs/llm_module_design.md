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
  - **Extensions:** Registry for plugins like token usage tracking.
  - **Hooks:** `beforeInvoke` and `afterInvoke` lifecycle hooks.
  - **Abstract Methods:** Subclasses must implement `_sendUserMessageToLLM` (unary) and `_streamUserMessageToLLM` (streaming).

- **`LLMModel`:**
  Represents the _metadata_ of a model, not the active instance. It contains:
  - **Identifier:** A globally unique string (e.g., `gpt-4o`,
    `llama3:latest:ollama@localhost:11434`,
    `openai-compatible:provider_1234567890abcdef:deepseek-chat`).
  - **Provider Identity:** `providerId`, `providerName`, and `providerType`.
    Built-in providers use stable enum IDs (for example `OPENAI`), while custom
    OpenAI-compatible providers keep their own generated provider IDs.
  - **Runtime:** Where the model is hosted (e.g., `API`,
    `OPENAI_COMPATIBLE`, `OLLAMA`).
  - **Config Schema:** A JSON schema defining model-specific configuration parameters (e.g., `thinking_level` for reasoning models).
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
      `claude-opus-4.7`, `deepseek-v4-flash`, and `kimi-k2.6`).
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
    const llm = await LLMFactory.createLLM('openai-compatible:provider_1234567890abcdef:deepseek-chat');
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
editing `LLMFactory.initializeRegistry()` directly. Add docs-backed metadata in
`src/llm/metadata/curated-model-metadata.ts` when the model has known context,
output, or pricing details. Provider-specific request-shape rules belong in the
provider adapter under `src/llm/api/`.

Current examples of provider-specific model rules:

- `claude-opus-4.7` uses Anthropic adaptive thinking rather than fixed-budget
  extended thinking, and the adapter does not inject a default `temperature`
  for that model.
- `deepseek-v4-flash` and `deepseek-v4-pro` use the existing DeepSeek
  OpenAI-compatible adapter with their V4 thinking schema.
- `kimi-k2.6` disables thinking automatically for tool workflows when the
  caller has not supplied an explicit thinking override. `kimi-k2.5` and
  `kimi-k2.6` also normalize provider-safe temperature defaults: tool
  workflows use `temperature: 0.6`, non-tool requests use `temperature: 1`, and
  explicit per-request `temperature` kwargs are preserved.

See `docs/provider_model_catalogs.md` for the catalog ownership map across LLM,
audio/TTS, and image models.

### 4.2 Adding a New Cloud Provider

1.  **Create concrete LLM class:** Subclass `BaseLLM` (e.g., `NewProviderLLM`) in `src/llm/api/`. Implement `_send...` and `_stream...` methods.
2.  **Update Enums:** Add the provider to `LLMProvider`.
3.  **Register Models:** Add supported model definitions and metadata so
    `LLMFactory.initializeRegistry()` can build and register `LLMModel`
    entries.

### 4.3 Extensions System

The `BaseLLM` supports extensions that hook into the request/response lifecycle.

- **`TokenUsageTrackingExtension`:** Automatically registered. Tracks input/output tokens and cost based on `LLMConfig`.
- **Custom Extensions:** Can be registered via `registerExtension`. Useful for logging, rate limiting, or PII redaction.

## 5. Directory Structure

```text
src/llm/
├── api/                                # Concrete BaseLLM implementations
├── extensions/                         # LLM extensions (token usage, etc.)
├── metadata/                           # Model metadata resolvers
├── transport/                          # Shared transport helpers
├── utils/                              # Config, message types, pricing models
├── base.ts                             # Abstract base class
├── custom-llm-provider-config.ts       # Persisted custom-provider schema
├── llm-factory.ts                      # Singleton registry and factory
├── models.ts                           # LLMModel metadata definition
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
- **`pricingConfig`**: Cost per million tokens (input/output).
- **`extraParams`**: Dictionary of model-specific parameters (validates against `configSchema`).

This config can be set globally per model in `LLMFactory` or overridden per instance during `createLLM`.

For OpenAI-compatible Chat Completions providers, `OpenAICompatibleRequestBuilder`
is the single request-body construction boundary. It maps `LLMConfig`
generation controls to provider fields (`temperature`, `top_p`,
`frequency_penalty`, `presence_penalty`, `stop`, and
`max_completion_tokens`), merges `extraParams` for provider-specific extensions,
filters framework-internal kwargs such as `logicalConversationId` and
`requestId`, attaches `tools`, and passes `tool_choice` only when a
lower-level direct caller explicitly supplies `kwargs.tool_choice`. This keeps
provider request payloads deterministic and prevents
agent bookkeeping identifiers from leaking to OpenAI-compatible endpoints.
Provider adapters can still normalize provider-specific request legality before
delegating to this builder. For example, `KimiLLM` keeps `kimi-k2.5` and
`kimi-k2.6` on Moonshot-safe temperature defaults unless a caller explicitly
passes a per-request `temperature`.

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
| OpenAI-compatible Chat / LM Studio | `assistant.tool_calls` plus matching `role: "tool"` messages. |
| Gemini | model `functionCall` parts plus user `functionResponse` parts, preserving call ids when available. |
| Ollama | assistant `tool_calls` plus `role: "tool"` result messages with `tool_name`. |
| Anthropic | assistant `tool_use` blocks plus immediately-following user `tool_result` blocks. |
| Mistral | assistant `tool_calls` plus `role: "tool"` messages with `tool_call_id` and `name`. |
| OpenAI Responses | `function_call` items plus `function_call_output` items keyed by `call_id`. |

Renderer selection is mode-aware. `api_tool_call` selects the native provider
renderer; `xml`, `json`, and `sentinel` select explicit text-history renderers
so non-native parser modes continue to emit their configured
`[TOOL_CALL]` / `[TOOL_RESULT]`-style history. Native tool-result continuation
does not append an additional aggregate user message such as
`The following tool executions have completed...`, legacy
`Tool: <name> (ID: ...)` lines, or aggregate `Status: Success` markers; the
next LLM request is assembled from the existing working context and rendered
through the provider's native channel.

For parallel tool-call batches, renderers replay results in the original
assistant tool-call order rather than result completion order. Gemini and
Anthropic coalesce adjacent result payloads into one provider-valid user result
turn/block group. Streaming converters may preserve provider-native metadata in
`nativeToolCallContext` for stateless replay, but the normalized stored
`id`, `name`, and arguments remain authoritative in the rendered request.

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

| Provider   | Param Name         | Type    | UI Control | Sent to Backend              |
| ---------- | ------------------ | ------- | ---------- | ---------------------------- |
| GPT-5.5          | `reasoning_effort` | ENUM    | Dropdown   | `{reasoning_effort: "high"}` |
| Gemini 3         | `thinking_level`   | ENUM    | Dropdown   | `{thinking_level: "high"}`   |
| Claude Opus 4.7  | `thinking_enabled` | BOOLEAN | Toggle     | `{thinking: {type: "adaptive"}}` |
| Claude Opus 4.7  | `thinking_display` | ENUM    | Dropdown   | `{thinking: {type: "adaptive", display: "summarized"}}` |
| DeepSeek V4      | `thinking.type`    | ENUM    | Dropdown   | `{thinking: {type: "enabled"}}` |
| DeepSeek V4      | `reasoning_effort` | ENUM    | Dropdown   | `{reasoning_effort: "max"}` |
| Zhipu GLM        | `thinking_enabled` | BOOLEAN | Toggle     | `{thinking_enabled: true}`   |
