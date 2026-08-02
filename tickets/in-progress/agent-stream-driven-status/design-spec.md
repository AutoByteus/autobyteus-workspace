# Design Spec

## Current-State Read

The production path already has the facts and transport needed for a stable solution, but lifecycle truth is represented twice. Runtime adapters and the shared lifecycle transformer emit `AGENT_STATUS`; `AgentRun` retains the latest status; standalone and team WebSockets deliver status and activity; the frontend stores `currentStatus`. In parallel, the wire payload and frontend state carry `can_interrupt` / `canInterrupt`, and the composer uses that second value rather than `currentStatus` to choose Stop versus Send.

That split directly permits the reported state: the selected member header reads `currentStatus=running` while the composer reads `canInterrupt=false`. The split is fed by several current producers: runtime-specific status projectors normally set `running/can_interrupt=true` after active-turn identity is visible, the runtime-neutral lifecycle fallback hard-codes every derived status to `canInterrupt:false`, command reconciliation can reconstruct `running` from a non-interruptible startup snapshot, and hydration/recovery code can independently clear the frontend permission.

The existing event pipeline is the correct runtime-neutral mechanism for current-turn lifecycle control, but it is not currently behind one owner. `AgentTurnLifecycleState` already tracks identified/anonymous active turns and retired turn IDs, and prior production evidence proves that this protection is required because late events from a completed turn can arrive minutes later. Runtime backends call the pipeline directly, while `AgentRun.emitLocalEvent` bypasses it and fans out to local listeners. Accepted direct inter-agent delivery, artifact publication, skill-improvement notification, task-delegation notification, and `AgentRun`'s own command/termination status facts therefore do not share one serialized finalizer path. The current transformer also runs before event processors and cannot attach authoritative status to processor-derived `FILE_CHANGE` and `TEAM_COMMUNICATION_MESSAGE` events.

The current snapshot boundary has a second ownership defect. `AgentRun.getStatusSnapshot()` returns `statusOverride ?? backend.getStatusSnapshot()`. Command start stores `initializing`; Claude and Codex can establish `RUNNING` plus active-turn identity before their asynchronous event pipelines have updated that override; the command coordinator may broadcast a replacement status without updating `AgentRun`. A listener can therefore bind and still receive stale `initializing` for an already-current, interruptible turn.

The stream handlers and team member bridge are healthy transport/routing boundaries and must be preserved. Standalone interrupt routes by run ID; team interrupt routes by exact member route key plus the optional exact member run ID stale-target guard. Team member event wrapping adds the member/run/path identity required by the frontend. The aggregate team status helper is also already centralized and must remain a read-only projection from member statuses.

On the frontend, `AgentUserInputTextArea.vue` contains a second local defect: its HTML button is disabled through `isActionDisabled`, but Enter calls `handlePrimaryAction()` without enforcing that guard. The matched production trace contains a second user turn thirteen seconds after the first while the first continued, making this a reachable production defect rather than a synthetic edge case.

The target must respect these constraints:

- stream silence cannot mean idle; LLM waits and long tools may be silent;
- only current-turn activity may establish/reinforce running;
- terminal matching boundaries, not timers, settle idle;
- late content must continue to render;
- status snapshots and live events must converge for standalone and team execution;
- all supported AutoByteus, Codex, and Claude runtimes must expose the same public contract;
- existing exact interrupt identity/routing must not be weakened.

Detailed evidence and exact current paths are authoritative in [`investigation-notes.md`](./investigation-notes.md), with matched production evidence in [`production-trace-evidence.md`](./production-trace-evidence.md).

## Intended Change

Replace the public two-field lifecycle/action contract with one derived status projection:

```text
no live runtime                         -> offline
terminal turn/runtime failure           -> error
command accepted, no current turn yet   -> initializing
current open turn                       -> running
live runtime, no current open turn      -> idle
```

`running` is the sole public busy/interruptible state. Remove `can_interrupt` from the backend/WebSocket DTO and command acknowledgements, remove `canInterrupt` from frontend state, and derive the red Stop action from `currentStatus === running`.

Make `AgentRun` the single serialized outward-event and status owner. Runtime backends expose neutral source-event batches and an internal lifecycle snapshot; they no longer process or dispatch to public subscribers. `AgentRun` subscribes once to each backend source, and both runtime batches and awaited local `publishEvent` calls enter the same per-run queue, processors, and lifecycle finalizer before listener delivery. The finalizer consumes the run-owned current/retired turn state and a fresh runtime lifecycle snapshot evaluated inside the queue. It emits the canonical status with every final non-status `AgentRunEvent`. Current-turn activity is preceded by `running`; a matching terminal boundary is followed by `idle`; terminal failure is followed by `error`; local idle notifications are paired with idle without opening a turn; and late retired-turn activity is accompanied by the actual current status without reopening its old turn.

Remove `statusOverride`. The same `AgentTurnLifecycleState` instance used by finalization reconciles command facts and fresh backend lifecycle snapshots. `AgentRun.getStatusSnapshot()` refreshes that state from the backend and returns the canonical public payload. Fresh current-turn evidence promotes stale startup to `running`; racy `idle`/`initializing` cannot close an identified turn; only its matching terminal/error or explicit runtime offline evidence can. Direct status broadcasting remains only for a pre-runtime command overlay when no `AgentRun` exists. After run creation, every status application and publication flows through `AgentRun`.

