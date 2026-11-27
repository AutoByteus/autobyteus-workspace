# IMP-004 — AC-001: a real Team stream gap recovers by itself, desktop and phone

- Date: 2026-11-27. The gap is made by `autobyteus-web/tests/e2e/fixtures/team-stream-gap.mjs`:
  - another window (a client of the node, not through the page's wire) sends the Team's lead `PLAIN <marker>`, which the
    scripted Antigravity runtime answers at once;
  - the page's wire (`withholdBeforeTeamIdle`) withholds the numbered Team frame right before the lead's idle status;
  - so the page sees the idle status past a gap when the Team has finished.

  No reselect, no click: the probe only waits and reads.
- What is measured:
  - the time from the withheld frame to the snapshot of the page's new Team stream link (the replacement);
  - the page console's gap line and recovery-failure lines;
  - the screen afterwards (status, the message, notices);
  - a message the user sends right after.

| Surface | Probe | Base (`80420a8bf6` web code) | This branch |
| --- | --- | --- | --- |
| Desktop | `send-delivery-probe.mjs --cases …,SDD-14` (the IMP-005 runs and the SDD-14,SDD-15 runs) | **Fail**: no replacement Team stream (timed out); the view waits for a reselect | **Pass** (4 runs): withheld `TURN_COMPLETED` (seq 34); gap seen; replacement snapshot **45, 54, 39 and 44 ms** after the gap; **0 failed attempts**; lead Idle, the message shown, no notice; the next send on the replacement link and answered |
| Phone | `mobile-shell-probe.mjs --cases=MSP-119` (`mobile-team-stream-recovery-cases.mjs`) | **Fail** (bundle built from the base web code): "Timed out waiting for the page's replacement Team stream snapshot" | **Pass** (2 runs): withheld `TURN_COMPLETED` (seq 34); gap seen; replacement snapshot **27 and 38 ms** after the gap; 0 failed attempts; subtitle "Idle · in Delivery Team", the message shown, no recovery notice, no not-delivered notice; the next send on the replacement link (link 11) and answered |

- Screenshots after recovery: `IMP-004-SDD-14-desktop-recovered.png`, `IMP-004-MSP-119-phone-recovered.png`. They show
  only probe-made data.
- Phone base run: the base's web production files (the IMP-001 list) were swapped in for `pnpm build:mobile-web`, then
  restored (0 dirty files after). MSP-119 ran on that bundle, and the bundle was rebuilt from this branch afterwards.
- Every stack was the probe's own: temp data roots, two nodes for the phone (alpha and beta). All were removed:
  `rootRemoved: true`, `serversLeft: 0`, `dataRootRemoved: true`. There were 0 browser errors in every run.
- Limit: the gap is made when the Team has finished. A gap in the middle of a turn recovers at the first attempt after the
  turn ends: the verified read refuses while the Team works (`TEAM_STREAM_RECOVERY_WAIT`, unchanged), which the web spec
  covers as a failed attempt that is retried.
