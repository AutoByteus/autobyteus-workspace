# Projects

## Scope And Ownership

Projects are durable, node-local work containers. Each has a unique name, an
optional string description, and described links to registered filesystem
workspaces. It also holds Project Tasks, each with a description, a business
status and optional Task-owned context files. Manual authoring and four
selected agent tools use the same services. Status is read-only in the web UI
and writable by the tools.

A Project Task is a **business record**, not an execution child. Saved-ID
delegation starts fresh Agent/Team copies for a Task. The Task side alone
records which agent runs were started for it, as the Task's **agent run
resources**. Execution trees (Team, Org and standalone run history) carry **no
Task information**: they record runs, nesting, creator and source only.

The Task subject also has **Tasks with no Project** (ad-hoc Tasks): a
description-only `delegate_task` from an agent that is not working on a Task
creates one for its copy, so every delegated copy can be closed. They are
execution helpers, not Project work, and are never listed under a Project (see
[Tasks With No Project](#tasks-with-no-project-ad-hoc)).

The Task service owns business status and the agent run resource records. The
shared root lifecycle and runtime owners perform dispatch, admission and exact
release. Explicit `DONE` closes every open agent run resource of the Task, then
asks the runtime to stop exactly those runs. DONE is neither engineering
acceptance nor proof that the stop succeeded. Other status writes do not start
work. Only agents change a Task's status; the run that assigned closed work can
later reactivate it (see [Reactivation](#reactivation)).

The server ships no Project manager agent. Any Agent whose definition selects
the Project tools can manage Projects through the existing Chat or `@`, for
example the agent repository's **Project Task Manager** (`project-task-manager`,
with its `project-task-management` skill) when that repository is configured as
an agent package root. A managing Agent typically selects the four Project/Task
tools plus `list_available_agents`, `delegate_task` and `send_message_to`. It
is not a Project-page panel or a scheduler. This feature does not guarantee
worker completion reports, automatic DONE, scheduling, or a worker self-update
convention.

Earlier builds shipped a built-in Project Task Manager. It is retired, and
startup migration `20261006_remove_built_in_project_task_manager` removes its
installed copy (see the server README).

`ENABLE_PROJECTS` is a default-off, per-node **web visibility** flag. It does
not gate backend CRUD or tool authorization. Unset values initialize to false,
and persisted values are authoritative. Disabling it keeps all metadata and
files. The existing shared boolean setting accessor is unchanged. Tools must be
selected explicitly in the agent definition, independently of the UI flag,
except `create_or_update_task`, which every agent with `delegate_task` gets
automatically.

## Main Owners

- `src/projects/domain/{models,ad-hoc-task,project-errors,project-task-context,settings,task-agent-resources}.ts`
- `src/projects/stores/{projects-layout,project-store,ad-hoc-tasks-layout,ad-hoc-task-store,task-agent-resource-store,task-agent-resource-schema}.ts`
- `src/projects/services/{project-service,project-task-service,task-agent-resource-service,projects-capability-service,task-root-view-builder}.ts`
- `src/projects/changes/{project-change-messages,project-change-publisher,project-change-hub}.ts`
  (the live change feed; see [Live Change Feed](#live-change-feed-and-task-roots))
- `src/projects/runtime/task-agent-resource-release.ts` (DONE's stop request)
- `src/projects/context/project-task-context-store.ts`
- `src/compositions/project-task-agent-resource-composition.ts`: the **single**
  place where Projects and the collaboration runtime are bound
- `src/agent-collaboration/execution/task/`: the root-neutral dispatch, fence
  and release boundary, reached only through `TaskAgentResourcePort`
- `src/app-data-migrations/migrations/projects-per-folder-v1/`
- `src/agent-tools/project-tasks/` (shared contract, manifest, native tools)
- `src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.ts`
- `src/api/graphql/types/{projects,project-tasks,projects-capability}.ts`
- `src/api/rest/project-task-context-files.ts`
- `src/api/websocket/projects.ts` (`/ws/projects`)

## Persistence Layout

`ProjectsLayout` is the single path owner for `<appDataDir>/projects/`:

```
<appDataDir>/projects/
└── <projectId>/
    ├── project.json
    ├── drafts/<draftId>/                 temporary uploads before a Task is saved
    └── tasks/<taskId>/
        ├── task.json
        ├── context/                       the Task's saved context files
        └── agent_run_resources.json       agent runs started for this Task (optional)
```

- **Folder names.** Project and Task IDs pass the safe-segment rule (no
  separators, NUL or dot segments) and are URI-encoded before becoming folder
  names, so no path escapes the root.
- **What is listed.** A folder is a Project only if it holds a valid
  `project.json`, and a Task only if it holds a valid `task.json` under a valid
  Project. A Task folder that holds only `agent_run_resources.json`, as left by
  Delete, is not listed.
- **Optional files.** A missing `agent_run_resources.json` means no agent runs
  were started for the Task. A missing `context/` means the Task has no files.

`project.json` holds the released Project fields minus `tasks`:
`projectId, name, description, createdAt, updatedAt, workspaces[]`.

`task.json` holds the released Task fields plus `projectId`:
`taskId, projectId, description, status, createdAt, updatedAt, contextFiles[]`.

Tasks with no Project live outside the Projects root, so no Project scan or the
Projects migration gate ever sees them. `AdHocTasksLayout` owns
`<appDataDir>/ad-hoc-tasks/`:

```
<appDataDir>/ad-hoc-tasks/
└── <taskId>/                              ad_hoc_task_<uuid>
    ├── task.json                          {taskId, description, referenceFiles[], status, createdAt, updatedAt}
    └── agent_run_resources.json           same format as a Project Task's
```

An ad-hoc `task.json` stores text only: the delegated description and the
given `reference_files` paths. File contents are never copied. The directory is
additive: a missing directory means no ad-hoc Tasks, and nothing is migrated.

### Reading and writing

- **Reading is tolerant.** `readProjectFile` and `readTaskFile` in
  `project-store.ts` keep recognized fields only. A file whose IDs do not match
  its folders is not a Project or Task. Malformed optional context metadata
  never discards an otherwise valid Task.
- **Writing is exact and one file at a time.** Writes use the existing per-file
  lock and atomic temp-file-plus-rename. Project create, update and delete
  serialize on one catalog lock, so name uniqueness is checked against the
  current catalog. Each Task update is a locked read-modify-write of its own
  `task.json`. A throwing updater writes nothing.
- **Committed writes are returned.** If a Task write is proven committed but
  releasing its lock fails afterwards, the committed Task is returned with a
  warning. This is bounded in-memory commit proof. It is not a durable journal,
  an fsync or power-loss promise, or a rollback protocol.

### What is never persisted

- Counts, summaries, availability or display names.
- Context locators, absolute context paths, or client tokens.
- Run shutdown state, liveness, lineage or descriptions, in either the Task
  files or `agent_run_resources.json`. The one address kept is the
  `recipientAddress` of an `assigned` entry (the address it was delegated to,
  shown as the Task root's name); no other entry stores an address.

### Services

`ProjectService` validates names (trimmed, required, case-insensitively unique),
workspace membership and duplicates. Project reads sort by case-insensitive
name, then ID. Views compute `taskCount` and `openTaskCount` (non-DONE) from the
Task folders.

Agent mutations use `createProjectRecord` / `patchProjectRecord`, returning the
committed record without Task or workspace-availability enrichment. A patch
merges supplied fields and resolves the complete link list against the current
record inside the existing catalog write callback; adapters never pre-read and
merge. Retained links preserve omitted descriptions in this patch path. The
active UI/GraphQL `createProject` facade calls the same creation write once,
then enriches its view; full-form `updateProject` retains its existing omitted-
description clearing policy. Both paths share the workspace resolver. No new
persisted shape, migration, Task/history write or locking owner is introduced.

`ProjectTaskService` applies only the supplied fields to the **current** Task.
- Creation requires trimmed, non-empty text and creates a TODO Task with a fresh
  UUID. Creation never reads an existing `agent_run_resources.json`.
- Listing covers the whole explicit Project, optionally filtered by exact
  status, and is ordered by `updatedAt` descending, then `taskId`.
- Unknown IDs fail; a patch never creates a Task.
- Meaningful text, status or file changes bump only the Task's `updatedAt`.
  Same-value patches preserve it.
- Task operations never change the parent Project's metadata or timestamps.

### Delete

- **Task Delete** removes the Task's `task.json` and `context/`, and keeps its
  `agent_run_resources.json`.
- **Project Delete** removes `project.json` first, then `drafts/` and every
  Task's `task.json` and `context/`, and keeps every `agent_run_resources.json`.

Keeping these files preserves closure and history (a deleted Task's work cannot be reactivated). Delete adds no stop
and no guard: still-open work continues under the normal runtime lifecycle. New
Tasks get fresh UUIDs, so they never reuse a deleted Task's ID.

## One-Time Migration And The Projects Gate

Released data lived in the single array file `projects/projects.json`, plus
`task_context_files/` and `task_context_drafts/`. The STARTUP_ONLY app-data
migration `20261005_projects_per_folder_v1` (`projects-per-folder-v1`,
`requiredOnStartup`) moves it once into the layout above:

| Before (released) | After |
| --- | --- |
| `projects.json` row (with `tasks[]`) | `<projectId>/project.json` and `<projectId>/tasks/<taskId>/task.json` |
| `task_context_files/<pid>/<tid>/` | `<pid>/tasks/<tid>/context/` (directory rename) |
| `task_context_drafts/<pid>/<draftId>/` | `<pid>/drafts/<draftId>/` (directory rename) |
| `projects.json` | `projects.pre-folders.json` (the retained original, never read again) |

How the migration behaves:
- **Frozen reader.** It reads the source only through the frozen
  `released-projects-array-v1.ts`, and validates its output with the current
  readers before retiring the source.
- **Skips.** Invalid rows or Tasks, a duplicate `projectId`, and conflicting
  existing targets are `SKIPPED` with a warning and preserved. The unshipped
  dev `{taskLifetimes}` row is skipped silently as known residue.
- **Failure.** An unparsable source or an I/O failure is `FAILED`, and the
  sources stay unchanged.
- **Retry.** A retry recognizes completed targets and redoes only the rest.
  There are no backups, hashes or journal.
- **Cleanup.** The old context and draft roots are removed only when empty.

**No lockout.** Startup never waits on Projects. While `projects.json` still
exists (migration not completed), **only Projects** rejects, with
`PROJECTS_MIGRATION_PENDING` ("Projects data is being upgraded; restart the app
to finish. Other features keep working."). Chat, agents and everything else
keep working. Un-migrated data is never shown as an empty Project list. Current
code checks only that `projects.json` **exists**; it never reads the old shape.

**Maintenance obligation (CRR-027; data_migration_guideline §4).** The migration
validates its output with the current `ProjectsLayout`, `readProjectFile` and
`readTaskFile`. Before any change to those three, repoint
`projects-per-folder-v1` to frozen copies of them, so the released migration
keeps its exact behavior.

## Agent Run Resources

Each Task's `<projectId>/tasks/<taskId>/agent_run_resources.json` (for a Task
with no Project, `ad-hoc-tasks/<taskId>/agent_run_resources.json`) is the
**only** record of the agent runs started for that Task:

```jsonc
{ "taskId": "project_task_…",
  "agentRunResources": [
    { "role": "assigned", "assignedBy": "<manager agentRunId>", "recipientAddress": "/product_team",
      "hostRoot": { "kind": "agent", "runId": "…" },
      "agentRun": { "kind": "team", "teamRunId": "…", "coordinatorAgentRunId": "…" },
      "linkedAt": "…", "start": "started", "closedAt": null },
    { "role": "delegated", "hostRoot": { … }, "agentRun": { "kind": "agent", "agentRunId": "…" },
      "linkedAt": "…", "start": "failed", "startError": { "code": "…", "message": "…" }, "closedAt": null } ] }
```

| Field | Meaning |
| --- | --- |
| `role` | `assigned`: a non-owned run's (e.g. the Manager's) `delegate_task(task_id)`, or, for a Task with no Project, the described `delegate_task` that created it. `delegated`: an open owned run's `delegate_task` without a task_id. `broughtIn`: an open owned run's `send_message_to` that started a new copy. |
| `assignedBy` | Present only on `assigned`: the run that made the assignment. |
| `recipientAddress` | Optional, only on `assigned`: the exact `recipient_address` the work was delegated to. Written for assignments made since project-manager-ux; older entries have none (their root shows its kind). Readers accept both, so existing files are used as they are, with no migration. |
| `hostRoot` | The top-level run the user started, which hosts this agent run. |
| `agentRun` | `{kind: agent, agentRunId}` or `{kind: team, teamRunId, coordinatorAgentRunId}`. |
| `linkedAt` | Written **before** any resource is acquired, so DONE always reaches work that is still starting. |
| `start` | `starting`, then `started` or `failed` (with `startError`). Set once. |
| `closedAt` | `null` while open. DONE sets it on every open entry. Only a [reactivation](#reactivation) sets it back to `null`, on one `assigned` entry. |

Rules for the file:
- Its `taskId` matches its folder.
- A run appears at most once and never belongs to two Tasks.
- Write preconditions are evaluated from the content read under that file's
  lock, never from the in-memory view. These cover the creator being open,
  uniqueness, and the open set that DONE closes.
- At composition, the server loads every
  `projects/*/tasks/*/agent_run_resources.json` and
  `ad-hoc-tasks/*/agent_run_resources.json` into one in-memory view
  (`TaskAgentResourceService`; locations are `{projectId: string | null, taskId}`).

### Damaged file (Q-3)

A damaged file is one that is unreadable, invalid, or whose `taskId` does not
match its folder. It puts its Task in the **damaged set**. The server starts
normally and logs `TASK_AGENT_RESOURCES_UNAVAILABLE` once per damaged file.

The rest of the app keeps working: Chat, the Projects screens, Task
create/edit/delete, non-DONE status changes, and every Task whose file is
readable.

These operations fail with `TASK_AGENT_RESOURCES_UNAVAILABLE`, whose message
names the file and says to fix or restore it and restart:
- assign and DONE for the damaged Task;
- while the damaged set is non-empty, description-only `delegate_task` by a
  non-owned sender (rejected up front, before planning or resources);
- while the damaged set is non-empty, waking, messaging or restoring a copy
  that is not in the view.

Recovery: there is no self-repair and no automatic reload. Fix or restore the
file and restart.

## Exactly Four Agent Tools

Inputs use snake_case; result fields use camelCase. Native tools and Agent
Tools MCP share the parser, manifest, services and error projection.

| Tool | Exact input / behavior | Result object |
| --- | --- | --- |
| `list_projects` | `{}` only; list all node-local Project ID/name/description, no selection or mutation | `{projects: [{projectId, name, description}]}` |
| `list_project_tasks` | Required `project_id`; optional exact `status`: TODO, IN_PROGRESS or DONE | `{projectId, tasks: [...]}` |
| `create_or_update_project` | Omit `project_id` to create with required `name`; supply known `project_id` to patch `name?`, `description?`, `workspaces?` | `{project: {projectId, name, description, workspaces: [{workspaceId, description}]}}` |
| `create_or_update_task` | Two strict modes. Create: `{project_id, description}` (**omit status**, no `task_id`). Update: `{task_id, description?, status?}` with **no `project_id`**; the Task ID alone identifies a Project Task or a Task with no Project | `{task: {...}}` |

`create_or_update_project` preserves omitted fields on patch. A blank Project
description clears it; unknown IDs never create. Names are trimmed, nonblank
and unique case-insensitively. Creation defaults to blank description/no links.
`workspaces?: [{workspace_id, description?}]` is a **complete replacement list**,
not append; omission preserves all links and `[]` unlinks without deleting
folders/registrations. Retained links preserve their root snapshot, added time
and omitted description; blank description clears it. New links must be
registered on the current node and default to blank description. There is no
workspace-discovery tool: callers must know actual IDs and the complete desired
list; the Manager asks when these are unknown. Null/wrong types, duplicate IDs
and unknown row/top-level keys fail before mutation; an empty patch returns
`PROJECT_PATCH_REQUIRED`. The acknowledgement contains committed metadata/links,
not Task counts, filesystem paths, availability or a work assessment.

`list_project_tasks` stays global: it returns every Task in the Project, with
an optional `status` filter. Each Task has `projectId`, `taskId`, the full
`description`, `status` and `contextFiles`, plus **one** of:
- `assignments`: the Task's **current** assignments. These are the `role:
  assigned` entries with `closedAt: null`, from any Manager. Each is
  `{targetAgentRunId, kind: agent | team, assignedBy, outcome}`.
  - `targetAgentRunId` is the value `delegate_task` returned: the Agent's run,
    or the Team's coordinator.
  - `outcome` is `accepted` (started), `not_confirmed` (starting) or `failed`.
- `assignmentsUnavailable: true`, when that Task's `agent_run_resources.json`
  is damaged. An empty list is never shown in its place.

The result omits closed assignments, workers' internal `delegated`/`broughtIn`
runs, timestamps and raw lifetime or stop diagnostics. Those runs stay visible
in the app's run views. Acceptance is not completion. The purpose is continuity
across chats and Managers (follow-up via `send_message_to`) and avoiding
duplicate work.

`create_or_update_task` returns only `{task: {projectId, taskId, status}}`, with
`projectId: null` for a Task with no Project. It is a recorded-business
acknowledgement, not an assessment or proof of a stop. Update resolves the Task
by ID through `ProjectTaskService.updateTaskById`: first a direct read of
`ad-hoc-tasks/<taskId>/task.json` (no scan, no Projects gate), otherwise the
Project Task found across Projects. The Projects page's
`updateTask({projectId, taskId, ...})` stays the Project-only boundary.

Each listed context file exposes its saved metadata and a relative HTTP
locator. `localPath` is included only when the Task authority validates the
physical saved bytes. It is a server-local path, not guaranteed to be reachable
by a remote consumer. Missing bytes never produce a fabricated `localPath`.

Task input validation (Project rules are above):
- Presence matters: a null or blank `project_id` or `task_id` is invalid, not a request to
  create. A null, blank or non-string `description` is invalid.
- Unknown input keys are rejected. `project_id` together with `task_id` is an
  unsupported argument (`PROJECT_TOOL_ARGUMENT_INVALID`); create without
  `project_id` fails the same way. Unknown Task IDs fail with `TASK_NOT_FOUND`.
- An empty patch fails with `TASK_PATCH_REQUIRED`, an invalid status with
  `TASK_STATUS_INVALID`, and any status supplied on creation with
  `TASK_CREATE_STATUS_UNSUPPORTED`.
- There is no batch update, workspace discovery/registration, context upload/edit/delete tool,
  or implicit Project binding.

Exposure:
- The tool names are opt-in in both native and session MCP exposure, except
  `create_or_update_task`: `automaticCollaborationToolNames` adds it wherever
  `delegate_task` is (every member context, on every runtime).
- They need no collaboration-member context and are independent of the
  Projects UI flag.
- Their first-party names are protected against configured MCP collisions.
- Selecting one does not expose the others. Unselected tools stay absent or
  rejected. No retired task tools and no category-wide exposure are restored.
- Discovery, `delegate_task` and `send_message_to` remain separate operations.

Errors:
- Known domain errors keep the shape `{error: {code, message}}`. Unexpected
  tool failures are logged and redacted as `PROJECT_OPERATION_FAILED`.
- MCP sets `isError` on tool failure and returns matching JSON
  text/structuredContent. Native tools use the same business projection.
- Session and local-admission failures remain transport-owned.
- If a mutation's result cannot be confirmed, `PROJECT_OPERATION_UNCONFIRMED`
  asks the caller to check the saved Project or Task before repeating. An exception is not
  proof of rollback.

See [Agent Tools MCP](agent_tools_mcp_server.md) for session lifecycle and access.

## Saved-ID Delegation And Agent Run Resources

`delegate_task` has two strict, coequal input modes:

- Described work: `{recipient_address, description, reference_files?}`. From
  an agent that is not working on a Task, the copy is assigned to a new Task
  with no Project and the result also carries its `task_id` (see
  [Tasks With No Project](#tasks-with-no-project-ad-hoc)). From Task work, the
  copy is that Task's `delegated` sub-work and no `task_id` is returned.
- Linked saved work: `{recipient_address, task_id}` only, for **Project Tasks**
  only (an ad-hoc Task ID is `TASK_NOT_FOUND`). No `project_id`, description or
  reference_files override is accepted. Blank, unknown or ambiguous Task IDs,
  DONE Tasks and unavailable saved files fail without spawning anything as a
  fallback. The result is exactly `{target_agent_run_id}`.

Linked dispatch resolves the unique current node-local Task and copies its saved
description and the paths of its saved context files into the ordinary work
packet (the files themselves are not copied). Later Task
edits do not rewrite work that was already delivered. Each call allocates a
fresh copy. The TeamRun identity and the coordinator's ingress AgentRun
identity remain distinct. Follow-up uses the exact returned
`target_agent_run_id`, not the definition address.

### Assignment and linking

- **Link before resources.** The `assigned` entry is written as `starting`
  after identity planning and before any resource is acquired. It then becomes
  `started` or `failed`.
- **Re-read under serialization.** Inside the Task's serialization,
  `ProjectTaskService` re-reads the Task, which must exist and not be DONE. A
  concurrent DONE is therefore either entirely before the link (and the link is
  rejected) or entirely after it (and the link is closed).
- **Indeterminate dispatch.** A dispatch that may already have been accepted
  is reported as indeterminate. Inspect it rather than repeating blindly. A run
  left `starting` by a crash stays `starting`, which the Manager sees as
  `not_confirmed`.

### Ownership

- **Owned runs.** A Task owns its assigned copies, their configured Team
  members, and the copies its open owned runs create: `delegated` sub-work and
  `broughtIn` helpers, even when a helper is physically hosted as a sibling in
  the enclosing root.
- **Hosting.** All runs of an assignment are hosted in one root: the top-level
  run the user started. Two Tasks in the same root stay fully separate.
- **Workers cannot assign.** A Task-owned run may not call `delegate_task` with
  any `task_id` (`TASK_AGENT_RESOURCE_OWNED_SENDER`). Workers delegate sub-work
  without a task_id.
- **Address messaging order:** the sender's own Team instance; then the Task's
  open helper at that address; then an existing unowned run in the root; then a
  new `broughtIn` copy.
- **Borrowed, not adopted.** Existing unowned advisers and collaborators are
  borrowed, never adopted. Unowned agents are never checked
  against Task data. Another Task's run is never a shared helper
  (`TASK_AGENT_RESOURCE_CONFLICT`). Definition or address equality is not
  ownership.

### DONE

1. Explicit DONE commits `closedAt` on every open entry of the Task's
   `agent_run_resources.json`, then writes the status to `task.json`.
2. It then asks each host root to stop exactly the Task's closed runs. The root
   invokes the exact release on every authority it still holds for each run,
   whether or not the run looks live. It does not wait for work to become idle.
3. A closed run receives no input and is never woken or restored while its
   entry is closed, whatever happened to its stop. This holds after restart.
   Only a [reactivation](#reactivation) by the assigning run opens one
   assignment again; a deleted Task's work stays closed.

Stop failures and retries:
- **Nothing about the stop is persisted (Q-1).** Failures are kept in memory
  and logged (`TASK_AGENT_RESOURCE_STOP_FAILED`) with taskId, hostRoot, run and
  error. The platform never reports a stop it did not achieve.
- **Repeating DONE is the retry.** It writes no file change and requests the
  stop again. Already-stopped runs are no-ops; live ones are retried.
- **No automatic retry.** There is no background retry. Root Stop or a server
  restart also ends the runs.
- **If the metadata write fails**, the runs stay closed and the stop is still
  requested. The caller gets the existing "could not be confirmed" error, and
  repeating DONE completes it.

### Reopen and what DONE never touches

Reopening to TODO or IN_PROGRESS starts nothing and does not reopen old runs. A
later deliberate delegation adds a new open `assigned` entry. DONE never
deletes outputs, conversations, workspaces, Git worktrees or uploaded
originals. It never stops the Manager, the root, another Task's runs or
borrowed runs.

### Reactivation

Task status is the agent's responsibility; the software never changes it. To
continue with the same worker after DONE:

1. The agent moves the Task back to TODO or IN_PROGRESS with
   `create_or_update_task` (this alone reopens and starts nothing).
2. The run that assigned the work (the entry's `assignedBy`) sends
   `send_message_to(target_agent_run_id=<the run ID delegate_task returned>)`:
   the Agent copy's run, or a Team copy's coordinator.

The sender's root reactivates exactly that `assigned` entry
(`RootTaskExecutionLifecycle.deliverToExactTarget`):
- **Eligibility** (`ProjectTaskService.assertReopenable`): the target is an
  assignment's ingress, the sender is its assigner, the assignment `started`,
  and the Task exists and is not DONE.
- **Runtime step** (on the root's serialized queue): the previous exact release
  is settled (re-invoked, idempotent) and the released handle or TeamRun is
  discarded, so restore builds a fresh one; the saved conversation must exist.
  If another reactivation already reopened the entry, this step is skipped.
- **Commit** (`ProjectTaskService.reopenAssignment`): under the Task's
  serialization with DONE, every condition is re-checked and `closedAt` of that
  one entry returns to `null`. `task.json` is never written.
- The root publishes "task executions reopened" (`task_executions_reopened`,
  `TASK_EXECUTIONS_REOPENED`); clients list the copy again. Snapshots and stored
  reads leave it out of `closed_task_executions`.
- The message then follows the normal wake / restore / deliver path. The
  accepted result's `message` ends with "<run ID> was reactivated."

Helper entries (`delegated`, `broughtIn`) and the Task's other assignments stay
closed; the reactivated worker may start new helpers. Refusals change nothing:

| Case | Code | Message says |
| --- | --- | --- |
| Task still DONE | `TASK_AGENT_RESOURCE_CLOSED` | Move the Task to TODO or IN_PROGRESS first, then message the run ID again |
| Not the assigner; a helper | `TASK_AGENT_RESOURCE_CLOSED` | Only the assigning run can reactivate, after reopening the Task, by messaging the run ID `delegate_task` returned |
| A Team member that is not the coordinator | `TASK_AGENT_RESOURCE_CLOSED` | Message the run ID `delegate_task` returned (for a Team, its coordinator) |
| Task deleted | `TASK_NOT_FOUND` | The Task was deleted; its work cannot be reactivated |
| Assignment never started | `TASK_REACTIVATION_UNAVAILABLE` | Delegate the work again |
| Saved conversation missing | `TASK_EXECUTION_CONTEXT_UNAVAILABLE` | It cannot be restored |
| Previous stop not confirmed | `TASK_REACTIVATION_STOP_PENDING` | Try again shortly |

If restore fails after the commit, the entry stays open (like any open, offline
copy whose wake failed) and the rejection says the copy was reactivated but did
not receive the message. A later DONE closes, stops and hides the reactivated
copy again; the cycle can repeat. Existing closed entries are directly usable:
the file shape is unchanged (no migration).

See [Team delegation](agent_team_execution.md#server-owned-task-delegation),
[message resolution](agent_communication.md#task-linked-message-scope) and
[public history](run_history.md#task-linked-history-and-public-projection).

## Tasks With No Project (Ad-Hoc)

A Task with no Project makes a description-only delegation closable. The user's
`@` steers the focused agent to `delegate_task`; the same applies to any agent.

1. **Created only by delegation.** `delegate_task({recipient_address,
   description, reference_files?})` from an agent that is not working on a Task
   joins the copy as `{role: "assigned", adHocTask: {description,
   referenceFiles}}`. Inside the existing link step (after identity planning,
   before resources), `ProjectTaskService.linkAgentRun` writes
   `ad-hoc-tasks/<taskId>/task.json` and links the copy `starting` in that
   Task's `agent_run_resources.json`. The result is
   `{target_agent_run_id, target_kind, task_id}`. A call rejected before the link creates no
   Task; a dispatch failure after the link returns no `task_id` and leaves the
   Task with a `failed` assignment until its run is deleted.
   `create_or_update_task` never creates one.
2. **Owned like Project Task work.** The copy, its Team members and its
   `delegated`/`broughtIn` sub-work belong to that Task (the message-scope rules
   above apply). Every entry has the delegator's host root.
3. **DONE.** `create_or_update_task({task_id, status: "DONE"})` runs the same
   DONE as a Project Task: close every open entry, write the status, ask the
   host root to stop exactly those runs; the run tree hides them live and after
   reopen or restart, and conversations are kept. Description and status can
   also be patched; there is no other mutation. After the delegator sets the
   status back to TODO or IN_PROGRESS by `task_id`, its message to the copy's
   run ID reactivates the copy exactly as for a Project Task
   ([Reactivation](#reactivation)).
4. **Not Project work.** They are on no Project board, not in
   `list_project_tasks`, and cannot be assigned by `delegate_task({task_id})`.
   The Projects page lists them, read only, as **Temp tasks**
   (`tasksWithoutProject`, from `AdHocTaskStore.list()`; an unreadable folder is
   skipped and logged as `AD_HOC_TASK_UNREADABLE`).
5. **Retention.** When a run is permanently deleted from history, its delete
   owner (`AgentRunHistoryCatalogService.deleteRun`,
   `TeamRunHistoryService.deleteStoredTeamRun`, `AgentOrgRunService.deleteStoredRun`)
   calls `ProjectTaskService.deleteAdHocTasksHostedBy(root)` after the delete
   committed. It removes the folders of the ad-hoc Tasks whose entries name
   that root, using the in-memory view; failures are logged and never fail the
   delete. This is the only dependency from run history to Projects.
6. **No Projects lockout.** Creation, lookup and DONE never touch the Projects
   store, so they keep working while the Projects migration is pending.

## Live Change Feed And Task Roots

The Projects pages follow changes live through one per-node WebSocket,
`/ws/projects` (same remote-access policy as the other sockets). It sends
`{type: "connected"}` on every connection, then:

| Message | When |
| --- | --- |
| `project_upserted {project}` | A Project was created or updated, or one of its Tasks changed (fresh counts). Same fields as GraphQL `Project`. |
| `project_removed {projectId}` | A Project was deleted. |
| `task_upserted {scope, task}` | A Task was created or changed, or its assignments changed. `scope` is `{kind: "project", projectId}` or `{kind: "no_project"}`; `task` is the GraphQL view of that scope. |
| `task_removed {scope, taskId}` | A Task was deleted (a Temp task with its run's deletion). |
| `task_worker_status {scope, taskId, status}` | The root's worker status changed. |

There is no replay: a client re-reads what it shows on every `connected`.

**Publication contract (AR-001).** Only `ProjectService`, `ProjectTaskService`
and committed `TaskAgentResourceService` writes publish; `load()` never does.
- A write's trigger only *marks* its subject (a Project, a Task, or a Task's
  worker status) on `ProjectChangePublisher`. Marking is synchronous, never
  throws and never reads. A Task mark also marks its Project (counts).
- Reads happen in a flush scheduled with `setImmediate`, after the writer and
  any synchronous runtime dispatch finished. So the first status after a wake
  is read after the overlay cleared (Running, not a transient Initializing).
- Builds are serialized and coalesced per subject: marks during a build cause
  one more build. Each emission reads state at least as new as the previous
  one, so a DONE ends with the DONE view.
- Removal wins over an upsert; a view that reads as missing is published as
  removed. Read or send failures are logged and never fail the write.

### Task roots

A Task's **root** is its latest `assigned` entry: the one agent or team the
Task was handed to. Each Task view has `root` (null when never assigned):
`kind` (agent|team), `recipientAddress` (null for older entries),
`ingressAgentRunId` (the agent, or the team's coordinator), `teamRunId`,
`hostRoot {kind, runId}`, `start`, `startError`, `closed`, and `status`.

`status` is the worker's own status (offline, idle, error, initializing,
running), the one the left panel shows:
- A closed (DONE) or `failed` root is `offline` without asking anything.
- Otherwise the hosting root answers through
  `ActiveRootMessageBoundary.taskExecutionStatus`: the agent's status snapshot,
  or for a team the shared fold of its members
  (`foldTeamAggregateStatus` in `@autobyteus/collaboration-stream-contracts`,
  the same rule as the web). A root that is not active, not admitting, or does
  not know the run answers `offline`. Reading never wakes or starts anything.
- `RootTaskExecutionLifecycle` forwards every agent status change inside a task
  execution to `TaskAgentResourcePort.taskExecutionsStatusChanged` (also after
  the root stopped admitting), and announces all its task executions when it
  closes admission or fails. `ProjectTaskService` marks a worker-status change
  only for a Task whose root is that run.

## Workspace Registration Boundary

Projects query only WorkspaceManager's public registration API, never the
registry file directly. Workspaces do not import Projects, and removing a
workspace is not blocked by links. Views derive AVAILABLE or UNREGISTERED from
the current registration, and the display name from the preserved root
snapshot. Re-registering the same path-derived identity restores availability.

Create and update Project inputs may contain one aggregate `workspaces` list of
workspaceId/description:
- On edit, omitting the list preserves the existing links. A supplied list is
  the explicit desired membership.
- Retained links keep their root and `addedAt`, including unregistered
  snapshots. New links must be currently registered and unique.

The web form registers each new path through the existing `createWorkspace`
**before** the aggregate Project save.
- Registration normalizes metadata; it does **not** mkdir.
- A registration may survive a later failed Project save. No distributed
  transaction or rollback saga is promised.
- The direct add/update/remove workspace-link GraphQL APIs remain supported.
- Unlinking or deleting a Project never unregisters or removes physical
  workspace roots.

## Task Context Bytes

Compound Project/Task identity owns the saved files:

- Saved: `<appDataDir>/projects/<projectId>/tasks/<taskId>/context/`
- Drafts: `<appDataDir>/projects/<projectId>/drafts/<draftId>/`

Draft manifests are server-owned. There is no synthetic run owner, arbitrary
client path, locator fetch or run-context fallback.

Uploads use the neutral policy and writer in
`src/context-files/domain/context-file-upload-policy.ts` and
`services/context-file-upload-writer.ts`, shared with existing run uploads:
- MIME allowlist and a 25 MiB maximum;
- safe generated names and exclusive writes;
- rejection of truncated multipart uploads;
- descendant symlinks and traversal fail closed. A configured root symlink is
  allowed under the existing containment convention.

A successful Task metadata Save is the only publication boundary.
- Creation accepts `contextDraft {draftId, storedFilenames}`.
- Edit accepts
  `contextChanges {draftId?, addStoredFilenames?, removeStoredFilenames?}`.
- Explicit deltas are merged with the current references. Text-only or
  status-only updates preserve the files.
- New immutable copies are prepared and validated before the metadata commit.
  Old saved bytes are not deleted before a successful commit.

Unproven outcomes keep the prepared copies and drafts rather than assuming an
exception means rollback. After proven success, consumed drafts and removed
copies are cleaned up best-effort. A cleanup failure cannot undo committed
metadata or cause a fake failure or resend. Other Task, Project, run or
workspace files and original uploads are never deleted.

Retention:
- Draft files expire after 24 hours, by per-file mtime.
- Saved references never expire, including on DONE Tasks.
- A failed cleanup can leave inaccessible orphan bytes.
- There is no secure-erasure, global recovery or adversarial filesystem race
  guarantee.

## GraphQL And REST

Project queries, mutations and capability operations keep their names.
`Project` exposes `taskCount` and `openTaskCount`, not its Task list.
`createProject` and `updateProject` additionally accept the optional aggregate
`workspaces`.

- `projectTasks(projectId)` returns full ProjectTask records with
  `contextFiles` and `root` (see [Task roots](#task-roots)). GraphQL Task reads
  do not list the other assignments.
- `tasksWithoutProject` returns the Tasks with no Project (Temp tasks), latest
  change first: `taskId, description, status, referenceFiles, createdAt,
  updatedAt, root`. There is no mutation for them.
- `createProjectTask({projectId, description, contextDraft?})` creates a TODO
  Task.
- `updateProjectTask({projectId, taskId, description, contextChanges?})` edits
  text and context, preserving status. **There is no GraphQL or manual UI
  status mutation.**
- `deleteProjectTask({projectId, taskId})` returns a Boolean.
- GraphQL context metadata includes the locator, not the native tool's
  `localPath`.
- `ProjectError` maps to `GraphQLError extensions.code` (see
  `domain/project-errors.ts`).

Known gap: the gated `projects` and `project` queries surface
`PROJECTS_MIGRATION_PENDING` as a clear message without `extensions.code`. No
current consumer reads that code.

REST routes are mounted under `/rest`, within the existing main-server access
policy (not the loopback Agent Tools MCP listener):

| Method / route | Purpose |
| --- | --- |
| POST `/projects/:projectId/task-context-drafts` | Begin draft, optional known taskId for edit |
| POST `/projects/:projectId/task-context-drafts/:draftId/context-files` | Multipart upload |
| GET/DELETE same file path plus `/:storedFilename` | Read/remove draft file |
| DELETE `/projects/:projectId/task-context-drafts/:draftId` | Discard draft |
| GET `/projects/:projectId/tasks/:taskId/context-files/:storedFilename` | Read currently referenced saved bytes |

A missing Project, Task, reference or set of bytes returns 404. An invalid
domain context returns 400. Reads enforce physical regular-file containment and
compound membership. Responses set nosniff. Supported raster images are served
inline; other MIME types download with an encoded display filename. There is no
directory listing and no arbitrary-path route.

## Testing / Related Docs

Read [workspace TESTING.md](../../../TESTING.md) first.

Coverage:
- `tests/unit/projects`: per-folder store, services, Task agent run resources,
  change publication (`project-change-{publisher,publication,hub}.test.ts`) and
  Task roots (`task-root-view.test.ts`).
- `tests/unit/agent-collaboration/task-execution-status.test.ts`: the live
  status of task executions in actual Agent, Team and Org roots.
- `tests/unit/app-data-migrations/projects-per-folder-v1-app-data-migration.test.ts`
- `tests/unit/agent-tools/project-tasks`
- `tests/unit/context-files` (preserved)
- `tests/architecture/projects-boundaries.test.ts`
- `tests/e2e/projects/{projects-graphql,project-task-boundaries,project-mutation-node-locality,projects-startup-migration}.e2e.test.ts`.
  The startup-migration e2e covers both startup entrypoints, the gate before
  and after, and retry.
- MCP route, runtime exposure and startup tests.

Real temporary byte fixtures and HTTP, default MCP and native tests are
distinct from injected fault contracts. Run
`pnpm -C autobyteus-server-ts prepare:shared` before source-level server checks.
The node-locality suite requires current server `prebuild` and `build` as well;
see [Project mutation regressions](../../../TESTING.md#project-mutation-regressions)
for commands, fixture ownership and evidence limits.

- [Frontend Projects](../../../autobyteus-web/docs/projects.md)
- [Workspaces](workspaces.md)
- [Data migration convention](../design/data_migration_guideline.md)
- [Agent Tools MCP](agent_tools_mcp_server.md)
