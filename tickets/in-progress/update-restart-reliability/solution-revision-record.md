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
- 2026-10-31, review result recorded: **ARCH-REV-001 Pass** on SR-003. The two Low wording items were folded in without
  a design change: AR-001 (`fu-007-options.md` says "server process confirmed gone", as REQ-002 does) and AR-002 (the
  in-flight-handler line under the design's Risks). The reviewer routed to
  `/software_engineering_team/implementation_engineer`. Report: `design-review-report.md`.

## SR-004 — 2026-10-31 — D1 revised for CRR-002 / F-API-001 (Design Impact)
- Trigger: CRR-002 (`/software_engineering_team/code_reviewer`), failure-origin review of API-REV-001 F-API-001: Fail,
  Design Impact, with a requirements part.
  - SR-003's `forceCloseConnections` cut `createAgentRun` requests in progress.
  - API-02/02B left 1 and 3 prepared-only runs, plus completed runs whose client never got the ID.
  - The base build (API-03) completed the same requests.
- Evidence added: P-004 (`evidence/P-004-grace-drain-close.probe.mjs` + `.log`). With Fastify defaults plus one
  `preClose` step (destroy never-used connections; drain requests in progress within a grace; then close the rest), the
  close takes 281 ms and the in-flight response is delivered; a request outlasting a 500 ms grace is cut at 502 ms.
- Requirements, revised within the direction by the Solution Designer (the user is informed in the routing message):
  - REQ-001 now reads "never waits on a client beyond a short grace (2 s)";
  - DEC-002 revised to option (c) from CRR-002, with the reasoning recorded;
  - AC-002 now requires every in-flight create to be answered, and no prepared-only or unacknowledged run;
  - AC-008 added (deterministic, from P-004).
- Design: D1 replaced by `installClientConnectionClose(app)` in `src/shutdown/client-connection-close.ts` for the four
  servers; `SERVER_CLOSE_OPTIONS` and its test removed. D2 unchanged.
- Follow-ups:
  - FU-004 added (`createAgentRun` is not atomic on a failed activation; pre-existing);
  - FU-003 (from the code reviewer) stays.
- Design case: added to `docs/design-cases.md` Case 5.
- Classification: Medium / High (unchanged). Routing: `/architecture_reviewer` (ARCH-REV-002), then implementation.
