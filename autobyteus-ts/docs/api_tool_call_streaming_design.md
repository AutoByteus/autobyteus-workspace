# API Tool Call Streaming: Design & Implementation Document

Date: 2026-01-12
Status: Draft
Authors: Autobyteus Core Team

## 1. Problem Statement

Different LLM providers (OpenAI, Anthropic, Gemini) support **native tool calling** where tool
invocations are returned as structured data in the API response, separate from text content.
This is distinct from text-embedded tool calls (XML/JSON patterns in the response text).

The current streaming architecture was designed for text-based parsing and cannot handle
API-provided tool calls. We need to:

1. Extend the handler interface to receive rich `ChunkResponse` objects (not just strings).
2. Create a new handler (`ApiToolCallStreamingResponseHandler`) for API tool calls.
3. Add `ToolCallDelta` to `ChunkResponse` for normalized tool call streaming data.
4. Keep provider-specific conversion logic isolated in **Converters**.

---

## 2. Terminology

| Term                         | Definition                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Text-embedded tool calls** | Tool calls encoded as XML/JSON patterns within the LLM's text output. Requires parsing.               |
| **API tool calls**           | Tool calls returned as structured data by the LLM SDK, separate from text content. No parsing needed. |
| **ToolCallDelta**            | Provider-agnostic representation of a streaming tool call update.                                     |
| **ChunkResponse**            | Transport container for all streaming data from LLM (text, reasoning, tool calls).                    |

---

## 3. Architectural Overview

### 3.1. High-Level Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           LLM Provider SDK                                    │
│  (OpenAI: delta.tool_calls, Anthropic: input_json_delta, Gemini: etc.)       │
└─────────────────────────────────┬────────────────────────────────────────────┘
                                  │ SDK-specific format
                                  ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Provider-Specific Converter                                │
│  (OpenAIToolCallConverter, AnthropicToolCallConverter, etc.)                 │
│  Concern: Normalize SDK format → Common ToolCallDelta                         │
└─────────────────────────────────┬────────────────────────────────────────────┘
                                  │ ToolCallDelta[]
                                  ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           ChunkResponse                                       │
│  Fields: content, reasoning, tool_calls: ToolCallDelta[], ...                │
└─────────────────────────────────┬────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                   LLMUserMessageReadyEventHandler                             │
│  Selects handler based on AUTOBYTEUS_STREAM_PARSER:                          │
│    - "xml" / "json" / "sentinel" → ParsingStreamingResponseHandler           │
│    - "api_tool_call"             → ApiToolCallStreamingResponseHandler       │
└─────────────────────────────────┬────────────────────────────────────────────┘
                                  │ ChunkResponse (full object)
                                  ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                      StreamingResponseHandler                                 │
│  Base interface: feed(chunk: ChunkResponse) → SegmentEvent[]                 │
│                                                                              │
│  ┌───────────────────────────────────┐  ┌──────────────────────────────────┐ │
│  │ ParsingStreamingResponseHandler │  │ ApiToolCallStreamingResponseHandler│ │
│  │ ┌───────────────────────────────┐  │  ┌──────────────────────────────┐ │ │
│  │ │ Internal ToolInvocationAdapter │  │  │ Internal ToolInvocationAdapter │ │ │
│  │ └───────────────────────────────┘  │  └──────────────────────────────┘ │ │
│  └───────────────────────────────────┘  └──────────────────────────────────┘ │
└─────────────────────────────────┬────────────────────────────────────────────┘
                                  │
                                  │ get_all_invocations()
                                  ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     PendingToolInvocationEvent → Execution                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2. Unified ToolInvocation Creation

**Key Design Decision**: Both handlers have an **internal `ToolInvocationAdapter`** that processes
the events they emit. This provides:

1. **Single Responsibility**: Handlers emit events, adapters create invocations.
2. **Consistent Interface**: `get_all_invocations()` works the same for all handlers.
3. **Unified Logic**: Same adapter code handles both text-parsed and API tool calls.

**How the internal adapter works**:

```ts
class ApiToolCallStreamingResponseHandler {
  private adapter = new ToolInvocationAdapter();
  private allInvocations: ToolInvocation[] = [];
  private allEvents: SegmentEvent[] = [];

  private emit(event: SegmentEvent): void {
    this.allEvents.push(event);
    this.onSegmentEvent?.(event);

    const invocation = this.adapter.processEvent(event);
    if (invocation) {
      this.allInvocations.push(invocation);
    }
  }

  getAllInvocations(): ToolInvocation[] {
    return [...this.allInvocations];
  }
}
```

