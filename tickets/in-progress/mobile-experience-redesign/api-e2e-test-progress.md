# API/E2E Test Progress — mobile-experience-redesign (autobyteus-277)

My progress log while tests run. Read it first when picking the run back up. Rows are only added.

- Execution coverage report: [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md)
- Planned cases: [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md) "Planned Cases" (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-06 10:20 | setup | Completed | Pass | `pnpm -C autobyteus-server-ts build` exit 0 (`evidence/api-e2e/server-build.log`); `pnpm -C autobyteus-web build:mobile-web` exit 0 (`evidence/api-e2e/mobile-web-build.log`). Next: write `tests/e2e/mobile-shell-probe.mjs` |
| 2026-11-06 10:45 | MSP-* | Checkpoint | — | Probe written (`autobyteus-web/tests/e2e/mobile-shell-probe.mjs`). Exploration runs (`--hold`) and dev run 1 (`/tmp/msp-dev-1`): harness fixes needed; candidate defects found: (1) Org run row tap goes opening → none → list (Org member row works); (2) send to a task agent / remote run fails in an insecure context: `crypto.randomUUID is not a function` (shared stores, pre-ticket code); (3) the reference viewer adds the shared viewer's header with 28×28 controls (VIS-011 has none); (4) Files path crumb 41px wide; (5) a member's delegated task agent sits beside the member (shared desktop lift rule) where VIS-002 nests it. Revoked device = 403 (rule covers 401 only, as at base). Pre-existing: definitions feed WebSocket to localhost:8000 (FU-002 to record) |
| 2026-11-06 10:55 | MSP-* | Started | — | Dev run 2, `/tmp/msp-dev-2` (per-kind results, secure-context control, desktop comparison, 401 via unknown credential) |
| 2026-11-06 11:40 | MSP-* | Checkpoint | — | Dev runs 2–3 (/tmp/msp-dev-2, /tmp/msp-dev-3): harness settled; controls prove the send cause (secure-context control reaches the node). Next: evidence run `evidence/api-e2e/MSP-run-1` |
| 2026-11-06 11:41 | MSP-01…14 | Started | — | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=…/evidence/api-e2e/MSP-run-1` |
| 2026-11-06 12:05 | MSP-01…14 | Completed | Fail | Evidence run `evidence/api-e2e/MSP-run-1`: Pass MSP-01, 04, 05, 07, 08, 10, 12, 13, 14; Fail MSP-03 (Org run row does not open; sends to task agent, task-team member, Org member fail: `crypto.randomUUID`), MSP-06 (remote send, same cause), MSP-09 (unpair confirmation under the sheet), MSP-11 (reference viewer 28×28 controls; path crumb 41px). MSP-02 there failed on a harness check (replaced) |
| 2026-11-06 12:25 | MSP-02 | Completed | Fail | `evidence/api-e2e/MSP-run-2-MSP-02`: live state with the root open passes (idle → offline); fails: a member's delegated task agent sits beside the member (desktop shows the same), delegated rows have no Task line (desktop shows it). Observed: a root not opened keeps a stopped child's old state |
| 2026-11-06 12:26 | API-05, DSK-02 | Started | — | fresh-run-auto-approval; desktop fixture probes (sequential) |
| 2026-11-06 12:50 | API-05 | Completed | Fail | B08 (this ticket's phone case) Pass; B04 fails on a pre-existing cause (seeded members count as customized; FU-005). DSK-02 fixture probes: all 4 Pass |
| 2026-11-06 12:52 | ADR-* | Started | — | Building the debug APK (autobyteus-android :app:assembleDebug) |
| 2026-11-06 11:40 | — | Checkpoint | — | Note: the times of the rows above were written from an estimate and run about an hour ahead of the clock; from here rows use `date`. APK built (`evidence/api-e2e/ADR-apk-build.log`, exit 0); emulator `autobyteus277_api35` booted (Android 15). Starting the held stack for ADR-01…04 |
| 2026-11-06 11:50 | ADR-01…05 | Started | — | Evidence run `evidence/api-e2e/ADR-run-1` (emulator autobyteus277_api35, held stack /tmp/msp-hold-adr) |
| 2026-11-06 11:53 | ADR-01…05 | Completed | Fail | `evidence/api-e2e/ADR-run-1`: ADR-01, 02, 04 Pass; ADR-03 Fail (unpair confirmation under the sheet, real tap leaves the phone on the list); ADR-05 Fail (top bar under Android 15's status bar: 25 CSS px of the 48 px controls) |
| 2026-11-06 11:53 | IOS-02 | Started | — | WebKit 26.0 (private PLAYWRIGHT_BROWSERS_PATH), iPhone 13 profile, held stack |
| 2026-11-06 11:55 | IOS-01, IOS-02 | Completed | Pass | IOS-02 `evidence/api-e2e/IOS-run-1/ios-webkit-journey.json` Pass (WebKit 26.0, every screen); IOS-01 iOS 26.1 Safari renders /mobile (unpaired, notice). Held stack, emulator and simulator stopped |
| 2026-11-06 11:56 | DSK-01, DSK-03, UPD-* | Started | — | Sequential: remote-runs-in-tree; task-closure BR-001; node-vocabulary; delegated-launch-defaults LRL-004,WVC-004; owner-scoped seed (30 unrelated) + B-006,B-007 |
| 2026-11-06 12:10 | DSK-01, DSK-03, UPD-* | Completed | Pass | DSK-01, DSK-03, UPD-LRL-004, UPD-OSR (B-006, B-007), UPD-NVP (NVP-04) Pass; NVP-05 fails out of scope (FU-006); WVC-004 failed on my recorder, fixed, rerun Pass (`UPD-WVC`) |
| 2026-11-06 12:10 | API-04 | Completed | Pass | typecheck and guards on the final tree |
| 2026-11-06 12:10 | round 1 | Completed | Fail | Report and revision record written; next: commit, then failure-origin review by the code reviewer |
| 2026-11-06 15:22 | round 2 | Started | — | Trigger CRR-005 Pass, code `400457d5f7`. Rebuilding the phone bundle (web changed) and the APK (Android shell changed); server dist still valid (no server change since round 1) |
| 2026-11-06 15:23 | MSP-01…14 | Started | — | Round 2 run `round-2/MSP-run-3` (bundle rebuilt, exit 0) |
| 2026-11-06 15:37 | — | Checkpoint | — | At the user's direction: the phone rule is not added to TESTING.md (project-wide rules only); TESTING.md trimmed of one-suite details (own commit). MSP-run-3: all Pass but MSP-03 task-team member read-back; next: rerun MSP-03 with the Team member projection read |
| 2026-11-06 15:43 | MSP-03 | Completed | Pass | `round-2/MSP-run-4-MSP-03` (probe's reviewer lookup fixed: the address is /docs_review_team/reviewer). Next: APK, emulators |
| 2026-11-06 15:44 | ADR-01…07 | Started | — | API 35 emulator, `round-2/ADR-run-2-api35` |
| 2026-11-06 16:14 | ADR-* | Completed | Fail | API 35 `round-2/ADR-run-2-api35`: ADR-01…06 Pass (03 unpair, 05 centre tap and bars, 06 send over HTTP); ADR-07 Fail: no double padding, but the conversation container is scrolled (scrollTop 330) so the composer sits 929 px above the keyboard. API 34 `round-2/ADR-run-3-api34`: ADR-01 Pass; ADR-07 same (scrollTop 327, gap 921; control scrollTop 0 → gap 62). One API 34 attempt lost to the emulator's own system restart (no app crash) |
| 2026-11-06 16:14 | IOS-02 | Completed | Pass | `round-2/IOS-run-2` |
| 2026-11-06 16:14 | DSK-01…03, UPD-LRL-004 | Started | — | Round 2 desktop regression (sequential) |
| 2026-11-06 16:19 | DSK-01…03, UPD-LRL-004 | Completed | Pass | round-2 folders; secrets sweep clean |
| 2026-11-06 16:21 | round 2 | Completed | Fail | F-10 (keyboard); everything else Pass or still valid. Report and revision record written; next: commit, failure-origin review |
| 2026-11-06 16:37 | round 3 | Started | — | Trigger CRR-007, code `e3dd8c4677` (MobileRunTargetView overflow-clip). Rebuilding the phone bundle |
| 2026-11-06 16:37 | MSP-03, MSP-05, MSP-11 | Started | — | `round-3/MSP-run-5` |
| 2026-11-06 16:39 | MSP-03, MSP-05, MSP-11 | Completed | Pass | `round-3/MSP-run-5` |
| 2026-11-06 16:40 | ADR-01,05,06,07,08 | Started | — | API 35, `round-3/ADR-run-4-api35` |
| 2026-11-06 16:41 | ADR-01,05,06,07,08 | Completed | Pass | API 35 `round-3/ADR-run-4-api35` (ADR-07: scrollTop 0, gap 62; ADR-08 key collision in the script fixed, values in the JSON) |
| 2026-11-06 16:42 | ADR-01,07,08 | Started | — | API 34, `round-3/ADR-run-5-api34` |
| 2026-11-06 16:43 | ADR-01,07,08 | Completed | Pass | API 34 `round-3/ADR-run-5-api34` (scrollTop 0, gap 62). Emulator and held stack stopped; secrets sweep clean |
| 2026-11-06 16:44 | round 3 | Completed | Pass | Report, investigation and revision record (API-REV-003) written; next: commit, test-code review |
| 2026-11-06 17:00 | round 4 | Started | — | Trigger CRR-009 (merge `ed20da1cd1`, HEAD `dc1c959ccc`). Contracts and server changed in the merge: everything Rerun; rebuilding server and phone bundle; fresh-start build proof required (ticket changes autobyteus-web/package.json, typecheck-baseline.json) |
| 2026-11-06 17:01 | MSP-01…15 | Started | — | `round-4/MSP-run-6` (server and bundle rebuilt, exit 0) |
| 2026-11-06 17:07 | MSP-01…15 | Completed | Pass | `round-4/MSP-run-6` |
| 2026-11-06 17:08 | ADR-01…08 | Started | — | API 35, `round-4/ADR-run-6-api35` (APK up to date) |
| 2026-11-06 17:10 | ADR-01…08 | Completed | Pass | API 35 `round-4/ADR-run-6-api35` |
| 2026-11-06 17:11 | ADR-01,07,08 | Started | — | API 34, `round-4/ADR-run-7-api34` |
| 2026-11-06 17:13 | ADR-01,07,08 (API 34), IOS-02 | Completed | Pass | `round-4/ADR-run-7-api34`, `round-4/IOS-run-3` |
| 2026-11-06 17:13 | DSK-01…03, UPD-* | Started | — | Round 4 sequential |
| 2026-11-06 17:21 | DSK-01…03, UPD-* | Completed | Pass | DSK-01…03, UPD-LRL-004, UPD-WVC-004, UPD-OSR, NVP-04 Pass; NVP-05 Fail out of scope, same cause as FU-006 (frontend.log:50 ECONNRESET, dev server restart :72) |
| 2026-11-06 17:21 | FSB | Started | — | Fresh-start build of `54e2eb4d07` (clone, frozen install, macOS ARM64 job) |
| 2026-11-06 17:31 | FSB | Completed | Pass | `round-4/FSB` (frozen install, mac ARM64 build, Prisma and terminal verification; clone removed) |
| 2026-11-06 17:31 | round 4 | Completed | Pass | Reports updated (API-REV-004); next: commit, test-code review of MSP-15 |
