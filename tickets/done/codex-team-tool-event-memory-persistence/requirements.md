# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready; user-approved revised pivot scope on 2026-05-01.

## Goal / Problem Statement

Codex team `send_message_to` currently executes and delivers inter-agent messages, but the frontend Activity item remains at `parsed` instead of progressing to `success`. Investigation shows this is not primarily a memory persistence problem. It is an upstream normalized event lifecycle problem: Codex dynamic tool calls emit display-oriented `SEGMENT_START(tool_call)` / `SEGMENT_END` events, but generic dynamic tools do not emit normalized `TOOL_EXECUTION_STARTED` / `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED` lifecycle events.

The fix must make Codex dynamic tool execution lifecycle explicit in the normalized event stream. `SEGMENT_*` events remain the UI/conversation segment lifecycle. `TOOL_*` events are the real tool execution lifecycle and must drive success/error Activity state and memory tool result persistence.

The previous memory-only direction for persisting `SEGMENT_START(tool_call)` is deferred until after this upstream lifecycle issue is fixed and revalidated.

## Investigation Findings

- `SEGMENT_START(tool_call)` means a display/conversation segment for a tool call exists. It is not equivalent to actual tool execution start.
- `SEGMENT_END(tool_call)` finalizes that display segment and causes the frontend to show `parsed` when no terminal lifecycle event has arrived.
- `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED` are the terminal lifecycle events that move frontend Activity to `success` / `error`.
- The live ClassRoomSimulation Codex run showed `send_message_to` activity in the frontend but no `send_message_to` tool traces in memory; the likely upstream reason is that no terminal `TOOL_EXECUTION_*` event was emitted for the dynamic `send_message_to` invocation.
- Existing Codex team E2E test `codex-team-inter-agent-roundtrip.e2e.test.ts` explicitly asserts that `send_message_to` produces no `TOOL_*` lifecycle events. That expectation is now considered wrong for the desired architecture.
- Existing live Codex backend integration test `converts a custom dynamic tool call into tool_call segments and tool output logs` also explicitly asserts zero dynamic-tool lifecycle events for generic dynamic tools. That expectation is also now considered wrong.
- A live probe with `CODEX_THREAD_RAW_EVENT_LOG_DIR` and `CODEX_BACKEND_EVENT_LOG_DIR` showed Codex app-server raw dynamic tool events are sufficient to map lifecycle:
  - raw `item/started` with `item.type = "dynamicToolCall"`, `item.id`, `item.tool`, `item.arguments`, `item.status = "inProgress"`;
  - raw `item/completed` with the same id/tool/arguments, `item.status = "completed"`, `item.success = true`, and `contentItems` containing the result text.
- The normalized event stream for that same probe currently contains `SEGMENT_START(tool_call)`, `SEGMENT_END`, and `TOOL_LOG`, but no `TOOL_EXECUTION_STARTED` or terminal `TOOL_EXECUTION_SUCCEEDED` for the dynamic tool.
- Browser dynamic tools currently receive an ad-hoc terminal success mapping through a browser-name special case. Generic dynamic tools such as `send_message_to`, `publish_artifact`, and custom dynamic tools should use one consistent dynamic-tool lifecycle mapping instead of browser-only lifecycle behavior.

## Recommendations

- Treat Codex `dynamicToolCall` item events as a real local dynamic-tool execution lifecycle source.
- For Codex `item/started` where `item.type = "dynamicToolCall"`, emit both:
  1. `SEGMENT_START(tool_call)` for display, and
  2. `TOOL_EXECUTION_STARTED` for execution lifecycle,
  using the same invocation id, tool name, arguments, turn id, and timestamp/source payload where available.
- For Codex `item/completed` where `item.type = "dynamicToolCall"`, emit a terminal lifecycle event plus the display segment end:
  - `TOOL_EXECUTION_SUCCEEDED` when `success !== false` and status is not failure-like;
  - `TOOL_EXECUTION_FAILED` when `success === false` or status is `failed`/`error`;
  - then `SEGMENT_END` for display finalization.
