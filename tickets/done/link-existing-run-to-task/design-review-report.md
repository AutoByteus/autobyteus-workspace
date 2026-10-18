# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/requirements-doc.md` (SR-003 approved by the user; SR-005 scope reduction by the user: `list_workspace_runs`, REQ-006, AC-005, BEH-004, UC-003, SCN-004 withdrawn)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/design-spec.md` (SR-004 adoption design, reviewed on the SR-005 basis: DS-003 removed)
- Supplemental Task Artifacts Reviewed: None. `superseded-*-link-only.md` are withdrawn history (SR-002 was paused before any result; no review artifact was written for it).
- Relevant Solution Revision IDs: `SR-003` .. `SR-017`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-013`
- Current Review Round: `13`
- Trigger: targeted review of SR-017: the consolidated behavior-defining `adoption-contract.md` (validation V-1..V-18) and its four additions V-2..V-5 in design-spec "Adoption Contract (SR-017)" (`/software_engineering_team/solution_designer`)
- Prior Review Round Reviewed: `12` (ARCH-REV-012, Pass)
- Latest Authoritative Round: `13`
- Current-State Evidence Basis: worktree at base `2f211340ee`, which includes Task 8641c0ac (merge `9b5cf4025d`). Code read:
  - `root-task-execution-lifecycle.ts:156-215` (`assignToExistingCopy`, `refuseCopyOutsideTree`, order: `assertAssignable` → `assignExistingTaskExecution` → deliver → `markStarted` / `markFailed`);
  - `project-task-service.ts:321-410` (`assertAssignable`, `assertCopyAssignable` → `assertTaskExecutionAssignable` over the run's history);
  - `task-execution-resource-service.ts:192` (`closedTaskExecutionsIn(hostRoot)`, host-root scoped);
  - `team-run-execution-tree-store.ts:24-54` (G2: `read` returns `null` for a `taskAgent` tree);
  - `team-run-package-catalog.ts` (`admit` / `exclude` / `isAdmitted`);
  - `projects.md:632-660` (Link before resources; a crash leaves `starting` → `not_confirmed`; "Borrowed, not adopted"). Round 2: `run-history/store/task-agent-own-files.ts:84-98` (`writeTeam` writes `validateTaskAgentTeamTreePayload(tree)`); `task-agent-team-tree-schema.ts:20-66` (projection: no `teamDefinitionName`, members' `role` / `description` → `null`, extra keys ignored on read); `team-run-execution-tree-schema.ts:33,55` (team-run reader requires `rootTeam.teamDefinitionName`). Round 3: `task-execution-tree-split.ts:211-237` (`writeAgentIfChanged` / `writeTeamIfChanged` compare the candidate with the reader's projection of the file on disk and write only when different). Round 4: DI-001 evidence (`team-run-execution-tree-schema.ts:40-46` root `/`; `task-agent-team-tree-schema.ts:52-83` root = `taskAgent.address`; `task-execution-source-schema.ts:55-61`); messages keyed by run ids only (`collaboration-communication-message-schema.ts:43`); `ProjectService.deleteProject` → `ProjectStore.deleteProject` removes Task files without the `ProjectTaskService` delete path (`project-store.ts:150-167`). Round 5 (web): `runHistoryReadModel.ts:250-281` (every open context becomes a `local` row); `runHistoryNavigationProjection.ts:170-187` (team contexts become `teamNodes`); `runHistoryMutationActions.ts:148-175, 249-256` (agent archive runs `cleanupStoredRunLocalState`; team archive only refreshes the tree); `team-run-history-service.ts` omits archived inactive team runs from the listing.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: a run changes identity class and runtime owner. It is a multi-record persistence change with crash recovery, and a tool-contract change.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. Still Large / High after SR-005 removed the list tool.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. The delegator (a standalone agent run, DEC-108) gives an open Project Task with `delegate_task {target_*_run_id, task_id}` to an idle hand-started standalone agent run or team run in its own workspace, with no Task and no delegated runs of its own (REQ-007). The run becomes the delegator's task agent: same files, conversation continues with the Task, shown under the delegator, coordinated and closed like any task agent. A partial adoption is finished by the same delegator repeating `delegate_task` (DEC-109). Refusals change nothing.
- Relevant existing behavior and evidence confirmed: Yes. The existing-copy path refuses runs outside the delegator's tree today. Since 8641c0ac, a hand-started run and a task agent share the folder layout, so adoption adds the `taskAgent` section, the link and the Task entry, and moves nothing. G1 / G2 hide adopted runs from user-run readers.
- Scope guardrail confirmed: Yes (other workspaces, runs with own delegated runs, team / org delegators, mid-turn adoption, any visibility-only link and the list tool are out).
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, AC or preserved-behavior ID: `Yes`
- Remaining material ambiguity: None beyond the findings.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | ARCH-F-001 and ARCH-F-003 resolved |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | existing link rendering + history row removal |
| BEH-003 | System | Pass | Pass | Pass | Confirmed | existing task-agent lifecycle |
| BEH-004 | — | — | — | — | Withdrawn (SR-005) | — |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature | — |
| Root-cause classification is explicit and evidence-backed | Pass | the 8641c0ac layout makes adoption a record transition | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | one owner on the existing path | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 Adopt | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 Afterwards | Pass | Pass | N/A | Pass | Pass | Pass | Pass | Pass |
| DS-003 List | — | — | — | — | — | — | — | Removed (SR-005) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RootTaskExecutionLifecycle.assignToExistingCopy` → `HandStartedRunAdoption` | Pass | Pass | Pass | Pass | branch only where the code refused today |
| 8641c0ac tree stores (own file + link) | Pass | Pass | Pass | Pass | reused; no direct file writes |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| adoption owner → G1/G2 readers, history index stores, root managers (release), delegator adapter, Task port | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `delegate_task {target_agent_run_id \| target_team_run_id, task_id}` | Pass | Pass | Pass | Low | Pass — unchanged shape; the existing-run mode widened by eligibility |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| assignment + delivery | Pass | Pass | N/A | Pass | `assignToExistingCopy`, `buildExistingCopyTaskMessage`, `markStarted` / `markFailed` |
| own file + link | Pass | Pass | N/A | Pass | 8641c0ac split write |
| adoption owner | Pass | Pass | Pass | Pass | eligibility, step order and resumption have one owner |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| agent-collaboration/execution/task, projects, run-history, agent-tools texts | Pass | Pass | Pass | Pass | list tool removed (SR-005) |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | Pass | N/A | N/A | Pass | records are exactly a catalog task agent's |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| adopted run's own file / link / Task entry | Pass | Pass | Pass | N/A | Pass | no new field |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Final mapping (minus the list tool) | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `hand-started-run-adoption.ts` beside the lifecycle | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| unconditional `refuseCopyOutsideTree` for hand-started runs | Pass | Pass | Pass | Pass | Docs: `projects.md` "Borrowed, not adopted" (line ~657) contradicts adoption and should be revised with the §Follow-up text |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| adoption | No | Pass | Pass | listing in both places rejected |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| per-adoption writes (own file section, link, Task entry, history row) | Not Affected (no migration) | Pass | Pass | N/A | Pass | Round 3: step 3 is additive (`addTaskAgentSection`); the record is read back so the split write writes only the link; the reversal restores the prior content parsed-equal |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| steps 1–5 (step 4 list tool removed) | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| adoption call and result | Yes | Pass | N/A | Pass | the `list_workspace_runs` half of the example is obsolete (SR-005) |

