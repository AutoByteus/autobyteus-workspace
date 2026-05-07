# Design Spec

## Status (`Draft`/`Ready For Architecture Review`/`Approved`)

Ready For Architecture Review — user approved the Server Basic Settings-driven featured catalog design.

## Executive Summary

Implement a focused catalog discoverability improvement:

1. Add a platform-owned default agent definition for `AutoByteus Super Assistant` with stable id `autobyteus-super-assistant`.
2. Add predefined server setting `AUTOBYTEUS_FEATURED_CATALOG_ITEMS` as the source of truth for featured agents/teams.
3. Initialize the setting to feature Super Assistant only when the setting is unset/blank.
4. Add a Settings → Basics card where users can add/remove/reorder featured agents and agent teams.
5. Update Agents page to render configured featured `AGENT` entries in a `Featured agents` section.
6. Update Agent Teams page to render configured featured `AGENT_TEAM` entries in a `Featured teams` section.
7. Use existing normal cards and run/detail/sync handlers for all featured items.
8. Hide grouping during search and search the full list normally.

The design intentionally avoids frontend hard-coded ids and avoids putting featured placement into agent config. Featured placement is product/server preference, so Settings owns it.

## Server Setting Design

Setting key:

```ts
export const FEATURED_CATALOG_ITEMS_SETTING_KEY = 'AUTOBYTEUS_FEATURED_CATALOG_ITEMS'
```

Stored value:

```json
{
  "version": 1,
  "items": [
    {
      "resourceKind": "AGENT",
      "definitionId": "autobyteus-super-assistant",
      "sortOrder": 10
    }
  ]
}
```

Types:

```ts
export type FeaturedCatalogResourceKind = 'AGENT' | 'AGENT_TEAM'

export interface FeaturedCatalogItem {
  resourceKind: FeaturedCatalogResourceKind
  definitionId: string
  sortOrder: number
}

export interface FeaturedCatalogItemsSetting {
  version: 1
  items: FeaturedCatalogItem[]
}
```

Normalization/validation rules:

- JSON must parse to an object with `version: 1` and `items: []`.
- `resourceKind` must be `AGENT` or `AGENT_TEAM`.
- `definitionId` must be a non-empty string.
- `sortOrder` should normalize to a finite number; if missing, assign deterministic order from row index.
- Duplicate `(resourceKind, definitionId)` entries are invalid or normalized to one entry.
- Unknown referenced ids are allowed at raw setting parse time but shown as unresolved in Settings and ignored by catalog pages.
- Invalid raw value should not crash the app. Prefer rejecting invalid saves server-side; also parse safely client-side.

## Design Principles Applied

- Product simplicity: show recommended items where users already browse agents/teams.
- Settings ownership: featured/default placement is product/server preference, not intrinsic definition metadata.
- Data-driven UI: catalog placement comes from server setting data, not frontend hard-coded ids.
- Boundary reuse: keep `AgentCard`, `AgentTeamCard`, list stores, and `useRunActions` as the owning surfaces.
- No duplicate action model: featured items are normal definitions, not a special launch system.
- Narrow v1: featured settings and sections now; broader catalog IA cleanup later.

## In-Scope Design Decisions

1. Stable platform assistant id for the seeded agent itself: `autobyteus-super-assistant`.
2. Display name: `AutoByteus Super Assistant`.
3. New backend default-agent bootstrapper mirrors the memory compactor seed-if-missing behavior.
4. Featured source of truth is `AUTOBYTEUS_FEATURED_CATALOG_ITEMS`.
5. Settings → Basics gets a `Featured catalog items` card.
6. The Settings card supports `AGENT` and `AGENT_TEAM` resource kinds.
7. Agents page consumes only `AGENT` items.
8. Agent Teams page consumes only `AGENT_TEAM` items.
9. Featured cards use the same normal card components and event handlers as regular cards.

## Out-of-Scope Design Decisions

- Per-user featured settings.
- Agent/team form UI for editing featured placement.
- Agent package self-declared featured placement.
- Broad Agents/Agent Teams IA redesign beyond the single featured section.
- Hiding or reclassifying team-local/application-owned definitions.
- Product area removal or unrelated product entry-surface changes.
- New runtime/model/workspace selection surfaces outside the current run flow.

