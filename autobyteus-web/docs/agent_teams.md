# Agent Teams Module - Frontend

## Scope

Shows team definitions in the native Agent Teams surface, supports shared-team creation, supports edit/detail flows for existing shared and application-owned teams, and prepares workspace team launches with ownership-aware member semantics, mixed-runtime per-member overrides, truthful launch-readiness gating, and reopen/hydration support.

For runtime execution/streaming behavior, see `agent_execution_architecture.md`.

The Agent Teams list can also present a server-configured **Featured teams** section. Featured placement is owned by the `AUTOBYTEUS_FEATURED_CATALOG_ITEMS` server setting and managed from Settings -> Server Settings -> Basics -> Featured catalog items; it is not a property of the team definition itself.

## Main Files

- `stores/agentTeamDefinitionStore.ts`
- `components/agentTeams/AgentTeamList.vue`
- `components/agentTeams/AgentTeamCard.vue`
- `components/agentTeams/AgentTeamDetail.vue`
- `components/agentTeams/AgentTeamDefinitionForm.vue`
- `components/launch-config/DefinitionLaunchPreferencesSection.vue`
- `components/launch-config/RuntimeModelConfigFields.vue`
- `components/workspace/config/TeamRunConfigForm.vue`
- `components/workspace/config/TeamMemberConfigTree.vue`
- `components/workspace/config/TeamScopeConfigEditor.vue`
- `components/workspace/config/MemberOverrideItem.vue`
- `components/workspace/config/StoredTeamRunConfigForm.vue`
- `components/workspace/config/StoredTeamRunConfigTree.vue`
- `components/workspace/config/RunConfigPanel.vue`
- `components/agentTeams/form/useAgentTeamDefinitionFormState.ts`
- `components/agentTeams/form/AgentTeamMemberDetailsPanel.vue`
- `stores/teamRunConfigStore.ts`
- `stores/agentTeamContextsStore.ts`
- `stores/agentTeamRunStore.ts`
- `types/agent/TeamLaunchDraft.ts`
- `types/agent/TeamRunConfig.ts`
- `utils/teamRunConfigUtils.ts`
- `utils/teamRunLaunchHierarchy.ts`
- `utils/teamRunLaunchReadiness.ts`
- `utils/catalog/featuredCatalogItems.ts`
- `utils/definitionOwnership.ts`

## Team Definition Model

Team definitions now include:

- `ownershipScope` (`SHARED`, `TEAM_LOCAL`, or `APPLICATION_OWNED`),
- owning application/package provenance, and
- persisted launch defaults:
  - `defaultLaunchConfig.llmModelIdentifier`
  - `defaultLaunchConfig.runtimeKind`
  - `defaultLaunchConfig.llmConfig`
- per-member `refScope` for both agent and nested-team members (`SHARED`, `TEAM_LOCAL`, or `APPLICATION_OWNED`).

Nested team members now use `refType: 'AGENT_TEAM'` with explicit `refScope`.
For a parent-owned local subteam, the persisted config keeps the local child id
in `ref` and sets `refScope: 'TEAM_LOCAL'`; the loaded definition graph resolves
that child to a canonical team-local team id. Shared nested teams stay
`refScope: 'SHARED'`, and application-owned sibling team refs use
`refScope: 'APPLICATION_OWNED'` when the containing team belongs to an
application bundle. Missing nested-team scope is invalid in current team config.

`defaultLaunchConfig.llmConfig` carries explicit schema-driven runtime/model
parameters for the selected model. This includes thinking settings such as
`reasoning_effort` and runtime-specific non-thinking settings such as Codex
`service_tier: "fast"` for models whose catalog schema exposes **Fast mode**.
Launch-time UI may display valid schema defaults as effective values, but those
defaults are not stored in `llmConfig` merely because the form renders them.

## Ownership Behavior

| Scope | Shown in generic Agent Teams list | Editable from generic team detail/edit | Generic delete action |
| --- | --- | --- | --- |
| `SHARED` | Yes | Yes | Allowed |
| `TEAM_LOCAL` | No in the root catalog; discover through the owning team detail/member tree | Direct known-id routes can inspect/edit when the backing source is writable | Not allowed as an independent generic root workflow |
| `APPLICATION_OWNED` | Yes | Yes when backed by a writable source | Not allowed in the generic shared workflow |

