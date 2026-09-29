# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-007` (tolerant tree reading replaces the migration; see "SR-007 Tolerant Tree Reading — No Migration", which **supersedes** the Migration Plan, the SR-005 migration dispositions and the SR-006 migration ordering)
  - Prior: `SR-006`
  - SR-006 resolves ARCH-REV-003 (AR-004 released-migration ordering and dependencies; AR-005 single liveness predicate; R-8 checklist numbering and boundary contracts; R-9 downstream re-review); see "SR-006 Resolution (ARCH-REV-003)".
  - SR-004 revised SR-003 for architecture review `ARCH-REV-001` (AR-001–AR-003, R-1 to R-4); see "Review Round 1 Resolution".
  - SR-005 adds the migration guideline checklist, real installed-data evidence and a basis refresh to `origin/personal@f2924a2b0`; see "SR-005 Migration Checklist And Basis Refresh".
- Approved requirements baseline: `SR-007` requirements delta on top of `SR-002` (user approval 2026-09-29, DEC-008), approved by the user 2026-09-29 ("I agree with your approach. Approved."), reconfirmed after the UI clarification ("OK, approved. Continue.")
- Behavior-defining supplements: None
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/investigation-notes.md` (architecture evidence ARCH-01 … ARCH-15)

## Current-State Read

`delegate_task` is served per root by `RootTaskLifecycleEngine` (`agent-collaboration/execution/task/root-task-lifecycle-engine.ts`) with Team and Org adapters. The engine owns a task status machine (`active → awaiting_review → accepted | active`, `interrupted`), a FIFO command queue, and "settlement". Settlement tears down a task execution only after `accepted`/`interrupted`, deepest first, and only when it has no open child task. Two persisted files carry the state:

- the execution tree, where task executions are nested under their **host team** with `startedAt`/`settledAt` (ARCH-01, ARCH-03);
- the task-records file, which holds status, updates and the only link to the delegator (ARCH-02).

Package admission and the reopen loader require and cross-validate both files, and reopen marks every task execution settled (ARCH-04). Run-ID messaging reaches only live agents, both in the global router and in each root (ARCH-09). The UI shows a Delegated Tasks section and task labels in the members tree (ARCH-15).

Reusable foundations already exist:

- a root-neutral agent handle with lazy activation and a `restore` planner for native and external runtimes (ARCH-06);
- team-level and agent-level quiescent termination (ARCH-08);
- a numeric server-setting pattern (ARCH-13);
- a canonical migration framework and guideline (ARCH-05).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: The change spans the server lifecycle owner, Team and Org adapters, registries, the message router, persistence and admission, a new data migration, two stream-contract packages, GraphQL/REST removal, the settings service, the LLM contract and about 40 web files (Draft File Responsibility Mapping). Multiple subsystems change.
- Architectural risk: `High`
- Risk rationale:
  - **Contract:** tool result shape, LLM contract text, stream contracts, GraphQL/REST removal.
  - **Persistence:** Team tree 2→3 and Org tree 1→2, a new migration, admission changes.
  - **Concurrency and lifecycle:** grace timers, wake vs shutdown races, restore of external provider sessions.
  - **Security boundary:** wake is limited to the sender's root.
  - **Ownership:** the task engine is replaced by a resource-lifecycle owner.
- Escalation trigger: if restoring a task team or an external provider session cannot reuse the `restore` planner, or if the migration cannot deterministically map every referenced task execution, return `Design Impact` before building a substitute mechanism.

## Architecture Investigation Evidence

| Source | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| ARCH-01/02 | index, adapter, persistence coordinator | Delegator only in records; activation writes two files | Tree becomes the single authority (`delegatorAgentRunId`); activation writes one file | None |
| ARCH-03/04/05 | shared schemas, loaders, guideline, tree v2 migration | Strict shared `TaskExecution`; admission needs records; guideline requires migration-owned legacy reading | Team tree v3 / Org tree v2 migration; admission without records | Real installed data volume (verify on a copied install) |
| ARCH-06/07 | planner, handle, registries, factory | `restore` planner reusable; only `fresh` used for tasks | Wake = handle/TeamRun in `restore` mode from the persisted node | Task-team node rebuild (new function; deterministic from config + tree) |
| ARCH-08 | flat team manager, AgentRun | Quiescent termination exists at agent and team level | Shutdown reuses `tryPrepareTerminationIfQuiescent` | Per-runtime confirmation in AC-006 tests |
| ARCH-09 | router, root directory, roots | Live-only gates | Sender-root routing + wake | None |
| ARCH-10 | UI access rules | Operator can message live children | Operator post also wakes | None |
| ARCH-11/12 | projectors, contracts, API | Task DTOs/events/API | Delete; add child-started event and tree DTO fields | None |
| ARCH-13 | settings | Setting pattern | New grace-period setting | None |

## Intended Change

Replace task lifecycle management with **task-execution resource management**:

- `delegate_task` spawns a child and records it in the execution tree together with its delegator.
- A per-root owner shuts quiet children down after a grace period.
- Delivery to a shut-down child's run ID from inside the root restores it in `restore` mode first.
- Task records, the status machine, submit/review, task APIs, task stream DTOs and the task UI are deleted.
- A one-time migration moves the delegator link from the old task-records files into the trees and drops `settledAt`. The old task-records files are left unchanged on disk.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC | Trigger | Existing Behavior | Approved Change / Preserved Outcome | Target Path / Spines |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001; AC-001 | Agent calls `delegate_task` | Engine creates record + execution | Same inputs; result `{target_agent_run_id}` or failure; tree records the delegator | DS-001 |
| BEH-002/003 | Contract | REQ-002; AC-002 | Tool listing | Submit/review exposed (native + MCP) | Deleted | Manifest removal (DS-001 surface) |
| BEH-004 | System | REQ-004, 005, 016; AC-004–006, 009, 010 | Agent status events | Teardown only after accept | Quiet + grace → shutdown | DS-002, DS-005 |
| BEH-005 | Contract | REQ-006–008; AC-007–012 | `send_message_to` run ID; operator post | Live-only | Same-root wake then deliver | DS-003 |
| BEH-006 | Operational | REQ-009; AC-013 | Root reopen | Repair to settled/interrupted | Children start shut down and wakeable | DS-004 |
| BEH-007 | Operational | REQ-010; AC-014 | Root stop | Interrupt + settle | Root termination scope stops all live executions; timers cancelled | DS-002 (terminal branch) |
| BEH-008 | System | REQ-011; AC-015 | Checkpoint | Includes open tasks | Running work only | Root `hasOpenExecutionWork` |
| BEH-009 | User | REQ-013; AC-017 | Open workspace | Tasks section + labels | Messages-only panel; members tree with standard status (shut down = `offline`) | DS-006 |
| BEH-010 | Contract | REQ-014; AC-018, 019 | Load/admit/API | Records required; APIs | Tree + messages only; APIs deleted; old files untouched | DS-004, DS-007 |
| BEH-011 | Contract | REQ-012; AC-016 | Prompt build | Lifecycle text | Spawn-then-message text | Contract file |
| BEH-012 | Contract | REQ-003, 015; AC-003, 018 | Task transitions | Notifications into conversations | Only the spawn packet; old notifications still render | DS-001 |

Preserved behavior derived from evidence (ARCH-10, no intended-behavior change): an operator message to a child from the workspace composer keeps working after the child is shut down. It wakes the child exactly like `send_message_to`.

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` + `Refactor`
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`. Resource lifetime is owned by a task status machine that depends on a review step agents don't perform. There is also `Legacy Or Compatibility Pressure` from duplicated state: records duplicate conversation content and tree liveness.
- Refactor needed now: `Yes`
- Evidence: ARCH-01, ARCH-02, ARCH-04, ARCH-08; motivating leak described in the requirements Problem statement.
- Design response:
  - Replace `RootTaskLifecycleEngine` with a resource-lifecycle owner.
  - Make the execution tree the single persisted authority.
  - Remove records, APIs and UI.
  - Reuse the existing quiescence and restore mechanisms instead of adding new ones.
- Refactor rationale: extending the status machine (for example with auto-accept) would keep two persisted authorities and the review-shaped API the user rejected.
- Deferrals: none. Silent-child notification is out of scope by DEC-003 and is not a deferral.

## Terminology

- **Task execution**: a child spawned by `delegate_task`, either a task Agent or a task Team. This is the existing tree term and is kept to avoid renaming persisted types.
- **Live / shut down** (single predicate, SR-006 / AR-005; runtime-only, never persisted):
  - **Task agent:** live ⇔ its host registry holds a handle **and** that handle's `AgentRun` is active (`handle.isActive()`, which is true only while the manager still publishes that run). A retained handle whose run was terminated or died is **shut down**.
  - **Task team:** live ⇔ its `TeamRun` is registered in the host's task-team registry. Team shutdown terminates and unregisters the `TeamRun`; team registries don't retain entries.
  - A chain is live only if every task execution in it is live.
- **Shutdown commit:**
  - *Task agent:* the handle's quiescent termination commits and `dispose()` clears its run. The handle **stays registered**, and a later input through a live lease re-activates it in `restore` mode (upstream `activationMode` flip).
  - *Task team:* the `TeamRun` terminates and is removed from the registry.
  - *After root reopen:* no handles exist. `TaskAgentExecutionRegistry.restore(node)` creates one (in `restore` mode) inside the lease.
- **Where the predicate applies:** everything uses this one predicate, via `adapter.isLive(reference)`:
  - the schedule's ignore rule (events for non-live executions are ignored);
  - the queue-head shutdown skip;
  - `assertRestorableChain` (its "dormant" set is the non-live members of the chain);
  - open work (only live executions count);
  - status snapshots (non-live task agents report `offline`);
  - command gating.
- **Command gating:**
  - `executeAgentCommand` with `approve_tool` or `interrupt` on a non-live task agent returns `RUN_NOT_ACTIVE` **without** calling the handle. This prevents the upstream `approveToolInvocation → ensureReady` path from re-activating a dead run.
  - `post_message` and every other input path to a task execution go through `acquireLiveLease`. Nothing calls `reserveInput` / `postMessage` on a non-live task handle directly.
- **Quiet**: `tryPrepareTerminationIfQuiescent` succeeds for the execution.
- **Wake**: restore a shut-down task execution (and any shut-down task-team ancestors) in `restore` mode.
- **Live lease**: a short hold that prevents shutdown of an execution chain between wake and input reservation.

## Design Reading Order

Standard template order.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Current runtime reads only Team tree v3, Org tree v2 and communication files.
- Legacy task-records reading exists only inside the new migration. Released tree validators are frozen into migration-owned files.

## Persisted Data / State Transition Decision (Mandatory)

- **Stored subjects:**
  - Team packages: `team_run_execution_tree.json` (schema 2), the task-records file (`TASK_DELEGATION_RECORDS_V1_FILE_NAME`) and communication messages.
  - Org packages: the org execution tree (schema 1), the Org task-records file (`AGENT_ORG_TASK_DELEGATION_RECORDS_V1_FILE_NAME`) and messages.
  - Volume: one package per root run; task records are small (one per delegation).
- **Change:**
  - `TaskAgentExecution` / `TaskTeamExecution` gain `delegatorAgentRunId` and lose `settledAt`.
  - Team tree `schemaVersion` 2 → 3; Org tree `schemaVersion` 1 → 2.
  - The task-records file is no longer part of the current package.
- **Normal readers/writers:** strict exact-key validators (ARCH-03). Admission and the loader require records (ARCH-04).
- **Required semantics:** every task execution identifies the AgentRun that delegated it, which must exist in the same tree. The execution hierarchy is unchanged.
- **Constraints:**
  - Old task-records files are left untouched (DEC-004).
  - Excluded or incomplete packages are preserved byte-for-byte (guideline).
  - Availability first: historical failures never block startup.
- **Decision:** `Migration Required` for the trees. Task-records files: `Not Affected` on disk, and no longer read by the current runtime.
- **Rationale:** the delegator link exists only in the records file. The approved UI (REQ-013) needs it for old runs, and a nullable field or runtime fallback is prohibited. `settledAt` must go because liveness becomes runtime-only. The transformation is small, deterministic and per package.

### Migration Plan

- **Current canonical schema:** Team tree v3, Org tree v2 (shared `TaskExecution` with `delegatorAgentRunId`, no `settledAt`).
- **Older schemas:** Team tree v2 + Team task records v1; Org tree v1 + Org task records v1.
- **Why direct use or rebuild is insufficient:** the delegator exists only in the records, and strict current validation rejects v2/v1.
- **Trigger:** startup app-data migration, registered after existing tree and Org migrations: `TASK_EXECUTION_DELEGATOR_TREE_MIGRATION_ID = "20261001_task_execution_delegator_tree"`.
- **Owner/location:** `src/app-data-migrations/migrations/task-execution-delegator-tree-v1/`.
- **Current runtime:** current-schema-only. Loaders and admission never read records.
- **Historical types:** `released-team-run-execution-tree-v2-schema.ts`, `released-agent-org-execution-tree-v1-schema.ts` and `released-task-delegation-records-v1-schema.ts`, all migration-owned. The existing `team-run-execution-tree-v2-app-data-migration.ts` must be pointed at the frozen v2 validator, because it currently imports the live validator (ARCH-05).
- **Completion:** per-package idempotence. A package is already current when its tree is v3 (Team) or v2 (Org), giving `SKIPPED_ALREADY_CURRENT`. The runner ledger records the aggregate.
- **Restart safety:** the tree is written through `AtomicRunPackageFileCommitWriter`, a single-file atomic rename, and the records file is never written. A re-run after interruption sees either the old v2/v1 tree (re-migrates) or the v3/v2 tree (skips).
- **Validation:** the migrated tree passes the current v3/v2 validator, and every `delegatorAgentRunId` resolves to an AgentRun in that tree. This is validated before rename.
- **Backup/rollback:** none beyond the existing atomic writer. Proportionate default: originals of failed items are retained and records are untouched.
- **Concurrency:** single startup writer (guideline).
- **Retention:** keep the migration permanently for skip-version upgrades.

| Migration Step | Source | Target | Owner | Validation | Failure / Recovery |
| --- | --- | --- | --- | --- | --- |
| Classify | Package dir | disposition | migration | Tree is a regular file; exact released or current schema | `SKIPPED_MISSING` (no tree), `SKIPPED_ALREADY_CURRENT`, `FAILED_UNSUPPORTED_ENTRY` / `FAILED_INVALID_OR_UNSUPPORTED_PAYLOAD` (preserved, excluded) |
| Read records (only when the tree has task executions) | Records v1 file | runId → delegator map | migration | Exact released records schema; one record per task execution | Tree without task executions: records are not read; convert directly. Tree with task executions but no records file: `SKIPPED_MISSING_TASK_RECORDS` (already non-admitted today; preserved, excluded). SR-005 simplification based on ARCH-16 |
| Transform | v2/v1 tree | v3/v2 tree | migration | Drop `settledAt`; set `delegatorAgentRunId` from the map; drop task executions with no record (same rule as today's reopen repair `repairTree`) | Unmappable → `FAILED_TRANSFORMATION`, original kept |
| Write | v3/v2 tree | canonical file | atomic writer | Current validator + delegator resolution | `FAILED_CURRENT_VALIDATION` / finalization warning, as in the v2 migration |

Status: `SUCCEEDED` / `SUCCEEDED_WITH_WARNINGS` with bounded reason counts and capped examples. Failures are capability-scoped per package and never block startup.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, 012 | Agent `delegate_task` call | Child running with its first message; tree persisted; UI shows child | `RootTaskExecutionLifecycle` | Spawn |
| DS-002 | Primary End-to-End | BEH-004, 007 | Agent status event (idle/offline) | Quiet child shut down; status `offline` published | `RootTaskExecutionLifecycle` | Resource release |
| DS-003 | Primary End-to-End | BEH-005 | `send_message_to` run ID / operator post | Message reserved on a restored child | Root run (`RootTeamRun` / `AgentOrgRun`) with the lifecycle wake | Follow-up |
| DS-004 | Primary End-to-End | BEH-006, 010 | Startup / reopen | Root runs from a v3/v2 tree with all children shut down | Migration → loader → materializer | Continuity |
| DS-005 | Bounded Local | BEH-004 | Status event | Timer fire → shutdown attempt | `TaskExecutionIdleShutdownSchedule` inside the lifecycle | Grace semantics |
| DS-006 | Return-Event | BEH-009 | Tree/status change | Members tree row | Stream projectors → web view state | UI |
| DS-007 | Primary End-to-End | BEH-010 | Startup migration | Current packages admitted | Migration + `RootRunPackageReadinessIndex` | Admission |

## Primary Execution Spine(s)

- DS-001: `Agent tool call -> delegate_task tool -> MemberTaskCommandCapability.delegateTask -> RootTeamRun/AgentOrgRun.delegateTask -> RootTaskExecutionLifecycle.delegate -> Adapter.prepareActivation (host registry prepares fresh child) -> Persistence commit (tree only) -> child releaseWork (first message) -> TASK_EXECUTION_STARTED stream event`
- DS-002: `AgentRun status event -> Root run event hook -> RootTaskExecutionLifecycle.onAgentStatus -> IdleShutdownSchedule (grace timer) -> Adapter.tryShutDownIfQuiet(execution) -> host registry quiescent termination -> handle/TeamRun disposed -> offline status published`
- DS-003: `send_message_to(target_agent_run_id) -> SendMessageToDispatcher -> GlobalAgentRunMessageRouter -> sender's ActiveRootMessageBoundary.deliverExactAgentMessage -> RootTaskExecutionLifecycle.acquireLiveLease(target) (wake chain in restore mode) -> Communication deliver (persist message + reserve input) -> lease release -> child processes message`
- DS-004: `Startup -> AppDataMigrationRunner -> TaskExecutionDelegatorTreeMigration -> RootRunPackageReadinessIndex (tree + messages) -> Loader -> materializeTeamRoot / Org manager -> Root run (no task handles)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The tool validates inputs and calls the root. The root resolves the recipient and asks the lifecycle to delegate. The adapter allocates IDs and prepares a fresh child in the host registry. The lifecycle commits one tree mutation that adds the execution with `delegatorAgentRunId` and `startedAt`, then releases the child's first message and publishes the started event. The result is `{target_agent_run_id}`. | Tool, Root run, Lifecycle, Adapter, Host registry, Persistence | Lifecycle | Work-packet builder, tree mutator, event factory |
| DS-002 | Status events for any agent inside a task execution chain feed the schedule. Running cancels the chain's timers; idle or offline (re)arms them at now + grace. On fire, the lifecycle asks the adapter to shut the execution down only if quiet and no live lease is held. Nothing is persisted. | Status hook, Lifecycle, Schedule, Adapter, Registry | Lifecycle | Grace-period setting |
| DS-003 | The router asks the sender's root whether it contains the target. If so, the root takes a live lease from the lifecycle, which restores any shut-down task-team ancestors (outermost first) and the target execution in `restore` mode, then delivers through normal communication. The lease prevents shutdown until input is reserved. Targets outside the sender's root use the existing live-only global path; shut-down children are unreachable from outside by construction. | Router, Root boundary, Lifecycle, Adapter, Communication | Root run | Restore node builder, lease |
| DS-004 | The migration converts trees. Admission and the loader read tree + messages. Materialization creates roots with no task handles, so every child is shut down and wakes on demand. | Migration, Readiness index, Loader, Materializer | Migration / Loader | Released schemas |

## Spine Actors / Main-Line Nodes

Agent tool surface; root runs (`RootTeamRun`, `AgentOrgRun`); `RootTaskExecutionLifecycle`; subject adapters (`TeamTaskExecutionAdapter`, `AgentOrgTaskExecutionAdapter`); host registries (`TaskAgentExecutionRegistry`, `TaskTeamExecutionRegistry`, Org root agent registry and team directory); persistence coordinators; `GlobalAgentRunMessageRouter`; stream projectors; web team/org view state.

## Ownership Map

- **`RootTaskExecutionLifecycle`** (root-neutral, one per root) owns:
  - admission for delegation;
  - the serialized FIFO for activation, shutdown and wake (reuses `RootTaskLifecycleCommandQueue`, renamed `RootTaskExecutionCommandQueue`);
  - idle-shutdown scheduling;
  - live leases;
  - timer cancellation on root termination or fail-stop.

  It owns no subject tree, index or store.
- **Subject adapters** own the Team/Org tree mutation, index lookups, host resolution, restore-node building and registry calls.
- **Host registries** own runtime objects: prepare fresh, restore, and terminate if quiescent.
- **Root runs** own public operations and authorization, and route delivery through the lifecycle's lease.
- **The migration** owns all legacy reading.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner | Why | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TaskDelegationService` (Team) → renamed `TeamTaskExecutionService` | `RootTaskExecutionLifecycle` | Team-private construction of lifecycle + adapter; forwards root events | Policy, timers |
| `delegate_task` tool classes | Root run | LLM tool binding | Business rules |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope |
| --- | --- | --- | --- |
| `submit-task-result.ts`, `review-task-result.ts`, their manifest entries, parsers, schemas, tool-contract names, tool-service methods, MCP entries | Tools deleted | — | In This Change |
| `root-task-lifecycle-engine.ts`, `root-task-lifecycle-adapter.ts`, `root-task-lifecycle-event.ts`, `root-task-reopen-repair.ts` | Status machine removed | `root-task-execution-lifecycle.ts`, `root-task-execution-adapter.ts` | In This Change |
| `task-delegation-record-v1.ts`, `task-delegation-record-v1-schema.ts` (collaboration) and Team `task-delegation-record*.ts`, `records/*`, `task-delegation-record-resolver.ts`, `task-delegation-projection-service.ts`, `task-delegation-reference-content-service.ts` | Records removed | Tree `delegatorAgentRunId` | In This Change |
| Org `persistence/agent-org-task-delegation-records-v1*` and Org persistence `commitTaskRecords` | Same | Same | In This Change |
| Task-records sections in Team/Org loaders, validators, `root-run-package-current-validator.ts`, persistence coordinators and `team-root-materializer.ts` | Same | Tree + messages package | In This Change. **Admission rule (R-2):** remove `TASK_DELEGATION_RECORDS_V1_FILE_NAME` / `AGENT_ORG_TASK_DELEGATION_RECORDS_V1_FILE_NAME` from `requiredTeamFiles` / `requiredOrgFiles`. Do **not** add them to `retiredTeamFiles` / `retiredOrgFiles`, so an old package still holding its untouched records file (DEC-004) passes `validateManifest`. Cross-family retired entries that referenced these constants are removed with the constants. Add AC-018 coverage for an admitted package with a leftover records file |
| Team helper `task-delegation-ownership.ts` (`taskOwnsAgent`, `hasOpenChildTask`, `orderTasksDeepestFirst`) (R-3) | Record-based ownership and settlement ordering | `TeamExecutionIndex.listTaskExecutionChainForAgent(agentRunId)` (tree-based chain lookup used by `taskExecutionChainFor`) | In This Change: remove |
| Team `task-delegation-record.ts` (re-export barrel) (R-3) | Types move | `agent-collaboration/execution/task/task-delegation-command.ts` | In This Change: remove |
| Team `task-execution-tree-projection.ts` (one-line re-export) (R-3) | Empty indirection | Import from `agent-collaboration/execution/task/task-execution-tree-projection.ts` | In This Change: remove |
| `settledAt` handling: `settleTaskExecutionInTree`, reopen repairs, `isLiveAgent`/`isLiveTeam` settled checks, settlement event | Liveness is runtime-only | Registry state + lifecycle | In This Change |
| `api/graphql/types/task-delegation.ts` (+ schema registration), `api/rest/task-delegation.ts` (+ index) | APIs deleted | — | In This Change |
| Task DTOs/events in `autobyteus-team-stream-contracts` and `autobyteus-collaboration-stream-contracts`; `settled_at` DTO fields | Same | `TASK_EXECUTION_STARTED` event; `delegator_agent_run_id` | In This Change |
| Submit/review system notifications and their text; `SYSTEM_TASK_NOTIFICATION` stays for the spawn packet and for old conversations | Removed transitions | — | In This Change |
| Web: `CollaborationDelegatedTasksSection.vue`, `CollaborationTaskHeading.vue`, `TeamDelegatedTaskNavigator.vue`, `TeamDelegatedTaskDetailPane.vue`, `TeamDelegatedTaskItemDetail.vue`, `TeamDelegatedTaskLifecycleRow.vue`, `TeamTaskReferenceViewer.vue`, `types/workspace/collaborationTaskPresentation.ts`, `collaborationTasksContextView.ts`, `services/teamExecution/taskDelegationPresentation.ts`, `services/runHydration/taskDelegationHydrationService.ts`, `taskDelegationGraphqlDtoProjection.ts`, `utils/teamDelegatedTaskEntries.ts`, `services/agentOrgExecution/agentOrgTaskPresentation.ts`, `agentOrgTaskSettlementProjection.ts`, task GraphQL queries, `task_monitor.lifecycle.*` and Delegated Tasks localization keys, related tests and fixtures | Task UI removed | Members tree + Messages | In This Change |
| `app-data-migrations/predecessor-task-delegation-records.ts` and released migrations importing current task/tree types | Must not depend on the changing current types | Migration-owned released types | In This Change (repoint, not delete) |

