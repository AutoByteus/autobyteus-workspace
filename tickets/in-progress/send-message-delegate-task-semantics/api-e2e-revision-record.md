# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer / `CRR-001` / Round 1 | RER-013; AD-REV-001; ARCH-REV-001; IR-001; CRR-001 | N/A | Pass / 97.7% |
| API-REV-002 | Code Reviewer / `CRR-002`, `TEST-001` / Round 2 Local Fix | RER-013; AD-REV-001; ARCH-REV-001; IR-001; CRR-001; CRR-002; API-REV-001 | Pass / 97.7% | Pass / 97.7% |

## Revision Entries

### API-REV-001 — Initial collaboration-contract executable baseline

- Triggering role, report path, and round: Code Reviewer; `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/code-review-report.md`; round 1
- Triggering finding or scenario IDs: successful reviewed-package handoff; API-SCN-001–008 and API-SCN-010–013
- Related revision IDs: `RER-013`, `AD-REV-001`, `ARCH-REV-001`, `IR-001`, `CRR-001`
- Why recorded: first completed API/E2E result for ATC-001; no prior record or confidence existed
- Durable paths changed:
  - `autobyteus-server-ts/tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`
- Scenarios added/changed/rechecked: exact active/inactive Codex MCP identity; fresh Agent/full Team delegation identity; logical Team identity; native/MCP parity; three MCP protocol versions; not-started omission; formal lifecycle separation; three-provider bounded-assignment choice/counts; exact clarification
- Execution delta: built required shared packages, passed 14 focused files/109 tests, collected both changed E2E files, passed supported build/typecheck, and passed isolated live LM Studio/Codex/Claude/MCP/Team-WebSocket journeys

#### Prior Failure Resolution

None — this is the initial API/E2E baseline. Iterative live-harness expectation/configuration corrections were resolved within this round and were not prior completed API/E2E results.

- Canonical artifacts updated:
  - `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/api-e2e-coverage-investigation.md`
  - `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/api-e2e-execution-coverage-report.md`
  - `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/api-e2e-revision-record.md`
  - `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/api-e2e-evidence/api-rev-001`
- Prior result and confidence: `N/A`
- Current result and confidence: `Pass / 97.7%`
- New or remaining failure IDs: `None`
- Recommended recipient: `/software_engineering_team/code_reviewer` for proportional review of changed durable E2E code
- Remaining risks: Delivery-owned broader consumer/release verification for the approved public result break; unrelated corrupt loose Git object maintenance before final integration/GC

### API-REV-002 — Mandatory live Codex MCP structured-result parity

- Triggering role, report path, and round: Code Reviewer; `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/api-e2e-test-review-report.md`; round 2 Local Fix
- Triggering finding or scenario IDs: `TEST-001`; API-SCN-004 and API-SCN-006
- Related revision IDs: `RER-013`, `AD-REV-001`, `ARCH-REV-001`, `IR-001`, `CRR-001`, `CRR-002`, `API-REV-001`
- Why recorded: the proportional durable-test review found that API-REV-001's live Codex helper compared structured content only when it was present, so the durable scenario could pass if the MCP structured projection was omitted
- Durable paths changed:
  - `autobyteus-server-ts/tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts`
- Scenarios added/changed/rechecked: exact active Codex MCP success and post-termination inactive rejection; both now require record-valued `structuredContent` and exact equality with the parsed MCP text object before the branch-specific exact/null assertions
- Execution delta: rebuilt documented shared-package prerequisites after prior cleanup; passed the focused real Codex App Server -> Agent Tools MCP exact-route test (1 file / 1 test); passed supported source-build typecheck; removed generated build output and verified no owned temp residue plus clean diff formatting

#### Prior Failure Resolution

| Finding ID | Prior Result / Evidence Gap | Correction | Rerun Evidence | Resolution |
| --- | --- | --- | --- | --- |
| `TEST-001` | `McpServerToolCallResponse.structuredContent` was optional and `mcpToolCallResult` asserted parity only when it existed, so live active/inactive calls did not enforce REQ-016 and AC-014/016 | Made `structuredContent` required in the local response type; added a runtime record check; unconditionally asserted it equals parsed text. The helper is used by both active and inactive calls. | `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/api-e2e-evidence/api-rev-002/live/codex-exact-routing.log` — Pass, 1 file / 1 test | Resolved — Local Fix Pass |

- Canonical artifacts updated:
  - `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/api-e2e-coverage-investigation.md`
  - `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/api-e2e-execution-coverage-report.md`
  - `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/api-e2e-revision-record.md`
  - `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/api-e2e-evidence/api-rev-002`
- Prior result and confidence: `Pass / 97.7%`
- Current result and confidence: `Pass / 97.7%` — confidence unchanged and not rescored, consistent with CRR-002
- New or remaining failure IDs: `None`
- Recommended recipient: `/software_engineering_team/code_reviewer` for focused proportional rereview of the one-file API-REV-002 durable-test delta; both cumulative changed E2E files remain package context
- Remaining risks: Delivery-owned broader consumer/release verification for the approved public result break; unrelated corrupt loose Git object maintenance before final integration/GC
