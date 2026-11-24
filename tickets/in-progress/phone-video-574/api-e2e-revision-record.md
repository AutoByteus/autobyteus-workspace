# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `code-review-report.md` (CRR-001 Pass), round 1 | SR-001, ARCH-REV-*, IR-001, CRR-001, DEC-006 | N/A | Fail / 89.6% |

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
