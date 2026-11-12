# Design Review Report — phone-background-tasks-473 (autobyteus-473)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-background-tasks-473/tickets/in-progress/phone-background-tasks-473/requirements-doc.md` (Approved within the Task's direction; user informed; REQ-001…004)
- Upstream Investigation Notes: `…/tickets/in-progress/phone-background-tasks-473/investigation-notes.md`
- Upstream Solution Revision Record: `…/tickets/in-progress/phone-background-tasks-473/solution-revision-record.md`
- Reviewed Design Spec: `…/tickets/in-progress/phone-background-tasks-473/design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed: `handoff-architecture-review.md`; no supplements
- Relevant Solution Revision IDs: SR-001, SR-002
- Architecture Review Revision Record: `…/tickets/in-progress/phone-background-tasks-473/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Solution Designer handoff, `Architecture Design Complete`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `codex/phone-background-tasks-473` @ `931a1feeb6`; documents uncommitted; no source changes. Reviewed against the skill update of 2026-11-12: The Approach, the empty indirection check, Principle 16.

## Routing Classification Review

- Task size: `Medium`. Server: the inspection type, three backends, the GraphQL type. Web: the composable, the store, one phone component.
- Architectural risk: `High`. The shared runtime contract `AgentBackgroundTaskInspection` and the GraphQL view change across three runtimes.
- Independent Architecture Review required: `Yes`. Design approval: `Not required` (no visible behavior beyond REQ-001…004), so no routing inconsistency.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
- Approved intent: a "Background tasks" section in the phone's Activity, from the desktop panel's source (REQ-001/002). A late viewer, or a reload, sees current tasks for Claude, AutoByteus and Antigravity (REQ-003). There is no section for unsupported runtimes (REQ-004). The "Idle" status is split into its own Task (DEC-002, which the Task allows).
- Existing code the design relies on, opened:
  - Inspection variants: `agent-background-task-view.ts:15-18`, where event-stream is `{ kind: 'event-stream' }` only.
  - `AgentRun.inspectBackgroundTasks` maps event-stream to `{ kind, agentRunId }` (`agent-run.ts:186-194`).
  - The backends declare `{ kind: 'event-stream' } as const`: Claude `claude/backend/claude-agent-run-backend.ts:26`, AutoByteus `autobyteus-agent-run-backend.ts:110`, Antigravity `antigravity/backend/agy-agent-run-backend.ts:36`.
  - Codex is a snapshot (`:50`); ACP is unsupported (`:67`).
  - Task sources: the Claude registry `view` Map (`claude-background-task-registry.ts:97`); the Antigravity monitor's `running` Map (`agy-background-task-monitor.ts:31`); AutoByteus `backgroundProcesses.list()` (already used at `autobyteus-agent-run-backend.ts:114`).
  - The resolver uses `AgentRunManager.getInstance()` (`agent-background-task-view.ts:63`).
  - The composable refreshes once in event-stream mode, polls snapshots every 2 s and re-reads on `online` (`useBackgroundTaskPanelView.ts:44-91`).
  - All match the design. (The investigation cites the Claude and Antigravity backends without their `backend/` folder; the folders are confirmed above.)
- Scope guardrail confirmed: status, output, stopping tasks and ACP are out of scope. Preserved: the desktop panel, tool calls, Codex polling, idle shutdown.

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass (DS-001) | Confirmed | — |
| BEH-002 | Contract/System | Pass | Pass | Pass (DS-002) | Confirmed | — (R-1) |
| BEH-003 | — | Pass (split, DEC-002) | Pass | N/A | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present | Pass | Feature + Missing Invariant | — |
| Root cause evidence-backed | Pass | The event-stream view never carried tasks (`agent-run.ts:189`); the stream sends none on connect | — |
| Refactor decision explicit | Pass | `No`; triggers recorded (several kinds, reuse, derived data, hidden dependency) | — |
| Supported by sections | Pass | Contract method on the shared inspection, not a per-runtime special case in the resolver | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Owner? | Naming Clear? | One Owner Per Node, In Order? | Off-Spine Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 phone section | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 late viewer | Primary | Pass | Pass | N/A | Pass | Pass: resolver → `AgentRun` → backend `current()` → composable → store | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear? | Internals Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend inspection (`current()`) | Pass | Pass | Pass | Pass | Claude goes through `ClaudeSession.listBackgroundTasks()`, not into the registry from the backend |
| `agentBackgroundTaskStore` | Pass | Pass | Pass | Pass | The store stays the only client-side holder; the phone has no separate path |

## Dependency Direction / Forbidden Shortcut Verdict

Pass. Resolver → `AgentRun` → backend, as today. Backends import neither GraphQL nor the stream layer. Web: phone component → shared composable → store.

