# Handoff Summary — runtime-stop-cleanup-and-org-recovery

## Status

- Delivery state: **Awaiting explicit user verification.** Nothing has been pushed, merged or released.
- Classification: `task_size=Medium`, `architectural_risk=High`. Route: reviewed.
- Gates passed:
  - SR-004 (user-approved)
  - ARCH-REV-003 Pass
  - IR-002
  - CRR-003 Pass (source review, 9.3/10)
  - API-REV-002 Pass (95%)
  - CRR-004 Pass (test-code review)
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery`
- Ticket branch: `codex/runtime-stop-cleanup-and-org-recovery`
- Finalization target: `origin/personal`
- Integrated base: `origin/personal@c84b57739` (1.4.91-beta.6).
  - Delivery checkpoint `292948501`, then merge `c9d8abdf3`. The merge was clean.
  - The 13 new base commits (isolated-app/Electron work and the beta.6 bump) do not touch `autobyteus-server-ts/src` or `autobyteus-server-ts/tests`.
- Uncommitted delivery edits, committed at finalization:
  - docs formatting fix
  - N-T3 comment fix
  - delivery artifacts

## What Changed

**A. AGY background cleanup (F-API-001 follow-up)**
- Whenever AutoByteus stops a live AGY process, `AgyStreamProcess.stop()` first stops AGY's background process groups: SIGTERM, then SIGKILL 1.5 s later. This covers user Stop, run/Team/Org Terminate, app/server shutdown and stream failure.
- New private helper: `agy-background-process-groups.ts`. It selects only groups led by AGY descendants.
- A normal turn end still leaves daemons running.

**B. Org/Team recovery with dead members**
- Terminate succeeds when a member's runtime already died.
- Failed stop attempts are not cached, so a retry re-runs them.
- Restore of a registered-but-inactive root completes termination first, and otherwise reports `AGENT_ORG_STOP_INCOMPLETE` / `TEAM_RUN_STOP_INCOMPLETE` instead of "already active".
- A message to a crashed member re-activates it in `restore` mode, so it continues its provider conversation.

**Docs:** `antigravity_cli_runtime.md`, `agent_team_execution.md`, `agent_orgs.md`.

**Tests:**
- Unit tests for the planner, handle, process groups, stream process, Org/Team self-heal, termination and routing.
- New opt-in live suite `agy-runtime-stop-recovery-live.e2e.test.ts` (`RUN_AGY_RECOVERY_E2E=1`).
- Updated `agy-background-task-live.e2e.test.ts`.

## Validation Evidence

- API-REV-002 (95%), live with real AGY 1.2.12:
  - AC-A1..A3: Stop, Terminate, Team/Org Terminate and graceful shutdown each closed the daemon within about 1 ms.
  - AC-B1..B4 and R-7: crash → Terminate → restore → resume; crashed-member continuation.
  - DEC-004: standalone Team, including the Terminate/restore race.
  - A Linux helper probe covered the Linux clause of REQ-A1.
- Delivery post-integration checks on `c9d8abdf3` (2026-09-29):
  - Unit folders `agent-collaboration`, `agent-execution/backends/antigravity`, `agent-org-execution` and `agent-team-execution`: 407 passed, 5 skipped, 12 failed. The 12 failures are exactly the known pre-existing ones in `team-run-model-selection-save` and `agent-org-run-config`. They are identical at the base, and the base changed no server code.
  - `tsc --noEmit`: 0 errors, excluding the pre-existing TS6059.
  - Fake-transport AGY e2e: 8 of 8 passed.

## Please Verify

In your app or dev server, built from this worktree:
1. **AGY Stop cleanup:** ask an AGY agent to start a dev server (for example on a free port). After the turn ends, confirm the server still runs. Then press Stop or Terminate the run, and confirm that the port is free and nothing is left running.
2. **Org recovery:** in an Agent Org with AGY members, kill one member's AGY process, for example `kill -9 <pid>`. Then:
   - Send that member a message. It should resume and remember earlier context.
   - Terminate the Org. It should succeed.
   - Send a message. The Org should restore with its history.
3. Optionally, quit the app while an AGY dev server runs, and confirm the port is freed.

Reply with explicit verification, for example "verified", and say whether you want a release (for example the next `1.4.91-beta.*`). By default, no release is cut.

## Residual Risks

These are all documented and non-blocking:
- **DEC-001:** if AGY crashes on its own, its background groups are orphaned and are not cleaned up.
- **DEC-002:** commands that detach themselves (`setsid`, Docker, services) are not found.
- **DEC-003:** Windows keeps AGY-only stop.
- A daemon that ignores SIGTERM can outlive an app quit, because the SIGKILL timer may not run. A hard-killed app leaves everything running.
- **CR-C1:** a one-time `*_STOP_INCOMPLETE` in a live-member finish-failure self-heal case. A retry succeeds.
- **R-6:** a latched fence.
- A second Terminate on an already-stopped root returns `success:false` "…not found." and changes nothing. This is SR-004 option (b).
- The live suites are opt-in, used a single model, and ran only on macOS. Linux is proven at the helper level only.
- 12 pre-existing unrelated unit failures (see above).

## Artifacts

In `tickets/in-progress/runtime-stop-cleanup-and-org-recovery/`:
- Solution: `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `handoff-architecture-design-complete.md`, `predecessor-delivery-receipt-verification.md`
- Architecture review: `design-review-report.md`, `architecture-review-revision-record.md`
- Implementation: `implementation-handoff.md`, `implementation-revision-record.md`
- Code review: `code-review-report.md`, `code-review-revision-record.md`, `api-e2e-test-review-report.md`
- API/E2E: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`, `evidence/`, `probes/`
- Delivery: `docs-sync-report.md`, `release-notes.md`, `release-deployment-report.md`, `delivery-revision-record.md`, and this `handoff-summary.md`
