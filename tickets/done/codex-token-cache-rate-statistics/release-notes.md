# Release Notes: Codex Token Usage Accounting

## Fixes

- Fixed Codex Token Meter accounting so multi-update/tool-heavy turns keep every provider token-usage increment instead of losing earlier same-turn updates.
- Corrected Codex cumulative token snapshots so first observed snapshots do not charge historical thread totals, while later snapshots reconcile input, cache, output, and thinking-token deltas exactly once.
- Updated runtime token usage validation so provider-emitted model identity is preserved through GraphQL summaries and statistics.

## Improvements

- Renamed the Token Meter context-size label to `Latest prompt` and clarified that gross input/cache-hit values are cumulative run totals.
- Preserved Claude Agent SDK `usage` versus `modelUsage` divergence diagnostics without changing Claude terminal-result accounting behavior.