Principle 16: `Pass`. No new lookup. Each `current()` closes over the tracker its backend already constructs. The resolver's existing `AgentRunManager.getInstance()` is used, not added (Principle 16: an older lookup the change only uses stays), and the design records it as a fired trigger.

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular? | Identity Explicit? | Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Inspection event-stream `current()` | Pass | Pass | Pass (per run, via the run's backend) | Low | Pass |
| GraphQL `AgentBackgroundTaskEventStream.tasks` | Pass | Pass | Pass (`agentRunId`) | Low | Pass |
| `seedTasks(runId, tasks)` | Pass | Pass | Pass | Low | Pass (R-1 on its merge rule) |

Empty indirection check: `N/A`. No new interface, port, adapter or wrapper. `current()` is a method on the existing contract, and `ClaudeSession.listBackgroundTasks()` is an accessor on the owner of the registry.

## Existing Capability / Subsystem Reuse Verdict

Pass. Reused: the inspection contract, GraphQL view, composable, store, AutoByteus `toAgentBackgroundTask`. The rejected alternative ("replay on connect" in four stream handlers) is correctly rejected as repeated policy.

## Subsystem / Capability-Area Allocation Verdict

Pass.

## Reusable Owned Structures Verdict

Pass. The GraphQL object reuses the domain type's name and fields. The snapshot row type stays separate: it is a different observation (exit code, basename), as the existing union already models.

## Shared Structure / Data Model Tightness Verdict

Pass. Derived consumers of the changed inspection and view are listed: `AgentRun.inspectBackgroundTasks`, the resolver, three backends, `useBackgroundTaskPanelView` and codegen (`Pass`). Vocabulary: "background task" is unchanged (`Pass`).

## File Responsibility Mapping Verdict

Pass. `MobileBackgroundTasks.vue` holds the phone section and `MobileActivity.vue` places it.

## Subsystem / Folder / File Placement Verdict

Pass.

## Removal / Decommission Completeness Verdict

Pass. Nothing becomes obsolete. The event-stream variant is extended, not replaced.

## Legacy / Backward-Compatibility Verdict

Pass. There is no compatibility path. Web and node ship together (DESIGN.md rule 9).

## Persisted-Data Transition Verdict

N/A (`Not Affected`, in memory).

## Change / Refactor Safety Verdict

Pass. Order: server, web, phone, probes.

## Example Adequacy Verdict

Pass. DS-002 shows the flow and the merge rule. A short example is not needed beyond it.

## Material Premise Validation

### P-001 — A task's end event is missed while a viewer is disconnected, then the viewer re-reads

- Related requirement: REQ-001 ("updated live", "completed / failed … when ended"), REQ-003.
- Initiating basis: User / System. The phone keeps Activity open while its connection drops and returns: screen lock, network change. The composable already re-reads on `online` for this reason (`useBackgroundTaskPanelView.ts:83-85`).
- Path: on reconnect the stream sends `CONNECTED`, the execution view and the lifecycle, with no background tasks (investigation). The `online` refresh queries the view. `seedTasks` inserts only unknown task IDs, so a task the store still shows as `running` is not updated from the answer.
- Reachability: `Reachable` (normal phone use).
- Not introduced by this change: an event-stream store entry whose end event was missed already stays stale on the desktop, and the desktop panel shows the same store.
- Consequence: the new phone section can show a finished task as running until the page reloads. AC-001…003 still pass in their stated flows.
- Review consequence: non-blocking recommendation R-1 (ticket-scope: pre-existing, and the ticket works without it).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None blocking. Non-blocking recommendations:

- R-1 (REQ-001, P-001): make `seedTasks` also complete a stored task. When the answer shows a task as completed/failed/stopped and the store still has it as `running`, take the answer's task; never replace a stored task that has already ended.
  - The status lifecycle only moves from running to an end, so this needs no version stamp and stays safe against an older answer arriving after a newer event.
  - With it, the existing `online` re-read repairs a missed end in event-stream mode for Claude and AutoByteus. Antigravity's `current()` lists running tasks only, so a task missed there remains RSK-001.
  - If not adopted, the Solution Designer records it as a follow-up.
- R-2: AutoByteus `current()` should return `[]` while the run's `backgroundProcesses` is not yet created, as `listRunning` does today (`autobyteus-agent-run-backend.ts:114`). That is "no tasks yet", not a fallback for a missing owner.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation engineer (`/software_engineering_team/implementation_engineer`).

## Residual Risks

- RSK-001: Antigravity's monitor drops ended tasks, so a late viewer sees only its running tasks. A missed Antigravity end cannot be repaired by a re-read.
- DEC-002: the "Idle" status while a task runs is its own Task, and autobyteus-448's recorder cause is noted for the PM.
- The suggested `seedTasks` rule (R-1) is a suggestion for the phone's reconnect case, not a defect this design adds.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (P-001 Reachable, pre-existing, non-blocking)
- Notes: Small, owner-aligned contract extension; ready for implementation in its stated sequence.
