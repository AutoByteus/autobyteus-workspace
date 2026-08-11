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
3. Every LLM stream uses `LlmStreamingResponseHandler`; an explicit
   `toolCallsEnabled` gate controls whether native tool deltas are accepted.
4. A turn with no configured tools builds no schemas and sends no `tools` field.
5. Final accumulated native argument JSON is invocation authority. Incremental
   file projection is display-only.
6. Tool results re-enter the next request through structured provider-native
   history, not generated prompt instructions or aggregate tool-result text.
7. The runner commits each completed result batch to memory exactly once and
   owns the decision to continue the same outer turn.
8. There is no handler factory, pass-through handler, tool-call format selector,
   prompt manifest injector, text-call parser, continuation mode, or compatibility
   fallback.

## Request Setup

`LlmPhase` resolves the current turn's tool names and provider. It then constructs
one `LlmStreamingResponseHandler` and, only when tool names are present, asks
`ToolSchemaProvider` to build provider-native schemas.

```text
LlmPhase
  -> resolve configured tool names
  -> LlmStreamingResponseHandler(toolCallsEnabled = toolNames.length > 0)
  -> when enabled: ToolSchemaProvider.buildSchema(toolNames, provider)
  -> provider stream request (tools attached only when the schema array is non-empty)
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

`LlmStreamingResponseHandler` owns assistant text and, when explicitly enabled,
native call state for one LLM stream.

### Assistant text and no-tool streams

Ordinary `ChunkResponse.content` opens one `TEXT` segment, streams content, and
closes the segment at finalization. Tool-looking text follows exactly this path
and creates zero invocations unless the same response contains native tool
deltas and the handler's tool-call gate is enabled.

When the turn has no configured tools, `LlmPhase` passes
`toolCallsEnabled: false`, builds no schemas, and omits the request's `tools`
field. The same handler still owns content, interruption, failure, and
finalization behavior; there is no separate pass-through implementation.

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

If final native arguments are malformed or non-object, the defensive fallback
produces an empty argument object; normal tool preparation and schema validation
remain responsible for rejecting unusable arguments. The handler never repairs
the call from assistant text or projected file content.

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

## Tool Execution and Same-Turn Continuation

The active `ToolInvocationBatch` retains the expected invocation identities,
provider order, and turn-admission checks. `ToolPhase` executes the invocations,
and `ToolResultPipeline` applies configured result processors.

After the whole processed batch is ready, `AgentTurnRunner`:

1. clears the active invocation batch;
2. calls `MemoryManager.ingestToolResults(...)` once with the results in native
   call order;
3. asks the pure `ToolContinuationInputBuilder` for a semantic
   `SenderType.TOOL` continuation carrier; and
4. runs that carrier through `AgentInputPipeline` so custom input processors and
   context-file/media rules remain active.

For a text-only continuation, `AgentInputPipeline` returns
`llmUserMessage: null`. The runner emits `ToolContinuationReadyEvent` as a
runtime status projection, and `LlmPhase` calls the same
`LLMRequestAssembler.prepareRequest(null, identity)` path used by every request.
The provider therefore receives the already-ingested structured native history
without an additional user message.

If processed results contain context-file media, the pipeline instead returns an
`LLMUserMessage` carrying the media and semantic completed-tool wording. The
same `prepareRequest(...)` method appends that required user/media carrier. It
does not contain an invocation grammar, generated manifest, internal mode label,
or duplicate textual tool result.

## Memory and Persisted Data

Semantic `ToolCallPayload` and `ToolResultPayload` records remain the authority
for provider history. Normal result persistence has one owner:
`AgentTurnRunner -> MemoryManager.ingestToolResults(...)`. It is not hidden in a
built-in result processor or continuation builder.

New runs do not append a coordination-only raw trace with type
`tool_continuation`. Existing generic historical traces remain readable and
inert; no migration, filtering compatibility path, or version branch is needed.

## Provider-Native History Rendering

Provider renderers translate semantic tool-call/result records only at the
request boundary:

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

## Public Package Boundary and Removed Surfaces

The package root exposes the canonical defining-module identities for the
supported extension contracts, including:

- `LlmStreamingResponseHandler`;
- `ToolSchemaProvider`;
- `SegmentEvent`;
- `BaseToolExecutionResultProcessor`; and
- `ToolExecutionResultProcessorRegistry`.

The following are intentionally absent without aliases or deprecated wrappers:

- the previous API-tool handler name, streaming handler factory/base/result, and
  pass-through handler;
- the previous continuation builder name and continuation metadata/mode APIs;
- the duplicate continuation-specific request-assembly method;
- the built-in memory-ingest tool-result processor;
- `AUTOBYTEUS_STREAM_PARSER` and all XML/JSON-text/sentinel parsing surfaces; and
- package exports or direct subpaths for those removed components.

External callers that imported removed names or package subpaths must move to
the canonical native schema, streaming, and processor contracts.

## Key Implementation Files

- `src/agent/loop/llm-phase.ts`
- `src/agent/loop/agent-turn-runner.ts`
- `src/agent/loop/tool-continuation-input-builder.ts`
- `src/agent/pipelines/agent-input-pipeline.ts`
- `src/agent/llm-request-assembler.ts`
- `src/agent/streaming/handlers/llm-streaming-response-handler.ts`
- `src/agent/streaming/api-tool-call/file-content-streamer.ts`
- `src/agent/streaming/api-tool-call/json-string-field-extractor.ts`
- `src/llm/utils/tool-call-delta.ts`
- `src/tools/usage/providers/tool-schema-provider.ts`
- `src/memory/memory-manager.ts`
- `src/llm/prompt-renderers/*`

## Durable Coverage

The durable suite covers native mixed/parallel calls, ids/arguments/context,
segment and callback ordering, live file projection, tool-looking text with zero
invocations, no-tool behavior through the unified handler, ordered continuation
and provider history rendering, context-file media, package-root identities,
removed public surfaces, and historical trace readability. Add new provider
coverage at the normalization and renderer boundaries; do not reintroduce
assistant-text parsing or compatibility fixtures as a fallback path.
