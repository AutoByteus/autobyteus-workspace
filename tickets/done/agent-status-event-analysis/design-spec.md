# Design Spec: Authoritative Runtime Status Projection

## Current-State Read

The current code already has a status event path, but it is not a single authoritative API contract.

Native AutoByteus has the most complete internal status model:

```text
BaseEvent
  -> AgentStatusDeriver
  -> context.currentStatus
  -> AgentStatusManager.emit_status_update
  -> EventType.AGENT_STATUS_UPDATED
  -> StreamEventType.AGENT_STATUS_UPDATED
  -> server AgentRunEventType.AGENT_STATUS
  -> WebSocket ServerMessageType.AGENT_STATUS
```

Relevant files:

- `autobyteus-ts/src/agent/status/status-deriver.ts`
- `autobyteus-ts/src/agent/status/status-update-utils.ts`
- `autobyteus-ts/src/agent/status/manager.ts`
- `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts`

Codex has a server-owned status value, but its API event projection is incomplete:

```text
Codex app-server notification
  -> CodexThreadNotificationHandler
  -> CodexThread.currentStatus / activeTurnId
  -> CodexThreadEventConverter
  -> AgentRunEventType.AGENT_STATUS
```

Relevant files:

- `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-turn-event-converter.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-lifecycle-event-converter.ts`

Current Codex issues:

- `turn/started` and `turn/completed` emit `AGENT_STATUS`, but with `new_status`/`old_status` payloads.
- `thread/status/changed` forwards the raw serialized payload; if it is shaped as `{ status: { type: "idle" } }`, the frontend does not receive the expected status field.
- runtime errors emit `ERROR`, not a guaranteed terminal `AGENT_STATUS`.

Claude has lifecycle events but does not currently own a reliable current status projection:

```text
ClaudeSession lifecycle event
  -> ClaudeAgentRunBackend subscription
  -> ClaudeSessionEventConverter
  -> AgentRunEventType.AGENT_STATUS for start/complete only
  -> lastStatus updated from statusHint after dispatch
```

Relevant files:

- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts`

Current Claude issues:

- `ClaudeAgentRunBackend.getStatus()` returns listener-derived `lastStatus`, initially `null`.
- `lastStatus` is not the same owner as live status event production.
- runtime errors emit `ERROR`, not a guaranteed terminal `AGENT_STATUS`.
- `turn/interrupted` is converted as `TURN_COMPLETED`, losing interruption semantics for frontend cleanup.

Team status currently has a live member-event path, but the snapshot path is weak:

- `AgentTeamStreamHandler` sends only `TEAM_STATUS` on connect.
- `CodexTeamRunBackend.getStatus()` and `ClaudeTeamRunBackend.getStatus()` return active-team `IDLE` regardless of running members.
- `TeamRuntimeStatusSnapshotService` can build member status snapshots but is not used by `AgentTeamStreamHandler`.

Frontend currently duplicates status ownership:

- `handleAgentStatus` reads `payload.new_status` and writes `context.state.currentStatus`.
- `isSending` is separately set/cleared by send paths, status events, turn events, assistant-complete events, and error events.
- The input button currently follows `isSending`, not a backend-owned action permission.
- Current implementation/build shows historical inactive runs after app restart as green `idle`; this exposed that `idle` and `offline` were incorrectly collapsed.

## Intended Change

Make the existing WebSocket/API event `AGENT_STATUS` the single authoritative frontend status contract.

No new API event name is introduced. No backward compatibility is preserved for the old payload shape.

Target payload:

```ts
type AgentApiStatus = "offline" | "idle" | "running" | "error";

type AgentStatusPayload = {
  status: AgentApiStatus;
  can_interrupt: boolean;
  agent_id?: string;
  agent_name?: string;
};

type TeamStatusPayload = {
  status: AgentApiStatus;
};
```

Rules:

- `AGENT_STATUS.status` is the current coarse runtime availability/work state for one agent/member.
- `AGENT_STATUS.can_interrupt` is the current action permission for the selected agent/member context.
- `AGENT_STATUS.agent_id` / `agent_name` are present only for team-member routing when the message envelope does not already identify the member.
- `TEAM_STATUS.status` is the current coarse aggregate team availability/work state and intentionally has no `can_interrupt`; the input button uses the selected member's `AGENT_STATUS.can_interrupt`.
- Detailed runtime statuses remain internal to each runtime/backend; they are collapsed at the API boundary.
- Remove `new_status`, `old_status`, `isSending` status ownership, frontend detailed phase dependence, and raw provider-status forwarding from the in-scope path for both `AGENT_STATUS` and `TEAM_STATUS`.

Status meanings:

```ts
offline = no active runtime/session exists for this historical run/member/team
idle    = active runtime/session exists and is ready, but no turn is running
running = active runtime/session owns current work or is in an active transition
error   = runtime/run failed and needs error display
```

This distinction is required after app restart: historical rows that are not active must show `offline`, not green `idle`.

The initial run-history API is also a status snapshot surface. It should return normalized coarse `status` for displayed run/team/member rows, using the same backend snapshot/projector logic for active runtimes and `offline` for non-active non-error history.

The three status entry points are therefore governed by the same projection:

```text
Runtime/backend state -> normalized status projector
  -> first-load history row status
  -> WebSocket connect/reconnect status snapshot
  -> live AGENT_STATUS / TEAM_STATUS events
```

Frontend code consumes normalized status from those surfaces; it must not infer display status from `lastKnownStatus`, `isActive`, lifecycle events, or local send flags.

Additional team-member invariant:

```text
team active/running aggregate != every member running
```

For team runs, the aggregate `TEAM_STATUS.status` is only a team-row summary. It must never be fanned out to member `AgentContext.state.currentStatus` values. A member row can be `running` only when a member-scoped source says that member is running: the member `AGENT_STATUS` live event, the member `AGENT_STATUS` connect/reconnect snapshot, or the backend-normalized member status returned by `ListWorkspaceRunHistory`. If a frontend path is waiting for a member-scoped status, its safe placeholder is non-interruptible and non-running (`offline` for no known member runtime; otherwise preserve the last member-scoped status).

Frontend decision rule:

```ts
showInterruptButton = payload.status === "running" && payload.can_interrupt;
```

`TEAM_STATUS` decision rule:

```ts
teamDisplayStatus = payload.status;
```

Team aggregate status never controls the member interrupt button. For team workspaces, `activeContextStore.activeAgentContext` is the focused member context; the red interrupt affordance follows that member context's `can_interrupt`.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Change + Refactor
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + Boundary Or Ownership Issue + Duplicated Policy Or Coordination + Shared Structure Looseness + Legacy Or Compatibility Pressure
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence:
  - `AGENT_STATUS` exists, but its payload shape is not uniform across native AutoByteus, Codex, and Claude.
  - Frontend work/action state is duplicated through `context.isSending` and lifecycle handlers.
  - Codex lifecycle converter can forward raw `thread/status/changed` payloads instead of a normalized API status.
  - Claude status snapshots are derived from `lastStatus`, a listener-side cache, and can be `null` before event observation.
  - Team stream connect sends aggregate status only and misses member snapshots.
  - Team `TEAM_STATUS` still has its own legacy `new_status` contract and repeated aggregate derivation across managers/snapshots.
  - Frontend hydration/recovery/history paths synthesize detailed or legacy statuses outside the live `AGENT_STATUS`/`TEAM_STATUS` contract.
- Design response:
  - Create one API-level status contract owned by the server runtime boundary.
  - Replace `getStatus(): string | null` with a status snapshot boundary that returns `AgentStatusPayload`.
  - Make each runtime backend own status projection for both live events and snapshots.
  - Remove frontend `isSending` as status/interrupt authority.
  - Add one team aggregate status owner used by live managers and snapshots.
  - Migrate frontend status enums, hydration, recovery, history, display, and local termination paths to coarse status including `offline`.
- Refactor rationale:
  - This is not a one-line frontend label fix; correctness depends on aligning live event, snapshot, runtime ownership, and frontend action state.
- Intentional deferrals and residual risk, if any:
  - Detailed phase display such as `Awaiting LLM Response` is intentionally removed from the core API contract. If product needs phase detail later, it should be designed as a separate optional display/debug contract, not part of interrupt correctness.

## Terminology

- `API status`: the coarse frontend-facing value: `offline`, `idle`, `running`, or `error`.
- `Runtime detail status`: provider/runtime-specific internal phase, such as native `awaiting_llm_response` or Codex `THREAD_STATUS_CHANGED`.
- `Status projection`: the backend-owned conversion from runtime state/detail to `AgentStatusPayload`.
- `Status snapshot`: the current `AgentStatusPayload` returned on connect/reconnect.
- `Member status`: an `AGENT_STATUS` payload scoped to one team member.
- `Team status`: a `TEAM_STATUS` payload with the aggregate coarse state: `{ status: AgentApiStatus }`.
- `Team status aggregator`: the single owner that derives aggregate team status from member status snapshots/live member states.

## Design Reading Order

1. Follow the live `AGENT_STATUS` data-flow spine.
2. Follow the connect/reconnect snapshot spine.
3. Check runtime-specific status ownership.
4. Check team member aggregation.
5. Apply file responsibilities and removal plan.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required removals in scope:
  - Remove `new_status` / `old_status` as the frontend-facing `AGENT_STATUS` contract.
  - Remove `new_status` / `old_status` as the frontend-facing `TEAM_STATUS` contract.
  - Remove frontend `handleAgentStatus` dependence on `payload.new_status`.
  - Remove `isSending` as the owner of interrupt-button display.
  - Remove lifecycle-event handlers as owners of agent status/work state.
  - Remove raw Codex `thread/status/changed` payload forwarding as `AGENT_STATUS`.
  - Remove Claude `lastStatus` as the authoritative snapshot source.
  - Remove Codex/Claude/Mixed team backend constant active `IDLE` as authoritative team snapshot source.
  - Remove frontend `Uninitialized`, `Bootstrapping`, `Processing`, `ShutdownComplete`, and other detailed/legacy API-visible status values from agent/team status enums.
  - Remove the incorrect inactive-history mapping that displays non-active runs as green `idle`; inactive history maps to `offline`.

The design must not keep dual reads such as `payload.status || payload.new_status`, and must not emit both old and new status payloads for either `AGENT_STATUS` or `TEAM_STATUS`.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Runtime status transition | Frontend status/input state | Server runtime status projection boundary | Main correctness path for live status updates. |
| DS-002 | Primary End-to-End | WebSocket connect/reconnect | Frontend status/input state | Stream handler snapshot boundary | Prevents stale status after missed or pre-existing terminal transitions. |
| DS-003 | Return-Event | Team member runtime status | Team member row/input state | Team runtime event multiplexer | Keeps member statuses correct in teams. |
| DS-004 | Return-Event | Team member status set | Aggregate team status | `team-status-aggregation.ts` | Keeps team-level status aligned with member state. |
| DS-005 | Bounded Local | Native AutoByteus `BaseEvent` | native detailed status | `AgentStatusDeriver` | Native internal state machine feeding API projection. |
| DS-006 | Bounded Local | Codex app-server notification | `CodexThread.currentStatus` | `CodexThread` | Codex internal status ownership feeding API projection. |
| DS-007 | Bounded Local | Claude turn/session lifecycle | Claude current status projection | `ClaudeSession` / `ClaudeAgentRunBackend` | Replaces weak listener-derived `lastStatus`. |
| DS-008 | Primary End-to-End | Initial run-history query | Frontend history/sidebar status display | Run-history read model using backend status snapshots | Prevents first-load historical rows from being displayed as active-runtime idle. |
| DS-009 | Primary End-to-End | Active team history/refresh query | Frontend team/member sidebar status display | Backend member status projection plus frontend member-only merge | Prevents active team aggregate state from making every member appear running. |

## Primary Execution Spine(s)

Live single-agent status:

```text
Runtime transition -> Runtime backend status projector -> AgentRunEvent.AGENT_STATUS -> AgentRunEventMessageMapper -> WebSocket AGENT_STATUS -> Frontend status handler -> Status display / input button
```

Single-agent snapshot:

```text
WebSocket connect -> AgentStreamHandler binds live listener -> AgentRunBackend.getStatusSnapshot() -> WebSocket AGENT_STATUS -> Frontend status handler -> Status display / input button
```

Team member live status:

```text
Member runtime transition -> Member backend status projector -> Team manager member-event multiplexer -> Member-scoped AGENT_STATUS -> Frontend team member context
```

Team snapshot:

```text
Team WebSocket connect -> bind live listener -> TeamRuntimeStatusSnapshotService -> member AGENT_STATUS snapshots + TEAM_STATUS snapshot -> Frontend team/member contexts
```

Initial history/sidebar status:

```text
Application load -> ListWorkspaceRunHistory -> history service checks active run/team managers -> active rows use getStatusSnapshot()/team snapshot aggregation, inactive non-error rows map to offline -> GraphQL history status -> frontend tree renders without deriving status from lastKnownStatus/isActive
```

Active team history/sidebar status:

```text
Application load/refresh -> ListWorkspaceRunHistory team row
  -> team.status from aggregate snapshot
  -> team.members[].status from member snapshots
  -> frontend merges team aggregate into the team row only
  -> frontend merges each member status into that member row only
