# Projects Module — Frontend

## Scope And Gating

Projects are node-local durable containers with names, optional descriptions,
described workspace links and embedded Tasks. Tasks have full text, read-only
business status and optional saved context files. Users create/edit/delete;
selected agent tools can create or change text/status. Status does not launch,
assign, stop or assess an execution. Project Tasks are not delegated children.

The per-node ENABLE_PROJECTS visibility capability remains **default-off**.
Settings › Server Settings › Basics or Advanced can change it on that node;
Advanced edits refresh the capability without a reload. The shell navigation
and `/projects*` middleware use it; unresolved/disabled routes redirect to `/`.
Disabling never deletes metadata or files. Backend CRUD and opt-in tools are
independent of this UI flag. No installation/default change is implied.

Projects are unsupported in the separate mobile runtime. A 390px browser
viewport is narrow-layout evidence, not shipped phone functionality. Different
node-bound desktop windows can have different lists/flags. Node Manager opens
or focuses separate windows; no supported interactive same-window Projects
rebinding/switch recovery/subscription journey is introduced. Existing binding
watchers and captured request guards preserve current-node invariants only.

## Primary Navigation

When available, Projects appears immediately after Agent Orgs in both the
expanded left panel and compact navigation strip. The shared order is Chat →
Agents → Agent Teams → Agent Orgs → Projects → Applications (when enabled) →
Skills → Memory → Nodes. Existing capability/runtime filtering still applies;
when Projects is unavailable it is omitted without reordering other entries.

`composables/useShellPrimaryNavigation.ts` is the sole order/route/active-state
owner, consumed by `AppLeftPanel.vue` and `layout/LeftSidebarStrip.vue`. Projects
retains its localized label, folder icon, `/projects` destination and active
matching on `/projects/*`. Compact navigation retains its existing fitting-strip
redock and narrow transient-drawer interactions. This placement change does not
enable Projects by default or add mobile support.

## Ordinary Routes / Main Owners

| Route | Surface |
| --- | --- |
| `/projects` | ProjectsList/ProjectCard: grid, New Project, name/description search |
| `/projects/new` | ProjectEditor with optional aggregate workspace rows |
| `/projects/:id` | ProjectDetail, Tasks default; `?tab=workspaces` selects links |
| `/projects/:id/edit` | ProjectEditor; return to originating Project tab |
| `/projects/:id/tasks/new` | ProjectTaskEditor/ProjectTaskDraftEditor |
| `/projects/:id/tasks/:taskId` | Concise ProjectTaskDetail |
| `/projects/:id/tasks/:taskId/edit` | Ordinary Task edit page |

Source pages use `pages/projects/[id]/index.vue`, edit.vue and nested tasks
routes; the obsolete flat `[id].vue` is removed. Primary Project/Task authoring
is not an overlay; floating Task cards and ProjectFormDialog/ProjectTaskDialog/
ProjectWorkspaceLinkDialog are replaced by these pages, continuous rows and
aggregate editor. ProjectDialogFrame remains for destructive Project confirmation.

State owners are `stores/{projectStore,projectTaskStore,projectsCapabilityStore}.ts`,
`composables/projects/{useProjectTaskDraft,useProjectTaskPage,useProjectNotice}.ts`,
`services/projects/projectTaskContextClient.ts` and shared voiceInputStore.
GraphQL documents, types/project.ts and localized en/zh-CN Projects catalogs
remain transport/presentation definitions. Components do not import Apollo.

## Project Authoring / Workspace Links

The Project form has required unique trimmed name, optional description and
zero or more optional Existing workspace / New folder rows with descriptions.
Save submits one aggregate membership list; Cancel does not save the Project.
A new Project with no links lands on Tasks; one with links lands on Workspaces.
Editing preserves its originating tab. Short created/saved notices clear rather
than remaining sticky.

Existing candidates are registered non-temp filesystem workspaces, excluding
duplicates selected by other rows; a retained unavailable link remains editable
through its snapshot. The server revalidates new membership/duplicates under
the Project lock and preserves retained roots/addedAt and current Tasks.

