# API/E2E Test Review Report

## Review Meta

- Review Round: 2 (round 1, CRR-004, reviewed `cf3d344ff4`)
- Trigger: API/E2E round 5 (API-REV-005, commit `f84245fe83`) passed on IR-004 (`d92abaeaa2`). This round reviews the durable test changes since round 1:
  - `ef3107bb3e`: the `pictureMoves` check;
  - `bb80c1cc9e`: the T-2 wait for the controls to hide, the new `testBDeliversInRealTimeOverASlowerLink`, and `native-video-node.mjs`'s `--latency-ms`, `POST /latency` and `POST /touch`;
  - IR-004's Core tests (`d92abaeaa2`): `AuthorizedMediaLoaderReadAheadTests` (new) and the frame-based `AuthorizedMediaLoaderTests`. These were also read in CRR-008.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-001)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-002; DEC-006 at `e9918a41a5`)
- Design Spec Reviewed As Context: `design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md`
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001, IR-002)
- Original Code Review Report: `code-review-report.md` (CRR-003 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-009` (round 1: CRR-004)
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001…005; the latest, API-REV-005, is a Pass)
- Delivery Revision Record: N/A
- API/E2E Result: Pass (round 5)
- Final Validation Confidence: 93.6%
- Prior unresolved test-review findings rechecked: none were open. Note T-1 (docstrings) is rechecked below; T-2 (from CRR-005/006) is resolved.
- Project testing guideline(s) applied: TESTING.md as the coverage investigation applies it. The rules followed are:
  - each agent uses its own emulator and simulator;
  - no provider key (the run uses the fake `antigravity_cli` fixture, `agy-failure-cli.mjs`);
  - a secret is kept out of evidence: the pairing link goes only to a mode-600 secrets file outside the evidence folder.

  No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes` (UC-001…003, AC-001…004 and D-7 on iOS; F-1/CR-001's regression)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/native-video-node.mjs` | Added | AC-001…AC-005 on a real node | The stack: this worktree's built node, a logging proxy throttled to 1.5 MB/s, test videos, a linked run, pairing, and a control endpoint (`/info`, `/log`, `/fetch`, `/rewrite`, `/throttle`, `/stop`) | A fixture driver, not an assertion suite. The proxy log redacts credentials and pairing codes. A failed start stops its node |
| `autobyteus-ios/AutoByteusMobileUITests/NativeVideoRealNodeUITests.swift` | Added | UC-001…003, AC-001, AC-004, D-7 (iOS); CR-001 | The iOS journeys on that stack: pairing; chat link with landscape and Back; skip; Files with a tall video staying portrait; rewrite (F-1); the player's Close; node removal | Skipped without the stack. Runs in name order on one stack because the pairing link is one-time (documented) |
| `autobyteus-ios/scripts/ios-simulator-smoke.sh` | Updated | — | Skips the new class in the smoke run, with the reason in the header comment | The smoke run gives 8 passed, 0 skipped |
| `autobyteus-ios/README.md` | Updated | — | How to run the class | The `TEST_RUNNER_` prefix matches the `AUTOBYTEUS_574_REAL_NODE_*` names the test reads (xcodebuild strips the prefix) |

| `NativeVideoRealNodeUITests.swift`, round 2 delta | Updated | AC-001 (iOS scrub, F-3/CR-003; real time over a round trip, F-4/CR-004) | `testAWideVideoFromTheChatLink` now asserts that the picture moves after the scrub, once the controls are gone. The new `testBDeliversInRealTimeOverASlowerLink` checks that, at 50 ms, the node delivers at least bitrate × (elapsed − 3 s) within 10 s, read from the stack's request log | It reads the proxy log because the player's clock is no measure under on-demand reads. `/touch` makes a fresh version so nothing is cached; the latency is reset in a `defer` |
| `native-video-node.mjs`, round 2 delta | Updated | F-4 | `--latency-ms` and `POST /latency` delay the first byte of each file-route answer; `POST /touch` gives a new mtime (new ETag, same bytes) | The latency is applied only to the throttled file routes, before `writeHead` |
| `AutoByteusMobileCoreTests/Video/AuthorizedMediaLoaderReadAheadTests.swift` | Added (IR-004) | CR-004 | 7 serving cases through the `MediaRead` seam against `StubNodeProtocol` | Re-run by me, 7/7 (CRR-008) |
| `AutoByteusMobileCoreTests/Video/AuthorizedMediaLoaderTests.swift` | Updated (IR-004) | AC-001, AC-002 (iOS), CR-004 | Waits for decoded frames (`AVPlayerItemVideoOutput`), not the clock; at most 6 requests | Red on IR-003 (136 requests), green on IR-004 (3) |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | One class per surface; test names state the journey. The `test0…`/`testZ…` order is explicit and explained |
| Round 2: assertions prove approved requirements | Pass | The scrub check now proves the picture, not the clock: it is red without the declaration and green with it, and with T-2 it waits for the controls to hide, so the moving time label cannot make it pass. The real-time check measures what reaches the phone over time, which is the property F-4 broke, with a 3 s start allowance. The Core test checks decoded frames and caps the request count; each is red on the broken loader and green on the fix |
| Round 2: determinism and isolation | Pass | `/touch` makes a fresh version for the real-time test; the latency is reset in a `defer`. The real-time test assumes the stack's 30 s video length, which is stated in a comment. API/E2E passed the class on fresh stacks in rounds 4 and 5 |
| Assertions prove approved requirements instead of incidental details | Pass | These are asserted: the player opens; a wide video turns landscape and a tall one stays portrait; Back and Close return to portrait; no "could not play"; one player; no auto-open after a rewrite (CR-001, the assertion that fails on IR-001); the node row is removed. Note T-1 lists what is only observed |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | `launchSaved`, `openTheRun`, `openFiles`, `fileRow`, `showControls` and `control`. The stack reuses `fixtures/probe-node-access.mjs` |
| Test isolation and determinism appropriate for the boundary | Pass | A fresh data root and stack per run; ports chosen by the OS; an own simulator. Real-time sleeps suit a throttled real-node journey; round 2 passed 7 of 7 on a fresh stack |
| Large files coherent and navigable | Pass | 258 and 225 lines, each one subject |
| No stale, duplicated, disabled-without-reason or compatibility-only tests | Pass | The skips are explained (stack absent; smoke run) |
| Coverage agrees with the coverage investigation and execution evidence | Pass | IOS-1…13 and R2-IOS-13 map to these tests. The Android journeys are steps in the report (adb + CDP), which the report itself names as a durability gap |
| Test callers exercise an independently established supported scenario | Pass | Pairing through the app's `autobyteus://` link, the run's real file links, the Files menu, and the node's own rewrite of a workspace file |
| Each test enters through its scenario's real trigger | Pass | Taps in the app's real WebView and player. The rewrite is a file replaced on the node, which the node's live refresh then sees. No page script or internal hook is used |

## Findings

None that need action.

Non-blocking note:
- **T-1: two docstrings claim more than the tests assert.** API/E2E may tidy this when it next touches the file.
  - `testBSkipForwardPlaysOn` says the position "moves on by about ten seconds and keeps playing", but only prints the position.
  - `testZRemovingTheNodeFromTheApp` says it "deletes its cached videos", but asserts only that the row is removed. The cache folder is read from the host, which a UI test cannot do; the evidence shows Android 207 MB → 0 and iOS 28.6 MB → 0.
  - `testA…`'s seek is printed, not asserted: O-4 makes a scrubber assertion unreliable on the simulator.
  - The behaviors are proven in the execution report (recording, proxy log, host reads). The wording should say "observed (POSITION/MARK lines)" so a green run is not read as proof of them.

I also scanned the committed `evidence/` for credentials and pairing codes (`mra_…`, `Bearer …`, `pairing=`/`code=`/`token=` values): none found, and no secrets file is tracked.

Round 2 (CRR-009):
- **Findings:** none.
- **T-1 still applies, non-blocking:** the docstrings of `testBSkipForwardPlaysOn` and `testZRemovingTheNodeFromTheApp` claim more than they assert.
- **Credential scan:** I re-scanned the whole `evidence/` tree after rounds 3–5 (`mra_…`, `Bearer …`, `pairing=`/`code=`/`token=` values). None were found.

## Follow-ups

- Follow-ups this review added: None

## Latest Authoritative Result

- Result: `Pass` (round 2, CRR-009). Round 1 (CRR-004) was also `Pass`; its notes below still hold.
- Round 2 test paths: the `NativeVideoRealNodeUITests.swift` delta, the `native-video-node.mjs` delta, `AuthorizedMediaLoaderReadAheadTests.swift` and `AuthorizedMediaLoaderTests.swift`.
- Round 2 notes for delivery:
  - Every finding (CR-001…004) is resolved, and API/E2E passes at 93.6%.
  - O-7: on a link slower than the bitrate (0.5 MB/s), the picture plays at the link's speed and the scrubber's clock runs about 2 s ahead. This is outside AC-001.
  - H-1 was observed only as 2 × 64 KB in transit when a fetch was stopped.
  - R-1 and R-2 are for the user. A physical-iPhone scrub check on a real network is still recommended before release.
  - The Android release-build checks (IMP-08/09) predate the later commits. Only iOS source changed since then, but the iOS build-only release run should be repeated on the final head.
- Round 1 result:
- Result: `Pass`
- Changed durable test paths reviewed:
  - `autobyteus-web/tests/e2e/native-video-node.mjs`;
  - `autobyteus-ios/AutoByteusMobileUITests/NativeVideoRealNodeUITests.swift`;
  - `autobyteus-ios/scripts/ios-simulator-smoke.sh`;
  - `autobyteus-ios/README.md`.
- Unresolved finding IDs: None (T-1 is a non-blocking note)
- Recommended Recipient: `/delivery_engineer`
- Notes for delivery:
  - R-1 (iOS Back bar over the landscape video; frame `ios/strips/landscape-r1-back-bar.png`) and R-2 (Android "could not play" after a night-mode switch) are confirmed and non-blocking, for the user to see.
  - O-4: API/E2E recommends a scrubber check on a physical iPhone before release.
  - Possible docs sync: `docs/android_mobile_access.md` could gain a video step.
