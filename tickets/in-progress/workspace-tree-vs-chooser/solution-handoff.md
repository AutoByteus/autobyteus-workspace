# Solution Handoff — `workspace-tree-vs-chooser`

- Result: **Architecture Design Complete** (SR-004, revised after ARCH-REV-003), `task_size=Large`, `architectural_risk=High`.
- Origin: Project Task `autobyteus-385` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-11-05.
- Earlier rounds: SR-001…SR-003, a hide-from-tree design that passed ARCH-REV-002. It is preserved in commit `1da49572ab` and replaced by SR-004.

## Request Summary

The Task: remove a workspace from the left tree while it stays selectable in the chat's workspace chooser. Removing it from the chooser stays possible on purpose. No files, runs or history are lost. A test is required, the work is finalized on the base branch, and it is released only on the user's word.

The user then reshaped it with the Product Team; the design is approved and re-approved:
- One `⋯` "View" menu in the run section chooses Runs, Workspaces (the default) or Projects.
- The Workspaces and Projects views list a folder or Project only while it has a run, and show text-only empty states.
- The run section has no add actions and no folder X.
- The chat chooser has a deliberate "Remove", with a confirmation, refused while a run is running.
- The Runs view is the approved `left-panel-super-agents` list, built here (DEC-008). The user will cancel autobyteus-378 afterwards (FU-002).

## Approval

- The user approved the Product design on 2026-11-05: "I'll approve this. I think this is the ones we want". After the correction: "now everything is good now. approved".
- DEC-008 (a), the Runs view built in this ticket, and DEC-010 are his decisions in this conversation.
- DEC-009 was decided by the Solution Designer within the direction.

## Classification Evidence

Large / High (design spec, "Task Size And Architectural Risk"):
- A new view ported from 378.
- A GraphQL argument changes meaning (`null` means every run).
- A server `lastActivityAt` is read from memory files on every history read.
- The shared history store gets one read window.
- The UI blast radius is broad.
- The SR-003 code must be reverted.

## Artifacts (absolute paths)

Ticket documents, all in `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/`:
- `requirements-doc.md` (SR-004)
- `investigation-notes.md` (E-01…E-16)
- `design-spec.md` (SR-004)
- `solution-revision-record.md`
- `follow-ups.md` (FU-001…FU-003)
- `product-design-request.md` (the requests to the Product Team and their returns)
- `design-review-report.md` and `architecture-review-revision-record.md` (ARCH-REV-001 and ARCH-REV-002, on SR-002 and SR-003)

Normative supplements:
- `/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/ui-ux-spec.md`, with VIS-001…VIS-017 (branch `design/workspace-tree-vs-chooser` at `7712ec14`). The runnable reference is in the same worktree, port 3385 (see its runbook).
- The Runs list rows: `tickets/in-progress/left-panel-super-agents/ui-ux-spec.md` on branch `design/left-panel-super-agents` (`c42d1b64`) of `/Users/normy/autobyteus_org/autobyteus-web-design`.

Code to port:
- Branch `codex/left-panel-super-agents`, worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/left-panel-super-agents`.
- Commits `79d6c0e584` and `04b1cc57b0`, plus the uncommitted `autobyteus-server-ts/src/run-history/services/run-last-activity-reader.ts` and its test.
- Its design: `tickets/in-progress/left-panel-super-agents/design-spec.md` (SR-006).
- See the design spec's "Porting Rules".

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser`, branch `codex/workspace-tree-vs-chooser`.
- Base and target: `origin/personal`, base at `3ef5e33eec`.
- Branch state:
  - `1da49572ab`: docs;
  - `8fe7b2e57e`: the SR-003 server work, to be reverted;
  - uncommitted SR-003 web work, to be discarded except the chooser Remove.
- The SR-004 ticket docs are uncommitted.

## Open Risks

- The uncapped read with `lastActivityAt` must stay within a 250 ms poll-read budget on a data set shaped like the user's. Exceeding it is an escalation trigger.
- The ported code failed 378's code review (CR-001). Here it is fixed by DS-005 and reviewed as new code.

## ARCH-REV-003 Revision (2026-11-05)

- **AR-003:** `requirements-doc.md` is rewritten to SR-004 only. The approval is the user's, persisted data is `No`, and the hide design is withdrawn.
- **AR-004:** the Workspaces folder rule moves to `buildRunHistoryNavigationProjection`, which runs after the team and Org runs are attached. The Projects view is unchanged. Added tests: team-only, Org-only and draft-only folders.
- **Recommendations adopted:** the read window follows the view (`null` only for Runs), which drops the display cap. The tree state prunes its own expansion.
- See "ARCH-REV-003 Resolution" in `design-spec.md`.

## Next Expected Action

Independent architecture review, then implementation.

## Route Applied

`get_handoff_rules` (2026-11-05): Large or High → `/software_engineering_team/architecture_reviewer`.

## Review Outcome (recorded, 2026-11-05)

- ARCH-REV-004: **Pass** on SR-004 as revised; AR-003 and AR-004 are resolved. The reviewer sent the package to `/software_engineering_team/implementation_engineer`, with one note: the e2e fixture `task-agent-sibling-sidebar.page.vue` reads folders through `getTreeNodes()`, so it needs a listed run or an update. The Solution Designer forwarded nothing.
