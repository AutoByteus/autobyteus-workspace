# API/E2E Round 12 Frontend Task-Agent Validation Failure

## Classification

Local Fix to `implementation_engineer`.

The requirements/design already state that supported browser/frontend task delegation must show concrete task-agent instances as transient active entities while active and remove them after settlement. Round 12 implementation/code review claimed CR-006/CR-007 fixed frontend task-agent identity projection and approval routing, but browser validation still could not observe the required active task-agent entity or approval UI.

## Validation Environment

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis`
- Backend: `http://localhost:8000`, built from current Round 12 code, temporary data dir `/tmp/autobyteus-browser-task-ui-round12-20260530-133200/data`
- Frontend: `http://localhost:3000`, Nuxt dev server from current Round 12 source
- Session metadata: `/tmp/autobyteus-browser-task-ui-round12-20260530-133200/session.env`
- Runtime mix: AutoByteus/LMStudio Qwen coordinator (`mlx-qwen3.5-35b-a3b-claude-4.6-opus-reasoning-distilled:lmstudio@127.0.0.1:1234`) + Codex `gpt-5.5` worker

## Evidence 1: Runtime path still works but frontend shows no task-agent entity

Seed/run:

- Seed JSON: `/tmp/autobyteus-browser-task-ui-round12-20260530-133200/team-seed-round12.json`
- Team definition: `round12-browser-task-agent-team-2436ca97`
- Browser-triggered run: `team_round12-browser-task-agent-team-2436ca97_b54c2db2`
- Completion token: `ROUND12_BROWSER_TASK_DONE_2436ca97`

Backend/runtime evidence:

- Worker projection contains a task-agent activation packet with:
  - `Task-agent instance: task_agent_task_0001`
  - `Task-agent run: team_round12-browser-task-agent-team-2436ca97_b54c2db2__worker__task_0001`
- Worker projection contains selector-free `update_task_status` success with:
  - `status: completed`
  - `message: ROUND12_BROWSER_TASK_DONE_2436ca97`
  - `settlement_requested: true`
- Coordinator projection contains framework terminal notification and final completion response.

Frontend/browser evidence:

- After completion, browser DOM did not contain `Task agent`, `task_agent`, or `__worker__task` as a visible active entity.
- Running/team UI showed only the logical team run with logical `coordinator` / `worker` rows/cards; no separate transient task-agent row/card/entity was observed.
- Screenshot showing the running list with logical coordinator/worker only: `/Users/normy/.autobyteus/browser-artifacts/8592f9-1780141105965.png`
- Screenshot showing the team view focused on coordinator, not a transient task-agent entity: `/Users/normy/.autobyteus/browser-artifacts/8592f9-1780141147115.png`

## Evidence 2: Approval-required task-agent tool call not surfaced to frontend

A second browser run used a Codex worker configured with `autoExecuteTools: false` and tools `run_bash` + `update_task_status` so the task-agent would hold on an approval-required tool call.

Seed/run:

- Seed JSON: `/tmp/autobyteus-browser-task-ui-round12-20260530-133200/team-seed-round12-approval-latest.json`
- Team definition: `round12-browser-approval-task-agent-team-7a3daeff`
- Browser-triggered run: `team_round12-browser-approval-task-agent-team_4cd6c984`
- Output file: `/tmp/autobyteus-browser-task-ui-round12-20260530-133200/workspace-approval/round12-task-agent-approval-7a3daeff.txt`
- Completion token: `ROUND12_APPROVAL_TASK_DONE_7a3daeff`

Backend/runtime evidence:

- `getTeamRunResumeConfig` showed logical worker config `autoExecuteTools: false`.
- `getTeamMemberRunProjection(... memberRouteKey: "worker")` showed repeated concrete task-agent activation packets because the coordinator retried delegation, including task-agent run ids such as `team_round12-browser-approval-task-agent-team_4cd6c984__worker__task_0001`.
- Worker projection summary after termination:
  - 29 conversation items
  - 9 task-agent activation packets
  - 9 `tool_call_pending` entries for `run_bash`
  - 9 `update_task_status` completed entries with `settlement_requested: true`
- Example pending approval/tool item:
  - kind: `tool_call_pending`
  - toolName: `run_bash`
  - invocationId: `call_U9FJ0SpXa909AFW09dvFzi11`
  - command writes `ROUND12_APPROVAL_FILE_7a3daeff` to the output file.

Frontend/browser evidence:

- Browser body/DOM check after completion reported `taskAgent: false` for `/Task agent|task_agent|__worker__task/`.
- Browser send interceptor recorded no `APPROVE_TOOL` command; only `SEND_MESSAGE`/pings were sent by the page during the observed run.
- No visible approval buttons for the task-agent `run_bash` call were observed, even though backend projection contained `tool_call_pending` task-agent tool calls.
- Screenshot after terminal notification shows only the coordinator-focused conversation/notification; no transient task-agent entity or approval surface is present: `/Users/normy/.autobyteus/browser-artifacts/c6f82e-1780141964422.png`

## Failed Acceptance Criteria

- AC-023: Browser/frontend validation for a supported task-delegation run shows a separate transient task-agent row/card/entity while active.
- AC-024: After terminal status and backend settlement/offline cleanup, the transient task-agent entity disappears from active UI. This cannot pass because no transient entity appears while active.
- AC-025: If a logical worker row/template remains visible, it is structurally distinct from the task-agent instance and is not where the task-agent activation work packet/conversation is stored as a normal member conversation. Current evidence still shows task-agent evidence only in logical member/coordinator projections, not in a visible task-agent entity.
- CR-007 residual validation: approval-required task-agent tool calls could not be approved from frontend because no visible approval request/entity was surfaced; the browser could not send an `APPROVE_TOOL` payload carrying `task_agent_run_id`.

## Recommended Local Fix Direction

Please rework the frontend/browser projection and approval surfaces so that backend task-agent identity payloads create a visible transient task-agent entity keyed by concrete `task_agent_run_id` / `task_agent_instance_id`, route that entity's work packet/conversation/tool lifecycle/approval requests to the transient entity, and remove only that transient entity after backend offline/settlement cleanup.

After the fix, API/E2E should be able to repeat the same browser setup and observe:

1. Coordinator delegates to logical `worker`.
2. A visible task-agent entity appears for `worker` task `task_0001` / concrete `task_agent_run_id`.
3. Work packet and tool lifecycle are shown under that task-agent entity, not just the logical worker template/coordinator surface.
4. For approval-required task-agent tools, an approval UI appears and frontend `APPROVE_TOOL`/`DENY_TOOL` includes concrete `task_agent_run_id`.
5. After terminal `update_task_status` and settlement, the task-agent entity disappears while logical member/template siblings remain intact.
