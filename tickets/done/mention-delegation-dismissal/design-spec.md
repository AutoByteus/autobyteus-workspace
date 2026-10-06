# Design Spec — mention-delegation-dismissal

## Solution And Approval Basis

- Current solution revision ID: `SR-005` (design revision for ARCH-REV-001 AR-001, R-1, R-2; on approved SR-003 requirements)
- Approved requirements baseline / revision and user-approval reference: SR-003 (REQ-001..013, AC-001..015, SCN-001..007, BEH-001..009), approved by the user 2026-10-06 ("Now I go ahead with the designing.")
- Behavior-defining supplements and their approval references: None
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-delegation-dismissal/tickets/in-progress/mention-delegation-dismissal/investigation-notes.md` (E-01..E-36)
- Authorities read: skill `references/architecture-design.md`, skill `design-principles.md` (2026-10-06); project `DESIGN.md` (repo root, worktree base `3c8e49ad5`); `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2; `design-examples.md` not used.
- Project design-principle conflicts or discrepancies: None. Note: `server docs/modules/projects.md` says linked dispatch "snapshots ... context bytes"; code passes paths only (E-27). The docs sync should correct the wording.

## Current-State Read

- `@X` send → root `admitCollaboratorMentions` → `CollaboratorAdmission.ensure` → **collaborator entry written to the run tree** + `collaborator_added`; the stream handler composes the `[Mentioned collaborators]` note telling the agent to `send_message_to` (E-01, E-28, E-29).
- `delegate_task` → `RootTaskExecutionLifecycle.delegate()` → `dispatchTaskCopy`. Linked mode joins the copy to a Project Task as `assigned`; described mode by a Task-owned sender joins it as `delegated`; **described mode by an unowned sender joins nothing** (E-21). Result `{target_agent_run_id}` (E-32).
- DONE → `ProjectTaskService.updateTask({projectId, taskId, status: DONE})` → `TaskAgentResourceService.closeTask` → write status → exact-root release; roots publish `closed_task_executions` and the web tree hides those rows (E-05, E-24).
- Tasks exist only at `<appData>/projects/<projectId>/tasks/<taskId>/`; lookups by ID go through the Projects migration gate (E-19, E-25).
- `create_or_update_task` requires `project_id` (E-14, E-31) and is opt-in per agent definition (E-30).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: spans six server subsystems (collaborators/`@` admission in three root families, task-delegation runtime, Projects Task service and stores, agent tool contracts and automatic exposure, run-history delete owners, shared LLM prompt contract) plus the presentation-contracts note wording and docs in server and web. Roughly 20–25 production files modified/added, with tests in each area.
- Architectural risk: `High`
- Risk rationale: changes two public tool contracts (`delegate_task` result, `create_or_update_task` update mode — breaking for callers that send `project_id`), adds a new persisted root (`<appData>/ad-hoc-tasks/`), widens the Task port contract, changes which runs become Task-owned (message-scope rules now apply to delegated copies), changes automatic tool exposure on every runtime, and adds a new dependency direction (run-history delete owners → Projects).
- Escalation trigger: return a Design Impact if implementation finds (a) a runtime whose tool exposure does not flow from `automaticCollaborationToolNames`, (b) a caller of `admitCollaboratorMentions`/`ensure` for `@` not listed in E-29, (c) a delegate path that bypasses `RootTaskExecutionLifecycle.delegate()`, or (d) web code that depends on `collaborator_added` for an `@` send beyond tree display.

## Architecture Investigation Evidence

See investigation-notes E-11..E-13, E-17..E-36. Key: E-21 (the unlinked branch), E-22/E-33 (port and returned taskId), E-23 (single resource authority), E-25 (migration gate), E-28/E-29 (`@` admission), E-30 (automatic tool owner), E-34 (delete owners), E-35 (composition).

## Intended Change

