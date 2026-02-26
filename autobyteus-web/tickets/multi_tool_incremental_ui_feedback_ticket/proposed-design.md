# Multi-Tool Incremental UI Feedback - Frontend Design (v2)

## 0) Triage

- Scope classification: Medium
- Reason:
  - Protocol type expansion.
  - Dispatch-path updates in both single-agent and team streaming services.
  - Lifecycle-state ownership refactor (parser/state/router split + store dual-writer cleanup).

## 1) Requirements And Scope

### Goals

1. Apply per-invocation lifecycle updates immediately from explicit lifecycle events.
2. Stop using `TOOL_LOG` text parsing as lifecycle authority.
3. Keep team member routing parity with single-agent flow.
4. Ensure lifecycle state transitions are monotonic and terminal-safe.
5. Enforce clean-cut migration with no legacy lifecycle compatibility branch.

### Non-goals

1. No websocket transport changes in frontend repo.
2. No runtime aggregation changes in frontend repo.
3. No redesign of unrelated segment rendering.

## 2) Design Basis

- Master contract:
  - `/Users/normy/autobyteus_org/autobyteus-ts/tickets/multi_tool_incremental_ui_feedback_ticket/proposed-design.md` (Revised v13)

## 3) Target Architecture (Frontend Slice)

### A) Protocol types

Add server message union/types for:

- `TOOL_APPROVED`
- `TOOL_DENIED`
- `TOOL_EXECUTION_STARTED`
- `TOOL_EXECUTION_SUCCEEDED`
- `TOOL_EXECUTION_FAILED`

Keep:

- `TOOL_APPROVAL_REQUESTED`
- `TOOL_LOG`

### B) Dispatch path

Update both:

- `AgentStreamingService.dispatchMessage(...)`
- `TeamStreamingService.dispatchMessage(...)`

to route the explicit lifecycle family.

### C) Lifecycle state ownership

Split concerns:

1. `toolLifecycleHandler.ts`: routing only.
2. `toolLifecycleParsers.ts` (new): payload parse/validation only.
3. `toolLifecycleState.ts` (new): state transitions only.

Rules:

1. Terminal precedence: denied/failed/succeeded are terminal and cannot be regressed.
2. Non-terminal monotonic progression: `REQUESTED -> APPROVED -> STARTED` only.
3. Invalid payloads are dropped with warning and no state mutation.

### D) Store ownership cleanup

`agentRunStore.ts` and `agentTeamRunStore.ts` must stop optimistic lifecycle status mutation on approve/deny actions; lifecycle updates come from stream events only.

## 4) Separation Of Concerns (Frontend Slice)

1. `protocol/messageTypes.ts`: transport contracts only.
2. `AgentStreamingService.ts` / `TeamStreamingService.ts`: message dispatch only.
3. `handlers/toolLifecycleParsers.ts`: payload validity and normalization only.
4. `handlers/toolLifecycleState.ts`: lifecycle transition logic only.
5. `handlers/toolLifecycleHandler.ts`: orchestration/routing only.
6. `stores/agentRunStore.ts` / `stores/agentTeamRunStore.ts`: command dispatch only.

## 5) Delta-Aware Change Inventory

### Add

1. `/Users/normy/autobyteus_org/autobyteus-web/services/agentStreaming/handlers/toolLifecycleParsers.ts`
2. `/Users/normy/autobyteus_org/autobyteus-web/services/agentStreaming/handlers/toolLifecycleState.ts`

### Modify

1. `/Users/normy/autobyteus_org/autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`
- Add explicit lifecycle message types/payloads.

2. `/Users/normy/autobyteus_org/autobyteus-web/services/agentStreaming/AgentStreamingService.ts`
- Dispatch explicit lifecycle messages.

3. `/Users/normy/autobyteus_org/autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
- Dispatch explicit lifecycle messages with member context.

4. `/Users/normy/autobyteus_org/autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts`
- Keep routing only; move parse/state logic out.

5. `/Users/normy/autobyteus_org/autobyteus-web/stores/agentRunStore.ts`
- Remove optimistic status mutation on approval/denial.

6. `/Users/normy/autobyteus_org/autobyteus-web/stores/agentTeamRunStore.ts`
- Remove optimistic status mutation on approval/denial.

### Remove / Deprecate

1. Lifecycle completion/error derivation from `TOOL_LOG` parsing as primary source.
2. Legacy lifecycle event `TOOL_AUTO_EXECUTING` handling path.

## 6) Frontend-Slice Use-Case Guarantees

1. Each tool invocation transitions independently as lifecycle events arrive.
2. Terminal lifecycle states do not regress due to late logs.
3. Out-of-order non-terminal events do not regress state.
4. Team member contexts only mutate for matching member lifecycle events.
5. Approve/deny actions do not mutate lifecycle state directly in stores.
