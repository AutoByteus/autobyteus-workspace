# Design Spec

## Status

- Status: `Design-ready`
- Solution revision: `SR-003`
- Approved requirements: `requirements.md`, approved by the user on 2026-08-17
- Triggering architecture review: `ARCH-REV-002`, `Fail — Design Impact`, narrowed finding `DR-001`
- Task branch: `codex/agent-team-codex-output-not-visible`
- Base: `origin/codex/agent-team-universal-task-delegation@37739aa2bd718e3e1a53587c1d8604d353d334cb`

## Current-State Read

The supported product path is healthy through Team launch, exact AgentRun routing, Codex execution, AgentRun event production, Team event adaptation, persistence, and root change-sequence allocation. It fails at two later seams:

1. `team-agent-event-websocket-projector.ts` exposes one `projectTeamAgentStatusDto()` containing both `agent_run_id` and snapshot-only `member_address`. The live `AGENT_STATUS` branch spreads that snapshot object into a strict live payload that intentionally excludes `member_address`. Strict parsing rejects the event after `TeamRunEventPublisher` has allocated its sequence.
2. The next successfully projected Team event reaches the browser with a gap. `TeamExecutionViewState` correctly rejects it and returns `snapshot_refresh_required`, but `TeamStreamingService` returns before executing the effect. The connection therefore remains falsely usable while rejecting every later sequenced event.

`ARCH-REV-001` confirmed both root causes and exposed one additional design fact: recovery cannot be described merely as “reopen the Team.” The exposed run-tree selection path reuses a registered local context, and ordinary `connectToTeamStream()` would preserve the failed service. Moreover, per-Agent conversation hydration and the later structural stream snapshot have no common conversation watermark. Hydrating while Team work is active can therefore miss conversation events that the later snapshot's `base_change_sequence` already covers.

`ARCH-REV-002` accepted SR-002's exposed selection route, stable checkpoint, exact snapshot-base comparison, candidate isolation, and background no-resurrection rule. It narrowed DR-001 to the projection producer/API contract: SR-002 described successful `null` as empty and a distinct provider failure, while current production has one non-null GraphQL payload and the server intentionally normalizes missing/failing local projection material to an empty projection bundle. No supported production premise requires a new result variant. SR-003 therefore removes that speculative distinction and uses the current exact payload.

The target preserves the sound owners:

- `TeamRunEventPublisher` remains the one non-persisted root `changeSequence` and snapshot-barrier owner.
- `@autobyteus/team-stream-contracts` remains the exact strict wire authority.
- `TeamExecutionViewState` remains the one browser sequence-admission and structural-mutation owner.
- `TeamStreamingService` remains the one Team WebSocket handshake and synchronization owner.
- `hydrateLiveTeamRunContext()` remains normal hydration; a recovery-specific wrapper reuses its private construction path rather than duplicating projection logic.
- `agentTeamRunStore` remains the one service registry per root TeamRun.
- Run-history selection remains the exposed user navigation boundary and is extended to choose recovery instead of local focus when the current service is known failed.

The new recovery invariant reuses the existing root sequence instead of inventing replay or another authority. A recovery-specific hydration succeeds only across one stable, quiescent `TeamRunExecutionCheckpoint`, and the replacement stream becomes ready only when its structural snapshot has that exact checkpoint sequence.

## Intended Change

1. Split Team Agent status projection around one private status-details core and two complete strict outputs:
   - initial snapshot status: `agent_run_id + member_address + status details`;
   - live status change: `change_sequence + agent_run_id + status details`.
2. Replace the frontend's overlapping handshake booleans with one discriminated Team stream synchronization phase.
3. Rename the misleading snapshot-refresh marker to `team_stream_recovery_required`; emit it once on the first sequence gap and process it even though the delta is rejected.
4. Enter one fail-closed `reopen_required` phase, stop the stale transport, reject commands, and expose one persistent localized instruction: wait for the Team's current work to finish, then select the same Team member again.
5. Route that exact run-tree selection through `reopenTeamRunAfterStreamLoss()` when the local root service is `reopen_required`; ordinary healthy selection continues to focus locally.
6. Add a read-only `TeamRunExecutionCheckpoint` from the existing RootTeamRun authority: `{rootTeamRunId, changeSequence, hasOpenExecutionWork}`.
7. Recovery hydration requires a quiescent checkpoint before hydration, one exact non-null `TeamMemberRunProjectionPayload` for every current AgentRun, the same checkpoint after hydration, and the same `base_change_sequence` at the replacement stream snapshot. A successful empty conversation is the existing payload with `conversation: []` and `activities: []`, never `null`. A GraphQL/transport/identity failure before payload admission aborts. Failure at any step leaves the old failed context/service registered and produces no ready state.
8. Commit the candidate context/service to the registries only after the exact replacement handshake succeeds. Events published after the matching snapshot barrier are queued by the existing publisher and arrive from `N+1` normally.
9. Add exact producer-to-contract-to-browser coverage and the approved real Classroom Simulation/Codex validation.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | R-001–R-004; AC-001–AC-005 | Launch Classroom Simulation Team with Codex/`gpt-5.6-luna`, send to Professor | `investigation-notes.md` BEH-001–BEH-002; real wire and restored screenshots | Render the exact Codex response live under the exact Professor AgentRun; preserve launch/routing/provider behavior | UI send -> exact AgentRun -> Codex -> Team event -> strict wire -> exact Agent context -> conversation UI; DS-001, DS-003 |
| BEH-002 | Contract | R-002–R-004, R-008; AC-003–AC-006, AC-011 | Snapshot and live Team status contracts | `investigation-notes.md` BEH-003; deterministic projector probe and strict server logs | Preserve distinct exact snapshot/live identities; every supported status projects and the root sequence remains contiguous on the wire | status -> specialized projector -> exact shared schema -> WebSocket; DS-002, DS-003 |
| BEH-003 | Contract | R-005–R-006; AC-007–AC-009 | Exact-next root sequence admission | `investigation-notes.md` BEH-004–BEH-005; browser gap trace | Reject the stale delta, enter one fail-closed transition, and expose one exact supported recovery action | parser -> view admission -> one effect -> failed phase -> persistent guidance; DS-004, DS-005 |
| BEH-004 | User | R-007; AC-002, AC-010 | After current Team work finishes, select the same Team member again | `investigation-notes.md` BEH-006, MP-008–MP-012; ARCH-REV-001/002 | Bypass local focus for a known-failed service; consume exact non-null Agent projections across a stable root checkpoint; atomically replace only after an exact snapshot handshake | run-tree selection -> recovery open -> stable checkpoint hydration -> candidate handshake -> registry commit; DS-005, DS-006 |
| BEH-005 | Operational | R-009–R-011; AC-012–AC-015 | User-authorized isolated live validation | `investigation-notes.md` BEH-007 and environment evidence | Preserve isolated disposable state, real package/model/runtime, no secret disclosure, and cleanup proof | safe import -> isolated services -> real browser run -> evidence -> cleanup; DS-007 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `solution-self-validation.md` | Design-principle, spine, ownership, recovery-checkpoint, projection-result, persistence, and acceptance-coverage validation | R-001–R-011; AC-001–AC-016 | Validates SR-003 against the approved basis, ARCH-REV-002, and current production paths | Current / N/A — evidence, not intended behavior |

