# Projects

## Scope And Ownership

Projects are durable, node-local work containers: a unique name, optional
string description, described links to registered filesystem workspaces, and
embedded Project Tasks. Tasks have descriptions, business status and optional
Task-owned context files. Manual authoring and three selected agent tools use
the same services; status is read-only in the web UI and writable by the tools.

Project Tasks are **not** delegated execution children. `projects/**` and
agent-execution/task-delegation subsystems do not import each other. A status
write does not launch/delegate/stop an execution, associate a run, assess work,
or release resources. `DONE` is business metadata, not engineering acceptance.
The caller owns reasoning and ordering; no scheduler, automatic status flow,
Manager/team package, new client/script/skill or runtime stopping is provided.

`ENABLE_PROJECTS` is default-off, per-node **web visibility**, not a backend
CRUD or tool authorization gate. Unset values initialize to false; persisted
values are authoritative. Disabling retains metadata and files. The existing
shared boolean setting accessor is unchanged. Tools must be explicitly selected
in the agent definition independently of the UI capability.

## Main Owners

- `src/projects/domain/{models,project-errors,project-task-context,settings}.ts`
- `src/projects/stores/project-store.ts`
- `src/projects/services/{project-service,project-task-service,projects-capability-service}.ts`
- `src/projects/context/project-task-context-{layout,store}.ts`
- `src/agent-tools/project-tasks/` (shared contract, manifest, native tools)
- `src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.ts`
- `src/api/graphql/types/{projects,project-tasks,projects-capability}.ts`
- `src/api/rest/project-task-context-files.ts`

## Persistence And Current-Record Writes

`ProjectStore` stores a JSON array in `<appDataDir>/projects/projects.json`.
Missing file means no Projects. Updates use the existing per-file lock and
atomic rename. Tasks share the Project lock and metadata deletion boundary.

```json
{
  "projectId": "project_<uuid>",
  "name": "autobyteus",
  "description": "",
  "createdAt": "…",
  "updatedAt": "…",
  "workspaces": [
    { "workspaceId": "agent_ws_…", "workspaceRootPath": "/abs/root", "description": "", "addedAt": "…" }
  ],
  "tasks": [
    {
      "taskId": "project_task_<uuid>",
      "description": "Fix login\nDetails…",
      "status": "TODO",
      "createdAt": "…",
      "updatedAt": "…",
      "contextFiles": [
        { "storedFilename": "ctx_token__note.txt", "displayName": "note.txt", "mimeType": "text/plain", "sizeBytes": 42 }
      ]
    }
  ]
}
```

Readers/writers project recognized fields only. Malformed Project/Task/link
entries are dropped; malformed optional context metadata does not discard an
otherwise valid Task description. Missing Tasks or contextFiles means empty.
Existing released Projects are **Directly Usable — No Migration**. Browsing
never rewrites storage; writes persist the normalized array. No schema version,
legacy decoder/fallback, migration marker or global startup byte audit is added.

Never persist counts, summaries, availability/display names, context locators,
absolute context paths, duplicated Project IDs inside Tasks, or client tokens.
`ProjectService` validates names (trimmed, required, case-insensitively unique),
workspace membership and duplicates inside the locked current-record updater.
Project reads sort by case-insensitive name then ID. Views exclude embedded
Tasks and compute `taskCount = tasks.length` and `openTaskCount = non-DONE`.

`ProjectTaskService` applies only supplied fields to the **current** Task under
the same lock. It never replaces a stale whole Task/Project snapshot. Creation
requires trimmed nonempty text and generates a TODO Task. Listing is complete
for the explicit Project, optionally filtered by exact status, ordered by
updatedAt descending then taskId. Unknown IDs fail, never create on patch.
Meaningful text/status/file changes bump only Task updatedAt; same-value patches
preserve it. Task operations never alter parent metadata/timestamps. Description
or status patches preserve saved context unless an explicit context delta exists.

