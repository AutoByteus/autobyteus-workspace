# Design Spec

## Current-State Read

The current startup/send path is UI-visible as a delayed acknowledgement. The composer disables the send button through `isSending`, but the submitted text remains in the local textarea until the backing `AgentContext.requirement` is cleared. In the single-agent path, `agentRunStore.sendUserInputAndSubscribe()` clears the composer only after create/restore work, history activation, attachment finalization, and local message append. In the team-focused path, `activeContextStore.send()` clears the composer only after `agentTeamRunStore.sendMessageToFocusedMember()` returns, while the team store appends the local user message only after create/restore and attachment finalization.

The current lifecycle model also has no startup status. Frontend agent/team statuses are only `offline | idle | running | error`; backend API status payloads expose the same four values. Existing runtime tokens such as `bootstrapping` and `uninitialized` are collapsed to `running`/`offline`, so the UI cannot distinguish startup from actual running work.

The current error recovery path has a missing invariant at the backend/frontend boundary. `applyLiveAgentStatusEvent()` updates `AgentContext.state.currentStatus` only when an `AGENT_STATUS` websocket message arrives. Segment/tool/turn events can render live activity without touching status. If a transient backend lifecycle `error` is followed by recovered work but the backend does not publish a non-error recovery status, or if a client transport reconnect problem is conflated with backend lifecycle `error`, the event monitor can show progress while header/sidebar stay red.

The target design must respect the existing ownership boundaries:

- `activeContextStore` should remain a thin active-selection facade.
- `agentRunStore` and `agentTeamRunStore` own send/start orchestration.
- `services/runStatus/agentRuntimeStatusState.ts` is the central frontend runtime status owner.
- Backend `agent-status-payload.ts`, runtime-specific status projectors, and backend status publishers own lifecycle status normalization and recovery publication.
- Frontend transport/reconnect health must be represented separately from backend lifecycle status.
- Visual components should render status; they must not infer lifecycle policy independently.

## Intended Change

Introduce a first-class `initializing` lifecycle state and an accepted-local-submission phase:

1. When local validation succeeds and the user presses send, append the submitted user message immediately to the active conversation/focused member conversation, clear composer text/attachments, set `isSending`, and set status to `initializing` when the run/member is offline/new/error or otherwise beginning startup.
2. Continue backend create/restore, attachment finalization, stream connection, and websocket send. Reconcile the already-appended local message with finalized attachments and promoted run/team ids.
3. Add `initializing` to frontend/backend status contracts and normalize startup tokens to it.
4. Add a backend lifecycle invariant: after the backend publishes `error`, any later backend-observed same-run/member recovery/start/resume/work must publish a non-error lifecycle status (`initializing`, `running`, or `idle`) before or with subsequent live activity.
5. Keep frontend lifecycle status driven by backend-authored status events. Separate client websocket/reconnect health from run lifecycle `error`; only the central status owner may use backend-authored live activity as bounded projection repair if a recovery status event was missed/out of order.
6. Render `Initializing` consistently in header, team/focused-member views, running list, and history tree.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change + Bug Fix
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + Shared Structure Looseness
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, small scoped refactor
- Evidence: User-message acknowledgement is duplicated/timed inside single/team send flows after slow work; status contracts collapse startup tokens; backend status projection has no explicit error-to-recovered publication invariant; frontend status can preserve stale error after later activity.
- Design response: Add `initializing` to the shared status model; add a small local-submission helper reused by single/team stores; make backend status projection/publishing authoritative for recovery; extend the central frontend run-status owner with startup handling, transport/lifecycle separation, and bounded projection repair.
- Refactor rationale: Without backend-authoritative lifecycle publication plus a shared frontend status owner and accepted-submission helper, fixes would duplicate lifecycle policy in components/stores and likely diverge between single-agent and team-member paths.
- Intentional deferrals and residual risk, if any: Fully asynchronous backend run provisioning is deferred. The frontend local accepted-startup phase provides immediate UX while preserving the current backend create/restore API.

## Terminology