The root Agent Teams catalog is based on ownership scope: it renders shared and
application-owned root definitions and excludes `TEAM_LOCAL` child definitions.
This is intentionally not a "referenced by another team" filter, because a
shared nested team can still be an independent reusable catalog team.

The list/detail/card surfaces show ownership badges, owner-team labels, and
application/package provenance so embedded teams remain distinguishable from
standalone shared teams.

Team definitions are reusable configuration, not runtime subjects. Definition
catalog and detail surfaces therefore expose no owned runtime status field,
status dot, or lifecycle label. Runtime liveness belongs only to a concrete team
run, and five-state status belongs only to exact leaf agents. Workspace history
and running-team presentation may group displayed runs by definition and show a
presentation-only any-active cue for that rendered collection. The group dot is
derived from `runs.some(run => run.isActive)` and is not stored on, transported
with, or inferred as a status of the definition. Each child run row still shows
only its own binary `isActive` cue; neither cue depends on representative member
status, socket subscription, or Stop/pending state.

## Default Launch Preferences

`AgentTeamDefinitionForm.vue` now round-trips `defaultLaunchConfig` through the shared `DefinitionLaunchPreferencesSection.vue` surface for both shared and application-owned teams.

Those values are used in two places:

- direct native team launches, and
- application-authored backend flows that may reuse persisted definition defaults when an application backend decides to start runtime work.

Definition editors can leave runtime blank to mean “choose when launching”. Only
the root-selected definition seeds a new launch draft. Embedded Team definition
defaults do not activate independently: every nested Team inherits from its
containing Team until the user records an exact-address Team override.

Team launch forms do not expose a team-level skill-access selector. Each
leaf member uses the skills configured on that member's agent definition; a leaf
member with no configured skills receives no AutoByteus-managed skills by
default. The old all-installed-skill option is not a normal launch-time policy
and is absent from the frontend skill-access type union.

## Team Run Config Surface

The workspace-side team launch buffer is owned by `teamRunConfigStore` and rendered through `TeamRunConfigForm.vue`.


The team launch data model does not carry Skill Improvement overrides for the
manual-click model. Team definitions, `team-config.json`, persisted default
launch preferences, `TeamRunConfig`, and agent-member launch records do not own
Skill Improvement eligibility; the backend resolves manual eligibility from current
global Skill Improvement settings and the current active target state at click time.
Whole-team/subteam Skill Improvement is not part of the MVP manual action, and the team
run configuration form does not expose launch-time Skill Improvement default or
leaf-member override controls.

For manual Skill Improvement, the composer-adjacent CTA targets the selected active
leaf member, not the whole team row. The frontend sends the member-scoped target
identity (`teamRunId` plus `memberRunId`) to `startTeamMemberSkillImprovement`, and
the backend records source run ids for the selected member only. Before
triggering the improver, the backend ensures that member's work trace files are
current, then activates or reuses the target-scoped improver run. This preserves
the same valid focused leaf-member boundary used by the shared composer target
and prevents stale history rows or whole-team containers from becoming improvement
targets.

That surface stores authoring intent rather than a partially materialized runtime tree:

- `TeamRunConfig.rootConfig` is the complete root Team scope.
- `teamOverrides` stores only meaningful partial overrides keyed by canonical
  rooted Team address.
- `agentOverrides` stores only meaningful partial overrides keyed by canonical
  rooted Agent address.
- `TeamLaunchDraft` adds one stable draft id, exact-address Team workspace
  authoring state, focused Agent address, and pending composer input.

`resolveTeamRunConfiguration(...)` is the only frontend hierarchy-resolution
owner. It walks the selected definition graph and resolves every field with this
precedence:

```text
Agent override -> containing Team -> ancestor Teams -> root Team
```

The result is a complete immutable view for every configured Team and Agent.
Runtime kind, model, `llmConfig`, auto-approve, and workspace inherit together;
`llmConfig: null` remains an explicit value rather than "missing". Workspace can
be owned by the root or by an explicitly customized nested Team. Agents inherit
their containing Team workspace and do not own an Agent workspace override.
Skill access remains root-authored and inherited across the full hierarchy.