The JSON writer's optional synchronous commit observer runs immediately after
successful rename, before lock finalization. ProjectStore records those proven
committed rows and returns them with a warning if finalization later fails.
Pre-rename failures still propagate. This is bounded in-memory commit proof,
not a durable journal, fsync/power-loss promise, retry or rollback protocol;
a failed lock release can still block subsequent writes.

## Exactly Three Agent Tools

Inputs use snake_case; result fields use camelCase. Native tools and Agent
Tools MCP share the parser, manifest, services and error projection.

| Tool | Exact input / behavior | Result object |
| --- | --- | --- |
| `list_projects` | `{}` only; list all node-local Project ID/name/description, no selection or mutation | `{projects: [{projectId, name, description}]}` |
| `list_project_tasks` | Required `project_id`; optional exact `status`: TODO, IN_PROGRESS or DONE | `{projectId, tasks: [...]}` |
| `create_or_update_task` | Required `project_id`; omit `task_id` to create with required `description` and **omit status**; provide a known `task_id` to patch description and/or status | `{task: {...}}` |

Tool Task results contain projectId, taskId, full description, status and
contextFiles; no timestamps. Each file exposes saved metadata and a relative
HTTP locator; localPath is included only when Task authority validates physical
saved bytes. It is a server-local path, not guaranteed accessible to a remote
consumer. Missing bytes do not produce a fabricated localPath.

Presence matters: null/blank task_id is invalid, not creation; null/blank or
non-string description is invalid; unknown input keys are rejected. Empty patch
is TASK_PATCH_REQUIRED; invalid status TASK_STATUS_INVALID; any supplied status
on creation TASK_CREATE_STATUS_UNSUPPORTED. No batch update, Project creation,
context upload/edit/delete tool or implicit Project binding is provided.

These names are opt-in in both native and session MCP exposure. They require
no collaboration-member context, are independent of the Projects UI flag, and
protect their first-party names against configured MCP collisions. Selection
of one does not expose the other two. Unselected tools remain absent/rejected;
no retired task tools/category-wide exposure is restored. Existing discovery,
delegate_task and send_message_to remain separate operations.

Known domain errors preserve `{error: {code, message}}`; unexpected tool failures
are logged and redacted as PROJECT_OPERATION_FAILED. MCP sets isError on tool
failure and returns matching JSON text/structuredContent; native uses the same
business projection. Session/local-admission failures remain transport-owned.
See [Agent Tools MCP](agent_tools_mcp_server.md) for session lifecycle/access.

## Workspace Registration Boundary

Projects query only WorkspaceManager's public registration API, never the
registry file directly. Workspaces do not import Projects and removal is not
blocked by links. Views derive AVAILABLE/UNREGISTERED from current registration
and displayName from the preserved root snapshot. Re-registering the same
path-derived identity restores availability.

Create/update Project inputs may contain one aggregate `workspaces` list of
workspaceId/description. Omission on edit preserves links; a supplied list is
the explicit desired membership. Retained links preserve their root/addedAt,
including unregistered snapshots; new links must be currently registered and
unique. Project edits preserve current embedded Tasks.

The web form registers each New path through existing createWorkspace **before**
the aggregate Project save. Registration normalizes metadata; it does **not**
mkdir. A registration may survive a later failed Project save; no distributed
transaction/rollback saga is promised. Direct add/update/remove workspace-link
GraphQL APIs remain supported. Unlinking/deleting a Project never unregisters
or removes physical workspace roots.

## Task Context Bytes / Lifetime

Compound Project/Task identity owns saved files under:

- `<appDataDir>/projects/task_context_files/<encodedProjectId>/<encodedTaskId>/`
- Drafts: `<appDataDir>/projects/task_context_drafts/<encodedProjectId>/<draftId>/`

Draft manifests are server-owned; no synthetic run owner, arbitrary client path,
locator fetch or run-context fallback. The neutral policy/writer in
`src/context-files/domain/context-file-upload-policy.ts` and
`services/context-file-upload-writer.ts` is shared with existing run uploads:
MIME allowlist, 25 MiB maximum, safe generated names, exclusive writes and
multipart truncation rejection. Descendant symlinks/traversal fail closed;
a configured root symlink is allowed under the existing containment convention.

