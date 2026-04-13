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
- `components/agentTeams/form/useAgentTeamDefinitionFormState.ts`
- `components/agentTeams/form/AgentTeamMemberDetailsPanel.vue`
- `utils/definitionOwnership.ts`

## Team Definition Model

Team definitions now include:

- `ownershipScope` (`SHARED` or `APPLICATION_OWNED`),
- owning application/package provenance, and
- per-member `refScope` for agent members (`SHARED`, `TEAM_LOCAL`, or `APPLICATION_OWNED`).

Nested team members continue to use `refType: 'AGENT_TEAM'` without `refScope`.

## Ownership Behavior

| Scope | Shown in generic Agent Teams list | Editable from generic team detail/edit | Generic delete / sync |
| --- | --- | --- | --- |
| `SHARED` | Yes | Yes | Allowed |
| `APPLICATION_OWNED` | Yes | Yes when backed by a writable source | Not allowed in the generic shared workflow |

The list/detail/card surfaces show ownership badges and application/package provenance so embedded teams remain distinguishable from standalone shared teams.

## Member Library Behavior

- Shared team authoring uses the shared agent/team library.
- When editing an application-owned team, the library is restricted to agent and team definitions from the same owning application as UI guidance.
- The backend remains authoritative; frontend filtering does not replace backend same-bundle validation.
- Existing agent members preserve and submit their `refScope` values.

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
- Team detail cards surface application-owned member badges where relevant so embedded application references stay visible during inspection.
