# Design Review Report — task-agent-several-tasks

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-several-tasks/tickets/in-progress/task-agent-several-tasks/requirements-doc.md` (Approved, SR-003)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-several-tasks/tickets/in-progress/task-agent-several-tasks/investigation-notes.md` (AF-001–AF-009)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-several-tasks/tickets/in-progress/task-agent-several-tasks/solution-revision-record.md` (SR-001–SR-004)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-several-tasks/tickets/in-progress/task-agent-several-tasks/design-spec.md` (SR-005, `Ready`)
- Supplemental Task Artifacts Reviewed: `evidence/SD-probe-several-tasks.test.ts.txt`, `evidence/SD-probe-several-tasks-output.txt` (AF-001 reproduction)
- Relevant Solution Revision IDs: SR-003 (requirements basis), SR-004 (design), SR-005 (ARCH-REV-001 corrections)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-several-tasks/tickets/in-progress/task-agent-several-tasks/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: Revised `Architecture Design Complete` (SR-005, "Round 2" of the handoff) after ARCH-REV-001 Fail
- Prior Review Round Reviewed: 1 (ARCH-REV-001, Fail — ARF-001, ARF-002)
- Latest Authoritative Round: 2
- Round 2 scope: recheck of ARF-001 and ARF-002 against the current `design-spec.md`. The requirements are unchanged (route 1). The other verdicts keep their round-1 evidence. SR-005 changed only the DS-001 message text, the removal plan and the file mapping (`openTaskReferencesOf` moves to `task-assignment-eligibility.ts`, D-OPEN), and adopted the two reviewer notes.
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-several-tasks`, branch `codex/task-agent-several-tasks` at `3b09fbe308` (no source changes). Read:
  - `task-execution-resource-service.ts` (whole file: `deriveCurrent`, `releasableByHostRoot`, `closeTask`, `commit`/`swap`, `serialize`/`serializeCopyInTask`, `settle`, `ownerOf`, `isOpen`, the closed-by-root index);
  - `domain/task-execution-resources.ts` (`assertTaskExecutionAssignable`, `linkExistingTaskExecution`);
  - `task-assignment-eligibility.ts`, `task-execution-resource-release.ts`;
  - `root-task-execution-lifecycle.ts` (`assignToExistingCopy`, `prepareClosedCopyForResume`, `refuseCopyOutsideTree`);
  - `root-task-execution-resource-scope.ts` (`releaseTaskExecutions`, which re-checks `isClosed` before stopping);
  - a grep of every caller of `publishTaskExecutionsReopened`, `isOpen` and `closedTaskExecutionsIn`.
  - Effective non-empty lines: `project-task-service.ts` 486 (the design says 474; the comments ticket has since landed), `root-task-execution-lifecycle.ts` 477.

## Routing Classification Review

- Task size: `Small`
- Architectural risk: `High`
- Classification rationale reviewed: about 7 source files in existing owners. It changes a core lifecycle invariant (several open entries per copy), the release rule that stops runs, the `delegate_task` contract and CM-6.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` (round 2: BEH-004 aligned)
- Approved requirements / intended behavior understood: Yes. Option B: the latest assigner may give an open copy another Project Task; the copy is freed when its last open Task closes; `send_message_to` is unchanged; no queue, no UI.
- Relevant existing behavior and evidence confirmed: Yes.
  - The one-open-Task rule lives in `assertTaskExecutionAssignable` (line 175).
  - `deriveCurrent` already picks the newest open entry, and logs a conflict when there are several.
  - `releasableByHostRoot` keys on "current entry in this Task and closed". The probe reproduces that this misses the last close (AF-001).
  - `closeTask` serializes by Task ID; the view is swapped synchronously at commit.
  - The root's `releaseTaskExecutions` stops only copies that are still closed (`isClosed` re-check).