**Event metadata contract**:

| Path          | SEGMENT_START           | SEGMENT_CONTENT              | SEGMENT_END                             |
| ------------- | ----------------------- | ---------------------------- | --------------------------------------- |
| Text Parsing  | `tool_name` in metadata | Raw XML/JSON text            | Adapter parses content buffer           |
| API Tool Call | `tool_name` in metadata | JSON args (for UI streaming) | Pre-parsed `arguments` dict in metadata |

---

## 4. Data Structures

### 4.1. `ToolCallDelta` (NEW)

**File**: `src/llm/utils/tool-call-delta.ts`
**Concern**: Provider-agnostic representation of a single tool call update during streaming.

```ts
export type ToolCallDelta = {
  /**
   * Position in parallel tool calls (0-based).
   * Used to track multiple concurrent tool calls.
   */
  index: number;
  /** Unique ID for this tool call (first chunk only). */
  call_id?: string | null;
  /** Tool/function name (first chunk only). */
  name?: string | null;
  /**
   * Partial JSON string of arguments accumulated across chunks.
   * Concatenate to get full arguments.
   */
  arguments_delta?: string | null;
};
```

**Relationships**:

- Created by: `OpenAIToolCallConverter`, `AnthropicToolCallConverter`, etc.
- Carried by: `ChunkResponse.tool_calls`
- Consumed by: `ApiToolCallStreamingResponseHandler`

### 4.2. `ChunkResponse` (MODIFIED)

**File**: `src/llm/utils/response-types.ts`
**Concern**: Transport container for all chunk data from LLM stream.

```ts
import { TokenUsage } from 'src/llm/utils/token-usage';
import { ToolCallDelta } from 'src/llm/utils/tool-call-delta';

export class ChunkResponse {
  content: string;
  reasoning: string | null;
  is_complete: boolean;
  usage: TokenUsage | null;
  image_urls: string[];
  audio_urls: string[];
  video_urls: string[];
  tool_calls: ToolCallDelta[] | null;

  constructor(data: {
    content: string;
    reasoning?: string | null;
    is_complete?: boolean;
    usage?: TokenUsage | null;
    image_urls?: string[];
    audio_urls?: string[];
    video_urls?: string[];
    tool_calls?: ToolCallDelta[] | null;
  }) {
    this.content = data.content;
    this.reasoning = data.reasoning ?? null;
    this.is_complete = data.is_complete ?? false;
    this.usage = data.usage ?? null;
    this.image_urls = data.image_urls ?? [];
    this.audio_urls = data.audio_urls ?? [];
    this.video_urls = data.video_urls ?? [];
    this.tool_calls = data.tool_calls ?? null;
  }
}
```

---

## 5. Handler Interface Change

### 5.1. `StreamingResponseHandler` (MODIFIED)

**File**: `src/agent/streaming/handlers/streaming-response-handler.ts`
**Change**: Accept `ChunkResponse` instead of `str`.

```ts
import { SegmentEvent } from 'src/agent/streaming/segments/segment-events';
import { ToolInvocation } from 'src/agent/tool-invocation';
import { ChunkResponse } from 'src/llm/utils/response-types';

export abstract class StreamingResponseHandler {
  /**
   * Handlers receive the full ChunkResponse and decide which fields to use:
   * - Text parsers use chunk.content
   * - API tool call handlers use chunk.tool_calls
   */
  abstract feed(chunk: ChunkResponse): SegmentEvent[];

  /** Finalize streaming and emit any remaining segments. */
  abstract finalize(): SegmentEvent[];

  /** Get all ToolInvocations created during streaming. */
  abstract getAllInvocations(): ToolInvocation[];

  /** Get all SegmentEvents emitted during streaming. */
  abstract getAllEvents(): SegmentEvent[];

  /** Reset the handler for reuse. */
  abstract reset(): void;
}
```

### 5.2. `ParsingStreamingResponseHandler` (MODIFIED)

**Minimal change**: Extract text content from `ChunkResponse`.

```ts
class ParsingStreamingResponseHandler extends StreamingResponseHandler {
  feed(chunk: ChunkResponse): SegmentEvent[] {
    if (this.isFinalized) {
      throw new Error('Handler has been finalized.');
    }

    // Use text content for parsing (ignore tool_calls - not our concern)
    if (!chunk.content) {
      return [];
    }

    const events = this.parser.feed(chunk.content);
    this.processEvents(events);
    return events;
  }
}
```

