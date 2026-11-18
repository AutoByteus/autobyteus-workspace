# Docs Sync Report (v3)

The v2 report is history only: `history/docs-sync-report.v2.md`.

## Scope

- Ticket: `agent-input-delivery-simplification`, v3 package (supersedes the v2 branch, which is not merged)
- Trigger: `/software_engineering_team/code_reviewer` CRR-006 Pass, package validated on API-REV-003, HEAD `34561796af`
- Classification (unchanged): `task_size=Large`, `architectural_risk=High`, reviewed route
- Bootstrap base reference: `origin/personal` `0216c6fb14`
- Integrated base reference used for docs sync: `origin/personal` `ddd6fdcdf6`, merged as `cd0b15f806` (after checkpoint `de6fa6fbea`)
- Post-integration verification reference: `release-deployment-report.md` → "Initial Delivery Integration Refresh"; logs in `delivery-evidence/v3/`

## Why Docs Were Updated

- Summary: `RootCommunicationEngine` is now the only owner of each root's message list and of save-then-deliver. It covers every root and every entry form (`deliver`, `acceptFromRemote`, `commitSentToRemote`) through one `RootMessageAppend`, run by each persistence coordinator under the root's lock. Small per-root ports (`standalone-root-communication-port.ts`, `agent-org-communication-port.ts`, `team-communication-port.ts`) supply only that root's facts.
  - Removed: the Team service, adapter and plan; the standalone and Org adapters; `InterAgentMessageRouter`; `TaskAgentExecutionRegistry.reserveInput`; `nextMessages`; the Team root-mismatch branch; the root copies of the message list.
  - Every Task-scope closure on the teammate path returns `TASK_AGENT_RESOURCE_CLOSED` without a root fail-stop (REQ-012, DEC-005).
- Why this belongs in long-lived docs: REQ-011 requires the module docs to describe the real path. The entry-form table and the per-root code table are the contract that future changes must keep.

## Long-Lived Docs Reviewed

The REQ-011 docs were updated by implementation in `dbc27db9df`. Delivery verified them against the final integrated head.

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | REQ-011 owner (Teammate Delivery Path) | No change (verified) | The spine, entry-form table, steps 1–6 and per-root code table were checked against source. Present: the three port files; `acceptFromRemote`, `commitSentToRemote`, `prepare`, `commitAfterDurability`, `reserveRecipientInput`, `commitMessageAppend`, `deliverToRunId`, `assignToExistingCopy`, `getCommunicationSnapshot`; all nine per-root codes, `TASK_AGENT_RESOURCE_CLOSED`/`_CONFLICT`, and the exact `AGENT_RUN_NOT_ACCEPTING_INPUT` message |
| `agent_execution.md`, `agent_team_execution.md`, `standalone_agent_run_root.md`, `agent_memory.md`, `codex_integration.md`, `skill_update_notices.md`, `features/artifact_file_serving_design.md` | REQ-011 references | No change (verified) | — |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Repo-wide scan for removed components | Updated | Still listed the deleted `team-communication-service.ts` |
| `autobyteus-web/docs/agent_artifacts.md` | Repo-wide scan | Updated | Diagram node `TeamCommunicationService` |
| `docs/design-cases.md` | Uncommitted Solution Designer additions (Case 2 C-1; Case 5 AR3-NB-002 and the DI-001 consumer lesson) | Committed with the ticket | `solution-revision-record.md` (SR-007 entry) says they are "to be committed with the ticket". The base had completed Case 7 in parallel, and both edits merged automatically |
| `TESTING.md` | TDR suite entry | No change (verified) | — |

Scan used: `InterAgentMessageRouter`, `TeamCommunicationService`/`Adapter`, every `*communication-adapter*`, `message-append-plan`, `nextMessages` and `TaskAgentExecutionRegistry.reserveInput`, across all `*.md` outside `tickets/`. After the fixes no stale reference remains. `reserveRecipientInput` is a real v3 port method.

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Stale reference | `team-communication-service.ts` → `root-communication-engine.ts` (Team root port, linked to the Teammate Delivery Path) and `root-message-append.ts` | Removed file (AC-011) |
| `autobyteus-web/docs/agent_artifacts.md` | Stale reference | Diagram node → `RootCommunicationEngine: Team root port` | Same |
| `docs/design-cases.md` | Design-case record | Solution Designer additions committed | Design record instruction |

## Removed / Replaced Components Recorded

| Old Component | Replaced By | Documented In |
| --- | --- | --- |
| Standalone, Org and root communication adapters | Per-root `RootCommunicationPort` files | `agent_communication.md` |
| `team-communication-service.ts`, `-adapter.ts`, `-message-append-plan.ts` | `team-communication-port.ts` → `RootCommunicationEngine`, `root-message-append.ts` | `agent_communication.md`, `agent_artifacts.md` (server, web) |
| Root copies of the message list, `nextMessages` | The engine's list; `getCommunicationSnapshot()` builds from it | `agent_communication.md` |
| `InterAgentMessageRouter`, `TaskAgentExecutionRegistry.reserveInput` | Nothing (dead code) | `agent_communication.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, then finalization and beta release (the user decided in advance)
