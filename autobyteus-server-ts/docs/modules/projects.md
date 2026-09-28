# Projects

## Scope

Owns node-scoped Projects: durable work containers with a unique name, an
optional description, described links to registered filesystem workspaces, and
description-only **Project Tasks**. Also owns the per-node `ENABLE_PROJECTS`
visibility capability.

Project Tasks are user-authored work items. They are separate from the
execution-internal delegated tasks of agent teams (`TaskDelegation*`):
`projects/**` imports no delegated-task or agent-execution code, and those
subsystems import nothing from `projects/**`.

## TS Source

- `src/projects/domain/models.ts`
- `src/projects/domain/project-errors.ts`
- `src/projects/domain/settings.ts`
- `src/projects/stores/project-store.ts`
- `src/projects/services/project-service.ts`
- `src/projects/services/project-task-service.ts`
- `src/projects/services/projects-capability-service.ts`
- `src/api/graphql/types/projects.ts`
- `src/api/graphql/types/project-tasks.ts`
- `src/api/graphql/types/projects-capability.ts`

## Data Model And Persistence

`ProjectStore` persists a JSON array at `<appDataDir>/projects/projects.json`
through `persistence/file/store-utils.ts` (locked, atomic
`readJsonArrayFile` / `updateJsonArrayFile`). A missing file means no Projects.
Malformed rows and malformed links are dropped on read. The store holds no
business rules.

```json
{
  "projectId": "project_<uuid>",
  "name": "autobyteus",
  "description": "",
  "createdAt": "2026-09-26T…Z",
  "updatedAt": "2026-09-26T…Z",
  "workspaces": [
    { "workspaceId": "agent_ws_…", "workspaceRootPath": "/abs/root", "description": "", "addedAt": "…" }
  ],
  "tasks": [
    { "taskId": "project_task_<uuid>", "description": "Fix login\nDetails…", "status": "TODO", "createdAt": "…", "updatedAt": "…" }
  ]
}
```

`description` is always a string (`""` when empty). Link availability, display
name, the Task summary, and `openTaskCount` are **not** stored. Tasks are
embedded in their Project record, so they share its lock and are deleted
atomically with it. `projectId` is not stored inside each Task.

Reading rows written by v1.4.86 is **Directly Usable, with no migration**. The
store's normalizer projects every valid row onto the current model: `tasks`
becomes `Array.isArray(row.tasks) ? row.tasks.filter(isValidTask) : []`. A
released row without `tasks` therefore means "no Tasks", and invalid Task
entries are dropped, the same way malformed links are. Browsing never rewrites
the file. The first write to a Project persists the normalized record,
including `tasks`. No migration exists or is needed.

## ProjectService (Governing Owner)

`ProjectService` is the only entrypoint for Project reads and writes:

- names are trimmed, required, and unique case-insensitively
  (`toLocaleLowerCase`), excluding the Project being updated;
- ids are `project_<uuid>`; `createdAt`/`updatedAt`/`addedAt` are ISO strings;
- `addWorkspaceLink` rejects duplicates and ids that
  `WorkspaceManager.getRegisteredWorkspaceRootPath` does not resolve (only
  registered `agent_ws_` filesystem workspaces resolve), and snapshots the
  resolved root path;
- every validation that depends on stored state runs inside the
  `updateJsonArrayFile` updater, so a rejected change aborts the write and
  leaves the previous file intact;
- `createProject` initializes `tasks: []`, and every other write preserves the
  embedded Tasks unchanged;
- `deleteProject` removes the record together with its links and embedded
  Tasks (the cascade is inherent), and returns `false` when the Project does
  not exist;
- reads sort Projects by name (case-insensitive) and links by `addedAt`, and
  resolve each link at read time to `AVAILABLE` (currently registered) or
  `UNREGISTERED`, with `displayName` derived from the snapshot path via
  `workspaceDisplayNameFromRootPath`;
- the Project view excludes `tasks` and exposes the computed
  `openTaskCount`, the number of Tasks whose status is not `DONE`.

## ProjectTaskService (Task Owner)

`ProjectTaskService` owns Task invariants and writes only through
`ProjectStore.updateRecords`, inside the same locked updater as Project
writes:

- the description is trimmed and required (`TASK_DESCRIPTION_REQUIRED`);
- ids are `project_task_<uuid>`, and `createdAt`/`updatedAt` are ISO strings;
- every new Task is `TODO`;
- `listTasks` returns one Project's Tasks sorted by `updatedAt` descending
  (ties broken by `taskId`);
- `updateTaskDescription` edits the description only and bumps the Task's
  `updatedAt`; an unknown id is `TASK_NOT_FOUND`;
- `deleteTask` returns `false` when the Task does not exist;
- a missing Project is `PROJECT_NOT_FOUND`;
- it never changes any Project field, including the Project's `updatedAt`.

