# Streaming Parser Design

Date: 2026-01-01  
Status: Implemented  
Authors: Autobyteus Core Team

## Overview

The streaming parser is a state-machine-based system that incrementally parses LLM response chunks in real-time. It handles structured content blocks (`<write_file>`, `<run_bash>`, `<tool>`) while streaming safe content deltas to the frontend, preventing partial tags from being displayed.

## Goals

1. **Real-time streaming** – Parse LLM output character-by-character as chunks arrive.
2. **Safe content emission** – Never emit partial closing tags (e.g., `</wr` before `</write_file>`).
3. **Structured segment events** – Emit `SEGMENT_START`, `SEGMENT_CONTENT`, `SEGMENT_END` for each block.
4. **Extensibility** – Add new block types by creating new state classes.
5. **Provider-agnostic** – Works with any LLM provider's streaming output.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    StreamingResponseHandler                     │
│  (High-level API for feeding chunks and getting events)         │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      StreamingParser                             │
│  (Orchestrates state machine, manages finalization)              │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       ParserContext                              │
│  - StreamScanner (character buffer)                              │
│  - EventEmitter (segment event queue)                            │
│  - Current state reference                                       │
└────────────────────────────────┬────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
┌───────────────┐    ┌───────────────────┐    ┌──────────────────┐
│   TextState   │    │ XmlTagInitState   │    │ JsonInitState    │
│ (default)     │◄──►│ (detects <tags>)  │◄──►│ (detects {json}) │
└───────────────┘    └─────────┬─────────┘    └──────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌──────────────────┐  ┌───────────────────────┐  ┌──────────────────┐
│WriteFileParsingState│  │RunBashParsingState│  │XmlToolParsingState│
│(<write_file>...</write_file>)│  │(<run_bash>...</run_bash>)│  │(<tool>...</tool>)│
└──────────────────┘  └───────────────────────┘  └──────────────────┘
```

## Core Components

### StreamingResponseHandler

Entry point for the parser. Wraps `StreamingParser` and provides a simple API:

```ts
import { StreamingResponseHandler } from 'src/agent/streaming';
import { ChunkResponse } from 'src/llm/utils/response-types';

const handler = new StreamingResponseHandler();

// Feed chunks as they arrive
const events = handler.feed(new ChunkResponse({ content: "Hello <write_file path='/a.ts'>" }));
handler.feed(new ChunkResponse({ content: "print('hi')</write_file>" }));

