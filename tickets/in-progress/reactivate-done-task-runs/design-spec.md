# Design Spec — `reactivate-done-task-runs`

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` SR-002 (BEH-001..008, REQ-001..011, AC-001..015, DEC-001..004), approved by the user 2026-10-07. SR-001's "Go ahead…" is revised by "no automatic status change… I think it's clear now."
- Behavior-defining supplements and their approval references: None
- Design status: `Ready` (revised for SR-002)
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/investigation-notes.md`
- Authorities read (2026-10-07): `references/architecture-design.md`, `design-principles.md`, `/DESIGN.md` (root), `autobyteus-server-ts/docs/design/data_migration_guideline.md` §1–4. `design-examples.md` not needed.
- Project design-principle conflicts or discrepancies: None

## Current-State Read

DONE runs in `ProjectTaskService.closeAndWrite`:
1. It closes every open entry of the Task's `agent_run_resources.json` (`TaskAgentResourceService.closeTask`, serialized per Task).
2. It writes the status.
3. It asks each host root to release exactly the closed runs (`TaskAgentResourceRelease` → root `releaseTaskAgentResources` → adapter `cancelOwnedExecution` / `releaseOwnedExecution`).

The runtime's input fence (`RootTaskAgentResourceScope.assertInputAllowed` / `assertMessageScope`) asks the Task side (`TaskAgentResourcePort.ownerOf` → `isOpen`) on every wake and delivery. A closed entry is therefore refused forever. Closed references reach clients:
- live, as a closure event (one per root kind);
- on reload, as `closed_task_executions`, computed from the Task-side view.

The web merges closed references monotonically and hides their subtrees.

Two facts make reactivation more than flipping the flag (investigation findings 2–3):
- the released runtime authority (a fenced agent handle, or a terminated TeamRun) stays registered in-process, and restore would reuse it;
- the release is asynchronous and may still be in flight.

After a server restart, no such authority exists.

The existing owners are healthy. The Task side owns Task facts and entry state. `RootTaskExecutionLifecycle` owns the root-neutral fence, wake and lease. The per-root adapters own physical hosts. The change extends each owner along its existing seam.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale:
  - Server: Task domain/service/port; root-neutral lifecycle; three root adapters and their agent/team backends; three root facades; three event types and projectors; two tool result contracts; agent-facing tool texts.
  - Two stream-contract packages.
  - Web: three live consumers plus a shared closure utility.
  - Docs.
- Architectural risk: `High`
- Risk rationale:
  - reverses an explicit platform contract ("closed is forever");
  - changes persisted state transitions;
  - changes the Task ownership/security fence (who may reopen);
  - concurrency between DONE, release, wake and reopen;
  - shared stream and tool contracts change.
- Escalation trigger: return a Design Impact before working around any of these:
  - a backend cannot discard its released authority without affecting other executions;
  - restore of a released team copy requires re-planning members;
  - any root kind cannot route the assigner's message through `deliverExactAgentMessage`.

## Architecture Investigation Evidence

| Source | Path | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `projects/domain/task-agent-resources.ts:70-72` | Close is one-way | Add a pure `reopenTaskAgentResource` | — |
| Code | `projects/services/task-agent-resource-service.ts` | Per-Task `serialize`; view swaps on commit | Reopen goes through the same serialization and swap, so the fence and snapshots follow automatically | — |
| Code | `root-task-execution-lifecycle.ts` `withLiveLease` / `acquireAtHead` | Wake = fence → `assertRestorableChain` → `restoreChain` | Reuse unchanged after reopen | — |
| Code | `root-agent-execution-registry.ts:184-235`; `configured-agent-execution-handle.ts:207,342`; `task-agent-execution-registry.ts:196-204` | A fenced handle stays registered after release | New "discard released authority" per backend before restore | Exact TeamRun-side state per host kind (verify in implementation) |
| Code | `global-agent-run-message-router.ts:96-124`; three root `deliverExactAgentMessage` | The assigner's run-ID send always enters its own root's facade | Single reactivation entry in the lifecycle, called by all three facades | — |
| Code | stream contracts; web closure consumers | Closure is monotonic on the client | Symmetric reopened event; client removes references | — |

