# Projects Module - Frontend

## Scope

Shows Projects as a node-scoped, top-level module behind the default-off
per-node `ENABLE_PROJECTS` capability. A Project is a durable work container
with a unique name, an optional description, a list of described links to
registered filesystem workspaces, and a list of description-only **Project
Tasks**.

Project Tasks are user-authored work items. They are unrelated to the
execution-internal delegated children of agent teams (`delegate_task`), and
no Project code imports that subsystem. There is no Project-scoped run launching
and no user-facing Task status change: every Task is created as `TODO`, and
status changes are reserved for a later agent-facing Task-admission flow.

## Main Files

- `pages/projects/index.vue`, `pages/projects/[id].vue` (flat routes; there is no parent layout route)
- `components/projects/ProjectsList.vue`, `components/projects/ProjectCard.vue`
- `components/projects/ProjectDetail.vue`
- `components/projects/ProjectTaskBoard.vue`, `ProjectTaskCard.vue`, `ProjectTaskDialog.vue`
- `components/projects/ProjectWorkspacesPanel.vue`
- `components/projects/ProjectWorkspaceRow.vue`
- `components/projects/ProjectFormDialog.vue`
- `components/projects/ProjectWorkspaceLinkDialog.vue`
- `components/projects/ProjectDialogFrame.vue`
- `stores/projectStore.ts`, `stores/projectTaskStore.ts`
- `stores/projectsCapabilityStore.ts`
- `stores/capabilities/createBoundNodeCapabilityStore.ts`
- `components/settings/ProjectsFeatureToggleCard.vue`
- `utils/projects/linkableWorkspaces.ts`
- `utils/projects/projectErrorMessageKey.ts`
- `utils/projects/pathBreakSegments.ts`
- `utils/projects/taskSummary.ts`, `utils/projects/taskStatusLabelKey.ts`, `utils/projects/projectRequestError.ts`
- `graphql/queries/projectQueries.ts`, `graphql/mutations/projectMutations.ts`
- `graphql/queries/projectTaskQueries.ts`, `graphql/mutations/projectTaskMutations.ts`
- `graphql/queries/projectsCapabilityQueries.ts`, `graphql/mutations/projectsCapabilityMutations.ts`
- `types/project.ts`
- `localization/messages/{en,zh-CN}/projects.ts`

## Runtime Availability And Gating

Projects availability is a backend-owned per-node capability, resolved exactly
like Applications (see `settings.md` › Feature Capability Toggles):

- `projectsCapabilityStore` is a thin `createBoundNodeCapabilityStore` instance
  (store id `projectsCapability`) over `projectsCapability` /
  `setProjectsEnabled`. An unset setting resolves to disabled
  (`source = INITIALIZED_DISABLED`).
- `useShellPrimaryNavigation` shows the **Projects** item (`heroicons:folder`,
  after **Nodes**) only when `projectsCapabilityStore.isEnabled` and
  `isFeatureAvailableInRuntime('projects')`.
- `middleware/feature-flags.global.ts` redirects `/projects*` to `/` when the
  capability is disabled or cannot be resolved.
- `utils/mobileFeatureGates.ts` marks `projects` as unsupported, so the module
  is hidden in the mobile runtime.
- The flag is a visibility switch only. The Projects GraphQL operations are not
  gated server-side, and turning the flag off never deletes Project data.
- The flag can be changed from Settings › Server Settings › Basics
  (`ProjectsFeatureToggleCard`) or from the Advanced settings table; an
  Advanced-table edit of `ENABLE_PROJECTS` refreshes the capability store so
  navigation updates without a reload.

Two windows bound to different nodes can legitimately show different Projects
visibility and different Project lists.

## Project Store

`projectStore` owns the client Project cache for the currently bound node:

- `fetchProjects`, `fetchProject`, `createProject`, `updateProject`,
  `deleteProject`, `addWorkspace`, `updateWorkspace`, `removeWorkspace`.
- Every request waits for `windowNodeContextStore.waitForBoundBackendReady()`
  and captures `bindingRevision`; responses that arrive after a rebinding are
  discarded, and the cache is invalidated when the binding changes.
- The list is kept sorted by name (case-insensitive), matching the server order.
- Each `Project` carries the server-computed `openTaskCount`. `projectStore`
  exposes `setOpenTaskCount(projectId, count)`, and that action is the only way
  `projectTaskStore` updates the Project cache after a Task write.
