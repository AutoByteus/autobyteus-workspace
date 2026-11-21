# API/E2E Test Review Report — cross-node-file-transfer-587 (autobyteus-587)

## Review Meta

- Review Round: 1
- Trigger: API/E2E round 1 (API-REV-001) Pass. Tests in `eaf53c5c7b`; documents and evidence in `839c8937e5`. Code under test: `e327ba2467`.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (REQ-001 … REQ-009, AC-001 … AC-011)
- Investigation Notes Reviewed As Context: not reopened
- Solution Revision Record Reviewed As Context: not reopened (SR-009)
- Design Spec Reviewed As Context: `design-spec.md` (DS-001 … DS-005)
- Supplemental Task Artifacts Reviewed As Context: `reference-files-contract.md` (RFC-001: RF-14, § 5 texts)
- Architecture Review Revision Record Reviewed As Context: N/A for this review
- Implementation Revision Record Reviewed As Context: IR-001
- Original Code Review Report: `code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass, final confidence 95%. API-07 (gated contract stories) is red, attributed to FU-002.
- Prior unresolved test-review findings rechecked: None (first test review)
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
| No stale, duplicated, disabled or compatibility-only tests | **Fail** | T-001: the contract stories' driver now sends S18/S19 with `node`, but the stories' authority (the 461 model) still describes and admits those calls without `node`. RF-14 replaced that rule. Every other old-rule assertion (RC-06, 08, 19, 22; the 37 sends) was rewritten to RF-14, not loosened |
| Coverage agrees with the investigation and evidence | Pass | API-06 54/54; API-04 after the fixes; API-05 574/574 |
| Callers exercise an independently established scenario | Pass | Every case maps to an AC/RF. The forged and tampered requests stand for the security contract (RF-12, NA-9) |
| Real triggers and steps | Pass | Agents call the real tools on built servers; history deletes go through the app's mutation; the link failure and damage are made in a forwarding proxy on the real path |

## Findings

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| T-001 | `collaboration-contract-stories.e2e.test.ts` S18/S19 and their authority, `tickets/done/delegated-copies-outlive-delegator-461/evidence/collaboration-model/{model.py,stories.py}` and `tests/fixtures/collaboration-contract/contract-states.json` | Three facts disagree. `model.py:367` `send_by_run_id(sender, receiver, …)` takes no node, and its cross-node branch admits a linked message without one. `stories.py:143, :148`: S18/S19's call is `send_message_to(target_agent_run_id: "project_task_manager_7c8d", …)` by `lead_0c11` on node B, with no `node`. The driver now sends `node: "node-a"`. So the suite drives a different call than the contract's executable model describes and expects. The model, which `export_contract_states.py` names as the contract's authority, still states the CM-11 rule RF-14 replaced (REQ-009, DEC-006, AC-010). This is the same class as autobyteus-492 CR-001: a contract rule changed by the ticket must be stated by its executable model (that ruling holds). | Update the model to RF-14: a message to a run on another node without `node` is refused `NODE_REQUIRED` naming that node, and with another node's name `NODE_MISMATCH` (the code's texts, `remote-refusal-codes.ts`). Give `send_by_run_id` a `node` argument; pass `node` in S18/S19's operations and call texts. Regenerate the fixture and run `export_contract_states.py … --check`. Record a probe of the model (no node, wrong node, right node), as 492's IMP-08 did. No new story step is required. The gated suite stays red for FU-002 until that is fixed, so record the check and probe as this fix's evidence | `Local Fix` — API/E2E engineer (the fixture's authority and its stories) |

## Follow-ups

- **FU-003 (OBS-1):** a piece damaged in transit is refused by the gate (401), and `PeerClient` maps every 401 to "This node and node … are not paired … pair them again". The agent is told to re-pair for a transfer error. The mapping is older than this ticket (autobyteus-437) and gives the same text for any request body damaged in transit. AC-003's observables (the file named, nothing delivered) pass. Not urgent.
- **FU-004 (OBS-2):** after a peer is removed, a reply without `node` is refused `NODE_REQUIRED` naming the raw node ID (`srv_…`), because `peerName` falls back to the ID. Introduced by this change. Impact is low: nothing can be sent to an unpaired node either way, and passing that ID gets the correct "not registered" refusal on the next call. Recorded as a follow-up rather than reopening implementation, since everything the ticket delivers works. The Solution Designer may pull it into this ticket. Not urgent.
- FU-002 (recorded by API/E2E, urgent): the gated contract stories are red since autobyteus-565 wrote `counterpart` on log lines. **My own miss:** my autobyteus-565 test review (CRR-002 there) passed without noticing that its API/E2E round did not run this gated suite. 565 changed exactly what the suite compares (the bytes of the log lines).

## Latest Authoritative Result

- Result: `Fail`
- Changed durable test paths reviewed: the seven paths above
- Unresolved finding IDs: T-001
- Recommended Recipient: API/E2E engineer (`Local Fix`). After the fix: API/E2E reruns the affected checks (fixture `--check`, the model probe; the gated suite once FU-002 allows), then this review again.
- Notes: the file-transfer cases themselves are strong. They prove the security boundary on real servers: the gate's hash on raw pieces, the 8 MiB limit, tampering, oversize, workspace containment, read-only hard links, resume, dedup and the 24 h cleanup.
