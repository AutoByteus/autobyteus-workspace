# Agent Teams Module - Frontend

## Scope

Shows team definitions in the native Agent Teams surface, supports shared-team creation, supports edit/detail flows for existing shared and application-owned teams, and prepares team launches while preserving ownership-aware member semantics.

For runtime execution/streaming behavior, see `agent_execution_architecture.md`.

## Main Files

- `stores/agentTeamDefinitionStore.ts`
- `components/agentTeams/AgentTeamList.vue`
- `components/agentTeams/AgentTeamCard.vue`
- `components/agentTeams/AgentTeamDetail.vue`
- `components/agentTeams/AgentTeamDefinitionForm.vue`
- `components/launch-config/DefinitionLaunchPreferencesSection.vue`
- `components/launch-config/RuntimeModelConfigFields.vue`
- `components/agentTeams/form/useAgentTeamDefinitionFormState.ts`
- `components/agentTeams/form/AgentTeamMemberDetailsPanel.vue`
- `utils/definitionOwnership.ts`

## Team Definition Model

Team definitions now include:

- `ownershipScope` (`SHARED` or `APPLICATION_OWNED`),
- owning application/package provenance, and
- persisted launch defaults:
  - `defaultLaunchConfig.llmModelIdentifier`
  - `defaultLaunchConfig.runtimeKind`
  - `defaultLaunchConfig.llmConfig`
- per-member `refScope` for agent members (`SHARED`, `TEAM_LOCAL`, or `APPLICATION_OWNED`).

Nested team members continue to use `refType: 'AGENT_TEAM'` without `refScope`.

## Ownership Behavior

| Scope | Shown in generic Agent Teams list | Editable from generic team detail/edit | Generic delete / sync |
| --- | --- | --- | --- |
| `SHARED` | Yes | Yes | Allowed |
| `APPLICATION_OWNED` | Yes | Yes when backed by a writable source | Not allowed in the generic shared workflow |

The list/detail/card surfaces show ownership badges and application/package provenance so embedded teams remain distinguishable from standalone shared teams.

## Default Launch Preferences

`AgentTeamDefinitionForm.vue` now round-trips `defaultLaunchConfig` through the shared `DefinitionLaunchPreferencesSection.vue` surface for both shared and application-owned teams.

Those values are used in two places:

- direct native team launches, and
- application launch draft preparation when an application binds to an embedded team definition.

Definition editors can leave runtime blank to mean “choose when launching”, while run-config forms resolve to an effective runtime immediately.

## Member Library Behavior

- Shared team authoring uses the shared agent/team library.
- When editing an application-owned team, the library is restricted to team-local agent definitions owned by the current team plus application-owned team definitions from the same owning application as UI guidance.
- The backend remains authoritative; frontend filtering does not replace backend same-bundle validation.
- Existing agent members preserve and submit their `refScope` values; application-owned team edits localize visible canonical team-local ids back into persisted local `ref` values.

## Store Ownership

`agentTeamDefinitionStore` owns:

- fetch and reload of the full team catalog,
- create/update/delete mutations,
- ownership-aware getters such as `sharedAgentTeamDefinitions` and `getApplicationOwnedTeamDefinitionsByOwnerApplicationId(...)`, and
- cache invalidation via `invalidateAgentTeamDefinitions()`.

## Package Refresh Behavior

Package import/remove flows invalidate and reload Agent Teams together with Applications and Agents so application-owned teams appear or disappear immediately in the same session.

## Notes

- The generic create flow still creates shared standalone teams.
- Application-owned teams are surfaced for inspection/testing and in-place editing, not for shared-path deletion or sync.
- Team detail cards surface team-local member badges for embedded private agents, while agent cards/details show both team and application provenance when the owning team belongs to an application bundle.
