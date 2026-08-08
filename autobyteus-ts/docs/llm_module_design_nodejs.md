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
  - `multimodalCapabilities` with explicit `supported`, `unsupported`, or
    `unknown` states for image, audio, and video input
  - `resolvedModelMetadata` with per-field numeric provenance (`live`,
    `inferred_builtin`, `static_definition`, or `unknown`)
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

The exact built-in GPT-5.6 IDs are `gpt-5.6-sol`, `gpt-5.6-terra`, and
`gpt-5.6-luna`. They use this same Responses path, a family-specific reasoning
schema that adds `max` and defaults to `medium`, and trusted tiered pricing for
standard, cache-read, cache-write, and output components. The shared usage
normalizer maps nested OpenAI `cache_write_tokens` into the generic
cache-creation input component so server accounting and frontend presentation do
not need a provider-specific branch. Catalog registration is independent of the
configured account's limited-preview entitlement; do not add an unsuffixed
`gpt-5.6` alias or substitute another model when invocation is rejected.

This direct API usage contract must not be projected onto Codex app-server
events. The Codex protocol verified on 2026-07-10 exposes total, input,
cached-input, output, and reasoning counts but no cache-write count.
`cachedInputTokens` maps to cache read only; cache creation stays unknown/null,
and a catalog write rate without a reported quantity produces no write cost or
Token Meter write row. Never infer the uncached remainder as a write. A future
Codex write field must first be confirmed in generated supported bindings and
mapped in the server Codex runtime adapter with its `total`/`last` semantics,
not added to `OpenAIResponsesLLM` or its usage normalizer.

Official OpenAI does **not** use the generic OpenAI-compatible runtime path.

### 3.2 OpenAI-Compatible Providers

Two OpenAI-style paths coexist:

- **Built-in OpenAI-style providers** such as DeepSeek, Grok, Kimi, Qwen, GLM,
  and the retained MiniMax M3 entry still use `OpenAICompatibleLLM`.
- Qwen resolves its OpenAI-compatible endpoint through
  `src/llm/qwen-provider-config.ts`. A nonblank `QWEN_BASE_URL` wins; otherwise
  the built-in international DashScope URL is used. Both paths use the same
  base-URL normalizer before `QwenLLM` construction. Endpoint selection is
  independent from model identity, while the Qwen API key remains owned by the
  provider credential resolver.
- OpenAI-compatible Chat Completions payloads are built through
  `OpenAICompatibleRequestBuilder`, which maps `LLMConfig` generation controls,
  merges provider-specific `extraParams`, uses the shared provider-request
  kwarg sanitizer for framework-internal kwargs, owns `tools` placement, and
  preserves explicit lower-level `tool_choice` pass-through. The default
  agent/server path leaves `tool_choice` unset.
- `src/llm/api/provider-request-kwargs.ts` owns shared external-provider
  filtering for internal invocation fields such as `logicalConversationId`,
  `logical_conversation_id`, `conversationId`, `agentId`, `turnId`,
  `requestId`, and `renderedPayload`. Provider adapters name their own
  controlled fields; the sanitizer must not own provider-specific model policy.
- Provider adapters keep provider-specific request legality local before
  delegating to that builder. `KimiLLM`, for example, normalizes `kimi-k2.6`
  requests to Moonshot-safe temperature defaults and applies separate
  fixed sampling/tool-choice constraints for both K2.7 Code official IDs:
  `kimi-k2.7-code` and `kimi-k2.7-code-highspeed`. `GlmLLM` maps the flat GLM
  thinking schema to provider-native request fields.
- **Saved custom providers** use:
  - `openai-compatible-endpoint-discovery.ts` for `/models` probing
  - `OpenAICompatibleEndpointModel`
  - `OpenAICompatibleEndpointLLM`
  - `OpenAICompatibleEndpointModelProvider`

Custom providers keep `provider_type = OPENAI_COMPATIBLE` while each saved
provider gets its own `provider_id` and `provider_name`.

