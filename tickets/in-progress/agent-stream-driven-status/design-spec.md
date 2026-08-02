# Design Spec

## Status (`SR-005` — `CODE-FIND-002` Resolved In Design, Ready For Architecture Re-review)

This is the implementation-authoritative target design for the complete approved requirements basis dated 2026-08-02. It preserves the agent lifecycle design that passed `ARCH-REV-002`, the manager-owned team simplification implemented by `IR-003`, and the representable leaf carrier introduced by `SR-004`. `SR-005` corrects the multi-boundary coordinate-frame defect proven by `CODE-FIND-002`; intended behavior is unchanged.

No source rework may begin until this `SR-005` package passes architecture re-review. API/E2E remains blocked. `CODE-FIND-003` is a required implementation-local test-double repair after the design passes.

## Current-State Read

The ticket branch is not the original baseline. Commits `b1e96b73f` and `f453286d8` implement the passed `SR-002` agent foundation. Commit `9c4c6f095` implements the `SR-004` team expansion; `facc6a818` records `CRR-003`. Manager-owned binary team liveness, aggregate-team removal, Stop failure/pending semantics, and the preserved agent lifecycle/batching foundation remain sound. This design does not reopen `ARCH-FIND-001`, `ARCH-FIND-002`, or resolved `CODE-FIND-001`.

The remaining team model is structurally different and unnecessarily broad:

- `AgentTeamRunManager.activeRuns` plus `TeamRun.isActive()` already determine whether a root team execution is live.
- History and resume expose `isActive`, but `TeamRunStatusProjectionService` additionally folds member snapshots through `deriveTeamApiStatus` and exposes a root `status`.
- `TeamRun`, `MixedTeamManager`, subteam/task-team handles, command overlays, the team event mapper, and the team WebSocket snapshot all manufacture root or nested `TEAM_STATUS` events.
- The frontend stores both `AgentTeamContext.currentStatus` and `TeamRunHistoryItem.isActive`, converts activity to a synthetic team status during hydration, and later converts status back to action eligibility.
- `workspaceHistoryTeamDefinitionGroups.ts` copies the most recent child run's status onto a reusable team definition, which has no runtime lifecycle of its own.
- Root and definition rows render five-color team dots even though the user action at the root is simply Stop while the run exists.
- The same aggregate event is also used as a shortcut for task-team projection cleanup, team failure observation, and task-team open-work settlement.

The aggregate therefore mixes five distinct subjects: definition metadata, root-run liveness, nested execution liveness, member-agent lifecycle, and task stage. Member `AGENT_STATUS` is still valid and must remain exact at every nesting depth. The root team action needs only manager-owned binary liveness. Task cleanup, failure, and settlement need their own facts.

`SR-004` fixed the original representability gap by carrying task-team identity through recursive snapshots. `CRR-003` then proved that the carried identity can still use the wrong frame. `MixedSubTeamRunFactory` strips an ordinary parent's path from the child config; a task team created there therefore records child-local `logicalTeam` coordinates. Its task-team handle correctly roots leaf and logical team to that child. When the outer ordinary handle bubbles the result to the root, the implemented shared core prefixes only leaf member/source paths and clones the full `TaskTeamInstanceIdentity`. The mapper compares root-relative source path with child-local logical-team path, loses the live relative selector, and throws for the initial snapshot.

The failing path is product-supported: `root composer -> ordinary subteam leaf -> delegate_task to a visible child team target -> task-team activation -> leaf status/live or reconnect`. The correction is not a transport fallback. `SR-005` narrows the outward carrier to `TaskTeamStreamScope` (only task-team run/instance/task IDs plus logical-team path/key), defines those logical coordinates in the enclosing `teamRunId` frame, and rebases them at the same mixed-team boundary as source/member paths for every live event type and initial snapshot. Operational `TaskTeamInstanceIdentity` remains unchanged for activation, directories, persistence, ingress, and coordinator-local routing.

Relevant verified paths and evidence are in [`investigation-notes.md`](./investigation-notes.md), [`production-trace-evidence.md`](./production-trace-evidence.md), and [`team-status-simplification-evidence.md`](./team-status-simplification-evidence.md).

## Intended Change

Keep one five-state lifecycle only for an agent execution:

```text
no live agent runtime                    -> offline
terminal turn/runtime failure            -> error
accepted command, no current turn        -> initializing
current open turn                        -> running
live agent runtime, no current turn      -> idle
```

`running` remains the sole public busy/interruptible agent state. The implemented `AgentRun` gateway continues to pair canonical `AGENT_STATUS` with every final non-status agent event, apply current/retired-turn safety, and serve the same canonical snapshot on reconnect. The frontend continues to resolve Send/Stop/disabled from agent status plus local submission constraints; it never restores `can_interrupt` or `canInterrupt`.

For a team, remove the five-state lifecycle altogether:

```text
team definition                          -> no runtime state
root team run registered and backend live -> isActive = true
root team run absent/unregistered          -> isActive = false
leaf agent member                          -> its own five-state AgentStatus
task execution                             -> its task-domain stage
socket                                     -> connected/disconnected only
Stop request                               -> local stopPending only
```

Make `AgentTeamRunManager` the only public team-liveness owner. It exposes a fresh binary snapshot and an idempotent lifecycle subscription for an exact root `teamRunId`. The team WebSocket binds both the run-event subscription and manager-lifecycle subscription, then performs a fresh manager read. It sends `TEAM_RUN_LIFECYCLE { team_run_id, is_active }`; it no longer sends root or nested aggregate `TEAM_STATUS`. Successful unregistration emits `false`; failed termination emits no false transition; disconnect emits nothing about liveness.

Remove agent-like status snapshots from subteam and task-team handles. Team runtime snapshots recursively return `TeamLeafAgentStatusSnapshot`: a canonical agent status with required team-leaf identity plus a discriminated ordinary-member or task-team `TaskTeamStreamScope`. The task-team handle derives that tight scope from its operational `TaskTeamInstanceIdentity` in the immediate parent frame. Every outer ordinary boundary prefixes the scope's logical-team path together with source/member paths and rebuilds every route key. Every live event type and every initial snapshot calls the same `prefixMixedTeamStreamScope`; live agent and snapshot adapters additionally enforce a nonempty relative leaf selector. Both stream mappings call the same task-team identity flattener and never guess a missing prefix. Replace the settlement aggregate read with a private `TeamRun.hasOpenExecutionWork()` predicate. Replace task-team offline-event cleanup with task-delegation terminal/reconciliation facts. Remove the root aggregate-error branch from team lifecycle observation while retaining canonical member-agent failure observation and explicit operation failures.

On the frontend, store root `isActive` directly; remove `AgentTeamStatus`, root/team `currentStatus`, definition/run team dots, and aggregate normalization/hydration. Use `isActive && !stopPending` for Stop. Show `AgentStatusDisplay` and status dots only for exact leaf-agent subjects. A root or subteam header has no agent status fallback. Mobile team-run liveness, where text is useful, is `Active` or `Inactive` from `isActive` only.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-002, REQ-008, REQ-009; AC-001, AC-002, AC-009 | Selected standalone or exact team member is working | Original screenshot and agent investigation | Preserve implemented `running -> Stop`; exact run/member interrupt identity remains | DS-001, DS-002, DS-005 |
| BEH-002 | System / Contract | REQ-003, REQ-004, REQ-005, REQ-010; AC-003, AC-004, AC-010, AC-011 | Any supported outward agent event origin | ORIGIN-001–ORIGIN-007; `ARCH-REV-002` | Preserve the single `AgentRun` gateway and one canonical companion per final non-status event | DS-003, DS-004, DS-006, DS-009 |
| BEH-003 | System | REQ-005, REQ-006, REQ-007, REQ-011; AC-004, AC-005, AC-006, AC-007, AC-012 | Agent terminal/error/termination or reconnect | Snapshot race evidence and implemented foundation | Preserve matching terminal -> idle, terminal failure -> error, termination -> offline, fresh snapshot convergence | DS-003, DS-004, DS-007 |
| BEH-004 | System | REQ-004, REQ-012; AC-008, AC-011, AC-012 | Late/duplicate retired-turn evidence | Production trace and turn-state evidence | Preserve late content while preventing retired turn A from reopening or disturbing B | DS-006 |
| BEH-005 | User | REQ-008, REQ-009; AC-013, AC-014 | Click, Enter, or programmatic composer action | Composer source and implementation review | Preserve one action guard; initializing blocks, running interrupts, Shift+Enter inserts newline | DS-005 |
| BEH-006 | User / Contract | REQ-013; AC-016 | Render a team-definition group | Team screenshot and definition-group source | Remove borrowed status field/dot/label; preserve name/avatar/count/disclosure/launch | DS-010 |
| BEH-007 | System / Contract | REQ-014, REQ-015, REQ-018; AC-017, AC-018, AC-019, AC-020, AC-024 | Create, restore, refresh, subscribe, terminate, or lose a root team run | Manager/history/resume and circular frontend projection evidence | Root team lifecycle is only manager-owned `isActive`; member state and socket state never determine it | DS-008 |
| BEH-008 | User | REQ-016, REQ-018; AC-017, AC-018, AC-022, AC-023 | Stop, archive, delete, or render a team run | Workspace action/dot source | Stop uses `isActive` plus local pending; inactive history actions retain their existing lifecycle guards; no five-state team visuals | DS-008, DS-010 |
| BEH-009 | System / Contract | REQ-015, REQ-017, REQ-019; AC-020, AC-021, AC-025 | Member live stream/initial reconnect at any depth, including ordinary subteam -> task team; task terminal/failure; settlement check | `CR-MP-002`, `CODE-FIND-002`, team bridge/flattener, task-team scoped resolver, task/failure/settlement owners | Preserve exact leaf-agent status through one representable and coordinate-consistent live/snapshot scope; move task cleanup, failure, and open-work decisions to their real owners; delete aggregate status | DS-004, DS-011, DS-012 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/production-trace-evidence.md` | Matched agent production trace and live snapshot probe | REQ-001–REQ-012 / AC-001–AC-015 | Grounds the preserved agent lifecycle/gateway design | Complete; evidence-only; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/team-status-simplification-evidence.md` | Team definition/run authority and aggregate-consumer trace | REQ-013–REQ-019 / AC-016–AC-025 | Grounds the clean team contraction and reassignment | Complete; evidence-only; approval N/A |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_6557dd2b51c3__image.png` | Agent UI screenshot | REQ-001, REQ-008 / AC-001, AC-009 | Shows Running with the wrong primary action | User-supplied evidence; approval N/A |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_9d9c83cf3d30__image.png` | Team hierarchy screenshot | REQ-013–REQ-017 / AC-016, AC-017, AC-021, AC-023 | Distinguishes redundant root status from useful member status | User-supplied evidence; approval N/A |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_ead75793b5e3__image.png` | Team-definition screenshot | REQ-013 / AC-016 | Shows the invalid definition-level status dot | User-supplied evidence; approval N/A |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`, `Behavior Change`, `Refactor`, and `Cleanup`
- Current design issue found: `Yes`
- Root cause classification: `Missing Invariant`; `Boundary Or Ownership Issue`; `Duplicated Policy Or Coordination`; `Shared Structure Looseness`; local `Local Implementation Defect`
- Refactor needed now: `Yes`
- Evidence:
  - The original agent action was governed by two independently mutable fields; that part is already corrected on this branch.
  - Team liveness has two public representations (`status` and `isActive`) and frontend code converts repeatedly between them.
  - A definition borrows a child execution status despite having no runtime subject.
  - A common member handle returns `AgentStatusPayload` for both agents and teams, forcing teams to masquerade as agents.
  - `TEAM_STATUS` is used as display state, liveness, failure, task cleanup, and open-work inference.
