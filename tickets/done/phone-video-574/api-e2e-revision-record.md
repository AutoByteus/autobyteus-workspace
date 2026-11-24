# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `code-review-report.md` (CRR-001 Pass), round 1 | SR-001, ARCH-REV-*, IR-001, CRR-001, DEC-006 | N/A | Fail / 89.6% |
| API-REV-002 | `/code_reviewer`, `code-review-report.md` (CRR-003 Pass, targeted delta on IR-002), round 2 | IR-002 (`fb2357dc09`, `6479a28f4b`), CRR-002 (CR-001, CR-002), CRR-003 | Fail / 89.6% | Pass / 92.4% |
| API-REV-003 | `/delivery_engineer`, DR-001 (O-4 attribution request), round 3 | DR-001; product code unchanged since `64a99bbcd2` | Pass / 92.4% | Fail (F-3) / 93.0% |
| API-REV-004 | `/code_reviewer`, `code-review-report.md` (CRR-006 Pass on IR-003), round 4 | IR-003 (`c3ff688979`), CRR-005, CRR-006 | Fail (F-3) / 93.0% | Fail (F-4) / 91.9% |
| API-REV-005 | `/code_reviewer`, `code-review-report.md` (CRR-008 Pass on IR-004), round 5 | IR-004 (`d92abaeaa2`), CRR-007, CRR-008 | Fail (F-4) / 91.9% | Pass / 93.6% |

## Revision Entries

