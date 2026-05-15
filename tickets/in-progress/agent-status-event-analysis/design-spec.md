# Design Spec: Authoritative `AGENT_STATUS` Contract

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

## Intended Change

Make the existing WebSocket/API event `AGENT_STATUS` the single authoritative frontend status contract.

No new API event name is introduced. No backward compatibility is preserved for the old payload shape.

Target payload:

```ts
type AgentApiStatus = "idle" | "running" | "error";

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

- `AGENT_STATUS.status` is the current coarse runtime work state for one agent/member.
- `AGENT_STATUS.can_interrupt` is the current action permission for the selected agent/member context.
- `AGENT_STATUS.agent_id` / `agent_name` are present only for team-member routing when the message envelope does not already identify the member.
- `TEAM_STATUS.status` is the current coarse aggregate team state and intentionally has no `can_interrupt`; the input button uses the selected member's `AGENT_STATUS.can_interrupt`.
- Detailed runtime statuses remain internal to each runtime/backend; they are collapsed at the API boundary.
- Remove `new_status`, `old_status`, `isSending` status ownership, frontend detailed phase dependence, and raw provider-status forwarding from the in-scope path for both `AGENT_STATUS` and `TEAM_STATUS`.

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
  - Migrate frontend status enums, hydration, recovery, history, display, and local termination paths to coarse status.
- Refactor rationale:
  - This is not a one-line frontend label fix; correctness depends on aligning live event, snapshot, runtime ownership, and frontend action state.
- Intentional deferrals and residual risk, if any:
  - Detailed phase display such as `Awaiting LLM Response` is intentionally removed from the core API contract. If product needs phase detail later, it should be designed as a separate optional display/debug contract, not part of interrupt correctness.

## Terminology

- `API status`: the coarse frontend-facing value: `idle`, `running`, or `error`.
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

## Spine Actors / Main-Line Nodes

- Runtime backend status projector
- `AgentRunBackend` status snapshot boundary
- `AgentRunEvent.AGENT_STATUS`
- `AgentRunEventMessageMapper`
- `AgentStreamHandler`
- `AgentTeamStreamHandler`
- Team status snapshot/aggregation service
- Frontend `handleAgentStatus`
- Active context input-button state

## Ownership Map

| Owner | Owns |
| --- | --- |
| Native AutoByteus runtime | Detailed internal status state and transitions. |
| AutoByteus backend status projector | Collapse native detailed status to API `idle/running/error` and compute `can_interrupt`. |
| `CodexThread` | Codex current runtime status and active turn identity. |
| Codex backend status projector | Normalize Codex runtime state/events to API status payload. |
| Claude session/backend status owner | Claude current runtime work/error state and active-turn interruptability. |
| Claude backend status projector | Normalize Claude state/events to API status payload. |
| `AgentRunBackend` interface | Authoritative single-agent status snapshot boundary. |
| `AgentStreamHandler` | Live stream binding and snapshot delivery ordering. |
| Team status aggregator | Sole aggregate rule from member API statuses/raw native team status to `TEAM_STATUS.status`. |
| Team manager | Member event multiplexing and publishing aggregate changes via the team status aggregator. |
| Team snapshot service | Collect current member snapshots and call the team status aggregator; does not own aggregate policy. |
| Frontend status handler | Store API status and `can_interrupt`; no runtime inference. |

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
| Frontend detailed phase status display for API status | Not required for core contract and causes stale-detail UX | Coarse `idle/running/error` display | In This Change | Future detail display must be separate. |
| Frontend active recovery `Uninitialized` placeholder and local `ShutdownComplete` state | Old API-visible statuses conflict with coarse contract | Active placeholder `running/can_interrupt=false`; terminated/inactive local state `idle/can_interrupt=false` | In This Change | If offline display is later desired, it must be separate from API status. |

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
shutdown complete       -> AGENT_STATUS { status: "idle", can_interrupt: false }
team aggregate change   -> TEAM_STATUS { status: "idle" | "running" | "error" }
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
| Frontend visual mapping | DS-001, DS-002 | Frontend status display | Map `idle/running/error` to labels/colors | UI concern | UI recreates backend status policy |

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
| `autobyteus-web/types/agent/AgentStatus.ts` | frontend types | frontend status model | Collapse to `idle/running/error` API status | One type for API status | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| API status payload | `agent-execution/domain/agent-status-payload.ts` | agent execution domain | Used by all runtime backends and stream snapshots | Yes: removes `new_status`/`old_status` | Yes: one `status` field only | Kitchen-sink provider status object |
| active/non-terminal mapping | runtime-specific projector files | each runtime backend | Runtime policies differ | Yes | Yes | Generic helper that hides runtime-specific truth |
| team aggregate status rule | `agent-team-execution/domain/team-status-aggregation.ts` | team execution domain | Live managers and snapshot service must share one aggregate policy | Yes | Yes | Transport-owned or frontend-owned aggregate policy |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentStatusPayload.status` | Yes | Yes | Low | Only `idle/running/error`; no detail field in v1. |
| `AgentStatusPayload.can_interrupt` | Yes | Yes | Low | Action permission only; not a display status. |
| `agent_id` / `agent_name` | Yes | Yes | Low | Present only for member routing. |
| `TeamStatusPayload.status` | Yes | Yes | Low | Aggregate `idle/running/error`; no action permission or old fields. |

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
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | frontend protocol | WS payload types | Replace `AgentStatusPayload` and `TeamStatusPayload` with new shapes | Frontend protocol owner | frontend status types |
| `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` | frontend streaming | frontend agent status handler | Read `status`/`can_interrupt` only | Single frontend agent/member status owner | frontend status type |
| `autobyteus-web/services/agentStreaming/handlers/teamHandler.ts` | frontend streaming | frontend team status handler | Read `TEAM_STATUS.status` only | Single frontend team aggregate handler | `AgentTeamStatus` |
| `autobyteus-web/types/agent/AgentStatus.ts` | frontend types | agent status enum | Collapse to `Idle`, `Running`, `Error` | Removes API-visible detailed statuses | N/A |
| `autobyteus-web/types/agent/AgentTeamStatus.ts` | frontend types | team status enum | Collapse to `Idle`, `Running`, `Error` | Removes team legacy statuses | N/A |
| `autobyteus-web/types/agent/AgentRunState.ts` / `AgentContext.ts` | frontend context state | agent status/action state | Add `canInterrupt`; remove `isSending` as status/action owner | Stores backend contract | frontend status type |
| `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` and `activeContextStore.ts` | frontend input | input affordance | Show interrupt from selected context `canInterrupt` | UI action owner | frontend status state |
| `autobyteus-web/services/runHydration/runtimeStatusNormalization.ts` | frontend hydration | coarse normalization | Map history/runtime strings to `idle/running/error`; no detailed placeholders | Hydration contract owner | frontend status types |
| `autobyteus-web/services/runRecovery/activeRunRecoveryCoordinator.ts` and run open coordinators | frontend recovery/open | active placeholder policy | Use `running/canInterrupt=false` for active pending snapshot; inactive local state `idle` | Prevents bypass status owners | frontend status types |
| `autobyteus-web/stores/runHistoryReadModel.ts`, `runHistoryTeamHelpers.ts`, `utils/runTreeLiveStatusMerge.ts` | frontend history/read model | history status mapping | Map coarse statuses to history `ACTIVE/IDLE/ERROR` without detailed legacy statuses | Read model owner | frontend status types |
| `autobyteus-web/composables/useStatusVisuals.ts`, `useTeamStatusVisuals.ts`, running/history row components | frontend display | status visuals | Display only Idle/Running/Error for API status | UI display owner | frontend status types |

