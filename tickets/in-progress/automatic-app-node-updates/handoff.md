# Handoff — automatic-app-node-updates (autobyteus-356) → architecture review

- From: Solution Designer, 2026-11-01. Task `autobyteus-356`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`,
  requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates`, branch
  `codex/automatic-app-node-updates`, base `origin/personal` @ `3b9dc912a1`. Target `personal`.
- Package (all in `tickets/in-progress/automatic-app-node-updates/`): `requirements-doc.md` (Approved, SR-002; DEC-001
  by the user), `investigation-notes.md` (F-01..F-12), `design-spec.md` (Ready), `solution-revision-record.md`,
  `follow-ups.md`.
- Classification: Medium / **High** (unattended app restart; unattended remote node updates; two desktop records
  extended).
- Please check especially:
  1. the gates against loops: `blocksAutomatic` (one automatic install per version) and one node attempt per version;
  2. the start-time reconcile that detects an operating-system install failure (DS-002);
  3. no downgrade, from the `relation === 'newer'` check and `allowDowngrade = false`;
  4. that REQ-006 holds: both switches are desktop-only;
  5. the persisted-data decision (`Directly Usable — No Migration`).
- Constraints for later stages: off by default; test data only; live Codex tests use `gpt-6.1-terra` (effort medium);
  prove from a clean clone; no "the user has verified" in Done-when; release only on the user's word.

## Revision SR-003 (for ARCH-REV-002), 2026-11-01, commit after `7469fb6f98`
- AR-001: DS-002 now has the in-process gate `installRequestedVersion`. An install failure is detected by the catch,
  by `error` while `activeOperation === 'install'`, or by no `before-quit` within 60 s. It is recorded as
  `install`, never `download`. The recovery hook `recoverAfterFailedInstall` belongs to `ElectronApplication`: it
  calls `app.relaunch()` and then `app.exit(0)` only when the server is stopped or gone; otherwise there is no
  relaunch (the 284 rule). The reconcile also accepts a late install-on-quit as `AUTO_UPDATED`. Tests are listed in
  Validation Guidance.
- AR-002: `automatic` is written only on `accepted: true`. Switching on with `updateStaged` while the status moved
  on goes through `startAutomatic(V)`, so the cached download re-emits `update-downloaded`. A test must prove that
  re-emit; if it does not hold, the escalation trigger applies.
- N-1..N-5 are stated in Tradeoffs And Risks; N-4 is fixed (a timer per node follow). FU-003 is added. Requirements
  are unchanged; the user confirmed REQ-004's meaning in his own words.

## Revision SR-004 (for architecture re-review), 2026-11-02
- Trigger: CRR-004 F-API-003 and CR-C12 (`code-review-report.md`, round 4).
- DS-002: `AppUpdateInstallReadiness`, `installWhenReady(V)`, native `update-downloaded` before any stop on macOS, a
  15-minute bound with no recovery (nothing stopped), a native error during the wait counted as `install` before
  `activeOperation`, plain reasons. Quit bound stays 60 s and now measures only the quit.
- Please check especially: the readiness reset on every electron-updater `update-downloaded` (F-13 ordering), the cached
  path's unknown (F-15, must be run), a click, a manual check or the switch during the wait, and the late download
  rejection.
- After implementation, API/E2E re-runs: API-02D's load, API-02B, API-05C, and the staged path.

## Revision SR-005 (for ARCH-REV-004), 2026-11-02
AR-003..AR-006, N-9..N-12 are resolved in DS-002 ("A native error during the wait", "A click during the wait"), the file
map, Tradeoffs and Validation Guidance. F-13 is corrected. Requirements are unchanged since SR-004.

## Revision SR-006 (for ARCH-REV-005), 2026-11-02
AR-007: no check runs during the wait (DS-002 "No check runs during the wait"), instead of classifying by the check in
flight. Please check this claim: every updater `error` during a wait is now the native refusal or the zip serve failure,
and status stays `downloaded` until an Install click or the wait's end. N-13 and N-16 are in. Requirements unchanged.
