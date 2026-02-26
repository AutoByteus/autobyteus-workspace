# Proposed Design Document

## Design Version

- Current Version: `v3`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Defined standalone settings shell and messaging consolidation scope. | 1 |
| v2 | Round-1 findings | Added explicit route/layout ownership boundaries and query normalization rules. | 2 |
| v3 | Round-2 findings | Added remove/decommission checklist and test migration matrix for deleted `/messaging` route. | 3 |

## Summary

Refactor settings into a standalone page shell (no global app left panel inside settings), add a top-left back arrow to return to `/workspace`, and move Messaging setup into Settings as a first-class settings section. Keep Tools, Memory, and Media as top-level navigation entries.

## Scope Classification

- Classification: `Medium`
- Why:
  - Cross-cutting refactor across layout, global navigation, routes, and settings IA.
  - Includes `Remove` changes (`/messaging` route host and related route tests).
  - Requires coordinated host-boundary tests across layout/page/nav layers.

## Goals

- Make `/settings` visually standalone and avoid two-layer left navigation.
- Provide explicit back navigation in settings header (`Back -> /workspace`).
- Consolidate Messaging setup under Settings.
- Keep frequent operational surfaces (`Tools`, `Memory`, `Media`) in global top-level nav.

## Non-Goals

- No backend/API changes for settings or messaging setup.
- No changes to Messaging setup internals (`MessagingSetupManager` workflows).
- No IA move for Tools/Memory/Media in this phase.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Applied here:
  - Remove standalone `/messaging` page host route and related tests.
  - Remove global `Messaging` nav item from app left chrome.

## Requirements And Use Cases

- UC-001: User opens Settings from app shell and sees a standalone settings shell without `AppLeftPanel`.
- UC-002: User clicks top-left back arrow on Settings and returns to `/workspace`.
- UC-003: User selects `Messaging` section inside Settings and configures messaging setup.
- UC-004: User no longer sees `Messaging` in global left navigation.
- UC-005: Settings deep links via `?section=` keep working for existing sections and new `messaging` section.

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Global shell always uses `layouts/default.vue`; settings currently rendered inside that shell. | `/Users/normy/autobyteus_org/autobyteus-web/layouts/default.vue`, `/Users/normy/autobyteus_org/autobyteus-web/pages/settings.vue` | None |
| Current Naming Conventions | Route-host ownership in `pages/*.vue`; global nav in `AppLeftPanel` + `LeftSidebarStrip`. | `/Users/normy/autobyteus_org/autobyteus-web/components/AppLeftPanel.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/layout/LeftSidebarStrip.vue` | None |
| Impacted Modules / Responsibilities | Settings page owns settings sub-section state; messaging page is only a thin host for `MessagingSetupManager`. | `/Users/normy/autobyteus_org/autobyteus-web/pages/settings.vue`, `/Users/normy/autobyteus_org/autobyteus-web/pages/messaging.vue` | None |
| Data / Persistence / External IO | No new persistence or external IO; pure routing/layout/UI composition changes. | N/A | None |

## Current State (As-Is)

- `/settings` renders under `default` layout, so left app panel remains visible.
- Settings page has its own sidebar (`API Keys`, `Token Usage`, `Nodes`, `Server Settings`).
- Global app nav still includes `Messaging` as a top-level peer route.
- `/messaging` page contains only `<MessagingSetupManager />` and duplicates settings concern separation.

## Target State (To-Be)

- `/settings` uses dedicated `settings` layout (no app left panel).
- Settings layout header includes top-left back button routing to `/workspace`.
- Settings sidebar includes `Messaging` section and renders `MessagingSetupManager` in content pane.
- Global app nav removes `Messaging` item in both full and collapsed variants.
- `/messaging` standalone route host is removed from codebase.

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Add | N/A | `/Users/normy/autobyteus_org/autobyteus-web/layouts/settings.vue` | Create standalone shell for settings route. | Layout | Header with back arrow to `/workspace`. |
| C-002 | Modify | `/Users/normy/autobyteus_org/autobyteus-web/pages/settings.vue` | same | Adopt `settings` layout + add `messaging` section to internal settings nav/content. | Settings IA | Query normalization includes `messaging`. |
| C-003 | Remove | `/Users/normy/autobyteus_org/autobyteus-web/pages/messaging.vue` | N/A | Remove duplicated standalone host for messaging setup. | Routes/pages | No compatibility wrapper retained. |
| C-004 | Modify | `/Users/normy/autobyteus_org/autobyteus-web/components/AppLeftPanel.vue` | same | Remove `Messaging` top-level item and route mapping. | Global nav | Keep other top-level items unchanged. |
| C-005 | Modify | `/Users/normy/autobyteus_org/autobyteus-web/components/layout/LeftSidebarStrip.vue` | same | Remove `Messaging` icon mapping in collapsed nav. | Global nav collapsed state | Keep settings button at bottom. |
| C-006 | Modify | `/Users/normy/autobyteus_org/autobyteus-web/pages/__tests__/settings.spec.ts` | same | Update section expectations for `messaging` under settings. | Tests | Replace legacy “ignore messaging section” assertion. |
| C-007 | Remove | `/Users/normy/autobyteus_org/autobyteus-web/pages/__tests__/messaging.spec.ts` | N/A | Remove obsolete route-host test. | Tests | Decommission with route removal. |
| C-008 | Modify | `/Users/normy/autobyteus_org/autobyteus-web/components/__tests__/AppLeftPanel.spec.ts` | same | Remove hard assertions expecting messaging top-level nav item/route. | Tests | Keep canonical route mapping assertions for remaining items. |
| C-009 | Add | N/A | `/Users/normy/autobyteus_org/autobyteus-web/layouts/__tests__/settings.spec.ts` | Ensure standalone settings layout contract (no app panel, has back action) is covered. | Tests | Source-level or component-level tests. |