1. `@` resolves mentioned definitions to name/kind/address **without admission**; the note tells the agent to `delegate_task`.
2. A described `delegate_task` from an unowned sender creates an **ad-hoc Task** (no Project, text only) and links the copy to it as `assigned`, in the same link step that already exists; the result returns `task_id`.
3. The Task side gains ad-hoc Task storage at `<appData>/ad-hoc-tasks/<taskId>/`, reusing the one resource authority and the one DONE path.
4. `create_or_update_task` has strict create (`project_id` + description) and update (`task_id` only) modes; update works for Project and ad-hoc Tasks.
5. `create_or_update_task` becomes an automatic tool wherever `delegate_task` is.
6. Permanent run delete also deletes that run's ad-hoc Tasks.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior / REQ | Trigger | Target production path | Lifecycle boundary | Spine |
| --- | --- | --- | --- | --- |
| BEH-001/002, REQ-001/002 | User send with `mentions` | Stream handler → root `resolveCollaboratorMentions` → `CollaboratorAdmission.resolveMentions` (no write) → `composeCollaboratorMentionNote` (new guidance) → post to focused agent | Root operation gate (unchanged) | DS-001 |
| BEH-003, REQ-003/004/013 | Agent calls `delegate_task({recipient_address, description, reference_files?})` | `delegate()` → join `{role: assigned, adHocTask}` → `dispatchTaskCopy` → `port.linkAgentRun` → `ProjectTaskService` creates ad-hoc Task + links → activation → result `{target_agent_run_id, task_id}` | Link before resources (unchanged) | DS-002 |
| BEH-004/005, REQ-005/006 | Agent calls `create_or_update_task({task_id, status: DONE})` | Tool parser (update mode) → `ProjectTaskService.updateTaskById` → resolve location (ad-hoc first, then Projects) → shared DONE closure → release → roots publish `task_executions_closed` → web hides rows | Task serialization (unchanged) | DS-003, DS-005 |
| BEH-006, REQ-007 | Any run start/restore with a member context | `automaticCollaborationToolNames` adds `create_or_update_task` → `enabledProjectTaskToolNames` on every runtime | Runtime projection | DS-004 |
| BEH-008, REQ-008/009 | Permanent run delete | delete owner → on success `ProjectTaskService.deleteAdHocTasksHostedBy(root)` | After the run delete committed | DS-006 |
| BEH-007, REQ-010 | Task-owned agent delegates by description | Unchanged `delegated` join; no `task_id` | — | DS-002 (branch) |
| BEH-009, REQ-011 | Stored run reopened | Unchanged collaborator restore | — | — |
| REQ-012 | Projects migration pending | Ad-hoc creation/lookup/DONE never call `ProjectStore` (gated); Project lookup only on ad-hoc miss | — | DS-002, DS-003 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Current design issue found: `Yes`
- Structural triggers: *Ambiguous-boundary* — `updateTask` with `{projectId, taskId}` is the only Task update identity; an ID-only update must be a separate explicit boundary, not an optional field. *Capability-area reuse* — closure, stop, hiding and fencing already exist in the Task resource authority; no second closing mechanism. *Shared-base overreach* — an ad-hoc Task must not be a `ProjectTask` with optional fields; it gets its own tight record. *Persisted-data transition* — new root, additive.
- Root cause classification: `Missing Invariant` — "every delegated copy belongs to something that can be closed" is enforced for linked and Task-owned delegation but not for described delegation by unowned senders (E-21); `@` additionally creates entries that have no lifecycle end (E-03).
- Refactor needed now: `Yes` (bounded)
- Evidence: E-21, E-23, E-24, E-28, E-31.
- Design response: close the missing branch in the existing `delegate()`; extend the existing Task resource authority with a second storage location; split the Task update boundary by identity shape; replace `@` admission with resolution.
- Refactor rationale: reuse keeps one DONE authority (DESIGN.md rule 5: bounded change to the existing owner).
- Intentional deferrals and residual risk: agent-initiated collaborator bring-in (`send_message_to` to a catalog address by an **unowned** sender) still writes permanent collaborators (out of scope by approval).

## Terminology