Custom `/models` discovery extracts normalized IDs and a bounded allowlist of
positive integer context/input/output aliases. Model metadata is resolved per
field in this order: endpoint-advertised value (`live`), exact
`SupportedModelDefinition.value` as an explicitly inferred fallback
(`inferred_builtin`), then `unknown`. The resolver never receives the custom
endpoint URL and does not use wire aliases, suffix, family, case-insensitive,
display-name, or nearest-model matching. API keys and raw discovery payloads
remain outside model info and persisted custom-provider metadata.

### 3.3 Factory Config Composition

`LLMFactory.createLLM(modelIdentifier, configInput?)` is the effective runtime
config composition boundary for factory-created LLMs. It clones
`LLMModel.defaultConfig` when the selected model defines one, otherwise it
starts from a normal `LLMConfig`.

The second argument has two meanings:

- `LLMConfig` input is treated as an already-effective config and merged over
  the model defaults.
- Plain object input is treated as a sparse raw run/default-launch `llmConfig`.
  Only keys that are explicitly present override defaults.

The raw override applier maps standard keys such as `temperature`, `top_p`,
`max_tokens`, penalties, and stop sequences into first-class `LLMConfig`
fields. Missing fields preserve model defaults, unknown provider-specific keys
flow into `extraParams`, and standard/reserved keys are filtered out of nested
`extra_params` / `extraParams` containers so they cannot collide with
first-class fields later. Server-side AutoByteus run assembly should pass raw
persisted `llmConfig` objects to `LLMFactory`; it should not wrap the entire
record as `new LLMConfig({ extraParams: llmConfig })`.

Provider/model invariants are enforced after this factory composition and
before request construction. The Kimi K2.7 Code policy is the concrete example:
both `kimi-k2.7-code` and `kimi-k2.7-code-highspeed` seed fixed defaults from
the catalog and are still normalized by `KimiLLM` before the OpenAI-compatible
request builder runs.

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

Autobyteus runtime models are remote RPA-backed LLMs discovered from
`AUTOBYTEUS_LLM_SERVER_HOSTS`. `AutobyteusLLM` forwards `LLMConfig.extraParams`
as the chat request `generation_config` for both `/send-message` and
`/stream-message`, allowing remote Gemini UI/App integrators to receive the same
kind of model-specific controls used by native providers, such as
`thinking_level`. `AutobyteusModelProvider` preserves
server-provided `config_schema` metadata on `LLMModel.configSchema` so UI and
caller layers can discover those controls through `LLMModel.toModelInfo()`.

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
loads those definitions, resolves provider-live numeric metadata over each
definition's colocated `staticMetadata`, then registers the resulting
`LLMModel` objects. Static metadata is defined by
`src/llm/supported-model-static-metadata.ts` and includes numeric limits,
multimodal capabilities, source URL, and verification date. The resolver keeps
field-level provenance (`live`, `static_definition`, or `unknown`) for built-in
definitions; custom endpoint models additionally use `inferred_builtin`.
Neither resolver resolves `activeContextTokens`,
which remains dynamic runtime state. There is no second
`curated-model-metadata.ts` authority.

### 6.1 Media input and failed-request recovery

`LLMRequestAssembler` preserves canonical working-context messages and creates a
provider-facing `outboundMessages` copy through
`src/llm/utils/media-input-sanitizer.ts`. The sanitizer removes media that is
known unsupported for the selected model and rejects empty or invalid image
sources through the shared media formatter. It returns bounded diagnostics and
does not rewrite canonical memory; provider renderers receive only the outbound
copy.

`LlmPhase` opens a named `MemoryManager` recovery boundary before request
preparation. Successful provider completion commits it. Assembly or provider
stream failure restores working context and compaction state, persists the
restored snapshot, and records a correlated recovery trace before returning one
recoverable diagnostic. This path deliberately does not retry or select a
fallback model, and it preserves raw traces and already committed tool facts.

