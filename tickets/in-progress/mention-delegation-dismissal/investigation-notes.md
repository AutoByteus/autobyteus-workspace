# Investigation Notes — mention-delegation-dismissal

## Bootstrap

- Package identifier: `mention-delegation-dismissal`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-delegation-dismissal`
- Branch: `codex/mention-delegation-dismissal`
- Base: `origin/personal` @ `3c8e49ad5` (fetched 2026-10-06; local `personal` checkout was 131 commits behind and was not used)
- Finalization target: `origin/personal` (default; to be confirmed at delivery)

## Request (raw, 2026-10-06)

User wants `@` in a live run to stop producing undismissable collaborators. Proposal under
analysis: make `@` use `delegate_task` instead of `send_message_to`; have description-only
`delegate_task` create a Task internally (in a default "temp" Project when none is given),
return its `task_id`, and let the sender mark it DONE so the UI hides the copy — the way
saved-Task delegation works today. User explicitly asked for analysis of whether this is a good idea.

## Source Log (evidence)

| ID | Source | Observation |
| --- | --- | --- |
| E-01 | `autobyteus-web/docs/chat.md` "`@` In A Live Run" | Choosing `@Name` sends `mentions` with SEND_MESSAGE; **the server adds the collaborator on send** (before the agent acts) and appends a `[Mentioned collaborators]` note. |
| E-02 | `autobyteus-server-ts/docs/modules/agent_communication.md` §Collaborators | `CollaboratorAdmission.ensure` writes a root-level `collaborators` entry, allocates run IDs and publishes the execution (Offline). One instance per collaborator, reused by later `@` and `send_message_to`. Shared by `@` and an agent's first `send_message_to` to a catalog address. |
| E-03 | grep `removeCollaborator|dismissCollaborator|collaborator_removed` across server src + web | **No match.** There is no removal/dismiss path for a collaborator entry. |
| E-04 | `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts` | Note guidance already tells the agent: "Message a collaborator with send_message_to …; delegate_task to its address spawns a new copy instead". Because admission (E-01) already wrote the entry, the row exists even if the agent then uses `delegate_task`. |
| E-05 | `agent_communication.md` "Task closure (DONE)" | Roots expose `closed_task_executions` = task executions whose **Project Task** is DONE, via Task port `closedAgentRunsIn`. Workspaces tree hides them; messages/contexts kept. |
| E-06 | `server src/.../task-agent-resource-port.ts`, `projects/services/task-agent-resource-service.ts` | `closedAgentRunsIn` is implemented only by the Projects Task resource service. Description-only `delegate_task` copies have **no closure path** — they also stay in the tree forever. |
| E-07 | `server docs/modules/projects.md` §Scope, §Saved-ID Delegation | "A Project Task is a business record, not an execution child." `delegate_task` has two strict modes (description vs `task_id` only). DONE closes runs **forever** (no new input, wake or restore). Task-owned workers may not delegate with `task_id` (`TASK_AGENT_RESOURCE_OWNED_SENDER`); their sub-work is recorded as `delegated`/`broughtIn` under the owning Task. |
| E-08 | `projects.md` §Exactly Four Agent Tools; §Scope | `create_or_update_task` (the only way to set DONE) is an opt-in tool that must be selected per agent definition. `ENABLE_PROJECTS` is a default-off web visibility flag. |
| E-09 | `agent_communication.md` §Runtime Projection | Team members automatically get `get_handoff_rules`, `send_message_to`, `delegate_task`; standalone runs need explicit config. Project tools are not auto-exposed. |
| E-10 | worktree `remove-built-in-project-task-manager` (Approved SR-001, 2026-10-06) | Removes only the built-in PTM agent; Projects/Tasks/tools unchanged. No conflict with this request. |

## Analysis Of The Proposal

Facts that bear directly on it:

1. Switching `@` guidance to `delegate_task` alone does not remove the problem: admission writes the
   collaborator entry at send time (E-01, E-04), and description-only copies cannot be closed either (E-06).
2. The closure the user observed exists only because a Project Task is DONE (E-05, E-06).

Risks of "auto-create a Task in a temp Project for every description-only delegation":

- R-1 Model conflict: turns every agent-to-agent delegation (including team workflows and worker
  sub-work) into a Project business record, contradicting E-07; the temp Project would accumulate
  one Task per delegation, invisible when `ENABLE_PROJECTS` is off (E-08).
- R-2 Ownership conflict: Task-owned workers already delegate without `task_id`, and their sub-work
  is owned by the parent Task (E-07). Auto-Tasks for that sub-work would create a second owner.
- R-3 Capability gap: DONE needs `create_or_update_task`, which most agents do not have (E-08, E-09).
- R-4 Control gap: dismissal would depend on the agent remembering to mark DONE; the user's stated
  need is to dismiss from the UI themselves.
- R-5 Behavior change for `@`: today one reusable instance keeps conversation continuity; per-mention
  copies would lose context on each follow-up `@`.

Candidate alternative (to be confirmed with user): an execution-level, user-initiated **Dismiss**
for collaborator rows and description-only task rows, recorded by the root (like
`closed_task_executions`) — independent of Projects.

## Round 2 (user reply, 2026-10-06)

User decision: drop the temp-Project idea for now. `@` should lead to `delegate_task`, not a
collaborator, so the delegating agent can later mark the delegated work done. Open user question:
does `delegate_task` need to store anything / return a task ID, and where, without a Project?

Additional evidence:

| ID | Source | Observation |
| --- | --- | --- |
| E-11 | `server src/run-history/domain/run-execution-tree-shared-records.ts` (`TaskAgentExecution`, `TaskTeamExecution`) | Every `delegate_task` copy is **already persisted** in the root's execution tree: `address`, `agentRunId`/`teamRunId`, `delegatorAgentRunId`, `startedAt`, optional `source`. There is no closed field. |
| E-12 | `server docs/modules/agent_team_execution.md` §Delegated Child Lifecycle | Delegated copies are execution resources, separate from business Tasks; idle shutdown and wake-on-message by run ID exist; closure today only comes from a Project Task record. |
| E-13 | `server docs/modules/agent_tools.md` | `delegate_task` already returns `target_agent_run_id` (the copy's ingress AgentRun; for a Team copy, its coordinator). |

Conclusion for the user question: closure state must be persisted (the row must stay hidden and the
copy must stay closed after restart/reopen), but no new store or Project is needed. The existing
task-execution record in the execution tree can carry a `closedAt`, and the run ID that
`delegate_task` already returns can serve as the handle for closing it.

## Round 3 (user reply, 2026-10-06)

User proposal: `delegate_task` returns a task ID; delegator calls existing `create_or_update_task` with DONE to
reuse the Project closure.

| ID | Source | Observation |
| --- | --- | --- |
| E-14 | `server src/agent-tools/project-tasks/project-task-tool-contract.ts:32` | `create_or_update_task` declares `project_id` as **required**; a Task only exists inside a Project. Reusing it therefore requires a Project to hold auto-created Tasks (the deferred temp Project). |
| E-15 | `server src/agent-collaboration/execution/task/task-execution-closure.ts`, `root-task-agent-resource-scope.ts` | Hiding uses `listClosedTaskExecutions({port, root, contains})` over a port; the web reads `closed_task_executions` regardless of the source. A second closure source (delegation record) could feed the same list. |
| E-16 | `server docs/modules/standalone_agent_run_root.md:22` | An eligible standalone host always has `send_message_to` and `delegate_task` from its first turn, so `@` → `delegate_task` is available in standalone runs too. |

Recorded as DEC-001 in requirements-doc.md.

## Round 4 (user reply, 2026-10-06)

User position: Task IDs are unique across Projects, so `create_or_update_task` should not require `project_id`; a
Task may belong to a Project or be a temporary (Project-less) Task, e.g. one created by `delegate_task`.

| ID | Source | Observation |
| --- | --- | --- |
| E-17 | `server src/projects/services/project-task-service.ts:73` | New Task IDs are `project_task_<randomUUID>`, so they are unique in practice. |
| E-18 | `project-task-service.ts:195-200` `uniqueTask`, `project-store.ts:89` `findTask` | Linked `delegate_task(task_id)` **already** finds a Task by ID alone across all Projects; `TASK_ID_AMBIGUOUS` is only a defensive guard (e.g. copied folders). The user's point holds for updates: requiring `project_id` to patch a Task is an unnecessary restriction. |
| E-19 | `server docs/modules/projects.md` §Persistence Layout; `task-agent-resource-store.ts:25-38` | Storage is `projects/<projectId>/tasks/<taskId>/` (task.json carries `projectId`); a Task is listed only under a valid Project; the run-resource scan walks Project folders only. A Project-less Task therefore needs a new storage home (e.g. `<appDataDir>/tasks/<taskId>/`), and `findTask` / the resource scan / closure must include it. Additive; no migration of existing data. |
| E-20 | `projects.md` §No lockout | While the Projects migration is pending, Projects operations reject with `PROJECTS_MIGRATION_PENDING`. If described delegation starts creating a Task, delegation must not inherit that lockout. Design constraint. |

Assessment: Option C (Project-less Task created by described `delegate_task`, closed with
`create_or_update_task(task_id, status: DONE)` without `project_id`) reuses the existing assignment, DONE, stop,
restart fencing and tree-hiding paths end to end, and needs no temp Project. Remaining concerns: tool access
(`create_or_update_task` is opt-in), Task-owned workers' sub-work (already owned by the parent Task), retention of
Project-less Tasks, and the migration lockout (E-20).

## Round 7 — Architecture feasibility (user asked how it will be designed; pre-approval)

| ID | Source | Observation |
| --- | --- | --- |
| E-21 | `agent-collaboration/execution/task/root-task-execution-lifecycle.ts:82-117` `delegate()` | One entry point for both modes. Linked: `resolveAssignment(taskId)` then `join = {role: "assigned", taskId, assignedBy}`. Described + Task-owned sender: `join = {role: "delegated", creator}`. **Described + unowned sender: no `join`** — the copy is linked to nothing; this is the gap. `dispatchTaskCopy` links `join` before resources (`root-task-dispatch.ts:41`). |
| E-22 | `agent-collaboration/execution/task/task-agent-resource-port.ts` | Neutral runtime↔Task port (`resolveAssignment`, `linkAgentRun`, `markStarted/Failed`, `ownerOf`, `isOpen`, `closedAgentRunsIn`, ...). Runtime treats `taskId` as opaque. |
| E-23 | `projects/services/task-agent-resource-service.ts` | Sole authority over every `agent_run_resources.json` and the in-memory view (run→Task owners, closed runs per host root, damaged set). Locations are `{projectId, taskId}`; `TaskAgentResourceStore.list()` walks only `projects/<p>/tasks/<t>/`. |
| E-24 | `projects/services/project-task-service.ts` `updateTask` | DONE path = `resources.closeTask(location)` → write status → `release.release(taskId, closedByHostRoot)`. Requires `assertOwner(projectId, taskId)` today. |
| E-25 | `projects/stores/project-store.ts:89,212` | `findTask` calls `listProjects()`, which throws `PROJECTS_MIGRATION_PENDING` while `projects.json` exists. A Project-less lookup must not go through this gate (REQ-012). |
| E-26 | `projects/stores/projects-layout.ts` | Single path owner for `<appData>/projects/`; any valid encoded folder there is a Project candidate, so Project-less Tasks must not live inside that root. |

Feasible design shape (to be confirmed in design-spec after approval):
- Storage: new root `<appData>/ad-hoc-tasks/<taskId>/{task.json, agent_run_resources.json}` (name per user round 10; kebab-case matches existing app-data roots `agent-packages`, `memory-sync`, `remote-access`); `task.json` has `projectId: null`, description, status, timestamps, no context files.
- Task ID: same opaque generator family (e.g. `task_<uuid>`); lookup by direct path first, then Projects.
- Run resources: same file format and the same `TaskAgentResourceService` (location gains `projectId: string | null`; store `list()` also walks the new root). No second authority.
- Runtime: in `delegate()`, described + unowned → new port call creates the Project-less Task, then `join = {role: "assigned", ...}`; result adds `task_id`.
- DONE: `updateTask` resolves location by `task_id` alone, then the unchanged close → status → release path; roots already publish `task_executions_closed`.

Behavior consequence found (must be shown to user): a copy linked to a Project-less Task becomes **Task-owned**, so existing
Task rules apply to it: (a) its `send_message_to` to an agent not in the run creates a Task-owned helper (closed on DONE)
instead of a permanent collaborator — desirable; (b) two copies owned by different Tasks cannot message each other by run
ID (`TASK_AGENT_RESOURCE_CONFLICT`), whereas today two unowned copies can; messages to/from the delegator and configured
members still work (agent_communication.md §Task-linked message scope).

## Round 9 — Task attachments (user question)

| ID | Source | Observation |
| --- | --- | --- |
| E-27 | `projects/context/project-task-context-store.ts:98` `savedFile`; `agent-collaboration/execution/task/task-execution-input.ts:30` `buildTaskAssigneeWorkPacket` | Files uploaded in the Task editor are stored once under `projects/<p>/tasks/<t>/context/` (an upload must land on the server). Saved-Task delegation does **not** copy them: `resolveAssignment` returns the absolute paths of those saved files, and the work packet lists them as text lines under "Reference files:". Description-mode `reference_files` are listed the same way. The projects.md phrase "snapshots its saved description and context bytes" overstates this; only paths are passed. |

## Round 11 — Architecture investigation (after SR-003 approval)

| ID | Source | Observation |
| --- | --- | --- |
| E-28 | `agent-collaboration/collaborators/collaborator-admission.ts` | `ensure()` = plan + runnability + allocate + `addEntries` (tree write, `collaborator_added`). `plan()` already resolves every mention's address **without writing** (reuses an in-run entry address, else `CatalogAddressMap.addressFor`). `catalogTaskSource()` re-checks runnability at delegation time. |
| E-29 | `standalone-root-message-delivery.ts:67`, `agent-team-execution/domain/root-team-run.ts:275`, `agent-org-execution/services/agent-org-run-message-delivery.ts:52`; stream handlers `agent-collaboration-stream-handler.ts:132`, `agent-team-stream-handler.ts:177`, `agent-org-stream-handler.ts:128` | The three `@` paths call `collaborators.ensure(...)` and then compose the note from `admission.collaborators`. `ensure`/`bringInAt` remain the agent-initiated bring-in path (out of scope). |
| E-30 | `agent-execution/shared/runtime-agent-tool-exposure.ts:19-25` `automaticCollaborationToolNames` | Single owner of automatic tools (`send_message_to`, `delegate_task`, + `get_handoff_rules` for team-scoped). `enabledProjectTaskToolNames` is derived from the same requested list and consumed by AutoByteus, Claude (`claude-session-tooling-options.ts`) and Codex/MCP (`agent-tool-mcp-session-registry.ts:102`). |
| E-31 | `agent-tools/project-tasks/project-task-tool-contract.ts`, `project-task-tool-manifest.ts` | Parser requires `project_id` for every Task tool; manifest calls `updateTask({projectId, taskId, ...})` or `createTask`. Ack = `{projectId, taskId, status}`. |
| E-32 | `agent-team-execution/task-delegation/task-delegation-result-contract.ts`; `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts:40-118` | Result schema is strict `{target_agent_run_id}` / `{target_agent_run_id: null, message}`. `DELEGATE_TASK_LLM_DESCRIPTION` and the shared "Delegated Agents" prompt section are the single source of tool/prompt wording on every runtime. |
| E-33 | `root-task-dispatch.ts:41` | `linkAgentRun` already returns `{taskId}`; dispatch currently discards it. |
| E-34 | delete owners: `run-history/services/agent-run-history-catalog-service.ts:295` `deleteRun`, `run-history/services/team-run-history-service.ts:81` `deleteStoredTeamRun`, `agent-org-execution/services/agent-org-run-service.ts:180` `deleteStoredRun`; each has exactly one caller (GraphQL mutation) | Permanent delete owners per root family. No current dependency from these on `projects/`. |
| E-35 | `compositions/project-task-agent-resource-composition.ts` | Single binding point of Projects ↔ runtime: builds `TaskAgentResourceService` over `ProjectsLayout(<appData>/projects)`, loads once, initializes the Task service with the exact-root stop request. |
| E-36 | `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2 | Checklist answered in design-spec (additive new root, no migration). |

## Open Questions

- Q-1 Should dismiss be permanent ("closed forever", like DONE) or should a later `@` of the same
  definition be allowed to bring in a fresh instance? (Recommendation: dismiss closes that instance
  forever; the definition becomes offerable again so a new `@` brings a fresh one.)
- Q-2 Should agents also be able to dismiss (tool), or only the user via UI in the first round?
- Q-3 Dismiss on a running instance: stop it immediately, or only allow when idle?