- `initializing`: accepted local/backend startup state after send/start has begun but before the runtime is actively processing or idle-ready. UI label: `Initializing`.
- `accepted local submission`: frontend state transition after local validation succeeds: append the user message, clear composer, mark sending, and apply startup status before awaiting slow backend work.
- `backend lifecycle recovery status`: a backend-authored `initializing`, `running`, or `idle` status emitted after a prior backend-authored `error` when the same run/member starts, resumes, processes a turn, or becomes idle-ready again.
- `transport health`: client websocket/session connectivity state such as reconnecting; it may be displayed as a banner but is not the same as backend run/member lifecycle status.
- `live non-error activity`: backend-authored websocket message types for the same run/member that prove the runtime is active or producing output, excluding `ERROR`, historical hydration, and stale replay. In the target architecture this is a projection-repair fallback, not the primary status source.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: replace four-status-only assumptions in in-scope status normalization/rendering with the five-status model.
- Treat removal as first-class design work: startup tokens must no longer be collapsed to `running` or `offline` where `initializing` is the correct semantic value.
- Decision rule: no component-level fallback that says “unknown startup status means running/offline” for this in-scope status.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Composer send click for single agent | User message visible, composer cleared, runtime message sent | `agentRunStore` with shared local-submission/status helpers | Fixes delayed acknowledgement for single agents. |
| DS-002 | Primary End-to-End | Composer send click for focused team member | Focused member message visible, composer cleared, runtime message sent | `agentTeamRunStore` with shared local-submission/status helpers | Fixes delayed acknowledgement for teams. |
| DS-003 | Return-Event | Backend/runtime status token | Header/sidebar/history status visual | Backend status projection + frontend status owner | Adds `initializing` and prevents startup being misreported as running/offline. |
| DS-004 | Return-Event | Backend recovery after lifecycle error | Backend emits non-error status; frontend clears stale error from status event | Backend status publisher/projector + frontend status owner | Fixes recovered-but-red UI while keeping backend lifecycle status authoritative. |
| DS-005 | Bounded Local | User-message local placeholder lifecycle | Finalized message attachments/no duplicate | Local-submission helper | Ensures immediate display reconciles cleanly with final attachment/promoted id state. |

## Primary Execution Spine(s)

- DS-001: `AgentUserInputTextArea -> activeContextStore -> agentRunStore -> LocalSubmissionState -> create/restore/connect -> WebSocket SEND_MESSAGE -> Event Monitor`
- DS-002: `AgentUserInputTextArea -> activeContextStore -> agentTeamRunStore -> LocalSubmissionState -> create/restore/connect -> Team WebSocket SEND_MESSAGE -> Focused Member Monitor`
- DS-003: `Runtime/Internal Status -> Backend Status Projector -> WebSocket/GraphQL Status Payload -> Frontend RuntimeStatusState -> Status Displays`
- DS-004: `Runtime Recovery/Work Event -> Backend Status Publisher emits recovery status -> WebSocket AGENT_STATUS/TEAM_STATUS -> RuntimeStatusState -> Status Displays`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A single-agent send is accepted locally after validation, displayed immediately, then backend startup and websocket send continue asynchronously. | Composer, active context facade, single-agent send store, local submission, websocket send | `agentRunStore` | Attachment finalization, run id promotion, status transition |
| DS-002 | A focused team-member send follows the same local acknowledgement semantics while preserving team/member routing. | Composer, active context facade, team send store, focused member context, websocket send | `agentTeamRunStore` | Team id promotion, member route key, attachment finalization |
| DS-003 | Runtime status is projected once into a shared API/frontend status model that includes `initializing`, then rendered by UI surfaces. | Runtime status source, backend projector, frontend status state, status visual components | Backend status projection + `agentRuntimeStatusState` | Protocol types, normalizers, generated docs/tests |
| DS-004 | If the backend previously published `error` and later observes same-subject recovery or work, it publishes a newer non-error lifecycle status. The frontend clears stale `Error` only through the central status owner; live activity can be used only as same-subject projection repair if a status event is missed. | Backend runtime event, status publisher/projector, websocket status event, frontend status owner | Backend status projection/publishing + `agentRuntimeStatusState` | Same-run/member identity resolution, transport-health separation, team aggregate update |
| DS-005 | The immediate local user message is the same message later sent to the runtime; finalized attachments update the existing message rather than appending a duplicate. | Local user message object, attachment finalizer, final send payload | Local submission helper | Failure error segment, draft/final attachment transition |

## Spine Actors / Main-Line Nodes

