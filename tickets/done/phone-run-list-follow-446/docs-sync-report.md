# Docs Sync Report — autobyteus-446

## Scope

- Ticket: autobyteus-446. Closed Tasks' delegated runs leave every run list, and a reactivated one's rows come back.
- Trigger: delivery DR-001, after API/E2E's Pass (API-REV-001). Direct route (Medium / Low).
- Bootstrap base reference: `origin/personal` `a85bf4f38d`
- Integrated base reference used for docs sync: `origin/personal` `af75cdd544`, merged as `6129b2e983`
- Post-integration verification reference: `release-deployment-report.md`, Initial Delivery Integration Refresh

## Why Docs Were Updated

- Summary: the listed-runs status read (`agentRunCollaborationStatuses`) now also returns each active run's `closedTaskExecutionsDigest`. The client re-reads a run's view when that digest differs from its own closed set. The two long-lived docs that describe the read and the poll did not mention it.
- Why this should live in long-lived project docs:
  - The poll's "no view read unless something changed" rule now has a third trigger.
  - The digest must be computed by the one shared contracts function on both sides; a second implementation would make every poll re-read.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/workspace_layout.md` | Owns "Delegated row states", the poll that the phone and desktop lists share | Updated | The digest trigger; closed and reactivated rows within one poll |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | Owns the `agentRunCollaborationStatuses` contract | Updated | The new field: shape, `null` when inactive, the shared function |
| `autobyteus-web/docs/remote_access.md` | The phone run list | No change | Line 22 already defers to "Delegated row states" |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Closed and reopened task executions | No change | The stream events are unchanged. Its reactivation rule (the Task leaves DONE, then the assigner messages the copy) is what AC-003's proof used |
| `autobyteus-collaboration-stream-contracts/README.md` | Contracts package | No change | It does not list exports; the function has its own doc comment |
| `DESIGN.md` | Project design rules | No change | No new rule |
| `TESTING.md` | Testing guideline | No change | The phone-probe rule already applies. The probe verdict currently fails on unauthorized-read lines from FU-003 (pre-existing); that is a defect to fix, not a testing rule |
| `RELEASE.md` | Release guide | No change | Its steps matched this delivery |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/workspace_layout.md` | Addition | The answer's `closedTaskExecutionsDigest`; the comparison with `closedTaskExecutionsDigest(...)` of the run's own `closed_task_executions`; closed rows leave and reactivated rows return within one poll; no view read when nothing changed | New behavior of the shared poll |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | Addition | The field in the per-run answer, its format (`<count>:<8 hex>`), `null` for an inactive run, and the shared contracts function | New field of the GraphQL contract |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Closed-set digest | The node and the client use one function, so the digests match exactly when the closed sets match. A difference triggers one view re-read | `design-spec.md` DS-001, `implementation-handoff.md` | `workspace_layout.md`, `standalone_agent_run_root.md` |

## Removed / Replaced Components Recorded

None.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, then finalization.
