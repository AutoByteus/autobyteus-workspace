# Design Spec

## Current-State Read

The current user-message lifecycle has an `initializing` status concept, but the status is published after slow runtime work instead of before it.

Current standalone path:

`WebSocket SEND_MESSAGE -> AgentStreamHandler.handleSendMessage -> AgentRun.postUserMessage -> AgentRunBackend.postUserMessage -> runtime startup/send gate -> AgentRun.applyAcceptedStartupStatus`

`AgentRun` wraps all standalone backend implementations (`AutoByteusAgentRunBackend`, `CodexAgentRunBackend`, and `ClaudeAgentRunBackend`), so it is the runtime-neutral owner for standalone command-start status.

Current team/member paths:

- Managed teams: `TeamRun.postMessage -> TeamRunBackend -> TeamManager target resolution -> member handle/manager startup/send` for Mixed, Codex, and Claude team backends.
- Native AutoByteus teams: `TeamRun.postMessage -> AutoByteusTeamRunBackend.postMessage -> resolveTargetMemberContext(target) -> await native team.postMessage(...)`.

Important current facts:

- `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts::postUserMessage` awaits `backend.postUserMessage(...)` before `applyAcceptedStartupStatus()`.
- `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts::postMessage` awaits `backend.postMessage(...)` before root aggregate `applyAcceptedStartupStatus()`.
- `TeamRun.resolvePostMessageTarget(...)` resolves an omitted target to the configured coordinator route key or sole member when available; the Electron focused-member UI sends an explicit `target_member_route_key` through `TeamStreamingService.sendMessage(...)`.
- A true no-target team post can still reach `AutoByteusTeamRunBackend.postMessage(message, null)` through non-focused/direct callers when there is no coordinator/default member. That case has no concrete member identity and must be treated as root team command-start status, not guessed as a member event.
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts::postMessage` awaits `ensureReady()` before a member `AgentRun` exists, so a cold member has no bound `AgentRun` event source during startup.
- `CodexAgentRunBackendFactory.createBackend(...)` and `CodexThreadManager.startThread(...)` wait for Codex app-server `thread/start`; direct probes measured this at ~24.5-29.2s. Codex is the measured slow example, not the architectural boundary.
- Claude and native AutoByteus can have different startup/send timing, but the product invariant is the same: startup/send latency belongs inside `initializing`.
- `AutoByteusTeamRunBackend` already owns native member status projection/caching via `lastMemberStatusByRunId`; the command-start design should extend this owner with pending command-start overlays instead of creating a separate global status owner.
- Frontend status handling already supports `initializing`: `AgentStatus.Initializing`, `useStatusVisuals`, `applyLiveAgentStatusEvent`, `handleAgentStatus`, `handleTeamStatus`, and `TeamWorkspaceView` render it if backend events arrive promptly.
- In `TeamWorkspaceView.vue`, the focused header prefers `focusedMemberContext.state.currentStatus` over aggregate team status. Therefore focused member sends must publish member-scoped status, not only root `TEAM_STATUS`.

Current ownership boundaries are mostly correct. The missing design invariant is runtime-agnostic: the component that accepts a valid command and is about to hand it to a runtime must publish command-start `initializing` before awaiting runtime startup/send work.

## Intended Change

Make `initializing` an authoritative, runtime-agnostic command-start lifecycle status emitted by the backend as soon as a syntactically valid, targetable message command is accepted for processing by the appropriate owner, and before any slow runtime startup, restore, provider-specific session/thread creation, Codex `thread/start`, Claude session/query startup, native AutoByteus `postMessage`, or first-turn send await.

Target visible lifecycle for any offline/cold member/run:

`Offline -> Initializing immediately after accepted command -> Running when runtime turn actually starts -> Idle/Error/Offline terminal state`

Backend remains source of truth. The design deliberately avoids frontend optimistic state.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant, with a team-command-owner boundary tightening.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, bounded refactor.
- Evidence: Current `AgentRun` and `TeamRun` emit `initializing` only after backend post promises resolve. Cold team members may wait in `ensureReady()` before any `AgentRun` exists. Native AutoByteus team commands await native `team.postMessage` after target resolution without pre-command status. Frontend can render `initializing` when received.
- Design response: Move command-start status publication into runtime-neutral lifecycle owners: `AgentRun` for standalone runs; team command owners for target-resolved team/member commands (`TeamManager`/member handles for Managed/Mixed/Codex/Claude, `AutoByteusTeamRunBackend` for native AutoByteus). Normal runtime backend events remain responsible for later `running`, `idle`, and `error` transitions.
- Refactor rationale: The current status application methods are post-acceptance repair points, not command-start invariant enforcement. The implementation must introduce explicit pre-runtime startup status ownership and local pending-status overlays for inactive or not-yet-updated members.
- Intentional deferrals and residual risk, if any: No frontend redesign is in scope. No attempt is made to reduce provider startup latency. A larger unification of team manager implementations is deferred; this ticket keeps the invariant in each existing command owner and shares only event construction.

## Terminology

- `Command-start status`: backend-owned `initializing` emitted after command validation/target resolution and before slow runtime startup/send work.
- `Team command owner`: the component that resolves or receives a concrete team target and hands the command to runtime work. In this codebase: `TeamManager` implementations/member handles for Managed/Mixed/Codex/Claude, and `AutoByteusTeamRunBackend` for native AutoByteus.
- `Pending member status overlay`: backend-side temporary status projection for a team member after command acceptance and before real runtime status catches up.
- `Root pending team overlay`: backend-side temporary root team status for true team-level/no-target commands where no member identity exists.
- `Runtime event`: downstream provider/native event that reports real execution status such as `running`, `idle`, or `error`.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: decommission delayed post-runtime-wait `initializing` as the primary command-start mechanism for local AgentRun and team message paths.
- The design must not rely on delayed `applyAcceptedStartupStatus()` after runtime startup/send for user-visible initialization.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User sends message to standalone agent | Backend emits early `AGENT_STATUS initializing`, then runtime events | `AgentRun` | Covers AutoByteus, Codex, Claude, and future standalone backends through one boundary. |
| DS-002 | Primary End-to-End | User sends message to focused/resolved team member | Backend emits member-scoped `AGENT_STATUS initializing` before lazy member startup or native send | Team command owner | Covers the reported focused member case and all team backend kinds. |
| DS-003 | Primary End-to-End | True no-target team-level native post | Backend emits root `TEAM_STATUS initializing` before native team post | `AutoByteusTeamRunBackend` | Covers direct/native no-target posts where no concrete member identity exists. |
| DS-004 | Return-Event | Agent/member/runtime emits status event | Frontend updates selected/focused status | Streaming mappers and frontend handlers | Ensures existing transport carries the earlier status. |
| DS-005 | Bounded Local | Member/root command accepted | Pending overlay -> runtime startup/native send -> overlay cleared/replaced | Command owner (`AgentRun` or team command owner) | Prevents snapshots/aggregate status from staying offline while runtime status lags. |

## Primary Execution Spine(s)

Standalone agent:

`Electron UI -> AgentStreamHandler -> AgentRun -> command-start status -> AgentRunBackend/runtime -> streaming status handlers -> UI status display`

Focused/resolved team member:

`Electron UI -> AgentTeamStreamHandler -> TeamRun -> team command owner target resolution -> member command-start status -> lazy AgentRun create/restore or native team post -> runtime status events -> focused member UI status display`

True no-target native team post:

`Caller -> TeamRun -> AutoByteusTeamRunBackend(no target) -> root TEAM_STATUS initializing -> native team.postMessage(message, null) -> native team/member events -> UI/team status display`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | For a standalone run, `AgentRun.postUserMessage` immediately applies command-start `initializing` if current status is offline/idle, then awaits backend send. Runtime events later replace status. | Agent stream handler, `AgentRun`, backend runtime, frontend agent context | `AgentRun` | Status payload normalization, command observers, run activity persistence. |
| DS-002 | For a targeted team message, the command owner resolves the member first. Once targetable, it publishes member-scoped `initializing` and records a pending overlay before awaiting lazy startup or native send. | Team stream handler, `TeamRun`, team command owner, member runtime, frontend team context | `TeamManager`/member handle or `AutoByteusTeamRunBackend` | Member selector resolution, status aggregation, event mapping. |
| DS-003 | For true no-target native AutoByteus team posts, there is no member to identify. `AutoByteusTeamRunBackend` publishes root `TEAM_STATUS initializing` before native `team.postMessage(message, null)` and does not invent a member status. | `TeamRun`, `AutoByteusTeamRunBackend`, native team runtime, frontend team context | `AutoByteusTeamRunBackend` | Root pending overlay and native event replacement. |
| DS-004 | Backend events are mapped to server messages with route/source metadata, delivered through existing WebSocket streaming, and applied by existing frontend handlers. | Team/agent event mappers, streaming services, frontend handlers | Streaming mapper/handler owners | Payload serialization and routing metadata. |
| DS-005 | Pending overlays make snapshots and aggregate status report `initializing` before a runtime object exists or native status catches up. Real status events or failures clear/replace pending state. | Pending overlay, member snapshot, aggregate status derivation | Command owner | Shared event construction and status aggregation. |

## Spine Actors / Main-Line Nodes

- `AgentStreamHandler` / `AgentTeamStreamHandler`: transport entrypoints translating client messages into domain commands.
- `AgentRun`: standalone all-runtime lifecycle/status owner.
- `TeamRun`: public team command boundary; resolves coordinator/sole-member defaults when available and delegates to backend command owner.
- `TeamManager` implementations and mixed member handles: managed team target/member lifecycle owners.
- `AutoByteusTeamRunBackend`: native AutoByteus team command owner for target resolution, native post, member status override cache, and root no-target behavior.
- Runtime backends/native runtimes: provider/native work and real execution status after command-start.
- Streaming mappers/frontend handlers: status transport/application only.

## Ownership Map

- `AgentRun` owns single-run command-start status, status override, local event fan-out, and failure recovery for standalone commands.
- Managed team command owners own member-target validation, pending member overlays, pre-start member status publication, lazy startup/native send delegation, and clearing pending member overlays.
- `AutoByteusTeamRunBackend` owns native AutoByteus target resolution, native post, native member status override cache, pending member overlays, root no-target pending status, and clearing/replacing those overlays from native events/failures.
- Runtime backends/native runtimes own provider/session/thread/native execution and real execution statuses after command-start.
- Streaming mapper owns translation to WebSocket messages; it must not decide lifecycle transitions.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentStreamHandler.handleSendMessage` | `AgentRun` | WebSocket transport command boundary | Runtime status policy. |
| `AgentTeamStreamHandler.handleSendMessage` | `TeamRun` plus backend team command owner | WebSocket transport command boundary | Member lifecycle/status policy. |
| `TeamRun.postMessage` | Backend team command owner | Public team command boundary and default-target resolver | Backend-specific member overlay/cache ownership. |
| `AutoByteusTeamRunBackend.postMessage` | Itself | Native AutoByteus command boundary | Generic frontend protocol or managed-team startup policy. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `AgentRun.postUserMessage` emitting `initializing` only after `backend.postUserMessage` resolves | Too late for all runtimes with startup/send gates | `AgentRun` pre-await command-start status method | In This Change | Keep accepted command observers post-accepted. |
| `TeamRun.postMessage` post-return aggregate `initializing` as primary team startup signal | It fires after backend/member startup/send and cannot update focused member context | Team command-owner status publication | In This Change | `TeamRun` may keep root status for snapshots but not as primary command-start event. |
| Waiting for managed runtime `ensureReady()` before member `initializing` | Hides cold member startup | Managed team command-owner pending overlay/event | In This Change | Applies to Mixed/Codex/Claude paths. |
| Waiting for native AutoByteus `team.postMessage` before command-start status | Hides native runtime send/processing latency | `AutoByteusTeamRunBackend` pending member/root overlay and pre-post event | In This Change | First-class native path. |
| Duplicated member-scoped startup `AGENT_STATUS` event construction across team command owners | Mixed, Codex, Claude, and AutoByteus all need same route metadata shape | Shared `team-member-command-start-status-events.ts` builder | In This Change | Shared construction only, no target resolution. |
| Frontend-only optimistic `Initializing` workaround | Would diverge from backend source of truth | Backend command-start events | In This Change | Do not add. |

