# Docs Sync Report

## Scope

- Ticket: `delegated-copies-outlive-delegator-461` (Project Task `autobyteus-461`); `task_size` `Large`, `architectural_risk` `High`, route `Reviewed`
- Trigger: test-code review pass CRR-063 (after API/E2E round 21, API-REV-021)
- Bootstrap base reference: merge base `3d738de6e6`
- Integrated base reference used for docs sync: `origin/personal` `1e8b6e5d0a` (merged by IR-041 as `339602ff36`; still current on 2026-11-16)
- Post-integration verification reference: API-REV-021 on `339602ff36` (full server E2E 886 passed, 0 failed)

## Result

`Updated` (2026-11-17). First pass (2026-11-16) was `Blocked`: the long-lived docs described a superseded design of this ticket and the final run-tree stream contract was not documented. Routed to the implementation engineer (Local Fix); rewritten in IR-042 / IR-043 and reviewed in CRR-064 / CRR-065 (head `16009d96c7`). The code reviewer's round 42 also found names this ticket added and later removed, which delegation's base-versus-branch scan cannot see (`LocalChildFollowers`, `CrossRunAddressResolution`); fixed in `633c0fd3f0`.

### Second-pass check (delivery, 2026-11-17)

- Delegation's scan (identifiers in the base's source, gone from the branch's) rerun: 35 doc lines still cite such names; every one sits in a sentence that names its replacement ("it replaced …", "This replaced …", "Replaced (autobyteus-461)"), checked line by line with context. No line describes removed code as current.
- The code reviewer's scan (`evidence/code-review/CRR-064-names-in-neither-tree.sh`): only `REMOTE_PEER`, the base's own doc.
- The run-tree contract is documented: `agent_websocket_streaming_protocol.md` (`run-tree-view.ts`, the tree replacing the views' rows and events) and web `agent_execution_architecture.md` "Run trees (autobyteus-461)".
- AC-015 (`collaboration_model.md`, `GLOSSARY.md`): proven by delivery's document review (`release-deployment-report.md` Verification).
- Project documents: `DESIGN.md` no change; `TESTING.md` changed by the ticket (both typechecks for every TypeScript change; Node 22 for suites), consistent with the final change; `RELEASE.md` updated by delivery (`6ec89d2007`): record the shipped migrations in the registry-order test before tagging, the release-time step the data migration guideline's new "Registry order and late predecessors" requires. No report recorded a discrepancy in the three.

## Docs Updated By Delivery

| Doc Path | What Changed | Why |
| --- | --- | --- |
| `autobyteus-web/docs/agent_teams.md` (copy source) | The `follows_team` line replaced: a copy's launch and origin are its own run's, from the server's tree row (SR-084); `teamAgentSourceOf` answers only for the root Team's own configured members; a Team-level choice changes the Team's default only (CR-461-089) | Code reviewer's note (CRR-061); `services/collaborators/agentSourceSelectors.ts:15-20` |
| `autobyteus-web/docs/settings.md` ("Effective values") | Named `teamCopyAgentLaunch` / `collaborationCopyAgentLaunch` and `follows_team`, none of which exist; now the draft rule `draftLaunch` over the run's own launch | `utils/runSettings/delegatedLaunchRows.ts:17-28, 76-79` |
| `autobyteus-web/composables/mobile/useMobileRunOpening.ts:101`, `__tests__/useMobileRunOpening.spec.ts:143` | Comments cite MSP-56, not MSP-53 | API/E2E renumbered 461's phone cases (code reviewer's note, CRR-063) |

Commit `16e4874dd4`.

## Finding: docs describe removed code and a superseded design

Method: every backticked identifier in `autobyteus-web/docs`, `autobyteus-server-ts/docs`, `GLOSSARY.md`, `DESIGN.md` and `TESTING.md` that exists in the base's source (`3d738de6e6`) and no longer exists in the branch's source (tests excluded). 49 identifiers, cited on 72 lines; only 1 of those lines describes them as removed. Separately:

- The streams now carry `RUN_TREE_SNAPSHOT` / `RUN_TREE_CHANGED` with `RunTreeRowDto` (`autobyteus-team-stream-contracts/src/team-stream-server-message.ts`, `autobyteus-collaboration-stream-contracts/src/run-tree-dtos.ts`). **No long-lived doc names them.**
- Five server docs describe `CHILD_RUNS_CHANGED` / `ChildRowsFeed` / `openChildrenOf` as the live child-row design, and `CHILD_RUNS_CHANGED` exists nowhere in source: `agent_websocket_streaming_protocol.md` ("Live child rows (autobyteus-461)"), `remote_collaboration.md`, `agent_communication.md`, `projects.md`, `standalone_agent_run_root.md`.
- `agent_communication.md`'s Task-closure text, corrected by autobyteus-469 delivery, still describes `closed_task_executions`, which this ticket removed ("There is no closed set in the views or the stored reads").

