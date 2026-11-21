# API/E2E Revision Record — cross-node-file-transfer-587 (autobyteus-587)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001 Pass, round 1 | SR-008/SR-009, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: file transfer between two and three built servers; RF-14 and the files wire in existing suites

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-001, no findings), round 1, code `e327ba2467`.
- Triggering finding or case IDs: none (baseline); cases API-01 … API-10.
- Related revision IDs: SR-008/SR-009, ARCH-REV-002, IR-001, CRR-001.
- Why recorded: first completed API/E2E result.
- Coverage decisions or durable test paths changed (commit `eaf53c5c7b`):
  - two-server suite: RC-51 … RC-54 added; 37 cross-node sends name their node; RC-06, RC-08, RC-19 and RC-22 assert the RF-14 refusals; RC-09 asserts the RF-3 refusals; the RC-20 audit covers pieces and the status route; forged bodies carry `files`; the capturing proxy forwards raw bytes and can tamper;
  - node-access-model, contract stories S18/S19, mobile-shell MSP-08: updated for the files wire and RF-14;
  - three integration files updated: Team manager `remoteFiles`, Claude `timeout`, the node description.
- Cases added, changed, removed, or rechecked: API-01 (reused), API-02, API-04 … API-10.
- Commands, environment, fixture, or broader-validation delta: built servers with `env -i`; a third node (theta) for `NODE_MISMATCH`; files of random bytes behind real format headers.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `follow-ups.md` (FU-002), `evidence/API-*`.
- Prior result and confidence: N/A.
- Current result and confidence: Pass, 95%.
- New or remaining failure IDs: none for this ticket. API-07 fails because of 565's `counterpart` (FU-002, urgent), not because of 587.
- Recommended owner: code reviewer (test-code review).
- Remaining risks, blocked evidence, or untested scope:
  - AC-009 on AGY/Grok/ACP (DEC-008, FU-001);
  - OBS-1 (a damaged piece reported as "not paired");
  - OBS-2 (`NODE_REQUIRED` after peer removal names the raw node ID);
  - the narrow race noted at review;
  - no 300 MB run;
  - Memory Hub export proven by unit only.
