# Design Document (autobyteus-message-gateway: WeChat Personal Integration)

## Summary
Implement two WeChat-related routes with explicit boundaries:
1. `WECOM + BUSINESS_API` via WeCom app bridge (recommended production route).
2. `WECHAT + PERSONAL_SESSION` via Wechaty sidecar (experimental direct route).

Gateway is the only channel protocol owner.

## Goals
- Support personal-user access through WeCom app bridge.
- Support optional direct personal WeChat session through Wechaty sidecar.
- Keep outbound routing deterministic and avoid adapter-collision smells.

## Non-Goals
- No agent runtime logic.
- No secret editing through web in phase 1.

## Requirements And Use Cases
- Use Case 1: WeCom callback URL verification handshake succeeds (GET verification).
- Use Case 2: WeCom app inbound callback is verified/decrypted and forwarded.
- Use Case 3: Outbound reply for `WECOM + BUSINESS_API` routes by account mode.
- Use Case 4: Web reads gateway capabilities and configured account inventory.
- Use Case 5: Start/stop/query direct WeChat personal session and QR.
- Use Case 6: Direct WeChat peer discovery and routing setup.
- Use Case 7: Gateway restart restores direct sessions via sidecar reconnect.

## Architecture Overview

### Route A: WeCom App Bridge
- External contract: `provider=WECOM`, `transport=BUSINESS_API`.
- Adapter model: one `WeComUnifiedAdapter` (single routing key externally).
- Internal strategy split:
  - legacy WeCom strategy.
  - WeCom-app strategy.

### Route B: Direct WeChat Personal (Experimental)
- External contract: `provider=WECHAT`, `transport=PERSONAL_SESSION`.
- Session runtime boundary: `wechaty-sidecar-client.ts`.
- Sidecar owns auth artifacts; gateway owns session metadata/state only.

## File And Module Breakdown

| File/Module | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/config/env.ts` | env contract | add WeCom-app + WeChat-personal keys | env -> typed object | none |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/config/runtime-config.ts` | runtime normalization | config parse/build | env -> runtime config | parsers |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/bootstrap/create-gateway-app.ts` | composition root | service/adapter wiring | config -> app | services/adapters |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/http/routes/wecom-app-webhook-route.ts` (new) | WeCom-app GET handshake + POST callback transport | `registerWeComAppWebhookRoutes` | HTTP -> inbound service | wecom adapter |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/wecom/wecom-unified-adapter.ts` (new) | single `WECOM` adapter boundary | `verifyInboundSignature`, `parseInbound`, `sendOutbound` | inbound/outbound -> normalized | legacy+app strategies |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/wecom/wecom-app-inbound-strategy.ts` (new) | WeCom callback verify/decrypt/parse + message-id normalization | `verifyCallback`, `parseCallback` | callback -> envelope(s) | account registry + crypto |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/wecom/wecom-app-outbound-strategy.ts` (new) | WeCom send/token lifecycle | `send` | outbound -> provider send result | API client |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/wecom/wecom-account-registry.ts` (new) | account mode lookup | `resolveAccountMode`, `listAccounts` | accountId -> account metadata | runtime config |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/wecom/wecom-inbound-message-id-normalizer.ts` (new) | stable externalMessageId generation | `normalizeInboundMessageId` | provider payload -> idempotency-safe id | hash/utils |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/wechat-personal/wechat-personal-adapter.ts` (new) | direct personal session adapter | lifecycle + inbound/outbound + peer candidates | admin/session ops | sidecar client + mappers |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/wechat-personal/wechaty-sidecar-client.ts` (new) | Wechaty runtime boundary | `open`, `close`, `sendText`, event subscriptions | sidecar API/events | HTTP/WS client |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/wechat-personal/session-state-store.ts` (new) | session metadata persistence (not credentials) | load/save/delete/list | session metadata | fs/path |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/wechat-personal/wechat-inbound-message-id-normalizer.ts` (new) | stable Wechaty message ID mapping | `normalizeInboundMessageId` | sidecar event -> id | hash/utils |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/application/services/wechat-personal-session-service.ts` (new) | lifecycle orchestration | start/status/qr/stop/peer-candidates | admin DTOs | session adapter |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/application/services/gateway-capability-service.ts` (new) | setup capability source of truth | `getCapabilities` | runtime config -> capability DTO | runtime config |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/http/routes/channel-admin-route.ts` | admin setup APIs | add capability/account/session endpoints | HTTP <-> services | admin guard |