- **Ad-hoc Task**: a Task with no Project, created only by described `delegate_task`, stored under `<appData>/ad-hoc-tasks/`. Text only.
- **Task location**: `{ projectId: string | null; taskId }` — `null` means ad-hoc.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Removed: the `@` → `collaborators.ensure(...)` path in the three roots; `project_id` in `create_or_update_task` update mode (no "ignore extra project_id" fallback); the "must match" idea from SR-001 is not implemented.
- Kept on purpose (not legacy): `CollaboratorAdmission.ensure`/`bringInAt` (still the in-scope-excluded agent bring-in); the parser's recognition of older note guidance lines (display of saved messages, not a runtime path).

## Persisted Data / State Transition Decision (Mandatory)

- Stored subjects: (1) new `<appData>/ad-hoc-tasks/<taskId>/{task.json, agent_run_resources.json}`; (2) existing Project Task files, run trees, collaborator entries — unchanged.
- Code-model change: `TaskAgentResourceLocation.projectId` becomes `string | null`; the resource file format is unchanged.
- Normal reader/writer: existing JSON read/update helpers with per-file lock (`persistence/file/store-utils.ts`).
- Decision: `Not Affected` for existing data; the new root is additive and starts empty. No migration.
- Data Migration Guideline §2: (1) Need: none — additive. (2) Availability: startup and new work never depend on the new root; a missing root = no ad-hoc Tasks. (3) Source/target: no released source shape. (4) Disposition: N/A. (5) Commit: existing atomic per-file writer. (6) Current-only boundary: no legacy reading. (7) Cost: startup `load()` adds one directory listing of `ad-hoc-tasks/`. (8) References: `agent_run_resources.json.hostRoot` → run identity; validated as today. (9) Evidence: AC-003, AC-008, AC-010, AC-013 tests. (10) Lessons: avoided migration and gates; ad-hoc root kept outside the Projects gate.
- Damaged ad-hoc `agent_run_resources.json`: handled exactly as Project Task files today (damaged set; non-fatal).

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Governing owner | Why |
| --- | --- | --- | --- | --- | --- |
| DS-001 | `@` send | Composer SEND_MESSAGE with `mentions` | Message with note posted to focused agent | Root (gate) + `CollaboratorAdmission.resolveMentions` | REQ-001/002 |
| DS-002 | Described delegation | `delegate_task` tool call | Copy started; result with `task_id` | `RootTaskExecutionLifecycle` → `ProjectTaskService` (link) | REQ-003/004/010/013 |
| DS-003 | DONE by ID | `create_or_update_task({task_id, status})` | Task closed, runs stopped | `ProjectTaskService` → `TaskAgentResourceService` | REQ-005/006 |
| DS-004 | Tool exposure | Run start/restore | Tool available on runtime | `automaticCollaborationToolNames` | REQ-007 |
| DS-005 | Closure publication (return/event) | Committed close | Rows hidden live and after reopen | Root `RootTaskAgentResourceScope` (unchanged) | REQ-006 |
| DS-006 | Retention | Permanent run delete | Ad-hoc Tasks of that run removed | Run delete owner → `ProjectTaskService` | REQ-009 |

## Primary Execution Spine(s)

- DS-001: `Composer → Stream handler (Team/Org/collaboration stream) or AgentRunCommandCoordinator.post → StandaloneAgentRunRoot.postUserMessage → StandaloneRootMessageDelivery.postToHost (standalone host) → Root.resolveCollaboratorMentions (gate) → CollaboratorAdmission.resolveMentions → composeCollaboratorMentionNote → Focused agent input`
- DS-002: `Agent tool call → TaskDelegationToolService → RootTaskExecutionLifecycle.delegate → dispatchTaskCopy → TaskAgentResourcePort.linkAgentRun → ProjectTaskService (create ad-hoc Task + link) → activation/seed → result {target_agent_run_id, task_id} (task_id only when the link created an ad-hoc Task)`
- DS-003: `Agent tool call → parseProjectTaskToolInput (update mode) → ProjectTaskService.updateTaskById → TaskLocation resolve → TaskAgentResourceService.closeTask → status write → TaskAgentResourceRelease → root stop`

