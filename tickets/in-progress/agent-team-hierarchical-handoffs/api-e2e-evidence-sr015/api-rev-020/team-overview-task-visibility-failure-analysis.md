# API-REV-020 Delegated-Task Overview Visibility Failure Analysis

## Classification

- Finding: `API-F-013`
- Scenario: `API-UI-TASK-020-001`
- Result: `Fail`
- Preliminary origin: bounded frontend implementation defect; focused failure-origin review requested from `code_reviewer`.
- Requirements / acceptance criteria: `R-039`, `UC-021`, `AC-036`.
- Current reviewed state: `SR-015` / `ARCH-REV-009` / `IR-023` / `CRR-042`; HEAD `619a442eebe7c6a1fce8d38d03ed2e7a7c71ed07`.

## Exact current-contract reproduction

The existing `TeamOverviewPanel.spec.ts` assertions already require the Team tab to count and open visible delegated work when a task execution is present. API-REV-020 converted only the obsolete fixture shape to the approved current model:

- one rooted `AgentTeamContext.rootTeam`;
- stable focused Agent execution address `{rootTeamRunId, taskTeamRunIds: [], memberAddress: "/implementation_engineer", taskAgentRunId: null}`;
- a distinct live task-Agent node at the same logical member address with `isTaskExecution: true`, a `taskId`, and a non-null `taskAgentRunId`;
- a task-scoped `AgentContext` keyed by the exact task execution address.

Command:

```bash
pnpm -C autobyteus-web exec vitest run \
  components/workspace/team/__tests__/TeamWorkspaceView.spec.ts \
  components/workspace/team/__tests__/TeamOverviewPanel.spec.ts \
  --no-watch
```

Observed:

- `TeamWorkspaceView.spec.ts`: `12/12` pass.
- `TeamOverviewPanel.spec.ts`: `4/8` pass, `4/8` fail.
- All four failures report the same material symptom: the current task execution is present, but the header remains `Tasks0 tasks` rather than `1 task`; task auto-open and new-task reopening consequently do not occur.

Evidence: `repository/team-overview-current-task-visibility-failure.log`.

## Expected versus observed behavior

| State | Expected | Observed |
| --- | --- | --- |
| A task-Agent projection is already present while its stable delegating Agent is focused | Team overview counts the live delegated task, opens Tasks, and exposes its details | `Tasks0 tasks`; Tasks remains closed |
| A current task-Agent projection appears while the panel is mounted | Count changes to one and Tasks opens | Count remains zero |
| A second current task identity appears | Tasks reopens for new work after a manual collapse | No visible task signature exists, so it does not reopen |
| Selection changes to a TeamRun containing a current task projection | The new run shows one task and opens Tasks | Count remains zero |

This is not a removed-schema assertion. The unchanged behavioral assertions existed before API-REV-020; only their pre-canonical `memberRouteKey/memberPath` fixture was replaced with exact `TeamExecutionAddress` and rooted-tree data.

## Causal source boundary

`TeamOverviewPanel.vue` passes `activeTeamContext.focusedExecutionAddress` to `deriveDelegatedTaskEntries(...)` for every render. The current focused value is the stable Agent execution address.

For a live node not yet paired with a persisted record, `teamDelegatedTaskEntries.ts` retains it only when the task node's full execution address equals that stable focused address. Exact identity correctly makes those values unequal because the live task node has a `taskAgentRunId`. The valid live task is therefore filtered out before the component computes its count/signature:

```ts
const live = liveNodes.filter((node) => !consumed.has(node)).filter((node) => {
  if (focusedAddress === undefined) return true;
  return addressKey(node.executionAddress) === addressKey(focusedAddress);
});
```

The source audit also proves neither production file has an API/E2E worktree diff. Evidence: `repository/team-overview-task-visibility-source-audit.log`.

This current filtering leaves a timing-critical visibility hole: streaming has already materialized the distinct live task execution, but the task record is absent or not yet refreshed. That is precisely when the user must be able to see that delegated work. The correction must preserve strict canonical identity and must not substitute or merge the persistent Agent node for the task execution.

## Correlation to user-visible report

The user's retained screenshot shows the focused persistent `Teacher` after successful `delegate_task` for `task_0003`, while the Team panel reports `0 tasks` and the hierarchy contains no visible task execution row:

`/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_e4b7ee1b5b9a4f7e9f0d3bfcd6ad0f58/api_e2e_engineer_8f6ca9f96bee47b0a6800e585a9132e2/context_files/ctx_02b1634dd5e5__image.png`

The deterministic current-contract reproduction matches the task-count/overview portion of that symptom and explains why a live task projection alone does not become visible under a stable focused member.

## Other API-REV-020 evidence retained

- Safe disposable-target recent-`RUNNING` readable-migration process lifecycle: pass, including exit `1`, exact marker, no listen, and ordinary stale retry convergence.
- Server full build/bootstrap: pass.
- Maintained current-contract web selection: `25 files / 162 tests` pass before the final broader component conversions.
- Additional current component conversions: `3 files / 18 tests` pass.
- Proportionate latest-base broad discovery: `75 files / 464 tests` executed; its remaining old-fixture failures are non-authoritative and maintenance stopped when the current-contract product failure was isolated.
- Cumulative API-REV-020 durable delta at halt: `1 added / 24 updated / 0 removed`, preserved for resumption and not submitted as a successful-test package.

## Halt and outstanding validation

API-REV-020 stops at the first critical current-contract product failure. Fresh post-integration AutoByteus, Codex, and Claude browser/provider rows were not started and are `Not Tested`; they cannot turn this result into a pass. After source correction and code review, API/E2E must resume with the retained durable delta, rerun this exact component boundary, finish broader current coverage, and execute the mandatory safe isolated three-runtime browser/provider matrix.

The user-held `127.0.0.1:60004` / `127.0.0.1:31004` stack remains on PIDs `71461` / `73207` and was not stopped, restarted, repointed, or used for API-REV-020 execution. API-REV-014 and API-REV-018 operational database incidents remain disclosed; API-REV-020 never targeted or inspected the operational database.
