# Requirements Doc

## Status

`Design-ready`

## Goal / Problem Statement

The product currently exposes node management from the settings page, while the home/workspace left navigation includes a `Media` item the user no longer uses. The user wants `Nodes` promoted to a first-level home/workspace menu item and `Media` removed from that first-level menu so node access is faster and more visible.

## Investigation Findings

- The home/workspace shell has two sidebar presentations:
  - expanded: `autobyteus-web/components/AppLeftPanel.vue`
  - collapsed icon strip: `autobyteus-web/components/layout/LeftSidebarStrip.vue`
- Both sidebar presentations currently duplicate the same primary navigation model, route mapping, and active-route logic.
- `Media` is declared in both nav components and routes to `autobyteus-web/pages/media.vue`.
- Node management already has a reusable owner, `autobyteus-web/components/settings/NodeManager.vue`, currently mounted from `autobyteus-web/pages/settings.vue` under `activeSection === 'nodes'`.
- `NodeManager` already supports the `nodeTab` query parameter, so a dedicated `/nodes` page can reuse it without duplicating node behavior.
- Mobile route gating currently treats `/settings` as a desktop-only settings route; new `/nodes` should also be gated as desktop settings functionality.

## Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Initial design issue signal: `Yes`
- Root cause classification: `Duplicated Policy Or Coordination`
- Refactor posture: `Likely Needed`
- Evidence basis: Shell primary nav key/list/route/active-state policy is duplicated between `AppLeftPanel.vue` and `LeftSidebarStrip.vue`; this task requires changing that policy in both places unless it is centralized.
- Requirement or scope impact: The implementation should centralize the shell primary navigation contract and then express `Nodes`/`Media` changes once. Node management behavior should remain in `NodeManager`.

## Recommendations

1. Add a first-level `Nodes` item to the home/workspace shell primary navigation.
2. Remove `Media` from the home/workspace shell primary navigation.
3. Add a dedicated `/nodes` page that mounts the existing `NodeManager` component under the normal default shell layout.
4. Centralize shell primary nav definitions (keys, labels, icons, route targets, active matchers, feature availability) in a shared shell navigation module/composable consumed by both expanded and collapsed sidebars.
5. Keep `pages/media.vue` and media backend/storage/tool behavior intact by default; the request is menu removal, not media subsystem decommission.
6. Preferred IA decision for approval: remove `Nodes` from the Settings sidebar after promoting it to first-level home/workspace navigation, and update stale docs/copy that refer to `Settings -> Nodes`. If the user wants a lower-risk transition, keep settings access temporarily but treat it as an explicit duplicate-access exception.

## Scope Classification

`Medium`

Rationale: The user-visible behavior is small, but the current duplicated shell nav policy should be refactored to prevent drift between expanded and collapsed sidebars.

## In-Scope Use Cases

- `UC-001`: User opens the home/workspace shell and sees `Nodes` as a first-level navigation option.
- `UC-002`: User clicks `Nodes` and reaches the existing node management experience.
- `UC-003`: User no longer sees `Media` as a first-level home/workspace menu item.
- `UC-004`: User can use existing node management controls without behavior regression.
- `UC-005`: Collapsed and expanded sidebars expose the same primary navigation contract.

## Out of Scope

- Changing node-management operations: add remote node, browser sharing settings, phone setup, docker guide, configured nodes behavior.
- Deleting backend media APIs, stored media files, media tools, media rendering in conversation, or `pages/media.vue` unless the user explicitly approves media subsystem decommission.
- Redesigning unrelated home/sidebar information architecture.
- Changing mobile-first `/mobile` workflow beyond routing `/nodes` away from unsupported mobile runtime.

## Functional Requirements

- `FR-001`: Promote `Nodes` to a first-level item in the home/workspace primary navigation.
- `FR-002`: The `Nodes` menu item must route to a dedicated `/nodes` page.
- `FR-003`: The `/nodes` page must render the existing `NodeManager` experience and preserve its `nodeTab` query behavior.
- `FR-004`: Remove `Media` from the home/workspace primary navigation in both expanded and collapsed sidebar presentations.
- `FR-005`: Preserve `pages/media.vue` and media subsystem behavior unless a separate decommission decision is approved.
- `FR-006`: Keep active/selected navigation styling consistent with existing primary nav behavior for `Nodes`.
- `FR-007`: Centralize shell primary navigation definitions so expanded and collapsed sidebars consume the same nav contract.
- `FR-008`: Gate `/nodes` as unsupported in the mobile remote runtime in the same category as desktop settings.
- `FR-009`: If the approved IA is a true move, remove `Nodes` from the Settings sidebar and update stale user-facing documentation/copy that points users to `Settings -> Nodes`.