## Spine Narratives (Mandatory)

- **DS-001.** The root still validates every mention with the shared candidate policy inside its gate, then asks `CollaboratorAdmission.resolveMentions(port, mentions)` for each definition's name, kind and address. That is the same address `plan()` computes today: an in-run address when the definition is already in the run, otherwise the catalog address. Nothing is allocated, written or published. An ineligible mention still returns `COLLABORATOR_ADD_FAILED` with the name, so the web's existing failure notice and held-send behavior keep working unchanged. The caller composes the note with the new guidance and posts the message. There are two entries that must both switch: the stream handlers (Team, Org, collaboration stream), and the standalone host path `AgentRunCommandCoordinator.post → StandaloneAgentRunRoot.postUserMessage → StandaloneRootMessageDelivery.postToHost → admitMentions` (renamed `resolveMentions` there) (R-2).
- **DS-002.** `delegate()` keeps its strict two input modes. In the described branch, when the sender is unowned, the join becomes `{role: "assigned", assignedBy: sender, adHocTask: {description, referenceFiles}}`. `dispatchTaskCopy` already links after identity planning and before resources. `linkAgentRun` now returns the `taskId` of the created ad-hoc Task, and the dispatch carries it into the accepted result. Validation and planning failures happen before the link, so they create no Task. A failure after the link keeps today's semantics: the entry is recorded `failed`, the result has `target_agent_run_id: null` and no `task_id`, and the ad-hoc Task stays with a failed assignment until its run is deleted. A Task-owned sender is unchanged (`delegated`, no `task_id`). **Linked mode is unchanged (AC-014):** `resolveAssignment` stays Project-Task-only, so an ad-hoc ID passed as `task_id` fails with today's `TASK_NOT_FOUND`, and the linked result stays `{target_agent_run_id}`. `dispatchTaskCopy` adds `task_id` to the accepted result only when the link created an ad-hoc Task (the port signals this; see Interface Boundary Mapping), not for every `assigned` join (AR-001).
- **DS-003.** The tool parser has two strict modes. Create: `{project_id, description}`, with no `task_id` or `status`. Update: `{task_id, status?, description?}`, where `project_id` is rejected. The manifest calls `createTask` or `updateTaskById`. `updateTaskById` resolves the location. It first does a direct path read of `ad-hoc-tasks/<taskId>/task.json`, with no scan and no gate. On a miss it falls back to the existing Projects `findTask`, which is gated. Then it applies the shared patch: DONE closes via `closeTask(location)`, writes the status through the location's store, and releases. The UI's `updateTask({projectId, taskId, contextChanges})` stays the Project-only boundary.
- **DS-005.** Unchanged. `closedAgentRunsIn(hostRoot)` includes ad-hoc closures because they live in the same in-memory view.
- **DS-006.** After a successful permanent delete, each family's delete owner calls `ProjectTaskService.deleteAdHocTasksHostedBy(rootIdentity)`. That call uses the in-memory view (ad-hoc Task IDs whose entries name that host root), so there is no disk scan. It removes each folder and drops it from the view. Failures are logged and never fail the run delete. **Invariant (AR-001 / MP-001):** every entry of an ad-hoc Task has the delegator's host root. This holds by construction because only described delegation creates and assigns to an ad-hoc Task, linked delegation cannot target one, and its `delegated`/`broughtIn` sub-work links with the same `target.root`. Deleting the whole folder therefore never removes another root's closed entries.

## Spine Actors / Main-Line Nodes

Stream handlers (unchanged role); Root (`StandaloneAgentRunRoot` / `RootTeamRun` / `AgentOrgRun`) own the gate; `CollaboratorAdmission` owns mention resolution policy; `RootTaskExecutionLifecycle` owns delegation input modes and join choice; `ProjectTaskService` owns Task records (Project and ad-hoc), DONE orchestration and the port; `TaskAgentResourceService` owns run-resource files and the view; delete owners own permanent delete.

## Ownership Map

