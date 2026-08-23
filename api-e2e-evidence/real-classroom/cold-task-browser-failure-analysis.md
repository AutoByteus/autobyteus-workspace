# Cold Task Browser Failure Analysis

## Result

`NTH-BR-001` **failed** in the realistic Nested Classroom journey. The backend repair is effective: after an abrupt server stop and a correctly configured cold restart, the exact delegated task AgentRun remains byte-identical and its public projection and Event Monitor data are non-empty. The normal workspace UI nevertheless cannot expose or focus that historical task AgentRun once cold recovery settles the task execution.

This is a direct failure of `AC-002` and the browser portion of `AC-012`.

## Exact Fixture

- Root TeamRun: `nested_classroom_test_team_ef79cfb19d364f558b6f5e5ae2e08194`
- Direct-root Teacher AgentRun: `test_teacher_bef770a8abd34551bbdd38d8be2a06cf`
- Delegated task TeamRun: `team_local_team_nested_classroom_test_student_st_1eb9bd0abbba4bb587c2af48aafe4bfc`
- Delegated task member AgentRun: `student_one_e7a87cdb646e4678ac5ffacf5a82dcbe`
- Real-provider result token: `API_E2E_REAL_ACTIVE_COLD_RESTART_OK`
- Provider/runtime: imported private Nested Classroom package, AutoByteus agent package, real `deepseek-v4-flash` execution.

## Expected Versus Observed

Expected after cold restart:

1. Expand `/StudentStudyGroup` in the historical workspace tree.
2. See the historical delegated-task execution row for `student_one_e7a87cdb646e4678ac5ffacf5a82dcbe`.
3. Select that exact AgentRun and render its task input, reasoning, `submit_task_result` activity, result token, and last-activity metadata.

Observed:

1. Direct-root Teacher history is non-empty and renders the original prompt plus `delegate_task` control.
2. The Team panel renders the exact task record, description, and `Interrupted` status.
3. Expanding `/StudentStudyGroup` renders configured member rows only; historical transient task-row count is `0`.
4. Invoking the same normal history-store action for the exact task AgentRun rejects with `AgentRun 'student_one_e7a87cdb646e4678ac5ffacf5a82dcbe' is not live.`

## Backend Counter-Evidence To A Storage Failure

After restart, public GraphQL returns:

- task conversation entries: `4`
- task activities: `2`
- task Event Monitor events: `4`
- non-null task last activity
- direct-root conversation entries: `6`
- direct-root activities: `2`
- task record status: `interrupted`

The task raw trace SHA-256 before and after restart is identical:
`7ebeddb768bc0ce87e1c740e388e957ec624086290372a2558c5f8c2953d0a04`.

This isolates the failure to historical frontend task visibility/focus after cold recovery rather than canonical storage, migration, projection, or Event Monitor lookup.

## Preliminary Source Call Chain

- `autobyteus-web/services/teamExecution/teamExecutionTreeSelectors.ts`: `addTask()` returns immediately for `task.settled_at`, removing the task and its task-Team members from navigation projection.
- `autobyteus-web/services/teamExecution/teamExecutionViewState.ts`: `focusAgent()` requires a matching projected navigation row and otherwise rejects with `TEAM_AGENT_RUN_NOT_VISIBLE` / “is not live.”
- `autobyteus-web/stores/runHistorySelectionActions.ts`: `openTeamMemberRunFromHistory()` uses the normal `openTeamRun()` path and propagates that rejection.

Cold recovery legitimately interrupts the formerly active task and assigns `settledAt`; therefore the backend can still serve exact historical traces while the frontend hides and rejects the target.

## Evidence

- Pre-restart task UI: `live-active-task-member-before-cold-restart.png`
- Post-restart UI control and missing row: `live-active-cold-ui-team-control-and-missing-task-row.png`
- Semantic probe result: `live-cold-ui-gap-result.json`
- Probe execution log: `live-cold-ui-gap.log`
- Post-restart API summary: `live-active-graphql-after-restart-summary.json`
- Complete post-restart API payload: `live-active-graphql-after-restart.json`
- Byte proof: `live-active-byte-preservation-summary.txt`
- Correct cold-restart backend log: `backend-active-cold-restart.log`
- Cleanup proof: `cleanup-report.txt`

## Preliminary Classification

`Local Fix` owned by implementation: a bounded frontend historical-navigation integration defect. Focused `code_reviewer` failure-origin review is required before rework. After source correction, durable frontend coverage must include a settled delegated task-Team execution loaded from historical state and prove both row visibility and exact task-Agent focus.
