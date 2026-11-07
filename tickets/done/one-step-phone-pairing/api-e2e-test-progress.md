# API/E2E Test Progress — one-step-phone-pairing

- Execution coverage report: [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md)
- Planned cases: [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md) Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-07 | setup | Started |  | `docker buildx … --target server-package` → `/tmp/ospp-e2e/server-package` (background) |
| 2026-11-07 10:27 | setup | Completed | Pass | Server package at `/tmp/ospp-e2e/server-package` (buildx exit 0) |
| 2026-11-07 10:28 | API-06 | Started |  | MSP probe updated (setup, MSP-06, MSP-09); building server dist + mobile web, then `--cases=MSP-06,MSP-09` (background) |
| 2026-11-07 | API-06 | Checkpoint |  | MSP-06 Pass; MSP-09 running |
| 2026-11-07 | API-06 | Completed | Pass | MSP-06 Pass, MSP-09 Pass; cleanup receipt serversLeft 0, rootRemoved true; evidence API-06-* |
| 2026-11-07 | API-08 | Started |  | `pnpm --silent isolated-app start --build` (background) |
| 2026-11-07 | API-07 | Started |  | privileged test container `ospp-e2e-linux` with test interfaces |
| 2026-11-07 | API-07 | Completed | Pass | Linux facts as designed; evidence API-07-linux-network-facts.txt; container ospp-e2e-linux kept for API-10 |
| 2026-11-07 10:40 | API-11 | Started |  | Tailscale code shown in the main window; waiting past expiry |
| 2026-11-07 10:44 | API-11 | Checkpoint |  | first code discarded by a harness navigation of the main window (window order); restarted in the Docker node window (index 1); do not touch window 1 until expiry |
| 2026-11-07 10:49 | API-11 | Completed | Pass | "This code has expired" + New code; EXPIRED then INVALID; New code makes a fresh 5:00 code |
| 2026-11-07 10:49 | API-08 | Checkpoint |  | AC-001, AC-002 (same network), AC-006 text, AC-013 close/tab/consumed, RU-04, U-003 done; evidence to write |
| 2026-11-07 10:49 | API-09 | Checkpoint |  | Docker node ways + codes, loopback-only blocked done; phone pairing in API-12 |
| 2026-11-07 10:49 | API-10 | Checkpoint |  | remote LAN (own facts unreachable, 2.08 s), typed wrong/right, tunnelled nothing-checkable done |
| 2026-11-07 10:51 | API-05 | Started |  | fresh clone of 27b24037dd, empty GRADLE_USER_HOME, ./gradlew --no-daemon clean :app:assembleDebug (background) |
| 2026-11-07 10:54 | API-05 | Completed | Pass | BUILD SUCCESSFUL in 1m 22s from empty GRADLE_USER_HOME; APK permissions unchanged |
| 2026-11-07 10:55 | API-13 | Started |  | emulator autobyteus277_api35 with -camera-back virtualscene -virtualscene-poster wall=<live QR of the embedded node, Tailscale> (background) |
| 2026-11-07 11:05 | API-12 | Completed | Pass | share pairing of embedded node (tailscale) + Docker node (LAN+published port); names from QR; sheet; Switch node A->B; unreachable row; start screen with 2 nodes |
| 2026-11-07 11:05 | API-13 | Completed | Not Tested | virtual-scene poster not in the camera's view; the pose cannot be moved headless; scanner + camera permission shown |
| 2026-11-07 11:05 | API-14 | Completed | Pass | sandboxed frame: no object, parent blocked; blob preview blocked by existing containment (FU-005); same-origin subframe via parent object noted |
| 2026-11-07 11:05 | API-15 | Started |  | old node container (beta image, released server) + base APK; old pairing flow |
| 2026-11-07 11:11 | API-15 | Completed | Pass | pre-change phone + node upgraded in place: opens into run list, credential in use, legacy row revocable; locale defect found in phones list (API-17) |
| 2026-11-07 11:11 | API-18 | Started |  | AC-007: base (released) APK pairs with a new desktop QR |
| 2026-11-07 11:13 | API-18 | Completed | Pass | released app paired with a new QR (browser variant page, one tap) |
| 2026-11-07 11:13 | API-17 | Completed | Fail | phones list relative time/date in OS locale ('Last seen jetzt', 'Revoked 7. Nov.') in an English UI |
| 2026-11-07 11:16 | all | Completed | Fail | API-17 fail; others pass or Not Tested (API-13, API-16); cleanup done; reports written |
| 2026-11-07 11:25 | round 2 | Started |  | IR-002 (c113dae1a7, head 8ea55b1e6b): rerun API-17 in a fresh packaged build; other cases still valid (only ConnectedPhones.vue + its spec changed) |
| 2026-11-07 11:25 | API-17 | Started |  | isolated-app start --build (background) |
| 2026-11-07 11:37 | API-17 | Completed | Pass | round 2: English 'Last seen 3 minutes ago', 'Revoked Nov 7'; zh-CN '最近使用 3分钟前', '11月7日 已撤销'; instance stopped, data root removed |
| 2026-11-07 11:38 | round 2 | Completed | Pass | reports updated; API-REV-002 |
