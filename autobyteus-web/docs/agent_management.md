# Agent Management Module - Frontend

## Scope

Shows agent definitions in the native Agents surface, supports shared-agent creation, supports edit/detail flows for existing shared, team-local, and application-owned agents, and prepares direct agent launches from persisted definition defaults.

For live execution/session behavior beyond definition management, see `agent_execution_architecture.md`.

The Agents list can also present a server-configured **Featured agents** section. Featured placement is owned by the `AUTOBYTEUS_FEATURED_CATALOG_ITEMS` server setting and managed from Settings -> Server Settings -> Basics -> Featured catalog items; it is not derived from agent `category` values or agent package metadata.

## Main Files

- `stores/agentDefinitionStore.ts`
- `components/agents/AgentList.vue`
- `components/agents/AgentCard.vue`
- `components/agents/AgentDetail.vue`
- `components/agents/AgentEdit.vue`
- `components/agents/AgentDefinitionForm.vue`
- `components/launch-config/DefinitionLaunchPreferencesSection.vue`
- `components/launch-config/RuntimeModelConfigFields.vue`
- `utils/catalog/featuredCatalogItems.ts`
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

`defaultLaunchConfig.llmConfig` stores schema-driven runtime/model parameters
for the selected model. This includes thinking settings such as
`reasoning_effort` and runtime-specific non-thinking settings such as Codex
`service_tier: "fast"` for models whose catalog schema exposes **Fast mode**.

## Ownership Behavior

| Scope | Shown in generic Agents list | Editable from generic agent detail/edit | Generic delete / duplicate / sync |
| --- | --- | --- | --- |
| `SHARED` | Yes | Yes | Allowed |
| `TEAM_LOCAL` | Yes | Yes | Not allowed in the generic shared workflow |
| `APPLICATION_OWNED` | Yes | Yes when backed by a writable source | Not allowed in the generic shared workflow |

The list/detail/card surfaces show provenance badges and owner labels so users can distinguish standalone agents from embedded team-local or application-owned definitions.

For team-local agents whose owning team belongs to an application bundle, the UI now shows both the owning team and the owning application/package provenance together.

## Default Launch Config

`AgentDefinitionForm.vue` now round-trips `defaultLaunchConfig` during create and update through the shared `DefinitionLaunchPreferencesSection.vue` surface.

Those values are used in two places:

- direct native agent launches, and
- application-authored backend flows that may reuse persisted definition defaults when an application backend decides to start runtime work.

Definition editors can leave runtime blank to mean “choose when launching”, while run-config forms resolve to an effective runtime immediately.

## Store Ownership

`agentDefinitionStore` owns:

- fetch and reload of the full agent catalog,
- create/update/delete/duplicate mutations,
- ownership-aware getters such as `sharedAgentDefinitions`, `teamLocalAgentDefinitions`, `getTeamLocalAgentDefinitionsByOwnerTeamId(...)`, and `getApplicationOwnedAgentDefinitionsByOwnerApplicationId(...)`, and
- cache invalidation via `invalidateAgentDefinitions()`.

## Package Refresh Behavior

Package import/remove flows invalidate and reload Agents together with Applications and Agent Teams. This keeps embedded application-owned definitions visible (or removed) in the same session immediately after a package mutation.

## Featured Agents

`AgentList.vue` joins the loaded agent catalog with `AUTOBYTEUS_FEATURED_CATALOG_ITEMS` entries whose `resourceKind` is `AGENT`.

- Fresh server startup seeds the normal shared `autobyteus-super-assistant` definition and initializes the featured setting to point at it when the setting is missing or blank.
- Featured agents render with the same `AgentCard` component and the same view, sync, and run actions as the regular grid.
- When the featured section is visible, the same agent is removed from the regular grid to avoid duplicate cards.
- Search mode hides featured grouping and searches the full agent catalog normally, including featured agents that match the query.
- Unknown or removed definition ids in the setting are ignored on the catalog page; Settings keeps unresolved rows visible for operator cleanup.
- Frontend code must not hard-code featured agent ids. Change featured placement through the server setting instead.

## Notes

- The generic create flow still creates shared standalone agents.
- Application-owned and team-local agents are surfaced for inspection/testing and in-place editing, not for shared-path duplication or destructive management.
- Search in the list includes provenance fields such as owning team, owning application, and package id.
