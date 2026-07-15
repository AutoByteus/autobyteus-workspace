## What's New
- Replaced the backend agent task-delegation tool with singular `delegate_task` for one delegated task per tool call.
- `delegate_task` now accepts direct `member_name`, `description`, and optional `reference_files` fields instead of a top-level `tasks` array.
- Multiple independent delegated tasks are represented by multiple `delegate_task` calls, matching the one task-agent lifecycle per delegated task.

## Improvements
- Cleaned task-delegation tool descriptions and runtime guidance to use positive-only field guidance.
- Scoped delegation activation to the task created by the current tool call, avoiding accidental activation of unrelated stale `not_started` delegation records.
- Updated Agent Tools MCP/native AutoByteus exposure, runtime instructions, docs, and durable tests to use the singular public contract.
- Strengthened mixed-runtime coverage to prove product-facing tool catalog exposure, real `delegate_task` execution, Codex `submit_task_result`, and `review_task_result` revision/acceptance through runtime events.

## Compatibility Notes
- The old public/model-facing `delegate_tasks` tool and `tasks[]` batch envelope are intentionally removed.
- Existing `submit_task_result` and `review_task_result` semantics remain unchanged for tasks created by `delegate_task`.
- Any external prompt, integration, or test fixture that still calls `delegate_tasks` must be updated to call `delegate_task` once per delegated task.
