# Implementation Plan (External Channel Outbound Reply - Server TS)

Ticket: `external_messaging_outbound_reply_ticket`  
Scope: `Large`  
Strategy: `Bottom-up TDD`

## Goal
Implement deterministic outbound reply publication by `(agentId, turnId)` with clean separation across:
- turn binding persistence
- response formatting
- callback publication transport
- reply orchestration guards

## Implementation Order

1. Shared turn identity readiness in `autobyteus-ts`
- ensure completion event carries `turnId`
- verify handler passes `turnId` in success and error paths

2. Receipt persistence + lookup foundation
- schema add: `ChannelMessageReceipt.turnId`
- provider/service APIs:
  - `bindTurnToReceipt(...)`
  - `getSourceByAgentTurn(...)`

3. Route-active binding safety
- add `isRouteBoundToTarget(route, target)` in binding provider/service

4. Callback publication runtime boundary
- add `gateway-callback-publisher.ts`
- add callback config getters in `app-config.ts`

5. Processor integration
- input processor: turn->receipt binding (order `925`)
- response processor: text-only outbound callback trigger (order `980`)
- set both processors as mandatory defaults so agent definitions need no manual setup
- add text formatter service for outbound content

6. Reply callback service refactor
- replace latest-source lookup path with turn-bound lookup path
- gate source/binding before callback idempotency reservation (avoid stale duplicate keys on skipped paths)
- enforce skip reasons (`TURN_ID_MISSING`, `SOURCE_NOT_FOUND`, `BINDING_NOT_FOUND`, `TEAM_TARGET_NOT_SUPPORTED`, `EMPTY_REPLY`, `CALLBACK_NOT_CONFIGURED`)

7. Tests + verification
- unit + integration for new APIs and branches
- typecheck/build

## Verification Commands
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-server-ts exec vitest run --no-watch`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-server-ts typecheck`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-server-ts build`