`TeamRunConfigForm.vue` renders the root first and
`TeamMemberConfigTree.vue` recursively renders nested Team and Agent placements.
`TeamScopeConfigEditor.vue` gives every Team scope an **Inherited** or
**Customized** state, effective summary, exact-address workspace/runtime/model/
configuration/auto-approve controls, and a scope reset. `MemberOverrideItem.vue`
remains the leaf Agent override editor. Reset removes only the selected scope's
stored intent; descendants then resolve again through the nearest remaining
ancestor. Stale Team/Agent addresses are pruned against the current definition
topology and shown as a repair notice before the user retries launch.

The authoring UI may show schema defaults as effective values, but it does not
store them merely because they render. Explicit runtime/model changes clear
only incompatible configuration owned by that scope. For Codex members,
`service_tier: "fast"` remains valid only while the selected or inherited model
schema exposes **Fast mode**.

Selected existing Team runs do not reconstruct editable override intent.
`StoredTeamRunConfigForm.vue` and `StoredTeamRunConfigTree.vue` render the exact
`STORED_SNAPSHOT` returned from the V2 execution tree: every Team's complete
`default_launch_configuration` and every Agent's complete
`launch_configuration`. These cards are inspect-only and do not infer current
definition defaults, collapse the tree to a representative coordinator, or
write historical state.

## Hierarchical Launch Readiness

`teamRunLaunchReadiness.ts` evaluates the complete resolved hierarchy, not only
leaf overrides. Launch is blocked while topology is unavailable; when any exact
Team or Agent lacks a valid runtime/model; while a required runtime catalog is
pending or failed; or when an effective model is unavailable for its runtime.
Workspace readiness belongs only to the root and to nested Teams that explicitly
own a workspace override. Inherited Teams and Agents do not emit duplicate
workspace blockers.

Each current Team scope has one draft-owned controlled workspace selection.
Existing mode uses its selected workspace immediately. New mode can remain
unregistered while the user edits: a non-empty absolute path is launch-ready and
an empty path produces one exact Team-scoped blocker. A stale selection for a
Team removed or changed in the definition no longer deadlocks the only repair
action; activation prunes stale configuration/workspace state, reports the
sorted repaired addresses, performs no workspace registration or GraphQL create,
and asks the user to review and retry.

## Draft Workspace Preparation And Launch

`teamRunConfigStore` owns the immutable Team launch draft and the authorization
for every workspace-preparation step. `agentTeamRunStore.launchDraft()` is the
single orchestration owner:

1. reconcile the current definition topology and create a plan bound to the
   draft id plus topology fingerprint;
2. group active New-workspace Team selections by canonical path;
3. immediately before each asynchronous registration, re-authorize the same
   draft, topology, and exact Team addresses;
4. write the registered workspace metadata back to those Team scopes and repeat
   topology authorization;
5. finalize preparation, evaluate complete launch readiness, and admit the
   immutable draft exactly once;
6. project one complete `teamConfigs[]` entry for every Team and one complete
   `memberConfigs[]` entry for every Agent; and
7. call `createAgentTeamRun`, hydrate the returned V2 execution tree, focus the
   exact Agent address, transfer pending input, and promote the draft once.

Registration failure preserves the user's New mode/path and exposes the error.
Topology drift before or during preparation stops the launch with a visible
repair-required result. While a draft is admitted, edits, selection/focus/input
changes, removal, clear, and duplicate launch allocation are rejected. The
frontend does not create a temporary runtime Team or infer missing Team/Agent
settings at the GraphQL boundary.

For nested team definitions, the backend launches through the mixed topology
path even when all leaf members use the same runtime. Leaf launch configs carry
canonical rooted `memberAddress` values so duplicate leaf names in different
subteams remain distinct. A subteam is structural topology, not an executable
Agent target; user messages and runtime commands address an exact leaf Agent
execution.

Team focus is one exact `TeamExecutionAddress`:

```ts
interface TeamExecutionAddress {
  rootTeamRunId: string;
  taskTeamRunIds: readonly string[];
  memberAddress: string;
  taskAgentRunId: string | null;
}
```