## Primary Scenarios

| ID | Type | Trigger | Expected Result | Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Startup | Server starts and Super Assistant files are missing | Missing Super Assistant files are seeded; featured setting initialized only if unset/blank | Default Super Assistant bootstrapper + featured setting helper | Ensures default featured assistant exists without overwriting user settings. |
| DS-002 | Settings | User opens Settings → Basics | Featured catalog card loads existing setting and visible agents/teams | FeaturedCatalogItemsCard | Makes configuration discoverable and convenient. |
| DS-003 | Settings | User edits featured list and saves | JSON-backed setting is validated and persisted | Server settings store/service | Establishes server settings as source of truth. |
| DS-004 | Agents page | User opens `/agents` with featured agent entries configured | `Featured agents` appears above regular grid | AgentList list-composition owner | Solves agent discoverability. |
| DS-005 | Agent Teams page | User opens Agent Teams with featured team entries configured | `Featured teams` appears above regular grid | AgentTeamList list-composition owner | Makes generic setting behavior visible for teams. |
| DS-006 | Run | User clicks featured card `Run` | Existing workspace run flow opens | Existing run-action owner | Proves featured cards remain normal definitions. |
| DS-007 | Search | User types search query | Category grouping hides and full-list search runs | List filter owners | Keeps search predictable. |

## Primary Execution Spines

- DS-001: `server-runtime -> DefaultSuperAssistantBootstrapper -> app data agents dir -> FeaturedCatalogItemsSettingHelper -> ServerSettingsService/app config`
- DS-002/003: `ServerSettingsManager quick mode -> FeaturedCatalogItemsCard -> serverSettingsStore -> updateServerSetting(AUTOBYTEUS_FEATURED_CATALOG_ITEMS, json)`
- DS-004: `/agents -> AgentDefinitionStore + ServerSettingsStore -> AgentList featured setting join -> AgentCard`
- DS-005: `/agent-teams -> AgentTeamDefinitionStore + ServerSettingsStore -> AgentTeamList featured setting join -> AgentTeamCard`
- DS-006: `Featured card Run -> existing list handler -> useRunActions -> /workspace`
- DS-007: `Search input -> hide featured sections -> full-list filtered grid`

## Ownership Map

