# Solution Revision Record — remote-runs-in-tree (autobyteus-278)

## Revision Index

| SR | Date | Phase | Summary |
| --- | --- | --- | --- |
| SR-001 | 2026-10-23 | Requirements | Baseline for the user's decisions |
| SR-002 | 2026-10-23 | Requirements | The user's decisions from the discussion; Product Design requested |
| SR-003 | 2026-10-23 | Requirements | Product package approved; requirements approved |

## Revision Entries

### SR-001 — Requirements baseline (2026-10-23)

- Trigger: the PTM's delegation of autobyteus-278.
- Prior status: N/A. Current status: `Ready for Approval`.
- Open: DEC-801, DEC-802, DEC-804 (the user); then the Product Team.

### SR-002 — The user's decisions; Product Design requested (2026-10-23)

- The user's decisions:
  - DEC-801 (a): live output streams through this node's server;
  - DEC-802 (a): conversation only; files and terminal are FU-001;
  - DEC-806: a computer icon plus the node name on the remote row (his direction);
  - DEC-807: the first version is the normal path; failures only shown.
- REQ-804 and AC-804 are reduced to match.
- Open: DEC-804 (stop/terminate), for the UI review.
- Product Design requested from `/product_team` at the user's direction.

### SR-003 — Product package approved; requirements approved (2026-10-23)

- Trigger: Design Completed from the Product UI/UX Designer (`product_ui_ux_designer_47b42f1694e346c58988165bf7257699`). The UI/UX spec is `Approved` by the user, the Product ticket is closed, and the design repository is at `1cc5563`.
- Integrated:
  - REQ-801 gains "did the node answer" and Retry;
  - REQ-808 covers the opened view's offer (text-only composer, no ⚙/＋, panels on the other node, Activity/Team/Usage/Browser from the stream, local-only Delegated copies list);
  - DEC-804 (a), by the user's approval of the UI with Stop shown.
- Open for architecture: PA-805 (feasibility of the panels built from the streamed events), PA-808 (Team and Org delegators).
- Status: `Approved` (the user).
- No Product Task to close: the Solution Designer works on a delegated Task, so its delegation returned no Task ID.
