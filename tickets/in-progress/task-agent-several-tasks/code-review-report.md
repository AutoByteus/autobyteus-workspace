# Code Review Report — task-agent-several-tasks

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `tickets/in-progress/task-agent-several-tasks/requirements-doc.md` (Approved, SR-003)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (AF-001–AF-009), through the design spec and design review
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (to SR-005)
- Design Spec Reviewed As Context: `tickets/in-progress/task-agent-several-tasks/design-spec.md` (SR-005, Ready)
- Supplemental Task Artifacts Reviewed As Context: `evidence/SD-probe-several-tasks.test.ts.txt` and its output (AF-001)
- Relevant Solution Revision IDs: SR-003 (requirements), SR-004 (design), SR-005
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002 Pass; four implementation notes)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001 (Fail, resolved), ARCH-REV-002 (Pass)
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `tickets/in-progress/task-agent-several-tasks/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 2
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round >1): the delta `fe8e52b31d..cd8c289b67` touches 3 files, ±3 lines. It changes only the `update_task` text in `project-task-tool-contract.ts`, which is CR-001's file and behavior, plus its two unit pins. No other source, interface or data shape changed, so the round-1 evidence for every other check carries forward.
- Trigger: CR-001 Local Fix done (IR-002), from `/software_engineering_team/implementation_engineer`
- Prior Review Round Reviewed: 1 (CRR-001, Fail — CR-001)
- Latest Authoritative Round: 2
- Coverage / execution / API/E2E / delivery records: N/A (implementation review)

Reviewed code:
- Round 1: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-several-tasks`, branch `codex/task-agent-several-tasks`, range `3b09fbe308..a18fe714cd`.
- Round 2: the fix `cd8c289b67`.

Ticket artifacts are in `8a197ea59c` and `b890062e63` (IR-002).

Authorities: `design-principles.md` as updated on 2026-10-23. The new Principle 1 kinds-and-forms check and the Principle 13 behavior-by-absence check were applied (below), and `DESIGN.md` was applied as recorded in the design spec.

## Routing Classification Review

