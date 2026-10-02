# API/E2E Test-Case Ledger
Current round 2 (round 1 events retained below); canonical siblings: api-e2e-coverage-investigation.md, api-e2e-execution-coverage-report.md, api-e2e-revision-record.md. Workspace `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-work-request-prompt`. Required for multi-case execution.

## Planned cases
| ID | Journey / expected result | Requirement | Surface | Order |
| --- | --- | --- | --- | --- |
| C1 | Approved wording/scope/native tool regressions pass | AC-001–004 | Six focused unit files | 1 |
| C2 | Bootstrap create/restore supplies one paragraph; no-context omits; Claude agrees | AC-001–003 | Real bootstrappers with injected dependencies | 2 |
| C3 | Official MCP client receives aligned descriptions and unchanged selectors | AC-004 | Real loopback HTTP/catalog | 3 |

## Execution events
No execution yet. Planned cases unresolved, not passed.

C1 Started — focused six-file unit run; expected 55 passing tests.

C1 Completed — Pass; 6 files / 55 tests, exit 0; evidence api-e2e-evidence/C1.log, command C1-command.sh.
C2 Started — real Codex/Claude bootstrap tests; expected canonical paragraph in create/restore output.

C2 Completed — Pass; 2 files / 35 tests, exit 0; evidence api-e2e-evidence/C2.log.
C3 Started — real loopback MCP client/catalog projection plus route regression suite.

C3 Completed — Pass; 1 file / 9 tests, exit 0; official SDK tools/list assertions passed over an owned ephemeral loopback listener. Evidence api-e2e-evidence/C3.log.
Reconciliation: C1/C2/C3 Pass, none unresolved or interrupted; no retries.

Final reconciliation 2026-10-02: report written, C1/C2/C3 terminal Pass; no running/interrupted cases. Reconciled into api-e2e-execution-coverage-report.md.

## Round 2 — R2 / SR-002 / IR-002
Prior C1/C2/C3 Pass applies only to R1. Reuse planned IDs/order and expect all tests to pass on corrected literal; no prior unresolved API failure. Current C1/C2/C3 pending at initialization. Logs under api-e2e-evidence/api-rev-002/. No new test edits planned.

C1 Started 2026-10-02T13:03:30Z — exact R2 contract/composer and preserved scope/tool regressions.

C1 Completed 2026-10-02T13:03:46Z — Pass, 55 tests / 6 files, exit 0, api-e2e-evidence/api-rev-002/C1.log.
C2 Started — Codex create/restore and Claude bootstrap R2 projection.

C2 Completed 2026-10-02T13:04:03Z — Pass, 35 tests / 2 files, exit 0, api-e2e-evidence/api-rev-002/C2.log.
C3 Started — real loopback MCP SDK projection regression on current R2 candidate.

C3 Completed 2026-10-02T13:04:57.193068+00:00 — Pass, 9 tests / 1 file, exit 0, api-e2e-evidence/api-rev-002/C3.log.
Round 2 reconciliation: C1/C2/C3 Pass; none unresolved/running/interrupted; no retries. Reconciled into current api-e2e-execution-coverage-report.md (API-REV-002).