`investigation-evidence/` contains retained non-normative reproduction evidence and is indexed in `investigation-notes.md`.

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` with bounded `Refactor`.
- Current design issue found: `Yes`.
- Root cause classification: `Shared Structure Looseness`, `Local Implementation Defect`, and a missing recovery-completeness invariant across navigation, hydration, and stream handshake.
- Refactor needed now: `Yes`.
- Evidence: a snapshot DTO is reused as a live DTO; the only recovery effect is skipped; independent booleans permit false readiness; healthy local-selection reuse also captures the known-failed case; unconstrained hydration followed by a later structural snapshot can cover unhydrated conversation events; and SR-002 invented a nullable/strict projection result that the current non-null API does not expose.
- Design response: exact status variants, one synchronization state machine, one failure signal, one exposed recovery selection action, one root-sequence checkpoint spanning recovery hydration through replacement handshake, and the actual non-null Team-member projection payload as the sole recovery projection result.
- Refactor rationale: dropping one field or moving the effect loop would leave an unsafe DTO API and activate false snapshot recovery. Unconditionally routing every selection through hydration would discard the healthy local-focus optimization. The checkpoint path is applied only to a product-reachable known-gap recovery.
- Intentional deferrals: automatic recovery without a user action remains deferred. It would require a full conversation snapshot or event replay contract. Ordinary transport reconnect before a gap is observed also remains current behavior. Neither deferral is used by the known-gap recovery path.

## Terminology

- **Status details:** `status`, `trigger`, `tool_name`, `error_message`, and `error_details`; the only fields shared by snapshot and live status variants.
- **Initial Agent status snapshot:** point-in-time status in the structural Team snapshot. It contains `member_address` so initial placement is explicit.
- **Live Agent status change:** sequenced incremental status event. It contains `change_sequence` and `agent_run_id`, but not `member_address`.
- **Structural Team snapshot:** execution tree, task records, Team communication messages, and Agent status rows at `base_change_sequence`; it contains no Agent conversations.
- **TeamRunExecutionCheckpoint:** read-only root execution fact `{rootTeamRunId, changeSequence, hasOpenExecutionWork}` from the active RootTeamRun.
- **Team-member projection payload:** the existing non-null GraphQL result `{agentRunId, conversation, activities, summary, lastActivityAt, hasEarlierActiveTraceEvents}`. Empty history is represented by empty arrays and null summary/timestamp fields inside this object, not by a null payload.
- **Stable recovery interval:** the same checkpoint sequence with `hasOpenExecutionWork === false` before and after per-Agent hydration, followed by a replacement snapshot whose `base_change_sequence` equals that sequence.
- **Recovery reopen:** the explicit run-tree action performed after Team work finishes. It is distinct from ordinary healthy member focus.
- **Team stream synchronization phase:** `disconnected`, `awaiting_connected_root`, `awaiting_snapshot`, `ready`, or `reopen_required`.

## Design Reading Order

The design proceeds from persisted-data posture to normal streaming, gap detection, the explicit recovery spine, owners/interfaces, files, and implementation sequence. Snapshot and live status remain separate event spines; the recovery checkpoint is a bounded control spine over existing owners.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove `projectTeamAgentStatusDto` and all reuse of a snapshot status object inside live messages.
- Remove `connectedRootAccepted` and `applicationReady`; use one `TeamStreamSyncPhase`.
- Remove `snapshot_refresh_required`, `needsSnapshotRefresh()`, and blind recovery reconnect; replace directly with `team_stream_recovery_required`, `needsStreamRecovery()`, and fail-closed recovery.
- Add no aliases, relaxed parser, live `member_address`, fallback serializer, provider-specific branch, replay, outbox, or dual recovery reader.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: existing Team execution package JSON, task/message ledgers, and Agent conversation/history projections; the disposable witness contains two correctly stored Codex responses.
- Relevant model change: none. Status projection, checkpoints, browser phases, and candidate recovery state are non-persisted.
- Normal reader/writer behavior: provider output persisted through existing Agent history and was restored exactly by current hydration.
- Required semantics: exact root/AgentRun identity, prompt-response order, final content, task/message state, and no duplicate restored messages.
- Operational constraint: operational `$HOME/.autobyteus` data must not be mutated; no rewrite is justified.
- Decision: `Directly Usable — No Migration`.
- Rationale: stored meaning is already correct. The target adds only a read-only in-memory checkpoint around normal reads.
- Supported requirements: R-007–R-008, R-011; AC-002, AC-010, AC-014–AC-015.

### Migration Plan

N/A. No persisted schema changes.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | Team composer send | Exact Codex content rendered in the focused Agent conversation | Root execution plus browser stream/view owners | Proves the real user result |
| DS-002 | Return-Event | BEH-002 | Root snapshot status capture | Strict initial status row in browser view | snapshot projector plus status projector | Preserves initial logical placement |
| DS-003 | Return-Event | BEH-001, BEH-002 | AgentRun status/turn/segment event | Strict live event applied to exact Agent context | root publisher plus live projector/view | Preserves live order and identity |
| DS-004 | Bounded Local | BEH-003 | Non-next sequenced message | One `team_stream_recovery_required` effect | `TeamExecutionViewState` | Rejects stale state once |
| DS-005 | Return-Event | BEH-003, BEH-004 | Recovery effect | Persistent instruction and exact recovery selection route | stream service, store, selection actions | Prevents false health and makes recovery reachable |
| DS-006 | Primary End-to-End | BEH-004 | User reselects the failed Team member after work finishes | Candidate context/service committed and ready at the same root sequence | recovery open coordinator plus service registry | Proves conversation-complete recovery without replay |
| DS-007 | Primary End-to-End | BEH-005 | Isolated environment setup | Browser evidence and cleanup proof | later API/E2E owner | Proves requested real behavior safely |

## Primary Execution Spine(s)

### DS-001 — normal live Team response

`Team composer -> agentTeamRunStore.sendMessageToFocusedMember -> TeamStreamingService -> AgentTeamStreamHandler -> RootTeamRun exact Agent command -> AgentRun/Codex -> TeamAgentEventAdapter -> TeamRunEventPublisher -> strict projector -> Team WebSocket -> TeamExecutionViewState -> exact Agent conversation UI`

### DS-006 — explicit checkpointed recovery

`Persistent Team recovery banner -> user waits for Team work to finish -> selects same Team member in Workspace run tree -> selectTreeRunFromHistory detects reopen_required -> reopenTeamRunAfterStreamLoss -> checkpoint N/open-work false -> per-Agent/current-Team hydration -> checkpoint N/open-work false -> candidate TeamStreamingService expects N -> CONNECTED + structural snapshot base N -> candidate ready -> store commits candidate context/service -> selected member workspace`

### DS-007 — later realistic validation

`Disposable server/web setup -> non-secret env import -> Agent package import -> Classroom Simulation Team -> Codex/gpt-5.6-luna medium -> browser send -> live assertion -> induced gap/recovery assertion -> persisted equality -> safety cleanup`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A normal send remains exact AgentRun execution followed by one strict ordered Team stream into the focused conversation. | TeamRun, AgentRun, Team event, Team stream, Agent conversation | root execution and browser stream/view owners | optimistic user message, persistence, token meter |
| DS-002 | The root snapshot carries a complete status row with AgentRun identity and logical placement. | root package snapshot, initial status row | snapshot/projector boundary | strict DTO parser |
| DS-003 | Each live status or response event receives one sequence and uses its own strict live identity envelope. | sequenced Team Agent event | publisher, event projector, view | approval/token side effects |
| DS-004 | The first mismatch latches recovery before mutation and emits one effect; later stale input is inert. | view sequence and loss latch | `TeamExecutionViewState` | warning log |
| DS-005 | The stream owner executes the rejected result's recovery effect, stops transport, records persistent presentation state, and leaves ordinary reconnect/reselection unable to claim health. | Team stream failure lifecycle | `TeamStreamingService` and store facade | localized banner |
| DS-006 | Recovery selection bypasses local focus. A candidate is hydrated only across stable quiescent checkpoint N, then handshakes at snapshot base N. Only successful candidate readiness commits registry/context replacement. | root checkpoint, persisted Agent projections, candidate stream/context | recovery open coordinator and service registry | selection preservation, workspace resolution |
| DS-007 | Downstream validation exercises the real package/provider/browser path and cleanup. | user-facing Team run | API/E2E owner | credentials, ports, evidence hygiene |

## Spine Actors / Main-Line Nodes

| Node | Main-Line Responsibility | Must Not Do |
| --- | --- | --- |
| `RootTeamRun` | Route commands, expose root snapshot/events, and expose the current execution checkpoint | Know browser presentation or hydrate Agent history |
| `TeamRunEventPublisher` | Assign the one root sequence and queue events across snapshot barriers | Persist/replay events or retry failed projections |
| Team Agent status projector | Build exact snapshot/live status outputs around private details | Export a combined identity superset |
| `TeamExecutionViewState` | Admit exact-next events, mutate the view, and latch one recovery requirement | Perform I/O or recovery hydration |
| `TeamStreamingService` | Own handshake phase, expected recovery base, transport stop, and effect execution | Query GraphQL or publish context registries |
| `runHistorySelectionActions` | Choose healthy local focus versus known-loss recovery | Infer sequence or hydrate directly |
| recovery open coordinator | Orchestrate checkpointed candidate hydration and registry commit | Access private service map or create another sequence |
| `agentTeamRunStore` | Own service candidates and committed one-service-per-root registry | Read persisted conversations or mutate view sequence |
| Team hydration service | Build current Team/Agent context and compare recovery checkpoints | Connect WebSockets or update selection |

## Ownership Map

| Subject | Governing Owner | Owned Invariant | Collaborators |
| --- | --- | --- | --- |
| root event order | `TeamRunEventPublisher` | every published event receives exactly one increasing sequence | RootTeamRun, stream subscribers |
| execution checkpoint | `RootTeamRun.getExecutionCheckpoint()` | checkpoint reads the same root's current sequence and open-work fact | GraphQL query resolver |
| status translation | status-specific projector | only status details are shared; output envelopes remain exact | domain status, strict schemas |
| browser sequence admission | `TeamExecutionViewState` | non-next input never mutates; only first gap emits recovery | strict parser |
| stream synchronization | `TeamStreamingService` | only exact handshake reaches ready; known loss never reconnects directly | generic WebSocket client |
| Agent projection result | `AgentRunViewProjectionService` -> `TeamMemberRunViewProjectionService` -> non-null GraphQL payload | one payload object; empty content uses empty arrays | local replay provider, Team execution location |
| recovery hydration | `hydrateTeamRunContextForStreamRecovery()` | one exact non-null projection payload per current AgentRun and identical quiescent before/after checkpoints | shared Team-member projection query, private hydration builder, checkpoint query |
| candidate service commit | `agentTeamRunStore.replaceFailedTeamStream()` | old failed registry entries remain authoritative until candidate is ready at expected base | context store, service candidate |
| recovery selection | `runHistorySelectionActions` | failed local root chooses recovery; healthy local root chooses focus | run history store, recovery open coordinator |
| recovery presentation | `agentTeamRunStore` presentation projection + `TeamWorkspaceView` | one persistent instruction per failed root; no lifecycle authority duplication | service callback, localization |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentTeamStreamHandler.connect/handleMessage` | RootTeamRun and stream projectors | WebSocket entry | root sequencing or browser recovery |
| `agentTeamRunStore.connectToTeamStream` | committed per-root service | normal public connect facade | reset `reopen_required` |
| `agentTeamRunStore.replaceFailedTeamStream` | candidate/registry commit logic | one recovery replacement facade | GraphQL hydration or sequence creation |
| `reopenTeamRunAfterStreamLoss` | checkpoint hydration and registry owners | exact recovery workflow | ordinary healthy open behavior |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `projectTeamAgentStatusDto()` | snapshot identity is unsafe as a common live core | two exact exports in status-specific projector | In This Change | no alias |
| snapshot import from live event projector | mixed snapshot/live responsibility | status-specific file imported by exact consumers | In This Change | details remain private |
| `connectedRootAccepted` and `applicationReady` | overlapping state permits false combinations | `TeamStreamSyncPhase` | In This Change | `isReady` derived |
| `refreshRequired` / `needsSnapshotRefresh()` | falsely implies structural recovery | `streamRecoveryRequired` / `needsStreamRecovery()` | In This Change | direct rename |
| `snapshot_refresh_required` | same misleading implication | `team_stream_recovery_required` | In This Change | once only |
| blind disconnect/reconnect recovery | cannot restore conversations | fail-closed state plus checkpointed user recovery | In This Change | no partial merge |
| local-focus reuse for a known-failed service | traps user on failed context | recovery branch in run-history selection | In This Change | healthy reuse preserved |

