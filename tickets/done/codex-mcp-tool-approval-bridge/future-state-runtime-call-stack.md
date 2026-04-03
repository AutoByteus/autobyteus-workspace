# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v3`
- Requirements: `tickets/done/codex-mcp-tool-approval-bridge/requirements.md` (status `Refined`)
- Source Artifact: `tickets/done/codex-mcp-tool-approval-bridge/proposed-design.md`
- Source Design Version: `v3`
- Referenced Sections:
  - Spine inventory sections: `Data-Flow Spine Inventory`, `Spine Narratives`
  - Ownership sections: `Ownership Map`, `Subsystem / Capability-Area Allocation`

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001, DS-003, DS-004, DS-005 | Primary End-to-End | `CodexThread` | Requirement | R-001, R-002, R-005, R-007 | N/A | Manual MCP tool approval stays visible and reaches terminal success | Yes/Yes/Yes |
| UC-002 | DS-002, DS-003, DS-004, DS-005 | Primary End-to-End | `CodexThread` | Requirement | R-001, R-003, R-004, R-005, R-006, R-007 | N/A | Auto-approved MCP tool call stays visible and reaches terminal success without a public approval stop | Yes/Yes/Yes |
| UC-003 | DS-004 | Return-Event | `CodexItemEventPayloadParser` | Requirement | R-004, R-007 | N/A | Raw `mcpToolCall` items normalize into public `tool_call` segments | Yes/N/A/Yes |
| UC-004 | DS-003, DS-004 | Return-Event | `CodexThread` | Requirement | R-005, R-007 | N/A | Completed `mcpToolCall` payloads normalize into terminal public execution events | Yes/N/A/Yes |
| UC-005 | DS-005 | Bounded Local | frontend stream handlers | Design-Risk | R-006, R-007 | Ensure explicit terminal lifecycle beats fallback `parsed` state in Activity | Yes/N/A/Yes |

## Transition Notes

- Temporary migration behavior needed to reach target state: `None. The target behavior adds terminal completion normalization inside the existing Codex thread/event owners without introducing a compatibility path.`
- Retirement plan for temporary logic (if any): `N/A`

## Use Case: UC-001 [Manual MCP tool approval stays visible and reaches terminal success]

### Spine Context

- Spine ID(s): `DS-001`, `DS-003`, `DS-004`, `DS-005`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `CodexThread`
- Why This Use Case Matters To This Spine: `Manual mode is the baseline approval contract and must keep working while terminal MCP completion normalization is added.`

### Goal

Surface a public approval request for a real `tts/speak` MCP tool call, accept approval, keep the tool visible in the frontend, and let the tool complete with explicit terminal success.

### Preconditions

- A Codex run is active with a pending `mcpToolCall` for `tts/speak`.
- `autoExecuteTools=false`.
- The `tts` MCP server is ready.

### Expected Outcome

- Public websocket events include `SEGMENT_START(segment_type="tool_call")`, `TOOL_APPROVAL_REQUESTED`, `TOOL_APPROVED`, `TOOL_EXECUTION_SUCCEEDED`, `SEGMENT_END`, and `TOOL_LOG={"ok":true}`.
- The frontend Activity pane shows the `speak` tool call through approval and completion and ends in `success`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-client-thread-router.ts:handleAppServerNotification(...)
├── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts:handleAppServerNotification(...)
│   └── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts:handleAppServerNotification(...)
│       └── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts:trackPendingMcpToolCall(...) [STATE]
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts:convert(...)
└── autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts:convertCodexItemEvent(...)
    ├── autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts:resolveSegmentType(...)
    └── # emits SEGMENT_START with segment_type="tool_call"
[ENTRY] autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts:handleSegmentStart(...)
└── autobyteus-web/stores/agentActivityStore.ts:addActivity(...) [STATE]
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-client-thread-router.ts:handleAppServerRequest(...)
├── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts:handleAppServerRequest(...)
│   └── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-server-request-handler.ts:handleAppServerRequest(...)
│       └── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-server-request-handler.ts:handleMcpToolApprovalRequest(...)
│           ├── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts:findPendingMcpToolCall(...) [STATE]
│           ├── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts:recordApprovalRecord(...) [STATE]
│           └── # emits LOCAL_TOOL_APPROVAL_REQUESTED
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts:convert(...)
└── autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts:convertCodexItemEvent(...)
    └── # emits TOOL_APPROVAL_REQUESTED
[ENTRY] autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts:handleToolApprovalRequested(...)
└── autobyteus-web/stores/agentActivityStore.ts:updateActivityStatus(...) [STATE]
[ENTRY] autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts:handleToolApproval(...)
├── autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts:approveToolInvocation(...) [ASYNC]
│   └── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts:approveTool(...)
│       ├── codex app-server respondSuccess(requestId, { action: "accept" }) [IO]
│       └── # emits LOCAL_TOOL_APPROVED
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts:convert(...)
└── autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts:convertCodexItemEvent(...)
    └── # emits TOOL_APPROVED
