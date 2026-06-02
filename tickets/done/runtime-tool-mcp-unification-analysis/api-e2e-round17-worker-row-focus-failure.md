# API/E2E Round 10 Failure: Settled Task-Only Worker Row Can Still Be Focused And Targeted

## Status

- Classification: `Local Fix`
- Recommended recipient: `implementation_engineer`
- Trigger: Round 17 code-review pass for CR-009 / CR-010 active-execution focus and running-sidebar fixes.
- Validation date: 2026-05-31.

## Summary

The updated frontend partially fixes the Round 14 worker-row semantics issue, but API/E2E found a remaining blocking failure:

- A delegated task-agent appears while active and disappears after terminal completion/settlement.
- The running-list projection does not show the worker as an active row after settlement.
- However, the workspace/team tree still shows a clickable `worker` row for this task-delegation-only worker.
- Clicking that residual `worker` row after settlement changes the focus-mode header/body to `worker` with status `Initializing`.
- The composer then sends `SEND_MESSAGE` with `target_member_route_key: "worker"` and a worker-scoped dedupe key.

This still lets active execution UI/focus and send routing target the task-only logical worker after final task-agent settlement, which violates the current requirements/design clarification.

## Environment

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis`
- Backend: built with `pnpm -C autobyteus-server-ts build`, then started from `autobyteus-server-ts/dist/app.js`.
- Backend URL: `http://localhost:8000`
- Frontend URL: `http://localhost:3000`
- Runtime path: AutoByteus/LMStudio Qwen coordinator + Codex `gpt-5.5` worker.
- Session metadata: `/tmp/autobyteus-worker-row-round17-20260531-065711/session.env`
- Seed metadata: `/tmp/autobyteus-worker-row-round17-20260531-065711/team-seed-round17-latest.json`

## Team / Run

- Team definition: `round13-browser-task-agent-team-53d69f6b`
- Team run: `team_round13-browser-task-agent-team-53d69f6b_32411f4e`
- Task-agent run observed while active: `team_round13-browser-task-agent-team-53d69f6b_32411f4e__worker__task_0001`
- Completion token: `ROUND17_WORKER_ROW_DONE_53d69f6b`
- Output file: `/tmp/autobyteus-worker-row-round17-20260531-065711/workspace-approval/round17-worker-row-53d69f6b.txt`

## Steps Performed

1. Started fresh backend/frontend from current reviewed worktree state.
2. Seeded a two-member team:
   - `coordinator`: AutoByteus runtime, LMStudio Qwen model.
   - `worker`: Codex runtime, `gpt-5.5`, auto-execute tools.
3. Opened the team run in the browser at the coordinator context.
4. Sent the coordinator a message requiring it to call `delegate_tasks` with one ready-to-run task assigned to `worker`.
5. Worker task asked Codex to run a shell command that slept, wrote the output file, then called `update_task_status` completed with `ROUND17_WORKER_ROW_DONE_53d69f6b`.
6. Observed active task-agent UI while the worker was active.
7. Waited for terminal completion and task-agent settlement/removal from active card UI.
8. Clicked the residual `worker` row in the workspace/team tree after settlement.
9. Probed the composer send path while blocking the actual WebSocket send; captured the `SEND_MESSAGE` payload.

## Passing Evidence Within This Run

### Transient task-agent appears while active

Browser DOM showed:

```text
ACTIVE TASK AGENTS
1
TASK AGENT
worker task task_0001
team_round13-browser-task-agent-team-53d69f6b_32411f4e__worker__task_0001
Running
```

Screenshot:

- `/Users/normy/.autobyteus/browser-artifacts/07bbea-1780203621697.png`

### Task-agent active card disappears after settlement

After terminal completion, browser DOM showed no `ACTIVE TASK AGENTS` block, and completion remained visible through coordinator/system notification history:

```text
Delegated task completed.
Member: worker
Status: completed
Message: ROUND17_WORKER_ROW_DONE_53d69f6b
```

Screenshot before clicking the residual worker row:

- `/Users/normy/.autobyteus/browser-artifacts/07bbea-1780203669847.png`

Output file proof:

```text
ROUND17_WORKER_ROW_FILE_53d69f6b
```

## Failing Evidence

### Residual worker row remains clickable after settlement

After settlement, the visible workspace/team tree still contained:

```text
C coordinator
W worker
```

Clicking `W worker` after settlement changed focus-mode UI to:

```text
W
worker
Initializing
Focus
Grid
Spotlight
```

Screenshot after clicking the residual worker row:

- `/Users/normy/.autobyteus/browser-artifacts/07bbea-1780203800482.png`

### Composer still targets worker after settlement

After clicking the residual `worker` row, a blocked WebSocket-send probe captured this payload:

```json
{
  "type": "SEND_MESSAGE",
  "payload": {
    "content": "ROUND17_FOCUS_TARGET_PROBE_DO_NOT_SEND",
    "context_file_paths": [],
    "image_urls": [],
    "target_member_route_key": "worker",
    "message_id": "client_c5797697-bf90-4ac8-99a8-ce6c9c2540b5",
    "dedupe_key": "member_input:team_round13-browser-task-agent-team-53d69f6b_32411f4e:worker:client_c5797697-bf90-4ac8-99a8-ce6c9c2540b5"
  }
}
```

The probe intercepted and blocked the send before it reached the backend, but the frontend payload proves the active composer target still becomes the task-only `worker` route after settlement.

## Why This Fails Acceptance

The current requirements/design say:

- A task-delegation-only worker must not remain as an offline execution row in active run UI after its final task-agent instance settles.
- Logical members/templates may appear only in clearly labeled roster/config/available-member surfaces, not as active/offline execution participants.
- The visible worker execution entity for task-delegation-only work must disappear after completion.
- Active focus/body/composer/send target should not use the task-only logical worker after settlement.

The fix removes the active task-agent card and appears to clean the running-list projection, but the residual workspace/team `worker` row still behaves like an execution participant: it can be selected, changes the focus-mode header/body to `worker Initializing`, and sends messages to `target_member_route_key: "worker"`.

## Required Follow-Up

Please implement a local fix so that after final task-agent settlement for task-delegation-only workers:

1. The active execution UI/focus-mode body cannot focus or display the logical `worker` as `worker Initializing`, `worker Offline`, or equivalent execution state.
2. The composer/send/interrupt/draft target cannot become `target_member_route_key: "worker"` through the residual task-only worker row.
3. Any remaining logical member/template/roster surface is clearly separated from active execution and cannot masquerade as or target a settled task-agent execution participant.
4. The completion remains visible through coordinator/system notification/history, not by selecting a lingering worker execution row.

No repository-resident durable validation code was added during this API/E2E run; this artifact and the main API/E2E report record the failure.