`memberAddress` is the rooted logical Agent placement (for example
`/BuildSquad/review_lead`). The ordered `taskTeamRunIds` identify nested task-Team
execution lineage, and `taskAgentRunId` distinguishes a task-Agent execution
from its stable logical member. Structural leaf executions use an empty task-Team
lineage and `null` task-Agent id. The frontend validates and serializes exactly
these four fields; legacy path, route-key, instance-id, or generated-run-id
fallbacks are not accepted.

`agentTeamRunStore.sendMessageToFocusedMember()` sends ordinary chat only to the
focused exact Agent execution. For a draft, the selected immutable draft and its
focused rooted member address are admitted synchronously before any asynchronous
allocation; pending edits, focus changes, input changes, removal, selection
changes, clear, and duplicate launches are rejected until that launch either
promotes once or releases after failure. After launch or restore, the store
starts one local submission for the exact focused Agent context, finalizes its
attachments, connects the Team stream, and emits `SEND_MESSAGE` with
`execution_address`, required `message_id`, and required `dedupe_key`. Missing,
stale, non-Agent, or cross-root addresses fail closed rather than retargeting.
An accepted server result means the exact member AgentRun owns the input. The
AgentRun may append it to the identified Codex turn or retain it for a later
AutoByteus/Claude turn; Team frontend state does not choose that policy or
create another queue.

The same exact address is the identity for focus, run-open hydration, token usage,
Team Communication perspectives, tool approval, and interrupt. Team
`INTERRUPT_GENERATION` carries `{command_id, execution_address}`;
`AGENT_COMMAND_ACK` must match both fields before the pending command completes.
Team tool approval and denial carry `{invocation_id, execution_address, reason}`;
the execution address captured from the authoritative `agent_execution` event is
reused even if UI focus later changes. No command reconstructs identity from a
display name, a route-key alias, a structural template, or an invocation id.

Root `TEAM_RUN_LIFECYCLE` remains a binary Team-container fact. Exact
`AGENT_STATUS` events own leaf `offline` / `initializing` / `idle` / `running` /
`error` state. WebSocket subscription state remains separate from both. This
keeps Team liveness, leaf status, focus, and interrupt authority independent.

## Stopped Team Follow-Up And Termination State

`agentTeamRunStore.sendMessageToFocusedMember()` supports follow-up chat against existing team runs after local stop/termination:

- launch drafts call `launchDraft()` before the first send and hydrate the permanent
  V2 execution tree returned by `createAgentTeamRun`;
- persisted teams with cached inactive resume config call `RestoreAgentTeamRun` before send;
- the backend team WebSocket connect and `SEND_MESSAGE` paths also resolve through
  `TeamRunService.resolveActiveTeamRun(...)`, so the server can restore and rebind
  the stream session even when the frontend's resume cache is stale or absent; and
- after a successful follow-up send, the run history cache is marked active and refreshed.

`agentTeamRunStore.terminateTeamRun()` treats backend termination as the authority
for a hydrated Team execution. Stop is available only while root `isActive` is
true and that run has no `stopPending` request. It tears down local stream/member
state and marks the team resume config inactive only after
`TerminateAgentTeamRun` succeeds. If backend termination fails, the store clears
pending, returns `false`, and leaves root activity, local member state, and
run-history activity unchanged. An unlaunched draft has no backend runtime and
is discarded through draft actions rather than Team termination. `isSubscribed`
remains a separate transport fact and must not be used as liveness.

The focused member interrupt/Stop action is separate from root termination.
The store creates a fresh client interrupt command id and sends the exact
team/member route plus optional run guard through `TeamStreamingService`. The
service matches `AGENT_COMMAND_ACK` by command id and exact target before member
projection. Accepted acknowledgement does not mark the member idle or change
root `isActive`; the later canonical member terminal/status event removes the
interrupt affordance. Rejected/failed acknowledgement or local
not-connected/send/disconnect completion produces one member-aware localized
toast without transcript, member-status, root-liveness, or retry side effects.
Input admitted while Stop is settling remains FIFO-owned on the server and is
forwarded only after the matching interrupt reservation is rejected/released or
the accepted interrupt reaches its canonical terminal.

