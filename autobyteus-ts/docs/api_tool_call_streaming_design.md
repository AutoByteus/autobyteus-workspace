# Provider-Native API Tool Calling and Streaming

Status: Current
Last updated: 2026-08-09

## Purpose

AutoByteus supports one model-to-tool invocation transport: structured tool
calls emitted by the selected provider API. Assistant text is never parsed into
a `ToolInvocation`, even when it resembles XML, JSON, sentinel blocks, or a
`[TOOL_CALL]` diagnostic string.

This document describes the current schema, streaming, invocation, history, and
same-turn continuation boundaries in `autobyteus-ts`.

## Governing Invariants

1. A tool-equipped turn sends provider-appropriate schemas through the provider
   request's native `tools` field.
2. Only normalized provider-native tool-call deltas can create invocations.
3. A turn with no configured tools sends no schemas and uses pass-through
   streaming.
4. Final accumulated native argument JSON is invocation authority. Incremental
   file projection is display-only.
5. Tool results re-enter the next request through structured provider-native
   history, not generated prompt instructions or aggregate tool-result text.
6. There is no tool-call format selector, prompt manifest injector, text-call
   parser, syntax registry, text-history renderer, or compatibility fallback.

## Request Setup

`LlmPhase` resolves the current turn's tool names and provider, then calls
`StreamingResponseHandlerFactory.create(...)`.

```text
LlmPhase
  -> StreamingResponseHandlerFactory
       -> zero tools: PassThroughStreamingResponseHandler + null schemas
       -> tools: ToolSchemaProvider + ApiToolCallStreamingResponseHandler
  -> provider stream request (tools attached only when schemas exist)
```

`ToolSchemaProvider` reads `ToolDefinition` entries from `ToolRegistry` and
selects the native schema formatter at this boundary:

| Provider family | Schema formatter / shape |
| --- | --- |
| Anthropic | `AnthropicJsonSchemaFormatter` |
| Gemini | `GeminiJsonSchemaFormatter` |
| OpenAI, OpenAI-compatible, Mistral, Ollama, and other supported compatible paths | `OpenAiJsonSchemaFormatter` |

The default agent/server path supplies `tools` but does not invent a global
`tool_choice` policy. A provider adapter may apply provider-specific request
legality before sending the request.

## Provider Normalization Contract

Provider adapters normalize structured streaming output into `ToolCallDelta`:

```ts
type ToolCallDelta = {
  index: number;
  call_id?: string | null;
  name?: string | null;
  arguments_delta?: string | null;
  native_context?: ProviderNativeToolCallContext | null;
};
```

- `index` identifies one call within a possibly parallel batch.
- `call_id` is used as the segment/invocation id when the provider supplies it;
  otherwise the handler generates a turn-prefixed id.
- `name` and `arguments_delta` may arrive in different chunks.
- `native_context` preserves provider data needed for valid stateless history
  replay, including Gemini, Anthropic, Mistral, Ollama, and OpenAI Responses
  shapes.

Provider-specific SDK formats must be normalized before they reach the
streaming handler. The handler does not inspect provider SDK objects directly.

## Streaming Handler Behavior

`ApiToolCallStreamingResponseHandler` owns mixed assistant text and native call
state for one LLM stream.

### Assistant text

Ordinary `ChunkResponse.content` opens one `TEXT` segment, streams content, and
closes the segment at finalization. Tool-looking text follows exactly this path
and creates zero invocations unless the same response also contains native tool
deltas.

### Native calls

The handler tracks calls by `ToolCallDelta.index`. Each state retains:

- stable segment/call id;
- tool name;
- accumulated argument JSON;
- segment type and live file projector, when applicable;
- buffered live content until its display segment can start; and
- provider-native context.

Non-file tools emit `TOOL_CALL` segment events. `write_file` and `edit_file`
emit their specialized segment types so clients can display live content.

At normal finalization, the handler:

1. closes the assistant text segment, if one was opened;
2. ensures every native call has a start event;
3. parses the call's complete accumulated argument JSON as an object;
4. emits the matching segment end event; and
5. only then publishes one `ToolInvocation` carrying the same id, name,
   arguments, turn id, and native context.

This ordering prevents execution publication before the visible segment is
terminal. Parallel call state remains ordered by provider index/insertion order.

If final native arguments are malformed or non-object, the existing defensive
fallback produces an empty argument object; normal tool preparation and schema
validation remain responsible for rejecting unusable arguments. The handler
never repairs the call from assistant text or from projected file content.

### Interruption and failure

`finalizeInterrupted(...)` and `finalizeFailed(...)` terminalize open text/tool
segments with the corresponding status and clear active call state. They do not
publish partially accumulated invocations.

## Incremental File Projection

