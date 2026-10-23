# Code Review Report — task-agent-several-tasks

## Review Round Meta

- Review Entry Point: `Implementation Review` (round 4, the SR-006 web delta). Round 3: `API/E2E Failure-Origin Review`; rounds 1–2: `Implementation Review`.
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
- Current Code Review Revision ID: `CRR-004`
- Current Review Round: 4
- Review Scope: `Targeted Delta Review`. The delta `41ecca90fe..1fa3a1d87e` is 3 web files, +9 −2: `projects.root.help` in en and zh-CN, and one catalog test. It stays within CR-002's behavior (the help line). No server, component, interface or data change, so the evidence for every other check carries forward from rounds 1–2.
- Review Scope Evidence (round >1): the delta `fe8e52b31d..cd8c289b67` touches 3 files, ±3 lines. It changes only the `update_task` text in `project-task-tool-contract.ts`, which is CR-001's file and behavior, plus its two unit pins. No other source, interface or data shape changed, so the round-1 evidence for every other check carries forward.
- Trigger: the SR-006 web delta (IR-003; ARCH-REV-003 Pass), from `/software_engineering_team/implementation_engineer`. Round 3 was the API-F-001 failure-origin review (API-REV-001).
- Prior Review Round Reviewed: 3 (CRR-003, Fail — CR-002, Design Impact)
- Latest Authoritative Round: 4
- Coverage Investigation Reviewed (failure-origin entry point): `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed (failure-origin entry point): `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed (failure-origin entry point): `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Delivery Revision Record Reviewed: N/A
- Failing Scenario IDs: API-07 (AC-010), finding API-F-001
- Exact Failing Commands / Execution Mode: `pnpm -C autobyteus-web build:electron:mac`; `pnpm --silent isolated-app start --from-worktree --data-root <own>`; seed with `evidence/API-07-desktop/seed-desktop.mjs` (this worktree's `dist/app.js`, scripted AGY CLI); restart; `evidence/API-07-desktop/desktop-journey.mjs <controlPort> <graphqlUrl> <seed.json> <out>`
- Failure Evidence Paths: `evidence/API-07-desktop/run1/result.json` (J2 and J3 `obs.text`), `evidence/API-07-desktop/run1/J2-task-A-assigned-1440.png`, `evidence/API-07-desktop/README.md`

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

## API/E2E Failure-Origin Review (Round 3)

- Product code is unchanged since `cd8c289b67`: `git diff cd8c289b67..HEAD` shows no change in server `src` or web product files.
- Failing scenario still represents approved behavior: Yes. SCN-001 / SCN-003: the user opens a Task page whose Task's team also holds another open Task. REQ-004 and BEH-002 say that copy is stopped only when no assignment of it is open. The requirements state that "Each Task's existing 'Assigned to' shows the team" (UI section, DEC-003), so the app is expected to show this card truthfully.
- Supported product-scenario basis and production path: a supported normal user journey. The Manager gives Task B to the copy that holds open Task A (`delegate_task`, mode 3). The user opens Task A or B in the app. `TaskRootSection.vue:9` renders `projects.root.help` whenever the root is live (`root && !root.closed && root.start !== 'failed'`). That is the case for both Tasks, because the copy is open while any of its Tasks is (`isOpen`, from the current entry).
- Observed: `run1/result.json` J2 and J3 read "Assigned to release team 278e Offline When the Task is Done, this agent or team stops." for both Tasks. The server keeps the team after the first close (API-02, API-05 SEV-E2E-001), so the sentence is false for whichever Task is closed first. The user is told that closing one Task stops a team that in fact keeps working on the other.
- Source evidence: `autobyteus-web/localization/messages/en/projects.ts:212` `'projects.root.help': 'When the Task is Done, this agent or team stops.'`; `zh-CN/projects.ts:212` `'任务完成后，这个智能体或团队会停止。'`. A search of the web catalogs, components and docs for other one-Task statements finds none. The `treeRowLeave.css` comment describes a tree row, not this rule.
- Origin: **design impact**, carried into an earlier review gap.
  - The design's Change Scope left "the web app and the Workspaces tree" alone. REQ-008 lists only `update_task`, `delegate_task` and CM-6. The requirements' Architecture Phase Input nevertheless asked to "check every other place that assumes one open entry per copy, beyond the resource service". This user-visible string is one of those places and was not checked.
  - The implementation followed the approved Change Scope, so it is not an implementation defect.
- Review gap (stated plainly): CRR-001 checked the server's tool texts and docs for the old rule but did not search the web catalogs. A search of the user-visible strings for the stop rule would have found `projects.root.help`. The updated Principle 11 ("list the code that reads anything derived from a changed structure") and Principle 1 ("kinds and forms") point at exactly this consumer, so it was reasonably detectable in source review, as in architecture review.
- Not detectable by the unit or E2E suites: no test pins the help text against the open-Task count.

## Findings

### CR-002 — The Task page's "Assigned to" help says the team stops when this Task is Done (Design Impact, round 3; Resolved, round 4)

- Round 4 verification (`1fa3a1d87e`):
  - The strings now read "This agent or team stops when its last open Task is Done or Cancelled." (`en/projects.ts:212`) and "这个智能体或团队会在它最后一个未完成的任务完成或取消后停止。" (`zh-CN/projects.ts:212`). Both match DEC-013 and AC-011 exactly.
  - The sentence is true for a copy with one Task and with several, under REQ-004 and the release rule. The deleted-Task case stays FU-001.
  - A search of web code, tests and probes finds no copy of the old text. `ProjectTaskWorkers.spec.ts` asserts only that the line is present.
  - The new catalog test pins both strings.
  - IMP-09: the three web guards pass, and `test:nuxt` 661 files and 4759 tests pass.
  - IMP-08: rendered on a real stack in en-US and zh-CN, at 1440 and 390 px.
  - The requirements (SR-006: REQ-008, AC-011, DEC-013) and the design (the derived-consumer table and Change Scope) record the change; ARCH-REV-003 passed it.

Round-3 record:


- Type: `Design Impact` (owner: Solution Designer)
- Severity: Blocking (AC-010; a user-visible statement made false by this change)
- Protected: REQ-004 / BEH-002 (stopped only when no open assignment is left); the requirements' UI section (the existing "Assigned to" shows the team); QR-001's intent that the user is not misled about whether the team runs
- Evidence: as in the failure-origin section above (`TaskRootSection.vue:9`; `en` and `zh-CN` `projects.ts:212`; `API-07-desktop/run1/result.json` J2 / J3).
- Required update (Solution Designer): widen the Change Scope to include `projects.root.help` in en and zh-CN, and decide the wording. One option is a sentence that is true in every case and needs no condition, for example "When its last open Task is Done, this agent or team stops." Another is a conditional text only when the copy holds other open Tasks, which would need the open-Task count on the client and is more machinery. Decide whether the user should approve the wording; REQ-008 lists only server texts and DEC-003 says no new UI. Then hand to implementation, followed by source review and API/E2E again.
- Why proportionate: one string in two catalogs; without it the app's card states the old rule on every Task held by a busy team.


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

N/A (Pass, round 4). Round 3 was `Design Impact` (CR-002), resolved by SR-006 and IR-003. Round 1 was `Local Fix` (CR-001), resolved in round 2.

## Recommended Recipient

- Owner of the classified outcome and the recipient `get_handoff_rules` returned for it: `/software_engineering_team/api_e2e_engineer` (primary pass rule); informational notice to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- Agent behavior follows the changed `delegate_task` / `update_task` texts.
- Sub-work joins the newest open Task (DEC-007); a helper started for an older Task stops when the newest one closes (accepted).
- The deleted-Task case (FU-001).

## Latest Authoritative Result

- Review Decision: `Pass` (round 4)
- Review Entry Point: `Implementation Review` (targeted delta)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (no new premise)
- Score Summary: 9.5 / 10, every category ≥ 9.0. The round-2 scores carry forward; the web text that CR-002 concerned is now true.
- Failure Origin: N/A (round 3's Design Impact is resolved)
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: API/E2E reruns API-07 for AC-010 and AC-011 on the isolated instance. FU-001 and FU-002 stay in `follow-ups.md`.