## Return Or Event Spine(s) (If Applicable)

Standalone event flow:

`AgentRun.emitLocalEvent(AGENT_STATUS initializing) -> AgentRunEventMessageMapper -> ServerMessage AGENT_STATUS -> AgentStreamingService -> handleAgentStatus -> applyLiveAgentStatusEvent -> AgentStatusDisplay`

Team member event flow:

`Team command owner publishes TeamRunEventSourceType.AGENT -> TeamRunEventWebsocketMessageMapper adds member/source route metadata -> ServerMessage AGENT_STATUS -> TeamStreamingService route resolution -> handleAgentStatus -> focused member AgentContext.state.currentStatus -> TeamWorkspaceView header`

Native no-target root event flow:

`AutoByteusTeamRunBackend publishes TeamRunEventSourceType.TEAM(sourcePath=[]) -> ServerMessage TEAM_STATUS -> handleTeamStatus -> team currentStatus/header fallback when no focused member applies`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `AgentRun`
  - Chain: `postUserMessage called -> apply command-start status if offline/idle -> await backend send -> accepted/rejected handling -> runtime events override`.
  - Why it matters: standalone status becomes visible before backend send resolves.

- Parent owner: managed team command owner
  - Chain: `target resolved -> inactive/current snapshot check -> set pending member overlay -> publish member initializing -> ensureReady/create/restore/send -> clear/replace on runtime event or failure`.
  - Why it matters: cold members may lack active `AgentRun` event source.

