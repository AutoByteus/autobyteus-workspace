# Implementation Plan

## Scope

- Ticket: `message-gateway-quality-review`
- Stage: `6 Implementation`

## Planned Steps

1. Tighten `createGatewayApp` so `wecomAppEnabled` actually disables the WeCom app-bridge runtime path.
2. Gate the WeCom app account registry input and app webhook route registration on the enabled flag.
3. Add a bootstrap integration regression proving the app route is unavailable when `wecomAppEnabled` is `false`, even if app accounts are configured.
4. Run focused bootstrap and WeCom route validation, then rerun full package `test` and `typecheck`.

## Change Inventory

- `Modify`: `src/bootstrap/create-gateway-app.ts`
- `Modify`: `tests/integration/bootstrap/create-gateway-app.integration.test.ts`
