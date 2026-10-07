# Projects Module — Frontend

## Scope And Gating

Projects are node-local durable containers with names, optional descriptions,
described workspace links and embedded Tasks. Tasks have full text, read-only
business status and optional saved context files. Users create/edit/delete;
selected agent tools can create or change text/status. Project Tasks remain
business records, distinct from execution children. Saved-ID delegation starts
fresh copies for a Task, and the server records them as the Task's agent run
resources. Explicit DONE closes those runs and asks the platform to stop only
them. Other status writes do not start work. DONE is neither
engineering acceptance nor proof that the stop has finished.

Projects is **always available on desktop** (projects-always-on). It has no
feature flag, capability query or Settings switch, and `/projects*` routes are
not gated. A value of the retired per-node flag stored by an earlier release is
not read: Settings › Server Settings › Advanced may list it as an ordinary custom
setting with no effect, which the user can delete. Backend CRUD and opt-in agent
tools were always independent of the UI.

Projects are unsupported in the separate mobile runtime. A 390px browser
viewport is narrow-layout evidence, not shipped phone functionality. Different
node-bound desktop windows can have different lists. Node Manager opens
or focuses separate windows; no supported interactive same-window Projects
rebinding/switch recovery/subscription journey is introduced. Existing binding
watchers and captured request guards preserve current-node invariants only.

## Primary Navigation

Projects appears immediately after Agent Orgs in both the
expanded left panel and compact navigation strip. The shared order is Chat →
Agents → Agent Teams → Agent Orgs → Projects → Applications (when enabled) →
Skills → Memory → Nodes. Projects is filtered only by the runtime gate
(`isFeatureAvailableInRuntime('projects')`, which hides it in the mobile
runtime); other entries keep their own capability/runtime filtering, and an
omitted entry never reorders the rest.

`composables/useShellPrimaryNavigation.ts` is the sole order/route/active-state
owner, consumed by `AppLeftPanel.vue` and `layout/LeftSidebarStrip.vue`. Projects
retains its localized label, folder icon, `/projects` destination and active
matching on `/projects/*`. Compact navigation retains its existing fitting-strip
redock and narrow transient-drawer interactions. Mobile support is not added.

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
| `/projects/temp-tasks` | TempTaskBoard: Tasks with no Project (Temp tasks), read only |
| `/projects/temp-tasks/tasks/:taskId` | TempTaskDetail: one Temp task, read only |

Source pages use `pages/projects/[id]/index.vue`, edit.vue and nested tasks
routes; the obsolete flat `[id].vue` is removed. Primary Project/Task authoring
is not an overlay; floating Task cards and ProjectFormDialog/ProjectTaskDialog/
ProjectWorkspaceLinkDialog are replaced by these pages, continuous rows and
aggregate editor. ProjectDialogFrame remains for destructive Project confirmation.

State owners are `stores/{projectStore,projectTaskStore}.ts`,
`composables/projects/{useProjectTaskDraft,useProjectTaskPage,useProjectNotice,useProjectChangeFeed,useTaskRootNavigation}.ts`,
`services/projects/{projectTaskContextClient,projectChangeFeed}.ts`,
`utils/projects/taskRootPresentation.ts` and shared voiceInputStore.
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

Cards stay compact however long the description is (task-card-compact-summary).
The bold summary is the first non-empty line, and the grey preview is the remaining
lines joined. Each is clamped to 2 lines (`line-clamp-2`, with no `display`
utility beside it that would override the clamp). Each is also bounded to 300
characters before rendering (`utils/projects/taskSummary.ts`), so a 10,000-word
brief is never laid out in a card. The cut falls at the last word boundary. Text
without spaces, such as CJK or one long token, is cut at the limit, and a long
unbroken token wraps inside the card. One-line labels (the card's
accessible name and the Task delete confirmation) use the summary shortened to 120
characters with "…". Search still matches the full description, and the Task page
(and Temp task page) shows the full text. The Temp tasks board uses the same row.

Search is a case-insensitive description substring across all statuses, transient
per Project. Cancel/back/detail preserves it; successful creation clears it before
returning to the full board. Refresh never clears search or navigates. Lane counts
are filtered; Project all/open totals derive from the complete unfiltered snapshot.

Refresh always starts a new physical `projectTasks` query on the captured node
client (`network-only`, queryDeduplication:false), not a cache read or reuse of an
earlier fetch. The control disables during initial/refresh pending and shows busy
feedback. Failure retains the last successful rows/counts, including a successful
empty list, alongside a persistent actionable error/Retry. A successful retry
replaces the full snapshot. Refresh stays available, but is no longer needed to
see other writers' changes: the pages follow them live (below).

