# Runtime Reproduction Evidence

## Status And Scope

- Status: Complete
- Approval applicability: N/A — evidence only; this file does not define intended behavior.
- Environment: The user's already-running Electron server at `http://127.0.0.1:29695` and its Team WebSocket endpoint.
- Isolation: One newly allocated Classroom Simulation TeamRun was used. Neither reported production TeamRun was mutated.
- Fixture: `classroom_simulation_team_4c3801479a874b13ad3cf91b67bba633`
- Cleanup: The fixture was gracefully terminated and permanently deleted at `2026-08-19T04:43:55.248Z`. Its catalog row and package directory were verified absent afterward.

## Reproduced Configuration

The fixture matched the two reported runs:

| Member | Runtime | Model | Auto-execute tools |
| --- | --- | --- | --- |
| `/professor` | `AUTOBYTEUS` | `deepseek-v4-flash` | `false` |
| `/student` | `CODEX` | `gpt-5.6-luna` | `false` |

Both members used `PRELOADED_ONLY` and `/Users/normy/.autobyteus/server-data/temp_workspace`.

## Experiment A — Stop While Tool Approval Is Pending

1. Created the exact isolated TeamRun at `2026-08-19T04:41:12.814Z`.
2. Initial Team snapshot reported root lifecycle `is_active=true` while both configured members were `offline`. This is the normal lazy-member state before the first member command.
3. Sent a professor prompt requiring `run_bash pwd`.
4. Received `TOOL_APPROVAL_REQUESTED` at `2026-08-19T04:41:14.869Z` for invocation `call_00_JcClFKa88Cq27cN5KdVC7501`. The root checkpoint was `changeSequence=191`, `hasOpenExecutionWork=true`.
5. Called the same `terminateAgentTeamRun` GraphQL mutation used by the Electron stop action at `2026-08-19T04:41:14.912Z`.
6. The Team stream projected `is_active=false` at `2026-08-19T04:41:16.312Z`, but the mutation did not complete. The client request timed out after 60 seconds at `2026-08-19T04:42:14.920Z`.
7. The pending invocation was then explicitly denied through the exact AgentRun stream only to clean up the experiment. The turn completed, the runtime stopped, and the persisted history received `terminatedAt=2026-08-19T04:43:09.278Z`.

### Code-Correlated Cause

- `RootTeamRun.terminate()` immediately changes the root lifecycle from `active` to `terminating`.
- `MixedAgentMemberHandle.prepareTermination()` delegates to `AgentRun.prepareTermination()` without first interrupting the active turn.
- `AgentRun.prepareTermination()` waits for input quiescence. A turn blocked on a tool-approval decision cannot become quiescent on its own.
- `AgentTeamRunManager.getTeamRun()` unregisters any root for which `root.isActive()` is false. Because `terminating` makes `isActive()` false, a normal projection read can remove the still-terminating root from manager lookup before termination finishes.

Therefore the stop request can wait indefinitely for a user decision it is supposed to supersede, while manager-visible lifecycle already changes. This is a real termination defect, not only a missing delete icon.

## Experiment B — Clean Restore Control

1. After the pending tool was denied and termination completed, restored the same fixture at `2026-08-19T04:43:53.541Z`.
2. The resume query and Team stream reported root `isActive=true` while both `/professor` and `/student` were `offline`.
3. Sent a new professor message. The professor was lazily restored, entered `running`, and completed the turn with `CONTINUED` at `2026-08-19T04:43:54.895Z`.
4. A normal idle stop completed successfully at `2026-08-19T04:43:55.227Z`; exact fixture deletion completed at `2026-08-19T04:43:55.248Z`.

This control proves that `active root + all configured members offline` is a supported transient/resumable state. It is not itself evidence of a broken Team. The broken behavior is that stop does not resolve a pending approval, and the two originally reported roots additionally experienced the separately logged native-conversation restoration failure.

## Exact Evidence Sources

- Electron server log: `/Users/normy/.autobyteus/server-data/logs/server.log`, beginning near line `2810755` for the fixture.
- Fixture execution package was under `/Users/normy/.autobyteus/server-data/memory/agent_teams/classroom_simulation_team_4c3801479a874b13ad3cf91b67bba633/` during the experiment and was removed by the exact cleanup mutation.
- Reproduction driver used the public GraphQL and WebSocket contracts implemented by the current Electron build; it did not call internal in-process methods or edit stored files.
