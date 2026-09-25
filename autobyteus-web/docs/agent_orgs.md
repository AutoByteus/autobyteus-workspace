# Agent Orgs - Frontend

## Scope

The `/agent-orgs` experience authors and runs coordinator-free organizations
made from direct Agents and reusable flat Teams. Configured composition is fixed
depth: Org -> Team -> Agent, with optional direct Org Agents. Teams remain
independently launchable and keep their own coordinator and Team-local handoffs.

## Catalog, Detail, And Authoring

`AgentOrgExperience.vue` provides list, detail, create, and edit views.

- Catalog member chips use the readable Org-local `memberName` role (or localized
  type fallback) as their only label source. They do not read referenced Agent or
  Team definitions, and Reload updates a role label only when the refreshed Org
  membership changes.
- Member selection has separate Agent and Team tabs.
- A referenced Team remains a reference to the admitted Team definition; the Org
  editor does not copy or mutate it.
- Detail uses the same Org-local roles for direct Agents and mounted Teams. When
  mounted Team topology is present, one admitted Org endpoint-catalog read supplies
  Team-local coordinator and nested endpoint roles. Loading or failure of that
  secondary topology never changes a direct member label or exposes a definition ID.
- Org-owned handoffs use explicit **From**, **To**, and ordered **When**
  conditions.
- Handoff sources are exact Agents. Destinations may be an Agent or a mounted
  Team; a Team destination resolves through its direct coordinator.
- Handoff cards, selected previews, and endpoint options show complete readable
  role/Team labels without exposing rooted canonical addresses. Duplicate labels
  receive the shortest distinguishing non-rooted placement suffix. Exact
  canonical addresses remain the native option values and persisted routing
  identities. Long labels wrap and narrow direction cards stack; unavailable
  endpoints remain readable, while malformed addresses use the localized generic
  endpoint label.
- Save is atomic and retains a failed draft for correction.
- Mutation members contain only `memberName`, `ref`, `refType`, and `refScope`;
  Apollo response metadata such as `__typename` is not echoed into input.
  An omitted optional update remains omitted rather than resetting stored intent.

Canonical `org-config.json` and `team-config.json` output has no `schemaVersion`.
Org input validation remains strict. Referenced Team inputs use the supported-field
reader described in [Agent Teams](./agent_teams.md); unused metadata and absent
launch defaults do not bypass required fields or scoped Agent admission.

