# Product Design Request — remote-runs-in-tree (autobyteus-278)

- Classification: `Product Design Requested`. Purpose: `New Request`.
- From: Solution Designer, 2026-10-23. The user asked for it in his words: "good contact it to work on the UI now".
- Engineering worktree (for reading only): `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-runs-in-tree`, branch `codex/remote-runs-in-tree`, base `origin/personal` `3b09fbe308`.

## The user's requested outcome

The user: when his Project Task Manager delegates to a Team on another node (the Marketing Team on his Docker node), "the remote node is not shown under yourself, like the agent or task agent or agent team, like the local nodes; I don't see it … A good user experience is that you make the user feel there is no difference: when you delegate, I can still see there is a software engineering team under it, I can talk to it, and it's the same."

His visual direction (2026-10-23): "on the left side you put a computer icon and give a node name there and then put it under, to make the UI look like this, this is definitely a remote node agent team."

## What the UI must let the user do

The authority is `requirements-doc.md` (UC-801 … UC-804, REQ-801 … REQ-806):
- **See it:** in the run tree (left sidebar), a remote delegated Agent or Agent Team, with its members, appears under its delegator, as a local delegated copy does. It is marked with a computer icon and the node's name (for example "docker"), so it reads unmistakably as remote. It shows its title (the first message's content, as since 269) and its status (working, idle, offline, waiting).
- **Open it:** its conversation, with messages, reasoning, tool calls and results, and status, appears in the main view live, like a local run's.
- **Talk to it:** the user sends messages to the remote Agent or a remote Team member from his window, as to a local one.
- **The panels it doesn't have yet:** files, terminal and workspace are left out in this version (the user's decision). They say it is on the other node, for example "on docker: open it in that node's window".
- **Failures (first version, the user's decision):** when the other node can't be reached, the row or view shows the error plainly, and the rest of the tree works. No reconnecting or polished offline states yet.
- **Open for the user in your review:** DEC-804, whether Stop and Terminate are on a remote row in this version. The Solution Designer recommends yes, the same as on a local row.

## Established context

- The run tree today: standalone runs, Team runs with members, Org runs. Local delegated copies (task agents and task agent teams) appear under their delegator. Code: `autobyteus-web/components/workspace/history/*`, `stores/runHistory*`, `utils/runTreeProjection.ts`.
- The window talks only to its own node's server, which asks the other node (since 267). This also holds in a desktop window opened on a Docker node.
- The node's name is the name the owner gave the peer in Nodes (now one Nodes tab, 268).
- Mobile: the `/mobile` shell doesn't show delegated runs yet; a separate mobile Task adds them using the same tree data. The design should suit both, but this ticket's surface is the desktop and web run tree and the main view.
- Languages: English and Chinese.

## Non-goals

Files and terminal of remote runs; reconnecting and catch-up; global send to unlinked runs.

## Expected return

Your own UI/UX package, reviewed with the user and with his explicit approval (including his DEC-804 answer), returned to the Solution Designer by run ID. Architecture design follows.

## Reference files

- `requirements-doc.md`
- `investigation-notes.md` (in this folder)

## Route

Delegated with `delegate_task` to `/product_team` (2026-10-23), as the user directed. Team run `product_team_1609c558ce9248c6aee4a8b41d846643`; coordinator `product_ui_ux_designer_47b42f1694e346c58988165bf7257699`. No Task ID was returned: the Solution Designer is itself working on a delegated Task.
