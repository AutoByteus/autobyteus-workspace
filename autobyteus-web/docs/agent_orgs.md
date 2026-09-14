# Agent Orgs - Frontend

## Scope

The `/agent-orgs` experience authors and runs coordinator-free organizations
made from direct Agents and reusable flat Teams. Configured composition is fixed
depth: Org -> Team -> Agent, with optional direct Org Agents. Teams remain
independently launchable and keep their own coordinator and Team-local handoffs.

## Catalog, Detail, And Authoring

`AgentOrgExperience.vue` provides list, detail, create, and edit views.

- Member selection has separate Agent and Team tabs.
- A referenced Team remains a reference to the admitted Team definition; the Org
  editor does not copy or mutate it.
- Detail shows direct Agents and mounted Teams, including each Team coordinator.
- Org-owned handoffs use explicit **From**, **To**, and ordered **When**
  conditions.
- Handoff sources are exact Agents. Destinations may be an Agent or a mounted
  Team; a Team destination resolves through its direct coordinator.
- Save is atomic and retains a failed draft for correction.
- Mutation members contain only `memberName`, `ref`, `refType`, and `refScope`;
  Apollo response metadata such as `__typename` is not echoed into input.
  An omitted optional update remains omitted rather than resetting stored intent.

Authored `org-config.json` and referenced `team-config.json` have no
`schemaVersion` field. This does not remove required member fields or permit
retired/nested Team shapes. Normal authoring/import/reload uses strict current
codecs; only the server-owned startup transition handles supported prior numeric
configs. Runtime execution-tree versions are unchanged.

AgentOrg has no coordinator field, initial recipient, or implicit first member.

### Exact Owned References

Authored Org-local references use `org_local`; GraphQL/internal ownership tags
keep their separate existing vocabulary. Cold Org detail/Edit resolves exact
owned Team and Agent references independently of shared-catalog eligibility.
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

For a focused live direct Agent or Agent inside a mounted Team, the header gear
opens that exact AgentRun in the established locked Agent configuration form.
Runtime, model, Workspace, and tool-approval identity remain inspection-only.
**Back** returns to the same exact Org/member event monitor without disconnecting
the live context; **New** remains a separate action that starts a fresh AgentOrg
launch configuration without retaining the current `orgRunId`.

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
- `components/agentOrgs/AgentOrgExperience.vue`: catalog/detail/authoring.
- `components/workspace/config/AgentOrgRunConfigPanel.vue`: launch form.
- `components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue`:
  AgentOrg rows within the unified Workspaces projection. The separate
  `AgentOrgRunHistoryPanel.vue` history owner was removed.
- `components/workspace/collaboration/CollaborationOverviewPanel.vue` and
  `CollaborationDelegatedTasksSection.vue`: shared independent facets and Tasks
  layout, replacing the Team-only Tasks section.
- `components/workspace/org/AgentOrgWorkspaceView.vue`: focused/unfocused and
  stopped workspace states plus the exact-member config/Back adapter.
- `components/workspace/org/AgentOrgMemberRunConfigPanel.vue`: locked current-
  Agent configuration presentation.
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
