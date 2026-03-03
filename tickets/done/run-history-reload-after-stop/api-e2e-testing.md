# API / E2E Testing

- Stage: `7`
- Date: `2026-03-03`
- Gate Result: `Pass`

## Scenario Coverage

| Scenario ID | Maps To | Type | Command / Evidence | Result |
| --- | --- | --- | --- | --- |
| `S7-001` | `AC-001` | Installed-profile evidence | `/Users/normy/.autobyteus/server-data/memory/run_history_index.json` + `/Users/normy/.autobyteus/server-data/memory/agents/software architect_Senior Software Engineer_7693/run_manifest.json` + root `/Users/normy/.autobyteus/server-data/memory/raw_traces.jsonl` | Pass |
| `S7-002` | `AC-002` | Integration regression | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-execution/agent-run-manager.integration.test.ts --no-watch` | Pass |
| `S7-003` | `AC-003` | Unit regression (team memory layout unchanged) | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/team-member-memory-layout-store.test.ts --no-watch` | Pass |
| `S7-004` | `AC-004` | End-to-end regression | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/run-history-graphql.e2e.test.ts --no-watch` | Pass |

## Consolidated Run

- Command:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-execution/agent-run-manager.integration.test.ts tests/e2e/run-history/run-history-graphql.e2e.test.ts tests/unit/run-history/team-member-memory-layout-store.test.ts --no-watch`
- Result:
  - `3` files passed
  - `18` tests passed
  - No failing scenarios

## Notes

- This ticket intentionally does not include legacy fallback behavior for root-level historical traces.
- Validation scope is forward behavior for future runs and non-regression of team memory layout.
