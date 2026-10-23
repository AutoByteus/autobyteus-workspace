# Handoff — Architecture Design Complete — one-nodes-tab

- Classification: `Architecture Design Complete`, `task_size` **Large**, `architectural_risk` **High**. Independent architecture review is requested.
- From: Solution Designer, 2026-10-22. Current SR: `SR-003`.
- Package: `one-nodes-tab`. Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab/tickets/in-progress/one-nodes-tab/`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab`, `codex/one-nodes-tab`. Base `origin/personal` @ `ca1f09e52a`. Finalization target: `personal`. The ticket documents are not committed yet; read them from the folder. No release unless the user asks.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).

## Original request (summary)

"One Nodes tab: merge Remote Collaboration into Manage Nodes, with ONE list of nodes added once." The user's direction (2026-10-21/22): "otherwise it causes a lot of confusion; the user has to add twice."

Done when:
- the user manages all nodes in one tab and adds a node once, with one simple step for the other side;
- each node shows its status, its collaboration state and what it offers;
- a wrong address gives a clear hint;
- existing nodes keep working;
- the user has checked it on his desktop and Docker nodes;
- tests and docs are updated;
- it is finalized on `personal`.

## Approval basis

- Requirements `Approved` at SR-002 by **the user**, 2026-10-22.
- He approved the four decisions as recommended:
  - DEC-701: join the screens, not the stores.
  - DEC-702: one window-driven step registers both sides, each verifying the other's node ID.
  - DEC-703: remove only the Remote Collaboration tab.
  - DEC-704: one confirmation that lists every change, including the other node's switch.
- The UI basis is [ui-sketch.md](ui-sketch.md) rev 2. The user asked for a markdown UI, then said: "Just make the UI clean. If you think the UI is clean, then we can start working on it now." The Product Team round planned in the Task was not used, at his request.

## What the design does (see design-spec.md)

- **One list.** One row per node, joined on screen by node ID. The desktop entry learns the node's ID lazily (an optional `serverInstanceId`, new registry change `identify`, no migration). The two dead probe fields are dropped.
- **One step for both sides.** A `nodeCollaborationConnector` in the window plans the steps (switch here, register here, switch there, register there), shows them for confirmation, then runs them on both nodes through each node's own settings API.
- **The right address per caller.** Each registering server chooses the address that works for it: the new `resolvePeerAddress` tries the other node's window address and its own advertised candidates in parallel, keeping the one that answers with the expected node ID.
- **Clear status.** A→B uses 267's `peerNodeOffer`. B→A uses a new `peerNodeAvailability` query asked on B.
- **Clear errors.** Errors carry a classified cause (refused, timeout, not found) and a server-computed Docker loopback hint.

## Risks to look at in review

- **RSK-701:** registration on B is an unauthenticated settings call, the same trust as today (RSK-401); accepted until the security slice.
- **RSK-702:** candidate resolution timing.
- **RSK-703:** a partial plan is shown, not rolled back.
- **Design-level decisions within the direction:**
  - `resolvePeerAddress` works with the switch off: it only reads public identity endpoints, and adding a peer still needs the switch on.
  - Peer names for rows whose desktop name is not a valid peer name are derived, and shown in the confirmation.

## Follow-ups

FU-001 and FU-002 in [follow-ups.md](follow-ups.md). Not sent yet; the Solution Designer sends them when the ticket leaves the team.

## Files

- `handoff-architecture-review.md` (this file)
- `requirements-doc.md`
- `investigation-notes.md`
- `solution-revision-record.md`
- `design-spec.md`
- `ui-sketch.md` (normative UI)
- `follow-ups.md`
- Probes: `evidence/probes/`

## Expected next step

Architecture review of the design against the approved requirements. Findings on requirements or design come back to the Solution Designer.

## Route

Per `get_handoff_rules`: Large/High → `/software_engineering_team/architecture_reviewer`.

- Route taken: `send_message_to` `/software_engineering_team/architecture_reviewer` (run `architecture_reviewer_f399a00a38854985ae569e98d97e3dc4`), delivered 2026-10-22.

---

# Round 2 — Architecture Design Complete (SR-006), 2026-10-23

- Classification: `Architecture Design Complete`, `task_size` **Large**, `architectural_risk` **High** (confirmed in ARCH-REV-001).
- What changed since ARCH-REV-001:
  - **AR-001 (Requirement Gap):** decided as **(b)**, keep off strict. The user delegated the decision ("you decide") in the Product review, and the approved screens show it (VIS-003, VIS-021). Requirements DEC-709. Design § Switch-Off Rule: `resolvePeerAddress` and `changePeerAddress` require the switch on; a side being turned on resolves after its `turnOn` step.
  - **AR-002:** § Naming Rule.
  - **AR-003:** the `identify` replace rule.
  - **AR-004:** add keeps unreachable nodes (no confirmation; the cause is shown in the row).
  - **AR-005:** one write path per state; `peerNodeAvailability` goes through `RemoteNodeDiscovery`; `nodeStore` is in the connector's dependencies.
  - **AR-006:** § Loopback Hint Surface; AC-707 refined.
  - **The Product Team's approved UI/UX package is integrated.**
    - Package: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-nodes-tab/ui-ux-spec.md` and VIS-001…031. The user: "i think we are ready. approved", 2026-10-23.
    - Requirement impacts applied (SR-006):
      - collaboration on by default in the add form, always confirmed;
      - adding no longer opens the window;
      - Remove also removes this node on the other side;
      - Agents and Teams show only once collaboration is on;
      - Open for a peer-only row;
      - the row line kinds, including "registered only by the other node".
    - Design: § Product Package Mapping; DS-002/DS-004 updated; component set renamed to the spec's; `openNodeWindow` removed from add.
- Status: requirements `Approved` (SR-006); design `Ready`.
- Files:
  - this handoff;
  - `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md` (SR-004 … SR-006), `design-spec.md`;
  - your `design-review-report.md` and `architecture-review-revision-record.md`;
  - the Product package (external, by path).
- Expected: architecture review round 2.
- Route (round 2): `send_message_to` `/software_engineering_team/architecture_reviewer` (run `architecture_reviewer_f399a00a38854985ae569e98d97e3dc4`), delivered 2026-10-23.

---

# Round 3 — SR-007, 2026-10-23

Design-only fixes for ARCH-REV-002:
- **AR-007:** § Run Rules (per plan kind; `remove` always reaches `removeFromList`).
- **AR-008:** DS-002 checks the address on submit, whatever the node's state.
- **AR-009:** DS-004 reads B's `peers` for every reachable row; it is the source of "B → this node via …".
- **AR-010:** stale statements updated in `requirements-doc.md` (Document Status, Readiness) and `design-spec.md` (baseline line, `resolvePeerAddress`, Key Tradeoffs, DS-003, `NodeChangeStep`, Guidance).
- The residual note is applied in § Window Probes While The Switch Is Off.

No requirement changed. Requirements are Approved (SR-006); the design is Ready (SR-007).
- Route (round 3): `send_message_to` `/software_engineering_team/architecture_reviewer`, delivered 2026-10-23.