- Failures are normalized to `{ code, message }` from GraphQL
  `extensions.code` (`utils/projects/projectRequestError.ts`). Components
  translate codes through `projectErrorMessageKey` into localized field or
  banner messages rather than matching message text.

`projectTaskStore` owns Task requests:

- It keeps per-Project Task lists keyed by `projectId`, loaded on demand.
- Request sequencing and `bindingRevision` invalidation are the same as in
  `projectStore`.
- `forget(projectId)` drops a deleted Project's list.
- After each successful write it pushes the recomputed open count to
  `projectStore`.

Components never import the Apollo client directly.

## Pages And Components

- **Index (`/projects`, `ProjectsList`)**:
  - a header with **New Project** and client-side search by name/description;
  - a card grid, with explicit loading, error, empty, and no-match ("Clear
    search") states.
  - Each `ProjectCard` links to the Project page and shows the name, the
    description, and one bottom line of counts, "N open tasks · N workspaces",
    built from `openTaskCount` and `workspaces.length`.
  - The count line is localized with singular and zero forms, for example
    "1 open task · No workspaces".
- **Project page (`/projects/:id`, `ProjectDetail`)** is full-width: padding
  only, with no max-width wrapper. It has:
  - a **← Projects** link at the top-left that returns to the grid;
  - a header with the name, the description (clamped to 2 lines), Edit, and a
    confirmed Delete;
  - plain tabs: **Tasks** (default) and **Workspaces**.
  - The active tab is in the URL: `?tab=workspaces` selects Workspaces, and no
    `tab` query means Tasks.
  - Delete removes the Project record together with its links and embedded
    Tasks, then returns to `/projects`. It never touches workspaces or files.
  - The delete confirmation reports `openTaskCount`. While no Task can become
    `DONE`, that equals the total Task count; the Task-admission work must
    revisit it.
  - The not-found and error states also offer **← Projects**.
- **Workspaces tab (`ProjectWorkspacesPanel`, `ProjectWorkspaceRow`)**: the
  released workspace section, unchanged. Each row shows the display name, root
  path, link description, and an availability badge, with edit/unlink actions.
  `UNREGISTERED` links stay visible with an **Unavailable** badge and can still
  be unlinked.
- **Form dialog**: create/edit with field-level errors for
  `PROJECT_NAME_REQUIRED` and `PROJECT_NAME_TAKEN`.

## Project Task Board

- **`ProjectTaskBoard`** (the Tasks tab):
  - a toolbar with search and **+ New task**;
  - three columns in fixed order: **To Do**, **In Progress**, **Done**, grouped
    from `ProjectTask.status`;
  - each column heading shows its label and its count of Tasks that match the
    search;
  - cards within a column are ordered by `updatedAt`, newest first (the server
    order).
  - An empty column shows a muted "No tasks". If the search matches nothing in
    any column, a single message with **Clear search** replaces the columns.
  - It has loading and error states with retry, and it owns the Task dialog's
    open state.
- **Search, with no status filter**: a case-insensitive substring match on the
  description, applied to all Tasks before they are grouped. There is no status
  filter; the columns already group by status.
- **Layout: the board decides by its own width, not the viewport.**
  - The board wrapper is a CSS container
    (`container-type: inline-size; container-name: project-task-board`).
  - The columns default to one stacked column. A scoped
    `@container project-task-board (min-width: 752px)` rule switches them to
    `repeat(3, minmax(0, 1fr))`: 752 px is three 240 px minimum columns plus
    two 16 px gaps.
  - There is no viewport breakpoint. The board stacks rather than squeezing,
    for example when the app's side panel is open. With the default side panel
    it stacks below a window width of about 1140 px, and with a 520 px panel
    below about 1340 px.
  - This is plain CSS, following
    `components/settings/providerApiKey/GeminiConfigurationOptionCard.vue`. The
    Tailwind container-query plugin is not used.
- **`ProjectTaskCard`**: a `<button>` that shows only the Task description,
  clamped to 3 lines and preserving line breaks. There is no status badge, date,
  or title. Its accessible name is the summary (the first non-empty trimmed line
  of the description, from `utils/projects/taskSummary.ts`; computed, never
  stored). Clicking it opens the dialog.
- **`ProjectTaskDialog`** has three modes:
  - **create**: a description field, required and trimmed;
  - **view**: the full description, the status label, and the last-updated
    time, with Edit and Delete;
  - **edit**: the description only.
  Delete is confirmed inside the dialog. `TASK_DESCRIPTION_REQUIRED` and
  `TASK_NOT_FOUND` map to localized messages. The time is formatted in the
  browser locale (the repo convention), not the app language.
- Status labels come from `utils/projects/taskStatusLabelKey.ts`. No control
  changes a Task's status.

## Linking Workspaces

`ProjectWorkspaceLinkDialog` reuses `components/workspace/config/WorkspaceSelector.vue`
for its Existing / New / browse UI but supplies a Projects-owned candidate list:

- `selectLinkableWorkspaceIds(workspaceStore.allWorkspaces, project.workspaces)`
  keeps only registered filesystem workspaces (`kind === 'filesystem'`,
  `isTemp !== true`, id prefix `agent_ws_`) that are not already linked to this
  Project. Temp, skill, and transient workspaces are never candidates.
- The dialog passes that list through the selector's opt-in
  `candidateWorkspaceIds` prop together with `autoSelectDefault=false`, so no
  temp entry is listed or pre-selected and Save stays disabled until a
  workspace is chosen or a New path is entered.
- **New** registers the root through the existing
  `workspaceStore.createWorkspace` action and, only on success, links the
  returned `workspaceId` with `addProjectWorkspace`. Registration failure leaves
  the dialog open with the entered path and shows the reason.
- If the server rejects an Existing choice with `WORKSPACE_NOT_REGISTERED`
  (the candidate list was stale), the dialog clears the selection and reloads
  the workspace list.
- Edit mode shows the linked workspace read-only; only its description is
  editable.

The candidate policy is a presentation aid. The server re-validates
registration and duplicate links inside its locked update.

## Workspace Removal Interaction

Workspace removal never checks Projects and is never blocked by them. A link to
a removed workspace is resolved as `UNREGISTERED` on the next read and becomes
`AVAILABLE` again if the same root is registered again (workspace ids are
path-derived). Availability is never persisted on the client.

## Localization

All Projects strings live in `localization/messages/{en,zh-CN}/projects.ts`,
plus `shell.navigation.projects` and the `ProjectsFeatureToggleCard` keys in
`settings.ts`. The zh-CN link dialog still shows the pre-existing English
literals owned by `WorkspaceSelector`.

## Testing

- Unit/component specs: `components/projects/__tests__/`,
  `stores/__tests__/projectStore.spec.ts`,
  `stores/__tests__/projectTaskStore.spec.ts`,
  `stores/capabilities/__tests__/`, `utils/projects/__tests__/`,
  `middleware/__tests__/feature-flags.global.spec.ts`,
  `composables/__tests__/useShellPrimaryNavigation.capabilities.spec.ts`,
  `localization/messages/__tests__/projectsCatalog.spec.ts`.
- Browser probe: `pnpm test:e2e:projects` (`tests/e2e/projects-feature-probe.mjs`)
  builds the server, starts live nodes and `pnpm dev`, and runs E2E-001 to
  E2E-029. Coverage:
  - the released grid and page journeys (E2E-001 to E2E-013): flag gating,
    CRUD, linking, unregistered links, keyboard operation, zh-CN, restart
    persistence, node rebinding, and Applications/Skill Improvement
    non-regression;
  - Task create/edit/delete, search across columns, card counts, and the
    cascade delete;
  - grid → Project page → **← Projects**, a keyboard-only Task journey, and
    zh-CN Task surfaces;
  - board widths: a narrow window, the real shell at 1200×800 with the default
    and 520 px side panels, and a width sweep from 760 to 1600 px (columns are
    at least 240 px when side by side, otherwise stacked);
  - reading a released v1.4.86 `projects.json`, a mixed-status file, and
    restart persistence.

  Use `--skip-server-build`, `--only=E2E-0xx,...`, and `--output-dir=<path>`
  for focused runs. When running from a shell that inherited `ENABLE_*`
  variables from an AutoByteus process, clear them (for example
  `env -u ENABLE_PROJECTS ...`), because the server reads `process.env` before
  its `.env`.

## Related Docs

- `settings.md`
- `applications.md`
- `agent_execution_architecture.md` (Editable Run Workspace Selection)
- `../../autobyteus-server-ts/docs/modules/projects.md`
- `../../autobyteus-server-ts/docs/modules/workspaces.md`