```

No frontend reconciliation step may convert `team.isActive === true` or `team.status === "running"` into `member.status === "running"` for all members.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A runtime state transition is converted once into the canonical `AGENT_STATUS` payload, then forwarded unchanged to the frontend. | Runtime backend, status projector, run event mapper, frontend status handler | Runtime backend status projection boundary | Provider event conversion, WebSocket serialization |
| DS-002 | A new stream listener is attached before the current status snapshot is sent, so a terminal status cannot fall between snapshot and subscription. | Stream handler, active run backend, status snapshot, frontend handler | Stream handler snapshot boundary | Session/broadcaster registration |
| DS-003 | Member runtime statuses are forwarded with member identity so the frontend updates the correct team member. | Member backend, team manager, team stream handler, frontend member context | Team manager event multiplexer | Member identity resolution |
| DS-004 | Team aggregate status is derived from member API statuses through one shared domain helper, not separately inside live managers and snapshot code. | Member status snapshots, `deriveTeamApiStatus`, `TEAM_STATUS` | `agent-team-execution/domain/team-status-aggregation.ts` | Snapshot collection |
| DS-005 | Native detailed lifecycle events remain inside native AutoByteus and are collapsed only at the server API boundary. | BaseEvent, `AgentStatusDeriver`, AutoByteus backend projector | Native runtime + AutoByteus backend projector | Detailed-to-coarse mapping |
| DS-006 | Codex app-server events update `CodexThread.currentStatus`; API events and snapshots read that same owner. | Codex notification handler, `CodexThread`, Codex backend projector | `CodexThread` for runtime state, Codex backend for API projection | Provider payload normalization |
| DS-007 | Claude session lifecycle owns current work/error state directly, and both live events and snapshots read that owner. | Claude session, Claude backend projector | Claude session/backend status owner | Lifecycle-event conversion |
| DS-008 | Initial history load is seeded by backend-normalized status rather than frontend-inferred `isActive`/`lastKnownStatus`; active rows use the same runtime snapshot boundary, inactive non-error rows become `offline`. | Run history service, active run/team managers, status snapshots, GraphQL history payload | Run-history read model using backend status projection | History persistence and sorting |
| DS-009 | Active team refresh keeps aggregate and member statuses separate: a running team row can contain offline member rows. | Team history row, member status snapshots, frontend team read model | Backend member status projection plus frontend member-only merge | Periodic refresh and active recovery placeholders |
| DS-010 | Frontend history/recovery/open code must not compete with live `AGENT_STATUS.can_interrupt`; only the status-event handler or explicit local offline/placeholder cleanup may write action permission. | Live `AGENT_STATUS`, frontend runtime status mutation owner, active context input button | Frontend runtime status/action mutation boundary | History refresh, active recovery, run open, local termination |

## Case-by-Case Data-Flow Spine Inventory

The following case inventory is required because status correctness is not only the live WebSocket event path. Regressions occurred when other cases — first-load history, active refresh, recovery, run open, and team-member overlays — wrote the same state through different shortcuts. Each case below names the governing owner and the forbidden shortcut.

| Case ID | Case | Data-Flow Spine | Governing Owner | Required Invariant | Forbidden Shortcut |
| --- | --- | --- | --- | --- | --- |
| C-001 | Single-agent live status controls display and interrupt | Runtime provider event -> runtime backend status projector -> `AgentRunEvent.AGENT_STATUS` -> WebSocket `AGENT_STATUS` -> frontend runtime status/action mutation owner -> active context -> header/input button | Runtime backend status projector + frontend status mutation owner | `status` and `canInterrupt` are copied from the latest live `AGENT_STATUS`; input stop button follows `canInterrupt`. | Reading `isSending`, turn lifecycle, or history `isActive` to decide interrupt. |
| C-002 | Single-agent WebSocket connect/reconnect snapshot | WebSocket connect -> bind live listener -> backend `getStatusSnapshot()` -> WebSocket `AGENT_STATUS` snapshot -> frontend status mutation owner -> active context | Stream handler snapshot boundary | Snapshot is post-bind and has same `{ status, can_interrupt }` contract as live events. | Sending a pre-bind snapshot or fabricating frontend status from stale run metadata. |
| C-003 | Single-agent active history refresh after a live snapshot | `ListWorkspaceRunHistory` active row -> `runHistoryLoadActions.reconcileDiscoveredActiveRuns` -> existing `AgentContext` -> ensure stream connected -> preserve current live status/action state | Frontend runtime status/action mutation owner | If the context already exists and is live/subscribed, refresh may lock config/connect stream but must preserve `currentStatus` and `canInterrupt` until a later `AGENT_STATUS` or offline cleanup. | `existingContext.state.currentStatus = running` or `existingContext.state.canInterrupt = false` during active refresh. |
| C-004 | Single-agent active recovery/open placeholder before snapshot | App startup/open active run -> hydrate projection/config -> create or recover `AgentContext` -> apply `activePlaceholder(running,false)` -> connect stream -> backend `AGENT_STATUS` snapshot replaces placeholder | Frontend runtime status/action mutation owner | Placeholder is allowed only until stream snapshot. It is not a competing source after the live context exists. | Leaving placeholder authority active after snapshot; overwriting later live `canInterrupt=true`. |
| C-005 | Single-agent inactive/offline history | `ListWorkspaceRunHistory` inactive row -> backend-normalized `status=offline/error` -> frontend history tree/read model -> optional opened context offline placeholder | Backend run-history status projection + frontend offline cleanup | Inactive non-error history is `offline/canInterrupt=false`; error history is `error/canInterrupt=false`. | Mapping persisted `lastKnownStatus=IDLE` to green idle after no runtime exists. |
| C-006 | Local single-agent terminate/close | User close/terminate -> backend terminate mutation if needed -> local stream disconnect -> frontend offline cleanup -> history refresh | Agent run store lifecycle cleanup | Explicit local lifecycle cleanup may set `offline/canInterrupt=false`. | Treating normal refresh as terminate/offline cleanup. |
| C-007 | Team member live status controls member row and focused interrupt | Member runtime provider event -> member backend status projector -> team manager member-event multiplexer -> member-scoped `AGENT_STATUS` -> frontend member context mutation owner -> focused member input button | Member backend projector + team event multiplexer + frontend status mutation owner | Focused member interrupt follows that member's `AGENT_STATUS.can_interrupt`; team aggregate has no action permission. | Using `TEAM_STATUS.status`, team `isActive`, or team row running state to decide focused member interrupt. |
| C-008 | Team WebSocket connect/reconnect snapshot | Team WebSocket connect -> bind team listener -> `TeamRuntimeStatusSnapshotService` -> member `AGENT_STATUS` snapshots + aggregate `TEAM_STATUS` snapshot -> frontend member/team handlers | Team runtime status snapshot service + team aggregate helper | Each member receives member-scoped status; aggregate is derived from member statuses. | Sending only `TEAM_STATUS` or using aggregate as member status. |
| C-009 | Team active history refresh/reconcile | `ListWorkspaceRunHistory` team row + `members[].status` -> `runHistoryLoadActions` -> apply member-scoped statuses by route key/run id -> derive/preserve team aggregate -> ensure stream connected | Backend member history projection + frontend member-only merge | Backend member statuses can update member display status; existing live member `canInterrupt` is preserved because history does not carry action permission. | Looping over all members with team `running`; resetting every member `canInterrupt=false` in active refresh. |
| C-010 | Team active recovery/open placeholder | App startup/open active team -> hydrate team/member contexts -> team aggregate may placeholder running -> members use supplied member statuses or preserve/offline -> connect stream -> member snapshots replace placeholders | Frontend team member merge owner + runtime status/action mutation owner | Team aggregate placeholder never fans out to members; live member `canInterrupt` is preserved. | Passing `memberStatuses: []` as "all running"; clearing focused member interrupt on recovery/open. |
| C-011 | Team aggregate display | Member API statuses -> `deriveTeamApiStatus(...)` -> `TEAM_STATUS { status }` -> frontend team handler/read model -> team row chip | `agent-team-execution/domain/team-status-aggregation.ts` | Team status is a summary: error > running > idle > offline. No `can_interrupt`. | Computing aggregate separately in frontend or mixing aggregate status into members. |
| C-012 | Team inactive/offline history and local team termination | Inactive team history or terminate/close -> backend/history status offline/error -> frontend team/member offline cleanup -> read model | Backend history projection + team run lifecycle cleanup | Inactive non-error team and members show offline/non-interruptible unless member error is explicitly persisted. | Keeping historical active/idle metadata as green idle/running. |

These case spines are implementation constraints, not documentation-only examples. A code review or test should be able to pick any write to `AgentRunState.currentStatus` or `AgentRunState.canInterrupt` and classify it into exactly one case above. If a write cannot be classified, it is out of design and should be removed or routed through the frontend runtime status/action mutation owner.

## Spine Actors / Main-Line Nodes

- Runtime backend status projector
- `AgentRunBackend` status snapshot boundary
- `AgentRunEvent.AGENT_STATUS`
- `AgentRunEventMessageMapper`
- `AgentStreamHandler`
- `AgentTeamStreamHandler`
- Team status snapshot/aggregation service
- Run-history read model status projector
- Frontend `handleAgentStatus`
- Frontend runtime status/action mutation owner
- Frontend team member status merge/read model
- Active context input-button state

## Ownership Map

| Owner | Owns |
| --- | --- |
| Native AutoByteus runtime | Detailed internal status state and transitions. |
| AutoByteus backend status projector | Collapse native detailed status/runtime availability to API `offline/idle/running/error` and compute `can_interrupt`. |
| `CodexThread` | Codex current runtime status and active turn identity. |
| Codex backend status projector | Normalize Codex runtime state/events to API status payload. |
| Claude session/backend status owner | Claude current runtime work/error state and active-turn interruptability. |
| Claude backend status projector | Normalize Claude state/events to API status payload. |
| `AgentRunBackend` interface | Authoritative single-agent status snapshot boundary. |
| `AgentStreamHandler` | Live stream binding and snapshot delivery ordering. |
| Team status aggregator | Sole aggregate rule from member API statuses/raw native team status to `TEAM_STATUS.status`. |
| Team manager | Member event multiplexing and publishing aggregate changes via the team status aggregator. |
| Team snapshot service | Collect current member snapshots and call the team status aggregator; does not own aggregate policy. |
| Run-history service/read model | First-load status projection for history rows using active runtime snapshots or inactive offline/error mapping. |
| Frontend status handler | Store API status and `can_interrupt`; no runtime inference. |
| Frontend team member status merge/read model | Preserve member-scoped statuses from history rows, member snapshots/events, and live member contexts; never derive member status from team aggregate status. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| WebSocket `AGENT_STATUS` message | Runtime backend status projector | Transport delivery to frontend | Runtime-specific status derivation or interrupt policy |
| Frontend input component | Active context status state | Render send/interrupt affordance | Work-state inference from `isSending` |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `AGENT_STATUS.payload.new_status` / `old_status` contract | Overlapping representation of current status | `AgentStatusPayload.status` | In This Change | No dual emit/read. |
| `TEAM_STATUS.payload.new_status` / `old_status` contract | Same legacy shape exists for team aggregate status | `TeamStatusPayload.status` | In This Change | Update server `TeamRunStatusUpdateData`, WS messages, and frontend `TeamStatusPayload`/`teamHandler`. |
| Frontend `handleAgentStatus` `payload.new_status` read | Old payload shape | `payload.status` | In This Change | Handler fails fast/tests use new shape. |
| Frontend `isSending` as interrupt/status authority | Duplicated policy | `can_interrupt` from `AGENT_STATUS` | In This Change | `isSending` may be removed or limited to local submit-in-flight only if still needed. |
| `TURN_COMPLETED`/`TURN_INTERRUPTED` status ownership | Lifecycle events are not status owners | Terminal `AGENT_STATUS` events/snapshots | In This Change | They may still complete conversation rendering. |
| Raw Codex `thread/status/changed` status payload forwarding | Provider payload leaks through API boundary | Codex status projector | In This Change | Normalize to `status/can_interrupt`. |
| Claude `lastStatus` as snapshot authority | Listener-side cache can be null/stale | Claude current status owner | In This Change | Live events and snapshots read same owner. |
| `TeamRunBackend.getStatus(): string | null` and `TeamRun.getStatus()` | String-only boundary cannot carry canonical payload and currently enables constant active `IDLE` | `getStatusSnapshot(): TeamStatusPayload` delegating to team aggregate owner | In This Change | No remaining authoritative callers of old method. |
| Codex/Claude/Mixed team backend constant active `IDLE` snapshot | Incorrect aggregate source | Team aggregate owner plus backend `getStatusSnapshot()` | In This Change | Team status derives from member snapshots/live member statuses. |
| Frontend detailed phase status display for API status | Not required for core contract and causes stale-detail UX | Coarse `offline/idle/running/error` display | In This Change | Future detail display must be separate. |
| Frontend active recovery `Uninitialized` placeholder and local `ShutdownComplete` state | Old API-visible statuses conflict with coarse contract and caused inactive history to look idle | Single-agent active placeholder `running/can_interrupt=false`; team-row aggregate placeholder may be `running`; team-member placeholder must preserve member-scoped status or use `offline/can_interrupt=false`; terminated/inactive local state `offline/can_interrupt=false` | In This Change | Offline is now part of the coarse API/UI status contract. |
| Frontend history display inferred from `isActive` / `lastKnownStatus` | Legacy metadata cannot distinguish active-runtime idle from inactive/no-runtime history | Backend-provided history `status: AgentApiStatus` | In This Change | `isActive` / `lastKnownStatus` may remain as metadata but not display status authority. |
| Frontend active-team aggregate-to-member fan-out in `runHistoryLoadActions.ts` | Causes every member row to look running whenever the team is active | Member-scoped status merge from backend `team.members[].status`, member `AGENT_STATUS` snapshots/events, or safe offline placeholder | In This Change | Remove `memberContext.state.currentStatus = AgentStatus.Running` loops for active teams. |
| Frontend active-team aggregate-to-member fan-out in `activeRunRecoveryCoordinator.ts` | Recovery currently treats an active team as all members running | Team-row placeholder only; member contexts preserve member-scoped status or become offline/non-interruptible until snapshot | In This Change | Single-agent active placeholder remains allowed; team-member active placeholder differs. |
| Frontend active-member seeding from `isActive` in `runHistoryTeamHelpers.ts` | `isActive` is a team/run metadata flag, not member work state | Explicit member status input or existing member-scoped status; default `offline/canInterrupt=false` | In This Change | Applies to `buildTeamMemberContexts(...)`, `applyProjectionToTeamMemberContext(...)`, and `buildTeamNodes(...)` overlays. |
| Frontend local mark-active helpers setting all `team.members[].status = running` | Local team aggregate helper overwrites backend member truth on refresh/reconcile | Team aggregate status changes only; member status remains unchanged unless member-scoped data is provided | In This Change | Applies to `markTeamAsActive(...)` and `reconcileActiveTeamRunIds(...)`. |

## Return Or Event Spine(s) (If Applicable)

`AGENT_STATUS` is the return/event spine for status. It must be emitted for every transition that changes either:

- `status`, or
- `can_interrupt`.

Therefore a runtime may emit `AGENT_STATUS` even when coarse `status` remains `running`, if `can_interrupt` changes from `true` to `false` during interruption or shutdown.

Terminal event requirement:

```text
normal completion       -> AGENT_STATUS { status: "idle", can_interrupt: false }
interruption settled    -> AGENT_STATUS { status: "idle", can_interrupt: false }
runtime error           -> AGENT_STATUS { status: "error", can_interrupt: false }
shutdown/termination     -> AGENT_STATUS { status: "offline", can_interrupt: false }
team aggregate change   -> TEAM_STATUS { status: "offline" | "idle" | "running" | "error" }
```

## Bounded Local / Internal Spines (If Applicable)

Native bounded local spine:

```text
BaseEvent -> AgentStatusDeriver.reduce -> context.currentStatus -> native status update event
```

This remains intact. The API projector collapses detailed status outside the native state machine.

Codex bounded local spine:

```text
Codex app-server notification -> CodexThreadNotificationHandler -> CodexThread.currentStatus / activeTurnId
```

This becomes the sole Codex state source for live API events and snapshots.

Claude bounded local spine:

```text
Claude sendTurn/complete/interrupted/error -> Claude current status owner -> Claude backend status projector
```

This is a required refactor because current Claude status is listener-derived.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Provider payload parsing | DS-001, DS-006, DS-007 | Runtime backend projector | Convert provider-specific payloads into backend-owned state | Provider shapes differ | Leaks runtime quirks into frontend/API |
| WebSocket serialization | DS-001, DS-002, DS-003 | Stream handlers | Serialize already-normalized events | Transport concern only | Transport starts owning status policy |
| Team member identity routing | DS-003, DS-004 | Team manager/stream handler | Attach `agent_id`/`agent_name` to member status | Frontend must route to correct member | Generic status messages update wrong context |
| Frontend visual mapping | DS-001, DS-002 | Frontend status display | Map `offline/idle/running/error` to labels/colors | UI concern | UI recreates backend status policy |
| Frontend active-team member-status merge | DS-009 | Frontend team read model/hydration/recovery owners | Merge member-scoped statuses by `memberRouteKey`/`memberRunId` and preserve offline members when the team aggregate is running | Active team rows need a local overlay before/while streams connect | Aggregate team status leaks into member row status and makes all members appear running |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Single-agent status event transport | `services/agent-streaming` | Extend | Already owns WS message mapping and stream handlers | N/A |
| Runtime-specific event conversion | `agent-execution/backends/*/events` | Extend | Already owns provider/runtime event translation | N/A |
| Backend run snapshot API | `agent-execution/backends/agent-run-backend.ts` | Extend/Replace method | Existing backend interface is the authoritative boundary | N/A |
| Team member snapshots | `TeamRuntimeStatusSnapshotService` | Extend/Use | Existing service already intends to build team/member status snapshots | N/A |
| Team aggregate status policy | `agent-team-execution/domain` | Create New tight helper | Existing managers duplicate policy; snapshot service is transport-adjacent, not aggregate owner | New helper is needed because current aggregate rules are repeated in managers and absent from snapshots. |
| `TEAM_STATUS` payload contract | `agent-team-execution/domain/team-run-event.ts` + frontend protocol types | Extend/Replace | Existing team event contract owns team-level payload | N/A |
| Frontend hydration/recovery/history status normalization | `runHydration`, `runRecovery`, history stores/utils | Extend/Refactor | Existing paths already own hydration/recovery/history projections | N/A |
| Frontend team member status merge/fan-out removal | `runHistoryLoadActions`, `runRecovery`, `runHistoryTeamHelpers`, `runHistoryStore`, `teamRunContextHydrationService`, `teamRunOpenCoordinator` | Extend/Refactor | These are the existing owners that currently create, reconcile, and overlay team/member contexts | N/A; use existing owners but constrain them with DS-009. |
| Frontend stream handling | `autobyteus-web/services/agentStreaming/handlers` | Extend | Already owns WS message handling | N/A |
| Shared status payload type | `agent-execution/domain` or status subfolder | Create New | No existing tight type for API status payload | Existing old shape is loose and legacy. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/domain` | `AgentApiStatus`, `AgentStatusPayload`, status snapshot boundary types | DS-001, DS-002 | Runtime backends and stream handlers | Extend | Shared, tight API-level model. |
| `agent-execution/backends/autobyteus` | Native detailed-to-coarse projection | DS-001, DS-005 | AutoByteus backend | Extend | Uses native `agent.currentStatus` and `agent.context.state.activeTurn`. |
| `agent-execution/backends/codex` | Codex status/event projection | DS-001, DS-006 | Codex backend / `CodexThread` | Extend | Normalize status changed and error paths. |
| `agent-execution/backends/claude` | Claude current status owner and projection | DS-001, DS-007 | Claude session/backend | Extend/refactor | Replace `lastStatus` authority. |
| `services/agent-streaming` | WS delivery and snapshot ordering | DS-001, DS-002, DS-003 | Stream handlers | Extend | Must not own runtime status policy. |
| `agent-team-execution/domain` | `TeamStatusPayload`, `deriveTeamApiStatus`, team status update event data | DS-004 | Team status aggregator | Create/Extend | One aggregate owner used by live managers and snapshot service. |
| `agent-team-execution` managers | Member event multiplexing and aggregate status publishing through the shared aggregator | DS-003, DS-004 | Team manager | Extend | No local duplicate aggregate rules. |
| `services/agent-streaming` team streaming | Team/member snapshot delivery and WS serialization | DS-003, DS-004 | Team stream handler/snapshot service | Extend | Uses aggregate owner; does not own aggregate policy. |
| `autobyteus-web/services/agentStreaming` | Frontend status store update | DS-001, DS-002, DS-003 | Frontend active contexts | Extend/refactor | Reads `status`/`can_interrupt` only. |
| `autobyteus-web/services/runHydration` | Live/historical team context construction and member placeholder policy | DS-008, DS-009 | Frontend team member status merge/read model | Extend/refactor | `isActive` may lock config/team row, but must not imply member `running`. |
| `autobyteus-web/services/runRecovery` | Active run/team recovery placeholder policy | DS-002, DS-009 | Frontend team member status merge/read model | Extend/refactor | Single-agent/team aggregate placeholders may be running; team members preserve member-scoped/offline state. |
| `autobyteus-web/stores` / history utilities | History tree and active-team refresh/reconcile overlays | DS-008, DS-009 | Frontend team member status merge/read model | Extend/refactor | Backend member `status` wins over aggregate; local active helpers must not fan out running to members. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts` | agent execution domain | API status model | Define `AgentApiStatus`, `AgentStatusPayload`, shared status predicates | Tight shared API structure | N/A |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-status-payload.ts` | team execution domain | team API status model | Define `TeamStatusPayload` and re-export/use `AgentApiStatus` | Team-specific aggregate payload | `AgentApiStatus` |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-status-aggregation.ts` | team execution domain | aggregate status owner | Derive aggregate `AgentApiStatus` from member `AgentStatusPayload[]` and optional native raw status | One owner for live and snapshot aggregate policy | `AgentStatusPayload`, `TeamStatusPayload` |
| `autobyteus-server-ts/src/agent-execution/backends/agent-run-backend.ts` | backend boundary | `AgentRunBackend` | Replace `getStatus()` with `getStatusSnapshot()` | Single authoritative snapshot interface | `AgentStatusPayload` |
| `.../backends/autobyteus/events/autobyteus-status-projector.ts` | AutoByteus backend | AutoByteus status projector | Native detailed status -> API status/can_interrupt | Runtime-specific mapping | `AgentStatusPayload` |
| `.../backends/codex/events/codex-status-projector.ts` | Codex backend | Codex status projector | Codex currentStatus/status payload -> API status/can_interrupt | Runtime-specific mapping | `AgentStatusPayload` |
| `.../backends/claude/events/claude-status-projector.ts` | Claude backend | Claude status projector | Claude current status -> API status/can_interrupt | Runtime-specific mapping | `AgentStatusPayload` |
| `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts` | streaming | WS mapper | Pass through/validate normalized status payload | Transport-only mapper | `AgentStatusPayload` |
| `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | streaming | single-agent stream handler | Bind before snapshot; send `getStatusSnapshot()` | Snapshot delivery owner | `AgentStatusPayload` |
| `autobyteus-server-ts/src/services/agent-streaming/team-runtime-status-snapshot-service.ts` | team streaming | team snapshot service | Build member status snapshots and call `deriveTeamApiStatus(...)` for aggregate `TEAM_STATUS` | Existing snapshot delivery concern; aggregate policy remains in domain helper | `AgentStatusPayload`, `TeamStatusPayload`, team aggregator |
| `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` | frontend streaming | frontend status handler | Store `status` and `can_interrupt`; no `new_status` | One handler for status events | frontend type |
| `autobyteus-web/types/agent/AgentStatus.ts` | frontend types | frontend status model | Collapse to `offline/idle/running/error` API status | One type for API status | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| API status payload | `agent-execution/domain/agent-status-payload.ts` | agent execution domain | Used by all runtime backends and stream snapshots | Yes: removes `new_status`/`old_status` | Yes: one `status` field only | Kitchen-sink provider status object |
| active/non-terminal mapping | runtime-specific projector files | each runtime backend | Runtime policies differ | Yes | Yes | Generic helper that hides runtime-specific truth |
| team aggregate status rule | `agent-team-execution/domain/team-status-aggregation.ts` | team execution domain | Live managers and snapshot service must share one aggregate policy | Yes | Yes | Transport-owned or frontend-owned aggregate policy |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentStatusPayload.status` | Yes | Yes | Low | Only `offline/idle/running/error`; no detail field in v1. |
| `AgentStatusPayload.can_interrupt` | Yes | Yes | Low | Action permission only; not a display status. |
| `agent_id` / `agent_name` | Yes | Yes | Low | Present only for member routing. |
| `TeamStatusPayload.status` | Yes | Yes | Low | Aggregate `offline/idle/running/error`; no action permission or old fields. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts` | agent execution domain | API status model | Define `AgentApiStatus`, `AgentStatusPayload`, and helper predicates | Shared single/member `AGENT_STATUS` contract owner | N/A |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-status-payload.ts` | team execution domain | team API status model | Define `TeamStatusPayload = { status: AgentApiStatus }` | Shared `TEAM_STATUS` contract owner | `AgentApiStatus` |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-status-aggregation.ts` | team execution domain | team aggregate owner | `deriveTeamApiStatus(...)` used by live managers and snapshots | Prevents duplicated aggregate policy | `AgentStatusPayload`, `TeamStatusPayload` |
| `autobyteus-server-ts/src/agent-execution/backends/agent-run-backend.ts` | backend boundary | run backend interface | `getStatusSnapshot(): AgentStatusPayload` | Authoritative runtime snapshot boundary | `AgentStatusPayload` |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-status-projector.ts` | AutoByteus backend | AutoByteus projector | Native detailed status and activeTurn -> API payload | Keeps native mapping with native adapter | `AgentStatusPayload` |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-status-projector.ts` | Codex backend | Codex projector | Codex `currentStatus`/`activeTurnId` -> API payload | Keeps provider mapping with Codex adapter | `AgentStatusPayload` |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-status-projector.ts` | Claude backend | Claude projector | Claude current status/active turn -> API payload | Keeps provider mapping with Claude adapter | `AgentStatusPayload` |
| `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts` | streaming | WS mapper | Map normalized `AGENT_STATUS` to WS message without legacy normalization | Transport concern only | `AgentStatusPayload` |
| `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | streaming | single-agent stream handler | Bind live listener then send status snapshot | Prevents snapshot race | `AgentStatusPayload` |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | team streaming | team stream handler | Use team snapshot service after binding; remove `sendInitialStatusSnapshot` string path | Member and aggregate snapshots on connect | `AgentStatusPayload`, `TeamStatusPayload` |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-event.ts` | team execution domain | team event contract | Replace `TeamRunStatusUpdateData` with `{ status: AgentApiStatus; error_message?: string | null }` | Live team events use same contract as WS | `TeamStatusPayload` |
| `autobyteus-server-ts/src/agent-team-execution/backends/{codex,claude,mixed}/-team-manager.ts` | team execution managers | live aggregate publisher | Replace local `deriveTeamStatus()` with shared `deriveTeamApiStatus(...)` | No duplicate live aggregate rules | team aggregator |
| `autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend.ts` and `domain/team-run.ts` | team backend boundary | team snapshot boundary | Replace `getStatus()` with `getStatusSnapshot(): TeamStatusPayload` | Removes constant active `IDLE` boundary | `TeamStatusPayload` |
| `autobyteus-server-ts/src/services/agent-streaming/team-runtime-status-snapshot-service.ts` | team streaming | team snapshot service | Build member `AGENT_STATUS` snapshots and aggregate `TEAM_STATUS` via `deriveTeamApiStatus(...)` | Existing snapshot capability; not aggregate policy owner | `AgentStatusPayload`, `TeamStatusPayload`, team aggregator |
| `autobyteus-server-ts/src/run-history/domain/*history*types.ts` and GraphQL run-history types | run history API | history status read model contract | Expose normalized `status: AgentApiStatus` for history rows that appear in the sidebar | First-load display should consume backend-normalized status, not infer from legacy flags | `AgentApiStatus` |
| `autobyteus-server-ts/src/run-history/services/{agent,team,workspace}-run-history-service.ts` | run history services | history status projection | For active rows, ask active run/team managers for status snapshots; for inactive non-error rows, emit `offline`; for error rows, emit `error` | Keeps initial history load aligned with live status projection | status snapshot boundaries, team aggregator |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | frontend protocol | WS payload types | Replace `AgentStatusPayload` and `TeamStatusPayload` with new shapes | Frontend protocol owner | frontend status types |
| `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` | frontend streaming | frontend agent status handler | Read `status`/`can_interrupt` only and delegate mutation to the frontend runtime status/action mutation owner | Single frontend agent/member status event owner | frontend status type |
| `autobyteus-web/services/agentStreaming/handlers/teamHandler.ts` | frontend streaming | frontend team status handler | Read `TEAM_STATUS.status` only | Single frontend team aggregate handler | `AgentTeamStatus` |
| `autobyteus-web/types/agent/AgentStatus.ts` | frontend types | agent status enum | Collapse to `Offline`, `Idle`, `Running`, `Error` | Removes API-visible detailed statuses while preserving inactive/offline distinction | N/A |
| `autobyteus-web/types/agent/AgentTeamStatus.ts` | frontend types | team status enum | Collapse to `Offline`, `Idle`, `Running`, `Error` | Removes team legacy statuses while preserving inactive/offline distinction | N/A |
| `autobyteus-web/types/agent/AgentRunState.ts` / `AgentContext.ts` | frontend context state | agent status/action state | Add `canInterrupt`; remove `isSending` as status/action owner | Stores backend contract | frontend status type |
| `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` (new) | frontend runtime status/action state | controlled mutation boundary for `AgentRunState.currentStatus` and `canInterrupt` | Provide explicit functions for live status events, active placeholders, member/history status snapshots, and offline/terminal cleanup; forbid ad hoc `canInterrupt` writes from history/recovery/open code | Frontend runtime status/action mutation owner | `AgentContext`, `AgentStatusPayload`, frontend status type |
| `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` and `activeContextStore.ts` | frontend input | input affordance | Show interrupt from selected context `canInterrupt` | UI action owner | frontend status state |
| `autobyteus-web/services/runHydration/runtimeStatusNormalization.ts` | frontend hydration | coarse normalization | Map history/runtime strings to `offline/idle/running/error`; no detailed placeholders | Hydration contract owner | frontend status types |
| `autobyteus-web/services/runRecovery/activeRunRecoveryCoordinator.ts` | frontend recovery | active recovery placeholder policy | Newly created/not-yet-snapshotted single-agent contexts may use `running/canInterrupt=false`; existing active subscribed contexts preserve current live status/action state; active team rows may use aggregate `running`; team-member contexts must preserve member-scoped status/action state or set `offline/canInterrupt=false` until member snapshots arrive | Prevents recovery from fanning team aggregate into members or revoking live interrupt permission | frontend status types |
| `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | frontend run open | active team open merge | Opening an active team may set the team aggregate placeholder from `resumeConfig.isActive`, but must not seed all members from that aggregate; merge hydrated members preserving member-scoped statuses unless explicit member status snapshots are supplied | Existing open owner for active/historical team contexts | frontend status types |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | frontend hydration | live team context construction | `memberStatuses: []` means no member-scoped snapshot is available, so new active team members default to `offline/canInterrupt=false`; apply supplied member snapshots by `memberRouteKey` or `memberRunId`; never infer member `running` from `currentStatus='ACTIVE'` | Existing team hydration owner | frontend status types |
| `autobyteus-web/stores/runHistoryLoadActions.ts` | frontend history load/reconcile | active team discovery reconciliation | Existing active team contexts: lock config/connect stream/update team aggregate only; merge member statuses from backend `team.members[].status` when available; never loop all members to `running` | First-load/refresh owner for sidebar state | frontend status types |
| `autobyteus-web/stores/runHistoryTeamHelpers.ts` | frontend team history/read model | member-scoped history/context merge | `buildTeamNodes(...)` consumes backend member `status` and overlays live member contexts only as member-scoped values; `buildTeamMemberContexts(...)` and `applyProjectionToTeamMemberContext(...)` use explicit member status or preserve existing status, defaulting to `offline` rather than `running` for active teams | Existing team node/member context helper owner | frontend status types |
| `autobyteus-web/stores/runHistoryStore.ts` | frontend history store local mutations | local mark/reconcile active helpers | `markTeamAsActive(...)` and `reconcileActiveTeamRunIds(...)` update team aggregate/isActive metadata only; member statuses are preserved or set from member-scoped backend data, never all-running | Existing store owner for local run history state | frontend status types |
| `autobyteus-web/stores/runHistoryReadModel.ts`, `utils/runTreeLiveStatusMerge.ts` | frontend history/read model | history status consumption | Read backend-provided coarse `status` for history rows; only map status back to existing tree active/error flags where those flags still exist internally; no team aggregate-to-member shortcut | Read model owner; not status policy owner | frontend status types |
| `autobyteus-web/composables/useStatusVisuals.ts`, `useTeamStatusVisuals.ts`, running/history row components | frontend display | status visuals | Display Offline/Idle/Running/Error for API status | UI display owner | frontend status types |

## Ownership Boundaries

The authoritative status boundary is the runtime backend. Callers above that boundary must not inspect runtime internals, provider payloads, lifecycle events, or frontend local send flags to decide status.

Within the frontend, status/action mutation must also have one boundary. `AgentRunState.currentStatus` and `AgentRunState.canInterrupt` are stored on the context, but direct writes are not the ownership model. All non-test writes must go through the frontend runtime status/action mutation owner. That owner distinguishes four source classes:

1. `liveStatusEvent`: applies `AGENT_STATUS.status` and `AGENT_STATUS.can_interrupt`; this is the only path that may grant or revoke interrupt permission while an active stream is live.
2. `activePlaceholder`: for a newly created/recovered active context before a backend snapshot is received; may set `running/canInterrupt=false`.
3. `memberOrHistoryStatusSnapshot`: may update display status from backend history/member status, but must preserve existing live `canInterrupt` for existing active subscribed contexts because history rows do not carry action permission.
4. `offlineOrTerminalCleanup`: termination, local close, inactive history, disconnect with no active backend runtime, or error cleanup; may set `canInterrupt=false`.

History refresh, active recovery, and run-open coordinators are consumers of this boundary. They must not write `context.state.canInterrupt = false` directly for an existing live subscribed context.

- Runtime/backend owns current status truth.
- Stream handler owns delivery timing and snapshot ordering.
- Frontend owns rendering only.

No upstream caller should depend on both `AgentRunBackend` and backend internals like `CodexThread.currentStatus` or `ClaudeSession.activeTurnExecution`.

### Frontend Runtime Status/Action Mutation API

`autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` owns all non-test mutations to agent/member `AgentRunState.currentStatus` and `AgentRunState.canInterrupt`.

Target API shape:

```ts
applyLiveAgentStatus(context, payload);
applyActivePlaceholder(context, options?: { preserveExistingLive?: boolean });
applyHistoryStatusSnapshot(context, status, options?: { preserveLiveInterrupt?: boolean });
applyOfflineCleanup(context, status?: 'offline' | 'error');
```

Required behavior:

- `applyLiveAgentStatus(...)`
  - sets `currentStatus = payload.status`
  - sets `canInterrupt = payload.status === 'running' && payload.can_interrupt === true`
  - is the only method that may grant interrupt permission.
- `applyActivePlaceholder(...)`
  - for newly created/not-yet-snapshotted active contexts, sets `running/canInterrupt=false`
  - when `preserveExistingLive` is true and the context is already subscribed/live, does not modify `currentStatus` or `canInterrupt`.
- `applyHistoryStatusSnapshot(...)`
  - may update display status from backend history/member status
  - must preserve `canInterrupt` for active subscribed contexts when `preserveLiveInterrupt` is true, because history status rows do not carry action permission.
- `applyOfflineCleanup(...)`
  - sets `offline` or `error`
  - always sets `canInterrupt=false`.

The implementation should remove direct call-site writes such as `context.state.canInterrupt = false` from `runHistoryLoadActions.ts`, `activeRunRecoveryCoordinator.ts`, `teamRunOpenCoordinator.ts`, and `runHistoryTeamHelpers.ts` unless the write is replaced with one of the explicit methods above.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentRunBackend.getStatusSnapshot()` | native detail status, Codex currentStatus, Claude active turn/error state | `AgentStreamHandler`, team snapshot service | stream handler reaching into runtime-specific objects | Add fields to `AgentStatusPayload` only if truly needed. |
| Runtime-specific status projector | provider payload/status parsing | event converters/backend classes | frontend receiving raw provider status payload | Normalize inside backend projector. |
| Team API status aggregator | member `AgentStatusPayload` snapshots and optional native team raw status | live team managers, team snapshot service | managers/snapshot service each deriving aggregate status locally | Add/extend helper API in `agent-team-execution/domain/team-status-aggregation.ts`. |
| `TeamRunBackend.getStatusSnapshot()` | backend-specific member status collection and aggregate owner call | `AgentTeamStreamHandler`, team domain wrapper | caller using `getStatus()` string or constant active `IDLE` | Replace interface method and delegate to aggregator. |
| Frontend runtime status/action mutation owner | `AgentRunState.currentStatus`, `AgentRunState.canInterrupt`, source-class rules for live events/placeholders/history snapshots/offline cleanup | status handler, run-history refresh, active recovery, run-open, local terminate/close | direct writes to `context.state.canInterrupt` or `context.state.currentStatus` from refresh/recovery/open code | Add an explicit source-class method to `agentRuntimeStatusState.ts` and route callers through it. |
| Frontend status handler | live `AGENT_STATUS.status` and `AGENT_STATUS.can_interrupt` payloads | input component/status display through active context | input component reading `isSending` as status | Delegate live payload mutation to the frontend runtime status/action mutation owner and expose active context `canInterrupt`. |
| Frontend team member status merge/read model | backend history member statuses, member `AGENT_STATUS` snapshots/events, existing member context status | history tree, active-team recovery/hydration/open/reconcile paths | deriving all member statuses from `team.status`, `team.isActive`, `resumeConfig.isActive`, or `currentStatus='ACTIVE'` | Add member-status input/merge helpers or per-file explicit member-preserve/default-offline logic. |

## Dependency Rules

Allowed:

- runtime converters/projectors may depend on shared `AgentStatusPayload` type.
- stream handlers may depend on `AgentRunBackend.getStatusSnapshot()`.
- team snapshot service may depend on member backend status snapshots and the team aggregate helper.
- live team managers may depend on the team aggregate helper.
- frontend input may depend on active context `can_interrupt`.
- frontend history/recovery/open code may request placeholder, snapshot, or offline cleanup transitions, but may not directly own action permission for live contexts.

Forbidden:

- frontend must not derive interrupt availability from `isSending`.
- frontend must not derive status from `TURN_COMPLETED`, `ASSISTANT_COMPLETE`, or `ERROR`.
- stream handlers must not parse provider-specific status payloads.
- team snapshot path must not use Codex/Claude constant active `IDLE` as authoritative aggregate status.
- no old/new status dual fields in the `AGENT_STATUS` or `TEAM_STATUS` payloads.
- live team managers and team snapshot service must not own separate aggregate rules; both must call the same aggregate helper.
- frontend hydration/recovery/history paths must not introduce `uninitialized`, `processing`, `shutdown_complete`, or detailed phase statuses as API-visible current statuses.
- frontend team-member statuses must not be derived from `TEAM_STATUS.status`, `team.isActive`, `resumeConfig.isActive`, or `currentStatus='ACTIVE'`.
- frontend active-team recovery/open/reconcile paths must not contain loops that set every member status to `AgentStatus.Running`.
- `memberStatuses: []` in live team hydration means "unknown member-scoped status", not "all members running"; unknown active team members default to `offline/canInterrupt=false` unless an existing member-scoped status is being preserved.
- frontend active single-agent/team-member refresh or recovery paths must not set `canInterrupt=false` on an existing active subscribed context after a live `AGENT_STATUS` has granted interrupt permission. Preserve existing `canInterrupt` until a later `AGENT_STATUS`, local termination/offline cleanup, or explicit error cleanup changes it.
- `buildTeamNodes(...)` may overlay live member contexts over history rows only as member-scoped overlays; it must not use `teamContext.currentStatus` to calculate member `currentStatus`.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentRunBackend.getStatusSnapshot()` | one agent run | Return current `AgentStatusPayload` | run already bound by backend instance | Replaces `getStatus()`. |
| `AgentRunEventType.AGENT_STATUS` payload | one agent run status update | Carry normalized live status | run id on event + optional member identity for team forwarding | Payload is already normalized. |
| `AgentStreamHandler.connect(connection, agentRunId)` | one stream session | Bind live events then send status snapshot | `agentRunId` | No provider-specific logic. |
| `TeamRuntimeStatusSnapshotService.getInitialMessages(teamRun)` | one team run | Emit member statuses and aggregate team status | `teamRunId`, member identity from runtime metadata | Calls team aggregate helper. |
| `TeamRunBackend.getStatusSnapshot()` | one team run | Return current `TeamStatusPayload` | team run already bound by backend instance | Replaces `getStatus()`. |
| `TeamRunEventType.TEAM` / `TeamRunStatusUpdateData` | one team run aggregate status update | Carry normalized `{ status }` | `teamRunId` on event | No `new_status`/`old_status`. |
| frontend `handleTeamStatus(payload, context)` | one frontend team context | Store aggregate `status` | already-routed team context | No fallback to legacy fields. |
| frontend `handleAgentStatus(payload, context)` | one frontend agent context | Store `status` and `can_interrupt` | already-routed context or `agent_id`/`agent_name` for team | No fallback to legacy fields. |
| frontend team-member status merge | one team member row/context | Store or render member status from member-scoped sources only | `memberRouteKey` first, `memberRunId` fallback | `TEAM_STATUS` / team active metadata never supplies member status. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `getStatusSnapshot()` | Yes | Yes | Low | Bound to one backend/run instance. |
| team member `AGENT_STATUS` | Yes | Yes if includes member identity | Low | Require `agent_id` or `agent_name` when envelope is not member-scoped. |
| `TEAM_STATUS` | Yes | Yes | Low | Payload is `{ status }` only. |
| frontend team-member status merge | Yes | Yes | Medium | Use `memberRouteKey`/`memberRunId`; forbid fallback from team aggregate to member status. |
| frontend active context selector | Yes | Yes | Low | Selected context owns `can_interrupt`. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| API status payload | `AgentStatusPayload` | Yes | Low | Keep fields minimal. |
| API status enum/type | `AgentApiStatus` | Yes | Low | Avoid `RuntimeStatus` ambiguity. |
| Runtime mapping owner | `*StatusProjector` | Yes | Low | Use only where it transforms runtime truth to API payload. |
| Team aggregate owner | `deriveTeamApiStatus` / `team-status-aggregation.ts` | Yes | Low | One aggregate rule for live and snapshot team status. |
| action permission | `can_interrupt` | Yes | Low | Prefer verb/action name over abstract `is_interruptible`. |

## Applied Patterns (If Any)

- Adapter: runtime-specific status projectors adapt native/Codex/Claude status into one API payload.
- State machine: native AutoByteus keeps its existing detailed state machine internally.
- Snapshot: stream connect sends current status snapshot using the same shape as live status events.
- Aggregator: team aggregate status is a pure domain helper used by live managers and snapshot collection.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts` | File | API status model | `AgentApiStatus`, `AgentStatusPayload`, small helper predicates | Domain-level single/member event contract | Provider-specific status branches |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-status-payload.ts` | File | team API status model | `TeamStatusPayload` | Team-level event contract | Member action permission |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-status-aggregation.ts` | File | team aggregate owner | `deriveTeamApiStatus` | Shared by live managers and snapshots | Transport serialization |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-status-projector.ts` | File | AutoByteus adapter | native detailed status collapse | Runtime-specific adapter area | Codex/Claude branches |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-status-projector.ts` | File | Codex adapter | Codex status normalization | Codex event adapter area | Frontend/WS concerns |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-status-projector.ts` | File | Claude adapter | Claude status normalization | Claude event adapter area | Frontend/WS concerns |
| `autobyteus-server-ts/src/services/agent-streaming` | Folder | streaming transport | websocket mapping/snapshots | Existing transport owner | Runtime status policy |
| `autobyteus-web/services/agentStreaming/handlers` | Folder | frontend event handling | context updates from WS messages | Existing frontend stream owner | backend/runtime inference |
| `autobyteus-web/services/runHydration` | Folder | frontend hydration | coarse runtime/history status normalization | Existing hydration owner | detailed API statuses |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | File | frontend team hydration | construct team member contexts from metadata/projections plus explicit member status snapshots; default unknown active members to offline | Existing team hydration owner | deriving member status from team aggregate active/running |
| `autobyteus-web/services/runRecovery` | Folder | frontend recovery | active placeholder/status snapshot subscription policy | Existing recovery owner | persistent fake statuses or all-member-running fan-out |
| `autobyteus-web/stores/runHistoryLoadActions.ts` | File | frontend history load/reconcile | reconcile discovered active runs/teams without fanning aggregate team state into members | First-load/refresh owner | all-member-running loops |
| `autobyteus-web/stores/runHistoryTeamHelpers.ts` | File | frontend team read model/helpers | member-scoped status merge for build/open/projection helpers | Existing team helper owner | using `isActive` as member-running status |
| `autobyteus-web/stores/runHistoryStore.ts` | File | frontend local history mutations | team aggregate active/inactive metadata updates without member fan-out | Existing history store owner | setting all team member statuses to running |
| `autobyteus-web/stores` / `autobyteus-web/utils/runTreeLiveStatusMerge.ts` | Folder/File | frontend history read model | map coarse live statuses to history flags and overlay member-scoped values only | Existing history/read-model owners | detailed status policy or team aggregate-to-member shortcuts |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-execution/domain` | Main-Line Domain-Control | Yes | Low | Shared API model belongs above backend variants. |
| `backends/*/events` | Persistence-Provider / Adapter | Yes | Low | Runtime-specific event/status adaptation already lives here. |
| `services/agent-streaming` | Transport | Yes | Medium | Must avoid owning status policy; only validates/serializes. |
| `agent-team-execution/domain` | Main-Line Domain-Control / Off-Spine Aggregate Concern | Yes | Low | Owns team payload and aggregate policy used across live/snapshot paths. |
| `autobyteus-web/services/agentStreaming` | Transport/UI boundary | Yes | Medium | Must store API truth, not derive runtime truth. |
| `autobyteus-web/services/runHydration` | Off-Spine Concern | Yes | Low | Coarse normalization for historical/live context construction. |
| `autobyteus-web/services/runRecovery` | Off-Spine Concern | Yes | Low | Active recovery placeholder policy before authoritative snapshot. |
| `autobyteus-web/stores` / history utilities | Off-Spine Concern | Yes | Medium | Must project coarse status to history flags without becoming a second status owner. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| API payload | `{ status: "running", can_interrupt: true }` | `{ new_status: "AWAITING_LLM_RESPONSE", old_status: "IDLE", lifecycle_state: "WORKING" }` | Keeps one status representation and one action permission. |
| Codex status changed | `thread/status/changed idle -> { status: "idle", can_interrupt: false }` | forward `{ status: { type: "idle" } }` to frontend | Provider payload must not cross API boundary. |
| Frontend input | `showStop = activeContext.canInterrupt` | `showStop = activeContext.isSending` | Removes duplicated frontend status policy. |
| Team snapshot | `AGENT_STATUS { status: "running", can_interrupt: true, agent_name: "solution designer" }` then `TEAM_STATUS { status: "running" }` | `TEAM_STATUS { new_status: "IDLE" }` only | Member UI needs member-scoped truth and aggregate team display needs the same coarse contract. |
| Active recovery placeholder | active restored single-agent row starts as `status="running", canInterrupt=false`; active team row may start as `status="running"`; team members preserve member-scoped status or start `offline/canInterrupt=false` until member snapshot | active restored team sets every member to `Running` or `Uninitialized` | Placeholder must be coarse, but team-member placeholders are not aggregate-derived. |
| First-load history row | inactive row returns `status: "offline"` even if persisted `lastKnownStatus` is `IDLE` | frontend maps `lastKnownStatus=IDLE` to green Idle | Prevents app-restart history from masquerading as an active idle runtime. |
| Active team with one running member | backend row/snapshot has `team.status="running"`, `solution_designer.status="running"`, all other `members[].status="offline"`; refresh/recovery/read-model overlay preserves exactly that | frontend sees `team.status="running"` or `isActive=true` and writes `running` to every member | This is the reported post-build bug and the DS-009 invariant. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `AGENT_STATUS.new_status` alongside `status` | Current frontend reads `new_status` | Rejected | Change frontend and backend together to use `AGENT_STATUS.status` only. |
| Keep `TEAM_STATUS.new_status` alongside `status` | Current team handler reads `new_status` | Rejected | Change team server/frontend together to use `TEAM_STATUS.status` only. |
| Accept both `can_interrupt` and `is_interruptible` | Naming transition | Rejected | Use `can_interrupt` only. |
| Keep detailed statuses in API and map visually | Existing status chip supports detail labels | Rejected | API status is coarse `offline/idle/running/error`; details remain internal. |
| Keep `isSending` for stop button until migration | Reduces frontend edits | Rejected | Stop button reads `can_interrupt` only. |
| Keep Codex raw status payload fallback | Avoids converter work | Rejected | Codex projector normalizes every status event. |
| Keep Claude `lastStatus` snapshot fallback | Avoids Claude refactor | Rejected | Claude current status owner feeds live events and snapshots. |

## Derived Layering (If Useful)

```text
Runtime internals
  -> Runtime backend status projection
  -> Agent execution domain event payload
  -> WebSocket transport
  -> Frontend context state
  -> UI rendering/actions
