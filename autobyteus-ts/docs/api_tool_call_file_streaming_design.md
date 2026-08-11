# Provider-Native File Tool Streaming (`write_file` / `edit_file`)

Status: Current
Last updated: 2026-08-09

## Purpose

Provider-native tool arguments arrive as incremental JSON fragments. The runtime
must display `write_file` content and `edit_file` patches while they stream,
without allowing an incomplete display projection to become executable
invocation data.

`LlmStreamingResponseHandler` therefore has two distinct outputs when its
explicit tool-call gate is enabled:

1. specialized segment events for responsive user-visible file projection; and
2. one `ToolInvocation` built from the provider's complete accumulated native
   argument JSON.

The second output is authoritative.

## Invariants

- Only provider-native `ToolCallDelta` records enter this path.
- The tool's provider call id is reused as the segment and invocation id when
  available; otherwise a stable turn-prefixed id is generated.
- `write_file` emits `WRITE_FILE` segments and projects `path` + `content`.
- `edit_file` emits `EDIT_FILE` segments and projects `path` + `patch`.
- Other tools emit normal `TOOL_CALL` segments containing raw argument deltas.
- Exactly one invocation is published per finalized native call.
- Final accumulated native argument JSON, not projected content, is invocation
  authority.
- Interruption or stream failure terminalizes visible segments without
  publishing a partial invocation.

## Per-Call State

For every provider call index, the handler records:

- segment id;
- tool name;
- complete accumulated argument text;
- specialized segment type;
- incremental field streamer for file tools;
- discovered path;
- whether the display segment has started;
- buffered projected content; and
- provider-native replay context.

Calls are independent, so parallel file and non-file calls can interleave
without sharing extraction state.

## Incremental JSON String Extraction

`JsonStringFieldExtractor` incrementally scans JSON string keys and values across
arbitrary delta boundaries. File streamers select only the fields needed for
display:

| Tool | Path field | Streamed body field |
| --- | --- | --- |
| `write_file` | `path` | `content` |
| `edit_file` | `path` | `patch` |

The extractor decodes JSON string escapes before emitting display content.
Content that arrives before the path is buffered. Once the path is available,
the handler starts the specialized segment and flushes the buffered suffix in
order.

This extractor is intentionally not a general invocation parser. It does not
create tools, repair malformed final JSON, or understand an XML/sentinel
wrapper.

## Segment Lifecycle

### Normal completion

1. A native file call is detected and assigned its stable id.
2. Argument deltas are appended to the authoritative argument buffer and also
   fed to the display projector.
3. When `path` is known, the specialized segment starts with `tool_name` and
   `path` metadata; buffered content is flushed.
4. Further decoded `content`/`patch` suffixes emit `SEGMENT_CONTENT`.
5. At stream finalization, a start event is still emitted if the path never
   arrived, so the segment has a valid lifecycle.
6. The handler emits `SEGMENT_END` with any known path/native context.
7. After the end event, the handler publishes the invocation built from the
   complete accumulated native JSON.

The end-before-invocation ordering prevents execution publication while the
user-visible segment remains open.

### Interruption or failure

Only segments that actually started are terminalized. Active per-call state is
cleared, and no partial invocation is published.

## Invocation Authority

At normal finalization the handler parses the complete accumulated argument
string once. A parsed non-array object becomes `ToolInvocation.arguments`.
Malformed or non-object JSON falls back to `{}` and is left to downstream tool
preparation/schema validation to reject as appropriate.

The projector's decoded path/content is never merged back into the invocation.
This matters when a provider omits a field, repeats a key, emits unusual but
valid JSON, or fails after displaying only part of a file.

## Protocol Impact

No additional WebSocket event type is required. Existing `WRITE_FILE`,
`EDIT_FILE`, and `TOOL_CALL` segment types remain the client contract. The
specialized events affect live presentation only; tool execution still receives
the normalized `ToolInvocation` contract.

## Key Files

- `src/agent/streaming/handlers/llm-streaming-response-handler.ts`
- `src/agent/streaming/api-tool-call/file-content-streamer.ts`
- `src/agent/streaming/api-tool-call/json-string-field-extractor.ts`
- `src/agent/streaming/segments/segment-events.ts`

## Required Coverage

Durable tests should cover:

- path and body split across arbitrary chunks;
- content arriving before path;
- JSON escape decoding;
- parallel calls and provider indexes;
- delayed tool names and call ids;
- one start/content/end lifecycle per call;
- end publication before invocation callback;
- final native arguments differing from live projected fields;
- mixed assistant text plus file tools; and
- interruption/failure with no partial invocation.
