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
9.  **Application Packages**
10. **Agent Packages**
11. **Server Settings**
12. **Extensions**
13. **Updates**

## Sections Detail

### 1. API Keys

**Component:** \`components/settings/ProviderAPIKeyManager.vue\`

This section allows users to manage connections to various LLM (Large Language Model) providers.

- **Provider Browser:** Built-in providers and saved custom providers appear in
  one provider-centered browser instead of separate management surfaces.
- **Built-In Key Management:** Securely enter and update API keys for providers
  like OpenAI, Anthropic, Gemini, etc. Built-in secret hydration stays
  write-only in the product UI; the page reloads configured-status booleans, not
  raw secret values.
- **Custom OpenAI-Compatible Providers:** Use the visible `New Provider`
  draft row in the provider browser sidebar to create a reusable
  OpenAI-compatible provider by entering:
  - provider name
  - base URL
  - API key
- **Draft Provider Row:** The draft provider entry uses the same rectangular
  sidebar row shape as the other providers, with the visible label `New
  Provider`.
- **Probe Before Save:** The custom-provider flow probes the remote `/models`
  endpoint before save. Save stays disabled until a successful probe matches the
  current draft.
- **Duplicate-Name Protection:** Custom-provider names must be unique across
  both built-in and already-saved providers.
- **Saved Custom Provider Details:** Once saved, a custom provider shows a
  details card with its base URL, model count, status, and a remove action.
- **Custom Provider Delete:** Removing a saved custom provider deletes its
  persisted record and then runs an authoritative refresh so the provider and
  its models disappear from the browser. Selection falls back to the next
  available provider row automatically.
- **Model Discovery:** The selected provider panel lists available LLM, Audio,
  and Image models grouped under the provider object returned by the backend.
- **Custom-Only Friendly Labels:** Custom `OPENAI_COMPATIBLE` models display
  friendly `provider.name / model.name` labels in shared selector consumers,
  while built-in AutoByteus/runtime-backed models keep identifier-based labels.
- **Reload Models:** Reload all models refreshes the full provider/model catalog.
- **Reload Provider Models:** Reload selected provider refreshes just that
  provider's catalog slice through the backend provider-targeted reload path.
- **Custom Provider Status:** Saved custom providers show their base URL plus a
  status summary:
  - `READY`: latest probe/load succeeded
  - `STALE_ERROR`: last refresh failed but the app kept last-known-good models
  - `ERROR`: the provider currently has no successful load to serve from

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

### 9. Application Packages

**Component:** `components/settings/ApplicationPackagesManager.vue`

Manage application package sources used by the current node.

- Platform-owned built-in applications appear as `Platform Applications` only when the managed built-in package currently contains at least one application.
- The default list distinguishes platform-owned, linked local, and GitHub-imported sources instead of presenting every source as an equivalent filesystem root.
- Raw internal built-in paths stay off the default list; `Show details` reveals root/source/managed-path metadata only on demand for support/debug work.
- Linked local packages keep the user-chosen local path visible in the default list because that path is part of the operator's import choice.
- GitHub-installed packages use repository identity in the default list while keeping the managed install path in the details panel.
- Import and removal refresh Applications, Agents, and Agent Teams in the same session.

### 10. Agent Packages

**Component:** `components/settings/AgentPackagesManager.vue`

Manage agent package sources used by the app.

- Import a package from a local filesystem path.
- Import a package from a public GitHub repository URL.
- Review installed package inventory and source type.
- Remove removable imported packages from app-managed storage.

### 11. Server Settings

**Component:** \`components/settings/ServerSettingsManager.vue\`

A flexible key-value store for backend configurations.

- **Quick setup cards:** The quick server-settings surface now includes both `Web Search Configuration` and a dedicated `Compaction config` card.
- **Compaction config:** The typed compaction card saves the main memory-compaction controls without requiring operators to remember raw env keys:
  - **Compaction model:** optional dedicated internal summarizer model; blank falls back to the active run model.
  - **Compaction trigger ratio (%):** saved to `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO`; defaults to `80%`.
  - **Effective context override:** saved to `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE`; use this when a provider (for example LM Studio) fails before its advertised maximum context.
  - **Enable detailed compaction logs:** saved to `AUTOBYTEUS_COMPACTION_DEBUG_LOGS`; turns on verbose budget/execution/result diagnostics in server logs.
- **Live runtime effect:** Compaction settings are env-backed server settings, but changes apply to subsequent compaction budget checks and compaction-model dispatches without restarting the server.
- **Local provider note:** LM Studio and Ollama long-running requests are now hardened internally for delayed first-token / long prompt-processing cases; there is no separate timeout setting in the UI. If local runs still fail before the practical context ceiling, lower **Effective context override** instead.
- **Advanced raw table:** The full key-value table remains available for precise control over server-side flags and parameters, including custom settings.
- **Applications feature toggle:** `components/settings/ApplicationsFeatureToggleCard.vue` now appears as a normal card inside the Server Settings Basics grid and is the first-class control for the bound node’s runtime Applications capability.
- **Typed runtime authority:** The Applications card reads/writes the typed `applicationsCapability` / `setApplicationsEnabled(...)` boundary instead of treating the generic key-value table as the primary product-facing owner.
- **Immediate runtime effect:** Enabling or disabling Applications refreshes the same window’s sidebar visibility, `/applications` route access, and catalog behavior without rebuilding the packaged frontend.
- **Initialization source visibility:** The card surfaces whether the current value came from an explicit persisted server setting or from one-time discovery-seeded initialization during cutover.
- **View & Edit:** precise control over server-side flags and parameters.
- **Custom Settings:** Users can add new custom key-value pairs to configure plugins or experimental features.
- **Custom Setting Cleanup:** Advanced table rows for custom keys include a remove action to delete obsolete entries.
- **Workspace feedback:** Compaction activity is surfaced back in the active agent/team workspace as a status banner (`Compaction queued`, `Compacting memory…`, `Memory compacted`, or failure text) rather than only appearing as an unexplained pause.

### 12. Extensions

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

### 13. Updates

**Component:** `components/settings/AboutSettingsManager.vue`

Canonical app metadata and manual update controls.

- Shows current desktop app version.
- Shows updater status and last-checked timestamp.
- Provides one manual **Check for Updates** action.
- Shows contextual actions (`Download Update`, `Install & Restart`) when update state requires it.
- When result is already-latest (`no-update`), the update notice remains visible for at least 3 seconds before auto-dismiss.

## Related Documentation

- **[Agent Management](./agent_management.md)**: API keys configured in Settings are used by Agents.
- **[Agent Execution Architecture](./agent_execution_architecture.md)**: streamed runtime events, including compaction status propagation into the workspace banner.
- **[Applications](./applications.md)**: runtime Applications availability, routing, and catalog behavior consume the capability managed from Settings.
- **[Electron Packaging](./electron_packaging.md)**: The Server Status monitor and managed extensions both interact with Electron-owned runtime services.
- **[Localization](./localization.md)**: language selection, locale resolution, and localization contributor workflow.
- **[Managed Messaging Setup](./messaging.md)**: End-to-end gateway, provider, binding, and verification flow.
- **[Tools and MCP](./tools_and_mcp.md)**: local tools browsing and MCP server management embedded in Settings.
