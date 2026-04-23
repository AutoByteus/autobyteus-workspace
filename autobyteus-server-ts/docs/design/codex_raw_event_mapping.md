# Codex Raw Event Mapping

## Purpose

This document is the canonical audit table for how raw Codex App Server thread events are interpreted inside `autobyteus-server-ts`, applied to Codex thread state, and converted into normalized `AgentRunEvent`s.

Use this document when:
- debugging a runtime behavior mismatch,
- reviewing Codex event-conversion changes,
- deciding whether a raw event should drive lifecycle, artifact, activity, or thread-state readiness,
- checking whether an older raw-event name is still part of the active protocol.

## Authoritative Boundary

The authoritative raw-event interpretation boundaries live under:

- `src/agent-execution/backends/codex/thread/`
- `src/agent-execution/backends/codex/events/`

The most important owners are:

- `codex-thread-notification-handler.ts` — authoritative owner for applying raw notification side effects to `CodexThread` state (`threadId`, status, active turn, token-usage readiness)
- `codex-thread-event-converter.ts` — top-level Codex raw-message dispatcher
- `codex-item-event-converter.ts` — authoritative owner for `item/*` event fan-out
- `codex-turn-event-converter.ts` — authoritative owner for `turn/*` events
- `codex-thread-lifecycle-event-converter.ts` — authoritative owner for `thread/*` and `error`
- `codex-raw-response-event-converter.ts` — raw-response sidecar normalization
- `codex-thread-server-request-handler.ts` — server-request handling for approval requests and dynamic tool calls

Higher layers should depend on `CodexThread` state and normalized `AgentRunEvent`s exposed by these owners. They should not infer Codex raw protocol details themselves.

## Apply-Patch / Edit-File Spine

For Codex `apply_patch`, the authoritative mutation spine is the raw `fileChange` item lifecycle, not the `custom_tool_call` completion.

```mermaid
flowchart LR
  A["rawResponseItem/completed
item.type=custom_tool_call
name=apply_patch"] --> B["item/started
item.type=fileChange"]
  B --> C["item/fileChange/outputDelta"]
  C --> D["item/completed
item.type=fileChange"]
  D --> E["turn/diff/updated"]
  E --> F["rawResponseItem/completed
custom tool output"]
```

Normalized result:

- `item/started(fileChange)` -> `SEGMENT_START(edit_file)` + `TOOL_EXECUTION_STARTED(edit_file)`
- `item/fileChange/outputDelta` -> `TOOL_LOG(edit_file)`
- `item/completed(fileChange)` -> terminal lifecycle (`TOOL_DENIED` / `TOOL_EXECUTION_FAILED` / `TOOL_EXECUTION_SUCCEEDED`) + `SEGMENT_END(edit_file)`
- `turn/diff/updated` -> intentionally ignored for normalized state because it is supplemental diff data, not the owner of lifecycle or changed-file availability

## Raw Event Audit Table