- `AgentUserInputTextArea`: Captures text and invokes send; does not own lifecycle policy.
- `activeContextStore`: Thin facade that routes to single-agent or team send owner.
- `agentRunStore`: Single-agent send/start lifecycle owner.
- `agentTeamRunStore`: Team/focused-member send/start lifecycle owner.
- `LocalSubmissionState` helper: Owns immediate append/clear/reconcile behavior shared by both send owners.
- `agentRuntimeStatusState`: Owns frontend status transitions, initialization, cleanup, transport/lifecycle separation, and bounded projection-repair invariants.
- Backend status projectors/publishers: Own runtime-token-to-API-status semantics and recovery status publication after backend lifecycle errors.
- Status visual components/composables: Render only.

## Ownership Map

- `agentRunStore` owns single-agent orchestration order, final run id promotion, stream connection, and websocket command send.
- `agentTeamRunStore` owns team run/member orchestration order, team id promotion, focused member routing, stream connection, and websocket command send.
- `LocalSubmissionState` owns immediate UI acknowledgement and reconciliation of the local user message.
- `agentRuntimeStatusState` owns frontend status semantics: canonical statuses, accepted startup status, backend status-event application, transport/lifecycle separation, bounded projection repair, and cleanup.
- Backend `agent-status-payload.ts` owns the API status vocabulary and token normalization.
- Runtime-specific projectors/status publishers own provider/source-specific mapping into `AgentApiStatus` and must emit non-error recovery transitions after backend lifecycle errors.
- UI components own only visual mapping.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `activeContextStore.send()` | `agentRunStore` / `agentTeamRunStore` | Routes current selection to correct send owner | Composer-clear timing, local message append, status lifecycle policy |
| `AgentStatusDisplay.vue` / `TeamStatusDisplay.vue` | `useStatusVisuals` / `useTeamStatusVisuals` + status state owner | Reusable visual display | Status inference or recovery rules |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Four-status-only frontend enum assumptions | Startup needs a distinct lifecycle state | `AgentStatus.Initializing`, `AgentTeamStatus.Initializing` | In This Change | Update switch defaults/tests so startup is not hidden as offline/running. |
| Backend normalization of `bootstrapping` as `running` | Misrepresents startup as active processing | `AgentApiStatus = ... | "initializing"` and startup token set | In This Change | Includes AutoByteus special-case `uninitialized -> running` removal. |
| Team composer clearing after full send await | Causes text to remain during slow startup | Local submission helper invoked by team send owner | In This Change | `activeContextStore` remains a facade. |
| Single/team duplicated local append timing | Duplicated behavior caused inconsistent UX | Shared local-submission helper | In This Change | Keeps stores as orchestration owners. |
| Backend lifecycle error not followed by backend recovery status | Violates backend source-of-truth invariant | Backend status publisher/projector emits non-error transition before/with recovered activity | In This Change | Frontend then updates from status event. |
| Client transport error conflated with lifecycle `Error` | Makes frontend display red lifecycle state even if backend is still running | Separate transport health UI/state from lifecycle status in central status owner/stream services | In This Change | Reconnecting banner is allowed; sticky lifecycle `Error` is not. |
| Stale error preserved despite backend-authored same-run activity | Projection/event-ordering fallback | Bounded projection repair in `agentRuntimeStatusState` | In This Change | Fallback only; backend recovery status remains primary. |

## Return Or Event Spine(s) (If Applicable)

- Backend status return/event flow: `Runtime token -> backend projector -> AGENT_STATUS/TEAM_STATUS payload -> handleAgentStatus/handleTeamStatus -> status visuals`.
- Backend recovery-status flow: `Runtime recovery/work after error -> backend status publisher/projector emits AGENT_STATUS/TEAM_STATUS(initializing/running/idle) -> frontend status owner clears Error -> content handler updates monitor`.
- Bounded projection-repair flow: `SEGMENT/TOOL/TURN live event -> streaming dispatcher resolves same run/member -> status owner repairs stale Error only if event is backend-authored live activity and no newer terminal error exists -> content handler updates monitor`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: Local submission helper.
  - `capture text/attachments -> append user message -> clear composer -> apply initializing -> finalize attachments -> update same message -> on failure append error segment and end sending`.
  - Matters because it prevents duplicate user messages while giving immediate feedback.
- Parent owner: Backend status publisher/projector.
  - `runtime status/recovery/work signal -> normalize -> publish lifecycle status transition -> persist/project status`.
  - Matters because backend lifecycle status is the source of truth, including error recovery.