### API-REV-001 — Baseline on a real node: the players work; a rewrite reopens the player (F-1); the route check lets dot segments through (F-2)

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-001, Pass, 9.4/10), round 1
- Triggering finding or case IDs: — (baseline)
- Related revision IDs: SR-001, IR-001 (code head `b0a2eeacc0`), CRR-001, DEC-006 (this round's evidence decision: the media message accepted as unverified risk)
- Why recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed:
  - added `autobyteus-web/tests/e2e/native-video-node.mjs` (a real node of the worktree behind a logging, throttled proxy, with test videos, a linked run and a pairing link; `--listen-host` for the iOS simulator);
  - added `autobyteus-ios/AutoByteusMobileUITests/NativeVideoRealNodeUITests.swift` (pairing, chat link, skip, Files, rewrite (F-1), node removal; skipped without the stack);
  - `autobyteus-ios/README.md`: how to run it; `autobyteus-ios/scripts/ios-simulator-smoke.sh` skips the new class (it needs a real node), as it skips `NativeVideoPlayerUITests`.
- Cases added, changed, removed, or rechecked: AC5-1; AND-1…AND-13 (+ AND-2b); IOS-1…IOS-14; DSK-1; WS-1; SI-1; SE-1; U-1 reused (IMP-02, IMP-03, IMP-05, IMP-10)
- Commands, environment, fixture, or broader-validation delta: own emulator AVDs (`-port 5580`; `-port 5582` with host GPU) and own simulators (`api574-iphone`, `api574-smoke`), all deleted after; the pairing link only in a mode-600 secrets file

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/`
- Prior result and confidence: N/A
- Current result and confidence: Fail (F-1, F-2) / 89.6%
- New or remaining failure IDs: F-1 (web, D-2: a rewrite while the viewer is mounted opens the player again), F-2 (Android and iOS route check: `/rest/..` dot segments)
- Recommended owner: code reviewer (failure-origin review); preliminary classification `Local Fix` for both
- Remaining risks, blocked evidence, or untested scope: O-4 (the iOS scrubber freeze on the simulator, unattributed); physical phones; the media message on a live run (DEC-006)

### API-REV-002 — Rerun after IR-002: F-1 and F-2 resolved on both apps

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-003, targeted delta, Pass), round 2
- Triggering finding or case IDs: F-1 (= CR-001), F-2 (= CR-002)
- Related revision IDs: IR-002 (code head `64a99bbcd2`: `fb2357dc09` web, `6479a28f4b` apps), CRR-002, CRR-003
- Why recorded: rerun of the failed cases after the fixes
- Coverage decisions or durable test paths changed: None (my round-1 test code unchanged; `testDARewriteDoesNotOpenThePlayerByItself` now passes)
- Cases added, changed, removed, or rechecked: R2-AND-8, R2-AND-9 (with Play after a rewrite, the same file tapped again, another file, the chat link), R2-IOS-9, R2-IOS-13 (the whole class), R2-IOS-U, R2-AND-U, R2-WEB-U, R2-MSP-89…92
- Commands, environment, fixture, or broader-validation delta: new AVD `api574_r2` (`-port 5584`, host GPU) and simulator `api574-r2`, both deleted after; the loader test needs a video longer than 31 s (it seeks to 30 s): a 60 s fixture

#### Prior Failure Resolution

| Prior Failure ID | Prior Case IDs | Fix Revision | Recheck Case IDs | Result |
| --- | --- | --- | --- | --- |
| F-1 | AND-9, IOS-11, IOS-13 | `fb2357dc09` | R2-AND-9, R2-IOS-13 | Resolved: a rewrite never opens the player (open: 1 stays 1; closed: 0 stays 0); Play plays the new version |
| F-2 | AND-8, IOS-9 | `6479a28f4b` | R2-AND-8, R2-IOS-9 | Resolved: every dot-segment form refused before anything is sent, on both apps |

- Canonical artifacts and sections updated: `api-e2e-execution-coverage-report.md` (Round 2 Cases, AC proof, scorecard, result), `api-e2e-test-progress.md`, `api-e2e-coverage-investigation.md` (meta), `evidence/api-e2e/R2-*`
- Prior result and confidence: Fail / 89.6%
- Current result and confidence: Pass / 92.4%
- New or remaining failure IDs: None
- Recommended owner: code reviewer (proportional test-code review of `cf3d344ff4`)
- Remaining risks, blocked evidence, or untested scope: O-4 (physical iPhone scrubber check); no physical phones; the media message on a live run (DEC-006)

### API-REV-003 — O-4 attributed: the iOS loader-backed asset stops its picture after an AVKit scrub (F-3)

- Triggering role, report path, and round: delivery engineer, DR-001 (its three controls for O-4), round 3
- Triggering finding or case IDs: O-4 (IOS-6)
- Related revision IDs: DR-001 (`ad813b4e6d`); code head `64a99bbcd2`
- Why recorded: O-4 turned out to be a product defect
- Coverage decisions or durable test paths changed: `NativeVideoRealNodeUITests.testAWideVideoFromTheChatLink` now asserts that the picture moves after the scrub (`pictureMoves`: two screenshots 1 s apart with the controls hidden). It fails on the shipped loader and passes on the plain-file path and with the flag. This change needs the code reviewer's proportional review
- Cases added, changed, removed, or rechecked: R3-O4-a (loader vs plain file, 2 + 2 runs), R3-O4-b (pixels), R3-O4-c (bytes), R3-O4-d (loader requests), R3-O4-e (`isEntireLengthAvailableOnDemand`, 2 runs), R3-IOS-2
- Commands, environment, fixture, or broader-validation delta: own simulator `api574-o4`, deleted after. Temporary uncommitted harness switches (a plain-file path in `NativeVideoPlayer.start`, loader logging, the flag) and two temporary test files, all reverted; the clean tree was rebuilt and R3-IOS-2 rerun

#### Prior Failure Resolution

None new (F-1, F-2 resolved in API-REV-002).

- Canonical artifacts and sections updated: `api-e2e-execution-coverage-report.md` (Round 3 Cases, F-3, AC-001, scorecard, result), `api-e2e-test-progress.md`, `evidence/api-e2e/R3-O4/`
- Prior result and confidence: Pass / 92.4%
- Current result and confidence: Fail (F-3) / 93.0%
- New or remaining failure IDs: F-3
- Recommended owner: code reviewer (failure-origin review); preliminary `Local Fix` in the iOS loader
- Remaining risks, blocked evidence, or untested scope: no physical phones; the media message on a live run (DEC-006)

### API-REV-004 — IR-003's flag ends the scrub freeze but makes playback fall below real time on any link with a round trip (F-4)

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-006, targeted delta, Pass), round 4
- Triggering finding or case IDs: F-3 (= CR-003); the reviewer's watch item (many small ranges: request count and timing against AC-001); T-2
- Related revision IDs: IR-003 (`c3ff688979`), CRR-005, CRR-006
- Why recorded: rerun after the F-3 fix; a new failure found
- Coverage decisions or durable test paths changed:
  - `testAWideVideoFromTheChatLink`'s picture check waits until the controls are gone (T-2);
  - new `testBDeliversInRealTimeOverASlowerLink` (at 50 ms the node must deliver at least the bitrate);
  - `native-video-node.mjs`: `--latency-ms`, `POST /latency`, `POST /touch`;
  - all need the code reviewer's proportional review.
- Cases added, changed, removed, or rechecked: R4-IOS-2, R4-IOS-RQ, R4-IOS-LAT (20/50 ms, with and without the flag), R4-IOS-DL, R4-IOS-U, R4-IOS-13
- Commands, environment, fixture, or broader-validation delta: own simulator `api574-r4`, deleted after; latency in the proxy; a temporary one-line revert of the flag for the controls, restored; the 60 s fixture for the core loader test

#### Prior Failure Resolution

| Prior Failure ID | Prior Case IDs | Fix Revision | Recheck Case IDs | Result |
| --- | --- | --- | --- | --- |
| F-3 | IOS-6, R3-O4-a, R3-IOS-2 | `c3ff688979` | R4-IOS-2 | Symptom resolved on a zero-latency link; the fix causes F-4 (not acceptable as is) |

- Canonical artifacts and sections updated: `api-e2e-execution-coverage-report.md` (Round 4 Cases, F-4, AC-001, scorecard, result), `api-e2e-test-progress.md`, `evidence/api-e2e/R4/`
- Prior result and confidence: Fail (F-3) / 93.0%
- Current result and confidence: Fail (F-4) / 91.9%
- New or remaining failure IDs: F-4
- Recommended owner: code reviewer (failure-origin review); preliminary `Local Fix` in the iOS loader
- Remaining risks, blocked evidence, or untested scope: no physical phones or real networks; the media message on a live run (DEC-006)

### API-REV-005 — IR-004: one streaming fetch answers the small reads; F-3 and F-4 resolved

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-008, targeted delta, Pass), round 5
- Triggering finding or case IDs: F-3 (= CR-003), F-4 (= CR-004); held H-1, H-3
- Related revision IDs: IR-004 (`d92abaeaa2`), CRR-007, CRR-008
- Why recorded: rerun after the F-4 fix
- Coverage decisions or durable test paths changed: None in round 5 (the round-3/4 test changes await the proportional review)
- Cases added, changed, removed, or rechecked: R5-IOS-2, R5-IOS-DL, R5-IOS-LAT (20/50 ms), R5-IOS-H1, R5-IOS-H3 (0.5 MB/s), R5-IOS-U (60 s video, twice), R5-IOS-13
- Commands, environment, fixture, or broader-validation delta: own simulator `api574-r5`, deleted after; the request analysis script kept with the evidence

#### Prior Failure Resolution

| Prior Failure ID | Prior Case IDs | Fix Revision | Recheck Case IDs | Result |
| --- | --- | --- | --- | --- |
| F-3 | IOS-6, R3-O4-a, R3-IOS-2 | `c3ff688979` + `d92abaeaa2` | R5-IOS-2, R5-IOS-LAT | Resolved: the scrub plays on, first open and cached, at 0–50 ms |
| F-4 | R4-IOS-LAT, R4-IOS-DL, R4-IOS-U | `d92abaeaa2` | R5-IOS-DL, R5-IOS-LAT, R5-IOS-U | Resolved: one streaming fetch per open; real time at 20 and 50 ms; 13.9 MB delivered against 5.34 MB needed; the core loader test passes with the 60 s video |

- Canonical artifacts and sections updated: `api-e2e-execution-coverage-report.md` (Round 5 Cases, AC-001, observations, scorecard, result), `api-e2e-test-progress.md`, `evidence/api-e2e/R5/`
- Prior result and confidence: Fail (F-4) / 91.9%
- Current result and confidence: Pass / 93.6%
- New or remaining failure IDs: None
- Recommended owner: code reviewer (proportional test-code review of `ef3107bb3e`, `bb80c1cc9e`)
- Remaining risks, blocked evidence, or untested scope: no physical phones or real networks; O-7; the media message on a live run (DEC-006)
