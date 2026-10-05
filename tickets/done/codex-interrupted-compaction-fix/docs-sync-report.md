# Docs Sync Report

## Scope
- Ticket: codex-interrupted-compaction-fix. Close interrupted or abandoned Codex compactions as failed.
- Trigger: API-REV-001 Pass (95.1%) on IR-001 / SR-002.
- Classification: task_size `Medium`, architectural_risk `Low` (carried unchanged). Direct low-risk route. Architecture, source and test-code review: `N/A — not applicable`.
- Bootstrap base reference: origin/personal @ 03d5db06b298fd8301a96c6a0e195427b69034d6.
- Integrated base reference used for docs sync: the same commit. The fresh fetch showed it unchanged, so the branch was already current.
- Post-integration verification reference: release-deployment-report.md, "Initial Delivery Integration Refresh".

## Why Docs Were Updated
- Summary: implementation commit 69b0493f2 documented the abandoned-compaction contract in codex_integration.md and agent_memory.md, and added a TESTING.md row. Delivery made two corrections:
  - Validation (OBS-1) proved that normal `AgentRun` termination quiesces input and waits for the active turn before `CodexAgentRunBackend.terminateRun`. Confirmed in `AgentRun.prepareTerminationOnce` → `inputAdmissionState.waitForQuiescence`. So a compaction running at Terminate ends with its turn, and the `run_terminated` close is defensive. The doc previously implied that Terminate cuts off the compaction.
  - TESTING.md described the live file as a single case; it now has 3 cases (interrupt, terminate, app-server crash).
- Why long-lived: the termination ordering is a durable lifecycle contract. Future readers must not assume Terminate produces `run_terminated` failures.

## Long-Lived Docs Reviewed
| Doc Path | Why Reviewed | Result | Notes |
| --- | --- | --- | --- |
| autobyteus-server-ts/docs/modules/codex_integration.md | Codex compaction normalization and abandon contract | Updated | Added the termination-ordering sentence |
| TESTING.md | Codex live E2E row | Updated | Lists 3 cases; quota is per case |
| autobyteus-server-ts/docs/modules/agent_memory.md | Provider Compaction Boundaries | No change | The implementation's abandoned-marker bullet is accurate, and it links to codex_integration.md |
| autobyteus-server-ts/docs/modules/run_history.md | Reopened-history projection | No change | The reader did not change. OBS-2 (failure reason not projected) predates this ticket and is a follow-up, not a docs gap |
| autobyteus-web/docs/agent_execution_architecture.md | COMPACTION_STATUS and Activity | No change | The phase contract already includes `failed`; no frontend source change |

## Docs Updated
| Doc Path | Type | What Changed | Why |
| --- | --- | --- | --- |
| codex_integration.md | Lifecycle clarification | Terminate waits for the active turn; `run_terminated` is a defensive close | OBS-1, verified in code |
| TESTING.md | Test index | Interrupt, terminate and app-server crash cases; quota per case | OBS-3 |

## Durable Design / Runtime Knowledge Promoted
| Topic | What Future Readers Need | Source | Target |
| --- | --- | --- | --- |
| Terminate ordering | AgentRun Terminate and shutdown wait for the active turn, so an open compaction completes with the turn | api-e2e-execution-coverage-report.md OBS-1; agent-run.ts | codex_integration.md |

## Removed / Replaced Components Recorded
None. The change is additive (open compactions are now closed).

## Delivery Continuation
- Result: `Pass`
- Next delivery action: user verification hold.
- Notes: OBS-2 (reopened history omits the failure reason; same as in the Claude ticket) is a reader follow-up candidate for solution_designer.

## DR-002 continuation
The user accepted and requested finalization plus a new beta. The base is unchanged, so the docs remain accurate. Ticket archived under tickets/done/codex-interrupted-compaction-fix; release-notes.md added.