Narrow frontend `isSending` into a local submission-in-flight concern named `submissionPending`; it is not agent lifecycle. Add one primary-action policy/guard shared by button, Enter, and store-level action admission. Keep team aggregation and exact interrupt routing unchanged.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-002, REQ-008, REQ-009; AC-001, AC-002, AC-009 | Selected standalone run or exact focused team member is working and the user invokes the primary action | Investigation BEH-001; screenshot; live snapshot probe | `running` alone produces the red Stop action; exact existing interrupt routing is preserved; no `running + send` representation remains | DS-001, DS-002, DS-005 |
| BEH-002 | System / Contract | REQ-003, REQ-004, REQ-005, REQ-010; AC-003, AC-004, AC-010, AC-011 | A supported runtime, local run service, or event processor produces an outward `AgentRunEvent` | Investigation BEH-002 and ORIGIN-001–ORIGIN-007; pipeline, local producers, mapper, stream handlers | Every runtime, local, and processor-derived final non-status event crosses the same `AgentRun` gateway and is paired with canonical status; current-turn activity self-heals running and terminal activity settles immediately | DS-003, DS-004, DS-006, DS-009 |
| BEH-003 | System | REQ-005, REQ-006, REQ-007, REQ-011; AC-004–AC-007, AC-012 | Current turn completes/interruption settles, terminal error occurs, runtime terminates, or client reconnects | Investigation BEH-003; runtime projectors; command overlay; snapshot paths | Matching turn terminal -> idle, terminal failure -> error, runtime termination -> offline; reconnect uses the same latest projection | DS-003, DS-004, DS-007 |
| BEH-004 | System | REQ-004, REQ-012; AC-008, AC-011 | Late activity/terminal event for retired turn A arrives after A or during B | Investigation BEH-004; prior `agent-idle-status-lifecycle` production evidence | Late content renders, but retired/current turn identity makes lifecycle monotonic and idempotent; A cannot reopen or disturb B | DS-006 |
| BEH-005 | User | REQ-008, REQ-009; AC-013, AC-014 | User clicks primary action or presses Enter/Shift+Enter while idle, initializing, or running | Investigation BEH-005; composer source; matched overlapping input | Click and Enter execute the same resolved action and guard; initializing blocks; running interrupts; idle/offline/error may send only when locally admissible; Shift+Enter remains newline | DS-005 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/production-trace-evidence.md` | Matched production trace and read-only live WebSocket evidence | REQ-001–REQ-012; AC-001–AC-015 | Grounds the divergent UI state, active-turn evidence, overlapping input risk, and late-event qualification | Complete; evidence-only, approval N/A |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_6557dd2b51c3__image.png` | User-supplied screenshot | REQ-001, REQ-008; AC-001, AC-009 | Visual proof of `Running` with a Send control | Accepted evidence; approval N/A |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`, `Behavior Change`, and bounded `Refactor`
- Current design issue found: `Yes`
- Root cause classification: `Missing Invariant`; `Boundary Or Ownership Issue`; `Duplicated Policy Or Coordination`; local `Local Implementation Defect` for keyboard guarding; `Shared Structure Looseness` for the redundant status/permission DTO
- Refactor needed now: `Yes`
- Evidence:
  - Header and primary action read different stored authorities.
  - A runtime-neutral derived `running` status currently hard-codes `canInterrupt=false`.
  - Runtime projectors, command reconciliation, snapshots, history/hydration, and frontend cleanup each participate in status/action policy.
  - Runtime backends and supported local producers reach subscribers through different dispatch paths; local and processor-derived events are not uniformly finalized.
  - `statusOverride` can shadow fresh current-turn evidence, and the command coordinator can publish an active-run replacement without applying it to `AgentRun`.
  - The event pipeline has the needed lifecycle state but does not operate behind the authoritative public run boundary as the final outward projection stage.
  - Enter bypasses the button's disabled condition in a production-reachable path.
- Design response: Make `AgentRun` own one source/local publication gateway, one per-run lifecycle state, and one refresh/read path; move all final processing/finalization behind it; reduce the public status DTO to one lifecycle field plus identity; and make frontend action mode a pure projection from that status plus local request constraints.
- Refactor rationale: Repairing only the button or forcing `can_interrupt=true` would preserve two authorities and another contradictory combination would remain reachable. The clean contraction is necessary for the approved `running => Stop` invariant.
- Intentional deferrals and residual risk: Provider-internal detailed phase models remain internal. The change does not redesign provider loops or team/task orchestration. Status repetition increases WebSocket message volume by approximately one compact status message per final agent event; the user explicitly accepts this correctness-first tradeoff, and existing semantic event batching remains available.

## Terminology

- **Lifecycle fact:** Runtime existence/startup, active current-turn identity, terminal failure, or termination evidence used to derive status.
- **Current turn:** The single open turn known by an identified `turn_id` or, temporarily, by an anonymous runtime/command start fact.
- **Retired turn:** A turn whose terminal boundary or terminal error has been observed; later events for it remain renderable but cannot change lifecycle.
- **Status companion:** An idempotent canonical `AGENT_STATUS` emitted adjacent to one final non-status `AgentRunEvent`.
- **Submission pending:** A frontend-local request lock between staging a local message and receiving authoritative command/status progress; not agent lifecycle.

## Design Reading Order

Follow the template order. The central design decision is expressed first in the runtime/local return spines and the run-owned bounded state-machine spine; file edits are a projection of the single-`AgentRun` gateway and snapshot-precedence decisions.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the `can_interrupt` field and `canInterrupt` builder input from `AgentStatusPayload` and every server/client contract, producer, normalizer, fixture, and assertion.
- Remove `AgentRunState.canInterrupt`, `activeContextStore.canInterrupt`, and direct/hydration writes that grant or clear it.
- Remove runtime lifecycle-boundary status duplication from Codex/Claude converters where the final lifecycle stage now emits the canonical companion.
- Remove `AgentRun.emitLocalEvent`, `localEventListeners`, `statusOverride`, per-subscriber backend subscriptions, and all runtime-backend calls to `dispatchProcessedAgentRunEvents`; do not retain a compatibility event path.
- Remove command-coordinator and active mixed-member direct status replacement through broadcasters once an `AgentRun` exists. Retain only the explicitly pre-runtime overlay path.
- Replace the misleading broad `AgentContext.isSending` lifecycle usage with narrowly owned `submissionPending`; remove remote/member-input writes that used it as busy state.
- Do not accept both old and new status shapes, add optional compatibility aliases, or derive fallback interrupt permission from legacy fields.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Existing run/team metadata JSON, transcript/activity projections, raw JSONL traces, and history rows under the configured server memory directory. Volume is user-history dependent. The removed frontend permission is in-memory only; current history rows persist canonical status but not frontend `canInterrupt`.
- Relevant code-model, serialization, semantic, or physical-store change: Live `AGENT_STATUS` and command-ack nested status contract removes `can_interrupt`; frontend in-memory `AgentRunState` removes `canInterrupt`; `isSending` is renamed/narrowed as local UI state. No stored transcript, metadata, trace, or identity schema is required to change.
- Normal reader/writer behavior and representative evidence: History services read active status from `AgentRunStatusProjectionService` and inactive status from metadata; live status is rebuilt from active runtime state. Representative metadata/traces contain run/member identity and content, not a persisted frontend interrupt permission. JSON trace/history readers tolerate unrelated payload history without teaching current runtime code an old schema.
- Required semantics and invariants under direct use: All existing identities, transcripts, traces, late activity, termination metadata, and history status meaning remain usable. Active status is recalculated after process restart.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Preserve all user content and exact member/run identity. No bulk rewrite, deletion, or downtime is justified.
- Decision: `Directly Usable — No Migration`
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: There is no correctness benefit from rewriting stored content because the changed fields are live DTO/in-memory fields. A rewrite would add I/O and corruption exposure without changing runtime semantics.
- Acceptance criteria or design constraints supported by this decision: REQ-011, REQ-012; AC-008, AC-011, AC-012.

### Migration Plan

N/A — decision is `Directly Usable — No Migration`.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003 | Standalone composer Send | Runtime command accepted/started | `AgentRunCommandCoordinator` with `AgentRun` public boundary | Establishes initializing and exact run command association before runtime output |
| DS-002 | Primary End-to-End | BEH-001, BEH-003 | Team composer Send | Exact member runtime command accepted/started | `TeamRun` / mixed member handle with nested `AgentRun` boundary | Preserves exact member identity and team command overlay before the member runtime exists |
| DS-003 | Return-Event | BEH-002, BEH-003 | Runtime source event batch | Standalone frontend status and rendered activity | `AgentRun` event/status gateway | Carries provider-neutral facts through the same run-owned finalizer and public snapshot used by subscribers |
| DS-004 | Return-Event | BEH-001–BEH-004 | Member runtime or local run event/fact | Team frontend member status/activity and team aggregate | Member `AgentRun`, team member bridge, aggregate helper | Preserves member identity after canonical finalization and prevents team aggregate from becoming member authority |
| DS-005 | Primary End-to-End | BEH-001, BEH-005 | Composer click/Enter | Send, exact interrupt, or guarded no-op | Frontend primary-action policy plus active-context command facade | Makes visual mode and executed action identical |
| DS-006 | Bounded Local | BEH-002–BEH-004 | Runtime/local event batch enters the run gateway | Ordered canonical status/original event sequence plus updated snapshot | `AgentRun` with owned `AgentTurnLifecycleState` and `LifecycleStatusEventTransformer` | Owns source serialization, snapshot reconciliation, current/retired turn monotonicity, companion ordering, and status application before listener delivery |
| DS-007 | Return-Event | BEH-003 | Connect/reconnect or active status read | Immediate canonical standalone/member/team snapshots | `AgentRun` refresh/read boundary plus stream handler | Promotes stale startup from fresh current-turn evidence and prevents sparse/racy initialization from surviving until later traffic |
| DS-008 | Bounded Local | BEH-003 | Member status snapshots/events | Aggregate `TEAM_STATUS` | `deriveTeamApiStatus` | Keeps deterministic team display read-only and separate from member actions |
| DS-009 | Return-Event | BEH-002 | Accepted direct message, artifact publication, skill notification, or task-delegation notification | Standalone/team subscriber receives paired canonical status and local event | `AgentRun.publishEvent` gateway | Eliminates supported local listener bypasses without caller-specific status decoration |

## Primary Execution Spine(s)

- **DS-001 standalone send:** `Composer -> activeContextStore -> agentRunStore -> Agent WebSocket SEND_MESSAGE -> AgentStreamHandler -> AgentRunCommandCoordinator -> AgentRun -> runtime backend/session`
- **DS-002 team-member send:** `Composer -> activeContextStore -> agentTeamRunStore -> Team WebSocket SEND_MESSAGE + ConversationTargetAddress -> AgentTeamStreamHandler -> TeamRun -> MixedTeamManager/member handle -> AgentRun -> runtime backend/session`
- **DS-005 primary action/interrupt:** `Click or Enter -> primary-action resolver/guard -> activeContextStore -> standalone run interrupt or exact team-member interrupt -> WebSocket command -> AgentRun/TeamRun interrupt boundary -> runtime`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The client stages one local submission and sends a correlated command. A pre-runtime overlay may expose initializing before activation; once the run exists, `AgentRun` applies command start and any accepted returned turn ID while the coordinator records association/dedupe only. Accepted current-turn evidence replaces initializing with running through the run. | local submission, command record, agent run, runtime turn | Command coordinator for identity; `AgentRun` for active lifecycle | dedupe registry, pre-runtime overlay, attachment handling |
| DS-002 | A team message retains its explicit conversation/member address through the team boundary. A member command overlay publishes initializing before lazy member activation; the nested `AgentRun` then owns member runtime status. | team run, member execution, agent run, runtime turn | `TeamRun`/member handle then nested `AgentRun` | route validation, lazy activation, member identity envelope |
| DS-003 | A runtime adapter converts provider facts to a neutral source batch and invokes its sole `AgentRun` source listener. The run gateway serializes it with local publications, refreshes internal runtime lifecycle evidence inside the queue, runs processors and the lifecycle finalizer, applies canonical status, then fans out. | runtime event, agent run gateway, lifecycle projection, frontend agent context | `AgentRun` | provider adaptation, event processing, listener dispatch |
| DS-004 | The nested `AgentRun` first finalizes runtime and local events through the same gateway. Its resulting sequence is then wrapped with exact member identity, published to the team stream, and aggregated independently. | member agent run, team event, member context, team aggregate | nested `AgentRun` and team bridge | task/subteam identity flattening, aggregate notification |
| DS-005 | One pure decision resolves disabled/send/interrupt from selected status and local constraints. Button rendering and both click/keyboard execution use that same result. Store boundaries recheck lifecycle before issuing send/interrupt. | selected agent context, primary action, command | frontend primary-action policy | draft/upload state, local submission pending, Shift+Enter |
| DS-006 | One run-owned state instance reconciles command facts, fresh runtime snapshots, explicit runtime status facts, lifecycle boundaries, errors, and current/retired turn IDs. The queue cannot promote arbitrary old activity. The finalizer emits status before nonterminal activity and after terminal boundaries/errors, and the run applies that same canonical state before listeners. | active turn, startup fact, retired turns, runtime snapshot, canonical status | `AgentRun` + `AgentTurnLifecycleState` | error evidence classification, event eligibility, shared processors |
| DS-007 | A live listener is bound before `AgentRun.getStatusSnapshot()` refreshes the same lifecycle state from the backend's current internal snapshot. An identified current turn wins over stale initializing/idle, and the resulting status is sent immediately; repeated companions provide a second repair mechanism. | connection, run lifecycle state, runtime snapshot, public snapshot | `AgentRun` then stream handler | missing-run validation, connection/session registry |
| DS-008 | Member statuses are folded with one existing precedence: running, initializing, error, idle, offline. The result is display-only and never grants or removes a member action. | member statuses, team status | `deriveTeamApiStatus` | status-change suppression |
| DS-009 | Each supported local producer awaits `run.publishEvent`. The event joins the same queue as provider batches, receives processor-derived events and a fresh canonical companion, and reaches listeners only after the run state is applied. Idle notifications remain idle; accepted-message notifications use the accepted command's current-turn fact. | local producer, agent run gateway, canonical event sequence | `AgentRun` | grant/audit records, artifact persistence, skill notification result |

## Spine Actors / Main-Line Nodes

- Frontend composer and primary-action policy
- Active-context command facade
- Standalone/team streaming command boundary
- `AgentRunCommandCoordinator` or exact team member handle
- `AgentRun` public runtime boundary
- Runtime backend/session adapter
- Runtime-neutral event pipeline and lifecycle finalizer
- Supported local run-event producers
- Standalone/team WebSocket stream
- Frontend member/run status projection

## Ownership Map

- **Composer:** renders and invokes the already-resolved primary action; owns textarea/interaction presentation, not lifecycle.
- **Primary-action policy:** owns the deterministic `disabled | send | interrupt` decision from current status plus local submission/upload/draft facts.
- **`activeContextStore`:** remains a thin selection-aware command facade; validates status/action subject and delegates to exact standalone/team stores.
- **Command coordinators/overlays:** own command identity, dedupe, and initializing/error projection only while no `AgentRun` exists. Once a run exists, command start/accept/reject/error facts and every status publication flow through that run; the coordinator does not directly broadcast active-run replacements.
- **`AgentRun`:** is the authoritative public per-run boundary for commands, termination, subscription, current canonical status, and every outward `AgentRunEvent`. It owns the single backend source subscription, listener set, per-run dispatch queue, and lifecycle state; it applies canonical status before listener delivery.
- **Runtime backends/projectors:** adapt provider events to neutral source batches and provider state to an internal runtime lifecycle snapshot. They do not process/finalize public events, retain public subscribers, or own frontend action semantics.
- **Lifecycle finalizer:** is the run-owned internal mechanism for event-driven active/retired turn transitions and status-companion sequencing; it uses the same state instance as command facts and snapshot reads.
- **Stream handlers/mappers:** own subscription timing and transport serialization only.
- **Team member bridge:** owns exact member identity wrapping and aggregate-change notification, not member lifecycle policy.
- **Frontend status state:** stores only latest canonical status and applies hydration/live precedence; it does not infer lifecycle from content.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `activeContextStore` | selected standalone/team run stores and primary-action policy | Selection-aware UI command boundary | lifecycle derivation or generic fallback targeting |
| `AgentStreamHandler` | `AgentRun` + command coordinator | WebSocket session boundary | provider status interpretation |
| `AgentTeamStreamHandler` | `TeamRun` + exact nested member `AgentRun` | Team WebSocket boundary | member lifecycle or aggregate-to-member fanout |
| `AgentRunBackend` implementations | Provider session/thread/agent plus runtime lifecycle projector | Uniform command adapter and neutral source-event/lifecycle-snapshot boundary | public subscribers, event finalization, or public interrupt-action policy |
| `AgentRunStatusProjectionService` | active `AgentRun`, command overlay, or metadata fallback | Read-model selection for history/connect/ack | a second active-turn state machine |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `AgentStatusPayload.can_interrupt` and `buildAgentStatusPayload.canInterrupt` | Redundant with approved `running` invariant and can contradict it | `AgentStatusPayload.status` | In This Change | Remove from server, web protocol, command ack nested status, tests, docs |
| Frontend `AgentRunState.canInterrupt` and `activeContextStore.canInterrupt` | Duplicate UI authority | `currentStatus === AgentStatus.Running` via primary-action policy | In This Change | No computed compatibility alias |
| Direct can-interrupt hydration/recovery/cleanup writes | They preserve a second lifecycle graph | Simplified `agentRuntimeStatusState.ts` status-only APIs | In This Change | Preserve subscribed-live status precedence |
| Codex/Claude status event appended solely to turn start/completion/interruption | Lifecycle finalizer now emits the adjacent canonical status | `LifecycleStatusEventTransformer` finalizer | In This Change | Retain explicit provider status-change facts needed for startup/error/offline |
| Terminal error converter-appended status duplicates | Finalizer classifies terminal error and emits error companion | error evidence + lifecycle finalizer | In This Change | Recoverable error remains running/activity |
| Broad `AgentContext.isSending` semantics | Misnamed and used as remote lifecycle proxy | `submissionPending` local request lock + canonical status | In This Change | Remove external/member input writes that mark lifecycle locally |
| Active placeholder `running/canInterrupt=false` | Invalid under `running => current open turn` | neutral `initializing` placeholder until snapshot | In This Change | History must not overwrite subscribed live status |
| Status-only normalization branches that read `can_interrupt` | Field removed | status-only normalization | In This Change | Clean contract cut |
| `AgentRun.emitLocalEvent`, `localEventListeners`, and backend-wrapping subscription per public listener | They create a second outward path that bypasses processors/finalization | `AgentRun.publishEvent`, one backend source subscription, and one run listener set | In This Change | All four production local non-status call sites become awaited; no sync compatibility wrapper |
| Runtime-backend `dispatchProcessedAgentRunEvents` imports/calls and public backend event subscribers | Final processing/subscriber delivery belongs behind `AgentRun` | neutral `subscribeToSourceEventBatches` backend contract; run-owned dispatch queue | In This Change | Update direct backend/pipeline tests to enter via `AgentRun` |
| Module-level/default dispatch queue fallback | It permits processing outside the owning run and obscures queue lifetime | one `AgentRunEventDispatchQueue` instance constructed/held by each `AgentRun` | In This Change | Dispatcher requires the run-owned queue; tests construct a run or inject explicitly through a run fixture |
| `AgentRun.statusOverride` and `statusOverride ?? backend.getStatusSnapshot()` | Retained startup can shadow fresh current-turn evidence | run-owned `AgentTurnLifecycleState` reconciled by command/event/runtime facts | In This Change | Public snapshot is rebuilt from reconciled state |
| Active-run command-coordinator/member direct status replacement | Broadcast can disagree with `AgentRun` read state | `AgentRun` lifecycle fact/publication methods | In This Change | Pre-runtime overlay remains only when no run exists |

## Return Or Event Spine(s) (If Applicable)

- **DS-003:** `Provider/native event -> runtime converter -> backend neutral source batch -> AgentRun single source callback -> run-owned serialized queue -> fresh internal runtime snapshot -> processors -> lifecycle finalizer -> apply canonical run state -> run listeners -> AgentRunEventMessageMapper -> Agent WebSocket -> frontend status handler/renderers`
- **DS-004:** `Nested AgentRun runtime/local source -> nested run gateway/finalizer -> MixedAgentMemberHandle identity envelope -> TeamRun event -> team WebSocket mapper -> frontend member resolver -> member status/activity handler -> focused composer + team aggregate display`
- **DS-007:** `Connect -> resolve live AgentRun/member -> bind run listener -> AgentRun refreshes lifecycle state from current backend evidence -> return/send canonical snapshot(s) -> continue finalized live companions`
- **DS-009:** `Supported local producer -> await AgentRun.publishEvent -> same serialized queue/processors/finalizer/status application -> standalone or nested-team listener -> frontend`

## Bounded Local / Internal Spines (If Applicable)

- **DS-006, parent owner `AgentRun` event lifecycle:** `enqueue runtime/local batch -> evaluate backend lifecycle snapshot inside queue -> reconcile command/runtime/event facts in run-owned state -> run processors -> finalize each outward non-status event -> apply canonical status -> emit status-before-activity or terminal-before-status`.
- **DS-008, parent owner `TeamRun`:** `member snapshot/status change -> deriveTeamApiStatus -> suppress unchanged aggregate -> publish TEAM_STATUS`.
- **Frontend local action loop, parent owner composer/active-context facade:** `resolve action -> guard -> execute exact send/interrupt or no-op -> await authoritative status progress`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Runtime-specific lifecycle projectors | DS-003, DS-004, DS-007 | `AgentRunBackend` adapter | Translate provider availability/phase and identified-or-anonymous current-turn evidence into one internal snapshot | Providers expose different internal shapes | Provider policy leaks into shared lifecycle/UI |
| Error evidence resolver | DS-006 | lifecycle finalizer | Distinguish diagnostic/recoverable, turn-terminal, and runtime-global error | `ERROR` alone is not terminal proof | Every error would incorrectly remove Stop |
| Turn ID resolver | DS-006 | lifecycle state | Normalize `turn_id` / `turnId` | Cross-runtime payload spelling differs | Late-event protection becomes inconsistent |
| Command registry/pre-runtime overlay | DS-001, DS-002 | command coordinator/member handle | Dedupe and represent startup only before `AgentRun` exists | Lazy create/restore is asynchronous | Command bookkeeping becomes a competing active-run lifecycle owner |
| Local event producers | DS-009 | `AgentRun` | Persist/audit their own work, then await publication of one neutral run event | These supported system actions originate outside provider runtimes | Each caller decorates or directly broadcasts status differently |
| Message mapper | DS-003, DS-004 | stream boundary | Serialize canonical events | Wire naming/JSON boundary | Transport silently invents status |
| Member identity wrapping | DS-004 | team bridge | Add run/name/route/path/task identity | Same event DTO is reused within team | Interrupt/status reaches wrong member |
| History/hydration merge | DS-007 | frontend status projection | Apply backend snapshot without overwriting newer subscribed live state | First load and refresh are separate read paths | Stale history revokes current status |
| Submission pending | DS-005 | local submission service | Prevent duplicate local request before authoritative progress | There is a small client/server acknowledgement interval | It becomes a second busy lifecycle |

## Ownership Boundaries

`AgentRun` remains the authoritative server boundary for one run and gains the event/status authority that its public role already implies. Callers above it use `postUserMessage`, `interrupt`, `terminate`, `subscribeToEvents`, `getStatusSnapshot`, and awaited `publishEvent` for supported local outward events. They must not inspect Codex thread, Claude session, or native agent turn fields, attach to backend event listeners, call the processing dispatcher, or broadcast active-run status directly.

Inside that boundary, provider backends own control adaptation, neutral source-event conversion, and internal lifecycle snapshot projection. `AgentRun` subscribes to the backend source exactly once and owns the serialized queue. The runtime-neutral pipeline/finalizer and its `AgentTurnLifecycleState` instance are internal run mechanisms; stream handlers and history services consume the `AgentRun` event/snapshot APIs rather than querying the state machine or provider internals.

The command overlay is authoritative only before an `AgentRun` exists to represent startup. After run creation, `AgentRun.postUserMessage` applies command-start, accepted-turn, rollback/error, and termination facts through the same lifecycle state and publication gateway. The overlay is cleared when the run takes ownership and must never override an established running turn with initializing.

On the frontend, `agentRuntimeStatusState.ts` is the controlled mutation boundary for `currentStatus`. `activeContextStore` is the action/selection facade. Content handlers may render activity but must not mutate status. Team aggregate status never writes member status.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentRun` | backend source subscription, listener set, dispatch queue, lifecycle state/finalizer, canonical snapshot | stream handlers, team member handles, history projection, command coordinator, supported local event producers | caller reads provider state, subscribes to backend, calls dispatcher, uses `emitLocalEvent`, or broadcasts active-run status | Extend `AgentRun` status fact, snapshot, or awaited publication API |
| runtime event pipeline | transformers/processors/finalizer invoked only by the run gateway | `AgentRun` | runtime backend or local caller dispatches/finalizes independently | Add neutral event/fact handling to the run-owned pipeline composition |
| `AgentRunStatusProjectionService` | overlay/active/history source selection | connect, ack, history/resume | callers combine metadata and active runtime independently | Add an explicit projection field/method |
| `TeamRun` / exact member selector | team backend and member registry | team stream commands | fallback to aggregate/team-wide interrupt | Strengthen explicit compound target boundary |
| frontend status mutation API | `AgentRunState.currentStatus`, live/history precedence, pending-clear rules | status handler, hydration/recovery/open/cleanup | direct status/can-interrupt writes across stores | Add a status-only named operation |
| frontend primary-action policy | action mode and enabled reason | composer and active-context facade | button and Enter implement separate branching | Extend one policy input/result |