- `ARCH-FIND-003` confirmed that a plain recursive `AgentStatusPayload[]` loses task-team execution scope. `CODE-FIND-002` further proved that carrying a complete operational identity unchanged can mix coordinate frames after an additional ordinary parent boundary.
- Design response: Preserve one agent lifecycle owner; establish `AgentTeamRunManager` as the sole public root-team liveness owner; specialize agent versus team member shapes; compose canonical agent status with a tight parent-frame `TaskTeamStreamScope`; rebase that scope at the same owner as source/member paths; give task/failure/settlement their own facts; delete aggregate server/frontend contracts and visuals.
- Refactor rationale: Hiding the dots while retaining aggregate DTOs and status-to-active conversions would leave the same contradictory authority in code. Clean removal is smaller and more stable than maintaining a deprecated five-state team model.
- Intentional deferrals and residual risk: Provider internals, task-stage semantics, team topology, and general workspace styling remain unchanged. Repeated agent companions remain an accepted bandwidth tradeoff. The binary root lifecycle message is a small extra transport contract needed for live multi-client convergence; it is not another derived status.

## Terminology

- **Agent lifecycle:** The five-state lifecycle of one exact `AgentRun`.
- **Team definition:** Reusable configuration/topology; never a runtime subject.
- **Root team run liveness:** `isActive` for one exact root `teamRunId`, owned by `AgentTeamRunManager` registration plus backend liveness.
- **Team lifecycle message:** `TEAM_RUN_LIFECYCLE { team_run_id, is_active }`, a binary manager fact; not a member aggregate.
- **Leaf-agent snapshot:** `AgentStatusPayload` for an actual agent execution, including exact route/path/run/task identity.
- **Task-team stream scope:** Tight outward identity `{ taskTeamRunId, taskTeamInstanceId, taskId, logicalTeamPath, logicalTeamRouteKey }`. Its logical-team path/key are always rooted in the enclosing event/snapshot `teamRunId`; it deliberately excludes operational ingress/coordinator-local selectors.
- **Team leaf-agent snapshot:** Internal discriminated carrier `{ scopeKind, teamRunId, payload, taskTeamScope? }`, where `payload` is canonical `AgentStatusPayload` with required leaf identity; `ordinary_member` has no task-team field and `task_team_member` requires one coordinate-consistent `TaskTeamStreamScope`.
- **Mixed team stream scope:** Shared `teamRunId`/source-path/task-team envelope projected from every live `TeamRunEvent` type or a team leaf-agent snapshot and prefixed once at each parent boundary. Agent events/snapshots additionally carry a member path in the same frame.
- **Open execution work:** Private boolean used only for safe task-team settlement; it is not a public status or display value.
- **stopPending:** Frontend-local duplicate-request guard; it never changes `isActive`.

## Design Reading Order

Read the agent spines as preserved branch foundations, then the manager-owned team liveness spine, the recursive stream-coordinate contract, the definition/presentation contraction, and finally the task/failure/open-work replacements. The removal and file maps are the concrete projection of those ownership decisions.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Preserve the already implemented removal of agent `can_interrupt` / `canInterrupt`; do not reintroduce a derived alias.
- Delete backend `TeamStatusPayload`, `deriveTeamApiStatus`, root/nested `TeamRunEventSourceType.TEAM`, aggregate status overrides/deduplication, team command status construction, and aggregate snapshot/mapping code.
- Delete public/frontend `AgentTeamStatus`, root history `status`, team context/tree `currentStatus`, team-status normalization/hydration, and `TEAM_STATUS` protocol handling.
- Delete team-specific visual helpers/components and the team branch of the shared status dot; keep agent visuals.
- Do not accept old and new team payloads, retain an optional `status`, translate `status` into `isActive`, or publish both `TEAM_STATUS` and `TEAM_RUN_LIFECYCLE`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Run/team metadata JSON, raw trace JSONL, transcript/activity/task projections, and history-index rows under server memory. Volume depends on user history. Live agent lifecycle, root team aggregate status, and frontend projections are computed/in-memory.
- Relevant code-model, serialization, semantic, or physical-store change: Live agent DTO has already removed `can_interrupt`; GraphQL/frontend team history removes computed root `status` while retaining `isActive` and `members[].status`; WebSocket replaces root aggregate `TEAM_STATUS` with binary `TEAM_RUN_LIFECYCLE`.
- Normal reader/writer behavior and representative evidence: Team history already calculates `isActive` from `AgentTeamRunManager`; member statuses are live projections with offline fallback. Metadata/traces persist identities, topology, content, task records, and termination data, not a required aggregate-team lifecycle.
- Required semantics and invariants under direct use: Preserve all identity, topology, transcript, late activity, task records, and termination history. Active lifecycle is rebuilt from live runtime/manager state.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: No user data rewrite or deletion; server and frontend contracts ship together.
- Decision: `Directly Usable — No Migration`
- Decision rationale: Existing stored data remains meaningful and current readers can ignore obsolete historical superset fields. A bulk rewrite adds I/O/corruption/recovery cost without changing runtime authority.
- Acceptance criteria or design constraints supported: REQ-011, REQ-012, REQ-014–REQ-019; AC-008, AC-011, AC-012, AC-018–AC-025.

### Migration Plan

N/A — the decision is `Directly Usable — No Migration`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003, BEH-005 | Standalone user command | Provider turn / exact interrupt | `AgentRun` | Preserved status-only standalone action path |
| DS-002 | Primary End-to-End | BEH-001, BEH-005, BEH-009 | Team member command | Exact nested `AgentRun` turn / interrupt | `TeamRun` route boundary + member `AgentRun` | Preserves exact compound identity |
| DS-003 | Return-Event | BEH-002–BEH-004 | Runtime source batch | Standalone subscribers | `AgentRun` | Preserved single processing/finalization path |
| DS-004 | Return-Event | BEH-001–BEH-004, BEH-009 | Nested agent final event or initial leaf snapshot at arbitrary ordinary/task-team depth | Matching frontend leaf/task-team-scoped context | member `AgentRun` + mixed-team stream-scope bridge | Gives live and reconnect status one representable identity whose paths remain in the current parent frame |
| DS-005 | Primary End-to-End | BEH-001, BEH-005 | Button/Enter/programmatic action | Send or exact interrupt | frontend primary-action policy | Prevents input-path disagreement |
| DS-006 | Bounded Local | BEH-002–BEH-004 | Queued agent facts/events/snapshot | Canonical status + final event batch | run-owned lifecycle state/finalizer | Enforces current/retired-turn precedence |
| DS-007 | Return-Event | BEH-003 | Stream bind/recovery | Canonical agent snapshot | `AgentRun.getStatusSnapshot()` | Prevents stale startup on reconnect |
| DS-008 | Return-Event | BEH-007, BEH-008 | Manager register/read/unregister | GraphQL/history and live team frontend `isActive` | `AgentTeamRunManager` | Gives root Stop one binary authority |
| DS-009 | Return-Event | BEH-002 | Local/processor agent event | Agent subscribers | `AgentRun.publishEvent` / gateway | Preserves all outward origin coverage |
| DS-010 | Bounded Local | BEH-006, BEH-008 | Definition/history read model | Team definition/run presentation | workspace history projection | Removes status from non-agent subjects |
| DS-011 | Return-Event | BEH-009 | Task terminal/result/failure facts | Task projection cleanup and lifecycle observer | task delegation / operation / member failure owners | Replaces aggregate shortcuts |
| DS-012 | Bounded Local | BEH-009 | Settlement request | settle now or wait | `TeamRun.hasOpenExecutionWork()` + task delegation service | Replaces aggregate status as work predicate |

## Primary Execution Spine(s)

