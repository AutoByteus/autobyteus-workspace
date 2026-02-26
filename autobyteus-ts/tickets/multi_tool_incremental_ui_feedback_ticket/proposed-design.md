# Multi-Tool Incremental UI Feedback Design (Revised v13)

## 0) Triage

- Scope classification: Medium
- Reason:
  - `autobyteus-ts` runtime and stream contract require structural lifecycle and turn-accounting changes.
  - Current runtime behavior still reflects legacy lifecycle semantics and bypass paths.
  - Clean-cut migration (no backward compatibility) requires explicit removal and decommission planning.

## 1) Requirements And Scope

### Goals

1. In one multi-tool turn, each tool invocation publishes lifecycle progress independently as soon as it happens.
2. LLM continuation stays batch-gated and happens only after all invocations in the turn settle.
3. Denied invocations participate in the same turn aggregation path as executed invocations.
4. Runtime lifecycle is explicit and self-descriptive, not inferred from `TOOL_LOG` text.
5. Legacy lifecycle model and compatibility branches are removed (clean-cut, no backward compatibility).
6. Result/approval processing is turn-safe (stale or mismatched events cannot mutate active turn completion).
7. In-repo stream consumers (CLI/team widgets) consume the explicit lifecycle family and do not depend on legacy lifecycle names.

### Non-goals

1. No true parallel tool execution in this ticket.
2. No DB/storage schema work.
3. No feature-flag dual-run compatibility layer.

## 2) Current-State Analysis (Validated Against Updated `autobyteus-ts`)

### Existing strengths

1. Turn tracking (`turnId`) is present in runtime flow.
2. Streaming parser batches LLM-emitted tool invocations.
3. Tool results are aggregated before continuation when `activeToolInvocationBatch` exists.

### Confirmed gaps

1. Lifecycle is still legacy (`approval_requested` + `auto_executing` + `tool_log` parsing model).
2. Denial path bypasses result pipeline by enqueuing `LLMUserMessageReadyEvent` directly.
3. Turn completion is raw count-based (`results.length >= invocations.length`), not unique-invocation-based.
4. No late-duplicate suppression after turn cleanup.
5. Queue priority still processes invocation requests before tool results.
6. Tool execution logic is duplicated across direct-exec and approved-exec handlers.
7. Legacy event names remain active in notifier/stream layers.
8. Turn correlation checks are incomplete for stale result/approval events.
9. Runtime guard for recently settled invocations is not bounded by policy.
10. CLI/team stream consumers still depend on legacy `TOOL_INVOCATION_AUTO_EXECUTING` event semantics.

## 3) Target Architecture (Clean-Cut)

### A) Runtime lifecycle model (explicit family only)

Emit explicit lifecycle events from runtime notifier:

- `TOOL_APPROVAL_REQUESTED`
- `TOOL_APPROVED`
- `TOOL_DENIED`
- `TOOL_EXECUTION_STARTED`
- `TOOL_EXECUTION_SUCCEEDED`
- `TOOL_EXECUTION_FAILED`

No legacy lifecycle event retention (`TOOL_INVOCATION_AUTO_EXECUTING` removed).

### B) Unified execution flow

1. Replace split execution branches with one execution path (`ToolInvocationExecutionEventHandler`, new).
2. `ToolInvocationRequestEventHandler` decides approval-needed vs auto path only.
3. `ToolExecutionApprovalEventHandler` handles approval decision only:
- approve -> emit `TOOL_APPROVED`, enqueue `ExecuteToolInvocationEvent`.
- deny -> emit `TOOL_DENIED`, enqueue normalized denied `ToolResultEvent`.
- stale/unknown approval -> no-op plus diagnostic log.

### C) Turn aggregation invariants

1. Replace count-based `ToolInvocationBatch` with unique-invocation turn state (`ToolInvocationTurn`):
- `turnId`.
- ordered expected invocation IDs.
- `Map<invocationId, ToolResultEvent>` settled results.
2. Completion condition: `settledResultMap.size === expectedInvocationIds.length`.
3. Duplicate result for same invocation is idempotent replace, not extra progress.
4. Result eligibility checks before settle:
- active turn exists.
- invocation belongs to expected invocation set.
- if result includes `turnId`, it must match active turn `turnId`.
5. Add `RecentSettledInvocationCache` in runtime state:
- bounded capacity (LRU style).
- bounded retention window (TTL).
- used only for stale late-duplicate suppression.

