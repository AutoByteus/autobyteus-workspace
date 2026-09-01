# Release Notes — Codex Command Failure Details

## Improvements

- Failed Codex terminal commands now show the provider-supplied command output and non-zero exit code in both the conversation tool card and Activity panel.
- Multiline command diagnostics retain their line breaks at desktop and narrow widths.

## Fixes

- Replaced the generic-only `Tool execution failed.` message when Codex App Server already supplied actionable command output or a non-zero exit code.
- Newly recorded run history now replays the same detailed command failure instead of losing it at the provider-to-AutoByteus mapping boundary.

## Behavior And Compatibility

- Explicit provider errors remain authoritative, and the generic fallback remains available when Codex supplies no useful detail.
- Successful, denied, interrupted, and non-command tools keep their existing behavior.
- Existing historical generic failures remain readable and are not rewritten. No data migration, backfill, compatibility branch, or downtime is required.
- No Electron shell, packaging, deployment-topology, or public event-shape change is included.
