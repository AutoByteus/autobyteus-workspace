# Handoff Summary — autobyteus-446

## Summary Meta

- Ticket: `phone-run-list-follow-446` (Project Task autobyteus-446). Closed Tasks' delegated runs leave every run list.
- Date: `2026-11-09`
- Current status: `Complete`. Verified from the evidence and finalized into `origin/personal` (DR-001; the merge and push are in `release-deployment-report.md`). No release.
- Routing: `task_size` `Medium`, `architectural_risk` `Low`, route `Direct` (no architecture, code or test-code review, by the team's rules).
  - IR-001 implementation; API-REV-001 Pass at 95.6%.
- Archived ticket folder: `tickets/done/phone-run-list-follow-446/`

## Delivery Summary

- **Cause (reproduced before the fix, IMP-01):** only the open run's live stream removed a closed Task's rows. A listed host that was not open kept them, because the list's 5 s status read (autobyteus-426) re-read a host's view only when its active state or children changed. Closing a Task changes neither.
- **Fix:**
  - The contracts' `closedTaskExecutionsDigest(...)` computes a short fingerprint of a host's closed task executions.
  - The node returns it per active host in `agentRunCollaborationStatuses`.
  - The shared store re-reads a host's view once when the fingerprint differs from its own closed set. So the phone list, the desktop Runs view and the Workspaces tree drop a closed Task's rows, and bring a reactivated one's back, within one poll.
  - With nothing changed, a poll sends no view read.
- **Durable tests:** contracts, server and web unit specs, plus phone probe cases MSP-24…27 (`mobile-closed-task-rows-cases.mjs`).
- **Docs:** `autobyteus-web/docs/workspace_layout.md` (Delegated row states) and `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` (the statuses read). See `docs-sync-report.md`.

## Verification

- Verified from the evidence; no user check needed.
- Final confidence 95.6%, no category below 95%.

| AC | Proven by | Result |
| --- | --- | --- |
| AC-001 | MSP-24 | Rows gone 4.3 s / 3.4 s after the close |
| AC-002 | MSP-27 (desktop window) | Gone after 1.3 s |
| AC-003 | MSP-24 | Back 0.95 s after reactivation |
| AC-004 | MSP-24, MSP-14 | Gone before the close was stored |
| AC-005 | MSP-24 | 50 s quiet: 0 view reads |
| AC-006 | MSP-25 | No read while hidden; gone 102 ms after shown |

- The same holds on the merged state: DEL-01 at `6129b2e983`, all 27 cases Pass.

## Integration

- Bootstrap base `a85bf4f38d`. Refresh to `origin/personal` `af75cdd544` (14 commits: autobyteus-436 node files on the phone, and v1.5.12-beta.11).
- Merged as `6129b2e983`. The probe file merged automatically, with no duplicate case IDs.
- Checks on the merged state:
  - contracts `dist` rebuilt with no diff;
  - contracts tests 5/5;
  - server unit tests 66;
  - web unit tests 280;
  - server and phone bundle builds;
  - full phone probe: 27/27 cases Pass.

## Notes For The Solution Designer

- **SCN-004 action column:** it says a reopen is `update_task` to TODO/IN_PROGRESS. On the node, a Task set back to TODO keeps its copy closed. The copy is listed again only when its assigner reactivates it, by messaging it or with `delegate_task`, as `agent_websocket_streaming_protocol.md` § Closed task executions documents. After TODO alone, both phones agree with the node. AC-003 is proven under that documented rule (API/E2E's note).
- **The full phone probe's verdict is `Fail` on this base** although every case passes. The 401 lines come from a revoked phone's run streams retrying for ever: since autobyteus-437 the node closes them with 4403, and the 434 client ends retrying only on 4004/4005. This is FU-003, pre-existing; schedule it soon, because every full probe run fails its verdict until it is fixed.

## Accepted Residual Risks

- FU-001: a Task closed while its host run is stopped is outside scope and unchanged.
- MSP-25's `GetTaskWorkerTasks` reads while hidden are the Projects change feed, not the list.

## Follow-ups

FU-001…FU-003 are in `follow-ups.md`; the Solution Designer sends them now that the ticket leaves the team.

## Release

None. Release only on the user's word (handoff), and RELEASE.md defaults to none. `release-notes.md` is ready for the next release.