## Intended Change

Task status stays the agent's: the agent moves a DONE Task back to TODO/IN_PROGRESS with `create_or_update_task` (unchanged code path; still reopens nothing). When the run that assigned the work then sends `send_message_to(target_agent_run_id=<ingress run ID>)` to the closed assignment, its root reactivates that assignment:
1. It validates eligibility (the Task exists and is not DONE; the sender is the assigner; the target is the ingress; the assignment started).
2. It finishes the prior stop and discards the released runtime authority.
3. It checks that the saved conversation exists.
4. It reopens only that entry on the Task side (`closedAt` → `null`). The Task status is never written.
5. It publishes a "task executions reopened" event.

The message then follows the existing wake → restore → deliver path. The accepted result's message says the worker was reactivated.

`delegate_task` success results also gain `target_kind`. Agent-facing texts describe the reactivation.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Approved Change / Preserved | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001, 002, 006; AC-001..003, 008, 009, 011 | Assigner `send_message_to(run ID)` | Refused `TASK_AGENT_RESOURCE_CLOSED` | Reopen + deliver | DS-001 |
| BEH-002 | Contract | REQ-003, 007; AC-001, 003, 014, 015 | Agent's own `create_or_update_task`; then the message | Status changes only by the agent; a status change reopens nothing | Unchanged status rules. A message while DONE is refused with a hint. Reactivation never writes status. The result message names the reactivation. | DS-001 (status path untouched) |
| BEH-003 | User | REQ-008; AC-004 | Reopen commit | Rows hidden | Rows reappear live and after reload | DS-002, DS-003 |
| BEH-004 | Contract | REQ-002; AC-002 | Message to coordinator | — | Whole team restored via existing restore | DS-001 |
| BEH-005 | Contract | REQ-004; AC-005 | — | Helpers closed | Stay closed (only the targeted entry reopens) | DS-001 |
| BEH-006 | Contract | REQ-005; AC-006, 007 | Non-assigner / non-ingress target | Refused | Refused, with guidance | DS-001 |
| BEH-007 | Contract | REQ-010; AC-012 | `delegate_task` | `{target_agent_run_id, task_id?}` | Plus `target_kind` | DS-004 |
| BEH-008 | Contract | REQ-009, 011; AC-010, 013 | DONE; tool texts | "for good" | DONE unchanged; texts describe reactivation | DS-001 (DONE path unchanged) |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Current design issue found: `No` (owners and seams fit). One latent gap: no backend operation discards a released authority. It was unnecessary while closure was permanent.
- Structural triggers:
  - **Repeated coordination:** fires if each root implements reactivation. Avoided by placing it in the root-neutral `RootTaskExecutionLifecycle`, with roots only delegating.
  - **Authoritative boundary:** the lifecycle must not reach into Task-side stores. It uses `TaskAgentResourcePort` only.
  - **Shared-structure tightness:** the reopened event reuses the closed-event reference payload shape; no new parallel shape.
  - **Ambiguous boundary:** reopen takes an explicit `TaskExecutionReference` plus `requestedBy`, not a guessed ID.
- Root cause classification: `No Design Issue Found` (feature extends existing owners)
- Refactor needed now: `No`
- Evidence: investigation findings 1–6
- Design response: extend the port, the lifecycle, the adapters/backends, the events and the contracts along their current seams
- Refactor rationale: N/A
- Intentional deferrals and residual risk:
  - UI-initiated reactivation (out of scope).
  - The agent-repository skill text (separate repository; follow-up note).

## Terminology

- **Assignment:** an `assigned` entry in a Task's run resources (an agent copy or a team copy).
- **Ingress run ID:** the run ID `delegate_task` returned for an assignment (the agent's run, or the team's coordinator).
- **Assigner:** the agent run recorded as the entry's `assignedBy`.
- **Reactivation:** the reopen of one closed assignment caused by its assigner's run-ID message.
- **Released authority:** the in-process handle/run that a DONE release fenced or terminated.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- The "closed is forever" wording and comments are replaced (see the Removal Plan). No dual path: there is one reopen path.

