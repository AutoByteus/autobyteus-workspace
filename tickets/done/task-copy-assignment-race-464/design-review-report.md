# Design Review Report — task-copy-assignment-race-464

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-copy-assignment-race-464/tickets/in-progress/task-copy-assignment-race-464/requirements-doc.md` (SR-001, Approved)
- Upstream Investigation Notes: `…/task-copy-assignment-race-464/investigation-notes.md`
- Upstream Solution Revision Record: `…/task-copy-assignment-race-464/solution-revision-record.md`
- Reviewed Design Spec: `…/task-copy-assignment-race-464/design-spec.md` (SR-001, Ready)
- Supplemental Task Artifacts Reviewed: `evidence/REPRO-01-race-diagnostics.log`, `evidence/PROTO-01-queued-release-prototype.log`, `handoff-SR-001.md`, `follow-ups.md` (empty), uncommitted `docs/design-cases.md` Case 1 addition
- Relevant Solution Revision IDs: `SR-001`
- Architecture Review Revision Record: `…/task-copy-assignment-race-464/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Architecture Design Complete, SR-001 (Small / High)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `codex/task-copy-assignment-race-464` at base `c8f303af70`. Opened: `root-task-execution-lifecycle.ts` (whole file), `root-task-execution-command-queue.ts` (whole), `root-task-execution-resource-scope.ts` (whole), `root-task-dispatch.ts:55-80`, `task-execution-resource-release.ts`, `project-task-service.ts:280-365`, `task-execution-resource-service.ts:66-125` (serialization), `project-task-execution-resource-composition.ts:55-66`, the three root facades (`agent-org-run.ts`, `standalone-agent-run-root.ts`, `root-team-run.ts`/`team-task-execution-service.ts`), `agent-org-run.ts:360-392` (termination), the web consumers of `task_executions_closed`/`_reopened` (`agentRunCollaborationContext.ts:172-191`, `agentOrgExecutionContext.ts:242-258`, `teamExecutionViewState.ts:412-430`).

## Routing Classification Review

- Task size: `Small` — confirmed (one owner file with three methods, a union member, a split of one resource-scope method, two test files, docs).
- Architectural risk: `High` — confirmed: it changes the ordering of release, wake, Stop, shutdown and activation for every root kind, and moves a Task-side serialized write under the root queue (a new lock order; see AR-002).
- Classification rationale reviewed: Yes.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. Design approval `Not required` per the Task's direction; not `Pending`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. Deliver an existing-copy assignment racing a DONE/CANCELLED in either order (REQ-001); a release never stops a reopened copy, and one that comes first is settled before the reopen commits (REQ-002), for assignment and reactivation; deterministic failing-on-base tests (REQ-003); nothing else changes (REQ-004); docs (REQ-005).
- Relevant existing behavior and evidence confirmed: Yes. Reopen step then commit outside the queue (`lifecycle.ts:196-198`, `:303-304`); direct release (`:250-252` → `resource-scope.ts:94-106`); `isClosed` re-checked at call time (`resource-scope.ts:109`); fire-and-forget release requested in a `finally` after `closeTask`'s serialization (`project-task-service.ts:349-358`, `task-execution-resource-release.ts:11-13`); `queue.submit` enqueues synchronously (`command-queue.ts:33-42`); REPRO-01 sequence matches this code.
- Scope guardrail confirmed: Yes (UC-001, UC-002; Task-side rules, idle/Stop/model change/termination ordering, FU-006 and remote copies out of scope; BEH-003, refusals, results and event order preserved).
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: Yes (no blocking finding).
- Remaining material ambiguity: None.
- Statements about existing code the design relies on, opened at their cited lines:
  - `lifecycle.ts:170-215`, `:286-307`, `:309-318`, `:250-252` — accurate.
  - `resource-scope.ts:94-123` — accurate.
  - `task-execution-resource-release.ts:12-14`, `project-task-service.ts:357` — accurate.
  - `root-task-dispatch.ts:65-70` "activation commits inside its queue step" as the D2/D3 and RSK-002 precedent — **inaccurate as a precedent**: that commit is the runtime commit (`prepared.commit()`); the Task-side link `linkNewTaskExecution` (`:59`) runs before and outside the queue. See AR-002.
  - "Results and events are unchanged" (Change Scope) — **incomplete**: see AR-001.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User (agent) | Pass | Pass (REPRO-01; `lifecycle.ts:196-198`) | Pass (DS-001, DS-002; traced both orders below) | Confirmed | None |
| BEH-002 | User (agent) | Pass | Pass (`lifecycle.ts:303-304`) | Pass (DS-003) | Confirmed | None |
| BEH-003 | System | Pass | Pass (`project-task-service.ts:349-358`) | Pass (DS-001; termination still drains queued releases, `agent-org-run.ts:365-388`; direct release once `!accepting`) | Confirmed | None |

Interleavings traced against the target (DS-001…DS-003), all serialized by the one FIFO:

