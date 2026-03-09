# Settings Page Documentation

The Settings page provides a centralized interface for managing application configurations, app metadata, and usage statistics. It is accessible via the sidebar navigation and is divided into several key sections.

## Overview

The Settings page is implemented in \`pages/settings.vue\` and serves as a container for several specialized management components. The main sections are:

1.  **API Keys**
2.  **Token Usage Statistics**
3.  **Nodes**
4.  **Messaging**
5.  **Server Settings**
6.  **Extensions**
7.  **Updates**

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

### 4. Messaging

**Component:** `components/settings/MessagingSetupManager.vue`

Managed setup for external messaging providers on the selected node.

- The `Managed Messaging Gateway` card at the top installs, starts, restarts, disables, and diagnoses the shared messaging runtime.
- Provider selection and configuration sit below the runtime card.
- Channel binding maps external identities to an agent definition plus a saved launch preset.
- Inbound messages can auto-start the bound agent runtime when no cached live run is available.
- Verification runs readiness checks across runtime, binding, and provider state.
- Telegram is easiest in polling mode and is mostly configured from inside the app after bot creation.

For the full managed flow, including Telegram setup and a live acceptance checklist, see:

- **[Managed Messaging Setup](./messaging.md)**

### 5. Server Settings

**Component:** \`components/settings/ServerSettingsManager.vue\`

A flexible key-value store for backend configurations.

- **View & Edit:** precise control over server-side flags and parameters.
- **Custom Settings:** Users can add new custom key-value pairs to configure plugins or experimental features.
- **Custom Setting Cleanup:** Advanced table rows for custom keys include a remove action to delete obsolete entries.

### 6. Extensions

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

### 7. Updates

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
- **[Managed Messaging Setup](./messaging.md)**: End-to-end gateway, provider, binding, and verification flow.
