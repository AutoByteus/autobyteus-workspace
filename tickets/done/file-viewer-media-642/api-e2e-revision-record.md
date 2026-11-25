# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `code-review-report.md` (CRR-003 Pass; CRR-004, CRR-005 during the round), round 1 | SR-001…SR-006, IR-001…IR-005, CRR-001…CRR-005, DEC-007, DEC-008 | N/A | Fail (F-1) / 92.3% |
| API-REV-002 | `/code_reviewer`, `code-review-report.md` (CRR-007 Pass on IR-006), round 2 | IR-006 (`243d269420`, `216bc68baf`), CRR-006, CRR-007 | Fail (F-1) / 92.3% | Pass / 93.4% |

## Revision Entries

### API-REV-001 — Baseline on a real node, the desktop window and the phone: references, audio, layout, highlighting

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-003 Pass), round 1
- Triggering finding or case IDs: — (baseline)
- Related revision IDs:
  - SR-005 / DEC-007 (the iOS audio session) and SR-006 / DEC-008 (chat code blocks, `FileDisplay.vue` removed), both from this round's evidence questions;
  - IR-004 (`38f318021c`) and IR-005 (`339b8d0ddb`), CRR-004 and CRR-005 Pass.
- Why recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed:
  - added `autobyteus-ios/AutoByteusMobileUITests/NativeMediaRealNodeUITests.swift`: audio, references, CR-002, the page path, the close paths, removal;
  - added `autobyteus-web/tests/e2e/mobile-file-viewer-media-cases.mjs` (MSP-111…114), registered in `mobile-shell-probe.mjs`;
  - updated `native-video-node.mjs`: audio, a Team with references, `/team-message`, `/touch?file=`, Ogg/WebM;
  - updated `ios-simulator-smoke.sh` (skips the new class) and the iOS README.
- Cases added, changed, removed, or rechecked: SRV-1; AND-R1…R4, AND-A1…A5, AND-V, AND-C, AND-N; IOS-A…H, IOS-Z, IOS-V, IOS-CR; MSP-111…114; WS-1; SI-1, SE-1; U-1 reused
- Commands, environment, fixture, or broader-validation delta:
  - own AVD `api642_media` (`-port 5646`, host GPU) and own simulators `api642-iphone`, `api642-r2`, all deleted after;
  - the iOS demo build overwrites `dist/public`, so the phone bundle was rebuilt after it.

#### Prior Failure Resolution

None

- Canonical artifacts: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/`
- Prior result and confidence: N/A
- Current result and confidence: Fail (F-1) / 92.3%
- New or remaining failure IDs: F-1 (the iOS loader's 1 MB read-ahead reach makes an audio seek over a slower link wait for the sequential stream)
- Recommended owner: code reviewer (failure-origin review); preliminary `Local Fix`
- Remaining risks: the sound and the Ring/Silent switch on a physical iPhone (DEC-007); no physical phones

### API-REV-002 — IR-006: the iOS loader's reach by time; F-1 resolved; round 1's slider query corrected

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-007, targeted delta, Pass), round 2
- Triggering finding or case IDs: F-1 (= CR-003)
- Related revision IDs: IR-006 (`243d269420` loader; `216bc68baf` my test's scrubber query), CRR-006, CRR-007
- Why recorded: rerun after the fix
- Coverage decisions or durable test paths changed: `NativeMediaRealNodeUITests` gains the cold start-time measurement in testA (the scrubber's position reaching 1 s, asserted under 2 s) and an `elapsedSeconds` helper; the doc comments of `scrubber` and `fileRequests` put back in order
- Cases added, changed, removed, or rechecked: R2-IOS-C, R2-IOS-START, R2-IOS-CLASS, R2-IOS-V
- Commands, environment, fixture, or broader-validation delta: a freshly booted own simulator `api642-r3`, deleted after; fresh stacks per class

#### Prior Failure Resolution

| Prior Failure ID | Prior Case IDs | Fix Revision | Recheck Case IDs | Result |
| --- | --- | --- | --- | --- |
| F-1 | IOS-C (its round-1 evidence read the volume slider; F-1 confirmed by IMP-16's Core trace) | `243d269420` (+ `216bc68baf`) | R2-IOS-C | Resolved: the middle read by range about 0.7 s after the drag, over 50 ms / 60 KB/s |

- Canonical artifacts: `api-e2e-execution-coverage-report.md` (Round 2 Cases, the correction, AC-002, scorecard, result), `api-e2e-test-progress.md`, `evidence/api-e2e/R2-ios/`
- Prior result and confidence: Fail (F-1) / 92.3%
- Current result and confidence: Pass / 93.4%
- New or remaining failure IDs: None
- Recommended owner: code reviewer (proportional test-code review)
- Remaining risks: the sound and the Ring/Silent switch on a physical iPhone (DEC-007); no physical phones
