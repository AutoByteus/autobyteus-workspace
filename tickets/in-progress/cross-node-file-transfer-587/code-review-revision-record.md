# Code Review Revision Record — cross-node-file-transfer-587 (autobyteus-587)

The latest `code-review-report.md` is authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001, `e327ba2467`) | N/A | Pass | None |
| CRR-002 | `api-e2e-test-review-report.md` | Proportional test-code review after API/E2E Pass (API-REV-001, `eaf53c5c7b`) | N/A (first test review) | Fail (Local Fix, API/E2E) | T-001 |
| CRR-003 | `api-e2e-test-review-report.md` | Test-code review round 2 (API-REV-002, `71be9e9e8e`) | Fail (Local Fix, API/E2E) | Pass | T-001 (resolved) |
| CRR-004 | `code-review-report.md` | Implementation Review, round 2 (IR-002, delivery DEL-03, `e295b74b81`) | Pass (CRR-001) | Pass | None |
| CRR-005 | `api-e2e-test-review-report.md` | Test-code review round 3 (API-REV-003, IR-002 test files) | Pass (CRR-003) | Pass | None |
| CRR-006 | `code-review-report.md` | Implementation Review, round 3 (IR-003, merge with autobyteus-22, `575c4ec9ed`) | Pass (CRR-004) | Pass | None |

## Revision Entries

### CRR-001 — Initial source review of IR-001

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-file-transfer-587/tickets/in-progress/cross-node-file-transfer-587/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: SR-005 … SR-009
- Relevant architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Pass
- What changed in the review result and why: first result. RFC-001 RF-1 … RF-14 are traced through both nodes. The security boundary holds on both sides:
  - sender: workspace containment after resolving links, regular files only, one handle;
  - receiver: the gate's raw-stream hash, the 8 MiB bound, size and SHA-256 at completion, and placement confined to cleaned names inside the agent's folder.

  The receive order is plan → reserve → place → commit. Deviations D-1 … D-6 and the Principle 16 note hold. Eleven candidates were judged; none promoted.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: N/A (9.4/10; every category ≥ 9.3)
- Recommended recipient: API/E2E engineer (primary); implementation engineer (informational)
- Remaining risks or uncertainty:
  - real HTTP signing of raw pieces, to prove in the two-server E2E;
  - AC-007 timing under the 24 h sweep rule;
  - the realpath-then-open window;
  - a hostile paired peer (outside the threat model);
  - the 1 h tool limit on every Agent Tools call;
  - AC-002 wording.

### CRR-002 — Proportional review of the API/E2E test changes

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-file-transfer-587/tickets/in-progress/cross-node-file-transfer-587/api-e2e-test-review-report.md`
- Review entry point and round: successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-001); RC-51 … RC-54, RC-06/08/09/19/20/22, the contract stories S18/S19, the integration updates, MSP-08
- Relevant solution revision IDs: SR-009
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A for test review (source review CRR-001 Pass)
- Current authoritative result: Fail (`Local Fix`, API/E2E)
- What changed in the review result and why: the file-transfer cases are strong and real-trigger. T-001: the contract stories' authority (the 461 model and its S18/S19 stories) still admits and describes a cross-node message without `node`, while the driver now passes `node`. RF-14 replaced that rule, and per the autobyteus-492 CR-001 ruling the contract's executable model must state the approved rule. OBS-1 and OBS-2 are recorded as FU-003 and FU-004. My own miss in autobyteus-565 (the gated contract stories not run, now FU-002) is stated in the report.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: T-001; follow-ups FU-003, FU-004
- Material score or classification changes: N/A
- Recommended recipient: API/E2E engineer
- Remaining risks or uncertainty: the gated suite stays red for FU-002 (565) until that is fixed; the AGY/Grok/ACP limits (FU-001); the narrow placement race.

### CRR-003 — Test-code review round 2: T-001 resolved

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-file-transfer-587/tickets/in-progress/cross-node-file-transfer-587/api-e2e-test-review-report.md`
- Review entry point and round: successful API/E2E test-code review, round 2
- Review scope: `N/A` (test review); the delta is `ed6c8b4c01..71be9e9e8e` (the model, the stories, the fixture, evidence)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, API-REV-002; T-001
- Relevant solution revision IDs: SR-009
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (Local Fix, API/E2E), CRR-002
- Current authoritative result: Pass
- What changed in the review result and why: the contract model states RF-14 in the server's order, with the server's texts, and S18/S19 pass `node`. The fixture changes only those call texts.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| T-001 | Open (Local Fix, API/E2E) | Resolved | API-REV-002, `71be9e9e8e` | `model.py` `_node_rule`; `stories.py` S18/S19 with `node`. My `--check` rerun reports "matches the model". The probe (`evidence/API-11/API-11-model-rf14.log`) rows match the server paths traced in CRR-001. The §5.1 rerun differs only by FU-002 |

