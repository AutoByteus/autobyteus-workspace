# LLM Module Design (Node.js / TypeScript)

This document complements `docs/llm_module_design.md` and focuses on the
Node.js/TypeScript implementation in `autobyteus-ts`.

## 1. Overview

The Node.js LLM module mirrors the Python architecture (`BaseLLM` +
`LLMModel` + `LLMFactory`) while adapting to official Node SDKs and streaming
APIs. In addition to built-in cloud and local providers, the TypeScript
implementation now supports multiple saved custom OpenAI-compatible providers
under the same provider-centered model contract.

## 2. Core Types

- **`BaseLLM`** (`src/llm/base.ts`): message history, system prompt,
  extensions, and the abstract `_sendUserMessageToLLM` /
  `_streamUserMessageToLLM` hooks.
- **`LLMModel`** (`src/llm/models.ts`): model metadata including:
  - `model_identifier`
  - `provider_id`
  - `provider_name`
  - `provider_type`
  - `runtime`
  - optional `host_url` and `config_schema`
- **`LLMFactory`** (`src/llm/llm-factory.ts`): registry, discovery, reload
  logic, and custom OpenAI-compatible provider sync.

## 3. OpenAI Paths

### 3.1 Official OpenAI

Official OpenAI remains on the Responses API path:

- **`OpenAIResponsesLLM`** (`src/llm/api/openai-responses-llm.ts`)
  - Uses `client.responses.create(...)` from the official Node SDK.
  - Supports reasoning params such as `reasoning_effort`.
  - Normalizes tool definitions to OpenAI function style.
  - Streams text, reasoning-summary, and function-call events.
- **`OpenAILLM`** (`src/llm/api/openai-llm.ts`) extends
  `OpenAIResponsesLLM`.

This ticket did **not** move official OpenAI onto the generic
OpenAI-compatible path.

### 3.2 OpenAI-Compatible Providers

Two OpenAI-style paths coexist:

- **Built-in OpenAI-style providers** such as DeepSeek, Grok, Kimi, Qwen, GLM,
  and MiniMax still use `OpenAICompatibleLLM`.
- OpenAI-compatible Chat Completions payloads are built through
  `OpenAICompatibleRequestBuilder`, which maps `LLMConfig` generation controls,
  merges provider-specific `extraParams`, filters framework-internal kwargs, owns
  `tools` placement, and preserves explicit lower-level `tool_choice`
  pass-through. The default agent/server path leaves `tool_choice` unset.
- Provider adapters keep provider-specific request legality local before
  delegating to that builder. `KimiLLM`, for example, normalizes `kimi-k2.6`
  requests to Moonshot-safe temperature defaults unless the caller explicitly
  passes a per-request `temperature`.
- **Saved custom providers** use:
  - `openai-compatible-endpoint-discovery.ts` for `/models` probing
  - `OpenAICompatibleEndpointModel`
  - `OpenAICompatibleEndpointLLM`
  - `OpenAICompatibleEndpointModelProvider`

Custom providers keep `provider_type = OPENAI_COMPATIBLE` while each saved
provider gets its own `provider_id` and `provider_name`.

## 4. Provider Implementations

Cloud providers (SDK-backed or API-backed):

- `OpenAILLM`
- `AnthropicLLM`
- `GeminiLLM`
- `MistralLLM`
- `OpenAICompatibleLLM`

Local runtimes:

- **LM Studio**: `LMStudioLLM`, `LMStudioModelProvider`
- **Ollama**: `OllamaLLM`, `OllamaModelProvider`
- **Autobyteus**: `AutobyteusLLM`, `AutobyteusModelProvider`

Dynamic custom runtime:

- **Custom OpenAI-compatible providers**:
  `OPENAI_COMPATIBLE` runtime models backed by a saved provider record
  (`id`, `name`, `baseUrl`, `apiKey`).

## 5. Model Identifiers

- API runtimes use the model name directly (for example `gpt-5.5`).
- Local runtimes include the host, for example
  `qwen/qwen3-vl-30b:lmstudio@192.168.2.158:1234`.
- Saved custom OpenAI-compatible providers use the provider-owned identifier
  shape:

  ```text
  openai-compatible:<providerId>:<modelName>
  ```

  Example:

  ```text
  openai-compatible:provider_1234567890abcdef:custom-chat-model
  ```

This keeps model identity stable even when two providers expose the same model
name.

## 6. Built-In Model Catalog Ownership

