# Docs Sync Report — autobyteus-269 (A remote run's title)

## Scope

- Ticket: `remote-run-title` (autobyteus-269, part of autobyteus-25). Classification `Small` / `Low`, direct route. The code reviewer's failure-origin review CRR-001 classified F-001 as Design Impact, which led to SR-004.
- Trigger: API-REV-002 Pass (95%) from the API/E2E engineer.
- Bootstrap base: `origin/personal` `33171e1385`. Integrated base: `ca1f09e52a` (the copy-only NFS guide; merge in the ticket branch).
- Post-integration verification: `release-deployment-report.md` § Initial Delivery Integration Refresh.

## Why Docs Were Updated

- Summary: the implementation documented the title rule for peer-started runs and the window's stored-title-wins rule in `remote_collaboration.md`, `run_history.md`, `autobyteus-web/docs/agent_execution_architecture.md` and `autobyteus-web/docs/agent_orgs.md`. Delivery verified each statement against the merged code and found them accurate, so delivery made no edit.

## Long-Lived Docs Reviewed

| Doc Path | Result | Notes |
| --- | --- | --- |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | No change | `RemoteRunTitles` (`remote-message-receiver.ts:38`), bound in `remote-collaboration-composition.ts:59-60` to `recordRunTitle` of the root's kind. |
| `autobyteus-server-ts/docs/modules/run_history.md` | No change | `AgentRunService`/`TeamRunService.recordRunTitle`; `compactSummary` (one line, 100 characters); first non-empty title wins; no migration. Matches RC-05/21/22/30. |
| `autobyteus-web/docs/agent_execution_architecture.md` | No change | The merge fills only an empty stored summary (`runTreeLiveStatusMerge.ts:48`); `useStandaloneRunTitle` prefers the stored title; `resolveStoredTitleSummary` uses `parseSingleLine`. Matches the probe (RRT-02 … RRT-06). |
| `autobyteus-web/docs/agent_orgs.md` | No change | A peer never starts an Org; the first-message rule for Agents and Teams. |

## Docs Updated

None by delivery.

## Removed / Replaced Components Recorded

| Old | Replacement | Where Documented |
| --- | --- | --- |
| Live first-user-message summary always overriding the row | The stored title wins; live fills only an empty title | `agent_execution_architecture.md` |

## Delivery Continuation

- Result: `Pass`. Next: verification (AC-605 is the user's check).
