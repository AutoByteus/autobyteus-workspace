# API/E2E Test Review Report — cross-node-file-transfer-587 (autobyteus-587)

## Review Meta

- Review Round: 2
- Trigger: API-REV-002 (T-001 fixed in `71be9e9e8e`, no product source change); round 1 reviewed API-REV-001 (tests `eaf53c5c7b`, documents `839c8937e5`). Code under test: `e327ba2467`.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (REQ-001 … REQ-009, AC-001 … AC-011)
- Investigation Notes Reviewed As Context: not reopened
- Solution Revision Record Reviewed As Context: not reopened (SR-009)
- Design Spec Reviewed As Context: `design-spec.md` (DS-001 … DS-005)
- Supplemental Task Artifacts Reviewed As Context: `reference-files-contract.md` (RFC-001: RF-14, § 5 texts)
- Architecture Review Revision Record Reviewed As Context: N/A for this review
- Implementation Revision Record Reviewed As Context: IR-001
- Original Code Review Report: `code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass, final confidence 95%. API-07 (gated contract stories) is red, attributed to FU-002.
- Prior unresolved test-review findings rechecked: T-001 (resolved, below)
- Project testing guideline(s) applied: `TESTING.md` (Server E2E on built servers, clean `env -i`, test-owned data roots, gated runtime suites). Conflicts: none.
- Supported Product Scenario Basis Confirmed: `Yes` (UC-001 … UC-004, SEC-1, SEC-2, RF-14 as in CRR-001)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Updated (+RC-51 … RC-54; RC-06, 08, 09, 19, 20, 22 updated; 37 sends name their node; `CapturingProxy` raw forwarding and `tamper`) | AC-001 … AC-007, AC-010, RF-3, RF-7, RF-10 … RF-12, RF-14 | Remote collaboration between real servers | A third node (theta) for `NODE_MISMATCH` |
| `autobyteus-server-ts/tests/e2e/node-access/node-access-model.e2e.test.ts` | Updated | Wire (`files`) | Node access gate | Body valid for the gate to judge credentials |
| `autobyteus-server-ts/tests/e2e/projects/collaboration-contract-stories.e2e.test.ts` | Updated (S18/S19 drivers pass `node: "node-a"`) | RF-14 against the 461 contract stories | Contract stories on the built server | See T-001 |
| `autobyteus-server-ts/tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts` | Updated | D-6 wiring | Team manager | `remoteChannel`, `remoteFiles` given |
| `autobyteus-server-ts/tests/integration/agent-execution/claude-session-manager.integration.test.ts` | Updated | RF-6 / DEC-008 | Claude MCP config | `timeout: 3_600_000` |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Updated | RF-14 wording | MCP schema | — |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated | RF-14 | Phone shell | MSP-08's send names its node |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | RC titles name the AC/RF they prove; old titles were rewritten to the new rule |
| Assertions prove approved requirements | Pass | Most claims are checked against real artifacts: the wire order (status → PUT pieces → start → work packet); read-only hard links (`nlink`, same inode as the store, SHA-256); the gate's 401/413 for unsigned, wrong-secret, tampered and oversize pieces; `REFERENCE_FILE_CHECK_FAILED` for mismatched content; the exact `TOO_LARGE` text; resume offsets `[8 MiB, 16 MiB]`; one upload for two runs; `nlink` after each history delete; the cleanup after the 24 h rule. One weak spot: RC-52's in-transit case accepts either `TRANSFER_FAILED` or `CHECK_FAILED`, where the path (the gate's 401) is deterministic. It still proves AC-003's observables (the file named, nothing delivered); see OBS-1 |
| Fixtures, setup, helpers reuse repetition | Pass | `writeBinary`, `putPiece`, `storeEntry`, file facts; the proxy's `tamper`/`drop` hooks |
| Isolation and determinism | Pass | Test-owned servers and data. The 24 h rule is reached by setting the clocks of test-owned store files back 25 h, the only way to show elapsed time. The setting is restored in `finally`. Theta is torn down |
| Large files coherent and navigable | Pass | One surface |
| No stale, duplicated, disabled or compatibility-only tests | Pass | Round 2: T-001 resolved; the 461 model and its S18/S19 stories state RF-14. Every other old-rule assertion (RC-06, 08, 19, 22; the 37 sends) was rewritten to RF-14, not loosened |
| Coverage agrees with the investigation and evidence | Pass | API-06 54/54; API-04 after the fixes; API-05 574/574 |
| Callers exercise an independently established scenario | Pass | Every case maps to an AC/RF. The forged and tampered requests stand for the security contract (RF-12, NA-9) |
| Real triggers and steps | Pass | Agents call the real tools on built servers; history deletes go through the app's mutation; the link failure and damage are made in a forwarding proxy on the real path |

## Findings

None open.

### T-001 — Resolved (round 2, `71be9e9e8e`)

- `model.py`: `send_by_run_id(…, node=None)` runs `_node_rule` before admission, in the order I traced in the code at CRR-001:
  - a wrong `node`: `NODE_MISMATCH`;
  - no `node`, and the sender's own root links the run (its newest Task entry, open or closed, or the sender's peer `delegatedFrom`): `NODE_REQUIRED` (`deliverExact`);
  - no `node`, and only this node's Task entries name the run: `CLOSED` when they are all closed, else `NODE_REQUIRED` (`peerRunAdmission`);
  - otherwise not running.

  With the right `node`, the existing `_admit` follows. The texts match `remote-refusal-codes.ts` (`nodeRequired`, `nodeMismatch`) word for word.
- `stories.py`: S18 and S19 pass `node: "node-a"` in their operations and call texts. The fixture changes only those two call texts; every state is unchanged.
- Verified:
  - my own rerun of `export_contract_states.py … --check`: "matches the model";
  - the probe log `evidence/API-11/API-11-model-rf14.log`. Its rows after S18 and S19 agree with the server's paths as traced in CRR-001, e.g. a fenced run messaged with another node's name by a run of A is `NODE_MISMATCH` before `CLOSED`, as `peerRunAdmission` orders them;
  - §5.1 rerun: S18's whole difference is FU-002's `counterpart` lines.
- Cosmetic only, not a finding: `SAVED_TASK_TO_PEER ="…"` lost its space in `model.py`.

Observation kept, not a finding: RC-52's in-transit case accepts either of two codes where the path is deterministic. It proves AC-003; tightening it needs no further run unless the wording of FU-003 changes.

## Follow-ups

- **FU-003 (OBS-1):** a piece damaged in transit is refused by the gate (401), and `PeerClient` maps every 401 to "This node and node … are not paired … pair them again". The agent is told to re-pair for a transfer error. The mapping is older than this ticket (autobyteus-437) and gives the same text for any request body damaged in transit. AC-003's observables (the file named, nothing delivered) pass. Not urgent.
- **FU-004 (OBS-2):** after a peer is removed, a reply without `node` is refused `NODE_REQUIRED` naming the raw node ID (`srv_…`), because `peerName` falls back to the ID. Introduced by this change. Impact is low: nothing can be sent to an unpaired node either way, and passing that ID gets the correct "not registered" refusal on the next call. Recorded as a follow-up rather than reopening implementation, since everything the ticket delivers works. The Solution Designer may pull it into this ticket. Not urgent.
- FU-002 (recorded by API/E2E, urgent): the gated contract stories are red since autobyteus-565 wrote `counterpart` on log lines. **My own miss:** my autobyteus-565 test review (CRR-002 there) passed without noticing that its API/E2E round did not run this gated suite. 565 changed exactly what the suite compares (the bytes of the log lines).

## Latest Authoritative Result

- Result: `Pass` (round 2, CRR-003)
- Changed durable test paths reviewed: the seven paths above, plus round 2's `model.py`, `stories.py` and `contract-states.json`
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes:
  - The file-transfer cases prove the security boundary on real servers: the gate's hash on raw pieces, the 8 MiB limit, tampering, oversize, workspace containment, read-only hard links, resume, dedup and the 24 h cleanup.
  - The gated contract-stories suite remains red only for FU-002 (autobyteus-565's `counterpart`, urgent), outside this ticket.
  - FU-003 and FU-004 are recorded follow-ups.
