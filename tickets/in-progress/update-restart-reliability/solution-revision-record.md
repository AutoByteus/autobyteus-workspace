# Solution Revision Record — update-restart-reliability (autobyteus-339)

## SR-001 — 2026-10-31 — FU-008 cause reproduced; requirements baseline (Ready for Approval)
- Trigger: Task autobyteus-339 from `/project_task_manager`: two leftovers of autobyteus-284 (FU-007, FU-008) that block
  the unattended update restart.
- Prior status: N/A. Current status: Ready for Approval (DEC-001 needs the user).
- Workspace: `codex/update-restart-reliability` from `origin/personal` @ `a977b2c1bc`.
- Evidence:
  - Server-level busy shutdown: 10/10 clean (P-001).
  - Desktop busy quit: **2 stalls in 78 valid runs** (P-002), both with one client connection that never sent a
    request. Fastify's close waits for it, so no run cleanup starts (P-003, deterministic).
  - FU-008's suspected Org stage is not involved.
  - The Docker in-place update already installs after a forced stop.
- IDs: BEH-001 to BEH-004, UC-001/002, SCN-001 to SCN-004, REQ-001 to REQ-003, AC-001 to AC-007.
- Decisions:
  - DEC-001 (FU-007, needs the user; recommended A);
  - DEC-002 (cut in-flight requests at shutdown), DEC-003 (no new interrupt bound), DEC-004 (all node servers): decided
    by the Solution Designer.
- Design: not started.

## SR-002 — 2026-10-31 — Requirements approved by the user
- Trigger: after the FU-008 findings and DEC-001's options, the user wrote: "Yeah, if you think your solution is
  reasonable, then let's do it. Congratulations as you found the root cause."
- Result: DEC-001 = A; REQ-001 to REQ-003 approved. DEC-005 (Solution Designer) narrows A's rare fallback: when the
  server exit is unconfirmed, keep today's error, because a new server cannot start in that state.
- Status: Approved.

## SR-003 — 2026-10-31 — Architecture design complete
- D1: one `SERVER_CLOSE_OPTIONS` (`forceCloseConnections: true`) for the four Fastify servers the node runs.
- D2: `ElectronApplication.prepareForInstall`: after a rejected stop, install when
  `BaseServerManager.isServerProcessGone()`, through `ApplicationShutdown.acceptIncompleteStopForInstall()`; otherwise
  rethrow (today's error).
- User approval of the design: Obtained (the same 2026-10-31 answer; this spec realizes the presented solution).
- Classification: Medium / High. Routing: architecture review.
- Follow-ups: FU-001 (install-on-quit), FU-002 (the origin of the unused connection).