- Parent owner: `AutoByteusTeamRunBackend`
  - Targeted chain: `target resolved -> set pending member overlay in native backend -> publish member initializing -> await native team.postMessage -> native events replace or failure clears/error`.
  - No-target chain: `target remains null -> set root pending team overlay -> publish root TEAM_STATUS initializing -> await native team.postMessage(null) -> native/root events replace or failure clears/error`.
  - Why it matters: native snapshots may lag behind command acceptance and native backend already owns the status override cache.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Status payload construction | DS-001, DS-002, DS-003 | `AgentRun`, all team command owners | Build normalized status payloads/events with identity metadata | Avoid malformed/duplicated payloads | Main-line methods become inconsistent. |
| Member-scoped team event construction | DS-002, DS-004 | Managed team owners and `AutoByteusTeamRunBackend` | Build `TeamRunEventSourceType.AGENT` with canonical member/source route | Focused UI routing depends on consistent metadata | Each backend invents route fields. |
| Root team status event construction | DS-003, DS-004 | `AutoByteusTeamRunBackend`, `TeamRun` root cases | Build `TEAM_STATUS` with sourcePath `[]` for true no-target/root commands | No member identity exists | Guessing a member would misrepresent backend state. |
| Pending member overlay | DS-002, DS-005 | Team command owners | Snapshot `initializing` while runtime/member status lags | Team aggregation and snapshots need pre-run state | Runtime creation/native post code blurs projection state. |
| Native AutoByteus override cache integration | DS-002, DS-003, DS-005 | `AutoByteusTeamRunBackend` | Reuse/extend existing member status cache with separate pending command-start overlays | Keeps native status ownership local | Global registry or duplicated aggregator. |
| Status aggregation | DS-002, DS-003, DS-005 | Team command owners | Derive root team status from member/root overlays and real statuses | Existing `deriveTeamApiStatus` owns precedence | Duplicated precedence policy. |
| WebSocket mapping | DS-004 | Streaming services | Translate domain events to server messages | Existing transport capability | Runtime owners knowing frontend protocol. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Single-run status payload | Agent execution domain status payload | Reuse | `buildAgentStatusPayload` already normalizes statuses | N/A |
| Team status aggregation | Agent team execution domain | Reuse | `deriveTeamApiStatus` already handles `initializing` precedence | N/A |
| Team member event route metadata | Agent team execution events/services | Extend | Existing `TeamRunEvent` and mapper already carry `sourcePath` and member route data | N/A |
| Shared member/root command-start event builder | Agent team execution services | Create New | Repeated event shape is needed across Mixed, Codex, Claude, and native AutoByteus command owners | Existing mappers translate after publication and should not own construction policy. |
| Native pending status cache | `AutoByteusTeamRunBackend` member status override capability | Extend | The native backend already owns `lastMemberStatusByRunId` and status projection | N/A |
| Frontend display | Existing frontend status handlers | Reuse | Already supports `initializing` | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/domain` | Standalone command-start status sequencing | DS-001 | `AgentRun` | Extend | Runtime-agnostic for all standalone backends. |
| `agent-team-execution/backends/mixed` | Mixed leaf/subteam command-start status and overlays | DS-002, DS-005 | Mixed manager/member handles | Extend | Emit before `ensureReady`. |
| `agent-team-execution/backends/codex` | Codex team member command-start status and overlays | DS-002, DS-005 | `CodexTeamManager` | Extend | Emit before `ensureMemberReady`. |
| `agent-team-execution/backends/claude` | Claude team member command-start status and overlays | DS-002, DS-005 | `ClaudeTeamManager` | Extend | Same invariant even if current session creation is fast. |
| `agent-team-execution/backends/autobyteus` | Native member/root command-start status, pending overlay/cache, native post failure clearing | DS-002, DS-003, DS-005 | `AutoByteusTeamRunBackend` | Extend | First-class native implementation path. |
| `agent-team-execution/services` | Shared member/root command-start status event construction | DS-002, DS-003, DS-004 | All team command owners | Create New | Concrete event builders only. |
| `services/agent-streaming` | Event-to-server-message mapping | DS-004 | Streaming handlers | Reuse | Existing mapper should work with correct event shape. |
| `autobyteus-web/services` and UI components | Status rendering | DS-004 | Frontend contexts | Reuse | No optimistic frontend change. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-run.ts` | Agent execution domain | `AgentRun` | Emit command-start status before backend message send and recover on rejection/failure | Existing run lifecycle owner | `buildAgentStatusPayload` |
| `team-member-command-start-status-events.ts` | Agent team execution services | Shared event builder | Build member-scoped `AGENT_STATUS`, subteam/root `TEAM_STATUS`, and failure status events | One concrete event-construction concern for all team command owners | `buildAgentStatusPayload`, `AgentRunEventType` |
| `mixed-agent-member-handle.ts` | Mixed team backend | Mixed leaf member handle | Pending overlay and member initializing before lazy member run startup | Existing mixed leaf lazy-start owner | New builder |
| `mixed-sub-team-member-handle.ts` | Mixed team backend | Mixed subteam member handle | Pending subteam initializing before child team startup | Existing child-team lazy-start owner | New builder |
| `codex-team-manager.ts` | Codex team backend | Codex team manager | Pending overlay and member initializing before `ensureMemberReady` | Existing Codex member lifecycle owner | New builder |
| `claude-team-manager.ts` | Claude team backend | Claude team manager | Pending overlay and member initializing before `ensureMemberReady`/send | Existing Claude member lifecycle owner | New builder |
| `autobyteus-team-run-backend.ts` | Native AutoByteus team backend | AutoByteus native command owner | Pending member/root overlays, pre-native-post events, snapshot/aggregate reflection, failure/event clearing | Existing owner of native target resolution, native post, and member status cache | New builder, existing aggregation |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Member-scoped `AGENT_STATUS` command-start/failure event shape with route metadata | `autobyteus-server-ts/src/agent-team-execution/services/team-member-command-start-status-events.ts` | Agent team execution services | Needed by Mixed, Codex, Claude, and AutoByteus team command owners | Yes | Yes | Target resolver or runtime starter. |
| Subteam/root `TEAM_STATUS` command-start/failure event shape | Same file | Agent team execution services | Needed by mixed subteam and native no-target root status | Yes | Yes | Team status aggregator. |
| Pending overlay storage | Local fields/maps in each lifecycle owner | Backend command owners | Storage and clearing differ by owner; keep local | N/A | N/A | Global status registry. |
| Native AutoByteus pending/member status cache composition | `AutoByteusTeamRunBackend` local maps | Native AutoByteus backend | Existing native status cache owner should remain authoritative | Yes | Yes | Cross-runtime cache service. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentStatusPayload` | Yes | Existing aliases are route/source transport fields | Medium | Builder must supply canonical member/source fields consistently. |
| `TeamRunEvent` status event | Yes | N/A | Low | Use `sourcePath` as canonical identity; mapper derives route key. |
| Command-start event builder inputs | Yes | Yes | Low | Accept concrete team/member/root identity, never generic selector. |
| `AutoByteusTeamRunBackend` pending maps | Yes | Yes | Low | Use separate pending map(s) from real `lastMemberStatusByRunId` event cache so real runtime events can clearly replace pending state. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | Agent execution domain | `AgentRun` | Standalone command-start status before backend send; runtime events overwrite; failure recovery | Natural lifecycle owner for single active run | Existing status payload builder |
| `autobyteus-server-ts/src/agent-team-execution/services/team-member-command-start-status-events.ts` | Agent team execution services | Command-start status event builder | Build member-scoped, subteam, root, and failure status `TeamRunEvent`s with route/source identity | Shared construction only; all team command owners use it | `buildAgentStatusPayload`, `AgentRunEventType` |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Mixed backend | Mixed leaf member handle | Pending overlay and pre-`ensureReady` initializing/error for mixed leaf agents | Existing leaf lazy-start owner | New builder |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts` | Mixed backend | Mixed subteam handle | Pending/root-subteam initializing/error before child team creation/restore | Existing child-team lazy-start owner | New builder |
| `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-manager.ts` | Codex backend | Codex team manager | Pending member overlay and pre-`ensureMemberReady` initializing/error for Codex members | Existing Codex team member lifecycle owner | New builder |
| `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-manager.ts` | Claude backend | Claude team manager | Pending member overlay and pre-`ensureMemberReady` initializing/error for Claude members | Existing Claude team member lifecycle owner | New builder |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | Native AutoByteus backend | AutoByteus native command owner | Pending member/root overlays, pre-native-post command-start events, snapshot/aggregate reflection, native event replacement, failure clearing | Existing native target/native post/status cache owner | New builder, `deriveTeamApiStatus` |
| `autobyteus-server-ts/tests/unit/...agent-run-command-start-status...` | Backend tests | Executable validation | Standalone delayed backend send timing | Protects DS-001 | Test doubles |
| `autobyteus-server-ts/tests/unit/...team-command-start-status...` | Backend tests | Executable validation | Managed and native team delayed startup/native post timing, snapshots, clearing | Protects DS-002/DS-003/DS-005 | Test doubles |