- Preserve `TOOL_LOG` from raw `function_call_output` as diagnostic output, but do not rely on it for terminal Activity status.
- Remove/update tests that assert dynamic tools or `send_message_to` must have no lifecycle events.
- Revalidate memory after lifecycle is fixed. Existing memory accumulator lifecycle handling should then record `send_message_to` `tool_call` / `tool_result` without needing the segment-memory fallback for this case.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: Codex team `send_message_to` Activity progresses to terminal `success` when delivery succeeds.
- UC-002: Codex team `send_message_to` Activity progresses to terminal `error` when delivery fails.
- UC-003: Generic Codex dynamic tools expose normalized `TOOL_EXECUTION_STARTED` and terminal lifecycle events, not only display segment events.
- UC-004: Existing display segment behavior remains: tool-call segments still appear in the UI from `SEGMENT_START(tool_call)` and receive `SEGMENT_END` finalization.
- UC-005: Existing memory lifecycle persistence can record dynamic tool calls/results from `TOOL_*` events.
- UC-006: Browser dynamic tools keep success/error lifecycle behavior under the generalized dynamic-tool mapping.

## Out of Scope

- Persisting `SEGMENT_START(tool_call)` as a memory fallback for runtimes that emit no lifecycle events.
- Parsing textual `[TOOL_CALL] ...` assistant messages.
- Changing frontend Activity state rules except by providing correct backend lifecycle events.
- Reworking native AutoByteus or Claude tool lifecycle behavior.
- Reworking Codex command execution or file-change lifecycle behavior beyond avoiding regressions.
- Historical backfill for already-missed memory traces.

## Functional Requirements

- REQ-001: The architecture must keep display segment lifecycle and real tool execution lifecycle semantically separate.
- REQ-002: Codex `dynamicToolCall` `item/started` events must continue to produce `SEGMENT_START(tool_call)` with metadata sufficient for UI display.
- REQ-003: Codex `dynamicToolCall` `item/started` events must also produce `TOOL_EXECUTION_STARTED` with the same invocation id, tool name, and arguments.
- REQ-004: Codex `dynamicToolCall` `item/completed` events with success/completed status must produce `TOOL_EXECUTION_SUCCEEDED` with the same invocation id, tool name, and result payload.
- REQ-005: Codex `dynamicToolCall` `item/completed` events with failure status or `success = false` must produce `TOOL_EXECUTION_FAILED` with the same invocation id, tool name, and error payload.
- REQ-006: Codex `dynamicToolCall` `item/completed` events must still produce `SEGMENT_END` so display segment finalization and metadata merge behavior remain intact.
- REQ-007: `send_message_to` team websocket streams must include terminal `TOOL_EXECUTION_SUCCEEDED` or `TOOL_EXECUTION_FAILED` lifecycle events for the sender member, keyed by the same invocation id as the `SEGMENT_START(tool_call)`.
- REQ-008: Browser dynamic tools must not rely on a browser-only special lifecycle path when the generalized dynamic-tool lifecycle path applies.
- REQ-009: Raw `function_call_output` conversion to `TOOL_LOG` may remain as supplemental diagnostic output, but tests must not treat `TOOL_LOG` as a substitute for terminal lifecycle status.
- REQ-010: Existing command execution (`run_bash`), file change (`edit_file`), and local MCP completion lifecycle behavior must not regress or duplicate terminal results for the same invocation.
- REQ-011: Existing memory lifecycle persistence should record one dynamic tool `tool_call` and one terminal `tool_result` for a completed `send_message_to` invocation after the lifecycle fix.

## Acceptance Criteria

