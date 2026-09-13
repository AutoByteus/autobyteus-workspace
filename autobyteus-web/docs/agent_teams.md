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

Current Team definition config is strict and has no authored `schemaVersion`.
Normal save/import/export uses that same field-free shape; it does not silently
strip numeric versions or accept retired shapes. Agent member rows carry
`memberName`, `ref`, and explicit `refScope`; they do not carry
`refType` because a Team cannot contain another Team or AgentOrg. The UI must
not offer deeper configured composition, and the server rejects it at admission.

Shared Teams can be created, updated, and deleted through the shared provider.
Application-owned Teams are inspectable and editable only when the owning
bundle source is writable; generic deletion does not bypass source ownership.
Team-local private Agents remain discoverable through their owning Team detail.

## Handoffs

Team-local handoff authoring uses explicit **From**, **To**, and ordered
**When** conditions. Both endpoints are direct Agent members of the Team.
Changes remain in the definition draft until the complete definition saves
atomically. Invalid/self-resolving endpoints, duplicate pairs, empty conditions,
and member changes that leave stale references block save visibly.

AgentOrg owns cross-Team and Org-level handoffs. A Team selected as an Org
destination routes through its direct coordinator, but the Org editor never
mutates the Team's local handoffs.

## Standalone Team Launch

`teamRunConfigStore` owns an immutable launch draft. The root Team form
collects runtime/model/model-config, workspace, automatic-tool policy, and the
existing direct-member override intent. Every exact configured Agent must be
valid before launch; pending or failed runtime catalogs and invalid model
configuration block launch with scoped feedback.

A standalone Team launches one native Team V2 root. The coordinator becomes the
initial focused Agent for the familiar Team journey. Browser launch input does
not supply concrete TeamRun/AgentRun IDs; the server allocates and validates
them.

Launching makes the root and configured scope available without starting unused
Agents or binding their provider conversations. They remain truthfully Offline,
including the initially focused coordinator, until supported work requires them.
The first real input/delivery starts the required member; a visible selection is
not evidence of an active worker. The same fresh-unused policy applies to direct
and mounted-Team Agents in a new AgentOrg. Restore and delegated task preparation
remain separate existing journeys, not fresh-unused launches.

The effective standalone configuration is resolved for each direct Agent from
the Team root plus any exact Agent override. Definition defaults seed the new
draft but are not persisted merely because a schema default is displayed.

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
root lifecycle, Agent status, task lifecycle, and command overlays are not
interchangeable.

Task delegation remains supported. A task Agent or task Team is shown as a
transient execution row while the Tasks surface retains the durable record,
submissions, reviews, and reference files. Task activation becomes durable
before its Agent frames are released, allowing an early-selected task monitor
to advance without reload or refocus.

## History, Restore, Stop, And Delete

Team history is backed by the strict native Team V2 package under
`memory/agent_teams/<team-run-id>/`. The root contains direct configured
Agents plus task-execution snapshots; it has no configured child Team.

Opening a current or historical run hydrates its stored execution tree and exact
member projection. Current definitions are not used to reinterpret the stored
topology. External provider IDs remain provider bindings, not local AgentRun
identity.

The normal Tasks detail can deliberately inspect an accepted/settled task Agent
while the containing Team is active or inactive. Admission uses exact retained
AgentRun/placement and authoritative projection hydration, not presence in the
live navigation roster. Focus commits only after successful hydration; repeated
same-address assignments remain distinct. The retained monitor exposes actual
conversation and Activity as read-only, without composer, commands, writes or
reactivation. Deliberate inspection survives later task activation and existing
verified stream-replacement snapshots. Ordinary live-task selection still repairs
to an eligible live member when that task settles; it does not silently become
retained-inspection intent.

Shared Tasks keeps participant links in the familiar direction line rather than
an extra name/ID strip. Exact Agent names navigate directly; a Team name or
identity disclosure reveals all exact participant links, including non-coordinator
members. Identity details are on demand and reset with the selected item/scope.

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
- `components/workspace/config/TeamRunConfigForm.vue`
- `components/workspace/history/AgentTeamRunHistoryPanel.vue`

## Compatible Model Selection On Stopped Runs

The existing-run form permits a stopped standalone Team root or exact direct
Agent to edit its model/settings pair while runtime, workspace, approval policy,
addresses, and execution/provider identities remain locked. Model options are
advisory: Save revalidates every affected scope against its original saved model
and requires verified target context capacity at least that baseline. Same-model
settings still require a current model/schema, but no replacement-capacity check.

Root pair changes propagate only to Agents linked by draft-start
runtime/model/settings equality. Divergent or directly edited Agents remain
independent. All intended patches validate before one strict Team V2 write.
An indeterminate write/read-back locks Save until the existing Refresh verifies
canonical state; it must not be presented as a confirmed failure or replayed.
This does not unlock active AgentOrg member settings, add mounted-Team save/root
authority, or restore nested configured Team authoring.
