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

## SR-003 — 2026-11-01 — Architecture review ARCH-REV-001
- Trigger: ARCH-REV-001 Fail (Design Impact): AR-001 (a native install failure in the same process went undetected;
  the app stayed without its server and V was retried at every check) and AR-002 (`automatic` was written before
  the install request was accepted). Notes N-1..N-5.
- Requirements: unchanged. AR-001's fix *serves* REQ-004 ("a failed install leaves the old version running"), and
  that requirement already holds the user's own words for this case (2026-11-01: "of course if install fails, the old
  version keeps running right?"). No renewed approval needed.
- Design: DS-002 adds the in-process gate (`installRequestedVersion`), failure detection (catch, `error` during
  install, 60 s quit bound), recovery by `ElectronApplication` (relaunch only when the server is stopped or gone),
  `automatic` written only on `accepted: true`, and the staged-but-moved-on switch-on path. DS-003: follows run per
  node (N-4). Residual risks N-1..N-3 and N-5 are stated. FU-003 is added.

## SR-004 — 2026-11-02 — Failure-origin review CRR-004 (F-API-003, CR-C12)
- Trigger: on a busy Mac the 60 s quit bound failed a good automatic install (API-02D), because the bound also measured
  Squirrel's fetch, unpack and verify. The design assumed the quit follows `quitAndInstall` promptly. Design Impact,
  verified against `MacUpdater.js` and the log (F-13, F-14).
- Decision: **direction A.** The automatic path waits for the native `update-downloaded` before stopping anything, with
  its own 15-minute bound. Not B (keeps the server outage and needs a second bound), not C (only moves the threshold).
  It also removes O-4, and a native refusal now disturbs nothing, which shrinks FU-003.
- Requirements: sharpened by the Solution Designer within the direction, with the user informed. DEC-001's meaning was
  "no 30-minute wait, no idle wait", and the macOS step adds neither; it is the time to finish preparing the update.
- CR-C12: plain automatic reasons, no raw text, no "Try again" for a blocked version. CR-C13 (O-3): held for evidence.
- FU-005 added: the click keeps today's order (preserved scope).
