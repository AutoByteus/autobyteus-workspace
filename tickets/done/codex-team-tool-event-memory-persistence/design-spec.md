# Design Spec

## Current-State Read

Codex currently has two event surfaces that are being conflated by behavior and tests:

1. Display/conversation segment lifecycle:
   - `SEGMENT_START`
   - `SEGMENT_CONTENT`
   - `SEGMENT_END`

2. Real tool execution lifecycle:
   - `TOOL_APPROVAL_REQUESTED`
   - `TOOL_EXECUTION_STARTED`
   - `TOOL_EXECUTION_SUCCEEDED`
   - `TOOL_EXECUTION_FAILED`
   - `TOOL_DENIED`

For Codex generic dynamic tools, including team `send_message_to`, the current converter emits only the display path:

```text
item/started(dynamicToolCall)   -> SEGMENT_START(tool_call)
item/completed(dynamicToolCall) -> SEGMENT_END
raw function_call_output        -> TOOL_LOG
```

The missing lifecycle path is:

```text
item/started(dynamicToolCall)   -> TOOL_EXECUTION_STARTED
item/completed(dynamicToolCall) -> TOOL_EXECUTION_SUCCEEDED / TOOL_EXECUTION_FAILED
```

Frontend consequence:

- `SEGMENT_START(tool_call)` creates a tool-call Activity item.
- `SEGMENT_END` changes it from `parsing` to `parsed` if no terminal lifecycle status exists.
- `TOOL_EXECUTION_SUCCEEDED` is required for `success`.
- Therefore `send_message_to` remains `parsed` even when delivery succeeds.

Memory consequence:

- Existing memory persistence records lifecycle `TOOL_*` events.
- If dynamic tools do not emit lifecycle events, `send_message_to` can be missing from memory even though it executed.

Current special case:

- Browser dynamic tools already get terminal lifecycle through a browser-only mapping in `codex-item-event-converter.ts`.
- This should be generalized for all `dynamicToolCall` items instead of remaining browser-specific behavior.

## Intended Change

Generalize Codex `dynamicToolCall` conversion so every local dynamic tool produces both display segment events and real tool lifecycle events.

Target normalized shape:

```text
item/started(dynamicToolCall)
  -> SEGMENT_START(tool_call)
  -> TOOL_EXECUTION_STARTED

item/completed(dynamicToolCall, success/completed)
  -> TOOL_EXECUTION_SUCCEEDED
  -> SEGMENT_END

item/completed(dynamicToolCall, failure)
  -> TOOL_EXECUTION_FAILED
  -> SEGMENT_END
```

`send_message_to` should then behave like a real executed tool in the UI and memory. The UI must not infer success from `SEGMENT_END`; success comes from terminal `TOOL_EXECUTION_SUCCEEDED` only.

## Terminology

- `Display segment lifecycle`: `SEGMENT_*` events representing stream/UI structures.
- `Tool execution lifecycle`: `TOOL_*` events representing actual approval/execution/result state.
- `Codex dynamic tool`: A tool exposed through Codex dynamic tool registrations and surfaced by app-server as `item.type = "dynamicToolCall"`.
- `Invocation id`: The stable dynamic tool call id, usually `item.id`, used as `SEGMENT_START.payload.id` and `TOOL_* payload.invocation_id`.

## Design Reading Order

1. event semantic split
2. Codex raw dynamic tool spine
3. converter ownership
4. frontend and memory downstream effects
5. file/test mapping

## Legacy Removal Policy

- Remove the steady-state expectation that dynamic tools should produce no lifecycle events.
- Remove or subsume the browser-only dynamic terminal special case when the generic dynamic tool path handles it.
- Do not add compatibility behavior where frontend treats `SEGMENT_END(tool_call)` as success.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Codex raw `item/started(dynamicToolCall)` | UI Activity `executing` and memory pending tool call | `CodexItemEventConverter` for normalized mapping | Missing start lifecycle keeps dynamic tools display-only. |
| DS-002 | Primary End-to-End | Codex raw `item/completed(dynamicToolCall)` | UI Activity terminal success/error and memory tool result | `CodexItemEventConverter` for normalized mapping | Missing terminal lifecycle keeps `send_message_to` stuck at parsed. |
| DS-003 | Return/Event | Raw `function_call_output` | `TOOL_LOG` diagnostics | `CodexRawResponseEventConverter` | Logs are useful but not terminal status. |
| DS-004 | Bounded Local | Frontend receives segment/lifecycle events | Segment status transition | `toolLifecycleHandler` + `segmentHandler` | Confirms frontend should remain lifecycle-driven. |
| DS-005 | Bounded Local | Memory recorder receives lifecycle events | `raw_traces.jsonl` tool_call/tool_result | `RuntimeMemoryEventAccumulator` | Existing lifecycle persistence should work after upstream fix. |