## Return Or Event Spine(s) (If Applicable)

DS-006: `Lifecycle commit (spawn) -> TeamRunEvent TASK_EXECUTION(started) / AgentOrg {kind:"task_execution_started"} -> view projector -> contract message TASK_EXECUTION_STARTED {parent_team_run_id|host, execution DTO incl. delegator_agent_run_id} -> web tree mutation -> members tree row`. Shutdown/wake state flows through existing agent status events. On shutdown the adapter publishes an `offline` status overlay for each AgentRun in the execution, and status snapshots report dormant tree agents as `offline`.

## Bounded Local / Internal Spines (If Applicable)

- DS-005, inside `RootTaskExecutionLifecycle`:
  `status event(agentRunId, status) -> adapter.taskExecutionChainFor(agentRunId) (execution containing the agent, then enclosing task teams) -> running|initializing: cancel chain timers ; idle|offline|error: arm chain timers (now + grace) -> timer fire -> queue.submit(shutdown(reference)) -> skip if leased or not live -> adapter.tryShutDownIfQuiet -> null: no-op (a later status event or lease release re-arms) | prepared: commit + dispose + publish offline`
  - `error` **arms** (AR-001a). A child whose turn or command failed is not running and has no pending input, so it is quiet under REQ-004. The fire-time `tryPrepareTerminationIfQuiescent` check remains the only safety guard: it rejects an active turn, queued input or a pending command, so running work is never shut down.
