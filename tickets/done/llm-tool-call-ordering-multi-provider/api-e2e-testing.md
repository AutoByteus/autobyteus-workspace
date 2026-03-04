# API / E2E Testing

- Stage: `7`
- Date: `2026-03-03`
- Gate Result: `Pass`

## Scenario Coverage

| Scenario ID | Maps To | Type | Command / Evidence | Result |
| --- | --- | --- | --- | --- |
| `S7-001` | `AC-001` | Real provider integration (DeepSeek) | `pnpm --dir autobyteus-ts exec vitest --run tests/integration/llm/api/deepseek-llm.test.ts` | Pass |
| `S7-002` | `AC-002` | Real provider integration (Kimi) | `pnpm --dir autobyteus-ts exec vitest --run tests/integration/llm/api/kimi-llm.test.ts` | Pass |
| `S7-003` | `AC-003` | Real provider integration (GLM) | `pnpm --dir autobyteus-ts exec vitest --run tests/integration/llm/api/glm-llm.test.ts` | Pass |
| `S7-004` | `AC-004` | Docker runtime smoke (DeepSeek tool call continuation) | Container log evidence after `./scripts/personal-docker.sh up` rebuild; no strict ordering 400 for tool continuation flow | Pass |
| `S7-005` | Regression confidence | Full backend suite | `pnpm --dir autobyteus-server-ts exec vitest run --no-watch` | Pass |

## Consolidated Runs

- Provider + unit regression command:
  - `pnpm --dir autobyteus-ts exec vitest --run tests/unit/agent/handlers/llm-user-message-ready-event-handler.test.ts tests/unit/memory/memory-manager.test.ts tests/integration/llm/api/deepseek-llm.test.ts tests/integration/llm/api/kimi-llm.test.ts tests/integration/llm/api/glm-llm.test.ts`
- Result:
  - `5` files passed
  - `29` tests passed
  - `0` failed

- Backend suite command:
  - `pnpm --dir autobyteus-server-ts exec vitest run --no-watch`
- Result:
  - `243` files passed, `5` files skipped
  - `1058` tests passed, `20` skipped
  - `0` failed

## Notes

- One LM Studio full-flow integration test (`tests/integration/agent/full-tool-roundtrip-flow.test.ts`) timed out in a separate mixed-provider run due its static `20s` test timeout; this did not affect DeepSeek/Kimi/GLM provider verification and did not reproduce the strict tool-call ordering error under Docker smoke validation.
