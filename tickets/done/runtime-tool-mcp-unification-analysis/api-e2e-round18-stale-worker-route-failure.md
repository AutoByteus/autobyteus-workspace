# API/E2E Round 11 Failure: Stale Worker Route Revives Settled Task-Only Worker Row

## Status

- Classification: `Local Fix`
- Recommended recipient: `implementation_engineer`
- Trigger: Round 18 code-review pass for the API/E2E Round 10 / Round 17 worker-row focus local fix.
- Validation date: 2026-05-31.

## Summary

Round 18 fixes the normal post-settlement active UI path, but API/E2E found a remaining stale-route/stale-selection failure:

- In the normal coordinator-focused browser path, the task-agent appears while active and disappears after terminal settlement.
- After settlement in that normal path, neither `worker task task_0001` nor a plain `W worker` row remains visible in the active workspace/history tree.
- However, navigating the same active team run with stale member focus `workspaceExecutionMemberRouteKey=worker` revives a visible `W worker` row and focuses `worker Offline` with the completed task-agent work packet/history.
- Clicking that revived `W worker` row keeps focus on `worker Offline`; it does not route/fallback to the active execution target (`coordinator`).

The composer send button was disabled in the revived `worker Offline` state and no `SEND_MESSAGE` payload was emitted by the blocked send probe. That means the composer-target portion is improved, but the active workspace/history execution UI can still expose and focus the settled task-only logical worker via stale route/selection. The Round 18 requirement to route stale clicks/selection to active execution is therefore not satisfied.

## Environment

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis`
- Backend build command: `pnpm -C autobyteus-server-ts build`
- Backend URL: `http://localhost:8000`
- Frontend URL: `http://localhost:3000`
- Runtime path: AutoByteus/LMStudio Qwen coordinator + Codex `gpt-5.5` worker.
- Session metadata: `/tmp/autobyteus-worker-row-round18-20260531-072556/session.env`
- Seed metadata: `/tmp/autobyteus-worker-row-round18-20260531-072556/team-seed-round18-latest.json`

## Team / Run

- Team definition: `round13-browser-task-agent-team-2650adf2`
- Team run: `team_round13-browser-task-agent-team-2650adf2_7edb1d2b`
- Task-agent run observed while active: `team_round13-browser-task-agent-team-2650adf2_7edb1d2b__worker__task_0001`
- Completion token: `ROUND18_WORKER_ROW_DONE_2650adf2`
- Output file: `/tmp/autobyteus-worker-row-round18-20260531-072556/workspace-approval/round18-worker-row-2650adf2.txt`

## Steps Performed

1. Stopped stale local dev processes.
2. Rebuilt server dist with `pnpm -C autobyteus-server-ts build`.
3. Started fresh backend/frontend from current reviewed worktree state.
4. Seeded a two-member team:
   - `coordinator`: AutoByteus runtime, LMStudio Qwen model.
   - `worker`: Codex runtime, `gpt-5.5`, auto-execute tools.
5. Opened the coordinator run URL.
6. Sent the coordinator a message requiring `delegate_tasks` with one ready-to-run task assigned to `worker`.
7. Worker task asked Codex to sleep, write a file, then call `update_task_status` completed with `ROUND18_WORKER_ROW_DONE_2650adf2`.
8. Observed active task-agent UI while running.
9. Waited for terminal completion and task-agent settlement/removal.
10. Navigated the same active team run using stale member focus: `workspaceExecutionMemberRouteKey=worker`.
11. Clicked the revived `W worker` row.
12. Probed composer send from the revived worker context while blocking WebSocket send.

## Passing Evidence

### Active task-agent appears while running

Browser DOM showed:

```text
ACTIVE TASK AGENTS
1
TASK AGENT
worker task task_0001
team_round13-browser-task-agent-team-2650adf2_7edb1d2b__worker__task_0001
Running
```

Screenshot:

- `/Users/normy/.autobyteus/browser-artifacts/86fbc9-1780205275355.png`

### Normal coordinator-focused post-settlement path removes worker execution rows

After terminal completion, browser DOM from the normal coordinator-focused path showed:

- no `ACTIVE TASK AGENTS` block;
- no `worker task task_0001` / `WT worker task...` row;
- no plain `W worker` row;
- coordinator remained focused;
- completion remained visible through coordinator/system notification history.

Screenshot:

- `/Users/normy/.autobyteus/browser-artifacts/86fbc9-1780205318093.png`

Output file proof:

```text
ROUND18_WORKER_ROW_FILE_2650adf2
```

## Failing Evidence

### Stale worker route revives the task-only worker row

After normal settlement, navigating to the same run with stale member focus `workspaceExecutionMemberRouteKey=worker` produced browser DOM containing:

```text
W
worker
Offline
Focus
Grid
Spotlight
You have been activated as task agent task_agent_task_0001 ...
Task-agent run: team_round13-browser-task-agent-team-2650adf2_7edb1d2b__worker__task_0001
```

The workspace/history tree also showed a clickable `W worker` row again.

Screenshot:

- `/Users/normy/.autobyteus/browser-artifacts/86fbc9-1780205352708.png`

### Clicking the revived worker row keeps worker focus instead of falling back to active execution

Clicking the revived `W worker` row kept focus on `worker Offline` and did not route to/fallback to `coordinator`.

Screenshot after clicking revived worker row:

- `/Users/normy/.autobyteus/browser-artifacts/86fbc9-1780205397333.png`

### Composer send-target probe

From the revived `worker Offline` state, the send button remained disabled after entering probe text, and no WebSocket `SEND_MESSAGE` payload was captured. This means the composer cannot currently send to `worker` from that stale state, but the visible/focusable task-only worker row remains a blocking active-execution UX failure.

## Why This Fails Acceptance

Round 18 review requested API/E2E to verify:

- task-only logical `worker` row is absent/non-targetable after final settlement;
- stale clicks route to active execution;
- composer payloads cannot target `worker` after settlement.

The normal path passes the absence/removal part and the composer send button does not emit a worker-targeted payload from the stale revived state. However, stale member focus can still revive and select the task-only worker row, and clicking the revived row keeps `worker Offline` focus rather than routing to the active execution target. That is still an active workspace/history execution UI failure under the clarified worker-row semantics.

## Required Follow-Up

Please implement a local fix so that stale route/member selection for a settled task-only logical worker is normalized before hydration/rendering/selection completes. After final task-agent settlement, opening or selecting the run with `workspaceExecutionMemberRouteKey=worker` should not show or focus `worker Offline`; it should fall back to the active execution target such as `coordinator`, or to a clearly separated non-execution history/roster surface that cannot be mistaken for active execution.