- Parent owner: Frontend status state owner.
  - `status payload/transport health/bounded backend-authored activity repair -> normalize -> apply precedence -> update currentStatus/canInterrupt/isSending`.
  - Matters because stale error recovery, transport/lifecycle separation, and initializing semantics must not be reimplemented in every component.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Attachment finalization reconciliation | DS-001, DS-002, DS-005 | Local submission helper + send stores | Replace draft attachments on the already-visible user message | Avoid duplicate message after finalization | Store code duplicates and forgets one path |
| Run/team id promotion | DS-001, DS-002 | Existing context stores | Promote temp ids to permanent ids | Preserve existing identity handling | Local helper would own too much run lifecycle |
| Status visual mapping | DS-003 | UI components | Color/text/icon for `initializing` | Presentation only | Components infer lifecycle state |
| Team aggregate status | DS-003, DS-004 | Backend team status aggregation + frontend team context | Backend aggregate should publish active/recovered status when backend-authored active work exists, while retaining member-level unrecovered errors | Team row consistency | Member error policy duplicated in UI |
| Validation tests | All | Implementation verification | Catch send/status regressions | Current behavior spans several paths | Manual-only validation misses race regressions |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Frontend status transition policy | `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` | Extend | Already owns status application/cleanup; remains status-event driven | N/A |
| Backend lifecycle status projection/publication | Backend `agent-status-payload.ts` plus provider projectors/status publishers | Extend | Backend must stay source of truth and emit recovery transitions | N/A |
| Runtime token normalization | `runtimeStatusNormalization.ts` and backend `agent-status-payload.ts` | Extend | Already owns canonical token mapping | N/A |
| Send orchestration | `agentRunStore.ts`, `agentTeamRunStore.ts` | Extend | They own run/team lifecycle commands | N/A |
| Immediate message append/clear/reconcile | No dedicated helper; duplicated inline today | Create New | Needed across single/team but not a full store | Existing status helper should not own message mutation; active facade should stay thin |
| Status rendering | Existing composables/components | Extend | Rendering concern already centralized enough | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend run status | Canonical status enum, accepted startup, backend status event application, transport/lifecycle separation, bounded projection repair | DS-003, DS-004 | `agentRuntimeStatusState` | Extend | Add initializing; prefer backend recovery status; no component inference. |
| Frontend send lifecycle | Single/team command orchestration | DS-001, DS-002 | `agentRunStore`, `agentTeamRunStore` | Extend | Call local-submission helper before slow await. |
| Frontend local submission | Immediate message append/clear/reconcile | DS-001, DS-002, DS-005 | New helper | Create New | Small focused helper, not a store. |
| Backend status projection/publication | Runtime token/recovery/work signal -> API status event | DS-003, DS-004 | `agent-status-payload.ts`, provider projectors/status publishers | Extend | Add `initializing` and backend error-to-recovered transition invariant. |
| UI presentation | Status label/dot/icon mapping | DS-003 | Composables/components | Extend | No lifecycle logic. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/runSubmission/localUserSubmission.ts` | Frontend local submission | Local submission helper | Append submitted user message, clear context requirement/attachments, update finalized attachments, expose failure helper | Shared single/team behavior around one concern | Uses `ContextAttachment`, `AgentContext` |
| `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` | Frontend run status | Status owner | Add initializing, accepted startup, backend status recovery handling, transport/lifecycle separation, bounded projection repair, busy status semantics | Existing file already owns status application | Uses `AgentStatus` |
| `autobyteus-web/types/agent/AgentStatus.ts` | Frontend run status | Status enum | Add `Initializing` | Existing enum file | N/A |
| `autobyteus-web/types/agent/AgentTeamStatus.ts` | Frontend run status | Team status enum | Add `Initializing` | Existing enum file | N/A |
| `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts` | Backend status projection | API status contract | Add `initializing`, startup token set, and recovery-status normalization support | Existing API normalization owner | Shared by projectors |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Local user message append/clear/finalize/fail logic for single/team sends | `autobyteus-web/services/runSubmission/localUserSubmission.ts` | Frontend local submission | Single and team stores need identical acknowledgement semantics | Yes | Yes | A generic run orchestration service |
| Backend error-to-recovery lifecycle publication | Backend status projectors/publishers | Backend status projection | Backend must remain status source of truth | Yes | Yes | Frontend-only inference |
| Frontend startup/status-event handling and bounded projection repair | `agentRuntimeStatusState.ts` | Frontend run status | Frontend status policy must be central | Yes | Yes | Component-level visual inference |
| Startup token sets | Backend `agent-status-payload.ts` and frontend `runtimeStatusNormalization.ts` | Status projection | Both boundaries normalize external/raw tokens | Yes | Yes | Divergent token policy per component |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentStatus.Initializing` / backend `"initializing"` | Yes | Yes | Low | Single token means startup accepted/not yet running or idle-ready. |
| Local submission handle | Yes | Yes | Low | It should expose only the local message reference and update/failure operations, not run ids or stream state. |
| Team aggregate status | Yes | Yes | Medium | Define precedence explicitly in backend aggregation: backend-authored active/initializing recovery beats stale aggregate error; member-level unrecovered error remains per member. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/runSubmission/localUserSubmission.ts` | Frontend local submission | Local submission helper | `beginLocalUserSubmission(context, { text, attachments, applyInitializing })`, `finalizeLocalSubmissionAttachments(handle, attachments)`, `failLocalSubmission(handle, error)` | One concrete concern: immediate user-message acknowledgement/reconciliation | `AgentContext`, `ContextAttachment` |
| `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` | Frontend run status | Status owner | Add `AgentStatus.Initializing`, `applyAcceptedStartupStatus`, backend status-event recovery handling, transport health separation, optional bounded `applyLiveRuntimeActivityProjectionRepair`, busy/terminal helpers | Extends existing owner | `AgentStatus` |
| `autobyteus-web/services/runHydration/runtimeStatusNormalization.ts` | Frontend run status | Token normalizer | Map startup tokens to `Initializing` | Existing normalizer | `AgentStatus`, `AgentTeamStatus` |
| `autobyteus-web/stores/agentRunStore.ts` | Frontend send lifecycle | Single-agent run store | Invoke local submission before create/restore; reconcile attachments; send websocket payload; handle failure | Existing single-agent orchestration owner | Local submission helper/status owner |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Frontend send lifecycle | Team run store | Same for focused member; remove delayed clear dependency on `activeContextStore` | Existing team orchestration owner | Local submission helper/status owner |
| `autobyteus-web/stores/activeContextStore.ts` | Frontend active facade | Thin facade | Stop clearing team composer after await; delegate to owner | Keeps boundary thin | N/A |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` | Frontend streaming | Single-agent stream dispatcher | Keep lifecycle status handling status-event driven; report transport health separately; optionally invoke bounded projection repair before non-error activity handlers | Dispatcher resolves live event context | Status owner |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Frontend streaming | Team stream dispatcher | Same for team/member streams after member context resolution | Dispatcher resolves member identity | Status owner |
| `autobyteus-web/composables/useStatusVisuals.ts`, `useTeamStatusVisuals.ts`, status-dot components | UI presentation | Visual renderers | Add `Initializing` label/color/icon | Existing presentation owners | Status enums |
| `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts` | Backend status projection | API status contract | Add `initializing` and normalization | Existing contract owner | Projectors |
| Runtime-specific backend projectors/status publishers | Backend status projection/publication | Provider projectors | Preserve startup status and publish non-error recovery status after backend lifecycle errors before/with later activity | Existing provider mapping owners | `AgentApiStatus` |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-status-aggregation.ts` | Backend status projection | Team status aggregation | Include `initializing`; backend-authored active/initializing precedence over stale errors when active work exists | Existing aggregation owner | `AgentApiStatus` |

## Ownership Boundaries

- Backend status projectors/publishers must emit lifecycle recovery status transitions; frontend code must not compensate with component-level lifecycle inference.
- Callers above `agentRuntimeStatusState.ts` must not set startup/recovery status directly except through its exported functions.
- Send stores may choose when the local submission begins, but not manually duplicate message append/clear/reconcile steps.
- Visual components must consume status values and render them; they must not infer from `isSending`, websocket state, or event content.
- Backend projectors/status publishers must be the only backend source mapping raw runtime/recovery signals to API lifecycle status tokens.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `agentRuntimeStatusState.ts` | Normalize/apply backend status events, initializing, transport/lifecycle separation, bounded projection repair, cleanup | Stores, stream dispatchers, hydration | Components/stores directly assign `Error -> Running` based on local inference | Add a named status-owner function |
| `localUserSubmission.ts` | Append/clear/finalize/fail local user message | `agentRunStore`, `agentTeamRunStore` | Separate single/team implementations of immediate message acknowledgement | Extend helper handle/options |
| Backend `agent-status-payload.ts` and status publishers | API status vocabulary, token normalization, and recovery transition publication | Provider projectors, websocket mapper, run/team status publisher | Provider files returning ad hoc startup/recovery strings outside the API union or emitting live activity after an unrecovered lifecycle error | Add token/union support and recovery-transition support in contract/status publisher owners |

## Dependency Rules

- `agentRunStore`/`agentTeamRunStore` may depend on local submission and status helpers.
- `activeContextStore` may depend on run stores but must not depend on local submission internals.
- Stream dispatchers may depend on status helper functions for transport health and bounded projection repair because they own live event routing and context identity; normal lifecycle transitions must still come from backend status events.
- UI components/composables may depend on status enums but not on stores' send lifecycle internals.
- Backend runtime projectors/status publishers may depend on `agent-status-payload.ts`; `agent-status-payload.ts` must not depend on provider-specific files.

Forbidden shortcuts:

- No component-specific “if `isSending` then display Initializing” rule.
- No frontend-only `initializing` that backend status normalization later overwrites as `running` for startup tokens.
- No clearing `Error` from historical projection/replay activity.
- No treating websocket reconnect/transport failures as permanent backend lifecycle `error`.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentStatusPayload.status` | Agent API status | Carry canonical agent lifecycle status | `offline | initializing | idle | running | error` | Add initializing. |
| `TeamStatusPayload.status` | Team API status | Carry canonical team lifecycle status | `offline | initializing | idle | running | error` | Add initializing. |
| `beginLocalUserSubmission` | Local UI submission | Append and clear immediately | `{ context: AgentContext, text: string, attachments: ContextAttachment[] }` | Returns handle for reconciliation/failure. |
| `applyAcceptedStartupStatus` | Frontend status | Set initializing for accepted startup/send | `AgentContext` or `AgentRunState` | Should set `canInterrupt=false`. |
| `applyBackendLifecycleStatus` / existing status handler | Frontend status | Apply backend-authored lifecycle statuses, including error recovery | `AgentContext`; optional team/member context wrapper for team | Primary lifecycle update path. |
| `applyTransportHealthState` | Frontend connection health | Surface reconnecting/transport errors separately from lifecycle status | stream/session identity | Must not overwrite backend lifecycle status as permanent Error. |
| `applyLiveRuntimeActivityProjectionRepair` | Frontend status | Bounded same-subject stale-error repair when backend-authored activity arrives but recovery status was missed/out-of-order | `AgentContext`; optional team context wrapper for team | Fallback only; live same-subject only. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `beginLocalUserSubmission` | Yes | Yes | Low | Require exact `AgentContext` resolved by store. |
| `applyBackendLifecycleStatus` | Yes | Yes | Medium in team path | Team dispatcher must resolve member context before invoking. |
| `applyTransportHealthState` | Yes | Yes | Medium | Must be keyed to stream/session and visually separate from lifecycle status. |
| `applyLiveRuntimeActivityProjectionRepair` | Yes | Yes | Medium in team path | Team dispatcher must resolve member context before invoking; use only for missed/out-of-order status repair. |
| `AgentStatusPayload.status` | Yes | Yes | Low | Add one explicit token. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Startup lifecycle state | `initializing` / `Initializing` | Yes | Low | Use same wire token everywhere. |
| Local immediate message state | `LocalUserSubmission` | Yes | Low | Keep it about user message acknowledgement, not run lifecycle. |
| Backend recovery status publication | `publishRecoveredLifecycleStatus` or existing status-publisher method | Yes | Medium | Name should make backend source-of-truth and same-run/member recovery explicit. |
| Bounded projection repair | `applyLiveRuntimeActivityProjectionRepair` | Yes | Medium | Name should mention projection repair to avoid replacing backend status events or using historical replay. |

