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