## Return Or Event Spine(s) (If Applicable)

### DS-002 — initial status snapshot

`TeamRun.getLeafAgentStatusSnapshots -> private status-details projection -> projectTeamAgentStatusSnapshotDto -> strict snapshot schema -> TEAM_EXECUTION_VIEW_SNAPSHOT -> TeamExecutionViewState.applySnapshot`

### DS-003 — live status and response

`AgentRun event -> TeamAgentEventAdapter -> TeamRunEventPublisher N -> projectLiveTeamAgentStatusMessage/projectTeamAgentEventMessage -> strict wire -> TeamExecutionViewState N -> exact Agent context projector`

### DS-005 — detected loss to exposed recovery

`gap result -> team_stream_recovery_required -> TeamStreamingService.enterReopenRequired -> stop/not-ready -> store notice -> TeamWorkspaceView persistent guidance -> run-tree selection -> recovery coordinator`

## Bounded Local / Internal Spines (If Applicable)

### BL-001 — root event publication

- Parent owner: `TeamRunEventPublisher`.
- Chain: `accepted domain event -> allocate N+1 -> snapshot barrier queues -> isolated subscribers`.
- Importance: a supported projector must be total; a subscriber failure cannot roll sequence back.

### BL-002 — view sequence admission

- Parent owner: `TeamExecutionViewState`.
- Chain: `extract sequence -> compare expected -> first mismatch latches/emits effect OR exact next applies atomically -> advance`.
- Importance: stale content never mutates conversations and repeated stale input cannot create a recovery storm.