## Persisted Data / State Transition Decision

- Stored subject: `agent_run_resources.json` per Task (Project Task folder or `ad-hoc-tasks/<taskId>/`); `task.json` status. One small file per Task.
- Change: `closedAt` may return from a timestamp to `null` on one `assigned` entry. Task status is not written by this feature.
- Reader/writer: the strict current reader accepts `closedAt: null | string`; the exact writer is unchanged. No new field.
- Semantics: `null` keeps its one meaning, "open". No field is reused with a new meaning.
- Decision: `Directly Usable — No Migration`
- Rationale: The shape and meaning are unchanged; only a new transition is added. Existing closed entries become eligible for reactivation exactly as they are.
- Data Migration Guideline §2 checklist:
  1. **Need:** none (no meaning change).
  2. **Availability:** unaffected; reopen is per Task and on demand.
  3. **Source/target:** the released shape is identical (inspected the schema and local data).
  4. **Disposition:** N/A.
  5. **Commit:** one existing atomic `store.update` of the Task's resource file, under the Task's serialization. No multi-file ordering is needed, since status is not written.
  6. **Current-only boundary:** no old shapes.
  7. **Cost:** one or two file writes per reactivation; no scans.
  8. **References:** `hostRoot` and `agentRun` are unchanged; the runtime validates them through the root index.
  9. **Evidence:** AC-001..011 and the unit tests below.
  10. **Lessons:** no rejected mechanisms used (no version field, no backups). Independent review: Architecture Reviewer.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior IDs | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, 002, 004, 005, 006 | Assigner (after reopening the Task itself) calls `send_message_to(target_agent_run_id)` | Copy restored, message delivered, result message notes the reactivation | `RootTaskExecutionLifecycle` (sequencing); Task side (entry state) | The feature |
| DS-002 | Return-Event | BEH-003 | Reopen committed | Client removes the reference from its closed set; rows reappear | Root publisher → projector → web consumer | Live visibility |
| DS-003 | Primary (read) | BEH-003 | Snapshot/history read | `closed_task_executions` excludes the reopened reference | `TaskAgentResourceService` view | Reload/restart visibility (no code change beyond the view swap) |
| DS-004 | Primary | BEH-007 | `delegate_task` success | Result has `target_kind` | `root-task-dispatch.ts` | Contract |
| DS-L1 | Bounded Local | BEH-001 | Reactivation inside the lifecycle | Reopen outcome | `RootTaskExecutionLifecycle` | Ordering and failure semantics |

## Primary Execution Spine(s)

- DS-001: `Assigner agent → send_message_to dispatcher → GlobalAgentRunMessageRouter → sender root.deliverExactAgentMessage (operation gate) → RootTaskExecutionLifecycle.deliverToExactTarget → [reactivate: adapter + TaskAgentResourcePort.reopenAssignment → ProjectTaskService → TaskAgentResourceService] → withLiveLease (existing wake/restore) → root delivery.deliverToRunId → send_message_to result`
- DS-004: `delegate_task tool → root.delegateTask → RootTaskExecutionLifecycle.delegate → dispatchTaskCopy → DelegateTaskResult {target_agent_run_id, target_kind, task_id?}`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The assigner has already moved the Task back to TODO/IN_PROGRESS itself. Its run-ID message enters its own root. Before the normal lease, the lifecycle sees that the target belongs to a closed Task entry. It identifies the assignment whose ingress is the target and asks the Task side whether the sender may reactivate it (the Task must not be DONE). It then finishes the old stop and discards the released authority, checks the conversation, commits the entry reopen on the Task side and publishes "reopened". Then the unchanged wake/restore/deliver path runs. The result message notes the reactivation. | Assigner run, host root, lifecycle, Task assignment, Task | Lifecycle (order), Task side (state) | Adapter backends (discard authority), publisher |
| DS-002 | The root publishes `task_executions_reopened` with the reopened reference. The projector maps it to each client's stream message. Clients remove the reference from their closed set, so its subtree (minus still-closed helpers) is listed again. | Root event, client view state | Root publisher / client view state | Contract schemas |
| DS-004 | Dispatch knows the planned execution (agent or team) and returns its kind with the ingress run ID. | Dispatch result | `dispatchTaskCopy` | Result schema |

