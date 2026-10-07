# Product Design Request, Round 2: `project-manager-ux` (SR-003, Tasks with no Project)

- Status: `Product Design Requested`
- Purpose: `New Request` (user-directed extension of the same package and Product ticket)
- From: Solution Designer (`/solution_designer`), 2026-10-07
- Package / Product ticket: `project-manager-ux`. Round 1 is completed and user-confirmed: design repo `/Users/normy/autobyteus_org/autobyteus-web-design`, `tickets/done/project-manager-ux/` (`ui-ux-spec.md`, VIS-001..010, design `1fcf8f8`, close `eb60aba`).
- Requirements: `requirements-doc.md` (Draft, SR-003), section "SR-003 Proposed Extension".

## The user's request
After round 1, the user asked: "is it possible to also show ad hoc tasks on the projects page… even though those tasks are ad hoc tasks, they are still tasks, and our data model already supports that. But then we need to have a proper way of showing this." The user chose to do it in this ticket through another round with you, and asked the Solution Designer for a suggestion to send to you.

## Facts about Tasks with no Project ("ad hoc Tasks")
- Created only when an agent delegates with a plain description (`delegate_task` without `task_id`). That includes every `@` mention delegation and coordinators' internal handoffs. The result returns a `task_id`.
- They start as TODO. Agents usually only set DONE, so running work typically sits in TODO.
- They belong to the conversation that started them, not to a Project, and are deleted with that conversation.
- Each has the same per-Task run record as a Project Task, so the round-1 root line works for them unchanged.
- Only agents change them (text and status). There is no UI editing today.
- **New since round 1 (released in v1.4.96-beta.1):** after DONE, the agent that assigned the work can move the Task back to TODO/IN_PROGRESS and message the worker's run ID. The same worker then comes back with its conversation, and its rows reappear. So a Done ad hoc Task can become Open again.

## Solution Designer's suggestion (starting point, not a decision)
1. **Where:** a "Tasks without a project" card at the top of `/projects`, with its open count. It opens a board in the same style as a Project board. No new left-panel item. (Name ideas: "Tasks without a project", "Quick tasks", "Direct tasks".)
2. **Board:**
   - two lanes, Open (not DONE) and Done, instead of three columns;
   - the root line from round 1 (Running / Idle / Couldn't start / Stopped) shows what is really happening;
   - search, live updates and the 2.4 s highlight as in round 1.
3. **Each row:** the first line of the text; the root line; "From <conversation>" (the run that delegated it, e.g. the user's chat for an `@` request, or "Software Engineering Team › coordinator"), which opens that conversation.
4. **Task page:**
   - shows the full text, reference file paths, "Assigned to" and "From";
   - read-only: no Edit, Delete or upload.
5. **Not included:** moving an ad hoc Task into a Project (the data model does not support it); grouping/filtering by conversation; showing them when Projects is disabled.

## Questions to settle with the user
- The card's name.
- Open/Done lanes or the familiar three columns.
- How the Done lane behaves as it grows (every `@` delegation adds one): collapsed, capped, or plain.
- How a reopened (Open again) Task looks.

## Constraints (unchanged from round 1)
- Round-1 decisions stand: no Manager-specific UI; the root-only rule; the left panel kept across pages; row clicks open from any page.
- Status is shown read-only; agents own status.
- Behind `ENABLE_PROJECTS`; desktop only.

## Expected output
A user-confirmed round-2 result returned to `/solution_designer`: the updated UI/UX spec and final references, the user's decisions on the questions above, and anything rejected or still open. Solution Designer will then fold it into SR-003 and ask the user to approve the whole ticket.

## Canonical artifacts
- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/requirements-doc.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/investigation-notes.md`
- Revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/solution-revision-record.md`
