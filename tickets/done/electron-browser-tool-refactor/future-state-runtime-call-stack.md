# Future-State Runtime Call Stack

## Status

`Current`

## Call Stack Version

`v3`

## Scope

Model the future-state runtime behavior for:
- renamed browser/tab contract exposure
- strict agent-definition `toolNames` gating for browser tools
- strict agent-definition `toolNames` gating for `send_message_to`
- always-visible Browser shell tab
- manual user Browser commands
- Browser full-view projection over the same native browser tab

## Use Case Inventory

| Use Case ID | Title | Why It Matters |
| --- | --- | --- |
| UC-001 | Expose browser tools only when configured on the agent | This remains the authoritative optional-tool policy across AutoByteus, Codex, and Claude |
| UC-002 | Omit browser tools when the agent does not configure them | The negative path proves the exposure rule is real rather than advisory |
| UC-003 | Expose `send_message_to` only when configured on the agent | This keeps team/member messaging under the same authoritative tool-selection model |
| UC-004 | Execute renamed browser tool end to end | This proves the browser/tool rename still reaches the Electron-backed browser runtime |
| UC-005 | Advertise `send_message_to` only when it is actually exposed | Prompt text must stay aligned with real tool exposure |
| UC-006 | Claude session owns the final allowed-tool list | This keeps policy above the SDK boundary |
| UC-007 | Browser is visible before any browser tabs exist | This is the user-facing shell correction from lazy preview to first-class Browser |
| UC-008 | User manually opens a browser tab from the Browser UI | This adds the new Browser shell command path |
| UC-009 | User navigates, refreshes, and closes the active browser tab from Browser chrome | This extends Browser shell commands without creating a second browser model |
| UC-010 | Browser full-view mode reuses the same native browser tab | This proves full-view is only a shell/layout concern |

## UC-001 Browser tools are exposed only when configured on the agent

### Preconditions

- Agent definition includes browser tool names in `toolNames`.
- Runtime supports the internal Electron-backed browser capability.

### Future-State Call Stack

`Agent Definition -> Configured Tool Exposure Owner -> Runtime Bootstrap / Session Builder -> browser tool registrations -> runtime-visible browser tool set`

### Narrative

1. The runtime loads the agent definition.
2. The configured-tool exposure owner normalizes `agentDef.toolNames`.
3. Browser-tool names are derived from that authoritative set.
4. Only matching browser tools are materialized into the runtime-specific surface:
   - AutoByteus native tools
   - Codex dynamic tools
   - Claude MCP tool definitions
5. The runtime starts with browser tools visible.

### Expected Outcome

- Browser tools are exposed because the agent definition explicitly configured them.

## UC-002 Browser tools are omitted when the agent does not configure them

### Preconditions

- Agent definition does not include browser tool names in `toolNames`.
- Runtime supports the internal Electron-backed browser capability.

### Future-State Call Stack

`Agent Definition -> Configured Tool Exposure Owner -> Runtime Bootstrap / Session Builder -> no browser tool registrations -> runtime-visible tool set without browser tools`

### Narrative

1. The runtime loads the agent definition.
2. The configured-tool exposure owner normalizes `agentDef.toolNames`.
3. Browser-tool derivation finds no configured browser names.
4. No browser tools are materialized into the runtime-specific surface.
5. The runtime starts without browser tools.

### Expected Outcome

- Browser tools are not exposed even though the desktop runtime could support them.

## UC-003 send_message_to is exposed only when configured on the agent

### Preconditions

- Team/runtime context exists.
- Agent definition may or may not include `send_message_to` in `toolNames`.

### Future-State Call Stack

`Agent Definition -> Configured Tool Exposure Owner -> Team / Runtime Bootstrap -> optional send_message_to binding`

### Narrative

1. Team/runtime bootstrap resolves configured tool exposure once from `toolNames`.
2. `send_message_to` is treated like any other optional tool.
3. Runtime-specific bindings are created only when the resolved exposure includes `send_message_to`.
4. Otherwise the run starts without the tool.

### Expected Outcome

- `send_message_to` follows the same tool-selection rule as the browser tools.

## UC-004 Execute renamed browser tool end to end

### Preconditions

- Agent definition includes `open_tab`.
- Runtime materialized browser tools from `toolNames`.
- Electron-backed browser capability is available.

### Future-State Call Stack

`Agent Runtime -> open_tab -> Browser Tool Boundary -> Browser Tool Service -> Electron bridge client -> Electron Browser Runtime -> tab created -> result with tab_id -> runtime event/result stream`

### Narrative

1. The agent calls `open_tab`.
2. The stable browser tool boundary parses and validates the browser/tab contract.
3. The browser tool service calls the Electron bridge client.
4. The Electron browser runtime creates or reuses a browser tab and returns a `tab_id`.
5. The runtime emits the successful tool result using browser/tab payload shapes only.

### Expected Outcome

- The renamed browser contract behaves end to end through the Electron-backed browser runtime.

## UC-005 Team prompt advertises send_message_to only when it is exposed

### Preconditions

- Team/runtime context exists.
- Agent definition may or may not include `send_message_to` in `toolNames`.

### Future-State Call Stack

`Agent Definition -> Configured Tool Exposure Owner -> Team Bootstrap Strategy -> prompt composition with resolved send-message exposure`

