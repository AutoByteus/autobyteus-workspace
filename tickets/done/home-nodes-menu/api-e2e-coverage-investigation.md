# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/home-nodes-menu/tickets/done/home-nodes-menu/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/home-nodes-menu/tickets/done/home-nodes-menu/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/home-nodes-menu/tickets/done/home-nodes-menu/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/home-nodes-menu/tickets/done/home-nodes-menu/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/home-nodes-menu/tickets/done/home-nodes-menu/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/home-nodes-menu/tickets/done/home-nodes-menu/code-review-report.md`
- Current Investigation Round: `1`
- Trigger: Code review passed for ticket `home-nodes-menu`; API/E2E coverage investigation may begin.
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: `Round 1`

## Current Requirement And Design Basis

The approved behavior moves node management from the Settings sidebar into the home/workspace shell primary navigation. `Nodes` must appear as a first-level shell item in both expanded and collapsed sidebar presentations, route to a dedicated `/nodes` page, and render the existing `NodeManager` experience including Manage Nodes, Phone Setup, and Docker Guide tabs. `/nodes?nodeTab=phoneSetup` must open the Phone Setup tab. `Media` must be removed from the shell primary navigation without decommissioning the `/media` page. Settings-level `Nodes` access must be removed as a clean move, so `/settings?section=nodes` must not preserve a compatibility redirect or duplicate node-management route. Shell primary navigation policy must be centralized in one shared owner consumed by both sidebar presentations. `/nodes` must be classified as unsupported `desktopSettings` in mobile remote runtime. Durable docs still containing `Settings -> Nodes` are explicitly left for delivery docs sync.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no compatibility wrapper or legacy old-behavior retention was reported; obsolete Settings Nodes section/mount/labels were removed; `/media` retention is direct-route preservation required by the approved scope, not compatibility for the moved Nodes feature. Code review independently passed that verdict.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| First-level shell `Nodes` navigation item | Added | `FR-001`, `AC-001`, `AC-002`; implementation handoff added `nodes` to shared shell primary nav owner | Retain shared-nav/component durable coverage; prove actual expanded and collapsed browser navigation with temporary runtime probes. |
| Shell `Media` primary navigation item | Removed | `FR-004`, `AC-006`; implementation handoff removed `media` from shell primary nav key/list/label | Retain shared-nav/component durable coverage; browser probes must confirm `Media` absent from shell nav. |
| Dedicated `/nodes` page over existing `NodeManager` | Added | `FR-002`, `FR-003`, `AC-004`; design requires a thin page facade | Retain `pages/__tests__/nodes.spec.ts`; browser probe should direct-load `/nodes` and observe NodeManager tabs. |
| `/nodes?nodeTab=phoneSetup` starts on Phone Setup | Changed route context for preserved NodeManager behavior | `AC-005`; investigation notes say `NodeManager` already reads `route.query.nodeTab`; code review residual risk says no full browser assertion yet | Add narrow durable coverage to existing `NodeManager.spec.ts` for the initial route-query tab selection, then verify through browser direct navigation. |
| Settings sidebar `Nodes` section and `settings?section=nodes` activation | Removed | Approved IA on 2026-06-18; `FR-009`, `AC-011`; handoff removed Settings section and valid section | Retain `pages/__tests__/settings.spec.ts`; browser probe should direct-load `/settings?section=nodes` and verify NodeManager is not rendered. |
| `/nodes` mobile runtime feature gate | Added | `FR-008`, `AC-010`; handoff maps `/nodes` to `desktopSettings` | Retain `mobileFeatureGate.global.spec.ts`; no full mobile browser runtime is necessary because route middleware and mapper are the executable boundary. |
| `/media` page direct route remains available | Preserved | `AC-007`; handoff says `/media` page/subsystem left untouched | No new durable coverage needed; browser probe may direct-load `/media` only if app runtime permits without backend; shell probe must not treat `/media` retention as a nav item. |
| Durable docs/copy pointing to `Settings -> Nodes` | Preserved for delivery-stage sync | Code review residual risk; implementation handoff known risks | Out of API/E2E scope; record delivery follow-up, not a test failure. |
| Android connection diagnostic recovery copy | Changed | Implementation handoff updated source copy/tests from `Settings -> Nodes` to `Nodes -> Phone Setup`. | Retain and execute focused Android unit test for `ConnectionDiagnosticMapperTest`. |
| iOS connection diagnostic recovery copy | Changed | Implementation handoff updated source copy/tests from `Settings -> Nodes` to `Nodes -> Phone Setup`. | Retain and execute focused iOS core unit test for `ConnectionValidatorTests`. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/__tests__/useShellPrimaryNavigation.spec.ts` | Shared shell nav helper includes `nodes`, routes it to `/nodes`, and does not retain `media` as a primary key. | `FR-001`, `FR-002`, `FR-004`, `FR-007`, `AC-001`, `AC-003`, `AC-006`, `AC-009` | Still Valid | Test directly exercises shared route and active helper; code review accepted this durable coverage. | Retain and rerun. |
| `autobyteus-web/components/__tests__/AppLeftPanel.spec.ts` | Expanded sidebar delegates primary nav policy to shared owner and no longer owns `media` literals. | `FR-004`, `FR-007`, `AC-001`, `AC-003`, `AC-006`, `AC-009` | Still Valid | Static structural test covers extracted ownership. Browser probe will cover runtime rendering/click. | Retain and rerun. |
| `autobyteus-web/components/layout/__tests__/LeftSidebarStrip.spec.ts` | Collapsed strip includes Nodes, excludes Media, and clicking Nodes pushes `/nodes`. | `AC-002`, `AC-003`, `AC-006`, `AC-009` | Still Valid | Component test covers collapsed presentation. | Retain and rerun. |
| `autobyteus-web/pages/__tests__/nodes.spec.ts` | `/nodes` page is a thin facade over `NodeManager`. | `FR-002`, `FR-003`, `AC-004` | Still Valid | Test proves page ownership/delegation boundary. | Retain and rerun. |
| `autobyteus-web/pages/__tests__/settings.spec.ts` | Settings no longer lists Nodes; legacy `section=nodes` falls back to default section and does not render NodeManager. | `FR-009`, `AC-011`; no-backward-compatibility rule | Still Valid | Test directly covers clean move/no duplicate Settings access. | Retain and rerun. |
| `autobyteus-web/middleware/__tests__/mobileFeatureGate.global.spec.ts` | `/nodes` redirects as unsupported `desktopSettings` in mobile runtime. | `FR-008`, `AC-010` | Still Valid | Test covers route middleware behavior. | Retain and rerun. |
| `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts` | Existing NodeManager tabs and node actions; includes click-based Phone Setup tab coverage but not route-query initial tab selection. | `FR-003`, `AC-004`, `AC-005` | Needs Update | Existing test proves Phone Setup contents after tab click, but AC-005 specifically depends on `nodeTab=phoneSetup` at route entry. | Add one narrow durable assertion for `route.query.nodeTab = 'phoneSetup'` before final execution. |
| `autobyteus-android/app/src/test/java/org/autobyteus/mobile/connection/ConnectionDiagnosticMapperTest.kt` | Verifies Android connection diagnostic recovery action copy includes `Nodes -> Phone Setup`. | Source-copy update required by `FR-009`/`AC-011` and implementation handoff. | Still Valid | Test aligns source copy with moved Nodes IA. | Retain and execute focused Android unit test. |
| `autobyteus-ios/AutoByteusMobileCoreTests/ConnectionValidatorTests.swift` | Verifies iOS connection diagnostic recovery action copy includes `Nodes -> Phone Setup`. | Source-copy update required by `FR-009`/`AC-011` and implementation handoff. | Still Valid | Test aligns source copy with moved Nodes IA. | Retain and execute focused iOS core unit test. |
| `autobyteus-web/components/settings/NodeManager.vue` behavior under browser runtime | Existing feature owner reads `route.query.nodeTab` and owns tabs. | `FR-003`, `AC-004`, `AC-005` | Still Valid as implementation artifact; not a test artifact | Code has `initialActiveTab()` and `syncActiveTabFromRouteQuery()`. | Exercise via browser direct navigation after durable test update. |
| `docs/android_mobile_access.md`, `autobyteus-android/README.md` docs references | Some durable docs still point to `Settings -> Nodes`. | Delivery docs sync risk from code review | Out Of Scope | Upstream explicitly leaves durable docs for delivery. | No API/E2E action; call out to delivery. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No stale repository-resident API/E2E/integration coverage found that requires removal in this stage. | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `DC-001` | `NodeManager` honors an initial `nodeTab=phoneSetup` route query, proving `/nodes?nodeTab=phoneSetup` starts on Phone Setup through the reused owner. | `FR-003`, `AC-005`; implementation handoff notes `/nodes` depends on existing NodeManager route-query handling; code review says no full browser assertion yet. | `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts` | This behavior is an explicit acceptance criterion and belongs with the existing NodeManager tab-query owner. The durable update is narrow and avoids adding broader E2E infrastructure. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `DC-001` | `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts` | Add a test that sets `routeMock.query = { nodeTab: 'phoneSetup' }`, mounts `NodeManager`, and asserts the Phone Setup tab/panel are active. | `AC-005` | Repository-resident durable coverage will change after initial code review; route back to `code_reviewer` is required before delivery. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `TV-001` | Run focused Vitest suite from `autobyteus-web` using temporary symlinks to the main checkout dependency tree because this ticket worktree has no local `node_modules`. | Current durable coverage passes after the narrow NodeManager coverage update. | This is normal test execution, not new scaffolding. Symlinks are temporary environment setup only. |
| `TV-002` | Start local Nuxt dev server for the ticket worktree and use the in-app browser against localhost. | Expanded shell shows Nodes, not Media; clicking Nodes navigates to `/nodes`; `/nodes` renders NodeManager tabs; `/nodes?nodeTab=phoneSetup` opens Phone Setup; `/settings?section=nodes` does not render NodeManager. | Runtime proof depends on local dev server setup and in-app browser state; durable component/unit tests carry the lasting regression coverage. |
| `TV-003` | Use a narrow static/runtime inspection if dev server cannot run. | Confirm source/runtime route wiring and route-query behavior where browser setup is infeasible. | Only fallback; browser validation remains preferred and will be attempted. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full mobile static build redirect in a phone WebView | The relevant boundary is already isolated in route middleware and `mobileFeatureForRouteLocation()`; standing up a mobile static WebView is disproportionate for this nav move. | Low after focused middleware coverage. | None unless middleware test fails. |
| Durable docs updates for `Settings -> Nodes` | Explicitly assigned to delivery docs sync after integrated-state refresh. | Users may see stale docs until delivery stage updates them. | Delivery engineer must sync durable docs. |
| Full backend node operations from `/nodes` | Node operations are existing `NodeManager` behavior, not changed by this ticket; no backend/API changes are in scope. | Low; changed boundary is route/navigation access to existing owner. | None. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | Requirements/design/code review are sufficient; no compatibility wrapper or legacy route retention observed during investigation. | N/A |

## Execution Plan

1. Add narrow durable coverage `DC-001` to `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts` for initial `nodeTab=phoneSetup` route-query behavior.
2. Create temporary dependency symlinks in `autobyteus-web` if absent: `node_modules` and `.nuxt` pointing to `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web` equivalents.
3. Run focused durable coverage: `NUXT_TEST=true node_modules/.bin/vitest --run components/__tests__/AppLeftPanel.spec.ts components/layout/__tests__/LeftSidebarStrip.spec.ts composables/__tests__/useShellPrimaryNavigation.spec.ts pages/__tests__/nodes.spec.ts pages/__tests__/settings.spec.ts middleware/__tests__/mobileFeatureGate.global.spec.ts components/settings/__tests__/NodeManager.spec.ts`.
4. Run focused platform copy checks: Android `ConnectionDiagnosticMapperTest` with `ANDROID_HOME=$HOME/Library/Android/sdk`, and iOS `ConnectionValidatorTests` after generating the Xcode project with `scripts/generate-project.sh`.
5. Run `git diff --check` after coverage update.
6. Start a local Nuxt dev server from `autobyteus-web` and validate browser scenarios `TV-002` with the in-app browser.
7. Clean up temporary dependency symlinks, temporary browser probe script, and stop the dev server.
8. Write the execution coverage report. Because repository-resident durable coverage is updated after the initial code review, send the cumulative package back to `code_reviewer` before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Existing coverage is valid but lacks durable proof for `AC-005` route-query entry into Phone Setup. A narrow update to existing `NodeManager.spec.ts` is the correct durable coverage change. No stale coverage removal is needed.
