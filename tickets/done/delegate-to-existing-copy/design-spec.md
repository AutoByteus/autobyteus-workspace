# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-006` (revises SR-005 after ARCH-REV-002: AR-001 option (a) — keep history; AR-005)
- Approved requirements baseline / revision and user-approval reference: SR-003, approved by the user 2026-10-09 (quotes in `requirements-doc.md` → Document Status)
- Behavior-defining supplements and their approval references: None
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/investigation-notes.md`
- Authorities read (design reading gate; 2026-10-09): `references/architecture-design.md`, `design-principles.md`, project `DESIGN.md` (repo root), `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2 (referenced by DESIGN.md for persisted data), `autobyteus-server-ts/AGENTS.md`
- Project design-principle conflicts or discrepancies: None

## Current-State Read

A delegated **copy** (task execution, `TaskExecutionReference` = `{agentRunId}` | `{teamRunId}`) is spawned by `delegate_task(recipient_address, …)` → root `delegateTask` (Team / Org / standalone) → `RootTaskExecutionLifecycle.delegate` → `dispatchTaskCopy` (link Task entry → activate → seed → `markStarted`). The Task side (`ProjectTaskService` as `TaskAgentResourcePort`, backed by `TaskAgentResourceService`) records one entry per copy per Task in `<task>/agent_run_resources.json` and keeps an in-memory `owners: Map<runKey, taskId>`.

Constraints and problems found (evidence: investigation-notes Source Log and Architecture Investigation Findings):

1. **One Task per copy, forever.** `TaskAgentResourceService.link()` rejects a run that already has an owner; `swap()` logs a conflict when a run appears in two files. All ownership questions (`ownerOf`, `isOpen`, `locationOf`, `closedAgentRunsIn`) read that single owner.
2. **DONE release is per Task, not per current owner.** `closeAndWrite` → `release(closedByHostRoot(taskId))` requests a stop for *every* closed entry of the Task, also on a repeated DONE. The runtime re-checks `isClosed` via `ownerOf` (good), but the Task side has no notion of "this copy has moved on".
3. **Ownership chains are assumed single-Task.** `ownerOf(chain)` throws `TASK_AGENT_RESOURCE_CONFLICT` when the containment chain crosses Tasks. Sub-work copies can be hosted *inside* a Team copy (`host.hostKind === "team"`), so a reused Team copy that still contains closed sub-work of its previous Task would hit this.
4. **Reactivation already owns the "wake a closed copy" runtime step**: `RootTaskExecutionLifecycle.reactivateClosedTarget` — advisory eligibility → queue step (settle previous release, discard released authority, `assertRestorableChain`) → Task-side commit → `publishTaskExecutionsReopened` → normal wake/restore/deliver. This is exactly what assigning a new Task to a stopped copy needs.
5. **Ambiguous names.** The tool result calls a Team's coordinator `target_agent_run_id`; `list_project_tasks` calls it `targetAgentRunId`; internally the copy reference (often a *team* run) is called `agentRun` throughout the "agent run resources" vocabulary (`TaskAgentResource.agentRun`, `linkAgentRun`, `openAgentRuns`, `closedAgentRunsIn`, `agentRunKey` — the last duplicates `taskExecutionReferenceKey`). `ensureTaskHelper` returns the tool-level `DelegateTaskResult` to internal callers.
6. Persisted shapes need no change: the schema already validates per file, and a copy appearing in several files is valid on disk.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale and supporting evidence: feature spans the Task side (domain, service, store schema mapping, project-task tools), the root-neutral runtime lifecycle, all three root kinds (Team, Org, standalone: domain + delivery + capability wiring), the agent tool layer (`delegate_task` input/result, `send_message_to` hint), agent-facing texts, two docs, and a cross-repo skill update (`autobyteus-agents`). The approved naming refactor (REQ-014) renames the Task-execution-resource vocabulary across ~55 server source/test files (mechanical, but broad).
- Architectural risk: `High`
- Risk rationale and supporting evidence: changes the core ownership invariant (one Task per copy → one *current* Task per copy), DONE/release semantics, cross-Task concurrency (reopen vs. new assignment of the same copy), an authorization rule, and two agent-facing tool contracts (clean break per DEC-008).
- Escalation trigger: any need for a persisted-shape change or migration; any evidence that sub-work copies are hosted outside the containment chain in a way that breaks "innermost owner decides"; any root kind whose exact-delivery path cannot deliver to a woken copy.

## Architecture Investigation Evidence

