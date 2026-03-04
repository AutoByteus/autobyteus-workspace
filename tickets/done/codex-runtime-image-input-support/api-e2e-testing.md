# API / E2E Testing

## Ticket

`codex-runtime-image-input-support`

## Stage 7 Gate Summary

- Gate decision: `Pass`
- Scope note: Stage 7 now includes one live Codex runtime image-input E2E scenario (`RUN_CODEX_E2E=1`) in addition to deterministic mapper unit checks.

## Scenario Results

| scenario_id | mapped_ac | scenario | result | evidence |
| --- | --- | --- | --- | --- |
| AV-001 | AC-001 | Codex mapper converts same-origin `/rest/files/*` URL to absolute `localImage` path | Passed | `codex-user-input-mapper.test.ts` |
| AV-002 | AC-002 | Codex mapper preserves remote/data image URLs as `image` | Passed | `codex-user-input-mapper.test.ts` |
| AV-003 | AC-003 | Text-only codex input behavior unaffected | Passed | mapper unchanged text path + codex runtime service test pass |
| AV-004 | AC-004 | Traversal URI does not produce unsafe local path | Passed | `codex-user-input-mapper.test.ts` |
| AV-005 | AC-005 | Existing codex runtime service tests still pass | Passed | `codex-app-server-runtime-service.test.ts` |
| AV-006 | AC-006 | Live Codex E2E sends real PNG fixtures through `userInput.contextFiles` using both `/rest/files/...` URL and absolute filesystem path and verifies both image inputs persisted in Codex thread history | Passed | `codex-runtime-graphql.e2e.test.ts` targeted live run |

## Commands Run

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/codex-app-server/codex-user-input-mapper.test.ts tests/unit/runtime-execution/codex-app-server/codex-app-server-runtime-service.test.ts --no-watch`
- `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts -t "accepts image contextFiles from URL and absolute path and records both in Codex thread history" --no-watch`