| Owner | Owns (new or changed) |
| --- | --- |
| `CollaboratorAdmission` | `resolveMentions` (eligibility + address, no write) |
| Three roots | `resolveCollaboratorMentions` replacing `admitCollaboratorMentions` |
| `RootTaskExecutionLifecycle` | join choice for unowned described delegation |
| `dispatchTaskCopy` | carrying the created ad-hoc `taskId` into the accepted result (only for an `adHocTask` join) |
| `ProjectTaskService` | ad-hoc Task creation inside `linkAgentRun`; `updateTaskById`; location resolution; `deleteAdHocTasksHostedBy`; `resolveAssignment` unchanged (Project Tasks only) |
| `AdHocTaskStore` (new) | `ad-hoc-tasks/<taskId>/task.json` read/create/update/delete |
| `AdHocTasksLayout` (new) | path ownership of `<appData>/ad-hoc-tasks/` |
| `TaskAgentResourceStore` | file path + enumeration for both roots |
| `TaskAgentResourceService` | location with `projectId: null`; `adHocTaskIdsHostedBy`; `forget` |
| `automaticCollaborationToolNames` | adds `create_or_update_task` |
| Tool contract/manifest | strict two-mode `create_or_update_task` |
| LLM contract | `delegate_task` description + shared prompt text about `task_id` and DONE |
| Presentation contracts | new note guidance; earlier guidance still parsed |

## Thin Entry Facades / Public Wrappers

None added.

## Removal / Decommission Plan (Mandatory)

- Remove `admitCollaboratorMentions` (three roots) and the `admitMentions` delivery methods that call `collaborators.ensure`; replace with `resolveCollaboratorMentions`.
- Remove `project_id` from the `create_or_update_task` update path in parser, schema description and manifest.
- Remove tests asserting that `@` writes a collaborator entry or emits `collaborator_added`; replace with resolution/no-write tests.
- Web probes `tests/e2e/cross-scope-agent-mentions-live-probe.mjs` (and any spec asserting a collaborator row after `@`) must be updated to the new outcome.

## Return Or Event Spine(s)

DS-005 (unchanged mechanism): `closeTask commit → TaskAgentResourceRelease → root releaseTaskAgentResources → task_executions_closed / TASK_EXECUTIONS_CLOSED → web tree filter`.

## Bounded Local / Internal Spines

`ProjectTaskService` DONE closure (shared by both Task kinds): `serialize(taskId) → close entries (file lock) → swap view → write status via location store → release closed runs by host root`. Matches current `updateTask` DONE branch; extracted so Project and ad-hoc updates share it.

## Off-Spine Concerns Around The Spine

- `AdHocTasksLayout` (path safety, reuses `isSafeSegment`/segment encoding from `projects-layout.ts`).
- `AdHocTaskStore` (persistence for `ProjectTaskService`).
- Note wording in `@autobyteus/agent-presentation-contracts`.

## Ownership Boundaries

- Runtime never stores Task facts; it passes `adHocTask` content to the port and receives an opaque `taskId` (port contract kept).
- Tools and GraphQL depend on `ProjectTaskService` only, never on stores.
- Delete owners depend on `ProjectTaskService.deleteAdHocTasksHostedBy` only.

## Boundary Encapsulation Map

| Caller | Allowed boundary | Forbidden |
| --- | --- | --- |
| Stream handlers | Root `resolveCollaboratorMentions` | `CollaboratorAdmission` directly |
| `RootTaskExecutionLifecycle` / dispatch | `TaskAgentResourcePort` | `ProjectTaskService`/stores |
| Project task tool manifest | `ProjectTaskService` | `AdHocTaskStore`, `TaskAgentResourceService` |
| Run delete owners | `ProjectTaskService.deleteAdHocTasksHostedBy` | stores, layouts |
| `ProjectTaskService` | `ProjectStore`, `AdHocTaskStore`, `TaskAgentResourceService` | — |

## Dependency Rules