## Acceptance Criteria

- `AC-001`: In the expanded home/workspace left panel, the primary nav displays `Nodes` at the same hierarchy level as `Agents`, `Agent Teams`, `Skills`, and `Memory`.
- `AC-002`: In the collapsed left icon strip, the primary nav displays a `Nodes` icon/tooltip at the same hierarchy level as the other primary items.
- `AC-003`: Clicking `Nodes` in either sidebar presentation navigates to `/nodes`.
- `AC-004`: `/nodes` renders the existing node management UI with Manage Nodes, Phone Setup, and Docker Guide tabs.
- `AC-005`: `/nodes?nodeTab=phoneSetup` opens the NodeManager Phone Setup tab, preserving current tab query behavior.
- `AC-006`: The expanded and collapsed home/workspace sidebars no longer display a `Media` primary nav item.
- `AC-007`: Direct navigation to `/media` is not changed by this task unless the user explicitly approves media page decommission.
- `AC-008`: `Nodes` active-route highlighting is visually and behaviorally consistent with other primary nav items.
- `AC-009`: Shell primary navigation route/item/active-state policy is declared in one shared owner consumed by both sidebar presentations.
- `AC-010`: In mobile remote runtime route gating, `/nodes` redirects as unsupported `desktopSettings` rather than opening a desktop-only page.
- `AC-011`: If `Nodes` is removed from Settings as the approved move, the settings sidebar no longer lists `Nodes` and stale `Settings -> Nodes` docs/copy are updated or explicitly recorded for docs sync.

## Constraints / Dependencies

- Must avoid source-code edits until requirements/design gates allow them.
- Must maintain Nuxt page/routing conventions.
- Must update English and Chinese shell navigation labels.
- Must update relevant frontend tests for shared navigation and `/nodes` mobile gate behavior.

## Assumptions

- The user means the main home/workspace sidebar shown in screenshot #2.
- `Media` should be removed from the sidebar menu, not deleted as a media feature/subsystem.
- `Nodes` should reuse the existing node management experience shown in screenshot #1.
- Preferred nav order: replace `Media` with `Nodes` in roughly the same position after `Memory`, minimizing layout disruption.

## Risks / Open Questions

- Approval needed: true move vs duplicate access.
  - Recommended: true move — `Nodes` top-level, no Settings sidebar `Nodes` entry.
  - Alternative: duplicate access — top-level `Nodes` plus existing Settings `Nodes` retained temporarily.
- If true move is approved, mobile app copy and docs containing `Settings -> Nodes` need coordinated updates.
- Static tests that inspect source literals in `AppLeftPanel.vue` must be modernized to understand shared navigation ownership.

## Requirement-To-Use-Case Coverage

| Requirement | Use Case(s) |
| --- | --- |
| `FR-001` | `UC-001`, `UC-005` |
| `FR-002` | `UC-002` |
| `FR-003` | `UC-002`, `UC-004` |
| `FR-004` | `UC-003`, `UC-005` |
| `FR-005` | `UC-003` |
| `FR-006` | `UC-001`, `UC-005` |
| `FR-007` | `UC-005` |
| `FR-008` | `UC-002` |
| `FR-009` | `UC-001`, `UC-002` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| `AC-001` | Expanded sidebar visual/menu presence check |
| `AC-002` | Collapsed sidebar visual/menu presence check |
| `AC-003` | Navigation click behavior from both sidebar presentations |
| `AC-004` | Node page renders existing feature owner |
| `AC-005` | NodeManager tab query behavior remains valid outside settings |
| `AC-006` | Media item absent from primary nav |
| `AC-007` | Media feature is not accidentally decommissioned |
| `AC-008` | Active route styling consistency check |
| `AC-009` | Source architecture check for shared nav owner |
| `AC-010` | Mobile remote runtime unsupported-route gate check |
| `AC-011` | True-move IA and docs/copy sync check |

## Approval Status

Approved by user on 2026-06-18. Approved IA: `Nodes` becomes top-level only and is removed from the Settings sidebar.