Built-in LLM API models are defined in
`src/llm/supported-model-definitions.ts`. `LLMFactory.initializeRegistry()`
loads those definitions, resolves curated metadata from
`src/llm/metadata/curated-model-metadata.ts`, then registers the resulting
`LLMModel` objects.

The current latest-model support set is summarized in
`docs/provider_model_catalogs.md`. Notable LLM entries include:

- OpenAI `gpt-5.5` (verified 2026-04-25).
- Anthropic `claude-opus-4.7` with API value `claude-opus-4-7` (verified
  2026-04-25).
- DeepSeek `deepseek-v4-flash` and `deepseek-v4-pro` (verified 2026-04-25).
- Gemini `gemini-3.5-flash` with the same provider value for API-key and
  Vertex runtimes (verified 2026-05-20).
- Moonshot/Kimi `kimi-k2.6` (verified 2026-04-25).

Provider adapters own request-shape differences:

- `AnthropicLLM` maps Opus 4.7 adaptive-thinking config without sending fixed
  thinking budgets or an adapter-injected default `temperature`.
- `DeepSeekLLM` continues to use the OpenAI-compatible DeepSeek path for V4.
- `GeminiLLM` uses the exact `gemini-3.5-flash` ID for both API-key and Vertex
  modes through `src/utils/gemini-model-mapping.ts`, while sharing the existing
  Gemini thinking config schema.
- `KimiLLM` keeps tool-call continuation safe for `kimi-k2.6` by disabling
  thinking when tool workflows have no explicit thinking override. Kimi also
  normalizes provider-safe temperature defaults for `kimi-k2.6`: `0.6` for tool
  workflows and `1` for non-tool requests, while preserving explicit
  per-request temperature kwargs.

For image and audio/TTS catalogs, including OpenAI `gpt-image-2` and Gemini TTS
models, see `docs/provider_model_catalogs.md`.

## 7. Discovery, Reload, and Failure Isolation

- `LLMFactory.ensureInitialized()` registers built-in models and probes local
  runtimes.
- `LLMFactory.reloadModels(provider)` supports provider-scoped reload for
  reloadable built-in providers such as LM Studio, Ollama, and Autobyteus.
- Reload is **replace-on-success / preserve-on-failure**. Failed built-in
  reloads do not wipe the existing provider slice.
- Saved custom OpenAI-compatible providers are synced through
  `LLMFactory.syncOpenAICompatibleEndpointModels(savedProviders)`.
- That sync is authoritative to the current saved-provider set, so removing a
  saved custom provider removes its `openai-compatible:<providerId>:<model>`
  identifiers from the next sync and from future cold-start registry state.
- Custom-provider sync probes each saved provider independently, returns
  per-provider status, and preserves last-known-good models for providers that
  fail after a previously successful load (`STALE_ERROR`).

This prevents one broken custom endpoint from wiping healthy custom providers.

## 8. Streaming & Tool Calls

Tool call deltas are normalized into `ToolCallDelta` objects across providers:

- `openai-tool-call-converter`
- `anthropic-tool-call-converter`
- `mistral-tool-call-converter`
- `gemini-tool-call-converter`

Responses streaming (official OpenAI) emits:

- output text deltas
- reasoning summary deltas
- function call deltas
- completed event with usage

Custom OpenAI-compatible providers stay on the existing OpenAI-style tool-call
path rather than the Responses event format.

In that OpenAI-compatible path, native API tool-call mode keeps tool metadata
and history provider-native: schemas are sent through `tools`, the default
agent/server path leaves `tool_choice` unset, and LM Studio uses
`assistant.tool_calls` plus `role: "tool"` history instead of prompt-template
`[TOOL_CALL]` / `[TOOL_RESULT]` text. Legacy text-shaped LM Studio history
remains available only when an explicit text-parser mode is selected. Native
tool-result continuations render the existing working context directly and do
not append an extra aggregate `role: "user"` message containing tool results.

DeepSeek is the provider-specific reasoning replay exception on this shared
OpenAI-compatible transport: `DeepSeekLLM` installs `DeepSeekChatRenderer`, which
emits preserved assistant `Message.reasoning_content` as DeepSeek
`reasoning_content` on assistant messages, including assistant `tool_calls` turns
needed for thinking-mode continuation. The default `OpenAIChatRenderer` used by
generic OpenAI-compatible clients, custom endpoints, and LM Studio deliberately
omits that extension field.