### BL-003 — Team stream state machine

- Parent owner: `TeamStreamingService`.
- Chain: `disconnected -> awaiting_connected_root -> awaiting_snapshot -> ready -> reopen_required`.
- Importance: `reopen_required` has no transition to ready on the same failed instance.

| Current Phase | Trigger | Next Phase | Required Action |
| --- | --- | --- | --- |
| `disconnected` | normal connect | `awaiting_connected_root` | bind exact root and transport |
| `awaiting_connected_root` | exact `CONNECTED` | `awaiting_snapshot` | admit root identity |
| `awaiting_snapshot` | valid normal snapshot | `ready` | apply snapshot and enable commands |
| `awaiting_snapshot` with expected recovery N | snapshot base N | `ready` | apply candidate snapshot and resolve candidate readiness |
| `awaiting_snapshot` with expected recovery N | snapshot base not N | `reopen_required` | reject candidate, stop it, commit nothing |
| `ready` | exact-next event | `ready` | apply view/effects |
| `ready` | sequence gap | `reopen_required` | stop, drain, notify once |
| `reopen_required` | repeated message or ordinary connect | `reopen_required` | reject; never mutate/reconnect |
| any phase | dispose | `disconnected` | detach and drain |

### BL-004 — stable recovery checkpoint

- Parent owner: recovery open coordinator using RootTeamRun checkpoint and hydration boundaries.
- Chain: `checkpoint A -> require no open work -> hydrate exact non-null projection payloads -> checkpoint B -> require A == B -> candidate handshake snapshot base == A.changeSequence -> commit`.
- Projection result: `getTeamMemberRunProjection` remains non-null. Its successful empty shape is `{agentRunId, conversation: [], activities: [], summary: null, lastActivityAt: null, hasEarlierActiveTraceEvents: false}`. Recovery does not interpret `null` and adds no provider-failure union. A GraphQL/transport error or payload AgentRun-identity mismatch aborts before candidate publication.
- Server semantics: `AgentRunViewProjectionService` remains the owner that normalizes provider `null` or caught local replay failure to the exact empty bundle; `TeamMemberRunViewProjectionService` validates root/AgentRun placement and maps it; the resolver maps the non-null payload. No supported product premise requires recovery to distinguish the normalized causes.
- Failure: open work, changed sequence, root mismatch, GraphQL/transport/identity failure before payload admission, transport failure, or snapshot mismatch cancels the candidate and retains the old failed service/context.
- Importance: conversations read during hydration and the stream baseline belong to one proven no-change interval.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| strict schema parsing | DS-002, DS-003 | projectors/browser parser | prove exact wire shapes | prevents silent drift | relaxation would hide the defect |
| local optimistic user message | DS-001 | send workflow | immediate feedback/dedupe | existing UX | not provider success |
| token/approval side effects | DS-003 | existing stores/trackers | separate exact side effects | existing subjects | must not own sequence |
| execution-checkpoint query | DS-006 | recovery hydration | read current root sequence/open-work | connects existing owners without persistence | must not become replay/history |
| persistent recovery notice | DS-005 | Team workspace | tell user exact wait/reselect action | visible until recovery/page reload | must not decide lifecycle |
| workspace resolution | DS-006 | hydration | rebuild Agent contexts | current behavior | must not enter transport |
| evidence safety | DS-007 | API/E2E owner | isolate credentials/data/ports | operational safety | must not change runtime behavior |

## Ownership Boundaries

1. Provider-neutral Agent status remains domain data; snake_case and transport envelopes belong to Team projectors.
2. Root sequencing and checkpoint values come only from RootTeamRun/TeamRunEventPublisher.
3. Agent/Team-member run-history projection services and the non-null GraphQL payload remain the sole current projection-result authority; recovery invents no result variant.
4. `TeamExecutionViewState` detects loss and plans one effect; it performs no I/O.
5. `TeamStreamingService` owns transport and handshake, including expected recovery snapshot base; it never hydrates history.
6. Run-history selection owns the decision between local focus and recovery workflow.
7. Recovery hydration compares checkpoints around the same private current-context builder used by normal hydration and consumes the exact non-null Team-member payload.
8. `agentTeamRunStore` owns candidate service creation and registry commit. It never publishes a candidate or disposes the old failed entries before candidate readiness.
9. `WebSocketClient` remains generic and knows nothing about Team sequence semantics.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| status-specific exports | private details mapper and strict parsers | snapshot/live projectors | caller spreads snapshot into live payload | add exact specialized export |
| `RootTeamRun.getExecutionCheckpoint` | publisher sequence + root open-work query | GraphQL checkpoint resolver | resolver reaches publisher/backend internals separately | strengthen RootTeamRun facade |
| `getTeamMemberRunProjection` | Agent projection-or-empty bundle + Team root/AgentRun validation + non-null resolver mapping | normal and recovery hydration | frontend invents nullable/provider-failure semantics | keep exact payload and separate consumer-side error policy |
| `TeamExecutionViewState.applyMessage` | compare/latch/mutation/effects | TeamStreamingService | service edits sequence/view directly | strengthen result type |
| `TeamStreamingService` | phase, expected base, listeners, command drains | service registry | store toggles private phase/transport | expose exact queries/candidate connect result |
| `agentTeamRunStore.replaceFailedTeamStream` | candidate construction, readiness, registry commit | recovery open coordinator | coordinator edits service map or context registry | strengthen replacement facade |
| `reopenTeamRunAfterStreamLoss` | checkpoint hydration + selection preservation | run-history selection | selection calls hydration/store internals | strengthen recovery coordinator |