### 5.3. `PassThroughStreamingResponseHandler` (MODIFIED)

**Minimal change**: Extract text content from `ChunkResponse`.

```ts
class PassThroughStreamingResponseHandler extends StreamingResponseHandler {
  feed(chunk: ChunkResponse): SegmentEvent[] {
    if (!chunk.content) {
      return [];
    }

    // Existing pass-through logic using chunk.content
    // ...
    return [];
  }
}
```

---

## 6. New Handler: `ApiToolCallStreamingResponseHandler`

**File**: `src/agent/streaming/handlers/api-tool-call-streaming-response-handler.ts`
**Concern**: Emit `SegmentEvent`s for API-provided tool calls. Does NOT create `ToolInvocation`s directly.

**Key Design**: This handler follows the single responsibility principle:

- Handler's job: Emit `SegmentEvent`s with structured data
- Adapter's job: Create `ToolInvocation`s from events

**SEGMENT_END Metadata Contract**: For API tool calls, the handler passes pre-parsed
arguments in the `SEGMENT_END` event's `metadata.arguments` field. The adapter uses
this instead of parsing the content buffer.

```ts
type ToolCallState = {
  segmentId: string;
  name: string;
  accumulatedArgs: string;
};

class ApiToolCallStreamingResponseHandler extends StreamingResponseHandler {
  private textSegmentId: string | null = null;
  private activeTools = new Map<number, ToolCallState>();
  private allEvents: SegmentEvent[] = [];
  private isFinalized = false;

  private emit(event: SegmentEvent): void {
    this.allEvents.push(event);
    this.onSegmentEvent?.(event);
  }

  feed(chunk: ChunkResponse): SegmentEvent[] {
    if (this.isFinalized) {
      throw new Error('Handler has been finalized.');
    }

    const events: SegmentEvent[] = [];

    // 1) Text content → TEXT segment
    if (chunk.content) {
      if (!this.textSegmentId) {
        this.textSegmentId = this.generateId();
        const start = SegmentEvent.start(this.textSegmentId, SegmentType.TEXT);
        this.emit(start);
        events.push(start);
      }
      const content = SegmentEvent.content(this.textSegmentId, chunk.content);
      this.emit(content);
      events.push(content);
    }

    // 2) API tool calls
    if (chunk.tool_calls) {
      for (const delta of chunk.tool_calls) {
        if (!this.activeTools.has(delta.index)) {
          const segId = delta.call_id ?? this.generateId();
          this.activeTools.set(delta.index, {
            segmentId: segId,
            name: delta.name ?? '',
            accumulatedArgs: ''
          });
          const start = SegmentEvent.start(segId, SegmentType.TOOL_CALL, { tool_name: delta.name });
          this.emit(start);
          events.push(start);
        }

        const state = this.activeTools.get(delta.index)!;
        if (delta.arguments_delta) {
          state.accumulatedArgs += delta.arguments_delta;
          const content = SegmentEvent.content(state.segmentId, delta.arguments_delta);
          this.emit(content);
          events.push(content);
        }
      }
    }

    return events;
  }

  finalize(): SegmentEvent[] {
    if (this.isFinalized) {
      return [];
    }
    this.isFinalized = true;
    const events: SegmentEvent[] = [];

    if (this.textSegmentId) {
      const end = SegmentEvent.end(this.textSegmentId);
      this.emit(end);
      events.push(end);
    }

    for (const state of this.activeTools.values()) {
      const parsedArgs = state.accumulatedArgs ? JSON.parse(state.accumulatedArgs) : {};
      const end = new SegmentEvent({
        event_type: SegmentEventType.END,
        segment_id: state.segmentId,
        payload: { metadata: { tool_name: state.name, arguments: parsedArgs } }
      });
      this.emit(end);
      events.push(end);
    }

    return events;
  }
}
```

---

## 6b. `ToolInvocationAdapter` Enhancement

**File**: `src/agent/streaming/adapters/invocation-adapter.ts`
**Change**: Handle pre-parsed arguments from SEGMENT_END metadata (for API tool calls).

The adapter already checks `metadata.get("arguments")` - this is the hook we use:

```ts
// In handleEnd (existing logic already supports this):
if (startMetadata.arguments) {
  arguments = startMetadata.arguments;
} else if (metadata.arguments) {
  // API tool calls provide pre-parsed arguments here
  arguments = metadata.arguments;
}
```

