# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md` IR-001, round 1 | SR-001, SR-002, IR-001 | N/A | Fail / 84% |
| API-REV-002 | Implementation Engineer, `implementation-handoff.md` IR-002, round 2 | SR-003, CRR-001, IR-002 | Fail / 84% | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: viewer polish validated on every surface; AC-002 fails on the desktop

- Triggering role, report path, and round: Implementation Engineer, `tickets/in-progress/viewer-polish-647/implementation-handoff.md` (IR-001, direct route), round 1, commit `812760b2ec`.
- Triggering finding or case IDs: none (baseline).
- Related revision IDs: SR-001, SR-002, IR-001.
- Why recorded: the first completed validation result.
- Coverage decisions or durable test paths changed:
  - Updated `autobyteus-web/tests/e2e/mobile-file-word-wrap-cases.mjs` (MSP-108, 109, 110): D-1 made its line-number assertions and its line-number-based row mapping untrue.
  - Added `autobyteus-web/tests/e2e/mobile-viewer-polish-cases.mjs` (MSP-115…118), registered in `mobile-shell-probe.mjs`.
  - `mobile-file-zoom-cases.mjs`: `multiPagePdf` exported with an optional label.
- Cases: API-001…003, 010…014, 020, 030…033, 040; reused API-001R, 002R, 004R.
- Commands, environment, fixture, or broader-validation delta: fresh-start packaged build and my isolated instance; phone probe; iOS simulator with fake and real nodes and temporary diagnostics (removed); Android emulator over raw CDP.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation, execution coverage report, test progress log, `evidence/api-e2e/`.
- Prior result and confidence: N/A.
- Current result and confidence: `Fail`, 84%.
- New or remaining failure IDs: API-011 (AC-002 on the desktop: "Failed to fetch reference content (416)"; `Content-Range` is not readable cross-origin). Question on the phone page's "could not be played" state for an empty video.
- Recommended owner: failure-origin review (`/code_reviewer`); preliminary `Design Impact` → Solution Designer.
- Remaining risks, blocked evidence, or untested scope: AC-002 in the packaged window not run separately (same cross-origin call as the `nuxt dev` window); the macOS signing-policy verify step needs the runner's identity (IMP-007).

### API-REV-002 — AC-002 fixed (SR-003): proven on the dev desktop, the packaged window and the phone page

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` IR-002 (SR-003 after CRR-001), round 2, commit `adcff4d2b2`.
- Triggering finding or case IDs: API-011 (round 1 Fail).
- Related revision IDs: CRR-001 (F-1 Design Impact, F-2 Requirement Gap), SR-003 (D-2 decides on the probe's 416 alone; REQ-002/AC-002 restated), IR-002.
- Why recorded: the rerun after the fix.
- Coverage decisions or durable test paths changed: MSP-115 (`mobile-viewer-polish-cases.mjs`) moved to the restated AC-002 by implementation (`9278fca6ff`); reviewed and kept as mine. No other durable change.
- Cases added, changed, removed, or rechecked: rechecked API-001 (specs), API-002 (fresh packaged build at `adcff4d2b2`), API-011 (MSP-114, 115, 92 on the rebuilt phone bundle); added API-021 (AC-002 in the packaged window against a remote node's Team reference). Round 1's other cases stand (their files are unchanged).
- Commands, environment, fixture, or broader-validation delta: ENV-7 (packaged app of `adcff4d2b2`, its isolated instance, a remote node added and connected with a setup code), ENV-8 (phone bundle rebuilt).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-011, AC-002 desktop: "Failed to fetch reference content (416)" | Design Impact (confirmed as CRR-001 F-1) | Resolved by SR-003 / `9e33adbf10` (`emptyMedia = streams && status === 416`) | API-011 r3, API-021, API-001 |
| AC-002 phone page: "could not be played" instead of a player | Unclear (CRR-001 F-2, Requirement Gap) | AC-002 restated in SR-003: the media viewer is reached and reports "could not be played"; MSP-115 asserts it | API-011 r3 |

- Canonical artifacts and sections updated: execution report (Round, environments, Cases API-001/002R/011/014/021, AC proof, scorecard, desktop section, cleanup, result), coverage investigation (round 2), test progress log, `evidence/api-e2e/API-011-empty-reference/` (r3), `evidence/api-e2e/API-021-packaged-empty-reference/`.
- Prior result and confidence: Fail, 84%.
- Current result and confidence: Pass, 95%.
- New or remaining failure IDs: none in scope; FU-001 and FU-002 recorded (outside this ticket).
- Recommended owner: `/delivery_engineer`.
- Remaining risks, blocked evidence, or untested scope: the apps' empty reference not rerun on IR-002's bundle (SR-003's condition matches wherever round 1's did on their same-origin pages); the session on a device's Ring/Silent switch (simulator only).