## Architecture Overview

- `layouts/default.vue`: unchanged for normal app routes.
- `layouts/settings.vue`: dedicated shell for `/settings` only.
- `pages/settings.vue`: settings sub-IA owner (`api-keys`, `token-usage`, `nodes`, `server-settings`, `messaging`).
- `components/AppLeftPanel.vue` + `components/layout/LeftSidebarStrip.vue`: top-level app IA without `Messaging`.

## File And Module Breakdown

| File/Module | Change Type | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web/layouts/settings.vue` | Add | Standalone settings shell with header/back affordance | Layout slot contract | Input: page slot; Output: shell framing | `vue-router` |
| `/Users/normy/autobyteus_org/autobyteus-web/pages/settings.vue` | Modify | Settings section state and content routing | section query parsing | Input: `route.query.section`; Output: active settings pane | settings/messaging components |
| `/Users/normy/autobyteus_org/autobyteus-web/components/AppLeftPanel.vue` | Modify | Global top-level nav items | internal route map helpers | Input: route state; Output: navigation actions | `vue-router` |
| `/Users/normy/autobyteus_org/autobyteus-web/components/layout/LeftSidebarStrip.vue` | Modify | Collapsed global top-level nav | internal route map helpers | Input: route state; Output: navigation actions | `vue-router`, `useLeftPanel` |
| `/Users/normy/autobyteus_org/autobyteus-web/pages/messaging.vue` | Remove | Obsolete standalone route host | N/A | N/A | N/A |

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| File | N/A | `layouts/settings.vue` | Explicitly describes route shell purpose. | Matches Nuxt layout conventions. |
| API/state | `activeSection` set excludes messaging | `activeSection` includes `messaging` | Keeps one canonical settings section state. | No new store required. |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `layouts/settings.vue` | `vue-router` | `pages/settings.vue` | Low | Layout only owns chrome and back action; no section state. |
| `pages/settings.vue` | route query + settings components | `/settings` route behavior | Medium | Keep all section normalization in page host; children remain route-agnostic. |
| `AppLeftPanel.vue` and `LeftSidebarStrip.vue` | route helpers | all top-level navigation UX | Low | Remove messaging consistently in both variants in same change set. |

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web/pages/messaging.vue` | Delete file, remove tests expecting route host behavior. | No redirect/compat route retained. | `rg -n "pages/messaging.vue|/messaging" /Users/normy/autobyteus_org/autobyteus-web/pages /Users/normy/autobyteus_org/autobyteus-web/components` has no runtime nav refs. |
| Messaging nav entries in global chrome | Remove from `AppLeftPanel` and `LeftSidebarStrip`. | No hidden fallback nav item. | Source tests updated and pass. |

## Error Handling And Edge Cases

- If `section` query is invalid, settings defaults to `api-keys` (existing normalization behavior).
- If `section=messaging`, settings must select `messaging` instead of silently falling back.
- Back button always routes to `/workspace` regardless of entry origin.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Open standalone settings shell | Yes | N/A | N/A | UC-001 |
| UC-002 | Back arrow returns to `/workspace` | Yes | N/A | N/A | UC-002 |
| UC-003 | Open messaging setup inside settings | Yes | Yes | N/A | UC-003 |
| UC-004 | Global nav no longer shows messaging | Yes | N/A | N/A | UC-004 |
| UC-005 | Query normalization for settings sections including `messaging` | Yes | Yes | N/A | UC-005 |

## Performance / Security Considerations

- No security model changes.
- Slightly reduced global nav DOM complexity by removing one top-level item.

## Migration / Rollout (If Needed)

- Single PR with atomic UI IA update.
- Remove route host and nav entries together to avoid partial IA mismatch.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/Manual) | Status |
| --- | --- | --- | --- |
| C-001 | T-001 | Layout source test + manual navigation | Planned |
| C-002 | T-002 | Settings page unit tests + manual section switching | Planned |
| C-003 | T-003 | File removal + route/nav scan | Planned |
| C-004 | T-004 | AppLeftPanel tests | Planned |
| C-005 | T-005 | LeftSidebarStrip source/assertion tests | Planned |
| C-006 | T-006 | settings page tests | Planned |
| C-007 | T-006 | test decommission review | Planned |
| C-008 | T-004 | AppLeftPanel tests | Planned |
| C-009 | T-001 | settings layout test | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-14 | Round-1 review | Section/query ownership ambiguity between layout and page host | Kept all section/query logic in `pages/settings.vue`; layout remains chrome-only. | Applied |
| 2026-02-14 | Round-2 review | Route decommission coverage was under-specified | Added explicit remove/test decommission matrix (`C-003`, `C-007`). | Applied |

## Open Questions

- None for design phase. Current scope is intentionally limited to moving Messaging only.
