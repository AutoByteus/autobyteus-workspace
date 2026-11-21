# API/E2E Revision Record — cross-node-file-transfer-587 (autobyteus-587)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001 Pass, round 1 | SR-008/SR-009, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95% |
| API-REV-002 | Code reviewer, `api-e2e-test-review-report.md` CRR-002 Fail (T-001), round 2 | CRR-002 | Pass / 95% | Pass / 95% |

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

### API-REV-002 — T-001: the contract stories' authority states RF-14

- Triggering role, report path, and round: code reviewer, `api-e2e-test-review-report.md` (CRR-002 Fail), round 2.
- Triggering finding or case IDs: T-001 (`Local Fix`, API/E2E). S18/S19's driver sent `node`, but the 461 model still stated CM-11: it admitted a linked cross-node message without `node`.
- Related revision IDs: CRR-002; the precedent is autobyteus-492 CR-001 / IMP-08.
- Why recorded: rework after a test-code review finding.
- Coverage decisions or durable test paths changed:
  - `tickets/done/delegated-copies-outlive-delegator-461/evidence/collaboration-model/model.py`: `send_by_run_id(…, node=None)` and `_node_rule`, following the server's order:
    - a wrong node gets `NODE_MISMATCH`;
    - without node, the sender's own linking root gets `NODE_REQUIRED`;
    - without node, a run whose entries this node holds gets `CLOSED` if they are all closed, else `NODE_REQUIRED`;
    - the texts are those of `remote-refusal-codes.ts`.
  - `stories.py`: S18/S19 pass `node: "node-a"`.
  - `contract-states.json` is regenerated (call texts only).
- Cases added, changed, removed, or rechecked: API-11 added (fixture `--check`, walkthrough, model probe); API-07 §5.1 rerun.
- Commands, environment, fixture, or broader-validation delta: Python model commands; the gated §5.1 on built servers.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| T-001 (CRR-002) | Local Fix (API/E2E) | The model and stories state RF-14; the fixture matches; the probe shows no node → `NODE_REQUIRED`, wrong node → `NODE_MISMATCH`, right node → delivered (or `CLOSED` after S19) | API-11, API-07 |

- Canonical artifacts and sections updated: the execution report (Round, Cases API-11, Durable Coverage, Result), `api-e2e-test-progress.md`, `evidence/API-11/`.
- Prior result and confidence: Pass / 95%.
- Current result and confidence: Pass / 95%.
- New or remaining failure IDs: none for this ticket. API-07 stays red only because of FU-002.
- Recommended owner: code reviewer (test-code review again).
- Remaining risks, blocked evidence, or untested scope: as API-REV-001. OBS-1 and OBS-2 are now FU-003 and FU-004.
