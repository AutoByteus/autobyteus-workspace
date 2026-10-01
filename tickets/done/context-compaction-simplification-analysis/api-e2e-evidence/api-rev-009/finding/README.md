# API009-F001 — captured-response reproduction

Expected one identity-bearing held user bubble; observed two after actual native Reload for both hosted Agent and hosted Team lead. Server state is one held entry for each, unchanged across reload. No duplicate execution is claimed.

Run from assigned worktree:
pnpm -C autobyteus-web exec vitest run --config /Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/api-e2e-evidence/api-rev-009/finding/vitest.config.mjs --no-watch

Observed exit1, two failed tests (expected length1, received2). Exact invocation and cwd: probe-command.json; raw output: probe.log. This probe reads actual product/finding-*-projection.api.json and real-reconnect-after.api.json, invokes production buildConversationFromProjection and handleAgentInputState, and asserts no duplicate. It does not mutate source.

Temporary evidence only: current native raw/history representation already lacks accepted-input identity. Keeping a frozen identity-less durable fixture could prescribe content matching or survive incorrectly after a correct upstream fix. Failure-origin review should choose identity propagation/selection ownership and add a durable regression spanning the repaired contract. No request here for text deduplication or persisted-data migration.

Product evidence establishes supported real use (normal native View > Reload), not a contrived race. See product DOM/screenshots and unchanged input-instance/ID comparison. Initial scripted reload attempts were ignored and are explicitly excluded from proof.