- **DS-001:** `Composer -> primary-action policy -> activeContextStore -> AgentRun command -> backend -> provider`
- **DS-002:** `Composer -> exact teamRunId/memberRouteKey/memberRunId -> TeamRun -> mixed member handle -> nested AgentRun -> provider`
- **DS-005:** `Click | Enter | programmatic admission -> resolveAgentPrimaryAction -> rechecked store command -> Send | exact Interrupt | Disabled`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The existing command boundary applies startup/current-turn facts to one `AgentRun`; its status-only projection drives the standalone action. | agent run, turn, action | `AgentRun` | provider adapter, submission pending |
| DS-002 | `TeamRun` validates the exact route/run identity and delegates to one member handle; only the nested `AgentRun` owns agent lifecycle. | team run, member identity, agent run | `TeamRun` and member `AgentRun` | routing, task instance identity |
| DS-003 | Runtime source batches enter the run queue, processors derive final events, then the lifecycle finalizer adds ordered status companions before listeners. | source event, final event, status | `AgentRun` | mapper, content batching |
| DS-004 | A task-team handle derives `TaskTeamStreamScope` in its immediate parent frame. Each outer ordinary boundary passes every live event type and initial snapshot through `prefixMixedTeamStreamScope`, rebasing source and logical-team paths together; agent adapters rebase member paths with the same private rule. The shared flattener then computes one nonempty relative leaf selector for live and reconnect. | leaf agent, parent-frame stream scope, scoped snapshot/event | mixed-team bridge | path/key rebasing, strict leaf validation |
| DS-005 | One discriminated policy resolves Send/Stop/Disabled for every trigger and the store rechecks immediately before executing. | draft, agent status, action | primary-action policy | upload/pending state |
| DS-006 | One current/anonymous/retired-turn state reconciles command facts, fresh runtime evidence, and ordered events; late content renders without lifecycle rollback. | current turn, retired turns | run-owned lifecycle state | terminal classification |
| DS-007 | A listener binds first, then `AgentRun` reconciles a fresh backend lifecycle snapshot inside its queue and sends the canonical result. | agent snapshot | `AgentRun` | history/live precedence |
| DS-008 | Manager registration is created/restored once, queried for history/resume, and removed once after accepted termination or detected backend death. The same owner notifies live subscribers with one binary fact. | root team run | `AgentTeamRunManager` | GraphQL mapper, socket session |
| DS-009 | Awaited local events join runtime events before processors/finalization; no caller performs listener fanout or status pairing. | local agent event | `AgentRun` | producer-specific persistence |
| DS-010 | Definition groups retain a representative only for definition metadata/avatar needs. Run rows read `isActive` for actions but render no team status. | definition, root team run | workspace history projection | accessibility text |
| DS-011 | Task terminal events and task-record refresh remove task projections; explicit operation results and leaf-agent terminal failures report failures. No team enum mediates them. | task, operation, failure | task/failure owners | scheduling and toast state |
| DS-012 | Settlement asks task delegation whether records remain open and asks the child team run whether execution work remains; it settles only when both are false. | child team execution | `TeamRun` backend + settlement coordinator | task directories |

## Spine Actors / Main-Line Nodes

- Agent: composer, primary-action policy, frontend stores, stream service, `AgentRun`, lifecycle state/finalizer, runtime backend/provider.
- Team member: exact team command boundary, mixed leaf member handle, nested `AgentRun`, team event identity bridge, leaf context resolver.
- Root team liveness: GraphQL mutation/history/resume, `AgentTeamRunManager`, team WebSocket lifecycle binding, `AgentTeamContext.isActive`, Stop policy.
- Former aggregate consumers: task-delegation event/record projection, `AgentRunCanonicalFailureObserver`, `TeamRun.hasOpenExecutionWork()`, settlement coordinator.

## Ownership Map

- **`AgentRun`:** Sole agent command, event, lifecycle, snapshot, and subscriber owner; preserved from `SR-002`.
- **`AgentTurnLifecycleState`:** Internal current/retired-turn state and precedence; never a transport/public owner.
- **Runtime backend:** Provider control plus neutral source batches and internal lifecycle snapshot; never final public dispatch.
- **`AgentTeamRunManager`:** Root team registration, fresh liveness check, idempotent unregistration, and root lifecycle subscribers.
- **`TeamRun`:** Thin exact-team command/event facade and private open-execution-work facade; no aggregate status cache.
- **`MixedTeamManager`:** Member orchestration, recursive leaf status snapshot collection, and private execution-work predicate; no public root lifecycle.
- **Leaf mixed member handle:** One `TeamLeafAgentStatusSnapshot` with required agent/member/source identity and exact agent operations; task-agent fields remain in the canonical payload.
- **Subteam handle:** Child-run orchestration; recursively prefixes child live events and snapshots while rebasing any retained `TaskTeamStreamScope` into the parent frame; never returns an agent-like status for the team node.
- **Task-team handle:** Child-run orchestration; derives one tight `TaskTeamStreamScope` from its operational `TaskTeamInstanceIdentity` in the immediate parent frame and supplies that same override to live/snapshot adapters; owns no five-state team status.
- **Task delegation subsystem:** Task stage, terminal state, records, and task projection reconciliation.
- **Frontend `AgentTeamContext`:** Root `isActive`, connection `isSubscribed`, focus, topology, and leaf contexts as separate fields.
- **Workspace projection:** Definition grouping and action presentation; no lifecycle authority.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL team create/restore/terminate/history/resume | `AgentTeamRunManager` / history service | Public request/query transport | Status aggregation or optimistic liveness truth |
| Team WebSocket handler | `AgentTeamRunManager` + exact `TeamRun` | Live root lifecycle and member-event transport | Member lifecycle, socket-derived liveness, task stage |
| `TeamRun` | manager/backend owners | Stable command/event boundary | Root registration or aggregate status cache |
| frontend team run store | GraphQL/manager fact | UI orchestration and cleanup | Deriving `isActive` from context/socket/member state |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `team-status-payload.ts`, `team-status-aggregation.ts` | Public team aggregate removed | Manager binary liveness; private work predicate | In This Change | Delete tests that only validate aggregation |
| `TeamRun.statusOverride/getStatusSnapshot/observeBackendEvent` | Duplicate/cached aggregate owner | manager snapshot; leaf snapshot API | In This Change | No alias |
| `TeamManager`/backend `getStatusSnapshot` | Forces aggregate on all team backends | `getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[]`, `hasOpenExecutionWork` | In This Change | Specialize responsibility |
| `TeamRunEventSourceType.TEAM` and `TeamRunStatusUpdateData` | Conflates root/nested concerns | manager `TEAM_RUN_LIFECYCLE`; task/failure facts | In This Change | No nested five-state replacement |
| `publishTeamStatusIfChanged`, `lastTeamStatus`, `rootOfflinePublished` | Aggregate/dedup machinery | manager registration lifecycle | In This Change | Member events continue normally |
| Team portions of `TeamCommandStatusOverlayStore` and team command-status builders | Teams no longer present agent status | operation result; member-only overlay | In This Change | Rename store/file if only member concern remains |
| Pseudo subteam/task-team `getStatusSnapshot()` | Makes a team look like an agent and cannot carry task-team leaf scope | recursive scoped leaf snapshots + private work predicate | In This Change | Tighten handle interfaces; no plain payload array |
| `TeamRunStatusProjectionService.status` | Duplicates `isActive` | activity/member projection | In This Change | Rename to `TeamRunLiveProjectionService` |
| GraphQL root team history `status` | No public meaning | `isActive`; `members[].status` | In This Change | Regenerate client types |
| WebSocket `TEAM_STATUS` protocol/handler | Aggregate contract removed | `TEAM_RUN_LIFECYCLE`; leaf `AGENT_STATUS` | In This Change | No compatibility parsing |
| frontend `AgentTeamStatus` and team `currentStatus` fields | Parallel authority | root `isActive`; leaf `AgentStatus` | In This Change | Remove imports/tests/fixtures |
| team-status hydration/normalization and status-to-active helpers | Circular conversion | direct `isActive` application | In This Change | Keep agent normalization |
| definition/run team dots, `TeamStatusDisplay`, `useTeamStatusVisuals`, team dot utilities | Wrong subject/presentation | no badge; optional Active/Inactive text | In This Change | Remove obsolete localization keys |
| task-team cleanup on offline `TEAM_STATUS` | Task stage disguised as lifecycle | terminal task event + record reconciliation | In This Change | No timer/status fallback |
| root aggregate-error branch in team lifecycle observer | Duplicate failure inference | canonical leaf-agent failure + explicit operation result | In This Change | Preserve ATTACHED/TERMINATED |
| one-second inactive polling in team lifecycle observer | Polls a fact the manager owns | manager lifecycle subscription | In This Change | Exact unregister notification emits TERMINATED |
| settlement fallback `childRun.getStatusSnapshot()` | Public enum used internally | `childRun.hasOpenExecutionWork()` | In This Change | Preserve error-as-work-blocking semantics |

## Return Or Event Spine(s) (If Applicable)

- **Agent standalone:** `provider/local source -> AgentRun queue -> processors -> lifecycle finalizer -> AGENT_STATUS companion + final event -> mapper -> socket -> agent state/rendering`.
- **Agent in team, live:** `nested AgentRun final sequence -> TeamRunAgentEventPayload + TaskTeamStreamScope -> prefixMixedTeamStreamScope at each ordinary/task boundary -> root-frame TeamRun event -> shared task-team flattener -> socket -> exact leaf resolver -> agent state/rendering`.
- **Agent in team, initial/reconnect:** `nested AgentRun canonical snapshot -> TeamLeafAgentStatusSnapshot + TaskTeamStreamScope -> same prefixMixedTeamStreamScope at each boundary -> root-frame snapshot mapper + same flattener -> AGENT_STATUS -> same exact leaf resolver`.
- **Root team lifecycle:** `manager register/unregister/stale-backend cleanup -> manager lifecycle listener -> TEAM_RUN_LIFECYCLE -> team context isActive -> Stop/inactive actions`.
- **Team initial convergence:** `bind TeamRun event listener + manager lifecycle listener -> fresh manager snapshot -> recursively scoped leaf snapshots mapped to AGENT_STATUS + root lifecycle snapshot -> frontend`.
- **Task cleanup:** `TASK_DELEGATION_TERMINAL_STATUS / record refresh -> task projection reconciler -> remove transient task-team projection`.
- **Observed lifecycle:** `manager lifecycle false -> observed TEAM_RUN TERMINATED`; `leaf AgentRun terminal failure -> team envelope -> AgentRunCanonicalFailureObserver -> observed TEAM_RUN FAILED`; command/mutation failure remains its returned operation result. The current one-second inactive poll and aggregate-error branch are removed.

## Bounded Local / Internal Spines (If Applicable)