## Ownership Boundaries

- `AgentRun` is the authoritative public boundary for direct standalone commands. Callers must not bypass it to mutate backend/thread/session status.
- `TeamRun` is the public team command boundary and default target resolver. It delegates target-specific lifecycle to the backend command owner.
- Managed team command owners (`MixedAgentMemberHandle`, `MixedSubTeamMemberHandle`, `CodexTeamManager`, `ClaudeTeamManager`) are authoritative for member/subteam command-start state because they own member lifecycle and startup/send sequencing.
- `AutoByteusTeamRunBackend` is authoritative for native AutoByteus team command-start state because it owns target resolution, native `team.postMessage`, member status override cache, and no-target root behavior.
- Runtime/provider internals own execution after command-start, not product-level pre-start status.
- Streaming mappers and frontend handlers consume events; they do not own lifecycle policy.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentRun.postUserMessage` | `AgentRunBackend.postUserMessage`, provider/native standalone send | Agent stream handler, inter-agent router | Handler directly publishes standalone runtime status while also calling backend | Strengthen `AgentRun` lifecycle API. |
| `MixedAgentMemberHandle.postMessage` | `ensureReady`, `AgentRunManager.create/restoreAgentRun`, member event binding | `MixedTeamManager` | Manager publishing leaf status while handle owns startup state | Add handle-owned overlay/status method. |
| `MixedSubTeamMemberHandle.postMessage` | child `TeamRun` create/restore and event bridge | `MixedTeamManager` | Parent manager guessing nested child status | Add handle-owned subteam status method. |
| `CodexTeamManager.postMessage` / `ClaudeTeamManager.postMessage` | `ensureMemberReady`, member run maps, member event binding | Team backend wrappers/`TeamRun` | `TeamRun` publishing member status without target validation | Add manager-owned pre-start publication. |
| `AutoByteusTeamRunBackend.postMessage` / `deliverInterAgentMessage` | `resolveTargetMemberContext`, native `team.postMessage`, `lastMemberStatusByRunId`, pending native overlays | `TeamRun`, external channel facade, stream handler | `TeamRun` or transport publishing native member/root status while native backend owns target/native post | Add native-backend-owned pending overlay/event methods. |
| Streaming event mapper | Server message payload serialization | Team/agent stream services | Runtime/domain code emitting frontend protocol payloads directly | Extend domain event builder or mapper. |

## Dependency Rules

Allowed:

- `AgentRun` may use `buildAgentStatusPayload` and emit local `AgentRunEventType.AGENT_STATUS` before backend send.
- Managed team command owners and `AutoByteusTeamRunBackend` may use `team-member-command-start-status-events.ts` to build member/root command-start and failure events.
- Managed team command owners may keep local pending member/subteam overlays and call existing status-change publication methods.
- `AutoByteusTeamRunBackend` may maintain separate pending command-start member/root overlays and combine them with existing `lastMemberStatusByRunId` real-event cache for snapshots/aggregation.
- Runtime events may clear/replace pending command-start status through existing subscription/processing paths.
- Frontend handlers may continue to normalize and apply backend-published statuses.

Forbidden:

- Frontend-only optimistic `initializing` for this flow.
- Waiting for any provider/native startup/send gate, including Codex `thread/start`, Claude query/session startup, or native AutoByteus `team.postMessage`, before emitting command-start `initializing`.
- Publishing only root `TEAM_STATUS initializing` for focused/resolved leaf-member sends.
- Guessing a member for true no-target native AutoByteus posts; emit root team status only for that case.
- Duplicating member route/source status event construction independently in each backend.
- Letting the shared event builder perform target resolution, runtime startup, native post, or overlay storage.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentRun.postUserMessage(message)` | Existing standalone agent run | Apply command-start status and delegate send | Run identity bound by instance | Runtime-agnostic standalone owner. |
| `MixedAgentMemberHandle.postMessage(message)` | One mixed leaf member | Pre-run status, lazy startup, send | Bound `MixedAgentMemberContext` | Emits before `ensureReady`. |
| `MixedSubTeamMemberHandle.postMessage(message)` | One mixed subteam node | Pre-run subteam status, child team startup, delegate | Bound `MixedSubTeamMemberContext` | Uses `TEAM_STATUS` with source path. |
| `CodexTeamManager.postMessage(message, target)` | Codex team member | Resolve target, pre-run status, lazy startup, send | Explicit `TeamMemberSelector` -> `CodexTeamMemberContext` | Do not emit before resolution succeeds. |
| `ClaudeTeamManager.postMessage(message, target)` | Claude team member | Resolve target, pre-run status, lazy startup/send | Explicit `TeamMemberSelector` -> `ClaudeTeamMemberContext` | Same invariant as Codex. |
| `AutoByteusTeamRunBackend.postMessage(message, target)` | Native AutoByteus member or root team command | Resolve explicit/default target when present; member status for resolved target; root status for true no-target; native post | `TeamMemberSelector` -> `AutoByteusTeamMemberContext`, or `null` for true no-target | Electron focused sends provide target route; `TeamRun` may default coordinator/sole before this boundary. |
| `AutoByteusTeamRunBackend.deliverInterAgentMessage(request)` | Native AutoByteus recipient member | Resolve recipient, pre-run member status, native post | Recipient selector from request | Always member-scoped if recipient resolves. |
| `buildAgentMemberCommandStartStatusEvent(input)` | Member event construction | Build member-scoped `AGENT_STATUS` team event | Explicit team run id, runtime kind, member identity, status | No selector/runtime work. |
| `buildTeamCommandStartStatusEvent(input)` | Root/subteam team event construction | Build source-scoped/root `TEAM_STATUS` | Explicit team run id, source path, status | Used for subteam and true no-target root. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentRun.postUserMessage` | Yes | Yes | Low | None. |
| Managed team manager `postMessage` | Yes | Yes after resolution | Medium before resolution | Emit only after selector resolves. |
| Mixed member handle `postMessage` | Yes | Yes | Low | None. |
| `AutoByteusTeamRunBackend.postMessage` | Yes | Yes: resolved member or explicit no-target root | Medium | Define null-target root-only behavior; do not guess coordinator after `TeamRun` defaulting. |
| New status event builders | Yes | Yes | Low | Accept concrete identities only. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Standalone run lifecycle owner | `AgentRun` | Yes | Low | Keep. |
| Native AutoByteus team command owner | `AutoByteusTeamRunBackend` | Yes | Low | Keep and document as command owner. |
| Shared event builder | `team-member-command-start-status-events.ts` | Yes | Low | Name by concrete event concern. |
| Pending native overlays | `pendingCommandStartStatusByRunId` / `pendingRootCommandStartStatus` | Yes | Medium | Keep local to `AutoByteusTeamRunBackend`. |

## Applied Patterns (If Any)

- State transition pattern inside `AgentRun`: command-start status before backend send; runtime events overwrite.
- Event builder pattern for team command-start status: shared construction, no sequencing authority.
- Local overlay pattern inside team command owners: temporary projection state until runtime/native events or failures replace it.
- Native cache composition in `AutoByteusTeamRunBackend`: pending overlays are composed with real-event `lastMemberStatusByRunId`, not promoted into a global registry.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | File | `AgentRun` | Standalone command-start status sequencing | Existing domain owner of run lifecycle | Team target resolution or frontend protocol. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-member-command-start-status-events.ts` | File | Agent team execution services | Shared construction of member/root command-start status events | Serves all team command owners and existing event domain | Startup sequencing, overlay storage, target resolution. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | File | Mixed leaf member handle | Pre-run initializing/error and overlay for mixed leaf members | Existing lazy-start owner | Generic team policy. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts` | File | Mixed subteam handle | Pre-run subteam status and overlay | Existing child-team startup owner | Leaf-agent event duplication. |
| `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-manager.ts` | File | Codex team manager | Pre-run member status and overlay | Existing Codex member lifecycle owner | Frontend protocol payloads. |
| `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-manager.ts` | File | Claude team manager | Pre-run member status and overlay | Existing Claude member lifecycle owner | Frontend protocol payloads. |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | File | Native AutoByteus team backend | Pre-native-post member/root status, pending overlay/cache, event/failure clearing, snapshot aggregation | Existing native target/native post/status cache owner | Managed-team `ensureReady` policy or frontend protocol payloads. |
| `autobyteus-server-ts/tests/unit/agent-run-command-start-status.test.ts` | File | Backend unit tests | Standalone delayed send invariant | Test root exists | Provider E2E. |
| `autobyteus-server-ts/tests/unit/team-command-start-status.test.ts` | File | Backend unit tests | Managed and native team command-start invariant | Protects DS-002/DS-003 | UI rendering assertions. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-execution/domain` | Main-Line Domain-Control | Yes | Low | `AgentRun` owns standalone lifecycle. |
| `agent-team-execution/backends/mixed/members` | Main-Line Domain-Control | Yes | Low | Member handles own mixed member startup. |
| `agent-team-execution/backends/codex` / `claude` | Main-Line Domain-Control | Yes | Medium | Files are large but this change touches existing member lifecycle responsibility. |
| `agent-team-execution/backends/autobyteus` | Main-Line Domain-Control | Yes | Medium | Native backend already owns target/native post/status cache; no new folder needed. |
| `agent-team-execution/services` | Off-Spine Concern | Yes | Low | Shared event construction only. |
| `services/agent-streaming` | Transport | Yes | Low | Existing mapper/handler transport boundary. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Single agent ordering | `applyCommandStartStatus(); await backend.postUserMessage(message);` | `await backend.postUserMessage(message); applyAcceptedStartupStatus();` | Old order hides startup. |
| Managed team member ordering | `resolved = resolveTarget(target); publishMemberInitializing(resolved); await ensureMemberReady(resolved);` | `await ensureMemberReady(resolved); publishMemberInitializing(resolved);` | Cold startup is the invisible interval. |
| Native AutoByteus targeted ordering | `resolved = resolveTargetMemberContext(target); cache/publish member initializing; await team.postMessage(message, resolved.memberName);` | `await team.postMessage(...); cache/publish member initializing;` | Native runtime can also lag; status must be before native post. |
| Native AutoByteus no-target ordering | `target === null; publish root TEAM_STATUS initializing; await team.postMessage(message, null);` | Guess a coordinator/member inside backend after `TeamRun` defaulting failed | True no-target has no member identity. |
| Focused header status | Publish `AGENT_STATUS` with `member_route_key/source_route_key = professor` | Publish only root `TEAM_STATUS initializing` for focused leaf send | Header prefers focused member context. |
| Shared event builder | Builder returns `TeamRunEvent`; command owner publishes and owns overlay | Builder resolves target and starts runtime | Keeps sequencing authority local. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Frontend optimistic status immediately on send | Quick UX patch | Rejected | Backend command-start status event. |
| Keep delayed post-backend `initializing` as authoritative command-start behavior | Existing code already does it | Rejected | Emit before runtime startup/send; runtime events overwrite. |
| Wait for provider/native startup notifications | Provider-owned signals might seem purer | Rejected | Product status must cover startup itself. |
| Root-only `TEAM_STATUS` for focused member sends | Simple aggregate update | Rejected | Publish member-scoped status for resolved/focused members. |
| Guess member identity for true no-target native posts | Could make UI more specific | Rejected | Emit root team status only when no target survives `TeamRun` defaulting. |
| Broad global status registry | Centralizes overlays | Rejected | Keep overlays local to command owners; share only event construction. |

