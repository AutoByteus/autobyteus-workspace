# Implementation Progress (External Channel Outbound Reply - Server TS)

Ticket: `external_messaging_outbound_reply_ticket`

## Progress Log
- 2026-02-09: Kickoff implementation from finalized outbound-reply design/runtime simulation artifacts.
- 2026-02-09: Added `turnId` propagation support in `autobyteus-ts` completion event path to unblock server turn-bound callback work.
- 2026-02-09: Implemented turn-bound receipt persistence and lookup (`bindTurnToReceipt`, `getSourceByAgentTurn`).
- 2026-02-09: Implemented binding route-active guard (`isRouteBoundToTarget`) and callback transport publisher.
- 2026-02-09: Replaced reply callback orchestration with deterministic `(agentId, turnId)` flow and explicit skip reasons.
- 2026-02-09: Added and wired processors (`external-channel-turn-receipt-binding-processor`, `external-channel-assistant-reply-processor`).
- 2026-02-09: Fixed `GatewayCallbackPublisher` timeout behavior to avoid waiting full timeout on success/non-timeout failure.
- 2026-02-09: Made external-channel turn-binding and assistant-reply processors mandatory defaults for all agents.
- 2026-02-09: Reordered reply callback orchestration to resolve source/binding before callback idempotency reservation.
- 2026-02-09: Added focused processor metadata unit tests and updated callback service tests for new reservation order.
- 2026-02-09: Validation completed: focused unit/integration tests pass, external-channel suite passes, build passes.

## File-Level Status

| File | File Status | Unit Test Status | Integration Test Status | Notes |
| --- | --- | --- | --- | --- |
| `src/external-channel/providers/channel-message-receipt-provider.ts` | Completed | Passed | N/A | Turn-bind and turn-lookup contract added. |
| `src/external-channel/providers/sql-channel-message-receipt-provider.ts` | Completed | N/A | Passed | Upsert bind + indexed lookup by `(agentId, turnId)`. |
| `src/external-channel/services/channel-message-receipt-service.ts` | Completed | Passed | N/A | Normalization + delegation for turn APIs. |
| `prisma/schema.prisma` | Completed | N/A | Passed | Added `turnId` and index `idx_channel_message_receipts_agent_turn_id`. |
| `src/external-channel/providers/channel-binding-provider.ts` | Completed | Passed | N/A | Added route->target match API. |
| `src/external-channel/providers/sql-channel-binding-provider.ts` | Completed | N/A | Passed | Implemented route-active check query. |
| `src/external-channel/services/channel-binding-service.ts` | Completed | Passed | N/A | Exposed route-active check with normalization. |
| `src/external-channel/runtime/gateway-callback-publisher.ts` | Completed | Passed | N/A | Callback boundary + timeout cleanup fix. |
| `src/config/app-config.ts` | Completed | N/A | N/A | Added callback config getters. |
| `src/external-channel/services/reply-callback-service.ts` | Completed | Passed | N/A | Publish-by-turn refactor with source/binding gates before idempotency reserve. |
| `src/external-channel/services/external-channel-reply-content-formatter.ts` | Completed | Passed | N/A | Text-only formatter boundary implemented. |
| `src/agent-customization/processors/persistence/external-channel-turn-receipt-binding-processor.ts` | Completed | Passed | N/A | Input processor order `925`, now mandatory by default. |
| `src/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.ts` | Completed | Passed | N/A | Response processor order `980`, now mandatory by default and low-noise skip logging. |
| `src/startup/agent-customization-loader.ts` | Completed | Passed | N/A | Processor wiring added and tested. |
| `tests/unit/agent-customization/processors/persistence/external-channel-turn-receipt-binding-processor.test.ts` | Completed | Passed | N/A | Added metadata + mandatory contract coverage. |
| `tests/unit/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.test.ts` | Completed | Passed | N/A | Added metadata + mandatory contract coverage. |
| `tests/unit/external-channel/services/reply-callback-service.test.ts` | Completed | Passed | N/A | Updated to validate no idempotency reserve on `SOURCE_NOT_FOUND`/`BINDING_NOT_FOUND`. |

## Verification Results

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-server-ts exec vitest run tests/unit/external-channel/services/channel-message-receipt-service.test.ts tests/unit/external-channel/services/reply-callback-service.test.ts tests/unit/external-channel/services/channel-binding-service.test.ts tests/integration/external-channel/providers/sql-channel-message-receipt-provider.integration.test.ts --no-watch` -> passed (`30` tests).
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-server-ts exec vitest run tests/unit/external-channel/services/reply-callback-service.test.ts tests/unit/agent-customization/processors/persistence/external-channel-turn-receipt-binding-processor.test.ts tests/unit/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.test.ts tests/unit/startup/agent-customization-loader.test.ts --no-watch` -> passed (`15` tests).
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-server-ts exec vitest run tests/unit/external-channel tests/integration/external-channel tests/unit/agent-definition/processor-defaults.test.ts --no-watch` -> passed (`82` tests).
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-server-ts build` -> passed.
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-server-ts typecheck` -> blocked by pre-existing `TS6059` (`tests` included outside `rootDir: src`) in project-wide `tsconfig.json`; unrelated to this ticket’s code paths.