- **DS-006, parent `AgentRun`:** `enqueue -> fresh runtime evidence -> reconcile current/retired turn -> processors -> lifecycle finalizer -> ordered listener delivery`.
- **DS-008, parent `AgentTeamRunManager`:** `register/get/terminate/stale-check -> one transition helper -> update activeRuns -> notify exact-run lifecycle listeners`. Notifications occur only when the registered boolean changes.
- **DS-012, parent `MixedTeamManager`:** `enumerate live member handles -> leaf agent status work-blocking check OR recursive child work -> boolean`. Work-blocking agent status is `initializing | running | error`; `idle | offline` is closed. Active task-agent/task-team directories and task-delegation records remain separate explicit checks.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Provider lifecycle projector | DS-001, DS-003, DS-006, DS-007 | `AgentRun` | Normalize provider phase/current turn | Runtime differences are real | Provider semantics leak into UI |
| Team identity rebasing | DS-002, DS-004 | mixed-team bridge | Keep event/snapshot teamRunId, source/member paths, and task-team logical path in one parent frame for live and initial paths | Exact targeting/nesting | Wrong/root task-team node updated; reconnect throws |
| Manager lifecycle broadcaster | DS-008 | `AgentTeamRunManager` | Notify exact-run active transition | Live clients need convergence | Socket close becomes false liveness |
| Scoped leaf snapshot carrier/prefixer | DS-004 | mixed team runtime | Compose canonical leaf status with ordinary/task-team stream scope, then rebase it exactly like every live event | Reconnect at nested/task-team depth | Scope is lost or uses a different coordinate frame |
| Content presentation scheduler | DS-003, DS-004 | streaming UI | Preserve batching while status applies immediately | Performance | Status pairing destroys batching |
| stopPending map | DS-008 | UI action caller | Prevent duplicate mutation | Local idempotency UX | Becomes a second lifecycle owner |
| Task record refresh/projection | DS-011 | task delegation | Reconcile transient task nodes | Task business truth | Task stage becomes team status |
| Failure observer | DS-011 | observed run lifecycle | Promote canonical leaf terminal failure | Operational visibility | Member error folded into team status |
| Open-work predicate | DS-012 | settlement | Decide whether execution can settle | Internal safety | Public enum recreated |

## Ownership Boundaries

`AgentRun` remains the authoritative agent boundary; local producers and runtime backends cannot emit directly to public listeners. `AgentTeamRunManager` becomes the authoritative root-team liveness boundary; GraphQL, history, resume, WebSocket, and frontend actions must not inspect both manager registration and member/backend internals to decide public activity.

`TeamRun` may expose `isActive()` internally to its manager and child handles, but only the root manager determines the public root fact. `MixedTeamManager.hasOpenExecutionWork()` is an internal settlement capability, not a lifecycle projection. Task-delegation stage and explicit operation failures remain in their existing domains.