- New allowed: `run-history` delete services and `agent-org-execution` delete service → `projects/services/project-task-service.ts` (getter). `projects/` must not import `run-history`.
- `agent-collaboration` keeps depending only on the neutral port.
- `AdHocTaskStore` never touches `ProjectsLayout`'s root; `ProjectStore` never sees ad-hoc tasks.

## Interface Boundary Mapping

| Interface | Subject / identity | Shape |
| --- | --- | --- |
| `CollaboratorAdmission.resolveMentions(port, mentions)` | mentioned definitions | → `CollaboratorAdmissionResult` (admitted with `MentionedCollaborator[]` or `COLLABORATOR_ADD_FAILED`) |
| Root `resolveCollaboratorMentions({focusedAgentRunId, mentions})` | one root | → `RootCollaboratorAdmissionResult` (unchanged type) |
| `TaskAgentResourceLinkInput` | link | assigned variant: `{role: "assigned"; assignedBy} & ({taskId} \| {adHocTask: {description; referenceFiles}})` |
| `TaskAgentResourcePort.linkAgentRun` | link | → `{taskId}` (unchanged shape); for an `adHocTask` link it is the new ad-hoc Task's ID, which dispatch returns as `task_id`. The join variant itself (not the returned value) decides whether `task_id` is returned. |
| `DelegateTaskResult` | spawn result | `{target_agent_run_id: string; task_id?: string}` \| `{target_agent_run_id: null; message}`; `task_id` present only when the delegation created an ad-hoc Task (described mode, unowned sender) |
| `ProjectTaskService.updateTaskById({taskId, description?, status?})` | Task by unique ID | → `TaskAcknowledgementView` `{taskId, projectId: string \| null, status}` |
| `ProjectTaskService.updateTask({projectId, taskId, ..., contextChanges?})` | Project Task (UI) | unchanged |
| `ProjectTaskService.deleteAdHocTasksHostedBy(hostRoot)` | host root | → void (best effort, logged) |
| `create_or_update_task` tool | create: `{project_id, description}`; update: `{task_id, status?, description?}` | ack `{task: {projectId \| null, taskId, status}}` |

## Interface Boundary Check

Task update is split by identity shape (UI: compound Project+Task; tool: unique Task ID). Delegation result adds one field with one meaning ("the ad-hoc Task this delegation created"). No generic selector introduced.

## Main Domain Subject Naming Check

"Ad-hoc Task" (code: `AdHocTask`, folder `ad-hoc-tasks`, ID prefix `ad_hoc_task_<uuid>`); "resolve mentions" (not "admit") because nothing is admitted.

## Existing Capability / Subsystem Reuse Check

Reused: `TaskAgentResourceService` (closure, view, damaged set, closed-runs index), `TaskAgentResourceRelease`, `dispatchTaskCopy` link-before-resources, `CollaboratorAdmission.plan` address logic, `automaticCollaborationToolNames`, JSON store utils, `closed_task_executions` publication and web filtering. Nothing parallel is created.

## Subsystem / Capability-Area Allocation

- `autobyteus-server-ts/src/projects/` — ad-hoc Task records, layout, store, service changes.
- `autobyteus-server-ts/src/agent-collaboration/` — mention resolution, delegation join, dispatch result.
- `autobyteus-server-ts/src/{standalone-agent-run-root,agent-team-execution,agent-org-execution}/` — root mention method swap; org delete hook.
- `autobyteus-server-ts/src/run-history/services/` — agent/team delete hooks.
- `autobyteus-server-ts/src/agent-tools/project-tasks/`, `agent-execution/shared/` — tool contract and exposure.
- `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts` — wording.

## Draft File Responsibility Mapping

(Folded into Final mapping; no reusable structure beyond `TaskLocation`.)

## Reusable Owned Structures Check

- `TaskLocation = Readonly<{ projectId: string | null; taskId: string }>` in `projects/domain/` replaces `TaskAgentResourceLocation`'s `{projectId: string}` (rename/extend in place; one meaning).
- Path segment encoding: export the existing `segment`/`isSafeSegment` from `projects-layout.ts` for `AdHocTasksLayout`.

## Shared Structure / Data Model Tightness Check

