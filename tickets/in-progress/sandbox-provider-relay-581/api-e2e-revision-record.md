# API/E2E Revision Record: autobyteus-581

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `code-review-report.md`, CRR-003 pass; API/E2E round 1 | IR-003, CRR-003, SR-009, SR-010 (DEC-118) | N/A | Fail / 83% |

## Revision Entries

### API-REV-001 — Baseline: repository suites green; live sandbox journey finds two failures

- Triggering role, report path, and round: `/code_reviewer`, `tickets/in-progress/sandbox-provider-relay-581/code-review-report.md`, round 1.
- Triggering finding or case IDs: none (first validation).
- Related revision IDs: implementation IR-003 (code `d624f09ce6`); code review CRR-003; solution SR-009, SR-010 (DEC-118).
- Why recorded: the first completed API/E2E result.
- Coverage decisions or durable test paths changed:
  - Added: `autobyteus-server-ts/tests/e2e/sandboxes/sandbox-live.e2e.test.ts` (gated, SBX-01..08).
  - Updated: `autobyteus-server-ts/tests/integration/credential-proxy/provider-relay-peer.integration.test.ts` (QR-004 case).
- Cases added:
  - API-R01..R10: repository checks, fresh-start build, skill review.
  - API-L01..L12: live cases.
  - API-E01, API-E02: failure diagnostics.
- Commands, environment, fixture, or broader-validation delta:
  - Validation image `autobyteus-server:581-api-e2e` (beta + this commit's server package, built with `--load`; a local folder export stalled).
  - Built host nodes on own roots; the test vault.
  - Five live suite runs: run 1 was invalid because of a suite defect, since fixed.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (created; planned live case IDs aligned to SBX-01..08); `api-e2e-execution-coverage-report.md` (created); `api-e2e-test-progress.md`.
- Prior result and confidence: N/A
- Current result and confidence: **Fail**, 83% overall, requirement proof 50%.
- New or remaining failure IDs:
  - F-1: intermittent `SANDBOX_START_FAILED: … fetch failed`. The setup exchange races the node's HTTP listener; one fetch, no retry.
  - F-2: a sandbox's run memory goes to `<data>/memory`, not the mapped `runMemoryFolder`. `--data-dir` overrides `AUTOBYTEUS_MEMORY_DIR`.
- Recommended owner: implementation engineer (`Local Fix` for both), after failure-origin review by the code reviewer.
- Remaining risks, blocked evidence, or untested scope:
  - AC-005 live: DEC-118, waiting for the user.
  - AC-016 / REQ-015 planted link (API-L10): next round, after F-2.
  - R-3: the desktop window's direct status check of a sandbox address.
  - Doc notes D-1 and D-2.