## Applied Patterns (If Any)

- State machine pattern: backend lifecycle status publication is authoritative, and frontend lifecycle application remains centralized in `agentRuntimeStatusState.ts`.
- Adapter/projection pattern: backend provider-specific projectors adapt raw runtime statuses and recovery/work signals into `AgentApiStatus`.
- Local helper pattern: `localUserSubmission.ts` encapsulates repeated local message reconciliation logic without becoming a new orchestration layer.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/runSubmission/` | Folder | Frontend local submission | Local accepted-submission helpers | Service-level shared UI state mutation, not component-specific | Backend calls, websocket connection |
| `autobyteus-web/services/runSubmission/localUserSubmission.ts` | File | Local submission helper | Immediate user message append/clear/reconcile/fail | Reused by single/team stores | Status token normalization, run creation |
| `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` | File | Frontend status owner | Initializing/recovery status transitions | Existing central status owner | Visual CSS, backend API projection |
| `autobyteus-web/services/runHydration/runtimeStatusNormalization.ts` | File | Frontend normalizer | Raw string -> frontend status | Existing normalizer | UI rendering |
| `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts` | File | Backend API status contract | Canonical API status union/normalization | Existing domain boundary | Provider-specific branching beyond token sets |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-status-aggregation.ts` | File | Backend team status aggregation | Team status from member/native statuses | Existing aggregation boundary | UI-specific display policy |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `services/runSubmission` | Off-Spine Concern | Yes | Low | Local UI message acknowledgement supports send stores. |
| `services/runStatus` | Main-Line Domain-Control (frontend status) | Yes | Low | Existing central lifecycle owner. |
| Backend `agent-execution/domain` | Main-Line Domain-Control | Yes | Low | API status belongs to agent execution domain. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Offline send acknowledgement | `beginLocalUserSubmission(...)` appends message + clears composer, then `createAgentRun` awaits while status is `Initializing` | Wait for `createAgentRun` and websocket connect before appending/clearing | Directly fixes user-visible “nothing happened” gap. |
| Status normalization | `bootstrapping -> initializing`, `uninitialized(active) -> initializing`, `processing_user_input -> running` | `bootstrapping -> running` | Startup is not the same as actively running. |
| Backend error recovery | Backend publishes `AGENT_STATUS: error`, then when the same run resumes work it publishes `AGENT_STATUS: running` before/with later content | Tool/segment events render while status remains `Error`, or frontend components infer recovery themselves | Fixes the screenshot bug while keeping backend status authoritative. |
| Transport/lifecycle separation | Websocket reconnect trouble renders a connection banner/state, not a permanent lifecycle `Error` | Client reconnect error overwrites backend run/member status as red `Error` | Prevents client-only failures from sticking to the agent lifecycle. |
| Bounded projection repair | If backend-authored activity arrives after `Error` but recovery status is missed/out-of-order, the central status owner repairs same-run/member status | Every content component clears error independently | Protects against event ordering without abandoning backend source of truth. |
| Terminal error retention | No later backend status/activity recovery: `Error` remains | Clear error on websocket reconnect alone or old history replay | Avoids hiding real failures. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep four-status API and infer initializing from `isSending` in components | Smaller frontend-only change | Rejected | Add canonical `initializing` status and central status owner functions. |
| Keep startup tokens normalized as running | Existing behavior | Rejected | Move startup tokens to initializing sets. |
| Frontend-only recovery from content handlers | Local quick fix | Rejected | Backend must emit recovery status; the central frontend status owner only performs bounded projection repair if needed. |
| Leave team composer clear in `activeContextStore` after await | Existing behavior | Rejected | Local submission helper clears immediately after validation. |

