# Implementation Plan - Server Slice (v2)

## Objective

Implement server transport support for explicit tool lifecycle events so frontend can receive per-invocation updates immediately.

## Design Inputs

1. `/Users/normy/autobyteus_org/autobyteus-server-ts/tickets/multi_tool_incremental_ui_feedback_ticket/proposed-design.md`
2. `/Users/normy/autobyteus_org/autobyteus-ts/tickets/multi_tool_incremental_ui_feedback_ticket/proposed-design.md` (Revised v13)

## Work Breakdown

### Step 1: Protocol model updates

Files:
- `/Users/normy/autobyteus_org/autobyteus-server-ts/src/services/agent-streaming/models.ts`

Tasks:
1. Add `ServerMessageType` enum values:
- `TOOL_APPROVED`
- `TOOL_DENIED`
- `TOOL_EXECUTION_STARTED`
- `TOOL_EXECUTION_SUCCEEDED`
- `TOOL_EXECUTION_FAILED`

2. Remove legacy `TOOL_AUTO_EXECUTING` path; keep `TOOL_LOG` as diagnostics-only.

### Step 2: Stream mapping updates

Files:
- `/Users/normy/autobyteus_org/autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`

Tasks:
1. Map new stream event types to new server message types.
2. Preserve existing mappings for non-tool events.

### Step 3: Shared serializer utility

Files:
- `/Users/normy/autobyteus_org/autobyteus-server-ts/src/services/agent-streaming/payload-serialization.ts` (new)
- `/Users/normy/autobyteus_org/autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`

Tasks:
1. Implement shared `serializePayload(...)` helper.
2. Ensure helper always returns JSON-safe object.
3. Replace both local `toPayload` implementations.

### Step 4: Team parity verification

Files:
- `/Users/normy/autobyteus_org/autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`

Tasks:
1. Confirm team rebroadcast path carries new lifecycle payloads with member metadata.
2. Confirm no lifecycle-specific branching duplication in team handler.

### Step 5: Tests

Tasks:
1. Unit: `convertStreamEvent(...)` mapping for all new lifecycle types.
2. Unit: team rebroadcast includes `agent_name`/`agent_id` for lifecycle events.
3. Unit: serializer circular payload fallback remains JSON-safe.

## Risk Gates

1. Fail if any new lifecycle type is missing in `ServerMessageType`.
2. Fail if single-agent and team mappings diverge.
3. Fail if serializer can still return raw non-serializable object.

## Completion Gate

1. All server-slice conformance rows in review doc are `Pass`.
2. No duplicated serializer helpers remain.
