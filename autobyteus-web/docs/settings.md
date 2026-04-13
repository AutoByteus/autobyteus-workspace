# Settings Page Documentation

The Settings page provides a centralized interface for managing application configuration, runtime tools, localization preferences, app metadata, and usage statistics. It is accessible via the sidebar navigation and is divided into several key sections.

## Overview

The Settings page is implemented in \`pages/settings.vue\` and serves as a container for several specialized management components. The main sections are:

1.  **API Keys**
2.  **Token Usage Statistics**
3.  **Nodes**
4.  **Messaging**
5.  **Display**
6.  **Language**
7.  **Local Tools**
8.  **MCP Servers**
9.  **Agent Packages**
10. **Server Settings**
11. **Extensions**
12. **Updates**

## Sections Detail

### 1. API Keys

**Component:** \`components/settings/ProviderAPIKeyManager.vue\`

This section allows users to manage connections to various LLM (Large Language Model) providers.

- **Key Management:** Securely enter and update API keys for providers like OpenAI, Anthropic, Gemini, etc.
- **Model Discovery:** Automatically lists available models (LLM, Audio, Image) for each configured provider.
- **Reload Models:** Triggers a backend refresh to discover new models or apply API key changes.
- **Reload Provider Models:** Triggers a targeted refresh for the selected provider to re-discover its models.

### 2. Token Usage Statistics

**Component:** \`components/settings/TokenUsageStatistics.vue\`

Provides insights into the application's token consumption and associated costs.

- **Date Filtering:** Select a start and end date to filter usage data.
- **Cost Analysis:** detailed breakdown of:
  - Prompt Tokens (Input)
  - Assistant Tokens (Output)
  - Estimated Costs (based on model pricing)
- **Visualization:** A bar chart visualizes the total cost per model.

### 3. Nodes

**Component:** `components/settings/NodeManager.vue`

Manage local/remote node registrations and synchronization operations.

- Register and rename remote nodes.
- Validate connectivity/capabilities.
- Trigger focused or full sync operations between nodes.
- In Electron, `Remote Browser Sharing` is an advanced opt-in setting for sharing the local Browser runtime with selected remote nodes.
- Changing the remote-browser-sharing listener host requires restarting Electron because the Browser bridge listener is started by Electron main during desktop bootstrap.
- Pairing and revoke actions are per remote node, and successful pair/unpair operations refresh remote browser-tool availability without restarting the remote node server.

### 4. Messaging

**Component:** `components/settings/MessagingSetupManager.vue`

Managed setup for external messaging providers on the selected node.

- The `Managed Messaging Gateway` card at the top installs, starts, restarts, disables, and diagnoses the shared messaging runtime.
- Provider selection and configuration sit below the runtime card.
- Channel binding maps external identities to either an agent definition plus saved launch preset or a team definition plus saved team launch preset.
- Inbound messages can auto-start the bound agent runtime when no cached bot-owned live run is available, or lazily create and later reuse the team run for the selected team definition only while that bot-owned run remains live in the current server session.
- Verification runs readiness checks across runtime, binding, and provider state.
- Telegram is easiest in polling mode and is mostly configured from inside the app after bot creation.

For the full managed flow, including Telegram setup and a live acceptance checklist, see:

- **[Managed Messaging Setup](./messaging.md)**

### 5. Display

**Component:** `components/settings/DisplaySettingsManager.vue`

App-wide font-size controls for accessibility and readability.

- Presets: `Default`, `Large`, `Extra Large`
- Preset metrics:
  - `Default` = root `100%`, Monaco `14px`, Terminal `14px`
  - `Large` = root `112.5%`, Monaco `16px`, Terminal `16px`
  - `Extra Large` = root `125%`, Monaco `18px`, Terminal `18px`
- The selected preset applies live without a full app restart.
- The preference persists across reloads and desktop restarts.
- The current window updates immediately; already-open secondary windows pick up the saved preset after reload/reopen.
- Root app scaling keeps rem-based UI text aligned while Monaco and Terminal receive explicit numeric font-size updates.
- The setting is intended to cover high-frequency workspace, explorer, artifact, and conversation surfaces instead of introducing viewer-only font controls.

### 6. Language

**Component:** `components/settings/LanguageSettingsManager.vue`

Manual locale selection for the product UI.

- Preference modes: `System`, `English`, `简体中文`
- The active choice persists across reloads.
- `System` resolves through the browser locale list in web mode and Electron `app.getLocale()` in desktop mode.
- Unsupported system locales fall back to English.
- The selected locale is applied live without a full app restart.

For runtime details and contributor guidance, see:

- **[Localization](./localization.md)**

### 7. Local Tools

**Component:** `components/tools/ToolsManagementWorkspace.vue`

Local tool browser embedded directly inside Settings.

- Browse built-in/local tools by category.
- Search tool names and descriptions.
- Inspect tool schemas and parameters.

For the full module behavior, see:

- **[Tools and MCP](./tools_and_mcp.md)**

### 8. MCP Servers

**Component:** `components/tools/ToolsManagementWorkspace.vue`

MCP server management embedded directly inside Settings.

- Add, edit, delete, and bulk import MCP server configurations.
- Discover tools from configured MCP servers.
- Inspect the tools registered for a specific MCP server.

For the full module behavior, see:

- **[Tools and MCP](./tools_and_mcp.md)**

### 9. Agent Packages

**Component:** `components/settings/AgentPackagesManager.vue`

Manage agent package sources used by the app.

- Import a package from a local filesystem path.
- Import a package from a public GitHub repository URL.
- Review installed package inventory and source type.
- Remove removable imported packages from app-managed storage.

### 10. Server Settings

**Component:** \`components/settings/ServerSettingsManager.vue\`

A flexible key-value store for backend configurations.

- **View & Edit:** precise control over server-side flags and parameters.
- **Custom Settings:** Users can add new custom key-value pairs to configure plugins or experimental features.
- **Custom Setting Cleanup:** Advanced table rows for custom keys include a remove action to delete obsolete entries.

### 11. Extensions

**Component:** `components/settings/ExtensionsManager.vue`

Managed optional capabilities that download their runtime assets on demand instead of shipping inside the base app bundle.

- **Install / Reinstall / Remove:** Downloads or refreshes release-hosted runtime assets under `~/.autobyteus/extensions/<extension-id>`.
- **Install / Reinstall / Remove:** Downloads or refreshes the lightweight runtime bundle under `~/.autobyteus/extensions/<extension-id>` and performs local backend/model bootstrap during install.
- **Enable / Disable:** Separates installation from active usage so installed extensions can stay on disk while disabled.
- **Open Folder:** Opens the managed install root for the selected extension.
- **Voice Input:** The current managed extension ships a local bilingual dictation runtime.
  - Language modes: `Auto`, `English`, `Chinese`
  - Lifecycle states: not installed, installing, installed and disabled, installed and enabled, needs attention
  - The shared composer microphone appears only when Voice Input is installed, enabled, and not in an error state.

### 12. Updates

**Component:** `components/settings/AboutSettingsManager.vue`

Canonical app metadata and manual update controls.

- Shows current desktop app version.
- Shows updater status and last-checked timestamp.
- Provides one manual **Check for Updates** action.
- Shows contextual actions (`Download Update`, `Install & Restart`) when update state requires it.
- When result is already-latest (`no-update`), the update notice remains visible for at least 3 seconds before auto-dismiss.

## Related Documentation

- **[Agent Management](./agent_management.md)**: API keys configured in Settings are used by Agents.
- **[Electron Packaging](./electron_packaging.md)**: The Server Status monitor and managed extensions both interact with Electron-owned runtime services.
- **[Localization](./localization.md)**: language selection, locale resolution, and localization contributor workflow.
- **[Managed Messaging Setup](./messaging.md)**: End-to-end gateway, provider, binding, and verification flow.
- **[Tools and MCP](./tools_and_mcp.md)**: local tools browsing and MCP server management embedded in Settings.
