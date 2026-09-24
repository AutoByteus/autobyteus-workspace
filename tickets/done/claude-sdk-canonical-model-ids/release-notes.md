# Release Notes — Claude Agent SDK Canonical Model IDs

## What's improved

- Claude Agent SDK model pickers now show one option per real model, labeled with the exact model ID (for example `claude-opus-5-5[1m]`) instead of aliases like "Default (recommended)". Claude's display name and description are shown as secondary text. The recommended model carries a **Recommended** badge and is listed first. The selected field reads `Anthropic / <model ID>`.
- This applies to agent and team run configuration, team member overrides, existing-run Settings, messaging bindings and application launch profiles.
- Search matches the model ID, display name, description and "Recommended".

## Compatibility

- Saved configurations and runs keep their stored values (`default`, `sonnet`, `opus[1m]`, …) and launch exactly as before. A saved `default` opens as the Recommended option without a warning, and re-choosing it does not rewrite it.
- Codex App Server and AutoByteus model pickers are unchanged.
- No database migration.

## Validation boundary

- The pickers were checked in a browser against a live Claude CLI (2.1.281), and a real Claude turn launched with a saved `default`.
- The application launch-profile picker was covered by component tests only. Dark mode and narrow viewports were not inspected.
- Model IDs come from the installed Claude runtime and can change between CLI versions.