## Ownership Boundaries

The authoritative status boundary is the runtime backend. Callers above that boundary must not inspect runtime internals, provider payloads, lifecycle events, or frontend local send flags to decide status.

- Runtime/backend owns current status truth.
- Stream handler owns delivery timing and snapshot ordering.
- Frontend owns rendering only.

No upstream caller should depend on both `AgentRunBackend` and backend internals like `CodexThread.currentStatus` or `ClaudeSession.activeTurnExecution`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentRunBackend.getStatusSnapshot()` | native detail status, Codex currentStatus, Claude active turn/error state | `AgentStreamHandler`, team snapshot service | stream handler reaching into runtime-specific objects | Add fields to `AgentStatusPayload` only if truly needed. |
| Runtime-specific status projector | provider payload/status parsing | event converters/backend classes | frontend receiving raw provider status payload | Normalize inside backend projector. |
| Team API status aggregator | member `AgentStatusPayload` snapshots and optional native team raw status | live team managers, team snapshot service | managers/snapshot service each deriving aggregate status locally | Add/extend helper API in `agent-team-execution/domain/team-status-aggregation.ts`. |
| `TeamRunBackend.getStatusSnapshot()` | backend-specific member status collection and aggregate owner call | `AgentTeamStreamHandler`, team domain wrapper | caller using `getStatus()` string or constant active `IDLE` | Replace interface method and delegate to aggregator. |
| Frontend status handler | context status/can_interrupt state | input component/status display | input component reading `isSending` as status | Add selector for active context `can_interrupt`. |

## Dependency Rules

Allowed:

- runtime converters/projectors may depend on shared `AgentStatusPayload` type.
- stream handlers may depend on `AgentRunBackend.getStatusSnapshot()`.
- team snapshot service may depend on member backend status snapshots and the team aggregate helper.
- live team managers may depend on the team aggregate helper.
- frontend input may depend on active context `can_interrupt`.

Forbidden:

- frontend must not derive interrupt availability from `isSending`.
- frontend must not derive status from `TURN_COMPLETED`, `ASSISTANT_COMPLETE`, or `ERROR`.
- stream handlers must not parse provider-specific status payloads.
- team snapshot path must not use Codex/Claude constant active `IDLE` as authoritative aggregate status.
- no old/new status dual fields in the `AGENT_STATUS` or `TEAM_STATUS` payloads.
- live team managers and team snapshot service must not own separate aggregate rules; both must call the same aggregate helper.
- frontend hydration/recovery/history paths must not introduce `uninitialized`, `processing`, `shutdown_complete`, or detailed phase statuses as API-visible current statuses.

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

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `getStatusSnapshot()` | Yes | Yes | Low | Bound to one backend/run instance. |
| team member `AGENT_STATUS` | Yes | Yes if includes member identity | Low | Require `agent_id` or `agent_name` when envelope is not member-scoped. |
| `TEAM_STATUS` | Yes | Yes | Low | Payload is `{ status }` only. |
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
| `autobyteus-web/services/runRecovery` | Folder | frontend recovery | active placeholder/status snapshot subscription policy | Existing recovery owner | persistent fake statuses |
| `autobyteus-web/stores` / `autobyteus-web/utils/runTreeLiveStatusMerge.ts` | Folder/File | frontend history read model | map coarse live statuses to history flags | Existing history/read-model owners | detailed status policy |

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
| Active recovery placeholder | active restored run starts as `status="running", canInterrupt=false` until post-bind snapshot | active restored run set to `Uninitialized` or `ShutdownComplete` | Placeholder must be coarse and overwritten by authoritative snapshot. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `AGENT_STATUS.new_status` alongside `status` | Current frontend reads `new_status` | Rejected | Change frontend and backend together to use `AGENT_STATUS.status` only. |
| Keep `TEAM_STATUS.new_status` alongside `status` | Current team handler reads `new_status` | Rejected | Change team server/frontend together to use `TEAM_STATUS.status` only. |
| Accept both `can_interrupt` and `is_interruptible` | Naming transition | Rejected | Use `can_interrupt` only. |
| Keep detailed statuses in API and map visually | Existing status chip supports detail labels | Rejected | API status is coarse `idle/running/error`; details remain internal. |
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
   - detailed native status -> `idle/running/error`
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
10. Update frontend protocol/types:
   - `AgentStatus` enum becomes `Idle | Running | Error`
   - `AgentTeamStatus` enum becomes `Idle | Running | Error`
   - `AgentStatusPayload` is `{ status, can_interrupt, agent_id?, agent_name? }`
   - `TeamStatusPayload` is `{ status }`.
11. Update frontend handlers/context:
   - `handleAgentStatus` reads only `status` and `can_interrupt`
   - `handleTeamStatus` reads only `status`
   - `AgentRunState` stores `currentStatus` and `canInterrupt`
   - `AgentContext.isSending` is removed or renamed to a non-status submit-in-flight flag if still needed; it must not control the interrupt button.
12. Update frontend hydration/recovery/history/display:
   - normalization maps all runtime/history tokens to `idle/running/error`
   - active recovery/open placeholders use `running/canInterrupt=false` until snapshot
   - inactive/local terminated status is `idle/canInterrupt=false`
   - history/read-model helpers map coarse statuses to `ACTIVE/IDLE/ERROR`
   - visuals and running/history rows display only Idle/Running/Error.
13. Update input component and active context selectors:
   - expose `canInterrupt` from the selected agent/focused member context
   - show interrupt only from `canInterrupt`.
14. Remove obsolete tests/code that expect `new_status`, `old_status`, detailed API statuses, `Uninitialized`, `ShutdownComplete`, `Processing`, or `isSending` status ownership.



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
  return 'idle';
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
  Idle = 'idle',
  Running = 'running',
  Error = 'error',
}
```