## Derived Layering (If Useful)

- Transport layer: WebSocket stream handlers receive commands and send server messages.
- Domain/control layer: `AgentRun`, `TeamRun`, team managers/member handles, `AutoByteusTeamRunBackend` own lifecycle sequencing.
- Runtime/provider/native layer: Codex/Claude/AutoByteus internals own execution after command-start.
- Event adapter layer: streaming mappers translate domain events to protocol payloads.
- UI layer: frontend handlers/components render backend-published status.

## Migration / Refactor Sequence

1. Add durable backend unit tests:
   - `AgentRun` emits `AGENT_STATUS initializing` before a delayed backend `postUserMessage` promise resolves.
   - Managed team/mixed member emits member-scoped `AGENT_STATUS initializing` before delayed `ensureReady`/create/restore resolves.
   - Mixed subteam emits source-scoped `TEAM_STATUS initializing` before delayed child-team creation resolves.
   - Native AutoByteus explicit-target `postMessage` emits member-scoped `AGENT_STATUS initializing` before delayed native `team.postMessage` resolves; `getMemberStatusSnapshots()` and `getStatusSnapshot()` reflect initializing while pending.
   - Native AutoByteus `deliverInterAgentMessage` does the same for recipient selector before delayed native post resolves.
   - Native AutoByteus true no-target `postMessage` emits root `TEAM_STATUS initializing` before delayed native post resolves and does not emit a member-scoped event.
   - Native AutoByteus pending overlays clear/replace on matching native `AGENT_STATUS`/`TEAM_STATUS` events and clear to error/root error on native post failure.