Workspace team history is backed by the server V2 team catalog, not by durable
live-status fields. `listWorkspaceRunHistory` returns team rows with
`createdAt`, `archivedAt`, `terminatedAt`, manager-owned `isActive`, exact leaf
member statuses, and recursive `rootTeam`; no root status is derived. Frontend team tree rows may still expose
local view-model `lastActivityAt`, `lastKnownStatus`, and delete-readiness
fields for shared UI components, but those values are derived from the V2
catalog row plus live status and are not persisted backend team-history fields.

## Reopen / Hydration Behavior

Current Team reopen and history hydration consume the V2 execution tree rather
than reconstructing editable override intent. `hydrateLiveTeamRunContext(...)`
and the Team execution view preserve the exact configured hierarchy: the root
and every nested Team carry their complete `defaultLaunchConfiguration`, and
every configured Agent carries its complete `launchConfiguration`.

The workspace config panel derives one `STORED_SNAPSHOT` view directly from that
tree and renders it with `StoredTeamRunConfigForm.vue`. Historical values remain
inspect-only; the frontend does not compare them with current definition
defaults, infer a representative Team default, or turn complete snapshots back
into partial overrides. Explicit `llmConfig: null` and
`workspaceRootPath: null` remain recorded values.

Logical topology uses canonical AgentTeam addresses. Physical memory resolution
remains a separate concern based on `rootTeamRunId`, physical ancestor TeamRun
IDs, and AgentRun identity. The frontend projects the V2 tree into stable and
task execution models keyed by exact serialized `TeamExecutionAddress`.

Every Team Agent stream event carries one strict `agent_execution` binding:

```ts
{
  kind: 'structural' | 'task_agent' | 'task_team_member';
  execution_address: {
    root_team_run_id: string;
    task_team_run_ids: string[];
    member_address: string;
    task_agent_run_id: string | null;
  };
  agent_run_id?: string;
}
```

The strict contract does not expose `execution_kind`, task instance ids,
member/source paths or route keys, represented-subteam fields, or generic
egress identity aliases. `TeamStreamingService` parses the shared protocol,
reconciles each binding through the Team execution model, and applies the
resulting effect to the exact Agent context. Unknown topology, incomplete
identity, wrong roots, and invalid task lineage are rejected instead of guessed.

Task-Agent and task-Team executions are transient execution projections, not
structural topology. A task-Agent address keeps the logical `memberAddress` and
adds its `taskAgentRunId`; a task-Team member address appends the concrete child
TeamRun id to `taskTeamRunIds` and identifies the exact child Agent with a rooted
`memberAddress`. Complete task snapshots and live events converge through the
same canonical address. The Workspaces tree renders execution rows from this
model and selection/focus uses exact serialized address equality, so identical
member names, repeated logical placements, and nested task executions cannot
collide.

Team → Tasks remains the durable delegated-task surface. It renders persisted
records and reference files, while the Workspaces tree renders the live execution
hierarchy. The two surfaces share canonical task records and addresses but do
not derive one another from transient display rows.

Subteam rows remain grouping/navigation structure. The executable focus is an
exact Agent address such as `/BuildSquad/review_lead`; Team Communication stores
and compares the complete sender and receiver execution addresses. Display
labels are derived from canonical topology only after identity has been
resolved.

## Store Ownership

`agentTeamDefinitionStore` owns:

- fetch and reload of the full team catalog,
- create/update/delete mutations,
- ownership-aware getters such as `rootAgentTeamDefinitions`, `sharedAgentTeamDefinitions`, `teamLocalAgentTeamDefinitions`, `getTeamLocalTeamDefinitionsByOwnerTeamId(...)`, and `getApplicationOwnedTeamDefinitionsByOwnerApplicationId(...)`, and
- cache invalidation via `invalidateAgentTeamDefinitions()`.

`teamRunConfigStore` owns:

- the collection of immutable Team launch drafts and the selected draft,
- root, nested-Team, and exact-Agent authoring intent keyed by canonical address,
- per-Team workspace selection state, topology reconciliation/repair, and
  authorization-bound workspace-preparation plans,
- runtime-scoped model catalogs for launch readiness,
- the derived `launchReadiness` view consumed by the workspace panel.

