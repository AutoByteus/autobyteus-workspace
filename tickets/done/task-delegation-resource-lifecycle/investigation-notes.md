# Investigation Notes

## Investigation Meta

- Package identifier: `task-delegation-resource-lifecycle`
- Request / ticket: Simplify task delegation — remove `submit_task_result`, `review_task_result` and the task status machine; manage delegated task executions as resources (quiet → dormant after grace period; `send_message_to` wakes).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle` / `codex/task-delegation-resource-lifecycle`
- Resolved base remote / branch / revision: `origin` / `personal` (tracked `origin/HEAD`) / `8bffda04575eaa7198fae186856699011ad5c04b` (fetched 2026-09-27)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Worktree and branch created from refreshed `origin/personal`; ticket folder `tickets/in-progress/task-delegation-resource-lifecycle/`.
- Bootstrap blocker: None.
- Current solution revision ID: `SR-003`
- Investigation status: Requirements and architecture investigation complete (SR-003).

## Initial Request And Clarifications

- Original request: The user believes delegation is over-complicated. Observed runtime pattern: the task (child) agent receives the delegator's AgentRun ID, reports back with `send_message_to`, and the parent rarely calls `review_task_result`. The user proposed first that `submit_task_result` should finish the task directly and remove review.
- Clarifications received (chronological, same conversation, 2026-09-27):
  1. User agreed that submit should finish the task and review should be removed.
  2. User asked how a parent contacts a child → answered: `send_message_to` with `target_agent_run_id` (live-only).
  3. User: sending to a shut-down child should wake it, as team/org members are woken/started by messages; run IDs are globally unique.
  4. User: a follow-up to a "completed" child makes the child work again and likely call submit again — questioned whether task status/submit is needed at all; asked what is most natural protocol-wise.
  5. Solution Designer presented Models A (pure messaging), B (auto-reopen), C (A2A immutable tasks); recommended A.
  6. User chose **Model A**: remove both tools and the task status; lifecycle is *resource management, not task management*; shut down after a **grace period (example 5 or 10 minutes)**, not immediately; `send_message_to` wakes; delegate_task is like a sub-agent spawn that returns the task agent, after which communication is always `send_message_to`.
- User-supplied facts and constraints: Observed LLM behavior — children use `send_message_to` to report; parents seldom review. Grace-period example values 5–10 minutes.
- Initial ambiguity (resolved): whether a task "completed" status survives follow-ups → resolved by removing task status.

## Product And Domain Understanding

- Product area: Agent Team / Agent Org collaboration runtime (server `autobyteus-server-ts`) and its workspace UI (`autobyteus-web`).
- Affected actors or systems: delegating agents (parents), task agents / task teams (children), root Team/Org runs, human operators viewing runs, run history, Codex/Claude/AutoByteus runtime backends.
- Existing purpose: `delegate_task` spawns a fresh, independently tracked execution of a mounted Agent/AgentTeam definition to own a bounded unit of work.
- Terminology: *task execution* = spawned task Agent or task Team; *settle* = current term for tearing down a task execution; *quiet/quiescent* = no running work, no in-flight input; *dormant* = shut down but addressable and restorable.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-27 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-contract.ts`, `task-delegation-tool-manifest.ts` | Tool surface | Three tools: `delegate_task`, `submit_task_result`, `review_task_result`; submit → `awaiting_review` and notifies reviewer; review accept → settlement, request_revision → `active` | Remove submit/review |
| 2026-09-27 | Code | `src/agent-collaboration/execution/task/root-task-lifecycle-engine.ts` | Lifecycle semantics | Status machine `active → awaiting_review → accepted \| active`, `interrupted`; `hasOpenWork()` counts any non-accepted/non-interrupted; settlement only for accepted/interrupted, deepest-first, blocked by open child tasks; submit already sends delegator `Task <id> result submitted:\n<message>` | Core of change |
| 2026-09-27 | Code | `src/agent-collaboration/execution/task/task-lifecycle-command.ts`, `task-delegation-record-v1.ts` | Data shapes | `DelegateTaskResult` = `{task_id, status: active, target_agent_run_id}` or `not_started`; record has `status`, `updates` (submission/review/interruption) | Data continuity |
| 2026-09-27 | Code | `src/agent-collaboration/execution/task/root-task-lifecycle-input.ts` (`buildTaskAssigneeWorkPacket`) | How child learns parent | Work packet includes `Task delegator address` and `Task delegator AgentRun ID` | Enables child `send_message_to` parent |
| 2026-09-27 | Code | `src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | LLM contract | `target_agent_run_id` documented as *live-only: inactive, preallocated, recoverable, lazy-startable, or unknown run IDs are rejected*; Task Lifecycle section instructs submit/review | Contract text must change |
| 2026-09-27 | Code | `src/agent-communication/services/send-message-to-dispatcher.ts`, `global-agent-run-message-router.ts` | Run-ID delivery | Router requires `agentRunManager.getActiveRun(id)` else `TARGET_AGENT_RUN_NOT_ACTIVE`; same-root delivery goes through root `deliverExactAgentMessage` | Wake needs new path |
| 2026-09-27 | Code | `src/agent-team-execution/domain/root-team-run.ts:320`, `src/agent-org-execution/domain/agent-org-run.ts:195` | Root exact delivery | Both reject unless `index.isLiveAgent(runId)` | Second live-only gate |
| 2026-09-27 | Code | `src/agent-team-execution/local/registries/task-agent-execution-registry.ts` | Task agent materialization/teardown | Task agents always `activationMode: "fresh"`; `prepareSettlement` uses `tryPrepareTerminationIfQuiescent`; settled agents removed from `active` | No restore path for task agents |
| 2026-09-27 | Code | `src/agent-team-execution/local/registries/configured-agent-execution-registry.ts`, `src/agent-org-execution/services/*` | Restore precedent | Configured members support `activationMode: "fresh" \| "restore"` | Reusable restore mechanism |
| 2026-09-27 | Code | `src/agent-collaboration/execution/task/root-task-reopen-repair.ts` | Reopen behavior | On root reopen every task execution is marked settled; `active`/`awaiting_review` tasks become `interrupted` with reason "live task recovery is not supported after … reopen" | Behavior to replace |
| 2026-09-27 | Code | `src/agent-team-execution/domain/team-run-execution-tree.ts` | Persisted execution tree | `TaskAgentExecution {address, agentRunId, platformAgentRunId, startedAt, settledAt}`; `TaskTeamExecution` with members and nested `taskExecutions` | Restore identity is persisted |
| 2026-09-27 | Code | `src/agent-team-execution/task-delegation/team-task-lifecycle-adapter.ts`, `src/agent-org-execution/services/agent-org-task-lifecycle-adapter.ts` | Settlement | Settlement commits `settledAt` in tree then `finishLocalTeardown` | Reuse for dormancy |
| 2026-09-27 | Code | `src/agent-team-execution/task-delegation/task-delegation-service.ts`, `agent-org-run.ts:264` | Idle trigger | Agent `idle`/`offline` status events trigger settlement sweep | Hook for quiet detection |
| 2026-09-27 | Code | `src/agent-team-execution/domain/root-team-run.ts:146`, `agent-org-run.ts:142` | Root open work | `hasOpenExecutionWork = taskDelegation.hasOpenWork() \|\| rootRun.hasOpenExecutionWork()` | Awaiting-review tasks keep root "open" |
| 2026-09-27 | Code | `src/agent-execution/backends/autobyteus/events/autobyteus-status-projector.ts` | Idle semantics | `awaiting_tool_approval` maps to running, not idle (AutoByteus) | Approval-pending agents not quiet; Codex/Claude to verify |
| 2026-09-27 | Code | `src/agent-team-execution/domain/team-agent-status.ts` | Team status | Status is per-agent (`offline/initializing/idle/running/error`); no team-level aggregate quiet status | Team quiescence is new |
| 2026-09-27 | Code | `src/api/graphql/types/task-delegation.ts`, `src/api/rest/task-delegation.ts` | External API | GraphQL `TaskDelegationRecordObject {status, updates[submission/review/interruption]…}`; REST reference-file content by `taskId`/`referenceId` | API/data continuity |
| 2026-09-27 | Code | `src/agent-tools/mcp/providers/task-delegation-tools-mcp-adapter-provider.ts` | Codex/Claude exposure | Task tools exposed to external runtimes via MCP adapter | Removal spans runtimes |
| 2026-09-27 | Code | `src/agent-org-execution/persistence/agent-org-task-delegation-records-v1-*`, `src/agent-team-execution/task-delegation/records/task-delegation-records-v1-store.ts`, `src/run-history/services/team-run-state-package-*` | Persistence | Task records persisted per Team and Org root; validated on load | Data continuity |
| 2026-09-27 | Code | `autobyteus-web/services/teamExecution/taskDelegationPresentation.ts`, `components/workspace/team/TeamDelegatedTask*.vue`, `components/workspace/collaboration/CollaborationDelegatedTasksSection.vue`, `localization/messages/*/workspace.ts` | UI | Delegated-tasks section shows status (`in_progress/awaiting_review/revision_requested/accepted/interrupted`) and a timeline (assigned, result submitted, revision requested, accepted, interrupted); separate "Active task agents" activity bar; participant links navigate to task agent | UI requirements |
| 2026-09-27 | Web | [A2A Life of a Task](https://a2a-protocol.org/latest/topics/life-of-a-task/), [A2A Discussion #723](https://github.com/a2aproject/A2A/discussions/723) | Protocol precedent | A2A terminal tasks are immutable; follow-ups create a new task in the same context | Supports rejecting auto-reopen (Model B) |
| 2026-09-27 | Other | Microsoft Orleans "virtual actor" model (general knowledge) | Resource precedent | Actors always addressable; activated on message, deactivated when idle | Supports Model A lifecycle |
| 2026-09-27 | User | Conversation clarifications 1–6 above | Intent | Model A chosen; grace period 5–10 min | Requirements basis |
| 2026-09-29 | Code | `autobyteus-web/components/workspace/collaboration/CollaborationOverviewPanel.vue`, `types/workspace/collaborationMessagesContextView.ts`, `types/workspace/collaborationTaskPresentation.ts` | UI split | Collaboration panel = Messages section (all `send_message_to` sent/received by focused agent, counterpart may be a task identity) + Delegated Tasks section (status + assignment/submission/review/interruption timeline) | Remove Delegated Tasks section (SR-002) |
| 2026-09-29 | Code | `autobyteus-web/components/workspace/team/TeamMembersPanel.vue`, `services/teamExecution/teamExecutionViewModels.ts` | Children in tree | Members tree already includes `task_agent`/`task_team`/`task_team_member` rows with `taskStatusLabel` (lifecycle + execution); configured members use `AgentStatusDisplay` | Reuse tree; replace task label with standard status + shut-down |
| 2026-09-29 | Code | `autobyteus-server-ts/src/agent-collaboration/execution/events/task-system-input-presentation.ts`; `autobyteus-web/services/agentStreaming/handlers/systemTaskNotificationHandler.ts` | Where task content lives | Task packet, "result submitted" and "revision requested" are delivered as SYSTEM inputs with task-notification metadata into agent conversations; web has a dedicated handler | Task records duplicate conversation content → deletion loses only content-free accepts; old notifications must keep rendering |
| 2026-09-29 | Command | `grep -rl delegate_task --include=*.md` (worktree, excl. tickets/) | Rename impact | 24 docs reference `delegate_task`; user-authored team instructions also do | Supports keeping the name (DEC-005) |
| 2026-09-29 | User | Conversation 2026-09-29 | Intent | Delete task messages/records/UI; keep `delegate_task` name and inputs; clean UI | SR-002 |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Agent calls `delegate_task` | Spawn fresh task Agent/Team; deliver packet incl. delegator run ID; record `active` | Returns `task_id`, `status`, `target_agent_run_id` | lifecycle engine, work packet | High |
| BEH-002 | Contract | Child calls `submit_task_result` | `active → awaiting_review`; system message to delegator | Child stays running; task open | engine `submitAtHead` | High |
| BEH-003 | Contract | Parent calls `review_task_result` | accept → `accepted` → settlement; request_revision → `active` + notify child | Only path (besides interrupt/root stop) to tear child down | engine `reviewAtHead` | High |
| BEH-004 | System | Child/parent go idle | Settlement sweep only settles `accepted`/`interrupted` tasks, deepest first, blocked while child has open child tasks | Un-reviewed children never torn down; blocks ancestors' settlement; root `hasOpenExecutionWork` stays true | engine, adapters, root runs | High |
| BEH-005 | Contract | `send_message_to` with `target_agent_run_id` | Global router + root exact delivery require live run | Settled child → `TARGET_AGENT_RUN_NOT_ACTIVE` | router, root runs, LLM contract | High |
| BEH-006 | Operational | Root Team/Org reopened | All task executions marked settled; open tasks → `interrupted` | Children not recoverable | reopen repair | High |
| BEH-007 | Operational | User stops/terminates root | `shutdownAndSettle` interrupts open tasks and settles all | Children torn down | engine | High |
| BEH-008 | User | Operator views run | Delegated-tasks section with status + timeline; activity bar; navigation to child conversation | Status reflects lifecycle | web components | High |
| BEH-009 | Contract | Run history / GraphQL / REST | Task records with status + updates; reference file content by task/reference ID | Persisted per root | API, stores | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `root-task-lifecycle-engine.ts` | Task status machine, FIFO queue, settlement policy | Status machine removed; settlement policy re-based on quiescence + grace | What remains of the engine (delegation + dormancy) |
| Task-agent / task-team registries | Fresh activation, quiescent termination | Need restore-mode activation for dormant task executions | Reuse configured-member restore; Codex/Claude `platformAgentRunId` resume |
| Global router + root exact delivery | Live-only | Same-root dormant target must be restored then delivered | Race: message arriving during teardown must not be lost |
| Reopen repair | Settles all task executions | Reopened children should be dormant + wakeable | Replace interrupted/repair semantics |
| `hasOpenExecutionWork` | Includes task records | Must reflect only running work | Consumers of checkpoint (UI/app) to verify |
| Status projectors | AutoByteus approval = running | Approval-pending not quiet | Verify Codex/Claude approval mapping |
| LLM contract | Live-only text; task lifecycle section | Update text | — |
| GraphQL / REST / web UI | Status + updates | Present delegation + activity; historic updates readable | API shape decision in design |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Persisted Team task records (`TaskDelegationRecordsV1Store`) and Org records (`agent-org-task-delegation-records-v1-*`); execution tree `settledAt` fields; run-state package validators; data-migration converters for predecessors.
- Readers: run-history loaders/validators, GraphQL resolver, REST reference-file route, web hydration services.

### Structural Surfaces

- Tool registration (native + MCP adapter for Codex/Claude), LLM contract text, lifecycle engine/adapters (Team + Org), task registries, global message router, root exact delivery, reopen repair, root open-work checkpoint, web presentation.
- Existing structures that can support the behavior: configured-member restore activation; quiescent termination (`tryPrepareTerminationIfQuiescent`); idle status events; persisted execution tree with run IDs and platform run IDs.

### Potential Structural Impacts To Investigate

- API or external-contract change: Yes — tool list, LLM contract, GraphQL task fields, `DelegateTaskResult` shape.
- Persistence schema or invariant change: Likely — record status/updates semantics; `settledAt` meaning (dormant vs terminal).
- Security or privacy boundary change: Yes — run-ID wake must stay within root boundary.
- Concurrency or lifecycle change: Yes — grace timers, wake vs teardown races, team quiescence.
- Deployment/migration/ownership: Existing persisted records must stay readable.
- Confirmed absent/present/unknown: Team-level quiescence absent; restore mode present for configured members only.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Code reading (no runtime probe) | Parent never reviews | By construction, task remains open and child never settled | Confirms leak motivating REQ-004/005 | engine `hasOpenWork`, `settleAtHead` |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (product owner) | Children report via `send_message_to`; parents don't review | User observation of runtime | Remove submit/review/status | — |
| User | Messages should wake shut-down children | Explicit direction | Wake-on-message | Scope of wake (DEC-002) |
| User | Grace period, e.g. 5 or 10 minutes | Explicit direction | Dormancy after grace | Default/configurability (DEC-001) |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| A2A protocol | latest docs | Immutable terminal tasks; follow-ups are new tasks | Web sources above | Informative only; not adopted |
| Codex / Claude runtimes | current backends | Restore requires resuming provider session via `platformAgentRunId` | configured-member restore | Verify task-execution restore per runtime |

## Persisted Data And State Facts

- Affected stored subject: Team and Org task delegation records; execution-tree task executions (`settledAt`).
- Location/shape: per-root run-state package files (Team) and Org records store; see Source Log.
- Approximate volume: one record per delegation per root run; unknown aggregate.
- Current readers/writers: lifecycle engine, reopen repair, loaders/validators, GraphQL, REST, migrations.
- Unknown/extra-field behavior: strict validators (`validateTaskDelegationRecordArrayV1`) — to verify tolerance.
- Must preserve: existing delegation history (who delegated what to whom, descriptions, reference files, submitted results and reviews as history) and child conversation history.
- Acceptable loss: old lifecycle statuses need not remain semantically active; old `awaiting_review`/`active` states need not be resumable as tasks.
- Remaining evidence gap: whether pre-change settled children retain enough saved state to be restored (architecture).

## Product Design Request Context

- Product Design request in the current input: `Not stated`.
- UI impact is limited to replacing task status/timeline presentation with delegation + activity presentation.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| None | — | — | — | — | — | N/A |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Codex/Claude status mapping while awaiting tool approval | Must not treat approval-pending as quiet | Architecture | Resolved (ARCH-08): runtime-neutral AgentRun quiescence requires no active turn; approval waits occur inside a turn. Verify per runtime in AC-006 |
| UNK-002 | Unknown | Task-execution restore feasibility per runtime (AutoByteus memory, Codex/Claude session resume) | Wake requirement | Architecture | Resolved (ARCH-06/07): reuse restore planner; task-team node rebuild needed |
| UNK-003 | Unknown | Whether operators can post messages directly to task agents in the UI today | Whether UI input must also wake | Architecture | Resolved (ARCH-10): yes for live children; preserved → operator post wakes |
| RISK-001 | Risk | Silent child (never messages parent) leaves parent waiting | Same risk exists today | Out of scope unless DEC-003 changes | Accepted |
| RISK-002 | Risk | Message arriving while child is being shut down | Message loss | REQ-006 / AC-006 | Mitigated by requirement |

## Architecture Investigation Findings

Performed 2026-09-29 after SR-002 approval (worktree base `8bffda045`).

| ID | Source | Observation | Design implication |
| --- | --- | --- | --- |
| ARCH-01 | `agent-team-execution/services/team-execution-index.ts` (`visitTaskExecution`, `isLiveAgent`) | Task executions are nested under the **host team** (`ownerTeamRunId`), not under the delegator; liveness = no `settledAt` on the execution or any ancestor task team | Delegator link exists only in task records; liveness must become runtime state once `settledAt` goes |
| ARCH-02 | `agent-team-execution/task-delegation/team-task-lifecycle-adapter.ts` (`prepareActivation`, `commitActivation`) + `team-run-persistence-coordinator.ts` (`commitTaskMutationLocked`) | Activation writes tree then task-records file (orphan tree entry possible when second write fails); settlement writes tree `settledAt` then `finishLocalTeardown` | Activation becomes a single tree write; shutdown needs no persistence |
| ARCH-03 | `run-history/domain/run-execution-tree-shared-records.ts`, `run-history/store/run-execution-tree-shared-record-schemas.ts` (`validateTaskExecution`, exact keys incl. `settledAt`) | Team tree (schema 2) and Org tree (schema 1) share the strict `TaskExecution` record | Adding `delegatorAgentRunId`/removing `settledAt` bumps Team tree → 3 and Org tree → 2 |
| ARCH-04 | `run-history/services/team-run-state-package-loader.ts`, `team-run-state-package-validator.ts`, `root-run-package-current-validator.ts`, `agent-org-execution/services/agent-org-state-package-*` | Load/admission require the task-records file and cross-validate records ↔ tree; loader repairs on reopen (open tasks → interrupted, unreferenced task executions dropped, all executions settled) | Admission/loader become tree + messages only; repair removed |
| ARCH-05 | `docs/design/data_migration_guideline.md`; `app-data-migrations/migrations/team-run-execution-tree-v2-app-data-migration.ts`; `app-data-migration-registry.ts`; `run-history/services/root-run-package-readiness-index.ts` | Canonical guideline: forward-only runtime, migration-owned legacy reading, preserved exclusions, bounded dispositions, current-only admission. Tree v2 migration imports the *current* tree validator | Delegator copy requires a migration; released v2/v1 validators must be frozen into migration-owned files before the current validator changes |
| ARCH-06 | `agent-collaboration/execution/backends/configured-agent-activation-planner.ts`, `configured-agent-execution-handle.ts` | Handle is "root-neutral owner of one configured or task AgentRun"; lazy `ensureReady`; planner `restore` mode restores native memory or external provider session via `platformAgentRunId`, and behaves as `new` when no conversation exists | Wake = create handle in `restore` mode from the persisted tree node (ASM-001/UNK-002 resolved) |
| ARCH-07 | `agent-team-execution/local/registries/task-agent-execution-registry.ts`, `task-team-execution-registry.ts`, `local/task-team-execution-factory.ts` | Task agents/teams are created only `fresh`; factory `materialize` already takes `configuredMemberActivationMode` | Add restore entry points; task-team node must be rebuilt from persisted IDs |
| ARCH-08 | `agent-team-execution/local/flat-team-execution-manager.ts` (`tryPrepareTerminationIfQuiescent`), `agent-execution/domain/agent-run.ts` (`tryPrepareTerminationIfQuiescent`) | Team-level quiescent termination exists (nested task agents/teams, configured members); AgentRun quiescence = no active turn, no queued input, no pending command | Reuse for REQ-004; approval-pending is inside an active turn → never quiet on any runtime (UNK-001 resolved; verify per runtime in tests) |
| ARCH-09 | `agent-communication/services/global-agent-run-message-router.ts`; `agent-collaboration/execution/services/active-collaboration-root-directory.ts`; `root-team-run.ts:320`; `agent-org-run.ts:195` | Router needs a live `AgentRun` to find the target's root; roots reject non-live targets | Route by the **sender's** root when it contains the target (enforces REQ-008); root wakes before delivery |
| ARCH-10 | `root-team-run.ts` (`requireTeamRun`, `executeAgentCommand`), web `teamExecutionViewState.ts` (`isRetainedAgent` → read_only), `agentOrgContextsStore.ts` (`accessFor`) | Operators can message live task agents; settled ones are read-only. Because un-reviewed children never settle today, operators can effectively always message children | Preserved behavior: operator post to a shut-down child wakes it (no scope change) |
| ARCH-11 | `agent-team-execution/domain/team-run-event.ts`; `services/agent-streaming/team-execution-view-projector.ts`, `agent-org-execution-view-projector.ts`; `autobyteus-team-stream-contracts/src/*`; `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts` | Snapshot carries `tasks`/`task_records`; `TASK_DELEGATION_EVENT` carries execution + task DTO; tree DTOs carry `settled_at` | Contract packages change: remove task DTOs; add child-started event; tree DTO gains `delegator_agent_run_id`, loses `settled_at` |
| ARCH-12 | `api/graphql/types/task-delegation.ts`, `api/rest/task-delegation.ts`, `application-platform/execution/application-execution-scope-kernel-builder.ts` | GraphQL task query, REST task reference route, app-scope kernel builds task store | Delete; no SDK/app consumer found (`grep` over SDK/contracts/applications/autobyteus-ts: none) — ASM-003 resolved |
| ARCH-13 | `config/streaming-content-flush-interval-setting.ts`, `services/server-settings-service.ts` (`registerPredefinedSetting`) | Established numeric setting pattern with parse/normalize/default | Grace period setting follows it |
| ARCH-14 | `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | Contains Task Lifecycle section and live-only wording | Rewrite text |
| ARCH-16 | Installed data, read-only (user-authorized 2026-09-29): `~/.autobyteus/server-data/memory/agent_teams`, `agent_orgs`; inventory script over `team_run_execution_tree.json`, `task_delegation_records.json`, `agent_org_run_execution_tree.json`, `agent_org_task_delegation_records.json` | **Team:** 565 roots, 557 tree v2 each with records v1, 8 nonempty roots without a tree. Only 2 roots have task executions (2 agents, both `settledAt` set, status `interrupted`). **Org:** 29 roots, all tree v1 + records v1; 7 roots have task executions (16 total: 15 task teams, 1 agent; max depth 1; all settled; 15 `accepted`, 1 `interrupted`). No orphan executions, no records without executions, every delegator resolves in its tree | The transform is tiny. Records matter only for the 9 roots with task executions. The 8 tree-less roots are a real released state that must stay preserved |
| ARCH-17 | Migration ledger, read-only: `sqlite3 -readonly ~/.autobyteus/server-data/db/production.db "select migration_id,status,summary from app_data_migration_records"` | `20260824_team_run_execution_tree_v2` SUCCEEDED (migrated 514, skipped 8); `20260901_agent_org_flat_team_families_v1` SUCCEEDED_WITH_WARNINGS (failed 8); `20260926_team_context_file_execution_locators_v1` is the latest applied migration | Predecessors preserved the 8 tree-less roots. The new migration registers after the latest entry |
| ARCH-18 | `context-files/services/context-file-record-locators.ts` (`listContextFileRecordSources`); used only by released migrations `team-context-file-execution-locators-v1` and `agent-org-flat-team-families-v1` | Scans `(agent_org_)?task_delegation_records.json` for attachment locators | Cross-feature reference. Records files stay untouched, so these released migrations keep working. Old task reference attachments stay on disk but are no longer shown (task UI removed, DEC-006); the child's first message still lists their paths |
| ARCH-19 | `git diff 8bffda045 origin/personal@f2924a2b0` (75 server files changed; commit `bb91a881e` and later) | `ConfiguredAgentExecutionHandle` now re-activates in `restore` mode after its run died (`activationMode` flips to `restore` after first publication; stale-run detection). `root-run-package-readiness-index.ts` no longer validates context-file references at startup. The migration registry changed. The guideline was rewritten | The design basis must move to the latest base. Wake simplifies: within a session keep the handle and terminate only its AgentRun. The ticket worktree must be rebased before further implementation |
| ARCH-15 | web inventory (`grep` task concepts, 40 non-test files) incl. `CollaborationOverviewPanel.vue`, `TeamDelegatedTask*.vue`, `TeamMembersPanel.vue`, `utils/agentOrgHistoryRows.ts` (hides settled tasks) | UI removal and tree DTO changes | See design file mapping |

## Requirement Implications

- Removing review eliminates the only normal teardown trigger, so a new resource-lifecycle trigger (quiet + grace) is required, and wake-on-message is required for follow-ups to remain possible.
- Removing status removes `awaiting_review` from root open-work computation.
- UI and APIs currently depend on status/updates; continuity for historic data is required.

## Notes For Architecture Design

- Map SCN-001…SCN-010 in the requirements doc.
- Reuse configured-member restore; define team quiescence; define grace timer ownership; handle wake/teardown race; keep root-boundary check for wake.