- New or remaining finding IDs: None; follow-ups FU-001 … FU-004
- Material score or classification changes: N/A
- Recommended recipient: delivery engineer
- Remaining risks or uncertainty: the gated contract stories stay red for FU-002 (565, urgent); FU-001 (AGY/Grok/ACP limits); FU-003, FU-004 wording; the narrow placement race; the AC-007 timing under the 24 h rule; AC-002's wording.

### CRR-004 — Source review round 2: IR-002 (delivery DEL-03 stale test constructions)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-file-transfer-587/tickets/in-progress/cross-node-file-transfer-587/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. `ef53fadd52..e295b74b81` changes six test files only; delivery's merge brought `src` files that do not intersect this ticket's.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, IR-002; delivery's `release-deployment-report.md` § Escalation / Reroute (DEL-03 items 1–3)
- Relevant solution revision IDs: SR-009
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001, IR-002
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: none recorded yet (DEL-03 in the release report)
- Prior authoritative result: Pass (CRR-001; test review CRR-003)
- Current authoritative result: Pass
- What changed in the review result and why: stale constructions now get the explicit no-peer collaborators. The standalone-host test gained stronger assertions (one shared `remoteFiles`; `receivedFiles` is its `received` part). The whole server unit suite passes (IMP-06). My CRR-001 gap is recorded in the report: I accepted an affected-set unit run for a change that made constructor inputs required.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None (no finding was open; DEL-03 was raised by delivery).

- New or remaining finding IDs: None
- Material score or classification changes: N/A
- Recommended recipient: API/E2E engineer; then the test-code review; then delivery, which asked for the package back
- Remaining risks or uncertainty: as CRR-001 and CRR-003; delivery's proposed `TESTING.md` check is for the guide's owner.

### CRR-005 — Test-code review round 3: IR-002's test files on the merged base

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-file-transfer-587/tickets/in-progress/cross-node-file-transfer-587/api-e2e-test-review-report.md`
- Review entry point and round: successful API/E2E test-code review, round 3
- Review scope: `N/A` (test review); IR-002's six test files (`e295b74b81`); round 3 itself changed only documents and one `TESTING.md` row
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, API-REV-003
- Relevant solution revision IDs: SR-009
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-003
- Relevant delivery revision IDs: none recorded yet (DEL-03 in the release report)
- Prior authoritative result: Pass (CRR-003)
- Current authoritative result: Pass
- What changed in the review result and why: the stale constructions now pass the explicit no-peer collaborators. The host test is stronger (shared `remoteFiles` identity). Whole suites pass on the merged base. A wording nit in the new `TESTING.md` row was noted for its owner.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: N/A
- Recommended recipient: delivery engineer
- Remaining risks or uncertainty: FU-002 (urgent, 565) keeps the gated contract stories red; FU-001, FU-003, FU-004 open.

### CRR-006 — Source review round 3: IR-003, merge with autobyteus-22

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-file-transfer-587/tickets/in-progress/cross-node-file-transfer-587/code-review-report.md`
- Review entry point and round: Implementation Review, round 3
- Review scope: `Targeted Delta Review` of merge `575c4ec9ed`: the production conflict resolutions (`--cc`) and each point where the two tickets meet
- Triggering role, report path, and finding or scenario IDs: implementation engineer, IR-003; `release-deployment-report.md` § Delivery Round 2
- Relevant solution revision IDs: SR-009
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-003
- Relevant delivery revision IDs: none recorded yet
- Prior authoritative result: Pass (CRR-004)
- Current authoritative result: Pass
- What changed in the review result and why: both tickets' behavior is kept:
  - RF-14 still answered by the root (`ownsAgentRun` ⊇ `hasAgentExecution` ⊇ remote links);
  - the receiver checked current before any files are planned;
  - the D-6 locator still passed;
  - `root-team-run.ts` 477 lines.

  IMP-10 … IMP-13 pass on the merge.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: N/A
- Recommended recipient: API/E2E engineer; then the test-code review; then delivery
- Remaining risks or uncertainty: as CRR-001; FU-001 … FU-004 open.
