# Product Design Request — manage-nodes-professional (autobyteus-363)

- Classification: `Product Design Requested`. Purpose: `New Request`.
- From: Solution Designer (software engineering team), 2026-11-01. Task autobyteus-363 from `/project_task_manager`, which names the Product Team's design process.
- Engineering worktree (read only): `/Users/normy/autobyteus_org/autobyteus-worktrees/manage-nodes-professional`, branch `codex/manage-nodes-professional`, base `origin/personal` `3b9dc912a1` (beta v1.5.11-beta.10).
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/manage-nodes-professional/tickets/in-progress/manage-nodes-professional/`

## The user's requested outcome (his words)

"the manage nodes page UI should definitely be improved. It looks very unprofessional if you look at it. I remember earlier we worked on this a bit, but still not good enough." (2026-11-01, on beta v1.5.11-beta.10)

His screenshot of the current page: `user-screenshot-2026-11-01-beta10.png` in the ticket folder. He named no single defect. The Task asks your process to find what makes the page look unprofessional and show him options:
- layout, hierarchy and spacing;
- the controls, and the mix of icons and switches;
- how node state and actions read.

Use the app's existing design language.

## History you should know

- **autobyteus-268 (`one-nodes-tab`)**: your own package, approved by the user on 2026-10-23: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-nodes-tab/` (ui-ux-spec, VIS-001…031, design-change-log DC-701…723).
  - Its **behavior, states, transitions, validation and copy meaning stay normative.** Its look may change.
  - In that review the user rejected some patterns: a ⋯ menu for Rename/Remove, a row chevron, a "Remove" link inside the expanded row, text buttons for Open/Remove, an "Added" banner or toast, and an "Agents" switch label that was off by default.
  - Bringing any of these back is fine only as an option you show him, not as a silent change.
- **autobyteus-305 (`docker-node-in-place-server-update`)** added, on each remote row, the server version line ("Server 1.5.11-beta.10") and "Update to <version>" with "Same version as this app". It also added progress steps, restarting, a not-reachable message with the last step, a newer-than-app note, and result and blocker notices with "Copy command".
  - **This was designed in engineering, without a Product pass.** It is in `NodeServerUpdate.vue` and is described in `tickets/done/docker-node-in-place-server-update/design-spec.md` § Row states and DEC-018 (in the engineering worktree).

## What the page must keep doing (requirements-doc.md, approved within the direction)

- **REQ-902: every function and state stays, with the same meaning and outcome** (inventory BEH-901 … BEH-908 in `investigation-notes.md`):
  - this node's card, its remote-collaboration switch, the explanation, the off note and "How remote collaboration works";
  - the add form (collaboration on by default, confirmation, errors, duplicate);
  - each row: dot states, click-to-rename, collaboration switch, Open, Remove;
  - the row lines with one fixing button;
  - the offer summary, which opens the list and the connection details (Change address, the Docker hint);
  - the server version and update states;
  - the one confirmation dialog;
  - every context: the Docker-node window, the browser without Open, English and Chinese, narrow widths.
- **REQ-903: design the rare states too,** not only the common view: checking, each line kind, partial result, Docker hint, update available, updating and restarting, update notices with Copy command, not reachable, empty list, empty offer, this node off.
- **DEC-902:** functions may move (presentation), as long as each stays reachable where the owner needs it. Note the earlier rejections above.
- **DEC-903:** wording may be polished, keeping each message's meaning (no "peer"). No new or removed messages.
- **Feasibility:** nothing here depends on uncertain technology. Every element exists today, so no visible element rests on an unproven claim.

## Non-goals

- Any behavior, data or server change; new information; new functions.
- The Memory Sync, Phone Setup, Docker Guide and NFS Guide tabs, unless the design needs a small, stated adjustment.
- A release.

## Expected return

Your package, reviewed with the user and with his explicit approval, returned to the Solution Designer. I then write the technical design and continue the engineering route.

## Reference files

- `requirements-doc.md`
- `investigation-notes.md`
- `user-screenshot-2026-11-01-beta10.png` (all in the ticket folder)

## Route

`delegate_task` to `/product_team`, 2026-11-01.
- Team run: `product_team_c8fdef05e7ab49c3a21ae36a70cff50d`
- Coordinator: `product_ui_ux_designer_2b44314d9cc247d183e49d66a8cb5ed7`

No `task_id` was returned: this work is part of autobyteus-363, which is itself a delegated Task.
