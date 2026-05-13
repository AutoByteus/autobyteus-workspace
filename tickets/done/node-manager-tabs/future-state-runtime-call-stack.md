# Future-State Runtime Call Stack: Node Manager Tabs

- Ticket: node-manager-tabs
- Date: 2026-05-13
- Scope: Small UI flow

## Spine Inventory

| Spine ID | Entry | Main Runtime Flow | Owner |
| --- | --- | --- | --- |
| SP-001 | User opens Settings → Nodes | `NodeManager.vue` initializes node/sync/browser-sharing stores on mount; local `activeTab` defaults to `manage`; management panel renders existing node settings sections. | `components/settings/NodeManager.vue` |
| SP-002 | User selects Docker Setup tab | Tab button updates local `activeTab` to `dockerSetup`; Docker tab panel renders `DockerNodeStartGuideCard`; existing guide owns command rendering/copy events. | `components/settings/NodeManager.vue` + `DockerNodeStartGuideCard.vue` |
| SP-003 | User returns to Manage Nodes tab | Tab button updates local `activeTab` to `manage`; management panel renders existing forms and node list using unchanged stores/actions. | `components/settings/NodeManager.vue` |

## Future-State Runtime Flow Details

### SP-001 Default Manage Nodes Flow

1. `NodeManager.vue` setup creates `activeTab = ref('manage')`.
2. Template renders the page header, tablist, and selected tab panel.
3. `manage` tab is selected by default.
4. Existing management cards render in the manage tab panel:
   - Current Window Node
   - `RemoteBrowserSharingPanel`
   - Add Remote Node
   - Run Full Sync
   - Configured Nodes
5. `onMounted` continues to initialize `nodeStore`, `nodeSyncStore`, and `remoteBrowserSharingStore` exactly as before.

### SP-002 Docker Setup Flow

1. User clicks Docker Setup tab.
2. `selectTab('dockerSetup')` updates local state only.
3. `DockerNodeStartGuideCard` renders in the Docker tab panel.
4. Guide command rendering and copy actions run through the existing component and `dockerNodeLauncherCommands` utility.
5. No node registry or sync store writes happen as a result of tab selection.

### SP-003 Return-to-Manage Flow

1. User clicks Manage Nodes tab.
2. `selectTab('manage')` updates local state only.
3. Existing management controls render again with the same component-local form state and store-backed node state.

## Ownership and Boundaries

- `NodeManager.vue` owns tab selection and content placement only.
- `DockerNodeStartGuideCard.vue` remains the sole owner of Docker tutorial command rendering/copy behavior.
- Stores (`nodeStore`, `nodeSyncStore`, `remoteBrowserSharingStore`, `windowNodeContextStore`) remain unchanged.
- Localization remains in settings message catalogs.

## Off-Spine Concerns

- Accessibility: tab semantics and `aria-selected`/`aria-controls` must reflect active state.
- Styling: match existing settings page styling and avoid introducing a new component for this small layout change.
- Testing: component tests should validate tab default and switch behavior; existing action tests verify management functionality remains reachable.

## Re-Entry Runtime Update for CR-001

### Added Component Boundary

`components/settings/NodeManagerTabs.vue` is introduced as a presentation-only child component.

### Updated SP-001 / SP-002 / SP-003 Runtime Flow

1. `NodeManager.vue` creates `activeTab = ref('manage')` and declares tab metadata for `manage` and `dockerGuide` panels.
2. `NodeManager.vue` renders `<NodeManagerTabs v-model="activeTab" :tabs="nodeManagerTabs" :aria-label="..." />` in the page header.
3. `NodeManagerTabs.vue` renders the tablist/buttons, applies active styles, sets `aria-selected` / `aria-controls`, and emits `update:modelValue` when the user selects a tab.
4. `NodeManager.vue` reacts to the updated `activeTab` and switches between management and Docker Guide tab panels.
5. Existing node management actions and Docker command-copy behavior remain unchanged.

### Boundary Confirmation

- `NodeManagerTabs.vue`: tab presentation and accessibility only.
- `NodeManager.vue`: page state, panel ownership, node management flows.
- `DockerNodeStartGuideCard.vue`: Docker tutorial command rendering/copy behavior.

## Header Layout Refinement Runtime Update

When Settings → Nodes renders, `NodeManager.vue` shows `NodeManagerTabs` as the sole header content. `activeTab` still defaults to `manage`, so the user lands directly on the Manage Nodes panel. The hidden/accessibility label remains supplied to `NodeManagerTabs`; no separate visible `Node Manager` title is rendered.