// Finalize when stream ends
const finalEvents = handler.finalize();
```

### ParserContext

Shared state container providing:

- **StreamScanner** – Character buffer with cursor position
- **EventEmitter** – Queues `SegmentEvent` objects
- **State management** – `transition_to()` for state changes
- **Configuration** – `parseToolCalls`, `strategyOrder` flags

### State Classes

All states extend `BaseState` and implement:

| Method       | Purpose                                                 |
| ------------ | ------------------------------------------------------- |
| `run()`      | Main parsing loop, consumes characters, emits events    |
| `finalize()` | Called when stream ends mid-parse, closes open segments |

#### TextState (Default)

Handles plain text. Watches for:

- `<` → transitions to `XmlTagInitializationState`
- `{` patterns → transitions to `JsonInitializationState`

#### XmlTagInitializationState

Accumulates characters after `<` to detect tag type:

- `<tool name="...">` → Dispatches to specific `Xml...ToolParsingState` via `XmlToolParsingStateRegistry`.
- `<write_file path="...">` → `CustomXmlTagWriteFileParsingState` (Legacy)
- `<run_bash>` → `CustomXmlTagRunBashParsingState` (Legacy)
- Unknown tags → emits as text, returns to `TextState`

#### Content Parsing States (Legacy Custom Tags)

The legacy states (`CustomXmlTagWriteFileParsingState`) use a robust buffer pattern (Holdback Pattern) to ensure safe emission, holding back characters to prevent partial closing tags from leaking.

#### Specialized XML Tool States (New Standard)

To ensure compatibility with the standard XML tool format (`<tool name="write_file">`) while mimicking the behavior of legacy custom tags, specialized states are used:

- **XmlWriteFileToolParsingState**:

  - **Deferred Start**: Buffers the initial stream until the `path` argument is found, ensuring `SEGMENT_START` always includes file path metadata.
  - **Pure Content Piping**: Extracts the inner text of `<arg name="content">` and streams _only_ that content, preventing XML markup from leaking to the frontend.
  - **Optional Raw Markers**: If `__START_CONTENT__`/`__END_CONTENT__` appear inside the `content` arg, only the text between them is streamed and the markers are stripped.
  - **Tag Swallowing**: Aggressively consumes and discards closing tags (`</arguments></tool>`) after content ends.

- **XmlRunBashToolParsingState**:
  - Similar piping logic for the `command` argument.
  - Ensures `SEGMENT_START` is emitted, then streams only the command text.
  - Swallows trailing XML artifacts.

## Segment Events

The parser emits `SegmentEvent` objects with three lifecycle types:

| Event Type        | Payload                    | When Emitted                   |
| ----------------- | -------------------------- | ------------------------------ |
| `SEGMENT_START`   | `segment_type`, `metadata` | Opening tag detected           |
| `SEGMENT_CONTENT` | `delta` (text chunk)       | Content available to stream    |
| `SEGMENT_END`     | –                          | Closing tag found or finalized |

### Contract Boundary (Streaming vs. Semantics)

- The **parser only streams content** and boundaries. It does **not** parse tool arguments.
- `SEGMENT_START` may include minimal display metadata (e.g., `tool_name`, `path`).
- `SEGMENT_END` is purely a boundary signal and should not carry parsed arguments.
- Tool arguments are built later by the `ToolInvocationAdapter` and are surfaced via
  tool lifecycle events (approval/auto-executing).

### Payload Schema (All Segment Events)

```json
// SEGMENT_START
{
  "type": "SEGMENT_START",
  "segment_id": "seg_1",
  "segment_type": "write_file",
  "payload": {
    "metadata": { "path": "/tmp/a.ts" }
  }
}

// SEGMENT_CONTENT
{
  "type": "SEGMENT_CONTENT",
  "segment_id": "seg_1",
  "payload": { "delta": "print('hi')\\n" }
}

// SEGMENT_END
{
  "type": "SEGMENT_END",
  "segment_id": "seg_1",
  "payload": {}
}
```

### Segment Type Semantics

| Segment Type | `SEGMENT_START.metadata`          | `SEGMENT_CONTENT.delta`         | `SEGMENT_END.payload` |
| ------------ | --------------------------------- | ------------------------------- | --------------------- |
| `text`       | `{}`                              | Plain text                      | `{}`                  |
| `tool_call`  | `{"tool_name": "..."}` (if known) | Raw XML/JSON tool content       | `{}`                  |
| `write_file` | `{"path": "..."}` (deferred)      | File content only (no XML tags) | `{}`                  |
| `edit_file` | `{"path": "..."}` (deferred)      | Unified diff only (no XML tags) | `{}`                  |
| `run_bash`   | `{}`                              | Command text only               | `{}`                  |
| `reasoning`  | `{}`                              | Reasoning text                  | `{}`                  |

### State → Emitted Segment Events

| State                               | Segment Type     | Start Metadata                | Content Emission                     |
| ----------------------------------- | ---------------- | ----------------------------- | ------------------------------------ |
| `TextState`                         | `text`           | `{}`                          | Streams plain text                   |
| `XmlToolParsingState`               | `tool_call`      | `tool_name` (from tag)        | Raw `<arguments>...</arguments>`     |
| `JsonToolParsingState`              | `tool_call`      | `{}`                          | Raw JSON tool blob                   |
| `XmlWriteFileToolParsingState`      | `write_file`     | `path` (deferred until found) | Content only (no XML tags)           |
| `XmlEditFileToolParsingState`      | `edit_file`     | `path` (deferred until found) | Unified diff only (no XML tags)      |
| `XmlRunBashToolParsingState`        | `run_bash`       | `{}`                          | Command only (no XML tags)           |
| `CustomXmlTagWriteFileParsingState` | `write_file`     | `path` (from tag)             | Content only                         |
| `CustomXmlTagRunBashParsingState`   | `run_bash`       | `{}`                          | Command only                         |
| `SentinelContentState`              | as header `type` | header JSON (minus `type`)    | Raw content between sentinel markers |

### Segment Types

```ts
export enum SegmentType {
  TEXT = 'text',
  TOOL_CALL = 'tool_call',
  WRITE_FILE = 'write_file',
  EDIT_FILE = 'edit_file',
  RUN_BASH = 'run_bash',
  REASONING = 'reasoning',
}
```

Tool syntax shorthands (e.g., `WRITE_FILE`, `RUN_TERMINAL_CMD`) map to concrete tools via the
tool syntax registry:

```
src/agent/streaming/adapters/tool-syntax-registry.ts
```

### Tool Syntax Mapping (SegmentType -> ToolInvocation)

The FSM only emits segment types; tool names are resolved later by the
`ToolInvocationAdapter` using the tool syntax registry.

| SegmentType      | Segment Syntax             | Tool Name    | Argument Source                     |
| ---------------- | -------------------------- | ------------ | ----------------------------------- |
| WRITE_FILE       | `<write_file path="...">`  | `write_file` | adapter: `path` + segment body      |
| RUN_TERMINAL_CMD | `<run_bash>...</run_bash>` | `run_bash`   | adapter: command from body/metadata |

### Tool Invocation IDs (Important)

Tool invocations created from streamed tool segments **reuse the segment ID**.
This keeps a stable, 1:1 link between:

- `SegmentEvent.segment_id` in the streamed UI events
- `ToolInvocation.id` used in approval/execution

So when the frontend receives a tool approval request, the `invocation_id` is the
same value as the segment ID it already saw in the stream. This guarantees
reliable UI correlation without extra mapping.

## Safe Streaming (Holdback Pattern)

To prevent displaying partial closing tags in the UI, each content state holds back characters that could be part of the closing tag:

```
Buffer: "print('hi')</wr"
                    ^^^^ held back (chars = len("</write_file>") - 1)
Emitted: "print('hi')"
```

Once the full closing tag arrives:

```
Buffer: "print('hi')</write_file>"
                    ^^^^^^^^^^^^^  closing tag detected
Final emit: remaining content, then SEGMENT_END
```

## Integration with Event Handler

The `LLMUserMessageReadyEventHandler` integrates the parser via the
`StreamingResponseHandlerFactory`:

```ts
async function handle(event: LLMUserMessageReadyEvent) {
  const { handler } = StreamingResponseHandlerFactory.create({
    toolNames,
    provider,
    onSegmentEvent: emitPartEvent,
    onToolInvocation: emitToolInvocation,
    agentId,
  });

  for await (const chunk of llm.streamUserMessage(message)) {
    // Pass the full ChunkResponse object
    handler.feed(chunk);
  }

  handler.finalize();
}
```

## Parser Strategy Selection

The streaming system supports multiple parser strategies selected at runtime.

Environment variable:

- `AUTOBYTEUS_STREAM_PARSER`: `xml`, `json`, `sentinel`, `api_tool_call`

Agent default:

- If `AUTOBYTEUS_STREAM_PARSER` is not set, the default is `api_tool_call`.

When `AUTOBYTEUS_STREAM_PARSER` is set to `xml` or `json`, the agent handler
selects the corresponding parser strategy. JSON parsing uses provider-aware
signature patterns and parsing strategies to match tool formatting examples.

Strategy notes:

- `xml`: state-machine parser tuned for XML tag detection.
- `json`: state-machine parser tuned for JSON tool detection.
- `api_tool_call`: disables tool-tag parsing; tool calls are expected from the provider's native tool stream.
- `sentinel`: sentinel-based format using explicit start/end markers.
  - Sentinel format uses explicit start/end markers with a JSON header.

### Sentinel Format

Start marker:

```
[[SEG_START {"type":"write_file","path":"/a.ts"}]]
```

End marker:

```
[[SEG_END]]
```

The `type` maps to `SegmentType`, and any other JSON fields are treated as metadata.

### Detection Strategies

Detection uses an ordered strategy list to decide which parser to invoke.

Default order:

```ts
const config = new ParserConfig({ strategyOrder: ['xml_tag'] });
```

Each strategy reports the next candidate marker; the earliest match wins.

## Adding a New Block Type (Custom Tool State)

You can now register custom parsing states dynamically without modifying the core library.

1. **Define your state class** (inherit from `XmlToolParsingState` or `XmlEditFileToolParsingState` etc.):

```ts
import { XmlToolParsingState } from 'src/agent/streaming/parser';

class MyCustomToolState extends XmlToolParsingState {
  // Customize logic, e.g., usage of custom sentinels
}
```

2. **Register existing state with Public API**:

```ts
import { registerXmlToolParsingState } from 'src/agent/streaming/parser';

registerXmlToolParsingState('my_tool_name', MyCustomToolState);
```

**Note:** The parser automatically normalizes tool names to lowercase for lookup, so `<tool name="MY_TOOL">` will match a registry entry for `"my_tool"`.

## File Structure

```
src/agent/streaming/
├── index.ts
├── adapters/
│   ├── invocation-adapter.ts        # Converts to ToolInvocation
│   ├── tool-call-parsing.ts         # Tool argument parsing helpers
│   └── tool-syntax-registry.ts      # SegmentType -> Tool mapping
├── api-tool-call/
│   ├── json-string-field-extractor.ts
│   └── file-content-streamer.ts
├── events/
│   ├── stream-events.ts             # Legacy/agent stream events
│   └── stream-event-payloads.ts
├── handlers/
│   ├── streaming-response-handler.ts
│   ├── parsing-streaming-response-handler.ts
│   ├── pass-through-streaming-response-handler.ts
│   ├── api-tool-call-streaming-response-handler.ts
│   └── streaming-handler-factory.ts
├── segments/
│   └── segment-events.ts            # SegmentEvent, SegmentType
├── streams/
│   └── agent-event-stream.ts
├── utils/
│   └── queue-streamer.ts
└── parser/
    ├── index.ts
    ├── streaming-parser.ts          # Orchestrator
    ├── parser-context.ts            # Shared state + config
    ├── stream-scanner.ts            # Character buffer
    ├── event-emitter.ts             # Event queue
    ├── state-factory.ts             # State creation
    ├── xml-tool-parsing-state-registry.ts  # Registry for tool states
    ├── tool-constants.ts            # Tool name constants
    ├── json-parsing-strategies/     # Provider-aware JSON parsing
    └── states/
        ├── base-state.ts
        ├── text-state.ts
        ├── xml-tag-initialization-state.ts
        ├── json-initialization-state.ts
        ├── custom-xml-tag-write-file-parsing-state.ts
        ├── custom-xml-tag-run-bash-parsing-state.ts
        ├── xml-tool-parsing-state.ts
        ├── xml-write-file-tool-parsing-state.ts
        ├── xml-edit-file-tool-parsing-state.ts
        ├── xml-run-bash-tool-parsing-state.ts
        └── json-tool-parsing-state.ts
```

## Testing

Unit tests exist for each component:

```bash
# Run all streaming parser tests
pnpm exec vitest --run tests/unit/agent/streaming/parser/

# Run integration tests
pnpm exec vitest --run tests/integration/agent/streaming/
```

Test coverage includes:

- State transitions and detection
- Partial tag holdback behavior
- Multi-chunk streaming
- Finalization of incomplete blocks
- Mixed content scenarios