| Owner | Owns | Must Not Own |
| --- | --- | --- |
| `DefaultSuperAssistantBootstrapper` | Seed-if-missing lifecycle for one platform-owned Super Assistant definition. | User settings overwrite, UI layout, runtime execution. |
| Featured catalog setting helper | Setting key, parse/serialize/defaults/validation for featured catalog items. | Definition discovery or rendering. |
| `ServerSettingsService` | Registering/persisting predefined setting and rejecting invalid values where possible. | Joining setting rows to frontend definitions. |
| `FeaturedCatalogItemsCard` | User-facing Basic Settings management UI for featured agents/teams. | Agent/team run behavior. |
| `AgentList` | Agents page featured/regular split based on server setting and loaded agents. | Server setting persistence, hard-coded featured ids. |
| `AgentTeamList` | Agent Teams page featured/regular split based on server setting and loaded teams. | Server setting persistence, hard-coded featured ids. |
| `AgentCard` / `AgentTeamCard` | Single-card display and event emits. | Featured selection or run orchestration. |
| `useRunActions` | Normal agent/team run preparation. | Catalog presentation decisions. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Duplicate featured card in regular grid | Creates visual repetition | List featured/regular split | In This Change | Search mode can show items as normal results. |
| Frontend hard-coded featured id rule | Creates policy drift and fails future featured items | Server setting `AUTOBYTEUS_FEATURED_CATALOG_ITEMS` | In This Change | Tests should feature arbitrary fixture ids. |
| Agent config featured metadata idea | Wrong ownership; agents should not self-promote in product UI | Server Basic Settings | In This Change | Keep definition config focused on agent behavior. |
| Broad team-local grouping/hiding idea | Too large for first optimization | Future catalog IA/filtering ticket | Follow-up | Do not mix into this implementation. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why |
| --- | --- | --- | --- |
| Agent/team run launch | `useRunActions` + run config stores | Reuse | Correct existing boundary for card run actions. |
| Single card UI | `AgentCard.vue`, `AgentTeamCard.vue` | Reuse | User wants same UI/actions, just featured placement. |
| Definition data | Existing stores/GraphQL queries | Reuse | Already returns ids/names/details needed for joining. |
| Server persisted setting | `ServerSettingsService`, `serverSettingsStore`, server settings GraphQL | Extend | Existing string setting flow is enough if JSON helper validates/parses. |
| Settings Basic UI | `ServerSettingsManager.vue` quick card grid | Extend | Natural location requested by user. |
| Platform agent seed | Compactor bootstrap precedent | Create small new bootstrapper | Super Assistant is a general default agent, not compaction-specific. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Concrete Concern |
| --- | --- | --- |
| `autobyteus-server-ts/src/config/featured-catalog-items-setting.ts` | Backend settings config | Key, types, default value, parse/serialize/validation helpers. |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Backend settings service | Register featured setting and validate JSON value before persistence. |
| `autobyteus-server-ts/src/agent-definition/default-agents/default-super-assistant-bootstrapper.ts` | Backend agent definition defaults | Seed missing Super Assistant files; initialize featured setting only if unset/blank. |
| `autobyteus-server-ts/src/agent-definition/default-agents/super-assistant/agent.md` | Seed template | Platform Super Assistant prompt/frontmatter. |
| `autobyteus-server-ts/src/agent-definition/default-agents/super-assistant/agent-config.json` | Seed template | Platform Super Assistant config/tools; no featured self-metadata. |
| `autobyteus-server-ts/src/server-runtime.ts` | Backend startup | Call Super Assistant bootstrapper. |
| `autobyteus-web/utils/catalog/featuredCatalogItems.ts` | Frontend catalog settings helper | Parse/serialize setting value, join/sort settings items with loaded definitions. |
| `autobyteus-web/components/settings/FeaturedCatalogItemsCard.vue` | Settings Basic UI | Add/remove/reorder/select featured agents/teams and save setting. |
| `autobyteus-web/components/settings/ServerSettingsManager.vue` | Settings quick page | Render `FeaturedCatalogItemsCard` in Basics. |
| `autobyteus-web/stores/serverSettings.ts` | Frontend server settings store | Existing fetch/save setting actions; optional typed helper methods if useful. |
| `autobyteus-web/components/agents/AgentList.vue` | Agents catalog | Render `Featured agents` and `All agents` sections from setting. |
| `autobyteus-web/components/agentTeams/AgentTeamList.vue` | Agent Teams catalog | Render `Featured teams` and all-teams sections from setting. |
| `autobyteus-web/localization/messages/en/agents.ts` / `zh-CN/agents.ts` | Localization | Featured agent labels. |
| `autobyteus-web/localization/messages/en/agentTeams.ts` / `zh-CN/agentTeams.ts` | Localization | Featured team labels. |
| `autobyteus-web/localization/messages/en/settings.ts` / `zh-CN/settings.ts` | Localization | Settings card labels/errors. |

## Dependency Rules

Allowed:

- Backend startup may seed Super Assistant and initialize the featured setting only when unset/blank.
- Settings Basic card may load existing agent and team definition stores to populate selectors.
- Agents/Agent Teams lists may read server setting data and join it to already-loaded definitions.
- Featured cards may use the same action handlers as regular cards.

Forbidden:

- No frontend hard-coded list of featured ids as source of truth.
- No agent/team config self-declared featured placement in this ticket.
- No overloading existing `category` to mean featured placement.
- No direct backend run creation from catalog pages.
- No special action separate from `Run`.
- No overwriting user-edited Super Assistant files or existing featured settings after initial seed.
- No dependency on other in-progress product-entry experiments.

## Target UI Shape

Agents page:

```text
Agents
[ Search agents... ] [Reload] [Create Agent]

Featured agents
Recommended for general tasks.
┌ AutoByteus Super Assistant                         [Run] ┐
└──────────────────────────────────────────────────────────┘

All agents
┌ Agent card ┐ ┌ Agent card ┐
```

Agent Teams page:

```text
Agent Teams
[ Search teams... ] [Reload] [Create Team]

Featured teams
Recommended team workflows.
┌ Team card                                             [Run] ┐
└─────────────────────────────────────────────────────────────┘

All teams
┌ Team card ┐ ┌ Team card ┐
```