The current latest-model support set is summarized in
`docs/provider_model_catalogs.md`. Notable LLM entries include:

- OpenAI `gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-5.6-luna` (verified
  2026-07-30), plus retained `gpt-5.5`. GPT-5.6 uses exact provider IDs with no
  separate unsuffixed alias.
- Anthropic `claude-opus-5` (verified 2026-07-31; standard pricing effective
  2026-07-24), `claude-fable-5`, `claude-opus-4.8`, and `claude-sonnet-5`
  with exact Claude API values and no
  `claude-sonnet-4.8` alias. Fable 5 is catalog-available only, not a default
  or fallback.
- DeepSeek `deepseek-v4-flash` and `deepseek-v4-pro` (verified 2026-04-25).
- Gemini `gemini-3.5-flash` with the same provider value for API-key and
  Vertex runtimes (verified 2026-05-20).
- xAI Grok `grok-4.5` as the sole built-in Grok row (verified 2026-07-09),
  using the existing Chat Completions path with always-on low/medium/high
  reasoning and no legacy alias.
- Moonshot/Kimi `kimi-k2.6` general-purpose model plus the K2.7 Code
  `kimi-k2.7-code` and `kimi-k2.7-code-highspeed` serving routes. HighSpeed is
  a distinct official provider identifier for the faster K2.7 Code route, not a
  compatibility alias (standard K2.7 verified 2026-06-16; HighSpeed verified
  2026-06-26).
- Zhipu GLM `glm-5.2` (verified 2026-06-16).
- MiniMax `minimax-m3` / `MiniMax-M3` (verified 2026-06-24). MiniMax M2.7 is
  removed and must not be retained as an alias.

Provider adapters own request-shape differences:

- `OpenAILLM` keeps GPT-5.6 on the official Responses path. The shared OpenAI
  usage normalizer preserves gross input while mapping documented
  `cache_write_tokens` detail fields into generic cache-creation input usage.
- `AnthropicLLM` maps current Claude adaptive-thinking config for Opus 5,
  Opus 4.8, Opus 4.7, Sonnet 5, and Fable 5 without sending fixed thinking budgets,
  manual-budget overrides, or unsupported sampling fields (`temperature`,
  `top_p`, `top_k`). It also filters AutoByteus-internal invocation kwargs
  before Anthropic Messages API calls. Older Claude rows keep the legacy
  fixed-budget path unless a separate provider migration changes them.
- `DeepSeekLLM` continues to use the OpenAI-compatible DeepSeek path for V4 and
  maps the flat user-facing `thinking_type` config to
  top-level `thinking.type` before the shared request builder runs, dropping
  stale caller-supplied `thinking` / `extra_body.thinking` values.
- `GeminiLLM` uses the exact `gemini-3.5-flash` ID for both API-key and Vertex
  modes through `src/utils/gemini-model-mapping.ts`, while sharing the existing
  Gemini thinking config schema.
- `GrokLLM` keeps the xAI Chat Completions transport, defaults reasoning to
  `high`, and strips provider-invalid stop and penalty fields from copied config
  and invocation kwargs before the shared request builder runs.
- `GlmLLM` maps GLM `thinking_type` to provider-native `thinking.type`, sends
  `reasoning_effort` for enabled thinking, and omits stale effort values when
  thinking is disabled.
- `KimiLLM` keeps tool-call continuation safe for `kimi-k2.6` by disabling
  thinking when tool workflows have no explicit thinking override. Kimi also
  normalizes provider-safe temperature defaults for `kimi-k2.6`: `0.6` for tool
  workflows and `1` for non-tool requests, while preserving explicit
  per-request temperature kwargs. For `kimi-k2.7-code` and
  `kimi-k2.7-code-highspeed`, it keeps thinking on and normalizes fixed
  sampling/tool-choice fields to provider-valid values through the shared Kimi
  K2.7 policy.