**New folder is registration-only, not physical folder creation.** The form
registers the normalized root with existing workspaceStore.createWorkspace,
then saves the Project. Registration failure prevents Project Save; registration
can remain if the subsequent Project save fails. There is no rollback saga.
Workspace availability is read-time AVAILABLE/UNREGISTERED; removing registry
entries never deletes/blocks Project links, and re-registering the same root
restores availability. Unlinking/deleting does not remove physical workspaces.

The Workspaces tab shows described root rows/unavailable badges. Add or Edit
navigates to the aggregate Project edit page (with originating tab/row intent);
Unlink still uses the direct remove-link API. No workspace add/edit overlay.

Project cards show **open** Task/workspace counts. Project delete confirmation
performs a fresh read of **all** Task count, including DONE, and blocks Confirm
while loading/error. This is a truthful snapshot, not an expected-revision
freeze. Confirm deletes current embedded metadata and best-effort owned Task
context; workspace registrations/roots and unrelated run data remain untouched.

## Continuous Task Board / Physical Refresh

The Tasks tab has search, **Refresh** and New task, then fixed To Do / In Progress /
Done containers. Each has a continuous semantic list of anchor rows, a description
summary and matching count; there are no floating cards. Ordering is server
updatedAt descending then taskId. Empty lanes and whole-board no-match states
have explicit text/Clear search; status labels are not mutation controls.

Search is a case-insensitive description substring across all statuses, transient
per Project. Cancel/back/detail preserves it; successful creation clears it before
returning to the full board. Refresh never clears search or navigates. Lane counts
are filtered; Project all/open totals derive from the complete unfiltered snapshot.

Refresh always starts a new physical `projectTasks` query on the captured node
client (`network-only`, queryDeduplication:false), not a cache read or reuse of an
earlier fetch. The control disables during initial/refresh pending and shows busy
feedback. Failure retains the last successful rows/counts, including a successful
empty list, alongside a persistent actionable error/Retry. A successful retry
replaces the full snapshot. No polling, status push or live subscription.

Read/write/deletion generations and page lifetime eligibility reject older
responses after ordinary Project navigation, local mutation or deletion, so
stale data cannot overwrite writes or resurrect deleted state. Project count
publication is guarded too. These are local async publication guards, not
durable revisions/CAS or a node-switch coordinator. Manual data can be stale
between clicks; external tools' writes require the user to Refresh.

Board layout responds to its CSS container, not viewport: one stacked lane
below 752px and three minimum-240px lanes at/above it (16px gaps). Below 480px
search takes its own toolbar row; Refresh remains beside New task. Narrow
layouts preserve wrapping/actions rather than certifying phone deployment.

## Task Authoring / Detail / Context

New/edit pages use one description composer with text, attachment controls and
optional local voice. Text is required/trimmed; validation focuses the field.
Creation is TODO; edit preserves identity/status and omitted files. Explicit
Save publishes; no autosave or fabricated transcript. Task detail shows one
full description, read-only status and saved context; no repeated description,
IDs or timestamps. Back to tasks returns to the same board. Edit returns to
detail; successful creation/deletion returns to board with a transient notice.

Task deletion is inline on detail, with Cancel-first focus, Escape cancellation
and focus return. Missing Task/Project/file states remain explicit/actionable;
only a saved file reference is opened/downloaded through the captured client.

`useProjectTaskDraft` owns text, saved references, uploaded additions and explicit
removal masks. `projectTaskContextClient` captures endpoint/credential and
compound Project/Task identity. REST starts a server-owned draft on first upload;
Save passes a draft reference for creation or add/remove delta for edit. Removing
an existing file is only a draft mask until Save; Cancel leaves saved context
unchanged, cancels matching voice and discards draft bytes best-effort. Failed
save retains entered content/context for action; late responses cannot navigate
or publish to another active page. A captured server save may already commit
after the page closes; local guards are not server rollback.