1. Release queued before the reopen step → release at head publishes `closed`, stops the copy; the reopen step sees it closed, settles, discards, checks restorable, commits; `reopened`; wake restores fresh.
2. Reopen step at head, copy open, commit waits on `serializeCopyInTask` while DONE holds the Task's serialization; DONE releases, then enqueues its release (behind the step); B commits; release at head finds the copy open → `TASK_AGENT_RESOURCE_NOT_CLOSED`, nothing stopped. This is REPRO-01's interleaving, now harmless.
3. Reopen step queued, DONE commits, release queued behind it; the step sees closed → settles/discards, commits; release finds it open.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/REPRO-01-race-diagnostics.log` | Pass | Pass | Pass | Pass | Pass | None |
| `evidence/PROTO-01-queued-release-prototype.log` | Pass | Pass | Pass | Pass (its counters also show the interleavings in AR-001) | Pass | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design spec, Bug Fix | None |
| Root-cause classification is explicit and evidence-backed | Pass | One sequence, two owners; queue doc `command-queue.ts:21-25` vs direct release and commits | None |
| Refactor decision is explicit | Pass | Yes (small), no new owner | None |
| Refactor decision is supported by the concrete design sections | Pass | D1–D3, file mapping, removal plan | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Closure release | Pass | Pass | Pass | Pass | Pass | Pass (remote fence beside the queue) | Pass |
| DS-002 | Existing-copy assignment | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Reactivation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Queue (bounded local) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RootTaskExecutionLifecycle` | Pass | Pass | Pass | Pass | Facades and Task side reach only `releaseTaskExecutions`; the resource scope never submits to the queue |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Lifecycle → queue, resource scope, adapter, Task port | Pass | Pass | Pass | Pass | New runtime edge: queue head → Task-side `serializeCopyInTask` (AR-002). No reverse edge exists: the Task side calls the root only by a non-awaited release and by synchronous status reads |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `lifecycle.releaseTaskExecutions` (unchanged signature) | Pass | Pass | Pass | Low | Pass |
| Resource scope remote-fence part | Pass | Pass (fences remote closed copies; returns what it handled) | Pass | Low | Pass |
| Resource scope hosted release (existing logic) | Pass | Pass | Pass | Low | Pass |
| Queue kind `release` | Pass | Pass | N/A | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Ordering copy transitions | Pass | Pass | N/A | Pass | Existing queue |
| Settle before reopen | Pass | Pass | N/A | Pass | `prepareClosedCopyForResume` unchanged |
| Closed re-check at stop time | Pass | Pass | N/A | Pass | `releaseHostedExecutions` unchanged |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/task` | Pass | Pass (Extend) | Pass | Pass | All three root kinds construct this lifecycle (`agent-org-run.ts:110`, `standalone-agent-run-root.ts:167`, `team-task-execution-service.ts:32`) and route both release and assignment to the same instance; both copy kinds go through the same lifecycle code |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| None introduced | Pass | N/A | N/A | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RootTaskExecutionCommandKind` | Pass | Pass | Pass | N/A | Pass | One label added |

Derived consumers of a changed structure listed with a decision for each: `Pass` (kind is a label only; the published-event consumers are covered by AR-001).

Each domain word keeps one meaning, and each concept one name: `Pass` ("release" matches `releaseTaskExecutions` and `projects.md`).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `root-task-execution-lifecycle.ts` | Pass | Pass | N/A | Pass | Order |
| `root-task-execution-resource-scope.ts` | Pass | Pass | N/A | Pass | Mechanics |
| `root-task-execution-command-queue.ts` | Pass | Pass | N/A | Pass | Kind + doc |
| Two unit test files | Pass | Pass | N/A | Pass | D4 |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| No new files | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Direct release call (`lifecycle.ts:250-252`) | Pass | Pass | Pass | Pass | Admission-closed direct path is an explicit state rule |
| Commits after the step (`:197-198`, `:304`) | Pass | Pass | Pass | Pass | — |
| Combined `resourceScope.releaseTaskExecutions` | Pass | Pass | Pass | Pass | Split; no leftover combined method |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Release path | No (`!accepting` is a state rule; the queue rejects submits in that state, `command-queue.ts:34-37`) | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

