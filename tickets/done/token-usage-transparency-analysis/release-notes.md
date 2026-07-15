## What's New
- Added a server-owned token usage ledger so AutoByteus, Codex App Server, and Claude Agent SDK usage can be stored as durable run/team/member accounting events.
- Added live token usage display through a header chip and right-side Usage tab with run, team, and focused-member totals.

## Improvements
- Added trusted/missing/partial/mixed estimated API-cost status so unpriced usage stays visible without being shown as `$0`.
- Preserved provider/runtime usage details such as raw payloads, cache tokens, reasoning tokens, model identity, and context pressure metadata for audit and future projections.
- Updated token usage statistics and charts to use ledger-backed nullable costs and currency-aware labels.
- Added environment-gated real-runtime E2E coverage for AutoByteus+LM Studio qwen3.5, Codex App Server, and Claude Agent SDK token usage ledger verification.
- Added real local browser-stack validation evidence for AutoByteus, Codex App Server, and Claude Agent SDK Usage UI/header-chip semantics over ledger-backed data.

## Fixes
- Replaced the old optional, lossy `TokenUsageStore` / `token_usage_records` accounting path with ledger-backed event persistence.
- Prevented Codex cumulative token snapshots from being summed repeatedly by separating reported readings from accounting deltas.
- Removed auto-extension/local-estimation token accounting as a durable source; native runtimes now surface provider-reported usage observations for server accounting.
- Corrected the browser evidence gap by retaining Codex and Claude Usage panel screenshots in addition to the prior AutoByteus browser screenshot.

## Validation
- Real runtime E2E passed for AutoByteus+LM Studio qwen3.5, Codex App Server, and Claude Agent SDK using `RUN_RUNTIME_TOKEN_USAGE_E2E=1` against `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts`.
- Real browser frontend proof passed for AutoByteus+LM Studio qwen3.5 unpriced usage, Codex App Server estimated usage, and Claude Agent SDK unpriced usage with retained screenshot evidence:
  - `/Users/normy/.autobyteus/browser-artifacts/8e23ce-1782359481206.png`
  - `/Users/normy/.autobyteus/browser-artifacts/7462ad-1782361217464.png`
  - `/Users/normy/.autobyteus/browser-artifacts/7462ad-1782361241017.png`
