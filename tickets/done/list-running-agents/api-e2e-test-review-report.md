# API/E2E Test Review Report — list-running-agents (autobyteus-492)

## Review Meta

- Review Round: 1
- Trigger: API/E2E round 1 (API-REV-001) Pass. Test commits `9fc0df5db3` and `ec66ee7d01`; documents `cfc0201a77`. Code under test: `deacacf948` + `5f89ecbdf5` (no `src` change since).
- Requirements Doc Reviewed As Context: `requirements-doc.md` (REQ-001 … REQ-012, AC-001 … AC-009)
- Investigation Notes Reviewed As Context: not reopened; not needed for this review
- Solution Revision Record Reviewed As Context: not reopened (SR-009 unchanged)
- Design Spec Reviewed As Context: `design-spec.md` § Concrete Examples (entry-form rows 1–14)
- Supplemental Task Artifacts Reviewed As Context: None (none exist)
- Architecture Review Revision Record Reviewed As Context: N/A for this review
- Implementation Revision Record Reviewed As Context: IR-002 (no change since)
- Original Code Review Report: `code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95.3%
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline(s) applied: `TESTING.md` (Server E2E and gated runtime layers; clean environment `env -i`; one data root per run). Conflicts or discrepancies: none found.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001 … SCN-006; entry-form rows 3, 4, 6, 7, 8, 9, 11, 13, 14)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Updated (+RC-47, RC-48, RC-49; RC-06, 08, 20, 22, 26, 27, 28 updated) | AC-001 … AC-008, REQ-012, QR-001 … QR-003, DS-006, DEC-014, rows 3/4/7/8/9/11/13/14 | Remote collaboration between real server processes (the suite's established surface) | Large, but sectioned and named per RC; the 492 helpers sit before the cases that use them |
| `autobyteus-server-ts/tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts` | Updated | REQ-008, REQ-010, REQ-012 (AC-008 local) | Texts agents read through real roots | CPW-R2 now asserts delivery and receipt, not a refusal |
| `autobyteus-server-ts/tests/e2e/projects/collaboration-contract-stories.e2e.test.ts` | Updated (O9 driver; header ranges) | Contract stories (U9 = REQ-008) | The executable contract's stories against the built server | O9 is a pre-existing model step the stale base fixture lacked |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Updated | REQ-009 (`node` field) | Agent Tools MCP schema | Exact field list now includes `node` |
| `autobyteus-server-ts/tests/fixtures/collaboration-contract/contract-states.json` | Updated (generated) | U9 | Generated fixture | Regenerated; `--check` passes |
| `tickets/done/delegated-copies-outlive-delegator-461/evidence/collaboration-model/stories.py` | Updated (one message ID) | U9 | Contract model's stories | `"x"` (a refused-step placeholder) → `collabmsg_U9` for a now-delivered message |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each RC title names its ACs/rows; the suite header lists the 492 cases; RC-06/08/22 titles were rewritten to the new behavior |
| Assertions prove approved requirements instead of incidental details | Pass | Exact list membership (AC-001), exact entry fields (REQ-002), wording-authority texts imported (`targetAgentNotRunningText`, `LIST_RUNNING_AGENTS_TOOL_DESCRIPTION`) rather than retyped, both logs with one message ID (CM-9), wire bodies (`run-messages` names no root), no wake (process liveness and launch counts), G-1 live and stored. RC-49's text check is a loose regex, but the code is asserted exactly (`TASK_AGENT_RESOURCE_CLOSED`) |
| Fixtures, setup, helpers, data builders reuse meaningful repetition | Pass | `warm`, `assertLocalLogs`, `viewMessagesWith`, `teamTab`, `expectAgentEntry`/`expectTeamEntry`, `rawPost`; the existing `calls`/`receives`/`assertBothLogs`/`sentRequests` are reused |
| Isolation and determinism appropriate for the boundary | Pass | The suite is sequential and stateful by design (cases share `ids`), as before. RC-49's third node is torn down in `finally`, and the test asserts that beta's peers are restored. Negative checks use bounded `wait`/`neverReceives`, the suite's existing pattern |
| Large files remain coherent and navigable | Pass | One surface (two-server remote collaboration); the 492 block is marked |
| No stale, duplicated, disabled-without-reason or compatibility-only tests | Pass | The old texts ("not linked with you", "works on a different Task", the old not-running text) are replaced by the approved behavior, not loosened; no skips added |
| Coverage agrees with the investigation and execution evidence | Pass | Run 1 (`API-06-run1`): 48/49. RC-47 failed on its empty-list assertion, and the rerun with the cases that create its runs (`API-06-rc47`) is 12/12. CPW 14/14; contract stories §5.1–§5.3 pass |
| Callers and fixtures exercise an independently established scenario | Pass | Every case maps to an approved AC, row or QR; O9 is an existing model story (461 SR-081) |
| Each test enters through its scenario's real trigger | Pass | Agents call the real tools over Agent Tools MCP on built servers. The owner starts and stops runs through GraphQL. Peers use real signed HTTP; unsigned and forged requests go through a raw socket only to model a non-peer caller (QR-003) |

## Findings

None.

Observations, not findings:
- RC-47's `state: "idle"` filter check compares two consecutive list calls. An entry that changes state between them would differ. The warmed agents are idle at that point, so this is no defect today.
- RC-47 depends on runs that RC-05 … RC-11 create. This is consistent with the suite's shared-`ids` design, and the rerun command documents the dependency.

## Follow-ups

- Follow-ups this review added: None. FU-005 (load and file-event timeouts in unrelated suites) was recorded by API/E2E.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the six paths above
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes: the tests prove the new rule on built servers over real HTTP, for one, two and three nodes. BEH-007 (waiting for a busy receiver) is proven in process only (IMP-06), as API/E2E records.