## Primary Execution Spine(s)

- DS-001: `Codex app-server item/started(dynamicToolCall) -> CodexThreadEventConverter -> CodexItemEventConverter -> [SEGMENT_START(tool_call), TOOL_EXECUTION_STARTED] -> stream/memory subscribers`
- DS-002: `Codex app-server item/completed(dynamicToolCall) -> CodexThreadEventConverter -> CodexItemEventConverter -> [TOOL_EXECUTION_SUCCEEDED|FAILED, SEGMENT_END] -> stream/memory subscribers`

## Spine Narratives

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Dynamic tool execution begins. Converter preserves display segment start and emits real execution start. | Codex raw event, converter, normalized event stream | `CodexItemEventConverter` | Payload extraction, invocation id stability. |
| DS-002 | Dynamic tool execution completes. Converter emits terminal lifecycle from `success`/status and still finalizes segment display. | Codex raw event, converter, normalized event stream | `CodexItemEventConverter` | Result/error extraction, event ordering, browser regression. |
| DS-003 | Raw function output remains supplemental log data. | Raw response converter, `TOOL_LOG` | `CodexRawResponseEventConverter` | Do not use logs as terminal status. |
| DS-004 | Frontend consumes explicit lifecycle events for status transitions. | Segment handler, tool lifecycle handler, activity store | Frontend handlers | No success inference from segment end. |
| DS-005 | Memory persists lifecycle events through existing accumulator. | Memory recorder, accumulator, writer | `RuntimeMemoryEventAccumulator` | De-dupe and result persistence. |

## Spine Actors / Main-Line Nodes

- `CodexThreadEventConverter`: top-level Codex app-server message converter.
- `CodexItemEventConverter`: owner of item event to normalized display/lifecycle event mapping.
- `CodexItemEventPayloadParser` / `CodexToolPayloadParser`: owners of normalized field extraction from Codex item payloads.
- `AgentRunEventMessageMapper`: forwards normalized events to websocket clients unchanged.
- Frontend `segmentHandler`: owns display segment creation/finalization.
- Frontend `toolLifecycleHandler`: owns execution status transitions.
- `RuntimeMemoryEventAccumulator`: owns normalized lifecycle-to-memory persistence.

## Ownership Map

| Actor | Owns | Must Not Own |
| --- | --- | --- |
| `CodexItemEventConverter` | Mapping Codex item events to normalized display and lifecycle events. | Frontend status policy, memory writes. |
| `CodexToolPayloadParser` | Tool name/args/result/error/status extraction from Codex payloads. | Deciding event fan-out sequence. |
| `CodexRawResponseEventConverter` | Raw response item diagnostics such as `function_call_output` logs and compaction. | Terminal lifecycle for dynamic tool completion when `item/completed(dynamicToolCall)` is available. |
| Frontend `segmentHandler` | UI segment creation/finalization. | Inferring execution success. |
| Frontend `toolLifecycleHandler` | UI tool execution status transitions. | Backend event synthesis. |
| `RuntimeMemoryEventAccumulator` | Persisting normalized lifecycle events. | Parsing Codex raw dynamic tool payloads. |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Capability | Decision | Why |
| --- | --- | --- | --- |
| Dynamic tool payload extraction | `CodexToolPayloadParser` | Reuse/extend only if needed | Already extracts tool name, args, result, error, failure status. |
| Event fan-out | `CodexItemEventConverter` | Extend | Existing item conversion owner; already fans out file-change start/completion. |
| UI success display | `toolLifecycleHandler` | Reuse unchanged | It already handles `TOOL_EXECUTION_SUCCEEDED`. |
| Memory persistence | `RuntimeMemoryEventAccumulator` | Reuse unchanged initially | Lifecycle events should feed existing memory behavior. |
| Raw event logging | `CODEX_THREAD_RAW_EVENT_LOG_DIR` | Reuse | Probe already confirms raw dynamic event shape. |

## Final File Responsibility Mapping