## Dependency Rules

- Domain status -> status projector -> strict Team schemas; never reverse.
- Snapshot/live projectors depend only on their corresponding status export.
- Root checkpoint query depends on RootTeamRun public checkpoint; it must not inspect publisher/backend internals separately.
- Recovery projection uses the existing `getTeamMemberRunProjection` non-null payload; no nullable field, result union, provider-specific error channel, or recovery-only server entry is allowed.
- TeamStreamingService depends on pure view results and generic transport, never GraphQL/stores.
- Run-history selection may query `agentTeamRunStore.isTeamStreamReopenRequired` and call the recovery coordinator; it must not access service instances.
- Recovery coordinator may call recovery hydration and the store replacement facade; it must not manage candidate sockets directly.
- Candidate context/service are unpublished until readiness succeeds.
- Forbidden: direct `reopen_required -> ready`, structural-snapshot conversation recovery, nullable/union recovery projection, relaxed payload parsing, replay/outbox, second root sequence, provider-specific recovery, candidate partial commit, or compatibility aliases.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `projectTeamAgentStatusSnapshotDto(snapshot)` | initial status row | exact snapshot DTO | AgentRun ID + member address | strict output |
| `projectLiveTeamAgentStatusMessage(snapshot, changeSequence)` | live status | exact sequenced message | positive sequence + AgentRun ID | address excluded by construction |
| `RootTeamRun.getExecutionCheckpoint()` | root execution activity | one read-only checkpoint | intrinsic root ID | returns sequence/open-work together |
| `getTeamRunExecutionCheckpoint(teamRunId)` | GraphQL checkpoint query | expose exact active-root checkpoint | exact root TeamRun ID | no history/persistence |
| `TeamExecutionViewState.applyMessage(message)` | browser view | next-sequence admission/effects | strict Team message | first gap emits one effect |
| `TeamStreamingService.connectCandidate(root, context, expectedBase)` | recovery candidate | become ready only at exact snapshot base | root ID + candidate context + non-negative sequence | promise/result; no registry side effect |
| `TeamStreamingService.isReopenRequired` | sync lifecycle | expose known semantic loss | bound root | no reset method |
| `getTeamMemberRunProjection(teamRunId, agentRunId)` | current Team-member projection | one non-null projection payload | exact root TeamRun ID + AgentRun ID | empty history is an object with empty arrays; no recovery variant |
| `hydrateTeamRunContextForStreamRecovery(input)` | recovery candidate context | exact non-null payloads plus stable checkpoint before/after hydration | root ID + focus | returns candidate + expected base; GraphQL/transport/identity failure aborts |
| `agentTeamRunStore.replaceFailedTeamStream(input)` | service registry | commit ready candidate over failed entries | root ID + context + expected base | commit nothing on failure |
| `reopenTeamRunAfterStreamLoss(input)` | recovery workflow | hydrate, connect candidate, preserve focus/selection | root ID + exact AgentRun focus | separate from normal open |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| snapshot status projector | Yes | Yes | Low | snapshot-only identity |
| live status projector | Yes | Yes | Low | sequence/AgentRun only |
| execution checkpoint | Yes | Yes | Low | one root ID, one coherent read |
| Team-member projection query | Yes | Yes | Low | existing non-null payload is the only result; no nullable/union recovery schema |
| recovery hydration | Yes | Yes | Low | dedicated recovery export reuses the exact query; normal hydration keeps its best-effort wrapper |
| candidate connect | Yes | Yes | Low | exact expected base required |
| failed-service replacement | Yes | Yes | Low | store facade hides map/commit |
| recovery selection | Yes | Yes | Low | failed root branch is explicit |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| initial status projector | `projectTeamAgentStatusSnapshotDto` | Yes | Low | only structural snapshot uses it |
| live status projector | `projectLiveTeamAgentStatusMessage` | Yes | Low | explicitly live |
| root activity fact | `TeamRunExecutionCheckpoint` | Yes | Low | not named “recovery state”; it is a factual root checkpoint |
| Agent projection result | `TeamMemberRunProjectionPayload` | Yes | Low | existing name and non-null meaning retained |
| recovery hydration | `hydrateTeamRunContextForStreamRecovery` | Yes | Low | purpose and output precondition explicit |
| recovery coordinator | `reopenTeamRunAfterStreamLoss` | Yes | Low | distinguishes known loss from healthy open/focus |
| terminal stream phase | `reopen_required` | Yes | Low | matches the exact reselect action |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| strict status DTOs | Team stream contracts | Reuse | already correct | N/A |
| status transport projection | server Agent streaming | Extend | current file mixes variants | one subject-specific projector |
| root sequence/open-work fact | RootTeamRun | Extend | it already owns both public concepts | expose one tight checkpoint |
| sequence admission | frontend teamExecution | Extend | current reducer is correct | direct rename/one-shot effect |
| synchronization | TeamStreamingService | Refactor | existing owner | one phase plus expected-base candidate handshake |
| Team-member projection | existing run-history projection services/GraphQL | Reuse unchanged | already owns exact current/empty projection result | no new recovery result type |
| context reconstruction | run hydration | Reuse/Extract | normal builder already exists | recovery wrapper bypasses only the normal catch without duplicating construction |
| selection routing | runHistory selection | Extend | actual exposed action owner | no new navigation service |
| user visibility | Team workspace/store | Extend | exact affected surface and reactive registry already exist | persistent banner projection only |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Team domain/event publication | root events, sequence, checkpoint | DS-001, DS-003, DS-006 | RootTeamRun/publisher | Extend minimally | one read-only method |
| server Team stream projection | exact snapshot/live status | DS-002, DS-003 | stream handler | Extend | status-specific file |
| server run-history projection | exact projection-or-empty payload and Team-member identity | DS-006 | Agent/Team-member projection services | Reuse unchanged | non-null result is already authoritative |
| GraphQL Team execution query | checkpoint exposure | DS-006 | RootTeamRun | Extend | no persisted schema |
| frontend Team execution | sequence admission/loss effect | DS-003, DS-004 | view state | Extend | pure |
| frontend Agent streaming | phase/effects/candidate handshake | DS-001, DS-005, DS-006 | TeamStreamingService | Refactor | one owner |
| frontend run hydration/open | stable recovery construction/orchestration | DS-006 | hydration and open coordinators | Extend | normal open preserved |
| frontend run selection | healthy focus vs recovery | DS-005, DS-006 | run-history selection | Extend | actual UI action |
| frontend Team workspace | persistent instruction | DS-005 | store presentation projection | Extend | no lifecycle authority |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| new `team-agent-status-websocket-projector.ts` | server stream projection | status boundary | private details + exact outputs | one status subject | strict schemas |
| `team-agent-event-websocket-projector.ts` | server stream projection | live mapper | non-status events + live status delegation | remains exhaustive live mapper | live export |
| `team-execution-view-projector.ts` | server stream projection | snapshot mapper | initial status export | structural snapshot only | snapshot export |
| `agent-run-view-projection-service.ts` | server run history | Agent projection owner | preserve exact projection-or-empty-bundle result | documents the actual producer | local replay provider |
| `team-member-run-view-projection-service.ts` | server run history | Team-member projection owner | preserve root/AgentRun validation and non-null mapping | exact Team subject | Agent projection |
| `api/graphql/types/team-run-history.ts` | API | Team history resolver | preserve non-null projection field/payload; add checkpoint query separately | one Team-history boundary | Team projection/checkpoint |
| `root-team-run.ts` | Team domain | rooted public boundary | expose execution checkpoint | already owns sequence/open-work | publisher/root work |
| GraphQL Team-run history type/resolver files | API | checkpoint query | exact DTO/query mapping | existing Team-run API boundary | RootTeamRun checkpoint |
| `teamExecutionViewModels.ts` / `teamExecutionViewState.ts` | frontend Team execution | pure view | renamed one-shot loss effect | existing owner | N/A |
| `TeamStreamingService.ts` | frontend streaming | sync owner | phase/effect/candidate expected-base handshake | one stream lifecycle | view/transport |
| `teamRunContextHydrationService.ts` | frontend hydration | context builder | shared non-null projection query/builder + normal best-effort and checkpointed recovery entries | one construction concern | projection/checkpoint queries |
| `teamRunOpenCoordinator.ts` | frontend open | workflows | add recovery-specific coordinator beside normal open | same subject, distinct entry | hydration/store |
| `agentTeamRunStore.ts` | frontend lifecycle | registry | candidate commit, failure query, notice projection | existing service map owner | stream service |
| `runHistorySelectionActions.ts` | frontend navigation | selection | route failed local selection to recovery | exact current decision point | store/open facade |
| `TeamWorkspaceView.vue` + EN/ZH catalogs | presentation | affected workspace | persistent exact recovery instruction | exact user surface | store notice |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| five status details | private status-projector function | server stream projection | identical semantics | Yes | Yes | exported identity superset |
| `TeamRunExecutionCheckpoint` | Team domain type near RootTeamRun | Team domain | API and recovery compare one fact | Yes | Yes | persisted revision or replay cursor |
| `TeamMemberRunProjectionPayload` | existing GraphQL/generated type | server/frontend run history | one exact non-null current/empty result | Yes | Yes | nullable/union recovery result |
| sync phase | private union in TeamStreamingService | frontend streaming | all transitions in one service | Yes | Yes | runtime-wide model |
| recovery notice | exact store-facing type | frontend streaming/lifecycle boundary | callback and workspace share one message identity | Yes | Yes | generic error bag |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| private status details | Yes | Yes | Low | identity remains outside |
| snapshot status | Yes | Yes | Low | member address only here |
| live status | Yes | Yes | Low | change sequence only here |
| execution checkpoint | Yes | Yes | Low | root ID + current sequence + open-work only |
| Team-member projection payload | Yes | Yes | Low | existing non-null object; empty arrays represent empty content |
| sync phase | Yes | Yes | Low | remove booleans |
| recovery notice | Yes | Yes | Low | presentation only; service phase remains authority |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/agent-streaming/team-agent-status-websocket-projector.ts` | server Team stream | status projector | exact status variants | coherent subject | strict schemas |
| `.../team-agent-event-websocket-projector.ts` | server Team stream | live mapper | exhaustive live mapping | existing responsibility | live status export |
| `.../team-execution-view-projector.ts` | server Team stream | snapshot mapper | structural snapshot | existing responsibility | snapshot status export |
| `autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts` | server run history | Agent projection owner | retain exact projection-or-empty result; no recovery-only branch | current factual producer | local replay provider |
| `.../team-member-run-view-projection-service.ts` | server run history | Team-member projection owner | retain root/AgentRun validation and non-null mapping | current Team subject | Agent projection |
| `autobyteus-server-ts/src/agent-team-execution/domain/root-team-run.ts` plus focused checkpoint type | Team domain | root facade | current execution checkpoint | no API bypass | publisher/open-work |
| `autobyteus-server-ts/src/api/graphql/types/team-run-history.ts` | API | Team-history resolver | retain non-null projection payload and add exact root checkpoint exposure | current API boundary | projection/checkpoint types |
| `autobyteus-web/graphql/queries/runHistoryQueries.ts` plus generated GraphQL types | frontend API | Team-history query contract | reuse non-null projection payload; add checkpoint query/type only | one generated contract | server schema |
| `autobyteus-web/services/teamExecution/teamExecutionViewModels.ts` | frontend Team execution | view contract | exact recovery effect | internal seam | N/A |
| `.../teamExecutionViewState.ts` | frontend Team execution | view owner | exact sequence/latch | one mutation owner | view model |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | frontend stream | sync owner | phase, effects, expected-base candidate connection | one stream lifecycle | transport/view |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | frontend hydration | context construction | shared non-null projection query/builder plus normal best-effort and checkpointed recovery entries | avoids duplicate hydration and invented result types | projection/checkpoint queries |
| `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | frontend open | open/recovery workflows | normal open plus explicit recovery orchestration | same Team-open subject | hydration/store |
| `autobyteus-web/stores/agentTeamRunStore.ts` | frontend lifecycle | registry | failed query, candidate commit, notice projection | current map owner | stream service |
| `autobyteus-web/stores/runHistorySelectionActions.ts` | frontend navigation | selection | exact failed-service branch | existing user-action decision | store/open |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | presentation | Team workspace | persistent recovery instruction | exact affected surface | notice getter |
| EN/ZH localization catalogs | localization | language catalogs | exact recovery/wait/retry copy | established pattern | N/A |
| existing Agent/Team projection unit tests and run-history GraphQL E2E | validation | projection-result seam | exact empty bundle -> Team mapping -> non-null payload | proves actual producer/API contract | current services/schema |
| `autobyteus-web/services/runHydration/__tests__/teamRunContextHydrationService.spec.ts` | validation | recovery hydration | accept exact empty object; reject GraphQL/transport/identity failure | proves consumer contract | query/builder |