- Task size: `Small`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes` (High)
- Classification evidence or correction required: none. The change touches about 9 source files in existing owners. It changes a core lifecycle invariant (several open entries per copy) and the release rule that stops runs, and it changes the `delegate_task` / `update_task` contract texts and CM-6.

## Review Scope

- Changed implementation and behavior reviewed: BEH-001 to BEH-005, REQ-001 to REQ-009.
- Files / areas reviewed:
  - every changed `src` file, in full in the diff;
  - in context: `linkExistingTaskExecution` (`domain/task-execution-resources.ts:100–107`), the `currentOf` readers in `task-execution-resource-service.ts` (lines 94, 104, 134, 141, 156, 222, 245, 253, 274), and `ProjectTaskService.deleteTask` (line 212);
  - the docs diff (CM-6, projects.md, agent_team_execution.md);
  - the titles and key cases of the new and rewritten tests.
- Explicit exclusions: server E2E and AC-010, which belong to API/E2E. I reran no recorded check: IMP-02 to IMP-05 ran on `a18fe714cd`, and no finding needs a new check.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. Under option B:
  - the copy's most recent assigner may give it another Project Task while others are open;
  - the copy is stopped only when no assignment of it is still open;
  - sub-work joins the newest open Task;
  - the given-Task message names the other open Tasks and asks for the Task key in reports;
  - `send_message_to` is unchanged, with no queue and no UI.
- Design-spec behavior map verified against the implementation: Yes.
- Design review report and round confirmed: ARCH-REV-002. Notes 1 to 4 are applied: note 1 at `task-execution-resources.ts:172`; note 2 was checked and left as is, with the evidence in the handoff; note 3 at `task-assignment-eligibility.ts:66–77`; note 4 is the probe test.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none
- Remaining material ambiguity: none

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `assignToExistingCopy` → `port.assertAssignable` → `assertTaskExecutionAssignable` (the open refusal is removed; the same-Task guidance applies only when `current.closedAt !== null`) → `openTaskReferencesOf` (read before any change) → `prepareClosedCopyForResume` → `assignExistingTaskExecution` (re-checked under the serialization). A Task the copy already holds open is refused by `linkExistingTaskExecution` (`latestEntryOf(file, execution)?.closedAt === null`). | — |
| BEH-002 | Confirmed | `releasableByHostRoot`: for each entry in the closed Task, the copy counts only if its current entry is closed. Because `deriveCurrent` makes the current entry the newest open one, else the latest linked, "current closed" means "no open entry left". `closeTask` closes this Task's entries, then the release. | — |
| BEH-003 | Confirmed | Unchanged mechanism: the new `assigned` entry is the Task's latest | — |
| BEH-004 | Confirmed | `otherOpenTasksSentence` is decided by an explicit list from `openTaskReferencesOf` (oldest first, without the given Task; deleted Tasks left out). An empty list gives today's text. | — |
| BEH-005 | Confirmed | Cascade unchanged; the parts close one at a time through `update()`, so only the last close finds no open entry | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 / SCN-002 | BEH-001, 003, 004; REQ-001–003, 007 | Contract | Project Task Manager | Give a follow-up or a part to the busy team | `delegate_task task_id` + `target_agent_run_id` / `target_team_run_id` | Normal | DS-001 | Accepted; brief with the other-open-Tasks sentence; both Tasks show the copy | Requirements (user, option B) | Supported Normal Scenario | Use |
| SCN-003 / SCN-004 | BEH-002, 005; REQ-004, 005; QR-001, QR-002 | Contract | Project Task Manager | Close one Task; close a parent | `update_task status` | Normal | DS-002 | The copy runs on while another Task is open; one stop after the last | Requirements | Supported Normal Scenario | Use |
| SCN-005 | REQ-002; DEC-001 | Contract | Task agent | Report naming the Task | `send_message_to` | Normal | Message text | Report names the key | Requirements | Supported Normal Scenario | Use |
| REQ-008 | Tool texts describe the new rule | Contract | Agents reading tool descriptions | Use `update_task` / `delegate_task` correctly | Tool descriptions | Normal | `PROJECT_TASK_TOOL_DESCRIPTIONS.update_task`, `DELEGATE_TASK_LLM_DESCRIPTION` | Texts true under the new rule | REQ-008, DEC-009 | Supported Normal Scenario (governing contract) | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `update_task` text: "Setting a Task that has parts to DONE or CANCELLED also sets its open parts the same way **(stopping their task agents)**" | REQ-008; SCN-004 | An agent reads `update_task`'s description; a part's task agent also holds a Task that is not part of this parent | After this change, closing that part does not stop its task agent: `releasableByHostRoot` skips a copy with another open entry. The sentence just before now says "a task agent is stopped when this was its last open Task", so the parenthetical contradicts it. An agent may believe the task agent stopped and re-delegate to a new copy instead of messaging the running one. | `project-task-tool-contract.ts:17` (diff line 101); the design's `update_task` row changed only the first sentence | **Promote** | This ticket | The change made the text false, and REQ-008 requires the texts to describe the new rule. One parenthetical, as in CR-001 below. |
| C-02 | A repeated DONE on an older Task of a fully closed copy re-requests its stop (handoff point 1) | BEH-002; DS-002 narrative ("a repeated request is harmless") | `update_task status=DONE` again on a Task the copy has an entry in | The copy has no open entry, so it is already closed and fenced. A copy cannot be reactivated by message while its current Task is closed (`assertReopenTaskNotTerminal`), and the root's release re-checks `isClosed`. No state change. | Code; ARCH-REV-002 DS-002 verdict | Reject | — | Harmless as designed. |
| C-03 | Concurrent closes of the last two Tasks may request the stop twice (handoff point 2) | QR-002; AP-001 | Two `update_task` closes at once | Each closure computes releasability after its own synchronous swap, so at least the last one sees no open entry; a double request is harmless. | Code; QR-002 tests (lines 135, 148) | Reject (correct as built) | — | Matches QR-002 and AP-001. |
| C-04 | Kinds and forms (Principle 1, updated) | REQ-001 | `delegate_task` mode (3) with `target_agent_run_id` and with `target_team_run_id`; Agent and Team copies | Both run ids reach the same `assignToExistingCopy`; the copy key is kind-agnostic in `openTaskIdsOf` and `releasableByHostRoot`. Modes (1) and (2) create new copies and are unchanged. The lifecycle is shared by the roots (handoff; reactivation suites pass). | Code; tests cover Agent and Team copies | Reject (no gap) | — | — |
| C-05 | Behavior by absence (Principle 13, updated): "Your previous Task is closed" is chosen when the other-open list is empty | REQ-002 ("When it has no other open Task, the text is as today") | Giving a Task to a copy with no other open Task | The rule is explicit: an empty list of open Tasks means none is open. The one exception is a deleted Task's open entry (C-07). | Code | Reject | — | The requirement states exactly this rule. |
| C-06 | `update_task` text: "To give a task agent whose Task is DONE or CANCELLED a different Task, use delegate_task …" is narrower than the new rule, but still true | REQ-008 | — | Not false; `delegate_task`'s own text states the full rule | Code | Reject | — | Optional to widen within CR-001's edit. |
| C-07 | A Task deleted while open keeps its copy's open entry: the copy is not stopped when its other Tasks close, and sub-work can join the deleted Task (handoff Known Risk) | Deleting a Task is a supported action (Task page Delete); the requirements do not cover deletion | User deletes a Task a team holds while it holds another | `deleteTask` (`project-task-service.ts:212`) keeps the run resources, as before this change. With several Tasks the open entry also outlives the other Tasks' closes. The consequence is bounded: idle shutdown takes the copy offline, Task open. | Code | Promote | Follow-up (FU-001) | Pre-existing delete semantics are preserved behavior; every AC passes. Closing entries on delete would be new behavior, so it goes to `follow-ups.md`. |
| C-08 | Two concurrent `delegate_task` calls to one open copy | AP-002 | — | — | ARCH-REV-002 AP-002 | Reject | — | Not a supported concurrent workflow; unchanged. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | `Missing Invariant` fixed in the owner; the probe fails before the fix and passes after (IMP-01 → IMP-02) | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | The probe became `task-execution-several-open-tasks.test.ts`, case 1 | — |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS-001 runs in call order with one owner (the lifecycle calls each port method itself); DS-002 unchanged apart from the rule | — |
| Ownership boundary preservation and clarity | Pass | Openness and releasability are decided only in `TaskExecutionResourceService`; the lifecycle asks the port and never counts Tasks | — |
| Off-spine concern clarity | Pass | — | — |
| Existing capability/subsystem reuse check | Pass | `assignToExistingCopy`, `TaskExecutionResourceRelease`, `readTaskAt`, `locationOfTask` reused | — |
| Reusable owned structures check | Pass | — | — |
| Shared-structure/data-model tightness check | Pass | The `assertTaskExecutionAssignable` input is tightened (two inputs removed); one derivation of "open" (Principle 11) | — |
| Repeated coordination ownership check | Pass | — | — |
| Empty indirection check | Pass | The service method is one delegating line to the eligibility owner, chosen to keep the service under the size limit (ARCH note 3) | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | — | — |
| Ownership-driven dependency check | Pass | Unchanged directions | — |
| Authoritative Boundary Rule check | Pass | — | — |
| File placement check | Pass | Existing files | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `openTaskReferencesOf(execution, exceptTaskId)` is clear. Round 2: the `update_task` text now reads "(ending their work for their task agents, as above)" (CR-001 resolved), and the widened delegate sentence (C-06) is accurate. | — |
| Naming quality and naming-to-responsibility alignment check | Pass | `openTaskIdsOf`, `openTaskReferencesOf`, `otherOpenTasksSentence` | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | — | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | `newCopyHint`, `namedTask`, the two inputs, the `assertCopyAssignable` reads and the conflict log are removed; `locationOfTask` is still used | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | The 8 cases map to AF-001, AC-001–AC-007, QR-001 and QR-002; the lifecycle and Task-side refusals are rewritten | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | The port fake gains the method | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | The catalogue's M-43 is withdrawn (not renumbered, with the reason given) | — |
| API/E2E readiness for the next workflow stage | Pass | The E2E pins to update are listed with lines, along with coverage hints and AC-010 | — |

## Source File Size And Structure Audit

| Source File | Before (base) | After | `>500` Check | `>220` Delta | SoC / Ownership | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `server/src/projects/services/project-task-service.ts` | 486 | 487 | Pass | Pass | Pass | Pass | — | — |
| `server/src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | 477 | 480 | Pass | Pass | Pass | Pass | — | — |
| `server/src/projects/services/task-execution-resource-service.ts` | 322 | 330 | Pass | Pass | Pass | Pass | — | — |
| `task-assignment-eligibility.ts`, `domain/task-execution-resources.ts`, `task-execution-input.ts`, the port, both tool-text files | — | each delta < 30 | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No flag and no version checks (DESIGN.md rule 9) |
| No legacy old-behavior retention in changed scope | Pass | Refusal removed outright |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | — |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Not Affected` |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes` (done)
- Files: `docs/design/collaboration_model.md` (CM-6 and a status row), `docs/modules/projects.md`, `docs/modules/agent_team_execution.md`. CM-6's "closes its open parts the same way, and so their delegated runs" reads correctly under "the same way". CR-001 concerns the tool text only.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| AP-001 (concurrent closes) | Confirmed | Implemented as reasoned; tested |
| AP-002 (concurrent `delegate_task`) | Confirmed | Not reachable as a supported workflow; no machinery |

