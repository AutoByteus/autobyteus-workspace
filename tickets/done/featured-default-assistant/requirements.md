# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — user approved the Server Basic Settings-driven featured catalog design.

## Goal / Problem Statement

This is a new, independent ticket bootstrapped from the default personal branch. It should make one focused product optimization: allow the product/server configuration to choose featured catalog items, and use that configuration to place `AutoByteus Super Assistant` at the top of the Agents page by default.

AutoByteus can show many agents and agent teams, including shared, application-owned, and team-local definitions. Users can struggle to identify the general-purpose daily assistant. The product should make recommended items immediately visible while preserving the normal run/detail/sync experience.

The first seeded featured item is the platform-owned `AutoByteus Super Assistant`. Users should be able to manage featured catalog items from the Settings → Basics / Server Basic Settings area, so future featured agents or agent teams do not require code changes.

## Source Of Truth

Featured placement must come from server settings.

Recommended setting key:

```text
AUTOBYTEUS_FEATURED_CATALOG_ITEMS
```

Recommended value shape, stored as a JSON string in the existing server settings system:

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

Rules:

- `resourceKind` is one of `AGENT` or `AGENT_TEAM`.
- `definitionId` is the agent or agent-team definition id.
- `sortOrder` controls ordering within the matching featured section; lower numbers appear first.
- Missing/invalid/unknown referenced items must not crash the product; invalid settings should be rejected on save where possible and ignored safely on read.
- The existing agent/team `category` field must not be used for featured placement.
- Agent definition `agent-config.json` must not self-declare featured placement for this ticket.
- Frontend must not hard-code a featured id list.

## Investigation Findings

- The current default landing route redirects `/` to `/agents`.
- `AgentList.vue` currently renders one search/toolbar area and one grid of all filtered agent definitions.
- `AgentTeamList.vue` has a parallel list/search/card pattern for agent teams.
- `AgentCard.vue` and `AgentTeamCard.vue` already expose the desired normal actions: `Sync`, `Run`, and `View Details`.
- Existing run behavior goes through `useRunActions.prepareAgentRun` / `prepareTeamRun` and then navigates to `/workspace`.
- Existing Server Settings infrastructure stores setting values as strings and already has a Settings → Basics / quick section in `ServerSettingsManager.vue`.
- The private source `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/super-ai-assistant` exists, but the current product branch does not yet seed a platform-owned `AutoByteus Super Assistant` general agent.
- The backend already has a seed-if-missing precedent for platform-owned agent definitions through the default memory compactor bootstrapper.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / focused UI and settings optimization
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, narrowly scoped
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / product information-architecture issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Small settings helper/card extraction likely needed; broad Agents/Teams refactor deferred
- Evidence basis: The existing run paths are healthy, but catalog presentation lacks configurable featured placement. Server settings are the right owner because featured status is product/server preference, not an intrinsic agent definition property.
- Requirement or scope impact: Add platform-owned Super Assistant seeding, add a typed featured-catalog server setting, add a Basic Settings management card, and consume the setting in Agents/Agent Teams list categories.

## Recommendations

1. Seed `autobyteus-super-assistant` as a normal shared/platform-owned agent using the existing private Super Assistant as the source template.
2. Add predefined server setting `AUTOBYTEUS_FEATURED_CATALOG_ITEMS` with JSON schema/normalization helper.
3. On first startup/seed, initialize the setting to feature the Super Assistant if the setting is missing or blank.
4. Never overwrite a user-customized featured setting. If the user intentionally sets an empty items array, preserve it.
5. Add a Settings → Basics card named `Featured catalog items` where the user can add/remove/reorder featured agents and agent teams.
6. Render `Featured agents` on the Agents page from server setting entries where `resourceKind === "AGENT"`.
7. Render `Featured teams` on the Agent Teams page from server setting entries where `resourceKind === "AGENT_TEAM"`.
8. Reuse the normal `AgentCard` / `AgentTeamCard`; do not create special hero cards or special run actions.
9. Exclude featured items from the normal grid while their featured section is shown to avoid duplicate cards.
10. When search is active, hide grouping and search the full list normally.
11. Defer broader cleanup such as hiding/grouping team-local definitions and broader catalog IA redesign.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium. The visible UI change is small, but the ticket now includes one typed server setting, a Basic Settings card, platform Super Assistant seeding, and limited featured-section consumption in both Agents and Agent Teams lists.

## In-Scope Use Cases

- UC-001: User opens `/agents` and immediately sees `AutoByteus Super Assistant` in `Featured agents` because the server setting references it by default.
- UC-002: User clicks normal `Run` on the featured Super Assistant and follows the existing workspace run-config/run flow.
- UC-003: User opens Settings → Basics and adds/removes/reorders featured agents or agent teams.
- UC-004: User opens `/agent-teams` and sees any configured featured teams in a `Featured teams` section.
- UC-005: User searches agents or teams; category grouping disappears and search results use the same full-list behavior as today.
- UC-006: Backend startup seeds the platform-owned Super Assistant if it is missing and initializes the featured setting only when unset.