`write_file` and `edit_file` native arguments can arrive as partial JSON string
fragments. `WriteFileContentStreamer` and `EditFileContentStreamer` incrementally
decode only the display fields:

- `path` plus `content` for `write_file`;
- `path` plus `patch` for `edit_file`.

Content may be buffered until a path allows the specialized segment to start.
The projector exists only for responsive UI segment output. The invocation is
always constructed from the final accumulated provider argument JSON. See
`api_tool_call_file_streaming_design.md` for the detailed projection contract.

## No-Tool Turns

When the current turn has no configured tools, the factory returns
`PassThroughStreamingResponseHandler` and `null` schemas. The request therefore
does not contain a `tools` field, and ordinary content, reasoning, media, token,
interruption, failure, and completion behavior remains independent of the tool
pipeline.

## Tool Execution and Same-Turn Continuation

The active `ToolInvocationBatch` executes through `ToolPhase`. Processed results
flow through `ToolResultPipeline` and `ToolResultContinuationBuilder`.

The continuation builder:

1. validates/uses the active turn identity;
2. ingests the processed result batch into memory once in native call order;
3. creates user-facing semantic completion text for display and optional media
   carriers; and
4. marks the internal continuation metadata as `native_api`.

When no context-file media must be carried, `AgentTurnRunner` treats the request
as `tool_history_only` and emits `ToolContinuationReadyEvent`.
`LLMRequestAssembler.prepareToolContinuationRequest(...)` then assembles the
next request from working context without adding a synthetic user message.

When context-file media is required, the request may append a user/media carrier
whose text is limited to semantic completion wording. The carrier does not
contain an invocation grammar, generated manifest, internal continuation label,
or duplicate textual tool result.

## Provider-Native History Rendering

Working context stores semantic `ToolCallPayload` and `ToolResultPayload`
records. Provider renderers translate them only at the request boundary:

| Provider path | History representation |
| --- | --- |
| OpenAI-compatible Chat / LM Studio / DeepSeek | `assistant.tool_calls` plus matching `role: "tool"` messages; DeepSeek may also replay its supported reasoning content. |
| Gemini | model `functionCall` parts plus user `functionResponse` parts. |
| Ollama | assistant `tool_calls` plus `role: "tool"` result messages with `tool_name`. |
| Anthropic | assistant `tool_use` blocks plus immediately following user `tool_result` blocks. |
| Mistral | assistant `tool_calls` plus `role: "tool"` messages with call id and name. |
| OpenAI Responses | replayable response output items followed by `function_call_output` items keyed by call id. |

Renderers preserve provider-required ordering and native context while treating
the normalized stored id, name, and final arguments as authoritative.

The AutoByteus conversation renderer remains content/media-only because that
provider path does not expose a normalized native local-tool channel. It does
not encode tool calls or results into XML or other assistant text.

## Removed Operational and Public Surfaces

The following are intentionally not supported:

- `AUTOBYTEUS_STREAM_PARSER` as a runtime setting;
- XML, JSON-text, or sentinel tool-call modes;
- model-facing tool manifests and usage examples;
- parsing handlers, parser states/strategies, syntax registries, and invocation
  adapters for assistant text;
- text-history renderers and format-dependent continuation modes; and
- package exports or direct subpaths for those removed components.

The server's `AppConfig` retains the exact retired setting name only to discard
it during initialization and reject later writes. This configuration-boundary
cleanup is idempotent and does not select runtime behavior. The Settings UI and
server predefined-settings API do not expose the retired key.

External callers that imported removed package subpaths must move to supported
native schema/streaming contracts; there are no aliases or deprecated wrappers.

## Key Implementation Files

- `src/agent/loop/llm-phase.ts`
- `src/agent/streaming/handlers/streaming-handler-factory.ts`
- `src/agent/streaming/handlers/api-tool-call-streaming-response-handler.ts`
- `src/agent/streaming/handlers/pass-through-streaming-response-handler.ts`
- `src/agent/streaming/api-tool-call/file-content-streamer.ts`
- `src/agent/streaming/api-tool-call/json-string-field-extractor.ts`
- `src/llm/utils/tool-call-delta.ts`
- `src/tools/usage/providers/tool-schema-provider.ts`
- `src/agent/loop/tool-result-continuation-builder.ts`
- `src/agent/message/tool-continuation-metadata.ts`
- `src/llm/prompt-renderers/*`

## Durable Coverage

The durable suite covers native mixed/parallel calls, ids/arguments/context,
segment and callback ordering, live file projection, tool-looking text with zero
invocations, no-tool pass-through behavior, native continuation and provider
history rendering, supported/removed public surfaces, and retired-setting
cleanup. Add new provider coverage at the normalization and renderer boundaries;
do not reintroduce assistant-text parsing fixtures as a fallback path.