- AC-001: Given a Codex normalized conversion input `item/started` with `item.type = "dynamicToolCall"`, `id = "call-1"`, `tool = "send_message_to"`, and arguments, the converter emits both `SEGMENT_START(tool_call)` and `TOOL_EXECUTION_STARTED` for `call-1`.
- AC-002: Given a Codex normalized conversion input `item/completed` with `item.type = "dynamicToolCall"`, `id = "call-1"`, `tool = "send_message_to"`, `status = "completed"`, and `success = true`, the converter emits `TOOL_EXECUTION_SUCCEEDED` for `call-1` and a `SEGMENT_END` for `call-1`.
- AC-003: Given a Codex normalized conversion input `item/completed` with `item.type = "dynamicToolCall"`, `success = false` or failure-like status, the converter emits `TOOL_EXECUTION_FAILED` for that invocation and a `SEGMENT_END`.
- AC-004: In the live Codex backend dynamic-tool integration test, a custom dynamic tool emits `SEGMENT_START`, `TOOL_EXECUTION_STARTED`, terminal `TOOL_EXECUTION_SUCCEEDED`, `SEGMENT_END`, and optional `TOOL_LOG`; the old zero-lifecycle expectation is removed.
- AC-005: In the Codex team inter-agent roundtrip E2E, each successful `send_message_to` delivery produces a sender-member `TOOL_EXECUTION_SUCCEEDED` event and no longer remains only `parsed`.
- AC-006: Frontend-visible invocation identity is consistent: `SEGMENT_START.payload.id`, `TOOL_EXECUTION_STARTED.payload.invocation_id`, and terminal `TOOL_EXECUTION_SUCCEEDED/FAILED.payload.invocation_id` match.
- AC-007: Memory raw traces for a completed Codex `send_message_to` turn contain one `tool_call` and one `tool_result` for the invocation through existing lifecycle persistence.
- AC-008: Existing `run_bash`, `edit_file`, browser dynamic, and local MCP completion tests continue to pass without duplicate terminal lifecycle events.

## Constraints / Dependencies

- Must be implemented on the dedicated ticket branch/worktree.
- Must use Codex app-server raw `dynamicToolCall` events already available in the converter; avoid parsing assistant text.
- Must preserve the `SEGMENT_*` stream for UI display and historical replay.
- Must update tests that currently encode the wrong no-lifecycle expectation for dynamic tools.
- Must not make frontend infer success from `SEGMENT_END`.

## Assumptions

- Codex app-server consistently emits `item/started` and `item/completed` for local dynamic tools, including `send_message_to`.
- `item.id` on `dynamicToolCall` is the stable invocation id and matches raw `function_call_output.call_id`.
- `item.success = false` and/or failure-like status is the reliable failure indicator for local dynamic tool completion.
- Existing `RuntimeMemoryEventAccumulator` lifecycle handling will persist dynamic tool traces once the normalized lifecycle events are emitted.

## Risks / Open Questions

- OQ-001: Some dynamic tool failures may encode error details only in `contentItems` text rather than an `error` field. The implementation should map a useful error string from existing parser helpers.
- OQ-002: Some dynamic tools may emit very fast `started` and `completed` events; frontend must tolerate immediate `executing -> success` transitions.
- OQ-003: Browser dynamic tools currently rely on special-case terminal mapping. Generalizing lifecycle must avoid duplicate browser terminal events.
- OQ-004: If any dynamic tool lacks an `item/completed` event, local synthetic lifecycle events from the dynamic tool request handler may be a follow-up fallback, but the probe shows raw `item/completed` exists for the current Codex app-server.

## Requirement-To-Use-Case Coverage

- REQ-001 -> UC-001, UC-002, UC-003, UC-004
- REQ-002 -> UC-004
- REQ-003 -> UC-001, UC-003, UC-005
- REQ-004 -> UC-001, UC-003, UC-005, UC-006
- REQ-005 -> UC-002, UC-003
- REQ-006 -> UC-004
- REQ-007 -> UC-001, UC-002
- REQ-008 -> UC-006
- REQ-009 -> UC-003
- REQ-010 -> UC-006
- REQ-011 -> UC-005

## Acceptance-Criteria-To-Scenario Intent

- AC-001 -> Dynamic tool start conversion scenario.
- AC-002 -> Successful dynamic tool completion conversion scenario.
- AC-003 -> Failed dynamic tool completion conversion scenario.
- AC-004 -> Live generic dynamic-tool regression scenario.
- AC-005 -> Live Codex team `send_message_to` Activity lifecycle scenario.
- AC-006 -> Invocation identity consistency scenario.
- AC-007 -> Memory lifecycle persistence scenario.
- AC-008 -> Existing tool-surface regression scenario.

## Approval Status

User approved revised pivot scope on 2026-05-01. Ready for architecture review and implementation planning.
