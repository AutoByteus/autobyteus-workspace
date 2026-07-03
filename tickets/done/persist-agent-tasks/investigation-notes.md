# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Deep investigation complete against latest `origin/personal`; requirements approved by user for design on 2026-07-01; design spec revised after architecture review round 1 design-impact findings DR-001 and DR-002.
- Investigation Goal: Analyze how backend delegated agent tasks, team tasks, result submissions, and reviews are currently stored/surfaced; compare that with persisted inter-agent/team communication messages; define requirements for durable task visibility after transient runtimes disappear or the app restarts.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: The requested behavior crosses backend task lifecycle, durable team-run storage/read models, GraphQL/read APIs, frontend run hydration, Team-tab task display, and task reference content. It does not require changing the model-facing task protocol or implementing task runtime resumption.
- Scope Summary: Add durable visibility for delegated task records analogous to persisted team communication messages while keeping task-agent/task-team task run transient and active-runtime-gated.
- Primary Questions To Resolve:
  - Where are `delegate_task`, `submit_task_result`, and `review_task_result` implemented? Resolved.
  - What in-memory task model exists today, and who owns lifecycle/state transitions? Resolved.
  - How do task-agent/task-team services disappear today? Resolved.
  - How are inter-agent/team messages persisted and exposed to frontend/history today on latest `origin/personal`? Resolved.
  - Is there an existing durable task-delegation projection/read API? Resolved: no backend durable store/read API found; only frontend live projection helpers use "projection" naming.
  - Which backend storage/subsystem should own durable task records? Candidate identified: task-delegation-owned records/read model under the existing task-delegation capability area, using Team Communication persistence as a local pattern.
  - What identity/data shape links a task to run, target, delegator/review owner, execution, submission, and review? Resolved from `TaskDelegationRecord`, `TaskExecutionInstance`, and task target identity types.
  - What APIs/events/history projections need to expose persisted task records? Resolved at requirements level: backend task read API, frontend hydration/store/Task-tab consumption, and task reference content fallback.

## Request Context

User asked to analyze backend support for persisting delegated agent/task-agent/team tasks. They observed the system supports task delegation, review, and result submission, while inter-agent messages are already persisted and frontend-visible after restart. They want task records persisted similarly so transient agent/team runtime teardown does not erase task visibility, and so the UI can show tasks after shutdown/restart.

Terminology note from latest code: current model-facing tools are `delegate_task`, `submit_task_result`, and `review_task_result`; review is represented by `review_task_result`, not a separate active `delegate_review_task` tool name.

