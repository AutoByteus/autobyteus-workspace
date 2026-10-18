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
