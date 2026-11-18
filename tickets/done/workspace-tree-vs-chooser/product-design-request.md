# Product Design Request: workspace-tree-vs-chooser (autobyteus-385)

- Classification: `Product Design Requested`, purpose `New Request`
- Date: 2026-11-05
- Requested by: the user, in the Solution Designer's conversation ("could you ask Product Team … Let's work on the UI")
- Sent to: `/product_team` (named by the user)
- Requirements basis: `requirements-doc.md` (approved SR-003), with the proposal below (DEC-007, pending this design and the user's approval)

## The User's Words

- The ticket (2026-11-05): "the workspaces tree displays all workspaces; in the chat area I only want to select a workspace for the execution. If I remove it from the tree, I think it is also removed from the chat area... can we first allow removing it from the tree area but I can still select it in the chat area?"
- His typical case: "Normally, when I remove it … I have already archived … all those stuff … inside that workspace." "If I want to run agent or agent team on a certain workspace, it appears on the left side." "Of course, the user will not delete it when there are still runs."
- His new idea (2026-11-05): "just hide it … maybe there's a way of hiding something and then you can make it a bit visible again. Some … UI effect could already make it work."

## The Decision To Design

How a folder hidden from the left Workspaces tree looks, and how the user sees and brings it back. The Solution Designer's sketch, which the user agreed with in direction (it is not a prescription):

- "Hide from Workspaces" on a folder row moves it out of the main list into a dim, collapsed "Hidden (N)" row at the bottom of the tree.
- Expanding that row shows the hidden folders greyed, each with a "Show" action.
- The chat's workspace chooser keeps listing every folder, hidden ones included.

Questions the design should answer:
1. How hidden folders look and where they sit in the tree (collapsed group, dimmed rows, a toggle, or something better).
2. How the user brings one back (per-folder "Show", or more).
3. What the tree shows when a hidden folder has a running run (the rule: a running run is never out of sight).
4. What happens in the tree when the user picks a hidden folder in the chat chooser and starts a run there (the user: it appears on the left).
5. Whether the chooser marks hidden folders in any way (it must still offer them).
6. The chooser's deliberate "Remove" (full removal from every list): its button and confirmation.
7. The phone's work list: the same hidden behaviour, or a simpler one.
8. The confirmations' wording: hiding a folder that still has finished runs (they are hidden with it), and removal.

## Established Requirements And Constraints

| ID | Fixed |
| --- | --- |
| REQ-001 / AC-001 | Hiding removes the folder from the tree's main list (and the phone's work list); every folder chooser still offers it |
| REQ-002 / AC-002 | The chat chooser has a deliberate "Remove" per user folder, with a confirmation; it unregisters the folder from every list |
| REQ-004 / AC-005 | Hiding and removing delete nothing (files, memories, runs, history) and are refused while a run is running in that folder, with today's message |
| REQ-005 / AC-006 | The hidden state is shared: every desktop window and the phone agree (kept on the server; feasible, in the reviewed design) |
| AC-003 | A delegation into a hidden folder never brings it back |
| DEC-006 / AC-008 | A hidden folder with a running run is visible while the run lasts |
| — | Temp workspace can't be hidden or removed |

Changed by the user's new idea (pending): the reviewed design had no manual way back except starting a run or "Add workspace"; a visible "Hidden" area with "Show" adds one.

Non-goals: a separate settings page for folders; Project folder links; deleting files or history.

## Feasibility

Every item above is feasible with the reviewed server design (a small hidden list on the server, a `shownInWorkspacesTree` field per workspace, hide and show commands). No visible element depends on an unproven claim. Showing hidden folders in a separate tree group is a front-end change over data the client already has.

## Existing Product Context

- Left Workspaces tree: `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`, `WorkspaceHistoryWorkspaceSection.vue`
- Chat workspace chooser: `autobyteus-web/components/chat/ChatWorkspaceMenu.vue` (used by `ChatNewSurface.vue`)
- Phone work list: `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts`
- Base branch `personal`; the ticket worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser` holds a paused implementation of the earlier design (do not treat it as the design).

## Artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/design-spec.md` (reviewed server design, SR-003)

## Expected Return

A UI/UX result the user has reviewed and approved, returned to the Solution Designer, which then updates the requirements (SR-004) and the design.

## Delegation

- 2026-11-05: delegated to `/product_team`. Team run `product_team_3e692943777a4781af5fb6e0474973f9`; coordinator `product_ui_ux_designer_6e2af89506064a179da86710fe19b800`. No `task_id` was returned, since this is part of autobyteus-385.
- The SR-003 implementation is paused (the implementation engineer was told on 2026-11-05).

## Returned Result (2026-11-05)

- Design Completed and approved by the user ("I'll approve this. I think this is the ones we want.").
- `ui-ux-spec.md` links the review URL and runbook and VIS-001…VIS-013. Its repository, branch, base `a0e18abb` and source pin agree with the report.
- The integration into the design repository's `personal` waits until the implementation is confirmed (the user's standing rule). So the delegated work stays open.
- The result is integrated as SR-004 in `requirements-doc.md`. DEC-008 is pending the user.

## Result Correction Request (2026-11-05, purpose `Result Correction`, same scope)

- Original request: this file, "The Decision To Design". Returned package: `ui-ux-spec.md` on `design/workspace-tree-vs-chooser` (48fc230f, 34fa3b8f).
- Gap: the user decided after approving it (DEC-010, REQ-009, AC-012 in `requirements-doc.md`) that the Workspaces and Projects views show a folder or Project only when it has at least one run the view lists. His words: "the left side anyway shows the agent run or agent team run … if … there are no agent run or agent team run … under them … we don't have to show them." VIS-001 and VIS-005 show folders and Projects without runs (`docs-site`, `design-notes`), so they no longer match.
- What the correction must settle with the user:
  1. The views and screenshots under the rule. A stopped (non-archived) run counts. Temp workspace follows the same rule.
  2. What the user sees after "Add workspace" and "New Project", since the new item has no runs. The Solution Designer's suggestion: after "Add workspace", open a new chat with that folder chosen; "New Project" already opens the Project's page.
  3. Each view's empty state (nothing with runs).
  4. Any copy that mentions the views. For example, the chooser's Remove text says "its runs will not appear under Workspaces".
- Unchanged: the three views, the menu, the tree X removed, and the chooser's Remove and refusal.
