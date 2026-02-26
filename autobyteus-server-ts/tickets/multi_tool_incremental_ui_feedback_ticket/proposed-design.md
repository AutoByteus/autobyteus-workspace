# Multi-Tool Incremental UI Feedback - Server Transport Design (v2)

## 0) Triage

- Scope classification: Medium
- Reason:
  - Protocol/message-type expansion in websocket layer.
  - Cross-file mapping updates in single-agent and team handlers.
  - Serializer refactor for shared safety behavior.

## 1) Requirements And Scope

### Goals

1. Transport explicit lifecycle events from runtime to websocket clients.
2. Preserve existing non-tool stream behavior.
3. Keep team rebroadcast parity with single-agent mapping.
4. Guarantee JSON-safe payloads for all lifecycle messages.
5. Enforce clean-cut lifecycle migration with no legacy compatibility path.

### Non-goals

1. No runtime aggregation logic changes in this repo.
2. No frontend state mutation logic in this repo.
3. No GraphQL approval API schema changes.

## 2) Design Basis

- Upstream master ticket (runtime + cross-repo contract):
  - `/Users/normy/autobyteus_org/autobyteus-ts/tickets/multi_tool_incremental_ui_feedback_ticket/proposed-design.md` (Revised v13)

## 3) Target Architecture (Server Slice)

### A) Protocol/message types

Add websocket server message types:

- `TOOL_APPROVED`
- `TOOL_DENIED`
- `TOOL_EXECUTION_STARTED`
- `TOOL_EXECUTION_SUCCEEDED`
- `TOOL_EXECUTION_FAILED`

Retain existing:

- `TOOL_APPROVAL_REQUESTED`
- `TOOL_LOG` (diagnostic only)

### B) Stream mapping

Map runtime stream events to websocket messages in `AgentStreamHandler.convertStreamEvent(...)`.

Required mapping behavior:

1. New stream event -> matching websocket event name.
2. Unknown event types remain explicit error messages.
3. Existing non-tool event mappings unchanged.

### C) Team parity

`AgentTeamStreamHandler.convertTeamEvent(...)` must continue to reuse single-agent mapping and append member context (`agent_name`, `agent_id`) without lifecycle-specific branching.

### D) Serialization safety

Create shared serializer utility and use it in both handlers.

Rules:

1. Must return JSON-safe object only.
2. Circular/non-serializable payloads must be converted to safe fallback summary object.
3. No raw-object fallback allowed.

## 4) Separation Of Concerns (Server Slice)

1. `models.ts`: websocket protocol enums/types only.
2. `payload-serialization.ts` (new): JSON-safe payload conversion only.
3. `agent-stream-handler.ts`: stream-event -> websocket-message mapping only.
4. `agent-team-stream-handler.ts`: team envelope rebroadcast only.

## 5) Delta-Aware Change Inventory

### Add

1. `/Users/normy/autobyteus_org/autobyteus-server-ts/src/services/agent-streaming/payload-serialization.ts`

### Modify

1. `/Users/normy/autobyteus_org/autobyteus-server-ts/src/services/agent-streaming/models.ts`
- Add websocket message types for explicit lifecycle family.

2. `/Users/normy/autobyteus_org/autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- Add stream -> websocket mapping for explicit lifecycle family.
- Replace local serializer with shared serializer utility.

3. `/Users/normy/autobyteus_org/autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
- Replace local serializer with shared serializer utility.

### Remove / Deprecate

1. Local duplicated `toPayload` helpers in stream handlers.
2. Legacy websocket lifecycle event `TOOL_AUTO_EXECUTING`.

## 6) Server-Slice Use-Case Guarantees

1. Explicit runtime success/failure/denied lifecycle events are forwarded with matching websocket event names.
2. Team rebroadcast preserves member context for all lifecycle events.
3. Non-serializable payloads do not break `ServerMessage.toJson()`.
4. Existing non-tool stream behavior remains unchanged.
