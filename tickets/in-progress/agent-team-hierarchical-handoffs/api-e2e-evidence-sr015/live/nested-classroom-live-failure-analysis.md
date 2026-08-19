# API-F-008 / API-F-009 Live Nested-Classroom Failure Analysis

## Execution identity

- API/E2E revision: `API-REV-012`
- Requirement scenario: `SR015-LIVE-NESTED-001` / R-044–R-048 / AC-040–AC-044
- Root TeamRun: `nested_classroom_test_team_dd3fee6448aa4e66befc4c349beb4ee6`
- Runtime/model: `autobyteus` / `gpt-5.6-luna`
- Isolated server: `http://127.0.0.1:60001`
- Browser frontend: `http://127.0.0.1:31001`
- Imported package digest: `e7b48b3371912e655c88a6df0cd87ee31e727f0ea5cd798bd0b93e8452df7ae3`

## Preconditions proved

- `pnpm secrets:import` configured nine secret identifiers in the exact disposable SQLite database; post-import dry run was `READY` with nine `SKIP_CONFIGURED` entries and no blocked entry.
- Runtime catalog exposed AutoByteus and Codex `gpt-5.6-luna`, plus Claude `sonnet`; all three runtimes were enabled.
- Public `importAgentPackage(LOCAL_PATH, absolute staged root)` discovered the root Team, nested Team, and all three local Agents.
- Browser launch created schema-v3 rooted metadata for `/`, `/Teacher`, `/StudentStudyGroup`, `/StudentStudyGroup/student_one`, and `/StudentStudyGroup/student_two`, with exact coordinators and all three members configured for AutoByteus `gpt-5.6-luna`.
- `get_handoff_rules` executed successfully and returned only the exact ordered minimal shape:
  `{"handoffs":[{"when":"When the user asks to send the classroom handoff token to the study group.","recipient_address":"/StudentStudyGroup"}]}`.

## API-F-008 — persistent Team recipient is misrouted as task Agent

Expected: `send_message_to({recipient_address:"./StudentStudyGroup", ...})` from `/Teacher` resolves the Team to `/StudentStudyGroup/student_one`, lazily materializes the persistent nested Team/Agent, delivers exactly once, and persists the communication event.

Observed provider-visible result:

```json
{
  "accepted": false,
  "code": "TASK_AGENT_RUN_NOT_FOUND",
  "message": "Task AgentRun 'student_one_312985a392ef4c3aa1000dfbdef2c83d' was not found.",
  "result": null
}
```

`getTeamCommunicationMessages` returned `[]`. The immutable root metadata identifies the same value as the persistent `agentRunId` for `/StudentStudyGroup/student_one`, not a task AgentRun.

Preliminary current-source path:

1. `MixedTeamManager.materializeMessageRecipient` correctly resolves the nested coordinator and sets `targetAgentRunId` to the persistent node `agentRunId`.
2. `MixedSubTeamMemberHandle.deliverInterMemberMessage` forwards that non-null ID into the child `TeamRun.postMessage`.
3. Child `MixedTeamManager.postMessage` treats every non-empty `targetAgentRunId` as a task Agent selector and calls `taskAgentInstances.postMessage`, producing `TASK_AGENT_RUN_NOT_FOUND`.

This contradicts the approved persistent-versus-task identity model. No fallback is requested; the persistent exact-run coordinate must retain its persistent meaning rather than being interpreted as a task AgentRun.

## API-F-009 — valid Team task ingress is rejected at the coordinator address

Expected: `delegate_task({recipient_address:"./StudentStudyGroup", ...})` creates a task TeamRun for `/StudentStudyGroup`, enters through `/StudentStudyGroup/student_one`, and persists an active task record.

Observed provider-visible result:

```json
{
  "task_id": "task_0001",
  "status": "not_started",
  "message": "Task AgentTeam target '/StudentStudyGroup/student_one' was not found."
}
```

`getTaskDelegationRecords` returned `[]`; no task execution was bound.

Preliminary current-source path:

1. `TaskDelegationActivationCoordinator.activateTeam` materializes a valid task Team identity and intentionally sets `receiver.memberAddress` to the Team coordinator `/StudentStudyGroup/student_one`.
2. `MixedTaskTeamInstanceRegistry.start` calls `teamContext.index.getTeam(request.receiver.memberAddress)`.
3. The index lookup asks for a Team at the Agent coordinator address, then rejects because none exists. The request already carries `teamNode.address === "/StudentStudyGroup"`.

The durable requirement is task-Team coordinator ingress, not direct coordinator-as-Team lookup. No alternate identity or compatibility path is requested.

## Secondary observability mismatch

The browser Activity panel renders both rejected structured tool results as `SUCCESS` because transport execution completed without a thrown tool exception, even though the authoritative result payload says `accepted:false` / `status:not_started`. This can mislead users and must be classified during focused origin review; it did not cause the underlying delivery or activation failures.

## Lifecycle and matrix consequence

- Public GraphQL termination succeeded.
- Public GraphQL restoration succeeded with the same TeamRun ID.
- Restored `rootTeam` and handoff snapshot were structurally identical to pre-termination metadata.
- Final termination succeeded.
- The required AutoByteus nested-classroom row is `Fail`.
- Codex and Claude nested-classroom rows are `Not Tested after common root-boundary failure`; they are not skips or passes.
- Separate browser-created standalone Agent journeys passed on AutoByteus, Codex, and Claude and do not compensate for the failed AgentTeam acceptance criteria.

## Authoritative evidence

- `nested-classroom-autobyteus-failure-and-lifecycle.json`
- `staged-package-import-result.json`
- `staged-package-manifest.json`
- `runtime-catalog-preflight.json`
- `browser/team-launch-autobyteus.png`
- `browser/team-step1-autobyteus.png`
- `browser/team-failure-autobyteus.png`
- `browser/standalone-agent-three-runtime.json`
