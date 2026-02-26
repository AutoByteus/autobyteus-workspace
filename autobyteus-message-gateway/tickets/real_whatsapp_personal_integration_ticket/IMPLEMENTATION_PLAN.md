# Implementation Plan (Real WhatsApp Personal Integration)

Ticket: `real_whatsapp_personal_integration_ticket`  
Scope: `Medium`  
Strategy: `Bottom-up TDD` (`source skeleton -> tests -> implementation -> refactor`)

## Goal
Replace mock WhatsApp personal session behavior with a real session-based adapter while preserving normalized inbound/outbound contracts and admin setup APIs.

## Locked Constraints
- Keep transport split: `WHATSAPP + BUSINESS_API` and `WHATSAPP + PERSONAL_SESSION`.
- Keep gateway-server callback endpoint: `POST /api/server-callback/v1/messages`.
- Keep gateway as only provider-facing process.
- Phase 1 allows exactly one running personal session per gateway instance.

## Implementation Order

1. Foundation: personal session infrastructure boundaries
   - `src/infrastructure/adapters/whatsapp-personal/session-state-mapper.ts`
   - `src/infrastructure/adapters/whatsapp-personal/inbound-envelope-mapper.ts`
   - `src/infrastructure/adapters/whatsapp-personal/session-credential-store.ts`
   - `src/infrastructure/adapters/whatsapp-personal/baileys-session-client.ts`
   - tests:
     - `tests/unit/infrastructure/adapters/whatsapp-personal/session-state-mapper.test.ts`
     - `tests/unit/infrastructure/adapters/whatsapp-personal/inbound-envelope-mapper.test.ts`
     - `tests/unit/infrastructure/adapters/whatsapp-personal/session-credential-store.test.ts`
     - `tests/unit/infrastructure/adapters/whatsapp-personal/baileys-session-client.test.ts`
2. Adapter refactor: replace mock lifecycle with real session lifecycle
   - `src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.ts`
   - `src/domain/models/session-provider-adapter.ts`
   - tests:
     - `tests/unit/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.test.ts`
3. Transport contract alignment: admin route/service DTO compatibility
   - `src/http/routes/channel-admin-route.ts`
   - `src/application/services/whatsapp-personal-session-service.ts` (behavior check; no protocol logic)
   - tests:
     - `tests/integration/http/routes/channel-admin-route.integration.test.ts`
     - `tests/unit/application/services/whatsapp-personal-session-service.test.ts`
4. Runtime wiring and config
   - `src/config/env.ts`
   - `src/config/runtime-config.ts`
   - `src/bootstrap/create-gateway-app.ts`
   - tests:
     - `tests/unit/config/env.test.ts`
     - `tests/unit/config/runtime-config.test.ts`
5. Operator documentation
   - `README.md`

## Verification Gate
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-message-gateway exec tsc -p tsconfig.json --noEmit`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-message-gateway exec vitest run --no-watch`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-message-gateway build`

## Out Of Scope For This Slice
- Frontend setup UX implementation (`autobyteus-web`) beyond API contract compatibility.
- Server-side binding UX/API changes (`autobyteus-server-ts`) outside existing ingress/callback contracts.
- Multi-session orchestration and monitoring dashboards.
