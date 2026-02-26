# Implementation Plan (Outbound Reply Delivery - Gateway)

Ticket: `external_messaging_outbound_reply_ticket`  
Scope: `Medium`  
Strategy: `Bottom-up TDD`

## Goal
Harden callback ingress and outbound delivery by:
- verifying callback signatures when configured
- supporting local-dev secret bypass explicitly
- splitting long outbound text into provider-safe chunks

## Implementation Order

1. Runtime config contract
- add `serverCallbackSharedSecret` with fallback to `GATEWAY_SERVER_SHARED_SECRET`

2. Callback signature middleware
- add `verify-server-callback-signature.ts`
- integrate in server callback route before parsing

3. Chunk planning boundary
- add `outbound-chunk-planner.ts`
- integrate planner into outbound service send path

4. Adapter chunk delivery
- update WhatsApp/WeChat personal adapters to send `chunks` when present

5. Tests + verification
- route integration for signature pass/fail/bypass
- unit tests for planner and outbound chunk behavior
- config tests for callback shared-secret fallback

## Verification Commands
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-message-gateway test`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-message-gateway typecheck`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-message-gateway build`