2. Rework `AgentRun.postUserMessage`:
   - Apply command-start status before awaiting `backend.postUserMessage` when current status is `offline` or `idle`.
   - If backend returns `accepted: false` or throws, emit/recover to `error` or prior terminal status so UI cannot remain initializing.
   - Preserve command observer notification only after accepted result.
3. Add `team-member-command-start-status-events.ts` with explicit builders for:
   - member `AGENT_STATUS` command-start/failure events,
   - source/root `TEAM_STATUS` command-start/failure events.
4. Add pending overlays to managed team command owners:
   - Overlay contributes to snapshots/aggregation while no active runtime status exists.
   - Overlay is cleared/replaced when runtime events arrive, startup/send rejects, termination/dispose occurs.
5. Extend `AutoByteusTeamRunBackend`:
   - Add `pendingCommandStartStatusByRunId` for targeted member commands and `pendingRootCommandStartStatus` for true no-target commands.
   - Publish member/root command-start events before native `team.postMessage` / inter-agent delivery native post.
   - Compose pending overlays with `lastMemberStatusByRunId` and live native snapshots for `getMemberStatusSnapshots()` / `getStatusSnapshot()`; pending applies only until real event/failure/termination clears it.
   - On native event processing, clear matching pending member/root status and record real status in existing cache.
   - On native post failure/rejection, clear pending and publish member/root `error` so UI cannot remain initializing.