[ENTRY] autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts:handleToolApproved(...)
└── autobyteus-web/stores/agentActivityStore.ts:updateActivityStatus(...) [STATE]
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-client-thread-router.ts:handleAppServerNotification(...)
├── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts:handleAppServerNotification(...)
│   └── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts:handleAppServerNotification(...)
│       ├── # emits LOCAL_MCP_TOOL_EXECUTION_COMPLETED
│       └── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts:completePendingMcpToolCall(...) [STATE]
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts:convert(...)
└── autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts:convertCodexItemEvent(...)
    └── # emits TOOL_EXECUTION_SUCCEEDED
[ENTRY] autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts:handleToolExecutionSucceeded(...)
└── autobyteus-web/stores/agentActivityStore.ts:updateActivityStatus(..., "success") [STATE]
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts:convert(...)
└── autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts:convertCodexItemEvent(...)
    └── # emits SEGMENT_END for the raw item/completed payload
[ENTRY] autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts:handleSegmentEnd(...)
└── # finalizes the segment without downgrading terminal state
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-raw-response-event-converter.ts:convertCodexRawResponseEvent(...)
└── # emits TOOL_LOG from function_call_output
```

### Branching / Fallback Paths

```text
[FALLBACK] if the MCP approval payload is not the supported simple tool-approval form
autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-server-request-handler.ts:handleMcpToolApprovalRequest(...)
└── codex app-server respondError(requestId, -32602, "Unsupported MCP elicitation payload for tool approval bridge.") [IO]
```

```text
[ERROR] if no pending MCP tool call matches the approval request
autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-server-request-handler.ts:handleMcpToolApprovalRequest(...)
└── codex app-server respondError(requestId, -32602, "MCP tool approval request did not match a pending MCP tool call.") [IO]
```

### State And Data Transformations

- `mcpToolCall item` -> pending-call registry entry (`invocationId`, `turnId`, `serverName`, `toolName`, `arguments`)
- raw Codex `item.type="mcpToolCall"` -> public `SEGMENT_START.segment_type="tool_call"`
- manual approval -> local approval record -> public `TOOL_APPROVAL_REQUESTED` / `TOOL_APPROVED`
- completed `mcpToolCall` payload -> local MCP completion event -> public `TOOL_EXECUTION_SUCCEEDED`
- `function_call_output` -> public `TOOL_LOG.log_entry`

### Observability And Debug Points

- Raw request debug: `CodexAppServerRequest` console trace
- Raw/runtime event debug: `CODEX_THREAD_EVENT_DEBUG`, `CODEX_THREAD_RAW_EVENT_DEBUG`, `RUNTIME_RAW_EVENT_DEBUG`
- Frontend reducer debug point: `toolLifecycleHandler.ts` and `segmentHandler.ts`

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None for this use case.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 [Auto-approved MCP tool call stays visible and reaches terminal success without a public approval stop]

### Spine Context

- Spine ID(s): `DS-002`, `DS-003`, `DS-004`, `DS-005`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `CodexThread`
- Why This Use Case Matters To This Spine: `This is the exact product bug the user verified in the Electron build.`

### Goal

Allow the real `tts/speak` MCP tool to complete in auto mode without exposing a public approval request stop while still showing the tool call in the frontend and ending in terminal success.

### Preconditions

- A Codex run is active with a pending `mcpToolCall` for `tts/speak`.
- `autoExecuteTools=true`.
- The `tts` MCP server is ready.

### Expected Outcome

- No public `TOOL_APPROVAL_REQUESTED` event.
- Public websocket events include `SEGMENT_START(segment_type="tool_call")`, `TOOL_APPROVED`, `TOOL_EXECUTION_SUCCEEDED`, `SEGMENT_END`, and `TOOL_LOG={"ok":true}`.
- The frontend Activity pane shows the `speak` tool call and ends in `success` instead of `parsed`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-client-thread-router.ts:handleAppServerNotification(...)
├── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts:handleAppServerNotification(...)
│   └── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts:handleAppServerNotification(...)
│       └── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts:trackPendingMcpToolCall(...) [STATE]
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts:convert(...)
└── autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts:convertCodexItemEvent(...)
    └── # emits SEGMENT_START with segment_type="tool_call"
[ENTRY] autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts:handleSegmentStart(...)
└── autobyteus-web/stores/agentActivityStore.ts:addActivity(...) [STATE]
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-client-thread-router.ts:handleAppServerRequest(...)
├── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts:handleAppServerRequest(...)
│   └── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-server-request-handler.ts:handleAppServerRequest(...)
│       └── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-server-request-handler.ts:handleMcpToolApprovalRequest(...)
│           ├── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts:findPendingMcpToolCall(...) [STATE]
│           ├── codex app-server respondSuccess(requestId, { action: "accept" }) [IO]
│           └── # emits LOCAL_TOOL_APPROVED without recording a user-facing approval stop
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts:convert(...)
└── autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts:convertCodexItemEvent(...)
    └── # emits TOOL_APPROVED
[ENTRY] autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts:handleToolApproved(...)
└── autobyteus-web/stores/agentActivityStore.ts:updateActivityStatus(..., "approved") [STATE]
[ENTRY] codex app-server serverRequest/resolved notification
└── # internal handshake completes with no public TOOL_APPROVAL_REQUESTED exposure
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-client-thread-router.ts:handleAppServerNotification(...)
├── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts:handleAppServerNotification(...)
│   └── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts:handleAppServerNotification(...)
│       ├── # emits LOCAL_MCP_TOOL_EXECUTION_COMPLETED
│       └── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts:completePendingMcpToolCall(...) [STATE]
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts:convert(...)
└── autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts:convertCodexItemEvent(...)
    └── # emits TOOL_EXECUTION_SUCCEEDED
[ENTRY] autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts:handleToolExecutionSucceeded(...)
└── autobyteus-web/stores/agentActivityStore.ts:updateActivityStatus(..., "success") [STATE]
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts:convert(...)
└── autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts:convertCodexItemEvent(...)
    └── # emits SEGMENT_END for the raw item/completed payload
[ENTRY] autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts:handleSegmentEnd(...)
└── # finalizes the segment without downgrading terminal state
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-raw-response-event-converter.ts:convertCodexRawResponseEvent(...)
└── # emits TOOL_LOG from function_call_output
```