```

Layering is explanatory only. The authoritative boundary is the runtime backend status projection, not the layer label.

## Migration / Refactor Sequence

1. Add server status model files:
   - `agent-execution/domain/agent-status-payload.ts`
   - `agent-team-execution/domain/team-status-payload.ts`
   - `agent-team-execution/domain/team-status-aggregation.ts`
2. Replace single-agent `AgentRunBackend.getStatus()` / `AgentRun.getStatus()` with `getStatusSnapshot(): AgentStatusPayload` across native AutoByteus, Codex, and Claude backends.
3. Replace team `TeamRunBackend.getStatus()` / `TeamRun.getStatus()` with `getStatusSnapshot(): TeamStatusPayload` across native AutoByteus, Codex, Claude, and Mixed team backends.
4. Implement AutoByteus status projector:
   - detailed native status/runtime availability -> `offline/idle/running/error`
   - `can_interrupt` from active turn and locked statuses.
5. Implement Codex status projector:
   - `CodexThread.currentStatus` + `activeTurnId` -> API payload
   - normalize `turn/started`, `turn/completed`, `thread/status/changed`, and `error` to `AGENT_STATUS`.
6. Implement Claude current status owner/projector:
   - initialize no-turn sessions as `idle`
   - update on turn start, completion, interruption, termination, and error
   - emit `TURN_INTERRUPTED` for interruption cleanup plus terminal `AGENT_STATUS idle`.
7. Update team event contract and managers:
   - `TeamRunStatusUpdateData` becomes `{ status: AgentApiStatus; error_message?: string | null }`
   - Codex/Claude/Mixed managers call `deriveTeamApiStatus(...)` instead of local `deriveTeamStatus()` rules
   - native team event processor maps native team status through the same team status payload contract.
8. Update stream mappers/handlers:
   - `AgentRunEventMessageMapper` requires/passes `{ status, can_interrupt }` for `AGENT_STATUS`
   - team stream emits `TEAM_STATUS { status }`
   - single-agent and team stream connect bind live listeners before sending snapshots
   - `AgentTeamStreamHandler.sendInitialStatusSnapshot` string path is removed.
9. Update `TeamRuntimeStatusSnapshotService`:
   - member snapshots contain member-scoped `AgentStatusPayload`
   - aggregate `TEAM_STATUS` is derived by `deriveTeamApiStatus(...)`
   - no snapshot code owns independent aggregate logic.
10. Update run-history API/read models:
   - `ListWorkspaceRunHistory` history rows expose normalized `status: AgentApiStatus` for agents, teams, and displayed team members
   - active rows use `getStatusSnapshot()` / team snapshot aggregation where available
   - inactive non-error rows emit `offline`; historical error rows emit `error`
   - frontend history no longer derives display status from `isActive`/`lastKnownStatus` alone.
11. Update frontend protocol/types:
   - `AgentStatus` enum becomes `Offline | Idle | Running | Error`
   - `AgentTeamStatus` enum becomes `Offline | Idle | Running | Error`
   - `AgentStatusPayload` is `{ status, can_interrupt, agent_id?, agent_name? }`
   - `TeamStatusPayload` is `{ status }`.
12. Update frontend handlers/context:
   - `handleAgentStatus` reads only `status` and `can_interrupt`
   - `handleAgentStatus` applies that payload through `agentRuntimeStatusState.applyLiveAgentStatus(...)`
   - `handleTeamStatus` reads only `status`
   - `AgentRunState` stores `currentStatus` and `canInterrupt`
   - `AgentContext.isSending` is removed or renamed to a non-status submit-in-flight flag if still needed; it must not control the interrupt button.
13. Update frontend hydration/recovery/history/display:
   - add `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` as the frontend mutation boundary for `currentStatus` and `canInterrupt`
   - remove direct non-test writes to `state.canInterrupt` outside the mutation boundary, except when replaced by explicit calls to that boundary's offline/placeholder methods
   - normalization maps all runtime/history tokens to `offline/idle/running/error`
   - single-agent active recovery/open placeholders use `running/canInterrupt=false` only for newly created/not-yet-snapshotted contexts; existing active subscribed contexts preserve live status/action state
   - active team-row aggregate placeholders may use `running`
   - active team-member placeholders must preserve existing member-scoped status/action state or use `offline/canInterrupt=false` until member-scoped history/snapshot/event status arrives
   - inactive/local terminated status is `offline/canInterrupt=false`
   - any remaining internal history flags are derived from coarse status only after display status has already been consumed
   - visuals and running/history rows display only Offline/Idle/Running/Error.
14. Remove frontend active-team aggregate-to-member fan-out:
   - `runHistoryLoadActions.ts`: when reconciling an existing active team context, update team aggregate/lock/connect only; remove the loop that sets every member `AgentStatus.Running`; when hydrating a newly discovered active team, pass member statuses from the matching backend history row if available, otherwise let unknown members default offline.
   - `activeRunRecoveryCoordinator.ts`: when recovering an existing active team context, set the team row aggregate to running if needed and connect the stream, but do not change every member to running; preserve member-scoped statuses or set unknown members offline/non-interruptible.
   - `teamRunContextHydrationService.ts`: define `memberStatuses: []` as "no member-scoped status available"; `applyMemberStatuses(...)` updates only matched members; unmatched active members remain offline/preserved, never running because the team is active.
   - `teamRunOpenCoordinator.ts`: opening/restoring active teams must not seed every member from the aggregate; merge hydrated members while preserving live member-scoped status unless explicit member snapshots are supplied.
   - `runHistoryTeamHelpers.ts`: update `buildTeamMemberContexts(...)` and `applyProjectionToTeamMemberContext(...)` so `isActive` controls locking/historical hydration only, not member status; update `buildTeamNodes(...)` so backend member `status` and live member context `state.currentStatus` are member-scoped overlays only.
   - `runHistoryStore.ts`: update `markTeamAsActive(...)` and `reconcileActiveTeamRunIds(...)` to change team aggregate metadata only; member statuses are preserved or updated only from member-scoped backend data.
15. Update input component and active context selectors:
   - expose `canInterrupt` from the selected agent/focused member context
   - show interrupt only from `canInterrupt`.
16. Remove obsolete tests/code that expect `new_status`, `old_status`, detailed API statuses, `Uninitialized`, `ShutdownComplete`, `Processing`, `isSending` status ownership, or active-team all-member-running behavior.



## Initial History Status Contract

`ListWorkspaceRunHistory` is part of the status data-flow spine because it seeds the sidebar before any WebSocket stream is opened. Its displayed rows must carry normalized status from the backend.

Target row fields:

```ts
type RunHistoryDisplayStatus = AgentApiStatus;