For image and audio/TTS catalogs, including OpenAI `gpt-image-2` and Gemini TTS
models, see `docs/provider_model_catalogs.md`.

## 7. Discovery, Reload, and Failure Isolation

- `LLMFactory.ensureInitialized()` registers built-in models and probes local
  runtimes.
- `LLMFactory.reloadModels(provider)` supports provider-scoped reload for
  reloadable built-in providers such as LM Studio, Ollama, and Autobyteus.
- Anthropic provider-scoped reload is not dynamic discovery. It returns the
  current static Anthropic catalog count until the built-in catalog is updated.
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

The exact-value custom metadata resolver is owned by
`src/llm/metadata/openai-compatible-endpoint-model-metadata.ts`. Provider route
and plan facts do not belong in custom metadata resolution.

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
text-only tool-result continuations render the existing working context directly
and do not append an extra aggregate `role: "user"` message containing tool
results. If a processed tool result includes context-file media, the request
keeps a user/media carrier so the media can be sent; that carrier uses semantic
completed-tool wording such as `The read_media_file tool call completed
successfully.` rather than internal continuation labels or generated tool-call
formatting instructions.

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
tool-result user text, including the `The following tool executions have
completed...` prefix, legacy `Tool: <name> (ID: ...)` lines, aggregate `Status:
Success` markers, and internal continuation labels as user-facing text.
Provider-required media carrier messages remain valid when their text is the
semantic completed-tool wording and their attachments are the current
context-file media.

### Provider Media Payload Rendering

`Message.image_urls`, `Message.audio_urls`, and `Message.video_urls` are
declared current-turn media input for provider renderers. The image/audio/video
extension policy is centralized in `src/utils/media-file-kind.ts`; context-file
typing and `src/llm/utils/media-payload-formatter.ts` both depend on that
classifier instead of owning separate media allowlists.

Provider prompt renderers own the provider-specific media part shape, not media
extension policy. Direct Gemini renders declared media through the formatter as
`inlineData` with the resolved MIME type; local `.m4a` audio therefore becomes
`inlineData` with `mimeType: 'audio/mp4'`. If a declared media source cannot be
converted, the renderer must fail before provider invocation with an actionable
media-conversion error rather than silently sending a text-only request.

The direct-Gemini `.m4a` path has an opt-in live proof in
`tests/integration/agent/gemini-read-media-file-m4a-live.test.ts`. Default test
runs keep it skipped unless `AUTOBYTEUS_RUN_GEMINI_M4A_LIVE=1` is set. The
fixture at `tests/data/test_audio.m4a` is a small synthetic/non-private spoken
sample; the live test renders the exact local file bytes as Gemini
`inlineData`, verifies `mimeType: 'audio/mp4'`, calls direct Gemini through
`sendMessages(request.messages, request.renderedPayload)`, and asserts the
response contains the spoken word `hello`. `AUTOBYTEUS_GEMINI_M4A_LIVE_MODEL`
can override the default live model for targeted provider compatibility checks.
The test is a provider-acceptance and simple transcription-signal guard; token
accounting and broad transcription-quality validation remain separate concerns.

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

`AutobyteusClient.streamMessage(...)` parses RPA server-sent-event `data:`
frames before yielding them. A parseable JSON frame with an `error` field is a
server/provider error and is thrown with that error text; only a syntactically
invalid JSON `data:` frame should be reported as `Invalid stream response
format`.

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
- If XML-mode history ends with tool results and no current user/media carrier,
  `AutobyteusPromptRenderer` may synthesize a current user continuation whose
  content is only semantic completed-tool wording. It does not duplicate the
  deterministic `Tool result:` record inside that synthetic current message.
- Current-turn media stays attached to the current user message.
- Historical media is represented textually by the renderer and is not
  re-uploaded in prior transcript entries.