## Applied Patterns (If Any)

- **Shared core + specialized variants:** share status details, not identity envelopes.
- **Discriminated state machine:** one synchronization phase.
- **Fail closed:** known sequence loss cannot mutate or reconnect as healthy.
- **Optimistic checkpoint validation:** the existing root sequence proves no Team event crossed recovery hydration.
- **Prepare then commit:** hydrate and handshake an unpublished candidate; commit registry/context only after exact readiness.
- **Actual-surface routing:** the existing run-tree selection decision owns healthy focus versus recovery.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| server `agent-team-execution/domain` | Folder | rooted Team domain | execution checkpoint fact/facade | existing sequence/open-work public owner | browser/GraphQL DTOs |
| server `services/agent-streaming` | Folder | Team stream projection | exact status/event/snapshot projection | current boundary | provider/persistence |
| server `run-history/services` | Folder | current view projection | exact projection-or-empty bundle and Team-member identity | existing producer boundary | recovery state machine |
| server Team-run GraphQL boundary | Folder | API adapter | non-null projection payload plus checkpoint query | existing Team-run API | history hydration policy |
| web `services/teamExecution` | Folder | browser Team aggregate | sequence/loss effect | current pure owner | I/O |
| web `services/agentStreaming` | Folder | stream lifecycle | handshake/recovery candidate | current owner | GraphQL hydration |
| web `services/runHydration` | Folder | context construction | stable recovery hydration | current projection builder | socket registry |
| web `services/runOpen` | Folder | Team open workflows | explicit recovery orchestration | current public open boundary | private map access |
| web `stores` | Folder | registry/navigation facades | service commit and selection route | current ownership | wire construction |
| web Team workspace component | File | presentation | persistent recovery copy | exact affected UI | lifecycle decisions |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| server Team domain | Domain | Yes | Low | one tight checkpoint method/type |
| server stream services | Transport projection | Yes | Low | one added status file |
| web teamExecution | Domain-control | Yes | Low | remains pure |
| web agentStreaming | Transport/synchronization | Yes | Low | owns candidate handshake only |
| web runHydration/runOpen | Application control | Yes | Low | construct then orchestrate; no transport internals |
| web stores/navigation | Application registry/entry | Yes | Medium | public facades only; policies stay with deeper owners |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| snapshot status | `{agent_run_id, member_address, status, ...details}` | snapshot object later trimmed | initial placement is explicit |
| live status | `{change_sequence, agent_run_id, status, ...details}` | `{...snapshotStatus, change_sequence}` | prevents regression |
| checkpoint | `{rootTeamRunId, changeSequence: 63, hasOpenExecutionWork: false}` | persisted revision/replay cursor | factual current root state only |
| recovery | `failed -> wait -> reselect -> N/idle -> hydrate -> N/idle -> snapshot N -> commit` | `gap -> reconnect -> structural snapshot -> ready` | closes conversation interval |
| candidate failure | `checkpoint/snapshot mismatch -> cancel candidate -> old failed entries remain` | publish candidate then discover mismatch | no partial state |
| empty Agent projection | `{agentRunId, conversation: [], activities: [], summary: null, lastActivityAt: null, hasEarlierActiveTraceEvents: false}` | successful `null` or recovery-only result union | matches the actual non-null API |
| projection query failure | no admitted payload; abort candidate | convert GraphQL/transport/identity failure to empty in recovery | recovery never invents an API result |

