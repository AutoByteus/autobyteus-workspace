# Kimi Tool Stream Visibility

- Fixed multi-tool stream visibility so provider-native calls like Kimi `run_bash:0`, `run_bash:1`, and later calls render as separate conversation tool cards and Activity rows.
- Refactored tool invocation identity to use one exact canonical id across stream segments, lifecycle events, approvals, logs, Activity, and file-change correlation instead of suffix alias matching.
- Preserved and validated real runtime behavior across Kimi, Codex App Server, and Claude Agent SDK tool-call flows.
- Added regression coverage so old alias-shaped mismatches stay visible as distinct events instead of being silently merged.
