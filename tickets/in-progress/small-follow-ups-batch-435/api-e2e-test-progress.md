# API/E2E Test Progress — small-follow-ups-batch-435

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-10 07:56Z | API-02 | Started | — | fresh clone of d37397b40d in /private/tmp/abx435-api/fresh-clone; log /private/tmp/abx435-api/API-02-fresh-start-build.txt (background) |
| 2026-11-10 08:04Z | API-02 | Completed | Pass | install exit 0, build exit 0, `[typecheck] PASS`, PRISMA exit 0, TERMINAL exit 0; app at /private/tmp/abx435-api/fresh-clone/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app |
| 2026-11-10 08:06Z | API-04, API-05 | Started | — | buildx server-package and Android assembleDebug + assembleDebugAndroidTest from the fresh clone (background) |
| 2026-11-10 08:15Z | API-04, API-05 | Completed | Pass | buildx exit 0; Gradle BUILD SUCCESSFUL; test node abx435-api-node on 127.0.0.1:60467; emulator-5600 abx435_api35 booted |
| 2026-11-10 08:16Z | API-06 | Started | — | am instrument on emulator-5600 |
| 2026-11-10 08:18Z | API-06 | Completed | Pass | OK (13 tests) |
| 2026-11-10 08:24Z | API-10 | Started | — | run daily_assistant_821b… created on the phone; probes/api10.sh |
| 08:13Z | API-10 | Completed | Pass | D3 new pid, same row & screen=activity, opening then activity; note: earlier rows' times were estimates, from here real UTC |
| 08:14Z | API-07 | Started | — | probes/api07.sh |
| 08:15Z | API-07 | Completed | Pass | ROT 90 and 270: frame 2400x1080, viewport 915, Fill 915; off: 412x839 |
| 08:15Z | API-08 | Started | — | probes/api08.sh |
| 08:16Z | API-08 | Completed | Pass | node clipboard 'abx435-sent-in-full-screen' after a real tap on Send, keyboard open |
| 08:16Z | API-09 | Started | — | probes/api09.sh |
| 08:16Z | API-09 | Completed | Pass | E3 new pid 5456, ROTATION_90, full=1, viewer + canvas |
| 08:17Z | API-11 | Started | — | probes/api11.sh, proxy 63826 |
| 08:20Z | API-11 | Completed | Pass | devices 1->2 after Retry; saved node Retry -> node page |
| 08:20Z | API-12 | Completed | Pass | attempt 1 (all 502) hit the start check (harness); rerun with 502 for GET /mobile only: DEC-006 words |
| 08:20Z | API-18 | Started | — | extra: AC-004-1 on Android 14 (cutout-mode branch API 28-34); AVD abx435_api34 on port 5602 |
| 08:26Z | API-18 | Checkpoint | Not Tested | interrupted by the user's stop (app restart) after pairing; emulator ended; rerun from the start |
| 08:28Z | API-18 | Completed | Fail | Android 14: shortEdges set, window 2400 wide, but content frame at x=136 -> page 863 CSS px (REQ-004 not met on API 28-34); diagnosis recorded |
| 08:30Z | API-13 | Started | — | isolated instance iso-52527-2f42 (fresh-clone app of d37397b40d), test node 127.0.0.1:52498 (worktree dist 432d1c3af2) |
| 08:32Z | API-13 | Completed | Fail | Electron window reads the node's 403 (type basic) -> 'isn't an AutoByteus node' for a refused name; closed port keeps 'No answer from that address.'; Chrome pages: opaque path as designed |
| 08:33Z | API-14, API-15, API-16 | Started | — | test:e2e:mobile-shell --cases=MSP-05,MSP-33,MSP-24,MSP-25,MSP-26,MSP-34,MSP-27,MSP-35 at HEAD 432d1c3af2 + uncommitted probe edits; output /private/tmp/abx435-api/probe-r1 |
| 08:39Z | API-14, API-15, API-16 | Completed | Fail (MSP-33 only; test cause) | MSP-05, 24-27, 34, 35 Pass; MSP-33 failed on stored=false: the case read the node's projection the moment the route changed (test timing); all route checks passed. Fixed in the test (wait), rerun MSP-33 alone |
| 08:39Z | API-14 | Started | — | rerun --cases=MSP-33, output /private/tmp/abx435-api/probe-r2 |
| 08:44Z | — | Checkpoint | — | round 1 complete: Fail (F1 API-18, F2 API-13); resources cleaned; reports written; next: commit and failure-origin handoff |
