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

## SR-004 — 2026-10-31 — Design revision for ARCH-REV-001 (Fail, Design Impact)
- AR-001 (Low): Task Design Health Assessment and the behavior-to-spine map added.
- AR-002 (Medium): the content walk is no-follow (`withFileTypes`/`lstat`); any entry other than directories and the
  top-level regular `run_metadata.json` counts as content; any walk error keeps the run and logs it. Tests added
  (unreadable subfolder or injected `readdir` failure; symlink).
- N-2 recorded as FU-004. Design case: `docs/design-cases.md` Case 4. Requirements unchanged (SR-002). Classification Small / High. Routing: ARCH-REV-002.
- 2026-10-31, review result recorded: **ARCH-REV-002 Pass** on SR-004 (approval SR-002). AR-001 and AR-002 resolved. The reviewer routed to `/software_engineering_team/implementation_engineer`. Report: `design-review-report.md`.

## SR-005 — 2026-10-31 — Requirement Gap from CRR-002 (F-API-001) decided by the user
- Trigger: CRR-002 (`/software_engineering_team/code_reviewer`), failure-origin review of API-REV-001: Fail,
  Requirement Gap. After a SIGKILL during activation, the leftover run holds the system-instruction trace (and
  sometimes a stale record `.tmp`), so REQ-002's strict content check keeps it and AC-004 failed for a hard kill.
- The user asked for the recommendation and left it to it ("what is your suggestion … I think you have good reasoning
  skill"). Recorded as DEC-003 = C: accept the hard-kill residual; AC-004 now covers a normal stop. Follow-up FU-005
  carries option (b), the root fix.
- Requirements: AC-004 narrowed; REQ-001 to REQ-003 unchanged. Design: unchanged (D1, D2 and the strict rule stay).
  Code: unchanged.
- Everything else passed in API-REV-001: AC-001, AC-003 on a real startup, AC-005, 284's E2E, AC-004 with a graceful
  stop.
- Classification Small / High (unchanged).
- Routing: back to the code reviewer, who returned the gap, for its round with the decided requirement. No handoff rule
  covers "requirements narrowed, design unchanged".