interface RunHistoryItem {
  runId: string;
  status: RunHistoryDisplayStatus;
  isActive: boolean;       // metadata/recovery only, not display status authority
  lastKnownStatus: string; // persisted history metadata only
}

interface TeamRunHistoryItem {
  teamRunId: string;
  status: RunHistoryDisplayStatus;
  isActive: boolean;
  lastKnownStatus: string;
  members: TeamRunMemberHistoryItem[];
}

interface TeamRunMemberHistoryItem {
  memberRunId: string;
  status: RunHistoryDisplayStatus;
}
```

History projection rule:

```ts
if active single-agent runtime exists:
  row.status = activeRun.getStatusSnapshot().status
else if persisted status is error:
  row.status = 'error'
else:
  row.status = 'offline'

if active team runtime exists:
  team.status = teamRun.getStatusSnapshot().status
  member.status = matching member status snapshot, or 'offline' when missing
else if persisted team status is error:
  team.status = 'error'
  member.status = 'offline' // unless member-level error metadata exists later
else:
  team.status = 'offline'
  member.status = 'offline'
```

This rule intentionally treats stale persisted `ACTIVE`, `IDLE`, and `TERMINATED` metadata as `offline` whenever no active backend runtime/session exists. A live idle display is possible only when an active runtime snapshot says `idle`.

Frontend history/read-model code must consume `row.status` / `team.status` / `member.status` for status dots, labels, and terminate affordances. Any remaining `isActive` and `lastKnownStatus` use is limited to metadata, sorting, archive/delete eligibility, and compatibility with persisted history records; it is not display status authority.


## Team Status Contract And Aggregate Owner

`TEAM_STATUS` uses the same coarse status vocabulary as `AGENT_STATUS`, but has a separate payload because team aggregate status is not an agent action permission.

```ts
type TeamStatusPayload = {
  status: AgentApiStatus;
};
```

No `can_interrupt` is included on `TEAM_STATUS`. The selected/focused member's `AGENT_STATUS.can_interrupt` controls the input interrupt button.

The sole aggregate owner is:

```text
autobyteus-server-ts/src/agent-team-execution/domain/team-status-aggregation.ts
```

Target helper shape:

```ts
export function deriveTeamApiStatus(input: {
  memberStatuses: Array<Pick<AgentStatusPayload, 'status'>>;
  nativeTeamStatus?: unknown;
}): AgentApiStatus {
  if (any member.status === 'error' or nativeTeamStatus maps to error) return 'error';
  if (any member.status === 'running' or nativeTeamStatus maps to running) return 'running';
  if (any member.status === 'idle' or nativeTeamStatus maps to idle) return 'idle';
  return 'offline';
}
```

Live Codex/Claude/Mixed team managers and `TeamRuntimeStatusSnapshotService` must both call this helper. No live manager may keep a local `deriveTeamStatus()` policy table, and no stream handler may derive aggregate status.

Example initial team snapshot after connect:

```ts
AGENT_STATUS {
  status: 'running',
  can_interrupt: true,
  agent_id: 'member-run-sd',
  agent_name: 'solution designer'
}

