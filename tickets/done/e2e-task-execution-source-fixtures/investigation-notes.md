# Investigation Notes — Two server e2e tests fail since autobyteus-197 (missing `source` in fixtures)

## Meta

- Package: `e2e-task-execution-source-fixtures`; Project Task `autobyteus-211`
- Requested by: `/project_task_manager` (follow-up O-1 from the Delivery Engineer of autobyteus-190)
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/e2e-task-execution-source-fixtures`, branch `codex/e2e-task-execution-source-fixtures`, base `origin/personal` @ `dc530fdcb0e52aa70ce681f33df94c80f5d2334c` (fetched 2026-10-20); finalization target `origin/personal`
- Authorities read: the updated `SKILL.md`, `references/ticket-scope.md`, `references/handoff.md`; the template and design-principles diffs (2026-10-20); `requirements-engineering.md`, `architecture-design.md`, `design-principles.md`, `DESIGN.md`, `TESTING.md` (this conversation)
- SR: `SR-001`

## How each finding was established

| Finding | Established by |
| --- | --- |
| Both tests fail on current `personal` | **Reproduced**: `env -i … pnpm -C autobyteus-server-ts exec vitest run tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts` gives `rootTeam.taskExecutions[0] is missing required field(s): source.` and, for the stream contract, `source: expected object, received undefined` (plus the task-team source fields) |
| The cause is the required `source` added by autobyteus-197 | **Read**: `src/run-history/store/task-execution-source-schema.ts` (`parseTaskAgentExecutionSource` requires `kind`, `agentDefinitionId`, `launchConfiguration`; the task-team variant requires `kind`, `teamDefinitionId`, `coordinatorAddress`, `members`, `handoffs`, `defaultLaunchConfiguration`); `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts` L124-152, L213 (`source` required in `TaskAgentExecutionDto` / `TaskTeamExecutionDto`). Commits `65ae647bc9` (server) and `35675e3b5e` (contracts), both on `origin/codex/delegated-copy-restore-from-own-file` |
| No other suite fails for this reason | **Run**: `autobyteus-team-stream-contracts` 19/19, `autobyteus-collaboration-stream-contracts` 34/34, `autobyteus-agent-presentation-contracts` 18/18. **Evidence from later deliveries on bases after 197**: full server e2e (autobyteus-190 API-02: only these two FAIL, 89 passed); server unit 6116 passed (autobyteus-193 DR-02); web 4571 passed (autobyteus-190) |
| Other fixtures without `source` (a text scan found about 30 test files) | **Read + run**: they pass, because they intentionally build released/old shapes (migration tests), or build projection or web inputs that are not validated against the new record schema. They are not failing drift. They may be stale at the *type* level; see FU-001 |
| Why autobyteus-197's validation missed it | **Read**: `tickets/done/delegated-copy-restore-from-own-file/api-e2e-execution-coverage-report.md` (API-09 ran only three named e2e files; no full `pnpm test:e2e`). 197 changed a contract package and the run-history schema, which TESTING.md "Rerun by impact" rule 4 counts as a shared foundation (rerun everything). Test files are not type-checked (`TeamRunExecutionTreeSnapshot` requires `source`, so `tsc` over the tests would have flagged the memory fixture): `autobyteus-65` |

## Valid shapes to follow

- Record (camelCase): `tests/unit/run-history/team-run-current-package-schema.test.ts` L75-86: `source: { kind: "agent", agentDefinitionId, launchConfiguration }`; the task team `source: { kind: "agent_team", teamDefinitionId, coordinatorAddress, handoffs: [], defaultLaunchConfiguration, members: [{ address, agentDefinitionId, launchConfiguration, followsTeam }] }`.
- Stream DTO (snake_case): `autobyteus-team-stream-contracts/tests/team-task-executions-closed.test.mjs` L16: `source: { kind: "agent", agent_definition_id, launch_configuration }`, plus the task-team equivalent in the same file.

## Prerequisites

None.