- `AdHocTask` (persisted `task.json`): `{ taskId, description, referenceFiles: string[], status, createdAt, updatedAt }`. No `projectId`, no `contextFiles`, no host root (derived from run resources).
- `ProjectTask` unchanged. No shared base with optional fields.

## Final File Responsibility Mapping

| Change | File | Responsibility |
| --- | --- | --- |
| Add | `server src/projects/domain/ad-hoc-task.ts` | `AdHocTask` type, ID prefix |
| Add | `server src/projects/stores/ad-hoc-tasks-layout.ts` | `<appData>/ad-hoc-tasks/` paths |
| Add | `server src/projects/stores/ad-hoc-task-store.ts` | read/create/update/delete `task.json`; directory listing |
| Modify | `server src/projects/stores/projects-layout.ts` | export segment helpers |
| Modify | `server src/projects/stores/task-agent-resource-store.ts` | `TaskLocation`; path for `projectId: null`; `list()` enumerates both roots |
| Modify | `server src/projects/services/task-agent-resource-service.ts` | location type; `adHocTaskIdsHostedBy(hostRoot)`; `forget(location)` |
| Modify | `server src/projects/services/project-task-service.ts` | ad-hoc creation in `linkAgentRun`; `updateTaskById`; shared DONE closure; location resolve for updates (ad-hoc direct read, then Projects); `deleteAdHocTasksHostedBy`. `resolveAssignment` and the linked `uniqueTask` lookup stay Project-only |
| Modify | `server src/projects/domain/models.ts` | ack view with `projectId: string \| null` |
| Modify | `server src/compositions/project-task-agent-resource-composition.ts` | build store with both layouts |
| Modify | `server src/agent-collaboration/execution/task/task-agent-resource-port.ts` | assigned link variant with `adHocTask` |
| Modify | `server src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | unowned described join |
| Modify | `server src/agent-collaboration/execution/task/root-task-dispatch.ts` | for an `adHocTask` join only, keep the returned `taskId` and add it to the accepted result |
| Modify | `server src/agent-collaboration/execution/task/task-delegation-command.ts`, `agent-team-execution/task-delegation/task-delegation-result-contract.ts` | result type/schema with optional `task_id` |
| Modify | `server src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | `delegate_task` description + "Delegated Agents" prompt lines: a description-only delegation that creates a Task returns its `task_id`; when the work is finished, call `create_or_update_task({task_id, status: "DONE"})`, which stops the copy and removes it from the run. `DELEGATE_TASK_ID_DESCRIPTION` unchanged |
| Modify | `server src/agent-collaboration/collaborators/collaborator-admission.ts` | `resolveMentions` |
| Modify | `server src/standalone-agent-run-root/{domain/standalone-agent-run-root.ts,services/standalone-root-message-delivery.ts}`, `agent-team-execution/domain/root-team-run.ts`, `agent-org-execution/{domain/agent-org-run.ts,services/agent-org-run-message-delivery.ts}` | `resolveCollaboratorMentions` |
| Modify | `server src/services/agent-streaming/{agent-collaboration,agent-team,agent-org}-stream-handler.ts` | call renamed method |
| Modify | `server src/agent-tools/project-tasks/{project-task-tool-contract.ts,project-task-tool-manifest.ts}` | two strict modes; descriptions |
| Modify | `server src/agent-execution/shared/runtime-agent-tool-exposure.ts` | add `create_or_update_task` |
| Modify | `server src/run-history/services/{agent-run-history-catalog-service.ts,team-run-history-service.ts}`, `agent-org-execution/services/agent-org-run-service.ts` | post-delete `deleteAdHocTasksHostedBy` |
| Modify | `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts` | new conditional guidance (R-1); prior two guidance lines still parsed |
| Modify (docs) | server `docs/modules/{agent_communication,projects,agent_tools,standalone_agent_run_root,agent_team_execution}.md`; web `docs/chat.md`, `docs/projects.md` | behavior sync |

## Applied Patterns

Repository (`AdHocTaskStore`) serving `ProjectTaskService`.