Latest user instruction for this pass: base the ticket worktree on latest `origin/personal` and redo the investigation. The ticket worktree was reset to `origin/personal` commit `57185192d4b93840dab1fb7134604b1716a600a8` before this re-investigation.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/done/persist-agent-tasks`
- Current Branch: `codex/persist-agent-tasks`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal --prune` succeeded on 2026-07-01. Latest `origin/personal` is `57185192d4b93840dab1fb7134604b1716a600a8` (`docs(delivery): record v1.3.91 release finalization`). The ticket branch was reset with `git reset --hard origin/personal`; current `HEAD` equals `origin/personal`.
- Task Branch: `codex/persist-agent-tasks`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Work must continue in the dedicated task worktree, not the shared checkout at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`. Artifact files are currently untracked under `tickets/done/persist-agent-tasks/`. Requirements are approved for design; design spec has been revised after architecture review round 1 and is ready for re-review.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-01 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && ls -la` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Discover initial environment | Initial checkout was superrepo branch `personal` with unrelated untracked files; not a dedicated task worktree. | No |
| 2026-07-01 | Command | `git remote -v && git branch -vv && git symbolic-ref refs/remotes/origin/HEAD` | Resolve remote/base branch context | `origin` points to `AutoByteus/autobyteus-workspace.git`; tracked remote default/base is `origin/personal`. | No |
| 2026-07-01 | Command | `git fetch origin --prune` | Initial refresh before creating the task branch/worktree | Command succeeded. Initial worktree was created from then-current `origin/personal` (`51ece107`). | Superseded by later explicit latest-base refresh |
| 2026-07-01 | Command | `git worktree add -b codex/persist-agent-tasks /Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks origin/personal` | Create mandatory dedicated task worktree/branch | Dedicated task worktree created. | No |
| 2026-07-01 | Command | `mkdir -p tickets/done/persist-agent-tasks` plus creation of `requirements.md` and `investigation-notes.md` | Bootstrap durable artifacts before deep investigation | Draft requirements and investigation notes created in task worktree. | Updated after latest-base investigation |
| 2026-07-01 | Command | `git fetch origin personal --prune` | Fulfill user request to base work on latest `origin/personal` | Fetch succeeded; `origin/personal` advanced to `57185192d4b93840dab1fb7134604b1716a600a8`. | No |
| 2026-07-01 | Command | `git reset --hard origin/personal` in task worktree | Rebase/reset the ticket worktree to the latest requested base | Branch `codex/persist-agent-tasks` now points at latest `origin/personal`; artifact directory remains untracked and was updated in place. | No |
| 2026-07-01 | Command | `git log -1 --oneline --decorate --stat` | Verify current base after reset | `HEAD -> codex/persist-agent-tasks`, `origin/personal`, `origin/HEAD`, and local `personal` all point to `57185192 docs(delivery): record v1.3.91 release finalization`. | No |
| 2026-07-01 | Command | `git diff --stat origin/personal...HEAD` | Verify no committed branch delta from base | No committed branch diff; only untracked task artifacts exist. | No |
| 2026-07-01 | Command | `git log --oneline --stat 51ece107..HEAD -- autobyteus-server-ts/src/agent-team-execution/task-delegation autobyteus-server-ts/src/agent-tools/task-delegation autobyteus-server-ts/src/services/team-communication autobyteus-server-ts/src/api/graphql/types/team-communication.ts autobyteus-web/services/runHydration/teamCommunicationHydrationService.ts autobyteus-web/services/agentStreaming/teamTaskExecutionProjection.ts autobyteus-web/utils/teamActiveTaskEntries.ts autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue autobyteus-server-ts/docs/modules/agent_team_execution.md` | Identify relevant changes since the initial investigation base | Latest base includes task-delegation tool-result cleanup (`467189a0`, `5719bf5a`, `5f459cf9`, `7884db63`) and Team Communication address-message changes (`a250722d`, `325efa93`). Requirements were updated to reflect concise public tool results and address-based message DTOs. | No |
| 2026-07-01 | Command | `rg -n "TaskDelegationProjection|task_delegation_records|task_delegations\.json|getTaskDelegationRecords|getTeamTask|Task.*ProjectionStore|persist.*task|persistent.*task" autobyteus-server-ts/src autobyteus-web --glob '!**/node_modules/**' -S` | Search for an existing durable task store/read API | No backend durable task-delegation store/read API found. Matches are frontend live task projection helpers only. | No |
| 2026-07-01 | Spec | `solution-designer/templates/design-spec-template.md` | Required design artifact structure | Design spec must include current-state read, design health, spines, ownership, removal, boundaries, dependency rules, file mapping, migration sequence, risks, and implementation guidance. | No |
| 2026-07-01 | Spec | `solution-designer/references/design-examples.md` | User requested design follow design examples | Applied spine-first, ownership-first structure; used examples to distinguish main-line owners from off-spine projection/persistence concerns and avoid active-node-only or event-only anti-patterns. | No |
| 2026-07-01 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-input-resolver.ts` | Verify task id allocation path for design | `buildCreateInput` currently reserves ids through the ledger's in-memory counter, so durable task history requires the target records-service root-scoped allocator to seed from persisted max suffix before new delegation after service recreation. | No |
| 2026-07-01 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Verify activation event ordering for design | Activation coordinator currently marks active and publishes activation events internally; design moves activation event publication to `TaskDelegationService` so persistence can happen first. | No |
| 2026-07-01 | Code | `autobyteus-web/components/workspace/team/TeamActiveTaskNavigator.vue`, `TeamActiveTaskDetailPane.vue`, `teamActiveTaskTechnicalDetails.ts` | Verify frontend task row selection assumptions | Navigator currently keys/selects rows by `entry.node.memberRouteKey`, which does not work for persisted rows without live nodes; design changes task row identity to stable task key/task id. | No |
| 2026-07-02 | Doc | `tickets/done/team-task-delegation-analysis/requirements.md` | Re-check product background for task target semantics during design review | Confirms two valid target classes: physical current-team member targets and visible current-team team/subteam targets; communication recipients are separate and representatives are not automatically task targets. | No |
| 2026-07-02 | Code | `autobyteus-server-ts/src/agent-team-execution/services/delegation-target-roster-builder.ts` and `member-run-instruction-composer.ts` | Verify current prompt/roster behavior for delegation targets | Delegation roster emits member rows for non-self physical current-team agents and team rows for visible `agent_team` members; prompt says member targets are physical current-team agents and team targets are visible current-team teams/subteams. | No |
| 2026-07-02 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-context-member-mapper.ts` and `task-delegation-input-resolver.ts` | Verify source of task target identity snapshots | Task delegation context maps the current `MemberTeamContext.members` to task member/team identities; resolver only accepts exact target names from that context and rejects invisible/arbitrary members. | No |
| 2026-07-01 | Command | `rg -n "delegate[_ -]?task|delegate_review|submit[_ -]?task|task result|inter[-_ ]?agent|send_message_to|TaskAgent" -S . --glob '!node_modules'` | Locate task and message implementation areas | Relevant backend paths are `autobyteus-server-ts/src/agent-team-execution/task-delegation`, `autobyteus-server-ts/src/agent-tools/task-delegation`, `autobyteus-server-ts/src/services/team-communication`, plus frontend streaming/hydration/task UI code. | No |
| 2026-07-01 | Command | `find autobyteus-server-ts/src -path '*task*delegation*' -o -path '*task-agent*' -o -path '*inter-agent*'` | Enumerate relevant task/message files | Found task-delegation domain/service/tool files, task-agent/task-team identity files, inter-agent message routing files, and REST task reference route. | No |
| 2026-07-01 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Inspect latest task record and result shapes | `TaskDelegationRecord` contains task id/label/description/status, target, delegator, reference files, task arguments, execution, pending submission id, submissions, reviews, acceptance/terminal timestamps. Public results are now concise: `delegate_task` success returns `{ task_id, status: "active" }`; activation failure returns `{ task_id, status: "not_started", message }`; submit/review return concise status/message only. | Reuse/tighten internal record as durable model; do not persist from public tool result |
| 2026-07-01 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-ledger.ts` | Verify current task storage and lifecycle owner | Ledger uses private `recordsById = new Map<string, TaskDelegationRecord>()` and `idCounter`; owns create/bind/markActive/submit/review/settlement checks entirely in process memory. | Add persistence around active lifecycle owner |
| 2026-07-01 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Inspect public task lifecycle service | Service constructs `new TaskDelegationLedger(teamRun.runId)`, handles `delegateTask`, `submitTaskAgentResult`, `submitTaskTeamIngressResult`, and `reviewTaskResult`, publishes task events after transitions, and has no persistence dependency. | Best place to write full durable record after committed transitions |
| 2026-07-01 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Inspect activation path | Activation binds task-agent/task-team task run identity, starts the execution, marks active, publishes activation on accepted activation, and rolls back/reports not_started on rejected activation. | Persist accepted/activated work; avoid treating failed activation as an in-scope visible task unless design explicitly chooses |
| 2026-07-01 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-event-publisher.ts` | Inspect live event payload completeness | Publishes `TASK_DELEGATION_ACTIVATED`, `STATUS_UPDATED`, `RESULT_SUBMITTED`, and `RESULT_REVIEWED`. Result-submitted payload has IDs/timestamps but not the submitted message/reference history; full data exists on the internal record/submission. | Persist from full internal record/transition or deliberately enrich events |
| 2026-07-01 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-run-registry.ts` | Inspect service lifetime | Registry caches active `TaskDelegationService` per active `TeamRun`; `detach` disposes and deletes service. | Confirms ledger records disappear with active run registry |
| 2026-07-01 | Code | `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | Inspect active team run lifecycle sidecars | `registerActiveRun` attaches Team Communication and run-file-change sidecars; `unregisterActiveRun` detaches them and calls `getTaskDelegationRunRegistry().detach(teamRunId)`. | Durable task records must survive service detach via file/read-model storage |
| 2026-07-01 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-reference-content-service.ts` and `autobyteus-server-ts/src/api/rest/task-delegation.ts` | Inspect task reference content route behavior | REST route delegates to a content service that only resolves references through active `TaskDelegationRunRegistry.getExisting(teamRunId)`. Historical/inactive task references cannot resolve after service detach. | Add durable records fallback for references |
| 2026-07-01 | Code | `autobyteus-server-ts/src/services/team-communication/team-communication-types.ts` | Inspect latest message projection shape | `TeamCommunicationProjection { teamRunId, messages }`; each message has `senderAddress` and `receiverAddress` typed segment arrays, content, type, createdAt, and reference files. | Durable task model should not copy older sender/receiver participant shape |
| 2026-07-01 | Code | `autobyteus-server-ts/src/services/team-communication/team-communication-service.ts` | Inspect message persistence pattern | Service attaches to team events, normalizes messages, queues writes, upserts projection in memory, writes under team memory dir with `AgentMemoryLayout`, then clears active cache on detach while file remains. | Strong local pattern for durable task records writes |
| 2026-07-01 | Code | `autobyteus-server-ts/src/services/team-communication/team-communication-projection-store.ts` | Inspect message storage file | Stores `team_communication_messages.json` atomically under the team memory directory. Missing/corrupt reads degrade to empty with warning. | Mirror safe store/read failure semantics for task records |
| 2026-07-01 | Code | `autobyteus-server-ts/src/services/team-communication/team-communication-projection-service.ts` | Inspect active/historical readback | Reads active projection from attached service when an active run exists; otherwise validates run metadata and reads persisted projection from team memory. | Add equivalent task records service/read API |
| 2026-07-01 | Code | `autobyteus-server-ts/src/api/graphql/types/team-communication.ts` and `autobyteus-server-ts/src/api/graphql/schema.ts` | Inspect API resolver pattern | GraphQL query `getTeamCommunicationMessages(teamRunId)` exposes persisted messages; resolver is registered in schema. | Add task-delegation read resolver/schema registration |
| 2026-07-01 | Code | `autobyteus-web/services/runHydration/teamCommunicationHydrationService.ts`, `teamRunContextHydrationService.ts`, `graphql/queries/runHistoryQueries.ts`, `stores/teamCommunicationStore.ts` | Inspect frontend message hydration pattern | Frontend queries persisted messages on live/historical team hydration and writes `teamCommunicationStore`; query includes latest sender/receiver address segments. | Add task hydration/store/query analog |
| 2026-07-01 | Code | `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts` | Inspect live task websocket projection | `TeamRunEventSourceType.TASK_DELEGATION` maps to `ServerMessageType.TASK_DELEGATION_EVENT` with flattened identity for live UI. | Durable readback should not rely solely on websocket events |
| 2026-07-01 | Code | `autobyteus-web/services/agentStreaming/teamTaskExecutionProjection.ts` | Inspect frontend task projection details | Extracts task id/description/reference/target/status from live `TASK_DELEGATION_EVENT` payloads and applies them to transient task nodes. | Reuse concepts for persisted task record mapping if helpful |
| 2026-07-01 | Code | `autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts` and `teamTaskTeamExecutionProjection.ts` | Inspect transient task-agent/task-team node creation | Task-agent/task-team execution nodes are created from live stream identity and carry task details on `TeamMemberNode`; task-team terminal cleanup can remove the projection node. | Persisted task records must not depend solely on transient node lifetime |
| 2026-07-01 | Code | `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Inspect cleanup behavior | Schedules task-team cleanup and removes task-agent context after offline/terminal message handling. | Confirms UI disappearance is intentional runtime cleanup, not a rendering bug |
| 2026-07-01 | Code | `autobyteus-web/utils/teamActiveTaskEntries.ts` and `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Inspect current Team-tab task section | Task entries are derived only by scanning `teamContext.memberTree` for `isTaskAgentInstance` / `isTaskTeamInstance` nodes. No persisted task store is consumed. | Frontend needs persisted task hydration/read model and task entry derivation change |
| 2026-07-01 | Code | `autobyteus-server-ts/src/agent-memory/store/agent-memory-layout.ts` and `autobyteus-server-ts/docs/modules/agent_memory.md` | Inspect storage layout | Team-run files live under `memory/agent_teams/<rootTeamRunId>/...`; `AgentMemoryLayout.getTeamDirPath({ rootTeamRunId, teamRunPath: [] })` owns safe path composition. | Store task records under root team-run memory directory using `AgentMemoryLayout` |
| 2026-07-01 | Doc | `autobyteus-server-ts/docs/modules/agent_tools.md`, `autobyteus-server-ts/docs/modules/agent_team_execution.md`, `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` | Validate intended task protocol | Docs confirm current tools and that task state is held in a team-run-scoped delegation ledger for correlation, activation, result/review history, stream projection, and settlement. Latest docs describe concise public tool results. | Requirements should keep protocol unchanged |
| 2026-07-01 | Doc | `tickets/done/remove-legacy-task-plans/design-spec.md` and `tickets/done/team-task-delegation-analysis/*` | Review previous task-delegation architecture decisions | Previous design removed legacy task-plan persistence and intentionally introduced dedicated task delegation with transient task-agent/team projection. No durable task records were added. | New work should extend dedicated task owner, not reintroduce legacy task-plan state |
| 2026-07-02 | Doc | `tickets/done/persist-agent-tasks/design-review-report.md` | Process architecture review round 1 failure | Review found two design impacts: durable status excludes `not_started` while the design did not define active pre-activation state, and root records file key was ambiguous for task-team child `TeamRun` services. | Requirements/design revised |
| 2026-07-02 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-run-router.ts` | Verify task-team child run routing | Router first resolves top-level runs, then resolves task-team child runs through `TaskTeamActiveRunDirectory.resolveActiveRun(teamRunId)`, and creates a `TaskDelegationService` for that child `TeamRun`. | Child/task-team-local delegations are in scope and need root storage scope |
| 2026-07-02 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-team-active-run-directory.ts` | Verify child run identities | Directory maps `taskTeamRunId` and child `TeamRun.runId` to active task-team entries that include `parentTeamRunId`, `taskId`, logical team route key, and active run. | Current local service id can differ from root storage id |
| 2026-07-02 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-team-member-handle.ts` and `mixed-team-run-context.ts` | Verify memory scope for task-team children | Task-team child runs inherit `parentBoundary.memoryScope`; child scope has rootTeamRunId from parent and teamRunPath extended with taskTeamRunId. | Persist task records using rootTeamRunId with explicit scope |
| 2026-07-02 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-ledger.ts` and `task-delegation-activation-coordinator.ts` | Verify active pre-activation lifecycle | Current ledger creates `status: "not_started"`, binds execution, marks active on accepted runtime start, and rolls back to not_started on failure. | New design must replace durable/in-memory record `not_started` with active-only starting entry |
| 2026-07-02 | User clarification | Conversation during design review | Clarify frontend display semantics for persisted tasks | Task display should mirror Team Communication perspective behavior: sender focus shows sent tasks by `senderAddress`, receiver focus shows received tasks by `receiverAddress`; for team-target delegated tasks, the accountable target is a team but the actual receiving inbox is the task-team ingress/coordinator address. | Requirements/design updated |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Model/tool calls invoke task-delegation tools through `autobyteus-server-ts/src/agent-tools/task-delegation/*`, which call `TaskDelegationToolService` and `TaskDelegationToolRunRouter` to resolve the active `TaskDelegationService` for the current team run or task-team parent route.
- Current execution flow:
  1. `delegate_task` resolves current active `TeamRun` and `TaskDelegationService`.
  2. `TaskDelegationService.delegateTask(...)` validates team context and creates an in-memory ledger record with `status: "not_started"`.
  3. `TaskDelegationActivationCoordinator` binds a task-agent or task-team execution identity, starts the execution through `TeamRun`, marks the record active on accepted start, rolls back on failure, and publishes a live `TASK_DELEGATION_ACTIVATED` event today.
  4. Latest public `delegate_task` output only returns `task_id` plus `status: "active"` on success, or `task_id`, `status: "not_started"`, and a concise failure `message` on activation failure.
  5. `submit_task_result` resolves the bound task-agent/task-team context and updates the in-memory ledger to `awaiting_review`; result-submitted/status events are published and the review owner is notified. The public result returns `task_id`, `status: "awaiting_review"`, and optional notification failure `message`.
  6. `review_task_result` validates the original delegator/review owner, records a review in memory, moves the task to `active` for revision or `accepted` for acceptance, publishes events, and requests settlement if accepted. The public result returns `task_id` plus resulting status and optional notification failure `message` for revision.
  7. `TaskDelegationRunRegistry.detach(teamRunId)` disposes the service and drops the in-memory ledger when the active team run is unregistered.
  8. For task-team child contexts, `TaskDelegationToolRunRouter.resolveActiveTeamRun(...)` can return a child `TeamRun` from `TaskTeamActiveRunDirectory`, so a local child `TaskDelegationService` can exist with a different `runId` than the root memory scope.
- Ownership or boundary observations:
  - `TaskDelegationService`/`TaskDelegationLedger` is the authoritative active lifecycle owner.
  - Team Communication separates live message delivery from durable message readback using a projection store/read service; task delegation lacks the analogous durable read owner.
  - Frontend task visibility is currently coupled to transient execution projection nodes, not to task records.
  - Task reference lookup is task-owned, but active-service-only.
- Current behavior summary: Task records exist only while the active service and frontend transient task nodes exist. Messages survive because they are persisted as a separate team communication projection; tasks do not have an equivalent durable projection.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior durability change.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant and Boundary Or Ownership Issue.
- Refactor posture evidence summary: The active lifecycle owner is mostly correct, but task visibility lacks a durable read-model owner and frontend task display incorrectly depends on runtime projection lifetime for the requested product behavior. Fixing by preventing transient node cleanup would be the wrong boundary; a task-delegation-owned persistent projection/read model is needed.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User request | Tasks disappear with in-memory runtime while messages persist across restart | Product needs durable task visibility analogous to messages | Add durable task records/read API/UI hydration |
| `task-delegation-record.ts` | Full lifecycle data exists internally while public tool results are intentionally concise | Persistence must use internal authoritative record/transition data, not public tool outputs | Design write point around service/ledger transitions |
| `task-delegation-ledger.ts` | `recordsById` and `idCounter` are memory-only, and pre-activation state is represented as record status `not_started` | Task record durability invariant is missing and durable record refactor needs active-only starting state | Persist only activated records; create active-only starting entries |
| `task-delegation-run-registry.ts` + `agent-team-run-manager.ts` | Registry detaches task service on run unregister | Runtime teardown drops task records | Durable records must live outside active registry |
| `task-delegation-reference-content-service.ts` | Reference lookup only queries active service | Historical task references fail even if files still exist | Add projection fallback |
| `team-communication-service.ts` | Messages are persisted via projection store sidecar | Existing healthy pattern exists | Reuse records/readback pattern without coupling tasks to communication owner |
| `team-communication-types.ts` | Latest persisted messages use `senderAddress` / `receiverAddress` segment arrays | Requirements/design must align with latest base and avoid older participant DTO assumptions | Keep Team Communication regression guard |
| `TeamStreamingService.ts` + task projection helpers | Task-agent/team projection nodes are removed on offline/terminal | Frontend disappearance is intentional runtime cleanup | UI must consume persisted task records separately or merge them with live runtime info |
| `task-delegation-event-publisher.ts` | Live result-submitted event omits full submitted message/reference history | Event-only persistence would lose task result details | Persist from full record or enrich event payloads explicitly |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Task lifecycle types and errors | Contains comprehensive `TaskDelegationRecord`, submission/review history, status/result DTOs | Reuse/tighten as durable record model |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-ledger.ts` | Active team-run task state and transitions | In-memory map; complete active state transitions; no storage | Active lifecycle owner remains but needs durable records integration |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Use-case owner for delegate/submit/review | Publishes events after transitions; constructs ledger on service creation; returns concise public results | Best place to write full record after committed transitions |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Task-agent/task-team activation sequencing | Binds execution and handles activation rollback/failure | Persist only accepted activated tasks unless design chooses failure rows |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-event-publisher.ts` | Live task event emission | Payloads are sufficient for live status projection but not full submitted result history | Durable store should not depend only on current events unless enriched |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-run-registry.ts` | Active service registry | Drops service on active run detach | Durable records must be outside registry lifetime |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-reference-content-service.ts` | Task reference content resolver | Active-service-only lookup | Add persisted records fallback |
| `autobyteus-server-ts/src/api/rest/task-delegation.ts` | REST task reference content route | Existing route identity is `teamRunId + taskId + referenceId` | Preserve route; extend underlying resolver |
| `autobyteus-server-ts/src/services/team-communication/*` | Durable team communication projection | Message projection store/read API/frontend hydration pattern | Local architecture pattern for task projection, but not the owner of tasks |
| `autobyteus-server-ts/src/api/graphql/types/team-communication.ts` | Message read GraphQL resolver | Query `getTeamCommunicationMessages(teamRunId)` | Add task read resolver/query analogous to messages |
| `autobyteus-server-ts/src/api/graphql/schema.ts` | GraphQL resolver registration | Team Communication resolver registered explicitly | Register new task resolver here |
| `autobyteus-web/services/runHydration/teamCommunicationHydrationService.ts` | Frontend message hydration | Fetches persisted messages for live and historical team runs | Add task hydration service/store |
| `autobyteus-web/graphql/queries/runHistoryQueries.ts` | Frontend GraphQL queries | Latest message query returns sender/receiver address segments | Add task query with explicit task fields |
| `autobyteus-web/services/agentStreaming/teamTaskExecutionProjection.ts` | Live task event details extraction | Parses task details into transient task nodes | Reuse normalization concepts for persisted task records where practical |
| `autobyteus-web/utils/teamActiveTaskEntries.ts` | Derives Team-tab task entries | Scans transient task nodes only | Must combine/replace with persisted task records |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Team-tab task list/detail UI | Consumes derived active task entries; selection key is currently member route key | Must show persisted task records with stable task identity even without a live node |
| `autobyteus-server-ts/src/agent-memory/store/agent-memory-layout.ts` | Safe memory path composition | Owns team-run memory directory path | Use for durable task records file placement |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Runtime/task delegation documentation | Latest docs state concise tool results and internal ledger/event details | Docs will need sync after implementation if behavior changes |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-01 | Static trace | Code-path read from task tool service through task service, ledger, event publisher, registry, REST reference resolver, websocket mapper, frontend projection, cleanup, and Team-tab component | No runtime execution was needed for requirements analysis; static ownership/readback path is clear. | Proceed to requirements approval and design. |
| 2026-07-01 | Static repo probe | `rg` durable task records search in `autobyteus-server-ts/src` and `autobyteus-web` | No durable backend task projection/read API exists on latest base; only frontend live projection helpers match. | New durable task records persistence is required. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for analysis. Implementation validation will likely need backend unit/integration tests plus frontend focused tests; API/E2E should decide restart/historical coverage later.
- Required config, feature flags, env vars, or accounts: None for analysis.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Created dedicated git worktree from `origin/personal`, later fetched `origin/personal` and reset the ticket branch to latest `57185192d4b93840dab1fb7134604b1716a600a8`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

### Task lifecycle is active-runtime scoped today

`TaskDelegationService` constructs `new TaskDelegationLedger(teamRun.runId)` for one active `TeamRun`. The ledger state is in process memory (`recordsById` map plus in-memory counter). The `TaskDelegationRunRegistry` entry is removed when the active team run is unregistered, so the ledger cannot survive process restart or active runtime teardown.

### Latest public task tool results are intentionally concise

Latest `origin/personal` changed task tool outputs to expose only concise fields to the model. This is good protocol hygiene but it means durable persistence must not depend on public tool results. The internal `TaskDelegationRecord`, `TaskResultSubmission`, and `TaskResultReview` still carry the full data required for UI visibility/auditability.

### Existing task events are live projections, not durable task records

`TaskDelegationEventPublisher` emits `TASK_DELEGATION_*` events to live streams. The live payloads carry enough for task-agent/task-team projection status and UI labels, but they are not stored and current `TASK_DELEGATION_RESULT_SUBMITTED` payload does not include the submitted message/reference history. A durable task record should be persisted from the internal record/transition (or events must be intentionally enriched before becoming the source of persistence).

### Team Communication already implements the requested durability pattern

`TeamCommunicationService` is attached by `AgentTeamRunManager.registerActiveRun(...)`, listens to communication events, normalizes/upserts messages, and writes `team_communication_messages.json` under the team memory directory. `TeamCommunicationProjectionService` can read active or persisted projections, and frontend hydration loads messages for both live and historical runs. On latest base the persisted DTO uses `senderAddress` and `receiverAddress` typed segment arrays.

### Frontend task UI is intentionally transient

`TeamActiveTasksSection` derives tasks from transient task run projection nodes in `AgentTeamContext.memberTree`. `TeamStreamingService` removes task-agent nodes on offline/terminal completion and task-team nodes on terminal/settled cleanup. Therefore extending node lifetime would fight the current runtime projection semantics. Persisted tasks need their own durable source and should be merged into UI rows independently from live execution node lifetime.

### Task reference content is not durable today

The task-owned REST reference route exists, but its service looks only in the active `TaskDelegationRunRegistry`. After service detach/restart, the route cannot locate task references even if referenced files still exist. Persisted task records should be the fallback lookup source.

### Previous task-plan persistence should not be reintroduced

Existing done-ticket docs show legacy task-plan state was intentionally removed in favor of dedicated task delegation. Durable task persistence should extend the dedicated `TaskDelegationService`/ledger domain, not restore old task-plan tools, old frontend task-plan state, or a separate model-facing task management protocol.

## Constraints / Dependencies / Compatibility Facts

- Current tool names and protocol are `delegate_task`, `submit_task_result`, and `review_task_result`; do not reintroduce legacy task-plan tools.
- `send_message_to` remains ordinary communication and must not become task result/review/acceptance transport.
- Team-run durable files should use `AgentMemoryLayout` rather than ad-hoc path composition.
- Existing Team Communication message persistence/hydration should remain unchanged, including the latest address-segment contract.
- Durable task readback should not imply active runtime authority; task tool calls must still resolve an active bound task-agent/task-team/delegator context.
- Older team runs with no durable task records cannot reliably be backfilled from memory-only state.
- The current UI naming/copy says "active tasks" in component/i18n paths; the product behavior now needs durable task visibility, so UI semantics may need a small copy/naming adjustment.

## Open Unknowns / Risks

No blocking open unknowns remain for architecture re-review. Resolved decisions / residual risks:

- Architecture review DR-001 was resolved in design by adding active-only starting entries and `discardStartingEntry`; durable `TaskDelegationRecord.status` remains `active | awaiting_review | accepted` only.
- Architecture review DR-002 was resolved in design by including task-team child-run delegations in scope and making storage/id allocation/readback root-scoped via `TaskDelegationPersistenceScope`.
- Persistence failure policy was resolved in design: task writes are attempted and awaited before live events/settlement, failures are structured warnings/logs, and already-started runtime work is not rolled back or surfaced through changed public tool DTOs.
- Frontend task entry identity was resolved in design: persisted task entries select by stable `taskId` or `teamRunId:taskId`, with live execution identity only as optional enrichment.
- Read API shape was resolved in design: expose typed GraphQL task records that reuse the existing `ConversationTargetAddress` object shape rather than generic JSON or expanded endpoint DTOs.
- Failed activation attempts (`not_started`) are out of scope for persisted visible task records; only accepted/activated delegated work is written in this change.

## Notes For Architect Reviewer

- Requirements are approved by the user for design, the final address-first data contract was approved during review, and the user requested kickoff on 2026-07-02. Architecture review round 1 failed with design impact and has been addressed in the revised design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/done/persist-agent-tasks/design-spec.md`.
- The produced design preserves `TaskDelegationService` as the active lifecycle owner and adds a task-delegation-owned durable records/read model for visibility/readback. During user review on 2026-07-02, the durable JSON shape was tightened to a normalized display/readback record rather than a raw `TaskDelegationRecord` dump, and the requirements/design now pin the records file attributes individually.
- 2026-07-02 user review: expanded `sender`/`receiver` task identity objects were judged too duplicated versus Team Communication. Re-analysis of `ConversationTargetAddress`, backend communication types, and frontend address utilities shows tasks can reuse `senderAddress`/`receiverAddress`; the task record now keeps only minimal task-specific supplements such as `receiverTargetKind`, compact taskRun reference, and message-like lifecycle updates.
- Avoid solving this by keeping transient frontend task-agent/task-team nodes alive forever; that would conflate runtime execution with durable task record history.
- Avoid a legacy compatibility/backfill path for old runs that never had persisted task records.
- The latest-base deltas accounted for in the design are: concise public task tool results, address-segment Team Communication messages, service-recreation task id collision risk, active `not_started` pre-activation flow, current frontend row selection by transient node route key, current hierarchy-bound delegation target semantics, task-team child service routing/root memory scope, and the need for display-first persisted task records.

- 2026-07-02 final user-approved data contract: use `TaskDelegationRecord` (not `TaskProjectionRecord`) as the durable-first record name; record fields are `taskId`, `status`, `senderAddress`, `receiverAddress`, `receiverTargetKind`, `content`, `referenceFiles`, `taskRun`, `updates`, and `createdAt`. Derived/duplicated fields such as task label, pending submission id, terminal/accepted/updated timestamps, sequence, expanded sender/receiver identities, and durable `not_started` state are intentionally omitted.
- 2026-07-02 architecture-review rework: child/task-team-local delegations are explicitly in scope and persist into the root team run records file using root-scoped task ids and root-scoped conversation addresses.
- 2026-07-02 user display clarification: persisted task display should follow the Team Communication address-perspective model. A focused sender address shows tasks it sent; a focused receiver address shows tasks it received. For team-target delegations, `receiverTargetKind` preserves team accountability while `receiverAddress` should be the actual task-team ingress/coordinator inbox address so the coordinator perspective can show the received task without duplicate identity fields.
