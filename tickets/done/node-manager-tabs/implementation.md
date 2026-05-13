# Implementation Plan: Node Manager Tabs

- Ticket: node-manager-tabs
- Date: 2026-05-13
- Scope: Small
- Status: Design basis drafted; execution not started until Stage 6 unlock.

## Solution Sketch (Stage 3)

### UI Structure

- Add a local `activeTab` state in `components/settings/NodeManager.vue` with two values:
  - `manage`: default, actionable node management/settings content.
  - `dockerSetup`: Docker launcher tutorial/help content.
- Add a tab strip below the page header and above the scroll body content using accessible roles:
  - `role="tablist"`
  - each button `role="tab"`, `aria-selected`, and `aria-controls`
  - tab panels `role="tabpanel"`
- Move the existing `<DockerNodeStartGuideCard />` from the main content stack into the `dockerSetup` tab panel.
- Wrap existing management sections in the `manage` tab panel:
  - Current Window Node
  - `RemoteBrowserSharingPanel`
  - Add Remote Node
  - Run Full Sync
  - Configured Nodes

### Localization

- Add English and Chinese strings for:
  - `settings.components.settings.NodeManager.tabs.manageNodes`
  - `settings.components.settings.NodeManager.tabs.dockerSetup`

### Tests

- Update `components/settings/__tests__/NodeManager.spec.ts`:
  - replace the old “Docker guide before Add Remote Node” assertion with default-tab behavior.
  - add a Docker-tab click scenario.
- Keep `DockerNodeStartGuideCard.spec.ts` unchanged to verify existing guide rendering/copy behavior.

### Documentation

- Update `autobyteus-web/docs/settings.md` to describe the two Node Manager tabs and Docker guide placement.

## Execution Plan (initialized for Stage 6 later)

1. Update `NodeManager.vue` template and script with tab state/helpers.
2. Update `settings.ts` localization catalogs for `en` and `zh-CN`.
3. Update NodeManager tests.
4. Run focused tests/guards.
5. Update durable docs.

## Non-Goals

- No changes to Docker command generation.
- No changes to node registry/storage behavior.
- No persisted tab preference.

## Stage 6 Execution Log

| Step | Status | Evidence |
| --- | --- | --- |
| Update `NodeManager.vue` tab structure | Complete | Added local `activeTab`, accessible tablist, default Manage Nodes panel, and Docker Guide panel. |
| Move Docker guide placement | Complete | Removed inline `DockerNodeStartGuideCard` from management stack and render it only in Docker Guide panel. |
| Update localization | Complete | Added English and Chinese tab labels. |
| Update NodeManager tests | Complete | Replaced old inline-Docker assertion with default management tab and Docker Guide tab scenarios. |
| Focused validation | Complete | `NUXT_TEST=true pnpm --dir autobyteus-web exec vitest run components/settings/__tests__/NodeManager.spec.ts components/settings/__tests__/DockerNodeStartGuideCard.spec.ts` passed: 2 files, 10 tests. |
| Frontend guards | Complete | `pnpm --dir autobyteus-web guard:web-boundary`, `guard:localization-boundary`, and `audit:localization-literals` passed. |
| Browser visual/runtime smoke | Complete | Opened Nuxt dev server at `http://127.0.0.1:3317/settings`; verified default Manage Nodes tab shows Add Node controls and hides Docker card; verified Docker Guide tab shows Docker guide and hides Add Node button. Screenshot: `/Users/normy/.autobyteus/browser-artifacts/af8b49-1778673696659.png`. |

## Stage 6 Verification Notes

- Initial focused test attempt failed because the fresh ticket worktree lacked `node_modules` and Nuxt `.nuxt/tsconfig.json`; resolved by linking existing local dependency directories and running `nuxi prepare` in the worktree. No source change was required for this environment setup.
- Final focused tests and guards passed after implementation.
- No backward-compatibility branch or legacy duplicate Docker placement remains in scope.
- Touched source files are in existing owning folders:
  - `components/settings/NodeManager.vue`
  - `components/settings/__tests__/NodeManager.spec.ts`
  - `localization/messages/en/settings.ts`
  - `localization/messages/zh-CN/settings.ts`

## Re-Entry Design Update for CR-001

Stage 8 identified `NodeManager.vue` as oversized after embedding tab chrome directly. The implementation design is updated as follows:

1. Add `components/settings/NodeManagerTabs.vue` as a small presentation component.
2. `NodeManagerTabs.vue` owns:
   - tablist markup and accessibility attributes,
   - active-tab visual styles,
   - emitting `update:modelValue` when a tab is selected.
3. `NodeManager.vue` owns:
   - active tab state,
   - management and Docker panel placement,
   - all existing node store/action behavior.
4. The tab metadata remains close to `NodeManager.vue` because it defines page-level panel identity, while tab rendering is delegated to `NodeManagerTabs.vue`.
5. Post-refactor acceptance target: `NodeManager.vue` must measure below 500 effective non-empty lines.

## Re-Entry Stage 6 Execution Log

| Step | Status | Evidence |
| --- | --- | --- |
| Extract tab chrome | Complete | Added `components/settings/NodeManagerTabs.vue`, a presentation component that owns tablist roles, active styles, and `update:modelValue`. |
| Extract current-node card | Complete | Added `components/settings/CurrentWindowNodeCard.vue` to reduce `NodeManager.vue` size while preserving the existing current-node display. |
| Reduce source size | Complete | `NodeManager.vue` now measures 498 effective non-empty lines; new components measure 40 and 23 lines. |
| Re-run focused validation | Complete | Focused NodeManager/Docker guide tests passed: 2 files, 10 tests. Guards passed. |
| Re-run browser smoke | Complete | Browser smoke verified default Manage Nodes tab and Docker Guide tab after extraction. Screenshot: `/Users/normy/.autobyteus/browser-artifacts/e8c927-1778674171570.png`. |

## Refinement Design: Header Layout

User review found the `Node Manager` title redundant because Settings → Nodes already indicates the page and the default selected tab is `Manage Nodes`. Update `NodeManager.vue` so the header contains only the tab control aligned as the primary page navigation. Keep `NodeManagerTabs.vue` accessibility label set to the localized Node Manager string for screen-reader context, but do not render that string visibly as a separate heading.

## Header Layout Refinement Execution Log

| Step | Status | Evidence |
| --- | --- | --- |
| Remove redundant visible heading | Complete | Removed the `Node Manager` h2 from `NodeManager.vue`; `NodeManagerTabs` is now the sole visible header content. |
| Preserve default tab behavior | Complete | `activeTab` still defaults to `manage`. |
| Update test coverage | Complete | NodeManager test now asserts no visible h2 is rendered on the default management tab. |
| Validate | Complete | Focused tests and guards passed; browser smoke confirmed no visible `Node Manager` h2 and `Manage Nodes` selected by default. Screenshot: `/Users/normy/.autobyteus/browser-artifacts/cc7569-1778675815244.png`. |
| Source-size check | Complete | `NodeManager.vue` is 497 effective non-empty lines after refinement. |
