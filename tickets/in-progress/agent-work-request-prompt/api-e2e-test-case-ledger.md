# API/E2E Test-Case Ledger
Round 1; canonical siblings: api-e2e-coverage-investigation.md, api-e2e-execution-coverage-report.md, api-e2e-revision-record.md. Workspace `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-work-request-prompt`. Required for multi-case execution.

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