| Source | Exact Path | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `projects/stores/task-agent-resource-schema.ts` | Persisted entry `{role, assignedBy?, recipientAddress?, hostRoot, agentRun:{kind,agentRunId}|{kind,teamRunId,coordinatorAgentRunId}, linkedAt, start, startError?, closedAt}`; duplicates checked per file only | No persisted change; schema is the one place that knows persisted names | None |
| Code | `projects/services/task-agent-resource-service.ts` l.207-244 | Single `owners` map; link conflict; closed index from every closed entry | Replace with per-execution entries + derived current entry | None |
| Code | `projects/services/project-task-service.ts` l.303-315 | `closedByHostRoot` releases every closed entry | Filter to entries that are their execution's current entry | None |
| Code | `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` l.188-226 | Reactivation runtime step | Extract and share with existing-copy assignment | None |
| Code | `standalone-agent-run-root/services/standalone-root-task-execution-adapter.ts` l.165-215 | `taskExecutionWithIngress`, `containsTaskExecution`, index `getTaskExecution(reference)`; copies may be hosted in a team (`host.hostKind === "team"`) | Copy lookup by ID; innermost-owner rule | Same shape assumed in Team/Org adapters (both implement the same interface) |
| Code | `standalone-root-message-delivery.ts` l.118-153, `agent-org-run-message-delivery.ts` l.85-110, `root-team-run.ts` l.313-336 | Each root has `delegateTask` (address → placement → lifecycle) and `deliverToRunId` (exact delivery) | Root splits `delegateToNewCopy` / `assignToExistingCopy`; work delivered through `deliverToRunId` | None |
| Code | `agent-communication/services/global-agent-run-message-router.ts` l.97-125 | Same-root exact delivery keyed by `hasAgentExecution` | Team-run-ID hint added before the live-only fallback | None |
| Code | `agent-collaboration/collaborators/task-scoped-message-recipient.ts` | Internal consumer of tool-level result shape | Internal return type becomes a typed target | None |
| Grep | `autobyteus-web` | No consumer of `delegate_task` / `list_project_tasks` results; GraphQL `TaskRootView` already has `ingressAgentRunId` + `teamRunId` | No web change | None |
| Repo | `~/autobyteus_org/autobyteus-agents/agents/project-task-manager/skills/project-task-management/SKILL.md` l.49-58, `templates/board-template.md` | Skill relies on `target_agent_run_id`, "every delegate_task starts a new worker" | Cross-repo skill update in the same delivery | Separate repo/branch, handled at delivery |
| Doc | `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2 | Prefer tolerant readers; no rewrite for cleanliness; never reuse a field name with new meaning | Keep persisted names; map at schema | None |

## Intended Change

1. A copy has one **current Task**: its open entry, else its most recently linked entry. Every ownership question uses the current entry.
2. `delegate_task(target_team_run_id | target_agent_run_id, task_id)` assigns Task B to an existing copy whose current entry is closed, from the copy's most recent assigner; the copy is woken with its conversation and receives B's work as a message.
3. DONE/CANCELLED releases only copies whose current Task is the closing Task.
4. Tool results and assignment views name IDs for what they are; `send_message_to` stays agent-only and explains team run IDs.
5. Internal vocabulary is renamed from "agent run resources" to "task execution resources" (persisted names unchanged, mapped at the schema).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Trigger / Contract | Existing Behavior Ref | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001; AC-001 | `delegate_task` success | investigation BEH-001 | Explicit IDs per copy kind; `delegated` flag | DS-001, DS-002 (tool serializer) |
| BEH-002 | Contract | REQ-002, 003; AC-002, 003, 011 | `delegate_task(target_*_run_id, task_id)` | BEH-002 | Assign to existing copy, wake, deliver | DS-002 |
| BEH-003 | Contract | REQ-004, 005, 007, 013; AC-006..010, 016 | Ownership questions | BEH-003 | One current Task per copy | DS-004 (Task side), DS-002 checks |
| BEH-004 | Contract | REQ-006; AC-004, 005 | DONE/CANCELLED | BEH-004 | Release only current-Task copies | DS-003 |
| BEH-005 | Contract | REQ-009; AC-012 | `send_message_to(target_agent_run_id=<team run>)` | BEH-005 | Refusal naming the coordinator | DS-005 |
| BEH-006 | Contract | REQ-010; AC-013 | `list_project_tasks` | BEH-007 (investigation) | Explicit IDs + `closedAssignments` | DS-006 |
| BEH-007 | Contract | REQ-011; AC-014 | Worker description-only delegation | BEH-006 (investigation) | Description states sub-work has no `task_id` | Tool text only |
| BEH-008 | User | REQ-008; AC-002, 011 | Board / run tree | task-root-view-builder.ts | B's root = copy; copy reappears | DS-002 event + existing views |
| BEH-009 | Contract | REQ-012, 014; AC-015, 017 | Tool texts, code names | — | Texts and names reflect reality | Refactor step S1, S6 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` (feature + approved naming refactor)
- Current design issue found: `Yes`
- Structural triggers that fire:
  - **Ambiguous-boundary trigger**: one tool command (`delegate_task`) would accept two different subjects (new copy from an address vs. existing copy by ID); and `target_agent_run_id` means "agent" or "coordinator" depending on kind. → split internal commands by subject; explicit ID names.
  - **Shared-structure tightness**: `TaskAgentResource.agentRun` holds a team reference; `coordinatorAgentRunId` sits beside a reference that may be an agent; `agentRunKey` duplicates `taskExecutionReferenceKey`; `DelegateTaskResult` (tool shape) leaks into internal `ensureTaskHelper` callers.
  - **Missing invariant / ownership**: ownership is keyed "one owner forever"; the new rule "one current Task" must be owned in one place (the resource service), not re-derived by callers.
  - **Repeated coordination trigger** (avoided): reactivation and existing-copy assignment need the same runtime "prepare closed copy for resume" step → one shared private step in the lifecycle.
  - Not firing: empty indirection (no new forwarding layers; root methods already exist and only branch to the lifecycle); persisted-data transition (no shape change).
- Root cause classification: `Boundary Or Ownership Issue` (single-owner invariant) + `Shared Structure Looseness` (names)
- Refactor needed now: `Yes`
- Evidence: Current-State Read items 1-5.
- Design response: current-Task derivation inside `TaskExecutionResourceService`; split commands; explicit types; shared resume step; vocabulary rename.
- Refactor rationale: adding the feature on top of the single-owner map and ambiguous names would spread "which Task is current?" and "is this a team or an agent ID?" guesses across callers.
- Intentional deferrals: persisted names (`agent_run_resources.json`, `agentRunResources`, `agentRun`, `coordinatorAgentRunId`) and error-code strings (`TASK_AGENT_RESOURCE_*`) are kept (see Persisted Data decision and Key Tradeoffs). Child Tasks for worker sub-work: separate ticket (DEC-006).

## Terminology

- **Copy / task execution**: `TaskExecutionReference` — `{agentRunId}` (Agent copy) or `{teamRunId}` (Team copy).
- **Ingress**: the agent run that receives a copy's work: the Agent itself, or the Team's coordinator. (Accurate generic name; kept.)
- **Execution resource**: one Task's record of one copy (today's "agent run resource" entry).
- **Current entry / current Task** of a copy: its open entry if it has one; otherwise its entry with the latest `linkedAt`. The invariant guarantees at most one open entry per copy.

## Section Fill Order