The same native-history rule applies to the first-party provider adapters that
have native tool APIs. `ToolCallPayload` and `ToolResultPayload` remain the
internal memory contract, while each prompt renderer converts those semantic
entries to the provider's wire format only when `resolveToolCallFormat()` is
`api_tool_call`:

| Provider path | Native history shape in `api_tool_call` mode |
| --- | --- |
| DeepSeek OpenAI-compatible path | OpenAI-compatible `assistant.tool_calls` followed by matching `role: "tool"` messages; assistant messages with preserved `Message.reasoning_content` also render DeepSeek `reasoning_content`. |
| Gemini | model turns with `functionCall` parts followed by user `functionResponse` parts, preserving the function-call `id` when present. |
| Ollama | assistant messages with `tool_calls` followed by `role: "tool"` result messages containing `tool_name`. |
| Anthropic | assistant `tool_use` blocks followed immediately by user `tool_result` blocks, with result blocks first in that user message. |
| Mistral | assistant `tool_calls` followed by `role: "tool"` messages containing `name`, `content`, and `tool_call_id`. |
| OpenAI Responses | Captured `response.output` input items replayed once when available, including required `reasoning` items before `function_call` items, followed by `function_call_output` items keyed by `call_id`. Matching function calls keep provider item metadata but use final normalized `ToolCallSpec` id/name/arguments. |

Streaming converters can attach `nativeToolCallContext` to normalized tool calls
for provider metadata that must survive stateless continuation, such as Gemini
model parts, Anthropic tool-use blocks, Mistral/Ollama native call records, and
OpenAI Responses output items. For OpenAI Responses, the completed
`response.output` sequence is replayed as the authoritative provider order so
reasoning items required by a following function call are not dropped. The
normalized final `id`, `name`, and arguments remain authoritative during replay
so stale preserved metadata cannot override the tool invocation stored in working
context. `OpenAIResponsesLLM` requests `reasoning.encrypted_content` when tools
or prior Responses tool/reasoning items are present and merges that include with
caller-supplied `include` entries.

If tool results settle in a different order than the assistant's tool-call
batch, native renderers replay those results in the original assistant
`ToolCallSpec[]` order. Providers that require coalesced result turns
(currently Gemini and Anthropic) render one ordered result turn/block group for
the batch. When `resolveToolCallFormat()` is `xml`, `json`, or `sentinel`, the
same providers use their explicit text-history renderers and keep legacy
`[TOOL_CALL]` / `[TOOL_RESULT]` history isolated to those non-native modes.
Native provider payloads must also omit the older synthetic aggregate
tool-result user text, including the
`The following tool executions have completed...` prefix, legacy
`Tool: <name> (ID: ...)` lines, and aggregate `Status: Success` markers.

## 9. Autobyteus RPA Runtime Conversation Contract

`AutobyteusLLM` is the TypeScript adapter for browser-backed RPA LLM models
served by the AutoByteus RPA LLM server. Unlike stateless API providers, this
runtime has a remote browser/UI conversation cache, so the adapter must send
enough conversation context for the server to resume semantically when the
server-side cache is absent.

Every AutoByteus RPA text request must provide a stable logical id through
`logicalConversationId`. Agent-driven requests pass the restored agent/run id;
direct `AutobyteusLLM` callers must provide their own stable id. Missing,
empty, or non-string ids are rejected before any HTTP request is sent.
`AutobyteusLLM.cleanup()` tracks and cleans every explicit remote conversation
id used by the instance.

`AutobyteusClient.sendMessage(...)` and `AutobyteusClient.streamMessage(...)`
use the same request object. Both methods also accept `{ signal }` as the
second options argument; `AutobyteusLLM` passes `LLMInvocationOptions.signal`
through to those client calls so native runtime interrupts abort the underlying
Axios `/send-message` and `/stream-message` requests:

```ts
const abortController = new AbortController();
let responseText = '';

for await (const chunk of client.streamMessage({
  conversationId: 'stable-agent-or-run-id',
  modelName: 'gpt-5-instant-rpa',
  payload: {
    messages: [
      {
        role: 'system',
        content: 'You are helpful.',
        image_urls: [],
        audio_urls: [],
        video_urls: []
      },
      {
        role: 'user',
        content: 'Previous question',
        image_urls: [],
        audio_urls: [],
        video_urls: []
      },
      {
        role: 'assistant',
        content: 'Previous answer',
        image_urls: [],
        audio_urls: [],
        video_urls: []
      },
      {
        role: 'user',
        content: 'Current question',
        image_urls: ['data:image/png;base64,...'],
        audio_urls: [],
        video_urls: []
      }
    ],
    current_message_index: 3
  }
}, { signal: abortController.signal })) {
  responseText += chunk.content ?? '';
  if (chunk.is_complete) {
    break;
  }
}
```

