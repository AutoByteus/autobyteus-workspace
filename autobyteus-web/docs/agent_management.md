# Agent Management Module - Frontend

## Scope

Shows agent definitions in the native Agents surface, supports shared-agent creation, supports edit/detail flows for discoverable shared and application-owned agents, and prepares direct agent launches from persisted definition defaults. Team-local agents are primarily managed from their owning Agent Team detail page and are excluded from normal Agents browse/search discovery.

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
- `utils/catalog/agentDefinitionOriginGroups.ts`
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

| Scope | Shown in generic Agents list | Editable from generic agent detail/edit | Generic delete / duplicate actions |
| --- | --- | --- | --- |
| `SHARED` | Yes | Yes | Allowed |
| `TEAM_LOCAL` | No in normal browse/search; use owning Agent Team detail | Direct known-id routes remain available, but primary edit is in Agent Team detail | Not allowed in the generic shared workflow |
| `APPLICATION_OWNED` | Yes | Yes when backed by a writable source | Not allowed in the generic shared workflow |

The list/detail/card surfaces show provenance badges and owner labels so users can distinguish standalone agents from application-owned definitions. Direct known-id team-local detail/edit routes still show team provenance, but normal discovery for team-local definitions lives in Agent Team detail.

For team-local agents whose owning team belongs to an application bundle, direct detail surfaces and team-member details show both the owning team and the owning application/package provenance when available.

Team-local agents can be owned by nested team-local subteams as well as root
teams. Their canonical ids encode the actual owner team id, so lookups by owner
team should use the canonical team-local subteam id when the agent lives under a
local subteam's `agents/` folder.

## Browse Layout

When the search box is empty, `AgentList.vue` renders the agent catalog as origin-aware browse sections in this order:

1. **Featured agents** from `AUTOBYTEUS_FEATURED_CATALOG_ITEMS`, after filtering out team-local definitions.
2. **Application agents**, grouped by owning application.
3. **Shared agents**, shown as the global standalone section.

Featured agents are removed from the later origin sections to avoid duplicate cards. Application-owned groups use the owning application/package label. Shared agents remain the global fallback section for normal standalone definitions. Team-local definitions are filtered before featured splitting and origin grouping so they do not appear as normal catalog cards.

Search mode intentionally hides all browse grouping, including featured placement, and returns a flat filtered catalog. Search still matches discoverable definition name, description, tool/skill names, and provenance fields such as owning application and package id. `TEAM_LOCAL` definitions are excluded before search, even if their name, owning team, or application provenance matches the query.

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

Agent package import, removal, local reload, and managed GitHub update flows
invalidate and reload Agents together with Applications and Agent Teams. This
keeps embedded application-owned definitions visible, refreshed, or removed in
the same session immediately after a package mutation.

For definition updates outside the editor, use **Settings → Agent Packages** as
the source-aware package lifecycle surface. Local path packages remain
user-owned: edit or pull the folder outside AutoByteus, then press the package
row's **Reload** action so the backend validates and rescans the package.
Public GitHub package rows can **Check again** for default-branch drift and
**Update** the AutoByteus-managed package when an update is available or the
installed revision is unknown. These actions refresh the local agent catalog
from configured package sources and perform a network refetch; they do not copy
definitions between nodes.

## Featured Agents

`AgentList.vue` joins the loaded agent catalog with `AUTOBYTEUS_FEATURED_CATALOG_ITEMS` entries whose `resourceKind` is `AGENT`.

- Featured placement is user/operator-selected through Settings; fresh server startup does not auto-feature Daily Assistant or any other agent.
- Daily Assistant can be loaded as a normal private/shared agent from an agent package such as `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/daily-assistant/`, then added to Featured agents through Settings if desired.
- Featured agents render with the same `AgentCard` component and the same view-details and run actions as the origin-grouped browse sections.
- When the featured section is visible, the same agent is removed from later origin sections to avoid duplicate cards.
- Search mode hides featured and origin grouping and searches the discoverable agent catalog, excluding team-local definitions.
- Unknown or removed definition ids in the setting are ignored on the catalog page; Settings keeps unresolved rows visible for operator cleanup.
- Frontend code must not hard-code featured agent ids. Change featured placement through the server setting instead.

## Notes

- The generic create flow still creates shared standalone agents.
- Application-owned agents are surfaced for inspection/testing and in-place editing, not for shared-path duplication or destructive management.
- Team-local agents are inspected and edited from the owning Agent Team detail page; direct known-id `/agents` detail/edit routes remain available for debugging but are not normal discovery.
- When a shared/global agent member is opened from Agent Team detail, the Agent Detail route may include `returnToTeam=<teamId>`; its back action returns to `/agent-teams?view=team-detail&id=<teamId>` when that context is present and otherwise keeps the normal Back to Agents behavior.
- Search in the list includes provenance fields such as owning application and package id for discoverable agents, while excluding team-local definitions.