## Derived Layering (If Useful)

- UI layer: composer/status components render and invoke send only.
- Store orchestration layer: single/team stores sequence local submission, backend create/restore, attach finalization, websocket sends.
- Frontend lifecycle domain layer: status and local-submission helpers own reusable UI state transitions.
- Backend projection layer: runtime/provider statuses and recovery/work signals map into canonical API status and publish lifecycle transitions.

## Migration / Refactor Sequence

1. Add `Initializing` to frontend `AgentStatus` and `AgentTeamStatus`.
2. Update frontend status normalization and visual/status-dot mappings for initializing.
3. Add backend `AgentApiStatus = ... | "initializing"` and startup token normalization; update websocket protocol TypeScript types/docs to include `initializing` for agent/team status payloads.
4. Update runtime-specific backend status projectors/status publishers to preserve startup tokens as initializing and to emit a non-error lifecycle status after backend-observed recovery/work following a prior error; update team status aggregation for initializing and backend-authored active-status precedence.
5. Extend `agentRuntimeStatusState.ts` with accepted startup, backend status-event recovery handling, transport/lifecycle separation, and bounded projection-repair helpers; update `isCanonicalAgentStatus` and `isSending`/busy semantics so initializing keeps send disabled until running/idle/error/offline transition.
6. Add `services/runSubmission/localUserSubmission.ts` and unit tests.
7. Update `agentRunStore.ts` to call local submission after validation and before create/restore; reconcile finalized attachments on the returned handle; on failure append/retain error feedback without restoring the text as apparently-unsent.
8. Update `agentTeamRunStore.ts` similarly for focused members and remove delayed composer clearing from `activeContextStore.ts`.
9. Update stream dispatchers so lifecycle status remains status-event driven, reconnect/transport health is surfaced separately, and same-run/member backend-authored activity can invoke only the central bounded projection-repair path before content handlers mutate conversation/activity.
10. Add/adjust tests covering AC-001 through AC-011.



