# Product Design Request — one-nodes-tab

- Classification: `Product Design Requested`. Purpose: `New Request`.
- From: Solution Designer (software engineering team), 2026-10-22.
- The user's words: "lets first work on UI design, contact @Product Team please".
- Engineering worktree (read only): `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab`, branch `codex/one-nodes-tab`, base `origin/personal` `ca1f09e52a`.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab/tickets/in-progress/one-nodes-tab/`
- Requested by (Task): `/project_task_manager`.

## The user's requested outcome

The user wants one Nodes tab, "Manage Nodes", where he manages all his nodes in one list and adds each node once.

- Remote Collaboration stops being a separate tab with its own second list of the same nodes. In his words: "otherwise it causes a lot of confusion; the user has to add twice".
- He wants the UI designed now, before the engineering work continues, and he approves the design.

In his own words, the journey he expects (2026-10-22): staying in the embedded node's main window, he adds a node such as 8003. On its row he turns on an "Agents" switch. He then sees 8003's Agents and Agent Teams, without clicking Open to go to 8003's window and adding the embedded node there by hand.

## What the page must let him do

The authority is the requirements doc, `requirements-doc.md` (approved at SR-002 except DEC-709 below):

- **UC-701, the one list:** each node once, identified by its node ID (REQ-702, REQ-703, REQ-711). Each row shows the name, whether it is reachable now, Open, Rename, Remove, its collaboration state and, expanded, what it offers.
- **UC-702, add once:** one form with address and name, plus an "agents may work with this node" choice that is **off by default** (REQ-704). Adding a node that isn't reachable now still adds it, with the cause shown as information.
- **UC-703, collaborate in one step:** turning the row's Agents switch on shows **one confirmation listing every change**, then the app makes them on both nodes (REQ-705):
  - register that node here;
  - turn on collaboration there if it is off;
  - register this node there, under a name that is shown, made unique if needed.
  Turning it off removes both registrations and never turns off the other node's switch.
- **REQ-706, status per direction:** "this node → 8003" and "8003 → this node". The states are working, off here, off there, not registered here, not registered there, not reachable, a different node at its address, and checking (up to 20 s). When something is missing, the row offers **the one action that fixes it**.
- **UC-704, wrong address:** the cause is named (refused, timed out, name not found, not an AutoByteus node, a different node, off there), never just "fetch failed" (REQ-707). There is a Docker hint for `localhost`/`127.0.0.1`, which appears only where a Docker node can't find another node's address (REQ-708; see design § Loopback Hint Surface).
- **UC-705, this node's own switch:** this node's Remote Collaboration switch, its explanation and "How peers' runs work" become a section of Manage Nodes (REQ-709). Off by default.
- **UC-706, Rename and Remove:** Rename sets one name, which is also the name agents use: 1–64 characters, letters, digits, spaces, `_ . -` (REQ-710). Remove confirms what will be removed.
- **The other tabs stay:** Memory Sync, Phone Setup, Docker Guide and NFS Guide (DEC-703). Only the Remote Collaboration tab goes.

## Established constraints and states

- **Two contexts:**
  - the desktop window opened on the embedded node;
  - a window opened on a Docker node. There, "this node" is the Docker node, and the embedded node is a row (REQ-713).
  The web UI in a browser has no Open. English and Chinese.
- **A node has two addresses, depending on who calls:**
  - the desktop opens 8001 at `localhost:8001`;
  - inside the container, the desktop is reached at `host.docker.internal:29695`.
  The app finds the second one by itself. A row shows where the desktop opens the node; the expanded row can show the address the other node uses.
- **What a node offers** is the 267 view, which already exists in code: `RemoteCollaborationOfferDisclosure.vue` and `RemoteCollaborationOfferList.vue`. Agents and Agent Teams, with name, kind and description; a search box when there are more than 6.
  - It is asked when the tab opens, when a node is added, when the switch turns on, and on refresh. Never on a timer, and a slow node never blocks the page.
  - **Not to bring back:** the list of *this* node's own shared agents and their readiness flags. The user removed it in 267: "I can see them from the Agents and Agent Teams pages, it is redundant".
- **Trusted private network only:** peers are not authenticated yet. The confirmation says so briefly.
- **Today's UI (baseline):**
  - `autobyteus-web/components/settings/NodeManager.vue` with `NodeManagerTabs.vue`: Manage Nodes has "This node", an add form, and a configured list with Open, Rename, Remove and a capability chip.
  - `RemoteCollaborationCard.vue` and `RemoteCollaborationPeersSection.vue`: the switch card, peer rows with state chip, refresh, Rename and Remove, the offer disclosure, an add-peer form, and "How peers' runs work".
- **The user's real nodes** (illustrative data): the embedded node `http://127.0.0.1:29695`; Docker nodes `http://localhost:8001` (peer name "docker") and `http://localhost:8003`.

## Input from the engineering side (not a design to copy)

`ui-sketch.md` (revision 3) is a markdown sketch the Solution Designer made when the user asked for "a markdown based UI so I can have a look". It shows the states and the confirmation contents the requirements need: a per-row Agents switch, a warning line with one fixing button only when needed, details on expand, a ⋯ menu for Rename and Remove. Use it as input for what must be covered, not as the design. The Product Team's approved package replaces it as the UI authority.

## Open questions for the design (with the user)

1. **Agents before the switch?** The user asked: "when I add a node, can I see the other node's agents and agent teams?" In the design so far, the list appears once the Agents switch is on, because it is "what my agents can use". He hasn't answered whether he also wants to see a reachable node's agents right after adding it, before turning the switch on. The desktop could read them directly, as Open does. Please settle this with him in the design review.
2. **DEC-709, pending the user.** This changes one line in the confirmation. When the other node's collaboration is being turned on by the same confirmation:
   - recommended (b): the line reads "8003 finds this node's address once it is on";
   - (a): the address is shown right away.
   Design for (b), which keeps every node fully silent while its switch is off. Mark the line as depending on DEC-709.
3. **How a partial result looks.** For example, registered here, but 8003 couldn't be reached to finish. The design must show it as a row state with its fixing button, not hide it.

## Non-goals

- Starting or messaging remote runs from the page.
- Changing Memory Sync, Phone Setup or the guides.
- Polling or live updates.
- Peer authentication.

## Expected return

The Product Team's own package, reviewed with the user and with his explicit approval, returned to the Solution Designer. The Solution Designer then integrates it into the requirements, finishes the design, and sends it back to architecture review round 2.

## Reference files

- `requirements-doc.md`
- `investigation-notes.md`
- `ui-sketch.md` (input)
- `design-spec.md` (for the technical constraints behind the states: § Naming Rule, § Loopback Hint Surface, § Switch-Off Rule)

## Route

Delegated with `delegate_task` to `/product_team` on 2026-10-22, as the user directed.
- Team run: `product_team_1dea39c6b6204a4a9c153a352daa460e`
- Coordinator: `product_ui_ux_designer_c409f6b103144ff7b0659f1ad09b293a` (talk with the team through this run ID).