| File | Owner / Boundary | Concrete Concern | Required Change |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Codex item event mapping | Dynamic tool event fan-out | Emit lifecycle events for `dynamicToolCall` start/completion; preserve segment events; avoid browser duplicates. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts` | Codex payload shape normalization | Item type and invocation id extraction | Likely no change; verify `dynamicToolCall` id/tool/args extraction remains correct. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-tool-payload-parser.ts` | Tool payload extraction | Dynamic result/error/failure parsing | Add tests/fixes only if failure result extraction is insufficient. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | Converter unit tests | Contract for dynamic lifecycle mapping | Add/update tests for dynamic start success/failure and event ordering. |
| `autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` | Live backend integration | Generic dynamic tool live event stream | Update custom dynamic tool test to expect lifecycle; remove zero-lifecycle assertion. |
| `autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts` | Live team E2E | `send_message_to` team stream behavior | Expect sender `TOOL_EXECUTION_SUCCEEDED` for each successful delivery. |
| `autobyteus-server-ts/tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts` | Memory lifecycle tests | Existing lifecycle persistence | Optional targeted assertion if implementation changes expose a useful synthetic dynamic lifecycle fixture. |

## Ownership Boundaries

Authority changes hands at these points:

- Codex provider boundary: raw app-server messages enter `CodexThreadEventConverter`.
- Normalized event boundary: `CodexItemEventConverter` emits display and lifecycle events.
- Stream boundary: `AgentRunEventMessageMapper` forwards normalized events; it does not infer lifecycle.
- UI state boundary: frontend lifecycle handlers update status from lifecycle events.
- Memory boundary: memory accumulator persists lifecycle events; it does not parse raw Codex events.

## Dependency Rules

- `agent-memory` must not import Codex event classes or parse Codex raw item payloads.
- Frontend must not infer success from `SEGMENT_END`.
- Codex converter may use payload parser helpers but must keep one clear event fan-out owner.
- Dynamic tool terminal lifecycle should come from generalized `dynamicToolCall` mapping, not browser-only special handling.
- `TOOL_LOG` remains diagnostic, not terminal.

Forbidden shortcuts:

- Do not solve the UI problem by treating `parsed` as `success`.
- Do not solve memory by parsing textual `[TOOL_CALL]` messages.
- Do not add a `send_message_to`-only lifecycle hack if the raw problem is generic dynamic tools.
- Do not emit duplicate browser terminal lifecycle events.

## Interface Boundary Mapping

| Interface / Method | Subject Owned | Responsibility | Accepted Identity Shape |
| --- | --- | --- | --- |
| `convertCodexItemEvent(...)` | Codex item event conversion | Fan out raw item events to normalized display/lifecycle events. | `item.type`, `item.id`, `item.tool`, status/success. |
| `createTerminalToolExecutionEvent(...)` | Terminal lifecycle event construction | Build success/failed/denied event payload from parser helpers. | `invocation_id`, `tool_name`, `result` or `error`. |
| `resolveInvocationId(...)` | Codex invocation id extraction | Canonical invocation id from dynamic item id/call id. | `item.id` / `payload.id` / `call_id`. |
| `resolveToolResult(...)` | Tool result extraction | Extract terminal result from `result`, `output`, or `contentItems`. | `unknown` result payload. |

## Concrete Examples / Shape Guidance

### Dynamic start

Input:

```json
{
  "method": "item/started",
  "params": {
    "item": {
      "type": "dynamicToolCall",
      "id": "call-1",
      "tool": "send_message_to",
      "arguments": {"recipient_name":"student","content":"hi"},
      "status": "inProgress"
    },
    "turnId": "turn-1"
  }
}
```

Output:

```text
SEGMENT_START id=call-1 segment_type=tool_call metadata.tool_name=send_message_to metadata.arguments={...}
TOOL_EXECUTION_STARTED invocation_id=call-1 tool_name=send_message_to arguments={...}
```

### Dynamic success

Input:

```json
{
  "method": "item/completed",
  "params": {
    "item": {
      "type": "dynamicToolCall",
      "id": "call-1",
      "tool": "send_message_to",
      "arguments": {"recipient_name":"student","content":"hi"},
      "status": "completed",
      "success": true,
      "contentItems": [{"type":"inputText","text":"Delivered message to student."}]
    }
  }
}
```

Output:

```text
TOOL_EXECUTION_SUCCEEDED invocation_id=call-1 tool_name=send_message_to result="Delivered message to student."
SEGMENT_END id=call-1 metadata.tool_name=send_message_to metadata.arguments={...}
```

Bad shape to avoid:

```text
SEGMENT_END id=call-1 -> UI infers success
```

## Backward-Compatibility Rejection Log

| Candidate Compatibility Mechanism | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Preserve zero lifecycle for generic dynamic tools | Existing tests assert it. | Rejected | Emit lifecycle for all dynamic tools. |
| Keep browser-only dynamic terminal special case | Already works for browser. | Rejected as sole solution | General dynamic mapping; browser path must not duplicate. |
| Make frontend treat parsed as success for `send_message_to` | Quick UI fix. | Rejected | Backend must emit terminal lifecycle. |
| Segment-start memory fallback first | Previous ticket direction. | Deferred | Fix lifecycle first; memory fallback can be reconsidered after revalidation. |

## Derived Layering

1. Codex app-server raw events.
2. Codex event converters normalize display and lifecycle events.
3. Websocket stream forwards normalized events.
4. Frontend handlers apply display and execution status.
5. Memory recorder persists normalized lifecycle traces.

The fix is in layer 2.

## Migration / Refactor Sequence

1. Add converter unit tests for `dynamicToolCall` start/completion success/failure.
2. Update `convertCodexItemEvent(...)` `ITEM_STARTED` handling:
   - if `itemType === "dynamictoolcall"`, return both `SEGMENT_START(tool_call)` and `TOOL_EXECUTION_STARTED`;
   - use `resolveSegmentStartId`, `resolveSegmentMetadata`, `resolveInvocationId`, `resolveToolName`, and `resolveToolArguments` or metadata arguments consistently.
3. Update `convertCodexItemEvent(...)` `ITEM_COMPLETED` handling:
   - if `itemType === "dynamictoolcall"`, return terminal lifecycle event from `createTerminalToolExecutionEvent(...)` plus a `SEGMENT_END` event;
   - ensure the browser special case does not run again for the same dynamic completion.
4. Verify result/error extraction for `dynamicToolCall` success and failure; extend `CodexToolPayloadParser` only if tests expose gaps.
5. Update live custom dynamic integration test to expect lifecycle events and keep `TOOL_LOG` as optional/diagnostic.
6. Update Codex team inter-agent roundtrip E2E to expect `send_message_to` `TOOL_EXECUTION_SUCCEEDED` for sender member and remove the no-lifecycle assertion.
7. Run targeted converter unit tests.
8. Run targeted live backend dynamic tool integration with `CODEX_THREAD_RAW_EVENT_LOG_DIR` / `CODEX_BACKEND_EVENT_LOG_DIR`.
9. Run Codex team inter-agent roundtrip E2E if live Codex E2E is enabled.
10. Recheck memory raw traces for `send_message_to`; only open the segment-memory fallback ticket if lifecycle-complete dynamic tools still leave memory incomplete.

## Key Tradeoffs

- Converter mapping vs local request-handler synthetic lifecycle: Converter mapping is preferred first because raw Codex app-server already emits `dynamicToolCall` started/completed status with success/result data. It keeps provider event normalization in one place. If future evidence shows missing completion events, local request-handler lifecycle can be added as a fallback with duplicate protection.
- General dynamic fix vs send-message-only fix: General dynamic fix is preferred because custom dynamic tools show the same gap and browser currently has an inconsistent special case.
- Terminal event before segment end: Follow the file-change pattern: emit terminal lifecycle and then segment end. Segment end must not regress terminal status.

## Risks

- Failure payloads may need parser tightening if `success:false` only provides text output.
- Some tests or frontend assumptions may rely on dynamic tools remaining display-only; those assumptions should be corrected.
- Browser dynamic tool tests may need updates if they currently expect only terminal event and no segment end.
- Live Codex E2E can be model-dependent; unit tests should pin the converter contract independent of model behavior.

## Guidance For Implementation

- Keep implementation in Codex event conversion; do not change frontend to infer success.
- Treat `item.type = "dynamicToolCall"` as the generalized local dynamic tool execution surface.
- Use one invocation id across segment and lifecycle events.
- Preserve `TOOL_LOG` conversion from `function_call_output`, but do not count it as success.
- Update tests that currently assert no lifecycle for dynamic tools or `send_message_to`.
- After implementation, validate both UI stream behavior and memory raw trace behavior.
