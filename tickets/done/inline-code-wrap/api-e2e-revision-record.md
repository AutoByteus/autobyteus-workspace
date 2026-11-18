# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md`, round 1 | SR-001, IR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: inline text wraps in the running desktop and phone surfaces

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` (IR-001, commit `b1955d4a7`), round 1, direct low-risk route.
- Triggering finding or case IDs: AC-101…AC-103, AC-105, AC-106, RSK-101 in the running app (left for API/E2E by the handoff); AC-107 had no executable proof.
- Related revision IDs: SR-001, IR-001.
- Why recorded: first completed validation.
- Coverage decisions or durable test paths changed: IR-001's extension of `autobyteus-web/tests/e2e/mobile-code-wrap-cases.mjs` reviewed and kept. Added the `midWordBreaks` assertion (AC-107) and the `heading`/`inline` screenshot parts (commit `7777a921a`).
- Cases added, changed, removed, or rechecked: API-01, API-03, API-04 reused (IMP-01, IMP-02, IMP-04); API-02 new (assertion control); MSP-44…46 rerun; MSP-50…52 run with the extended assertions.
- Commands, environment, fixture, or broader-validation delta: `test:e2e:mobile-shell --cases=MSP-44,MSP-45,MSP-46,MSP-50,MSP-51,MSP-52` (probe-1) and `--cases=MSP-50,MSP-51,MSP-52` (probe-2); broader validation `Required`, executed.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| autobyteus-23 FU-002 (inline path 159 px past the 167 px Files viewer; preview container scrolls 143 px) | Follow-up (preserved behavior there) | Resolved by this ticket: `past=[]`, `hostOverflow=[]` in the same viewer | MSP-51 (`MSP-51-desktop-file-1280-panel`) |

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/`.
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none
- Recommended owner: Delivery Engineer
- Remaining risks, blocked evidence, or untested scope: RSK-102 (WebKit not run); Electron shell and dark mode not run (not touched).