N/A — `Not Affected`; runtime ordering only, Task records written as today.

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| D4 first (fail on base), D1–D3, suites, gated, full e2e, docs | Pass | Pass (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| D1, D2 | Yes | Pass | Pass | Pass | Avoided: queue passed into the resource scope; restore retry/wait |

## Material Premise Validation (Only When Needed)

### `MP-001` — A reopen step runs before a queued closure release, so the DONE's `closed` is never published

- Related approved requirement or established contract: Preserved Behavior Boundary ("the published `closed`/`reopened` events in the order their commits happen"); REQ-004.
- Relevant behavior ID(s): BEH-001, BEH-002.
- Initiating basis kind: `User` (agent).
- Independent trigger: SCN-001, a Manager's parallel `update_task(A, DONE)` and `delegate_task(copy, B)`.
- Support evidence: documented pattern (`projects.md`), EXC-E2E-004.
- Forward path: interleavings 2 and 3 above. The release at head re-checks `isClosed` (`resource-scope.ts:109-111`), finds B committed, publishes nothing; in interleaving 3 the reopen step stops and discards the copy (`resource-scope.ts:130-140`) without publishing `closed`.
- Lifecycle preconditions and material consequence: PROTO-01 counts it in 12–15 of ~25 rounds per run. Event order is kept (no `closed` after `reopened`). The omitted `closed` is for a closure already superseded, as on base when the release arrives after the reopen commit. Web consumers treat `reopened` of a listed copy as a no-op (`removeReopenedTaskExecutions`); the copy simply stays listed and focused. Snapshots read closure from the Task side (`closedTaskExecutions()`), so nothing durable diverges.
- Reachability: `Reachable`.
- Review consequence: non-blocking AR-001 (correct the spec's "events unchanged" claim; pin the sequence in D4).

### `MP-002` — Root fail-stop rejects a queued release, so the copy is not stopped

- Related contract: BEH-003.
- Initiating basis kind: `System`.
- Trigger: `enterRootFailStop` (root persistence authority indeterminate), which rejects every queued entry (`command-queue.ts:49-55`).
- Forward path: a release queued while admitting, then fail-stop. The release promise rejects, and `TASK_AGENT_RESOURCE_STOP_FAILED` is logged (`task-execution-resource-release.ts:25-27`). A repeated DONE then takes D1's direct path.
- Consequence: an infrastructure-failure state, outside scope by default (Principle 6). The root is unusable for new work in this state.
- Reachability: `Reachable` only through infrastructure failure, and outside approved scope.
- Review consequence: residual risk only; no machinery required.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

### AR-001 — Spec says events are unchanged; a superseded `closed` is now omitted more often (non-blocking)

- Type: Design Impact (spec accuracy); Severity: Low; non-blocking.
- Protects: Preserved Behavior Boundary (event order), REQ-004.
- Scope status: `Within Approved Scope`. Changes approved behavior: No (order kept; a superseded `closed` was already skipped on base when the release came after the reopen).
- Evidence: MP-001; PROTO-01 `queued-release-found-open=12/15`, `reopen-head-closed=25`.
- Required update:
  - State in the design spec's Change Scope that a release overtaken by a reopen publishes no `closed`, including when the reopen step settles the closed copy itself, and that order is never `reopened` before `closed`.
  - Implementation's D4 cases assert the published sequence for both orders.
  - D5's `projects.md` text can say it in one clause.
- Why proportionate: one sentence plus assertions; no new mechanism.
- Recommended recipient: implementation engineer (D4 assertions) and Solution Designer (spec sentence; informational).

### AR-002 — The precedent cited for commits inside the queue step is a runtime commit, not a Task-side write (non-blocking)

- Type: Design Impact (evidence accuracy); Severity: Low; non-blocking.
- Protects: REQ-001/REQ-002 safety basis (no deadlock); Principle 1.
- Scope status: `Within Approved Scope`. Changes approved behavior: No.
- Evidence:
  - `root-task-dispatch.ts:59` links the Task outside the queue; `:65-71` commits only the runtime activation at the head.
  - D2/D3 make `assignExistingTaskExecution`/`reopenAssignment` (`serializeCopyInTask`, `project-task-service.ts:306-338`) the first Task-side serialized write at the queue head: the order is queue → Task lock.
  - Verified that no reverse edge exists: the Task side reaches a root only by `requestRelease`, called in a `finally` after `closeTask`'s serialization and never awaited (`project-task-service.ts:349-358`; `submit` enqueues synchronously), and by synchronous `workerStatus`. So the design is deadlock-free.
- Required update:
  - Replace the dispatch "precedent" in RSK-002 and the evidence table with this lock-order argument.
  - Add "a Task-side serialization holder that awaits a root queue step" to the escalation trigger. Implementation should stop if it finds one.
- Why proportionate: corrects the stated safety basis of a High concurrency change without changing the design.
- Recommended recipient: Solution Designer (informational); implementation engineer (escalation trigger).

## Classification

N/A for routing (Pass). AR-001 and AR-002 are non-blocking `Design Impact` accuracy notes.

## Recommended Recipient

Implementation engineer (per the pass rule), with the Solution Designer informed.

## Residual Risks

- RSK-001 (accepted): `closed` and the hosted stop wait behind queued steps. Activation's long `prepare()` runs outside the queue (`root-task-dispatch.ts:68`), so the wait is bounded by short head steps and by wake's `restoreChain`.
- MP-002: a fail-stop drops queued releases (logged; a repeat DONE releases directly). Out of scope.
- D4's base failure depends on the fixture modelling the registry rule (restore refused while a release is unfinished, `task-team-execution-registry.ts:47-51`). Implementation must record the base failure as the spec asks.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: `ARCH-REV-001`, `SR-001`. Classification Small / High confirmed. Non-blocking AR-001 and AR-002 travel with the pass.