Startup no longer converts, relocates or cleans authored Team/Org definitions,
including server-owned definition files. Maintainers own any needed conversion;
invalid nested Teams remain unavailable and no Org definition is synthesized.
Existing authoring-migration ledger rows are left inert, not reset, replayed or
reversed. Ordinary explicit authoring saves/transaction recovery are separate.
Software-owned execution/history migration retains its stable ID, prerequisites,
sidecars and history transfer. Stored Org continuation uses persisted enclosing
scope, while individual Agent restore still requires its appropriate Agent
definition. See the [runtime migration boundary](../../autobyteus-server-ts/docs/modules/agent_orgs.md#migration-and-external-publication).

AgentOrg has no coordinator field, initial recipient, or implicit first member.

`avatarUrl` remains optional presentation metadata: omission and null in stored
packages mean no avatar and do not affect admission or exact owned-member
discovery. Org catalog/detail shows the supplied image, falling back to initials
when absent or broken. Sidebar Org definition headers instead fall back to the
Org building glyph; Team headers use the Team group glyph. Agent and Team
catalog cards/details keep their existing image-or-initials behavior. Inspection
requires no package rewrite or runtime activation.

### Org Avatar Editing And Package Deletion

Create/Edit supports image upload, preview and Remove through the existing upload
service. Save waits while upload is pending; failed upload/save retains the draft
for correction or retry. Cancel does not save the avatar reference, and a late
upload from a retired editor cannot update another Org. An unchanged edit omits
`avatarUrl`; an explicit removal sends the empty-string clear intent through the
existing writer (a null update is not a clear). Removing a reference does not
delete the uploaded media file. Existing members, handoffs and hidden metadata
retain their normal save semantics.

Detail **Delete** captures the selected Org identity and asks for named,
irreversible confirmation. It removes that definition package, including
physically owned Agent/Team definitions inside it—not shared referenced
definitions, runtime/history records, attachments or media. It does not Stop a
runtime or recursively delete referenced packages. Source writability and server
transaction guards remain authoritative. Cancel leaves the package unchanged;
pending confirmation prevents duplicate submission, and an error/false result
retains the item with a retryable error. Only confirmed success removes catalog
and cache membership and returns to the catalog. Deleting required definitions
does not guarantee that affected history can subsequently launch or restore.


### Exact Owned References

Authored Org-local references use `org_local`; GraphQL/internal ownership tags
keep their separate existing vocabulary. Cold Org Edit, enclosing Org launch,
and Org-return Team detail resolve exact owned Team and Agent references
independently of shared-catalog eligibility.
Saving waits for complete, identity-correlated references and preserves ordered
handoffs, member values, optional-field omission and expected revision. Exact
owned reads stay fresh without inserting owned Agents into the shared catalog.
Org → Team → Agent detail and Back retain the explicit Org-return context;
ordinary standalone routes remain unscoped.

## Run Configuration

Running an Org opens one configuration panel for the complete mounted scope.
`agentOrgRunConfigStore` owns:

- required Org-root runtime/model/model-config/tool/skill/workspace choices;
- sparse Team-placement overrides;
- sparse exact-Agent-placement overrides;
- exact runtime/model schema readiness;
- the immutable launch snapshot and admission guard.

Effective values resolve as:

```text
direct Agent: Agent override -> Org root
Team Agent:   Agent override -> Team override -> Org root
```

Referenced Agent/Team definition defaults remain standalone defaults and do not
silently override Org choices.

A fresh launch draft selects the real **Temp Workspace (Default)** catalog entry
when it is available, matching fresh AgentTeam launch behavior. Mounted Teams
and Agents inherit that root Workspace unless an exact supported Team-placement
override applies. A deliberate existing/new Workspace choice wins for the rest
of the draft. If the catalog/default is unavailable, the client does not invent
a path; it keeps the exact actionable selection state and blocks Run until a
valid root Workspace is supplied.

### Member Overrides

**Member overrides (N)** starts collapsed, where `N` is the exact number of
configurable Agent placements. Opening it keeps every mounted Team independently
collapsed.

A Team row shows readable name, `TEAM`, exact mounted address, explicit
**Inherited** or **Customized** state, and an accessible disclosure control.
Expanding one Team exposes its Team-placement controls and exact direct-Agent
rows; sibling Teams stay collapsed. Coordinator identity appears only on the
exact coordinator Agent row. Team state changes only for a Team-level override;
an Agent-only change does not relabel the Team.

Valid drafts survive collapse/reopen. The editor never mutates the referenced
definition or selects a runtime recipient.

### Readiness And Runtime Catalog Failure

Run is disabled until every root, Team, and Agent scope is ready. Loading,
invalid, or unavailable runtime/model schema state is shown at the exact scope
and blocks admission.

When an exact Agent runtime catalog request fails:

- the requested runtime remains visible;
- the durable/effective override is not committed;
- an accessible error and **Retry** action are shown;
- Retry replays the retained request through the same bounded path;
- selecting the real committed or Global default abandons the failed request,
  clears its error, restores readiness, and produces no stale launch override.

Server launch validation remains authoritative after the UI readiness check.

## Launch And Focus

`agentOrgRunStore` creates one full Org run and hydrates its AgentOrg V1
execution tree. Launch intentionally has no focused recipient. The workspace
asks the user to choose an exact Agent or Team before using the composer.

The full configured scope is available, but unused direct and mounted-Team Agents
remain genuinely unstarted, provider-unbound and Offline. Only supported work
starts the required execution. Root availability and Agent activity are different
facts; choosing a recipient does not itself start that Agent. Restore also makes
the full scope available without preparing configured workers. After a server
restart, sending to one retained Agent continues that conversation while
unrelated direct and mounted-Team Agents stay Offline. Existing history and
provider bindings are retained, not reset; later legitimate human or peer work
can activate another member. Assigned task preparation/release remains separate.

- Selecting a direct Agent focuses that exact Agent.
- Selecting a Team focuses its direct coordinator.
- Missing or stale focus fails closed; there is no first-member fallback.
- Desktop and narrow layouts preserve exact Team/Agent focus and avoid horizontal
  overflow.

## Workspace, Streaming, And Commands

`agentOrgContextsStore` owns hydrated contexts.
`agentOrgStreamingService` owns the root WebSocket and applies strict shared
collaboration frames. Each command carries the exact root and member execution
identity.

Opened Org roots and their exact member contexts are retained for the current
application session. Switching to another Org, Agent, Team, configuration view,
or other supported workspace surface—and unmounting the Org view while doing
so—does not release the root. Returning to the exact member therefore restores
its independent unsent composer text and selected context files, including a
delayed upload captured before navigation. Successful send keeps its existing
clear/finalize behavior; rejected send keeps its existing untouched-draft
recovery and newer-edit precedence; Stop also retains the draft. Only successful
archive/delete cleanup (or session teardown) releases this local state.
Unsent drafts are not persisted across reload/restart, and the existing draft-file
TTL is unchanged.

Supported commands are message, interrupt, tool approval, and tool denial.
Context attachments use exact Org-root plus AgentRun-owned URLs. Message/task
references keep their separate AgentOrg-rooted reference routes.
Unknown roots, stale AgentRun IDs, wrong member addresses, and cross-root
targets are rejected rather than guessed.

If a valid current stream fails strict admission, the workspace retires that
exact connection generation and recovers automatically. Recovery preserves the
exact selected Team or Agent, verifies the replacement snapshot against durable
checkpoints, and prevents the stale socket from regaining ownership. There is
no manual **Reconnect** action. The client makes at most five recovery attempts;
if none succeeds, it leaves the stream non-ready and presents exactly one
localized notice instead of remaining indefinitely in **Connecting**. A network
or inspection failure does not prove that the Org is inactive: retain last-known
activity until exact-root observation establishes its current state.

A mounted Team uses the same Team workspace panel and task/communication
presentation as a standalone Team. Its live task monitor continues to update
without requiring focus-away/refocus.

Every selected retained Org Agent has independent **Messages** and **Tasks**
facets in the shared collaboration surface. This includes configured direct and
mounted Agents, fresh task Agents, and Agents inside task Teams; a direct Agent
does not need a synthetic Team context. `AgentOrgExecutionViewIndex` correlates
the exact retained AgentRun, physical host, task record, and captured source.
Logical addresses alone do not identify a task instance: repeated delegations
to the same address remain separate executions.

**Messages** projects only committed ordinary root messages in which the exact
selected AgentRun is sender or receiver. All admitted configured/task endpoint
pairs share truthful sent/received direction, counterpart identity, content,
time, and message-owned references. The receiver's center monitor receives one
inbound member input from the same committed message before its reserved input
is released. Live updates, history, and Restore retain the same root-owned
identity; there is no second Team ledger or configured-only presentation gate.
References stay on the AgentOrg-rooted message route.

**Tasks** projects exact durable assignments, submissions, reviews,
interruptions, and their references. A record is relevant to its exact delegator,
task Agent, or members of the assigned fresh task Team. Separately delegated
descendants do not join that roster merely through ancestry. Participant links
open the exact retained AgentRun, including settled instances, without selecting
the current configured source at the same address. The shared section owns
layout and local selection; the Org adapter owns record projection and routes.

Messages keeps compact readable counterpart/type/direction/time/content and
reference rows, without a permanent address or Task/ID badge. Exact counterpart
address, AgentRun and task/host/execution identities remain available in an
on-demand detail disclosure. Task detail likewise retains its familiar heading,
status, direction, time and content without the extra participant strip. Agent
names in the direction line navigate exactly; Team names disclose the complete
exact assigned roster, including non-coordinators. System lifecycle items reveal
assignment participants without inventing a named sender. Disclosure state resets
on item, reference or scope changes; readable labels never replace identity keys.

Genuine accepted task-system inputs appear in the recipient event monitor, not
as ordinary Messages. A task record alone never fabricates a notification or
receipt. A rejected notification leaves the committed task record visible and
reports the warning truthfully. Fresh message/task/status publications update
already-mounted facets without refocus; snapshots are the recovery path, not a
substitute for normal live publication.

The left **Workspaces** hierarchy remains mounted across configuration, active,
focused, and stopped/history states. Within each Workspace it retains the
existing Agent and **Teams** groups and places **Orgs** (**组织** in zh-CN) as
the distinct sibling group immediately below **Teams**. This is history-heading
copy only; main-navigation **Agent Orgs**, domain/API names and category membership
are unchanged. Switching between an Org member and
a standalone Agent/Team makes the destination the sole URL, center, and current
row owner: standalone selection uses query-free `/workspace`, while an Org
selection uses its exact `rootSubjectKind=agent_org`, root-run, and mode query.
The transition retires the other selection family rather than keeping a stale
Org center or two highlighted rows.

Explicit user navigation owns one ephemeral selection intent in
`agentSelectionStore`. Selecting hydration/focus and its outer navigation,
loading and error completion may commit only while that intent is current.
Background task/member publication and temporary-ID promotion do not create a
new user intent: live data continues to update without becoming a selection
command or discarding the selected context's draft. Existing identity, activity
and request-generation checks still apply. Current real publication and explicit
leave/return journeys pass; the writer responsible for the historical single
publication-related redirect remains unassigned, so this is not a causal claim
about that incident or a guarantee against every future timing interleaving.

For a focused configured direct Agent or Agent inside a mounted Team, the header
gear opens the enclosing AgentOrg's complete canonical run configuration. The
shared launch/existing form shows the Org root, direct Agents, mounted Teams and
their configured Agents in the familiar hierarchy. Runtime, tool approval and
skill policy remain locked. Workspace stays locked on the Org root, direct Agents
and individual Team Agents. In an eligible stopped Org, the mounted Team's
**Workspace Directory** selector supports Existing or New directories. One explicit
**Save** updates that Team's default and every configured child, including Agents
with custom model/runtime settings or a previously distinct workspace. Sibling
Teams, direct Agents and historical task snapshots are unchanged. Model and
workspace edits are saved together; a Team workspace draft never resets models.
No project files, conversation history or provider sessions are moved or reset.
Fresh delegation uses the updated configured source. If the saved workspace's
metadata cannot be loaded, Files shows unavailable feedback rather than the old
workspace or an unrelated launch draft; reopening Settings retries canonical
metadata without repeating Save. Existing launch drafts are preserved.
While the enclosing Org is stopped, explicit **Save** can also change compatible
same-runtime models (all current external-runtime catalog choices, or verified
equal/larger context capacity for AutoByteus) and schema-valid parameters across configured
scopes. Parent-linked scopes follow root or Team edits until directly edited;
pre-existing and directly edited overrides stay independent.
Active/unknown, archived and application-owned roots stay noneditable; task
inspection does not acquire configuration editing. A failed or uncertain Save
never reports success; an uncertain outcome requires explicit canonical refresh.
The Org manager serializes one whole-root aggregate command with restore,
validates every configured target, changes only model fields, writes once and
verifies the entire canonical result by strict readback. Validation failure is
all-or-none. Inspect/Save does not start an Agent/provider or rewrite history.
**Back** retains the same member/context; reopening reads canonical values.
Normal Send still restores the canonical root using saved values, with lazy
member startup. **New (+)** reads the enclosing Org through inactive-capable
inspection and opens a new editable configuration seeded with its root, Team and
Agent settings. It does not add a member, activate or alter the retained run.
The source run ID is navigation provenance only; ordinary Create allocates new
identities without copying tasks, history, attachments or provider bindings.

Seed initialization waits for exact current definition references and installs
once per navigation intent. Parameters (including null, 0 and false), sparse
immediate-parent overrides, tool policy and supported workspace paths are retained.
Changed placement identities or non-authorable skill/per-Agent workspace values
block initialization instead of silently substituting defaults. Load failures
have explicit Retry. Catalog Run without a source retains normal default mode.

Empty model selections remain blocking but show neutral scope-specific required
hints. Nonempty unavailable models and real runtime/catalog/schema failures stay
visible errors. Metadata refresh does not silently erase saved source selections;
deliberate runtime/model edits retain their normal clearing/inheritance behavior.

### Cold Exact Inspection

A participant link can open before the narrow history drawer mounts. If the
Org-family row is not loaded, the existing history action awaits an authoritative
Org-family refresh, propagates its error, and resolves the exact root before
navigation. It does not infer a row from a live context or trigger Restore as a
read fallback. Normal emitted-route Back/Refresh preserves the exact retained
AgentRun in active and inactive read-only inspection, without opening the drawer,
reactivating the task, or replacing it with a same-address execution.

## Status And Hierarchy

Each Agent row shows its exact runtime status. Every direct mounted Team row also
shows a presentation-only aggregate over the Agent rows in that Team branch:

```text
running > initializing > error > idle > offline
```

Configured and task-scoped descendant Agents contribute. Direct Org Agents,
sibling Teams, ancestors, and the Team container itself do not. Empty/unknown
input is offline. The aggregate remains visible while the Team is collapsed and
does not own polling, lifecycle, focus, readiness, or command authority.

Task Agents and task Teams are transient execution projections. They can be
nested by task delegation without changing the fixed configured Org topology.
Status projection walks each structural Team root once and lets that Team own
recursive descendants; the flat Team directory is not reused as recursive
status roots, so nested task-Team Agent statuses remain unique.

## History, Restore, And Stop

AgentOrg history is a distinct root family projected into the same unified
Workspaces hierarchy. AgentTeam and AgentOrg roots keep explicit root kinds and
family-specific loaders; a failure in one family retains the other family and
the last good slice instead of blanking the entire navigation tree.

History publication is independent for the workspace family (standalone Agents
and Teams) and the Org family. `runHistoryLoadActions` accepts each response and
synchronously refreshes the existing navigation projection through
`refreshRunNavigationTopology`; changing a raw history array alone is not the
render boundary. Ready rows do not wait for the other family, definition/avatar
enrichment, or active Agent/Team reconnection. Existing workspace-descriptor
visibility rules still apply; this does not invent rows for unresolved workspaces.

The full fetch still awaits both branches and workspace enrichment/reconnection
before settling loading and performing its final topology refresh. Usable rows
can therefore coexist with an ongoing loading indicator. There is no detached
background replacement for the existing lifecycle work. Full and focused Org
requests retain latest-initiated generation ownership before publishing state,
errors or retained-recovery effects. A failed family retains its last accepted
slice and family error; a successful empty result is not a pending/failed result.
Normal quiet refresh, selection, disclosure and stopped-run non-activation remain
unchanged. This is a frontend scheduling change, not a migration, backend index
redesign, fixed latency guarantee or measurement of a particular user's startup.

Each individual Org run has one native primary summary control containing its
chevron, lifecycle dot and summary. Pointer activation on either the text or
chevron pixels and native Enter/Space activation all follow the same exact path:
toggle that run's hierarchy, then retain its existing open/select action once.
The presentational chevron is not a second focus target or independently labeled
button. Only the primary control exposes `aria-expanded` and publishes
`aria-controls` while its hierarchy is rendered. The control can collapse active
or stopped, selected or unselected runs without inspection, Stop or runtime
activation. Collapse preserves the selected conversation and draft, mounted-Team
expansion and sibling run state. History refresh does not undo a manual collapse.
Stop remains a separate isolated sibling action; explicit member navigation can
reveal its owning hierarchy. Expansion state is local UI state, not persisted
across application restart.

An inactive top-level AgentOrg row also exposes Team-aligned **Archive** and
**Delete** actions. Archive is non-destructive: it hides the row from default
history only after the server has durably updated the AgentOrg tree and index.
Delete opens an AgentOrg-specific confirmation and permanently removes only the
exact stopped run package after authoritative success. Active roots remain
Stop-only. Both action buttons are independently focusable and named, stop row
click propagation, and disable conflicting work while pending.

After a successful Archive or Delete the client prunes only that root, retires
its exact retained context, refreshes history, and leaves `/workspace` only when
the removed root owns the current route. A rejected or failed command preserves
the row, route, selection, context, and all siblings and shows failure feedback.
These actions never delete an Org definition, referenced Agent/Team definitions,
workspace registration, providers, or unrelated history. No archived-history
browser, unarchive path, migration, or mounted-member lifecycle action is added.

- A new AgentOrg row displays `New - <AgentOrg name>` until the first
  successfully accepted non-empty external user message reaches an exact
  configured direct Agent or an Agent inside a mounted Team.
- That first message becomes the stable one-line summary after the server's
  authoritative AgentOrg-only history refresh. Whitespace is compacted and the
  title is limited to 100 characters (97 plus `...` when truncated).
- The client never patches the submitted text optimistically. Correlated
  accepted acknowledgements trigger a `network-only` Org-family refresh, and a
  monotonic request generation prevents an older response from replacing the
  newest slice.
- Later messages, task-scoped recipients, inter-Agent/task/system traffic,
  approval or interrupt commands, and rejected or failed sends do not set or
  replace the summary. A failed refresh retains the last authoritative rows and
  family-scoped error.

- Stopped history retains the AgentOrg V1 execution tree, messages, task records,
  member memory, and provider bindings.
- Read-only inspection uses `getAgentOrgRunInspection` and exact retained
  AgentRun selection. It reads the current strict package without activating,
  restoring, migrating, or repairing it. Missing/unreadable records are errors,
  not fabricated empty history. Configuration comes from the captured launch
  snapshot and projections use the actual execution/provider binding, never a
  same-address configured Agent's transcript or the Org-root memory path.
- Settled task executions remain inspectable after their live row retires.
  Retained task inspection is read-only, without composer, tool decisions or
  interrupt authority. Inactive configured Agents may expose a continuable
  composer: inspection itself remains observational, while deliberate Send
  restores the exact root and waits for strict stream readiness before dispatch.
  Inactive contexts initialize offline. Editing a new draft or discarding it
  does not activate runtime; failed continuation does not overwrite a newer
  draft. Restore acceptance alone is not interaction readiness.
- Restore rebuilds the same logical placements and preserves supported provider
  conversation identity.
- A stopped Team can restore independently through its own Team root journey.
- **Stop Org** terminates only the selected Org root and all materialized
  descendants; another standalone Team root remains unaffected.
- Terminal Agent rows become offline and no reconnect control is synthesized.
- Migration/recovery errors are surfaced explicitly; clearing recovery state
  requires a verified successful restore.

### Stop, Read Freshness And Retained Focus

Successful root termination immediately publishes inactive activity through the
existing history/navigation owner, retaining the same selected conversation
rather than redirecting to a launch screen. Failed Stop does not optimistically
mark the root stopped. Final history and inspection acquisition disables Apollo
in-flight query deduplication only on the relevant Org history, root inspection
and member projection requests; a newer logical generation must not consume an
older physical response. Generation, exact identity and activity-revision
checks still govern atomic publication. No global Apollo setting, timer, polling
or permanent stopped overlay is introduced. Root lifecycle, Agent statuses and
mounted-Team aggregates remain separate authorities.

### Attachments And Follow-Up Scope

The shared chooser captures exact Org/AgentRun ownership before asynchronous
work. Preparation, draft finalization, Open, removal and captured Send use that
owner, not whichever Agent is later focused. Original recorded non-media
attachment facts survive initial, cold and earlier-page hydration; files from
another sender remain owned by their original execution. Friendly upload labels
do not alter saved names/URIs or genuine custom names.

The collaboration follow-up keeps one canonical reactive local UserMessage in
both the visible conversation and the submission handle. Final attachment
descriptors therefore update the already-mounted chip, rather than a raw alias.
Current standalone AutoByteus/DeepSeek first text Send and immediate real chip
Open return the final file with original bytes; narrow and ordinary same-input
reopen also pass. Separate text/JSON link opening and saved ownership remain
unchanged. This does not extend acceptance to additional media/providers or a
new Electron-shell build.

The archived AORG ticket's accepted failures and original evidence remain
historical, read-only records. The follow-up validates fresh-unused Offline,
current publication/selection behavior, and immediate text attachment access
independently; it does not rewrite those old results or assign the original
navigation incident's cause. See the current follow-up ticket's validation
report for the exact acceptance scope.

## Store And Component Ownership

- `agentOrgDefinitionStore.ts`: admitted catalog and definition CRUD.
- `agentOrgRunConfigStore.ts`: launch draft, sparse overrides, readiness, and
  admission.
- `agentOrgRunStore.ts`: create/restore/terminate and selected Org.
- `agentOrgContextsStore.ts`: hydrated execution contexts and owned read-only
  inspection requests.
- `services/agentOrgExecution/agentOrgExecutionViewIndex.ts`: derived retained
  execution/task identity index; not another persistence or lifecycle owner.
- `services/agentOrgExecution/agentOrgTaskPresentation.ts` and
  `agentOrgCommunicationPerspective.ts`: root-owned Tasks and Messages facets.
- `services/agentOrgExecution/agentOrgStreamingService.ts`: stream protocol.
- `services/agentOrgExecution/agentOrgContextHydration.ts`: initial/reopen
  hydration.
- `components/agentOrgs/AgentOrgExperience.vue`: catalog/detail/authoring and
  captured-identity Delete confirmation.
- `components/agentOrgs/AgentOrgAvatar.vue` and `AgentOrgAvatarEditor.vue`:
  Org image/initials presentation and draft upload/preview/remove.
- `components/workspace/config/AgentOrgRunConfigPanel.vue`: launch form.
- `components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue`:
  AgentOrg rows within the unified Workspaces projection. The separate
  `AgentOrgRunHistoryPanel.vue` history owner was removed.
- `components/workspace/collaboration/CollaborationOverviewPanel.vue` and
  `CollaborationDelegatedTasksSection.vue`: shared independent facets and Tasks
  layout, replacing the Team-only Tasks section.
- `components/workspace/org/AgentOrgWorkspaceView.vue`: focused/unfocused and
  stopped workspace states plus the enclosing-Org config/Back adapter.
- `components/workspace/config/AgentOrgRunConfigForm.vue`: shared launch and
  stopped whole-Org hierarchy body. Existing mode is backed by the canonical
  execution tree and the subject-neutral existing-run editor/store.
- `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` and
  `WorkspaceHistoryWorkspaceSection.vue`: always-mounted mixed-family
  Workspaces hierarchy and sibling Agent/Team/AgentOrg groups.

Backend contract details are in
[`autobyteus-server-ts/docs/modules/agent_orgs.md`](../../autobyteus-server-ts/docs/modules/agent_orgs.md).

### Retained Org Recovery After Transport Loss

An already-mounted Org remains read-only while the server's state is unknown.
Disconnected stream recovery first uses the same exact-root, read-only inspection
reader as manual inspection. A validated inactive view is fully hydrated and
published by the Org contexts store before the old service is retired. Matching
AgentContext objects, current focus, drafts and tracked submissions are retained;
configured members become Offline and continuable. Observation never restores a
root, starts a provider, replays input or treats a query failure as inactivity.

An active inspection does not make the stream ready: existing checkpoint-before,
CONNECTED/snapshot, and checkpoint-after validation still applies. Stop invalidates
the old transport before awaiting termination. A rejected Stop preserves last-known
activity and identity but requires fresh observation and synchronization before input.

Successful current-generation full or Org-only history loads can request another
bounded recovery cycle for already-retained unsynchronized roots. Returned row IDs
are only a trigger; inspection, not a history status string or absent row, determines
Org liveness. Scheduled/in-flight recovery and local stop/continuation remain
coalesced under their existing owners. Standalone Team history reconciliation is
unchanged. Root observation and member readiness remain separate responsibilities.


## Catalog Lookups Versus Exact Org References

`agentTeamDefinitionStore.getCatalogAgentTeamDefinitionById` and
`getCatalogAgentTeamDefinitionByName` synchronously search the current catalog
snapshot. A `null` result is a catalog miss, not proof that a definition is absent
from storage. These getters do not query or add owned definitions to the catalog.

Org editor, Org-owned Team detail and enclosing Org launch use
`loadAgentOrgDefinitionReferences` for exact, scope/owner-validated references.
Its required `AgentOrgReferenceCatalogLookup` callbacks,
`getCatalogAgentById` and `getCatalogTeamById`, supply only eligible catalog
matches; owned references use exact reads. The selected reference graph remains
local to its view and does not change shared/application catalog membership.
Reading a definition does not grant shared visibility, independent mutation or
new standalone run permissions. This boundary does not change the existing
independent Run/Edit policy for owned Teams.

Read-only Org detail does not use the full definition graph for labels. Direct
rows retain their owning membership objects, while mounted Team coordinator and
handoff roles come from `agentOrgEndpointCatalog(id)`. Agent and Team catalogs
are loaded by the Agent Org experience only for create/edit selection and full
draft validation, not for list/detail browsing.