- Live lease, inside the lifecycle:
  `acquireLiveLease(agentRunId) -> queue head: adapter.assertRestorableChain(agentRunId) (no mutation; may throw TASK_EXECUTION_CONTEXT_UNAVAILABLE) -> adapter.restoreChain(agentRunId) (outermost dormant task team first; may throw TASK_EXECUTION_RESTORE_FAILED after partial restore) -> leases[chain]++ -> return release()`
  - `release()` decrements the lease **and arms the idle schedule for every live execution in the chain** (AR-001b). If delivery then starts work, the resulting `running` event cancels the timers as usual.
  - When `restoreChain` throws after restoring an outer task team, the lifecycle arms the schedule for the executions restored so far before rethrowing. So a failed or rejected wake never leaves an unarmed live chain.
  - Shutdown skips any execution whose chain holds a lease.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| Grace-period setting `config/task-execution-idle-shutdown-setting.ts` | DS-005 | Lifecycle | Parse/normalize/default (600,000 ms; range 60,000–86,400,000) | REQ-016 | Timer logic mixed with config parsing |
| `TaskExecutionIdleShutdownSchedule` | DS-005 | Lifecycle | Per-execution timers, chain arm/cancel, dispose | Isolate timer mechanics | Lifecycle bloat |
| Work-packet builder (`root-task-lifecycle-input.ts` → `task-execution-input.ts`) | DS-001 | Lifecycle | Validate description/files; build first message | Existing | — |
| Task-team restore node builder (`task-team-node-restoration.ts`, Team + Org use) | DS-003 | Adapters | Config source node + persisted `TaskTeamExecution` → `TeamRunAgentTeamNode` with persisted run/platform IDs | Deterministic restore | Duplicated in adapters |
| Tree projections (`task-execution-tree-projection.ts`) | DS-001 | Adapters | Build tree records incl. delegator | Existing | — |
| Stream projectors | DS-006 | Streaming | DTO mapping | Existing | — |

## Ownership Boundaries

- The root run is the only public operation boundary. Tools, the router and the web command handlers call root methods only.
- The lifecycle is internal to the root. Adapters are internal to the lifecycle. Registries are reached only through adapters, and delivery reaches them through root methods.
- The router must not reach into registries or the lifecycle. It asks the sender's root boundary.

## Boundary Encapsulation Map

| Authoritative Boundary | Encapsulates | Upstream Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `RootTeamRun` / `AgentOrgRun` | Lifecycle, communication, index, registries | Tools, router, stream/command handlers | Router or handlers calling registries or the lifecycle directly | Add a root method |
| `RootTaskExecutionLifecycle` | Queue, schedule, leases, adapter | Root runs only | Root calling the adapter for delegate/shutdown/wake | Add a lifecycle method |
| `ActiveRootMessageBoundary` | Root internals | `GlobalAgentRunMessageRouter` | Router inspecting root trees | `hasAgentExecution` on the boundary |

## Dependency Rules

