# Full-Stack Nested Team Communication Validation Failure (Round 7 Recheck)

## Summary

Round 7 full-stack/browser validation was rerun from the worktree backend and worktree frontend, not from the Electron app backend. The nested mixed team now launches and renders the `BuildSquad` subteam node correctly, but live parent-to-subteam communication is not displayed by the frontend Team communication store/panel even though the backend records the canonical communication projection and the child Codex coordinator receives/responds to the message.

## Environment

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team`
- Branch: `codex/mixed-team-nested-agent-team`
- Backend: `node dist/app.js --host 127.0.0.1 --port 8000`
- Frontend: `pnpm -C autobyteus-web dev --port 3020 --host 127.0.0.1`
- Backend database for this run: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-server-ts/db/fullstack-e2e-round7.db`
- Seed command: `python3 scripts/seed-personal-test-fixtures.py --graphql-url http://127.0.0.1:8000/graphql --wait-retries 10 --wait-delay 1`
- Browser target: `http://127.0.0.1:3020`
- Browser runtime config confirmed `electronApi: false`, GraphQL `/graphql`, team WebSocket `ws://localhost:8000/ws/agent-team`.

## Seeded Team Under Test

- Parent team: `Nested Mixed Runtime Delivery Team` (`nested-mixed-runtime-delivery-team`)
- Parent coordinator: `program_manager` using AutoByteus/LM Studio model `qwen/qwen3.5-35b-a3b:lmstudio@127.0.0.1:1234`
- Nested child team member: `BuildSquad` (`agent_team`)
- Child coordinator: `BuildSquad/review_lead` using Codex App Server model `gpt-5.4-mini`
- Child sibling: `BuildSquad/qa_specialist` using Claude Agent SDK model `haiku`

## Positive Evidence

1. The team list and run configuration render the nested child team as a real team member (`BuildSquad TEAM`) and not as a flattened pair of leaves.
2. The live workspace/running tree and Team tab render the recursive structure:
   - `program_manager`
   - `BuildSquad` (`agent_team`)
     - `BuildSquad/review_lead`
     - `BuildSquad/qa_specialist`
3. The browser store confirmed canonical route/path state after launch:
   - `memberNodesByRouteKey`: `program_manager`, `BuildSquad`, `BuildSquad/review_lead`, `BuildSquad/qa_specialist`
   - `leafAgentContextsByRouteKey`: `program_manager`, `BuildSquad/review_lead`, `BuildSquad/qa_specialist`
4. Parent-to-subteam dispatch reached the nested Codex child coordinator.
   - Team run: `team_nested-mixed-runtime-delivery-team_4df1885a`
   - Parent run: `program_manager_3ca699b96c97ba80`
   - Child subteam member run: `buildsquad_2b95985918b9a5e1`
   - Child Codex run: `buildsquad_review_lead_59e809c3b5b61d49`
   - Prompt token: `FRONTEND_PARENT_TO_SUBTEAM_R7_1778653376602`
   - `program_manager` executed `send_message_to` with `recipient_name: "BuildSquad"` successfully.
   - `BuildSquad/review_lead` responded with exactly `FRONTEND_PARENT_TO_SUBTEAM_R7_1778653376602`.
5. Direct subteam focus/composer routing also reached the nested child coordinator.
   - Focused route: `BuildSquad`
   - Prompt token: `FRONTEND_SUBTEAM_FOCUS_R7_1778653601564`
   - `BuildSquad/review_lead` responded with exactly `FRONTEND_SUBTEAM_FOCUS_R7_1778653601564`.
6. Backend recursive history/resume metadata is correct after termination:
   - `getTeamRunResumeConfig(team_nested-mixed-runtime-delivery-team_4df1885a).isActive` returned `false` after cleanup.
   - Metadata preserved the `BuildSquad` `agent_team` node with child team run `team_nested-build-squad-team_c792d747` and nested leaf route keys.
   - `listWorkspaceRunHistory` listed the parent team run and did not list `team_nested-build-squad-team_c792d747` as an independent top-level child team history item.
7. Terminate cleanup through the frontend store succeeded and set parent plus leaf statuses to `shutdown_complete`.

Screenshots:

- `/Users/normy/.autobyteus/browser-artifacts/e47bac-1778653656912.png`
- `/Users/normy/.autobyteus/browser-artifacts/e47bac-1778653663419.png`

## Blocking Failure

The live frontend team communication store remained empty after the parent-to-`BuildSquad` message, even though the backend projection was correct and the child Codex coordinator responded.

### Direct Browser Evidence

Immediately after the live parent-to-subteam message completed:

```js
const active = useNuxtApp().$pinia._s.get('agentTeamContexts').activeTeamContext;
const comm = useNuxtApp().$pinia._s.get('teamCommunication');
comm.getMessagesForTeam(active.teamRunId).length;
// => 0
comm.getPerspectiveForMember(active.teamRunId, {
  memberRunId: active.leafAgentContextsByRouteKey.get('program_manager')?.state.runId,
  memberRouteKey: 'program_manager',
  memberPath: ['program_manager'],
  memberKind: 'agent',
}).messages.length;
// => 0
comm.getPerspectiveForMember(active.teamRunId, {
  memberRunId: null,
  memberRouteKey: 'BuildSquad',
  memberPath: ['BuildSquad'],
  memberKind: 'agent_team',
}).messages.length;
// => 0
```

### Backend Projection Evidence

The backend GraphQL projection for the same live run returned the expected canonical communication record:

```json
{
  "messageId": "teammsg_1vrhhUmyuOX3OWos6BGZCtABns50Sssd",
  "teamRunId": "team_nested-mixed-runtime-delivery-team_4df1885a",
  "senderRunId": "program_manager_3ca699b96c97ba80",
  "senderMemberKind": "agent",
  "senderMemberName": "program_manager",
  "senderMemberPath": ["program_manager"],
  "senderMemberRouteKey": "program_manager",
  "receiverRunId": "buildsquad_2b95985918b9a5e1",
  "receiverMemberKind": "agent_team",
  "receiverMemberName": "BuildSquad",
  "receiverMemberPath": ["BuildSquad"],
  "receiverMemberRouteKey": "BuildSquad",
  "content": "Reply with exactly FRONTEND_PARENT_TO_SUBTEAM_R7_1778653376602 and nothing else.",
  "messageType": "frontend_parent_to_subteam"
}
```

Manual browser hydration from `getTeamCommunicationMessages` into `teamCommunication.replaceProjection(...)` made both perspectives work:

- `program_manager` perspective showed the message as `sent` to `BuildSquad` with counterpart kind `agent_team`.
- `BuildSquad` perspective showed the same message as `received` from `program_manager`.

This isolates the failure to live stream/protocol ingestion, not to the persisted backend projection or route/path-aware perspective matching.

## Likely Root Cause

The live team WebSocket path appears to publish `TEAM_COMMUNICATION_MESSAGE` from `TeamRunEventSourceType.COMMUNICATION` with the `TeamRunCommunicationEventPayload` shape:

```ts
{
  messageId,
  teamRunId,
  sender: { memberRunId, memberKind, memberPath, memberRouteKey, ... },
  receiver: { memberRunId, memberKind, memberPath, memberRouteKey, ... },
  content,
  messageType,
  referenceFiles,
  createdAt
}
```

But the frontend `TeamCommunicationMessagePayload` / `teamCommunicationStore.normalizeMessageFromPayload(...)` expects the flattened projection shape:

```ts
{
  messageId,
  teamRunId,
  senderRunId,
  senderMemberKind,
  senderMemberPath,
  senderMemberRouteKey,
  receiverRunId,
  receiverMemberKind,
  receiverMemberPath,
  receiverMemberRouteKey,
  content,
  messageType,
  createdAt,
  updatedAt,
  referenceFiles
}
```

Because the live payload lacks top-level `senderRunId` and `receiverRunId`, the frontend normalizer drops the message and the user-facing Team communication display/badges do not update during the live run.

## Classification

`Local Fix` to implementation: live team communication WebSocket payload and frontend ingestion need to agree on one canonical shape for `TEAM_COMMUNICATION_MESSAGE`. The persisted backend GraphQL projection and route/path-aware perspective matching already work with the flattened canonical shape.

## Reproduction Steps

1. Start backend from the worktree on `127.0.0.1:8000` with a fresh SQLite database.
2. Start frontend from the worktree on `127.0.0.1:3020`.
3. Run `scripts/seed-personal-test-fixtures.py` against `http://127.0.0.1:8000/graphql`.
4. Open `http://127.0.0.1:3020/agent-teams?view=team-list`.
5. Run `Nested Mixed Runtime Delivery Team` with:
   - global AutoByteus/LM Studio model `qwen/qwen3.5-35b-a3b:lmstudio@127.0.0.1:1234`
   - `BuildSquad/review_lead` override: `codex_app_server`, `gpt-5.4-mini`, auto-execute on
   - `BuildSquad/qa_specialist` override: `claude_agent_sdk`, `haiku`, auto-execute on
   - skill access `NONE`
6. Send to the focused parent coordinator:

```text
Call send_message_to exactly once now with these exact JSON arguments: {"recipient_name":"BuildSquad","content":"Reply with exactly FRONTEND_PARENT_TO_SUBTEAM_R7_<timestamp> and nothing else.","message_type":"frontend_parent_to_subteam"}. Do not call any other tool.
```

7. Observe child coordinator response arrives, then inspect `teamCommunication.getMessagesForTeam(teamRunId)` in the browser: it remains empty.
8. Query `getTeamCommunicationMessages(teamRunId)` from GraphQL: the backend returns the canonical record.
