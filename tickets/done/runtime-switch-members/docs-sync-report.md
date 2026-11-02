# Docs Sync Report — autobyteus-348 (runtime-switch-members)

## Scope

- Ticket: `runtime-switch-members` (Project Task autobyteus-348); `task_size` and `architectural_risk` as carried by the route (reviewed: ARCH-REV-001, CRR-001…004 Pass, API-REV-001 then API-REV-002 Pass 92%, test-code review CRR-005 Pass)
- Base: `origin/personal` @ `c952758a81`, not advanced since the ticket's base; docs verified on the branch head `8843594310`
- Post-integration verification: `evidence/DEL-01-post-integration-checks.md`

## Why Docs Were Updated

The agent runtime switch now reaches Team members, Org members (direct and in mounted Teams) and delegated copies, with renamed GraphQL commands. The implementation updated ten docs; delivery verified them against the final code.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `GLOSSARY.md` | scope of "Agent runtime switch" and "Pending agent runtime switch" | No change (updated in the ticket) | names the four run kinds and where the pending record lives |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team selections and the member switch | No change (updated in the ticket) | `updateStoppedSelections`, `team-run-selection-mutator`, `applyRuntimeSelection`, `selectionContextFor`, `ConfiguredAgentExecutionHandle`, `ConfiguredAgentActivationPlanner`, `beginSwitch` all exist in `src/`; the `begin → prepare → record → commit → publish` order matches the built-server cases |
| `agent_orgs.md`, `agent_communication.md`, `run_history.md`, `agent_work_journal.md`, `llm_management.md` | Org command, copies, mutation names, per-file runtime, capacity rule | No change (updated in the ticket) | `updateStoppedTeamRunSelections`, `selectionPatches` exist in `src/`; no old name remains |
| `autobyteus-web/docs/settings.md`, `chat.md`, `agent_execution_architecture.md` | the web rows, drafts and chat | No change (updated in the ticket) | `runtimeKind` required on every Team, Org and delegated setting; `codegen:check` passes |

## Docs Updated

By delivery: none. New delivery artifact: `release-notes.md`.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Target Doc |
| --- | --- | --- |
| One runtime-selection rule for standalone, member and copy | `applyRuntimeSelection`: model-only edit, switch, undo | `agent_team_execution.md`, `run_history.md` |
| Member switch at activation; partly activated Team is normal | each linked member switches at its own first input | `agent_team_execution.md` |
| Pending switch is server state, not on the wire | tree shapes carry no `pendingRuntimeSwitch` | `agent_orgs.md`, `agent_team_execution.md` |

## Removed / Replaced Components Recorded

| Old Component | What Replaced It | Where Documented |
| --- | --- | --- |
| `updateStoppedTeamRunModelConfigs`, `UpdateStoppedTeamRunModelConfigs*`, `modelPatches` | `updateStoppedTeamRunSelections`, `UpdateStoppedTeamRunSelections*`, `selectionPatches` | `run_history.md`, `agent_team_execution.md`; no hit outside tickets |

## Delivery Continuation

- Result: `Pass`. Follow-ups: FU-C1 (three copy launch-rule mirrors, guarded by a parity test) and FU-C2 (stale `existing-run-model-config` probe fails 4 checks as at the base) in `follow-ups.md`.