New premises: None (C-07 is pre-existing delete behavior, recorded as FU-001).

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.5
- Overall score (`/100`): 95
- Score calculation note: simple average; not the decision rule. Round 2: every category is at 9.0 or above.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001 and DS-002 as designed, in call order | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | One owner for openness and releasability | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | The port method is clear; the message rule is explicit; the tool texts follow the new rule (CR-001 resolved in round 2) | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Small changes in the right owners; size kept | — | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.5 | Inputs tightened; one derivation of "open" | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | Clear names and doc comments | — | — |
| 7 | API/E2E Readiness | 9.3 | Pins and hints listed | E2E pins must be updated first | API/E2E |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | The AF-001 fix is proven; the concurrency, cascade, sub-work and give-back cases are tested | The deleted-Task case is a follow-up (FU-001) | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | — | — | — |
| 10 | Cleanup Completeness | 9.5 | Dead helpers and inputs removed | — | — |

## Findings

### CR-001 — The `update_task` text still says closing a parent's parts stops their task agents (Resolved, round 2)

- Round 2 verification (`cd8c289b67`): the text now reads "…also sets its open parts the same way (ending their work for their task agents, as above); closedParts lists them.", which is true under the release rule. The optional C-06 widening is applied ("To give a task agent another Task, also while its other Tasks are open, use delegate_task …"); it is consistent with `delegate_task`'s mode (3) text, which keeps the most-recent-assigner condition. The pins are updated: `project-task-parts-tools.test.ts:95` (exact sentence) and the `project-task-tools.test.ts` regex. Evidence: IMP-06 (137 tool tests passed) and IMP-07 (typecheck plus 794 unit files, 6518 tests passed, `exit=0`). The E2E pin at `project-task-boundaries.e2e.test.ts:846` is listed for API/E2E.