Example status construction:

```ts
const projectStatusDetails = (snapshot: TeamAgentStatusSnapshot) => ({
  status: snapshot.details.status,
  trigger: snapshot.details.trigger,
  tool_name: snapshot.details.toolName,
  error_message: snapshot.details.errorMessage,
  error_details: snapshot.details.errorDetails,
});

export const projectTeamAgentStatusSnapshotDto = (snapshot: TeamAgentStatusSnapshot) =>
  teamAgentStatusDtoSchema.parse({
    agent_run_id: snapshot.execution.agentRunId,
    member_address: snapshot.execution.memberAddress,
    ...projectStatusDetails(snapshot),
  });

export const projectLiveTeamAgentStatusMessage = (snapshot: TeamAgentStatusSnapshot, changeSequence: number) =>
  parseTeamStreamServerMessage({
    type: "AGENT_STATUS",
    payload: {
      change_sequence: changeSequence,
      agent_run_id: snapshot.execution.agentRunId,
      ...projectStatusDetails(snapshot),
    },
  });
```

Example recovery validation:

```ts
const before = await getTeamRunExecutionCheckpoint(rootTeamRunId);
if (before.hasOpenExecutionWork) throw waitForTeamWorkError();
const candidate = await hydrateTeamRunContextForStreamRecovery(input); // exact non-null payload per AgentRun
const after = await getTeamRunExecutionCheckpoint(rootTeamRunId);
if (after.hasOpenExecutionWork || after.changeSequence !== before.changeSequence) {
  throw recoveryCheckpointChangedError();
}
await agentTeamRunStore.replaceFailedTeamStream({
  rootTeamRunId,
  candidateContext: candidate.hydratedContext,
  expectedBaseChangeSequence: after.changeSequence,
});
```

The first gap retains `TEAM_EXECUTION_CHANGE_SEQUENCE_GAP`. Later stale messages return `TEAM_EXECUTION_STREAM_RECOVERY_REQUIRED`. Ordinary `ensureTeamStreamConnected()` fails immediately with `TEAM_STREAM_REOPEN_REQUIRED` for the committed failed service.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| allow `member_address` in live schema | quick admission | Rejected | exact live producer |
| generic unknown-field stripping | hide drift | Rejected | specialized strict projectors |
| mapper/recovery aliases | reduce edits | Rejected | direct clean cut |
| automatic structural reconnect | existing effect name implied it | Rejected | checkpointed user recovery |
| merge history/live without checkpoint | seamless recovery | Rejected | stable root checkpoint + exact snapshot base |
| nullable/union recovery projection | distinguish hypothetical provider failure | Rejected | existing non-null payload; empty arrays are empty history; ordinary query failure aborts |
| replay/outbox | could recover missing events | Rejected | disproportionate; existing sequence checkpoint suffices for explicit recovery |
| Codex-specific mapper | Codex is witness | Rejected | provider-neutral Team boundary |

## Derived Layering (If Useful)