## Dependency Rules

Allowed:

- provider lifecycle projectors depend on the internal runtime-lifecycle snapshot type and their own provider state; only `AgentRun` builds the public status payload;
- runtime converters emit neutral lifecycle/activity/error/status-fact batches to the backend source boundary;
- each backend exposes one neutral source-batch subscription and one fresh internal lifecycle-snapshot read to its owning `AgentRun`;
- runtime and local sources enter `AgentRun`'s single queued publication method; only that method invokes processors/finalization and listener fanout;
- the lifecycle finalizer depends on the run-owned lifecycle state plus turn-ID and error-evidence domain functions;
- `AgentRun` reconciles command/runtime/event facts, applies canonical status, and exposes public events/snapshots;
- supported local producers await `AgentRun.publishEvent` and own no companion/status logic;
- team bridges wrap finalized events with exact member identity;
- frontend status handler delegates to the status mutation boundary;
- the composer and store facade depend on the primary-action policy and canonical status.

Forbidden:

- no server or frontend `can_interrupt`/`canInterrupt` field, alias, fallback, or derived compatibility getter;
- no UI content/delta handler directly sets status; only explicit streamed status applies it;
- no arbitrary event with an unknown/retired turn may open running from idle;
- no timer or stream-silence heuristic may set idle;
- no provider converter may append a second lifecycle-boundary status when the finalizer owns it;
- no backend may invoke `dispatchProcessedAgentRunEvents`, expose public final events, or retain public run subscribers;
- no caller may use `emitLocalEvent`, fan out to run listeners, or invoke processors/finalizers outside `AgentRun`;
- no status may be broadcast after `AgentRun` exists unless the status fact is first reconciled and emitted by that run; direct broadcaster use is pre-runtime-overlay-only;
- no retained startup state may override fresh current-turn evidence, and no idle/initializing snapshot may close an identified active turn;
- no history/active placeholder may use `running` without authoritative current-turn evidence;
- no team aggregate may be fanned out to members or used to authorize interrupt;
- no keyboard path may bypass the same action result/guard used by click;
- no active-context interrupt may omit exact team member route/run validation.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentStatusPayload` | one agent/member execution lifecycle | Carry canonical status plus optional routing identity | agent run ID; team envelope supplies route/path/task identity | Remove `can_interrupt`; no turn ID needed by frontend action |
| `AgentRuntimeLifecycleSnapshot` | one backend's internal runtime evidence | Carry availability, normalized phase, and `NONE / IDENTIFIED(turnId) / ANONYMOUS` current-turn evidence | backend-bound run ID; turn ID remains server-internal | New tight internal type; not serialized to frontend |
| `AgentRunBackend.getLifecycleSnapshot()` | one runtime adapter snapshot | Translate provider state to fresh internal lifecycle evidence | backend-bound run ID | Replaces public-payload projection at backend layer |
| `AgentRunBackend.subscribeToSourceEventBatches()` | one runtime adapter source | Deliver neutral converted batches to the owning run | backend-bound run ID | One `AgentRun` subscriber; no processors/finalizer/public listeners |
| `AgentRun.publishEvent(event)` | one supported local run event | Await the same serialized processing/finalization/delivery path as runtime batches | event `runId` must equal owning run ID | Replaces `emitLocalEvent`; rejects mismatched identity |
| `dispatchProcessedAgentRunEvents(...)` | one run-owned source batch | Serialize processing, refresh runtime evidence in-queue, finalize, apply status, and fan out | `runContext.runId` | Invoked only from `AgentRun`; lifecycle state is injected per run |
| `LifecycleStatusEventTransformer.transform(...)` as finalizer | one run event sequence | Reconcile the run-owned state and emit ordered status companions for every final non-status event | run context + event turn identity + fresh runtime snapshot | Final pipeline stage; no internal WeakMap state |
| `AgentRun.getStatusSnapshot()` | one public agent run | Refresh the run-owned lifecycle state from backend evidence and return its canonical status payload | run ID owned by instance | No override selection; same state as live finalization |
| `TeamRun.getMemberStatusSnapshots()` | team member executions | Return exact member-scoped status snapshots | route/path/run/task identity in payload | No aggregate permission |
| `INTERRUPT_GENERATION` standalone | one active agent run | Interrupt current run turn | agent run from session | Existing route preserved |
| `INTERRUPT_GENERATION` team | one exact member execution | Interrupt focused current member turn | team run ID + member route key + optional exact member run ID | Existing stale-target guard preserved |
| `resolveAgentPrimaryAction(...)` | selected frontend agent context | Resolve disabled/send/interrupt | selected context status + local constraints | Pure, testable decision |
| `activeContextStore.send/interruptGeneration` | selected command subject | Recheck lifecycle and delegate exact command | selected standalone run or exact team member | No fallback action guessing |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Status payload | Yes | Yes | Low | Contract to status + identity only |
| Runtime lifecycle snapshot | Yes | Yes | Low | Keep internal behind backend/`AgentRun`; include current-turn evidence |
| Lifecycle finalizer input | Yes | Yes | Low | Inject the run-owned state and fresh internal snapshot, not generic context inspection |
| Standalone interrupt | Yes | Yes | Low | Preserve session run binding |
| Team interrupt | Yes | Yes | Low | Preserve compound member route/run validation |
| Primary action resolver | Yes | Yes | Low | Return discriminated result; no booleans that can contradict |
| Backend source-batch subscription | Yes | Yes | Low | Runtime facts only; `AgentRun` is the sole subscriber/public dispatcher |
| Local run-event publication | Yes | Yes | Low | Awaited, run-ID checked, and routed through the same gateway |
| Canonical run snapshot | Yes | Yes | Low | Reconcile fresh runtime evidence into run-owned state; never `override ?? backend` |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Per-run public owner | `AgentRun` | Yes | Low | Preserve |
| Event lifecycle facts | `AgentTurnLifecycleState` | Yes | Low | Preserve and strengthen |
| Event projection stage | `LifecycleStatusEventTransformer` | Yes | Low | Document/use it as finalizer; no generic helper rename needed |
| Runtime evidence type | `AgentRuntimeLifecycleSnapshot` | Yes | Low | Distinguish internal provider evidence from the public status DTO |
| Local outward publication | `AgentRun.publishEvent` | Yes | Low | Explicit awaited owner API; remove the ambiguous direct-fanout `emitLocalEvent` name |
| Local request lock | `submissionPending` | Yes | Low | Replace misleading `isSending` |
| Composer decision | `AgentPrimaryAction` / `resolveAgentPrimaryAction` | Yes | Low | Use discriminated `disabled/send/interrupt` result |
| Team aggregate | `deriveTeamApiStatus` | Yes | Low | Preserve |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Current/retired turn lifecycle | agent-execution lifecycle-status processor | Extend | Already owns verified monotonic lifecycle state | N/A |
| Final outward event stage | `AgentRun` plus `AgentRunEventPipeline` | Extend | The public run must own entry/serialization/listeners; the existing pipeline remains its internal processing mechanism | N/A |
| Runtime lifecycle snapshots | runtime-specific projectors | Extend | Required for reconnect/startup and must retain server-internal current-turn evidence | N/A |
| Supported local outward events | `AgentRun` public run boundary | Extend | All existing producers already possess the exact active run; an awaited method removes their direct-listener bypass | N/A |
| Stream delivery | agent streaming handlers/mappers | Reuse/Extend | Existing exact standalone/team routing is healthy | N/A |
| Team aggregate | team status aggregation | Reuse | Existing precedence and shared owner are healthy | N/A |
| Frontend status mutation | `services/runStatus` | Extend | Already controls live/history status writes | N/A |
| Primary composer admission | run submission capability area | Create one small policy file | Existing submission service owns staging/rollback but not action-mode resolution; a pure policy avoids duplicating component/store conditions | It remains specific to agent submission/action, not generic UI infrastructure |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server agent execution domain | status DTO, internal runtime snapshot contract, `AgentRun` gateway/snapshot, turn lifecycle | DS-001, DS-003, DS-006, DS-007, DS-009 | `AgentRun` | Extend | Contract contraction, source unification, lifecycle reconciliation/finalization |
| Server runtime adapters | provider command adaptation, fact conversion, neutral source batches, internal lifecycle snapshot | DS-003, DS-004, DS-007 | `AgentRunBackend` serving `AgentRun` | Extend | Remove public payload/action boolean, public subscriber dispatch, and duplicate boundary status |
| Server event pipeline | ordered processors and finalizer invoked by `AgentRun` only | DS-003, DS-004, DS-006, DS-009 | `AgentRun` runtime-neutral event lifecycle | Extend | Add explicit finalizer stage and injected per-run state |
| Server team execution | identity wrapping, overlays, aggregate | DS-002, DS-004, DS-008 | `TeamRun` | Extend/Re-use | Status-only overlays; preserve exact routing |
| Server streaming | connect snapshot and wire mapping | DS-003, DS-004, DS-007 | stream handlers | Extend | Fresh post-bind status-only snapshots |
| Frontend run status | canonical status storage/merge | DS-003, DS-004, DS-007 | agent/member context | Extend | Remove interrupt field |
| Frontend run submission/action | submission pending and primary action | DS-005 | composer/active-context facade | Extend + one new policy file | Separate request lock from lifecycle |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-status-payload.ts` | agent execution domain | public status contract | status-only DTO/builder/normalization | Existing shared contract owner | Yes |
| new `agent-runtime-lifecycle-snapshot.ts` | agent execution domain | backend-to-run evidence contract | availability/phase/current-turn internal snapshot | Keeps runtime evidence tighter than the public DTO | Yes |
| `agent-turn-lifecycle-state.ts` | lifecycle status | bounded state machine | active/retired turn and status facts | Existing coherent state owner | Yes |
| `lifecycle-status-event-transformer.ts` | event pipeline | finalizer | ordered status companions | Existing projection owner | Yes |
| `agent-run-event-pipeline.ts` / default builder | event pipeline | pipeline sequencing | add finalizers after processors | Pipeline concern is centralized | Yes |
| `agent-run-backend.ts` and runtime projector/converter/backend files | runtime adapters | provider adapter | internal lifecycle snapshots and neutral source-event batches | Provider-specific facts stay isolated | Yes |
| `agent-run.ts` | agent execution domain/control | authoritative public run | own source subscription, queue, listeners, state, snapshot refresh, local publication, and command facts | These concerns are one run lifecycle boundary; processing details remain delegated | Yes |
| projection/coordinator/overlay | agent execution services | read selection and pre-runtime command start | remove boolean/direct active status; preserve overlay only before run existence | Existing owners remain coherent after bypass removal | Yes |
| global message router, artifact publication, skill notification, mixed member handle | owning producer subsystems | local event producers | await `AgentRun.publishEvent` after their own domain work | Each producer keeps its domain concern and delegates run emission | Yes |
| team overlay/member/snapshot/aggregate files | team execution | team/member boundary | status-only member snapshots and overlay replacement | Existing team identity owners | Yes |
| frontend `agentRuntimeStatusState.ts` | run status | mutation boundary | status-only live/history/cleanup/placeholder | Existing controlled boundary | Yes |
| frontend `agentPrimaryAction.ts` | run submission | action policy | discriminated action/guard | New single concrete policy | Yes |
| composer and active context store | input/action | UI and facade | render/execute same policy, lifecycle recheck | Existing user surfaces | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Public status payload construction/normalization | `agent-status-payload.ts` | server agent execution | Built by `AgentRun` and used by commands, team snapshots, mapper | Yes (`can_interrupt`) | Yes | provider-phase kitchen sink |
| Backend lifecycle evidence | new `agent-runtime-lifecycle-snapshot.ts` | server agent execution | All three backends must report availability/phase/current-turn evidence to the same run reconciler | Yes (no public identity/action fields) | Yes | a provider-specific union or second public status DTO |
| Current/retired turn correlation | `agent-turn-lifecycle-state.ts` | server event lifecycle | Shared across all runtime events | Yes | Yes | provider-specific parser |
| Runtime/local event publication | `AgentRun` gateway + dispatch queue | server agent execution | All source origins require identical ordering/finalization/listener semantics | Yes (`emitLocalEvent`/backend dispatch paths) | Yes | a generic global event bus |
| Frontend status writes | `agentRuntimeStatusState.ts` | frontend run status | Live, history, placeholder, cleanup need one precedence boundary | Yes (`canInterrupt`) | Yes | action coordinator |
| Primary action decision | new `agentPrimaryAction.ts` | frontend run submission | Button, keyboard, and store admission require same rule | Yes (parallel booleans) | Yes | general-purpose UI state framework |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentStatusPayload` | Yes | Yes | Low | `status` plus identity/error metadata only; no action boolean |
| `AgentRuntimeLifecycleSnapshot` | Yes | Yes | Low | `availability`, normalized runtime phase, and one current-turn union; server-internal only |
| `AgentRun` lifecycle state | Yes | Yes | Low | One state instance is reconciled by command facts, runtime snapshots, and final events; no parallel override |
| `AgentRunState` lifecycle fields | Yes | Yes | Low | Only `currentStatus`; local request state remains on context |
| `AgentPrimaryAction` result | Yes | Yes | Low | Discriminated union, not independent `disabled`/`interrupt` booleans |
| `TeamStatusPayload` | Yes | Yes | Low | Aggregate `status` only; never member action authority |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts` | agent execution domain | wire/domain DTO | Remove `can_interrupt`; build/normalize five statuses and identity | Canonical contract | N/A |
| new `.../domain/agent-runtime-lifecycle-snapshot.ts` | agent execution domain | backend-to-run evidence DTO | Define availability, normalized phase, and one current-turn union | Tight internal contract shared by all runtimes | N/A |
| `.../backends/agent-run-backend.ts` | runtime adapter contract | backend-to-run boundary | Replace public `getStatusSnapshot`/`subscribeToEvents` with internal lifecycle snapshot and neutral source-batch subscription | One uniform runtime contract | runtime snapshot/event types |
| `.../events/agent-run-event-transformer.ts` | event pipeline | stage contract | Carry injected run-owned lifecycle state and fresh runtime snapshot to the finalizer | Explicit lifecycle evidence input | internal snapshot/state |
| `.../events/agent-run-event-pipeline.ts` | event pipeline | pipeline owner | Run pre-process transformers, processors, then finalizer | One sequencing owner | transformer contract |
| `.../events/default-agent-run-event-pipeline.ts` | event pipeline composition | default composition | Register the stateless lifecycle transformer as finalizer; state is supplied per run | Composition only | pipeline |
| `.../events/agent-run-event-dispatch-queue.ts` | event dispatch | per-run serialization mechanism owned by `AgentRun` | Preserve enqueue semantics; instantiate once per run rather than using module-global fallback | Existing queue remains the right mechanism | run ID |
| `.../events/dispatch-processed-agent-run-events.ts` | event dispatch | run-internal serialized event function | Called only by `AgentRun`; evaluate fresh lifecycle snapshot in its queue, process/finalize, then fan out | Prevent stale pre-queue evidence and bypass | internal snapshot/state |
| `.../events/processors/lifecycle-status/agent-turn-lifecycle-state.ts` | lifecycle | state owner | Reconcile command facts, runtime snapshot, explicit facts, current/anonymous/retired turns; expose canonical status | Core invariant owner | error/turn resolver |
| `.../lifecycle-status-event-transformer.ts` | lifecycle | stateless finalizer over run-owned state | Pair every non-status final event and canonicalize explicit status; enforce ordering; remove context `WeakMap` | One event projection concern | lifecycle state/status DTO |
| three runtime lifecycle projectors | runtime adapters | lifecycle snapshot adapters | Derive internal phase/current-turn evidence; stop building public payload/boolean | Provider-local facts | internal snapshot DTO |
| Codex/Claude/native converters | runtime adapters | event adapters | Remove lifecycle status duplication; retain explicit startup/error/offline status facts | Provider event translation | neutral events |
| three runtime backend classes | runtime adapters | source/snapshot adapters | Emit neutral batches to the owning run and provide fresh lifecycle snapshots; remove pipeline dispatch/public listener sets | Provider mechanics stay isolated | backend contract |
| `agent-run.ts` | agent execution domain/control | authoritative public run | Own one backend source subscription, queue, public listener set, per-run lifecycle state, awaited local publication, command/termination facts, and refresh/read status | Public boundary is the only place all origins meet | pipeline/state/status DTO |
| global message router, artifact publication, skill-improvement notification, mixed member handle | producer subsystems | local event producers | Await `AgentRun.publishEvent`; remove direct listener fanout | Domain work remains local; event lifecycle stays with run | run publication API |
| command coordinator/overlay/projection service | command/read model | command/start/read owners | Remove boolean/reconstruction/direct active broadcast; overlay remains only until a run exists; active projection calls canonical run snapshot | Existing concerns remain distinct | status DTO/run API |
| team command overlay/start/member handle files | team execution | member startup/identity | Remove boolean; pre-run overlay only; clear when nested run owns status | Existing lazy member startup | status DTO/run API |
| `team-status-aggregation.ts` | team domain | aggregate owner | Preserve status precedence, consume status-only member snapshots | Healthy existing owner | status DTO |
| stream message mapper and handlers/snapshot service | streaming | transport | Serialize status-only DTO; bind then synchronously call the run-owned refresh/read snapshot | Transport only | status DTO |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` and command types | frontend protocol | wire types | Remove `can_interrupt` | Mirrors server contract | status type |
| `autobyteus-web/types/agent/AgentRunState.ts` | frontend run state | lifecycle storage | Remove `canInterrupt` | One lifecycle value | AgentStatus |
| `autobyteus-web/types/agent/AgentContext.ts` | frontend context | local session state | Rename `isSending` to `submissionPending` | Precise local request meaning | N/A |
| `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` | frontend run status | mutation boundary | Apply only status; initializing placeholder; live/history precedence | One projection owner | AgentStatus |
| `autobyteus-web/services/runSubmission/localUserSubmission.ts` | frontend submission | request staging | Own `submissionPending` start/fail/authoritative-progress clear | Request concern only | context |
| new `autobyteus-web/services/runSubmission/agentPrimaryAction.ts` | frontend submission | action policy | Resolve `disabled/send/interrupt` | Shared click/key/store rule | AgentStatus |
| `AgentUserInputTextArea.vue` | frontend input | UI | Render and execute same action result; Enter guard | One user surface | action policy |
| `activeContextStore.ts` and run stores | frontend commands | selection facade/exact routes | Expose currentStatus/pending; recheck send/interrupt; preserve exact routing | Existing command boundaries | action policy/status |
| external/member input handlers | frontend streaming | content projection | Remove local busy writes | Status companion is lifecycle owner | N/A |
| hydration/recovery/open/history files | frontend run status consumers | read-model merge | Remove permission writes; use initializing unknown placeholder; preserve subscribed live status | Existing read paths | status mutation API |

## Applied Patterns (If Any)

- **State machine:** `AgentTurnLifecycleState` owns current/retired turn progression.
- **Adapter:** runtime projectors/converters translate provider facts without owning UI policy.
- **Authoritative gateway:** `AgentRun` serializes every runtime/local origin and owns the only public listener/snapshot boundary.
- **Finalizer stage:** an explicit last pipeline stage ensures processor-derived outward events also receive status companions.
- **Discriminated action policy:** one pure resolver returns exactly one primary action and prevents contradictory booleans.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts` | File | shared public agent status contract | five-state DTO and identity | Domain contract built by `AgentRun` and used by command/team/transport boundaries | interrupt permission, current-turn evidence, or provider details |
| new `autobyteus-server-ts/src/agent-execution/domain/agent-runtime-lifecycle-snapshot.ts` | File | backend-to-run lifecycle evidence | internal availability/phase/current-turn union | Domain evidence shared by three adapters and one run owner | public wire identity/action fields |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | File | authoritative per-run gateway | commands, one source subscription, queue/listeners, lifecycle state, publication and snapshot | Existing public run boundary gains the authority needed by its API | provider parsing or transport serialization |
| `autobyteus-server-ts/src/agent-execution/events/` | Folder | run-internal event pipeline | ordered transformation/processing/finalization used only by `AgentRun` | Existing event capability area | alternate public dispatch or frontend policy |
| `.../processors/lifecycle-status/` | Folder | lifecycle finalizer | current/retired turn state and status pairing | Existing coherent concern | provider-specific parsing or WebSocket writes |
| `.../backends/{autobyteus,claude,codex}/` | Folder | runtime adapters | internal lifecycle snapshots and neutral source-event conversion | Provider-specific boundaries | public subscribers, finalization, or action semantics |
| `autobyteus-server-ts/src/agent-team-execution/` | Folder | team execution | exact member wrapping/startup/aggregation | Existing team owner | aggregate-to-member action policy |
| `autobyteus-server-ts/src/services/agent-streaming/` | Folder | WebSocket transport | mapping, subscription, snapshot delivery | Existing transport boundary | lifecycle derivation |
| `autobyteus-web/services/runStatus/` | Folder | frontend status projection | status mutation/precedence | Existing capability area | composer rendering or provider facts |
| `autobyteus-web/services/runSubmission/` | Folder | local submission/action admission | request pending, action resolver | Existing submission concern | backend lifecycle state machine |
| `autobyteus-web/components/agentInput/` | Folder | composer presentation | textarea/button/key interaction | Existing user surface | independently derived status |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| server `agent-execution/domain` | Main-Line Domain-Control | Yes | Low | Public/internal lifecycle contracts and authoritative `AgentRun` gateway remain coherent; provider and transport work stay outside |
| server `agent-execution/events` | Main-Line Domain-Control | Yes | Low | Pipeline/finalizer are internal `AgentRun` lifecycle mechanics and expose no parallel public entry |
| server runtime backend folders | Persistence-Provider | Yes | Low | Provider adapters stay isolated |
| server `services/agent-streaming` | Transport | Yes | Low | No lifecycle policy added |
| web `services/runStatus` | Main-Line Domain-Control | Yes | Low | One frontend projection boundary |
| web `services/runSubmission` | Off-Spine Concern | Yes | Low | Local request/action policy is cohesive and bounded |
| web input component | Transport/presentation | Yes | Low | Consumes policy rather than owning it |