- Scope guardrail confirmed: Yes.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: Yes. ARF-001 → REQ-002, AC-001, UC-003. ARF-002 → Core Principle 7 (No Dead Code), which ticket-scope.md applies to every change as "This ticket".
- Remaining material ambiguity: none. The Solution Designer chose route 1: REQ-002 is kept, and SR-005 records that the user is told about the clause.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Pass | Pass | Pass (DS-001) | Confirmed | — |
| BEH-002 | System | Pass | Pass (AF-001 reproduced) | Pass (DS-002, D-RELEASE) | Confirmed | — |
| BEH-003 | User | Pass | Pass (`latestAssignment` = latest `assigned` entry) | Pass | Confirmed | — |
| BEH-004 | Contract | Pass. DS-001 and the example add `; name the Task key in each report.` when other Tasks are open (REQ-002, AC-001) | Pass | Pass (DS-001) | Confirmed | — |
| BEH-005 | System | Pass | Pass | Pass. The cascade closes the parent, then the parts one at a time, so the release happens only at the last close | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Probe test + output (AF-001) | Pass | Pass (investigation AF-001; design "Relevant Supplemental Task Artifacts") | Pass (command, base, output) | Pass (matches `releasableByHostRoot` lines 178–190) | Pass (evidence; to become a durable failing-then-passing unit test) | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Behavior change | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Missing Invariant`, backed by the reproduced probe | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No refactor | — |
| Refactor decision is supported by the concrete design sections | Pass | D-RELEASE in the owner | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Give an open copy another Task | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Close a Task; release at the last | Pass | Pass. The concurrency reasoning is correct: each closure computes releasability after its own synchronous swap, so the last swapper sees no open entry. A double request is harmless, and the root re-checks `isClosed` | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `TaskExecutionResourceService` | Pass | Pass | Pass | Pass | Sole owner of openness, releasability and the open-Tasks query |
| `TaskExecutionResourcePort` | Pass | Pass | Pass | Pass | The lifecycle asks `openTaskReferencesOf`; it never reads Task files |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Lifecycle → port → service | Pass | Pass | Pass | Pass | Unchanged |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `TaskExecutionResourcePort.openTaskReferencesOf(execution, exceptTaskId)` | Pass | Pass | Pass | Low | Pass |
| `buildExistingCopyTaskMessage({…, otherOpenTaskReferences})` | Pass | Pass | Pass | Low | Pass (content: ARF-001) |
| `delegate_task` / `update_task` texts, CM-6 | Pass | Pass | N/A | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Give a Task to a copy | Pass | Pass | N/A | Pass | `assignToExistingCopy` as is; `prepareClosedCopyForResume` returns early for an open copy |
| Stop runs | Pass | Pass | N/A | Pass | `TaskExecutionResourceRelease`; the root's `isClosed` re-check |
| Current entry | Pass | Pass | N/A | Pass | `deriveCurrent` newest-open rule kept; only the log removed |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/projects` | Pass | Pass | Pass | Pass | — |
| `src/agent-collaboration/execution/task` | Pass | Pass | Pass | Pass | Text and port only |

## Reusable Owned Structures Verdict

N/A: no repeated structure is introduced.

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `assertTaskExecutionAssignable` input | Pass | Pass (round 2: the unused inputs are removed in the plan) | Pass | N/A | Pass | ARF-002 resolved |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `task-execution-resource-service.ts` | Pass | Pass | N/A | Pass | — |
| `domain/task-execution-resources.ts` | Pass | Pass | N/A | Pass | Dead helpers: ARF-002 |
| `task-assignment-eligibility.ts` | Pass | Pass | N/A | Pass | Round 2: in the mapping. It drops the dead reads and gains `openTaskReferencesOf` (D-OPEN), so the service does not grow |
| `project-task-service.ts` | Pass | Pass | N/A | Pass | 486 effective lines: about 14 lines of headroom. The design names a fallback, `task-assignment-eligibility.ts`, which shrinks after ARF-002 |
| lifecycle / `task-execution-input.ts` | Pass | Pass | N/A | Pass | 477 effective lines |

## Subsystem / Folder / File Placement Verdict