## Backend Status Transition Algorithm

The backend implementation should be transition-based, not heartbeat-based:

```ts
type LifecycleStatus = 'offline' | 'initializing' | 'idle' | 'running' | 'error';

function publishLifecycleStatusIfChanged(subject, rawSignal): void {
  const next = normalizeRawSignalToLifecycleStatus(rawSignal);
  const prev = lifecycleStatusCache.get(subject.key);

  if (next === prev) {
    return; // Do not repeatedly emit running while already running.
  }

  lifecycleStatusCache.set(subject.key, next);
  statusVersionStore.increment(subject.key);
  websocketPublisher.publishStatus({ ...subject, status: next });
}
```

Error detection is backend-owned:

- Runtime/provider lifecycle signal says error/failed.
- Backend catches a terminal or run-level exception for the agent/member.
- Backend explicitly decides the run/member cannot continue without recovery or restart.

Recovery detection is also backend-owned and same-subject scoped:

- A later runtime/provider lifecycle signal says starting/bootstrapping/initializing, running/processing, or idle/ready.
- A later backend-owned turn/work signal for the same run/member starts after the error.
- A later backend-owned output/tool/assistant activity for the same run/member is about to be emitted while the cached lifecycle status is still `error`; in that case the status publisher must first emit `running` (or the precise non-error status) before/with the activity.