## Outward `AgentRunEvent` Origin Coverage

Every production origin identified in the investigation has one target entry. `AgentRun` rejects a local event whose `runId` differs from its own before enqueue.

| Origin ID | Production Origin | Target Entry Into `AgentRun` | Processing / Companion Rule | Delivery Boundary |
| --- | --- | --- | --- | --- |
| ORIGIN-001 | AutoByteus, Codex, and Claude converted provider events, including backend-collected token usage | sole backend `subscribeToSourceEventBatches` callback | same queue; processors; finalizer; fresh internal lifecycle snapshot | run listener set |
| ORIGIN-002 | command start/accept/reject/error and accepted termination facts owned by `AgentRun` | private queued lifecycle-fact application | same lifecycle state; emit canonical status fact through the run, not direct fanout | run listener set |
| ORIGIN-003 | accepted grant-authorized direct inter-agent message | awaited `targetRun.publishEvent(INTER_AGENT_MESSAGE)` | status-before-event; accepted command turn already applied by `postUserMessage` | run listener set |
| ORIGIN-004 | active-run artifact publication | awaited `run.publishEvent(ARTIFACT_PERSISTED)` | pair current status without opening a turn | run listener set; non-run application relay unchanged |
| ORIGIN-005 | active idle skill-improvement notification | awaited `run.publishEvent(SYSTEM_TASK_NOTIFICATION)` | pair idle; do not infer running from notification | run listener set |
| ORIGIN-006 | accepted mixed-member task-delegation notification | awaited nested `run.publishEvent(SYSTEM_TASK_NOTIFICATION)` | use nested run's accepted/current command fact | nested run listener then team identity wrapper |
| ORIGIN-007 | processor-derived `FILE_CHANGE` and `TEAM_COMMUNICATION_MESSAGE` | appended inside the run-owned pipeline | finalizer runs after processors; each derived event gets its own companion | run listener set |