## Bounded Local / Internal Spines

DS-L1, parent owner `RootTaskExecutionLifecycle.deliverToExactTarget(sender, targetAgentRunId, deliver)`:

`ownerOf(target)` closed?
- No → `withLiveLease(sender, deliver)` (unchanged).
- Yes → continue:
  1. `adapter.taskExecutionWithIngress(target)`. If null → refuse `TASK_AGENT_RESOURCE_CLOSED` with the guidance "message the run ID `delegate_task` returned".
  2. `port.assertReopenable({agentRun: ref, requestedBy: sender.agentRunId})`. Checks: Task exists; Task status is not DONE (else the "reopen the Task first" hint); assigned role; assigner match; started.
  3. Queue command `reopen` at the queue head: `adapter.discardReleasedExecution(ref)`, then `adapter.assertRestorableChain(target)`.
  4. `port.reopenAssignment({agentRun: ref, requestedBy})` → `{taskId, reopened}` (entry only; status never written).
  5. `adapter.publishTaskExecutionsReopened([ref])` (only when `reopened`).
  6. `withLiveLease(sender, deliver)`.
  7. When reopened, append "<target> was reactivated." to the accepted result's message.

Why it matters:
- Every refusal before step 4 leaves the Task and the entry unchanged (REQ-006).
- Step 3 runs in the lifecycle's existing serialized queue, so it never races wake or idle shutdown.
- Step 4 is serialized per Task with DONE, so a DONE is entirely before or after.

## Spine Actors / Main-Line Nodes

Assigner run; `GlobalAgentRunMessageRouter` (unchanged); root facade `deliverExactAgentMessage` (×3, thin); `RootTaskExecutionLifecycle`; `TaskAgentResourcePort` (`ProjectTaskService`); `TaskAgentResourceService`; root adapter (×3); root delivery (unchanged).

## Ownership Map

- `RootTaskExecutionLifecycle`: owns reactivation sequencing, the refusal mapping and the merge of the outcome. It is the only runtime caller of the reopen port methods.
- `ProjectTaskService` (port): owns Task existence, the not-DONE precondition and the eligibility decision against Task data. It commits the entry reopen under `TaskAgentResourceService.serialize`, re-reading Task status inside the serialization. It never writes status here.
- `TaskAgentResourceService`: owns the entry state and the view (fence and snapshots follow its swap).
- `task-agent-resources.ts` domain: the pure reopen transition and its preconditions.
- Root adapters: map ingress to reference; discard released authority per host kind; publish the reopened event.
- Backends (root agent registry, root team directory, `TeamRun` / flat team manager / task agent and task team registries): drop the released handle/run so `restore` builds a fresh one.
- Root facades: thin; they pass `deliverToRunId` into the lifecycle.

## Thin Entry Facades / Public Wrappers

| Facade | Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `StandaloneAgentRunRoot` / `RootTeamRun` / `AgentOrgRun` `.deliverExactAgentMessage` | `RootTaskExecutionLifecycle.deliverToExactTarget` | Root operation gate and delivery binding | Any reopen decision or Task data access |
| `send_message_to` tool / result contract | Router → root | Agent-facing shape | Reopen logic |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| "Closed is forever" doc comment (`task-agent-resources.ts`) and docs text ("can never receive new input, be woken or be restored") | Contract changed | Reactivation section in `docs/modules/projects.md` | In This Change | Also `agent_team_execution.md`, web `docs/agent_teams.md` and `docs/chat.md` where they state permanence |
| Agent-facing texts "for good" / "unless its Task is DONE" | Contract changed | New wording (REQ-011) | In This Change | `project-task-tool-contract.ts:14`; `agent-team-collaboration-llm-contract.ts:54,119,124`; any `send_message_to` description stating the same |
| Monotonic-only client closure assumption | Reopen exists | `removeReopenedTaskExecutions` beside `mergeClosedTaskExecutions` | In This Change | — |