Settings → Basics card:

```text
Featured catalog items                         [Save]
Choose which agents and teams appear first in the catalog.

Type        Item                          Order       Actions
Agent       AutoByteus Super Assistant    ↑ ↓         Remove
Team        Software Engineering Team     ↑ ↓         Remove

[Type: Agent ▼] [Item: Select... ▼] [Add]
```

## Search Behavior

- Search empty:
  - render featured section if configured items resolve to loaded definitions;
  - sort by setting `sortOrder`, then display name;
  - render regular grid excluding currently featured items.
- Search non-empty:
  - hide featured grouping;
  - filter the full definition list using current matching fields;
  - allow featured items to appear as normal search results if they match.

## Missing / Invalid Setting Behavior

- Missing/blank setting: startup initializes Super Assistant default after seed.
- Existing empty setting: preserve empty list and show no featured section.
- Invalid JSON: server should reject saves; frontend parser should fall back safely and show an error/warning in Settings.
- Unknown ids: show unresolved rows in Settings, allow removal, and ignore in catalog page rendering.

## Validation Plan

Implementation-scope checks:

- Backend unit: featured setting parser accepts valid value and rejects invalid JSON/resource kinds/empty ids/duplicates.
- Backend unit: Super Assistant bootstrapper seeds missing files and initializes setting only when unset/blank.
- Backend unit: existing featured setting, including empty list, is preserved.
- Frontend unit: Settings card renders current featured items, supports add/remove/reorder, and saves serialized setting.
- Frontend unit: arbitrary non-Super-Assistant agent configured in setting appears in `Featured agents`.
- Frontend unit: arbitrary team configured in setting appears in `Featured teams`.
- Frontend unit: regular grids exclude featured items when grouping is visible.
- Frontend unit: search hides grouping and searches full lists.
- Regression: existing AgentList, AgentTeamList, card, server settings, and compactor bootstrap tests continue to pass.

Suggested manual validation:

1. Start backend/frontend from the ticket branch.
2. Open `/agents`; confirm `Featured agents` contains `AutoByteus Super Assistant` by default.
3. Click featured `Run`; confirm existing workspace run flow opens.
4. Select runtime `AutoByteus` and model `GPT-5` for a sample run, if available in the environment.
5. Open Settings → Basics; add another agent and, if available, an agent team to Featured catalog items.
6. Reopen Agents/Agent Teams pages and confirm corresponding featured sections update.
7. Remove the featured items and confirm sections disappear after save/reload.
8. Search on both pages and confirm grouping hides.

## Migration / Refactor Sequence

1. Add backend featured catalog setting helper/key/defaults/parser.
2. Extend `ServerSettingsService` validation/registration for the featured setting.
3. Add backend Super Assistant template files and bootstrapper; initialize featured setting only if unset/blank.
4. Wire bootstrapper into `server-runtime.ts`.
5. Add backend tests.
6. Add frontend featured catalog helper.
7. Add `FeaturedCatalogItemsCard.vue` and mount it in `ServerSettingsManager.vue` quick/basic section.
8. Update `AgentList.vue` for `Featured agents` / regular split.
9. Update `AgentTeamList.vue` for `Featured teams` / regular split.
10. Add localization and frontend tests.
11. Verify no unrelated product-entry or run-surface changes were added.

## Key Tradeoffs

- Server setting JSON is slightly more complex than a single default assistant id, but it supports both agents and teams without future schema changes.
- Putting configuration in Settings is cleaner than agent config because featured/default status is product preference, not agent behavior.
- Supporting Agent Teams display in the same ticket avoids a Settings control that accepts teams but has no visible effect.
- Deferring broader grouping leaves catalog noise below featured sections, but the most important recommendations become immediately visible.

## Guidance For Implementation

- Keep this ticket narrow: only featured sections, settings management, and Super Assistant seed.
- Reuse existing cards and run actions.
- Use server setting data to decide featured placement; do not hard-code ids in frontend.
- Do not put featured placement in agent/team definition config.
- Preserve current `/agents` and Agent Teams route behavior.
- Seed only missing Super Assistant files and initialize setting only when unset/blank.
