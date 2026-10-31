# Requirements — One place per run in the Projects tree

## Document Status

- Status: `Ready for Approval` (one decision needs the user: DEC-001)
- Current solution revision ID: SR-001
- Package: `projects-tree-one-place`; Project Task `autobyteus-353`; follow-up to autobyteus-347
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer; date 2026-10-31
- Approved by: pending (the user)

## Problem And Desired Outcome

- Problem: in Projects mode, a run that handed out Tasks of several Projects is listed under each of them (E-001, E-002). The user's Project Task Manager "hello" appears under 6 Projects; it reads as a duplicated run and he cannot tell where it lives.
- Desired outcome: each run appears in one place in the Projects tree; the work it handed out is still found under the Project it belongs to.

## Decisions

| ID | Question | Options | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Where is a run shown in the Projects tree, and where is the work it handed out to other Projects? | A. One home per run (started-under Project; else the Project it handed out most Tasks for); other Projects list that work directly as delegated rows naming where it came from. B. Only runs started under a Project; older runs stay in Workspaces; Projects list their work as delegated rows. C. Keep listing under every Project with a "shared" mark. | Recommend A (see the conversation message of 2026-10-31). | User | Needs user |

Requirements, acceptance criteria and scenarios are written once DEC-001 is answered.
