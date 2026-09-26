# Projects

## Scope

Owns node-scoped Projects: durable work containers with a unique name, an
optional description, and described links to registered filesystem
workspaces. Also owns the per-node `ENABLE_PROJECTS` visibility capability.
This slice contains Projects only; there is no Task model.

## TS Source

- `src/projects/domain/models.ts`
- `src/projects/domain/project-errors.ts`
- `src/projects/domain/settings.ts`
- `src/projects/stores/project-store.ts`
- `src/projects/services/project-service.ts`
- `src/projects/services/projects-capability-service.ts`
- `src/api/graphql/types/projects.ts`
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
  ]
}
```

`description` is always a string (`""` when empty). Link availability and
display name are **not** stored.

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
- `deleteProject` removes only the record and its links and returns `false`
  when the Project does not exist;
- reads sort Projects by name (case-insensitive) and links by `addedAt`, and
  resolve each link at read time to `AVAILABLE` (currently registered) or
  `UNREGISTERED`, with `displayName` derived from the snapshot path via
  `workspaceDisplayNameFromRootPath`.

Failures are `ProjectError` values with codes `PROJECT_NAME_REQUIRED`,
`PROJECT_NAME_TAKEN`, `PROJECT_NOT_FOUND`, `WORKSPACE_NOT_REGISTERED`,
`WORKSPACE_ALREADY_LINKED`, and `WORKSPACE_LINK_NOT_FOUND`. The resolver maps
them to `GraphQLError` with `extensions.code`.

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

These rules are enforced by `tests/architecture/projects-boundaries.test.ts`.

## GraphQL Boundary

- `projects: [Project!]!`, `project(projectId): Project`
- `createProject(input)`, `updateProject(input)`, `deleteProject(projectId): Boolean!`
- `addProjectWorkspace(input)`, `updateProjectWorkspace(input)`,
  `removeProjectWorkspace(input)` — each returns the updated `Project`
- `projectsCapability: ProjectsCapability!`,
  `setProjectsEnabled(enabled): ProjectsCapability!`

`ProjectWorkspace` exposes `workspaceId`, `workspaceRootPath`, `displayName`,
`description`, `addedAt`, and `availability: AVAILABLE | UNREGISTERED`.

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
  `tests/unit/api/graphql/types/projects.test.ts`
- `tests/unit/services/server-settings-service.test.ts`
- `tests/architecture/projects-boundaries.test.ts`
- `tests/e2e/projects/projects-graphql.e2e.test.ts`

## Related Docs

- [`workspaces.md`](./workspaces.md)
- [`application_capability.md`](./application_capability.md)
- [`skill_improvement.md`](./skill_improvement.md)
- `../../../autobyteus-web/docs/projects.md`
- `../../../autobyteus-web/docs/settings.md`