`AGENT_STATUS` is the only final event exempt from receiving another status companion. Runtime status inputs and local lifecycle facts are canonicalized by the same state before one public `AGENT_STATUS` is emitted. No caller-specific pairing logic is permitted.

## Canonical Active-Run Status Application And Snapshot Precedence

The backend-to-run evidence shape is intentionally richer than the status-only wire DTO:

```ts
type AgentRuntimeLifecycleSnapshot = {
  availability: "active" | "offline";
  phase: "initializing" | "idle" | "running" | "error";
  currentTurn:
    | { kind: "NONE" }
    | { kind: "IDENTIFIED"; turnId: string }
    | { kind: "ANONYMOUS" };
};
```

Projector invariant: a backend must not return `phase: "running"` with `currentTurn: NONE`. Codex and Claude use `activeTurnId`; AutoByteus uses its active-turn object/stream lifecycle and may report `ANONYMOUS` when no stable ID exists. If a provider exposes a busy-looking phase before current-turn evidence exists, the internal projection is `initializing`, not public `running`.

One `AgentTurnLifecycleState` instance belongs to each `AgentRun`. It additionally records whether a command startup is pending. It is reconciled by: queued command facts, the fresh backend lifecycle snapshot read inside each publication task, explicit runtime status facts, and final event boundaries/activity. The lifecycle transformer receives that instance; it no longer creates hidden per-context state in a `WeakMap`.