Followed.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Removed in scope: `target_agent_run_id` meaning "coordinator" on Team results; `targetAgentRunId` in assignment views; `{target_agent_run_id: null, message}` failure shape; `agentRunKey`; the single-owner `owners` map and its cross-file conflict log; `ownerOf`'s cross-Task conflict throw; tool-level `DelegateTaskResult` as an internal return type; "always spawns a new copy" wording.
- No aliases, dual fields or fallback readers.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject: `<appData>/projects/<p>/tasks/<t>/agent_run_resources.json` and `<appData>/ad-hoc-tasks/<t>/agent_run_resources.json`; a few entries per Task.
- Change: no entry-shape change. Two new facts: (1) one copy may have entries in several Task files (closed in all but its current one); (2) one Task file may hold **several entries for the same copy**, one per assignment period (A → B → A), of which **at most one is open** and only the copy's last entry in that file can be open. The schema's per-file duplicate rule relaxes from "a copy appears at most once" to "a copy has at most one open entry" (AR-001). In-memory field names change (`agentRun` → `execution`, `coordinatorAgentRunId` → `teamCoordinatorAgentRunId`, `agentRunResources` → `executionResources`); the schema module maps persisted ↔ in-memory names and is the only module that knows the persisted names.
- Normal reader/writer behavior: strict per-file parser (unchanged rules); writer emits identical JSON for identical content.
- Required semantics under direct use: an entry keeps exactly its current meaning — one assignment period of one copy for this Task, with its own `linkedAt`, `start` and `closedAt` — and is never removed or rewritten except by the existing settle/close/reopen rules on the copy's latest entry in that file. Existing files contain each copy once in one file, so they already satisfy the relaxed rule and the derived current entry equals today's owner → identical ownership, closure and visibility after upgrade. Nothing is deleted (preserved invariant; Data Continuity "acceptable loss: none").
- Constraints: downgrade to an older build after a copy was reused would make the older build log a conflict and pick one owner arbitrarily; downgrade is not a supported scenario (no requirement), recorded as a risk.
- Decision: `Directly Usable — No Migration`
- Rationale: no entry-meaning change and no new required fact; the only rule change is a relaxed validation that every existing file already satisfies (tolerant reader, migration guideline §3). Renaming persisted names would be a rewrite for representational cleanliness only, so the schema maps names instead. Downgrade note (risk, unsupported scenario): an older build reading a file with two entries for one copy marks that Task's resource data damaged (its strict duplicate rule), in addition to the recorded one-owner assumption.
- Supports: REQ-013, AC-016.
- Migration guideline §2 answers: (1) no migration needed; (2) availability unchanged — a damaged file still marks only its Task; (3) source inspected: current schema + docs data shape; (4) N/A; (5) existing atomic per-file writer; (6) no legacy interpretation added; (7) no extra passes — load stays one read per file; (8) cross-file reference = same execution key in two files, validated by the service's current-entry derivation; (9) evidence: unit + API tests listed below; (10) reviewed by architecture review.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related BEH | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | `delegate_task(recipient_address, …)` | Explicit-ID result | `RootTaskExecutionLifecycle` | Preserved spawn path; new result shape |
| DS-002 | Primary End-to-End | BEH-002, 003, 008 | `delegate_task(target_*_run_id, task_id)` | Copy receives B's work; B's root = copy | `RootTaskExecutionLifecycle.assignToExistingCopy` | The feature |
| DS-003 | Primary End-to-End | BEH-004 | `create_or_update_task(status DONE/CANCELLED)` | Root stops only current-Task copies | `ProjectTaskService` → `TaskExecutionResourceService` → root | Closing A never stops a moved copy |
| DS-004 | Bounded Local | BEH-003 | Committed file write / load | Derived current entries and indexes | `TaskExecutionResourceService.swap` | Single place for "current Task" |
| DS-005 | Primary End-to-End | BEH-005 | `send_message_to(target_agent_run_id=<team run>)` | Refusal naming coordinator | `GlobalAgentRunMessageRouter` | Clear guidance |
| DS-006 | Primary End-to-End | BEH-006 | `list_project_tasks` | Open + closed assignment views | `ProjectTaskService` | Find the copy after A closed |
| DS-007 | Return-Event | BEH-008 | Assignment commit | `task_executions_reopened` → clients list the copy again | Root adapter publisher | Run-tree visibility |

## Primary Execution Spine(s)

- DS-002: `Agent tool delegate_task -> Tool parser (AssignToExistingCopy) -> MemberTaskCommandCapability.assignToExistingCopy -> Root (Team/Org/standalone).assignToExistingCopy -> RootTaskExecutionLifecycle.assignToExistingCopy -> [Adapter: resolve copy] -> [Port: resolve Task B, assertAssignable] -> [Queue: prepare closed copy for resume] -> Port.assignExistingTaskExecution (commit B entry 'starting') -> Adapter.publishTaskExecutionsReopened -> Root exact delivery to ingress (wake/restore) -> Port.markStarted -> explicit-ID result`
- DS-003: `create_or_update_task(DONE) -> ProjectTaskService.closeAndWrite -> TaskExecutionResourceService.closeTask -> releasableByHostRoot(taskId) [current entries only] -> TaskExecutionResourceRelease -> Root.releaseTaskExecutions [re-checks current owner closed] -> exact release`
- DS-001: unchanged chain through `dispatchTaskCopy`; only the result type/serializer changes.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-002 | The Manager names the copy by its own ID and a Task. The root hands the request to its lifecycle, which finds the copy in this root, asks the Task side whether Task B is assignable and whether this sender may give this copy a new Task, settles the copy's previous stop and checks its conversation can be restored, then commits B's new `assigned` entry. The copy is now open again (event published), so the root's normal exact-message delivery wakes/restores it and delivers B's description and files from the Manager. The entry becomes `started`; the result names the copy's IDs. | Tool parser, root, lifecycle, Task port, root delivery | Lifecycle | Work-text builder, copy lookup in adapter, result serializer |
| DS-003 | DONE closes the Task's open entries and writes the status (unchanged), then asks host roots to stop only entries that are their copy's current entry. A copy that moved to Task B is skipped by the Task side, and the root's own "is it closed?" check (current owner) skips it too if the request races a later assignment. | ProjectTaskService, resource service, release, root | ProjectTaskService | Release logging |
| DS-004 | Every committed write or load swaps one Task file into the view, then recomputes the affected copies' current entries; owners, closed-per-root index and status marks read only current entries. | Resource service | Resource service | — |
| DS-005 | The router sees an ID that is not an agent in the sender's root, asks the active root directory whether any active root hosts a Team copy with that run ID, and if so refuses with the coordinator's agent run ID — for same-root and cross-root senders alike (AR-003). A team run in no active root gets the existing not-active refusal, exactly like an agent run ID there. | Router, directory, root, lifecycle, adapter | Router | — |
| DS-006 | The project-task tool reads, per Task, its open and closed `assigned` entries as explicit-ID views. | Tool manifest, ProjectTaskService, resource service | ProjectTaskService | — |

## Spine Actors / Main-Line Nodes

Tool parser/router; `MemberTaskCommandCapability`; root (`RootTeamRun`, `AgentOrgRun`, `StandaloneAgentRunRoot` and their delivery services); `RootTaskExecutionLifecycle`; `TaskExecutionResourcePort` (`ProjectTaskService`); `TaskExecutionResourceService`; root task-execution adapters; root exact delivery; `GlobalAgentRunMessageRouter`.

## Ownership Map

- **Tool layer** (`agent-tools/task-delegation`): input modes, parameter schema, result serialization (internal outcome → snake_case explicit IDs). Thin.
- **Root**: authorization of the caller identity, address resolution (spawn only), and the exact-delivery function it hands to the lifecycle. Owns no Task policy.
- **`RootTaskExecutionLifecycle`**: admission, sequencing of DS-002 (lookup → eligibility → queue step → commit → publish → deliver → settle), the shared resume step, live leases. Owns no Task facts.
- **`TaskExecutionResourcePort` / `ProjectTaskService`**: Task status rules, eligibility and commits (`assertAssignable`, `assignExistingTaskExecution`, reopen), assignment views, closure/release orchestration.
- **`TaskExecutionResourceService`**: persisted entries, per-Task and per-execution serialization, and the derived **current entry** per copy (sole owner of that rule).
- **Root adapters**: physical tree lookups (`taskExecutionTargetOf`, `taskExecutionWithIngress`), release/discard/restore, publication.