- `agent-collaboration/execution/task/*` is root-neutral and must not import Team/Org trees, indexes or stores (same as today's rule).
- Adapters may depend on their subject's tree mutator, index, registries and persistence coordinator.
- Current runtime must not import anything from `app-data-migrations/`. The migration may import current validators only for target validation.
- Web components depend on view-state services, not on stream DTOs directly (existing rule).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `delegate_task` tool → `DelegateTaskResult` | Delegation | Spawn | `{recipient_address, description, reference_files?}` → success `{target_agent_run_id: string}`; failure `{target_agent_run_id: null, message: string}` | No `task_id` and no `status` (REQ-001, AC-001). Mirrors `send_message_to` null-on-rejection (AR-003) |
| `MemberTaskCommandCapability` | Delegation | `delegateTask` only | caller identity | submit/review removed |
| `RootTaskExecutionLifecycle.delegate(context, input, placement)` | Spawn | Activation | member identity + placement | |
| `RootTaskExecutionLifecycle.onAgentStatus(agentRunId, status)` | Idle | Schedule | AgentRun ID | Replaces `onExecutionBecameIdle` |
| `RootTaskExecutionLifecycle.acquireLiveLease(agentRunId)` | Wake | Precheck context, restore chain, hold | AgentRun ID of any agent in the root | Returns `{release()}` or throws `TaskDelegationError` with a code (`TASK_EXECUTION_CONTEXT_UNAVAILABLE`, `TASK_EXECUTION_RESTORE_FAILED`). `release()` arms the idle schedule for every live execution in the leased chain (AR-001b) |
| `RootTaskExecutionAdapter` (port) | Subject | `prepareActivation`, `commitActivation`, `taskExecutionChainFor(agentRunId)`, `isLive(reference)`, `assertRestorableChain(agentRunId)`, `restoreChain(agentRunId)`, `tryShutDownIfQuiet(reference)`, `hasRunningTaskWork()` | `TaskExecutionReference` for executions; AgentRun ID for agents | Replaces the old port |
| `ActiveRootMessageBoundary.hasAgentExecution(agentRunId)` | Root membership | Routing decision | AgentRun ID | New |
| `RootTeamRun/AgentOrgRun.deliverExactAgentMessage` | Delivery | Lease → deliver | target AgentRun ID | Wakes |
| `executeAgentCommand(post_message)` | Operator input | Lease → post | AgentRun ID | Wakes; `approve_tool`/`interrupt` on a shut-down child → `RUN_NOT_ACTIVE` |
| Stream `TASK_EXECUTION_STARTED` | Child started | UI tree | `parent_team_run_id` (Team) / host (Org) + execution DTO | Replaces `TASK_DELEGATION_EVENT` |

## Interface Boundary Check

| Interface | Singular | Explicit Identity | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| `acquireLiveLease` | Yes | Yes (AgentRun ID) | Low | Adapter resolves the containing chain |
| `tryShutDownIfQuiet` | Yes | Yes (execution run ID: agent or team, discriminated by index) | Medium | Accept `TaskExecutionReference` (`{agentRunId}` / `{teamRunId}`), not a bare string |
| `hasAgentExecution` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Lifecycle owner | `RootTaskExecutionLifecycle` | Yes | Low: "task execution" matches the tree term; no "task status" meaning left | — |
| Schedule | `TaskExecutionIdleShutdownSchedule` | Yes | Low | — |
| Tree field | `delegatorAgentRunId` | Yes | Low: same term as `delegate_task` | — |
| UI state | `offline` shown for shut-down children | Yes | Low | Reuses the existing member status indicator (REQ-013 "shut-down state") |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Restore agent | `ConfiguredAgentActivationPlanner` restore mode via `FlatTeamAgentExecutionHandle` / Org handles | Reuse | ARCH-06 |
| Restore team | `TaskTeamExecutionFactory.materialize(mode)` | Extend (`prepareRestoredTaskTeam`) | ARCH-07 |
| Quiet detection | `tryPrepareTerminationIfQuiescent` (agent, team) | Reuse | ARCH-08 |
| Serialization | `RootTaskLifecycleCommandQueue` | Reuse (rename) | Existing FIFO + shutdown modes |
| Setting | settings pattern | Extend | ARCH-13 |
| Migration | runner, atomic writer, readiness index | Reuse | ARCH-05 |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `agent-collaboration/execution/task` | Lifecycle, queue, schedule, input, port, projections | DS-001/2/3/5 | Extend (replace engine) |
| `agent-team-execution` | Team adapter, registries restore, index liveness, tree mutator, root run | DS-001/2/3 | Extend |
| `agent-org-execution` | Org adapter, registries/directory restore, org run | DS-001/2/3 | Extend |
| `agent-communication` | Router routing via sender root | DS-003 | Extend |
| `run-history` | Schemas v3/v2, loaders, admission | DS-004/7 | Extend |
| `app-data-migrations` | New migration + released schemas | DS-004/7 | Create New (within framework) |
| `agent-tools/task-delegation` | Delegate-only tool | DS-001 | Reduce |
| `api` | Remove task API | — | Remove |
| `services/agent-streaming` + contract packages | DTO/events | DS-006 | Extend |
| `config` + settings service | Grace setting | DS-005 | Extend |
| `autobyteus-web` | Messages-only panel; members tree status | DS-006 | Reduce |

## Draft File Responsibility Mapping

Server (paths relative to `autobyteus-server-ts/src`):

| File | Subsystem | Owner | Concern |
| --- | --- | --- | --- |
| `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` (new; replaces engine) | task | Lifecycle | delegate, onAgentStatus, acquireLiveLease, closeExternalAdmission, enterRootFailStop, drain, dispose |
| `.../task/root-task-execution-adapter.ts` (new port) | task | Port | Subject port types |
| `.../task/root-task-execution-command-queue.ts` (rename) | task | Lifecycle | FIFO |
| `.../task/task-execution-idle-shutdown-schedule.ts` (new) | task | Lifecycle | Timers |
| `.../task/task-execution-input.ts` (rename of `root-task-lifecycle-input.ts`) | task | Lifecycle | Validation + work packet |
| `.../task/task-lifecycle-command.ts` → `task-delegation-command.ts` | task | Contract | `DelegateTaskInput/Result`, `TaskDelegationError` |
| `.../task/member-task-command-capability.ts` | task | Contract | delegate only |
| `.../task/task-execution-tree-projection.ts` | task | Adapters | + delegator, − settledAt |
| `.../task/task-team-node-restoration.ts` (new) | task | Adapters | Restore node builder |
| `agent-team-execution/task-delegation/team-task-execution-adapter.ts` (rename/reshape) | team | Adapter | Team port impl |
| `agent-team-execution/task-delegation/team-task-execution-service.ts` (rename) | team | Facade | Construction + event forwarding |
| `agent-team-execution/local/registries/task-agent-execution-registry.ts` | team | Registry | + `restore(node)`; settlement → `tryShutDownIfQuiet` |
| `agent-team-execution/local/registries/task-team-execution-registry.ts` | team | Registry | + `restore(node)`; same |
| `agent-team-execution/local/task-team-execution-factory.ts` | team | Factory | + `prepareRestoredTaskTeam` |
| `agent-team-execution/local/flat-team-execution-manager.ts`, `flat-team-run-backend.ts`, `backends/team-run-backend.ts`, `domain/team-run.ts` | team | Manager | Expose restore/shutdown direct task ops; status snapshots report dormant task agents `offline` |
| `agent-team-execution/services/team-execution-index.ts` | team | Index | Remove settled liveness; expose task-execution chain lookup |
| `agent-team-execution/services/team-run-execution-tree-mutator.ts` | team | Mutator | Remove settle; add delegator |
| `agent-team-execution/domain/root-team-run.ts` | team | Root | Delivery/command via lease; remove tasks state; `hasAgentExecution` |
| `agent-team-execution/domain/team-run-event.ts`, `task-delegation-event-factory.ts` → `task-execution-event-factory.ts` | team | Events | Started event only |
| `agent-team-execution/services/team-run-persistence-*.ts`, `team-root-materializer.ts`, `agent-team-run-manager.ts` | team | Persistence | Tree-only activation; no records store |
| `agent-org-execution/services/agent-org-task-lifecycle-adapter.ts` → `agent-org-task-execution-adapter.ts` | org | Adapter | Org port impl |
| `agent-org-execution/domain/agent-org-run.ts`, `agent-org-run-event.ts`, `services/agent-org-root-agent-execution-registry.ts`, `agent-org-team-execution-directory.ts`, `agent-org-execution-index.ts`, `agent-org-run-execution-tree-mutator.ts`, `agent-org-run-persistence-coordinator.ts`, `agent-org-state-package-loader.ts`, `agent-org-state-package-validator.ts`, `agent-org-run-manager.ts`, `agent-org-execution-scope-builder.ts`, `agent-org-agent-status-snapshot-projector.ts`, `domain/agent-org-run-execution-tree.ts` | org | Org | Mirror Team changes |
| `agent-communication/services/global-agent-run-message-router.ts`; `agent-collaboration/execution/services/active-collaboration-root-directory.ts` | comm | Router | Sender-root routing |
| `run-history/domain/run-execution-tree-shared-records.ts`, `run-history/store/run-execution-tree-shared-record-schemas.ts`, `team-run-execution-tree-schema.ts` (v3), `agent-team-execution/domain/team-run-execution-tree.ts`, Org tree schema (v2) | run-history | Schema | New shapes |
| `run-history/services/team-run-state-package-loader.ts`, `team-run-state-package-validator.ts`, `root-run-package-current-validator.ts` | run-history | Admission | Tree + messages; delegator resolves |
| `app-data-migrations/migrations/task-execution-delegator-tree-v1/{task-execution-delegator-tree-v1-app-data-migration.ts, released-team-run-execution-tree-v2-schema.ts, released-agent-org-execution-tree-v1-schema.ts, released-task-delegation-records-v1-schema.ts, task-execution-delegator-tree-transform.ts}` + registry entry | migrations | Migration | Transform |
| `app-data-migrations/migrations/team-run-execution-tree-v2-app-data-migration.ts` and other released migrations importing current tree/task types | migrations | Migration | Repoint to frozen released schemas |
| `agent-tools/task-delegation/*` | tools | Tool | Delegate only |
| `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | contract | Text | Rewrite |
| `api/graphql/types/task-delegation.ts`, `api/graphql/schema.ts`, `api/rest/task-delegation.ts`, `api/rest/index.ts` | api | API | Remove |
| `services/agent-streaming/team-execution-view-projector.ts`, `agent-org-execution-view-projector.ts`, `models.ts` | streaming | Projector | New DTOs |
| `application-platform/execution/application-execution-scope-kernel-builder.ts` | app platform | Builder | Drop records store |
| `config/task-execution-idle-shutdown-setting.ts` (new), `services/server-settings-service.ts` | config | Setting | Grace |

Contracts: `autobyteus-team-stream-contracts/src/{team-execution-view-dtos.ts, team-task-message-dtos.ts (→ team-task-execution-message-dtos.ts), team-stream-server-message.ts, index.ts}`; `autobyteus-collaboration-stream-contracts/src/{agent-org-execution-dtos.ts, root-execution-view-dtos.ts}`.

Web: remove the files listed in the Removal Plan. Modify:
- `CollaborationOverviewPanel.vue` (Messages only, no section toggle)
- `layout/RightSideTabs.vue`, `stores/activeContextStore.ts`
- `TeamMembersPanel.vue` (drop `taskStatusLabel`; use `AgentStatusDisplay` for task rows; show the delegator via a subtle secondary line)
- `services/teamExecution/{teamExecutionViewModels.ts, teamExecutionViewState.ts, teamExecutionTreeSelectors.ts, teamExecutionTreeMutations.ts}`
- `services/runHydration/teamRunContextHydrationService.ts`, `stores/runHistoryTypes.ts`, `graphql/queries/runHistoryQueries.ts`, `generated/graphql.ts`
- `services/agentOrgExecution/{agentOrgExecutionContext.ts, agentOrgExecutionViewIndex.ts, agentOrgContextHydration.ts}`, `stores/agentOrgContextsStore.ts` (access: a child in an active root is `live`)
- `utils/agentOrgHistoryRows.ts` (no settled filter), `components/workspace/history/*Row.vue`, `components/progress/ActivityFeed.vue`, `components/workspace/team/AgentTeamEventMonitor.vue`, `TeamWorkspaceSurface.vue`, `utils/teamCommunication/teamCommunicationPerspective.ts`
- localization `en`/`zh-CN`
- test-support fixtures

## Reusable Owned Structures Check

| Structure | Shared File | Owner | Why | Redundant Removed | Overlap Removed | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| `TaskExecution` record | `run-history/domain/run-execution-tree-shared-records.ts` | run-history | Team + Org | Yes (`settledAt`) | Yes (delegator no longer in a second file) | Status carrier |
| Restore node builder | `task/task-team-node-restoration.ts` | task | Team + Org | Yes | Yes | Config resolver |
| `TaskExecutionReference` | Moves from the records type to `task/task-execution-reference.ts` | task | Used by port/events | Yes | Yes | — |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field | Redundant Removed | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `TaskAgentExecution {address, agentRunId, platformAgentRunId, delegatorAgentRunId, startedAt}` | Yes | Yes | Low | — |
| `TaskTeamExecution {address, teamRunId, members, taskExecutions, delegatorAgentRunId, startedAt}` | Yes | Yes | Low | — |
| `DelegateTaskResult` | Yes | Yes (`task_id`) | Low | — |

## Final File Responsibility Mapping

As in the Draft mapping. There are no further extractions beyond the three shared structures above.

## Applied Patterns (If Any)

- **Lease:** a counter per execution chain inside the lifecycle.
- **Serialized command queue:** existing FIFO.
- **Strategy by subject:** the adapter port with Team and Org implementations, as today.
- **Timer schedule:** a bounded local owner.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `src/agent-collaboration/execution/task/` | Folder | Lifecycle | Root-neutral delegation + resource lifecycle | Team/Org trees, stores |
| `src/agent-team-execution/task-delegation/` | Folder | Team adapter/facade | Team-specific task execution mechanics | Records, API projections |
| `src/app-data-migrations/migrations/task-execution-delegator-tree-v1/` | Folder | Migration | All legacy reading for this change | Runtime imports from here |
| `src/config/task-execution-idle-shutdown-setting.ts` | File | Setting | Grace period | Timers |

## Folder Boundary Check

| Folder | Depth | Clear | Risk | Justification |
| --- | --- | --- | --- | --- |
| `agent-collaboration/execution/task` | Main-Line Domain-Control | Yes | Low | Existing root-neutral home |
| `agent-team-execution/task-delegation` | Off-Spine (subject adapter) | Yes | Low | `records/` subfolder removed |
| migration folder | Persistence-Provider | Yes | Low | Framework convention |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Bad / Avoided | Why |
| --- | --- | --- | --- |
| Tool result | Success `{"target_agent_run_id":"agent_x"}`; failure `{"target_agent_run_id":null,"message":"Recipient '/x' was not found."}` | `{"task_id":…,"status":"active",…}` or any `status` field | No task identity or status (AC-001) |
| Errored child | `error` status → arm → after grace `tryShutDownIfQuiet` succeeds (no active turn) | `error` treated as running → never shut down | AR-001 |
| Failed wake | Precheck rejects before restore; or partial restore → armed → shut down after grace | Restored ancestors left live with no timer | AR-001b / AR-002 |
| Tree record | `{"address":"/reviewer","agentRunId":"r1","platformAgentRunId":null,"delegatorAgentRunId":"c1","startedAt":"…"}` | `settledAt` kept "for compatibility", or `delegatorAgentRunId: null` for old runs | Clean cut; migration fills it |
| Wake race | `lease = acquireLiveLease(t); try { deliver } finally { lease.release() }` | `restore(); deliver()` without a lease (a timer can fire in between) | QR-002 |
| Routing | Router: `senderRoot.hasAgentExecution(t) ? senderRoot.deliverExactAgentMessage(…) : liveGlobalDelivery(…)` | Router looking up the target's root through an active AgentRun only | Shut-down children have no AgentRun |
| Team shutdown | `taskTeams.tryShutDownIfQuiet(teamRunId)` → `TeamRun.tryPrepareTerminationIfQuiescent` (includes nested live children) | Custom "all members idle" aggregation | Reuse ARCH-08 |
| Nested wake | Target is inside dormant task team T1 hosted in root → restore T1 (TeamRun, members lazy) → the member activates in `restore` mode on input | Restoring every member eagerly | Cheap restore |
| Operator composer | Child in an active root → `live` access; shut-down child still `live` | Read-only for shut-down children | ARCH-10 preservation |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep reading task-records files at runtime for the delegator | Avoid migration | Rejected | Migration copies into the tree |
| Nullable `delegatorAgentRunId` for old runs | Avoid migration | Rejected | Migration |
| Keep `settledAt` and reinterpret as "shut down at" | Avoid schema bump | Rejected | Runtime liveness; field removed |
| Keep submit/review as no-ops | Avoid breaking prompts | Rejected | Tools and text removed |
| Keep GraphQL task query returning empty | Avoid client break | Rejected | Query and client deleted together |

## Derived Layering (If Useful)

N/A. The ownership map is sufficient.

## Change / Refactor Sequence

1. **Freeze released schemas.** Copy the Team tree v2, Org tree v1 and task-records v1 validators/types into migration-owned files. Repoint the existing released migrations (`team-run-execution-tree-v2-app-data-migration.ts`, `predecessor-task-delegation-records.ts`, Org migrations) that import current tree or task types.
2. **New shared record shape and schemas.** Team tree v3, Org tree v2, shared `TaskExecution`, and the index without settled liveness.
3. **Migration** plus registry entry, with tests (see Guidance).
4. **Lifecycle core:** `RootTaskExecutionLifecycle`, queue rename, idle schedule, lease, port, input, delegation command types, grace setting.
5. **Team adapter and registries:** restore entry points, quiescent shutdown, status snapshots reporting dormant agents `offline`, root run delivery and commands via lease, `hasAgentExecution`, tree-only persistence, events.
6. **Org mirror** of step 5.
7. **Router:** sender-root routing.
8. **Tools and contract text:** remove submit/review everywhere (native + MCP), new result shape, rewritten LLM text.
9. **Remove** records stores, loaders' records use, admission records use, GraphQL/REST, app-platform builder use.
10. **Contract packages:** new DTOs/events. Build the packages.
11. **Web:** remove task UI and types; update view state, members panel, org access, history rows, localization.
12. **Docs** (delivery-owned sync): `docs/modules/agent_team_execution.md`, `agent_orgs.md`, `agent_tools.md`, `agent_tools_mcp_server.md`, `codex_integration.md`, `prompt_engineering.md`, `agent_execution.md`, `agent_definition.md`.

Temporary seams: none left at the end. Every file in the Removal Plan is deleted.

## Key Tradeoffs

- **Runtime-only shutdown state:** there are no tree writes on shutdown or wake, so there's no persistence churn. After a server restart every child is shut down, which is the desired behavior.
- **Grace re-arm triggers:** a live chain is armed on every `idle`/`offline`/`error` status event and on every lease release, including failed or rejected wakes. A failed shutdown attempt (not quiet at fire time) re-arms on the next such trigger. Every running→idle or running→error transition emits a status event, so no quiet child stays live indefinitely.
- **Team shutdown granularity:** a task team shuts down as a whole, and nested live children inside it are terminated with it only when they're quiet, per the existing quiescence contract.
- **Shut-down UI state reuses `offline`:** this is the cleanest reading of REQ-013 ("same status indicator … plus a shut-down state"). No new visual state is introduced.

## Risks

- External provider session resume for task agents (Codex/Claude) depends on `platformAgentRunId` being adopted into the tree during activation. This exists today for task agents (`stagedPlatformBindings`, binding commits). Cover it in E2E (AC-007 per runtime).
- Restoring children from pre-change runs: when the ingress agent has no readable conversation, `assertRestorableChain` rejects with `TASK_EXECUTION_CONTEXT_UNAVAILABLE` before anything is restored (REQ-007, AC-011). The planner's "none → new" path is not reached for a task-execution ingress. How often pre-change children lack a trace remains a validation observation on a copied real install, not a design dependency.
- Migration on real data. The guideline requires evidence of coexistence (valid, missing-tree and missing-records packages) and repeat startup.
- Timer leaks on root termination. Handle with lifecycle `dispose` and tests.

## Guidance For Implementation

- **Timers:** use an injectable clock/timer seam in `TaskExecutionIdleShutdownSchedule` for AC-004/005 tests. Read the grace period at arm time.
- **Status events:** use the existing hooks, Team `TaskDelegationService.onRootEvent` and Org `onAgentExecutionEvent`. Map `running|initializing` → cancel and `idle|offline|error` → arm. Don't arm on the `offline` published by the shutdown itself; the adapter reports the execution as not live, so the schedule ignores it.
- **Leases:** acquire inside the root's materialization/operation gate. Release in `finally`; `release()` arms the chain. Shutdown checks leases at queue head.
- **Restore precheck (AR-002):**
  - `assertRestorableChain` runs before any restore. For every dormant task execution in the chain, it inspects the ingress agent's conversation activity with the existing `AgentConversationActivityInspector`, at the memory location derived from the tree physical scope. The ingress is the task agent itself, or the task team's coordinator.
  - `present` → proceed. `none` or `indeterminate` → throw `TaskDelegationError("TASK_EXECUTION_CONTEXT_UNAVAILABLE", …)`. Nothing is restored in that case.
  - Then the task agent handle is created in the unchanged `restore` mode. Because activity is `present`, the planner selects `restore_native` / `restore_external`, so the child continues with its context rather than silently starting fresh.
  - Members of a restored task team keep plain `restore` mode. A member that was never messaged legitimately has no conversation and starts as `new`, exactly as configured members do today.
  - The planner and configured-member semantics are unchanged.
- **Wake failure to sender:** the root converts `TaskDelegationError` from `acquireLiveLease` into the delivery result `{accepted:false, code, message}`. The `send_message_to` tool therefore returns `target_agent_run_id: null` with the code in the message (AC-011).
- **Open work (REQ-011, AR-001):**
  - Task executions count as open work only while an agent inside them is `initializing` or `running`, computed from leaf status snapshots via `adapter.hasRunningTaskWork()`.
  - `FlatTeamExecutionManager.hasOpenExecutionWork` and `AgentOrgRun.hasOpenExecutionWork` use the task registries' running-work predicate instead of `handle.hasOpenExecutionWork()` for task agents and task-team runs.
  - Configured members keep today's predicate, where `error` counts (configured-member lifecycle is out of scope).
  - An errored child therefore neither blocks root open-work nor avoids shutdown.
- **Restore:**
  - Team task agent: `TaskAgentExecutionRegistry.restore({address, agentRunId, sourceNode, platformAgentRunId})` creates a `FlatTeamAgentExecutionHandle` with `activationMode: "restore"`. It registers into `active` without posting any message; delivery posts.
  - Task team: `TaskTeamExecutionRegistry.restore({teamNode})` via `prepareRestoredTaskTeam`.
  - Org: same through the root agent registry and team directory.
- **Root termination:**
  - Remove `shutdownAndSettle`.
  - `closeExternalAdmission` + `schedule.dispose()`, then the existing frozen termination scope terminates live executions.
  - Fail-stop: `enterRootFailStop` disposes timers.
- **Tool result schema:** replace `DelegateTaskResultSchema` in `task-delegation-result-contract.ts` with a union of two strict shapes: `{target_agent_run_id: nonBlank}` and `{target_agent_run_id: null, message: nonBlank}`. The LLM text says: "On success it returns the new instance's `target_agent_run_id`; if nothing was started, `target_agent_run_id` is null and `message` explains why."
- **LLM text:** remove the "Task Lifecycle" and "Additional Task Clarification" sections. Replace "Dedicated Task Execution" with a short "Delegated Agents" section: spawn → run ID → `send_message_to`; a shut-down delegated agent wakes on message. Replace the live-only sentence on `target_agent_run_id` with: any AgentRun in the same root, including shut-down delegated agents (restored with context); or a currently active AgentRun elsewhere.
- **Migration tests:**
  - valid Team v2 package with open/awaiting/accepted/interrupted tasks and nested task teams;
  - Org v1 package;
  - an orphan execution;
  - a missing records file;
  - a missing tree;
  - an already-current package;
  - repeat startup (idempotent, originals and records hashes unchanged);
  - both startup entrypoints;
  - a copied real install when available.
- **Tests to replace or remove:** the ~19 server tests referencing submit/review, web task component specs, and `team-task-event-current-contract.e2e.test.ts`. Add E2E covering delegate → reply → idle → shutdown → wake → reply for AutoByteus, Codex and Claude.

## Retained Team Helper Dispositions (R-3)

| File | Disposition | Target Responsibility |
| --- | --- | --- |
| `task-delegation/task-delegation-execution-resolution.ts` | Keep | `findTaskConfigNode`, `requirePreparedTaskTeamNode`, `sameTaskExecutionBinding`, used by activation and restore |
| `task-delegation/task-delegation-service-contract.ts` | Reshape → `team-task-execution-service-contract.ts` | Service options without records (`initialTasks`, `commitTaskMutation` records part, `deliverSystemMessage` for submit/review removed) |
| `task-delegation/task-team-run-identity-factory.ts` | Keep | Fresh task-team ID allocation only |
| `task-delegation/task-execution-identity-capabilities.ts` | Keep | Fresh identity capabilities |
| `task-delegation/task-delegation-result-contract.ts` | Reshape | New result schema (AR-003) |
| `task-delegation/task-delegation-ownership.ts`, `task-delegation-record.ts`, `task-execution-tree-projection.ts` | Remove | See Removal Plan |

## Evidence-Only Clarifications (No Intended-Behavior Change)

- **ARCH-10:** an operator composer message to a shut-down child wakes it. This preserves today's ability to message children.
- **R-1:** sender-root routing sends every same-root run-ID target through the sender's root. As a result, a not-yet-activated **configured** member of the same root is also reachable by run ID; it activates lazily in its normal team activation mode. Today the router rejects such a target because it has no active `AgentRun`. This is consistent with the user's clarification that `send_message_to` "just wakes it up or starts it" (investigation notes, clarification 3) and with the LLM text "any AgentRun in the same root". It changes no approved requirement. Configured-member lifecycle (shutdown) stays out of scope.
- **R-4:** shut-down children render with the existing `offline` status, which looks identical to a configured member that hasn't started. Delivery's explicit user verification must confirm this label with the user (REQ-013 left the exact wording to design).

## Review Round 1 Resolution (ARCH-REV-001)

| Finding | Resolution | Sections Changed |
| --- | --- | --- |
| AR-001 (a) | `error` arms the idle schedule; only `running|initializing` cancel. Task-execution open work counts only `initializing|running` | Bounded Local Spines (DS-005), Guidance (status events, open work), Key Tradeoffs, Examples |
| AR-001 (b) | Chosen option: **arm on lease release**, plus arm already-restored executions when `restoreChain` throws. No rollback of restores | Bounded Local Spines (lease), Interface Mapping (`acquireLiveLease`), Guidance (leases) |
| AR-002 | Chosen option **(a)**: `assertRestorableChain` precheck, where ingress with conversation activity `none` or `indeterminate` gives `TASK_EXECUTION_CONTEXT_UNAVAILABLE` before any restore. Restore failures give `TASK_EXECUTION_RESTORE_FAILED`. Planner unchanged. Sender gets `{accepted:false, code}`, so `send_message_to` returns `target_agent_run_id: null` | Interface Mapping, Guidance (precheck, wake failure), Risks |
| AR-003 | Result `{target_agent_run_id}` or `{target_agent_run_id: null, message}`; no `status` | Interface Mapping, Examples, Guidance (result schema, LLM text) |
| R-1 | Recorded as an evidence-only clarification | Evidence-Only Clarifications |
| R-2 | Admission required/retired file rule made explicit | Removal Plan |
| R-3 | Helper dispositions stated | Removal Plan, Retained Team Helper Dispositions |
| R-4 | Delivery user-verification obligation recorded | Evidence-Only Clarifications |

Additional test obligations:
- **AC-004 / AC-015:** an errored child is shut down after grace, and the root reports no open work while the child is errored or after shutdown.
- **AC-011:** a missing ingress conversation gives the `TASK_EXECUTION_CONTEXT_UNAVAILABLE` rejection with nothing restored.
- **AC-007:** after a wake whose delivery is rejected, the chain is shut down after grace.
- **AC-001:** exact result shapes.
- **AC-018:** an admitted old package that still has its records file.

## SR-005 Migration Checklist And Basis Refresh

### Why this revision

The SR-003/SR-004 migration design followed the guideline's core rules but skipped several required steps:

- the design checklist;
- inspection of predecessor migrations' preserved items and of real installed data;
- a check of references from other features;
- the startup and reporting boundaries.

The guideline was also rewritten upstream after this ticket's base (`bb91a881e`). This section closes those gaps against the current guideline (`origin/personal@f2924a2b0`, `autobyteus-server-ts/docs/design/data_migration_guideline.md`). Evidence: ARCH-16 to ARCH-19.

### Can the migration be avoided or simplified?

- **Avoiding it:** not without keeping a dead persisted field.
  - Team and Org trees are validated with exact keys, so any change to `TaskExecution` (removing `settledAt`, adding `delegatorAgentRunId`) needs a schema-version bump.
  - The only migration-free design keeps `settledAt` in every tree with no runtime meaning, and drops "who started it" from the UI (an approved requirement, REQ-013). Rejected: a dead field is legacy retention, and the approved UI would change.
- **Simplifying it:** yes, based on the real data (ARCH-16).
  - Of 594 roots, only 9 have task executions (18 in total, all already shut down, all delegators resolvable, no orphans).
  - Records are read **only for trees that contain task executions**. Every other tree is a pure `settledAt`-free version bump, and a missing records file no longer matters for those.
  - Per root this is one small file read and one atomic write. No traces or history files are read. No backups, hashes, manifests or journals.

### Guideline checklist (published guideline §10, `origin/personal@f2924a2b0`; numbering corrected in SR-006, R-8)

1. **Availability.**
   - Startup and new work never depend on this migration. No entrypoint checks its status.
   - Admission reads only the current tree + messages (DS-007).
   - If every historical root fails or is excluded, the app opens and new delegations work, because a new root writes a v3/v2 tree directly.
   - The only current-platform prerequisite is the existing one: the current schema is loadable.
2. **Sources and target.**
   - Inspected released shapes: Team tree v2 + records v1 (557 on this install); nonempty Team roots with no tree (8, preserved by `20260824_team_run_execution_tree_v2` SKIPPED and `20260901_agent_org_flat_team_families_v1` FAILED, ARCH-17); Org tree v1 + Org records v1 (29).
   - Code-reachable but absent on this install: orphan executions (activation's tree write succeeded but the records write failed; `treeOrphanMayExist`) and a missing records file.
   - Target: Team tree v3 / Org tree v2, admitted by `RootRunPackageReadinessIndex` using current validation.
3. **Dispositions.**

   | Source item | Disposition | Status contribution |
   | --- | --- | --- |
   | Tree v2 / v1, no task executions | Convert (version bump) | migrated |
   | Tree with task executions + records | Convert: add delegators, drop `settledAt`, drop unreferenced executions | migrated |
   | Tree already v3 / v2 | `SKIPPED_ALREADY_CURRENT` | skipped |
   | No tree | `SKIPPED_MISSING`, preserved untouched | skipped (warning reason) |
   | Tree with task executions, no records file | `SKIPPED_MISSING_TASK_RECORDS`, preserved (already non-admitted) | skipped (warning reason) |
   | Unparseable or unsupported tree/records | `FAILED_INVALID_OR_UNSUPPORTED_PAYLOAD`, preserved | failed, scoped to that root |
   | Delegator not found in its tree | `FAILED_TRANSFORMATION`, preserved | failed, scoped to that root |

   The aggregate follows guideline §4: `SUCCEEDED` when only converted and already-current items exist; `SUCCEEDED_WITH_WARNINGS` when preserved exclusions exist; `FAILED` only when a write did not establish its target. None of these gates startup. Admission is computed from current data, independently of the ledger.
4. **Commit and retry.**
   - The existing atomic run-package file writer does one rename per tree.
   - Records files are never written, so they stay unchanged on disk.
   - A retry sees either the old tree (converts again) or the current tree (skips). A per-file retry is sufficient because each root's conversion touches exactly one file.
   - No backup is justified: the source facts (old records) remain on disk untouched, and `settledAt` carries no information the current runtime needs.
5. **Current-only boundary.**
   - Legacy reading lives only in `task-execution-delegator-tree-v1/` (frozen Team tree v2, Org tree v1 and records v1 schemas).
   - Released migrations that import the current tree/task types or validators (the reviewer counted 15) are repointed to frozen copies **before** the current schema changes (Change Sequence step 1).
   - No Prisma schema change, so deployment order doesn't apply.
   - Registry position and the dependencies of released migrations: see "SR-006 Resolution → Released-migration ordering and dependencies (AR-004)", which supersedes the earlier "after `20260926`" statement.
6. **Cost.** 594 small JSON trees, each read once and written once. The 9 roots with task executions also read one small records file. Nothing re-validates at startup after completion: the runner skips a terminal migration, and admission is the existing structural check.
7. **Boundary contracts** (published item 7; added in SR-006, R-8): see "SR-006 Resolution → Boundary contracts".

   **References from other features (ARCH-18; guideline §4 reference admission):**
   - `context-file-record-locators.ts` scans task-records files for attachment locators, but only for released migrations. Because records files stay unchanged, those migrations keep working.
   - Old delegation attachments remain on disk but are no longer displayed (task UI removed, DEC-006). The child's first message still lists their paths.
   - The token-usage task-team index uses migration-owned predecessor converters and is unaffected.
   - `delegatorAgentRunId` is an in-tree reference validated by the current validator (it must resolve to an AgentRun in the same tree).
   - Recommended follow-up, outside this ticket: move `context-file-record-locators.ts` under `app-data-migrations/`, since only migrations use it.
8. **Evidence required (guideline §8):**
   - (a) Committed fixtures shaped like the real released data: Team v2 with no tasks; Team v2 with an interrupted task agent; Org v1 with accepted task teams at depth 1 and an interrupted agent; an orphan execution; a missing records file with and without tasks; a tree-less nonempty root; an already-current tree.
   - (b) Coexistence, **and** the all-roots-excluded case with new delegation working.
   - (c) Retry and idempotence, with records and tree-less roots byte-identical after repeated startup.
   - (d) Both real startup entrypoints (desktop and standalone server), and repeat startup.
   - (e) Before delivery, a stopped-writer disposable copy of this installed dataset (`~/.autobyteus/server-data`, including the 8 tree-less roots): all 9 task-bearing roots converted, 8 preserved, the app opens, old runs list, and a new delegation works. Never run against the live profile.
   - (f) Delivery's explicit user verification.
   - (g) Skip-version upgrade fixture (AR-004): see "SR-006 Resolution".
9. **Lessons applied and review.** The design avoids the v1.4.87 lockout (no status gate; tree-less roots preserved) and the startup-performance anti-patterns (no backups, hashes, manifests or startup audits). It follows `team-run-execution-tree-v2-app-data-migration.ts` (classification + atomic replace + reread) and the frozen-schema precedent (`agent-org-flat-team-families-v1/released-team-run-v2-schema.ts`). Independent review: `/architecture_reviewer`.

### Basis refresh to `origin/personal@f2924a2b0` (ARCH-19)

- **Required workspace action:** rebase the ticket branch onto the latest `origin/personal` before any further implementation. The design's file paths are unchanged, but 75 server files moved.
- **Wake simplification:** `ConfiguredAgentExecutionHandle` now re-activates in `restore` mode after its run died.
  - Within a live root, idle shutdown terminates only the task agent's `AgentRun`. The handle stays registered, and the next input restores it through the existing `ensureReady`.
  - `TaskAgentExecutionRegistry.restore(node)` is needed only when no handle exists, that is after root reopen.
  - `assertRestorableChain` (AR-002) still runs before any wake.
  - Task teams: an idle shutdown terminates the task `TeamRun` as designed, because team-level quiescent termination disposes it. Restore uses `prepareRestoredTaskTeam`.
- **Admission simplification:** `root-run-package-readiness-index.ts` no longer validates context-file references at startup, so the admission change is limited to the required-file lists and the validators (R-2 unchanged).
- **Guideline:** checked against the current guideline as above.

## SR-006 Resolution (ARCH-REV-003)

### Released-migration ordering and dependencies (AR-004)

**Chosen option: (b) — register the new migration immediately after `20260901_agent_org_flat_team_families_v1`**, before `RemoveExternalRuntimeWorkingContextSnapshotsMigration` in list order (the runner executes in list order, `app-data-migration-runner.ts` `runPending`).

- **Prerequisites:** `[TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID, AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID]`.
- **Why this position:**
  - Every migration that **produces** Team tree v2 or Org tree v1 (`20260814` → `20260824` → `20260901`) runs before it.
  - Every later migration that **consumes current tree contracts** (`20260926`, `20260905`) runs after it and therefore sees the current shape.
  - No migration after `20260901` in list order writes a Team or Org tree (import inventory, `origin/personal@f2924a2b0`). `20260926` writes only records, messages and traces through the atomic writer. `20260905` reads the Org tree through the current store and writes only history-index summaries. So nothing produces a v2/v1 tree after us.
- Option (a), registering last, would require freezing the current admission scan and Org history services for `20260926` and `20260905`. That is much larger than (b) and gains nothing.
- **Workspace reconciliation:** the pre-rebase implementation already registers the migration at exactly this position. After the rebase, verify the list order is still "… `AgentOrgFlatTeamFamiliesV1` → `TaskExecutionDelegatorTreeV1` → `RemoveExternalRuntimeWorkingContextSnapshots` …" and set the prerequisites above.

| Released migration (list order) | Runs | Current code it uses that this ticket changes | Disposition | Why its output stays correct |
| --- | --- | --- | --- | --- |
| `20260814_team_run_execution_tree_v1` + `team-run-execution-tree-v1/*` (`predecessor-task-package-converter.ts`, `team-run-v1-package-promoter.ts`, `team-run-state-package-v1-validator.ts`, `team-execution-v1-index.ts`) and `team-run-migration-state-classifier.ts` | Before | Task-records v1 types, schema, store and path; `TaskExecutionReference` type | **Repoint** imports to the frozen legacy module (below) | Verbatim copies; same data, same code |
| `20260824_team_run_execution_tree_v2` | Before | Current Team tree validator (validates its v2 output) | **Repoint** to frozen Team tree v2 validator | Verbatim v2 validator |
| `20260819_token_usage_run_records_v1` + `token-usage-task-team-run-index.ts` | Before | Records v1 via the TreeV1 predecessor converter | Covered by the TreeV1 repoint | Unchanged converter |
| `20260901_agent_org_flat_team_families_v1` + `agent-org-history-candidate-plan.ts`, `agent-org-token-attribution-transition.ts`, `agent-org-context-file-locator-transition.ts`, `agent-org-history-index-transition.ts` | Before | Current Team tree v2 / Org tree v1 validators; Team/Org records v1 schemas and paths; `validateAgentOrgStatePackage` (with records); `AgentOrgExecutionIndex` | **Repoint** to the frozen Team tree v2, Org tree v1, records v1, Org state-package v1 validator and Org execution index v1 | It runs on v2/v1 data exactly as released, with verbatim code |
| **`20261001_task_execution_delegator_tree` (new)** | — | — | — | — |
| `20260926_team_context_file_execution_locators_v1` | After | Current admission scan `RootRunPackageCurrentValidator` (now tree v3/v2 + messages, no records) | **No change** (compile only). Must **not** be repointed | Runs on current trees. Records files are still on disk and are still scanned by filename for locators. Roots we preserved (tree-less, tasks without records, failed) stay non-admitted and are skipped as before. Trees without tasks and without records are now admitted and get their locators converted: a gain, not a loss |
| `20260905_agent_org_history_first_message_summary_v1` | After | Current Org tree store and validator (sees v2), `validateAgentOrgStatePackage` with records, Org records store and type (its evidence reader uses task submissions) | **Adapt** (~10 lines): validate the current package (tree v2 + messages) with the current validator; read the Org records file through the frozen records v1 module for evidence | Same records file and fields; addresses and run IDs are unchanged by our transform; the evidence reader only uses configured delegators. Summary text is identical, proven by the skip-version fixture |
| `20260701_team_communication_projection_addresses`, `20260623_remove_self_evolution_run_metadata`, `20260521_team_run_history_index_v2`, `20260521_run_history_index_v2`, `20260803_custom_provider_readable_identity`, `20260924_remove_external_messaging_data` | After | None (no imports of changed modules) | Not affected | — |

**Frozen legacy module:** `src/app-data-migrations/legacy/released-run-package-shapes/`, shared by the released migrations above **and** the new migration. It holds verbatim copies, as of `f2924a2b0`, of:

- Team tree v2 schema;
- Org tree v1 schema;
- the v2-era shared record schemas;
- Team and Org task-records v1 types, schemas and stores;
- the Org state-package v1 validator;
- the Org execution index v1.

**Honest size:** about 1,100 lines copied without behavior change, import repoints in about 15 released files, and one ~10-line adaptation (`20260905`). The existing `agent-org-flat-team-families-v1/released-team-run-v2-schema.ts` stays as released (no consolidation churn). Current runtime must not import the legacy module; the dependency rules already forbid that.

**Unsupported premise noted:** if our write fails for a root (storage failure, outside the guideline's normal operating assumptions) and `20260926` then completes, that root misses locator conversion after its later retry. This is Not Reachable under the normal assumptions, so no machinery is added.

### Boundary contracts (published checklist item 7; R-8)

- **Database transport:** N/A. File-only migration, no SQL.
- **Audit:** the runner formats the summary sentence ("Scanned N; migrated N; skipped N; failed N.") from the four aggregate counts. Dispositions with reason counts and capped examples go only to the attempt log. Nothing goes into status fields.
- **Execution policy:** `requiredOnStartup = true`, `executionPolicy = "STARTUP_ONLY"`, prerequisites as above. This matches `20260901` and `20260926`, because list order relative to later startup migrations matters on skip-version upgrades.
- **Recovery action:** runner-provided `RESTART_TO_RETRY` while pending, failed or stale; `NONE` once terminal. Manual invocation is rejected (`STARTUP_ONLY`), and no UI inference is involved.

### Skip-version evidence (added to checklist item 8, obligation g)

Build a fixture install at the state before `20260901`:

- ledger terminal through `20260824`;
- Team v2 trees + records, including task executions;
- Org sources needing `20260901`;
- context-file locators needing `20260926`;
- Org first-message summaries needing `20260905`;
- a tree-less root.

Run all pending migrations from that ledger through both real startup entrypoints. Assert:

1. `20260901` outputs match released behavior;
2. the new migration converts after it;
3. `20260926` converts locators in the converted packages;
4. `20260905` produces the expected summaries;
5. preserved roots and records files stay byte-identical;
6. a repeat startup runs nothing.

### Downstream re-review after the rebase (R-9)

Implementation, code-review and API/E2E artifacts produced on the pre-rebase base (`8bffda045`) do not cover the rebased code. After the rebase, those gates must be re-run on the rebased basis. Earlier passes apply only to the basis they reviewed.

### SR-006 resolution index

| Item | Resolution |
| --- | --- |
| AR-004 | Option (b) position + prerequisites; released-migration disposition table; frozen legacy module, sized; one adaptation; skip-version evidence; reconciliation after the rebase |
| AR-005 | Single liveness predicate and shutdown-commit behavior (Terminology), applied across the schedule, queue, precheck, open work, snapshots and command gating |
| R-8 | Checklist references use the published guideline numbering (§10 checklist, §4 statuses, §8 evidence); boundary contracts answered |
| R-9 | Downstream re-review after the rebase recorded |
| R-5 to R-7 | Unchanged, still recorded for implementation |

## SR-007 Tolerant Tree Reading — No Migration

**Status:** authoritative. It supersedes:

- "Persisted Data / State Transition Decision" → Migration Plan;
- the migration parts of "SR-005 Migration Checklist And Basis Refresh" (dispositions, commit/retry, cost, evidence a–e);
- the new-migration ordering in "SR-006 Resolution".

Everything else in SR-003 to SR-006 stands: the lifecycle, wake, lease, liveness, precheck, result shape, removals, the router, the UI and the rebase.

**Basis:** DEC-008, REQ-018, AC-018, AC-020 and AC-021 (user-approved 2026-09-29). Evidence: ARCH-16 to ARCH-19, and the released-migration imports re-checked at `f2924a2b0`.

### Persisted-data decision

- **Decision: `Directly Usable — No Migration`.** Old Team and Org trees are read as they are.
- **Rationale:** the change is compatible under tolerant reading.
  - An obsolete field (`settledAt`) is ignored.
  - A new field (`delegatorAgentRunId`) is optional, and its absence has a truthful meaning: the starter isn't recorded.
  - No field name changes meaning.
- **Not a compatibility branch:** the reader has no old-shape logic and no version switch. It projects the known current fields and ignores the rest, which the guideline and design principles explicitly allow.
- **Old files:** task-records files stay unread and untouched. Trees are not rewritten at startup. An old tree loses `settledAt` and `schemaVersion` only when the runtime next saves it for its own reasons, for example a platform-binding change or a new delegation.

### Target format and validation policy (REQ-018)

| Element | Read | Write |
| --- | --- | --- |
| Tree top level (Team / Org) | Require the known required fields (Team: `createdAt`, `archivedAt`, `applicationBinding`, `handoffs`, `rootTeam`; Org: the same plus `subjectKind: "agent_org"`, `rootOrg`). Ignore `schemaVersion` and any unknown key | Exact current fields; **no `schemaVersion`** |
| `TaskAgentExecution` | Require `address`, `agentRunId`, `platformAgentRunId`, `startedAt`. Optional `delegatorAgentRunId`. Ignore `settledAt` and unknown keys | Always write `delegatorAgentRunId`; never `settledAt` |
| `TaskTeamExecution` | Same, plus `teamRunId`, `members`, `taskExecutions` | Same |
| Configured nodes, members, launch configuration | Unchanged requirements; unknown keys ignored | Exact current fields |
| Invariants | Unchanged: unique run IDs, canonical addresses, unique coordinator, handoff endpoints. **Added:** if `delegatorAgentRunId` is present, it must resolve to an AgentRun in the same tree; otherwise reject | — |

- **Implementation:** in `run-execution-tree-shared-record-schemas.ts`, `team-run-execution-tree-schema.ts` and the Org tree schema, replace `assertExactKeys` with a required-keys check plus a **projection that returns only known fields**. Unknown fields therefore never reach memory or later writes.
- **Types:**
  - `TeamRunExecutionTreeFileV2` becomes `TeamRunExecutionTreeFile`, and `AgentOrgRunExecutionTreeFileV1` becomes `AgentOrgRunExecutionTreeFile`. Both drop the `schemaVersion` literal.
  - `TaskAgentExecution` / `TaskTeamExecution` gain `delegatorAgentRunId?: string` and lose `settledAt`.
  - Type names drop version suffixes.
- **Writer check:** a unit test serializes each tree type and asserts its exact key set (AC-021).
- **Admission and loaders:** they use the tolerant validators, with no records (R-2 rule unchanged). A tree missing a required field or breaking an invariant is still not admitted (AC-020).
- **Naming rule:** a field name is never reused with a different meaning. This is written into the design and the project guideline.

### Released migrations after this revision

Released migrations must keep their released behavior. Where they use the current strict validators **as classifiers** (pass = "already current", fail = "old shape") or for output validation, a tolerant current validator would change that behavior. They are repointed to **frozen strict copies**. They are also repointed wherever they use the records code this ticket deletes.

| Released migration | Current code it uses that changes | Disposition |
| --- | --- | --- |
| `20260814_team_run_execution_tree_v1` + helpers (`predecessor-task-package-converter.ts`, `team-run-v1-package-promoter.ts`, `team-run-state-package-v1-validator.ts`, `team-execution-v1-index.ts`), `team-run-migration-state-classifier.ts` | Records v1 types, schemas, store and paths; `TaskExecutionReference` | Repoint to the frozen records v1 module |
| `20260824_team_run_execution_tree_v2` | Current Team validator used for "already current" detection and output validation | Repoint to the frozen **strict** Team tree v2 validator |
| `20260819_token_usage_run_records_v1` + `token-usage-task-team-run-index.ts` | Records v1 via the TreeV1 converter | Covered by the TreeV1 repoint |
| `20260901_agent_org_flat_team_families_v1` + `agent-org-history-candidate-plan.ts` (strict validator used as the flat-versus-nested **classifier**, line 86), `agent-org-token-attribution-transition.ts`, `agent-org-context-file-locator-transition.ts`, `agent-org-history-index-transition.ts` | Current Team/Org validators (classifier and output validation); records v1 schemas and paths; `validateAgentOrgStatePackage` with records | Repoint to the frozen strict Team tree v2 and Org tree v1 validators, records v1 and the Org state-package v1 validator. **`AgentOrgExecutionIndex` stays current**: these migrations use only `listAgents`, `getTeam`, `requireAgent` and `getPhysicalScopeForAgent`, which are unchanged. If implementation changes any of them, freeze the index too |
| `20260926_team_context_file_execution_locators_v1` | Current admission scan (tolerant trees, no records) | No change. It admits the same packages plus trees without a records file. Its locator conversion is unchanged |
| `20260905_agent_org_history_first_message_summary_v1` | `validateAgentOrgStatePackage` with records; the Org records store and type (evidence reader) | Adapt (~10 lines): current package validation without records, and read the Org records file through the frozen records v1 module. Its tree read through the current tolerant store is fine |
| All other migrations | None | Not affected |

- **Frozen module:** `src/app-data-migrations/legacy/released-run-package-shapes/`, verbatim at `f2924a2b0`:
  - strict Team tree v2 validator, strict Org tree v1 validator, and the v2-era shared record schemas (~450 lines);
  - Team and Org task-records v1 types, schemas, stores and paths (~330 lines);
  - the Org state-package v1 validator (~70 lines).
- **Honest size:** about 850 lines copied without behavior change, about 15 import repoints and one ~10-line adaptation. The runtime must not import this module.
- **Why this cost remains without a migration:** this ticket deletes the records runtime code and loosens validators that released migrations use as classifiers. Those migrations still run on skip-version installs. **Guideline rule applied:** released migrations never depend on current readers for classification.

### Removed from the design (SR-003 to SR-006 migration work)

- The new migration `20261001_task_execution_delegator_tree`, its folder `task-execution-delegator-tree-v1/`, its registry entry and its prerequisites.
- Team tree v3 / Org tree v2 version bumps and the transform tests.
- **Implementation instruction:** remove the in-progress migration (currently registered after `AgentOrgFlatTeamFamiliesV1` in the pre-rebase worktree) and its tests.

### Evidence obligations (replace SR-005 item 8 (a)–(e) and (g))

1. **Unit:**
   - tolerant reading (AC-020): unknown field, `settledAt`, with and without `schemaVersion`, missing required field rejected, unresolvable delegator rejected;
   - exact writing (AC-021).
   - **Structural recognition without a version:** a preserved released **V1** Team tree is still rejected by the tolerant current validator, because V1 launch configurations use `runtimeKind` `"AUTOBYTEUS"`, `"CLAUDE"` or `"CODEX"`, which fail the current `RuntimeKind` enum check (`run-execution-tree-shared-record-schemas.ts`), and every member carries one. A preserved V1 root therefore stays non-admitted, exactly as today.
2. **Released-migration regression:** run the repointed `20260824` and `20260901` (including the candidate-plan classifier) on released source fixtures. Outputs and dispositions must match the pre-change behavior; a nested source must still classify as nested.
3. **Skip-version chain:** a fixture ledger before `20260901` runs all pending migrations through both startup entrypoints. `20260901`, `20260926` and `20260905` outputs must match expected released results. Repeat startup runs nothing.
4. **Installed-data copy** (stopped writer, `~/.autobyteus/server-data` copy): startup admits the same roots as before (8 tree-less roots still excluded); **no tree or records file changes at startup** (hashes); old children show no starter; a new delegation writes a version-less tree with `delegatorAgentRunId`; wake and shutdown work on a new child.
5. Unchanged per-runtime obligations: AC-006 and AC-007.

### Classification

- **Unchanged:** `task_size = Large`, `architectural_risk = High`.
- **Persistence risk is lower:** no data transformation.
- **Still high:** the contract changes (tool result, stream DTOs, API removal), the lifecycle and concurrency work, the root security boundary, the ownership replacement, and a cross-cutting change to tree validation policy that released migrations depend on.

### Project practice (user direction, DEC-008)

The rule, "read persisted formats tolerantly, write exactly; no schema version fields; never reuse a field name with a different meaning; released migrations use frozen strict classifiers", is being written into the canonical guideline in a separate docs change (worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/data-migration-guideline-refresh`). Other persisted files adopt it gradually, when their formats change. By user decision on 2026-09-29 there is no separate follow-up ticket.

**Delivery instruction (docs sync):**
- Bring the guideline change from worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/data-migration-guideline-refresh` (branch `codex/data-migration-guideline-refresh`, file `autobyteus-server-ts/docs/design/data_migration_guideline.md`, based on `origin/personal@f2924a2b0`) into this ticket's branch.
- Reconcile it with any newer upstream version of that file.
- Include it in this ticket's finalization. The user wants it committed with this ticket.
- The docs worktree and branch can then be removed as part of delivery cleanup.
