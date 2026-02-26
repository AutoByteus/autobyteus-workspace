# Implementation Plan (Revised v13)

## Objective

Implement clean-cut runtime lifecycle semantics in `autobyteus-ts` so each tool invocation reports explicit lifecycle progress immediately while LLM continuation remains batch-gated per turn, stale events cannot corrupt settlement, and in-repo stream consumers render the new lifecycle family.

## Scope Boundaries

1. In scope: `autobyteus-ts` runtime + stream + in-repo stream consumers (no backward compatibility).
2. Out of scope for this file: server/web transport consumption (tracked in repo-local tickets under `autobyteus-server-ts` and `autobyteus-web`).

## Design Inputs

1. `/Users/normy/autobyteus_org/autobyteus-ts/tickets/multi_tool_incremental_ui_feedback_ticket/proposed-design.md` (Revised v13)
2. `/Users/normy/autobyteus_org/autobyteus-ts/tickets/multi_tool_incremental_ui_feedback_ticket/design-based-runtime-call-stack.md` (Revised v13)
3. `/Users/normy/autobyteus_org/autobyteus-ts/tickets/multi_tool_incremental_ui_feedback_ticket/runtime-call-stack-review.md` (Revised v13)

## Work Breakdown

### Step 1: Introduce explicit lifecycle event family (runtime notifier layer)

Files:
- `autobyteus-ts/src/events/event-types.ts`
- `autobyteus-ts/src/agent/events/notifiers.ts`

Tasks:
1. Add explicit lifecycle event keys/APIs: `TOOL_APPROVAL_REQUESTED`, `TOOL_APPROVED`, `TOOL_DENIED`, `TOOL_EXECUTION_STARTED`, `TOOL_EXECUTION_SUCCEEDED`, `TOOL_EXECUTION_FAILED`.
2. Remove legacy lifecycle key/API for `TOOL_INVOCATION_AUTO_EXECUTING`.

### Step 2: Unify tool execution path

Files:
- `autobyteus-ts/src/agent/events/agent-events.ts`
- `autobyteus-ts/src/agent/handlers/tool-invocation-request-event-handler.ts`
- `autobyteus-ts/src/agent/handlers/tool-execution-approval-event-handler.ts`
- `autobyteus-ts/src/agent/handlers/tool-invocation-execution-event-handler.ts` (new)
- `autobyteus-ts/src/agent/handlers/approved-tool-invocation-event-handler.ts` (remove)

Tasks:
1. Add `ExecuteToolInvocationEvent`.
2. Convert request handler to gating-only.
3. Convert approval handler to decision-only + denial normalization + stale approval no-op.
4. Implement execution handler as single owner of tool execution logic.
5. Remove approved-only execution handler.

### Step 3: Replace count-based turn model with unique settlement model + turn correlation

Files:
- `autobyteus-ts/src/agent/tool-invocation-turn.ts` (new)
- `autobyteus-ts/src/agent/context/agent-runtime-state.ts`
- `autobyteus-ts/src/agent/context/recent-settled-invocation-cache.ts` (new)
- `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts`
- `autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts`
- `autobyteus-ts/src/agent/tool-invocation.ts` (remove batch model)

Tasks:
1. Introduce `ToolInvocationTurn` with `turnId`, ordered expected IDs, and settled map.
2. Add result acceptance checks for invocation membership and optional `turnId` match.
3. Add `RecentSettledInvocationCache` with bounded capacity + TTL policy.
4. Migrate runtime state to active-turn model + bounded recent-settled guard.
5. Dispatch continuation only when all expected IDs are settled.

### Step 4: Queue policy correction

File:
- `autobyteus-ts/src/agent/events/agent-input-event-queue-manager.ts`

Tasks:
1. Reorder priority to process `toolResultInputQueue` before `toolInvocationRequestQueue`.

### Step 5: Stream contract modernization (clean-cut)

Files:
- `autobyteus-ts/src/agent/streaming/events/stream-event-payloads.ts`
- `autobyteus-ts/src/agent/streaming/events/stream-events.ts`
- `autobyteus-ts/src/agent/streaming/streams/agent-event-stream.ts`

Tasks:
1. Add explicit lifecycle stream types/payloads.
2. Remove legacy `TOOL_INVOCATION_AUTO_EXECUTING` stream type/payload.
3. Map notifier lifecycle events directly to explicit lifecycle stream events.
4. Validate denied path remains terminal without execution-started mapping.

### Step 6: In-repo consumer adaptation

Files:
- `autobyteus-ts/src/cli/agent/cli-display.ts`
- `autobyteus-ts/src/cli/agent-team/widgets/focus-pane-history.ts`
- `autobyteus-ts/src/cli/agent-team/state-store.ts`

Tasks:
1. Replace legacy auto-executing branch handling with explicit lifecycle family rendering.
2. Preserve approval UX by mapping `TOOL_APPROVAL_REQUESTED` and lifecycle terminal transitions.
3. Ensure consumer logic does not depend on `TOOL_LOG` to infer lifecycle state.

## Verification Plan

1. Unit: explicit lifecycle notifier emissions for requested/approved/denied/started/succeeded/failed.
2. Unit: denial path enqueues normalized denied `ToolResultEvent` (no direct LLM bypass).
3. Unit: stale/unknown approval decision is ignored (no execution/result enqueue).
4. Unit: duplicate result does not increase settled count.
5. Unit: turn-mismatched result is ignored and cannot settle active turn.
6. Unit: late duplicate suppression after turn cleanup.
7. Unit: `RecentSettledInvocationCache` capacity+TTL eviction behavior is bounded and correct.
8. Unit: queue priority dispatches result before invocation request.
9. Unit: stream mapping contains explicit lifecycle family and omits legacy auto-executing lifecycle type.
10. Integration: mixed approved+denied multi-tool turn emits exactly one continuation.
11. Integration: CLI/team consumers render explicit lifecycle events and never require legacy auto-executing type.

## Risk Gates

1. Fail merge if any legacy lifecycle event path remains (`TOOL_INVOCATION_AUTO_EXECUTING`).
2. Fail merge if denial still bypasses tool-result aggregation.
3. Fail merge if turn completion remains count-based.
4. Fail merge if stale approval can still trigger execution.
5. Fail merge if turn-mismatched results can affect settlement.
6. Fail merge if recent-settled suppression cache has unbounded growth.
7. Fail merge if queue priority still favors invocation request over result.
8. Fail merge if CLI/team consumers still reference legacy auto-executing lifecycle event.

## Completion Gate

1. All Section B conformance rows in revised v13 review are `Pass`.
2. No unresolved separation-of-concerns smell remains in runtime execution/approval/result ownership.
3. No backward-compatibility lifecycle path remains in `autobyteus-ts` runtime-stream-consumer layers.