The payload invariants are:

- `messages` is the rendered conversation transcript and must be non-empty.
- `current_message_index` must point to the current user message.
- HTTP transcript messages carry only `role`, rendered `content`, and media URL
  arrays. There is no `tool_payload` field in the RPA HTTP DTO, and the server
  request schema rejects stale extra fields.
- Before transport, `AutobyteusPromptRenderer` reads working-context
  `ToolCallPayload` and `ToolResultPayload` objects and renders them into
  message `content`: assistant tool calls become canonical AutoByteus XML, and
  tool results become deterministic records containing id, tool name, result,
  and error information.
- Current-turn media stays attached to the current user message.
- Historical media is represented textually by the renderer and is not
  re-uploaded in prior transcript entries.
- The older single-field text body shape is not supported by this contract.

On the RPA server, an existing cached session sends only the current user
message to the remote UI. A cache miss creates a new browser-backed LLM
instance and sends one neutral browser-visible user input by flattening the
already rendered role/content transcript through
`messages[current_message_index]`. The cache-miss input intentionally avoids
visible resume/session/cache wrappers and never emits `Prior transcript:`,
`Current user request:`, or a `System:` header. System-role content is included
as an unlabeled preface when present. A first call with `[system, current user]`
therefore appears as `<system content>\n\n<current user content>`; a first call
with only `[current user]` appears as exactly the current user content. Multi-
turn reconstruction keeps the unlabeled system preface, then uses ordered
`User:`, `Assistant:`, and `Tool:` blocks for non-system history and ends with
the current `User:` block. The server does not parse tool payloads and does not
generate tool XML.

## 10. Testing

Focused unit coverage for this contract lives in:

- `tests/unit/llm/models.test.ts`
- `tests/unit/llm/openai-compatible-endpoint-provider.test.ts`
- `tests/unit/llm/api/autobyteus-llm.test.ts`
- `tests/unit/llm/api/provider-native-request-payloads.test.ts`
- `tests/unit/llm/prompt-renderers/autobyteus-prompt-renderer.test.ts`
- `tests/unit/llm/prompt-renderers/provider-native-tool-history-renderers.test.ts`
- `tests/unit/clients/autobyteus-client.test.ts`
- `tests/unit/agent/loop/agent-turn-input-box.test.ts`
- `tests/unit/agent/loop/tool-result-continuation-builder.test.ts`

Provider-native continuation integration coverage lives in
`tests/integration/agent/provider-native-tool-continuation-flow.test.ts`; it
drives the local agent event loop across the in-scope native providers, verifies
that native tool results continue through provider-native carriers, and rejects
the old synthetic aggregate user message. Broader integration tests remain
under `tests/integration/llm/...`.

## 11. Where to Update

- Add built-in LLM API models in `src/llm/supported-model-definitions.ts`.
- Add docs-backed LLM context/output/pricing metadata in
  `src/llm/metadata/curated-model-metadata.ts`.
- Keep provider-specific request-shape behavior in the matching
  `src/llm/api/*` adapter.
- Keep provider-specific native tool history in
  `src/llm/prompt-renderers/*-prompt-renderer.ts`; choose native vs legacy
  text history through `src/llm/prompt-renderers/provider-tool-history-renderer-selection.ts`.
- Add image models in `src/multimedia/image/image-client-factory.ts`.
- Add audio/TTS models in `src/multimedia/audio/audio-client-factory.ts`.
- Add Gemini API-key / Vertex runtime model mappings for LLM, image, and audio
  surfaces in `src/utils/gemini-model-mapping.ts`.
- Add provider display names in `src/llm/provider-display-names.ts`.
- Update shared metadata shape in `src/llm/models.ts`.
- Update saved custom-provider schema in
  `src/llm/custom-llm-provider-config.ts`.
- Update OpenAI-compatible custom-provider discovery/modeling in:
  - `src/llm/openai-compatible-endpoint-discovery.ts`
  - `src/llm/openai-compatible-endpoint-model.ts`
  - `src/llm/openai-compatible-endpoint-provider.ts`