**No code change required** - the existing adapter logic already supports pre-parsed
arguments via metadata. The API tool call handler just needs to provide them.

---

## 7. Provider-Specific Converters

### 7.1. `OpenAIToolCallConverter`

**File**: `src/llm/converters/openai-tool-call-converter.ts`
**Concern**: Convert OpenAI SDK tool call deltas to `ToolCallDelta`.

```ts
import type { ToolCallDelta } from 'src/llm/utils/tool-call-delta';

export function convert(
  deltaToolCalls?: Array<{ index: number; id?: string; function?: { name?: string; arguments?: string } }>
): ToolCallDelta[] | null {
  if (!deltaToolCalls || deltaToolCalls.length === 0) {
    return null;
  }

  return deltaToolCalls.map((tc) => ({
    index: tc.index,
    call_id: tc.id ?? null,
    name: tc.function?.name ?? null,
    arguments_delta: tc.function?.arguments ?? null
  }));
}
```

### 7.2. Future Converters

- `AnthropicToolCallConverter`: Convert Anthropic's `content_block_delta` with `input_json_delta`
- `GeminiToolCallConverter`: Convert Gemini's `functionCall` responses

---

## 8. LLM Layer Integration

### 8.1. `OpenAICompatibleLLM._stream_user_message_to_llm` (MODIFIED)

```ts
async function* _streamUserMessageToLLM(
  userMessage: LLMUserMessage,
  kwargs: Record<string, unknown> = {}
): AsyncGenerator<ChunkResponse> {
  // ... existing setup ...

  for await (const chunk of stream) {
    const delta = chunk.choices[0].delta;

    // Handle reasoning (existing logic)
    const reasoningChunk = delta.reasoning_content ?? null;

    // NEW: Convert tool calls
    const toolCallDeltas = delta.tool_calls ? convert(delta.tool_calls) : null;

    // Handle text content
    const mainToken = delta.content ?? '';

    yield new ChunkResponse({
      content: mainToken,
      reasoning: reasoningChunk,
      tool_calls: toolCallDeltas
    });
  }
}
```

---

## 9. Handler Orchestration

### 9.1. `LLMUserMessageReadyEventHandler` (MODIFIED)

**Key changes**:

1. Pass full `ChunkResponse` to handler (not just `chunk.content`)
2. Select handler based on `AUTOBYTEUS_STREAM_PARSER`
3. Use `api_tool_call` for SDK tool calls

```ts
// Determine handler type (factory encapsulates format override + parser config)
const { handler, toolSchemas } = StreamingResponseHandlerFactory.create({
  toolNames,
  provider,
  onSegmentEvent: emitSegmentEvent,
  onToolInvocation: emitToolInvocation,
  agentId,
});

// Stream processing loop
for await (const chunkResponse of context.state.llmInstance.streamUserMessage(llmUserMessage, { tools: toolSchemas })) {
  // ... aggregation logic ...

  // Feed full ChunkResponse to handler (not just content!)
  handler.feed(chunkResponse);
}
```

---

## 10. Configuration

### 10.1. Environment Variable

`AUTOBYTEUS_STREAM_PARSER` values:

- `xml`: Parse XML tags in text
- `json`: Parse JSON in text
- `sentinel`: Parse sentinel-delimited tool calls in text
- `api_tool_call`: Use SDK-provided tool calls (no text parsing)

### 10.2. Agent Config

```ts
class AgentConfig {
  // ...
  // Tool call format is controlled by AUTOBYTEUS_STREAM_PARSER (env var).
}
```

---

## 11. File Summary & Concerns

| File                                                          | Concern                                      | Status   |
| ------------------------------------------------------------- | -------------------------------------------- | -------- |
| `src/llm/utils/tool-call-delta.ts`                            | Common data structure for tool call updates  | **NEW**  |
| `src/llm/utils/response-types.ts`                             | Add `tool_calls` field to `ChunkResponse`    | MODIFIED |
| `src/llm/converters/openai-tool-call-converter.ts`            | Normalize OpenAI SDK format                  | **NEW**  |
| `src/llm/api/openai-compatible-llm.ts`                        | Convert tool calls, include in ChunkResponse | MODIFIED |
| `src/agent/streaming/handlers/streaming-response-handler.ts`               | Change `feed(string)` to `feed(ChunkResponse)`  | MODIFIED |
| `src/agent/streaming/handlers/parsing-streaming-response-handler.ts`       | Use `chunk.content`                          | MODIFIED |
| `src/agent/streaming/handlers/pass-through-streaming-response-handler.ts`  | Use `chunk.content`                          | MODIFIED |
| `src/agent/streaming/handlers/api-tool-call-streaming-response-handler.ts` | New handler for SDK tool calls               | **NEW**  |
| `src/agent/handlers/llm-user-message-ready-event-handler.ts`  | Handler selection, pass full ChunkResponse   | MODIFIED |
| `src/utils/tool-call-format.ts`                               | Remove legacy "native" alias                 | MODIFIED |