`agentTeamRunStore` owns draft launch orchestration, permanent Team creation,
V2 hydration, streaming, restore, focused sends, and termination.
`agentTeamContextsStore` owns hydrated live execution contexts. There is no
temporary runtime Team between draft authoring and `createAgentTeamRun`.

## Package Refresh Behavior

Agent package import, removal, local reload, and managed GitHub update flows
invalidate and reload Agent Teams together with Applications and Agents so
package-owned teams appear, refresh, or disappear immediately in the same
session.

For definition updates outside the editor, use **Settings → Agent Packages** as
the source-aware package lifecycle surface. Local path packages remain
user-owned: edit or pull the folder outside AutoByteus, then press the package
row's **Reload** action so the backend validates and rescans the package.
Public GitHub package rows can **Check again** for default-branch drift and
**Update** the AutoByteus-managed package when an update is available or the
installed revision is unknown. These actions refresh the local agent and team
definition catalogs from configured package sources and perform a network
refetch; they do not copy definitions between nodes.

## Featured Teams

`AgentTeamList.vue` joins the loaded team catalog with `AUTOBYTEUS_FEATURED_CATALOG_ITEMS` entries whose `resourceKind` is `AGENT_TEAM`.

- Featured teams render with the same `AgentTeamCard` component and the same view-details and run actions as the regular grid.
- When the featured section is visible, the same team is removed from the regular grid to avoid duplicate cards.
- Search mode hides featured grouping and searches the root team catalog normally, including featured teams that match the query while still excluding `TEAM_LOCAL` child definitions from the root page.
- Unknown or removed definition ids in the setting are ignored on the catalog page; Settings keeps unresolved rows visible for operator cleanup.
- Frontend code must not hard-code featured team ids. Change featured placement through the server setting instead.

## Notes

- The generic create flow still creates shared standalone teams.
- Application-owned teams are surfaced for inspection/testing and in-place editing, not for shared-path deletion.
- Team-local subteams are stored under the owning team at `agent-teams/<local-team-id>/`, can own their own `agents/` and deeper `agent-teams/` folders, and are hidden from the root catalog by `ownershipScope: 'TEAM_LOCAL'`.
- Team member configs must preserve explicit `refScope` for all members. Use `TEAM_LOCAL` for parent-owned local agents/subteams, `SHARED` for reusable catalog definitions, and `APPLICATION_OWNED` for same-application sibling team references from application-owned teams.
- Resolvable nested team members show a visible `View ↗` action in the parent team detail row. The action routes through the existing Agent Teams page detail view with the resolved canonical child team id and a parent return context, including canonical team-local child ids such as `team-local-team:<encoded-owner-team-id>:<encoded-local-team-id>`. Unresolved nested team rows do not show a broken navigation action.
- Team detail cards surface team-local member badges for embedded private agents. Resolvable team-local agent members use compact `Details ▾` / `Hide ▴` actions and can be expanded in the team detail page to inspect the member agent's name, role, description, instructions, skills, tools, default runtime/model, and optional processor configuration without leaving team context.
- Expanded team-local member panels provide in-place editing through the canonical agent definition form and persist through `agentDefinitionStore.updateAgentDefinition(...)`; canceling edit returns to the expanded read view without saving draft changes.
- Shared/global individual-agent members (`refType === 'AGENT'` with absent/`SHARED` scope) use a compact `View ↗` action that opens the existing Agent Detail route with `returnToTeam=<teamId>` so the Agent Detail back action returns to the originating team. Shared/global members do not get inline team-local details/editing.
- Application-owned team forms preserve the distinction between same-application sibling teams (`APPLICATION_OWNED`) and parent-owned child teams (`TEAM_LOCAL`) instead of writing no-scope nested-team refs.
- Generic Agents browse/search excludes team-local definitions, so the owning Agent Team detail page is the primary team-local discovery and edit surface. Direct known-id agent detail/edit routes are still available for debugging.
- Agent cards/details show both team and application provenance when the owning team belongs to an application bundle.
- The workspace run-config flow now truthfully supports mixed-runtime teams; any future team-launch UX must preserve the same per-member runtime/model/readiness invariants.
