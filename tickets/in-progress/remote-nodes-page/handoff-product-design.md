# Product Design Request — remote-nodes-page (autobyteus-267)

- Classification: `Product Design Requested`. Purpose: `New Request`.
- From: Solution Designer (software engineering team), 2026-10-21. The user asked for it in his words: "after investigation you can delegate to @Product Team to work on the ui task".
- Engineering worktree (for reading only): `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-nodes-page`, branch `codex/remote-nodes-page`, base `origin/personal` `9e7a458808`.

## The user's requested outcome

The user, looking at the Nodes → Remote Collaboration page in the desktop app (2026-10-21): "do you think it's better to show the agents and agent teams available from the remote node? We could improve this page: after I add the remote node, we could really see their agents and agent teams." He wants the Product Team to design the UI, and he approves the design.

## What the page must let the owner do

The requirements are in `requirements-doc.md`, which is the authority:
- **Each peer node:** UC-501 (REQ-501 … REQ-504). See its state now (available, or unavailable with the reason) and its Agents and Agent Teams (name, kind, description when it has one).
- **This node's offer:** UC-502 (REQ-505, REQ-506). In "Agents and Agent Teams available to peers", see the shared Agents and Teams of this node. Each one is marked ready, no default runtime and model, or its default can't run (with the reason), and a link leads to its settings.
- **Long lists:** UC-503 (REQ-507). Narrow them by name; the default view is short.
- **Switch off:** REQ-508. No lists; the page says why.

## Established constraints and states

- **The page today:** the switch card; "Peer nodes" (name, URL and node ID per peer, Rename and Remove, an add form with URL and name); and the card "Agents and Agent Teams available to peers", which is one paragraph of rules (temp workspace, auto-approve, local login, no default means refused). The code is in `autobyteus-web/components/settings/RemoteCollaborationCard.vue` and `RemoteCollaborationPeersSection.vue`.
- **Peer states the server can report:**
  - available;
  - remote collaboration off there;
  - this node not registered there;
  - not reachable (also an older build);
  - a different server at its address;
  - waiting: a peer can take up to 20 s to answer.
  - The page must never block, and must not poll.
- **Readiness of this node's entries:** ready; no default runtime and model (for an agent or a Team member); its default can't run, with a reason text such as "Codex App Server command … is not available".
- **Data available per entry:**
  - name, kind (Agent or Agent Team), description when it has one;
  - for this node's entries only, also a link target (the agent or Team edit page).
  - Nothing else: a peer never reveals definitions, prompts or settings.
- **Contexts:** the desktop window, which can be opened on a Docker node, and the web UI. Both English and Chinese are localized.

## Decisions for the design

- DEC-502: when a peer is asked. The Solution Designer's recommendation is once when the page opens, plus a refresh per peer; the alternative is when the owner expands the peer. Either satisfies the requirements.
- The short default view and the search: their form.
- Where the readiness flag and the link sit, and how the reason reads.
- How the existing rules paragraph fits beside the new list.

## Non-goals

Starting or messaging a remote run from the page; changing what is shared; live updates.

## Expected return

The Product Team's own package, reviewed with the user and with his explicit approval, returned to the Solution Designer (run ID in the delegation). After that comes the architecture design.

## Reference files

- `requirements-doc.md`
- `investigation-notes.md` (both in this folder)

## Route

Delegated with `delegate_task` to `/product_team` (2026-10-21), as the user directed. Team run `product_team_99a3e19ea090429c9da2bf87e37d7aee`; its coordinator `product_ui_ux_designer_fd8bc13f7b2346b3b7c969a1e6ca0cd6` is the one to talk with.