---

## 12. Migration Notes

### Breaking Changes

1. `StreamingResponseHandler.feed()` signature changed from `str` to `ChunkResponse`
2. Legacy environment variable value `native` removed; use `api_tool_call`

### Backward Compatibility

- Existing text-based tool parsing (XML/JSON/Sentinel) continues to work unchanged
- Only the interface changes; internal behavior of text parsers is preserved

---

## 13. Tool Schema Passing for API Tool Calls

> [!IMPORTANT]
> For API tool calls to work, tool schemas MUST be passed to the LLM API.
> Without this, the LLM doesn't know what tools are available.

### 13.1. Text-Embedded vs API Tool Calls

| Approach                 | How LLM learns about tools                    | How LLM calls tools                             |
| ------------------------ | --------------------------------------------- | ----------------------------------------------- |
| Text-embedded (XML/JSON) | Tool docs injected into system prompt as text | LLM outputs text patterns we parse              |
| API tool calls           | Tool schemas passed via API `tools` parameter | LLM returns structured `tool_calls` in response |

### 13.2. Existing Infrastructure

We already have formatters that convert tool definitions to API schemas:

```ts
// src/tools/usage/formatters/openai-json-schema-formatter.ts
class OpenAiJsonSchemaFormatter extends BaseSchemaFormatter {
  provide(toolDefinition: ToolDefinition): Record<string, unknown> {
    return {
      type: 'function',
      function: {
        name: toolDefinition.name,
        description: toolDefinition.description,
        parameters: toolDefinition.argumentSchema.toJsonSchemaDict(),
      },
    };
  }
}
```

Similar formatters exist for:

- `AnthropicJsonSchemaFormatter`
- `GeminiJsonSchemaFormatter`

### 13.3. Design: Tool Schema Passing

**Option A: Pass via `LLMUserMessageReadyEventHandler` (Recommended)**

The handler already has access to tool definitions. When `api_tool_call` mode is selected:

1. Format tool definitions to API schema
2. Pass as `tools` kwarg to LLM stream

```ts
// In LLMUserMessageReadyEventHandler.handle()
if (formatOverride === 'api_tool_call') {
  const toolDefinitions = context.state.toolNames
    .map((name) => defaultToolRegistry.getToolDefinition(name))
    .filter(Boolean);

  const formatter = new OpenAiJsonSchemaFormatter();
  const toolsSchema = toolDefinitions.map((def) => formatter.provide(def!));

  for await (const chunk of context.state.llmInstance.streamUserMessage(llmUserMessage, { tools: toolsSchema })) {
    // ...
  }
}
```

**LLM layer change** in `_streamUserMessageToLLM`:

```ts
async _streamUserMessageToLLM(
  userMessage: LLMUserMessage,
  kwargs: Record<string, unknown> = {}
): AsyncGenerator<ChunkResponse> {
  // ...
  const params = {
    model: this.model.value,
    messages: formattedMessages,
    stream: true,
  };

  // Include tools if provided
  if (kwargs.tools) {
    params.tools = kwargs.tools;
  }

  const stream = this.client.chat.completions.create(params);
  // ...
}
```

### 13.4. File Changes for Tool Schema Passing

| File                                                     | Change                            |
| -------------------------------------------------------- | --------------------------------- |
| `src/agent/handlers/llm-user-message-ready-event-handler.ts` | Format tool schemas, pass to LLM  |
| `src/llm/api/openai-compatible-llm.ts`                       | Accept `tools` kwarg, pass to API |
| (similar for other LLM providers)                        | Accept `tools` kwarg              |

---

## 14. Future Considerations

1. **Provider Detection**: Auto-detect when to use `api_tool_call` based on provider capabilities
   instead of requiring explicit configuration.

2. **Hybrid Mode**: Some responses may contain both text-embedded and API tool calls.
   Current design handles this by treating them as separate concerns.

3. **Tool Choice**: Support `tool_choice` parameter for forcing specific tool usage.