Therefore the desired sequence is:

```text
AGENT_STATUS running
AGENT_STATUS error
AGENT_STATUS running   # emitted only when the backend observes real same-run recovery/work
```

The backend must not continuously send `running`; it sends a status event only when `normalize(rawSignal)` differs from the last published lifecycle status for that same run/member. Client websocket reconnect failures are not backend lifecycle errors and should not update this lifecycle cache to `error`.

## Key Tradeoffs

- Frontend local initializing is necessary because backend create/restore can be synchronous and slow. This is honest as “accepted locally/startup in progress,” not a claim that the backend is already running.
- Adding a fifth status is broader than a frontend-only placeholder, but it prevents startup semantics from being erased once backend status events arrive.
- Backend-emitted recovery status is the primary fix for stale Error. Bounded activity-based projection repair remains only for missed/out-of-order status events and is scoped to live backend-authored websocket events, not history replay, to avoid hiding terminal errors.

## Risks

- If backend status projectors emit `initializing` longer than expected, UI may show startup while a runtime is actually waiting/idle. Tests should cover transitions to running/idle.
- Team aggregate precedence changes should be reviewed carefully for mixed member states.
- Local acknowledgement failure behavior needs clear error presentation so users know backend send failed after the message was accepted locally.

## Guidance For Implementation

- Prefer adding narrow helper tests before modifying stores.
- Do not make `AgentUserInputTextArea.vue` infer initializing from `isSending`; it should benefit from store/status changes only.
- In send failure handling, leave the submitted message visible and append a system error segment/message; do not put the text back in the composer unless product explicitly asks for retry-draft behavior later.
- For stream dispatchers, keep `AGENT_STATUS`/`TEAM_STATUS` as the normal lifecycle update path. Define an explicit set of backend-authored live activity message types only for bounded projection repair: include `TURN_STARTED`, `SEGMENT_START`, `SEGMENT_CONTENT`, `TOOL_APPROVAL_REQUESTED`, `TOOL_EXECUTION_STARTED`, `TOOL_EXECUTION_SUCCEEDED`, `TOOL_EXECUTION_FAILED`, `TOOL_EXECUTION_INTERRUPTED`, `TOOL_LOG`, `TODO_LIST_UPDATE`, `INTER_AGENT_MESSAGE`, and `SYSTEM_TASK_NOTIFICATION`; exclude `ERROR`, `CONNECTED`, historical hydration, and pure status messages.
- Ensure `initializing` is considered active for run-history/running-list active indicators and termination availability, but not interruptible.
