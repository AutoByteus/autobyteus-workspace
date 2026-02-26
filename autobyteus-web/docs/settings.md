# Settings Page Documentation

The Settings page provides a centralized interface for managing application configurations, monitoring system status, and viewing usage statistics. It is accessible via the sidebar navigation and is divided into several key sections.

## Overview

The Settings page is implemented in \`pages/settings.vue\` and serves as a container for several specialized management components. The main sections are:

1.  **API Keys**
2.  **Token Usage Statistics**
3.  **Server Settings**
4.  **Server Status**

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

### 3. Server Settings

**Component:** \`components/settings/ServerSettingsManager.vue\`

A flexible key-value store for backend configurations.

- **View & Edit:** precise control over server-side flags and parameters.
- **Custom Settings:** Users can add new custom key-value pairs to configure plugins or experimental features.
- **Custom Setting Cleanup:** Advanced table rows for custom keys include a remove action to delete obsolete entries.

### 4. Server Status

**Component:** \`components/server/ServerMonitor.vue\`

Displays the real-time health and connection status of the backend server.

- **Status Indicators:** Visual feedback on whether the server is `Running`, `Starting`, or in an `Error` state.
- **Technical Details:** Displays the Server URL and, if running in Electron mode, the path to the local log file.
- **Controls:** Options to "Refresh Status" or "Restart Server".

## Related Documentation

- **[Agent Management](./agent_management.md)**: API keys configured in Settings are used by Agents.
- **[Electron Packaging](./electron_packaging.md)**: The Server Status monitor interacts with the bundled Electron server.
