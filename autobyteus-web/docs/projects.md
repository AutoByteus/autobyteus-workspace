# Projects Module - Frontend

## Scope

Shows Projects as a node-scoped, top-level module behind the default-off
per-node `ENABLE_PROJECTS` capability. A Project is a durable work container
with a unique name, an optional description, and a list of described links to
registered filesystem workspaces. This slice contains Projects only: there is no
Task concept, no Project-scoped run launching, and no "Task" wording anywhere on
Projects surfaces.

## Main Files

- `pages/projects/index.vue`
- `pages/projects/[id].vue`
- `components/projects/ProjectsList.vue`
- `components/projects/ProjectCard.vue`
- `components/projects/ProjectDetail.vue`
- `components/projects/ProjectWorkspaceRow.vue`
- `components/projects/ProjectFormDialog.vue`
- `components/projects/ProjectWorkspaceLinkDialog.vue`
- `components/projects/ProjectDialogFrame.vue`
- `stores/projectStore.ts`
- `stores/projectsCapabilityStore.ts`
- `stores/capabilities/createBoundNodeCapabilityStore.ts`
- `components/settings/ProjectsFeatureToggleCard.vue`
- `utils/projects/linkableWorkspaces.ts`
- `utils/projects/projectErrorMessageKey.ts`
- `utils/projects/pathBreakSegments.ts`
- `graphql/queries/projectQueries.ts`, `graphql/mutations/projectMutations.ts`
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
- Failures are normalized to `{ code, message }` from GraphQL
  `extensions.code`; components translate codes through
  `projectErrorMessageKey` into localized field or banner messages rather than
  matching message text.

Components never import the Apollo client directly.

## Pages And Components

- **Index (`/projects`)**: header with **New Project**, client-side search by
  name/description, a card grid (name, description, linked-workspace count), and
  explicit loading, error, empty, and no-match states.
- **Detail (`/projects/:id`)**: back link, edit, and confirmed delete. Delete
  removes only the Project record and its links; it never touches workspaces or
  files. An unknown id renders a not-found state that links back to `/projects`.
- **Workspace rows**: display name, root path, link description, an
  availability badge, and edit/unlink actions. `UNREGISTERED` links stay visible
  with an **Unavailable** badge and can still be unlinked.
- **Form dialog**: create/edit with field-level errors for
  `PROJECT_NAME_REQUIRED` and `PROJECT_NAME_TAKEN`.

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
  `stores/capabilities/__tests__/`, `utils/projects/__tests__/`,
  `middleware/__tests__/feature-flags.global.spec.ts`,
  `composables/__tests__/useShellPrimaryNavigation.capabilities.spec.ts`,
  `localization/messages/__tests__/projectsCatalog.spec.ts`.
- Browser probe: `pnpm test:e2e:projects` (`tests/e2e/projects-feature-probe.mjs`)
  builds the server, starts live nodes and `pnpm dev`, and covers flag gating,
  CRUD, linking, unregistered links, keyboard operation, zh-CN, restart
  persistence, node rebinding, Applications/Skill Improvement non-regression,
  and a 1024×700 layout. Use `--skip-server-build`, `--only=E2E-00x,...`, and
  `--output-dir=<path>` for focused runs.

## Related Docs

- `settings.md`
- `applications.md`
- `agent_execution_architecture.md` (Editable Run Workspace Selection)
- `../../autobyteus-server-ts/docs/modules/projects.md`
- `../../autobyteus-server-ts/docs/modules/workspaces.md`