Status application/read rules, in precedence order:

| Priority | Evidence | State Transition / Public Result |
| --- | --- | --- |
| 1 | accepted termination or fresh backend `availability=offline` | retire/clear current turn and startup; `offline`. A WebSocket disconnect is not this evidence. |
| 2 | runtime-global terminal error or terminal error matching identified current turn | retire/clear affected current turn and startup; `error` |
| 3 | identified current turn A already open | remain `running` across backend `idle`/`initializing`, duplicate startup, and unrelated/retired events; only matching terminal/error or priority 1 closes A |
| 4 | accepted command result with turn ID A, or fresh backend `currentTurn=IDENTIFIED(A)` not retired | open A and return `running`; this immediately promotes stale `initializing` even if `TURN_STARTED` finalization is still pending |
| 5 | fresh backend `currentTurn=ANONYMOUS`, anonymous turn-start, or current activity qualified by a pending accepted anonymous command | open/reinforce anonymous current turn and return `running`; fresh authoritative runtime idle or anonymous terminal may close it because no ID can be matched |
| 6 | command start pending with no current-turn evidence | `initializing`; a racy backend idle/initializing read cannot cancel startup. Rejection rolls back the exact startup token to the prior canonical status; activation failure applies error through the run. |
| 7 | no startup/current turn | use fresh live `idle`/`initializing` or terminal `error`; retired/unknown activity only repeats this actual current status and never opens a turn |

