# Design Spec — delegated-copy-model-change

## Solution And Approval Basis

- Current solution revision ID: `SR-007` (the Revision Notes (SR-005), (SR-006) and (SR-007) take precedence over earlier sections where they differ)
- Approved requirements baseline: `requirements-doc.md` at `SR-004` (user, 2026-10-13: the stop-then-edit model and per-copy Stop on the copy's own sidebar row "just like the parents").
- Behavior-defining supplements: none
- Design status: `Ready`
- Canonical investigation notes: `investigation-notes.md` (same folder)
- Authorities read (2026-10-12/13, this conversation): `references/architecture-design.md`, `references/design-principles.md`, repository `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md`, `TESTING.md`.
- Conflicts: none.

## Current-State Read

- **Model editing today** (`StudioRunModelConfigService`, `team-run-model-config-mutator.ts`, Org/agent equivalents) exists only for **stopped** user-launched runs, for the root and configured members (scope kinds `CONFIGURED_TEAM`/`CONFIGURED_AGENT`). Validation goes through `RunModelSelectionService.validateMany`: catalog + settings schema, plus the capacity rule on AutoByteus only. Save writes the stored tree under the root manager's `withRootTransition`.
- **Delegated copies and collaborators** live in the same tree:
  - `CollaboratorEntry`: agent, or team with members;
  - `TaskExecution`: agent, or team with `members: TaskTeamAgentExecution[]` and an optional catalog `source`.
- Their launch values come from:
  - the catalog `source`;
  - the collaborator entry;
  - or the configured placement (copies of configured members and extra copies at collaborator addresses carry no own launch).
  All values are projected by `collaborator-source-projector.ts` and the root task-source resolvers.
- **Live agents** are `ConfiguredAgentExecutionHandle`s holding an immutable `ConfiguredAgentExecutionSpec` (runtime, model, settings, workspace). `ensureReady()` re-initializes a released runtime in restore mode (same conversation and provider binding). `tryPrepareTerminationIfQuiescent()` exists per agent.
- **Copy-level idle shutdown** happens after ≥10 min of quiet, for the whole copy. Input that arrives while an agent is busy is admitted into its live `AgentRun` queue, and may be appended to the active turn.
- **Live roots** mutate their tree through `persistence.commitExecutionTreeMutation({ prepareAgainstCurrent → nextTree, commitAfterDurability })` (for example `team-run-collaborators.ts` `commit`).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale:
  - Persisted record fields on four agent-level and two team-level execution shapes.
  - New GraphQL commands (stop copy, update selections) and a query.
  - A live-root path across three root kinds (Team, Org, standalone Agent), plus a stopped-root path per kind.
  - A forced per-copy shutdown in the task lifecycle and the collaborator hosts.
  - Sidebar Stop.
  - DTO and contract changes in two packages.
  - Web store, projection and row editing.
- Architectural risk: `High`
- Risk rationale: persisted shape; shared contracts; new live-lifecycle behavior (a user-forced copy shutdown on a running root, including nested copies); concurrency between Stop, wake, idle shutdown, restore and Save.
- Escalation trigger: any need to close the Task on Stop, to stop a single member of a live Team copy, to change the runtime, or to migrate stored data → Design Impact to Solution Designer.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision |
| --- | --- | --- | --- |
| Code | `agent-collaboration/execution/backends/configured-agent-execution-handle.ts:55-110,150-170,240-300,304-420` | The spec is fixed at construction; `ensureReady` reuses an active run, else restores; `releaseRuntime(closeInput=false)` keeps input open | A stopped copy restores on the effective launch; retained inactive handles get `replaceExecutionSpec` (SR-004) |
| Code | `agent-execution/domain/agent-run.ts:165-300` | Busy-time input is admitted into the run's queue (`inputAdmissionState`), sometimes appended to the active turn; entries carry delivery observers | Why a live next-turn switch was not pursued; with SR-004 the user stops the copy first |
| Code | `agent-collaboration/execution/task/root-task-execution-lifecycle.ts`, `team-task-execution-adapter.ts` | Copy-level shutdown/restore from records | Restore projects the effective launch including the user's choice (DS-003) |
| Code | `agent-team-execution/services/team-run-collaborators.ts:111-135`; `agent-team-run-manager.ts:242-300` | Live commit pattern; stopped update pattern with validation | Reuse both patterns (DS-001) |
| Code | `llm-management/services/run-model-selection-service.ts` | `validateMany` / `listOptionsMany` with shared catalog evidence | Reuse for validation and options |
| Guideline | `docs/design/data_migration_guideline.md` §3 | Optional fields with truthful absence need no migration | Directly usable |

## Intended Change

1. **Per-copy Stop** (`stopDelegatedExecution`): a user-forced shutdown of one copy/collaborator (agent or team) and the copies inside it.
   - It interrupts turns and releases runtimes, leaving the copy restorable and its Task open.
   - Same end state as idle shutdown: offline; the next message restores it.
   - Exposed on the copy's sidebar row (the same stop icon as parent runs) and on its Settings row.
2. **Record a per-instance user model selection** (model + settings) on each copy/collaborator agent, and a team-level selection on team copies/collaborators.
3. **Compute the effective launch with one rule:** agent selection, then (if the member follows its team) the team selection, then the started value. Used by restore/start, DTO projection and web display.
4. **Edit command** `updateDelegatedLaunchSelections`, allowed only for targets that are stopped (offline) at Save time, for live and stopped roots of all three kinds, validated like stopped-run switching. **Options query** for eligible models.
5. **Web:**
   - Stop icons on copy rows (sidebar and Settings).
   - Copy rows editable while stopped (model and model settings; runtime and approval locked); locked with a hint while running.
   - Source "Your choice", Reset, and the existing Save bar.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing | Change | Target path / spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001,002,007; AC-001,003,008,009,011 | Settings edit + Save on a stopped copy | Read-only rows | Editable rows when stopped → command | DS-001, DS-004 |
| BEH-002 | User/System | REQ-009,004,008; AC-001,002,004 | Stop icon on a copy row; later message | Only idle shutdown / root stop | Forced per-copy shutdown; restore on message on the effective launch | DS-002, DS-003 |
| BEH-003 | System | REQ-005; AC-005 | Idle shutdown/restore, stop/reopen, restart | Started values | Effective launch incl. selection | DS-003 |
| BEH-004 | System | REQ-006; AC-007 | New delegation | Resolution | Unchanged; the selection is per instance | — |
| BEH-005 | Contract | REQ-003; AC-006 | Save | Validation | Same service | DS-001 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` (behavior change on existing owners)
- Current design issue found: `Yes` (bounded)
- Structural triggers:
  - **Repeated coordination:** "a copy agent's launch" is computed in several projector/resolver sites and the four web selectors (only partially centralized by `effectiveMemberLaunchConfiguration` and the contract functions from `delegated-launch-config-defaults`). Adding a third layer at each site would duplicate policy.
  - **Authoritative boundary:** the model-edit service today knows only configured scopes. Copies must not be edited by bypassing the root (live trees are owned by the root object).
- Root cause classification: `Duplicated Policy Or Coordination` (effective launch) + a missing capability.
- Refactor needed now: `Yes` (bounded)
- Design response:
  - Extend the existing effective-launch functions (server domain + contract packages) to one `effectiveCopyAgentLaunch` covering started value, team selection and agent selection. Replace the remaining call sites.
  - Add a root-owned command per root kind, behind one service entry point.
- Residual risk: Stop interrupts work in progress (the user's explicit action).

## Terminology

- **Started launch:** what the copy agent started with (agent default / team default / inherited / configured placement).
- **User selection:** `{ llmModelIdentifier, llmConfig, selectedAt }`, recorded per instance.
- **Follows its team:** a team member whose started runtime and model equal its team's started runtime and model, and that has no own user selection.
- **Stopped (offline):** the copy has no live runtime (after user Stop, idle shutdown, or root stop); restorable by the next message.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: inline effective-launch derivations at the projector/resolver sites and the four web selectors are replaced by the single functions. The read-only-only Settings description string is replaced.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject: team/Org/standalone execution trees (collaborators, task executions).
- Change (all optional):
  - `userLaunchSelection?` on `CollaboratorAgentEntry`, `CollaboratorTeamMember`, `TaskAgentExecution`, `TaskTeamAgentExecution`;
  - `userTeamLaunchSelection?` on `CollaboratorTeamEntry`, `TaskTeamExecution`.
- Readers: tolerant projectors (`requireKeys` presence-only); parse the optional fields when present.
- Semantics: absence = no user choice, which is truthful for every existing record.
- Decision: `Directly Usable — No Migration` (migration guideline §3).
  - Checklist: no new required fact; no startup work; no backup; key-set tests for writers; AC-005 restore of an older record.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001,005 | Settings Save | Persisted tree + response | `DelegatedLaunchSelectionService` → root | Edit command |
| DS-002 | Primary | BEH-002 | Stop icon | Copy offline, restorable | Root task lifecycle / collaborator host | Per-copy Stop |
| DS-003 | Primary | BEH-003 | Restore/start of a copy agent | Runtime node with the effective launch | Projectors via `effectiveCopyAgentLaunch` | Persistence |
| DS-004 | Primary (User) | BEH-001 | Settings open | Editable rows + "Your choice" | Web Settings container | Visibility |

## Primary Execution Spines

- **DS-001:** `ExistingRunSettings Save → existingRunConfigStore.saveDelegated → GraphQL updateDelegatedLaunchSelections(rootKind, rootRunId, changes) → DelegatedLaunchSelectionService → (live root ? root.updateDelegatedLaunchSelections : rootManager.updateStoppedDelegatedLaunchSelections) → resolveDelegatedLaunchTargets(tree, changes) → RunModelSelectionService.validateMany → applyDelegatedLaunchSelections(tree, changes) → persistence commit → (live) handles.replaceSpec → response {outcome, tree DTO}`
- **DS-002 (Stop):** `Sidebar/Settings stop icon → GraphQL stopDelegatedExecution(rootKind, rootRunId, {agentRunId | teamRunId}) → DelegatedLaunchSelectionService → live root.stopDelegatedExecution(target) → (task execution) RootTaskExecutionLifecycle.queue {kind: "shutdown", forced} → adapter.shutDownForUser(reference): nested copies first, then the copy: interrupt + prepareTermination + release per agent/TeamRun (the restorable state, as after idle shutdown; Task stays open) | (collaborator) host collaborator handle/TeamRun forced runtime release keeping the entry and input open → status events → offline`
- **DS-003:** `acquireLiveLease/restoreChain or first input → source projector → effectiveCopyAgentLaunch(started, teamSel, agentSel) → TeamRunAgentNode → handle spec`
- **DS-004:** `run tree DTO (+selections) → contract effective-member functions (+selection) → delegatedLaunchNodes (editable, sourceKey "user_choice" when selected) → RunMemberRow (runtime locked) → draft → Save`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner | Off-spine |
| --- | --- | --- | --- |
| DS-001 | The service locates the root by kind and ID. A live root runs the command inside its operation gate, and first checks that every target (and, for a team target, all its agents) is **offline**; otherwise it returns `COPY_RUNNING` ("stop it and try again"). A stopped root runs it under the manager's root transition (everything is offline). Targets are resolved by explicit identity (`agentRunId` for an agent, `teamRunId` for a team copy or collaborator team), only among open copies and collaborators. Each change is validated against the agent's runtime and **current effective** model (for the AutoByteus capacity rule); a team change is validated once per runtime, with its followers validated too. All-or-nothing: one invalid change refuses the Save. A reset (`selection: null`) removes the selection | Service, root | Validator |
| DS-002 | Stop goes through the root's task lifecycle queue (serialized with wake/activation/idle shutdown), so it cannot race a restore. It stops nested copies first (outermost-last, mirroring restore order), then interrupts and releases the copy's agents. The end state equals idle shutdown: indexed, offline, restorable, Task open. For a collaborator, the root's collaborator host releases its runtimes with input left open; the next message re-activates in restore mode. A copy that is already offline → no-op success | Root lifecycle / collaborator host | Status publication |
| DS-003 | Every place that builds a copy agent's runtime node or execution source applies `effectiveCopyAgentLaunch`, so idle restore, reopen and restart honor the selection | Projectors | — |
| DS-004 | Copy agent rows render the existing `RunSettingsCard` fields (model, thinking, other options) editable, with runtime and approval locked. A team row's card edits the team selection. A selected agent shows source "Your choice"; Reset removes it. The Save bar includes delegated changes; when the root is running, only delegated changes are editable | Web Settings | Options query |

## Ownership Map

- `DelegatedLaunchSelectionService` (server, new, `run-history/services/` next to `StudioRunModelConfigService`): API entry; routes by root kind to the live root or the stopped manager. Thin, but owns root lookup and the outcome mapping.
- Root objects (`RootTeamRun`, `AgentOrgRun`, `StandaloneAgentRunRoot`): own their live tree mutation and handle notification, via a shared helper `DelegatedLaunchSelectionCommand` (agent-collaboration) parameterized by the root's tree accessors, persistence and handle lookup.
- Root managers (team, Org, standalone): the stopped-tree read/validate/write, reusing the same helper's pure functions.
- `delegated-launch-selection.ts` (agent-collaboration/domain): `resolveDelegatedLaunchTargets`, `applyDelegatedLaunchSelections` (pure, over `{collaborators, taskExecutions lists}`).
- `effectiveCopyAgentLaunch` (run-history domain, beside `effectiveMemberLaunchConfiguration`): the single launch rule.
- Task lifecycle (`RootTaskExecutionLifecycle` + root adapters): `stopForUser(reference)` (forced shutdown through the queue, nested-first).
- Collaborator hosts (team/Org/standalone): `stopCollaborator(address)` (forced runtime release, input open).
- `ConfiguredAgentExecutionHandle`: `replaceExecutionSpec(spec)`, allowed only while it has no active run (used for retained collaborator/task handles after a Save, so the next activation uses the new spec). No quiet-release logic.
- Contract packages: DTO fields + effective functions incl. the selection.
- Web: `existingRunConfigStore` (delegated draft + save), `delegatedLaunchNodes` (editable nodes), `RunMemberRow`/`RunSettingsCard` (unchanged controls; read-only flag per node).

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced by | Scope |
| --- | --- | --- | --- |
| Inline started-launch derivations for copy agents (projector, task-source resolvers, restore, DTO projection; web selectors) | One rule | `effectiveCopyAgentLaunch` + contract functions | In this change |
| `runSettings.delegated.description` "cannot be edited here" | Obsolete | New description | In this change |
| Section-wide `read-only` for delegated nodes | Obsolete | Per-node lock flags | In this change |
| Dead code in touched files | — | — | In this change (evidence in implementation handoff) |

## Off-Spine Concerns

| Concern | Serves | Responsibility |
| --- | --- | --- |
| `RunModelSelectionService.validateMany` / `listOptionsMany` | Service | Validation and options (incl. the AutoByteus capacity rule) |
| Status events | Web | Running/offline state for the lock and the Stop icon |
| Localization | Web | Labels: "Your choice", the new description, the pending hint |

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden |
| --- | --- | --- | --- |
| `DelegatedLaunchSelectionService` | Root lookup, live/stopped routing | GraphQL resolver | The resolver touching roots/managers directly |
| Root object | Live tree + handles | Service | The service mutating a live tree or calling handles |
| `effectiveCopyAgentLaunch` | The launch rule | Projectors, DTO, restore | Inline `selection ?? started` elsewhere |
| Root `stopDelegatedExecution` | Task lifecycle queue, collaborator host | Service | Calling registries' release directly (it would bypass the queue and the containment order) |
| Handle `replaceExecutionSpec` | Spec swap while inactive | Root only | Swapping a spec under an active run |

## Dependency Rules

- `api/graphql` → `run-history/services/DelegatedLaunchSelectionService` → root registries/managers → root objects → `agent-collaboration` helpers → handles.
- Run-history domain must not depend on collaborators. Contract packages stay schema + pure functions.

## Interface Boundary Mapping

| Interface | Subject | Identity shape | Notes |
| --- | --- | --- | --- |
| `mutation stopDelegatedExecution(input: { rootKind, rootRunId, agentRunId?: ID, teamRunId?: ID })` | One copy/collaborator | Exactly one ID | Returns `{ success, outcome: STOPPED \| ALREADY_STOPPED \| NOT_FOUND \| ROOT_NOT_ACTIVE \| INTERNAL_ERROR, message }` |
| `mutation updateDelegatedLaunchSelections(input: { rootKind: AGENT \| AGENT_TEAM \| AGENT_ORG, rootRunId, changes: [{ agentRunId?: ID, teamRunId?: ID, selection: { llmModelIdentifier, llmConfig } \| null }] })` | Copy/collaborator selections | Exactly one of `agentRunId`/`teamRunId` per change | Returns `{ success, outcome: SAVED \| COPY_RUNNING \| VALIDATION_FAILED \| NOT_FOUND \| RUN_ARCHIVED \| INTERNAL_ERROR, message, fieldErrors, tree }` like `RunModelConfigUpdateResult` |
| `query delegatedLaunchModelOptions(rootKind, rootRunId)` | Options per open copy agent/team | Lists keyed by `agentRunId` / `teamRunId` | Same `RunModelOptions` shape as `teamRunModelOptions` |
| `resolveDelegatedLaunchTargets(tree, changes)` | Targets | Run IDs | Only open copies and collaborators; a configured member or closed copy → error |
| `applyDelegatedLaunchSelections(tree, changes, now)` | Tree | — | Pure |
| `effectiveCopyAgentLaunch({ started, teamStarted?, teamSelection?, agentSelection? })` | Launch + `selected: 'agent' \| 'team' \| null` | — | Follows-team check inside |
| `ConfiguredAgentExecutionHandle.replaceExecutionSpec(spec)` | One agent | — | Throws if a run is active |

## Interface Boundary Check

All singular; identities explicit (run IDs). No mixed-subject selector.

## Main Domain Subject Naming Check

`userLaunchSelection`, `userTeamLaunchSelection`, `DelegatedLaunchSelectionService`, `updateDelegatedLaunchSelections` are natural and consistent with the existing `launchConfiguration` / `launchSource` vocabulary.

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Validation/options | `RunModelSelectionService` | Reuse |
| Live tree commit | `persistence.commitExecutionTreeMutation` | Reuse |
| Stopped tree edit | Root managers' `withRootTransition` + store | Reuse/extend |
| Restore | Source projectors | Extend |
| UI controls | `RunMemberRow` / `RunSettingsCard` | Reuse |

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-server-ts/src/run-history/domain/run-execution-tree-shared-records.ts` | Optional selection fields; `UserLaunchSelection` type; `effectiveCopyAgentLaunch` |
| `run-history/store/run-execution-tree-shared-record-schemas.ts`, `task-execution-source-schema.ts` (and task execution parsers) | Parse the optional fields |
| `agent-collaboration/domain/delegated-launch-selection.ts` (new) | Target resolution + pure apply |
| `agent-collaboration/collaborators/delegated-launch-selection-command.ts` (new) | Shared live-root command: validate, commit, notify handles |
| `agent-collaboration/collaborators/collaborator-source-projector.ts`, `agent-team-execution/task-delegation/team-task-source-resolver.ts`, `agent-collaboration/execution/task/task-team-node-restoration.ts`, Org/standalone equivalents | Use `effectiveCopyAgentLaunch` |
| `agent-collaboration/execution/backends/configured-agent-execution-handle.ts` | `replaceExecutionSpec` (inactive only) |
| `agent-collaboration/execution/task/root-task-execution-lifecycle.ts`, `root-task-execution-adapter.ts`, the three root task adapters, `flat-team-execution-manager.ts` / team backend (`shutDownDirectTaskExecutionForUser`), task agent/team registries | Forced per-copy shutdown, nested-first, restorable, Task open |
| Collaborator hosting (`team-root-collaborator-hosting.ts` and Org/standalone equivalents) | Forced collaborator stop with input open |
| `agent-team-execution/domain/root-team-run.ts`, `agent-org-execution/domain/agent-org-run.ts`, `standalone-agent-run-root/domain/standalone-agent-run-root.ts` | `stopDelegatedExecution`, `updateDelegatedLaunchSelections` (operation gate → command; offline check) |
| `agent-team-execution/services/agent-team-run-manager.ts`, the Org and standalone managers | `updateStoppedDelegatedLaunchSelections` |
| `run-history/services/delegated-launch-selection-service.ts` (new) | Routing + options |
| `api/graphql/types/…` (next to the existing run model config resolvers) | Mutation + query |
| Server DTO projections; `autobyteus-team-stream-contracts`, `autobyteus-collaboration-stream-contracts` | Selection fields + effective functions |
| `autobyteus-web/stores/existingRunConfigStore.ts` (+ edit actions), `utils/runSettings/delegatedLaunchNodes` (or `delegatedLaunchRows`), `components/run-settings/ExistingRunSettings.vue`, `RunMemberRow.vue` (per-node lock + stop icon), `services/collaborators/agentSourceSelectors.ts`, GraphQL documents, localization | Editable copy rows when stopped, Settings stop, save, labels |
| Sidebar copy rows: `components/workspace/history/WorkspaceTransientExecutionRow.vue`, `AgentRunTaskRows.vue`, `WorkspaceTeamExecutionTree.vue`, Org delegated rows (`WorkspaceAgentOrgHistoryCollection.vue`) + their actions | Stop icon on running copy/collaborator rows (`heroicons:stop-20-solid`, the same placement as the root `onTerminateRun`/`onTerminateTeam`) |
| Docs: `autobyteus-web/docs/settings.md`, server `run_history.md`, `agent_communication.md` | Sync |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| Record | `TaskTeamAgentExecution { address, agentRunId, platformAgentRunId, userLaunchSelection: { llmModelIdentifier: "gpt-6.1-sol", llmConfig: {…}, selectedAt } }` | Overwriting `source.members[].launchConfiguration` (would lose the started value and leak into extra copies) |
| Team change | `TaskTeamExecution.userTeamLaunchSelection` set; followers resolve to it; a member on its agent default keeps it | Writing the selection onto every member |
| Stop + edit | PM running; user clicks Stop on the SE team copy row (sidebar) → its turn is interrupted, all 6 members and any copy it started go offline; PM keeps running. User sets code_reviewer to B in Settings → Save → `userLaunchSelection` on that `TaskTeamAgentExecution`. PM (or the user) messages the copy coordinator → restore; code_reviewer's next activation uses B | Closing the Task on Stop; editing a running copy |
| Woken during edit | An agent messages the stopped copy before Save → Save returns `COPY_RUNNING`; nothing written | Writing the selection to a live copy |
| Reset | `selection: null` (copy stopped) → the field is removed → the started value on resume | — |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Migration writing selections into records | Rejected | Optional fields |
| Editing a running copy (next-turn switch, SR-003) | Rejected (SR-004, user) | Stop → edit → resume |
| Keeping the inline derivations beside the new function | Rejected | Single function |

## Change / Refactor Sequence

1. Domain types + `effectiveCopyAgentLaunch`; replace call sites (behavior-neutral without selections); readers/writers + key-set tests; AC-005 old-record test.
2. Pure target resolution/apply + tests.
3. Forced per-copy shutdown (task lifecycle queue, nested-first) and collaborator stop; `replaceExecutionSpec` (inactive only). Tests: stop an idle copy, a running copy (turn interrupted), a team copy with a nested copy, a collaborator; already offline; then a message restores; the Task stays open; the root and other copies are unaffected; idle shutdown is still correct.
4. Live-root commands (stop, update) for the three kinds; stopped-manager update path; service; GraphQL. Integration tests: a live PM run with an Agent copy and a Team copy (scripted AGY runtime), a woken-during-edit `COPY_RUNNING`, and a stopped root.
5. Contracts + DTO projection; web store, nodes, rows (lock/hint), Settings and sidebar stop icons, Save, labels; component/store tests; browser probe (stop from the sidebar, edit in Settings, message to resume, "Your choice", Reset, locked while running).
6. Real-runtime check (Codex/Claude) and user verification (AC-010).

## Key Tradeoffs

- Stop-then-edit (the user's choice) instead of a live next-turn switch: one simple rule, consistent with user-launched runs, and it reuses the proven restore-with-new-model path. The cost is an explicit Stop, which also interrupts work in progress.
- A separate command from the configured-scope Save: copies can be edited while the root runs (when the copy is stopped); configured scopes cannot.

## Risks

- Stop interrupts a running turn and terminates the copy's background processes, as root Stop does. The user explicitly chose it.
- An agent can wake a stopped copy before Save; the Save is refused (`COPY_RUNNING`) and the user stops it again.
- A provider rejecting a resumed history on the new model: a visible activation error (REQ-008); the user can choose again.
- Stop vs. wake/idle shutdown: all go through the root task lifecycle queue.

## Guidance For Implementation

- Keep validation identical to stopped-run switching. The "current model" for the AutoByteus capacity rule is the agent's current effective model.
- Stop must leave the copy in exactly the restorable state of idle shutdown (same index/registry state), not the released-after-close state (no `discardReleasedExecution` required to resume).
- Never mutate `source` / `launchConfiguration` / entry launches for a selection.
- A Save mixing configured scopes (stopped root) and delegated changes calls the existing configured Save first, then the delegated command; report each part's failure separately.
- Tests by layer per `TESTING.md`; scripted AGY for live delegation; a real-runtime check for one Codex and one Claude switch.

## Revision Notes (SR-005) — response to ARCH-REV-001

These notes are authoritative where they refine or differ from the sections above.

### AR-001 — Atomic "check stopped → commit → spec swap"

- **Stopped is defined per copy:**
  - A task copy (Agent or Team) is stopped iff `adapter.isLive(reference)` is false, i.e. no live runtime for the copy (for a Team copy: no live TeamRun, so a not-yet-started member of a running Team copy is **not** editable).
  - A collaborator Agent is stopped iff its handle has no active run and no readiness attempt.
  - A collaborator Team is stopped iff every member handle satisfies that.
- **Order:**
  1. **Validate first, outside any fence:** resolve targets and run `RunModelSelectionService.validateMany`. A validation failure returns `VALIDATION_FAILED` with no fence taken.
  2. **Take the serialization point:**
     - Task copies: submit a lifecycle queue step `{ kind: "reconfigure" }` to `RootTaskExecutionCommandQueue`. Wake (`acquireAtHead`), activation, idle shutdown, stop and reconfigure run one at a time at the queue head.
     - Collaborators: acquire a **handle activation fence** on each target handle: `ConfiguredAgentExecutionHandle.withActivationFence(fn)`. It is a per-handle async mutex that `ensureReady`/`initializeReady` also acquire, so a message cannot activate the handle while `fn` runs. Fences are acquired in address order across a collaborator Team.
  3. **At the serialization point:**
     - (a) re-check stopped; if not → `COPY_RUNNING`, nothing written;
     - (b) re-check that the validated targets still exist and are open;
     - (c) commit the tree mutation through the root's `persistence.commitExecutionTreeMutation`;
     - (d) in `commitAfterDurability`, synchronously apply `replaceExecutionSpec` to retained inactive handles (task copies' retained handles and collaborator handles).
     Its precondition (no active run) is guaranteed by (a) under the fence, so it cannot fail for a supported reason. A thrown error here is a programming defect and is surfaced as `INTERNAL_ERROR` after durability; the next activation reads the effective launch from the committed tree anyway (restore builds from records), so durable state and the next run stay consistent.
  4. Release the fence or queue head.
- **Wake-during-validation:** a wake that happens during step 1 simply runs; step 3a then sees the copy live → `COPY_RUNNING` (AC-011).
- **Tests:**
  - wake during validation;
  - wake queued behind a reconfigure (restores on the new model);
  - a collaborator message during a fenced reconfigure (it waits, then activates on the new spec);
  - a not-started member of a running Team copy → `COPY_RUNNING`.

### AR-002 — Stop set by lineage

- **The Stop set** of a copy or collaborator X = X plus, recursively, every open task copy whose `delegatorAgentRunId` is an agent of X, or which is a Task helper whose `creator` is X (or one of X's copies in the set). Membership is evaluated over all task-execution lists of the tree (root, Team-hosted, collaborator Teams). It is computed by one pure function `delegatedStopSet(tree, target)` in `agent-collaboration/domain`.
- **Order:** innermost first (deepest descendants, then X), each via the forced restorable shutdown. Collaborator members' own copies are included by the same lineage rule.
- **Limit:** copies recorded before `delegatorAgentRunId` existed (absent field) and not reachable through helper ownership cannot be attributed. They are not stopped and keep their own Stop icon. This is stated in the docs and in the Stop result (`notStoppedUnattributed` count when > 0).
- **Live lease:** superseded by SR-006 (AR-006). A forced Stop never waits on a lease while holding the queue head.
- REQ-009 / DEC-008 are unchanged ("stops … the copies it started itself").

### AR-003 — "Follows its team" from the recorded fact

- **Collaborator Teams and catalog Team copies:** a member follows its team iff its recorded member `launchConfiguration` is **absent** (it runs on the team's launch) and it has no own `userLaunchSelection`. Value equality is not used.
- **Configured-placement Team copies** (Org placed teams): members have no recorded own-default fact. A member follows iff its configured launch equals the configured team launch at the time of the change (the same equality the existing configured-team editor uses, `linkedToParentAtDraftStart`). This is stated as the rule for that case.
- `effectiveCopyAgentLaunch` takes `followsTeam` as an explicit input computed by these rules (`memberFollowsTeam(recordKind, team, member)`).

### AR-004 — One all-or-nothing Save on a stopped root

- **New stopped-root command per root kind:** `updateStoppedRunLaunchChanges({ configuredPatches, delegatedChanges })` on the Team, Org and standalone-Agent managers.
  - Inside **one** `withRootTransition`: read the tree; check admission and archive; resolve and validate both sets in one `validateMany`; apply both mutations to the same tree; write once.
  - The existing configured-only endpoints stay for configured-only Saves.
- **Web:** on a stopped root, Save uses the combined command whenever delegated changes exist. On a live root, only delegated changes are possible (configured scopes are locked), via `updateDelegatedLaunchSelections`.
- **API:** the GraphQL mutation `updateDelegatedLaunchSelections` accepts an optional `configuredPatches` list, accepted only when the root is stopped. The service routes to the combined command.

### AR-005 — Extra and teammate copies

- Extra copies started later at a collaborator address, and teammate copies started from inside a copy (`projectTaskSourceMember`), project from the **started** values (entry/source) and never carry over the source instance's `userLaunchSelection` / `userTeamLaunchSelection`. Requirements REQ-006 states this; a test covers it.

### File mapping additions

| File | Change |
| --- | --- |
| `agent-collaboration/domain/delegated-stop-set.ts` (new) | `delegatedStopSet` |
| `agent-collaboration/execution/task/root-task-execution-command-queue.ts`, `root-task-execution-lifecycle.ts` | `reconfigure` and forced `stop` queue kinds; lease wait for a forced stop |
| `agent-collaboration/execution/backends/configured-agent-execution-handle.ts` | `withActivationFence`; `ensureReady` respects it |
| Team, Org and standalone managers | `updateStoppedRunLaunchChanges` |
| `run-history/domain/run-execution-tree-shared-records.ts` | `memberFollowsTeam` |

Classification is unchanged: `Large` / `High`.

## Revision Notes (SR-006) — response to ARCH-REV-002 AR-006 (no waiting at the queue head)

**Problem.** Deliveries hold the sender's live lease while submitting further queue steps (`wake`, `activate`). A Stop waiting for leases at the head of the single FIFO would deadlock the root's lifecycle queue (verified sites: `root-team-run.ts:318`, `team-run-message-delivery.ts:69`, `agent-org-run-message-delivery.ts:73,91`, `standalone-root-message-delivery.ts:213`).

**Stop protocol (task copies)**, owned by `RootTaskExecutionLifecycle.stopForUser(target)`:

1. **Compute** the Stop set (`delegatedStopSet`) and the agent run IDs of every chain in it.
2. **Mark the set stopping** (in-memory, lifecycle-owned `stopping` map from execution key to a Stop attempt). While marked:
   - `acquireLiveLease(agentRunId)` for any agent whose chain contains a stopping execution is **refused immediately**: `TaskDelegationError("TASK_EXECUTION_STOPPING", "This copy is being stopped by the user.")`, before any queue submission.
   - Effects:
     - a `send_message_to` / `delegate_task` **into** a stopping copy, or **from** an agent inside it, returns `accepted: false` with code `TASK_EXECUTION_STOPPING` and that message;
     - a delegation by a stopping copy's agent is refused the same way, at the same lease point;
     - nothing new wakes or activates inside the set.
3. **Drain outside the queue:** await the release of the leases that were already held when the mark was set. These in-flight deliveries keep running; their inner queue steps (`wake`, `activate`) proceed because the Stop does not hold the queue head. Their own inner lease requests on agents **outside** the set are unaffected; requests on agents **inside** the set get `TASK_EXECUTION_STOPPING`, so a drain cannot wait on itself.
4. **Submit** one queue step `{ kind: "stop" }` per copy, innermost first. At the head:
   - re-check that it is still marked and live;
   - interrupt and release to the restorable idle-shutdown state;
   - the step itself never awaits a lease.
5. **Clear** the mark (success or failure, in `finally`). From then on, a message resumes the stopped copy normally (REQ-004).

**Collaborators:** a collaborator Stop takes the collaborator handles' activation fences (AR-001) and interrupts/releases them. It never touches the queue head, so it cannot deadlock the queue. Any task copies in its Stop set follow the protocol above.

**Concurrency:**
- A second Stop on an overlapping set joins the existing attempt.
- A reconfigure (AR-001) on a stopping copy returns `COPY_RUNNING` until the Stop has completed. The UI waits for the Stop result before enabling edits.
- Idle shutdown skips copies that are marked stopping.

**Test (required by AR-006):** a copy member is mid-`send_message_to` with its inner `wake` pending when the user clicks Stop. The Stop completes; the member's delivery resolves (delivered, or refused with `TASK_EXECUTION_STOPPING` if its target is inside the set); the root queue keeps processing unrelated wakes and activations afterwards. Plus:
- a bring-in by a stopping copy is refused;
- a message into a stopping copy is refused;
- a message after Stop completes resumes the copy.

**File mapping addition:** `root-task-execution-lifecycle.ts` (stopping marks, lease refusal, drain, `stop` step); the three roots' delivery results surface `TASK_EXECUTION_STOPPING` unchanged through the existing `accepted: false` path. The LLM-facing tool results need no contract change, since the code and message ride the existing failure shape.

Classification is unchanged: `Large` / `High`.

## Revision Notes (SR-007) — simpler UI, reuse the existing experience (user, 2026-10-13)

- **Removed:**
  - the "Your choice" source label;
  - the separate Reset/undo (REQ-007, AC-008);
  - the reset form of the command (`selection: null`). `updateDelegatedLaunchSelections` changes always carry a selection; picking the started model again simply records that model.
  - the `runSettings.delegated.source.userChoice` key and any Reset control for copy rows.
- **Display rule:** a copy agent with a `userLaunchSelection` (or following a team selection) shows its model like any edited member, with no origin text. Agents without one keep the origin text from the launch-defaults Task. The web derives this from the DTO: the origin text is hidden when a selection applies.
- **Principle (DEC-010):** reuse the existing controls one to one:
  - the root rows' stop icon (`heroicons:stop-20-solid`, same placement) on copy rows in the sidebar and in Settings;
  - the stopped-run member editing in `RunMemberRow` / `RunSettingsCard` (model, thinking, other options; runtime and approval locked);
  - the existing Save bar and feedback.
  No new visual elements beyond the lock hint for running copies, which reuses the existing locked-field hint style.
- Server storage and semantics are unchanged: the per-instance selection is kept separate from the started values, because extra and teammate copies must start on started values (REQ-006, AR-005).
- Classification is unchanged: `Large` / `High`.