The server prepares immutable copies before metadata commit and preserves
omitted context on text/status writes, including DONE. Drafts expire after 24h;
saved references do not. Cleanup failure can leave inaccessible orphan bytes,
not fake rollback. Project/Task deletion cleans only scoped owned context;
original uploads, physical workspaces and unrelated run files remain untouched.
See [server Projects](../../autobyteus-server-ts/docs/modules/projects.md) for
25 MiB/MIME limits, exact GraphQL/REST routes, containment and commit proof.

## Optional Local Voice Destination

`components/voiceInput/VoiceInputButton.vue` is generic: the initiating surface
supplies a VoiceTranscriptTarget `{key, isCurrent, appendTranscript}`. A Task
draft receives editable text; `useComposerVoiceTarget` adapts the actual composer
context without looking up/inventing an active AgentContext. Voice never saves
a Task, starts a run or stores recorded audio as Task context automatically.

The existing installed/enabled local Electron Voice Input extension and device/
permission availability are prerequisites. Browser or unavailable capability
keeps typed/file authoring usable; no sample/fake transcript fallback. One
shared starting/recording/transcribing lifecycle blocks competing capture.
Matching-target Cancel/unmount invalidates late delivery and disposes capture;
uncancellable IPC remains busy until settlement. Late text/errors are ignored
for an invalid destination. Settings tests use their own source without a
Task/composer text sink. See [capture ownership](electron_packaging.md#capture-startup-and-ownership).

Repository capture/worker/IPC doubles prove contracts, **not** installed official
extension, microphone/permission/device or live transcription capability.

## Agent Tools / Scope Exclusions

Exactly `list_projects`, `list_project_tasks`, `create_or_update_task` are selected
independently per agent/node. List requires explicit Project ID after discovery;
omitted Task ID creates TODO with text and no status, known Task ID patches text
and/or exact status, unknown ID fails. Full text and saved context references
are available; omitted fields/files persist. No batch or Task attachment mutation
tool. See [server tool contract](../../autobyteus-server-ts/docs/modules/projects.md#exactly-three-agent-tools).

Manager/team definition remains user-owned externally. No scheduler, assignment/
run linkage, automatic completion assessment, sidebar/run-history changes,
resource stopping, new client/scripts/skills, mobile delivery or feature-default
change is part of this module's current slice.

## Testing

Follow [workspace TESTING.md](../../TESTING.md). Colocated coverage includes
Project stores/components, composables/projects, Task draft/file masks, count/read
ordering and shared voice/composer lifetimes. Capability/middleware/localization
and existing workspace-boundary tests remain distinct preservation coverage.

`pnpm -C autobyteus-web test:e2e:projects` starts disposable real backend nodes
and Nuxt, drives **PT-E2E-001–016**, records each result and cleans owned processes/
data. Coverage includes current ordinary forms/detail/rows, native external write
→ physical Refresh/error/retry, ordinary navigation with late response, real
context bytes/process restart/deletion, all counts, mixed statuses and modest
120-row correctness. The TODO-only 120-row fixture is not mixed-status or capacity/
performance certification. No obsolete overlay/focus-trap or injected same-window
switching journey. `--skip-server-build` requires a current built server;
`--output-dir=<path>` retains evidence. Clear inherited ENABLE_* flags when
running development servers; the probe owns isolated flags/profiles.

Composer mention probes are separate renderer fixtures with doubled candidate/
upload/admission/scope boundaries, not live Team/Manager/full-product journeys.
Injected fault/binding tests prove explicit guards, not runtime failure incidence.
Browser width/screenshot checks are not a full VIS/pixel/phone certificate; actual
Electron shell/hardware validation uses isolated worktree builds, never user data.

## Related Documentation

- [Server Projects](../../autobyteus-server-ts/docs/modules/projects.md)
- [Server Workspaces](../../autobyteus-server-ts/docs/modules/workspaces.md)
- [Settings](settings.md)
- [Electron / Voice Input](electron_packaging.md)