Read/write/deletion generations and page lifetime eligibility reject older
responses after ordinary Project navigation, local mutation or deletion, so
stale data cannot overwrite writes or resurrect deleted state. Project count
publication is guarded too. These are local async publication guards, not
durable revisions/CAS or a node-switch coordinator.

## Live Pages / Change Feed

Every Projects page (list, board, Task page, Temp tasks) retains the node's
`/ws/projects` feed while mounted (`useProjectChangeFeed`); `ProjectChangeFeed`
keeps one socket while any page retains it, reconnects with backoff (1 s, 2 s, …
capped at 10 s) and reopens on the newly bound node. Messages (see the server's
[Live Change Feed](../../autobyteus-server-ts/docs/modules/projects.md#live-change-feed-and-task-roots))
go to both stores in arrival order:
- `projectStore`: Project upserts (with the server's counts) and removals, once
  the list was fetched.
- `projectTaskStore`: Task upserts/removals/worker status for each **loaded**
  list, keyed by scope (`projectId`, or `no_project` for Temp tasks). A list that
  was never loaded reads fresh when opened.
- **Queue and replay (DS-006).** While a list's read is in flight, its changes
  are queued and replayed onto the arriving snapshot, so a snapshot read before a
  change cannot hide it. Every `connected` (first connection or reconnect)
  re-reads each loaded list and the Project list, because changes may have been
  missed.
- A Task that arrives, or moves to another lane, is highlighted for 2.4 s
  (`liveChanges`; reduced motion keeps only the tint).

### Task root line

A Task row and the Task page ("Assigned to") show the Task's **root**: the agent
or team it was handed to, named from the delegated address (`release writer` for
`/release_writer`; older assignments show "Agent" or "Team"), with the worker's
own status, the left panel's dot and word: Running, Initializing, Idle, Error,
Offline. A root that could not start shows **Couldn't start** with its error. A
DONE (closed) root is Offline with a muted name. There is no "Stopped".

The one rule (`presentTaskRoot`, AR-002): a root is **openable** only when it
started, is not closed, and its hosting run is listed in the left panel's run
history. Otherwise it has no chevron and is not focusable (starting, failed,
closed, or a deleted hosting run). Opening it (`useTaskRootNavigation`) does what
its left-panel row does:
- Agent run host: the run opens in chat with the worker selected; a task Team
  opens its coordinator with the team expanded.
- Agent Team run host: the member opens in the Team view.
- Agent Org run host: the existing Org inspect action for that execution.

### Temp tasks

Tasks with no Project (made by a description-only `delegate_task`) appear under
**Temp tasks**: a header button beside New project (with the number not Done,
hidden at 0), a board with **Open** and **Done** lanes (Done shows its 10 latest
until Show all; search shows every match), and a read-only Task page with the
description, reference file paths and Assigned to. Only agents create or change
them; there is no edit, delete or status control.

### Projects tab in the right panel

The conversation screens (`/workspace`, `/chat?id=…`) have a **Projects** tab,
first in the right panel's tab row (before Files) and in the collapsed strip and
drawer, on desktop only (projects-always-on SR-003). It shows the same live data
as the Projects pages, through the same stores and change feed, beside the
conversation:
- **Picker** (`ProjectsPanelPicker`): one Project or Temp tasks.
  `stores/projectsPanelStore.ts` remembers the choice per node in `localStorage`
  (`autobyteus.projectsPanel.choice.<nodeId>`). Without one, or when the
  remembered Project was deleted, it shows the most recently updated Project,
  else Temp tasks. With no Projects and no Temp tasks it shows an empty state
  linking to the Projects page.
- **Board**: `ProjectTaskBoard` / `TempTaskBoard` in `compact` mode (no page
  header or New task; lanes stack in the narrow panel). Cards use
  `ProjectTaskRow` `activation="select"`.
- **Worker line**: unchanged; it opens the worker's conversation in the center,
  and the Projects tab stays selected.
- **Card**: opens `ProjectsPanelTaskDetail` inside the tab: the full description,
  context or reference files, and Assigned to, live. A back arrow returns to the
  board with its search kept, and **Open in Projects** opens the full Task page,
  where editing stays.

### Left panel task rows (F-006)

Clicking a task agent or task Team row under an Agent run always (re)opens that
run as well, so the conversation opens from any page (for example Projects),
also when the run is already the selected run.

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

New/edit share `ProjectTaskDraftEditor` and `TaskDescriptionComposer`: project
context and page title lead directly to the required Description label and editor.
There is no explanatory subtitle, inner Task details heading, description-help
paragraph or standing file/voice policy note. The placeholder is “Describe the
task…” (en) / “描述任务…” (zh-CN). Heading-only spacing is removed; card padding,
eight-row textarea and responsive actions remain. Context Files/count, attachment/
drag-paste-upload affordances, save shortcut and conditional voice feedback remain.
The label names the textarea; `aria-describedby` references only the existing
required-error node while invalid. Save/file/voice errors remain actionable.
Read-only Task detail retains its Task details heading. First-nonempty-line board
summaries and saved data are unchanged; this cleanup needs no migration or text rewrite.

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
supplies a VoiceTranscriptTarget `{key, isCurrent, appendTranscript}`. Project
create/edit descriptions and Task drafts receive editable text; `useComposerVoiceTarget` adapts the actual composer
context without looking up/inventing an active AgentContext. Voice never saves
a Project or Task, starts a run or stores recorded audio as Task context automatically.

ProjectEditor owns a stable target for each mounted editor and appends dictation
to the latest description, including text typed during recording. Its own pending
voice operation disables Save until it settles; Stop remains available. Cancel
or leaving the editor invalidates that target, so delayed text cannot reach a
new editor. Dictation never submits the form: review/edit, then explicitly Save.
Project and workspace descriptions remain optional, including blank values;
there is no migration or historical-description backfill.

`ProjectVoiceStatus` replaces TaskDescriptionComposer's local status rendering
and serves both Project and Task descriptions. It shows target-scoped starting,
recording/transcribing, cancellation, error and no-speech feedback. Successful
dictation leaves only editable text, with no success banner or reserved status
gap. Its synchronous result snapshot retains useful terminal feedback before
the voice store releases target ownership; it does not own text or saving.
Task attachment controls and manual persistence are unchanged.

The existing installed/enabled local Electron Voice Input extension and device/
permission availability are prerequisites. Browser or unavailable capability
keeps typed/file authoring usable; no sample/fake transcript fallback. One
shared starting/recording/transcribing lifecycle blocks competing capture.
Matching-target Cancel/unmount invalidates late delivery and disposes capture;
uncancellable IPC remains busy until settlement. Late text/errors are ignored
for an invalid destination. Settings tests use their own source without a
Project/Task/composer text sink. See [capture ownership](electron_packaging.md#capture-startup-and-ownership).

Repository capture/worker/IPC doubles prove contracts, **not** installed official
extension, microphone/permission/device or live transcription capability.

## Agent Tools / Scope Exclusions

Exactly `list_projects`, `list_project_tasks`, `create_or_update_project`, `create_or_update_task` are selected
independently per agent/node; `create_or_update_task` is also added automatically wherever `delegate_task` is. Project authoring uses a required name to create
or a known project_id to patch: omitted fields persist, blank description clears.
Optional workspaces [{workspace_id, description?}] reference known registered IDs:
a supplied list replaces all links, [] unlinks only, omission preserves. Retained
link descriptions persist if omitted. No workspace discovery/registration is
provided; the Manager asks for real IDs/the complete desired list when unknown.
The saved Project acknowledgement contains metadata and link IDs/descriptions,
not Task counts or filesystem paths. List requires explicit Project ID after discovery;
create (`project_id` + text, no Task ID) makes a TODO Task with no status; update takes
the Task ID alone (no `project_id`) and patches text and/or exact status; unknown ID fails.
A description-only `delegate_task` creates a Task with no Project for its copy; such
Tasks are on no Project board and not in `list_project_tasks` (the Projects page
lists them read only as Temp tasks), and marking one DONE by its ID removes the
copy from the run tree. Full text and saved context references
are available from listing. Each Task also carries its current (open)
assignments `{targetAgentRunId, kind, assignedBy, outcome}` for follow-up, or
`assignmentsUnavailable: true` if that Task's run file is damaged. Omitted
fields and files persist. A mutation returns a compact recorded-status
acknowledgement, not raw resource diagnostics or a work assessment. There is no
batch or Task attachment mutation tool. See the
[server tool contract](../../autobyteus-server-ts/docs/modules/projects.md#exactly-four-agent-tools).

No Project manager agent is shipped with the app. Any Agent that selects the
Project tools can manage Projects through existing Chat/`@`, for example the
agent repository's Project Task Manager when that repository is configured as an
agent package root; no Project-page chat or assignment panel is added. Such an
Agent selects real saved Tasks, delegates with `{recipient_address, task_id}`,
follows the exact returned ingress run ID and explicitly updates status. The
feature does not supervise physical resources or guarantee worker completion
reports. Linked dispatch loads saved Task text/context internally;
caller description/reference overrides are rejected, and later edits do not
rewrite delivered work. See the server's
[saved-ID / agent run resources contract](../../autobyteus-server-ts/docs/modules/projects.md#saved-id-delegation-and-agent-run-resources).

The Projects pages follow agents' writes live and show each Task's root and its
worker status. There is no scheduler, auto-DONE, mobile delivery,
client/script/skill, or feature-default change.

Reopening a Task to TODO or IN_PROGRESS starts nothing. A later deliberate
delegation adds new runs, and old ones stay closed, unless the agent that
assigned one messages its run ID after reopening the Task: that reactivates
exactly that worker with its conversation, and its rows reappear (see the
server's [Reactivation](../../autobyteus-server-ts/docs/modules/projects.md#reactivation)). Task and Project Delete
remove metadata and context only. They do not cancel work, and they keep the
Task's `agent_run_resources.json` and the run history.

Errors appear through the existing surfaces only; there is no new UI:
- **Migration pending.** While the one-time Projects migration has not
  completed, only the Projects screens show the server's
  `PROJECTS_MIGRATION_PENDING` message ("restart the app to finish"). The rest
  of the app keeps working.
- **Damaged Task run file (Q-3).** The web UI has no status mutation, so DONE
  and assignment come only from agent tools. When a Task's
  `agent_run_resources.json` is damaged, assign and DONE for that Task fail
  with the server's `TASK_AGENT_RESOURCES_UNAVAILABLE` message ("fix the file
  and restart"). The agent receives it as the tool result and relays it in
  chat. A rejected message or wake shows as the existing rejected-command
  result. The Projects screens and every other Task keep working.

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
120-row correctness. PT-E2E-001 checks a fresh node shows Projects (after Agent
Orgs) and opens `/projects`; PT-E2E-015 stores the retired flag as `false` on a
node and checks Projects still opens, Basics has no Projects switch, and Advanced
lists the key as an ordinary setting the user deletes (projects-always-on). The TODO-only 120-row fixture is not mixed-status or capacity/
performance certification. No obsolete overlay/focus-trap or injected same-window
switching journey. `--skip-server-build` requires a current built server;
`--output-dir=<path>` retains evidence. Clear inherited ENABLE_* flags when
running development servers; the probe owns isolated flags/profiles.

PT-E2E-005/006 additionally assert concise New/Edit copy and placeholders in
en/zh-CN at wide/narrow sizes, retained labels/controls, error-only ARIA, reclaimed
heading space, Ctrl/Meta saves, upload failure/retry and save failure/retained-draft
retry. The read-only detail heading and existing preservation journeys remain.

Add `--voice-input` to exercise six additional Project create/edit and Task
voice journeys, including quiet success, manual persistence, optional blank
reload, retry, cancellation and late navigation response. This uses actual
browser capture/AudioWorklet, voice store and HTTP/SQLite; extension discovery
and transcription IPC are fixtures, with a synthetic microphone and test-granted
permission. It does not certify physical devices, native Electron IPC/models or
the packaged desktop shell.

`pnpm -C autobyteus-web test:e2e:project-manager-ux --output-dir <fresh dir>`
(needs a current server build; `--cases PMU-001,…` selects cases) drives the
live pages with scripted AGY agents calling the actual tools.

**PMU-001–007** cover:
- live Project/Task arrival and counts;
- the root line: live status, move highlight, DONE → Offline;
- opening Agent-, Team- and Org-hosted roots and a task Team's coordinator;
- AR-002 with a deleted hosting run;
- Temp tasks and F-006;
- reconnect after a real backend restart, and narrow layout.

**PMU-008–012** cover:
- the left panel kept across Chat, Projects, the board and the Task page, with
  run, Team-member and Org rows opened from Projects;
- a Temp task through DONE, reopen and reactivation, then its chat deleted;
- "Couldn't start" from a real start failure, then re-delegation;
- two windows on one node;
- an Org-hosted root opened before the Org run is hydrated.

**PMU-013** covers compact cards with real-length fixtures (a ~10,000-word
paragraph and a long multi-line brief) on a Project board and on Temp tasks at
1440 and 1024 px:
- each summary and preview renders within 2 lines, and the card height is bounded;
- accessible names are short, and the delete confirmation uses the shortened
  summary;
- short text is unchanged;
- search finds words beyond the visible lines;
- both Task pages show the full description.

**PMU-014** covers compact-card edges at 1440, 1024 and 390 px:
- long text renders exactly 2 lines;
- CJK text is hard-cut at 300 characters;
- a 5,000-character unbroken token wraps without horizontal overflow;
- a long Task keeps its context-file line and worker line visible;
- a short summary appears in full in the delete confirmation.

A raw `/ws/projects` client records message volume. The wire contract itself is
covered by the server's `tests/e2e/projects/project-change-feed.e2e.test.ts`
(see `TESTING.md`).

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