Round-1 record:


- Type: `Local Fix` (implementation-owned)
- Severity: Blocking at review (an agent-facing contract text); a one-line fix.
- Protected: REQ-008 ("Tool texts (`update_task`, `delegate_task`) … describe the new rule"), REQ-004, DEC-009.
- Candidate: C-01 (promoted).
- Evidence: `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-contract.ts:17`, `update_task`. The new sentence reads "Both end this Task's work for its task agents; a task agent is stopped when this was its last open Task", and it is followed by "Setting a Task that has parts to DONE or CANCELLED also sets its open parts the same way (stopping their task agents); closedParts lists them." Under the new release rule (`releasableByHostRoot`, lines 182–197), a part's task agent that holds another open Task is not stopped, so the parenthetical is false in a case this change creates.
- Required action: reword the parenthetical to follow the rule. For example: "…also sets its open parts the same way (ending their work for their task agents, as above); closedParts lists them", or drop the parenthetical. Update the text pin in `project-task-tools.test.ts` (and the E2E pin note for API/E2E). Optionally, in the same edit, widen "To give a task agent whose Task is DONE or CANCELLED a different Task, use delegate_task …" to match `delegate_task`'s new mode (3) text (C-06; not required).
- Why proportionate: tool descriptions shape agent behavior (the design's Risks). A false claim that the agent was stopped can lead the Project Task Manager to re-delegate instead of messaging the running copy. The fix is one clause.

## Follow-ups

Findings outside this ticket go in the ticket's `follow-ups.md`.

- Follow-ups this review added: FU-001 (a deleted Task keeps its task agents' open entries; C-07).

## Classification

N/A (Pass, round 2). Round 1 was `Local Fix` (CR-001), now resolved.

## Recommended Recipient

- Owner of the classified outcome and the recipient `get_handoff_rules` returned for it: `/software_engineering_team/api_e2e_engineer` (primary pass rule); informational notice to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- Agent behavior follows the changed `delegate_task` / `update_task` texts.
- Sub-work joins the newest open Task (DEC-007); a helper started for an older Task stops when the newest one closes (accepted).
- The deleted-Task case (FU-001).

## Latest Authoritative Result

- Review Decision: `Pass` (round 2)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (AP-001 and AP-002 confirmed; no new premises)
- Score Summary: 9.5 / 10; every category ≥ 9.0
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: CR-001 is resolved. The core change was correct as built in round 1 (release rule, refusal removal, message, sub-work, cascade). FU-001 stays in `follow-ups.md`.
