# API/E2E Test Review Report — AGY runtime

## Review meta

- **CRR-010; proportional changed-test-code review — Pass.** Trigger: API/E2E Engineer API-REV-004 **Pass / 95%** at implementation commit `e23a029b2`, after CRR-009 source Pass. Task route remains **Large / High**. This report does not reopen the implementation scorecard, repeat live execution, or grant delivery acceptance.
- Context reviewed: approved `requirements-doc.md` (SR-016/019/021, SCN-001–005, REQ-001–011, AC-001–010), `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, AGY CLI/tool captures, ARCH-REV-003/design review and revision record, implementation handoff/IR-001–007, `code-review-report.md` CRR-009 and cumulative `code-review-revision-record.md`, `api-e2e-coverage-investigation.md`, current `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` API-REV-004, ledger, round-4 evidence and final selected logs. Delivery revision: N/A.
- Prior unresolved test-review findings: **N/A**; this is the first successful API/E2E test-code review for this package. Supported product scenario basis: **Yes**. Approved SCN-002 and REQ-009/AC-002/008 establish real Team/Org collaboration, exact member identity and durable view/reload independently of the tests; SCN-005/REQ-006 establishes preservation of non-AGY behavior.

## Changed durable test scope

| Durable test path | Change | Scenario / requirement | Coherent responsibility |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts` | Updated | SCN-002; AC-002/003/008 | Real AGY Team and Org launch, scoped member delivery, exact attribution, Org public HTTP member projection/trace and quiescent stop/restore/reload. It removes the test-induced second schema build. |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts` | Updated | SCN-005; AC-005 | Representative real AutoByteus/LMStudio Team execution and persisted continuation; uses server HTTP GraphQL, current Team definition shape and explicit LMSTUDIO catalog instead of the stale fixture. |

No durable test was removed. No source-file line limit or full implementation review was applied to these tests. Temporary probes/logs and evidence JSON were not reviewed as durable test code.

## Proportional checks

| Check | Result | Evidence / note |
| --- | --- | --- |
| Scenario grouping and names | Pass | AGY file has one real Team and one real Org scenario; AutoByteus file remains grouped by Team runtime lifecycle. Names state the exercised boundary. |
| Requirement-relevant assertions | Pass | AGY asserts actual AGY tool start/success, scoped send_message_to recipient communication, exact root/member/run attribution, completed turns, public HTTP projections and trace pages for direct/nested Org members, plus retained identity/markers after restore. AutoByteus case checks both members' turns and persisted markers before/after restore. No stub delivery is counted as parity. |
| Fixture/helper reuse | Pass | Shared server helper, WebSocket command/metadata helpers, local `execGraphql` HTTP helper, isolated definitions/workspaces and exact unique markers avoid duplicated setup without obscuring the cases. |
| Isolation and determinism | Pass, bounded | Opt-in AGY/LMStudio gates, disposable app-data/workspaces, owned socket/server teardown, explicit TURN_COMPLETED/IDLE and root-quiescence waits avoid treating an in-flight turn as a restore result. The non-AGY LMStudio run was 290s against a 300s case timeout; this is a portability/flakiness watch item, not a demonstrated test failure or a reason to prescribe a product mechanism. |
| Large-file coherence | Pass | Both files are long but remain within their respective Team/Org runtime surfaces; the added assertions form one forward lifecycle each, rather than an unrelated scenario bundle. No forced splitting. |
| Stale/duplicate/disabled coverage | Pass | The two changed fixtures no longer build a second schema; the AutoByteus Team fixture removes obsolete `refType` and avoids cloud-QWEN mis-selection. Five other AutoByteus cases were explicitly skipped by the selected run filter, not reported as passing. Known separate Codex/Claude fixture debt is not silently treated as reviewed or passed. |
| Coverage/evidence agreement | Pass | Final durable-code AGY run is 2/2 (`/tmp/agy-api-r4-full-final.log`); selected real AutoByteus LMStudio case is 1/1 with four filtered skips (`/tmp/agy-api-r4-nonagy-team-projection.log`). Contract/focused results and carried browser controls are accurately separated in API-REV-004. |
| Independent scenario basis | Pass | Normal Org member view and Team collaboration arise from approved requirements and existing product UI/API, not from the test's GraphQL query or fixture. The earlier second-schema trigger is correctly identified as test-only and removed. |

## Findings and latest result

**No actionable test-code findings.** The earlier API-F-003 production attribution remains withdrawn: a clean one-build HTTP test now passes; this result does not retroactively make the contaminated API-REV-003 diagnostic valid. The isolated earlier pre-quiescence Org stop failure was not origin-proven, and the current test narrowly asserts quiescent stop/restore rather than arbitrary mid-turn behavior. No live Org browser or Electron-shell validation is implied. The LMStudio timing headroom is a non-blocking watch item for future opt-in runs.

- **Result:** Pass.
- **Changed durable test paths reviewed:** the two files listed above.
- **Unresolved test-review finding IDs:** None.
- **Recommended recipient:** `/delivery_engineer` with the complete passed package, this separate report and updated code-review revision record.
- **Delivery acceptance:** Not claimed; Delivery Engineer owns final verification, documentation sync and finalization.