Target `AgentTeamStatus.ts`:

```ts
export enum AgentTeamStatus {
  Idle = 'idle',
  Running = 'running',
  Error = 'error',
}
```

Remove API-visible `Uninitialized`, `Bootstrapping`, `Processing`, `ShuttingDown`, `ShutdownComplete`, `AwaitingLlmResponse`, `ExecutingTool`, and other detailed values from these frontend status enums.

### Frontend Context State

`AgentRunState` owns:

```ts
currentStatus: AgentStatus;
canInterrupt: boolean;
```

Initial local default is:

```ts
currentStatus = AgentStatus.Idle;
canInterrupt = false;
```

Active run recovery/open may temporarily set:

```ts
currentStatus = AgentStatus.Running;
canInterrupt = false;
```

This is only a local pending-snapshot display state and must be overwritten by the post-bind `AGENT_STATUS` snapshot.

### Hydration And Recovery

`runtimeStatusNormalization.ts` becomes a coarse normalizer only:

```ts
active | processing | running | bootstrapping | shutting_down | uninitialized -> running
idle | shutdown_complete | offline | terminated | missing                 -> idle
error | failed                                                   -> error
```

Rules:
- active recovered runs/teams use `running` as a placeholder, never `uninitialized`.
- inactive, terminated, offline, and local terminate paths use `idle`, never `shutdown_complete`.
- these placeholders are display/snapshot-waiting state only; live backend status still comes from `AGENT_STATUS`/`TEAM_STATUS`.