- Before sending the HTTP request, `AutobyteusClient` keeps small media inline
  as data URIs but stages larger media through the RPA server's
  `POST /media/stage` endpoint and replaces the source with the returned
  `media://...` URI. Default inline thresholds are 10 MiB for images, 50 MiB
  for audio, and 25 MiB for video. They can be overridden with
  `AUTOBYTEUS_INLINE_IMAGE_MAX_BYTES`, `AUTOBYTEUS_INLINE_AUDIO_MAX_BYTES`,
  and `AUTOBYTEUS_INLINE_VIDEO_MAX_BYTES`.
- Remote HTTP(S) media is staged when its size cannot be proven below the
  inline threshold, avoiding the older full arraybuffer/base64 path for
  unknown-size remote media.
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
generate tool XML. The TypeScript renderer therefore provides deterministic
rendered `Tool:` records and minimal completed-tool current-user wording; the
browser-cache-hit composition that decides how much prior rendered `Tool:`
history to include remains an RPA-server responsibility.

## 10. Testing

Focused unit coverage for this contract lives in:

- `tests/unit/llm/models.test.ts`
- `tests/unit/llm/openai-compatible-endpoint-provider.test.ts`
- `tests/unit/llm/api/autobyteus-llm.test.ts`
- `tests/unit/llm/api/provider-native-request-payloads.test.ts`
- `tests/unit/llm/prompt-renderers/autobyteus-prompt-renderer.test.ts`
- `tests/unit/llm/prompt-renderers/openai-chat-renderer.test.ts`
- `tests/unit/llm/prompt-renderers/gemini-prompt-renderer.test.ts`
- `tests/unit/llm/utils/media-payload-formatter.test.ts`
- `tests/unit/utils/media-file-kind.test.ts`
- `tests/unit/llm/prompt-renderers/provider-native-tool-history-renderers.test.ts`
- `tests/unit/clients/autobyteus-client.test.ts`
- `tests/unit/agent/loop/agent-turn-input-box.test.ts`
- `tests/unit/agent/loop/tool-result-continuation-builder.test.ts`
- `tests/unit/agent/message/tool-continuation-display-text.test.ts`
- `tests/unit/agent/message/context-file-type.test.ts`

Provider-native continuation integration coverage lives in
`tests/integration/agent/provider-native-tool-continuation-flow.test.ts`; it
drives the local agent event loop across the in-scope native providers, verifies
that native tool results continue through provider-native carriers, and rejects
the old synthetic aggregate user message. Renderer unit coverage also verifies
semantic media-carrier wording for OpenAI-compatible, Gemini, and AutoByteus RPA
payloads. Broader integration tests remain under `tests/integration/llm/...`.

Direct-Gemini media continuation coverage also includes
`tests/integration/agent/read-media-file-continuation-flow.test.ts` for the
local `read_media_file -> LLMUserMessage.audio_urls -> Gemini inlineData` path
and the env-gated
`tests/integration/agent/gemini-read-media-file-m4a-live.test.ts` for live
`.m4a` provider acceptance.

## 11. Where to Update

- Add built-in LLM API models in `src/llm/supported-model-definitions.ts`.
- Add docs-backed static LLM context/input/output metadata, multimodal
  capabilities, source URL, and verification date in each definition's
  `staticMetadata` (using helpers from `src/llm/supported-model-static-metadata.ts`).
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
- Update `src/llm/multimodal-capabilities.ts` when the provider-neutral media
  capability contract changes.
- Keep outbound media filtering in
  `src/llm/utils/media-input-sanitizer.ts` and named request rollback in
  `src/memory/llm-request-recovery.ts` / `MemoryManager`; do not add provider- or
  model-name compatibility branches.
- Update saved custom-provider schema in
  `src/llm/custom-llm-provider-config.ts`.
- Update OpenAI-compatible custom-provider discovery/modeling in:
  - `src/llm/openai-compatible-endpoint-discovery.ts`
  - `src/llm/openai-compatible-endpoint-model.ts`
  - `src/llm/openai-compatible-endpoint-provider.ts`