## Public API Additions (Gateway)

### Setup Read APIs (source of truth for web)
- `GET /api/channel-admin/v1/capabilities`
- `GET /api/channel-admin/v1/wecom/accounts`

### WeCom-app callback APIs
- `GET /webhooks/wecom-app/:accountId` (URL verification handshake)
- `POST /webhooks/wecom-app/:accountId` (message callback)
- legacy route remains: `POST /webhooks/wecom`

### Direct WeChat personal admin APIs
- `POST /api/channel-admin/v1/wechat/personal/sessions`
- `GET /api/channel-admin/v1/wechat/personal/sessions/:sessionId/qr`
- `GET /api/channel-admin/v1/wechat/personal/sessions/:sessionId/status`
- `GET /api/channel-admin/v1/wechat/personal/sessions/:sessionId/peer-candidates`
- `DELETE /api/channel-admin/v1/wechat/personal/sessions/:sessionId`

## Configuration Additions

### WeCom app bridge
- `GATEWAY_WECOM_APP_ENABLED`
- `GATEWAY_WECOM_APP_ACCOUNTS_JSON`
- `GATEWAY_WECOM_APP_API_BASE_URL`

### Direct WeChat personal (experimental)
- `GATEWAY_WECHAT_PERSONAL_ENABLED`
- `GATEWAY_WECHAT_PERSONAL_QR_TTL_SECONDS`
- `GATEWAY_WECHAT_PERSONAL_RECONNECT_MAX_ATTEMPTS`
- `GATEWAY_WECHAT_PERSONAL_RECONNECT_BASE_DELAY_MS`
- `GATEWAY_WECHAT_PERSONAL_SIDECAR_BASE_URL`
- `GATEWAY_WECHAT_PERSONAL_STATE_ROOT` (metadata store)

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation |
| --- | --- | --- | --- | --- |
| `wecom-unified-adapter.ts` | account registry + strategies | inbound/outbound services | Medium | strategy split avoids mixed concerns |
| `wecom-app-webhook-route.ts` | wecom adapter + inbound service | external callbacks | Low | dedicated handshake/callback transport route |
| `wechat-personal-adapter.ts` | sidecar client + state store + mapper | session/outbound/inbound bridge | Medium | sidecar owns protocol/auth; gateway owns orchestration |
| `channel-admin-route.ts` | capability/account/session services | web setup | Low | admin transport only |

## Error Handling And Edge Cases
- WeCom handshake token/signature invalid -> `401 INVALID_SIGNATURE`.
- Unknown WeCom account -> `404 ACCOUNT_NOT_CONFIGURED`.
- Missing deterministic inbound ID fields -> normalizer fallback hash, never empty ID.
- Direct session sidecar unavailable -> `503 SIDECAR_UNAVAILABLE`.
- Direct session QR not ready -> `409 SESSION_QR_NOT_READY`.

## Security / Compliance
- No secrets exposed in capability/account APIs.
- Direct mode is explicit experimental flag with risk warning.
- Wechaty protocol coupling isolated to sidecar boundary.

## Migration / Rollout
1. Extend shared provider enum in `autobyteus-ts`.
2. Implement unified WeCom adapter + dedicated WeCom-app webhook route.
3. Add gateway capability/account read APIs.
4. Add direct WeChat session path behind experimental flag.
5. Update web mode selection and compatibility checks.

## Defaults Chosen
- Production default: `WECOM_APP_BRIDGE`.
- Direct WeChat personal: disabled by default.
- Direct backend: Wechaty sidecar.

## Open Questions
- None blocking design.