### D) Queue policy

`toolResultInputQueue` is prioritized ahead of `toolInvocationRequestQueue` to prevent result starvation.

### E) Stream contract in `autobyteus-ts`

1. `EventType` and `StreamEventType` carry only explicit lifecycle family for lifecycle semantics.
2. `TOOL_LOG` remains diagnostics-only, never lifecycle authority.
3. `AgentEventStream` maps notifier lifecycle family directly to stream lifecycle family.
4. Per invocation, terminal lifecycle is single-shot (`SUCCEEDED` or `FAILED` or `DENIED`), never multiple terminal states.

### F) In-repo consumer adaptation contract

1. `src/cli/agent/cli-display.ts` renders explicit lifecycle events; no dependency on legacy auto-executing event.
2. `src/cli/agent-team/widgets/focus-pane-history.ts` renders explicit lifecycle events.
3. `src/cli/agent-team/state-store.ts` tracks pending approval/lifecycle state from explicit event family.
4. Consumer logic does not infer terminal state from `TOOL_LOG` content.

## 4) Protocol Contract (Runtime->Stream Slice)

### Lifecycle payload shape

```ts
{
  invocation_id: string;
  tool_name: string;
  turn_id?: string | null;
  agent_id?: string;
  agent_name?: string;
}
```

### Event-specific payloads

1. `TOOL_APPROVAL_REQUESTED`: `{ ...common, arguments: Record<string, unknown> }`
2. `TOOL_APPROVED`: `{ ...common, reason?: string | null }`
3. `TOOL_DENIED`: `{ ...common, reason?: string | null, error?: string | null }`
4. `TOOL_EXECUTION_STARTED`: `{ ...common, arguments?: Record<string, unknown> }`
5. `TOOL_EXECUTION_SUCCEEDED`: `{ ...common, result?: unknown | null }`
6. `TOOL_EXECUTION_FAILED`: `{ ...common, error: string }`

### Validity rules

1. `invocation_id` and `tool_name` are non-empty strings.
2. `TOOL_DENIED` carries `reason` or `error`.
3. `TOOL_EXECUTION_FAILED.error` is required.
4. For a single invocation, terminal lifecycle transitions are mutually exclusive.

## 5) Separation Of Concerns Contract (`autobyteus-ts`)

1. `ToolInvocationRequestEventHandler`: admission/gating only (approval request vs direct enqueue-to-execute).
2. `ToolExecutionApprovalEventHandler`: approval decision orchestration + denial normalization only.
3. `ToolInvocationExecutionEventHandler` (new): actual tool execution + started/success/failed emission only.
4. `ToolResultEventHandler`: result acceptance checks + turn completion orchestration only.
5. `ToolInvocationTurn` (new): unique settlement accounting only.
6. `RecentSettledInvocationCache` (new): late-duplicate suppression policy only (bounded LRU+TTL).
7. `AgentRuntimeState`: pending approvals + active turn + bounded recent-settled cache only.
8. `AgentEventStream`: notifier event -> stream event adaptation only.
9. CLI/team viewers: presentation-only mapping from stream lifecycle data.

## 6) Delta-Aware Change Inventory

### Add

1. `autobyteus-ts/src/agent/handlers/tool-invocation-execution-event-handler.ts`
2. `autobyteus-ts/src/agent/handlers/tool-lifecycle-payload.ts`
3. `autobyteus-ts/src/agent/tool-invocation-turn.ts`
4. `autobyteus-ts/src/agent/context/recent-settled-invocation-cache.ts`

### Modify

1. `autobyteus-ts/src/events/event-types.ts`
- Add explicit lifecycle event keys.
- Remove legacy `agent_tool_invocation_auto_executing` lifecycle key.

2. `autobyteus-ts/src/agent/events/notifiers.ts`
- Add explicit lifecycle notifier APIs.
- Remove legacy `notifyAgentToolInvocationAutoExecuting` lifecycle notifier.

