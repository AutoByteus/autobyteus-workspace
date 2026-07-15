# Browser Validation Evidence — Persist Agent Tasks

## Run Metadata

- Execution date: 2026-07-02
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks`
- Run directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/in-progress/persist-agent-tasks/browser-smoke/run-20260702-114201-nested-live`
- Backend URL: `http://127.0.0.1:8017`
- Frontend URL: `http://127.0.0.1:3017/workspace`
- Corrected fixture after user clarification: `Nested Classroom Test Team` from `/Users/normy/autobyteus_org/autobyteus-private-agents/agent-teams/nested-classroom-test`
- Superseded context only: an earlier `Classroom Simulation Team` smoke was discarded after the user clarified the intended nested-classroom fixture.

## README-Guided Startup

Read startup documentation before launch:

- Server README: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/autobyteus-server-ts/README.md`
  - Uses `pnpm -C autobyteus-server-ts build` and `node autobyteus-server-ts/dist/app.js --data-dir /path/to/data --host ... --port ...`.
- Web README: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/autobyteus-web/README.md`
  - Uses Nuxt dev server (`pnpm dev` / `pnpm -C autobyteus-web dev`) and external backend URLs.

Commands used:

```bash
pnpm -C autobyteus-server-ts build
AUTOBYTEUS_AGENT_PACKAGE_ROOTS="/Users/normy/autobyteus_org/autobyteus-agents,/Users/normy/autobyteus_org/autobyteus-private-agents" \
AUTOBYTEUS_TEMP_WORKSPACE_DIR="$RUN_DIR/data/temp_workspace" \
node autobyteus-server-ts/dist/app.js --data-dir "$RUN_DIR/data" --host 127.0.0.1 --port 8017

NUXT_PUBLIC_GRAPHQL_BASE_URL=http://127.0.0.1:8017/graphql \
NUXT_PUBLIC_REST_BASE_URL=http://127.0.0.1:8017/rest \
NUXT_PUBLIC_WS_BASE_URL=ws://127.0.0.1:8017/graphql \
pnpm -C autobyteus-web dev --host 127.0.0.1 --port 3017
```

Notes:

- The first backend start failed because the temporary data directory did not contain `.env`; this was corrected by creating `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/in-progress/persist-agent-tasks/browser-smoke/run-20260702-114201-nested-live/data/.env` and restarting.
- Backend logs show the corrected server preloaded 28 agent-team definitions.
- Backend log: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/in-progress/persist-agent-tasks/browser-smoke/run-20260702-114201-nested-live/logs/backend.log`
- Backend restart log: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/in-progress/persist-agent-tasks/browser-smoke/run-20260702-114201-nested-live/logs/backend-restart.log`
- Frontend log: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/in-progress/persist-agent-tasks/browser-smoke/run-20260702-114201-nested-live/logs/frontend.log`

## Fixture Visibility

GraphQL/browser validation confirmed the imported team definition:

- Team id: `nested-classroom-test`
- Team name: `Nested Classroom Test Team`
- Coordinator: `Teacher`
- Nodes:
  - `Teacher` (`AGENT`)
  - `StudentStudyGroup` (`AGENT_TEAM`, team-local nested team)

Relevant package files:

- `/Users/normy/autobyteus_org/autobyteus-private-agents/agent-teams/nested-classroom-test/team.md`
- `/Users/normy/autobyteus_org/autobyteus-private-agents/agent-teams/nested-classroom-test/team-config.json`
- `/Users/normy/autobyteus_org/autobyteus-private-agents/agent-teams/nested-classroom-test/agent-teams/student-study-group/team.md`

## Browser Run Configuration

The browser workspace launched `Nested Classroom Test Team` with:

- Runtime: `codex_app_server`
- Default model: `gpt-5.5` (`OpenAI / GPT-5.5 (default reasoning: medium)`)
- Auto-approve tools: enabled

Screenshot before launch/configuration:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/in-progress/persist-agent-tasks/browser-smoke/run-20260702-114201-nested-live/screenshots/ea5139-1782985475369.png`

Prompt sent from the browser:

```text
Please test nested team delegation. Delegate one task to StudentStudyGroup and ask the students to return exactly NESTED_CLASSROOM_OK. Accept the result if it matches. Keep the final summary brief.
```

## Browser Result

The run was promoted to persisted team run:

- Team run id: `nested_classroom_test_team_ed52f5232e99434397281d85a03e5af6`
- Teacher run id: `test_teacher_11e6aa32cc8748eba9e6e96566af5d84`
- Delegated task id: `task_0001`
- Task-team run id: `studentstudygroup_57d8220343e64a729fa42dffc494f401`

Visible browser outcome:

- `Teacher` called `delegate_task` and delegated `task_0001` to `StudentStudyGroup`.
- `StudentStudyGroup` submitted result `NESTED_CLASSROOM_OK`.
- `Teacher` called `review_task_result` and accepted the result.
- Final visible assistant summary: `Accepted task_0001. StudentStudyGroup returned exactly NESTED_CLASSROOM_OK.`
- Team tab showed `Tasks` with `1 task`.
- Technical details showed:
  - Task type: `task_team`
  - Task ID: `task_0001`
  - Agent team run ID: `studentstudygroup_57d8220343e64a729fa42dffc494f401`
  - Target kind: `team`
  - Target: `StudentStudyGroup › task team studentstudygroup_57d8220343e64a729fa42dffc494f401 › student_one`

Screenshots:

- After task completion: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/in-progress/persist-agent-tasks/browser-smoke/run-20260702-114201-nested-live/screenshots/ea5139-1782985688883.png`
- After backend restart/readback with browser still showing the delegated task surface: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/in-progress/persist-agent-tasks/browser-smoke/run-20260702-114201-nested-live/screenshots/ea5139-1782985918391.png`

## Durable Record Evidence

Root-team durable file:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/in-progress/persist-agent-tasks/browser-smoke/run-20260702-114201-nested-live/data/memory/agent_teams/nested_classroom_test_team_ed52f5232e99434397281d85a03e5af6/task_delegation_records.json`

The durable record contains:

- `taskId`: `task_0001`
- `status`: `accepted`
- `receiverTargetKind`: `team`
- `receiverAddress` segments: `StudentStudyGroup` → `task_team studentstudygroup_57d8220343e64a729fa42dffc494f401` → `student_one`
- Submission content: `NESTED_CLASSROOM_OK`
- Review decision: `accept`
- Review content: `Result matches the requested token exactly.`

## Backend Restart / Post-Restart Readback

After the task was accepted, the backend was stopped and restarted against the same data directory with the same agent-package roots. A post-restart GraphQL query returned the same accepted record from `getTaskDelegationRecords(teamRunId: "nested_classroom_test_team_ed52f5232e99434397281d85a03e5af6")`.

Post-restart query evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/in-progress/persist-agent-tasks/browser-smoke/run-20260702-114201-nested-live/post-restart-task-records.json`

The post-restart response asserts:

- exactly one record was returned;
- `taskId` is `task_0001`;
- `status` is `accepted`;
- `receiverTargetKind` is `team`;
- submission update content is `NESTED_CLASSROOM_OK`;
- review update decision is `accept`.

## Non-Blocking Observations

- The initial temporary-data backend start failed until `.env` was created; corrected before executing the browser scenario.
- The backend logs include local provider-discovery warnings for missing Ollama and disabled SSL certificate verification; these are environment/provider-discovery warnings and did not block the Codex/gpt-5.5 run.
- The original live run logged two `TaskTeamSettlementCoordinator` cleanup warnings while settling the task-team run (`Cannot read properties of null (reading 'runId')` and a duplicate active `student_one` run). The user-visible task flow completed, the task-team was accepted, the task appeared in the delegated-task UI, and durable pre/post-restart GraphQL readback passed. Classified as a non-blocking live runtime cleanup warning for this persistence validation, not a task-record persistence failure.
- The restart log contains GraphQL validation errors from a self-induced probe that queried an invalid `taskRunId` field; the corrected query is saved in `post-restart-task-records.json` and passed.
