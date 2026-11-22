# API/E2E Revision Record — cross-node-file-transfer-587 (autobyteus-587)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001 Pass, round 1 | SR-008/SR-009, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95% |
| API-REV-002 | Code reviewer, `api-e2e-test-review-report.md` CRR-002 Fail (T-001), round 2 | CRR-002 | Pass / 95% | Pass / 95% |
| API-REV-003 | Code reviewer, `code-review-report.md` CRR-004 Pass of IR-002 (delivery DEL-03), round 3 | DEL-03, IR-002, CRR-004 | Pass / 95% | Pass / 95% |
| API-REV-004 | Code reviewer, `code-review-report.md` CRR-006 Pass of IR-003 (merge with autobyteus-22), round 4 | IR-003, CRR-006 | Pass / 95% | Pass / 95% |
| API-REV-005 | Code reviewer, `code-review-report.md` CRR-011 Pass at IR-007, round 5 | IR-004 … IR-007, CRR-008 … CRR-011 (CR-587-05) | Pass / 95% | Pass / 96% |

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

### API-REV-003 — Round 3: IR-002's stale unit tests, and the merged base

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-004 Pass of IR-002), round 3.
- Triggering finding or case IDs: delivery's DEL-03 (`release-deployment-report.md`): after the merge of `origin/personal` (`3be417f8df`), the whole server unit suite had ten failures in three files that construct owners without this ticket's new required inputs. IR-002 (`e295b74b81`) fixed them.
- Related revision IDs: DEL-01 … DEL-03, IR-002, CRR-004.
- Why recorded: the merged base and an implementation-owned test fix both return through API/E2E.
- Coverage decisions or durable test paths changed:
  - none by API/E2E in the test suites. IR-002's three unit files and two `AgentTeamRunManager` constructions go to the code reviewer for test-code review.
  - TESTING.md § Choosing the path gains a row, the check that would have caught DEL-03 at this stage: when a change adds a required input to a server owner that tests construct directly, run the whole unit suite and the whole `test:integration`, and search for the owner's constructions.
- Cases added, changed, removed, or rechecked: the rerun plan is in the execution report's Round section.
  - Rerun on `008981c6bd`: API-04, API-05, API-08, API-10.
  - Reused: IMP-06 (the whole unit suite), DEL-01 (typechecks), DEL-02 (two-server 54/54).
  - Still valid: API-09, API-11. API-07 not rerun (FU-002).
- Commands, environment, fixture, or broader-validation delta: server rebuilt before the reruns; `env -i` with fresh homes.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| DEL-03: ten stale unit tests (delivery) | Local Fix (implementation) | IR-002; the whole unit suite passes (IMP-06); the API/E2E gap (round 1 reused an affected-set unit run) is closed by the TESTING.md row | IMP-06, API-04, API-05 |

- Canonical artifacts and sections updated: the execution report (Round, Latest Result), `api-e2e-test-progress.md`, `evidence/API-R3/`, `TESTING.md`.
- Prior result and confidence: Pass / 95%.
- Current result and confidence: Pass / 95%.
- New or remaining failure IDs: none. API-07 is red only because of FU-002.
- Recommended owner: code reviewer (test-code review of IR-002's files), then delivery.
- Remaining risks, blocked evidence, or untested scope: as API-REV-001. OBS-1 and OBS-2 are now FU-003 and FU-004.

### API-REV-004 — Round 4: the merge with autobyteus-22

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-006 Pass of IR-003), round 4; code `575c4ec9ed`.
- Triggering finding or case IDs: IR-003, the merge of `origin/personal` `6533d7be04` (autobyteus-22).
- Related revision IDs: IR-003, CRR-006.
- Why recorded: an implementation-owned merge returns through API/E2E.
- Coverage decisions or durable test paths changed:
  - `remote-delegation-two-server.e2e.test.ts`: autobyteus-22's merged `RC-51` collided with this ticket's `RC-51` (same test ID, same receipt key). This ticket's RC-51 … RC-54 are renumbered RC-55 … RC-58. The base's RC-51 keeps its number, because autobyteus-22's archived records name it.
