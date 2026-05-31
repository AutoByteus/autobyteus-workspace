# API/E2E Reroute: Frontend Task-Agent Lifecycle UX Clarification

## Context

During Round 6 browser/frontend validation, the backend-supported mixed-runtime task-delegation flow passed at the API/runtime level:

- AutoByteus/LMStudio Qwen coordinator called `delegate_tasks`.
- Codex `gpt-5.5` worker task-agent received the delegated work packet.
- Worker task-agent called `update_task_status`.
- Coordinator received the framework terminal completion notification.
- Backend status/projection showed team idle, coordinator idle, worker offline, and worker task update result with `settlement_requested: true`.

## User-Reported UX Expectation

The user clarified that the desired frontend behavior is likely stronger/different from what was observed:

- Since the coordinator delegates a task, the worker task-agent instance should visibly show up as work starts.
- When the worker task-agent finishes/exits, that worker/task-agent instance should disappear from the frontend.
- This is analogous to sub-agent UX in other frameworks: the delegated worker instance is task-scoped and should not remain visually present as an active instance after completion.

## Observed Frontend Behavior

Observed in the browser after task completion:

- The frontend does **not** render a separate task-agent instance/member row.
- The logical team member row `worker` remains visible.
- The task-agent activation appears inside the logical worker conversation as a task packet, including:
  - `Task-agent instance: task_agent_task_0001`
  - `Task-agent run: team_browser-mixed-task-delegation-team-4999e_59b83a78__worker__task_0001`
  - lifecycle wording saying the framework must settle the task-agent instance after terminal status.
- After terminal completion, the logical `worker` is shown as `Offline` in the header and row/status indicator.
- There is no separate active task-agent row to disappear, because the current UI projects task-agent work into the logical worker member conversation.

## Evidence

- Screenshot showing completed worker view / worker offline after task-agent completion:
  - `/Users/normy/.autobyteus/browser-artifacts/146733-1780132748581.png`
- Earlier screenshot from the same browser validation:
  - `/Users/normy/.autobyteus/browser-artifacts/146733-1780132510883.png`
- Round 6 validation report:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/api-e2e-validation-report.md`
- Browser validation session data:
  - `/tmp/autobyteus-browser-task-ui-20260530-110606/session.env`
  - `/tmp/autobyteus-browser-task-ui-20260530-110606/team-seed.json`

## Classification

This should be routed to `solution_designer` as a requirement/design clarification or gap.

Reason: backend settlement semantics are implemented and validated, but the frontend UX semantics for task-agent visibility/disappearance were not explicitly specified. The observed UI may be technically correct for logical-member projection, but it does not match the user's expected sub-agent-like UX where a task-scoped worker instance appears and then disappears/exits.

## Questions For Solution Designer

1. Should the frontend represent delegated task-agent instances as separate transient entities/rows/cards, distinct from the logical member row?
2. If yes, what exact lifecycle should be visible?
   - Appears when `TASK_DELEGATION_ACTIVATED` is received?
   - Shows running status while the task-agent is active?
   - Shows terminal/completed briefly, then disappears?
   - Remains in history/activity only after settlement?
3. Should the logical worker member row remain visible and offline after its task-agent settles, or should only the transient task-agent instance be hidden?
4. Does the acceptance criterion require frontend disappearance of a task-agent instance, beyond backend no-active-run/offline settlement?

## Recommended Next Step

Solution designer should clarify the intended frontend task-agent lifecycle model and update requirements/design if the task-agent must be shown as a separate transient sub-agent instance that disappears after settlement.
