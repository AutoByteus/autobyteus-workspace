# Solution Revision Record — atomic-agent-run-creation (autobyteus-349)

## SR-001 — 2026-10-31 — Requirements baseline (Ready for Approval)
- Trigger: Task autobyteus-349 (339 FU-004, FU-003).
- Prior status: N/A. Current: Ready for Approval; DEC-001 (which never-started runs startup removes) needs the user.
- Evidence: F-01 to F-09 (Read). IDs: BEH-001 to BEH-003, REQ-001 to REQ-003, AC-001 to AC-005, DEC-001, DEC-002.
- Design: not started.

## SR-002 — 2026-10-31 — Requirements approved by the user, after a read-only count of his data
- The count (read-only) found 17 never-started records: 6 truly empty, and 11 May conversations without a start date.
  So the brief's "enforce the expiry" as coded would have deleted real conversations. The requirement was challenged and
  revised: remove only content-free never-started runs, and drop the 24 h rule.
- The user: "Yeah, go ahead, thanks for your recommendation." DEC-001 = A with the content check. REQ-001 to REQ-003
  approved.

## SR-003 — 2026-10-31 — Architecture design complete
- D1: `createAgentRun` cancels its prepared run on an activation error and rethrows.
- D2: `removeEmptyNeverStartedRuns` (content check) replaces `cleanupStalePreparedRuns`; one startup stage before
  `listen`.
- User approval of the design: Obtained.
- Classification: Small / High (persisted user data deleted at startup). Routing: architecture review.
- Follow-ups: FU-001 to FU-003.
