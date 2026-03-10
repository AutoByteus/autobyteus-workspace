# Requirements

- Ticket: `live-run-stream-reconnect-after-reload`
- Status: `Refined`
- Last Updated: `2026-03-10`

## Problem Statement

The frontend does not reliably restore live event monitoring for already-running agent runs and agent team runs after the UI loses local state and is reopened or force reloaded. In the reported team case, the right-side Activity panel can continue receiving live updates while the middle agent event monitor stops streaming new conversation content. The user clarified that all currently running agents and team members should continue streaming their events into frontend state, even if the UI only renders a bounded subset at a time.

## User-Observed Scenarios

- `UC-001`: A user starts an agent team run, the backend continues running, the frontend is force reloaded, and the frontend reconnects that active team stream into live frontend state without requiring a new send action.
- `UC-002`: A user starts one or more single-agent runs, closes or reloads the frontend without terminating them, and the frontend reconnects those active runs into live frontend state on reload.
- `UC-003`: When the user opens a currently running agent or team member after reload, the middle event monitor already has live continuity and continues streaming new conversation/tool events.
- `UC-004`: The right-side Activity panel and the middle event monitor remain consistent for the same selected active run or focused team member after reload/recovery.
- `UC-005`: Reopening a historical inactive run continues to show projection-only history and must not create a live subscription.
- `UC-006`: The frontend may keep only bounded recent event/message history per surface and may discard older entries once the configured maximum is reached.

## Functional Requirements

- `R-001`: The frontend must maintain or restore live stream subscriptions for all runs that the backend reports as active in run history.
- `R-002`: Active single-agent runs must reconnect into frontend state after reload without requiring the user to send a new message first.
- `R-003`: Active team runs must reconnect into frontend state after reload without requiring the user to send a new message first.
- `R-004`: When the user focuses a currently active agent or team member, the middle event monitor must render against the same live-updating context that receives new streamed segments.
- `R-005`: The right-side Activity panel and the middle event monitor must stay aligned to the same active run/member identity after reload and recovery.
- `R-006`: Rehydrating or refocusing an active team run must preserve or restore the focused member context used by both the middle event monitor and the right-side Activity panel.
- `R-007`: The recovery path must not depend on the user reopening a run manually in order for active-run stream events to reach frontend state.
- `R-008`: Inactive historical runs must remain non-streaming and must not open unnecessary WebSocket connections.
- `R-009`: Frontend event/message retention may be bounded; older entries may be dropped once the configured maximum is reached, but new live events must continue to flow.

## Acceptance Criteria

- `AC-001`: After frontend reload, each active single-agent run reported by history reconnects to its live stream without a new send action.
- `AC-002`: After frontend reload, each active team run reported by history reconnects to its live team stream without a new send action.
- `AC-003`: When the user selects a reconnected active run, new streamed segments appear in the middle event monitor.
- `AC-004`: For reconnected active team runs, new tool/activity events and new conversation segments stay aligned to the same focused member context.
- `AC-005`: Reload/recovery does not regress the existing behavior for inactive history reopen.
- `AC-006`: Regression coverage exists for the recovery path that previously allowed activity updates without middle-pane conversation updates.
- `AC-007`: Recovery behavior remains correct when frontend event/message retention limits evict older entries.

## Constraints

- Keep the solution within existing frontend run-history, context-store, and streaming-service boundaries unless investigation proves a backend contract gap.
- Prefer one recovery model for both agent and team runs where possible.
- The UI is not required to render all historical events/messages indefinitely; bounded retention is acceptable.