### Local Termination

`agentRunStore` and `agentTeamRunStore` local terminate/remove paths must set:

```ts
status = 'idle';
canInterrupt = false;
```

They must not set `ShutdownComplete` because that value is removed from the API-visible status model.

### History / Read Model

History flags remain persisted as `ACTIVE | IDLE | ERROR` if that is the existing read-model contract. Mapping from live frontend state becomes:

```ts
status === 'error'   -> { isActive: false, lastKnownStatus: 'ERROR' }
status === 'running' -> { isActive: true,  lastKnownStatus: 'ACTIVE' }
status === 'idle'    -> { isActive: false, lastKnownStatus: 'IDLE' }
```

For active historical rows being recovered, the UI may show `running/canInterrupt=false` until stream snapshot; once the snapshot arrives, the canonical backend status wins.

### Display Components

`useStatusVisuals`, `useTeamStatusVisuals`, running rows, history rows, and team workspace status display should support only:

- `Idle`
- `Running`
- `Error`

No frontend component should display `Awaiting LLM Response` or `Processing Tool Result` from the API status contract after this change.

## Runtime Status Mapping Rules

### Native AutoByteus

| Native Detailed Status | API `status` | `can_interrupt` Rule |
| --- | --- | --- |
| `idle` | `idle` | false |
| `error` | `error` | false |
| `shutdown_complete` | `idle` | false |
| `uninitialized` | `idle` | false |
| `bootstrapping` | `running` | false |
| `interrupting` | `running` | false |
| `shutting_down` | `running` | false |
| all active turn phases (`processing_user_input`, `awaiting_llm_response`, `analyzing_llm_response`, `awaiting_tool_approval`, `executing_tool`, `processing_tool_result`, `tool_denied`) | `running` | true only when `context.state.activeTurn` exists and the phase is not locked |