N/A: existing files only.

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| "still works on Task …" refusal | Pass | N/A | Pass | Pass | — |
| Several-open-entries conflict log | Pass | N/A | Pass | Pass | — |
| Old tool texts | Pass | Pass | Pass | Pass | — |
| Code left unused by the refusal removal | Pass | N/A | Pass | Pass | Round 2: `newCopyHint`, `namedTask`, the two inputs and the lines 65–68 reads are listed with grep evidence; `locationOfTask` is kept, justified by D-OPEN |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Refusal / versions | No | Pass | Pass | No flag, no version checks (rule 9) |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `agent_run_resources.json` | `Not Affected` (format) | Pass. Per-Task files already hold one entry per period; existing data has at most one open entry per copy | Pass | N/A | Pass | The rollback consequence is stated in the requirements, consistent with RELEASE.md |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Probe → failing test → D-RELEASE → refusal removal → port/text → texts/docs → app check | Pass | Pass | Pass (round 2) | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Message, release, parent with parts | Yes | Pass | Pass | Pass | The message example needs ARF-001's clause |

## Material Premise Validation

### `AP-001` — Two of one copy's Tasks close concurrently

- Related approved requirement or established contract: QR-002.
- Relevant behavior ID(s): BEH-002, BEH-005
- Initiating basis kind: `Contract`
- Independent product-supported initiating trigger or applicable governing contract: QR-002 explicitly requires correctness under concurrent closure.
- Support evidence: QR-002 in the approved requirements.
- Forward path: `update_task` A and B → `closeAndWrite` → `closeTask` serialized per Task ID → `store.update` → synchronous `commit`/`swap` → `afterClose` → `releasableByHostRoot` computed after that closure's own swap.
- Lifecycle preconditions and material consequence: if neither closure saw "no open entry", the copy would be left running.
- Reachability: `Reachable` (contract)
- Review consequence / proportionate response: the design's reasoning holds. The later swapper always computes after both swaps. A double request is harmless (`releaseTaskExecutions` re-checks `isClosed`). No machinery added.

### `AP-002` — One delegator sends two concurrent `delegate_task` calls to the same open copy

- Related approved requirement or established contract: none. REQ-001 covers sequential giving.
- Relevant behavior ID(s): BEH-001
- Initiating basis kind: `User` (agent)
- Independent product-supported initiating trigger or applicable governing contract: none found. Each call is supported alone; no requirement or contract establishes a concurrent workflow.
- Support evidence: `assignToExistingCopy` awaits delivery and `markStarted` before it returns. `markStarted` / `markFailed` settle the copy's current entry, which is the newest open one.
- Forward path: N/A
- Lifecycle preconditions and material consequence: if it happened, one Task's entry could stay `starting` (shown as "not confirmed"). That is cosmetic.
- Reachability: `Not Reachable` (as a supported scenario)
- Review consequence / proportionate response: no finding, no machinery. Recorded as a residual risk.

## Unresolved Approved-Behavior Or Current-State Gaps

None (ARF-001 and ARF-002 resolved in SR-005; see `architecture-review-revision-record.md` ARCH-REV-002).

## Review Decision

`Pass` (round 2).

## Findings

None open. The round-1 findings are kept below for reference; both are `Resolved` in ARCH-REV-002.

### ARF-001 — The given-Task message omits the approved request to name the Task key in reports (Resolved, SR-005)

- Round 2 verification: DS-001 narrative (line 120) and the Concrete Examples message (line 258) read `New Task assigned to you: <key>. Your Task <k1> is still open; name the Task key in each report.` only when other Tasks are open, and the text is as today otherwise. This is route 1, so the requirements are unchanged.

- Type: `Design Impact`, unless the user meant to drop the request; then `Requirement Gap` (see Required update).
- Severity: Blocking.
- Protected: REQ-002 ("… and asks it to name the Task key in each report"), AC-001 ("… asking for Task keys in reports"), UC-003 / SCN-005 (in scope), DEC-001 (a).
- Scope status: `Within Approved Scope`
- Changes approved behavior: `No` for option (1) below; `Yes` for option (2).
- Evidence:
  - The design text (DS-001 narrative and Concrete Examples) is `New Task assigned to you: autobyteus-280. Your Task autobyteus-204 is still open.` It contains no request about reports.
  - SR-004 says the user confirmed "only the false sentence changes" and that this "matches REQ-002". It does not match, because REQ-002 and AC-001 require the request.
