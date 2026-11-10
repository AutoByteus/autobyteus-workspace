# Design Spec — task-copy-assignment-race-464

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the Task's direction (user informed, 2026-11-10)
- Behavior-defining supplements: None
- User approval of the design: `Not required` (Task comment: the team's choice; only product direction goes to the user)
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-copy-assignment-race-464/tickets/in-progress/task-copy-assignment-race-464/investigation-notes.md`
- Authorities read (2026-11-10): `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`, `DESIGN.md` (rules 1, 4, 5; Collaboration Model reference), `docs/design-cases.md` (Case 1)
- Conflicts or discrepancies: None

## Current-State Read

Per root, `RootTaskExecutionLifecycle` (`src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts`) orders a copy's runtime transitions through its FIFO `RootTaskExecutionCommandQueue`: activate, wake (restore), idle shutdown, user Stop, model change, and the reopen step of assignment and reactivation. Three steps of the same copy lifecycle run outside it:

- the closure release (`releaseTaskExecutions`, `:250-252`), which the Task side requests fire-and-forget after DONE/CANCELLED (`task-execution-resource-release.ts:12-14`);
- the existing-copy assignment's commit `assignExistingTaskExecution` (`:197-198`), after its queue step;
- reactivation's commit `reopenAssignment` (`:305`), after its queue step.

The reproduced failure (REPRO-01) is one interleaving of these:
1. The step sees the copy open.
2. DONE commits and its release starts stopping the copy.
3. B commits.
4. The wake finds the copy not live but still registered (`task-team-execution-registry.ts:47-51`), so the restore is refused.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: one owner file changes (`root-task-execution-lifecycle.ts`: three methods), plus:
  - a kind added to the queue's union;
  - a small split of the release mechanics in `root-task-execution-resource-scope.ts` (fence remote copies vs release hosted copies);
  - two unit test files (new cases, fixture able to hold a release in flight);
  - two module docs and a design-case line.
- Architectural risk: `High`
- Risk rationale: it changes concurrency behavior. Every root's closure release and reopening commits move into the per-root lifecycle queue, so their ordering against wake, shutdown, Stop and activation changes for all three root kinds. The design-principles rubric makes any material concurrency change High, however small. Uncertainty is low: the cause is reproduced, and a prototype passed under load.
- Escalation trigger: a queue step found to await a closure release (deadlock); any reverse lock edge (Task-side code under `serializeCopyInTask` or a Task lock awaiting a root-queue step); any change needed in the registries or the Task side; any changed agent-facing text or result.

## Architecture Investigation Evidence

| Source | Path | Observation | Design Decision Supported |
| --- | --- | --- | --- |
| REPRO-01 | `evidence/REPRO-01-race-diagnostics.log` | The failing interleaving, step by step | D1–D3 |
| PROTO-01 | `evidence/PROTO-01-queued-release-prototype.log` | Queued release + commits inside the step: both orders delivered under load, no refusal | D1–D3 |
| Code | `task-execution-resource-release.ts:12-14`, `project-task-service.ts:357` | Release is fire-and-forget; nothing awaits it | D1 safe from deadlock |
| Code | `root-task-execution-resource-scope.ts:94-123` | Remote copies are fenced via a peer call; hosted closed copies released; `isClosed` re-checked at call time | D1 split |
| Code | `root-task-dispatch.ts:65-70` | Activation commits its runtime inside its queue step (a runtime commit, not a Task-side write) | D2, D3 shape only; the safety argument is the lock order below (ARCH-REV-001 AR-002) |
| Code | `root-task-execution-lifecycle.ts:309-318` | Reopen step skips an open copy; settles and discards a released one | Reused unchanged |

## Intended Change

Make the root's lifecycle queue the one owner of a copy's runtime lifecycle, so a closure release and a reopening commit are never interleaved.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002. Areas:
  - `RootTaskExecutionLifecycle`: closure release, assignment, reactivation;
  - `RootTaskExecutionResourceScope`: split of the release mechanics into fence and hosted release;
  - `RootTaskExecutionCommandQueue`: kind `release`, and its doc comment;
  - the unit tests of existing-copy assignment and reactivation;
  - `docs/modules/projects.md`, `docs/modules/agent_team_execution.md`, `docs/design-cases.md`.
- Derived consumers: none outside the files above. Results and texts are unchanged. Events: `closed` is still published before the hosted stop, now when the queued release runs. A release that a reopening commit overtakes finds the copy open, so it publishes no `closed` and stops nothing; the copy's `reopened` follows its commit as before. The published order always matches the committed order (ARCH-REV-001 AR-001).
- Deliberately left alone:
  - the registries (`task-team-execution-registry.ts`, `task-agent-execution-registry.ts`);
  - the Task side (locks, rules, texts);
  - idle shutdown, user Stop, model change, root termination;
  - remote fencing behavior;
  - EXC-E2E-004's offsets (the gated test stays as written).
- Follow-ups: None new. FU-006 of autobyteus-447 stays separate.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Approved Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User (agent) | REQ-001, REQ-002; AC-001, AC-002, AC-004 | Parallel DONE(A) + `delegate_task(copy, B)` | Race refuses B | Delivered in either order | DS-001, DS-002 |
| BEH-002 | User (agent) | REQ-002, REQ-003; AC-003 | `send_message_to` reactivation during a release | Same split | Same rule | DS-001, DS-003 |
| BEH-003 | System | REQ-004; AC-005 | DONE/CANCELLED of a last open Task | Copy stopped | Unchanged (now ordered in the queue) | DS-001 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Structural triggers that fire:
  - **Split sequence (Principles 2, 13).** A copy's lifecycle has one stated owner (the queue: "the sole in-memory FIFO for one collaboration root"), but its release and its reopening commits run beside it.
  - **Several kinds or forms (Principle 1).** Assignment and reactivation are two forms of reopening with the same split; both are fixed.
- Ruled out:
  - Persisted data: no stored shape changes.
  - Vocabulary: no new words.
  - Shared structures: the queue's kind union gains `release`; no new fields.
- Root cause classification: `Duplicated Policy Or Coordination`. The ordering policy for one copy is held by the queue for some steps and by nothing for others.
- Refactor needed now: `Yes` (small). Move the three steps under the existing owner; no new owner.
- Design response: D1–D3 below.
- Deferrals: None.

## Terminology

No new terms. "Closure release": the stop of a copy's runtime that a DONE/CANCELLED of its last open Task requests (`projects.md`).

## Legacy Removal Policy (Mandatory)

- Obsolete paths: the unqueued closure release of hosted copies, and the two commits outside their queue steps. They are replaced, not kept beside the new path.
- Compatibility wrappers or fallbacks kept: `None`. The admission-closed rule in D1 is not a fallback. It is the explicit state where the queue no longer admits commands (root termination), and it keeps today's behavior there.

## Persisted Data / State Transition Decision

- Decision: `Not Affected` (runtime ordering only).

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003 | `update_task` DONE commit | Copy stopped (or kept, if reopened meanwhile) | `RootTaskExecutionLifecycle` (queue) | The release that raced |
| DS-002 | Primary End-to-End | BEH-001 | `delegate_task(copy, B)` | B delivered; copy live | `RootTaskExecutionLifecycle` | The assignment that was refused |
| DS-003 | Primary End-to-End | BEH-002 | `send_message_to(closed copy)` | Copy restored; message delivered | `RootTaskExecutionLifecycle` | Same split |
| DS-004 | Bounded Local | all | Queue entry submitted | Entry executed at head | `RootTaskExecutionCommandQueue` | One FIFO per root |

## Primary Execution Spine(s)

- DS-001:
  ```text
  ProjectTaskService DONE commit
    -> TaskExecutionResourceRelease (fire-and-forget)
    -> root.releaseTaskExecutions
    -> RootTaskExecutionLifecycle:
         remote copies: resourceScope.fenceRemote, outside the queue
         hosted copies: queue "release" -> at head resourceScope.releaseHosted
           (re-checks closed; publishes closed; cancels; settles exact release)
    -> results merged in input order
  ```
- DS-002:
  ```text
  delegate_task
    -> lifecycle.assignToExistingCopy: resolve, check, read other open Tasks
    -> queue "reopen", at head:
         prepareClosedCopyForResume (open: skip; closed: settle, discard, check restorable)
         then port.assignExistingTaskExecution (commit)
    -> publish reopened
    -> withLiveLease(deliverWork): queue "wake" -> restoreChain -> deliver
    -> markStarted
  ```
- DS-003:
  ```text
  send_message_to
    -> lifecycle.reactivateClosedTarget: assertReopenable
    -> queue "reopen", at head: prepareClosedCopyForResume, then port.reopenAssignment
    -> publish reopened
    -> withLiveLease(deliver)
  ```

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- |
| DS-001 | A DONE's request to stop the copy waits its turn in the root's queue. At the head it re-checks that the copy is still closed: if an assignment reopened it first, nothing stops; if not, the copy is stopped completely before anything after it runs | Lifecycle | Remote fencing stays outside the queue (peer call) |
| DS-002 | The assignment's check and commit run as one queue step. A release queued before it has finished (the step then drops the released copy and the wake restores a fresh one); a release queued after it finds the copy open and leaves it alone | Lifecycle | Task-side lock unchanged |
| DS-003 | The same for reactivation | Lifecycle | — |

## Spine Actors / Main-Line Nodes

Task side (`ProjectTaskService`), `TaskExecutionResourceRelease`, root facade, `RootTaskExecutionLifecycle`, `RootTaskExecutionCommandQueue`, `RootTaskExecutionResourceScope`, adapter/registries (unchanged).

## Ownership Map

- `RootTaskExecutionLifecycle` owns the order of a copy's runtime transitions, now including the closure release of hosted copies and the reopening commits.
- `RootTaskExecutionResourceScope` owns release mechanics (fence a remote copy, release a hosted closed copy, settle exact release), not their order.
- The queue only admits, orders, closes and drains (unchanged).

## Thin Entry Facades / Public Wrappers

Root facades (`RootTeamRun`, `AgentOrgRun`, `StandaloneAgentRunRoot`, `TeamTaskExecutionService`) stay thin pass-throughs to the lifecycle.

## Removal / Decommission Plan (Mandatory)

| Item To Remove | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| Direct `this.resourceScope.releaseTaskExecutions(executions)` in `lifecycle.releaseTaskExecutions` (`:250-252`) | The hosted part moves into the queue | D1 | The admission-closed case stays direct, explicitly |
| `port.assignExistingTaskExecution` call after the queue step (`:197-198`) | Moves into the step | D2 | — |
| `port.reopenAssignment` call after the queue step (`:305`) | Moves into the step | D3 | — |
| `RootTaskExecutionResourceScope.releaseTaskExecutions` as one method (`:94-104`) | Split into a remote-fence part and the existing hosted part, so the lifecycle can order them | D1 | Keep `releaseHostedExecutions`; expose a fence method for remote copies |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Spine | Serves | Responsibility | Risk If On Main Line |
| --- | --- | --- | --- | --- |
| Remote fencing (`closureFence`) | DS-001 | Lifecycle | Tell a peer's copy its Task closed | A peer round-trip would hold every wake of the root |

## Ownership Boundaries

Callers (root facades, Task side) depend on `RootTaskExecutionLifecycle.releaseTaskExecutions` only, never on the resource scope directly. The lifecycle calls the resource scope's mechanics; the resource scope never submits to the queue.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `RootTaskExecutionLifecycle` | Queue, resource scope, adapter | Root facades | A facade or Task-side caller calling the resource scope's release directly | Extend the lifecycle |

## Dependency Rules

- Lifecycle → queue, resource scope, adapter (unchanged directions). Resource scope → port, adapter, remote links (unchanged). No callback from the resource scope into the queue (Principle 13: the lifecycle calls each mechanism itself).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `RootTaskExecutionLifecycle.releaseTaskExecutions(executions)` | Copies of this root | Order and run the closure release | `TaskExecutionReference[]` | Signature and result unchanged |
| `RootTaskExecutionResourceScope` fence part, e.g. `fenceRemoteClosedExecutions(executions)` → results for remote closed copies, plus the list of the rest | Remote copies | Fence via peer | Same | Name per the codebase; returns which executions it handled |
| `RootTaskExecutionResourceScope` hosted part (existing `releaseHostedExecutions`, made callable by the lifecycle) | Hosted copies | Publish closed, cancel, settle exact release; re-check closed at call time | Same | Unchanged logic |
| Queue kind `"release"` | — | Label | — | Added to `RootTaskExecutionCommandKind` |

## Interface Boundary Check

All three: responsibility singular `Yes`, identity explicit `Yes`, ambiguity `Low`.

## Main Domain Subject Naming Check

`release` (queue kind) matches the method `releaseTaskExecutions` and the documented "release" vocabulary. No drift.

## Existing Capability / Subsystem Reuse Check

| Need | Existing Capability | Decision | Why |
| --- | --- | --- | --- |
| Ordering copy transitions | `RootTaskExecutionCommandQueue` | Reuse | Its stated job |
| Settling a released copy before reopening | `prepareClosedCopyForResume` | Reuse unchanged | Already does it |
| Re-check closed before stopping | `releaseHostedExecutions` (`isClosed`) | Reuse unchanged | Already does it at call time |

## Subsystem / Capability-Area Allocation

All within `src/agent-collaboration/execution/task/` (Extend).

## Final File Responsibility Mapping

| File | Concrete Change |
| --- | --- |
| `src/agent-collaboration/execution/task/root-task-execution-command-queue.ts` | Add `"release"` to the kind union; list the closure release and the reopening commits in the class doc |
| `src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | D1: `releaseTaskExecutions` fences remote copies outside the queue and submits the hosted release as kind `release`; while the root no longer admits (`!this.accepting`), it releases directly as today. D2, D3: commits inside the `reopen` steps. Update the doc comments of the three methods |
| `src/agent-collaboration/execution/task/root-task-execution-resource-scope.ts` | Split `releaseTaskExecutions` into the remote fence part and the hosted part; results keep input order when the lifecycle merges them |
| `tests/unit/agent-collaboration/root-task-existing-copy-assignment.test.ts` | D4 case(s); fixture can hold a release in flight and models a restore refused while a release is unfinished |
| `tests/unit/agent-collaboration/root-task-reactivation.test.ts` | D4 reactivation case |
| `autobyteus-server-ts/docs/modules/projects.md`, `docs/modules/agent_team_execution.md` | D5 |
| `docs/design-cases.md` | Case 1: "Again in autobyteus-464" (written by the Solution Designer in this ticket) |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| D1 | `releaseTaskExecutions(xs) { const { fenced, hosted } = this.resourceScope.fenceRemote(xs); if (!this.accepting) return merge(fenced, this.resourceScope.releaseHosted(hosted)); return merge(fenced, this.queue.submit({ kind: "release", executeAtQueueHead: () => this.resourceScope.releaseHosted(hosted) })); }` | Passing `queue.submit` into the resource scope | One owner calls each mechanism (Principle 13) |
| D2 | `await this.queue.submit({ kind: "reopen", executeAtQueueHead: async () => { await this.prepareClosedCopyForResume(copy.execution, copy.ingressAgentRunId); await port.assignExistingTaskExecution({…}); } });` | Retrying the restore, or waiting in `restore` for a terminating run | Removes the interleaving instead of tolerating it |
| Rejected | — | Making `registry.restore` wait for or drop a terminating run | Leaves the release able to stop a reopened copy (REQ-002) |

## Design Decisions

- **D1: Hosted closure release in the queue.** `RootTaskExecutionLifecycle.releaseTaskExecutions` fences remote closed copies through the resource scope, outside the queue (peer call, no hosted runtime). It submits the hosted part as `{ kind: "release" }` and merges both results in input order. At the head, the existing `releaseHostedExecutions` re-checks `isClosed`. A copy reopened before then is reported `TASK_AGENT_RESOURCE_NOT_CLOSED` and not stopped. While the root no longer admits commands (`!this.accepting`: root termination or fail-stop), the hosted release runs directly, as today. That is an explicit state rule, not a fallback for a refused submit.
- **D2: Assignment commits inside its reopen step.** `assignExistingTaskExecution` runs at the head of the `reopen` step, after `prepareClosedCopyForResume`. Refusals from the commit keep their codes and texts: errors thrown at the head reject the submit, and the existing `catch` maps `refusalCode` errors to `{ delegated: false, message }`. Publication, delivery and `markStarted` stay after the step, unchanged.
- **D3: Reactivation commits inside its reopen step.** `reopenAssignment` runs at the head of the `reopen` step. `reopened` is returned from the step; publication and delivery follow unchanged.
- **D4: Deterministic tests** (REQ-003).
  - **Assignment case:** an Agent copy and a Team copy (or one copy kind, if the fixture is shared). The copy works on A. Hold the assignment between its queue step and its commit (`beforeAssignCommit` latch). Close A and request its release with the fixture's release held in flight. Then let the commit go.
  - Expected:
    - `delegated: true`, B open, the copy live, no restore refusal;
    - the held release either reports the copy not closed (it queued behind the step) or completes before the commit;
    - the copy is never left stopped while B is open.
  - Make the fixture model the real registry: a restore of a copy whose release has not finished is refused "already active or reserved". With that, the case fails on base. Prove it by running it on base (stash the fix) and record the failing output.
  - **Reactivation case:** the same shape in `root-task-reactivation.test.ts`.
  - The existing QR-001 cases stay and pass.
- **D5: Docs.**
  - `projects.md` "Follow-up Task to an existing copy": merge steps 3 and 4 into one step. Say that the resume step and the commit run as one step of the root's queue, and that a DONE's release of the copy runs in the same queue. A release that comes first is settled before the commit; one that comes after finds the copy open and stops nothing.
  - `agent_team_execution.md:609-615`: name the closure release and the reopening commits among what the queue serializes.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep the direct release and add a retry in restore | Smaller diff | Rejected | D1–D3 |

## Change / Refactor Sequence

1. D4: write the new unit cases and fixture changes first; run them on base and record the failure.
2. D1–D3.
3. Unit: the lifecycle, existing-copy, reactivation and queue suites, then `test:unit`; `test:integration`; server typecheck.
4. Gated (scripted AGY, `RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs`):
   - `task-existing-copy-assignment` alone, and with EXC-E2E-004 repeated under load (REPRO-01's command, 3 runs);
   - the delegation-related gated files: `task-reactivation-root-visibility`, `teammate-delivery-task-closure-race`, `task-copy-idle-lifetime`, `delegated-copy-*`.
5. Full `pnpm test:e2e` (clean environment; the default run must stay green, as autobyteus-447's TESTING.md rule asks for a change to the shared lifecycle).
6. D5 docs.

## Key Tradeoffs

- Hosted closure release waits for its queue turn (RSK-001). This removes the race instead of adding retry or wait logic.
- Remote fencing stays outside the queue, so a slow peer never holds a root's wakes.

## Risks

- RSK-001 (investigation notes): accepted.
- RSK-002, a Task-side write inside a queue step (ARCH-REV-001 AR-002): safe by lock order. The order is the root queue head first, then the Task side's `serializeCopyInTask` (copy, then Task). No Task-side code holding `serializeCopyInTask` (or a Task lock) awaits the root queue: the closure release is fire-and-forget (`task-execution-resource-release.ts:12-14`), and the Task side reads live status synchronously. Escalation trigger: any reverse edge, i.e. Task-side code under its locks that awaits a root-queue step. Stop and return it to the Solution Designer.
- Deadlock: excluded by ASM-001 (no queue step awaits a closure release). An implementation that finds one must stop and escalate.

## Guidance For Implementation

- Reproduction to start from: the D4 unit case(s), failing on base; and REPRO-01's gated command (load-dependent).
- No agent-facing text, tool argument or result changes. No live Codex calls (scripted AGY only). A Codex usage-limit failure is recorded, not fixed (user direction).
