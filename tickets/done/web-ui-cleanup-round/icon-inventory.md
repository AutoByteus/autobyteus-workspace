# Icon inventory: the 71 icons made visible by `3a87152631` (autobyteus-294 H-28)

Source: `git show 3a87152631 -- autobyteus-web`. Before that commit each was an `i-heroicons-*` class with no plugin, so it rendered nothing; the commit switched them to `<Icon>`. Paths are under `autobyteus-web/`.

Rule (DEC-001, approved by the user on 2026-10-28):
- **A** = named by the user;
- **B** = decoration next to a text label;
- **C** = carries meaning the text does not (loading spinner, the only label of an icon-only button, status, search-field magnifier).

A and B are removed; C stays.

| # | File | Icon (heroicons) | Where / what | Group | Disposition |
| --- | --- | --- | --- | --- | --- |
| 1–13 | `pages/settings.vue` | key, cpu-chip, arrows-right-left, chart-bar, computer-desktop, language, wrench-screwdriver, puzzle-piece, squares-plus, folder-open, server, squares-2x2, arrow-path | Settings sidebar menu items (API Keys … Updates) | A | Remove (the "Back to Workspace" arrow, line 27, was visible before and stays) |
| 14 | `components/tools/ToolCard.vue` | wrench-screwdriver / cloud-arrow-down | Box before each tool name (Local Tools, MCP tools) | A | Remove with its tinted box |
| 15 | `components/tools/McpServerCard.vue` | tag | Before "Prefix:" | A | Remove |
| 16 | `components/tools/McpServerCard.vue` | command-line | Before "Command:" | A | Remove |
| 17 | `components/tools/McpServerCard.vue` | folder-open | Before the working directory | A | Remove |
| 18 | `components/tools/McpServerCard.vue` | globe-alt | Before the URL | A | Remove |
| 19 | `components/tools/McpServerCard.vue` | sparkles | "Sync Tools" button | A | Remove |
| 20 | `components/tools/McpServerList.vue` | document-arrow-down | "Bulk Import" button | B | Remove |
| 21 | `components/tools/McpServerList.vue` | plus | "Add Server" button | B | Remove |
| 22 | `components/tools/McpServerList.vue` | server-stack (large) | Empty state "no MCP servers" | B | Remove |
| 23 | `components/tools/McpServerFormModal.vue` | plus | "Add argument" | B | Remove |
| 24 | `components/tools/McpBulkImportView.vue` | arrow-left | "Back" button | B | Remove |
| 25 | `components/tools/ToolList.vue` | plus | Add button (with text) | B | Remove |
| 26 | `components/tools/ToolList.vue` | arrow-left | "Back" button | B | Remove |
| 27 | `components/tools/ToolList.vue` | `emptyIcon` (large) | Empty state | B | Remove (the `emptyIcon` prop goes too) |
| 28 | `components/tools/ToolsManagementWorkspace.vue` | puzzle-piece (passed as `empty-icon`) | Empty state of an MCP server's tools | B | Remove (prop removed) |
| 29 | `components/tools/ToolDetailsModal.vue` | arrow-path (not spinning) | "Reload Schema" | B | Remove (its spinner, #50, stays) |
| 30–32 | `components/agents/AgentDetail.vue` | play, pencil-square, trash | "Run Agent", "Edit", "Delete" buttons | B | Remove |
| 33 | `components/settings/providerApiKey/customProvider/CustomProviderDetailsCard.vue` | trash | "Remove custom provider" (spinner while deleting is a CSS span, unaffected) | B | Remove |
| 34 | `components/settings/providerApiKey/customProvider/CustomProviderEditor.vue` | signal | "Load models" | B | Remove |
| 35 | `components/settings/providerApiKey/customProvider/CustomProviderEditor.vue` | check | Save-type button with text | B | Remove |
| 36 | `components/settings/providerApiKey/QwenSetupForm.vue` | check-circle | Before "API key configured" | B | Remove |
| 37 | `components/settings/ServerSettingsManager.vue` | check | "Save" | B | Remove |
| 38 | `components/settings/ServerMigrationsManager.vue` | arrow-path | "Refresh" (text) | B | Remove |
| 39 | `components/settings/ServerMigrationsManager.vue` | play | "Run" (text) | B | Remove |
| 40 | `components/settings/VoiceInputExtensionCard.vue` | microphone | Badge before the extension name | B | Remove with its round badge |
| 41 | `components/applications/ApplicationLaunchSetupPanel.vue` | adjustments-horizontal | In the "Setup" pill | B | Remove |
| 42 | `components/applications/ApplicationShell.vue` | adjustments-horizontal | In the "Setup" pill | B | Remove |
| 43 | `components/common/SearchableSelect.vue` | folder | Before the selected workspace | B | Remove |
| 44 | `components/common/SearchableSelect.vue` | folder | Before each workspace in the list | B | Remove |
| 45 | `components/common/SearchableSelect.vue` | folder-open (large) | Empty state "no workspaces" | B | Remove |
| 46 | `components/agents/AgentDefinitionForm.vue` | arrow-path (spinning) | Submit in progress | C | Keep |
| 47 | `components/common/SearchableSelect.vue` | arrow-path (spinning) | Loading | C | Keep |
| 48 | `components/tools/McpBulkImportView.vue` | arrow-path (spinning) | Importing | C | Keep |
| 49 | `components/tools/McpServerFormModal.vue` | arrow-path (spinning) ×2 | Saving / testing | C | Keep |
| 50 | `components/tools/ToolDetailsModal.vue` | arrow-path (spinning) | Reloading | C | Keep |
| 51 | `components/tools/McpServerList.vue` | arrow-path (spinning) | Loading servers | C | Keep |
| 52 | `components/tools/ToolList.vue` | arrow-path (spinning) | Loading tools | C | Keep |
| 53 | `components/common/ToastContainer.vue` | check-circle / x-circle / information-circle | Toast type | C | Keep |
| 54 | `components/common/ToastContainer.vue` | x-mark | Close (icon-only) | C | Keep |
| 55 | `components/tools/ToolDetailsModal.vue` | x-mark | Close (icon-only) | C | Keep |
| 56 | `components/tools/McpServerFormModal.vue` | trash | Remove argument (icon-only) | C | Keep |
| 57–58 | `components/settings/providerApiKey/QwenSetupForm.vue` | eye / eye-slash | Show/hide key (icon-only) | C | Keep |
| 59–62 | `components/tools/McpGatewayPanel.vue` | document-duplicate / check (×2) | Copy / copied (icon-only) | C | Keep |
| 63 | `components/workspace/running/RunningTeamGroup.vue` | plus | New team run (icon-only, titled) | C | Keep |
| 64 | `components/workspace/running/RunningTeamRow.vue` | chevron-right | Expand (icon-only) | C | Keep |
| 65 | `components/applications/setup/ApplicationWorkspaceRootSelector.vue` | folder-open | Browse for folder (icon-only) | C | Keep |
| 66 | `components/applications/ApplicationSurface.vue` | exclamation-triangle | Application failed to open | C | Keep |
| 67 | `components/common/SearchableSelect.vue` | magnifying-glass | Search field | C | Keep |
| 68 | `components/tools/ToolsFilter.vue` | magnifying-glass | Search field (tools filter) | C | Keep |

Numbering groups multi-icon rows; the commit's count is 71 `<Icon>` uses (plus the `empty-icon` prop value). Not part of this list and unchanged: icons visible before beta 15, such as the Settings "Back to Workspace" arrow and autobyteus-244's MCP config row icons (`McpConfigRows.vue`).

The implementation re-checks this list against the commit and reports any use it finds that is not listed, before deciding it.
