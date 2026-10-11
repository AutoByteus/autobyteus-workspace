# Approval Request — delegated-copy-task-locator (SR-001)

- Package: `delegated-copy-task-locator`; Task `project_task_b541c02a-587d-4ebf-b315-15648cce9d4d`
- From: `/software_engineering_team/solution_designer` → requester `/project_task_manager` (please relay to the user)
- Status: requirements `Ready for Approval`; design not started (it starts after approval)
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator`, branch
  `codex/delegated-copy-task-locator`, base `origin/personal` @ `359d2c0ef`, finalization target `origin/personal`
- Artifacts (absolute paths):
  - `.../tickets/in-progress/delegated-copy-task-locator/requirements-doc.md`
  - `.../tickets/in-progress/delegated-copy-task-locator/investigation-notes.md`
  - `.../tickets/in-progress/delegated-copy-task-locator/solution-revision-record.md`
  - Product spec (fixed input): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/delegated-copy-task-locator/ui-ux-spec.md`

## What the user is asked to approve

The approved design is implemented exactly as specified (REQ-001 to REQ-007, REQ-010: summary line, the summary as
the link, locating on the board with every edge case, en/zh-CN strings). On top of that, this baseline adds:

1. **Server data, kept live (REQ-009).** The server already records which Task each copy works on. The tree asks
   the server for the copies it shows, in one batched request, and refreshes from the Projects change feed when a
   Task is renamed, reassigned, closed, reopened or deleted. No Task lists are scanned in the browser.
2. **"Current Task" (REQ-008, ASM-001).** The rule is the server's: the Task the copy works on now; if none is
   open, its most recent assignment. Only Tasks whose current worker is this copy count. In every supported case
   this gives the same result as the spec's "the open one updated last, else the one updated last".
   Consequence: sub-work copies that a Task worker starts itself show no summary, because they share the worker's
   Task. The reference behaved the same way.
3. **Cancelled pill ring fix (REQ-011).** Tailwind will also scan `utils/`, so `ring-slate-300` is generated. This
   is a one-line config change.

## Decisions needed

- **DEC-001: which Task-worker rows get the summary?**
  - (a) Copies under standalone Agent runs only, as designed.
  - (b) **Recommended minimum:** also copies under Agent **Team** runs. They use the same row, so no extra design
    is needed.
  - (c) (b), plus Org-run Task workers with the same visible treatment. The Org tree's rows are separate
    single-line buttons, so this needs a two-line restructure. That is moderate extra work, and Product hasn't
    validated it visually.
- **DEC-002: what happens when the summary is clicked on a page with no right panel?** This covers the Agents,
  Agent Teams, Projects, Skills, Memory and Settings pages. The design covers only pages that have the right panel,
  and in the reference nothing visible happens on these pages.
  - (a) **Recommended:** open the run the row belongs to, as clicking its run row does, then locate the Task in
    that run's right panel. This keeps one locate experience.
  - (b) Open the Task's page in the full Projects section.
  - (c) The summary can't be clicked on those pages.
  - If you want a Product design call, please ask the Product Team. Otherwise the user's choice is enough.

## Coordination (already agreed through you)

- Landing order: `delegated-team-aggregate-status` (Task 7a42fa46) lands first, and this work rebases on it. The
  row structure follows their constraints and those of the collapsed-left-panel work (QR-003, AC-019).
- After approval I'll finish the design. Server work and Projects-tab work don't depend on their merge. The
  tree-row changes wait until you say their branch has landed.

## Reply needed

The user's explicit approval of SR-001 and their answers to DEC-001 and DEC-002, for example: "Approved; DEC-001 (b);
DEC-002 (a)".
