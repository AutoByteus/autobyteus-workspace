# API-FIND-021 — real standalone Team task submission stalls

- Artifact: `43ef19f2de69b2c16133577dac40471f75ebd913` (IR-032 / CRR-044 Pass)
- Scenario: `LIVE-006`, normal imported `AORG E2E Research Squad`, Codex App Server / GPT-5.6-Sol / low / Auto approve tools, actual `open_tab` browser.
- Root TeamRun: `aorg_e2e_research_squad_2bca3e83e531484ca08af4446c716dfd`
- Task: `task_14677c387408431b896143b6e82eba2f`
- Task AgentRun: `aorg_e2e_verifier_63c52739dfc64a2ba19ed3631b15711c`
- Tool call: `submit_task_result`, provider call ID `exec-57c491b0-8dbb-45a5-919d-4cb9c374012d`, dispatched at `2026-09-06T13:46:52.819Z`.

## Expected

The valid task Agent has explicit `submit_task_result` access, submits exactly once, the call returns promptly, and the root task transitions durably from `active` to `awaiting_review` before the delegator accepts it.

## Observed

The task Agent loaded the correct task-assignee instructions and emitted exactly one `submit_task_result` tool call with the exact message and empty references. After the bounded 240-second poll—and again more than six minutes after dispatch—there was no tool result. The durable task sidecar remained `active` with `updates: []`; the selected task monitor showed the tool call perpetually Thinking/In progress. GraphQL still returned HTTP 200, so this was not a server-process crash. The ordinary lead→analyst message from the same initial provider turn committed and rendered successfully before the stalled submission.

The verifier tool exists and was dispatched, so this is not the previously corrected missing-tool fixture. The scenario uses one valid task only and does not mix a self-review task, so it is not the historical API-FIND-008 confound. Exact MCP-ingress/queue boundary is not instrumented in this run; preliminary origin is **Unclear within the production standalone-Team task tool path** (provider dispatch → Agent Tools MCP ingress/adapter → root Team task queue/persistence). Focused failure-origin review is required; no speculative timeout/replay fix is proposed.

## Evidence

- `LIVE-006-standalone-team-task.mjs/.log/.partial.json`
- `API-FIND-021-task-sidecar-after-timeout.json`
- `API-FIND-021-team-tree-after-timeout.json`
- `API-FIND-021-boundary-evidence.log`
- runtime task Agent raw trace (exact path under the TeamRun)
- `screenshots/API-FIND-021-team-task-submit-selected.png`

## Termination correlation

Normal Team termination at `2026-09-06T13:52:44Z` returned promptly and durably interrupted the task. Only after that retirement did the server log a late Codex `item/completed` for the task Agent rejected as `CODEX_SEGMENT_TURN_INACTIVE`; no submitted update had committed. This isolates the failure from shutdown: root termination succeeded, and the later direct application SIGTERM exited cleanly with status 0. The late provider completion is relevant origin evidence but does not prove whether the original `submit_task_result` request crossed MCP ingress or entered the task queue.