- Required update, one of:
  1. Include the request in the replacement sentence, only when other Tasks are open. For example: `Your Task autobyteus-204 is still open; name the Task key in each report.` Update DS-001 and the example.
  2. If the user's later words were meant to drop the request, revise REQ-002, AC-001, UC-003, SCN-005 and DEC-001 and record the user's approval. That changes approved behavior, so it is a `Requirement Gap`.
- Why proportionate: one clause. Without it, an in-scope use case (UC-003) has no mechanism.
- Recommended recipient: Solution Designer

### ARF-002 — Code left unused by the refusal removal is missing from the removal plan (Resolved, SR-005)

- Round 2 verification: Removal Plan rows (lines 145–148) list `newCopyHint`, `namedTask`, the `currentTaskReference` / `currentTaskStatus` inputs and the `assertCopyAssignable` reads (lines 65–68), each with grep evidence. `locationOfTask` is kept with a reason: `openTaskReferencesOf` uses it. `task-assignment-eligibility.ts` is in the file mapping (line 234).

- Type: `Design Impact`
- Severity: Blocking (removal completeness). The update is small.
- Protected: Core Principle 7 (No Dead Code), which ticket-scope.md applies to every change ("This ticket"). Preserved behavior is unaffected.
- Scope status: `Within Approved Scope`
- Changes approved behavior: `No`
- Evidence: a grep at `3b09fbe308` shows these are used only by the refusal the design removes (`task-execution-resources.ts` lines 175–177):
  - `newCopyHint` and `namedTask` (`domain/task-execution-resources.ts` lines 153, 155);
  - the `currentTaskReference` / `currentTaskStatus` inputs of `assertTaskExecutionAssignable` (line 163) and its doc comment;
  - in `services/task-assignment-eligibility.ts` `assertCopyAssignable` (lines 65–68), the current-Task location read and status read that only fill those inputs.
  - `TaskExecutionResourceService.locationOfTask` becomes unused unless `openTaskReferencesOf` reuses it.
  - `task-assignment-eligibility.ts` is not in the Final File Responsibility Mapping as a modified file.
- Required update: list these in the Removal / Decommission Plan, with the grep as evidence. Add `task-assignment-eligibility.ts` (and `locationOfTask` if unused) to the file mapping.
- Why proportionate: a few lines in files the change already touches.
- Recommended recipient: Solution Designer

### Non-blocking implementation notes (not findings)

Notes 1 and 3 were adopted into the design in SR-005 (design line 304; mapping line 233). Note 2 stays implementation guidance.

1. Once the open-refusal is gone, `assertTaskExecutionAssignable`'s `currentTaskId === taskId` check is reachable for an **open** current Task. That happens when a delegator re-delegates the copy's open Task to it (AC-001 alternate). Its text, "set Task X to TODO or IN_PROGRESS, then message …", is wrong there. The design narrative already says "the copy's *closed* current Task". Apply the check only when the current entry is closed, so an open duplicate reaches `linkExistingTaskExecution`'s accurate "already works on this Task".
2. `publishTaskExecutionsReopened` for an already-open copy: follow the design's rule (publish only when the copy was closed before, if it changes anything visible).
3. `project-task-service.ts` has 486 effective lines on this base, not 474. Put `openTaskReferencesOf`'s ID → key mapping in `task-assignment-eligibility.ts` if it does not fit.
4. Keep the probe as the durable failing-then-passing unit test (design step 1). Do not commit `autobyteus-application-*/dist/` (AF-009).

## Classification

N/A (Pass). Round 1 was `Design Impact` (ARF-001, ARF-002), now resolved.

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (per handoff rules); informational notice to `/software_engineering_team/solution_designer`.

## Residual Risks

- AP-002: concurrent `delegate_task` calls to one copy could leave one entry `starting`. This is not a supported workflow and the consequence is cosmetic.
- Sub-work joins the newest open Task (DEC-007): a helper started for an older Task stops when the newest Task closes. This is accepted.
- `delegate_task` / `update_task` text changes affect agent behavior; keep them minimal.

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-002)
- Material-Premise Gate: `Pass` (AP-001 Reachable and handled; AP-002 Not Reachable, no machinery)
- Notes: the design is ready for implementation. The user is to be told about the added report clause (SR-005).