## Material Premise Validation (Only When Needed)

### `P-001` — An adoption stops after step 1 (Task entry `starting`) and before step 3 (own-file section)

- Related approved requirement or established contract: DEC-109 ("every step is recognized from the files; the same delegator repeating `delegate_task` finishes it; nothing is lost meanwhile"); REQ-002; `projects.md` "A run left `starting` by a crash stays `starting` … `not_confirmed`".
- Initiating basis kind: `Operational` (the scenario DEC-109 governs: an interrupted adoption)
- Independent trigger: the app or process stops, or a step fails, after the `assigned` `starting` entry is written and before the tree store write.
- Forward path: the delegator repeats `delegate_task` → not in its tree → the eligibility "belongs to no Task" check (and today's `assertCopyAssignable` / `assertTaskExecutionAssignable`, which refuse an open entry such as "already this Task") → refused. The design's resumption check ("own file names this delegator's root?") is reached only after step 3.
- Consequence: the partial adoption can never be finished. The run stays a hand-started run with a dangling open `starting` entry for the Task (board `not_confirmed`; ownership index treats it as Task-owned) until the Task closes. Fencing is host-root scoped, so the user's own session is not locked.
- Reachability: `Reachable` (the interruption class DEC-109 explicitly covers).
- Review consequence: ARCH-F-001 (round 1); resolved in round 2 (recognition from the open entry, checked first; tests after steps 1–4).

### `P-002` — A user message reaches the run between its release (step 2) and the own-file section (step 3)

- Initiating basis kind: `User`
- Forward path: two individually supported actions in the same sub-second window, the user messaging the run and the PM adopting it.
- Reachability: `Not Reachable` as a supported workflow (concurrency of two independent actions without a product goal; Principle 6).
- Review consequence: no machinery. The idle check plus refusal-when-running is sufficient.

### `P-003` — A team-run adoption stops inside step 3 (own tree written with `taskAgent`, no link), and the Task is then closed

- Related approved requirement or established contract: REQ-004 (nothing deleted), DEC-109, REQ-005; `DESIGN.md` rule 7; the design's own close-path rule ("removes that `taskAgent` section so the run is a hand-started run again and is listed in its group").
- Initiating basis kind: `Operational` + `User` (the interruption class DEC-109 covers; then the user or an agent sets the Task DONE / CANCELLED)
- Forward path: step 3 uses the delegator adapter and tree store, i.e. the 8641c0ac split write. `TaskAgentOwnFiles.writeTeam` writes `validateTaskAgentTeamTreePayload(tree)`, a projection without `rootTeam.teamDefinitionName` and with members' `role` / `description` set to `null`. Then the stop happens, and the close removes the `taskAgent` section. The remaining tree lacks `teamDefinitionName`, which the team-run reader requires (`team-run-execution-tree-schema.ts:55`). The team run is therefore not admitted, not listed and not openable, and its definition-derived fields are gone from the file.
- Consequence: the hand-started team run the design promises to make "listed again" stays hidden or unreadable instead.
- Reachability: `Reachable` (same interruption class as P-001, followed by a normal Task close).
- Review consequence: ARCH-F-003 (round 2); resolved in round 3 (additive step 3, test for a team run stopped inside step 3 and then closed).

### `P-004` — The adopted run's chain holds a run whose current open entry is in a Project Task

- Related approved requirement or established contract: REQ-007 (full adoption: the stored state equals a natural chain), DEC-110 ("their open tracking-Task entry closes (that Task CANCELLED …)"); `projects.md` "Workers cannot assign" (`TASK_AGENT_RESOURCE_OWNED_SENDER`).
- Initiating basis kind: `User` (the PM is asked to give a Task to a hand-started standalone agent run that has itself assigned Project Tasks, e.g. an earlier Project Task Manager run)
- Independent trigger and evidence (read-only, user data 2026-10-18): hand-started PM run `project_task_manager_a5f6d9d306e54970bafdad895bdf731d` hosts 2 open and 19 closed entries in Project Tasks; four other PM runs host closed Project Task entries; 11 `project_task_manager_*` runs exist. Hand-started team runs host only temp (ad-hoc) Task entries, all closed (Work Journal's `software_engineering_team_ffde3bd0…`: 1 closed).
- Forward path: such a run passes the stated eligibility (standalone, hand-started, same workspace, no Task, idle) → the chain step treats each copy with an open entry as "ongoing" → closes its entry and marks the tracking Task, here a real Project Task on the user's board, CANCELLED with a note → appends a `delegated` entry in the adopted Task.
- Consequence: open Project Tasks on the user's board are cancelled as a side effect of adopting a run. A natural chain cannot reach this state, because a Task-owned run cannot assign Tasks.
- Reachability: `Reachable` (the data contains the shape; nothing in the eligibility excludes it).
- Review consequence: ARCH-F-004 (round 6); resolved in round 7 by the user's decision (REQ-008 / AC-009 / DEC-112: refuse any chain with a board-Task entry, naming the keys).

### `P-005` — An adoption stops inside chain step (2) for an ongoing chain run X

- Related approved requirement or established contract: DEC-109 (retry finishes a partial adoption; nothing lost), REQ-007 (ongoing chain runs become sub-work).
- Initiating basis kind: `Operational` (the interruption class DEC-109 covers)
- Forward path: step (2) writes several Task files (close X's tracking entry, cancel the tracking Task, append an open `delegated` entry in the adopted Task). Suppose the stop lands after the close and before the append. On retry, C is recomputed from T's tree (X is still there until step 4), and X's current entry is now closed, so the rule "if closed, nothing else" treats X as finished. X then stays closed, its `hostRoot` is the delegator's root, so `closedTaskExecutionsIn(delegator root)` fences it, and it never becomes sub-work. Separately, if the tracking Task's CANCEL runs through the normal close path while X's current entry is the closed one in that Task, `releasableByHostRoot(trackingTask)` (`task-execution-resource-service.ts:207-219`) includes X, and the delegator's root is asked to stop it.
- Consequence: an ongoing chain run silently becomes finished and fenced, against REQ-007 / DEC-110 / DEC-109.
- Reachability: `Reachable` (interruption), and the release-set effect follows from the order of operations alone.
- Review consequence: ARCH-F-005 (round 6); resolved in round 7 (classification once from the pre-adoption temp-Task status; append before close; temp Task cancelled last; intermediate states stated; revert returns X to T).

### `P-006` — The adopted run's chain holds a delegated run that belongs to no Task

- Related approved requirement or established contract: REQ-007 ("ongoing ones become sub-work of the adopted Task; finished ones stay finished"), DEC-111 (behavior-driving state equal: links, coordinators, hosts, **current entries**); CM-6 (new delegations always belong to a Task; unowned delegated runs exist only as stored history); REQ-003 (stopped and removed with the Task).
- Initiating basis kind: `User` (the PM is asked to adopt a hand-started team run whose chain includes unowned delegated runs)
- Independent evidence (read-only, user data 2026-10-18): 19 roots with delegated runs hold 93 links, and 11 of those links belong to no Task. Examples are `product_prototyper_3341…` in `software_engineering_team_095d…`, and `product_team_2e60…` and `agent_package_creator_0515…` in `software_engineering_team_a853…`: the collaborators converted to unowned delegated runs by Task 259ddae7.
- Forward path: the design classifies X as ongoing or finished **only** from "its tracking temp Task". An unowned X has none, so neither branch applies. If it is moved without a Task entry it stays an unowned delegated run under the delegator. It is then not closed, stopped or removed with the adopted Task, unlike the natural chain, where its current entry would be `delegated` sub-work of the Task.
- Consequence: undefined implementation behavior on real data, and a likely departure from DEC-111 / REQ-003 (it lingers under the PM after DONE).
- Reachability: `Reachable` (shape present in the user's hand-started team runs).
- Review consequence: ARCH-F-007 (round 7); resolved in round 8 (class *unowned*, an open `delegated` entry in the adopted Task, nothing closed; DEC-113; retry recognition; fixture).

### `P-007` — An adoption stops after T's link (the SR-015 commit point) and the adopted Task is closed or deleted before the retry

- Related approved requirement or established contract: DEC-109 (a partial adoption is finished; nothing lost), REQ-007 / DEC-110 / DEC-113 (ongoing and unowned chain runs become sub-work and close with the adopted Task), REQ-008 / DEC-114 (the board worker becomes the delegator's own assignment: hosted by it, `assignedBy` = the delegator), `DESIGN.md` rule 7.
- Initiating basis kind: `Operational` + `User` (the interruption class DEC-109 covers; then the user or an agent closes the Task, or deletes the Task or its Project)
- Forward path: after T's link, the remaining steps are "forward only, resumed by retry". The retry is `delegate_task`, which requires an open Project Task, so it is refused once the Task is DONE / CANCELLED or deleted. Nothing else drives the forward steps. The chain links already in the delegator's file are composed on the next load, since their delegators (T and its members) are now present. Their Task side was never written:
  - *ongoing* runs keep an open entry in their temp Task with `hostRoot` = T's former root, which is no longer a root;
  - *unowned* runs have no entry;
  - the *board* worker keeps `hostRoot` = T's former root and `assignedBy` = T's member.
- Consequence:
  - ongoing and unowned chain runs never close with the adopted Task, and their stop set and fencing point at a root that no longer exists;
  - the board worker's board Task's DONE cannot stop it, and the delegator cannot follow up or reactivate it (`assignedBy` is not the delegator, and the old assigner is now a Task-owned worker).
- Reachability: `Reachable`.
- Review consequence: ARCH-F-008 (round 11); resolved in round 12 (`completeCommitted`, always finished after the commit point; triggered by retry, root load and the close / delete paths before they act).

### `P-008` — While an adoption is in progress, the user deletes or archives T, or deletes D, from history

- Related approved requirement or established contract: `adoption-contract.md` §6.3–§6.7 ("No limbo", the revert returns everything "exactly as they were", "Nothing is left hidden"), DEC-109, `DESIGN.md` rule 7.
- Initiating basis kind: `User` (sidebar history delete or archive, both supported actions) after the interruption class DEC-109 covers.
- Forward path: an adoption is interrupted (before or after the commit point). V-5 resumes it only when D's root next loads, and after a restart no root loads until its run is used (`standalone_agent_run_root.md` §Root lifetime). So the in-progress state can last.
  - **T:** before the commit point, T's history row is still listed; V-3 only refuses T's session start. The user can delete or archive T. Deleting T removes its folder. The resume then cannot continue (T gone) or revert (nothing to return the chain to). The chain runs, whose own files already name D and whose links sit in D's tree file with T or a member as delegator, are left out forever (`task-execution-tree-split.ts:127-155`), and the open `starting` entry for T dangles.
  - **D:** D's run is inactive and can be deleted from history. Its folder, including the tree file with the appended chain links, is removed. The chain runs become detached and hidden (8641c0ac §10), and T stays refused by V-3 (an open `starting` assignment hosted by D) until X closes. Even then the revert cannot find the chain (its list lived in D's tree file).
- Consequence: runs left hidden, or T blocked, against the contract's "no limbo / nothing left hidden".
- Reachability: `Reachable` (interruption plus a supported history action while the in-progress state lasts until D is used).
- Review consequence: ARCH-F-010.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| history delete / archive during an in-progress adoption | runs hidden or T blocked | ARCH-F-010 | Open |

## Review Decision

`Fail` (round 13)

## Findings

Round 13 (SR-017). ARCH-F-001..ARCH-F-009 remain resolved. The contract and V-2 / V-4 / V-5 are accepted:
- V-2: hub log merged into T's own log after the commit point, by `messageId`, hub file kept.
- V-4: classification from each run's own entry state before this adoption's writes, recognizing its own writes.
- V-5: D's root load resumes any in-progress adoption.
- V-3 is accepted as far as it goes.

One new finding:

### ARCH-F-010 — History delete or archive of T, or delete of D, during an in-progress adoption leaves runs hidden or T blocked (Design Impact, Medium)

- Scope status: `Within Approved Scope` (`adoption-contract.md` §6 promises no limbo and nothing hidden); changes approved behavior: `No`.
- Protects: `adoption-contract.md` §6.3–§6.7, DEC-109, `DESIGN.md` rule 7.
- Evidence: P-008. V-3 guards only T's session start. The in-progress window lasts until D's root loads (V-5), which after a restart is whenever the user next uses D. History delete and archive of T (listed until the commit point) and history delete of D (inactive) remain possible.
- Required update: close the window for these history actions. For example:
  - while an adoption of T is in progress (the same open `starting` assignment V-3 checks), refuse history delete and archive of T with the V-3 message;
  - refuse history delete of D while D hosts an in-progress adoption, or have D's delete run the adoption owner first (complete after the commit point, revert before it), as the Task close and delete paths do.

  State which, add both to the refusal list in §5 / §6, and add tests: an interrupted adoption, then delete T, archive T, and delete D.
- Proportionate because: it reuses the V-3 recognition and the existing completion and revert owner; no new state.
- Recipient: `/software_engineering_team/solution_designer`

## Classification

- `Design Impact`: ARCH-F-010

## Recommended Recipient

`/software_engineering_team/solution_designer`

## Residual Risks

- Round 13 notes:
  - Approval status: `adoption-contract.md` is marked "draft for the user's read", is behavior-defining, and states that it governs the design where they differ, while the implementer resumes in parallel. V-2..V-5 are Solution Designer additions within the direction. Record the user's read and approval of the contract (and any change from it) in the solution revision record before delivery.
  - V-4 side effect, accepted: a temp Task whose DONE status write failed (closed entries, status open) stays open after adoption. Its runs are *finished* and keep it as their current Task, so it is not among the temp Tasks to cancel. This is a pre-existing stale state, unchanged.

- Round 12 (SR-016) implementation notes:
  - The load-time completion check runs on every load of the delegator root, a long-lived hub. Keep it to the in-memory Task index and the own files the compose already reads (no extra pass over the hub's task agents), in line with contract H2.
  - Concurrency: a close or delete path running `completeCommitted` directly (delegator root inactive) can overlap a load that starts the root and also calls it. Idempotent steps plus per-file serialization (Task serialization, the root's persistence lock) cover it; add one test of that overlap.

- Round 10 (SR-014, DEC-114, the user):
  - The *board* class (current entry in a Project Task) is handed to the delegator as its own assignment: `rehostEntries` to the delegator; `reassignToDelegator` on an `assigned` current entry; own file's and link's delegator → the delegator; the current Task stays the board Task.
  - Verified against code: reopen and follow-up require the current entry to be `assigned` with `assignedBy` = the requester (`task-execution-resources.ts:136, 172-178`); the stop set and fencing go by `hostRoot`; the message scope cuts runs whose current Tasks differ (`root-task-execution-resource-scope.ts:63-69`). So the board run is closed only by its board Task, the delegator can follow up and reactivate, and the adopted run and the board run stop messaging each other, all as in a natural chain (DEC-111 holds).
  - Sub-work of a board run keeps its `delegated` entry and its delegator X. Its link is valid because all chain links are activated together after T's link (SR-013).
  - Recorded: for a **closed** current entry, `reassignToDelegator` rewrites that entry's `assignedBy`. That is intended, since the current entry drives reactivation (DEC-111 / DEC-114 "open or closed"), and it is the one history field that changes; worth a line in the docs.
  - Hand-started PM runs become adoptable; their board Tasks' workers pass to the adopting PM (user-decided).

- Round 9 (SR-013, DI-002):
  - (1) Chain links are appended to the delegator's tree **file** under its persistence lock and activated in one commit after T's link, with started events. This is verified against the split write: "the tree keeps … every on-disk entry it did not load unchanged and in place" (`task-execution-tree-split.ts:186-205`), so saves by the active delegator root keep them. A link whose delegator is not yet loaded is left out and reported (`:137-155`). The intermediate-state statement is corrected (X is shown nowhere from its sub-step 1 until T is linked; resumable).
  - (2) The close-revert returns every chain run to T: own file, link back into T's tree, link out of the delegator's file. For *finished* runs it also calls `rehostEntries(X, T)`. Implementation order for a team T: restore T's file (remove `taskAgent`, inverse rebase) **before** re-adding chain links, because a task-agent team tree cannot hold links. Residual, accepted: an *ongoing* or *unowned* run returned this way keeps the adopted Task's closed `delegated` entry as its current entry. The message scope then refuses it as a closed Task's copy (`agent_communication.md:282-290`), although T's root never fences it (fencing is per host root). This is reachable only when an interrupted adoption's Task is closed before the retry, which deliberately ends that work. Nothing is lost and the run is visible.
  - (3) Temp Tasks have no note field (`projects/domain/ad-hoc-task.ts`), so the temp Task is CANCELLED without a note. That is a minor wording change from DEC-110, within the direction.

- Round 8 notes:
  - *Unowned* is keyed on "no Task entry anywhere". It therefore also covers any pre-Task-era copy, not only converted collaborators, which is the intended behavior under DEC-111.
  - Retry recognition for *finished* runs rests on `rehostEntries` being idempotent (finished runs never get a `delegated` entry); the implementer should keep it idempotent.
  - The round-4 Project-delete revert requirement still applies.

- Round 7 notes:
  - Implementation note: "append the open `delegated` entry first" cannot reuse the existing append operations, which refuse a run that already has an open entry (`task-execution-resource-service.ts:116,287`). Name the dedicated Task-side operation in the design. It appends while the old entry is still open, under X's serialization. The transient two-open-entries state is then resolved by `deriveCurrent` (later `linkedAt` wins; `TASK_AGENT_RESOURCE_CONFLICT` logged, non-fatal, `:336-345`). The log line calls the state "damaged data"; that is acceptable for a crash window, but the wording could be noted.
  - Editorial: `requirements-doc.md` Document Status still says `Current solution revision ID: SR-010`.

- Round 6 notes:
  - The handoff file's header and early sections are stale: "Current SR entry: SR-004", the old Goals list, and the old Workspace and Scope ("Out: runs with their own delegated runs"). Only its "Revision SR-010" section is current. Update it with the revision.
  - Sound in SR-010: the target state is taken from real natural-chain data; CM-7 means the whole chain sits in T's tree; the eligibility covers the whole chain being idle with no foreign host; chain steps run before T's own steps, so T's own tree gets `taskExecutions: []`; messages stay keyed by run id.

- Round 5 (SR-009, CRR-005 F-002):
  - The renderer-only rule is accepted. It is needed because the SR-004 premise ("history row removed → row gone") ignored the renderer's local rows, which CRR-005 verified.
  - Rule 1 (retire the own-group row on `task_execution_started` for a run held as a top-level context) matches by run id. A freshly delegated copy's id can never equal a top-level context, so it affects adopted runs only.
  - Rule 2 (drop a history-origin local row once a later history read no longer lists it) also covers the delegator-closed case. **Correction (after IR-004):** the side note that rule 2 would newly hide an archived open team run was wrong. Team archive already removes the local team context (`archiveTeamRunRecord` → `cleanupStoredTeamRunLocalState` → `removeTeamContext`, `runHistoryMutationActions.ts:84-110, 236-241`; pinned by `runHistoryStore.spec.ts`), as agent archive does, so rule 2 adds no behavior there. The reviewer read only the outer `archiveTeamRunInHistoryStore`. Implementer refinement accepted: rule 2 respects the agent history's per-agent window (`limitPerAgent`), so only a read that would have listed the run can drop it.
  - Tests: web unit tests for both rules (agent and team) and the D-1 desktop rerun, as listed.

- Round 4 (SR-008, DI-001):
  - The reversible address rebase is accepted. Teams are flat, so `/` ↔ `A` is a prefix swap with an exact inverse. It covers root, members, coordinator and handoffs; `teamDefinitionName`, `role` and `description` are kept; messages and member folders are keyed by run id; the record is read back so only the link is written; the link's `startedAt` equals the own file's `startedAt` / `createdAt`.
  - Also accepted: the catalog address from the endpoint catalog (a definition no longer listed is refused), archived runs refused, and `HandStartedRunAdoption.revertUnfinished` owned and serialized on the delegator root's queue.
  - R-3 (members remember their old addresses) is accepted: they recover through not-found guidance and the restored context.
  - **Required implementation addition:** call `revertUnfinished` from the Project delete path too. `ProjectService.deleteProject` removes every Task's files through `ProjectStore.deleteProject` without passing through `ProjectTaskService`'s Task delete. Without this, a run stopped inside step 3 whose Project is then deleted stays hidden (own file names the root, no link, and no Task left to retry against), against DEC-109 and rule 7. Owner and semantics are already defined; this is one more caller plus a test.

- Round 3 implementation note: equality at the link write depends on the composed record matching the reader's projection. That includes team handoffs: `writeTeamIfChanged` takes `treeHandoffs` from the coordinating tree. If they ever differ, a finished adoption is normalized at link time. That is harmless (definition-derived fields; the design records later normalization), but the implementer should confirm it and test that a completed adoption leaves the own file unchanged apart from `taskAgent`, if equality is intended.

- Round 2: residuals taken. Application-bound runs are refused; `TeamRunPackageCatalog.exclude` is in step 4; the user is told about the Memory page Teams list; the example and the `projects.md` "Borrowed, not adopted" line are updated.

- An adopted team run leaves the Memory page Teams list, as every task agent team of a standalone hub does (8641c0ac FU-1). This is consistent with REQ-003; worth telling the user.
- R-1 (the UI sees the run leave its group while open) is accepted. P-002 is not reachable.

## Latest Authoritative Result

- Review Decision: `Fail` (round 13)
- Material-Premise Gate: `Pass` (P-008 reachable and drives ARCH-F-010)
- Notes: The core is sound:
  - adoption as a branch of `assignToExistingCopy` where the code refused today;
  - an eligibility list matching REQ-001 / REQ-005 / REQ-007 / DEC-108;
  - no file moves, thanks to the 8641c0ac layout;
  - the existing "Link before resources" order;
  - delivery through the existing follow-up path;
  - history row removal and G1/G2 hiding;
  - host-root-scoped fencing, so the user's own session is never locked;
  - Large / High.

  The fixes are bounded: resumption from step 1, and the REQ-004 wording.

  Round 2: both resolved. Remaining: make step 3 additive so the close-path reversal restores a team run (ARCH-F-003).

  Round 3: ARCH-F-003 resolved; the design is ready for implementation.

  Round 13 (SR-017): the contract and V-2..V-5 are accepted; remaining: history delete / archive of T and delete of D during an in-progress adoption (ARCH-F-010).

  Round 12 (SR-016): ARCH-F-008 and ARCH-F-009 resolved; ready for implementation.

  Round 11 (SR-015): the placement is accepted; remaining: a completion path after the commit point that does not depend on a retry (ARCH-F-008), and the stale revert text (ARCH-F-009).

  Round 10 (SR-014): the board class is sound and verified against the Task rules; ready for implementation.

  Round 9 (SR-013): DI-002 answered soundly; ready for implementation.

  Round 8 (SR-012): ARCH-F-007 resolved; the full-adoption design is ready for implementation.

  Round 7 (SR-011): ARCH-F-004..ARCH-F-006 resolved; remaining: the classification of chain runs that belong to no Task (ARCH-F-007).

  Round 6 (SR-010): fix the Project-Task chain case (user decision), the order and recognition of chain step (2), and AC-008's definition.

  Round 5: the SR-009 renderer rule for the sidebar after adoption is sound.

  Round 4: the DI-001 resolution (reversible address rebase for team runs) is sound; ready for implementation with the Project-delete revert caller added.
