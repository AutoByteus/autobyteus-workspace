# Investigation Notes

## Investigation Meta

- Package identifier: `delegated-copy-model-change`
- Request / ticket: Project Task `project_task_025b20cb-3fcb-438e-b910-cad1cd0c286b` from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-13: "Let the user change the model of a delegated copy (task agent or task agent team) from its Settings".
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-model-change`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-model-change` / `codex/delegated-copy-model-change`
- Resolved base remote / branch / revision: `origin` / `personal` / `a609de982a22925299d550bea4084e578cc5cd60` (fetched 2026-10-13)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: worktree created; ticket folder `tickets/in-progress/delegated-copy-model-change/`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-005`
- Authorities read (requirements reading gate): `references/requirements-engineering.md` (read in this conversation, 2026-10-12); repository `AGENTS.md`.
- Investigation status: requirements and architecture investigation complete (2026-10-13). Architecture gate authorities read in this conversation: `architecture-design.md`, `design-principles.md`, `DESIGN.md`, the migration guideline, `TESTING.md`.

## Initial Request And Clarifications

- Original request: see `requirements-doc.md` → Problem. The user can open a delegated copy but cannot change its model. The Settings list says "Shown as they run; they cannot be edited here." For runs the user launched, the model can be changed when stopped.
- User-supplied direction (Task text):
  - the runtime is already decided and stays fixed, but the model should be changeable;
  - a user choice is the highest launch precedence;
  - it applies to an Agent copy and to Team copy members (one member or the whole team), running or stopped;
  - the team designs when it takes effect, persistence across idle shutdown and wake-up, recording as the user's choice, and how it shows in Settings.
- Related: Task `b2d9b725` (stopped-run model switch blocked when the model is no longer offered); routing Task `871c0af0`; the Settings list built in `e2060dfd` (`035b208d5`, `e645f03143`).

## Source Log

| Date | Source Type | Exact Source | Why | Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-13 | Doc | `tickets/done/runtime-specific-stopped-model-switch/requirements-doc.md` | Existing model-switch contract | Model edits only through **stopped**-run Settings; runtime fixed; explicit Save; per-scope validation against the fresh runtime catalog and the target settings schema; capacity check only for AutoByteus (target ≥ current); external runtimes have no capacity gate; Save keeps run/provider identity and history and takes effect on normal resume; no hot-swapping of an active run | Reuse the same validation and continuity rules for copies |
| 2026-10-13 | Code | `autobyteus-server-ts/src/run-history/services/studio-run-model-config-service.ts` | Existing edit service | `updateStoppedAgentRunModelConfig`, `updateStoppedTeamRunModelConfigs`; editability `RUN_ACTIVE` when live; team scopes are only `CONFIGURED_TEAM` / `CONFIGURED_AGENT` | No scope kind covers collaborators or copies |
| 2026-10-13 | Code | `agent-team-execution/services/team-run-model-config-mutator.ts` | Patch shape | Patch = `{scopeKind, scopeAddress, llmModelIdentifier, llmConfig}`; only configured nodes; replaces model and settings, keeps runtime | Model + model settings is the existing editable pair |
| 2026-10-13 | Code | `llm-management/services/run-model-selection-service.ts` | Validation | AutoByteus-only capacity rule; catalog + schema validation for all | Same rule for copies |
| 2026-10-13 | Code | `agent-collaboration/execution/task/root-task-execution-lifecycle.ts:325-430` | Copy lifecycle | Copies are shut down after an idle grace (`DEFAULT_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS = 600_000`, i.e. 10 min; `config/task-execution-idle-shutdown-setting.ts`) only when quiet, at **task-execution granularity** (a whole Team copy). The next message restores the chain from records (`acquireLiveLease` → `restoreChain`) | Waiting for a copy-level idle shutdown would delay a change by ≥10 min and indefinitely while teammates are busy |
| 2026-10-13 | Code | `agent-team-execution/task-delegation/team-task-execution-adapter.ts:193-260` | Restore source | Restore builds runtime nodes from recorded sources (`sources.requireAgent(…)`); shutdown via `tryShutDownDirectTaskExecutionIfQuiet` | A recorded user choice is picked up on restore |
| 2026-10-13 | Code | `agent-collaboration/execution/backends/configured-agent-execution-handle.ts:240-300` | Per-agent runtime | Each agent handle can `releaseRuntime(closeInput=false)` and lazily re-initialize on next input (`ensureReady`); `tryPrepareTerminationIfQuiescent` exists per agent | A single agent can switch at its next turn without stopping its teammates (design to confirm) |
| 2026-10-13 | Doc | `tickets/done/delegated-team-member-lazy-activation/requirements*.md` | Member activation | Team copy members start lazily on first message; per-member idle shutdown was out of scope there | Not-started members simply start on the changed model |
| 2026-10-13 | Code | `autobyteus-web/components/run-settings/ExistingRunSettings.vue`; `RunMembersSection`/`RunMemberRow` (after SR-006 of `delegated-launch-config-defaults`); localization `runSettings.delegated.description` | Current UI | Collaborators/copies are rendered read-only, collapsible; text: "Shown as they run; they cannot be edited here." Root and configured members are editable only when the run is stopped | The UI surface exists; it needs editable copy rows |
| 2026-10-13 | Code | `run-history/domain/run-execution-tree-shared-records.ts` (incl. `LaunchConfigurationSource` from `delegated-launch-config-defaults`) | Records | Copies record a resolved launch + source (`agent_default`/`team_default`/`inherited`) on catalog sources and collaborator entries; copies of configured placements and extra copies at collaborator addresses carry no own launch | The user's choice needs a per-instance record and a new source origin |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current Path | Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Open Settings of a run with delegated copies/collaborators | Read-only rows with runtime, model, source, notes | No edit | Source log | High |
| BEH-002 | User | Stopped user-launched run: change root/configured member model, Save | Validated per scope; applies on resume | Works | Prior ticket | High |
| BEH-003 | System | Copy idle → shutdown; message → restore from records | Whole copy granularity | Values from records | Lifecycle | High |
| BEH-004 | System | Team copy member first receives work | Lazy start from recorded values | — | Lazy-activation ticket | High |
| BEH-005 | System | New copies (delegate_task, bring-in) | Resolved by agent default → team default → inherited | Unchanged by this Task | delegated-launch-config-defaults | High |

## Persisted Data And State Facts

- Affected subject: run execution trees (collaborator entries, task executions and their members).
- Required: a user choice survives idle shutdown/restore, root stop/reopen and app restart; older records stay readable.
- Acceptable loss: none.
- Transition decision: architecture phase (expected: optional fields with truthful absence, as in `delegated-launch-config-defaults`).

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution / Owner | Status |
| --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Exact mechanism for switching a live, idle agent of a running copy at its next turn (per-agent release + re-init vs. runtime-native per-turn switch) | Architecture | Open |
| RSK-001 | Risk | A provider may reject a resumed history on a smaller model (external runtimes own context limits; prior ticket accepted this) | Same visible-error rule as stopped-run switching | Accepted |
| RSK-002 | Risk | Bug `b2d9b725` (AutoByteus capacity evidence for a no-longer-offered current model) also affects copies on AutoByteus | Separate Task; same validation service | Open |

## Requirement Implications

- The edit surface already exists (collapsible Settings rows); the gap is editability, lifecycle timing for live copies, and a per-instance record.
- (Superseded by SR-004.) Waiting for a copy-level idle shutdown is not acceptable timing, which first led to the next-turn idea. The user then chose stop-then-edit.

## Architecture Investigation Findings (2026-10-13)

> **Superseded in part (SR-004):** the REQ-004 "next turn when quiet" clarification and the UNK-001 "quiet release" resolution below belong to the withdrawn SR-003 live-switch design. The current design is stop-then-edit; see Stop-then-edit Findings and the SR-005 Review Findings.

| Source | Observation | Implication |
| --- | --- | --- |
| `agent-collaboration/execution/backends/configured-agent-execution-handle.ts:55-110` | The handle keeps `options.execution` (a `ConfiguredAgentExecutionSpec`: runtime, model, settings, approval, workspace) fixed for its life | A switch needs `replaceExecutionSpec` |
| same file `:150-170, :300-385` | `ensureReady` reuses an active run; otherwise `initializeReady` releases the old run and `prepareActivation` builds `AgentRunConfig` from the spec in restore mode (same conversation and binding) | Release + next input = restore on the new model, the path proven by stopped-run switching |
| same file `:240-300` | `releaseRuntime(closeInput=false)`; `tryPrepareTerminationIfQuiescent` per agent | A quiet release is available per agent (no whole-copy shutdown) |
| `agent-execution/domain/agent-run.ts:165-300` | Busy-time input is admitted into the run's `inputAdmissionState`, may be `append_to_active_turn`, and carries delivery observers; it is drained after lifecycle changes | Queued input can't move to a new session safely, so the switch waits until quiet. This is the basis of the **REQ-004 clarification** (messages already waiting finish on the old model) |
| `agent-team-execution/services/team-run-collaborators.ts:111-135` | Live tree mutation via `persistence.commitExecutionTreeMutation` with `commitAfterDurability` | Live-root command pattern |
| `agent-team-execution/services/agent-team-run-manager.ts:242-300` | Stopped edit: `withRootTransition`, store read, admission/archive checks, `validateMany`, write | Stopped command pattern |
| `run-history/services/studio-run-model-config-service.ts` | API service for model config; configured scopes only | Sibling service for delegated selections |
| `UNK-001` | Resolved: per-agent spec replacement + quiet release; no runtime-native hot switch | — |

## Stop-then-edit Findings (SR-004, 2026-10-13)

| Source | Observation | Implication |
| --- | --- | --- |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue:149-151, 301-303` | Root agent and team run rows show a `heroicons:stop-20-solid` icon calling `actions.onTerminateRun` / `onTerminateTeam` | The same icon and placement for copy rows (user: "just like the parents") |
| `WorkspaceTransientExecutionRow.vue`, `AgentRunTaskRows.vue`, `WorkspaceTeamExecutionTree.vue` | Copy rows have no stop | Add the stop icon there |
| `agent-team-execution/local/flat-team-execution-manager.ts:207-226` | `releaseDirectTaskExecution` (forced; used on Task close) and `tryShutDownDirectTaskExecutionIfQuiet` (idle) per copy | Add a user-forced shutdown that ends in the idle-shutdown (restorable) state, without the close semantics |
| `agent-collaboration/execution/backends/root-team-execution-directory.ts:220-245`; `root-agent-execution-registry.ts:190-230` | `releaseTask` closes input (`releaseRuntime()` default `closeInput=true`); restore after close needs `discardReleased…` | User Stop must not use the close path |
| `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | Queue kinds `activate`/`wake`/`shutdown`/`reopen` serialize lifecycle steps | Stop goes through the queue |

## SR-005 Review Findings Verified (ARCH-REV-001, 2026-10-13)

| Finding | Verified in code | Note |
| --- | --- | --- |
| AR-001 | Root operation gates count in-flight operations for drain only (not mutual exclusion). Wake = lifecycle queue `wake` (`acquireAtHead` → `restoreChain`); collaborator wake = handle `ensureReady` on message delivery (not queued) | The check → commit → swap step must be serialized against wake |
| AR-002 | `agent-collaboration/execution/task/task-copy-host.ts`: copies are hosted in the delegator's Team instance only for teammate addresses; catalog, collaborator-address and Org-level copies go to the **root**. `TaskAgentExecution`/`TaskTeamExecution.delegatorAgentRunId` (optional; absent on older records). Task helpers: `TaskExecutionJoin` role `broughtIn` with `creator` (`task-execution-resource-port.ts:9-22`) | The Stop set is chosen by lineage |
| AR-003 | Recorded collaborator Team / catalog Team copy members carry `launchConfiguration` only when they run on their own default (delegated-launch-config-defaults writer rule) | "Follows its team" uses the recorded fact |
| AR-004 | Existing configured Save and the new delegated Save are separate writes | Single stopped-root command |
