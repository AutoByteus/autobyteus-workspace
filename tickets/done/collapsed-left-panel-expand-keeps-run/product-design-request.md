# Product Design Request — collapsed-left-panel-expand-keeps-run

- Classification: `Product Design Requested`
- Purpose: `New Request`
- Date: 2026-10-08
- User request (in the user's words, 2026-10-08): "delegate a task to @Product Team to work on the UI first thanks"
- Requested by: the user, through Solution Designer (`/software_engineering_team/solution_designer`)
- Package identifier: `collapsed-left-panel-expand-keeps-run`; current solution revision `SR-001`
- Requirements status: `Ready for Approval`. Not approved yet. DEC-001..DEC-004 are still open, and the user asked for UI work first.
- Original Task: Project Task `project_task_b2b0538a-4613-457a-81ed-6c9e9949da77` ("Collapsed left panel: let the user expand it again without leaving the run they're on")

## Requested Outcome

The user wants Product Team to work on the UI for this change before the solution is finalized. That means the experience of:
- expanding the collapsed left panel without leaving the run that's open
- seeing that run highlighted and visible in the Workspaces tree once the panel opens

The user will review the result. Solution Designer will then fold the user's confirmed UI decisions into the requirements and ask for approval.

## Product Decision / Uncertainty To Work On

- **DEC-001:** how the user expands the collapsed left panel. The current proposal is A: a dedicated "Expand left panel" control at the top of the icon strip, using the same panel glyph as the docked panel's "Collapse left panel" button. Alternatives:
  - B: the strip's Chat icon only expands while a run is open.
  - C: both A and B.
- **DEC-002:** what the strip's navigation icons (Chat, Agents, Teams, Orgs, Projects, …) do on a wide window once a dedicated expand control exists. Options:
  - a (proposed): unchanged — expand the panel and go to that page.
  - b: go to that page but keep the panel collapsed.
- What the expanded panel looks like when it opens on a run:
  - the run is selected
  - its parent groups are expanded
  - it is scrolled into view
  This applies to every run kind: a standalone agent; a task worker under an Agent run; a Team member, including one inside a nested sub-team; and an Org member.
- Narrow/short windows, where the strip opens a transient drawer: the same expand control and the same reveal.
- Adjacent questions, both proposed as out of scope:
  - DEC-003: keep the user's other manual tree expansions across collapse → expand.
  - DEC-004: auto-scroll the tree when a run opens while the panel is already docked.

## Critical Journey (SCN-001)

1. Desktop app, wide window. The user collapses the left panel to the 50 px icon strip (Chat, Agents, Teams, Orgs, Projects, Skills, Memory, Nodes, … Settings at the bottom).
2. In the right-hand Projects tab (Task board), the user clicks the linked run on an In Progress Task card (e.g. "software en… · Idle"). The worker opens in the center (e.g. "solution designer").
3. The user expands the left panel to see that run in the Workspaces tree: which team or member it is, its siblings, its status.
4. Today the only way is a strip icon. It also navigates; Chat goes to New chat with Daily Assistant, so the run is lost.

Expected outcome: the panel expands, the same run is still open in the center, and the run is highlighted and visible in the tree. Nothing else opens.

Other journeys:
- SCN-002: Team-hosted Task worker, or a member opened from the right Team tab.
- SCN-003: Org-hosted Task worker.
- SCN-004: strip navigation icons.
- SCN-005: narrow window drawer.

## Established Constraints And Non-Goals

- Expanding never changes the route, the open run, the center pane, an open New chat draft, or the right panel/tab (REQ-002).
- The docked panel's Chat row and pencil keep opening a fresh New chat (documented contract in `autobyteus-web/docs/chat.md`).
- The strip's navigation icons keep their page meaning unless DEC-002 changes it (documented in `autobyteus-web/docs/workspace_layout.md`).
- The right strip/panel and the `/mobile` phone shell are out of scope. A keyboard shortcut is out of scope.
- Strings must exist in en and zh-CN. The control must be keyboard accessible.

## Existing Product / Frontend Context

- Strip: `autobyteus-web/components/layout/LeftSidebarStrip.vue`
- Docked panel and its collapse button (first row, right side): `autobyteus-web/components/AppLeftPanel.vue`
- Layout: `autobyteus-web/layouts/default.vue`
- Workspaces tree: `autobyteus-web/components/workspace/history/`
- User screenshot of the starting state: `evidence/user-collapsed-strip-run-open.png`

## Canonical Artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run/tickets/in-progress/collapsed-left-panel-expand-keeps-run/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run/tickets/in-progress/collapsed-left-panel-expand-keeps-run/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run/tickets/in-progress/collapsed-left-panel-expand-keeps-run/approval-request.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run/tickets/in-progress/collapsed-left-panel-expand-keeps-run/evidence/user-collapsed-strip-run-open.png`

## Expected Return

A Product result that the user can review, returned to Solution Designer (`/software_engineering_team/solution_designer`). It should include:
- the user's explicit confirmation reference
- the package's artifact paths
- any decisions on DEC-001..DEC-004 that the user makes during the Product work

## Route Record

- The user explicitly asked to delegate to Product Team (`/product_team`) with `delegate_task`.
- Delegated 2026-10-08. The tool confirmed a team copy whose coordinator run ID is `product_ui_ux_designer_b22927e01ab64e47a03de8d41c18015d` (`target_kind: team`). The tool returned no `task_id`.
- Next: wait for the Product result, then reconcile it with the requirements and obtain the user's approval.
