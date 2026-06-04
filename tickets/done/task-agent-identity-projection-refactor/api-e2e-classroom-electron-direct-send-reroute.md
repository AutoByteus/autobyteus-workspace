# API/E2E Reroute — ClassRoomSimulation Electron Direct Send Does Not Run Professor

## Classification

- Owner requested: `solution_designer`
- API/E2E classification: `Unclear / Design Impact candidate`
- Reason: User-provided live Electron screenshots from the current ticket branch show a normal direct `ClassRoomSimulation` send creating/retaining only the user message while `professor` remains `Offline` and no agent response/tool/event/message appears. The user states the same flow works on `origin/personal`, so this may be a branch-introduced design/projection/hydration/send-target regression rather than an environment-only issue.

## User Evidence

User is running the Electron application built by delivery from the latest current ticket branch.

Screenshots supplied by user:

1. Before send: `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_36cd04cf/api_e2e_engineer_7a52be060fdd9214/context_files/ctx_c0d736cd0c78__image.png`
   - `ClassRoomSimulation` selected.
   - `professor` focused.
   - `professor • Offline`.
   - Composer contains `give student a hard math problem to solve`.
   - Team messages panel shows `0 Messages`.
2. After send: `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_36cd04cf/api_e2e_engineer_7a52be060fdd9214/context_files/ctx_ce21d098e9ad__image.png`
   - `New - ClassRoomSim...` run selected under `ClassRoomSimulation`.
   - `professor` remains `Offline`.
   - Conversation body contains only the user message: `give student a hard math problem to solve`.
   - No assistant/professor response is visible.
   - No `send_message_to` activity/message is visible.

User assertion:

- The problem is visible only in the current ticket branch Electron app.
- The same workflow does not fail on the user's `origin/personal` app.
- Therefore the current ticket branch likely introduced or exposed the issue.

## API/E2E Prior Reproduction Attempt

API/E2E previously could not reproduce the failure in a separate browser/dev-frontend replay:

- Backend: Electron embedded backend verified healthy at `http://localhost:29695`.
- Frontend: separate `pnpm dev` frontend on `http://localhost:3012` pointed at backend `29695`.
- Team run created by GraphQL: `team_classroomsimulation_ff5394b9`.
- Members: `professor` and `student`, both AutoByteus runtime with `deepseek-v4-flash`.
- Prompt sent through frontend composer: `give student a hard math problem to solve`.
- Observed browser replay result:
  - `professor` went `Running`, called `send_message_to`, then `Idle`.
  - `student` received the message and produced an answer.
  - final state became `Idle` for professor/student/team.

Prior replay evidence:

- `/tmp/autobyteus-classroom-readme-latest/session.env`
- `/tmp/autobyteus-classroom-readme-latest/ws-events.jsonl`
- `/tmp/autobyteus-classroom-readme-latest/observations.json`
- `/tmp/autobyteus-classroom-readme-latest/02-after-send-3s.png`
- `/tmp/autobyteus-classroom-readme-latest/04-student-after-run.png`
- `/tmp/autobyteus-classroom-readme-latest/06-professor-activity-panel.png`

## Why This Still Needs Design Investigation

The difference between API/E2E's successful browser replay and the user's failing Electron UI path is itself the validation signal. The replay used GraphQL-created run + dev frontend URL-open path; the user is using the normal packaged Electron UI flow. The bug may be in a flow not covered by the replay, for example:

1. Active execution projection or active context hydration after selecting a newly created team run from the Electron sidebar.
2. `activeContextStore` / `agentTeamRunStore` send target selection for a normal direct logical member (`professor`) after the current refactor.
3. Run-history/open/hydration state for a freshly created direct team run in packaged Electron.
4. Frontend local message acknowledgement path adding the user message without actually sending a start/turn command to the backend.
5. Electron packaged frontend/backend endpoint or websocket subscription path behaving differently from the separate dev frontend replay.
6. Interaction with the already-noted AutoByteus persisted team-message identity gap.

## Persisted Message Identity Observation

During API/E2E's successful AutoByteus classroom replay, persisted AutoByteus direct team communication messages still recorded:

- `senderMemberRouteKey: null`
- `senderMemberPath: null`
- `receiverMemberRouteKey: null`
- `receiverMemberPath: null`

while the live websocket status/turn events carried correct `member_route_key`, `member_path`, `source_route_key`, and `source_path`.

That did not block the replayed flow, but it may be related to history/hydration or UI display behavior in packaged Electron. Solution Designer should decide whether this is in scope for this ticket or a separate requirement gap.

## Requested Solution Designer Investigation

Please investigate this as a design/requirement impact candidate before delivery continues.

Suggested investigation steps:

1. Reproduce using the packaged Electron app from the current ticket branch, not only a separate dev frontend.
2. Use the normal UI path to create/start a fresh `ClassRoomSimulation` team with:
   - runtime: AutoByteus
   - model: `deepseek-v4-flash`
   - members: `professor`, `student`
3. Send `give student a hard math problem to solve` to `professor`.
4. Inspect whether the frontend sends the backend command at all, or only writes a local user message.
5. Inspect the Electron backend logs, websocket events, and memory data under `~/.autobyteus/server-data`, especially the latest `team_classroomsimulation_*` directory.
6. Compare the packaged Electron flow with the dev-frontend/GraphQL-created replay that passed.
7. Determine whether this is:
   - a requirement/design gap in active-execution projection semantics for direct logical members,
   - a local implementation defect in send/open/hydration routing,
   - an Electron packaging/runtime integration issue,
   - or a separate AutoByteus team-message identity/history requirement.

## Current API/E2E Position

API/E2E should not continue to final pass/delivery until this discrepancy is resolved or explicitly scoped. The previous pass evidence is insufficient because it did not cover the exact packaged Electron normal-UI path shown in the user's screenshots.
