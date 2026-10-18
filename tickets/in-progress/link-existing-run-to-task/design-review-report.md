# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/requirements-doc.md` (SR-003 approved by the user; SR-005 scope reduction by the user: `list_workspace_runs`, REQ-006, AC-005, BEH-004, UC-003, SCN-004 withdrawn)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/design-spec.md` (SR-004 adoption design, reviewed on the SR-005 basis: DS-003 removed)
- Supplemental Task Artifacts Reviewed: None. `superseded-*-link-only.md` are withdrawn history (SR-002 was paused before any result; no review artifact was written for it).
- Relevant Solution Revision IDs: `SR-003` .. `SR-008`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: `4`
- Trigger: targeted re-review of SR-008 after the implementer's DI-001 (`implementation-design-impact.md`: team address frames differ), revising the ARCH-F-003 basis (`/software_engineering_team/solution_designer`)
- Prior Review Round Reviewed: `3` (ARCH-REV-003, Pass)
- Latest Authoritative Round: `4`
- Current-State Evidence Basis: worktree at base `2f211340ee`, which includes Task 8641c0ac (merge `9b5cf4025d`). Code read:
  - `root-task-execution-lifecycle.ts:156-215` (`assignToExistingCopy`, `refuseCopyOutsideTree`, order: `assertAssignable` → `assignExistingTaskExecution` → deliver → `markStarted` / `markFailed`);
  - `project-task-service.ts:321-410` (`assertAssignable`, `assertCopyAssignable` → `assertTaskExecutionAssignable` over the run's history);
  - `task-execution-resource-service.ts:192` (`closedTaskExecutionsIn(hostRoot)`, host-root scoped);
  - `team-run-execution-tree-store.ts:24-54` (G2: `read` returns `null` for a `taskAgent` tree);
  - `team-run-package-catalog.ts` (`admit` / `exclude` / `isAdmitted`);
  - `projects.md:632-660` (Link before resources; a crash leaves `starting` → `not_confirmed`; "Borrowed, not adopted"). Round 2: `run-history/store/task-agent-own-files.ts:84-98` (`writeTeam` writes `validateTaskAgentTeamTreePayload(tree)`); `task-agent-team-tree-schema.ts:20-66` (projection: no `teamDefinitionName`, members' `role` / `description` → `null`, extra keys ignored on read); `team-run-execution-tree-schema.ts:33,55` (team-run reader requires `rootTeam.teamDefinitionName`). Round 3: `task-execution-tree-split.ts:211-237` (`writeAgentIfChanged` / `writeTeamIfChanged` compare the candidate with the reader's projection of the file on disk and write only when different). Round 4: DI-001 evidence (`team-run-execution-tree-schema.ts:40-46` root `/`; `task-agent-team-tree-schema.ts:52-83` root = `taskAgent.address`; `task-execution-source-schema.ts:55-61`); messages keyed by run ids only (`collaboration-communication-message-schema.ts:43`); `ProjectService.deleteProject` → `ProjectStore.deleteProject` removes Task files without the `ProjectTaskService` delete path (`project-store.ts:150-167`).

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

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None open | — | — | Resolved (round 3) |

## Review Decision

`Pass` (round 4)

## Findings

None open in round 4. ARCH-F-001..ARCH-F-003 remain resolved. ARCH-F-003's basis is revised by SR-008 (reversible rebase instead of a purely additive write), and its intent, an exactly reversible step 3, holds. One required implementation addition (the Project delete caller) is listed under Residual Risks. See `ARCH-REV-004`.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary), `/software_engineering_team/solution_designer` (informational).

## Residual Risks

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

- Review Decision: `Pass` (round 4)
- Material-Premise Gate: `Pass` (P-001 and P-003 resolved; P-002 not reachable)
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

  Round 4: the DI-001 resolution (reversible address rebase for team runs) is sound; ready for implementation with the Project-delete revert caller added.
