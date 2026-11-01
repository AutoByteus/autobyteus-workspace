# Solution Revision Record — automatic-app-node-updates (autobyteus-356)

## SR-001 — 2026-11-01 — Requirements draft
- Trigger: Task autobyteus-356. Facts F-01..F-06 (Read). DEC-001..003 need the user.

## SR-002 — 2026-11-01 — Requirements approved; design
- Trigger: the user's answer to DEC-001: "once its downloaded then its intall immediately not 30 minutes please" (A).
  The earlier draft's default B (30 minutes idle) is withdrawn.
- Requirements: Approved. REQ-002 installs at once after the download; REQ-004 adds one automatic install per version
  (restart-loop bound); AC-001..006 added; Scope Guardrail written.
- Evidence: F-07..F-12 (architecture reads).
- Design: `design-spec.md` (DS-001 automatic download, DS-002 immediate install and start-time outcome, DS-003
  desktop-driven node update). Medium / High → architecture review.