### Branching / Fallback Paths

```text
[FALLBACK] if tool completion reports a failure status
codex-thread-notification-handler.ts:handleAppServerNotification(...)
└── LOCAL_MCP_TOOL_EXECUTION_COMPLETED -> codex-item-event-converter.ts:convertCodexItemEvent(...) -> TOOL_EXECUTION_FAILED
```

```text
[ERROR] if the internal approval request cannot be matched to a pending tool call
autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-server-request-handler.ts:handleMcpToolApprovalRequest(...)
└── codex app-server respondError(requestId, -32602, "MCP tool approval request did not match a pending MCP tool call.") [IO]
```

### State And Data Transformations

- raw `mcpToolCall` -> frontend-visible `tool_call` segment metadata and arguments
- matched approval request + `autoExecuteTools=true` -> immediate accept response + public `TOOL_APPROVED`
- completed `mcpToolCall` -> public `TOOL_EXECUTION_SUCCEEDED` from the synthetic local completion event
- raw `ITEM_COMPLETED` -> `SEGMENT_END` for segment finalization only
- `function_call_output` -> public `TOOL_LOG.log_entry`

### Observability And Debug Points

- Live debug stdout shows internal `mcpServer/elicitation/request` before `serverRequest/resolved`
- Websocket contract now shows `segment_type="tool_call"`, `TOOL_APPROVED`, and `TOOL_EXECUTION_SUCCEEDED`
- Frontend Activity pane should show terminal `success`

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None for this use case.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 [Raw `mcpToolCall` items normalize into public `tool_call` segments]

### Spine Context

- Spine ID(s): `DS-004`
- Spine Scope: `Return-Event`
- Governing Owner: `CodexItemEventPayloadParser`
- Why This Use Case Matters To This Spine: `The terminal MCP fix must not regress the already-correct visibility normalization boundary.`

### Goal

Convert raw Codex `mcpToolCall` items into the same public `tool_call` segment type already understood by the current websocket/frontend contract.

### Preconditions

- The Codex event converter receives `item/started` or `item/completed` payloads whose raw `item.type` is `mcpToolCall`.

### Expected Outcome

- `resolveSegmentType(...)` returns `tool_call`.
- `SEGMENT_START` metadata includes the normalized tool name and arguments.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts:convert(...)
└── autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts:convertCodexItemEvent(...)
    ├── autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts:resolveItemType(...)
    ├── autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts:resolveSegmentType(...)
    ├── autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts:resolveSegmentMetadata(...)
    └── # emits SEGMENT_START with id=<invocationId>, segment_type="tool_call", metadata.tool_name=<tool>
