# Docs Sync Report — autobyteus-247 (Remote Agent Teams)

## Scope

- Ticket: `remote-agent-teams` (autobyteus-247, part of autobyteus-25). Classification `Large` / `High`, reviewed route.
- Trigger: CRR-004 (test-code review Pass) after API-REV-002 (Pass), handed to delivery by the code reviewer.
- Bootstrap base reference: `origin/personal` `4a05909457` (the beta.5 release commit).
- Integrated base reference used for docs sync: `origin/personal` `a22394f0ce` (merge `a74677df99`). The base advance is the beta.5 release records under `tickets/done/` only.
- Post-integration verification reference: no rerun needed (`release-deployment-report.md` § Initial Delivery Integration Refresh).

## Why Docs Were Updated

- Summary: the implementation updated the server docs and the Nodes tab text. Delivery checked them against the final code, including the F-001 fix. The server docs were accurate. One web doc, `autobyteus-web/docs/settings.md`, still described the tab note as "any shared agent"; delivery updated it to match the tab's current text, which covers Agent Teams.
- Why this lives in long-lived docs: Agent Teams across nodes change the collaboration model (CM-10 … CM-12), the contract between nodes (`targetRoot`, the Team start answer), the Team root (the peer-started Team, its quiet idle shutdown) and the tool's result.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | CM-10 … CM-12, the remote Team link shape, scope table | No change | The link shape (`teamRunId, nodeId, coordinatorAddress, members, delegatorAgentRunId, startedAt`) matches RC-21's link keys; Teams on B are top-level Team runs with `delegatedFrom` (RC-21 `betaTree`). |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Module mechanics | No change | Every named owner exists and is used as described: `RemoteTeamRunStarter`, `RemoteRootDirectory` (the receiver's port), `storedLinkCheck`/`admitsInbound`, the endpoint kinds incl. `delegated_team`, `pairedAgentRunIds`, `teamLinkFor`, `isRemoteTeam`, `teamCoordinatorOf`, `targetRoot` (gateway parses it; messages carry no `coordinatingRun`, RC-20), "changed while it was being started". `REMOTE_TEAMS_NOT_SUPPORTED` is gone from code, tests and docs. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team runs started by a peer; quiet idle shutdown | No change | `remote-team-idle-shutdown.ts`, `team-run-remote-links.ts`, `peerStartedTeamMembers`, `shutDownIfQuiet`, `tryPrepareTerminationIfQuiescent` exist; RC-12 shows the Team idling out and being restored once. |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | "… the target agent team <name>" text | No change | Matches RC-04 `/hollow_team`. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | `delegate_task` with `node` for a Team; result shape | No change | Matches the serializer after F-001 (`task-delegation-tool-serialization.ts`: `node` for both kinds) and RC-21's exact keys. |
| `autobyteus-web/docs/settings.md` | Nodes → Remote Collaboration | **Updated** | It said "any shared agent"; the tab (en/zh-CN catalogs) now says "any shared agent or Agent Team", the team default for members, auto-approve for every agent of the run, refusal without a default. |
| Repository-wide search | Stale "Teams not supported" wording | No change | None left; the remaining "text only, for Agents" sentence is the historical slice-1 statement, followed by "autobyteus-247 added shared Agent Teams." |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` | Correction | The Remote Collaboration note now covers shared Agent Teams, the team default for members without one, auto-approve for every agent of the run, and the refusal without a default | The doc lagged the tab text this ticket changed |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Remote Agent Teams | A peer-started Team is a top-level Team run with `delegatedFrom`; only the coordinator starts; every member is reachable by run ID; quiet idle shutdown | `design-spec.md` (SR-006) | CM-10 … CM-12; `agent_team_execution.md`; `remote_collaboration.md` (by the implementation) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `REMOTE_TEAMS_NOT_SUPPORTED` refusal | `RemoteTeamRunStarter` and the Team start answer | `remote_collaboration.md` |
| `coordinatingRun` on messages between nodes | `targetRoot` on every message and work packet | `remote_collaboration.md` § Between nodes |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification. This waits for API/E2E's confidence scorecard (requested in DR-001); then archive and finalize.
