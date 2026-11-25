# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `code-review-report.md` (CRR-003 Pass; CRR-004, CRR-005 during the round), round 1 | SR-001…SR-006, IR-001…IR-005, CRR-001…CRR-005, DEC-007, DEC-008 | N/A | Fail (F-1) / 92.3% |

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
