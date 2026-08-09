# API-REV-013 Imported Nested-Classroom Live Failure Analysis

## Result

- API/E2E revision: `API-REV-013`
- Upstream source/review: `IR-017` / `b877d343b30fe01bd2f39546c0e8279adbd00dff`; `CRR-029` Pass
- Reviewed artifact HEAD: `ced0270908c620f0d186e61d294080f89e08bb7d`
- Scenario: `SR015-LIVE-TASKTEAM-002`
- Failure: `API-F-010`
- Requirements / acceptance criteria: R-047; AC-028; AC-030; AC-043
- Classification: `Fail`; preliminary implementation origin, subject to `code_reviewer` focused failure-origin review

API-F-008 and API-F-009 are resolved in the real AutoByteus row. Persistent root-to-child-Team delivery, persistent nested peer/absolute-root replies, and task-Team creation/coordinator ingress all succeed. A new common server routing failure appears only after the task-scoped coordinator sends an ordinary relative message to its task-Team peer.

## Real Test Environment

- User-required secret source: `/Users/normy/.autobyteus/server-data/.env`
- Actual repository importer: `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:<absolute disposable database>`
- Import result: `READY`; 9 configured identifiers; 0 blocked; no secret value logged
- Isolated application-data root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/.tmp/sr015-api-rev-013-20260809`
- Isolated database: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/db/sr015-api-rev-013-20260809.db`
- Built server: `http://127.0.0.1:60002`
- Real Nuxt frontend: `http://127.0.0.1:31002`
- Package import: public GraphQL `importAgentPackage`, `sourceKind: LOCAL_PATH`
- Staged package digest: `e67d4115f9bec5b9de0ad6312e47c76f2a628188dacf76d093b0e8381ec09696`; every content file matches the prior approved overlay
- Runtime/model: every persistent and task-scoped member uses `autobyteus` / `gpt-5.6-luna`
- Root TeamRun: `nested_classroom_test_team_20ce2140b0124e5abb2e3bf4ee04d12c`
- Task: `task_0001`
- Task TeamRun: `team_local_team_nested_classroom_test_student_st_5c812d9dde5444e69a635bec25f001c2`
- Task coordinator AgentRun: `student_one_e1e50bc80221425d93a62e9ec6dd96a1`
- Persistent peer AgentRun: `student_two_c238025ae9df4a17800ec6d75d68d3d4`

The run was created and driven through the real frontend. Tool approvals were issued through the supported Team WebSocket command boundary. Public/browser creation, provider execution, persisted communication records, task records, and server runtime logs were correlated.

## Passing Rechecks Before The Failure

1. Rooted schema-v3 metadata contains `/`, `/Teacher`, `/StudentStudyGroup`, `/StudentStudyGroup/student_one`, and `/StudentStudyGroup/student_two`; coordinators are exact.
2. `get_handoff_rules` returns only the exact ordered handoff rows.
3. `/Teacher` sends once to `./StudentStudyGroup`; delivery reaches persistent `/StudentStudyGroup/student_one` exactly once.
4. Persistent nested `student_one` sends relatively to `./student_two`; the persistent peer replies; `student_one` sends absolute `/Teacher`; all four communication records carry empty task chains as expected.
5. `delegate_task("./StudentStudyGroup")` succeeds and creates active `task_0001` plus task TeamRun `team_local_team_nested_classroom_test_student_st_5c812d9dde5444e69a635bec25f001c2` at coordinator `/StudentStudyGroup/student_one`.
6. The task coordinator is a distinct AgentRun (`student_one_e1e50...`) from the persistent coordinator (`student_one_f070...`) and has the exact task execution address.
7. Task-scoped `get_handoff_rules` returns the required root and peer addresses.

These observations directly close the prior API-F-008/API-F-009 triggers; this round does not claim the entire live row passes.

## Trigger And Expected Behavior

From the active task-Team coordinator `/StudentStudyGroup/student_one`, the real model called:

```json
{
  "recipient_address": "./student_two",
  "content": "Please reply with the exact token AB13_AUTO_TASK_PEER_OK",
  "message_type": "ordinary",
  "reference_files": []
}
```

Expected under AC-028/AC-030/AC-043:

- the relative address resolves to logical `/StudentStudyGroup/student_two`;
- because the caller is inside active task TeamRun `team_local_team_nested_classroom_test_student_st_5c812d9dde5444e69a635bec25f001c2`, the receiver retains that same ordered `taskTeamRunIds` chain;
- task-scoped `student_two` is materialized, the message is delivered once, and its reply returns to task-scoped `student_one`;
- task-scoped `student_one` calls `submit_task_result`; root `/Teacher` calls `review_task_result(accept)`.

## Observed Behavior

The tool returned accepted success:

```json
{"accepted":true,"code":"DELIVERED","message":"Delivered message to ./student_two.","result":null}
```

The durable communication projection is internally contradictory:

```json
{
  "senderAddress": {
    "rootTeamRunId": "nested_classroom_test_team_20ce2140b0124e5abb2e3bf4ee04d12c",
    "taskTeamRunIds": [
      "team_local_team_nested_classroom_test_student_st_5c812d9dde5444e69a635bec25f001c2"
    ],
    "memberAddress": "/StudentStudyGroup/student_one",
    "taskAgentRunId": null
  },
  "receiverAddress": {
    "rootTeamRunId": "nested_classroom_test_team_20ce2140b0124e5abb2e3bf4ee04d12c",
    "taskTeamRunIds": [],
    "memberAddress": "/StudentStudyGroup/student_two",
    "taskAgentRunId": null
  }
}
```

The server started the persistent peer AgentRun `student_two_c238...`, not the task-scoped peer advertised in the Team status snapshot. The reply therefore cannot return to the task coordinator's concrete execution. `task_0001` remains active with no submission or review update, so the live task lifecycle cannot finish.

This is not a provider choice, approval issue, missing credential, stale fixture, or browser-only presentation issue. The server accepted the canonical relative selector and then materialized the wrong concrete execution.

## Preliminary Source-Origin Analysis

The exact owner should be decided by `code_reviewer`; the current evidence points to the shared root message-routing/materialization boundary:

- `MixedTeamManager.deliverInterAgentMessage` (current lines 101–117) forwards child/task intents to the root, resolves only the logical target, then calls `materializeMessageRecipient(targetAddress)` without the sender's concrete execution.
- `materializeMessageRecipient` (current lines 221–237) always constructs the receiver with the current manager context's `taskTeamRunIds` and the rooted persistent node `agentRunId`. At the root manager that chain is empty.
- `deliverResolvedInterAgentMessage` (current lines 124–161) distinguishes persistent and task-Agent delivery, but has no task-Team execution branch. The resulting request therefore enters the persistent registry.
- The task Team handle correctly creates its child with the exact task chain (current `mixed-task-team-member-handle.ts` lines 66–80); the chain is lost only when root recipient materialization chooses the concrete receiver.

A valid correction must preserve the existing canonical logical resolution and fail-closed identity checks while choosing the exact active task-Team execution when the resolved target belongs to the caller's current task-Team scope. It must not add a compatibility path, fallback, alias, alternate address grammar, or persistent substitution.

## Why Codex And Claude Team Rows Stopped

The failed selection is shared server routing after provider tool invocation; it is not AutoByteus-adapter-specific. Continuing the mandatory Codex and Claude rows would reproduce or obscure the same critical common acceptance failure while consuming live providers. Their imported Team rows remain `Not Tested after common critical task-Team routing failure`, not skipped or passed. Prior real standalone browser Agent rows for both runtimes remain passing evidence but cannot compensate for this Team failure.

## Evidence

- Structured live result: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-013/live/nested-classroom-autobyteus-failure-and-lifecycle.json`
- Focused routing log: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-013/live/task-team-peer-routing-evidence.log`
- Full server log: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-013/live/server.log`
- Browser launch configuration: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-013/live/autobyteus-run-config.png`
- Browser failure state: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-013/live/autobyteus-task-team-peer-misroute.png`
- Cleanup/immutability proof: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-013/live/cleanup.log`

## Required Reroute

Request focused failure-origin review for API-F-010. Preserve the current durable tests. The next implementation/API-E2E round needs a durable regression in the task-Team message-routing owner that proves same-task relative peer delivery retains the exact ordered task-Team chain and exact AgentRun, plus a real AutoByteus recheck before the Codex/Claude rows resume.