## Out of Scope

- Product entry-surface redesign unrelated to the catalog pages.
- Duplicated runtime/model/workspace controls outside the existing run flow.
- Any special action separate from the existing `Run` action.
- Agent/team form UI for editing featured placement.
- Agent package self-declared featured metadata.
- Broad redesign of Agents/Agent Teams grouping/filtering beyond one featured section.
- Hiding, grouping, or reclassifying team-local/application-owned definitions.
- Removal of existing product areas; that belongs in a separate ticket if needed.

## Functional Requirements

- FR-001: The product must seed a shared platform-owned Super Assistant definition with stable id `autobyteus-super-assistant` when missing.
- FR-002: The product must register predefined server setting `AUTOBYTEUS_FEATURED_CATALOG_ITEMS` with a clear description.
- FR-003: The setting value must be parsed as a versioned JSON object with `items` containing `resourceKind`, `definitionId`, and optional `sortOrder`.
- FR-004: Setting saves must validate resource kind, non-empty ids, duplicate entries, and JSON shape.
- FR-005: On first seed/startup, if the setting is missing or blank, initialize it to feature `autobyteus-super-assistant` as an `AGENT` item.
- FR-006: If the setting already exists, including an intentionally empty items array, startup must not overwrite it.
- FR-007: Settings → Basics must expose a `Featured catalog items` card for selecting agents/agent teams, adding rows, removing rows, reordering rows, and saving.
- FR-008: Agents list must show a `Featured agents` section when configured `AGENT` featured items resolve to loaded agent definitions and search is empty.
- FR-009: Agent Teams list must show a `Featured teams` section when configured `AGENT_TEAM` featured items resolve to loaded team definitions and search is empty.
- FR-010: Featured sections must render the same card/action model as regular definitions.
- FR-011: Regular grids must not duplicate items currently shown in a featured section.
- FR-012: When search is active, featured grouping must hide and search must include all definitions normally if they match.
- FR-013: Frontend must not hard-code a featured id list as the placement source of truth.

## Acceptance Criteria

- AC-001: On `/agents` with default settings, `Featured agents` appears and contains `AutoByteus Super Assistant`.
- AC-002: Clicking `Run` on the featured Super Assistant uses the same run preparation path as a normal agent card.
- AC-003: Settings → Basics shows a `Featured catalog items` card and can save a valid JSON-backed featured list through server settings.
- AC-004: Adding an arbitrary existing agent through Settings makes that agent appear in `Featured agents` without frontend code changes.
- AC-005: Adding an arbitrary existing agent team through Settings makes that team appear in `Featured teams` without frontend code changes.
- AC-006: Removing an item from the featured setting removes it from the corresponding featured section after reload/refresh.
- AC-007: Regular grids do not duplicate featured items while featured sections are visible.
- AC-008: Search mode hides featured grouping and uses full-list search behavior.
- AC-009: Backend startup seeds Super Assistant files and initializes the setting only when the setting is unset/blank.
- AC-010: Existing user-edited Super Assistant files and existing featured setting values are preserved on later startup.

## Constraints / Dependencies

- Must keep featured items as normal agent/team definitions and normal card/run paths.
- Must not depend on `/Users/normy/autobyteus_org/autobyteus-private-agents` at runtime after seeding/promotion.
- Must preserve user edits to seeded agent files and user settings.
- Must keep this optimization narrow and defer broader catalog grouping/filtering.
- Must keep the ticket independent from other in-progress product-entry experiments or removal work.

## Assumptions

- `autobyteus-super-assistant` is acceptable as the stable platform-owned id for the seeded agent itself.
- The display name should be normalized to `AutoByteus Super Assistant` for product polish.
- Server-wide featured catalog settings are acceptable for v1. Per-user featured items can be considered later if the product adds user profiles.

## Risks / Open Questions

- OQ-001: Should the setting key be exactly `AUTOBYTEUS_FEATURED_CATALOG_ITEMS`? Design recommendation: yes.
- OQ-002: Should Agent Teams featured display ship in this same ticket? Design recommendation: yes if Settings supports team entries; otherwise team entries would be confusing.
- OQ-003: Should the Settings card support drag-and-drop reorder or simple up/down controls? Design recommendation: simple up/down controls for v1.
- OQ-004: Should unknown referenced ids be shown as warnings in Settings? Design recommendation: yes, show unresolved rows and allow removal, while catalog pages ignore unresolved rows safely.

## Approval Status

Approved by user for architecture review. The accepted direction is Server Basic Settings-driven featured catalog items with simple Featured/All sections on catalog pages.
