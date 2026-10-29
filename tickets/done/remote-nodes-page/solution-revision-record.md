# Solution Revision Record — remote-nodes-page (autobyteus-267)

## Revision Index

| SR | Date | Phase | Summary |
| --- | --- | --- | --- |
| SR-001 | 2026-10-21 | Requirements | Baseline |
| SR-002 | 2026-10-21 | Requirements | Product package approved; scope cut; approved |
| SR-003 | 2026-10-21 | Design | Design complete; Medium / Low; direct implementation |

## Revision Entries

### SR-001 — Requirements baseline (2026-10-21)

- Trigger: the PTM's delegation of autobyteus-267.
- Prior status: N/A. Current status: `Ready for Approval`.
- Affected: REQ-501 … REQ-511, AC-501 … AC-507, DEC-501 … DEC-504.
- Next: the user's approval, and the Product Team for the UI.
- SR-001 addendum: Product Design Requested, delegated to `/product_team` (team run `product_team_99a3e19ea090429c9da2bf87e37d7aee`, coordinator `product_ui_ux_designer_fd8bc13f7b2346b3b7c969a1e6ca0cd6`), at the user's direction.

### SR-002 — The Product package and the user's scope decisions (2026-10-21)

- Trigger: Design Completed from the Product UI/UX Designer (`product_ui_ux_designer_fd8bc13f7b2346b3b7c969a1e6ca0cd6`). The UI/UX spec is `Approved` by the user ("approved"), with the runnable reference and VIS-001 … VIS-007 checked by the Solution Designer.
- The user's decisions: this node's own list, its flags and links are removed (UC-502, REQ-505, REQ-506, AC-503, SCN-502, DEC-501, DEC-503); the rules stay as a collapsed line; peers are also asked when added and when the switch is turned on (REQ-504); search applies to peers' lists, which are sorted by name in the window (REQ-507).
- Status: `Ready for Approval` → `Approved`. The scope cut is the user's; the rest stays within the Task's direction.
- Next: architecture design.

### SR-003 — Design complete (2026-10-21)

- Design: [design-spec.md](design-spec.md).
  - Server: `peerNodeOffer(nodeId)` through `RemoteNodeDiscovery.listAvailableAgentsOf`, one path with the 261 tools.
  - Web: `remoteCollaborationOffersStore`, which keeps per-peer state, triggers and tokens.
  - Web: the UI reference components are ported, and the availability card is removed.
- Classification: `Medium` / `Low`. There is no change to the contract between nodes, no persistence and no security change; the GraphQL query stays within one release.
- Route: direct implementation (handoff rule for Medium/Low).