## Return Or Event Spine(s)

DS-002 per root kind:
- Team: `TeamRunEventSourceType.TASK_EXECUTIONS_REOPENED` → `team-execution-view-projector` → team stream `TASK_EXECUTIONS_REOPENED {task_executions}` → `teamExecutionViewState` removes them.
- Standalone: `StandaloneRootEvent {kind: "task_executions_reopened"}` → `agent-collaboration-view-projector` → collaboration stream event → `agentRunCollaborationStreamingService` / `agentRunCollaborationContext` removes them.
- Org: `AgentOrgRunEvent {kind: "task_executions_reopened"}` → `agent-org-execution-view-projector` → `agentOrgExecutionContext` removes them.

Unknown references are a correlation failure, exactly as for closed.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| Discard released authority | DS-001 | Adapter → lifecycle | Await the exact release (idempotent): accepted or `EXACT_RELEASE_AUTHORITY_UNAVAILABLE` → drop the handle/run; otherwise refuse `TASK_REACTIVATION_STOP_PENDING` ("the previous stop has not finished; try again") | A fenced authority blocks restore | Lifecycle would learn backend internals |
| Reopened event publication | DS-002 | Root | Sequenced publish | Live visibility | — |
| Result message | DS-001 | Tool | Note "<target> was reactivated." in the accepted message | REQ-007 | — |

## Ownership Boundaries

- Runtime → Task side only through `TaskAgentResourcePort`. The lifecycle never reads stores; `ProjectTaskService` never touches runtime state.
- The lifecycle → physical hosts only through `RootTaskExecutionAdapter`.
- Clients learn of a reopen only through stream events or snapshots.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| `TaskAgentResourcePort` | `TaskAgentResourceService`, stores, domain | Lifecycle | Lifecycle calling `TaskAgentResourceService` / stores | Add port methods (done here) |
| `RootTaskExecutionLifecycle` | Queue, resource scope, schedule | Root facades | Facades calling port/adapter reopen steps directly | — |
| `RootTaskExecutionAdapter` | Backends/registries | Lifecycle | Lifecycle reaching backend registries | Add adapter methods (done here) |

## Dependency Rules

- Allowed:
  - root facade → lifecycle → {port, adapter};
  - adapter → backends;
  - `ProjectTaskService` → {`TaskAgentResourceService`, Project store, `AdHocTaskStore`};
  - projectors → contracts.
- Forbidden:
  - `agent-collaboration` importing `projects/*` (the port stays the seam);
  - backends deciding reopen eligibility;
  - web inferring reopen from anything other than the event or snapshot.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `TaskAgentResourcePort.assertReopenable(input)` (async) | Task assignment | Read-only eligibility | `{agentRun: TaskExecutionReference; requestedBy: string}` | Throws coded `ProjectError`:<br>- `TASK_AGENT_RESOURCE_CLOSED`: Task still DONE (hint: move it to TODO/IN_PROGRESS first), not an assignment, or not the assigner (with guidance);<br>- `TASK_NOT_FOUND`: Task deleted;<br>- `TASK_REACTIVATION_UNAVAILABLE`: never started;<br>- `TASK_AGENT_RESOURCES_UNAVAILABLE`: damaged |
