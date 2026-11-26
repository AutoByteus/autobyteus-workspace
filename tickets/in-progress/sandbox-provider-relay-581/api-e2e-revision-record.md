# API/E2E Revision Record: autobyteus-581

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `code-review-report.md`, CRR-003 pass; API/E2E round 1 | IR-003, CRR-003, SR-009, SR-010 (DEC-118) | N/A | Fail / 83% |
| API-REV-002 | `/code_reviewer`, CRR-005 pass of IR-004; API/E2E round 2 | IR-004, CRR-005, DEC-118 | Fail / 83% | Pass / 95% |

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

### API-REV-002 — Round 2: F-1 and F-2 fixed; the live suite is green twice; evaluator journey passes

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` CRR-005 (targeted delta review of IR-004), round 2.
- Triggering finding or case IDs: F-1 (API-L01, API-L07, API-E01) and F-2 (API-L02, API-E02).
- Related revision IDs: implementation IR-004 (code `7296a698d6`); code review CRR-005; DEC-118.
- Why recorded: the rerun after the fixes.
- Coverage decisions or durable test paths changed: `sandbox-live.e2e.test.ts` SBX-04 now also asserts `transcriptsKept` after destroy (F-2's point: transcripts outlive the sandbox).
- Cases rerun:
  - API-R01, API-R03b.
  - API-L01..L08: runs 5 and 6, both 8/8.
  - API-L10: first run.
  - API-L11.
  - API-R10: the § 4 layout now holds.
- Still valid by impact: API-R02, R04, R05, R06, R07, R09, L09. Reasons are in the investigation's Round 2 Rerun Plan.
- Commands, environment, fixture, or broader-validation delta: new image `autobyteus-server:581-api-e2e-r2` (`9c9ccab82f1b`) from `7296a698d6`; the host `dist` rebuilt from it.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-1: intermittent `SANDBOX_START_FAILED: … fetch failed` (4 of ~15 creates in round 1) | Local Fix (implementation) | Fixed: `connect` waits for `/rest/health` before the single exchange. 18 of 18 creates in runs 5 and 6; at round 1's rate, 0 failures in 18 has ~0.6% chance | API-L01, API-L07 (SBX-01, SBX-05..08 creates), API-R03b (`sandbox-pairing.test.ts`) |
| F-2: run memory not on the host (`"tree": []`) | Local Fix (implementation) | Fixed: `runMemoryFolder` bound at `<data>/memory`. Every run's `agents/<runId>/raw_traces_active.jsonl` is on the host and kept after destroy; the evaluator read them | API-L02, API-L03 (`transcriptsKept: true`), API-L10 |

- Canonical artifacts and sections updated: `api-e2e-execution-coverage-report.md` (rewritten for round 2), `api-e2e-coverage-investigation.md` (round meta, Round 2 Rerun Plan), `api-e2e-test-progress.md`, `evidence/API-R10-skill-vs-tool-contracts.log` (round 2 line).
- Prior result and confidence: Fail, 83%.
- Current result and confidence: **Pass, 95%**.
- New or remaining failure IDs: none.
- Recommended owner: `/code_reviewer`, for proportional test-code review.
- Remaining risks, blocked evidence, or untested scope:
  - AC-005 live is user-only (DEC-118, API-L12).
  - Doc notes D-1, D-2 and the C8 mount line.