## Thin Entry Facades / Public Wrappers

| Facade | Governing Owner | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TeamTaskExecutionService` (and Org/standalone equivalents holding the lifecycle) | `RootTaskExecutionLifecycle` | Root-private construction of the lifecycle | Any assignment policy |
| `MemberTaskCommandCapability` | Root | Bind caller root | Input interpretation beyond routing by variant |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `owners: Map<runKey, taskId>` single-owner map, link-time "already belongs to a Task" rejection, `swap()` cross-file conflict log | Copies may move between Tasks | Per-execution entries + derived current entry | In This Change | |
| `ownerOf` cross-Task conflict throw | Legit chains now cross Tasks (closed sub-work inside a reused copy) | Innermost linked element's current entry decides | In This Change | |
| `agentRunKey` | Duplicate of `taskExecutionReferenceKey` | `taskExecutionReferenceKey` | In This Change | |
| Tool result `target_agent_run_id` = coordinator; failure `{target_agent_run_id: null}` | Ambiguous | Explicit-ID union + `delegated` | In This Change | Clean break (DEC-008) |
| `TaskAssignment.targetAgentRunId`, `currentAssignments` | Ambiguous | `openAssignments` / `closedAssignments` with explicit IDs | In This Change | |
| `DelegateTaskResult` as internal return of `ensureTaskHelper` / `dispatchTaskCopy` | Tool shape leaking inward | Internal `TaskDelegationOutcome` / `TaskExecutionTarget` | In This Change | |
| "always spawns a new copy" texts; PTM skill "every delegate_task starts a new worker" | Wrong after change | Updated texts | In This Change (skill: cross-repo) | |
| Root `delegateTask(context, input)` single entry | Two subjects | `delegateToNewCopy` + `assignToExistingCopy` | In This Change | |

## Return Or Event Spine(s)

DS-007: `Port.assignExistingTaskExecution commit -> Lifecycle -> Adapter.publishTaskExecutionsReopened([copy]) -> root publisher (task_executions_reopened / TASK_EXECUTIONS_REOPENED) -> clients list the copy again`. The Task change feed (`taskChanged(B)` via the resource commit listener) refreshes B's board root as today.

## Bounded Local / Internal Spines

- **Root task-execution command queue** (parent: lifecycle): `submit(kind "reopen") -> at head: root accepting? -> already open? skip -> discardReleasedExecution (settle exact release, drop authority) -> assertRestorableChain(ingress)`. Shared by reactivation and DS-002 as one private method `prepareClosedCopyForResume(execution, ingressAgentRunId)`.
- **Resource service serialization** (parent: `TaskExecutionResourceService`): `serialize(executionKey) -> serialize(taskId) -> read file under lock -> check -> write -> swap`. Lock order is always execution key, then Task ID; `closeTask` takes only the Task ID. No cycle.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| Work text builder (`buildTaskWorkText`) | DS-001, DS-002 | Lifecycle | One text for seed packet and existing-copy message (delegator lines, description, reference files) | Same work wording either way | Duplicate drifting texts |
| Copy lookup (`taskExecutionTargetOf`) | DS-002, DS-005 | Lifecycle | Reference → `{execution, ingressAgentRunId}` in this root | Physical tree is adapter-owned | Lifecycle reaching into indexes |
| Result serializer | DS-001, DS-002 | Tool | Internal outcome → snake_case explicit IDs | Tool contract only at the edge | Snake-case shapes inside runtime |
| Assignment views | DS-006 | ProjectTaskService | Entry → explicit-ID view | Tool-facing read | — |

## Ownership Boundaries

- Runtime ↔ Task side only through `TaskExecutionResourcePort`. The lifecycle never reads files or the resource service directly.
- Callers ask "current Task" questions only through the port (`ownerOf`, `isOpen`, `locationOf`), never by scanning entries.
- Tool layer depends on the capability only; roots depend on the lifecycle; the lifecycle depends on the adapter and port.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `TaskExecutionResourcePort` | `TaskExecutionResourceService`, stores, current-entry rule | Lifecycle, resource scope | Lifecycle importing the service/store | Add port method |
| `RootTaskExecutionLifecycle` | Queue, resource scope, dispatch, resume step | Roots (via their task-execution service) | Roots calling port or adapter for assignment | Add lifecycle method |
| `TaskExecutionResourceService` | Files, indexes, serialization | `ProjectTaskService` only | Anything else reading entries | — |

## Dependency Rules

- Allowed: tool → capability → root → lifecycle → {adapter, port}; `ProjectTaskService` → resource service → store/schema.
- Forbidden: runtime importing `projects/*` (except the port types it owns); tool layer constructing internal outcomes; any module other than the schema knowing persisted field names.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| Tool `delegate_task` mode A `{recipient_address, description, reference_files?}` | New copy, described work | Spawn | address | unchanged |
| Tool mode B `{recipient_address, task_id}` | New copy, saved Task | Spawn | address + Task ID | unchanged |
| Tool mode C `{target_team_run_id, task_id}` / `{target_agent_run_id, task_id}` | Existing copy | Assign | team run ID **or** agent run ID (exactly one) + Task ID | new |
| Tool result | Copy | Explicit IDs | `{delegated: true, target_kind: "agent", target_agent_run_id, task_id?}` / `{delegated: true, target_kind: "team", target_team_run_id, target_team_coordinator_agent_run_id, task_id?}` / `{delegated: false, message}` | clean break |
| `MemberTaskCommandCapability.delegateToNewCopy(caller, SpawnInput)` / `.assignToExistingCopy(caller, AssignInput)` | New vs existing copy | Route | `AssignInput = {copy: {teamRunId} | {agentRunId}, taskId}` | split by subject |
| Root `.delegateToNewCopy` / `.assignToExistingCopy` | same | Authorize + hand to lifecycle (+ exact delivery fn) | same | 3 roots |
| `RootTaskExecutionLifecycle.assignToExistingCopy(context, input, deliverWork)` | Existing copy | DS-002 | `deliverWork(ingressAgentRunId, text, referenceFiles) => Promise<AgentOperationResult>` | |
| Adapter `taskExecutionTargetOf(reference)` | Copy in this root | Lookup | `TaskExecutionReference` | new, 3 adapters |
| Port `assertAssignable({execution, requestedBy, taskId})` | Existing copy + Task | Advisory eligibility | explicit | new |
| Port `assignExistingTaskExecution({hostRoot, execution, teamCoordinatorAgentRunId?, taskId, assignedBy})` | Existing copy + Task | Commit: appends a new `assigned` entry for the copy to Task X's file, `starting` (earlier entries of the copy in X are kept; `recipientAddress` copied from the copy's previous assignment) | explicit | new |
| Port `linkNewTaskExecution(...)` | New copy | renamed `linkAgentRun` | | |
| Port `openAssignments(taskId)` / `closedAssignments(taskId)` (via ProjectTaskService) | Task | Views | Task ID | replaces `currentAssignments` |
| Root `teamCoordinatorOf(teamRunId)` (Team/Org/standalone via lifecycle → adapter) and `ActiveCollaborationRootDirectory.findTeamCoordinator(teamRunId)` | Team copy | DS-005 lookup across active roots | team run ID | new, read-only |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Tool `delegate_task` | Yes per mode (strict parser) | Yes | Low | Modes are mutually exclusive by keys |
| Capability / root commands | Yes | Yes | Low | Split |
| `assertAssignable` / `assignExistingTaskExecution` | Yes | Yes | Low | — |
| `taskExecutionTargetOf` | Yes | Yes (reference type) | Low | — |

## Main Domain Subject Naming Check (REQ-014 name map)

| Current | Proposed | Natural? | Corrective Action |
| --- | --- | --- | --- |
| `TaskAgentResource` / `TaskAgentResourceFile` / `.agentRunResources` | `TaskExecutionResource` / `TaskExecutionResourceFile` / `.executionResources` | Yes | Rename (schema maps persisted `agentRunResources`) |
| `TaskAgentResource.agentRun` | `.execution` | Yes | Rename (schema maps persisted `agentRun`) |
| `coordinatorAgentRunId` (in-memory, port link input) | `teamCoordinatorAgentRunId` | Yes | Rename (schema maps persisted `coordinatorAgentRunId`) |
| `TaskAgentResourcePort`, `…Owner`, `…Role`, `…LinkInput`, `…StopResult`, `…ReleaseRequest`, `…ReopenInput/Result`, `…AssignmentTarget` | `TaskExecutionResourcePort`, `TaskExecutionOwner`, `TaskExecutionRole`, `NewTaskExecutionLinkInput`, `TaskExecutionStopResult`, `TaskExecutionReleaseRequest`, `TaskExecutionReopenInput/Result`, `TaskExecutionAssignmentTarget` | Yes | Rename; fields `agentRun`/`agentRuns` → `execution`/`executions` |
| `linkAgentRun`, `openAgentRuns`, `closedAgentRunsIn`, `releaseTaskAgentResources` | `linkNewTaskExecution`, `openTaskExecutions`, `closedTaskExecutionsIn`, `releaseTaskExecutions` | Yes | Rename |
| `TaskAgentResourceService`, `TaskAgentResourceStore`, `TaskAgentResourceRelease`, `RootTaskAgentResourceScope`, `TaskAgentResourceGroup` | `TaskExecutionResourceService`, `TaskExecutionResourceStore`, `TaskExecutionResourceRelease`, `RootTaskExecutionResourceScope`, `TaskExecutionGroup` | Yes | Rename (+ files) |
| `agentRunKey` | (removed) `taskExecutionReferenceKey` | Yes | Remove duplicate |
| `TaskAssignment {targetAgentRunId, kind, assignedBy, outcome}` | `AgentAssignmentView {kind: "agent", agentRunId, assignedBy, outcome}` / `TeamAssignmentView {kind: "team", teamRunId, teamCoordinatorAgentRunId, assignedBy, outcome}` (`assignedBy` kept per REQ-010 — AR-002) | Yes | Replace |
| `DelegateTaskResult` (internal use) | `TaskDelegationOutcome = {delegated: true, copy: DelegatedCopy, taskId?} | {delegated: false, message}`; `DelegatedCopy = {kind:"agent", agentRunId} | {kind:"team", teamRunId, teamCoordinatorAgentRunId}` | Yes | Internal type; tool serializer maps |
| Root/capability `delegateTask` | `delegateToNewCopy`; new `assignToExistingCopy` | Yes | Split |
| `ingressAgentRunId`, `taskExecutionWithIngress`, `TaskRootView.ingressAgentRunId/teamRunId` | unchanged | Yes ("ingress" = the agent run receiving work, exact for both kinds) | — |
| Error codes `TASK_AGENT_RESOURCE_*` | unchanged | Acceptable as opaque codes | Kept: agent-visible contract strings; messages carry meaning |
| Persisted `agent_run_resources.json`, `agentRunResources`, `agentRun`, `coordinatorAgentRunId` | unchanged on disk | — | Mapped only in `task-execution-resource-schema.ts`; documented |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Wake a closed copy | Reactivation queue step | Reuse (extract shared private method) | Same settle/discard/restore semantics |
| Deliver work to a woken copy | Root exact delivery (`deliverToRunId`) used by `send_message_to` | Reuse | Same wake/restore/persist/present path; no new delivery code |
| Board / run-tree visibility | `publishTaskExecutionsReopened`, Task change feed, `TaskRootView` | Reuse | Already used by reactivation |
| Entry start lifecycle | `starting/started/failed` + `markStarted/markFailed` | Reuse | Same meaning for an existing copy's new assignment |
| Copy lookup | Adapter index | Extend (`taskExecutionTargetOf`) | One read-only method per adapter |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `agent-tools/task-delegation` | Modes, schema, result serialization, texts | DS-001, 002 | Extend |
| `agent-collaboration/execution/task` | Lifecycle, dispatch, resume step, port contract, scope, work text | DS-002, 003, 005 | Extend + rename |
| Roots (`agent-team-execution`, `agent-org-execution`, `standalone-agent-run-root`) | Command split, exact-delivery fn, adapter lookup, team-run hint query | DS-002, 005 | Extend |
| `projects` (domain, services, stores) | Current entry, eligibility, commits, views, release filter | DS-002, 003, 004, 006 | Extend + rename |
| `agent-tools/project-tasks` | `list_project_tasks` output | DS-006 | Extend |
| `agent-communication` | Team-run hint | DS-005 | Extend |
| Docs; `autobyteus-agents` PTM skill | Contract docs; skill | — | Update |

## Draft File Responsibility Mapping → Final File Responsibility Mapping

(Draft and final coincide after the reuse/tightness checks; listed once.) Paths relative to `autobyteus-server-ts/src/` unless noted.

| File | Owner | Concrete Concern | Change |
| --- | --- | --- | --- |
| `projects/domain/task-execution-resources.ts` (renamed from `task-agent-resources.ts`) | Task side | Entry type and pure rules. Lookup of a copy in a file = **the copy's last entry in that file** (`latestEntryOf(file, execution)`), used by settle start, reopen/`assertReopenable`, inherited-link creator check and views. Rules: `linkNewTaskExecution` (copy absent from the file), **new** `linkExistingTaskExecution(file, link, now)` (appends a new `assigned` entry; precondition: every entry of the copy in this file is closed — earlier entries are kept unchanged, AR-001), settle start, close (all open entries), reopen, **new** `assertTaskExecutionAssignable(...)`, views `openAssignments`/`closedAssignments` | Rename + add |
| `projects/services/task-execution-resource-service.ts` (renamed) | Task side | View: `files`, **`entriesByExecution: Map<key, Map<taskId, entry>>`** (per Task: the copy's latest entry in that file), derived **current entry**; `ownerOf` (innermost linked element's current entry), `isOpen`, `locationOf`, `closedTaskExecutionsIn` (current entries only), `releasableByHostRoot(taskId)` (closed entries that are current), `assignExisting(...)` under `serialize(executionKey) → serialize(taskId)`, reopen under the same order; `rootTaskLocationOf` via current entry | Rename + modify |
| `projects/stores/task-execution-resource-store.ts`, `task-execution-resource-schema.ts` (renamed) | Persistence | File I/O; **only** place mapping persisted names ↔ in-memory names; per-file rule relaxed to "a copy has at most one open entry, and only its last entry may be open" (AR-001) | Rename + mapping + rule |
| `projects/runtime/task-execution-resource-release.ts` (renamed) | Task side | Stop requests (unchanged behavior) | Rename |
| `projects/services/project-task-service.ts` | Task side | Port impl: `assertAssignable`, `assignExistingTaskExecution` (both first `assertAllReadable` — AR-004; the commit re-reads Task B status under B's serialization, as `linkNewTaskExecution` does), `openAssignments`/`closedAssignments`, release uses `releasableByHostRoot`; reopen refusal names the current Task ID | Modify |
| `projects/services/task-root-view-builder.ts` | Task side | Uses renamed fields | Rename only |
| `agent-collaboration/execution/task/task-execution-resource-port.ts` (renamed) | Runtime contract | Port interface incl. new methods | Rename + add |
| `agent-collaboration/execution/task/root-task-execution-resource-scope.ts` (renamed) | Runtime | Ownership questions, release, discard | Rename |
| `agent-collaboration/execution/task/task-delegation-command.ts` | Runtime contract | `SpawnTaskInput`, `AssignToExistingCopyInput`, `TaskDelegationOutcome`, `DelegatedCopy`, errors | Modify |
| `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | Runtime | `delegateToNewCopy` (renamed `delegate`), **`assignToExistingCopy`**, shared `prepareClosedCopyForResume`, reactivation uses it; `teamCoordinatorOf` | Modify |
| `agent-collaboration/execution/task/root-task-dispatch.ts` | Runtime | Returns `TaskDelegationOutcome` | Modify |
| `agent-collaboration/execution/task/task-execution-input.ts` | Runtime | `buildTaskWorkText` shared by seed packet and existing-copy message | Modify |
| `agent-collaboration/execution/task/root-task-execution-adapter.ts` + 3 adapters (`team-task-execution-adapter.ts`, `agent-org-task-execution-adapter.ts`, `standalone-root-task-execution-adapter.ts`) | Roots | `taskExecutionTargetOf(reference)` | Add |
| `agent-collaboration/execution/task/member-task-command-capability.ts` | Runtime | Two commands | Modify |
| `agent-collaboration/collaborators/task-scoped-message-recipient.ts` | Collaboration | Uses internal target type from `ensureTaskHelper` | Modify |
| Roots: `agent-team-execution/domain/root-team-run.ts`, `services/team-run-message-delivery.ts`, `services/team-root-materializer.ts`, `task-delegation/team-task-execution-service.ts`; `agent-org-execution/domain/agent-org-run.ts`, `services/agent-org-run-message-delivery.ts`, `services/agent-org-execution-scope-builder.ts`; `standalone-agent-run-root/domain/standalone-agent-run-root.ts`, `services/standalone-root-message-delivery.ts`, `services/standalone-root-builder.ts`, `services/standalone-host-member-context-builder.ts` | Roots | `delegateToNewCopy` / `assignToExistingCopy` (authorize; pass `deliverWork` = own `deliverToRunId` with sender identity, `messageType: "task_assignment"`); `teamCoordinatorOf` | Modify |
| `agent-collaboration/execution/services/active-collaboration-root-directory.ts` (root interface) | Collaboration | Boundary gains `teamCoordinatorOf(teamRunId): string | null`; directory gains `findTeamCoordinator(teamRunId)` asking every active boundary (AR-003) | Modify |
| `agent-communication/services/global-agent-run-message-router.ts` | Messaging | Team-run hint (`TARGET_IS_TEAM_RUN`): after the same-root agent check and before the live-only fallback, `directory.findTeamCoordinator(id)` over all active roots (AR-003) | Modify |
| `agent-tools/task-delegation/*` (parser, parameter schema, manifest, result contract, serialization, router, service) | Tool | Modes A/B/C; result union; serializer | Modify |
| `agent-team-execution/task-delegation/task-delegation-result-contract.ts` | Tool contract | New strict zod union | Modify |
| `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts`, `agent-execution/prompt/standalone-collaboration-instruction.ts` | Texts | REQ-012 wording incl. sub-work note (REQ-011) | Modify |
| `agent-tools/project-tasks/project-task-tool-contract.ts`, `project-task-tool-manifest.ts` | Tool | `assignments`/`closedAssignments` views; descriptions | Modify |
| `autobyteus-server-ts/docs/modules/projects.md`, `docs/modules/agent_team_execution.md` | Docs | Contract docs | Modify |
| `~/autobyteus_org/autobyteus-agents/agents/project-task-manager/skills/project-task-management/SKILL.md`, `templates/board-template.md` | Skill (cross-repo) | Follow-up Tasks to the same worker; explicit IDs; board columns | Modify |

## Reusable Owned Structures Check

| Structure | File | Owner | Why Shared | Redundant Removed | Overlap Removed | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| `DelegatedCopy` | `task-delegation-command.ts` | Runtime contract | Spawn and assign both return it; serializer maps it | Yes (no `target_` prefix, no `ingress` dup) | Yes | Tool-shaped |
| Assignment views | `task-execution-resources.ts` | Task side | open/closed share shape | Yes | Yes | A bag of optional fields (agent vs team are separate variants) |
| `buildTaskWorkText` | `task-execution-input.ts` | Runtime | Seed + existing-copy message | Yes | Yes | — |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `TaskExecutionResource` | Yes after rename (`execution` may be team or agent, typed; `teamCoordinatorAgentRunId` only for team) | Yes | Low | — |
| `DelegatedCopy` | Yes | Yes | Low | — |
| Tool result | Yes | Yes | Low | `delegated` discriminates success/failure; `target_kind` discriminates copy kind |

## Applied Patterns

- Adapter (existing root adapters; one lookup added). Queue/serialization (existing). No new patterns.

## Target Subsystem / Folder / File Mapping

Folders unchanged; renames are within the same folders (see file table). No new folders.

## Folder Boundary Check

| Folder | Depth | Clear? | Risk | Note |
| --- | --- | --- | --- | --- |
| `projects/{domain,services,stores,runtime}` | Domain / Persistence | Yes | Low | Unchanged layout |
| `agent-collaboration/execution/task` | Main-line runtime | Yes | Low | Unchanged |
| `agent-tools/task-delegation` | Transport (tool) | Yes | Low | Unchanged |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Avoided Shape | Why |
| --- | --- | --- | --- |
| Team result | `{"delegated": true, "target_kind": "team", "target_team_run_id": "team_9f…", "target_team_coordinator_agent_run_id": "coordinator_1a…", "task_id": "ad_hoc_task_…"}` | `{"target_agent_run_id": "coordinator_1a…", "target_kind": "team"}` | The coordinator is not "the target" |
| Follow-up | `delegate_task({"target_team_run_id": "team_9f…", "task_id": "project_task_B"})` | `delegate_task({"recipient_address": "/team", "task_id": "project_task_B"})` (fresh copy, loses context) / reopening A + `send_message_to` | DS-002 |
| Busy copy | `{"delegated": false, "message": "This copy still works on Task project_task_A (IN_PROGRESS). Mark it DONE or CANCELLED first, or delegate Task project_task_B to a new copy with recipient_address."}` | Generic "conflict" | REQ-005 |
| Coordinator passed as agent | `{"delegated": false, "message": "coordinator_1a… is the coordinator of Team copy team_9f…; use target_team_run_id \"team_9f…\"."}` | Silent acceptance | REQ-005, naming |
| `send_message_to` with team run | `accepted: false, code TARGET_IS_TEAM_RUN, "team_9f… is a Team run; send_message_to reaches agents. Message its coordinator agent run coordinator_1a…."` | "not active" | REQ-009 |
| Assignment view | `{"kind": "team", "teamRunId": "team_9f…", "teamCoordinatorAgentRunId": "coordinator_1a…", "assignedBy": "ptm_…", "outcome": "accepted"}` | `{"targetAgentRunId": "coordinator_1a…", "kind": "team"}` | REQ-010 |
| Current entry | Copy `team_9f` in A (closed, linked 10:00) and B (open, linked 12:00) → current = B; repeated DONE of A → `releasableByHostRoot(A)` excludes it | Releasing every closed entry of A | REQ-006 |
| Back to an earlier Task (A → B → A) | B DONE; PTM moves A to IN_PROGRESS; `delegate_task({"target_team_run_id": "team_9f…", "task_id": "A"})` → A's file keeps the copy's earlier closed entry (linked 10:00, closed 11:00) and gets a **new** appended entry (linked 14:00, `start: starting`, `closedAt: null`) → current = A (latest `linkedAt`), A's root = the copy (last `assigned` entry in file order); A's `closedAssignments` lists the 10:00 period, `assignments` the open 14:00 one | Removing/rewriting the earlier entry (loses persisted history the requirements keep); reopening it in place (file order no longer = link order) | AR-001 |
| AC-010 hint | `"This copy's current Task is project_task_B (DONE); reopening Task project_task_A does not reach it. To have this copy continue Task project_task_A, call delegate_task with target_team_run_id \"team_9f…\" and task_id \"project_task_A\"."` | "refused" with no next step | AR-001 / REQ-007 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep `target_agent_run_id` on Team results as alias | "keep current fields working" in the original request | Rejected (DEC-008, user-approved) | Explicit fields; texts and skill updated together |
| Keep `targetAgentRunId` in assignment views | Same | Rejected | Explicit views |
| Accept coordinator ID as `target_agent_run_id` for a Team copy | Leniency | Rejected | Refusal naming the team run ID |
| Accept team run ID in `send_message_to` | Leniency | Rejected (DEC-004) | Refusal naming the coordinator |
| Dual in-memory names / rename persisted fields with fallback reader | Naming refactor | Rejected | Schema maps names; no fallback |

## Derived Layering

Tool → root → lifecycle → {adapter, port}; port → Task services → stores. Unchanged.

## Change / Refactor Sequence

- **S1 — Mechanical rename (no behavior change).** Apply the name map (types, fields, methods, files) across server src/tests; schema maps persisted names; remove `agentRunKey`. Suite passes unchanged.
- **S2 — Task side current entry.** `entriesByExecution` + derived current entry in `swap`/`unindex`; `ownerOf` innermost-wins; `closedTaskExecutionsIn` and `rootTaskLocationOf` from current entries; `releasableByHostRoot`; per-execution serialization for reopen; reopen refusal names current Task; `openAssignments`/`closedAssignments` views.
- **S3 — Assign-existing on the Task side.** Domain rule `linkExistingTaskExecution` + relaxed schema rule + `assertAssignable` + `assignExistingTaskExecution`, exactly as specified in Guidance For Implementation → "Assign-existing eligibility" (the one authoritative eligibility list) and "Entry rule for a copy returning to a Task" (AR-001, AR-005). Commit under the execution → Task lock order.
- **S4 — Runtime.** Adapter `taskExecutionTargetOf` (3 roots); lifecycle `assignToExistingCopy` + shared `prepareClosedCopyForResume`; `buildTaskWorkText`; internal outcome types; `ensureTaskHelper` returns target.
- **S5 — Roots and capability.** `delegateToNewCopy` / `assignToExistingCopy` in Team/Org/standalone roots, delivery services and capability builders; `teamCoordinatorOf`; router hint.
- **S6 — Tool layer and texts.** Parser modes, parameter schema (recipient_address no longer `required`), result union + serializer, `list_project_tasks` views, all descriptions and prompt texts.
- **S7 — Docs and skill.** `projects.md` (ownership, DONE, reactivation, assignment views, new "Follow-up Task to an existing copy" section), `agent_team_execution.md`; PTM skill + board template in `autobyteus-agents` (separate branch, delivered with this ticket).
- **S8 — Tests** (see Guidance).

DS-002 failure handling (inside S4):
- Before the commit (lookup, eligibility, queue step): `{delegated: false, message}`; nothing changed.
- After the commit, delivery not accepted: `markFailed` on B's entry; `{delegated: false, message: "Task B was assigned to the copy but its work was not delivered (<reason>). Message the copy's ingress, or mark Task B CANCELLED / delegate it to a new copy."}`. Infrastructure failure between commit and delivery is not a supported scenario; no extra retry machinery.
- Persistence indeterminate: same `TaskDispatchIndeterminateError` treatment as the spawn path.

## Key Tradeoffs

- **Sequential ownership (one current Task) vs. multi-open**: chosen by the user; keeps sub-work, helpers and messaging scope single-Task.
- **Persisted names kept**: renaming on disk would be a rewrite for cleanliness only (forbidden by DESIGN.md/migration guideline); one schema module translates. Error codes kept as opaque contract strings.
- **Work delivered as an inter-agent message (not a system seed)**: the copy already has a conversation; reusing exact delivery persists and presents it like any message from the Manager, with no new delivery path.
- **Reuse limited to the delegator's root**: a copy lives in the root that created it; cross-root moves are out of scope.

## Risks

- Concurrency between DONE of A — the first DONE racing the assignment through parallel tool calls, or a repeated DONE — and the assignment of B (R-1): mitigated by `assertAssignable` requiring A's entry closed before the queue step, the queue step settling A's stop, the Task-side `releasableByHostRoot` filter, and the root's current-owner `isClosed` check at release time. The residual window depends on each adapter's `releaseOwnedExecution` capturing its authority synchronously at invocation, the same profile as accepted reactivation. Tests cover both orders.
- Broad mechanical rename (S1) inflates the diff; sequencing S1 first as a no-behavior-change step keeps feature review focused.
- Cross-repo skill update must ship together with the server change (delivery coordination).
- Downgrade after reuse is unsupported (older builds assume one Task per copy).

## Guidance For Implementation

- Keep S1 a pure rename commit; verify with the existing suite before S2.
- `TaskExecutionResourceService` is the only owner of the current-entry rule; expose results, never the raw multi-entry map.
- Current entry: open entry if any; otherwise latest `linkedAt` (tie → Task ID order, deterministic). Two open entries can only come from corrupted data: pick the latest and `console.error` once.
- Lock order: `serialize(taskExecutionReferenceKey(execution))` then `serialize(taskId)`; never the reverse.
- The B entry's `recipientAddress` is copied from the copy's previous `assigned` entry (the address it was originally delegated to).
- **Assign-existing eligibility (complete list, all checked in `assertAssignable` before the runtime queue step, and re-checked in `assignExistingTaskExecution` under the execution → Task locks):**
  1. all Task resource data readable (`assertAllReadable`, AR-004 / REQ-005);
  2. Task X exists, is unique, not DONE/CANCELLED (existing `resolveAssignment` rules);
  3. the copy has entries and its current entry is closed (else: names the open Task, REQ-005);
  4. the current entry's role is `assigned` (sub-work/helper copies refused) and its `assignedBy` is the requester;
  5. some entry of the copy has `start: started` (R-2: "the copy never started" = no entry ever started);
  6. Task X is not the copy's current Task (else: "use reopen + message").
  A copy whose earlier (non-current) entry is in Task X's file is **allowed** (AR-001): the commit appends a new entry and keeps the earlier one (see the entry rule below). The earlier entry is necessarily a closed `assigned` entry by the same assigner (a copy only ever moves through assignments by its most recent assigner).
- **Entry rule for a copy returning to a Task (AR-001, SR-006):** each assignment period is its own entry. Assigning a copy to Task X always **appends** a new `assigned` entry `{role: assigned, assignedBy: requester, recipientAddress (from the copy's previous assignment), hostRoot, execution, teamCoordinatorAgentRunId?, linkedAt: now, start: starting, closedAt: null}`; earlier entries of the copy in X's file stay exactly as they are (their `linkedAt`, `start`, `startError`, `closedAt`). Per-file invariant: a copy has at most one open entry, and only its last entry in the file can be open. Consequences:
  - Lookups of a copy within a file (settle start, reopen/`assertReopenable`, inherited-link creator check) use the copy's **last** entry in that file; `closeTaskExecutionResources` closes every open entry (unchanged).
  - `entriesByExecution` keeps, per Task, the copy's last entry in that file; the current entry across files is the open one, else the latest `linkedAt` (unchanged rule).
  - Task root (`latestAssignedEntry`) = last `assigned` entry in file order (unchanged; file order = link order still holds because entries are only appended).
  - `releasableByHostRoot(taskId)`: closed entries that are their copy's current entry, deduplicated per copy; earlier periods never trigger a stop.
  - Views: `assignments` = open `assigned` entries; `closedAssignments` = **every** closed `assigned` entry in link order (one per assignment period, so a returning copy appears once per earlier period).
  - Reopen + message reactivation reopens only the copy's last entry, and only when that entry is the copy's current entry (REQ-007).
- **AC-010 hint (REQ-007):** the reopen refusal names the copy's current Task and its status, and points to `delegate_task(target_*_run_id, task_id=<the reopened Task>)` as the working next step (see example).
- Tests (follow TESTING.md):
  - Unit: schema relaxed rule (two closed + one last open entry for a copy accepted; two open, or an open non-last entry, rejected), last-entry lookups, `closedAssignments` listing every closed period, current-entry derivation and indexes (load and swap), `ownerOf` innermost-wins with closed sub-work inside a reused copy, `releasableByHostRoot`, assign/reopen eligibility rules (each item of the list above, incl. damaged file and ever-started) and lock ordering, `linkExistingTaskExecution` (copy absent vs. earlier closed entries kept; file order; schema re-parse passes), parser modes and result schema, assignment views (`assignedBy`).
  - Lifecycle tests with fake adapter/port: success; each refusal of REQ-005; post-commit delivery failure → `failed` entry; reactivation still works and refuses a non-current Task (AC-010).
  - API/E2E with real runtime (all three roots where feasible, Team root mandatory): AC-002..005, AC-010 + follow-on A → B → A (AC-018), AC-011 (restart), AC-012 (same-root and cross-root sender), AC-013; QR-001 parallel `DONE(A)` + `assign(B)` in both orders; existing reactivation and delegation suites green (AC-016).
  - Contract tests for tool descriptions (AC-015).

## Architecture Review Resolutions (SR-005, SR-006)

| Finding | Resolution | Requirement impact |
| --- | --- | --- |
| AR-001 (A → B → A undefined) | SR-005 re-link replaced in SR-006 by option (a) of ARCH-REV-002: append a new entry, keep every earlier entry; per-file rule "at most one open entry per copy"; lookups use the copy's last entry in a file; eligibility list and AC-010 hint unchanged | None: approved REQ-003 text restored; AC-018 kept as verification of behavior REQ-004 already allows |
| AR-002 (`assignedBy` rename) | Kept `assignedBy` | None |
| AR-003 (cross-root hint) | Directory `findTeamCoordinator` over all active roots before the live-only fallback; inactive roots keep the existing not-active refusal (parity with agent run IDs) | None |
| AR-004 (unreadable data) | `assertAllReadable` in `assertAssignable` and the commit | None |
| R-1 | Risks text widened; tests for both orders | None |
| R-2 | "Never started" = no entry of the copy ever started | None |
| AR-005 (stale S3 text) | S3 now points to the single eligibility list and entry rule in Guidance | None |