`AgentRun.getStatusSnapshot()` is a refresh-and-project boundary, not `localOverride ?? backend`. It reads `backend.getLifecycleSnapshot()`, synchronously reconciles the facts above into the run-owned state, and builds `AgentStatusPayload` without an `await` between reconciliation and return. That transition is atomic on the Node event loop; any queued finalization that resumes later reuses the same state and precedence, so an older idle/initializing fact cannot demote the newly identified turn. The stream handler still binds first, then calls this method and sends the result. Team member snapshots call the nested run method and add route/path/task identity at the team boundary.

Every status published after an `AgentRun` exists follows one of two owned paths: a queued lifecycle fact inside `AgentRun`, or the run's event finalizer. Both update the same state before listener delivery. `AgentRunCommandCoordinator` and mixed-member code may directly broadcast only a pre-runtime overlay while no run exists; when activation produces a run, they clear the overlay and stop publishing replacements. `AgentRunStatusProjectionService` therefore selects `activeRun.getStatusSnapshot()` before considering an overlay; overlay is eligible only when active-run lookup is absent. `AgentRun.postUserMessage` itself applies command-start and accepted-turn/rollback/error facts, so an accepted returned `turnId` becomes running even before the provider event callback completes.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Current-turn stream | `snapshot/turn evidence -> running status -> SEGMENT_CONTENT(A)` | `SEGMENT_CONTENT -> frontend guesses busy` | Backend remains authoritative while status appears no later than content |
| Terminal order | `TURN_COMPLETED(A) -> idle status` | `idle timer after last delta` | Silence is not lifecycle evidence |
| Late old turn | `idle snapshot + late SEGMENT_CONTENT(A) -> idle status + content` | `any delta -> running` | Preserves content without reopening retired work |
| Newer turn | `TURN_STARTED(B) -> running; late terminal(A) -> TURN_COMPLETED(A) + running` | old terminal clears B | Turn identity keeps lifecycle monotonic |
| Composer action | `resolve({status:'running'}) -> {kind:'interrupt', enabled:true}` | `isRunning=true`, `canInterrupt=false`, `isDisabled=true` | One discriminated result cannot contradict itself |
| Pipeline shape | `AgentRun queue -> pre-transformers -> processors -> lifecycle finalizer -> listeners` for backend and local sources | backend-only pipeline plus direct local fanout | Processor-derived and local outward events also receive companions |
| Local delivery | `post accepted(A) -> run applies A/running -> await run.publishEvent(INTER_AGENT_MESSAGE) -> running -> event` | `emitLocalEvent` directly to listeners | Direct-message activity cannot bypass status/finalization |
| Idle local notification | `idle -> await run.publishEvent(SYSTEM_TASK_NOTIFICATION) -> idle -> notification` | any non-status event opens running | Non-turn system activity carries status without inventing a turn |
| Startup reconnect | `initializing override removed; backend snapshot has active A -> AgentRun reconcile -> running snapshot` | `initializing ?? backend running -> initializing` | Fresh current-turn evidence makes Stop available before async event finalization |
| Identified-turn precedence | `state running(A) + backend idle/initializing -> running(A)` until terminal A | phase snapshot closes A without matching identity | Racy runtime phase cannot revoke an addressable interrupt target |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep optional `can_interrupt` but ignore it in UI | Reduce DTO edits | Rejected | Remove it from all producers/consumers/tests/docs |
| Keep frontend `canInterrupt` getter derived from running | Ease component migration | Rejected | Use `currentStatus`/primary-action policy directly; no redundant representation |
| Accept both old/new WebSocket status payloads | Mixed-version clients | Rejected | Repository/app/server release is a coordinated contract cut; no dual parser |
| Keep provider lifecycle status companions plus finalizer companions | Minimize converter edits | Rejected | Remove boundary/error duplicates; retain only genuine explicit provider status facts |
| Keep `running,false` active placeholder | Preserve prior hydration behavior | Rejected | Use `initializing` until authoritative current-turn status arrives |
| Retain `isSending` as generic busy state | Reduce frontend edits | Rejected | Rename/narrow to `submissionPending`; streamed status owns busy |
| Keep `emitLocalEvent` as a synchronous wrapper over `publishEvent` | Reduce local caller edits | Rejected | Remove it; callers await the authoritative gateway so ordering/failure is observable |
| Let runtime backends continue finalizing while local events use `AgentRun` | Minimize backend refactor | Rejected | Backends emit neutral source batches; only `AgentRun` owns processing, finalization, and public listeners |
| Keep direct active-run broadcaster replacement as a repair | Avoid changing coordinator logic | Rejected | Apply command/runtime status through `AgentRun`; broadcaster remains pre-runtime-overlay-only |

## Derived Layering (If Useful)

```text
Frontend presentation/action policy
        -> frontend status/command boundaries
        -> WebSocket transport
        -> AgentRun / TeamRun public boundaries
             -> run-owned runtime-neutral processors/finalizer/state
             -> provider adapters/runtime sessions
             <- supported local run-event producers (through AgentRun only)
```

This is explanatory only. Authority follows the boundaries above; stream handlers do not bypass `AgentRun` to provider state.

## Change / Refactor Sequence

