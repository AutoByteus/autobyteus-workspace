# Approval Request — collapsed-left-panel-expand-keeps-run (SR-001)

- Status: Requirements `Ready for Approval` (approval hold; no handoff rule applies)
- Original request: Project Task `project_task_b2b0538a-4613-457a-81ed-6c9e9949da77`, delegated by `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run` (branch `codex/collapsed-left-panel-expand-keeps-run`, base `origin/personal` @ `3a2496c95`, finalization target `origin/personal`)
- Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run/tickets/in-progress/collapsed-left-panel-expand-keeps-run/requirements-doc.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run/tickets/in-progress/collapsed-left-panel-expand-keeps-run/investigation-notes.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run/tickets/in-progress/collapsed-left-panel-expand-keeps-run/solution-revision-record.md`

## Why it happens

- On a wide window, with the panel collapsed by the user, every strip icon does two things: it expands the panel **and** opens that icon's page (`LeftSidebarStrip.vue`, `handlePrimaryClick`).
- The Chat icon's page is bare `/chat`, which drops the open run's `?id=`. Bare `/chat` is the New chat page, and its default agent is Daily Assistant (the "data assistant" you saw).
- There is no control that only expands the panel.
- On a narrow window the strip already behaves the way you want: it opens a drawer without navigating.
- When the panel comes back, the tree expands the groups around the selected run, but it never scrolls to it. For a member inside a nested sub-team, it may not expand all the way down.

## Proposed behavior (REQ-001..REQ-007)

1. The collapsed strip gets an **Expand left panel** button as its top item. It uses the same panel icon as the "Collapse left panel" button.
2. The button only expands. On a wide window the panel docks; on a narrow window the drawer opens. Nothing else changes: the page, the open run, the right panel and the Projects tab all stay as they are.
3. When the panel appears, the run that's open is highlighted in the Workspaces tree, its groups are expanded, and it's scrolled into view. This covers:
   - a standalone agent run
   - a worker under an Agent run
   - a team member, including one inside a sub-team
   - an Org member
4. This works whatever opened the run while the panel was collapsed: a Task card in the Projects tab, the Projects pages, the Team tab, or the first send of a New chat.
5. The other strip icons keep their current behavior. The docked panel's Chat row still opens a New chat.

## Decisions needed

- **DEC-001:** How the panel is expanded.
  - **A (recommended):** the dedicated Expand button described above.
  - B: the Chat icon stops navigating while a run is open.
  - C: both A and B.
- **DEC-002:** What the other strip icons do on a wide window.
  - **a (recommended):** stay as they are today: expand the panel and open their page.
  - b: open their page but leave the panel collapsed.
- **DEC-003:** Should the tree remember your other expanded groups across collapse and expand? Today they reset. Recommended: not in this task.
- **DEC-004:** Should the tree also scroll to a run you open while the panel is already open? Recommended: not in this task.

## Next action

The user approves, or changes, the requirements and answers DEC-001..DEC-004. Solution Designer then does the architecture design.

---

# SR-002 Approval Request (supersedes the SR-001 decisions above)

- Status: requirements `Ready for Approval` (SR-002).
- Trigger: Product `Design Completed`. The user confirmed the UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/collapsed-left-panel-expand-keeps-run/ui-ux-spec.md` (VIS-001..008).
- Route: no handoff rule applies to an approval hold. The result goes back to the user in this conversation.

## What is to be approved (requirements-doc.md SR-002)

- REQ-001: a Workspaces icon (tree glyph) in the collapsed strip, after the page icons and a light divider. There is no separate expand toggle.
- REQ-002: Workspaces shows the panel (docked, or the drawer) and never navigates. The run, center, draft and right panel are unchanged.
- REQ-003, REQ-005: on appear, the open run is selected, its ancestors are opened (including nested sub-teams), and it is scrolled to centre if it is hidden. This covers every run kind and every entry point.
- REQ-004, REQ-006: nothing else opens; with no run open, nothing is selected and the draft is kept.
- REQ-007: page icons, Chat row and pencil clicks are unchanged.
- REQ-008: Workspaces is lit while a run is open. Chat (strip and docked row) is lit only on New chat.
- REQ-009: focus goes to Workspaces after collapse, to the revealed row after docking, and back to Workspaces when the drawer closes.
- REQ-010: on short windows (481–540 px tall) the divider is hidden and the gap is tighter.
- Out of scope: DEC-003 (remembering other expansions), DEC-004 (auto-scroll while docked), auto-opening the panel, a shortcut, the right strip, mobile.

## Open decision

- DEC-005: should Workspaces be lit on a `/workspace` page that shows no run, i.e. the Org launch page or an empty workspace view? The spec's rule says "`/workspace`", but its intent is "whenever a run is open". Recommended: lit only when a run is shown.

## Next action

The user approves SR-002 and answers DEC-005. Solution Designer then does the architecture design.