Lines (file:line | identifiers):

```text
autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md:103 | `REMOTE_TASK_EXECUTION_SUMMARY`
autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md:105 | superseded child-row design
autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md:110 | `remote_task_executions`
autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md:122 | `task_executions`
autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md:122 | superseded child-row design
autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md:123 | `remote_task_executions`
autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md:128 | superseded child-row design
autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md:134 | superseded child-row design
autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md:138 | superseded child-row design
autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md:139 | superseded child-row design
autobyteus-server-ts/docs/modules/agent_communication.md:479 | superseded child-row design
autobyteus-server-ts/docs/modules/agent_communication.md:481 | superseded child-row design
autobyteus-server-ts/docs/modules/agent_communication.md:587 | `stopDelegatedExecution`, `updateDelegatedLaunchSelections`
autobyteus-server-ts/docs/modules/agent_communication.md:588 | `delegatedLaunchModelOptions`
autobyteus-server-ts/docs/modules/agent_communication.md:600 | `COPY_RUNNING`
autobyteus-server-ts/docs/modules/memory_search.md:69 | `TaskTeamRootMemorySource`
autobyteus-server-ts/docs/modules/projects.md:520 | superseded child-row design
autobyteus-server-ts/docs/modules/remote_collaboration.md:292 | `RemoteRunObservation`
autobyteus-server-ts/docs/modules/remote_collaboration.md:294 | `viewerAttached`, `viewerDetached`
autobyteus-server-ts/docs/modules/remote_collaboration.md:298 | `REFRESH_REMOTE_TASK_EXECUTIONS`
autobyteus-server-ts/docs/modules/remote_collaboration.md:301 | superseded child-row design
autobyteus-server-ts/docs/modules/remote_collaboration.md:302 | `RemoteRunRootEvent`, `remote_task_execution_summary`, `remote_agent_presentation`
autobyteus-server-ts/docs/modules/remote_collaboration.md:303 | `remote_agent_presentation`
autobyteus-server-ts/docs/modules/remote_collaboration.md:305 | `remote_task_executions`
autobyteus-server-ts/docs/modules/remote_collaboration.md:308 | `remoteChildOf`
autobyteus-server-ts/docs/modules/remote_collaboration.md:309 | `executeRemoteChildCommand`
autobyteus-server-ts/docs/modules/remote_collaboration.md:310 | `stopRemoteChild`
autobyteus-server-ts/docs/modules/run_history.md:188 | `updateDelegatedLaunchSelections`
autobyteus-server-ts/docs/modules/standalone_agent_run_root.md:159 | superseded child-row design
autobyteus-server-ts/docs/modules/standalone_agent_run_root.md:160 | superseded child-row design
autobyteus-server-ts/docs/modules/standalone_agent_run_root.md:164 | `remote_task_execution_summary`
autobyteus-web/docs/agent_artifacts.md:190 | `agentRunCollaborationMemberFileChanges`
autobyteus-web/docs/agent_execution_architecture.md:121 | `buildAgentRunCollaborationContext`
autobyteus-web/docs/agent_execution_architecture.md:133 | `agentRunCollaborationMemberFileChanges`
autobyteus-web/docs/agent_execution_architecture.md:1430 | `closed_task_executions`
autobyteus-web/docs/agent_execution_architecture.md:1431 | `delegatedSnapshot`
autobyteus-web/docs/agent_execution_architecture.md:1791 | `TASK_EXECUTION_STARTED`
autobyteus-web/docs/agent_execution_architecture.md:508 | `projectAgentOrgTeamBranchStatus`
autobyteus-web/docs/agent_execution_architecture.md:509 | `projectAgentOrgTaskTeamStatus`
autobyteus-web/docs/agent_execution_architecture.md:593 | `stopDelegatedExecution`
autobyteus-web/docs/agent_execution_architecture.md:603 | `projectAgentOrgHistoryRows`
autobyteus-web/docs/agent_execution_architecture.md:649 | `TASK_EXECUTION_STARTED`
autobyteus-web/docs/agent_execution_architecture.md:751 | `closed_task_executions`, `task_executions_closed`
autobyteus-web/docs/agent_execution_architecture.md:752 | `TASK_EXECUTIONS_CLOSED`
autobyteus-web/docs/agent_execution_architecture.md:767 | `task_executions_reopened`, `TASK_EXECUTIONS_REOPENED`
autobyteus-web/docs/agent_execution_architecture.md:768 | `removeReopenedTaskExecutions`
autobyteus-web/docs/agent_execution_architecture.md:772 | `TASK_EXECUTIONS_REOPENED`
autobyteus-web/docs/agent_execution_architecture.md:788 | `remote_task_executions`
autobyteus-web/docs/agent_execution_architecture.md:789 | `useRemoteRunsStore`
autobyteus-web/docs/agent_execution_architecture.md:794 | `remote_task_execution_started`
autobyteus-web/docs/agent_execution_architecture.md:796 | `remote_task_execution_summary`
autobyteus-web/docs/agent_execution_architecture.md:808 | `readRemoteTeamMember`
autobyteus-web/docs/agent_execution_architecture.md:831 | `REFRESH_REMOTE_TASK_EXECUTIONS`
autobyteus-web/docs/agent_execution_architecture.md:838 | `RemoteRunRetryAdapter`
autobyteus-web/docs/agent_execution_architecture.md:839 | `refreshOnStream`, `rereadAgent`
autobyteus-web/docs/agent_execution_architecture.md:843 | `teamRemoteRunRegistry`
autobyteus-web/docs/agent_orgs.md:405 | `task_execution_started`
autobyteus-web/docs/agent_orgs.md:411 | `closed_task_executions`
autobyteus-web/docs/agent_orgs.md:413 | `task_executions_closed`
autobyteus-web/docs/agent_orgs.md:416 | `task_executions_reopened`
autobyteus-web/docs/agent_orgs.md:538 | `copyAgentSourceOf`, `copyTeamSourceOf`
autobyteus-web/docs/agent_teams.md:257 | `TASK_EXECUTION_STARTED`
autobyteus-web/docs/agent_teams.md:268 | `TASK_EXECUTIONS_CLOSED`
autobyteus-web/docs/agent_teams.md:270 | `closed_task_executions`
autobyteus-web/docs/agent_teams.md:277 | `TASK_EXECUTIONS_REOPENED`
autobyteus-web/docs/agent_teams.md:297 | `task_team_agent`
autobyteus-web/docs/agent_teams.md:321 | `TASK_EXECUTION_STARTED`
autobyteus-web/docs/chat.md:503 | `task_executions_reopened`
autobyteus-web/docs/chat.md:531 | `task_execution_started`, `TASK_EXECUTION_STARTED`
autobyteus-web/docs/settings.md:1114 | `TASK_EXECUTION_STARTED`
autobyteus-web/docs/settings.md:1205 | `closed_task_executions`, `task_executions_closed`
autobyteus-web/docs/settings.md:1206 | `TASK_EXECUTIONS_CLOSED`
autobyteus-web/docs/settings.md:1221 | `task_executions_reopened`, `TASK_EXECUTIONS_REOPENED`
autobyteus-web/docs/settings.md:1222 | `removeReopenedTaskExecutions`
autobyteus-web/docs/settings.md:1226 | `TASK_EXECUTIONS_REOPENED`
autobyteus-web/docs/settings.md:1619 | `teamDelegatedLaunchNodes`, `collaborationDelegatedLaunchNodes`
autobyteus-web/docs/settings.md:1652 | `remoteDelegatedLaunchNodes`
autobyteus-web/docs/settings.md:1653 | `remote_task_executions`, `remoteRunsStore`
autobyteus-web/docs/settings.md:1669 | `stopDelegatedExecution`
autobyteus-web/docs/settings.md:1682 | `delegatedLaunchModelOptions`
autobyteus-web/docs/settings.md:1685 | `updateDelegatedLaunchSelections`
autobyteus-web/docs/settings.md:1694 | `DELEGATED_LAUNCH_SELECTIONS_CHANGED`
autobyteus-web/docs/settings.md:1695 | `delegated_launch_selections_changed`
autobyteus-web/docs/workspace_layout.md:27 | `closedTaskExecutionsDigest`
autobyteus-web/docs/workspace_layout.md:29 | `closed_task_executions`
```

## Checked In The Second Pass

- `collaboration_model.md`, `GLOSSARY.md`, `DESIGN.md`, `TESTING.md`, `RELEASE.md`, `data_migration_guideline.md`: see Second-pass check above.

## Escalation

- Classification: `Local Fix` (the change's own docs; the change introduced the staleness)
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Why delivery does not write it: documenting the run-tree stream contract needs its design intent (sequencing, ordering against the snapshot, which client applies what), not only what the code shows. Delivery would be guessing.