AGENT_STATUS {
  status: 'idle',
  can_interrupt: false,
  agent_id: 'member-run-cr',
  agent_name: 'code reviewer'
}

TEAM_STATUS {
  status: 'running'
}
```

If all members are historical/non-active after app restart:

```ts
AGENT_STATUS { status: 'offline', can_interrupt: false, agent_name: 'solution designer' }
AGENT_STATUS { status: 'offline', can_interrupt: false, agent_name: 'code reviewer' }
TEAM_STATUS  { status: 'offline' }
```

`TeamRunBackend.getStatus()` and `TeamRun.getStatus()` are decommissioned. The replacement boundary is:

```ts
getStatusSnapshot(): TeamStatusPayload
```

Native AutoByteus team backend uses native team/member status through the same team payload/aggregation owner. Codex, Claude, and Mixed team backends delegate aggregate calculation to their team manager or a shared collector that calls `deriveTeamApiStatus(...)`; none may return constant active `IDLE`.

## Frontend Migration / Removal Details

The frontend migration is part of the design, not an implementation afterthought, because stale status currently survives through hydration/recovery/history paths.

### Frontend Status Types

Target `AgentStatus.ts`:

```ts
export enum AgentStatus {
  Offline = 'offline',
  Idle = 'idle',
  Running = 'running',
  Error = 'error',
}
```

Target `AgentTeamStatus.ts`:

```ts
export enum AgentTeamStatus {
  Offline = 'offline',
  Idle = 'idle',
  Running = 'running',
  Error = 'error',
}
```

Remove API-visible `Uninitialized`, `Bootstrapping`, `Processing`, `ShuttingDown`, `ShutdownComplete`, `AwaitingLlmResponse`, `ExecutingTool`, and other detailed values from these frontend status enums. Preserve `Offline` because inactive history/no runtime is a distinct product state from active-runtime `Idle`.

### Frontend Context State

`AgentRunState` owns:

```ts
currentStatus: AgentStatus;
canInterrupt: boolean;
```

Initial local default is:

```ts
currentStatus = AgentStatus.Offline;
canInterrupt = false;
```

Single-agent active run recovery/open may temporarily set a newly created or not-yet-snapshotted context:

```ts
currentStatus = AgentStatus.Running;
canInterrupt = false;
```

This is only a local pending-snapshot display state and must be overwritten by the post-bind `AGENT_STATUS` snapshot. It must not be reapplied to an existing active subscribed context after a live snapshot/event has already supplied `canInterrupt`.

Active team recovery has two different placeholder levels:

```ts
teamContext.currentStatus = AgentTeamStatus.Running; // aggregate/team-row placeholder only
memberContext.state.currentStatus = existingMemberScopedStatus ?? AgentStatus.Offline;
memberContext.state.canInterrupt = false;
```

The team aggregate placeholder must not be copied into member contexts. For existing live member contexts, preserve the member's current `canInterrupt` unless a member-scoped `AGENT_STATUS` or explicit offline/error cleanup changes it.

### Hydration And Recovery

`runtimeStatusNormalization.ts` becomes a coarse normalizer only:

```ts
active | processing | running | bootstrapping | shutting_down | uninitialized -> running when recovering an active run
idle                                                                 -> idle when a live backend snapshot says idle
shutdown_complete | offline | terminated | missing inactive history          -> offline
error | failed                                                       -> error
```

Rules:
- active recovered single-agent runs and team rows use `running` as a placeholder, never `uninitialized`.
- active recovered team members do not use `running` as a placeholder merely because the team is active; they preserve member-scoped status or default to `offline/canInterrupt=false`.
- inactive, terminated, offline, and local terminate paths use `offline`, never `idle` or `shutdown_complete`.
- these placeholders are display/snapshot-waiting state only; live backend status still comes from `AGENT_STATUS`/`TEAM_STATUS`.

### Team Member Fan-Out Removal

This section is binding for DS-009.

Target example after app restart or refresh:

```ts
team.status = 'running';
team.members = [
  { memberRouteKey: 'solution_designer', status: 'running' },
  { memberRouteKey: 'architecture_reviewer', status: 'offline' },
  { memberRouteKey: 'implementation_engineer', status: 'offline' },
  { memberRouteKey: 'code_reviewer', status: 'offline' },
  { memberRouteKey: 'api_e2e_engineer', status: 'offline' },
  { memberRouteKey: 'delivery_engineer', status: 'offline' },
];
```

Frontend paths must preserve this shape through initial load, periodic refresh, active recovery, open/reopen, stream reconnect, and read-model overlay.

Concrete migration rules:

- `runHistoryLoadActions.ts`
  - Existing active single-agent context: lock config/connect stream, but do not overwrite `state.currentStatus` or `state.canInterrupt` if the context is already subscribed/live; preserve the current live state until the next `AGENT_STATUS` snapshot/event. For a newly hydrated active placeholder, use `running/canInterrupt=false` only until stream snapshot.
  - Existing active team context: lock config and connect stream, but do not set all members to `AgentStatus.Running`.
  - If the latest `ListWorkspaceRunHistory` response contains member statuses for that `teamRunId`, merge those statuses by `memberRouteKey`/`memberRunId`; preserve existing member `canInterrupt` for active subscribed member contexts because history member statuses do not include action permission.
  - If no member-scoped status exists for a member, keep its existing member-scoped status and action permission if the member context is live/subscribed; otherwise set `offline/canInterrupt=false`.
  - New active team hydration must not call `hydrateLiveTeamRunContext(... memberStatuses: [])` in a way that creates running members. Either pass member statuses from the matching history row or rely on offline unknown-member defaults.
- `activeRunRecoveryCoordinator.ts`
  - Single-agent active recovery may set a newly created or not-yet-snapshotted context to `running/canInterrupt=false`; for an existing active subscribed context it must preserve current status/action state and only ensure the stream is connected.
  - Active team recovery may set only `teamContext.currentStatus = AgentTeamStatus.Running`.
  - Team members are preserved/offline until member `AGENT_STATUS` snapshots arrive; preserve member `canInterrupt` for live member contexts.
- `teamRunContextHydrationService.ts`
  - `memberStatuses: []` means "no status evidence", not "all active".
  - `applyMemberStatuses(...)` updates matched members only.
  - Unmatched members remain existing/preserved if merging, or `offline/canInterrupt=false` for newly built contexts.
- `runHistoryTeamHelpers.ts`
  - `buildTeamMemberContexts(...)`: `isActive` may lock config, but initial member status comes from explicit member status or defaults to offline.
  - `applyProjectionToTeamMemberContext(...)`: projection hydration must not change a member to running solely because the team/run is active.
  - `buildTeamNodes(...)`: persisted `member.status` and live `memberContext.state.currentStatus` are the only member display status sources; `teamContext.currentStatus` is used for the team row only.
- `teamRunOpenCoordinator.ts`
  - Opening active teams must preserve live member-scoped status when present.
  - New active team contexts built without member status snapshots start members offline/non-interruptible until snapshots/events apply.
- `runHistoryStore.ts`
  - `markTeamAsActive(...)` and `reconcileActiveTeamRunIds(...)` must not write `AgentStatus.Running` into every `team.members[]`.
  - They may update `team.status`, `team.isActive`, `lastKnownStatus`, and timestamps; member statuses are preserved unless a member-scoped backend status is being merged.

### Local Termination

`agentRunStore` and `agentTeamRunStore` local terminate/remove paths must set:

```ts
status = 'offline';
canInterrupt = false;
```

They must not set `ShutdownComplete` because that value is removed from the API-visible status model.

### History / Read Model

The backend history API should provide normalized `status` for displayed rows. Existing `ACTIVE | IDLE | ERROR` flags may remain internal/persistent for sorting and legacy history metadata, but they are not the frontend display-status source. Mapping from live frontend state back into those internal flags becomes:

```ts
status === 'error'   -> { isActive: false, lastKnownStatus: 'ERROR' }
status === 'running' -> { isActive: true,  lastKnownStatus: 'ACTIVE' }
status === 'idle'    -> { isActive: true,  lastKnownStatus: 'ACTIVE' }
status === 'offline' -> { isActive: false, lastKnownStatus: 'IDLE' }
```

For active single-agent rows or active team aggregate rows being recovered, the UI may show `running/canInterrupt=false` / `running` until stream snapshot; once the snapshot arrives, the canonical backend status wins. This placeholder rule does not apply to team members: team members use member-scoped status from history/snapshot/event, preserve an existing member-scoped status, or default to `offline/canInterrupt=false`.

### Display Components

`useStatusVisuals`, `useTeamStatusVisuals`, running rows, history rows, and team workspace status display should support only:

- `Offline`
- `Idle`
- `Running`
- `Error`

No frontend component should display `Awaiting LLM Response` or `Processing Tool Result` from the API status contract after this change.

## Runtime Status Mapping Rules

### Native AutoByteus

| Native Detailed Status | API `status` | `can_interrupt` Rule |
| --- | --- | --- |
| no active runtime / removed / stopped | `offline` | false |
| `idle` | `idle` | false |
| `error` | `error` | false |
| `shutdown_complete` | `offline` | false |
| `uninitialized` | `offline` if historical/no runtime; `running` if active recovery placeholder | false |
| `bootstrapping` | `running` | false |
| `interrupting` | `running` | false |
| `shutting_down` | `running` | false |
| all active turn phases (`processing_user_input`, `awaiting_llm_response`, `analyzing_llm_response`, `awaiting_tool_approval`, `executing_tool`, `processing_tool_result`, `tool_denied`) | `running` | true only when `context.state.activeTurn` exists and the phase is not locked |

### Codex

| Codex State | API `status` | `can_interrupt` Rule |
| --- | --- | --- |
| no active Codex thread/backend | `offline` | false |
| `IDLE` | `idle` | false |
| `RUNNING` | `running` | true only when `activeTurnId` exists |
| `ERROR` | `error` | false |
| app-server close/error | `error` | false |
| terminated/removed | `offline` | false |

### Claude

| Claude State | API `status` | `can_interrupt` Rule |
| --- | --- | --- |
| no active Claude session/backend | `offline` | false |
| active session with no active turn and no error | `idle` | false |
| active turn running | `running` | true |
| interrupting active turn | `running` | false |
| runtime error | `error` | false |
| terminated/removed session | `offline` | false |

### Team

Aggregate `TEAM_STATUS.status` rule:

```ts
if any member.status === "error"   -> "error"
else if any member.status === "running" -> "running"
else if any member.status === "idle"    -> "idle"
else -> "offline"
```

The selected member input button must use the selected member's `can_interrupt`, not the aggregate team status.

## Validation Plan

- Server unit tests:
  - AutoByteus detailed statuses collapse to correct API status/can_interrupt.
  - Codex `turn/started`, `turn/completed`, `thread/status/changed`, and `error` emit normalized `AGENT_STATUS`.
  - Claude new/restored no-turn session snapshots as idle.
  - Claude turn start/completion/interruption/error emit normalized `AGENT_STATUS`.
  - `AgentStreamHandler.connect` binds before snapshot and sends status snapshot.
  - Team connect sends member `AGENT_STATUS` snapshots and aggregate `TEAM_STATUS { status }`, including all-offline members -> team offline.
  - Initial run-history query returns `status=offline` for inactive non-error runs/teams/members after app restart, and active rows use backend status snapshots rather than constant active idle.
  - Codex/Claude/Mixed team managers and snapshot service use the same `deriveTeamApiStatus` helper.
  - `TeamRunBackend.getStatus()` has no remaining callers/implementation; `getStatusSnapshot()` is used instead.
- Frontend unit tests:
  - direct-write audit: production code has no non-test `state.canInterrupt = ...` writes outside `agentRuntimeStatusState.ts` and explicit low-level state initialization; all refresh/recovery/open callers use the mutation owner.
  - `handleAgentStatus` reads only `status`/`can_interrupt`.
  - `handleAgentStatus` delegates live state mutation through `applyLiveAgentStatus(...)`.
  - input button uses `can_interrupt`, not `isSending`.
  - `TeamStatusPayload` and `handleTeamStatus` reject old `new_status` shape.
  - hydration/recovery/history helpers produce only `offline/idle/running/error` statuses; inactive history maps to offline; single-agent/team-row active placeholders may use running, but team-member placeholders preserve member-scoped status or use offline/non-interruptible.
  - history tree rendering consumes backend-provided `status` and does not display inactive non-error rows as green idle based on `lastKnownStatus=IDLE`.
  - AC-013 initial-load case: mocked `ListWorkspaceRunHistory` returns `team.status=running`, `solution_designer.status=running`, and all other members `offline`; after `fetchTree()` and active-team reconciliation, `getTeamNodes()` preserves exactly those member statuses.
  - AC-013 refresh/reconcile case: an existing active team context has all members from metadata; a refreshed backend history response returns one running member and offline members; `runHistoryLoadActions.ts` must not rewrite offline members to running.
  - AC-013 recovery case: `recoverActiveRunsFromHistory(...)` for an existing active team may set the team aggregate to running but leaves non-focused/non-running members offline/non-interruptible until member snapshots arrive.
  - AC-013 hydration/open case: `hydrateLiveTeamRunContext({ memberStatuses: [] })` and `openTeamRun(...)` do not seed every active team member as running; supplied `memberStatuses` are applied only to matching members.
  - AC-013 read-model overlay case: `buildTeamNodes(...)` overlays live member contexts by member only and does not use `teamContext.currentStatus=running` to make offline members running.
  - AC-013 local helper case: `markTeamAsActive(...)` and `reconcileActiveTeamRunIds(...)` update team aggregate metadata without mutating all `team.members[].status` to running.
  - AC-014 single-agent refresh case: an existing subscribed context receives `AGENT_STATUS { status: 'running', can_interrupt: true }`; after `fetchTree()`/`reconcileDiscoveredActiveRuns(...)`, `state.canInterrupt` remains true and the input button remains stop.
  - AC-014 active recovery case: `recoverActiveRunsFromHistory(...)` for an existing subscribed active context preserves `canInterrupt=true`; only newly created placeholders use false.
  - AC-014 team focused-member case: a focused member context with `canInterrupt=true` remains interruptible after active team refresh/recovery unless a member-scoped `AGENT_STATUS` or explicit offline cleanup changes it.
  - lifecycle events complete conversation rendering without changing status.
- Integration/e2e tests:
  - normal completion ends with `status=idle`, `can_interrupt=false`.
  - interruption ends with `status=idle`, `can_interrupt=false`.
  - runtime error ends with `status=error`, `can_interrupt=false`.
  - reconnect after completion receives idle snapshot.
  - Electron-like startup path: backend GraphQL and team WebSocket return `solution_designer=running` and all other members `offline`; after initial load, active recovery, WebSocket snapshot, and one quiet refresh cycle, the sidebar/team members still show only `solution_designer` running.
  - first app load after backend restart renders historical inactive single-agent and team rows as `offline`, not green `idle`.
  - team reconnect receives member statuses.

## Open Risks / Questions

- Product policy for interrupting during `awaiting_tool_approval` and `executing_tool` should be confirmed. The design supports either policy through backend-owned `can_interrupt`; default recommendation is true when an active turn exists unless the runtime is already interrupting/shutting down.
- If the product later wants detailed phase labels again, that should be a separate display-detail feature and must not affect the core `status/can_interrupt` contract.
- `TEAM_STATUS` has no `can_interrupt` by design. If a future product feature adds team-level interrupt-all affordance, it should introduce a separate team action-permission contract rather than overloading aggregate status.