`Agent/provider domain -> Team domain sequence/checkpoint -> strict Team projection -> browser synchronization -> Team aggregate -> Agent conversation presentation`

Recovery is a sibling application path:

`run-tree selection -> checkpointed hydration -> candidate stream handshake -> registry commit -> Team aggregate presentation`

Neither path bypasses RootTeamRun, TeamStreamingService, or the service registry.

## Change / Refactor Sequence

1. Add exact status-specific projector and tests; update snapshot/live consumers; remove combined mapper.
2. Expose `RootTeamRun.getExecutionCheckpoint()` and the exact GraphQL checkpoint query; add root/query tests.
3. Rename the view loss latch/query/effect and make only the first gap emit it.
4. Replace TeamStreamingService booleans with the phase machine; execute recovery effects before rejected-result return; remove blind reconnect.
5. Add expected-base candidate connection semantics and readiness result; a mismatch cancels without registry side effects.
6. Preserve the server's one projection-or-empty bundle, Team-member identity mapping, non-null GraphQL field, and generated payload type; add no recovery variant. Extract one frontend non-null Team-member projection query and private current Team-context builder. Normal hydration retains its existing catch-to-null wrapper; recovery calls the exact query directly, accepts the non-null empty payload, and aborts on GraphQL/transport/identity failure. Add before/after checkpoint comparison around the recovery builder.
7. Add `agentTeamRunStore` failed-state query, persistent notice projection, and candidate replacement commit. Keep old failed entries until candidate readiness.
8. Add `reopenTeamRunAfterStreamLoss()` and route a known-failed local selection to it from `runHistorySelectionActions`; healthy selection remains local focus.
9. Render exact persistent wait/reselect guidance in TeamWorkspaceView and localize EN/ZH. A premature attempt returns the stable wait error and commits nothing.
10. Cover normal streaming, active-work refusal, stable recovery success, checkpoint change, snapshot-base mismatch, background sync, candidate cleanup, focus preservation, and no partial registry commit.
11. Preserve/prove the exact projection spine: Agent projection empty bundle -> Team-member identity mapping -> non-null GraphQL/generated payload -> recovery hydration. Prove exact empty-object acceptance and GraphQL/transport/identity failure cancellation; add no nullable/union result.
12. Run typechecks/builds/focused and broader tests. Then API/E2E re-evaluates coverage and repeats the approved isolated real Classroom/Codex/browser path.
13. Scan current source for removed mapper/effect/boolean/reconnect names and compatibility aliases plus any nullable/union recovery projection type.

## Key Tradeoffs

- One small status projector file is preferable to caller-side omission because misuse becomes structurally difficult.
- One read-only checkpoint query and candidate handshake are more work than a simple “reopen” toast, but they close the exact active-turn race without replay or a persisted authority.
- Recovery remains explicit rather than automatic. The user-visible wait/reselect action is truthful and bounded.
- Healthy local selection reuse remains unchanged; only a service-proven failed root takes the recovery branch.
- Strict schemas and generic WebSocket transport remain unchanged.

## Risks

1. **Premature recovery:** Team work is still open. Mitigation: pre-hydration checkpoint rejects with a stable wait instruction and commits nothing.
2. **Activity during hydration:** root sequence changes or work reopens. Mitigation: after-checkpoint mismatch cancels candidate construction.
3. **Projection result drift:** a future caller could reintroduce nullable or recovery-only result semantics. Mitigation: keep the current non-null GraphQL/generated type and prove the exact empty object shape end to end.
4. **Activity between hydration and handshake:** snapshot base differs from expected N. Mitigation: candidate fails before registry/context commit.
5. **Event after matching snapshot barrier:** existing publisher queues it and delivers N+1 after snapshot. Mitigation: keep the existing snapshot-connection barrier unchanged.
6. **Background resurrection:** active-run reconciliation calls ordinary connect. Mitigation: ordinary connect cannot reset `reopen_required`; only explicit candidate replacement can commit.
7. **Persistent banner as duplicate authority:** store contains a notice as a UI projection. Mitigation: routing and lifecycle always query the service phase; the notice never enables recovery.
8. **Ordinary transport outage without observed gap:** remains existing behavior and outside this detected-gap change. Any observed gap still fails closed.
9. **Provider misclassification:** Codex is the witness, not the owner. Mitigation: provider code is unchanged and another Team runtime is rechecked proportionately.

## Guidance For Implementation

- Preserve strict shared schemas; correct producers.
- Keep status details private and export only complete variants.
- `RootTeamRun.getExecutionCheckpoint()` must read root ID, publisher sequence, and `hasOpenExecutionWork()` synchronously as one immutable value. It is not persisted and is not a replay cursor.
- Recovery checkpoint comparison must require exact root ID, exact sequence equality, and `hasOpenExecutionWork === false` both before and after hydration.
- Do not change `AgentRunViewProjectionService`, `TeamMemberRunViewProjectionService`, the non-null `getTeamMemberRunProjection` field, normal `hydrateLiveTeamRunContext()`, or healthy `openTeamRun()` semantics. Share one non-null frontend query and private context builder with the recovery wrapper. Normal hydration may catch/log a query failure and use its current nullable local state; recovery propagates GraphQL/transport/identity failure. Recovery never accepts or expects a null payload.
- Candidate context/service must remain unpublished. On hydration/checkpoint/connect/snapshot failure, disconnect candidate and leave the old failed service/context/selection untouched.
- The replacement snapshot must have `base_change_sequence === expectedBaseChangeSequence`; greater or smaller is failure, not a merge opportunity.
- After the matching snapshot is applied, the store performs one synchronous registry/context commit and disposes the old failed service. Preserve focused AgentRun/member address.
- Recovery copy: “Live Team updates are out of sync. Wait for the Team to finish its current work, then select this Team member again to reload the complete conversation.” A premature action says the Team is still working and asks the user to try again.
- Required focused seams:
  - exact snapshot/live status keys and strict admission;
  - live status N followed by a valid event N+1 through the handler;
  - first gap emits one effect; later gaps emit none;
  - service processes the rejected recovery effect and cannot be revived by ordinary connect;
  - actual run-tree selection chooses recovery only for a failed service;
  - open-work checkpoint refuses recovery with no mutations;
  - the server/resolver/generated-client seam returns the exact non-null empty projection object and never a successful null;
  - recovery accepts that exact empty object but aborts on GraphQL/transport/identity failure without mutations;
  - stable N -> hydrate -> stable N -> snapshot N commits candidate once;
  - changed checkpoint or snapshot base cancels candidate and preserves old entries;
  - real Codex response is visible live and identical after supported recovery/reopen.
- Live validation must use disposable server-data/database, non-protected ports, non-secret env import output, and verified cleanup.
