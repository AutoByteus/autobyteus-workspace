# Future-State Runtime Call Stacks — UI MCP Gateway Polish

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/in-progress/ui-mcp-gateway-polish/requirements.md` (`Design-ready`)
- Source Artifact: `tickets/in-progress/ui-mcp-gateway-polish/implementation.md` (Stage 3 solution sketch)
- Source Design Version: `v1`
- Referenced Sections:
  - `Solution Sketch / Spine Inventory In Scope`
  - `Target Architecture Shape`
  - `Implementation Work Table`

## Future-State Modeling Rule

These are future-state (`to-be`) execution models derived from the solution sketch. They intentionally model the simplified Gateway tab target, not the current tool-list/fetch behavior.

## Use Case Index

| use_case_id | Spine ID(s) | Spine Scope | Governing Owner | Source Type | Requirement ID(s) | Design-Risk Objective | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | `useShellPrimaryNavigation.ts` | Requirement | REQ-001 | N/A | Sidebar renders non-database Nodes icon | Primary/N/A/N/A |
| UC-002 | DS-002 | Primary End-to-End | `McpGatewayPanel.vue` | Requirement | REQ-002, REQ-003, REQ-005, REQ-006 | N/A | MCP Gateway renders simplified setup panel | Primary/N/A/N/A |
| UC-003 | DS-003 | Bounded Local | `McpGatewayPanel.vue` | Requirement | REQ-004, REQ-006 | N/A | Copy endpoint and show success feedback | Primary/N/A/Error |
| UC-004 | DS-003 | Bounded Local | `McpGatewayPanel.vue` | Requirement | REQ-004, REQ-006 | N/A | Copy JSON config and show success feedback | Primary/N/A/Error |
| UC-005 | DS-002 | Primary End-to-End | `McpGatewayPanel.vue` | Design-Risk | REQ-005 | Ensure redundant tool-list removal stays local to Gateway tab and does not touch MCP Servers tool management. | Gateway tab does not fetch/render MCP tools | Primary/N/A/N/A |

## Transition Notes

- No temporary migration or compatibility behavior is needed.
- Retirement plan: remove the old `McpGatewayPanel.vue` bottom tool-list UI, refresh action, and Gateway-tab-specific store fetch during Stage 6.

## Use Case: UC-001 Sidebar renders non-database Nodes icon

### Spine Context

- Spine ID(s): DS-001
- Spine Scope: Primary End-to-End
- Governing Owner: `autobyteus-web/composables/useShellPrimaryNavigation.ts`
- Why This Use Case Matters To This Spine: The icon metadata must remain in the shared shell navigation owner so the UI does not fragment navigation policy.

### Goal

Render the `Nodes` primary navigation item with a network/hierarchy-style custom SVG instead of a database-style stacked cylinder.

### Preconditions

- Runtime supports desktop settings features.
- Applications feature gating has resolved or defaults apply.

### Expected Outcome

- `primaryNavItems` includes `nodes` with `icon: SHELL_NODES_NETWORK_ICON`.
- `AppLeftPanel.vue` renders the custom inline network/hierarchy SVG for `SHELL_NODES_NETWORK_ICON`; other icons continue through the existing Iconify `<Icon>` path.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/AppLeftPanel.vue:setup()
├── autobyteus-web/composables/useShellPrimaryNavigation.ts:useShellPrimaryNavigation()
│   ├── autobyteus-web/composables/useShellPrimaryNavigation.ts:primaryNavItems(computed) [STATE]
│   │   ├── autobyteus-web/utils/mobileFeatureGates.ts:isFeatureAvailableInRuntime('desktopSettings')
│   │   └── autobyteus-web/composables/useShellPrimaryNavigation.ts:allShellPrimaryNavItems(nodes.icon=SHELL_NODES_NETWORK_ICON)
│   └── autobyteus-web/composables/useShellPrimaryNavigation.ts:isShellPrimaryRouteActive('nodes', route.path)
└── autobyteus-web/components/AppLeftPanel.vue:template render
    └── inline SVG(data-testid='nodes-network-icon')
```

### Branching / Fallback Paths

- Fallback path: N/A. If desktop settings feature is unavailable, `nodes` is intentionally hidden by existing feature gating.
- Error path: N/A. Icon string is static metadata.

### State And Data Transformations

- Static navigation item metadata -> filtered `primaryNavItems` computed array -> rendered Iconify icon.

### Observability And Debug Points

- Static test assertion on `useShellPrimaryNavigation.ts` validates the icon string.

### Design Smells / Gaps

