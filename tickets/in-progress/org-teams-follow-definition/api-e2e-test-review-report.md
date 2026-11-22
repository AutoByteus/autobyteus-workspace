# API/E2E Test Review Report

## Review Meta

- Review Round: 1 (proportional test-code review after API/E2E pass)
- Trigger: API/E2E round 3 (API-REV-003) passed on IR-005 (`cfc4bc67f2`); review requested by the API/E2E engineer (commit `31aebf5dbf`)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-015; REQ-001..REQ-009, AC-001..AC-008, DEC-001..DEC-007)
- Investigation Notes Reviewed As Context: through the design's citations
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (through SR-015)
- Design Spec Reviewed As Context: `design-spec.md` (through § SR-015 Revision)
- Supplemental Task Artifacts Reviewed As Context: `org-container-storage-contract.md`, `follow-ups.md`
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-010)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001..IR-005)
- Original Code Review Report: `code-review-report.md` (CRR-007, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-008`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001..API-REV-003)
- Delivery Revision Record Reviewed As Context (delivery re-entry only): N/A
- API/E2E Result: Pass (API-REV-003)
- Final Validation Confidence: 95% (no category below 90%)
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline(s) applied (from the coverage investigation): root `TESTING.md` (built server per suite, scripted AGY CLI, clean environment, file-event waits from `os-latency-under-load.ts`, live gates and the test vault, never the user's app or data) and `autobyteus-server-ts/AGENTS.md`. No conflicts or discrepancies found.
- Supported Product Scenario Basis Confirmed: `Yes`. Every case maps to an approved AC/REQ/DEC; the triggers are the product's own (package files edited on disk, GraphQL, the Org view WebSocket, agent tool calls).

## Changed Durable Test Scope

| Durable Test Path | Change (`Added`/`Updated`/`Removed`) | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-org-runs/org-container-package.e2e.test.ts` | Added (round 1), updated (round 2: OC-04 DEC-007 assertion, OC-12, OC-13) | AC-001..AC-008, REQ-001..REQ-009, DEC-005..DEC-007, S-09; CRR-004 F-1/F-4, CRR-006 F-5 | An Org from a package on the built server, its definitions edited on disk: two suites (the live Org's lifecycle; a converted released Org) | 729 lines, two `describe` blocks with ordered cases on one Org run (documented in the header); navigable |
| `autobyteus-server-ts/tests/e2e/runtime/org-container-live.e2e.test.ts` | Added | AC-003 (OCL-01), AC-002 (OCL-02) | Real Codex and AutoByteus units in one Org | Live-gated (`RUN_CODEX_E2E`, `RUN_AUTOBYTEUS_ORG_CONTAINER_E2E`, test vault); OCL-02's Team-stream capture is diagnostic only and asserts nothing |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Updated | AC-007 (RC-56); contract §6 (RC-07, RC-13); RC-20 route list; RC-12 diagnostics | Two-node collaboration | RC-07/RC-13 follow the intended change (delegations from unit runs; no link names the container); RC-20 adds the one new signed route |
| `autobyteus-server-ts/tests/e2e/agent-org-runs/stopped-org-workspace-graphql.e2e.test.ts` | Updated | REQ-006 (stopped Org settings) | Stopped-Org settings over real GraphQL | The stored-shape check now reads the container plus the unit files (the intended storage change); refused saves leave unit bytes unchanged; the sibling unit is untouched |

- No durable test file changed: `No`
- The ticket probe `probes/org-container-ui-probe.mjs` is evidence (temporary), not reviewed as durable test code.

## Proportional Test-Code Checks

| Check | Result (`Pass`/`Fail`/`N/A`) | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case IDs carry their AC/REQ/DEC; the file header lists the cases in run order with their claims |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Exact autobyteus-22 texts (notice, refusal), `counterpart` Org addresses in both logs, leaving markers and rows, `TASK_AGENT_RESOURCE_CLOSED` / "continues with its conversation", units absent from top-level history. One weaker spot is noted below (OC-13), proven elsewhere |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `orgHarness`, `packageWriter` and `startServer` are shared by both suites; the existing harness helpers (`callTool`, `calledResults`, `readRunTree`, `until`) are reused. OC-11 builds its released Org inline because its definition IDs must match the package; the comment points to the canonical fixture shape |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Test-owned data roots and ports; busy members held by file gates, never by sleeps; file-event waits bounded by `OS_FILE_EVENT_WAIT_MS` with timeouts from `FILE_EVENT_TEST_TIMEOUT_MS`. The cases share one Org run deliberately (a user's Org over time); OC-13's `finally` restores the Team and Org definitions for OC-08/OC-09. RC-56's "not told while down" relies on FU-003's best-effort notice (no retry), as designed |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | One surface per file (the package Org; the live Org; two nodes; stopped settings) |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | Skips come only from the documented environment gates |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | The OC, OCL and RC-56 receipts in `evidence/api-e2e/round-{1,2,3}/` match the assertions; round-3 OC 13/13, OF 6/6, OCU 5/5 |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Each scenario comes from the approved requirements; OC-11's ledger edit simulates exactly the state an upgraded install has (the conversion and its follow-ups never ran), as documented |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | Definitions change by editing package files (watcher reload) or the definition mutation (RC-56). Messages come from agent tool calls or the Org view's `SEND_MESSAGE`. Stops use the unit rows' own terminate mutations (REQ-006). Approvals use the Org view's `APPROVE_TOOL` |

Observation (no action): OC-13's title says the rule naming the removed writer is "only left out". The case asserts that the edit is followed and that the new rule reaches the concierge. It does not assert that `/team/writer → /concierge` stays stored or that no `AGENT_ORG_DEFINITION_NOT_FOLLOWED` line appears. Both are proven elsewhere:

- in the round-3 receipt (`OC-13.json`: `containerHandoffs` includes `/team/writer → /concierge`; `notFollowedLog: []`);
- by IR-005's unit cases (the reopen case stores the kept rule).

Two more `expect` lines would make OC-13 self-contained if the file is touched again.

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. FU-001 (memory sync of contained runs) unchanged.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `org-container-package.e2e.test.ts`, `org-container-live.e2e.test.ts`, `remote-delegation-two-server.e2e.test.ts`, `stopped-org-workspace-graphql.e2e.test.ts`
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes: Large/High classification preserved. Residual risks per API/E2E: macOS file events and the macOS/x64 release jobs were not run here; the two-server suite needs `test:integration:prepare`, which leaves untracked `*/dist/` folders, not to be committed.
