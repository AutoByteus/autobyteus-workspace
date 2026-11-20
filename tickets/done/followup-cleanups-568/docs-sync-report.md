# Docs Sync Report — followup-cleanups-568 (autobyteus-568)

## Scope

- Ticket: `followup-cleanups-568` (Project Task `autobyteus-568`), `task_size` `Medium`, `architectural_risk` `Low`, route `Direct Low-Risk` (IR-001 → API-REV-001 Pass, 95%; test-code review `Not Required — direct low-risk route`).
- Bootstrap base: `origin/personal` @ `01ebb4ddce`. Integrated base for docs sync: `origin/personal` @ `32ab4e0f6a` (autobyteus-526 round 2), merged as `7fa18bd894`.

## Why Docs Were Reviewed

- Five cleanups: the dead GraphQL mutation `approveToolInvocation` and three unused web documents removed; three flaky tests fixed (Electron port-owner deadline, iOS migration-boundary path, Basics panel); one iOS simulator chooser (`autobyteus-ios/scripts/select-ios-simulator.py`) for the release workflow and the smoke script.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-ios/README.md` | The smoke script's and the workflow's simulator | No change by delivery (already updated in `eb7e4bf2af`) | Line 56 matches `select-ios-simulator.py` (exact `IOS_SIMULATOR_NAME`, default "iPhone 17", newest runtime not above the SDK, else the first iPhone with a notice). The `name=iPhone 17` destinations in the README, `docs/ios_mobile_access.md` and `remote_access.md` are local examples and still work. |
| `RELEASE.md` (iOS section) | The release workflow's simulator step | No change | It names no simulator choice; the runner and Xcode lines are unchanged. |
| `autobyteus-server-ts/docs/modules/*`, `autobyteus-web/docs/*` | Any mention of the removed GraphQL mutation or documents | No change | No doc names `approveToolInvocation` as a GraphQL mutation, `ApproveToolInvocation`, `RestoreAgentRun` (web document) or `GetAgentRunCollaborationMemberProjection`. `standalone_agent_run_root.md:173` names the server field `agentRunCollaborationMemberProjection`, which is still served (FU-001). Tool approval stays on the WebSocket (`APPROVE_TOOL`), as the docs say. |
| `TESTING.md`, `DESIGN.md` | Test and gate rules | No change | No command changed. |

## Docs Updated

- None by delivery.

## Out-Of-Scope Findings

- None new; FU-001 … FU-003 stand.
