# Agent Management Module - Frontend

## Scope

Shows agent definitions in the native Agents surface, supports shared-agent creation, supports edit/detail flows for existing shared, team-local, and application-owned agents, and prepares direct agent launches from persisted definition defaults.

For live execution/session behavior beyond definition management, see `agent_execution_architecture.md`.

## Main Files

- `stores/agentDefinitionStore.ts`
- `components/agents/AgentList.vue`
- `components/agents/AgentCard.vue`
- `components/agents/AgentDetail.vue`
- `components/agents/AgentEdit.vue`
- `components/agents/AgentDefinitionForm.vue`
- `components/agents/AgentDefaultLaunchConfigFields.vue`
- `utils/definitionOwnership.ts`

## Agent Definition Model

The frontend agent definition shape now includes:

- ownership provenance:
  - `ownershipScope`
  - `ownerTeamId`
  - `ownerTeamName`
  - `ownerApplicationId`
  - `ownerApplicationName`
  - `ownerPackageId`
  - `ownerLocalApplicationId`
- persisted launch defaults:
  - `defaultLaunchConfig.llmModelIdentifier`
  - `defaultLaunchConfig.runtimeKind`
  - `defaultLaunchConfig.llmConfig`

## Ownership Behavior

| Scope | Shown in generic Agents list | Editable from generic agent detail/edit | Generic delete / duplicate / sync |
| --- | --- | --- | --- |
| `SHARED` | Yes | Yes | Allowed |
| `TEAM_LOCAL` | Yes | Yes | Not allowed in the generic shared workflow |
| `APPLICATION_OWNED` | Yes | Yes when backed by a writable source | Not allowed in the generic shared workflow |

The list/detail/card surfaces show provenance badges and owner labels so users can distinguish standalone agents from embedded team-local or application-owned definitions.

## Default Launch Config

`AgentDefinitionForm.vue` now round-trips `defaultLaunchConfig` during create and update.

Those values are used in two places:

- direct native agent launches, and
- application launch draft preparation through `applicationSessionStore`.

Invalid JSON in the raw `llmConfig` editor is blocked in the form before submit.

## Store Ownership

`agentDefinitionStore` owns:

- fetch and reload of the full agent catalog,
- create/update/delete/duplicate mutations,
- ownership-aware getters such as `sharedAgentDefinitions` and `getApplicationOwnedAgentDefinitionsByOwnerApplicationId(...)`, and
- cache invalidation via `invalidateAgentDefinitions()`.

## Package Refresh Behavior

Package import/remove flows invalidate and reload Agents together with Applications and Agent Teams. This keeps embedded application-owned definitions visible (or removed) in the same session immediately after a package mutation.

## Notes

- The generic create flow still creates shared standalone agents.
- Application-owned and team-local agents are surfaced for inspection/testing and in-place editing, not for shared-path duplication or destructive management.
- Search in the list includes provenance fields such as owning team, owning application, and package id.
