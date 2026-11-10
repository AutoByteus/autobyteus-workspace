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
| 09:29Z | API-14 | Completed | Pass | (recorded late) r2 MSP-33 Pass, result Pass, cleanup ok — evidence API-14-probe-r2/ |
| 09:29Z | — | Checkpoint | — | ROUND 2 starts (CRR-004, HEAD b5da2d15a0): rerun API-06(35), API-07, API-18, API-08b(34), API-13, API-17 (+ MSP-36 item 13) |
| 09:29Z | ENV | Started | — | worktree builds at b5da2d15a0: buildx server-package, Android assembleDebug + androidTest |
| 09:32Z | ENV | Completed | Pass | server-package + APKs at b5da2d15a0; node abx435r2-api-node 127.0.0.1:56137; emulator-5600 abx435r2_api35 booted |
| 09:32Z | API-06 | Started | — | round 2, API 35 |
| 09:33Z | API-06 | Completed | Pass | OK (14 tests) API 35 |
| 09:33Z | API-07 | Started | — | round 2: setup-viewer.sh env.sh, then api07.sh |
| 09:36Z | API-07 | Completed | Pass | r2 (attempt 1 setup incomplete, harness): ROT 90/270 viewport 915, Fill 915, off 412x839 |
| 09:37Z | API-18 | Started | — | round 2: setup-viewer.sh env34.sh, api18m.sh |
| 09:38Z | API-18 | Completed | Pass | r2: content frame 0,0-2400,1080 in full screen, viewport 915, Fill 915 both directions; off 0,136-1080,2337 as before |
| 09:38Z | API-08b | Started | — | Android 14, api08b.sh |
| 09:39Z | API-08b | Completed | Pass | Android 14: visual 915x151, Send beside the field, node clipboard 'abx435-sent-in-full-screen' |
| 09:39Z | ENV | Started | — | worktree server build + build:mobile-web at b5da2d15a0, then isolated-app start --build |
| 09:48Z | API-13 | Started | — | round 2: iso-61038-68f7 (worktree build b5da2d15a0), node 127.0.0.1:61177 |
| 09:48Z | API-13 | Completed | Pass | r2: row and Add with a refused name show the host_refused words (DEC-019); closed port and plain 403 keep today's causes |
| 09:49Z | API-19 | Started | — | new MSP-36 (item 13): --cases=MSP-36, output /private/tmp/abx435-api2/probe-36 |
| 09:51Z | API-19 | Completed | Pass | MSP-36 Pass (first attempt not run: wrong cwd; second: the desktop build had replaced the phone bundle; rebuilt) |
| 09:51Z | API-17 | Started | — | full test:e2e:mobile-shell at b5da2d15a0 + MSP-36 edit, output /private/tmp/abx435-api2/probe-full |
| 10:12Z | API-17 | Completed | Fail (test cause) | attempt 1: 35/36 Pass, MSP-33 click timeout on the delegated row: after each reload the older-runs fold is closed and the PTM run is older than the newest five in the full run; test fixed (showOlder after toList). unknownBrowserErrors 0; MSP-32 refused [] |
| 10:12Z | API-17 | Started | — | attempt 2: full probe, output /private/tmp/abx435-api2/probe-full2 |
| 10:34Z | API-17 | Completed | Pass | attempt 2: 36/36 Pass, unknownBrowserErrors 0, MSP-32 refused [], cleanup ok |
| 10:36Z | — | Checkpoint | — | ROUND 2 complete: Pass 95%; resources removed; reports written; next: commit, handoff for test-code review |