| Raw Method | Raw Shape / Guard | Normalized Output | Owner | Decision |
| --- | --- | --- | --- | --- |
| `turn/started` | turn lifecycle start | `TURN_STARTED(turnId)` and `AGENT_STATUS(new_status=RUNNING)` | `codex-turn-event-converter.ts` | Keep |
| `turn/completed` | turn lifecycle end | `TURN_COMPLETED(turnId)` and `AGENT_STATUS(new_status=IDLE)` and reasoning tracker reset | `codex-turn-event-converter.ts` | Keep |
| `turn/diff/updated` | supplemental unified diff for a turn | none | `codex-turn-event-converter.ts` | Keep as explicit no-op |
| `turn/taskProgressUpdated` | task progress payload | `TODO_LIST_UPDATE` | `codex-turn-event-converter.ts` | Keep |
| `item/started` | `item.type = commandExecution` | `TOOL_EXECUTION_STARTED` | `codex-item-event-converter.ts` | Keep |
| `item/completed` | `item.type = commandExecution` | `TOOL_DENIED` or `TOOL_EXECUTION_FAILED` or `TOOL_EXECUTION_SUCCEEDED` | `codex-item-event-converter.ts` | Keep |
| `item/started` | `item.type = fileChange` | `SEGMENT_START(edit_file)`, `TOOL_EXECUTION_STARTED(edit_file)` | `codex-item-event-converter.ts` | Keep |
| `item/completed` | `item.type = fileChange` | `TOOL_DENIED` or `TOOL_EXECUTION_FAILED` or `TOOL_EXECUTION_SUCCEEDED(edit_file)`; always ends with `SEGMENT_END(edit_file)` | `codex-item-event-converter.ts` | Keep |
| `item/agentMessage/delta` | agent visible text delta | `SEGMENT_CONTENT(text)` | `codex-item-event-converter.ts` | Keep |
| `item/reasoning/delta` | reasoning delta | `SEGMENT_CONTENT(reasoning)` | `codex-item-event-converter.ts` | Keep |
| `item/reasoning/summaryPartAdded` | reasoning summary delta | `SEGMENT_CONTENT(reasoning)` | `codex-item-event-converter.ts` | Keep |
| `item/reasoning/completed` | reasoning snapshot completion | `SEGMENT_CONTENT(reasoning)` | `codex-item-event-converter.ts` | Keep |
| `item/plan/delta` | plan/todo delta | `TODO_LIST_UPDATE` | `codex-item-event-converter.ts` | Keep |
| `item/commandExecution/requestApproval` | command approval request | `TOOL_APPROVAL_REQUESTED` | `codex-item-event-converter.ts` | Keep |
| `item/fileChange/requestApproval` | file-change approval request | `TOOL_APPROVAL_REQUESTED(edit_file)` | `codex-item-event-converter.ts` | Keep |
| `codex/local/toolApproved` | local approval acknowledgement | `TOOL_APPROVED` | `codex-item-event-converter.ts` | Keep |
| `item/fileChange/outputDelta` | file-change status/log text | `TOOL_LOG(edit_file)` | `codex-item-event-converter.ts` | Keep |
| `item/tool/call` | dynamic tool call server request | no `AgentRunEvent`; handled as request/response control flow | `codex-thread-server-request-handler.ts` | Keep outside normalized runtime-event spine |
| `rawResponseItem/completed` | `item.type = functionCallOutput` | `TOOL_LOG` | `codex-raw-response-event-converter.ts` | Keep |
| `rawResponseItem/completed` | `item.type = custom_tool_call` or custom tool output | none in the normalized runtime-event spine | `codex-raw-response-event-converter.ts` | Keep ignored; file mutation state comes from `fileChange` events |
| `thread/started` | thread lifecycle start | none | `codex-thread-lifecycle-event-converter.ts` | Keep as explicit no-op |
| `thread/status/changed` | runtime status payload | `AGENT_STATUS` | `codex-thread-lifecycle-event-converter.ts` | Keep |
| `thread/tokenUsage/updated` | token accounting update | none in normalized stream; records per-turn token usage readiness on `CodexThread` | `codex-thread-notification-handler.ts`, `codex-thread-lifecycle-event-converter.ts` | Keep as thread-state side effect plus explicit normalized no-op |
| `error` | runtime error payload | `ERROR` | `codex-thread-lifecycle-event-converter.ts` | Keep |

## Legacy / Removed Raw-Name Assumptions

These names are not part of the active Codex App Server contract in this codebase and should not be reintroduced as parallel mappings:

- `turn/diffUpdated`
- `item/fileChange/delta`
- `item/fileChange/completed`

The active names and shapes are instead:

- `turn/diff/updated`
- `item/fileChange/outputDelta`
- generic `item/started` / `item/completed` with `item.type = fileChange`

## Raw Debug Logging

To capture raw Codex events before normalization, configure:

- `CODEX_THREAD_RAW_EVENT_LOG_DIR=/absolute/path`

Optional console debug flags:

- `CODEX_THREAD_EVENT_DEBUG=1`
- `CODEX_THREAD_RAW_EVENT_DEBUG=1`
- `CODEX_THREAD_RAW_EVENT_MAX_CHARS=<number>`

Output shape:

- JSONL file name: `codex-run-<runId>.jsonl`
- one line per raw event with:
  - timestamp
  - backend / scope / scopeId
  - raw `eventName`
  - selected metadata (`itemId`, `itemType`, `callId`, `turnId`, payload keys)
  - full raw payload

## Operational Rules

- Treat `fileChange` item lifecycle as the authoritative owner for Codex `edit_file` lifecycle and changed-file availability.
- Treat `thread/tokenUsage/updated` as a `CodexThread` state update. Persist ready per-turn usage from the thread boundary instead of parsing raw token payloads in higher runtime layers.
- Do not infer `edit_file` success from published-artifact transport on the frontend.
- Do not promote `turn/diff/updated` into lifecycle or artifact ownership without a new explicit design decision.
- When new raw Codex event names appear, update this audit table before extending the converter boundary.
