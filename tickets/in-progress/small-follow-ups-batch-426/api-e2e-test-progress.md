# API/E2E Test Progress — small-follow-ups-batch-426, round 1

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-07 22:14 | setup | Started | | server build + phone bundle build on `42a86a5e93` |
| 2026-11-07 22:20 | setup | Completed | Pass | both builds exit 0 (`dist/app.js`, `dist/public`) |
| 2026-11-07 22:19 | API-01 | Started |  | full `test:nuxt --run` on 42a86a5e93, background, log /tmp/426-API-01.log |
| 2026-11-07 22:25 | API-01 | Completed | Pass | 718 files, 5357 passed, 2 skipped |
| 2026-11-07 22:25 | API-04 | Started |  | mobile-shell probe, all cases, 42a86a5e93 + updated probe; out evidence/api-e2e/API-04-run1 |
| 2026-11-07 22:35 | API-04 | Checkpoint | Fail | run1: 17 Pass; MSP-18 Fail (navigation at start), MSP-13 Fail (revoked Check stays Connected: readHistory listsAnyRun guard); 6 unknown browser lines. Next: run2 diagnostics --cases=MSP-19,MSP-17,MSP-18,MSP-13 |
| 2026-11-07 22:42 | API-04 | Checkpoint | Fail | run2 (MSP-19,17,18,13): MSP-19, MSP-17 Pass; MSP-18 Fail (open phone Check while off stays Connected; check on opening shows off), MSP-13 Fail (same for revoked). Cause: useRunHistorySectionLoad.readHistory ok:true when runs listed. localhost:8000/health = FU-003. Probe restructured; next: run3 full probe |
| 2026-11-07 22:55 | API-04 | Completed | Fail | run3 full: 17 Pass; MSP-13 Fail (revoked: open phone Check stays Connected); MSP-18 Fail (off: open phone Check stays Connected; off then node down: Connected). Opening path passes. FU-003 lines known; 1 expected node-down line added to MSP-18 pattern |
| 2026-11-07 22:55 | API-02 | Started |  | B04 probe, 42a86a5e93 |
| 2026-11-07 22:57 | API-02 | Checkpoint | Fail | run1: B01-B08 all Pass incl. B04, probe Fail on fixture gap GetProjects (unhandled op, from 0fd2656528, not this ticket) -> baseline fix in probe fixture; rerun |
| 2026-11-07 22:58 | API-02 | Completed | Pass | run2 after fixture baseline fix: Pass, B01-B08 Pass, failures [] |
| 2026-11-07 22:58 | API-03 | Started |  | node-vocabulary probe, 42a86a5e93 |
| 2026-11-07 23:02 | API-03 | Checkpoint | Fail | run1: NVP-01 Pass, NVP-02 Fail: beta refuses the LAN window origin (REMOTE_ACCESS_ORIGIN_REFUSED, gate of autobyteus-403); NVP-05 never ran. Baseline fix: AUTOBYTEUS_ALLOWED_ORIGINS=<window origin>; rerun |
| 2026-11-07 23:05 | API-03 | Checkpoint | Fail | run2 (origin fix): NVP-01..04 Pass; NVP-05 card Pass (D-11 wait works), then the Memory page helper waits for a select the page shows only for >1 source (since 44ac4d3344) -> baseline fix; rerun |
| 2026-11-07 23:06 | API-03 | Completed | Pass | run3: NVP-01..05 Pass (after two probe baseline fixes: allowed origin; Memory one-source helper) |
| 2026-11-07 23:06 | API-06 | Started |  | temporary desktop journey, nuxt dev + test-owned node, 42a86a5e93 |
| 2026-11-07 23:09 | API-06 | Completed | Pass | missing + file: launch error shows the reason, not generic; nothing registered; relative refused in the form (pre-existing client check); existing folder launches |
| 2026-11-07 23:09 | API-05 | Started |  | full server E2E suite (pnpm test:e2e), clean env, 898fbd2a31 (server unchanged since 85d26ed1e8), background, log /tmp/426-API-05.log |
| 2026-11-07 23:22 | API-05 | Checkpoint | Fail | full run: 112 passed, 120 skipped (gated), 4 failed: project-task-boundaries API-AGG (stale vs D-08, updated) + 3 runtime files missing Brief Studio package (environment). Next: test:integration:prepare, rerun 4 files |
| 2026-11-07 23:24 | API-05 | Completed | Pass | full run 112 passed/120 skipped; 4 failed -> API-AGG updated to D-08 + Brief Studio package built; rerun 4/4 pass (29 tests) |
| 2026-11-07 23:24 | API-05b | Started |  | model-free gated E2E: 57 RUN_AGY_FAILURE_E2E files with the scripted AGY CLI, clean env, background, log /tmp/426-API-05b.log |
| 2026-11-08 00:00 | API-05b | Completed | Pass | 55 passed, 2 skipped (other gates); 2 files failed on stale notice text (autobyteus-320) -> baseline fix, rerun 2/2 pass |
| 2026-11-08 00:00 | API-07 | Started |  | emulator: assembleDebug from worktree, AVD autobyteus277_api35, hold stack |
| 2026-11-08 00:05 | API-07 | Completed | Pass | preview loads in place, frame opaque origin, AutoByteusShell undefined, sandbox allow-scripts; main-frame blob blocked by the app; foreign blob, file: refused; javascript: not a navigation (unit-tested policy); other origin external |
| 2026-11-08 00:05 | API-08 | Started |  | emulator process death on a Files screen |
| 2026-11-08 00:09 | API-08 | Completed | Fail | Android restore loads the saved URL (run B) and removed node -> start (run C) pass; user-visible: run B lands on the run list (web shell drops the run-screen URL, premise E-03), run A (share-started task) shows the expired pairing link (RR-02) |
| 2026-11-08 00:10 | API-09 | Started |  | docker buildx server-package (linux/arm64) of the worktree for a test-owned node container |
| 2026-11-08 00:30 | API-09 | Completed | Pass | View only: no Clipboard; Control: Paste -> desktop clipboard PHONE-TO-DESKTOP-426; Copy -> phone clipboard DESKTOP-TO-PHONE-426 ("Copied"); U-01 measured. Container, app, emulator removed |
| 2026-11-08 00:30 | API-11 | Started |  | fresh-start desktop build: clone --no-local of 903387bc78, install --frozen-lockfile, build:electron:mac -- --arm64, verify steps; background, log /tmp/426-API-11.log |
| 2026-11-08 00:38 | API-11 | Completed | Pass | install exit 0; build exit 0 (guards incl. guard:localization-boundary Passed, typecheck 0 production errors); prisma verify exit 0; terminal verify exit 0 incl. spawn probe; clone removed |
| 2026-11-08 00:39 | round-1 | Completed | Fail | result Fail (F-API-001 D-02, F-API-002 D-03), confidence 76%; handoff to code reviewer for failure-origin review |
