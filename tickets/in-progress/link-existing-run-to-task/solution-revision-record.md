# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial baseline (Project Task autobyteus-11) | N/A | N/A | Approved (user, 2026-10-18) | BEH-001..004; REQ-001..007; AC-001..006; DEC-001..012 | All six user decisions as recommended |
| SR-002 | Design | Architecture design, 2026-10-18 | N/A | Requirements Approved | Design Ready | all | Large / High → architecture review (withdrawn) |

## Revision Entries

### SR-001 — Link an existing run to a Task: requirements baseline

- Phase and classification: `Initial Baseline`
- Trigger: Project Task `autobyteus-11` (the user's go-ahead, 2026-10-18).
- Key evidence: a Task owns its copies (close stops and fences them, messaging scope, sub-work ownership); a
  hand-started run must not inherit that → DEC-001 "linked, not owned".
- Approval impact: pending; DEC-002, 003, 006..009 decided within the direction; DEC-001, 004, 005, 010 need the user.
- Next action: the user's answers, then architecture design.
- Same round (2026-10-18): the user's design principle via the Project Task Manager — linking only creates a link,
  never moves the run, its workspace or where it is shown → REQ-007 widened; DEC-011 (Task summary line on a linked
  run's row, Needs user). Checked against the tree: delegated copies' rows show `TaskWorkerTaskSummary.vue` under the
  name (`WorkspaceTransientExecutionRow.vue:96`); top-level run rows have none today.
- Same round (2026-10-18): the user's display question via the Project Task Manager (same-workspace linked run under the PM?) → DEC-012 (Needs user), with today's tree behavior recorded.
- Approval (2026-10-18): the user answered "continue" to the six recommendations (DEC-001, 004, 005, 010, 011, 012); recorded as approval as recommended and stated back to the user.

### SR-002 — Design

- Separate per-Task `linked_runs.json` and `TaskRunLinkService` beside the untouched `TaskExecutionResourceService`, so
  links never enter ownership (closure stop, fencing, messaging scope, reactivation); board root = latest of
  assignment and link; root-run status resolver; locator answers linked runs; tools `link_run_to_task` /
  `unlink_run_from_task`; GraphQL mutations; web Task page action + picker, board card, sidebar Task line.
- Classification `Large` / `High` (new persisted file, new tool and GraphQL contracts, ownership boundary).
- Follow-ups: run-side "Link to Task"; linking organization runs.

### SR-003 (in progress) — The user's real goal: adopt, not only link

- Trigger (2026-10-18): the user explained that a run assigned by the PM should come under the PM and have its
  lifecycle bound to the Task (closed and gone from the sidebar when the Task is done), so runs need no manual cleanup;
  a run in a different workspace "cannot be brought back".
- Evidence: rows under a run come from its own task-agent record (`AgentRunTaskRows.vue` → `collaboration.taskRows`),
  not the workspace; since the memory refactor a user-started run and a task agent share the same folder layout, so
  adoption moves no files (adds a `taskAgent` section, a link in the PM's tree, an `assigned` entry).
- Proposed: adopt (same workspace, by the PM's run, when the run is idle) = an ordinary delegated run from then on;
  plain link for other workspaces (or out of scope). Reverses DEC-001, DEC-012 and the Task's "not stopped" line.
- Status: requirements back to Draft; architecture review of SR-002 paused (reviewer told). Waiting for the user's
  answers (adopt as described? other workspaces? idle only?).
- SR-003 requirements rewritten (adoption via `delegate_task` by run id, same workspace, idle, list tool); DEC-101, DEC-102, DEC-105 decided by the user; DEC-103 (the run receives the Task) awaiting confirmation. Superseded link-only versions kept as `superseded-requirements-link-only.md` / `superseded-design-link-only.md`.
- SR-003 approved by the user (2026-10-18). DEC-107 (runs with their own delegated runs refused; 13 such runs in the PM's workspace) by the Solution Designer, user informed. Architecture review of SR-002 stays withdrawn; design next (SR-004).

### SR-004 — Design: adoption through `delegate_task`

- Design: `HandStartedRunAdoption` branch in `assignToExistingCopy` when the named run is not in the delegator's tree;
  eligibility (standalone agent delegator, open Project Task, hand-started run, same workspace, no own delegated runs,
  no Task, idle); steps in crash-safe order (Task entry, handover, own-file section + link, history row removal,
  delivery, started) with resumption on retry; `list_workspace_runs`; no file moved; no migration.
- Decisions DEC-108 (standalone agent delegators only) and DEC-109 (retry finishes a partial adoption), within the
  direction, user informed.
- Classification `Large` / `High`. Next: architecture review.

### SR-005 — No list tool

- The user, 2026-10-18: no `list_workspace_runs` ("brings no value"); the user gives the PM the run id, or the PM finds
  it itself, then calls `delegate_task` directly. REQ-006 / AC-005 / BEH-004 / UC-003 / SCN-004 withdrawn; DEC-106
  decided by the user; design DS-003 and the tool removed. Scope reduction only; the reviewer is informed while
  reviewing SR-004.

### SR-006 — ARCH-REV-001 recovery

- ARCH-F-001 (Design Impact): confirmed — my resumption started at step 3, and the step-1 entry itself refused the
  retry. Now "adoption in progress" is recognized first from the open entry; the entry stays `starting` through steps
  2–4 (only a failed delivery marks it `failed`); tests stop after each of steps 1–4; an unfinished adoption whose Task
  closes leaves the run hand-started.
- ARCH-F-002 (Requirement Gap): the empty collaboration package is kept; REQ-004 unchanged.
- Residuals taken: application-bound runs refused (REQ-005); `TeamRunPackageCatalog.exclude`; docs line for
  "Borrowed, not adopted"; the user told that an adopted team run leaves the Memory page Teams list.
- Next: re-review.
- SR-006 correction (same round): a stop inside step 3 (own file written, link missing) followed by the Task's close would have left the run hidden; the close now removes that `taskAgent` section so the run is listed again.

### SR-007 — ARCH-REV-002 recovery (additive step 3)

- ARCH-F-003 (Design Impact) confirmed in code: `task-agent-team-tree-schema.ts:21-36` sets members' `role` /
  `description` to null and has no `teamDefinitionName`; the team-run reader requires it
  (`team-run-execution-tree-schema.ts:55`). Writing the adopted team through the store would have dropped those fields,
  so the close-path reversal could not restore a valid team-run tree.
- Fix: step 3 strictly additive (`TaskAgentOwnFiles.addTaskAgentSection` on raw JSON, atomic); the composed record is
  read back through the task-agent reader so the split write writes only the link; reversal removes only the key; test
  for a team run stopped inside step 3 then closed; later ordinary saves normalize to the task-agent shape (recorded).
- Next: re-review.
- Review: ARCH-REV-003 Pass of SR-007 (2026-10-18); handed to `/software_engineering_team/implementation_engineer`.
  Implementation note from the reviewer: link-time equality includes team handoffs (`treeHandoffs`); a mismatch only
  normalizes a finished adoption (harmless).

### SR-008 — Implementer DI-001: team address frames

- Trigger: the implementation engineer's DI-001 (`implementation-design-impact.md`), before any code. Confirmed:
  `team-run-execution-tree-schema.ts:40-46` (root `/`), `task-agent-team-tree-schema.ts:52-83` (root = `taskAgent.address`,
  non-root), `task-execution-source-schema.ts:55-61` (members under the catalog address). My SR-007 "strictly additive"
  step 3 cannot work for teams.
- Decisions (Solution Designer, within the direction): option 1 — a reversible address rebase of the team tree to the
  catalog address in step 3 (prefix swap; exact inverse); archived runs refused; a run whose definition left the catalog
  refused; the undo of an unfinished adoption on close owned by `HandStartedRunAdoption.revertUnfinished`, called from
  the Task close / delete path, run on the delegator root's queue when active; R-3 (members' remembered old addresses)
  accepted with guidance.
- Requirements: REQ-005 refusals extended (archived, definition not in the catalog). No other behavior change.
- Next: targeted architecture re-review (the "strictly additive" basis of ARCH-F-003 changed).
- Review: ARCH-REV-004 Pass of SR-008 (2026-10-18, targeted); handed to the implementation engineer. Required addition recorded in the design: `ProjectService.deleteProject` also calls `revertUnfinished` (it removes Task files without `ProjectTaskService`'s Task delete).

### SR-009 — Sidebar duplicate after adoption (CRR-005 / F-002)

- Trigger: the code reviewer's failure-origin review CRR-005 of API/E2E F-002 (Design Impact): an adopted run opened
  this session stays in its own sidebar group until restart. Confirmed: renderer local rows
  (`runHistoryReadModel.ts:262-281`), team nodes (`runHistoryNavigationProjection.ts:180-187`); `task_execution_started`
  only on the delegator's collaboration stream. My SR-004 assumption ("they leave their group because their history row
  is removed") missed the renderer's local rows.
- Decision (Solution Designer, within the direction; REQ-003 / BEH-002 / AC-001 / AC-003 unchanged): renderer rule
  "Sidebar After Adoption" — retire on `task_execution_started`; drop history-origin local rows a later history read no
  longer lists. No server change. Change Scope and file mapping updated.
- Next: targeted architecture re-review (revised Large / High package), then implementation, source-review delta and the
  API/E2E rerun the code reviewer listed.
- Review: ARCH-REV-005 Pass of SR-009 (2026-10-18, targeted); handed to the implementation engineer. Side note recorded:
  rule 2 also removes an open, inactive team run the user archives (team archive keeps the local context; the history
  read omits archived inactive team runs) — consistent with archive; the implementer confirms and tests it.

### SR-010 — Full adoption of a run's chain

- Trigger: AC-007 on the user's install (delivery engineer, Requirement Gap, `7e215cdf49`): the user's real target, Work
  Journal's team run `software_engineering_team_ffde3bd0…`, was refused by REQ-007 (its one delegated run is a finished
  PM helper of 2026-10-08). The user, 2026-10-18: after adoption the state must equal that of a natural chain ("then it's
  not a full adoption").
- Evidence: natural chain state read from the user's data (member-delegated run: link in the PM's tree, own file names
  the PM's run, `delegated` entry in the team's Task, hosted by the PM's run).
- Requirements: REQ-007 rewritten (full adoption), AC-008 added, DEC-107 superseded, DEC-110 (ongoing → sub-work of the
  adopted Task, tracking Task CANCELLED with a note; finished → history kept, re-hosted). Approved by the user.
- Design: §Full Adoption Of The Chain — forward-only chain steps before T's own steps; every intermediate state valid;
  re-host writes on Task entries; proof by comparison with a natural chain.
- Ticket folder moved back from `tickets/done/` to `tickets/in-progress/` for this revision (worktree
  `link-existing-run-to-task-full-adoption`, branch `codex/link-existing-run-to-task-full-adoption`, base `7e215cdf49`).
- Next: architecture review of the revision.

### SR-011 — ARCH-REV-006 recovery

- ARCH-F-004 (Requirement Gap): chains with board-Task entries — the user decided to refuse them, open or closed
  (REQ-008, AC-009, DEC-112), after discussing why closing such a chain would cancel or stop real board Tasks.
- ARCH-F-006 (Requirement Gap): "equal to a natural chain" = behavior-driving state equal, history kept true (DEC-111,
  AC-008 reworded) — the user agreed.
- ARCH-F-005 (Design Impact): classification once from the pre-adoption temp-Task status; ongoing: append `delegated`
  first, then close the old entry; cancel each temp Task only after all its runs moved; intermediate-state statement
  corrected; close-revert returns a run caught between own-file and link to T; sub-step tests.
- Editorial: handoff header and sections refreshed.
- Next: re-review.

### SR-012 — ARCH-REV-007 recovery

- ARCH-F-007 (Design Impact): unowned chain runs (collaborators converted by 259ddae7; 11 of 93 chain links in the
  user's data) were not classified. Now: class *unowned* → open `delegated` sub-work of the adopted Task, nothing closed
  (DEC-113, within the user's DEC-111); retry recognition stated; fixture and natural-chain comparison added.
- Note answered: dedicated Task-side operations `appendAdoptedSubWork`, `closeAdoptedPriorEntry`, `rehostEntries`.
- Editorial: requirements Document Status updated.
- Next: re-review.
- Review: ARCH-REV-008 Pass of SR-012 (2026-10-18); handed to the implementation engineer. Notes passed on: *unowned*
  (no Task entry) also covers pre-Task copies; `rehostEntries` idempotent for retries; the Project-delete revert
  (ARCH-REV-004) still applies.

### SR-013 — Implementer DI-002

- Trigger: DI-002 (`implementation-design-impact.md`), before any code. Confirmed in code: delegator validation
  (`standalone-root-tree-schema.ts:24-27`), load filter (`task-execution-tree-split.ts:137-155`), ad-hoc Task fields
  (`projects/domain/ad-hoc-task.ts`, no note).
- Decisions (Solution Designer, within the approved direction): (1) chain links written to the delegator's tree file
  under its persistence lock, activated in one commit after T's link; intermediate-state statement corrected; (2) the
  revert returns every chain run to T and reverses finished runs' re-host; (3) temp Task CANCELLED without a note
  (DEC-110 text adjusted).
- Next: targeted architecture re-review, then implementation.
- Review: ARCH-REV-009 Pass of SR-013 (2026-10-18, targeted); notes: revert order for a team T (restore T's file before
  re-adding chain links); accepted residual (a returned ongoing / unowned run stays a closed-Task copy for messaging,
  only after an interrupted adoption's Task is closed before the retry).

### SR-014 — Board-Task chain runs become the delegator's own assignments (the user)

- Trigger: the user, 2026-10-18: instead of refusing a chain that works on a board Task, cut the relationship — the run
  working on the board Task becomes the PM's own assignment for it ("then it becomes directly the board task").
- Requirements: REQ-008 rewritten (no refusal; board-Task chain runs are handed to the delegator as its own
  assignments); AC-009 rewritten; DEC-112 superseded by DEC-114 (the user).
- Design: class *board* (any entry in a Project Task): every entry re-hosted to the delegator; on its current entry, if
  `assigned`, `assignedBy` → the delegator; own file `delegatorAgentRunId` and the link's delegator → the delegator; its
  current Task stays the board Task (closing the adopted Task never stops it). Sub-work of a board Task stays that Task's
  sub-work (re-hosted). Operation `reassignToDelegator` beside the other dedicated Task-side operations.
- Next: targeted architecture re-review; implementer informed.
- SR-014 investigation (same round): assigner, host and message-scope rules checked in code (investigation notes
  §SR-014 Investigation); design evidence added; the cut of messaging between X's and K's runs stated. The user
  confirmed SR-014 ("This is much cleaner … update the relevant design and requirement").
- SR-014 clarification (implementer's question, 2026-10-18): only a *board* run whose current entry is `assigned` gets the delegator as its delegator / assigner; `delegated` sub-work of a board Task keeps its own delegator and is only re-hosted.
- Review: ARCH-REV-010 Pass of SR-014 (2026-10-18, targeted, clarification included); handed to the implementation engineer. Note recorded in the design: for a closed current entry `reassignToDelegator` rewrites its `assignedBy` (intended; the one history field adoption changes; one docs line).

### SR-015 — Every irreversible step after the commit point

- Trigger: the implementer's proposal (2026-10-18): defer a board worker's Task-side writes and delegator change, and the
  temp-Task cancels, until after T's link, because the revert could not undo them.
- Decision (Solution Designer, within the direction): accepted and extended to every class — before T's link only
  reversible tree / own-file steps (links keep their original delegator); after it all Task-side writes, then the
  activation (board worker's delegator → the delegator), then the temp-Task cancels. The revert never meets a Task-side
  write; the ARCH-REV-009 residual disappears. End states unchanged.
- Next: targeted architecture re-review in parallel with the implementer building it.

### SR-016 — ARCH-REV-011 recovery

- ARCH-F-008 (Design Impact): after the commit point only a retry could finish, and a closed / deleted Task refuses it.
  Now `completeCommitted(delegatorRoot)` always finishes a committed adoption: on retry, on the delegator root's load,
  and from the close / Task-delete / Project-delete paths before they act. Tests for each.
- ARCH-F-009 (Design Impact): the revert bullet rewritten to the SR-015 contract (nothing Task-side to undo).
- Next: targeted re-review; implementer informed.
- Review: ARCH-REV-012 Pass of SR-016 (2026-10-18, targeted); handed to the implementation engineer. Notes: keep the load-time completion check cheap (8641c0ac H2); add a test for a direct close overlapping a load.

### SR-017 — Adoption contract and its validation

- Trigger: the user, 2026-10-18: write one contract with every adoption case and validate all of them, as for the memory
  refactor; implementation paused meanwhile.
- Supplement: `adoption-contract.md` (behavior-defining; consolidates SR-003..SR-016). Validation V-1..V-18 found
  V-2 (hub log of an adopted agent run), V-3 (T's own session during the handover), V-4 (classification from entry state,
  not temp-Task status), V-5 (no limbo: D's load resumes any in-progress adoption). Design updated.
- Next: the user reads the contract; targeted architecture review; then the implementer resumes.

### SR-018 — Adoption withdrawn (the user)

- Trigger: the user, 2026-10-18, after ARCH-REV-013 (ARCH-F-010): adoption tries to fix a one-time transition (runs from
  before Tasks) with a lot of permanent special logic; new work starts through the PM with `delegate_task`, so new runs
  never need adoption. "The whole ticket is not worth it … those logic should be reverted as well."
- Decision (the user): withdraw adoption entirely — cancel the full-adoption revision (SR-010..SR-017, unmerged;
  implementer and reviewer stopped) and remove the merged first version (`4e738acc66`). History of SR-010..SR-017 kept
  in this folder (`withdrawn-adoption-contract.md`, design / review records copied from the cancelled worktree).
- Removal: RM-001..RM-004; plan in design-spec "Removal Plan"; Medium / Low → direct implementation.
- My own lesson recorded: I kept making the feature complete through 13 review rounds instead of asking early whether
  completeness was worth its cost.
- SR-018 addendum (2026-10-18): the user asked for a new beta after the removal (RM-005).
- SR-018 addendum: RM-006 refined by the user — generally useful fixes made in the adoption merge are kept (listed in the implementation handoff); only adoption logic is removed.
- SR-018 RM-006 decisions (2026-10-18, Solution Designer under the user's rule, user informed): keep SR-009 rule 2 (a run
  deleted / archived outside this window leaves the sidebar at the next history read) and the token-usage root change
  (`token-usage-run-accumulator.ts`: avoids a Team-root fail-stop on legacy / migrated mixed-root records; identical
  otherwise) and the `TESTING.md` macOS note; remove rule 1 (`onTaskExecutionStarted` hook); revert the two shared
  refactors (`agent-run-history-catalog-state.ts`, `existing-run-assignments.ts`) to the shipped structure.
