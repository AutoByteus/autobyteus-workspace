# API-F-004 — Root Team Is Misclassified As A Transient Task-Team Child

## Result

- API/E2E revision: `API-REV-003`
- Result: `Fail — focused source-origin review required`
- Preliminary owner: `implementation_engineer`, subject to `code_reviewer`
- Production source changed by API/E2E: `No`
- Operational database action: `None`
- Protected `127.0.0.1:60004` / `127.0.0.1:31004` action: `None`

## Governing Behavior

The approved `team-execution-tree-ui-ux-spec.md` requires:

- task Agent rows underneath the canonical logical Agent placement (UXJ-001);
- task AgentTeam rows underneath the canonical logical AgentTeam placement (UXJ-002);
- a placement without tasks to show only its persistent execution;
- exact `agentRunId` focus and exact `teamRunId` expansion without exposing or inventing a second root execution row.

This implements R-015–R-016 and R-047; AC-018, AC-040, AC-052–AC-054.

## Reproduction

From `autobyteus-web`:

```bash
pnpm test:nuxt --run stores/__tests__/runHistoryNavigationProjection.spec.ts
```

The currentized fixture builds one current root Team containing one configured `/worker` Agent and one active task Agent at the same logical placement. The durable expectation uses only current `agentRunId` / `rowKey` identities and no removed `TeamExecutionAddress` type.

Expected visible history execution rows:

1. `stable_member:agent:team-a-worker-run`
2. `transient_execution:agent:team-a-task-run`

Observed:

1. `transient_execution:team:team-a` — an invented duplicate root row
2. `stable_member:agent:team-a-worker-run`
3. `transient_execution:agent:team-a-task-run`

Result: 1 failed / 5 passed in the focused file. The failure is exact and deterministic.

## Source Origin

`projectNavigationRows()` includes the root configured Team as `team:team-a`. `buildRunHistoryTeamExecutionRows()` indexes only `team.rootTeam.children` as stable rows. The root has no stable counterpart, so the code falls through to `RunHistoryTransientExecutionRow` and classifies every non-`task_agent`/non-`task_team` execution as `task_team_child`.

The resulting UI evidence from the historical-team integration rendered a second row named `Team team-a` at address `/` with `data-transient-kind="task_team_child"` beneath the already-present Team run row. The configured Agent and task Agent were then nested under that duplicate root rather than presented directly under the Team run's logical hierarchy.

This is not a stale assertion: the expected hierarchy is explicit in the approved UI/UX artifact, and the fixture uses the current V1 tree, current `TeamExecutionViewState`, current task record, exact AgentRun IDs, and current row keys.

## Required Review Question

Confirm whether the implementation should:

1. omit the already-represented root configured Team from `buildRunHistoryTeamExecutionRows()`, and
2. normalize descendant depth/parent expansion so each task row is directly grouped under its logical configured placement,

without reintroducing composite addresses, a second frontend execution owner, fallback identity, or compatibility behavior.

## Evidence

- `../repository/api-f004-navigation-projection-focused.log`
- `../repository/api-f004-source-origin-audit.log`
- historical DOM reproduction log retained at `api-rev-002/repository/web-currentization-history-integration-r2.log`