**There is deliberately no status mutation.** The status enum is
`TODO | IN_PROGRESS | DONE`, but this release never sets anything other than
`TODO`. Status changes are reserved for a later, agent-facing Task-admission
operation. When that exists:

- the web delete confirmation, which reports `openTaskCount`, must be
  revisited;
- single-file write contention on `projects.json` must be re-evaluated for
  frequent agent status writes.

Failures are `ProjectError` values with codes `PROJECT_NAME_REQUIRED`,
`PROJECT_NAME_TAKEN`, `PROJECT_NOT_FOUND`, `WORKSPACE_NOT_REGISTERED`,
`WORKSPACE_ALREADY_LINKED`, `WORKSPACE_LINK_NOT_FOUND`,
`TASK_DESCRIPTION_REQUIRED`, and `TASK_NOT_FOUND`. Both resolvers map them to
`GraphQLError` with `extensions.code`.

## Workspace Boundary

- Projects read workspace registration only through `WorkspaceManager`'s public
  read API. They never read `workspaces.json` / `WorkspaceRegistryStore`
  directly and never write workspace state.
- `workspaces/**` must not import `projects/**`: workspace removal knows nothing
  about Projects and is never blocked by links. Removed workspaces surface as
  `UNREGISTERED` links; re-registering the same root (same path-derived id)
  makes them `AVAILABLE` again.
- New-root registration stays on the existing `createWorkspace` mutation; the
  web client registers first, then calls `addProjectWorkspace` with the
  returned id.

These rules, and the delegated-task separation described under Scope, are
enforced by `tests/architecture/projects-boundaries.test.ts`.

## GraphQL Boundary

- `projects: [Project!]!`, `project(projectId): Project`
- `createProject(input)`, `updateProject(input)`, `deleteProject(projectId): Boolean!`
- `addProjectWorkspace(input)`, `updateProjectWorkspace(input)`,
  `removeProjectWorkspace(input)` — each returns the updated `Project`
- `projectsCapability: ProjectsCapability!`,
  `setProjectsEnabled(enabled): ProjectsCapability!`

- `projectTasks(projectId): [ProjectTask!]!`
- `createProjectTask(input: { projectId, description }): ProjectTask!`
- `updateProjectTask(input: { projectId, taskId, description }): ProjectTask!`
  (description only)
- `deleteProjectTask(input: { projectId, taskId }): Boolean!`
- There is no Task status mutation.

`Project` exposes `openTaskCount: Int!`, and does not expose the Task list.
`ProjectWorkspace` exposes `workspaceId`, `workspaceRootPath`, `displayName`,
`description`, `addedAt`, and `availability: AVAILABLE | UNREGISTERED`.
`ProjectTask` exposes `taskId`, `projectId` (added for client keying; not
stored), `description`, `status: ProjectTaskStatus (TODO | IN_PROGRESS | DONE)`,
`createdAt`, and `updatedAt`.

## Projects Capability

`ProjectsCapabilityService` returns
`{ enabled, settingKey: "ENABLE_PROJECTS", source }`:

- a persisted value is authoritative (`source = SERVER_SETTING`);
- an unset value is persisted as `false` and reported as
  `INITIALIZED_DISABLED`;
- `setEnabled` persists the value (`SERVER_SETTING`).

`ENABLE_PROJECTS` is a predefined server setting. The capability is a
visibility switch for the web shell only; Project operations are not gated
server-side and disabling the flag never deletes data.

## Shared Boolean Setting Accessor

`ServerSettingsService.getBooleanSetting(key)` returns `null` when the key is
unset, otherwise `value.toLowerCase() === "true"`;
`setBooleanSetting(key, enabled)` writes `"true"` / `"false"`. The
Applications, Skill Improvement, and Projects capability services all use this
pair; the former feature-specific accessor methods were removed. Stored values
are unchanged.

## Testing

- `tests/unit/projects/`
- `tests/unit/api/graphql/projects-schema.test.ts`,
  `tests/unit/api/graphql/project-tasks-schema.test.ts`,
  `tests/unit/api/graphql/types/projects.test.ts`
- `tests/unit/services/server-settings-service.test.ts`
- `tests/architecture/projects-boundaries.test.ts`
- `tests/e2e/projects/projects-graphql.e2e.test.ts`: API-001 to API-009,
  including released-row reads and Task operations. It clears ambient
  `ENABLE_*` environment variables around each test, so it is hermetic even
  when run from a shell that inherited them.

## Related Docs

- [`workspaces.md`](./workspaces.md)
- [`application_capability.md`](./application_capability.md)
- [`skill_improvement.md`](./skill_improvement.md)
- `../../../autobyteus-web/docs/projects.md`
- `../../../autobyteus-web/docs/settings.md`