```

### Branching / Fallback Paths

```text
[ERROR] if raw item payload is malformed and cannot resolve an invocation id
autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts:resolveSegmentStartId(...)
└── fallback to resolveSegmentId(...) # event still remains typed as tool_call
```

### State And Data Transformations

- raw `item.type="mcpToolCall"` -> normalized `segment_type="tool_call"`
- raw item fields -> `metadata.tool_name`, `metadata.arguments`

### Observability And Debug Points

- Unit parser/converter tests validate the normalized segment type
- Live websocket E2E validates that the MCP path is tool-visible before terminal lifecycle is asserted

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 [Completed `mcpToolCall` payloads normalize into terminal public execution events]

### Spine Context

- Spine ID(s): `DS-003`, `DS-004`
- Spine Scope: `Return-Event`
- Governing Owner: `CodexThread`
- Why This Use Case Matters To This Spine: `This is the actual missing provider-to-public-contract bridge.`

### Goal

Convert completed Codex `mcpToolCall` provider payloads into public `TOOL_EXECUTION_SUCCEEDED` or `TOOL_EXECUTION_FAILED` while retaining raw `SEGMENT_END` finalization.

### Preconditions

- Codex emits `item/completed` for `mcpToolCall` with terminal `status`, `result`, and/or `error` fields.

### Expected Outcome

- `codex-thread-notification-handler.ts` emits one synthetic local MCP completion event.
- `codex-item-event-converter.ts` converts that event to `TOOL_EXECUTION_SUCCEEDED` or `TOOL_EXECUTION_FAILED`.
- The raw `ITEM_COMPLETED` payload still emits `SEGMENT_END`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-client-thread-router.ts:handleAppServerNotification(...)
├── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts:handleAppServerNotification(...)
│   └── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts:handleAppServerNotification(...)
│       ├── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts:emitEvent(...) # LOCAL_MCP_TOOL_EXECUTION_COMPLETED
│       └── autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts:completePendingMcpToolCall(...) [STATE]
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts:convert(...)
└── autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts:convertCodexItemEvent(...)
    ├── autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts:isExecutionFailure(...)
    ├── autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts:resolveToolResult(...)
    ├── autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts:resolveToolError(...)
    └── # emits TOOL_EXECUTION_SUCCEEDED or TOOL_EXECUTION_FAILED
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts:convert(...)
└── autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts:convertCodexItemEvent(...)
    └── # separately emits SEGMENT_END for the raw item/completed payload
```

### Branching / Fallback Paths

```text
[ERROR] if provider completion omits result and error but still reports a terminal success status
codex-item-event-payload-parser.ts:resolveToolResult(...)
└── fallback to a minimal success payload derived from status
```

### State And Data Transformations

- raw completed `mcpToolCall` payload -> synthetic local completion event
- synthetic local completion event + `status/result/error` -> public `TOOL_EXECUTION_SUCCEEDED` or `TOOL_EXECUTION_FAILED`
- raw `item/completed` payload -> `SEGMENT_END`

### Observability And Debug Points

- Raw JSONL logs show `item/completed` for `mcpToolCall`
- Unit converter tests validate success and failure mapping
- Live websocket E2E validates the resulting public terminal event

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-005 [Frontend Activity reaches terminal state instead of fallback `parsed`]

### Spine Context

- Spine ID(s): `DS-005`
- Spine Scope: `Bounded Local`
- Governing Owner: frontend stream handlers
- Why This Use Case Matters To This Spine: `The user-visible acceptance condition is a green terminal MCP tool state, not merely a visible tool row.`

### Goal

Ensure explicit terminal execution lifecycle events win, so the frontend Activity pane ends in `success` or `error` rather than fallback `parsed`.

### Preconditions

- A tool activity already exists in the frontend from `SEGMENT_START` or a synthetic lifecycle segment.
- `TOOL_EXECUTION_SUCCEEDED` or `TOOL_EXECUTION_FAILED` arrives before or around `SEGMENT_END`.

### Expected Outcome

- `handleToolExecutionSucceeded(...)` or `handleToolExecutionFailed(...)` sets terminal status.
- A later `SEGMENT_END` finalizes arguments/metadata but does not overwrite terminal state.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts:handleToolExecutionSucceeded(...)
├── autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts:ensureToolLifecycleSegment(...)
├── autobyteus-web/services/agentStreaming/handlers/toolLifecycleState.ts:applyExecutionSucceededState(...)
└── autobyteus-web/stores/agentActivityStore.ts:updateActivityStatus(..., "success") [STATE]
[ENTRY] autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts:handleSegmentEnd(...)
└── # finalizes metadata and preserves terminal status
```

### Branching / Fallback Paths

```text
[ERROR] if the terminal lifecycle event arrives before any segment exists
autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts:ensureToolLifecycleSegment(...)
└── create synthetic tool segment/activity and then apply terminal state
```

### State And Data Transformations

- `TOOL_EXECUTION_SUCCEEDED` -> activity status `success` + result payload
- `TOOL_EXECUTION_FAILED` -> activity status `error` + error payload
- later `SEGMENT_END` -> metadata finalization only

### Observability And Debug Points

- Frontend lifecycle handler tests validate terminal-state transitions
- Live UI verification validates the Activity badge color/state

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