3. `autobyteus-ts/src/agent/events/agent-events.ts`
- Add `ExecuteToolInvocationEvent`.
- Simplify approval/execution event model for unified execution path.

4. `autobyteus-ts/src/agent/handlers/tool-invocation-request-event-handler.ts`
- Convert to gating-only handler.

5. `autobyteus-ts/src/agent/handlers/tool-execution-approval-event-handler.ts`
- Emit `TOOL_APPROVED`/`TOOL_DENIED`.
- Normalize denial to `ToolResultEvent`.
- Ignore stale/unknown approvals.

6. `autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts`
- Use unique-invocation turn accounting.
- Add invocation membership + turn correlation checks.
- Add late-duplicate suppression via bounded runtime guard.

7. `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts`
- Initialize `ToolInvocationTurn` instead of `ToolInvocationBatch`.

8. `autobyteus-ts/src/agent/events/agent-input-event-queue-manager.ts`
- Reorder priority: `toolResultInputQueue` before `toolInvocationRequestQueue`.

9. `autobyteus-ts/src/agent/context/agent-runtime-state.ts`
- Replace `activeToolInvocationBatch` with active-turn + bounded recent-settled cache.

10. `autobyteus-ts/src/agent/streaming/events/stream-events.ts`
- Replace legacy lifecycle stream enum with explicit lifecycle family.

11. `autobyteus-ts/src/agent/streaming/events/stream-event-payloads.ts`
- Add payload classes for explicit lifecycle family.
- Remove legacy auto-executing payload class.

12. `autobyteus-ts/src/agent/streaming/streams/agent-event-stream.ts`
- Map explicit lifecycle event family.

13. `autobyteus-ts/src/cli/agent/cli-display.ts`
- Render explicit lifecycle stream events.

14. `autobyteus-ts/src/cli/agent-team/widgets/focus-pane-history.ts`
- Render explicit lifecycle stream events.

15. `autobyteus-ts/src/cli/agent-team/state-store.ts`
- Track lifecycle/pending state from explicit lifecycle family.

### Remove

1. `autobyteus-ts/src/agent/handlers/approved-tool-invocation-event-handler.ts`
2. Legacy count-based `ToolInvocationBatch` model in `autobyteus-ts/src/agent/tool-invocation.ts`
3. Legacy lifecycle references: `AGENT_TOOL_INVOCATION_AUTO_EXECUTING` and `TOOL_INVOCATION_AUTO_EXECUTING`

## 7) Runtime Use-Case Guarantees

1. Per-invocation completion updates are emitted independently.
2. Denied tools emit terminal lifecycle and still count toward turn completion.
3. Mixed approved+denied multi-tool turns produce one continuation event.
4. Duplicate results do not cause premature completion.
5. Late duplicates do not create extra continuation turns.
6. Result processing is not starved by pending invocation requests.
7. Non-terminal lifecycle transitions are monotonic (`REQUESTED -> APPROVED -> STARTED`).
8. Terminal lifecycle states are not regressed by logs or out-of-order non-terminal events.
9. Runtime lifecycle semantics contain no legacy compatibility model.
10. Unknown or mismatched-turn results cannot mutate active turn settlement.
11. Stale/unknown approval decisions cannot trigger execution or continuation.
12. Denied invocation never emits execution-started or execution-terminal-success/failure lifecycle events.
13. Late-duplicate guard remains memory-safe via bounded policy.
14. In-repo stream consumers render explicit lifecycle family without legacy event dependency.

## 8) Risks And Mitigations

1. Risk: execution refactor regresses tool execution behavior.
- Mitigation: unify execution in one handler + targeted tests for both auto and approval paths.

2. Risk: dedupe/turn cleanup mistakes suppress valid results.
- Mitigation: explicit turn-state invariants + duplicate/late-duplicate + turn-mismatch tests.

3. Risk: stream contract drift after event-family rename.
- Mitigation: notifier-to-stream mapping contract tests + CLI consumer adaptation tests.

4. Risk: stale event suppression cache grows unbounded.
- Mitigation: dedicated bounded cache component with capacity+TTL tests.

## 9) Out-Of-Scope Follow-up

- True concurrent tool execution with bounded worker concurrency.