1. **Contract cut:** Add the internal `AgentRuntimeLifecycleSnapshot` and source-batch listener types. Remove `can_interrupt`/`canInterrupt` from the public server DTO/builder, command ack/status projection, team snapshots, mapper, frontend protocol/state, and compile-time fixtures. Backend projectors stop returning the public payload.
2. **Authoritative run gateway seam:** Give `AgentRun` its own lifecycle state, listener set, backend source subscription, and `AgentRunEventDispatchQueue` instance. Change all three backends from public processed-event subscriptions to neutral source-event batches. Move the only `dispatchProcessedAgentRunEvents` invocation to `AgentRun`; require its queue argument; remove the module-global queue fallback, backend dispatch imports/calls, and per-public-listener backend subscription. At this step runtime events already cross the new gateway before any local caller migration.
3. **Lifecycle reconciliation/finalizer:** Add injected run-owned state and fresh internal runtime snapshot evidence to pipeline input. Run processors before a stateless `LifecycleStatusEventTransformer`; remove its `WeakMap`. Implement the precedence table, command-start token/accept/rollback/error/offline facts, current/anonymous/retired rules, terminal classification, and one companion for every final non-status event. Remove `statusOverride` and make `AgentRun.getStatusSnapshot()` refresh/project the same state.
4. **Local origin cutover:** Replace every production `emitLocalEvent` caller in ORIGIN-002–ORIGIN-006 with queued run lifecycle facts or awaited `AgentRun.publishEvent`; validate run identity. Remove `emitLocalEvent`/`localEventListeners` completely. Verify processor-derived ORIGIN-007 events are finalized after processors.
5. **Runtime adapter cleanup:** Make AutoByteus/Codex/Claude projectors return the internal lifecycle snapshot with current-turn evidence. Remove Codex/Claude turn/error status duplication and public status callbacks from converters; retain only genuine neutral provider status facts. Ensure accepted returned turn IDs are applied by `AgentRun` before async source finalization.
6. **Command/team convergence:** Restrict coordinator and mixed-member direct broadcaster status to the no-`AgentRun` startup overlay. Remove active-run `reconcileCommandStatus`/replacement payload publication, clear overlay on run ownership, and route active command facts through `AgentRun`. Simplify task/subteam/member status shapes and team aggregation to status-only while preserving exact identity.
7. **Snapshot race closure:** Keep listener binding first, then call canonical `AgentRun.getStatusSnapshot()` for standalone and nested member reads. Add the exact `initializing -> backend identified current A -> reconnect -> running` check and the inverse `running(A) + racy idle/initializing -> running(A)` check. Verify no direct publication can disagree with that read.
8. **Frontend projection cleanup:** Remove `canInterrupt`; make unknown-active placeholder `initializing`; preserve subscribed live status against history refresh; remove aggregate-to-member or remote-content lifecycle writes.
9. **Local request/action cleanup:** Rename/narrow `isSending` to `submissionPending`, add the discriminated primary-action policy, route click and Enter through the same guarded executor, and add store-level lifecycle rechecks. Preserve exact interrupt routing and Shift+Enter.
10. **Remove obsolete tests/assumptions and replace coverage:** Update server unit/integration and frontend unit/component coverage for the status-only contract, ORIGIN-001–ORIGIN-007 gateway coverage, local awaited publication failure/order, startup snapshot precedence, late-turn safety, team identity, and click/Enter parity. Direct backend/dispatcher tests must be rewritten through `AgentRun`; do not retain old subscription or payload fixtures. Durable API/E2E coverage remains downstream-owned.
11. **Documentation handoff:** Delivery updates streaming/execution/frontend architecture docs to the status-only wire contract, single `AgentRun` gateway, and explicit companion/snapshot semantics after integrated verification.

No temporary compatibility shape may remain after any step. Intermediate compile failures are acceptable within the implementation branch; the completed change must be clean-cut.

## Key Tradeoffs

- **Repeated status versus sparse transitions:** Repetition increases compact WebSocket messages but makes every activity self-healing and removes dependence on one transition delivery. Correctness wins; the user explicitly accepted it.
- **Backend explicit status versus frontend delta inference:** The backend uses stream activity as lifecycle evidence but sends explicit status. This preserves turn correlation, error classification, reconnect snapshots, and team identity while keeping the frontend simple.
- **Turn identity versus literal any-delta rule:** Current-turn qualification is the minimum required safety mechanism. Without it, previously observed late tool output would reopen completed work.
- **Run-owned gateway versus patching local callers:** Moving backend source delivery and local publications behind `AgentRun` is a broader interface cut than wrapping four callers, but it establishes one queue/state/listener invariant and prevents the next local origin from bypassing lifecycle again.
- **Internal lifecycle snapshot versus backend public status DTO:** Retaining current-turn evidence internally adds one tight type, but it lets the public owner resolve startup races without exposing turn identity or another action bit to the client.
- **Finalizer stage versus mapper decoration:** Finalizing in the runtime-neutral pipeline owned by `AgentRun` allows its snapshots, team aggregation, history, local events, and every transport consumer to see the same status. Decorating only WebSocket messages would leave internal snapshots/teams divergent.
- **Local submission lock versus no local state:** A narrow request lock is still needed before the first authoritative server progress event, but it is deliberately not busy/interrupt state.

## Risks

- Some provider/derived events lack `turn_id`. They may repeat the current status but cannot open a new turn from idle; adapters must preserve `TURN_STARTED`, explicit running, or snapshot active-turn evidence.
- Moving lifecycle projection after processors changes event ordering. Tests must assert content order remains intact and only adjacent status messages are inserted.
- High-frequency `SEGMENT_CONTENT` produces high-frequency compact status companions. Observe message throughput during API/E2E; do not weaken correctness by silently returning to sparse transitions. Existing event batching may be optimized later without changing semantics.
- Runtime lifecycle snapshot calls for event publication must be evaluated inside the serialized dispatch task, not captured before queued events run, or fallback evidence can be stale. Public `getStatusSnapshot()` must use the same precedence/state and must never restore a lower-priority stale phase.
- The backend subscription contract change touches runtime adapter tests and any test that directly attaches to a backend/dispatcher. Keeping a compatibility listener would recreate the ownership defect; coverage must move to constructed `AgentRun` instances.
- Local publication becomes awaited. A listener/processor failure must follow the existing dispatch error policy without causing persisted domain work to be falsely rolled back; each producer must report publication failure truthfully according to its existing API contract.
- Pre-runtime overlays and the lifecycle finalizer may both emit initializing/running around activation. Repetition is allowed, but overlay ownership must end when `AgentRun` exists so stale initializing cannot win afterward.
- Renaming `isSending` touches many tests and remote input handlers. Review must confirm no UI feature depended on it for anything other than request/busy gating.
- `running` assumes every supported runtime's existing interrupt route can address its current open turn. Cross-runtime API/E2E evidence is required before delivery.

## Guidance For Implementation

- Treat the five-state table and `running => current open interruptible turn` as invariants, not presentation conventions.
- Prefer a discriminated action result such as:

```ts
type AgentPrimaryAction =
  | { kind: "interrupt"; enabled: true }
  | { kind: "send"; enabled: true }
  | { kind: "disabled"; enabled: false; reason: string };
```

- The lifecycle finalizer should use a single canonical status builder. Never copy identity/status fields ad hoc when an existing builder/envelope supplies them.
- Construct exactly one `AgentTurnLifecycleState` per `AgentRun` and pass it explicitly to processing/finalization. Do not hide another state map in the default pipeline or projector.
- Keep runtime lifecycle evidence internal: backend source callbacks return neutral batches, and backend snapshot projection returns phase plus current-turn union. Neither backend API emits/finalizes for public listeners.
- Snapshot fallback is evidence, not permission to override an identified active turn with a racy idle snapshot. Reuse the state machine's rule that idle/initializing cannot close an identified turn; only its matching terminal/error or explicit runtime offline evidence can. Conversely, fresh non-retired current-turn evidence must promote startup immediately.
- `AgentRun.publishEvent` must validate run identity, enqueue with runtime batches, run processors/finalizer, and resolve only after ordered listener delivery completes under the dispatcher policy. Do not implement it by calling listeners directly.
- Activity may promote `initializing`/anonymous-running to an identified current turn when the snapshot or command state proves current execution. Activity received while truly idle must not open a turn merely because its ID is unfamiliar.
- For nonterminal activity, emit status first, then the original event. For `TURN_COMPLETED`, `TURN_INTERRUPTED`, and terminal `ERROR`, emit the boundary/error first, then the derived idle/error status. An older terminal that does not match the current turn is followed by the unchanged current status.
- Keep `ASSISTANT_COMPLETE` as presentation completion only; it does not replace the authoritative turn terminal boundary.
- Keep recoverable tool failures/logs as activity. Only `resolveAgentRunErrorEvidence` terminal classifications may settle `error`.
- Do not mark offline from WebSocket disconnect. Offline comes from runtime absence/termination or history projection.
- Preserve team member identity at every companion event. The team mapper should continue to stamp member route/path/run/task identity from the team envelope rather than trusting a generic payload fallback.
- Remove active-run calls from the coordinator/member handle to `AgentStreamBroadcaster.publishToRun`; if no `AgentRun` exists, the named pre-runtime overlay API is the only allowed direct status path.
- Add implementation-scoped unit checks for backend/local origin convergence, lifecycle/snapshot precedence, DTO contraction, primary-action resolver, store guards, and component click/Enter behavior. Broader cross-runtime/API/E2E execution remains the downstream `api_e2e_engineer` responsibility.