- Cases added, changed, removed, or rechecked: all Rerun (the contract packages and `typecheck-baseline.json` changed), except the unit suite and the typechecks, which were reused from IMP-11/IMP-10 on the same code. API-12 (fresh start) and API-13 (autobyteus-22's gated Team suite) were added. The plan is in the execution report's Round section.
- Commands, environment, fixture, or broader-validation delta: two lanes, server suites in sequence; a temporary fresh clone of the base `6533d7be04` to compare TF-04 (removed after).

#### Prior Failure Resolution

None for this ticket.

- Canonical artifacts and sections updated: the execution report (Round, Latest Result), `api-e2e-test-progress.md`, `follow-ups.md` (FU-005, FU-006), `evidence/API-R4/`.
- Prior result and confidence: Pass / 95%.
- Current result and confidence: Pass / 95%.
- New or remaining failure IDs: none for this ticket. On the base: FU-005 (TF-04), and FU-002/FU-006 (contract stories).
- Recommended owner: code reviewer (test-code review), then delivery. The Solution Designer routes FU-005 and FU-006.
- Remaining risks, blocked evidence, or untested scope: as API-REV-001. §5.1's cross-node steps are not reached while FU-006 stands; RF-14 is proven on the merged code by the two-server suite.

### API-REV-005 — Round 5: the contract model complete (CR-587-05), AC-012 and the node path's order over real HTTP

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-011 Pass, a full re-audit at IR-007), round 5; code `11b7ed5444`, HEAD `05ffe64554`.
- Triggering finding or case IDs: CR-587-05 (`Local Fix`, API/E2E); AC-012 (DEC-009) over real HTTP; IR-005's behaviour changes (R1 order, `NODE_NOT_PAIRED`, the in-transit wording).
- Related revision IDs: IR-004 … IR-007, SR-010 … SR-012, CRR-008 … CRR-011.
- Why recorded: new behaviour and a merge since round 4.
- Coverage decisions or durable test paths changed:
  - **The 461 model** (`model.py`, `stories.py`) now states autobyteus-565's `counterpart`, autobyteus-22's `copiedFrom`, IR-005's no-node rule (no `node`: `NODE_REQUIRED` for any run the sender's node knows on a peer), autobyteus-591's assigner continuation across nodes, and DEC-009's S25 (a saved Task to a new peer copy, then stopped on node B, so S26/S27 keep their meaning). `contract-states.json` is regenerated. Before the change, one run that continued past differences listed every server difference, and each is one the model now states (API-07a).
  - **Two-server suite:** RC-60 (AC-012), RC-61 (R1) new; RC-19, RC-57 tightened; RC-23's title.
  - **Stale tests rewritten:** the stories' S25 driver, CPW M-26, MSP-93.
- Cases added, changed, removed, or rechecked:
  - every case Rerun (shared foundations changed);
  - reused: IMP-29 (whole unit) and IMP-28 (typechecks), on the same code;
  - new: RC-60, RC-61, API-07a, API-11b.
- Commands, environment, fixture, or broader-validation delta: two lanes, server suites in sequence; a fourth node (kappa) paired with alpha for `NODE_MISMATCH` on the existing-copy form; the proxy's `tamper` on a message body for the reopen-then-refused branch.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| FU-002, FU-006 (contract stories red since 565 and 22) | follow-ups, then CR-587-05 in this ticket | the model states both fields; the stories pass | API-07, API-11b |
| CR-587-05 | Local Fix (API/E2E) | done | API-07, API-11b |

- Canonical artifacts and sections updated: the coverage investigation (Round 5), the execution report (Round, AC-012, Durable Coverage, Result), `api-e2e-test-progress.md`, `evidence/API-R5/`.
- Prior result and confidence: Pass / 95%.
- Current result and confidence: Pass / 96% (AC-012 and the R1 order now over real HTTP; the contract stories prove this ticket's steps).
- New or remaining failure IDs: none for this ticket. FU-005 (autobyteus-22's TF-04) is still red on the base.
- Recommended owner: code reviewer (test-code review), then delivery.
- Remaining risks:
  - as API-REV-001;
  - a refused message after a reopen still names the older 401 reason ("not paired") when its body was damaged in transit (RC-61; FU-003's class, the generic mapping);
  - DEC-010 (c) accepted.
