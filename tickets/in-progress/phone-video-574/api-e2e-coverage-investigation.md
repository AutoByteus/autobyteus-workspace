# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001; REQ-001…REQ-005, AC-001…AC-006; DEC-001…DEC-006, DEC-006 being this round's evidence decision)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001)
- Design Spec (required on every route): `design-spec.md` (D-1…D-7, N-1…N-4, UC-001…UC-003)
- Supplemental Task Artifacts: `probes/` (P1…P3), `follow-ups.md` (FU-001, FU-002), `handoff-architecture-design-complete.md`
- Design Review Report: `design-review-report.md` (has the Architecture Reviewer's uncommitted edits; left as found)
- Architecture Review Revision Record: `architecture-review-revision-record.md` (likewise)
- Implementation Handoff: `implementation-handoff.md` (IMP-01…IMP-10; Downstream Coverage Hints)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001 Pass, 9.4/10; residuals R-1…R-3)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: `/code_reviewer`, CRR-001 Pass; branch `codex/phone-video-574`, code head `b0a2eeacc0` (reviewer's documents `b2a9886093`, DEC-006 `e9918a41a5`), base `4b73fccae2`; Large / High
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001 / AC-001: in both apps a protected node video plays at once in the platform's player (Android Media3, iOS AVPlayer), seeks by range; from Files, a chat link and a media message (the media message accepted as unverified risk, DEC-006).
- REQ-002 / AC-002: reopen fetches nothing already cached; a changed file (new ETag) is fetched fresh; the cache is bounded and is cleared when its node is removed (D-7).
- REQ-003 / AC-003: the credential only in the `Authorization` header (handed over per playback, D-5, DEC-002); never in a URL, a log or a stored record; the bridge refuses a URL of another origin or another route and sends nothing.
- REQ-004 / AC-004: native full screen in landscape with the bars hidden and back to portrait with the position kept; Android in-page full screen (DEC-004).
- REQ-005 / AC-005: every node file route answers ranges (206/416/304/200, `Accept-Ranges`, `ETag`, `Cache-Control: no-cache`); a rewritten file reopened on the desktop shows its new content.
- AC-006: a browser, an app without the player (DEC-005: `hello` without `videoPlayer`) and the desktop keep today's path.

## Supported Scenarios And Real Usage

- Designer scenarios covered: UC-001 (Files, chat link; media message by its URL form only, DEC-006), UC-002 (seek, reopen, changed file), UC-003 (native full screen; Android in-page full screen).
- Real-use scenarios added from investigating the implemented behavior:
  - an agent rewrites a video while its viewer is open in the page (live refresh), with the player open and after it was closed (found F-1);
  - the system theme changes while a video plays (the reviewer's R-2), and the recovery;
  - the scrubber dragged on iOS, and the player's skip buttons;
  - the old app (base commit) against the new page;
  - a removed node's cache on both apps;
  - a bridge message whose URL climbs out of `/rest/` with dot segments (found F-2).
- Designer scenarios recorded as unsupported/contrived: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 progressive play, ranged seek (D-2…D-5) | Changed | REQ-001 | real node on the emulator and the simulator; timings from screen recordings |
| BEH-002 cache by version (D-7, DEC-003) | Changed | REQ-002 | proxy byte counts on reopen; changed file; node removal on both apps |
| BEH-003 full screen (native, Android in-page) | Changed | REQ-004 | emulator rotation and insets; simulator landscape/portrait |
| BEH-004 ranged file routes (D-1) | Changed | REQ-005 | AC-005 on the real node through every route; Chromium revalidation of a rewritten file |
| D-5 credential handoff and route allowlist | Changed | REQ-003 | log, cache and proxy scans on both apps; bridge refusal live (Android) and the iOS check against the real proxy |
| Preserved: browser, old app, desktop | Preserved | AC-006 | old Android app built from the base; whole phone probe (MSP-89…92); desktop rewrite in Chromium |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `sendUserFile` on every file route (D-1) | server unit/integration/e2e (IMP-01, IMP-10) | the real route set behind a real proxy; a rewrite seen by Chromium's cache | Live node + browser |
| API / transport / contract | Yes | bridge `hello.videoPlayer`, `playVideo` | web specs (IMP-02); app unit tests (IMP-03, IMP-05) | the real page → app → player chain; refusal of crafted URLs live | Emulator / simulator |
| Frontend component / state | Yes | `useNativeVideoPlayback`, `VideoPlayer.vue`, `MediaSegment.vue` | web suite (IMP-02) | live refresh of an open viewer (found F-1) | Emulator / simulator |
| Browser integration / user journey | Yes | the phone bundle in the apps; plain browser unchanged | MSP-89…92 (IMP-07) | the apps' WebViews | Emulator / simulator; whole phone probe |
| Native apps | Yes | Android `VideoPlayerActivity`, Media3 cache, in-page full screen; iOS `NativeVideoPlayerViewController`, `AuthorizedMediaLoader`, `MediaRangeCache` | instrumented and UI tests with stand-in nodes (IMP-04, IMP-06) | a real node, pairing, a throttled link, real timings, configuration changes | Emulator / simulator with a real node |
| Desktop renderer | Preserved | the desktop reads the same routes (now ranged, no-cache) | server tests | Chromium's HTTP cache on a rewrite | Browser (Chromium) |
| Desktop shell / packaging | No | — | — | — | — |
| Persisted-data transition | No | (new caches only, app-private) | — | — | — |

## Project Execution Discovery

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | project testing rules | clean env (`env -i PATH HOME TMPDIR`); never the user's AutoByteus or `~/.autobyteus`; no secret in evidence; own emulator with its own `-port`, headless, deleted after; never touch others' emulators/simulators; one heavy run at a time |
| `autobyteus-ios/README.md` | iOS build and tests | `scripts/generate-project.sh` (XcodeGen; bundle IDs); `TEST_RUNNER_` prefix passes variables to tests; `NativeVideoPlayerUITests` with the fake node |
| `autobyteus-android/README.md` | Android build | `./gradlew assembleDebug`; instrumented tests |
| `autobyteus-server-ts` pairing policy | pairing link | a pairing link may not name a loopback host (`REMOTE_ACCESS_PAIRING_URL_LOCAL_ONLY`): the simulator pairs at the computer's LAN address |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server dist, phone bundle | worktree | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | — | exit 0 | — |
| Real node behind a logging, throttled proxy | worktree | `node autobyteus-web/tests/e2e/native-video-node.mjs --output-dir=<tmp> --origin-host=<10.0.2.2 \| LAN IP> [--listen-host=<LAN IP>] --secrets-file=<tmp>` | 1.5 MB/s on file routes; test-owned root; launch owner credential | `NATIVE_VIDEO_NODE_READY` | `POST /stop` on its control port |
| Android emulator | `/tmp/api574` | own AVD `api574_video`, `-port 5580 -no-window -no-audio -no-snapshot -gpu swiftshader_indirect` | API 35 arm64 | `sys.boot_completed` | `emu kill`; `avdmanager delete avd` |
| iOS simulator | — | own device `api574-iphone` (iPhone 17, iOS 26.1) | others' iPhone 17 and iPhone 16e left alone | `bootstatus -b` | `simctl shutdown`, `simctl delete` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| 20+ MB videos with a visible timecode | ffmpeg `testsrc2`/`smptehdbars` + `drawtext` in the stack | made per run | stack root |
| A chat link and Files entries | a scripted AGY run echoing the paths | probe-owned | stack root |
| Pairing | the node's pairing session for the proxy's origin | the one-time link only in a mode-600 secrets file; Android by a share intent, iOS by `autobyteus://open?input=` | consumed |
| The phone's credential for scans | read from the page's storage in memory | never printed; counts only | — |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/api/rest/user-file-ranges.test.ts` and route tests | ranges, validators, rewrite never 304 | AC-005, D-1 | Valid | IMP-01 | keep |
| Android `VideoPlayerActivityTest`, `WebMediaFullScreenTest`, JVM tests | player, cache, full screen, removal, bridge rules | AC-001…AC-004 | Valid (stand-in node); the bridge test does not try dot segments | IMP-03, IMP-04 | keep; F-2 needs a case |
| iOS `AuthorizedMediaLoaderTests`, `NodeVideoHTTPTests`, `NativeVideoPlayerUITests` | loader, route check, player with the fake node | AC-001…AC-004 | Valid (stand-in node); no dot-segment case | IMP-05, IMP-06 | keep; F-2 needs a case |
| Web specs for `useNativeVideoPlayback`, `VideoPlayer`, `MediaSegment`, `shellBridge` | modes, bridge use | AC-003, AC-006 | Valid; no live-refresh case | IMP-02 | keep; F-1 needs a case |
| MSP-89…92 | phone media in a plain browser | AC-006 | Valid | IMP-07 | rerun (whole probe) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| AC5-1 | AC-005 | the four file routes on the real node | Temporary script | `ac005.mjs` through the stack's `/fetch` | the real route set (DEC-006 asked for `/rest/files/`) |
| AND-1…AND-13 | AC-001…AC-004, AC-006, R-2 | the Android app on a real node | Temporary drivers (adb, the WebView's DevTools socket) | `android-step.mjs`, `android-open.mjs`, `android-seek.mjs`, `ac003.mjs` | hints 1–5 on Android |
| IOS-1…IOS-13 | AC-001…AC-004, R-1, R-3 | the iOS app on a real node | Durable UI test (`NativeVideoRealNodeUITests`) plus temporary controls | `xcodebuild … -only-testing:AutoByteusMobileUITests/NativeVideoRealNodeUITests` with a recording | hints 1–4 on iOS; R-3 in the app |
| DSK-1 | AC-005 (desktop), AC-006 | Chromium against a real node | Temporary script | `desktop-rewrite.mjs` | hint 5 (desktop) |
| WS-1 | AC-006; regression | whole phone probe | Existing Test | `test:e2e:mobile-shell` | MSP-89…92 and every case on this tree |
| SI-1, SE-1 | AC-005; regression | server integration and E2E | Existing Test | `test:integration`, `pnpm test:e2e` | independent run of D-1 |
| U-1 | unit | web, server, app units | Reused | IMP-02, IMP-03, IMP-05, IMP-10 | no code change after `b0a2eeacc0` |

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| stack | `autobyteus-web/tests/e2e/native-video-node.mjs` | a real node with a request log and a throttle, for both apps and every later round |
| IOS-13, IOS-14 | `autobyteus-ios/AutoByteusMobileUITests/NativeVideoRealNodeUITests.swift` | the iOS journeys on a real node: pairing, chat link, Files, seek, skip, rewrite (F-1), the player's own Close, node removal |

## Durable Coverage To Update

| Path | Change | Why |
| --- | --- | --- |
| `autobyteus-ios/scripts/ios-simulator-smoke.sh` | skip `NativeVideoRealNodeUITests` | the smoke run allows no skip; the class needs a real node (as `NativeVideoPlayerUITests` needs the fake node) |
| `autobyteus-ios/README.md` | how to run the class | — |

## Durable Coverage To Remove

None.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-001 from a real media message | needs a paid, non-deterministic video model | Low | No | DEC-006 (a): accepted; the `/rest/files/` URL form played natively through the bridge (AND-13) |
| Physical phones | no device | Medium for timing and for the iOS scrubber observation | No | recommended before release (see the report) |
| AC-006 with an old iOS app | the page's choice is the same `hello.videoPlayer` flag; proven with the old Android app | Low | No | None |
| Android LRU eviction at 500 MB | not reachable in a run | Low | No | None (Media3's evictor) |

## Ambiguities Or Reroute Triggers

- AC-001's "ranged requests (206)": Media3 reads the first open as one unranged 200 after a 2-byte probe, and its seeks and reopens as 206s; iOS uses only 206s. Recorded as an observation; the AC's intent (progressive, never the whole file first, header only) holds.

## Investigation Decision

- Proceed to execution: Yes (executed in the same round; results in `api-e2e-execution-coverage-report.md`).
