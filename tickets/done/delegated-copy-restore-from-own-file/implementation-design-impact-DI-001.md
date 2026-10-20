# Implementation Design Impact DI-001

- Ticket: `delegated-copy-restore-from-own-file` (autobyteus-197)
- Raised by: implementation_engineer, 2026-10-19, during Change Sequence step 2 (types and schemas)
- Basis: design-spec SR-004 escalation trigger "a released migration other than `20261017_task_agent_own_run_v1` that imports a changed module"; ARCH-REV-003 handoff ("Escalate ... another released migration that imports a changed module")
- Classification: `Design Impact` (no change to intended behavior; the persisted-data transition plan is incomplete for these imports)
- Protected authority: REQ-005 / AC-009 ("the released migration still produces its released output"), Data Migration Guideline §4 (released migrations keep their released behavior), DESIGN.md rule 8

## Finding

Making `TaskAgentExecution.source` / `TaskTeamExecution.source` required (D-1, D-3) changes the parameter types of the current execution indexes and package validators. Four more released migrations pass **released, pre-own-run trees** (where a configured-place copy has no `source`) into those current modules:

| Released migration | Path into current code | Current modules it calls |
| --- | --- | --- |
| `20260731` working-context snapshot migrations (both: `migrate-native-working-context-snapshots-v5-migration.ts`, `remove-external-runtime-working-context-snapshots-migration.ts`) | `legacy/released-run-package-shapes/released-memory-locations-before-task-agent-own-run.ts:15,17,24,160,179,213` | `TeamExecutionIndex`, `AgentOrgExecutionIndex`, `StandaloneRootExecutionIndex` |
| `20260926_team_context_file_execution_locators_v1` | `legacy/released-run-package-shapes/released-root-packages-before-task-agent-own-run.ts:15,20,186-187,228-229` | `validateTeamRunStatePackage`, `validateAgentOrgStatePackage`, `TeamExecutionIndex`, `AgentOrgExecutionIndex` |
| `20260905_agent_org_history_first_message_summary_v1` | the same released-root-packages module, plus directly `agent-org-history-first-message-summary-v1-app-data-migration.ts:2,100,163` | `validateAgentOrgStatePackage`, `AgentOrgExecutionIndex`, `projectAgentOrgRunHistoryRow` |

The investigation grep (investigation notes, "grep of all migrations for changed modules") and the design's Dependency Rules list only `20261017_task_agent_own_run_v1` and a type-only `LaunchConfigurationSource` import. These four were missed because the indexes were not counted as changed modules, although the design changes `agent-org-execution-index.ts` (`instanceCoordinatorAddress`) and the record type they index.

The legacy README states the dependency is deliberate: "the execution indexes and the layout's path methods are current (their results are unchanged by task-agent-own-run)".

## Evidence of behavior

- Runtime behavior of these migrations is **unchanged** by this ticket. They only call `listAgentExecutions`, `listTeamExecutions`, `getTeamRunPhysicalScope`, `getConfiguredPlacement`, `listAgents`, `listTeams`, `requireAgent`, `getPhysicalScopeForAgent`, `getPhysicalScopeForTeam`, and the validators call only `requireAgent`. None of these reads a copy's `source`. The changed method (`instanceCoordinatorAddress`, reached through `memberOfInstance`) is never called by them.
- They fail to **compile** (`pnpm -C autobyteus-server-ts typecheck`): 9 errors in the three files above, all of the form "released `TaskExecution` (source optional) is not assignable to the current `TaskExecution` (source required)".
- In the 10-17 migration, the same kind of error came from `taskExecutionLinkOf` (which the design keeps). I fixed it in current code by typing its parameter by the fields it reads (`address`, run id, `delegatorAgentRunId`, `startedAt`). That is a tightening, not a cast. The indexes cannot be narrowed that way: they expose the indexed records and current callers rely on `source` being present.

## Options

| Option | What changes | Cost / risk |
| --- | --- | --- |
| A (recommended) | Keep the documented dependency on the current indexes and validators. At the four call sites in released code (two frozen legacy modules and `20260905`), pass the released tree through one named conversion owned by the legacy folder (for example `asCurrentIndexInput(tree)` in `released-trees-before-task-agent-own-run.ts`). Its comment states which index methods may be called with it: those that never read a copy's `source`. Extend the legacy README note: "results unchanged by task-agent-own-run and by delegated-copy-own-file-complete" | Small (about 10 lines in frozen and released code). A type assertion in migration-owned code; the runtime result is identical. Future index changes must keep the listed methods source-independent |
| B | Freeze copies of `TeamExecutionIndex`, `AgentOrgExecutionIndex`, `StandaloneRootExecutionIndex` and both state-package validators (about 914 lines) into the legacy folder, and repoint the four migrations | Fully decoupled (guideline §4). Large frozen surface; the released `20260905` also calls the current `projectAgentOrgRunHistoryRow`, which would need the same treatment |

## Requested decision

Choose A or B (or another resolution) and record it in the design (Dependency Rules, Migration Plan's released-migration repoint, Removal Plan or Change Sequence step 1). Implementation does not depend on this choice beyond these call sites. I will apply it when the revised design arrives.

## Implementation state at escalation

- Committed: `3ed550595c` (step 1 freeze: `released-task-agent-own-files-with-origin.ts`; `coordinating-run-migration.ts` repointed; 10-17, append-only and skip-version tests pass on it).
- Uncommitted work in progress in the worktree (does not compile yet): step 2 types and schemas, step 3 snapshot at birth, step 4 one path (resolvers and `readTaskSource` removed), and part of step 5 (location services, run-view projection, org index, mention viewer).
- No other escalation trigger found so far. Every remaining configured-placement read of a copy is in the Removal Plan or is F-1 (memory targets, skill improvement).
