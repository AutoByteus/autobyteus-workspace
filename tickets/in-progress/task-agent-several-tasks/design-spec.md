# Design Spec — A task agent with several Tasks

## Solution And Approval Basis

- Current solution revision ID: `SR-005` (SR-004 design; SR-005 resolves ARCH-REV-001 ARF-001 / ARF-002)
- Approved requirements baseline: `requirements-doc.md` at `SR-003`, approved by the `User` (2026-10-23). The user confirmed afterwards that the given-Task message stays as today, except for the one sentence that would become false.
- Behavior-defining supplements: none.
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-several-tasks/tickets/in-progress/task-agent-several-tasks/investigation-notes.md` (AF-001–AF-009)
- Authorities read (2026-10-23): `references/architecture-design.md`, `references/design-principles.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`; `DESIGN.md` (incl. rule 9); `autobyteus-server-ts/docs/design/collaboration_model.md` (CM-6); `data_migration_guideline.md` (no data change). `design-examples.md` not used.
- Conflicts: none.

## Current-State Read

`TaskExecutionResourceService` is the sole authority over the per-Task `agent_run_resources.json` files and the in-memory view. That view holds every copy's entries across Tasks and its current entry ("its open entry, else its latest linked"). Ownership, closure, reopen, sub-work and the tree read that view. `assertTaskExecutionAssignable` is the single rule that keeps a copy at one open Task. The release after DONE / CANCELLED asks to stop the copies whose current entry is in the closing Task and closed (`releasableByHostRoot`). The probe (AF-001) shows that this misses the last close once a copy has had two open Tasks. The collaboration lifecycle gives a saved Task to an existing copy through the port and delivers its description as a message; that path already works for an open copy. There is no structural problem; the one-open-Task assumption sits in three rules and three texts.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: about 7 source files, all in existing owners:
  - `task-execution-resources.ts` (one refusal removed);
  - `task-execution-resource-service.ts` (release rule; conflict log; an open-Tasks query);
  - the port type;
  - `project-task-service.ts` (pass the open Tasks' keys);
  - `root-task-execution-lifecycle.ts` and `task-execution-input.ts` (the message sentence);
  - two tool-text files.
  - Plus 3 docs and tests. No UI, no data change.
- Architectural risk: `High`
- Risk rationale:
  - it changes a core lifecycle invariant (a copy may hold several open Tasks) and the release rule that stops runs (concurrency with closures, idle shutdown);
  - it changes the `delegate_task` contract and the collaboration model (CM-6).
- Escalation trigger:
  - any change to `send_message_to`, a queue, or a UI;
  - any data conversion;
  - any need to change reopen or idle-shutdown rules beyond what is stated here.

## Architecture Investigation Evidence

| Source | Observation | Decision | Uncertainty |
| --- | --- | --- | --- |
| AF-001 (probe, Reproduced) | Two open Tasks: alive after the first close; the last close requests no release | D-RELEASE | None |
| AF-003, AF-004 | Current rule fits; one refusal blocks | D-ASSIGN, D-CURRENT | None |
| AF-005, AF-006 | Existing path works for an open copy; text wrong | D-TEXT | `publishTaskExecutionsReopened` on an open copy: implementation confirms it is harmless (or skips it) |
| AF-007, AF-008 | Tool texts state the old rule | D-DOC | None |

## Intended Change

A copy may hold several open assignment entries. `delegate_task` gives an existing copy another Project Task without requiring its open Tasks to be closed. Closing a Task asks to stop a copy only when the copy has no open entry left. The given-Task message names the copy's other open Tasks instead of saying the previous one is closed.

## Change Scope (Mandatory)

- In scope: UC-001 to UC-003. Server `projects` domain and services (assignment eligibility, resource view, release, port answer), the collaboration lifecycle's existing-copy text, the `delegate_task` and `update_task` texts; docs `docs/design/collaboration_model.md` (CM-6), `docs/modules/projects.md`, `docs/modules/agent_team_execution.md` where it states the one-Task rule.
- Deliberately left alone:
  - `send_message_to`;
  - description-only delegation and Temp tasks;
  - reopen by message (a copy with an open Task is not closed, so nothing changes);
  - idle shutdown and wake;
  - peer-node refusals;
  - the parent → parts cascade (unchanged; it now composes correctly);
  - the web app and the Workspaces tree;
  - `part_of`.
- Follow-ups: none found.

## Relevant Behavior And Production-Path Map (Mandatory)

| BEH | REQ / AC | Trigger | Change | Spine |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001, 007; AC-001, 002, 007 | `delegate_task task_id` + `target_*_run_id` | Accepted while other Tasks are open | DS-001 |
| BEH-004 | REQ-002; AC-001, 008 | same | Message names the other open Tasks | DS-001 |
| BEH-003 | REQ-003; AC-001 | same | Unchanged mechanism (the new entry is the Task's root) | DS-001 |
| BEH-002 | REQ-004, 006; AC-003, 004, 006 | `update_task status=DONE/CANCELLED` | Release when no open entry is left | DS-002 |
| BEH-005 | REQ-005; AC-005 | Parent close | Unchanged cascade; release at the last close | DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact | Relationship |
| --- | --- |
| `evidence/SD-probe-several-tasks.test.ts.txt`, `evidence/SD-probe-several-tasks-output.txt` | The reproduction of AF-001. Implementation starts from it, turned into a failing unit test that the fix makes pass |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Current design issue found: `Yes`, a latent one. The release rule keys on "current entry in this Task", which is correct only while a copy can have at most one open entry (AF-001).
- Structural triggers: *Authoritative boundary* — all rules stay inside `TaskExecutionResourceService` and the domain file; the lifecycle only asks the port. *Capability reuse* — the existing-copy path is reused as is.
- Root cause classification: `Missing Invariant` (the release rule must express "no open entry left")
- Refactor needed now: `No`. The fix is a local rule change in the owner.
- Design response: D-RELEASE below; remove the refusal; keep everything else.

## Terminology

- *Open entry*: an assignment (or sub-work) entry of a copy with `closedAt: null`. A copy is *open* while it has at least one.

## Legacy Removal Policy (Mandatory)

- Removed: the "still works on Task …" refusal; the `TASK_AGENT_RESOURCE_CONFLICT` log for several open entries.
- Compatibility code: `None` (DESIGN.md rule 9).

## Persisted Data / State Transition Decision (Mandatory)

- Subject: `agent_run_resources.json` per Task. Shape unchanged; a copy may now have open entries in several files.
- Decision: `Not Affected` (format); existing data has at most one open entry per copy and reads the same.
- Rollback: an older build treats several open entries as damaged data for that copy (it logs and uses the newest). Nothing is engineered for rollback (guideline, "Rolling back after a migration").

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | `delegate_task task_id` + copy run id | New entry; message delivered | Lifecycle → `ProjectTaskService` → `TaskExecutionResourceService` |
| DS-002 | Primary | `update_task status=DONE/CANCELLED` | Task's entries closed; copies with no open entry asked to stop | `ProjectTaskService.closeAndWrite` → `TaskExecutionResourceService` |

## Primary Execution Spine(s)

- DS-001: `delegate_task → RootTaskExecutionLifecycle.assignToExistingCopy → port.resolveAssignment → port.assertAssignable (refusal removed) → prepareClosedCopyForResume (no-op for an open copy) → port.assignExistingTaskExecution (entry appended) → port.openTaskReferencesOf(copy, except this Task) → buildExistingCopyTaskMessage → withLiveLease(deliverWork)`
- DS-002: `update_task status=DONE → ProjectTaskService.update → closeAndWrite → resources.closeTask (entries of this Task closed) → write status → release.release(taskId, resources.releasableByHostRoot(taskId))` with the new rule: a copy is releasable when it has an entry in this Task and no open entry in any Task.

## Spine Narratives (Mandatory)

| Spine | Narrative |
| --- | --- |
| DS-001 | `assertTaskExecutionAssignable` keeps every check except "the current entry is open". It still requires: a history; an `assigned` current entry; the caller is that entry's assigner; the Task is not the copy's closed current Task (the existing "already has Task …" guidance); the copy ever started. `linkExistingTaskExecution` still refuses a copy already open in this Task. After the commit, the lifecycle asks the port for the copy's other open Tasks (keys, oldest first). When there are any, the message reads `New Task assigned to you: <key>. Your Task <k1> is still open; name the Task key in each report.` (or `Your Tasks <k1>, <k2> are still open; …`). This is REQ-002's report request (DEC-001 (a)). Otherwise the text is as today. Then the description block (description, comments, reference files) follows, as today. |
| DS-002 | `closeTask` closes this Task's open entries as today. `releasableByHostRoot(taskId)` now selects, grouped by host root, each copy that has an entry in this Task and no open entry in the view. The view is re-derived by the commit before `afterClose`, so a second Task closing concurrently on another serialization sees the committed state. When two of a copy's Tasks close concurrently, each closure re-derives under its own Task's serialization; whichever commits last sees no open entry and requests the release. A repeated request is harmless (existing behavior). Sub-work entries in the closed Task are closed with it; a sub-work copy has entries only there, so it is released. |

## Spine Actors / Main-Line Nodes

Lifecycle; `ProjectTaskService` (port); `TaskExecutionResourceService`; domain rules; release requester.

## Ownership Map

- `task-execution-resources.ts`: assignment eligibility (pure).
- `TaskExecutionResourceService`: the view, the current rule, the release rule (D-RELEASE), the open-Tasks query.
- `ProjectTaskService`: the port; maps open Task IDs to keys.
- Lifecycle / `task-execution-input.ts`: the message text.

## Thin Entry Facades / Public Wrappers

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Scope |
| --- | --- | --- |
| "still works on Task …" refusal in `assertTaskExecutionAssignable` | Option B | In This Change |
| Several-open-entries conflict log in `deriveCurrent` | Now valid | In This Change |
| Old `delegate_task` / `update_task` texts on the one-Task rule | Superseded | In This Change |
| `newCopyHint` and `namedTask` (`domain/task-execution-resources.ts` lines 153, 155) | Dead: their only use is the removed refusal (lines 176–177); grep at `3b09fbe308` finds no other reference | In This Change |
| The `currentTaskReference` / `currentTaskStatus` inputs of `assertTaskExecutionAssignable` | Dead: read only by the removed refusal (lines 163, 176–177) | In This Change |
| The current-Task location and status reads in `task-assignment-eligibility.ts` `assertCopyAssignable` (lines 65–68) | Dead: they only feed the removed inputs; grep finds no other use of their result | In This Change |
| `TaskExecutionResourceService.locationOfTask` | **Kept**: `openTaskReferencesOf` uses it to read each open Task's key (D-OPEN) | — |

## Return Or Event Spine(s)

Unchanged: each committed write marks the Task; the app shows each Task's root (its latest `assigned` entry).

## Bounded Local / Internal Spines

`deriveCurrent`: candidates → open ones → newest by `linkedAt` (tie: greater Task ID) → else latest linked; no log.

## Off-Spine Concerns Around The Spine

None new.

## Ownership Boundaries

- Only the resource service decides releasability and openness; the lifecycle never counts Tasks itself.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Forbidden Bypass |
| --- | --- | --- |
| `TaskExecutionResourcePort` | view, rules | Lifecycle reading Task files to find other Tasks |

## Dependency Rules

Unchanged.

## Interface Boundary Mapping

| Interface | Change |
| --- | --- |
| `TaskExecutionResourcePort.openTaskReferencesOf(execution, exceptTaskId): Promise<string[]>` (new) | Keys of the copy's open Project Tasks (Temp task IDs for Temp tasks), oldest first, excluding the given one |
| `buildExistingCopyTaskMessage({taskReference, description, otherOpenTaskReferences})` | New optional input |
| `delegate_task` description (mode 3) | "…when you made its most recent assignment; its other open Tasks stay open, and it is freed when its last Task is closed." |
| `update_task` description | "Both end this Task's work for its task agents; a task agent is stopped when this was its last open Task." |
| CM-6 | "Every delegated run belongs to one or more open Tasks … Closing a Task stops its delegated runs that have no other open Task …" |

## Interface Boundary Check

| Interface | Singular | Identity | Risk |
| --- | --- | --- | --- |
| `openTaskReferencesOf` | Yes | copy reference + excluded Task ID | Low |

## Main Domain Subject Naming Check

| Subject | Name | Natural |
| --- | --- | --- |
| Query | `openTaskReferencesOf` | Yes |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Give a Task to a copy | `assignToExistingCopy` | Reuse |
| Stop runs | `TaskExecutionResourceRelease` | Reuse |

## Subsystem / Capability-Area Allocation

| Area | Decision |
| --- | --- |
| `src/projects` | Extend |
| `src/agent-collaboration/execution/task` | Extend (text only) |
| `src/agent-collaboration/domain` (`delegate_task` text) | Modify |
| `src/agent-tools/project-tasks` (`update_task` text) | Modify |

## Draft File Responsibility Mapping

See final.

## Reusable Owned Structures Check

None new.

## Shared Structure / Data Model Tightness Check

Unchanged.

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `server/src/projects/domain/task-execution-resources.ts` | Remove the open-current refusal; doc comments |
| `server/src/projects/services/task-execution-resource-service.ts` | `releasableByHostRoot` (no open entry left); `deriveCurrent` (no conflict log); `openTaskIdsOf(execution)`; class doc ("current" = newest open) |
| `server/src/agent-collaboration/execution/task/task-execution-resource-port.ts` | `openTaskReferencesOf` |
| `server/src/projects/services/project-task-service.ts` (486 effective lines at `3b09fbe308`) | Port method `openTaskReferencesOf`, delegating to `task-assignment-eligibility.ts` so the service does not grow |
| `server/src/projects/services/task-assignment-eligibility.ts` | `assertCopyAssignable` loses the dead current-Task reads; new `openTaskReferencesOf(execution, exceptTaskId)` (D-OPEN): `resources.openTaskIdsOf(execution)` minus the excluded one, each `resources.locationOfTask(id)` read for its key (the existing `readTaskAt`), oldest first; deleted Tasks are skipped |
| `server/src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | Ask for the other open Tasks; pass them to the text |
| `server/src/agent-collaboration/execution/task/task-execution-input.ts` | The sentence |
| `server/src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | `delegate_task` text |
| `server/src/agent-tools/project-tasks/project-task-tool-contract.ts` | `update_task` text |
| test port fakes / fixtures | New port method |
| docs: `docs/design/collaboration_model.md` (CM-6 and its status row), `docs/modules/projects.md`, `docs/modules/agent_team_execution.md` | The rule |

## Applied Patterns

None.

## Target Subsystem / Folder / File Mapping

Existing files only.

## Folder Boundary Check

N/A (no new files except tests).

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| Message (other open) | `New Task assigned to you: autobyteus-280. Your Task autobyteus-204 is still open; name the Task key in each report.\n\nDescription:\n…` | "Your previous Task is closed" when it is not |
| Message (none open) | As today | — |
| Release | Copy holds 204 (open) and 280; 280 DONE → no stop; 204 DONE → stop requested once | Stopping at the first close; never stopping (AF-001) |
| Parent with parts on one copy | Parent CANCELLED → parent and parts close in turn → the last close requests the stop | A stop per Task |

## Backward-Compatibility Rejection Log (Mandatory)

| Mechanism | Decision |
| --- | --- |
| Keeping the old refusal behind a flag | Rejected |
| Version checks for nodes that still refuse | Rejected (rule 9) |

## Derived Layering

N/A.

## Change / Refactor Sequence

0. D-OPEN / removals as in the Removal Plan.
1. Turn the probe into a unit test that fails today (AF-001: the last close requests no release); fix `releasableByHostRoot`; drop the conflict log.
2. Remove the refusal; update its unit tests:
   - "still works on" no longer refuses;
   - assigner, never-started, same-Task, helper-copy and peer-node refusals still do.
3. Port method, the lifecycle text, the fakes; E2E (scripted runtime):
   - AC-001: 204 open, 280 given, message text, both Tasks show the team;
   - AC-003 / AC-004: close one, then the other;
   - AC-005: parent and parts on one copy;
   - AC-006: sub-work joins the newest;
   - AC-007: a closed Task given back.
4. Tool texts and docs.
5. Isolated Electron instance with test data (AC-010).

## Key Tradeoffs

- No queue and no `send_message_to` change: the agents and the delegator coordinate, as the user wants.
- Sub-work joins the newest open Task. A helper started for an older Task stops when the newest one closes. This is accepted for simplicity (DEC-007).

## Risks

- Agent behavior changes because the `delegate_task` text changes. Keep the wording minimal.
- Idle shutdown and wake of a copy with several Tasks: unchanged mechanism (the copy is open while any Task is). The E2E covers waking a sleeping copy given a second Task.

## Guidance For Implementation

- Start from the failing probe test.
- Do not commit the untracked `autobyteus-application-*/dist/` folders (AF-009).
- The "already has Task X … set it to TODO or IN_PROGRESS" guidance applies only when that Task is the copy's closed current Task (reviewer note).
- Check that `publishTaskExecutionsReopened` for an already-open copy is harmless; if it changes any visible state, publish only when the copy was closed before.
