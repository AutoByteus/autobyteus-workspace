# Agent Teams - Frontend

## Scope

The Agent Teams surface defines, inspects, and launches reusable **flat** Teams.
A Team contains Agent members only and has one direct Agent coordinator. Stable
multi-Team composition is authored as an [Agent Org](./agent_orgs.md), never as
a nested Team definition.

For shared execution/event behavior, see
[Agent Execution Architecture](./agent_execution_architecture.md).

## Catalog And Definition Authoring

The `/agent-teams` route shows shared and application-owned root Team
definitions. Featured placement is controlled by
`AUTOBYTEUS_FEATURED_CATALOG_ITEMS`; it is presentation metadata, not a Team
definition field.

The create/edit form owns:

- Team name, description, instructions, and category;
- direct Agent membership;
- one coordinator chosen from those direct Agents;
- ordered Team-local handoffs;
- optional default launch preferences.

Canonical Team saves/exports remain strict and contain no `schemaVersion` or
member `refType`. Normal package reads/import/reload extract supported fields
and ignore unused metadata, including those fields, without rewriting source
files. Missing or null `defaultLaunchConfig` means no package defaults; valid
supplied defaults keep their values. Omitted or null `avatarUrl` means no image.
Catalog cards/details keep their existing initials fallback; sidebar Team
definition headers use the Team group glyph when the image is absent or broken.
Valid supplied avatars retain normal image rendering. Sidebar Org definition
headers use the analogous image-first/building-glyph fallback, without changing
Agent avatars. Other required fields, value types and launch settings remain
validated.

Agent member rows use `memberName`, `ref`, and explicit `refScope`. Actual scoped
Agent lookup and handoff validation determine availability: ignoring `refType`
does not turn a nested Team reference into an Agent. An invalid parent is excluded
whole, without partial membership or suppressing valid siblings. Package
registration is not a count of available Teams. The UI must not offer deeper
configured composition. See the [Team input and write contract](../../autobyteus-server-ts/docs/modules/agent_team_definition.md).

Shared Teams can be created, updated, and deleted through the shared provider.
Teams from a registered agent package (a local folder or a GitHub install) are
edited, saved and deleted like the package's Agents: the save, including the
default runtime/model, is written into the package folder. Edits to a GitHub
install are overwritten by a later package update. Org-owned Teams are changed
through their Org.
Application-owned Teams are inspectable and editable only when the owning
bundle source is writable; generic deletion does not bypass source ownership.
Team-local private Agents remain discoverable through their owning Team detail.

### Definition Detail Layout

Every Team detail uses `AgentTeamDetail.vue`, including Teams reached from an
Org. Its sections appear in reading order: **Description → Members →
Instructions → Handoffs**. Members retain their definition order, count,
coordinator badge and View links, so long instructions or handoff rules do not
precede the roster. The cards keep the existing two-column wide / one-column
narrow layout. Header actions, instruction disclosure and ownership-scoped
navigation remain unchanged; this placement does not alter membership or routing.

## Handoffs

Team-local handoff authoring uses explicit **From**, **To**, and ordered
**When** conditions. Both endpoints are direct Agent members of the Team.
Changes remain in the definition draft until the complete definition saves
atomically. Invalid/self-resolving endpoints, duplicate pairs, empty conditions,
and member changes that leave stale references block save visibly.

Handoff cards, selected previews, and native endpoint options present readable
member labels rather than rooted canonical addresses. Exact addresses remain the
option values and saved routing identities; display text must never replace them.
When two endpoints have the same readable label, the UI adds the shortest
human-readable placement suffix that distinguishes them. Unavailable endpoints
use a readable non-rooted address form, or the localized unknown-endpoint label
when the stored address is malformed. Long identity labels wrap, and the
direction layout stacks at narrow widths instead of clipping or overflowing.

AgentOrg owns cross-Team and Org-level handoffs. A Team selected as an Org
destination routes through its direct coordinator, but the Org editor never
mutates the Team's local handoffs.

