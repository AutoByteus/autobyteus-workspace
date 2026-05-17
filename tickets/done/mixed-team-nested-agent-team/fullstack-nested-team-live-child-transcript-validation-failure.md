# Full-Stack Nested Team Live Child Transcript Validation Failure

## Summary

Round 8 follow-up full-stack validation re-ran the seeded nested mixed-runtime team against the worktree backend and worktree frontend. The prior live `TEAM_COMMUNICATION_MESSAGE` store/panel blocker is fixed: the parent `program_manager` perspective and the `BuildSquad` subteam perspective both receive the parent-to-subteam message live without manual GraphQL hydration.

A new live UI/runtime defect remains: when `program_manager` sends an inter-agent message to the nested `BuildSquad` team, the child coordinator `BuildSquad/review_lead` receives the prompt and replies correctly, but the live focused child coordinator conversation only shows the reply. It does not show the inbound inter-agent/user message (`You received a message from sender name: program_manager ...`). The persisted/opened projection contains that inbound message, so the missing display is isolated to live child conversation projection/streaming, not to the runtime delivery itself.

This blocks delivery because the UI cannot reliably explain what the nested coordinator answered in response to during a live nested team run.

## Setup

Repository/worktree:

`/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team`

Branch:

`codex/mixed-team-nested-agent-team`

Services were started from this worktree, not from the Electron app backend.

Backend startup shape:

```bash
pnpm -C autobyteus-server-ts build
APP_ENV=development \
AUTOBYTEUS_SERVER_HOST=http://localhost:8000 \
DATABASE_URL="file:/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-server-ts/db/fullstack-e2e-round8.db" \
PRISMA_QUERY_ENGINE_LIBRARY="/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/node_modules/.pnpm/@prisma+engines@5.22.0/node_modules/@prisma/engines/libquery_engine-darwin-arm64.dylib.node" \
PRISMA_SCHEMA_ENGINE_BINARY="/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/node_modules/.pnpm/@prisma+engines@5.22.0/node_modules/@prisma/engines/schema-engine-darwin-arm64" \
node dist/app.js --host 127.0.0.1 --port 8000
```

Seed command:

```bash
python3 scripts/seed-personal-test-fixtures.py --graphql-url http://127.0.0.1:8000/graphql --wait-retries 10 --wait-delay 1
```

Frontend command:

```bash
pnpm -C autobyteus-web dev --port 3020 --host 127.0.0.1
```

Browser endpoint:

`http://127.0.0.1:3020/workspace`

Team under test:

- Parent team: `Nested Mixed Runtime Delivery Team`
- Parent member: `program_manager` using AutoByteus/LM Studio model `qwen/qwen3.5-35b-a3b:lmstudio@127.0.0.1:1234`
- Nested child team: `BuildSquad`
- Child coordinator: `BuildSquad/review_lead` using Codex App Server model `gpt-5.4-mini`
- Child sibling: `BuildSquad/qa_specialist` using Claude Agent SDK model `haiku`

## Positive Recheck: Previous Communication Store Failure Is Fixed

Run id:

`team_nested-mixed-runtime-delivery-team_eb3d23d5`

Validation prompt sent to `program_manager`:

```text
Call send_message_to exactly once now with these exact JSON arguments: {"recipient_name":"BuildSquad","content":"Reply with exactly FRONTEND_PARENT_TO_SUBTEAM_R8_1778656426841 and nothing else.","message_type":"frontend_parent_to_subteam_r8"}. Do not call any other tool.
```

Observed live result:

- `program_manager` executed `send_message_to` successfully.
- `BuildSquad/review_lead` replied exactly `FRONTEND_PARENT_TO_SUBTEAM_R8_1778656426841`.
- Frontend `teamCommunication.getMessagesForTeam(teamRunId)` contained one message without manual hydration.
- The message had canonical flattened source/target identity:
  - sender route/path/kind: `program_manager`, `['program_manager']`, `agent`
  - receiver route/path/kind: `BuildSquad`, `['BuildSquad']`, `agent_team`
- Focusing `program_manager` displayed one Team message addressed to `BuildSquad` with the `TEAM` badge.
- Focusing `BuildSquad` produced a received-message perspective.

Screenshots:

- `/Users/normy/.autobyteus/browser-artifacts/382035-1778656478050.png`
- `/Users/normy/.autobyteus/browser-artifacts/382035-1778656693356.png`

## Failure 1: Live Child Coordinator Conversation Omits The Inbound Inter-Agent Message

### Expected

When the parent sends an inter-agent message to the nested child team and the child coordinator responds, focusing `BuildSquad/review_lead` should show the full child conversation in order, including the inbound/user-side message that caused the reply. At minimum the live child coordinator transcript should show:

1. The inbound prompt, e.g. `You received a message from sender name: program_manager ... Reply with exactly FRONTEND_PARENT_TO_SUBTEAM_R8_1778656426841 and nothing else.`
2. The child coordinator reply, e.g. `FRONTEND_PARENT_TO_SUBTEAM_R8_1778656426841`.

### Actual

The focused `BuildSquad/review_lead` live UI showed only the reply token in the center conversation. It did not show the inbound inter-agent/user message. The right Team tab showed `0 Messages` for the leaf coordinator perspective, while the central transcript also omitted the inbound message.

Browser text captured from the current UI after opening the affected child coordinator includes:

```text
review_lead
Offline
...
FRONTEND_PARENT_TO_SUBTEAM_R8_1778656426841
...
Messages
0 Messages
No team messages yet
```

Screenshot:

`/Users/normy/.autobyteus/browser-artifacts/382035-1778657119879.png`

### Backend/Projection Evidence

The backend persisted/opened child coordinator projection does include the inbound message, proving the nested runtime delivered the prompt to the coordinator and the durable projection knows about it.

GraphQL probe for `team_nested-mixed-runtime-delivery-team_e3fc8a99`, member route `BuildSquad/review_lead`:

- `conversation.length === 4`
- Entry 0: `role: user`, content begins `You received a message from sender name: program_manager, sender id: program_manager_f3766c8f0512173a` and includes `Reply with exactly FRONTEND_PARENT_TO_SUBTEAM_R8_1778656426841 and nothing else.`
- Entry 1: `role: assistant`, content `FRONTEND_PARENT_TO_SUBTEAM_R8_1778656426841`
- Entries 2 and 3 repeat the same pair with `ts: null` (see Failure 3 below)

GraphQL communication projection for that same parent run also contains the canonical parent-to-subteam team communication message:

```json
{
  "senderMemberRouteKey": "program_manager",
  "senderMemberPath": ["program_manager"],
  "senderMemberKind": "agent",
  "receiverMemberRouteKey": "BuildSquad",
  "receiverMemberPath": ["BuildSquad"],
  "receiverMemberKind": "agent_team",
  "content": "Reply with exactly FRONTEND_PARENT_TO_SUBTEAM_R8_1778656426841 and nothing else.",
  "messageType": "frontend_parent_to_subteam_r8"
}
```

### Likely Boundary

This appears to be a live frontend projection/streaming issue for child coordinator conversations. The runtime and backend durable projection know the inbound message exists, but the live `BuildSquad/review_lead` focused conversation does not receive/render the corresponding user/inbound event. The fix should preserve the canonical team communication record while also ensuring child coordinator conversation projection receives the inbound message in the live stream path.

## Failure 2: Active vs Opened/Stopped Nested Member Labels Are Inconsistent

### Expected

Nested member rows should use a consistent display model across active runs and opened/stopped history runs. The UI should not switch between agent definition display names and member route/member names for the same seeded team hierarchy.

### Actual

In the newly created/open active run, the sidebar/tree labels showed definition-style agent names:

- `Nested Program Manager Agent`
- `Nested Review Lead Agent`
- `Nested QA Specialist Agent`

In an opened/stopped/history run for the same team definition and member tree, the sidebar/tree labels showed route/member names:

- `program_manager`
- `review_lead`
- `qa_specialist`

The screenshot at `/Users/normy/.autobyteus/browser-artifacts/382035-1778657119879.png` shows both styles in the same left history/workspace area for adjacent runs of the same seeded nested team.

This is likely not only cosmetic: route/path identity is central to nested team focus, approval routing, run-history restore, communication perspectives, and user debugging. The presentation layer should not make the same member appear to be different entities depending on whether the source is live context or history metadata.

## Failure 3: Opened Child Coordinator Projection Contains Duplicate Conversation Entries

### Expected

Opening a stopped/history nested child coordinator should render each persisted message once.

### Actual

GraphQL `getTeamMemberRunProjection` returned duplicate child coordinator messages after opening/restoring the nested member projection.

For `team_nested-mixed-runtime-delivery-team_eb3d23d5`, member route `BuildSquad/review_lead`:

- `conversation.length === 8`
- Entries 0-3 are the expected two user/assistant pairs with non-null `ts` values:
  - parent-to-subteam inbound prompt
  - `FRONTEND_PARENT_TO_SUBTEAM_R8_1778656426841`
  - subteam-focus prompt
  - `FRONTEND_SUBTEAM_FOCUS_R8_1778656486750`
- Entries 4-7 repeat the same four messages with `ts: null`.

For `team_nested-mixed-runtime-delivery-team_e3fc8a99`, member route `BuildSquad/review_lead`:

- `conversation.length === 4`
- Entries 0-1 are the expected inbound/reply pair with timestamps.
- Entries 2-3 repeat the same pair with `ts: null`.

This looks like a restore/open projection merge problem, likely combining two projection sources without deduplication.

## Focused Commands Re-run In This Validation Round

Backend focused communication/stream tests:

```bash
pnpm -C autobyteus-server-ts exec vitest run \
  tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts \
  tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts \
  --reporter=dot
# Result: 2 files passed, 12 tests passed
```

Frontend focused communication/stream tests:

```bash
pnpm -C autobyteus-web exec vitest run \
  services/agentStreaming/__tests__/TeamStreamingService.spec.ts \
  stores/__tests__/teamCommunicationStore.spec.ts \
  components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts \
  components/workspace/team/__tests__/TeamOverviewPanel.spec.ts \
  --reporter=dot
# Result: 4 files passed, 24 tests passed
```

Static check:

```bash
git diff --check
# Result: passed
```

## Classification

`Local Fix` to `implementation_engineer`.

Rationale: the reviewed nested-team design direction is clear. Backend recursive metadata, parent-to-subteam delivery, child runtime execution, and canonical team communication projection all work. The remaining issues are bounded implementation defects in live child conversation projection/display, nested member presentation consistency, and restore/open projection deduplication.