### Narrative

1. The configured-tool exposure owner resolves the configured tool set once.
2. Team bootstrap determines whether `send_message_to` is truly exposable in this run.
3. Prompt composition consumes that resolved boolean instead of teammate presence alone.
4. The runtime instruction mentions `send_message_to` only when the tool is actually exposed.

### Expected Outcome

- The model is never instructed to use `send_message_to` when bootstrap did not expose it.

## UC-006 Claude session owns the final allowed-tool list

### Preconditions

- Claude runtime is active.
- Browser tool exposure and `send_message_to` exposure were already derived from `toolNames`.

### Future-State Call Stack

`Agent Definition -> Configured Tool Exposure Owner -> Claude Session -> final Claude allowed-tools list -> Claude SDK client -> Claude query`

### Narrative

1. Claude bootstrap stores the resolved configured-tool exposure in runtime context.
2. Claude session decides which optional tools are actually exposed in this run.
3. Claude session builds the final allowed-tool list, including runtime-specific names.
4. Claude SDK client receives that final list as data and forwards it without re-deriving policy.

### Expected Outcome

- Claude policy stays above the SDK boundary and the SDK client remains transport-like.

## UC-007 Browser is visible before any browser tabs exist

### Preconditions

- Desktop/Electron Browser shell capability exists.
- No browser tabs are currently open.

### Future-State Call Stack

`Desktop shell startup -> Browser shell store initialization -> right-side tab visibility computation -> Browser tab visible -> Browser empty state rendered`

### Narrative

1. The Browser shell store initializes in the renderer.
2. Browser capability availability is determined without depending on current session count.
3. The right-side tabs composable keeps `Browser` visible.
4. Browser panel renders a clean empty state because there are zero tabs.

### Expected Outcome

- Browser is visible before any agent or user has opened a tab.

## UC-008 User manually opens a browser tab from the Browser UI

### Preconditions

- Browser tab is visible in the right-side UI.
- The user has entered a URL in the Browser shell chrome or empty-state open flow.

### Future-State Call Stack

`User action -> Browser Panel -> BrowserShellStore.openTab -> browser-shell IPC -> BrowserShellController.openSession -> BrowserTabManager.openSession -> snapshot publication -> Browser shell store -> Browser panel`

### Narrative

1. The user triggers the Browser shell open action and enters a URL.
2. BrowserPanel sends the command through `BrowserShellStore`.
3. The Browser-shell IPC boundary forwards the request to `BrowserShellController`.
4. The shell controller opens a new browser tab through `BrowserTabManager`, claims the shell lease, and makes it active.
5. The shell controller publishes the updated snapshot back to the renderer.
6. BrowserPanel now shows the new tab and attaches its native browser view.

### Expected Outcome

- A user-opened tab appears in the same Browser shell tab strip as agent-opened tabs.

## UC-009 User navigates, refreshes, and closes the active browser tab from Browser chrome

### Preconditions

- Browser has an active browser tab.
- The user can interact with the Browser shell chrome.

### Future-State Call Stack

`User action -> Browser Panel chrome -> BrowserShellStore command -> browser-shell IPC -> BrowserShellController -> BrowserTabManager -> snapshot publication -> Browser shell store`

### Narrative

1. The user edits the address bar and submits, presses refresh, or closes the active tab.
2. BrowserPanel sends the command through `BrowserShellStore`.
3. The browser-shell IPC boundary forwards the command to `BrowserShellController`.
4. The shell controller delegates browser semantics to `BrowserTabManager`.
5. The shell controller republishes the resulting shell snapshot.
6. BrowserPanel updates the chrome and host projection from the new snapshot.

### Expected Outcome

- The user can operate the active browser tab through the Browser chrome without bypassing Browser shell boundaries.

## UC-010 Browser full-view mode reuses the same native browser tab

### Preconditions

- Browser has an active browser tab.
- The user triggers full-view mode.

### Future-State Call Stack

`User action -> Browser display-mode store -> BrowserPanel layout switch / Teleport -> host bounds update -> BrowserShellController.applyShellProjection -> same native browser view attached to larger bounds`

### Narrative

1. The user toggles Browser full-view.
2. The Browser display-mode store changes from normal to full-view.
3. BrowserPanel re-renders into a body-level full-view shell layout.
4. The Browser host rectangle changes and is reported through the existing bounds-sync path.
5. BrowserShellController reapplies projection for the active tab against the new larger bounds.
6. The same native browser tab remains active and visible.

### Expected Outcome

- Full-view mode enlarges the Browser shell without destroying or recreating the active browser tab.

## Runtime Contract Assertions

- `preview_*` tool names do not appear in the future-state runtime.
- `preview_session_id` does not appear in the future-state runtime.
- Browser tools are derived from `agentDef.toolNames`.
- `send_message_to` is derived from `agentDef.toolNames`.
- Prompt guidance for `send_message_to` is derived from actual runtime exposure, not teammate presence alone.
- Claude SDK allowed-tools are passed in as one resolved list, not reconstructed from lower-layer booleans.
- Browser top-level visibility is not derived from `sessions.length > 0`.
- User-opened tabs and agent-opened tabs use the same browser-tab model and the same shell snapshot path.
- Browser full-view mode changes shell layout only; it does not create a second browser runtime path.
