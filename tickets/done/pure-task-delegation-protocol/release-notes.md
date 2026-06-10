# Release Notes — Pure Task Delegation Protocol

## Improvements

- Replaced the task-agent lifecycle with the explicit protocol `delegate_tasks`, `submit_task_result`, and `review_task_result`.
- Task-agents now submit reviewable results through `submit_task_result`; original delegators accept or request revision through `review_task_result`.
- Result and revision notifications are sent by the system, with deterministic warning payloads if notification delivery fails after a valid lifecycle mutation.
- Task-delegation events now include explicit result/review identity fields such as `submissionId`, `pendingSubmissionId`, `reviewId`, and `reviewedSubmissionId`.
- Task-agent settlement after acceptance now also waits for no non-terminal work assigned to that task-agent and no non-terminal child delegations owned by that task-agent.

## Cleanup

- Removed the active `accept_task` model-facing tool path.
- Removed active docs/tests/prompts references to old `mark_task_completed`, `mark_task_failed`, `accept_task`, and `awaiting_acceptance` lifecycle names.
- Clarified long-lived docs that `send_message_to` remains ordinary teammate communication only, not the task result/review/acceptance protocol.

## Validation Notes

- Authoritative API/E2E evidence now lives in `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md`; the old validation-report path is a supersession note.
- Focused deterministic task-delegation suite passed: 9 files / 47 tests.
- Gated mixed-runtime E2E file imports and skips by design without live flags; its durable assertions now encode the new result/review lifecycle for opt-in live execution.
- TypeScript build config no-emit, package build, removed-name scan, and `git diff --check` passed in upstream review/validation.
- Static E2E influence audit reviewed all 42 `*.e2e.test.ts` E2E files and confirmed old task lifecycle names are not present in E2E coverage; task-delegation protocol coverage is confined to the corrected mixed-runtime E2E file.
- Live AutoByteus/LMStudio + Codex model E2E remains an explicit opt-in validation path and was not counted as completed evidence.
