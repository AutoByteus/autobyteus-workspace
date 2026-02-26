# Implementation Plan - Frontend Slice (v2)

## Objective

Implement frontend handling for explicit lifecycle events so each tool invocation updates in real time without waiting for all tools in the turn.

## Design Inputs

1. `/Users/normy/autobyteus_org/autobyteus-web/tickets/multi_tool_incremental_ui_feedback_ticket/proposed-design.md`
2. `/Users/normy/autobyteus_org/autobyteus-ts/tickets/multi_tool_incremental_ui_feedback_ticket/proposed-design.md` (Revised v13)

## Work Breakdown

### Step 1: Protocol message types

File:
- `/Users/normy/autobyteus_org/autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`

Tasks:
1. Add message/payload types for:
- `TOOL_APPROVED`
- `TOOL_DENIED`
- `TOOL_EXECUTION_STARTED`
- `TOOL_EXECUTION_SUCCEEDED`
- `TOOL_EXECUTION_FAILED`

### Step 2: Dispatch updates

Files:
- `/Users/normy/autobyteus_org/autobyteus-web/services/agentStreaming/AgentStreamingService.ts`
- `/Users/normy/autobyteus_org/autobyteus-web/services/agentStreaming/TeamStreamingService.ts`

Tasks:
1. Route all explicit lifecycle events to tool lifecycle handler.
2. Keep existing non-tool dispatch unchanged.

### Step 3: Lifecycle SoC split

Files:
- `/Users/normy/autobyteus_org/autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts`
- `/Users/normy/autobyteus_org/autobyteus-web/services/agentStreaming/handlers/toolLifecycleParsers.ts` (new)
- `/Users/normy/autobyteus_org/autobyteus-web/services/agentStreaming/handlers/toolLifecycleState.ts` (new)

Tasks:
1. Move payload validation into parser module.
2. Move transition logic into state module.
3. Keep handler as router/coordinator only.
4. Enforce terminal precedence and monotonic non-terminal progression.

### Step 4: Store dual-writer cleanup

Files:
- `/Users/normy/autobyteus_org/autobyteus-web/stores/agentRunStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-web/stores/agentTeamRunStore.ts`

Tasks:
1. Remove optimistic lifecycle status mutations in approval actions.
2. Keep only command dispatch to streaming services.

### Step 5: Tests

Tasks:
1. Unit: protocol and dispatch for all lifecycle messages.
2. Unit: parser validation rejects malformed lifecycle payloads.
3. Unit: state applier enforces terminal precedence.
4. Unit: out-of-order non-terminal events do not regress state.
5. Unit: stores do not mutate lifecycle status directly.

## Risk Gates

1. Fail if any lifecycle message type is missing from frontend protocol union.
2. Fail if team dispatch omits any lifecycle event handled by single-agent dispatch.
3. Fail if lifecycle completion still depends on `TOOL_LOG` parsing.
4. Fail if stores still optimistically mutate lifecycle status.

## Completion Gate

1. All frontend-slice review conformance rows are `Pass`.
2. Lifecycle ownership is single-writer (state module only).