## Standalone Team Launch

On desktop, a Team starts from **New chat**: **Run** on an Agent Team (list or
detail) opens New chat addressed to the Team, and **+** on a Team run opens it
prefilled with that run's settings and member overrides (team defaults if the
run cannot be read). The composer's workspace, approval, model and thinking (and
other model settings such as Codex Fast mode) are the Team's settings. The
members line under the composer opens the **Member settings** drawer, where a
member can override model + runtime, thinking, other model settings and tool
approval; only differing fields are stored. The first message starts the run and
goes to the coordinator, with its `@` mentions. See
[Chat](./chat.md#launch) and [Agent Orgs](./agent_orgs.md#member-settings).

`chatLaunchService.launchTeamChat` builds the team config with the overrides,
loads every effective runtime's catalog, and creates the immutable launch draft
in `teamRunConfigStore` (which also backs mobile run setup). Send is blocked by
the shared readiness rule (`utils/runSettings/launchReadiness.ts`) when the Team
is gone, any member's effective runtime is unavailable, or any member has no
model. See [Org readiness](./agent_orgs.md#readiness) for the shared rule; this
does not change Team coordinator/focus semantics.

### Member Launch Defaults

Every Team start that does not copy a run's member settings seeds each member
from its own agent default (`utils/runSettings/memberLaunchDefaults.ts`,
`seedMemberLaunchDefaults`, run by `chatDraftStore.seedTeamMembers`):

| Start | Root | Members |
| --- | --- | --- |
| **Run** on a Team (fresh), mobile run setup | Team default → last chat model → default runtime | Seeded and pinned |
| New chat heading switcher → a Team (`retarget`) | Kept from the composer | Member overrides reset, then the new Team's members seeded and pinned |
| Org page heading switcher → a Team (carried `startForDefinition`) | Carried | Seeded and pinned |
| **+** on a Team run (`copied`) | Copied | Copied as recorded, not seeded |

`seedTeamMembers` loads the Team's definitions itself. After its catalog checks it
re-checks that the draft is still open and still on the same Team. It never
overwrites a row the user changed meanwhile. A quick switch to another target
leaves no late seeds. A failed definition or catalog read is logged, and the rows
then follow the root. The order is the member's agent default, then the root's
settings:

- A member whose default is usable gets it as its row's own runtime, model and
  model settings, taken together. The row counts as customized. Usable follows
  the start-default rule (`usableStartCandidate` in `startModelDefaults.ts`): it
  names a runtime and a model, the runtime is available, and the model is
  offered. Unlike a root start, there is no "first model of the default runtime"
  fallback for a member.
- A member without a default follows the root.
- A member whose default cannot be used follows the root, and its row shows
  "Its default (…) can't be used: <reason>. It follows the settings above."
- Seeded rows are pinned (`normalizeMemberOverride(…, { pinnedModel })`):
  changing the root model does not move them, even when the root is set to the
  same model. A pin is released only by resetting that member's model, the row,
  or **Reset all**. The member then follows the root.
- **+** (copy settings from a run) keeps the run's recorded member settings,
  including a member that was reset to follow the root. It is never seeded or
  pinned.
- Mobile setup has no member rows. It applies the seeds asynchronously, only to
  the draft it was computed for and only while the same Team is still selected,
  and shows no note.

What the form holds at Run is what runs: seeded rows are sent as ordinary member
overrides. Delegated Team copies that an agent starts resolve
their members on the server with the same order; see the server
`docs/modules/agent_communication.md` ("Launch configuration of catalog
copies").

Fresh definition-based standalone Team setup starts the root automatic-approval
setting **on**, on desktop (New chat) and mobile and after application restart. Members
without an approval override inherit the root value; an explicit member false
still wins where its runtime permits it. The root can also be turned off where
permitted. Ordinary model/workspace edits do not reset a deliberate opt-out.
Antigravity retains its existing forced-on/locked policy, distinct from this
fresh-template default. Saved settings and seeds copied from existing runs keep
explicit root/member approval choices, including false; New Chat retains its
existing on default. On mobile the shared frontend
`useDefinitionLaunchDefaults.ts` constructor supplies the fresh value; on
desktop `chatDraftStore` does. Neither is a backend default or a migration.
The Org launch page also defaults to on; direct API callers are unchanged. See
[Agent fresh-run automatic approval](agent_management.md#fresh-run-automatic-approval)
for the trust boundary.

A standalone Team launches one native Team V2 root. The coordinator becomes the
initial focused Agent for the familiar Team journey. Browser launch input does
not supply concrete TeamRun/AgentRun IDs; the server allocates and validates
them.

Launching makes the root and configured scope available without starting unused
Agents or binding their provider conversations. They remain truthfully Offline,
including the initially focused coordinator, until supported work requires them.
The first real input/delivery starts the required member; a visible selection is
not evidence of an active worker. The same fresh-unused policy applies to direct
and mounted-Team Agents in a new AgentOrg. Restoring a retained Team or Org also
leaves configured members Offline until actual work reaches them, even when they
have prior history. Sending after a server restart restores the complete scope
but readies only the required recipient; later peer or human input can start
another member. Saved conversations, attachments and identities are preserved.
Delegated children likewise start shut down (`offline`) after a restart and
wake only when a same-root message reaches them.

The effective standalone configuration is resolved for each direct Agent from
the Team root plus any exact Agent override. Definition defaults seed the new
draft but are not persisted merely because a schema default is displayed.
For a root or member seeded with an exact saved model ID absent from the
backend's offered choices, launch controls request an exact-current descriptor
and retain the ID/schema as a current-only value. In particular, a stored
Claude `default` is not silently changed to its recommended offered sibling.
Each configured scope still needs valid catalog/schema evidence before launch;
the descriptor lookup does not make an arbitrary new ID selectable.

## Execution Identity And Commands

Every executable Team target uses an exact `TeamExecutionAddress`:

```ts
interface TeamExecutionAddress {
  rootTeamRunId: string;
  taskTeamRunIds: readonly string[];
  memberAddress: string;
  taskAgentRunId: string | null;
}
```

A direct configured Agent has an empty task-Team chain and
`taskAgentRunId: null`. Delegation can create task Agents or task Teams; those
task-scoped executions extend the exact address but are not configured Team
members.

Message, interrupt, tool approval/denial, token usage, Team Communication,
history selection, and Activity all use the same exact identity. The frontend
does not retarget by display name, route key, first matching Agent, or stale
focus.

## Runtime, Tasks, And Status

`agentTeamRunStore` owns launch, restore, focused commands, Stop, and
streaming. `agentTeamContextsStore` owns hydrated execution contexts.
`TeamStreamingService` parses the shared contracts and routes each frame to
the exact execution.

Root Team lifecycle is a binary manager-owned fact. Each Agent owns its own
`offline | initializing | idle | running | error` status. Connection state,
root lifecycle, Agent status, delegated-child liveness, and command overlays are not
interchangeable. A restored standalone Team scope can be Active while every
configured Agent remains Offline: the Team stream can reopen scope without
starting providers. Green/Idle is not evidence of model reasoning. Do not copy
Org container-status expectations onto a Team or start workers to reconcile status.

Every Team row in the Workspaces tree (TEAMS run rows, delegated Team rows —
including a Team delegated inside a delegated Team — under Agent, Team and Org
runs, and Org-internal Team rows) shows one
universal Team status dot before the slate people-group icon. It shows the
highest state among the Agents shown under the row, collapsed or not:
busy (running or starting, pulsing blue) > error (red) > idle (green) >
offline (gray). Closed task work does not count. A stopped run is gray. A TEAMS
group row shows the highest status among its runs. So the restored Team above
reads gray while its Stop button stays. The status is derived on the client
from the Agent statuses and root liveness. It is not a root lifecycle and does
not decide Stop, archive or delete. See
[Agent Execution Architecture](agent_execution_architecture.md) for the rule
owner.

Task delegation is a pure spawn. A delegated task Agent or task Team is shown
as a transient execution row whose starter ("Started by <delegator>") is in the
accessible label only (see below); there is no
Tasks surface, task status, submission, review, or task reference file. The
right-side Team tab shows Messages only. The child's single execution-tree
write becomes durable, and `TASK_EXECUTION_STARTED` is published, before its
Agent frames are released, allowing an early-selected child monitor to advance
without reload or refocus. A child that stays quiet is shut down after the
server grace period (but not while it has a running background task) and keeps its row with the standard `offline` status;
sending to it from the composer (or a peer `send_message_to` by run ID) wakes
it with its conversation. Nothing distinguishes a shut-down child from a
configured member that has not started other than the row kind.

When the Project Task that a child was delegated for becomes DONE, the child
(and, for a task Team, its members and nested delegations) leaves the Team's
Workspaces tree. The rows fade and collapse in 200 ms, or go at once under
reduced motion. The root Team stream publishes `TASK_EXECUTIONS_CLOSED` before
the child runs are stopped, so the rows leave even if a stop fails. The view
snapshot and the Team resume config carry `closed_task_executions` beside the
unfiltered execution tree, so closed rows stay hidden after reload, restart and
Task deletion. A selected or focused closed row hands selection and focus to the
delegating Manager. Messages with closed runs stay in the Team tab, and nothing
is deleted from disk. Reopening the Task and delegating again shows the new runs
only. When the delegating agent reactivates a closed child (it reopens the Task,
then messages the child's run ID), the stream publishes
`TASK_EXECUTIONS_REOPENED` and the child's rows return without reload; its own
still-closed helpers stay hidden. Other Team surfaces (the members panel, running list and token usage)
still list closed members.

## Workspace History Sidebar Task Peers

In an expanded Team run, available task Agents appear immediately after their
corresponding recipient Agent at the same indentation level. They do not require
opening that Agent, and an Agent has no disclosure solely for delegated task
Agents. Task rows use the ordinary tree-row style (no dashed box or tint) and
keep their runtime status and exact-execution selection by mouse, Enter or Space. A task Agent shows the member
marker (solid status dot and initials) centered on its name line; the starter is
in the accessible label only, not a visible "Started by" line; branch lines run
straight through member and task rows.
Repeated tasks at the same address remain separate conversations. Loading,
failed inspection and retry retain the existing focus-commit behavior.

This is a sidebar projection, not runtime reparenting.
`stores/runHistoryTeamExecutionRows.ts` derives effective parent/depth for
`task_agent` leaves whose source parent is `configured_agent` or
`task_team_agent`, then recomputes child membership. The history navigation
index and renderer consume that same topology, so peer selection does not need
to expand the recipient Agent. Shared Team navigation stays unchanged.

Actual Team/task-Team containers still contain their descendants; collapsing
the outer Team run hides its contents. Source-owned live/retained availability
is unchanged: peer placement does not fabricate unavailable history.
No-context history still shows configured members only. This does not add
nested configured-Team authoring or change Agent Orgs, delegation, identity, or
persisted data.

A **catalog copy** (`delegate_task` to a listed catalog Agent or Team that is not in the
run) is an ordinary task row, Offline until its first message. The Team view has no collaborator
concept: runs that earlier releases recorded as collaborators were converted at startup into
these rows. Every copy, a catalog copy or a copy of a configured member, carries on its task DTO
the `source` it started with. The view reads a copy's definition and launch settings only from
that `source`, by run ID, never from the configured member at its address:
- `agentSourceSelectors.teamAgentSourceOf` for the copy and its members: the started launch with the
  copy's own model choice, else its Team's when the member's recorded `follows_team` says it follows;
- `source.coordinator_address` for a Team copy's coordinator.

A new copy arrives as `TASK_EXECUTION_STARTED`. Rows and tab labels use
`utils/collaboration/memberDisplayName.ts`. Rows for addresses outside the root Team's configured
members (catalog copies, their members and copies) use the display-name formatter
(`readsAsDisplayName`); a configured member and every copy started from it keep the address
basename. New copies are always placed at the run's
top level (CM-1: delegation to the sender's own team is refused on the server); copies already
stored inside a Team instance keep their recorded host.
See [Chat](./chat.md#-in-a-live-run-delegation).

## History, Restore, Stop, And Delete

Team history is backed by the native Team package under
`memory/agent_teams/<team-run-id>/`. The root contains direct configured
Agents plus delegated child executions; it has no configured child Team.

Opening a current or historical run hydrates its stored execution tree and exact
member projection. Each member's recorded Agent Artifacts
(`getTeamMemberFileChanges(teamRunId, agentRunId)`, read inside that team run
only) are fetched with its projection and committed
with it through `services/runHydration/memberRunStateHydration.ts`. As a
result, a member's Artifacts list is complete after a page reload and on
historical runs. Live `FILE_CHANGE` rows that are newer than the fetched ones
are kept. An artifact fetch failure is handled exactly like a failure of that
member's projection: the focused member fails the open, and a non-focused
member stays unhydrated and is loaded again on selection. Current definitions
are not used to reinterpret the stored topology. External provider IDs remain provider bindings, not local AgentRun
identity.

Every delegated child recorded in the tree stays selectable in active and
historical views. Selection uses the exact AgentRun and authoritative
projection hydration; focus commits only after successful hydration, and
repeated same-address delegations remain distinct conversations.

A stopped Team can restore for supported follow-up. Stop ends runtime ownership
but retains history. Archive and permanent Delete remain separate later user
actions; failed Stop keeps the root active/retryable and does not enable Delete.

Selected existing runs can expose stored model configuration through the shared
display/editor components. Only canonically stopped, unarchived, ownership-free
runs permit supported exact model-config updates. Runtime identity, workspace,
topology, tasks, and provider bindings remain immutable.

## Definition And Package Refresh

Agent package import, removal, local Reload, and managed GitHub Update invalidate
Agent, Team, and AgentOrg catalogs together. External/local package ownership
remains source-authoritative; catalog refresh does not copy definitions between
nodes or activate legacy formats.

The Teams list also refreshes **live**. When Team or Agent definition files
change in a registered agent package, the server announces the `agent_teams`
list on `/ws/agent-package-definitions` (an agent change names it too), and a loaded Teams
list reloads without Reload. A Team written before its member Agents appears
first as not available, then becomes available once the Agents arrive. See
[Agent Management](./agent_management.md#live-agent-package-definition-refresh).

- **Card issue badge.** `AgentTeamCard.vue` passes `teamDef.loadIssues` to
  `DefinitionLoadIssueBadge.vue`. The list covers the Team and every
  Team-local Agent, because Team-local Agents have no Agents-page card. The
  badge shows the count. Its text is "Using last working version" when every
  entry still has a working version, and "Some members couldn't be loaded" when
  any entry has none. Expanding it lists each entry's name or folder, file and
  reason. A Team with a broken Team-local Agent stays usable on that Agent's
  last working version.
- **List notice.** `AgentTeamList.vue` shows `DefinitionProblemsNotice.vue`
  for `AGENT_TEAM`: "N team definition(s) are not available", with each Team's
  reason and, for unavailable dependencies, "Depends on: …". This includes a
  Team whose ID exists in more than one package. Such a Team is unavailable
  everywhere and is not offered in `@` or `list_available_agents`.

### Agent Teams Reload And Member Inspection

After a completed edit to a registered local package, **Reload** on the Agent
Teams page refreshes the Team catalog and the Agent definitions used by member
inspection. A successful Reload makes current Team and referenced member
instructions, descriptions, and tools available, including already-viewed
Team-local and shared Agents. No separate Agents-page Reload or app restart is
needed. Member IDs, navigation, source ownership, and private scopes are unchanged.

The explicit refresh action performs the `reloadAgentPackageDefinitions` mutation
(one full reload covering agents, Teams and Orgs), then awaits the Agent store's
network-only reload before reading and publishing the Team list. It does not
issue a second reload mutation. The separate
query-only Team reload used by package operations remains query-only; ordinary
first-load discovery is unchanged.

A required mutation or read failure uses the existing loading/error/retry surface;
Reload is not a successful complete refresh until the required reads finish.
If the Agent read fails, the Team read does not proceed. If a later Team read
fails, Agent data may already be fresh; there is no cross-catalog rollback or
transactional snapshot guarantee. Retry uses the same Reload control.

This is **agent package definition freshness**, not live instruction hot reload.
Reload does not rewrite package source/configuration or saved run/history state,
and it does not replace instructions in existing executions. Reload is now the
manual fallback: watched agent packages already apply file edits automatically.
Neither path downloads GitHub changes. Reload does not guarantee one
point-in-time snapshot when files are edited concurrently with it.

## Featured Teams

`AgentTeamList.vue` joins admitted Team definitions with featured catalog
settings whose `resourceKind` is `AGENT_TEAM`.

- Featured cards use the ordinary detail and Run actions.
- A featured Team is omitted from the regular section to avoid duplication.
- Search removes featured grouping and searches admitted root Teams normally.
- Unknown featured IDs remain operator-cleanup concerns in Settings.

## Manual Skill Improvement

Manual Skill Improvement is selected-Agent owned. The composer-adjacent action
targets the active focused Agent execution, not the Team container. Definition
and launch config do not persist a Team-wide or task-Team eligibility flag.

## Main Files

- `pages/agent-teams.vue`
- `components/agentTeams/AgentTeamList.vue`
- `components/agentTeams/AgentTeamDetail.vue`
- `components/agentTeams/AgentTeamDefinitionForm.vue`
- `stores/agentTeamDefinitionStore.ts`
- `stores/teamRunConfigStore.ts`
- `stores/agentTeamRunStore.ts`
- `stores/agentTeamContextsStore.ts`
- `services/agentStreaming/TeamStreamingService.ts`
- `services/chat/chatLaunchService.ts`, `services/chat/chatTeamLaunchConfig.ts`
- `components/chat/ChatNewSurface.vue`, `components/run-settings/RunMembersLine.vue`,
  `RunMemberSettingsDrawer.vue`
- `components/workspace/history/AgentTeamRunHistoryPanel.vue`

## Compatible Model Selection On Stopped Runs

Saved-run settings permit a stopped standalone Team root or exact direct
Agent to edit its model/settings pair while runtime, workspace, approval policy,
addresses, and execution/provider identities remain locked. Model options are
advisory: Save revalidates every affected scope against its original saved model
and validates current catalog membership and target schema. External runtime
models are not capacity-gated; AutoByteus still requires verified positive
non-decreasing context capacity. Same-model settings require a current
model/schema, but no replacement-capacity check.
Stopped options carry backend current/replacement descriptors. A proven
redundant Claude `default` is omitted from new offers, while an exact saved
`default` remains a current-only descriptor for same-model settings and is not
rewritten during an unrelated Team edit.

Root pair changes propagate only to Agents linked by draft-start
runtime/model/settings equality. Divergent or directly edited Agents remain
independent. All intended patches validate before one strict Team V2 write.
An indeterminate write/read-back locks Save until the existing Refresh verifies
canonical state; it must not be presented as a confirmed failure or replayed.
This does not unlock active AgentOrg member settings, add mounted-Team save/root
authority, or restore nested configured Team authoring.

### Historical Content And Current Tool Decisions

First inspection of a mounted task still loads its exact conversation, attachments
and Activity; it does not return a blank monitor merely because live events have
arrived. For a currently live member of an active, synchronized Team, hydration
composes historical content with the same AgentRun's actual observed tool state,
matched by exact invocation ID. Parsed history cannot erase a pending manual
approval or regress an approved/executing call. Explicit terminal outcomes cannot
be made pending again; conflicting identities/outcomes fail the candidate without
partially publishing either conversation or Activity.

The current tool's arguments, type and available routing metadata survive. Missing
historical tool entries can retain one observed live invocation, not a copy of the
whole live conversation. Existing selection, identity, readiness and content-revision
guards still apply. Retired/inactive/disconnected member inspections load history
without carrying obsolete live permissions forward. Approval remains the normal
ToolCallIndicator → exact AgentRun/invocation command path, not an Activity control,
handler replay, automatic approval or new pending-decision registry. Task startup
continues to honor the configured recipient's `autoExecuteTools` policy.

Historical traces are not a complete journal of pending tool decisions. A parsed
tool intent, or recorded approval provenance, does not alone authorize a current
Approve control. Preserve actual same-live-run decision evidence only while the
existing identity and stream-readiness guards hold; never infer permission by
replaying trace entries or changing `autoExecuteTools`.

## Stopping And Retained Activity

Stopping a Team retires its runtime and stream while keeping the selected
workspace and each member’s existing Activity available for inspection. Completed
tool details and System instructions do not require a new message, refocus, or
reload to remain visible. Stopped Activity is historical presentation, not
permission to execute an old tool decision. Later deliberate input uses the
normal restore and history-hydration path; Stop itself does not activate Agents
or fetch replacement Activity. Existing recent-window and history-source limits
still apply.

For Agent/Org parity, failure-state preservation and historical-control limits,
see [Retained Activity After Termination](./agent_execution_architecture.md#retained-activity-after-termination).


## Catalog Lookups Versus Exact Org References

`agentTeamDefinitionStore.getCatalogAgentTeamDefinitionById` and
`getCatalogAgentTeamDefinitionByName` synchronously search the current catalog
snapshot. A `null` result is a catalog miss, not proof that a definition is absent
from storage. These getters do not query or add owned definitions to the catalog.

Org detail/editor, Org-owned Team detail and enclosing Org launch use
`loadAgentOrgDefinitionReferences` for exact, scope/owner-validated references.
Its required `AgentOrgReferenceCatalogLookup` callbacks,
`getCatalogAgentById` and `getCatalogTeamById`, supply only eligible catalog
matches; owned references use exact reads. The selected reference graph remains
local to its view and does not change shared/application catalog membership.
Reading a definition does not grant shared visibility, independent mutation or
new standalone run permissions. This boundary does not change the existing
independent Run/Edit policy for owned Teams.

### Copying a retained Team after Settings Save

Header **New (+)** (`TeamWorkspaceView` → `useRunStart().copyTeamRun`) reads the
source Team's current canonical resume configuration
(`loadTeamRunLaunchSeed`) and opens New chat for the Team with the run's root
settings and member overrides. A retained execution view is presentation state,
not authoring authority after a successful stopped-run Settings Save. The reader
correlates requested, response, and tree root IDs before cache publication; the
copy also verifies its definition. Only matching read-only workspace metadata is
reused or resolved. If the run cannot be read or copied, New chat opens with the
Team's defaults instead. A copy that finishes after the user has moved on opens
nothing. Copying does not replace the source's context, history, Activity or
composer state.
Source-free creation still uses definition defaults; ordinary Create allocates
new runtime identities.

Sparse copy preserves explicit member parameters when its runtime or model differs
from the parent, even if the parameter object equals the parent's. Explicit null,
zero and false remain meaningful. With the same runtime/model/parameters, no
redundant override is needed. This copy rule does not change deliberate editing:
choosing a different runtime/model with unspecified parameters still follows the
existing clearing/inheritance policy. Copying config never clones source runtime
IDs, provider bindings, tasks, messages or attachments.