Successful Task metadata Save is the only publication boundary. Creation accepts
contextDraft `{draftId, storedFilenames}`; edit accepts contextChanges
`{draftId?, addStoredFilenames?, removeStoredFilenames?}`. Explicit deltas are
merged with current references; text/status-only updates preserve files.
Immutable new copies are prepared/validated before metadata commit. Old saved
bytes are not deleted before successful commit; supplied file membership and
compound ownership are rechecked inside the Project update.

Unproven outcomes retain prepared copies and drafts rather than assuming an
exception means rollback. After proven success, consumed drafts/removed copies
are cleaned best-effort; cleanup failure cannot undo committed metadata or cause
fake failure/resend. Task deletion commits metadata first, then cleans its owned
bytes; Project deletion also cleans its scoped saved/draft namespace best-effort.
Other Task/Project/run/workspace files and original uploads are not deleted.

Draft files expire after 24h by per-file mtime; saved references never TTL-expire,
including DONE Tasks. Reclaiming old unpublished saved copies requires fresh
Task-scoped membership proof while holding the Project lock on explicit context
operations. Failed proof preserves bytes; failed cleanup can leave inaccessible
orphan bytes, including failed-create copies until explicit Project cleanup.
No secure-erasure, global recovery or adversarial filesystem race guarantee.

## GraphQL And REST

Project queries/mutations and capability operations retain their names.
`Project` exposes taskCount and openTaskCount, not its embedded list;
createProject/updateProject additionally accept optional aggregate workspaces.

- `projectTasks(projectId)` returns full ProjectTask records with contextFiles.
- `createProjectTask({projectId, description, contextDraft?})` creates TODO.
- `updateProjectTask({projectId, taskId, description, contextChanges?})` edits
  text/context, preserving status. **No GraphQL/manual UI status mutation.**
- `deleteProjectTask({projectId, taskId})` returns Boolean.
- GraphQL context metadata includes locator, not native tool localPath.
- ProjectError maps to GraphQLError extensions.code (see domain/project-errors.ts).

REST routes below are mounted under `/rest`, within existing main-server
access policy (not the loopback Agent Tools MCP listener):

| Method / route | Purpose |
| --- | --- |
| POST `/projects/:projectId/task-context-drafts` | Begin draft, optional known taskId for edit |
| POST `/projects/:projectId/task-context-drafts/:draftId/context-files` | Multipart upload |
| GET/DELETE same file path plus `/:storedFilename` | Read/remove draft file |
| DELETE `/projects/:projectId/task-context-drafts/:draftId` | Discard draft |
| GET `/projects/:projectId/tasks/:taskId/context-files/:storedFilename` | Read currently referenced saved bytes |

Missing Project/Task/reference/bytes is 404; invalid domain context is 400.
Reads enforce physical regular-file containment and compound membership.
Responses set nosniff; supported raster images inline, other MIME types download
with encoded display filename. No directory listing or arbitrary-path route.

## Testing / Related Docs

Read [workspace TESTING.md](../../../TESTING.md) first. Coverage lives in
`tests/unit/projects`, `tests/unit/agent-tools/project-tasks`, preserved
`tests/unit/context-files`, `tests/architecture/projects-boundaries.test.ts`,
`tests/e2e/projects/{projects-graphql,project-task-boundaries}.e2e.test.ts`,
and MCP route/runtime exposure/startup tests. Real temporary byte fixtures and
HTTP/default MCP/native tests are distinct from injected fault contracts.
Run `pnpm -C autobyteus-server-ts prepare:shared` before downstream server checks.

- [Frontend Projects](../../../autobyteus-web/docs/projects.md)
- [Workspaces](workspaces.md)
- [Data migration convention](../design/data_migration_guideline.md)
- [Agent Tools MCP](agent_tools_mcp_server.md)
