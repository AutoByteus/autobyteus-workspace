# Design Document

## Summary
Replace the simulated WhatsApp personal adapter in `autobyteus-message-gateway` with a real session-based integration while preserving the current normalized inbound/outbound contracts.

This design keeps two WhatsApp transports:
- `BUSINESS_API` for official webhook/API mode.
- `PERSONAL_SESSION` for real personal account mode.

The gateway remains the only component talking to messaging providers. Server and web stay transport-agnostic.

## Goals
- Deliver real personal WhatsApp send/receive via session client (no fake QR/session behavior).
- Keep existing inbound/outbound normalization boundaries intact.
- Preserve routing by `(provider, transport)`.
- Expose stable admin APIs for personal setup from web.
- Align API payloads with existing web setup stores.

## Non-Goals
- No full channel monitoring dashboard.
- No replacement of WhatsApp business webhook path.
- No agent memory/conversation changes in server.
- No wildcard binding/routing policy changes.
- No durable inbound retry queue in phase 1.

## Requirements And Use Cases
- Use Case 1: Start personal session and fetch real QR for linking device.
- Use Case 2: After QR scan, inbound WhatsApp DM reaches gateway and forwards to server ingress.
- Use Case 3: Assistant reply callback from server is sent back through the same personal session.
- Use Case 4: Gateway process restart restores session from persisted credentials and reconnects.
- Use Case 5: Logout/disconnect transitions session to blocked state and requires re-link.

## Architecture Overview

Transport split:
- `WHATSAPP + BUSINESS_API`: unchanged webhook + official API adapter.
- `WHATSAPP + PERSONAL_SESSION`: real session client adapter with credential store + listener.

Core boundaries:
- HTTP routes: parse/request-response only.
- Session service: lifecycle orchestration only.
- Session adapter: WhatsApp protocol translation only.
- Session client factory: SDK bootstrap/reconnect only.
- Credential store: persistence only.

## File And Module Breakdown

| File/Module | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/domain/models/session-provider-adapter.ts` | Canonical personal-session contract | `SessionProviderAdapter`, `SessionStatus`, `SessionQr` | input: lifecycle commands; output: normalized status/qr | `autobyteus-ts` channel types |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/application/services/whatsapp-personal-session-service.ts` | Lifecycle orchestration + feature gate | `startPersonalSession`, `getPersonalSessionQr`, `getPersonalSessionStatus`, `stopPersonalSession` | input: accountLabel/sessionId; output: DTOs for route | session adapter |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/http/routes/channel-admin-route.ts` | Admin setup transport only | `registerChannelAdminRoutes` | input: HTTP requests; output: HTTP DTOs | session service |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.ts` | Real personal adapter orchestration and envelope mapping | `startSession`, `getSessionQr`, `getSessionStatus`, `stopSession`, `subscribeInbound`, `sendOutbound` | input: session/outbound requests; output: normalized envelopes/send result | session client + auth store + mapper |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-personal/baileys-session-client.ts` (new) | SDK/socket lifecycle wrapper | `open`, `close`, `sendText`, `onMessage`, `onConnectionUpdate` | input: auth path/session config; output: low-level events | WhatsApp session SDK |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-personal/session-credential-store.ts` (new) | Persist and load personal auth material | `getSessionAuthPath`, `markSessionMeta`, `loadSessionMeta`, `deleteSession` | input: session id/meta; output: persisted state | fs/path/json |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-personal/session-state-mapper.ts` (new) | Map SDK connection events to canonical session state | `toSessionState`, `toStatusDto` | input: SDK state; output: API state | none |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-personal/inbound-envelope-mapper.ts` (new) | Convert provider inbound events into `ExternalMessageEnvelope` | `toExternalMessageEnvelope` | input: provider event; output: normalized envelope | `autobyteus-ts` parsers |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/bootstrap/create-gateway-app.ts` | Composition root | `createGatewayApp` | input: runtime config; output: wired app | services + adapters |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/config/runtime-config.ts` | Runtime flags + validation | `buildRuntimeConfig` | input: env; output: typed config | env parser |

## API Contract Changes (Gateway Admin)

Existing paths remain:
- `POST /api/channel-admin/v1/whatsapp/personal/sessions`
- `GET /api/channel-admin/v1/whatsapp/personal/sessions/:sessionId/qr`
- `GET /api/channel-admin/v1/whatsapp/personal/sessions/:sessionId/status`
- `DELETE /api/channel-admin/v1/whatsapp/personal/sessions/:sessionId`