6. Ensure aggregate status derives from overlays so root team status becomes `initializing` while any member/root command-start overlay is pending.
7. Run unit tests and status timing probes.
8. Manually verify Electron with a backend built from this branch: send to an offline focused team member and observe `Offline -> Initializing` before runtime startup/send completes.

## Key Tradeoffs

- Publishing `initializing` before provider/native acceptance means it represents backend command acceptance, not provider turn acceptance. This is correct because startup/send latency belongs to initialization.
- Pending overlays add local state to command owners, but this preserves source-of-truth backend semantics without a global registry.
- Native no-target posts get root team initializing only. This is less specific but avoids false member identity.
- Larger manager/backend unification is deferred; all current command owners receive the same invariant at their existing boundaries.

## Risks

- If startup/send fails after early `initializing`, failure recovery must publish `error` or restore a terminal status; otherwise UI can get stuck.
- Duplicate `initializing` events may occur when a team owner emits pre-run status and a newly created `AgentRun` also emits command-start status. This is acceptable if idempotent; implementation should avoid unnecessary duplicates where straightforward.
- Native AutoByteus event streams may report member statuses after pending overlays; clearing must be keyed by canonical member run id/route.
- If the user's Electron app is connected to a different checkout/build, manual verification must ensure the fixed backend is active.

## Guidance For Implementation

- Backend is the source of truth. Do not add frontend optimistic state.
- Emit member-scoped status for focused/resolved team members. Root team status alone is insufficient for focused leaf sends.
- Emit root `TEAM_STATUS initializing` only for true no-target/root commands where no member identity exists after `TeamRun` defaulting.
- Emit before any provider/native startup/send gate, including Codex `thread/start`, Claude query/session startup, and native AutoByteus `team.postMessage`.
- Use existing status normalization, `deriveTeamApiStatus`, and event mapper paths; do not create a new transport protocol.
- Keep sequencing and overlays in lifecycle command owners; keep shared builders limited to event construction.
- Ensure overlays are cleared on matching runtime/native event, failure/rejection, dispose, and termination.