- Legacy/backward-compatibility branch present? No.
- Tight coupling or cyclic dependency introduced? No.
- Naming-to-responsibility drift detected? No.

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`

## Use Case: UC-002 MCP Gateway renders simplified setup panel

### Spine Context

- Spine ID(s): DS-002
- Spine Scope: Primary End-to-End
- Governing Owner: `autobyteus-web/components/tools/McpGatewayPanel.vue`
- Why This Use Case Matters To This Spine: The Gateway tab should own gateway setup presentation only, not duplicate the MCP Servers tool browser.

### Goal

Render a concise Gateway setup panel with full endpoint visibility, concise access guidance, and example JSON config.

### Preconditions

- User opens Settings → MCP Servers → MCP Gateway.
- `getServerBaseUrl()` returns a configured base URL.

### Expected Outcome

- Panel header/description is short and does not include the old long client-name guidance.
- Endpoint is rendered as full text in a readable monospace display.
- JSON config includes `streamable-http`, full gateway URL, and bearer-token placeholder.
- No bottom tools list or refresh button is rendered.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/tools/ToolsManagementWorkspace.vue:template render(activeMcpTab='gateway')
├── autobyteus-web/components/tools/McpManagementTabs.vue:emit('update:modelValue', 'gateway') [STATE]
├── autobyteus-web/components/tools/ToolsManagementWorkspace.vue:activeMcpTab [STATE]
└── autobyteus-web/components/tools/McpGatewayPanel.vue:setup()
    ├── autobyteus-web/utils/serverConfig.ts:getServerBaseUrl()
    ├── autobyteus-web/components/tools/McpGatewayPanel.vue:gatewayUrl(computed)
    ├── autobyteus-web/components/tools/McpGatewayPanel.vue:configSnippet(computed)
    ├── autobyteus-web/composables/useLocalization.ts:useLocalization()
    └── autobyteus-web/components/tools/McpGatewayPanel.vue:template render
        ├── render concise title/description
        ├── render full endpoint display + copy button
        ├── render concise access guidance
        └── render example JSON config + copy button
```

### Branching / Fallback Paths

- Fallback path: N/A. Endpoint and config are always derived from `getServerBaseUrl()`.
- Error path: N/A for render. Clipboard error paths are covered by UC-003/UC-004.

### State And Data Transformations

- `getServerBaseUrl()` -> trim trailing slashes -> `${base}/mcp/gateway`.
- `gatewayUrl` -> JSON object -> pretty-printed `configSnippet`.
- Localization keys -> concise rendered labels.

### Observability And Debug Points

- Component tests assert full endpoint text, config content, old long text absence, and absence of duplicate tool list/fetch UI.

### Design Smells / Gaps

- Legacy/backward-compatibility branch present? No.
- Tight coupling or cyclic dependency introduced? No.
- Naming-to-responsibility drift detected? No.

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`

## Use Case: UC-003 Copy endpoint and show success feedback

### Spine Context

- Spine ID(s): DS-003
- Spine Scope: Bounded Local
- Governing Owner: `autobyteus-web/components/tools/McpGatewayPanel.vue`
- Why This Use Case Matters To This Spine: Copy feedback is transient panel-local UI state and should not involve the global tool store.

### Goal

When the user copies the endpoint, the copy button visibly confirms success.

### Preconditions

- Gateway panel has rendered.
- Clipboard API is available and `writeText` succeeds.

### Expected Outcome

- `navigator.clipboard.writeText(gatewayUrl)` is called.
- Endpoint copy button changes from `Copy` to `Copied`.
- Copy state automatically resets after a short delay.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/tools/McpGatewayPanel.vue:template @click(endpoint copy)
├── autobyteus-web/components/tools/McpGatewayPanel.vue:copyEndpoint()
│   └── autobyteus-web/components/tools/McpGatewayPanel.vue:copyText(gatewayUrl.value, 'endpoint') [ASYNC]
│       ├── Browser Clipboard API:navigator.clipboard.writeText(gatewayUrl) [IO]
│       ├── autobyteus-web/components/tools/McpGatewayPanel.vue:copiedTarget.value = 'endpoint' [STATE]
│       └── autobyteus-web/components/tools/McpGatewayPanel.vue:scheduleCopyReset('endpoint') [ASYNC]
└── autobyteus-web/components/tools/McpGatewayPanel.vue:template render(endpoint button label='Copied')
```

### Branching / Fallback Paths

- Fallback path: N/A.

```text
[ERROR] clipboard unavailable or write fails
[ENTRY] autobyteus-web/components/tools/McpGatewayPanel.vue:copyEndpoint()
└── autobyteus-web/components/tools/McpGatewayPanel.vue:copyText(gatewayUrl.value, 'endpoint') [ASYNC]
    ├── Browser Clipboard API:navigator.clipboard?.writeText(gatewayUrl) [IO]
    ├── autobyteus-web/components/tools/McpGatewayPanel.vue:console.warn('Failed to copy MCP gateway text:', error)
    └── autobyteus-web/components/tools/McpGatewayPanel.vue:copiedTarget unchanged [STATE]
```

### State And Data Transformations

- `gatewayUrl.value` -> clipboard text.
- Successful copy -> `copiedTarget = 'endpoint'` -> rendered success label.

### Observability And Debug Points

- Component test mocks clipboard success and asserts success label.
- Console warning remains available for copy failure debugging.

