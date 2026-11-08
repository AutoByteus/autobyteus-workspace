# Handoff — Architecture Design Complete (round 2) — small-follow-ups-batch-426

- Package: `small-follow-ups-batch-426` (Project Task `autobyteus-426`), round 2
- From: Solution Designer (`solution_designer_46519d6c265f4b23825027f460f14c1b`), 2026-11-08
- Classification: `Architecture Design Complete`; `task_size = Medium`, `architectural_risk = High`
- Route (handoff rules): Large or High → `/software_engineering_team/architecture_reviewer`
- Current solution revision: `SR-011`

## Scope

- Item 9 (REQ-009, AC-009a…d): delegated rows of listed, active, not-open Agent runs follow their children's states on the history poll (desktop Runs view, Workspaces tree, phone run list), through a new states-only GraphQL read; a full view read only when children or the run's active state changed. Children on other nodes are out of scope.
- Item 20 (REQ-020, AC-020): a distinct `PEER_HOST_REFUSED` peer error and text.
- Item 21 (REQ-021, AC-021): token-statistics fixture independent of the day of the month.
- Item 22 (REQ-022, AC-022): MRP-02 runtime names (NVP-05 half done in round 1).
- Item 23 (REQ-023, AC-023): one `parseWebOrigin` (optional 416 CR-N1, included by DEC-015).
- Not in round 2: AC-004b, dropped by the user (DEC-013, SR-010).

## Approval basis

Round-2 requirements approved by the Solution Designer within the direction (Task items and comments), the user informed; DEC-013 is the user's own decision. No Product supplement; item 20's text is DEC-014.

## Why High

A new GraphQL read contract on the 5 s history poll of three surfaces (incl. the phone), and a new update rule in the collaboration store (states applied outside a view publication, with explicit re-read rules).

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426`, branch `codex/small-follow-ups-batch-426`, at `origin/personal` `d785ded109` (round 1 merged; 412 and 416 included). Round-2 ticket documents are not yet committed.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/`

## Documents

`requirements-doc.md` § Round 2 Requirements; `investigation-notes.md` § Round 2 Investigation; `design-spec.md` § Round 2 Design; `solution-revision-record.md` (SR-009…SR-011); `follow-ups.md`.

## Open risks

- The status read's real size is estimated (≈150 B per child); AC-009a measures it.
- D-21: where the app reads the clock for "This month" decides how the probe fixes `now` (implementation checks first).

## Route

- 2026-11-08: sent to `/software_engineering_team/architecture_reviewer`.

## Revision SR-012 (ARCH-REV-006)

- AR-004 → REQ-020/AC-020 narrowed to add peer and change address; `nodeIdentityProbe` unchanged; DEC-017; FU-004.
- AR-005 → D-09 apply rules (currency, active state, child set, apply), one refresh in flight, one status shape.
- 2026-11-08: sent back to `/software_engineering_team/architecture_reviewer` for the focused re-review.

## Revision SR-013 (ARCH-REV-007 AR-006)

- AC-020 forms: `addPeerNode` (server E2E); Nodes page change address and connect-resolution. Typed add at a refused name → DEC-017 / FU-004.
- 2026-11-08: sent to `/software_engineering_team/architecture_reviewer` for the AC-020 re-check.

- 2026-11-08: ARCH-REV-008 Pass on SR-013 (round 2); the reviewer routed round 2 to `/software_engineering_team/implementation_engineer` (informational, no forwarding).

## Revision SR-014 (D-21, from implementation)

- The server recomputes and enforces the presets from its own clock (E-21b), so the probe shifts its own server's clock (test-only preload, running, not frozen) and the browser's to the chosen day; seed `now` the same.
- 2026-11-08: sent to `/software_engineering_team/architecture_reviewer` for a D-21 re-check.

- 2026-11-08: ARCH-REV-009 Pass on SR-014 (D-21); routed to implementation by the reviewer (informational).