The frontend may own connection state and request-pending state, but neither may mutate `isActive`. Only server create/restore/history/resume/lifecycle/termination success applies that field. Leaf `AGENT_STATUS` can mutate only the matched leaf agent context.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentRun` | queue, lifecycle state, processors/finalizer, backend evidence | commands, streams, local producers | backend listener/direct dispatch/status override | Extend `AgentRun` named methods |
| `AgentTeamRunManager.getLifecycleSnapshot/subscribeToLifecycle` | active map, backend live validation, transition notification | history/resume/socket/liveness reads | member aggregate, socket presence, raw map access | Extend manager lifecycle API |
| `TeamRun.getLeafAgentStatusSnapshots` | backend recursive `TeamLeafAgentStatusSnapshot` collection | stream/history live projection | subteam `AgentStatusPayload` or plain `AgentStatusPayload[]` that drops task-team scope | Extend the scoped leaf snapshot carrier, not `AgentStatusPayload` |
| `prefixMixedTeamStreamScope` | one mixed-team parent-frame transition | all live event adapters and initial leaf snapshot adapter | leaf-only prefix logic, cloned child-local scope, or mapper/frontend guessing | Extend this core and its invariants |
| `TeamRun.hasOpenExecutionWork` | backend member/child predicate | settlement coordinator | `getStatusSnapshot().status` | Extend private execution-work capability |
| task delegation projection | terminal event + record reconciliation | frontend task router | TEAM_STATUS offline cleanup | Extend task event/record mapper |

## Dependency Rules

- Runtime backends -> source batches/internal lifecycle evidence -> `AgentRun`; never public listeners.
- `AgentRun` -> canonical agent events/status; team code wraps but never recalculates them.
- Team history/resume/WebSocket -> `AgentTeamRunManager` lifecycle API; never `deriveTeamApiStatus` or frontend context membership.
- `AgentTeamRunManager` may call `TeamRun.isActive()` to validate a registration; callers receive only manager-owned binary lifecycle.
- `MixedTeamManager` may query scoped leaf-agent snapshots and child private work predicates; it must not construct a team `AgentStatusPayload`. The task-team handle derives a parent-frame `TaskTeamStreamScope`; every outer recursive boundary rebases that scope instead of cloning child-local coordinates.
- Team lifecycle transport contains only exact `team_run_id` and `is_active`; no member state, phase, error, interrupt permission, or socket state.
- Leaf status transport retains exact route/path/run/task identity. Every live event type and every initial snapshot must call `prefixMixedTeamStreamScope`; live agent/snapshot mapping must call the same strict leaf validator and `buildTaskTeamScopedIdentityPayload`. No other layer may prefix or infer task-team scope.
- Task projection depends on task events/records; failure observation depends on canonical agent failure/operation results; settlement depends on private work facts.
- Frontend team action code depends on `isActive` and stopPending only. Archive/delete additionally use existing inactive history lifecycle flags.

Forbidden shortcuts: status-to-active conversion, activity-to-status conversion, representative-child status on definitions, `context exists -> active`, `socket connected -> active`, root false writing member statuses, a compatibility `AgentTeamStatus`, a replacement public “team phase” enum, mapper/frontend scope guessing, or carrying a full operational `TaskTeamInstanceIdentity` as the outward stream coordinate.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentStatusPayload { status, ...identity }` | exact agent run | Canonical five-state snapshot/companion | agent/member/task-agent fields only | Already implemented; no `can_interrupt`; no task-team fields added |
| `TaskTeamStreamScope` | one task-team execution as seen from the enclosing `teamRunId` | Carry only IDs and logical-team route/path needed for outward scoping | task-team run/instance/task IDs + logical-team path/key in parent frame | Derived from operational identity; excludes ingress/coordinator-local selectors |
| `TeamLeafAgentStatusSnapshot` | one leaf execution in a team snapshot | Compose canonical payload with exact recursive team scope | discriminated `ordinary_member` or `task_team_member` | Internal team contract; concrete shape below |
| `AgentTeamRunManager.getLifecycleSnapshot(teamRunId)` | root team run | Fresh `{ teamRunId, isActive }` | exact root `teamRunId` | Validates backend before true |
| `AgentTeamRunManager.subscribeToLifecycle(teamRunId, listener)` | root team run | Idempotent active transition stream | exact root `teamRunId` | Independent of TeamRun event listeners |
| `TEAM_RUN_LIFECYCLE` | root team run | Wire `{ team_run_id, is_active }` | socket run identity + payload ID | Root only; no source path/status |
| `buildTaskTeamStreamScope(taskTeamInstance, parentTeamRunId)` | task-team activation boundary | Derive the tight scope in its immediate parent frame | full operational identity + exact parent ID | Validates immutable parent ID and path/key consistency once |
| `prefixMixedTeamStreamScope(input)` | one live/snapshot parent transition | Prefix source path and retained task-team logical path once; accept a target-frame override | parent run ID, source prefix, child stream scope, optional target-frame scope | Shared by every live event type and initial snapshot adapter |
| `buildTaskTeamScopedIdentityPayload(scope)` | task-team wire identity | Flatten task-team IDs/logical-team/relative identity without rebasing | already-consistent source path + `TaskTeamStreamScope` | Shared by live event and initial snapshot mapping; no fallback |
| `TeamRun.getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[]` | leaf agents in a team | Recursive exact snapshots | team boundary + required leaf identity + discriminated scope | No subteam pseudo snapshot or plain payload array |
| `TeamRunBackend.getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[]` | backend leaf projection | Expose backend-owned recursive carrier | same | `TeamManager` has the same signature |
| `MixedTeamMemberHandle.getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[]` | one agent/subteam member subtree | Agent returns one; subteam recursively rebases | same | Task-team handle stamps the tight target-frame stream scope |
| `mapTeamLeafAgentStatusSnapshot(snapshot)` | initial team stream | Produce `AGENT_STATUS` with the live mapper's identity fields/order | one scoped snapshot | Calls shared flattener; outer task-team `task_id` wins as in live mapping |
| `TeamRun.hasOpenExecutionWork()` | private team execution | Settlement-safe boolean | exact in-memory child `TeamRun` | Not GraphQL/WebSocket/frontend |
| `TeamRunHistoryItem` GraphQL | root team history | History metadata + isActive + member statuses | exact root/team/member IDs | Root `status` removed |
| frontend `AgentTeamContext` | opened team context | `isActive`, connection, focus, topology | exact `teamRunId` | No `currentStatus` |
| `terminateTeamRun(teamRunId): Promise<boolean>` | root team operation | Return accepted success/failure | exact root `teamRunId` | Caller must handle false and clear pending |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentStatusPayload` | Yes | Yes for its agent subject | Low | Preserve; do not add task-team fields |
| `TaskTeamStreamScope` | Yes | Yes | Low | Every path is explicitly relative to enclosing `teamRunId`; exclude operational local selectors |
| `TeamLeafAgentStatusSnapshot` | Yes | Yes | Low | Use required leaf payload plus discriminated scope |
| manager lifecycle API | Yes | Yes | Low | New exact-run listener/snapshot |
| `TEAM_RUN_LIFECYCLE` | Yes | Yes | Low | No nested/source-path overload |
| leaf snapshot API | Yes | Yes | Low | Return the scoped carrier and use the shared prefix/flatten functions |
| open-work API | Yes | Yes | Low | Keep private and boolean |
| frontend team context | Yes | Yes | Low | Remove aggregate and connection inference |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Agent runtime lifecycle | `AgentStatus` | Yes | Low | Preserve |
| Root registered team execution | `TeamRunLifecycleSnapshot` / `isActive` | Yes | Low | Avoid `TeamStatus` |
| Leaf runtime collection | `getLeafAgentStatusSnapshots` | Yes | Low | Replace generic member/team snapshot name |
| Scoped leaf carrier | `TeamLeafAgentStatusSnapshot` | Yes | Low | Keep team scope composed outside canonical agent payload |
| Scoped task-team projection | `TaskTeamStreamScope` | Yes | Low | Name distinguishes outward parent-frame scope from operational instance identity |
| Shared rebasing | `prefixMixedTeamStreamScope` | Yes | Low | Use for all live event types and initial snapshots |
| Settlement predicate | `hasOpenExecutionWork` | Yes | Low | Do not call it status |
| UI duplicate guard | `stopPending` / `terminatingTeamIds` | Yes | Low | Do not call active/terminating lifecycle |
| Definition group | `WorkspaceHistoryTeamDefinitionDisplayGroup` | Yes | Low | Remove `status` field |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Agent lifecycle/gateway | agent execution lifecycle/pipeline | Reuse | Already implemented and reviewed | N/A |
| Root liveness | `AgentTeamRunManager` active registry | Extend | It already owns the fact | N/A |
| Live binary delivery | existing team WebSocket handler | Extend | Same exact root session | N/A |
| Leaf nested status | mixed member bridge/snapshot service | Extend | Existing identity owner | N/A |
| Task cleanup | task delegation projection/records | Extend | Owns task stage and terminality | N/A |
| Team failure | canonical agent failure observer + operation results | Reuse | Existing explicit facts | N/A |
| Settlement | existing coordinator/team backend | Extend | Existing decision owner | N/A |
| Team visuals | workspace/mobile presentation | Simplify | Remove rather than replace | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent execution | status-only lifecycle and companions | DS-001–DS-007, DS-009 | `AgentRun` | Reuse | Preserve current branch implementation |
| Team execution domain | exact member routing, leaf snapshots, private work | DS-002, DS-004, DS-012 | `TeamRun`/Mixed manager | Refactor | Remove aggregate |
| Team run management | root registration/lifecycle | DS-008 | `AgentTeamRunManager` | Extend | Binary only |
| Team streaming | member events + root lifecycle transport | DS-004, DS-008 | stream handler | Refactor | Delete TEAM_STATUS |
| Run history GraphQL | root activity/member snapshot projection | DS-008 | history service | Refactor | Remove root status |
| Task delegation | task stage/terminal cleanup | DS-011, DS-012 | task service/coordinator | Extend | No team enum |
| Frontend runtime state | team isActive + leaf agent statuses | DS-004, DS-008 | stores/context | Refactor | Remove circular conversions |
| Workspace/mobile UI | no definition/root status; binary action/text | DS-010 | presentation components | Simplify | Agent visuals remain |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-team-run-manager.ts` | team management | manager | active transition and listeners | Co-located with map mutation | lifecycle snapshot type |
| `team-run-lifecycle.ts` | team domain | manager contract | binary internal/wire-neutral type | Shared across manager/stream tests | Yes |
| `task-team-stream-scope.ts` | team domain | outward task-team scope contract | execution IDs plus parent-frame logical-team path/key | Separates stream coordinates from operational identity | `TaskTeamInstanceIdentity` input only |
| `team-leaf-agent-status-snapshot.ts` | team domain | scoped snapshot contract | required leaf payload plus ordinary/task-team stream scope | One tight recursive leaf identity type | canonical agent payload + stream scope |
| `team-run.ts` / backend interfaces | team execution | facade/backend | scoped leaf snapshots and private work | Natural team capabilities | scoped snapshot carrier |
| mixed member handles | mixed execution | specialized handles | leaf factory vs ordinary/task-team child recursion | Different runtime subjects | scoped carrier + prefix helper |
| `team-runtime-status-snapshot-service.ts` renamed | streaming | snapshot boundary | scoped leaf agent + root lifecycle initial messages | One initial convergence batch | lifecycle DTO + snapshot mapper |
| `team-stream-agent-identity-payload.ts` | streaming | live/initial identity flattener | consistent task-team stream scope to wire fields | One wire identity rule | `TaskTeamStreamScope` |
| team history projection service renamed | history | projection | isActive + leaf snapshots | One list projection | lifecycle snapshot |
| frontend protocol/context/history types | frontend state | contract | remove aggregate; add lifecycle message | Contract/state owners | isActive boolean |
| workspace/mobile presentation files | UI | display | no team status/dots; direct actions | Existing surfaces | agent status visuals only |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| root team binary lifecycle | `team-run-lifecycle.ts` | team management/domain | manager, stream, tests share exact shape | Yes | Yes | task/member phase DTO |
| task-team outward scope | `task-team-stream-scope.ts` | team domain | live events and snapshots need the same minimal execution/logical-team coordinates | Yes | Yes | full operational identity or wire DTO |
| recursive all-event/live/snapshot rebasing | `mixed-team-event-bridge.ts` | mixed team bridge | all path-bearing stream scope must change frames together | Yes | Yes | leaf-only or snapshot-only path mapper |
| live/initial task-team wire fields | `team-stream-agent-identity-payload.ts` | team streaming | both mapper paths must flatten the same envelope | Yes | Yes | generic team status mapper |
| agent status visuals | existing `workspaceStatusDotPresentation.ts` | frontend presentation | agent rows share it | Yes | Yes | team aggregate visuals |
| task terminal cleanup policy | existing task execution router/projection | task delegation | all task terminal messages reconcile once | Yes | Yes | root lifecycle handler |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentStatusPayload` | Yes | Yes | Low | Preserve current implementation |
| `TeamLeafAgentStatusPayload` | Yes | Yes | Low | Require actual leaf run/name/member/source identity; do not make fields optional |
| `TaskTeamStreamScope` | Yes | Yes | Low | Only stream-required IDs and one parent-frame logical-team path/key |
| `TeamLeafAgentStatusSnapshot` | Yes | Yes | Low | Discriminate ordinary member from required coordinate-consistent stream scope |
| `TeamRunLifecycleSnapshot { teamRunId, isActive }` | Yes | Yes | Low | No status/error/socket fields |
| `AgentTeamContext` | Yes | Yes | Low | `isActive` and `isSubscribed` remain explicitly separate |
| team history item | Yes | Yes | Low | Root has isActive; leaf member has status |
| team member node/row unions | Yes | Yes | Low | Put agent status only on agent specialization; team nodes carry no five-state field |
| open-work result | Yes | Yes | Low | Private boolean only; no public serialization |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | team management | manager | register/validate/unregister and lifecycle subscribers | Only writer of root activity | lifecycle type |
| `.../domain/team-run-lifecycle.ts` | team domain | lifecycle contract | binary snapshot/listener type | Tight reusable contract | N/A |
| `.../domain/task-team-stream-scope.ts` | team domain | outward scope contract | build/clone tight task-team IDs + parent-frame logical-team coordinates | Prevents operational/local fields leaking into stream scope | `TaskTeamInstanceIdentity` as builder input |
| `.../domain/team-leaf-agent-status-snapshot.ts` | team domain | recursive snapshot contract | discriminated ordinary/task-team carrier around required leaf payload | Keeps scope out of canonical agent DTO | `AgentStatusPayload`, `TaskTeamStreamScope` |
| `.../domain/team-run.ts`, `.../backends/team-run-backend.ts`, `team-manager.ts` | team execution | facade/backend | scoped leaf snapshots/private work; delete aggregate | Contract trio | snapshot carrier |
| `.../backends/mixed/mixed-team-manager.ts` | mixed runtime | manager | collect leaf snapshots and compute work | Owns live handles | specialized handles |
| `.../backends/mixed/members/*` | mixed runtime | handle | leaf agent vs child team specialization | Runtime-subject boundary | prefix helper |
| `.../backends/mixed/events/mixed-team-event-bridge.ts` | team bridge | identity rebaser | one `prefixMixedTeamStreamScope` core for every live event type and nested leaf snapshot | One coordinate transition rule | stream scope + snapshot carrier |
| `.../services/team-command-status-overlay-store.ts` | member command projection | member overlay | member-only pre-run status | Remove team maps/methods | agent payload |
| `.../task-delegation/task-team-settlement-coordinator.ts` | task delegation | settlement | call explicit work facts | Existing owner | TeamRun method |
| `.../services/team-run-service.ts` | lifecycle observation | service | leaf canonical failure + explicit termination | Existing observer | failure observer |
| `autobyteus-server-ts/src/services/agent-streaming/team-stream-agent-identity-payload.ts` | transport | strict identity flattener | one no-rebase task-team wire projection and leaf validator for live/initial paths | Prevents mapping drift/fallback guesses | `TaskTeamStreamScope` |
| `autobyteus-server-ts/src/services/agent-streaming/*team*` | transport | stream | root lifecycle and scoped leaf member events/snapshots | Existing team socket | lifecycle/agent DTOs |
| `.../run-history/services/team-run-live-projection-service.ts` | history | projection | isActive + leaf snapshots | Renamed coherent scope | manager/team APIs |
| `.../api/graphql/types/run-history.ts` | GraphQL | schema | remove root status | Public query contract | isActive/member status |
| `autobyteus-web/types/agent/AgentTeamContext.ts` | frontend state | context contract | isActive, subscription, topology, specialized nodes | Exact UI model | AgentContext |
| `autobyteus-web/stores/runHistoryTypes.ts` | frontend history | read model | no root status; specialized member rows | Exact query model | agent status/isActive |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` + protocol | frontend transport | stream | lifecycle handler and exact leaf status | Existing socket client | DTOs |
| `autobyteus-web/stores/agentTeamRunStore.ts` + history/open/recovery | frontend orchestration | store | direct activity application, cleanup | Existing lifecycle callers | isActive |
| workspace/running/team/mobile components and composables | presentation | UI | remove team status and use direct actions/text | Existing surfaces | agent visuals |

## Applied Patterns (If Any)

- **Single authoritative boundary:** `AgentRun` for agent lifecycle; `AgentTeamRunManager` for root team liveness.
- **Schema contraction:** Remove overlapping team status rather than deprecating it.
- **Discriminated specialization:** Agent member shapes own `AgentStatus`; team member shapes do not.
- **Event plus fresh snapshot:** Bind lifecycle listener then read manager state for race-free live convergence.
- **Explicit domain predicates:** Private `hasOpenExecutionWork` replaces a public enum used as a proxy.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/**` | Folder | `AgentRun` | Preserve implemented five-state gateway/finalizer | Agent domain | Team aggregate |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-lifecycle.ts` | File/New | manager contract | `{teamRunId,isActive}` and listener | Team domain | member/task/status enum |
| `autobyteus-server-ts/src/agent-team-execution/domain/task-team-stream-scope.ts` | File/New | team outward identity | tight scope builder/clone and parent-frame invariants | Stream scope is team-domain identity, not mapper inference | operational ingress/coordinator selectors or wire snake_case |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-leaf-agent-status-snapshot.ts` | File/Change | team snapshot contract | required leaf payload plus discriminated ordinary/task-team stream scope | Team recursion owns the envelope | full task-team operational identity or optional task-team fields on `AgentStatusPayload` |
| `.../services/agent-team-run-manager.ts` | File/Change | root liveness owner | lifecycle snapshot/subscription and idempotent transition | Active registry lives here | aggregate derivation |
| `.../domain/team-run.ts` | File/Change | team facade | leaf snapshots/private work; no status override | Existing exact run boundary | root registration cache |
| `.../domain/team-run-event.ts` | File/Change | team event contract | AGENT/TASK/COMMUNICATION/MEMBER_INPUT + optional tight `taskTeamScope` | Team-run outward event domain | TEAM status source or full operational task-team identity |
| `.../domain/team-status-payload.ts` | File/Delete | N/A | Remove | Obsolete | N/A |
| `.../domain/team-status-aggregation.ts` | File/Delete | N/A | Remove | Obsolete | N/A |
| `.../backends/{team-run-backend.ts,team-manager.ts}` | Files/Change | backend contract | scoped leaf snapshots and work predicate | Backend capabilities | aggregate or plain payload snapshot |
| `.../backends/mixed/**` | Folder/Change | mixed runtime | specialize handles, derive/rebase stream scope, recursive leaf status/work | Owns member topology/boundary | pseudo team status, cloned child-local scope, or split prefix logic |
| `.../services/team-command-status-overlay-store.ts` and `team-member-command-start-status-events.ts` | Files/Change/Rename if useful | member startup | member-only overlay/events | Still needed before leaf run exists | team status maps/builders |
| `.../task-delegation/task-team-settlement-coordinator.ts` | File/Change | settlement | explicit work checks | Existing owner | team status normalization |
| `autobyteus-server-ts/src/services/agent-streaming/team-stream-agent-identity-payload.ts` | File/Change | transport identity | shared task-team flattening, strict live/snapshot leaf validation | Wire mapping belongs at transport boundary | prefix/rebase fallback or independent relative-path rules |
| `autobyteus-server-ts/src/services/agent-streaming/{models.ts,agent-team-stream-handler.ts,team-run-event-websocket-message-mapper.ts,team-runtime-status-snapshot-service.ts}` | Files/Change/Rename snapshot service | transport | `TEAM_RUN_LIFECYCLE`, mapped scoped leaf snapshots, no TEAM_STATUS | Existing team stream | aggregate logic or early carrier unwrapping |
| `autobyteus-server-ts/src/run-history/services/team-run-status-projection-service.ts` | File/Rename | history live projection | isActive + member snapshots | Name must match scope | root status |
| `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` and GraphQL history type | Files/Change | history contract | drop root status | Existing projection/schema | status-to-active |
| `autobyteus-web/types/agent/AgentTeamStatus.ts` | File/Delete | N/A | Remove | Obsolete | N/A |
| `autobyteus-web/types/agent/AgentTeamContext.ts`, `stores/runHistoryTypes.ts` | Files/Change | state models | root isActive; specialized agent/team nodes | Canonical frontend models | team currentStatus |
| `autobyteus-web/services/agentStreaming/{protocol/messageTypes.ts,TeamStreamingService.ts,handlers/teamHandler.ts}` | Files/Change | client stream | lifecycle boolean and leaf status | Existing transport | TEAM_STATUS compatibility |
| `autobyteus-web/services/runHydration/**`, `runOpen/**`, `runRecovery/**`, history stores/helpers | Folder/Change | state convergence | direct isActive and member hydration | Existing convergence owners | synthetic team status |
| `autobyteus-web/components/workspace/**`, `composables/mobile/useMobileWorkCatalog.ts` | Folder/Change | presentation/actions | no definition/root status, direct Stop, binary text | Existing UI surfaces | team five-state visuals |
| `autobyteus-web/components/workspace/team/TeamStatusDisplay.vue`, `composables/useTeamStatusVisuals.ts` | Files/Delete | N/A | Remove | Unused/obsolete | N/A |
| `autobyteus-web/components/workspace/common/StatusDot.vue`, `utils/workspaceStatusDotPresentation.ts` | Files/Change | agent visuals | agent-only dots | Status belongs to agent | team kind/branches |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-execution` | Main-Line Domain-Control | Yes | Low | Preserve reviewed owner |
| `agent-team-execution/domain` | Main-Line Domain-Control | Yes | Low | Binary lifecycle, exact team facade, recursive leaf carrier, and tight outward task-team scope; operational task identity remains separate |
| `agent-team-execution/backends/mixed` | Persistence-Provider/runtime | Yes | Medium | Specialize handle interfaces and centralize one all-event/live/snapshot coordinate-frame transition in the existing bridge |
| `services/agent-streaming` | Transport | Yes | Low | Mapping only, no lifecycle derivation |
| `run-history/services` | Off-Spine projection | Yes | Low | Manager read + member snapshot projection |
| frontend stores/services | Mixed Justified | Yes | Medium | Keep contract, convergence, and presentation responsibilities in their existing areas; remove conversions |

## Recursively Scoped Leaf-Agent Contract And Coordinate Frame (`ARCH-FIND-003`, `CODE-FIND-002`)

### Tight task-team stream scope

Keep operational `TaskTeamInstanceIdentity` unchanged for task activation, active-run directories, persistence, token/memory scope, ingress selection, coordinator selection, and delivery. Do not carry that broad object through outward live/snapshot stream recursion. Add this tight derived type in `autobyteus-server-ts/src/agent-team-execution/domain/task-team-stream-scope.ts`:

```ts
export type TaskTeamStreamScope = {
  taskTeamRunId: string;
  taskTeamInstanceId: string;
  taskId: string;
  logicalTeamPath: string[];
  logicalTeamRouteKey: string;
};

export function buildTaskTeamStreamScope(input: {
  taskTeamInstance: TaskTeamInstanceIdentity;
  parentTeamRunId: string;
}): TaskTeamStreamScope;

export function cloneTaskTeamStreamScope(
  scope: TaskTeamStreamScope,
): TaskTeamStreamScope;
```

`buildTaskTeamStreamScope` validates that `taskTeamInstance.parentTeamRunId === parentTeamRunId`, normalizes nonblank IDs/path segments, copies `logicalTeam.memberPath`, and rebuilds `logicalTeamRouteKey` from that path. The result is therefore in the immediate parent `TeamRun` frame at the moment a `MixedTaskTeamMemberHandle` is created. It deliberately excludes:

- `parentTeamRunId`, which is immutable operational launch ownership rather than the mutable outward coordinate frame;
- `ingress.memberPath/memberRouteKey`, which are task-team-local operational selectors;
- `coordinatorMemberRouteKey`, which is likewise local to the task-team definition;
- template/definition/descriptive fields not used to resolve an outward message.

This is not a second lifecycle or public team status. It is the minimum internal execution/scope identity needed to flatten the existing task-team wire fields.

### Tight recursive leaf carrier

Keep `AgentStatusPayload` unchanged. Update the team-owned composition in `team-leaf-agent-status-snapshot.ts`:

```ts
export type TeamLeafAgentStatusPayload = AgentStatusPayload & {
  agent_id: string;
  agent_name: string;
  member_route_key: string;
  member_path: string[];
  source_route_key: string;
  source_path: string[];
};

type OrdinaryTeamLeafAgentStatusSnapshot = {
  scopeKind: "ordinary_member";
  teamRunId: string;
  payload: TeamLeafAgentStatusPayload;
};

type TaskTeamLeafAgentStatusSnapshot = {
  scopeKind: "task_team_member";
  teamRunId: string;
  payload: TeamLeafAgentStatusPayload;
  taskTeamScope: TaskTeamStreamScope;
};

export type TeamLeafAgentStatusSnapshot =
  | OrdinaryTeamLeafAgentStatusSnapshot
  | TaskTeamLeafAgentStatusSnapshot;
```

Update `TeamRunEvent` in `team-run-event.ts` in the same clean cut: replace the broad optional `taskTeamInstance` outward marker with `taskTeamScope?: TaskTeamStreamScope | null`. The wire contract does not change; this is an internal carrier correction.

Coordinate invariant for every live event or initial leaf snapshot:

```text
carrier.teamRunId
  == coordinate frame for sourcePath/source_path
  == coordinate frame for agent memberPath/member_path
  == coordinate frame for taskTeamScope.logicalTeamPath (when present)
```

Additional invariants:

- Every route key is rebuilt from the path returned in that same frame; no caller keeps a pre-prefix key.
- A `task_team_member` snapshot requires `taskTeamScope`; an ordinary snapshot forbids it.
- A task-team leaf requires `source_path` to start with `logicalTeamPath` and contain at least one additional relative member segment.
- Task-agent identity remains in the existing optional `task_agent_instance_id`, `task_agent_run_id`, and payload `task_id` fields. Outer task-team `taskId` still wins the single public `task_id` during stream flattening.
- Invalid scope fails at the mixed-team/stream invariant boundary. It is never downgraded to ordinary scope, task-team-root scope, or pseudo team status.

### One shared all-event/live/snapshot rebasing core

Replace leaf-only `prefixMixedTeamAgentScope` with this generic core in `mixed-team-event-bridge.ts`:

```ts
export type MixedTeamStreamScope = {
  teamRunId: string;
  sourcePath: string[];
  taskTeamScope: TaskTeamStreamScope | null;
};

export type PrefixedMixedTeamStreamScope = MixedTeamStreamScope & {
  sourceRouteKey: string;
};

export function prefixMixedTeamStreamScope(input: {
  parentTeamRunId: string;
  sourcePrefix: string[];
  scope: MixedTeamStreamScope;
  taskTeamScopeOverride?: TaskTeamStreamScope;
}): PrefixedMixedTeamStreamScope;
```

Exact algorithm:

1. Normalize `parentTeamRunId`, `sourcePrefix`, current `teamRunId`, source path, and optional scope.
2. Set `alreadyInParentFrame = scope.teamRunId === parentTeamRunId`.
3. Rebase `sourcePath` with the one private `prefixPath(path, sourcePrefix, alreadyInParentFrame)` rule. That rule preserves an already parent-rooted path only when the frame IDs match and the path starts with the prefix; otherwise it prefixes once.
4. Select task-team scope:
   - If `taskTeamScopeOverride` is supplied, clone it unchanged because the task-team handle built it in the **target** `parentTeamRunId` frame.
   - Else if a retained `scope.taskTeamScope` exists and `alreadyInParentFrame`, clone it unchanged.
   - Else prefix the retained `logicalTeamPath` with the same `sourcePrefix` and rebuild `logicalTeamRouteKey`.
5. When a scope exists, require the returned `sourcePath` to start with returned `logicalTeamPath`. This is a boundary invariant, not a recovery/fallback.
6. Return `teamRunId=parentTeamRunId`, the rebased path/key, and the cloned/rebased task-team scope.

Exactly two public adapters call this core:

```ts
prefixMixedSubTeamEvent(input: {
  parentTeamRunId: string;
  sourcePrefix: string[];
  event: TeamRunEvent;
  taskTeamScopeOverride?: TaskTeamStreamScope;
}): TeamRunEvent;

prefixMixedTeamLeafAgentStatusSnapshot(input: {
  parentTeamRunId: string;
  sourcePrefix: string[];
  snapshot: TeamLeafAgentStatusSnapshot;
  taskTeamScopeOverride?: TaskTeamStreamScope;
}): TeamLeafAgentStatusSnapshot;
```

Adapter rules:

- `prefixMixedSubTeamEvent` calls `prefixMixedTeamStreamScope` for **AGENT, TASK_DELEGATION, COMMUNICATION, and MEMBER_INPUT**, not only for agent events. It writes the returned `teamRunId`, `sourcePath`, and `taskTeamScope` to the copied event.
- For an `AGENT` event, the adapter also applies the same private `prefixPath` rule to `TeamRunAgentEventPayload.memberPath` and rebuilds its member route key. It then asserts a nonempty relative task-team leaf selector when task-team scope exists.
- Conversation-address task-team-segment detection consumes only `taskTeamScope.taskTeamRunId`; no full operational identity is required in the outward event.
- `prefixMixedTeamLeafAgentStatusSnapshot` calls the same core, rebases `payload.member_path` with the same private path rule, rebuilds both payload route keys, and returns the correct discriminated variant. It asserts the same task-team leaf invariant.
- `MixedTaskTeamMemberHandle` calls `buildTaskTeamStreamScope({ taskTeamInstance: request.identity, parentTeamRunId: parentContext.runId })` once and passes that same target-frame override to both adapters.
- `MixedSubTeamMemberHandle` passes no override. Any retained scope is therefore rebased each time it crosses a distinct ordinary parent frame.

### Exact recursive snapshot method signatures

```ts
TeamRun.getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[];
TeamRunBackend.getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[];
TeamManager.getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[];
MixedTeamMemberHandle.getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[];
MixedAgentMemberHandle.getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[];
MixedSubTeamMemberHandle.getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[];
MixedTaskTeamMemberHandle.getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[];
```

- `MixedAgentMemberHandle` returns one ordinary snapshot using its canonical `AgentRun`/pre-run overlay and required exact member/source identity. A task-agent handle continues to stamp task-agent fields in the payload.
- `MixedSubTeamMemberHandle` returns `[]` when no child run exists; otherwise it maps child snapshots through `prefixMixedTeamLeafAgentStatusSnapshot` without an override.
- `MixedTaskTeamMemberHandle` returns `[]` when no child run exists; otherwise it maps child snapshots through the same adapter with its derived target-frame `TaskTeamStreamScope` override.
- `MixedTeamManager` concatenates persistent leaf agents, active persistent subteam recursion, task-agent handles, and active task-team recursion. Uninstantiated direct leaf agents keep the existing offline ordinary snapshot. Absent child-team leaves remain frontend/history metadata defaults; no pseudo team snapshot is emitted.
- History consumes `snapshot.payload` only. It does not serialize the internal task-team stream carrier into GraphQL history.

### One strict live/initial wire flattener

Update `team-stream-agent-identity-payload.ts`:

```ts
export type TeamStreamTaskTeamIdentityPayload = {
  task_team_run_id: string;
  task_team_instance_id: string;
  task_id: string;
  team_route_key: string;
  team_path: string[];
  task_team_relative_member_path: string[];
  task_team_relative_member_route_key?: string;
};

export function buildTaskTeamScopedIdentityPayload(input: {
  sourcePath: string[];
  taskTeamScope: TaskTeamStreamScope | null;
}): TeamStreamTaskTeamIdentityPayload | null;

export function assertTaskTeamLeafStreamScope(input: {
  sourcePath: string[];
  taskTeamScope: TaskTeamStreamScope | null;
  agentRunId: string;
}): void;

export function mapTeamLeafAgentStatusSnapshot(
  snapshot: TeamLeafAgentStatusSnapshot,
): ServerMessage;
```

The flattener performs no prefixing or recovery. For task-team scope it subtracts `taskTeamScope.logicalTeamPath` from the already-consistent source path and emits the existing wire fields. `assertTaskTeamLeafStreamScope` requires a nonempty relative path/route for both a live `AGENT` event and an initial task-team leaf snapshot. Non-agent task-team-root events may validly have an empty relative selector. Both the live event mapper's `AGENT` branch and `mapTeamLeafAgentStatusSnapshot` call the assertion before spreading the same flattener result.

Initial mapping spreads canonical `snapshot.payload` first and flattened outer task-team fields last. When a task-agent runs inside a task team, its task-agent run/instance fields remain present while outer task-team `task_id` wins exactly as today. `TeamRuntimeSnapshotService.getInitialMessages(teamRun)` retains each carrier through `mapTeamLeafAgentStatusSnapshot`; it never unwraps to plain `AgentStatusPayload` first.

### Concrete multi-boundary example: root -> ordinary subteam -> task team -> leaf

Assume:

- root stream/run: `root-team-1`;
- ordinary persistent subteam in root: `research_group`, path `['research_group']`, child run `research-run-2`;
- visible team target inside that child: `review_team`, child-local path `['review_team']`;
- task-team run/instance/task: `task-team-run-7` / `task-team-instance-7` / `task-42`;
- leaf inside the materialized task team: `['review_group', 'critic']`, agent run `critic-runtime-93`.

The operational identity is created inside `research-run-2` and stays unchanged:

```ts
{
  taskTeamRunId: "task-team-run-7",
  taskTeamInstanceId: "task-team-instance-7",
  parentTeamRunId: "research-run-2",
  taskId: "task-42",
  logicalTeam: {
    memberPath: ["review_team"],
    memberRouteKey: "review_team",
    // definition/template fields omitted here
  },
  ingress: {
    memberPath: ["review_group", "critic"],
    memberRouteKey: "review_group/critic",
    memberRunId: "critic-runtime-93"
  }
}
```

The task-team handle derives a child-parent-frame stream scope:

```ts
{
  taskTeamRunId: "task-team-run-7",
  taskTeamInstanceId: "task-team-instance-7",
  taskId: "task-42",
  logicalTeamPath: ["review_team"],
  logicalTeamRouteKey: "review_team"
}
```

A task-team child leaf starts locally as `['review_group', 'critic']`. Applying the task-team handle override produces a carrier in the ordinary child frame:

```ts
{
  scopeKind: "task_team_member",
  teamRunId: "research-run-2",
  payload: {
    status: "running",
    agent_id: "critic-runtime-93",
    agent_name: "critic",
    member_path: ["review_team", "review_group", "critic"],
    member_route_key: "review_team/review_group/critic",
    source_path: ["review_team", "review_group", "critic"],
    source_route_key: "review_team/review_group/critic"
  },
  taskTeamScope: {
    taskTeamRunId: "task-team-run-7",
    taskTeamInstanceId: "task-team-instance-7",
    taskId: "task-42",
    logicalTeamPath: ["review_team"],
    logicalTeamRouteKey: "review_team"
  }
}
```

The outer ordinary handle then calls the same core with `sourcePrefix=['research_group']` and **no override**. It prefixes the retained logical-team path together with leaf paths:

```ts
{
  scopeKind: "task_team_member",
  teamRunId: "root-team-1",
  payload: {
    status: "running",
    agent_id: "critic-runtime-93",
    agent_name: "critic",
    member_path: ["research_group", "review_team", "review_group", "critic"],
    member_route_key: "research_group/review_team/review_group/critic",
    source_path: ["research_group", "review_team", "review_group", "critic"],
    source_route_key: "research_group/review_team/review_group/critic"
  },
  taskTeamScope: {
    taskTeamRunId: "task-team-run-7",
    taskTeamInstanceId: "task-team-instance-7",
    taskId: "task-42",
    logicalTeamPath: ["research_group", "review_team"],
    logicalTeamRouteKey: "research_group/review_team"
  }
}
```

Both the live root event and reconnect snapshot map to:

```json
{
  "status": "running",
  "agent_id": "critic-runtime-93",
  "agent_name": "critic",
  "member_path": ["research_group", "review_team", "review_group", "critic"],
  "member_route_key": "research_group/review_team/review_group/critic",
  "source_path": ["research_group", "review_team", "review_group", "critic"],
  "source_route_key": "research_group/review_team/review_group/critic",
  "task_team_run_id": "task-team-run-7",
  "task_team_instance_id": "task-team-instance-7",
  "task_id": "task-42",
  "team_path": ["research_group", "review_team"],
  "team_route_key": "research_group/review_team",
  "task_team_relative_member_path": ["review_group", "critic"],
  "task_team_relative_member_route_key": "review_group/critic"
}
```

The existing frontend resolver therefore targets `task-team-run-7/review_group/critic`, promotes its run ID to `critic-runtime-93`, and exposes the running/interrupt surface on that exact transient leaf. It never falls through to task-team root or the structural `research_group/review_team/review_group/critic` context. A second or third ordinary outer boundary repeats the same retained-scope rebase and preserves the invariant.

## Outward `AgentRunEvent` Origin Coverage

The `SR-002` origin inventory remains authoritative and unchanged:

| Origin | Production source | Required preserved path |
| --- | --- | --- |
| ORIGIN-001 | AutoByteus/Codex/Claude runtime batch | runtime adapter -> `AgentRun` gateway -> processors -> finalizer -> subscribers |
| ORIGIN-002 | run command/termination fact | `AgentRun` lifecycle fact -> same queue/canonicalizer |
| ORIGIN-003 | accepted direct agent message | awaited `AgentRun.publishEvent` |
| ORIGIN-004 | artifact publication | awaited `AgentRun.publishEvent` |
| ORIGIN-005 | skill notification | awaited `AgentRun.publishEvent` |
| ORIGIN-006 | task-delegation notification to an agent | awaited nested `AgentRun.publishEvent` |
| ORIGIN-007 | processor-derived file/team communication event | processors then finalizer inside same gateway |

Removing aggregate team status must not introduce a new direct `AgentRunEvent` path. Leaf member status snapshots and events reuse the same final `AgentRun` output.

## Canonical Active-Run Status Application And Snapshot Precedence

The agent precedence that resolved `ARCH-FIND-002` remains unchanged:

| Canonical Agent Fact | Fresh Runtime Evidence | Result |
| --- | --- | --- |
| startup/initializing | current identified/anonymous turn | running |
| identified current A | idle/initializing without matching terminal | remain running |
| identified current A | matching terminal/error A | idle/error and retire A |
| current B | late evidence for retired A | preserve B/running |
| any | explicit accepted runtime termination | offline |

Team liveness uses a separate, simpler precedence:

| Manager Fact / Event | Other Observation | Public `isActive` |
| --- | --- | --- |
| exact run registered and `TeamRun.isActive()` true | any member status, no deltas, socket connected/disconnected | true |
| termination result rejected/throws | local stopPending clears | remain true |
| accepted termination then manager unregistration | stale frontend true | false |
| `getActiveRun` detects dead backend and performs the same unregister transition | stale frontend true | false |
| history context/draft exists without registration | any local context/socket state | false |

The team WebSocket must bind the manager lifecycle listener before its fresh manager read. A transition between bind and read is therefore observed or included in the read; repeated identical lifecycle messages are idempotent.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Root lifecycle | `{ team_run_id: "T", is_active: true }` from manager | `{ status: "idle" }` derived from members | Idle members do not make a team inactive |
| Definition row | `Software Engineering Team (27)` | blue/green dot copied from latest child | Definition has no runtime |
| Root action | `team.isActive && !stopPending -> Stop` | `team.currentStatus !== Offline -> Stop` | Uses the actual authority |
| Leaf member | `AGENT_STATUS running, member_route_key=a/b, agent_id=R` | subteam node `status=running` | Only the agent owns five-state lifecycle |
| Multi-boundary task-team leaf | child `review_team/.../critic` becomes root `research_group/review_team/.../critic`, and logical team becomes `research_group/review_team`; both map to `task-team-run-7/review_group/critic` | prefix leaf paths but clone child-local logical-team path | Live and reconnect must select the same transient execution leaf at arbitrary depth |
| Failure | `AgentRunCanonicalFailureObserver` or failed mutation result | root aggregate `status=error` | Keeps failure explicit |
| Settlement | `!taskService.hasOpenWork() && !childRun.hasOpenExecutionWork()` | `teamStatus in {idle,offline}` | Internal question gets an internal predicate |
| Connection | `isSubscribed=false, isActive=true` is valid | disconnect sets inactive | Transport is not liveness |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep optional root `status` beside `isActive` | Minimize query changes | Rejected | Remove schema/type/query/fixtures in one change |
| Map old `TEAM_STATUS` to lifecycle boolean | Ease stream migration | Rejected | New `TEAM_RUN_LIFECYCLE`; delete old mapper/handler |
| Keep `AgentTeamStatus` as computed alias | Ease component migration | Rejected | Components consume `isActive` or leaf `AgentStatus` directly |
| Infer active from any non-offline member | Preserve helper | Rejected | Manager registry is authority |
| Keep subteam pseudo or plain recursive `AgentStatusPayload` | Preserve common handle interface | Rejected | Specialize leaf snapshots and child work methods; carry `TaskTeamStreamScope` in the discriminated snapshot |
| Keep full `TaskTeamInstanceIdentity` as stream scope | Reuse one broad object | Rejected | Derive tight `TaskTeamStreamScope`; operational ingress/coordinator paths remain local and never participate in outward subtraction |
| Repair missing relative selector in mapper/frontend | Avoid bridge rework | Rejected | Rebase source/member/logical-team paths together at the mixed-team boundary; mapper validates and flattens only |
| Use socket close as inactive fallback | Avoid lifecycle event | Rejected | Bind manager lifecycle + fresh snapshot |
| Keep task cleanup on offline team event | Preserve router path | Rejected | Task terminal event/record reconciliation |

## Derived Layering (If Useful)

```text
Frontend presentation/actions
  -> frontend team/agent read models
  -> GraphQL and WebSocket transport
  -> AgentTeamRunManager (root team liveness) | TeamRun (exact member/event facade)
  -> MixedTeamManager/member handles (orchestration, leaf snapshots, private work)
  -> AgentRun (leaf lifecycle/event authority)
  -> runtime backend/provider
```

Task delegation and failure observation remain side capabilities consuming explicit events/results; they do not sit between team liveness and the UI.

## Change / Refactor Sequence

1. Start from reviewed implementation source `9c4c6f095` and preserve manager-owned lifecycle, aggregate removal, Stop pending/failure behavior, the `SR-002` agent gateway, and `IR-002` presentation batching.
2. Add `TaskTeamStreamScope` builder/clone; change `TeamRunEvent` and `TeamLeafAgentStatusSnapshot` from full operational `taskTeamInstance` to the tight `taskTeamScope`. Do not alter operational task-team identity/directory/persistence APIs.
3. Replace `prefixMixedTeamAgentScope` with `prefixMixedTeamStreamScope`. Make every live event type and initial snapshot adapter call it; rebase retained logical-team scope at ordinary boundaries and accept only a target-frame override from task-team handles. Prefix agent member paths with the same private `prefixPath` rule.
4. Update task-team handles to derive one scope per request/parent and pass it identically to live/snapshot adapters. Update conversation task-team detection to consume only the scoped run ID.
5. Update the shared stream flattener to consume `TaskTeamStreamScope`, add symmetric live-agent/initial-leaf validation, and preserve existing wire fields/precedence. No mapper/frontend fallback is allowed.
6. Add focused multi-boundary tests for `root -> ordinary subteam -> task team -> leaf`: retained-scope rebase, route-key rebuild, live mapper relative selector, initial mapper parity, repeated ordinary nesting/no double prefix, and invalid-frame rejection.
7. Resolve `CODE-FIND-003` locally by extending the `team-run-service.test.ts` manager double with `subscribeToLifecycle` and `getLifecycleSnapshot`; rerun all 13 tests. Do not weaken the production manager interface.
8. Rerun the prior changed server/frontend suites, TypeScript build, aggregate-obsolete scans, source-size/diff checks, and preserved batching/Stop tests; record `IR-004` and route source re-review.
9. Do not overwrite or include the API/E2E engineer's held uncommitted files. Only after source review passes may API/E2E replace its stale investigation and reconcile durable coverage against the current contract.

## Key Tradeoffs

- A dedicated binary lifecycle message adds one small contract, but it prevents socket state and member aggregation from becoming implicit liveness and supports other live clients.
- A dedicated `TaskTeamStreamScope` adds one small internal type, but it removes irrelevant operational paths from the outward carrier and makes its one coordinate frame enforceable without bloating `AgentStatusPayload`.
- Rebasing scope at every mixed-team boundary is stricter than repairing it at the mapper, but it guarantees every downstream live/snapshot consumer sees coherent identity and prevents transport heuristics.
- Specializing handle/node types touches more compile sites than leaving optional status fields, but it makes invalid team-as-agent states unrepresentable.
- `error` remains work-blocking for private settlement to preserve current safety; this does not create a public team error state.
- Clean-cut GraphQL/WebSocket contraction requires coordinated server/frontend changes, accepted because they ship together and stored data needs no migration.

## Risks

- A manager unregister path that bypasses lifecycle notification could leave another live client stale; all map deletion/validation paths must use one transition method.
- Member offline events must complete before root unregistration/transport teardown so successful team termination does not strand leaf UI state.
- Every ordinary boundary must rebase retained logical-team scope with source/member paths. A cloned child-local scope, missing task-team override, or second prefix algorithm can target the task-team root/wrong leaf or reject reconnect.
- Switching `TeamRunEvent` from full operational identity to tight stream scope must cover AGENT, TASK_DELEGATION, COMMUNICATION, and MEMBER_INPUT; a partial event-type cut would preserve hidden frame drift.
- Removing pseudo team statuses may expose callers that used `currentStatus` for display or work inference; repository scans and discriminated types should force explicit replacement.
- Task-team cleanup must remain correct for terminal success, failure, cancellation, reconnect, and record refresh without an offline fallback.
- Existing held API/E2E edits were authored against the pre-expansion agent-only contract and must be reconciled rather than blindly committed.

## Guidance For Implementation

- Treat `9c4c6f095` as the source starting state and `facc6a818` as the authoritative review record. Preserve the sound manager/aggregate-removal/frontend source and all earlier agent behavior.
- Make manager transition notification idempotent: reject/non-register a backend that is not live; emit only when an exact run changes registered liveness; replacing one still-active instance under the same ID is boolean `true -> true`, not a false/true flicker; a failed terminate does not mutate the map or notify false.
- Keep the lifecycle payload minimal. Do not add `status`, `phase`, member summaries, error text, interrupt permission, or connection state.
- In the initial team stream, bind run events and manager lifecycle before reading; keep each coordinate-consistent `TeamLeafAgentStatusSnapshot` intact through `mapTeamLeafAgentStatusSnapshot`, then send the fresh root lifecycle and recursively mapped leaf messages.
- Let only leaf-agent specializations expose `AgentStatus`. A subteam/task-team handle may expose child `isActive()` internally and `hasOpenExecutionWork()`, but never an agent status DTO.
- Preserve exact member route/path/run/task identity in both live and initial `AGENT_STATUS`; use `prefixMixedTeamStreamScope` at every boundary and `buildTaskTeamScopedIdentityPayload` only after scope is root-consistent. Do not copy either algorithm or infer a missing prefix.
- Keep the operational `TaskTeamInstanceIdentity` unchanged and local to task execution. Derive `TaskTeamStreamScope` at the task-team handle; never mutate operational ingress/coordinator selectors to look root-relative.
- Update the stale `TeamRunService` manager double as a test fixture. Do not add optional chaining/default lifecycle behavior to production to accommodate it.
- Keep task terminality and operational failures observable after aggregate deletion; do not silently drop the former consumers.
- Frontend lifecycle handlers update one subject only: root lifecycle -> `teamContext.isActive`; member status -> exact agent context; task event -> task projection; socket events -> `isSubscribed`.
- Make `onTerminateTeam` check the store's boolean result. While pending, disable duplicate Stop; on failure, clear pending and leave `isActive=true`/Stop available.
- Delete rather than deprecate old fields/events/helpers. Regenerate generated GraphQL types after schema/query edits.
- Update documentation only in the later delivery stage after integrated-state refresh.