### Design Smells / Gaps

- Legacy/backward-compatibility branch present? No.
- Tight coupling or cyclic dependency introduced? No.
- Naming-to-responsibility drift detected? No.

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 Copy JSON config and show success feedback

### Spine Context

- Spine ID(s): DS-003
- Spine Scope: Bounded Local
- Governing Owner: `autobyteus-web/components/tools/McpGatewayPanel.vue`
- Why This Use Case Matters To This Spine: Config copy is the same panel-local transient feedback concern as endpoint copy.

### Goal

When the user copies the JSON config, the copy button visibly confirms success.

### Preconditions

- Gateway panel has rendered.
- `configSnippet` computed value is current.
- Clipboard API is available and `writeText` succeeds.

### Expected Outcome

- `navigator.clipboard.writeText(configSnippet)` is called.
- JSON copy button changes from `Copy JSON` to `Copied`.
- Copy state automatically resets after a short delay.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/tools/McpGatewayPanel.vue:template @click(config copy)
├── autobyteus-web/components/tools/McpGatewayPanel.vue:copyConfigSnippet()
│   └── autobyteus-web/components/tools/McpGatewayPanel.vue:copyText(configSnippet.value, 'config') [ASYNC]
│       ├── Browser Clipboard API:navigator.clipboard.writeText(configSnippet) [IO]
│       ├── autobyteus-web/components/tools/McpGatewayPanel.vue:copiedTarget.value = 'config' [STATE]
│       └── autobyteus-web/components/tools/McpGatewayPanel.vue:scheduleCopyReset('config') [ASYNC]
└── autobyteus-web/components/tools/McpGatewayPanel.vue:template render(config button label='Copied')
```

### Branching / Fallback Paths

- Fallback path: N/A.

```text
[ERROR] clipboard unavailable or write fails
[ENTRY] autobyteus-web/components/tools/McpGatewayPanel.vue:copyConfigSnippet()
└── autobyteus-web/components/tools/McpGatewayPanel.vue:copyText(configSnippet.value, 'config') [ASYNC]
    ├── Browser Clipboard API:navigator.clipboard?.writeText(configSnippet) [IO]
    ├── autobyteus-web/components/tools/McpGatewayPanel.vue:console.warn('Failed to copy MCP gateway text:', error)
    └── autobyteus-web/components/tools/McpGatewayPanel.vue:copiedTarget unchanged [STATE]
```

### State And Data Transformations

- `configSnippet.value` -> clipboard text.
- Successful copy -> `copiedTarget = 'config'` -> rendered success label.

### Observability And Debug Points

- Component test mocks clipboard success and asserts success label.
- Existing config content assertions ensure gateway config output remains correct.

### Design Smells / Gaps

- Legacy/backward-compatibility branch present? No.
- Tight coupling or cyclic dependency introduced? No.
- Naming-to-responsibility drift detected? No.

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-005 Gateway tab does not fetch/render MCP tools

### Spine Context

- Spine ID(s): DS-002
- Spine Scope: Primary End-to-End
- Governing Owner: `autobyteus-web/components/tools/McpGatewayPanel.vue`
- Why This Use Case Matters To This Spine: It validates the simplification boundary: gateway setup remains in this panel, tool browsing remains in MCP Servers.

### Goal

Avoid redundant tool list and store fetch in the Gateway tab.

### Preconditions

- User opens the MCP Gateway tab.
- The tool management store may contain MCP-origin tools, but the Gateway tab no longer reads them.

### Expected Outcome

- `McpGatewayPanel.vue` does not import `useToolManagementStore`.
- `McpGatewayPanel.vue` does not call `fetchMcpGatewayTools()` on mount.
- Tool names/descriptions from `mcpGatewayTools` are not rendered in the Gateway panel.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/tools/ToolsManagementWorkspace.vue:template render(activeMcpTab='gateway')
└── autobyteus-web/components/tools/McpGatewayPanel.vue:setup()
    ├── autobyteus-web/utils/serverConfig.ts:getServerBaseUrl()
    ├── autobyteus-web/components/tools/McpGatewayPanel.vue:gatewayUrl(computed)
    ├── autobyteus-web/components/tools/McpGatewayPanel.vue:configSnippet(computed)
    └── autobyteus-web/components/tools/McpGatewayPanel.vue:template render setup-only content
        └── no call to autobyteus-web/stores/toolManagementStore.ts:fetchMcpGatewayTools()
```

### Branching / Fallback Paths

- Fallback path: N/A.
- Error path: N/A.

### State And Data Transformations

- No MCP tool store state is transformed by Gateway panel.

### Observability And Debug Points

- Component test initializes `mcpGatewayTools` with sample tools and asserts they are absent from Gateway panel.
- Component test asserts `fetchMcpGatewayTools` was not called.

### Design Smells / Gaps

- Legacy/backward-compatibility branch present? No.
- Tight coupling or cyclic dependency introduced? No.
- Naming-to-responsibility drift detected? No.

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`
