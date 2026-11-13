# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md`, round 1 | SR-001, IR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: wrapped code blocks proven in the running desktop and phone surfaces

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` (IR-001, commit `417e06da9`), round 1, direct low-risk route.
- Triggering finding or case IDs: AC-001…AC-004 and AC-006…AC-009 in the running app, RSK-001 (left for API/E2E by the handoff).
- Related revision IDs: SR-001, IR-001.
- Why this baseline was recorded: first completed validation.
- Coverage decisions or durable test paths changed: added `autobyteus-web/tests/e2e/mobile-code-wrap-cases.mjs` (MSP-50…52); updated `mobile-shell-probe.mjs` (wiring) and `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (`REPLY_FILE:`), commit `27245624a`; baseline fix to `mobile-heading-links-cases.mjs` (browser lines counted after the dev-server warm-up), commit `07b3abcd4`.
- Cases added, changed, removed, or rechecked: API-01 (run); API-02…04 (reused IMP-01, IMP-05, IMP-03/04); MSP-44…46 (rerun, existing); MSP-50…52 (new).
- Commands, environment, fixture, or broader-validation delta: `test:e2e:mobile-shell` with `--cases=MSP-44,MSP-45,MSP-46,MSP-50,MSP-51,MSP-52` (probe-3) and `--cases=MSP-51` (probe-4); broader validation `Required`, executed in the browser.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `follow-ups.md` (FU-002 evidence), `evidence/api-e2e/`.
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none
- Recommended owner: Delivery Engineer (next step)
- Remaining risks, blocked evidence, or untested scope: FU-002 (inline code overflows a narrow Files viewer; preserved behavior, outside this ticket); Electron shell, dark mode and the Monaco Edit view not run (not touched).