Response contract alignment for web setup:
- `POST .../sessions` returns `{ sessionId, accountLabel, status }`.
- `GET .../qr` returns `{ code, expiresAt }`.
  - compatibility: temporarily include deprecated field `qr`.
- `GET .../status` returns `{ sessionId, accountLabel, status, updatedAt }`.

Canonical status values for personal mode:
- `PENDING_QR`
- `ACTIVE`
- `DEGRADED`
- `STOPPED`

Server callback endpoint consumed by server:
- `POST /api/server-callback/v1/messages`
- Payload contract: canonical `ExternalOutboundEnvelope` from `autobyteus-ts`.

## Configuration Additions

Add runtime config keys:
- `GATEWAY_WHATSAPP_PERSONAL_AUTH_ROOT` (credential root dir)
- `GATEWAY_WHATSAPP_PERSONAL_RECONNECT_MAX_ATTEMPTS`
- `GATEWAY_WHATSAPP_PERSONAL_RECONNECT_BASE_DELAY_MS`

Keep existing keys:
- `GATEWAY_WHATSAPP_PERSONAL_ENABLED`
- `GATEWAY_WHATSAPP_PERSONAL_QR_TTL_SECONDS`

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `channel-admin-route.ts` | session service | web client | Low | route only maps request/response |
| `whatsapp-personal-session-service.ts` | session adapter | route/bootstrap | Low | no SDK imports in service |
| `whatsapp-personal-adapter.ts` | client wrapper + credential store + mappers | inbound/outbound services | Medium | keep SDK details behind `baileys-session-client` |
| `baileys-session-client.ts` | SDK runtime | adapter only | Low | do not leak SDK types outside wrapper |
| `session-credential-store.ts` | fs/path | adapter only | Low | persistence only, no protocol logic |
| `session-state-mapper.ts` | none | adapter + route DTO | Low | pure mapping functions |

## Data Models (If Needed)

```ts
export type PersonalSessionStatus =
  | 'PENDING_QR'
  | 'ACTIVE'
  | 'DEGRADED'
  | 'STOPPED';

export interface PersonalSessionStatusDto {
  sessionId: string;
  accountLabel: string;
  status: PersonalSessionStatus;
  updatedAt: string;
}

export interface PersonalSessionQrDto {
  code: string;
  expiresAt: string;
  qr?: string; // deprecated compatibility
}
```

## Error Handling And Edge Cases
- QR requested before session emits QR: `409 SESSION_QR_NOT_READY`.
- Session create while another personal session is running: `409 SESSION_ALREADY_RUNNING`.
- QR expired: `410 SESSION_QR_EXPIRED`.
- Session missing: `404 SESSION_NOT_FOUND`.
- Personal feature disabled: `403 PERSONAL_SESSION_DISABLED`.
- SDK auth invalid/logged out: status transitions to `STOPPED` and requires restart/login.
- Outbound attempted when session not active: `503 SESSION_NOT_ACTIVE` with retryable hint.
- Server ingress unavailable during personal inbound forward: treat as transient forward failure and emit failure telemetry; no durable replay queue in phase 1.

## Performance / Security Considerations
- Persist session auth under dedicated gateway-owned path.
- Never log raw credentials or full provider payloads.
- Keep per-session in-memory state small; source of truth is credential store + active socket state.
- Serialize reconnect attempts per session; prevent parallel sockets for same session id.
- Respect transport-level idempotency in outbound callback path.

## Migration / Rollout (If Needed)
1. Add new personal session infrastructure modules.
2. Replace in-memory mock behavior in `whatsapp-personal-adapter.ts`.
3. Align channel-admin response DTOs to web expectations.
4. Add integration tests for real lifecycle contracts (SDK mocked at boundary).
5. Update README with real personal setup prerequisites and caveats.

## Defaults Chosen (Locked)
- Phase 1 personal-session scope: single active personal session per deployment by default; multi-account orchestration is deferred.
- Session SDK strategy: `baileys-session-client.ts` is the only SDK-facing boundary and the SDK version is pinned in lockfile during implementation kickoff.

## Design Feedback Loop Notes (From Implementation)

| Date | Trigger (File/Test/Blocker) | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-09 | Inspection of existing adapter | Mock logic mixed with production route contract | Introduced dedicated client wrapper + credential store boundaries | Updated |
| 2026-02-09 | Contract diff with web setup store | `qr` vs `code`, `READY` vs `ACTIVE` mismatch | Locked admin response DTO contract and canonical states | Updated |

## Open Questions
- None for phase 1.
