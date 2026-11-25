# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md` IR-001, round 1 | SR-001, SR-002, IR-001 | N/A | Fail / 84% |

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