| `TaskAgentResourcePort.reopenAssignment(input)` | Task assignment | Serialized commit: re-validate (incl. not DONE); `closedAt` → null for that entry only; no status write | Same | Returns `{taskId, reopened: boolean}`; `reopened:false` when already open |
| `RootTaskExecutionLifecycle.deliverToExactTarget(sender, targetAgentRunId, deliver)` | Exact-target delivery in a root | DS-L1 | `CollaborationMemberExecutionIdentity`, agentRunId | Replaces the `withLiveLease(sender, …)` wrapping in the three facades |
| `RootTaskExecutionAdapter.taskExecutionWithIngress(agentRunId)` | Task execution | Ingress → reference | agentRunId | Agent: `{agentRunId}` when it is a task-execution node; team: the task Team whose coordinator is the ID |
| `RootTaskExecutionAdapter.discardReleasedExecution(reference)` | Physical copy | See off-spine | `TaskExecutionReference` | Per host kind (root agent, root team, team-hosted) |
| `RootTaskExecutionAdapter.publishTaskExecutionsReopened(references)` | Root events | Publish | references | Mirrors `publishTaskExecutionsClosed` |
| Backends: `discardReleasedTask(agentRunId)` (root agent registry), `discardReleasedTask(teamRunId)` (root team directory), `TeamRun.discardReleasedDirectTaskExecution(reference)` → flat manager → task agent / task team registries | Physical handle/run | Remove fenced/terminated registration; clear `TeamRun` released/direct keys for that reference | exact IDs | Must not touch any other execution |
| `send_message_to` result | Tool | No schema change. The accepted result's `message` notes the reactivation; a rejection after a committed reactivation says so in `message`. | — | — |
| `delegate_task` result | Tool | Success adds `target_kind: "agent" \| "team"` | — | All success constructions (dispatch, helper placement) |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| `assertReopenable` / `reopenAssignment` | Yes | Yes | Low | — |
| `deliverToExactTarget` | Yes | Yes | Low | — |
| `taskExecutionWithIngress` | Yes | Yes | Low (ingress is unique per execution) | — |
| `discardReleasedExecution` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Reopen transition | `reopenTaskAgentResource` | Yes | Low | — |
| Event | `task_executions_reopened` / `TASK_EXECUTIONS_REOPENED` | Yes | Low | Mirrors closed |
| Result field | `target_kind` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Restore with conversation | Lifecycle wake / adapter `restoreChain` | Reuse | Same as idle wake |
| Conversation presence check | `assertRestorableChain` | Reuse | — |
| Per-Task ordering | `TaskAgentResourceService.serialize` | Reuse | Same as DONE/link |
| Live visibility | Closure event pipeline | Extend | Symmetric event |
| Serialized runtime step | `RootTaskExecutionCommandQueue` | Extend (new command kind `reopen`) | Avoid racing wake/shutdown |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spine | Decision |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/projects` | Eligibility, status and entry writes | DS-001, DS-003 | Extend |
| `autobyteus-server-ts/src/agent-collaboration/execution/task` | Sequencing, port/adapter contracts, dispatch result | DS-001, DS-004 | Extend |
| Root subsystems (`standalone-agent-run-root`, `agent-team-execution`, `agent-org-execution`) and `agent-collaboration/execution/backends` | Adapters, backends, facades, events | DS-001, DS-002 | Extend |
| `services/agent-streaming` | Projectors | DS-002 | Extend |
| `autobyteus-team-stream-contracts`, `autobyteus-collaboration-stream-contracts` | Event schemas | DS-002 | Extend |
| `autobyteus-web` | Client closure state | DS-002 | Extend |
| `agent-communication` / tool contracts | Result shape, texts | DS-001, DS-004 | Extend |

## Final File Responsibility Mapping

Server, Task side:
- `src/projects/domain/task-agent-resources.ts`: add `reopenTaskAgentResource(file, agentRun, requestedBy)`. Preconditions: the entry exists, role is `assigned`, `assignedBy === requestedBy`, start is `started`. Clears `closedAt` only for that entry; returns the file unchanged when already open. Update the doc comment.
- `src/projects/domain/project-errors.ts`: add `TASK_REACTIVATION_UNAVAILABLE`.
- `src/projects/services/task-agent-resource-service.ts`:
  - `assignmentOf(agentRun)`: location plus entry, from the view;
  - `reopenAssignment(location, agentRun, requestedBy)`: under the caller's serialization, `store.update` + `swap`.
- `src/projects/services/project-task-service.ts`:
  - `assertReopenable(input)`;
  - `reopenAssignment(input)`. Under `resources.serialize(taskId)`: read the Task (ad hoc or Project; missing → `TASK_NOT_FOUND`, "The Task was deleted; its work cannot be reactivated"; DONE → `TASK_AGENT_RESOURCE_CLOSED` with the reopen-first hint), re-validate, reopen the entry. No status write.

Server, runtime:
- `src/agent-collaboration/execution/task/task-agent-resource-port.ts`: add the two port methods and their input/output types.
- `src/agent-collaboration/execution/task/root-task-execution-adapter.ts`: add `taskExecutionWithIngress`, `discardReleasedExecution`, `publishTaskExecutionsReopened`.
- `src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts`: add `deliverToExactTarget` (DS-L1), using the existing `resourceScope`, queue and `withLiveLease`.
- `src/agent-collaboration/execution/task/root-task-execution-command-queue.ts`: add the `reopen` command kind.
- `src/agent-collaboration/execution/task/root-task-agent-resource-scope.ts`: expose `reopenPort()` access through `port()` (no new logic); refusal text for a closed non-ingress target.
- `src/agent-collaboration/execution/task/task-delegation-command.ts`: add codes `TASK_REACTIVATION_UNAVAILABLE`, `TASK_REACTIVATION_STOP_PENDING`.
- `src/agent-collaboration/execution/task/root-task-dispatch.ts` and the lifecycle `ensureTaskHelper`: add `target_kind` to success results.
- `src/agent-team-execution/task-delegation/task-delegation-result-contract.ts`: add the `target_kind` field.
- Three adapters implement the new methods: `standalone-root-task-execution-adapter.ts`, `team-task-execution-adapter.ts`, `agent-org-task-execution-adapter.ts`.
- Backends get a discard operation: `backends/root-agent-execution-registry.ts`, `backends/root-team-execution-directory.ts`, `agent-team-execution/domain/team-run.ts`, `backends/team-run-backend.ts`, `local/flat-team-run-backend.ts`, `local/flat-team-execution-manager.ts`, `local/registries/task-agent-execution-registry.ts` and the task-team registry.
- Root facades: `deliverExactAgentMessage` calls `taskExecutions.deliverToExactTarget(...)` in `standalone-agent-run-root.ts`, `root-team-run.ts` (via `team-task-execution-service.ts`) and `agent-org-run.ts`. Each root also wires `publishTaskExecutionsReopened` to its publisher.
- Events: `team-run-event.ts` (+ `task-execution-event-factory.ts`), `standalone-root-event.ts`, `agent-org-run-event.ts`.
- Projectors: `services/agent-streaming/team-execution-view-projector.ts`, `agent-collaboration-view-projector.ts`, `agent-org-execution-view-projector.ts`.

Server, tool surface:
- `src/agent-tools/project-tasks/project-task-tool-contract.ts` and `src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` (plus the `send_message_to` description wherever defined): REQ-011 texts.

Contracts:
- `autobyteus-team-stream-contracts/src/team-stream-server-message.ts` (+ payload schema): `TASK_EXECUTIONS_REOPENED`.
- `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts` (and the standalone collaboration event union if separate): `taskExecutionsReopenedEventDtoSchema`.

Web:
- `utils/collaboration/taskExecutionClosure.ts`: add `removeReopenedTaskExecutions`.
- Apply the event in `services/teamExecution/teamExecutionViewState.ts` (+ `teamExecutionViewModels.ts` type), `services/agentCollaboration/agentRunCollaborationStreamingService.ts` + `agentRunCollaborationContext.ts`, and `services/agentOrgExecution/agentOrgExecutionContext.ts`.

Docs:
- Server: `docs/modules/projects.md` (DONE §3, Reopen section, Tasks With No Project §3) and `docs/modules/agent_team_execution.md` / `agent_communication.md` where closure is described.
- Web: `docs/agent_teams.md`, `docs/chat.md`.

## Reusable Owned Structures Check / Tightness

- The reopened event payload reuses the closed-event reference DTO (`taskExecutionReferenceDtoSchema` / team payload schema).
- No overlapping representations.

## Target Subsystem / Folder / File Mapping

All changes are in existing files and folders listed above; no new folders and no new files are required. If the lifecycle grows past readability, the implementer may extract `root-task-reactivation.ts` beside it. It would hold DS-L1 only and be owned by the lifecycle.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Facade | `deliverExactAgentMessage(i) { return gate.run(() => this.taskExecutions.deliverToExactTarget(i.sender.identity, i.targetAgentRunId, () => this.delivery.deliverToRunId(i))) }` | Each root re-implements the reopen steps | One owner for sequencing |
| Result | `{"accepted":true,"code":"DELIVERED","message":"Delivered message to X. X was reactivated.","target_agent_run_id":"X"}` | Software changing Task status | REQ-003, 007 |
| Too early | Task DONE: `TASK_AGENT_RESOURCE_CLOSED`: "This Task is DONE. Move it to TODO or IN_PROGRESS with create_or_update_task first, then message this run ID again." | Auto-reopen | REQ-003, AC-015 |
| Refusal | Non-assigner: `TASK_AGENT_RESOURCE_CLOSED`: "This Task work is closed. Only the run that assigned it can reactivate it: reopen the Task, then message the run ID delegate_task returned." | Generic closed text | REQ-005 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep "closed forever" for old entries and reopen only new ones | Existing data | Rejected | One rule for all entries |
| Separate "reopenedAt" history field | Audit | Rejected (no requirement) | `closedAt` round-trip |
| Releasing handles differently on DONE (drop on release) instead of discarding on reopen | Alternative seam | Rejected | Keeps the DONE path unchanged; the discard happens only where needed |

## Change / Refactor Sequence

1. Task side: domain transition, service methods, port methods, errors, with unit tests (eligibility matrix incl. DONE refusal, serialization against DONE, no status write).
2. Backends: discard operations per host kind, with unit tests proving that restore after discard creates a fresh restore-mode handle/run.
3. Adapter methods (×3) and the lifecycle `deliverToExactTarget` + queue kind; facades switched (×3).
4. Events, projectors, contracts; web consumers + utility.
5. Tool results (`target_kind`; reactivation note in the send result message) and agent-facing texts.
6. Docs.
7. API/E2E: AC-001..014, including restart (AC-011) and team (AC-002) in standalone, Team and Org roots.

## Key Tradeoffs

- Two explicit agent steps (reopen the status, then message) instead of one implicit step. The agent and the user always see who changed the status (user decision SR-002). Messaging reactivates only the worker addressed, so earlier workers never reappear unasked.
- No new tool: reopening uses `create_or_update_task`; reactivation uses `send_message_to`.
- Discard-on-reopen keeps the DONE path untouched but adds one backend operation per host kind.

## Risks

- **A backend's released state may be more entangled than investigated** (team-hosted task Teams, nested Teams). Mitigation: the escalation trigger, plus per-kind unit tests.
- **Reopen racing a pending release.** Mitigation: the idempotent exact release is awaited inside `discardReleasedExecution`; a pending release yields `TASK_REACTIVATION_STOP_PENDING`, with nothing reopened.
- **Restore failure after a committed reactivation.** Accepted: the entry is open, the status is what the agent set, and the state equals any open, offline copy whose wake failed. The message says so; the assigner can retry or set DONE.
- **The agent repository's skill still says DONE ends workers.** Follow-up note, outside this repository.

## Guidance For Implementation

- Keep DONE and status-change behavior byte-for-byte (AC-014): no changes to `closeAndWrite`, `closeTaskAgentResources`, release ordering or `updateTask*` status writes.
- Re-validate every eligibility condition inside `reopenAssignment` under serialization. `assertReopenable` is advisory and exists only to avoid touching runtime state for ineligible senders.
- The queue `reopen` command must check `accepting` like `wake`.
- Never publish reopened before the Task-side commit.
- Tests must use real restore paths for at least one agent and one team copy per root kind in API/E2E (TESTING.md).