## Target Subsystem / Folder / File Mapping

New files sit beside their Project counterparts in `projects/{domain,stores}/`; flat placement matches the existing folder and keeps both Task kinds visibly under one owner.

## Folder Boundary Check

No new folders in source; `projects/` remains the Task subsystem.

## Concrete Examples / Shape Guidance

New note (stored, parsed by web):

```
review this @Code Reviewer

[Mentioned collaborators]
- Code Reviewer (Agent) at /code_reviewer
Delegate the work with delegate_task to its address; it returns a run ID to follow up with. If it also returns a task_id, call create_or_update_task with that task_id and status DONE when the work is finished; this stops it and removes it from the run.
```

Delegation:

```jsonc
// call
{ "recipient_address": "/code_reviewer", "description": "Review ...", "reference_files": ["/abs/a.md"] }
// result
{ "target_agent_run_id": "run_…", "task_id": "ad_hoc_task_3f…" }
```

`<appData>/ad-hoc-tasks/ad_hoc_task_3f…/task.json`:

```json
{ "taskId": "ad_hoc_task_3f…", "description": "Review ...", "referenceFiles": ["/abs/a.md"],
  "status": "TODO", "createdAt": "…", "updatedAt": "…" }
```

Done: `create_or_update_task({ "task_id": "ad_hoc_task_3f…", "status": "DONE" })` → `{ "task": { "projectId": null, "taskId": "ad_hoc_task_3f…", "status": "DONE" } }`.

Bad shape avoided: a second "close_delegated_task" mechanism or a `closedAt` on execution-tree entries (two closure authorities).

## Backward-Compatibility Rejection Log (Mandatory)

- Rejected: accepting and ignoring `project_id` in update mode.
- Rejected: keeping `@` admission behind a flag.
- Rejected: dual Task lookup that tries both stores for ambiguity proof (UUID IDs; DESIGN.md rule 2).

## Change / Refactor Sequence

1. Projects: `TaskLocation`, ad-hoc domain/layout/store, resource store/service, `ProjectTaskService` (link with ad-hoc, `updateTaskById`, shared DONE, delete-by-host), composition. Unit + integration tests.
2. Runtime: port variant, `delegate()` join, dispatch result, result schema, LLM contract text. Integration tests (AC-003, AC-007, AC-008, AC-011, AC-013, AC-014).
3. Tools: two-mode contract/manifest; automatic exposure (AC-004..006, AC-009).
4. `@`: `resolveMentions`, root/handler swap, note wording (AC-001, AC-002, AC-012).
5. Delete hooks (AC-010).
6. Docs (server + web) and web probe updates.

## Key Tradeoffs

- Ad-hoc Task per described delegation (small text files) vs. a second closure mechanism: chose one authority.
- No runnability check at `@` time: it moves to `delegate_task`, where `catalogTaskSource` already checks it, and the agent gets the reason.
- Linked delegation stays Project-only (AR-001); ad-hoc Tasks are reachable only by update/DONE, never re-delegated.
- Mid-dispatch failure leaves an ad-hoc Task with a failed assignment (kept until its run is deleted) rather than adding rollback deletion.

## Risks

- Breaking `create_or_update_task` callers that send `project_id` with `task_id` (agent-repository Project Task Manager skill, separate repo) — needs a coordinated skill update.
- Delegated copies become Task-owned: copy-to-copy messaging across Tasks fails (approved consequence); prompts/tests that relied on it must change.
- A crash between ad-hoc `task.json` creation and the resource link leaves an orphan text file (interrupted execution; out of scope by default).

## Guidance For Implementation

- Keep the ad-hoc lookup a direct path read; do not call `ProjectStore` unless the ad-hoc read misses.
- `deleteAdHocTasksHostedBy` must only use the in-memory view and must not throw into the delete owner.
- Use the shared prompt constants for all wording; do not duplicate strings per runtime.
- Update `TESTING.md`-governed suites: server unit/integration for each AC; web probe for AC-001/AC-007 visible outcomes.