### Codex

| Codex State | API `status` | `can_interrupt` Rule |
| --- | --- | --- |
| `IDLE` | `idle` | false |
| `RUNNING` | `running` | true only when `activeTurnId` exists |
| `ERROR` | `error` | false |
| app-server close/error | `error` | false |

### Claude

| Claude State | API `status` | `can_interrupt` Rule |
| --- | --- | --- |
| no active turn and no error | `idle` | false |
| active turn running | `running` | true |
| interrupting active turn | `running` | false |
| runtime error | `error` | false |
| terminated/no active turn | `idle` | false |

### Team

Aggregate `TEAM_STATUS.status` rule:

```ts
if any member.status === "error"   -> "error"
else if any member.status === "running" -> "running"
else -> "idle"
```

The selected member input button must use the selected member's `can_interrupt`, not the aggregate team status.

## Validation Plan

- Server unit tests:
  - AutoByteus detailed statuses collapse to correct API status/can_interrupt.
  - Codex `turn/started`, `turn/completed`, `thread/status/changed`, and `error` emit normalized `AGENT_STATUS`.
  - Claude new/restored no-turn session snapshots as idle.
  - Claude turn start/completion/interruption/error emit normalized `AGENT_STATUS`.
  - `AgentStreamHandler.connect` binds before snapshot and sends status snapshot.
  - Team connect sends member `AGENT_STATUS` snapshots and aggregate `TEAM_STATUS { status }`.
  - Codex/Claude/Mixed team managers and snapshot service use the same `deriveTeamApiStatus` helper.
  - `TeamRunBackend.getStatus()` has no remaining callers/implementation; `getStatusSnapshot()` is used instead.
- Frontend unit tests:
  - `handleAgentStatus` reads only `status`/`can_interrupt`.
  - input button uses `can_interrupt`, not `isSending`.
  - `TeamStatusPayload` and `handleTeamStatus` reject old `new_status` shape.
  - hydration/recovery/history helpers produce only `idle/running/error` statuses and active placeholders use `running/canInterrupt=false`.
  - lifecycle events complete conversation rendering without changing status.
- Integration/e2e tests:
  - normal completion ends with `status=idle`, `can_interrupt=false`.
  - interruption ends with `status=idle`, `can_interrupt=false`.
  - runtime error ends with `status=error`, `can_interrupt=false`.
  - reconnect after completion receives idle snapshot.
  - team reconnect receives member statuses.

## Open Risks / Questions

- Product policy for interrupting during `awaiting_tool_approval` and `executing_tool` should be confirmed. The design supports either policy through backend-owned `can_interrupt`; default recommendation is true when an active turn exists unless the runtime is already interrupting/shutting down.
- If the product later wants detailed phase labels again, that should be a separate display-detail feature and must not affect the core `status/can_interrupt` contract.
- `TEAM_STATUS` has no `can_interrupt` by design. If a future product feature adds team-level interrupt-all affordance, it should introduce a separate team action-permission contract rather than overloading aggregate status.
