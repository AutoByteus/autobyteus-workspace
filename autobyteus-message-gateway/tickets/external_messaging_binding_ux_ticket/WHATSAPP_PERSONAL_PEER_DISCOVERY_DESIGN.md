# Design Document (Gateway Peer Discovery For Binding UX)

## Summary
Current setup requires the user to manually type `peerId`, which is not discoverable for non-technical users. This ticket adds a setup-only peer discovery surface in `autobyteus-message-gateway` so web can show a dropdown of real observed WhatsApp identities.

The gateway remains provider-facing and session-aware; server remains routing/runtime owner.

## Goals
- Make `peerId` discoverable from real inbound WhatsApp traffic.
- Keep peer discovery isolated from transport dispatch logic.
- Keep API setup-only (read-only list, no runtime chat management).
- Preserve existing inbound/outbound message contracts.

## Non-Goals
- No changes to server binding resolution rules.
- No chat history export API.
- No multi-session orchestration redesign in this ticket.

## Use Cases
- Use Case 1: User has active personal session, receives a message from a contact, then fetches peer candidates.
- Use Case 2: User receives group message; candidate includes `peerId` + `threadId` to support group binding.
- Use Case 3: No inbound traffic yet; API returns empty list with actionable status.
- Use Case 4: Session stopped/missing; API returns deterministic error.
- Use Case 5: User sends message from the linked account itself; no candidate is added because `fromMe` events are filtered.
- Use Case 6: Admin token is configured; unauthorized peer-candidate requests are rejected.

## File-Level Design (Separation of Concerns)

| File | Concern | APIs | Input -> Output |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/domain/models/session-peer-candidate.ts` (new) | Canonical peer-candidate model for setup | `PersonalSessionPeerCandidate`, `ListSessionPeerCandidatesResult` | inbound observation metadata -> setup DTO contract |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/domain/models/session-provider-adapter.ts` | Session adapter contract | add `listSessionPeerCandidates(sessionId, options)` | session id/options -> peer candidate list |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-personal/personal-peer-candidate-index.ts` (new) | Bounded in-memory index for discovered peers per session | `recordObservation`, `listCandidates`, `clearSession` | raw peer observation -> deduplicated/sorted candidates |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-personal/baileys-session-client.ts` | WhatsApp event extraction | extend inbound event shape with optional display metadata (`pushName`) | socket message event -> normalized inbound event |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.ts` | Session orchestration + provider mapping | implement `listSessionPeerCandidates`; call index `recordObservation` in inbound path | inbound event/session id -> peer index updates and query responses |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/application/services/whatsapp-personal-session-service.ts` | Feature-gated session admin orchestration | add `listPersonalSessionPeerCandidates(sessionId, options)` | route input -> adapter output |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/http/routes/channel-admin-route.ts` | Setup/admin HTTP surface | add `GET /api/channel-admin/v1/whatsapp/personal/sessions/:sessionId/peer-candidates` | request params/query -> JSON response |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/http/middleware/require-admin-token.ts` (new) | Setup admin auth gate | `requireAdminToken(request, reply)` | request headers -> allow/deny |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/config/runtime-config.ts` | Runtime setup/admin knobs | add `whatsappPersonalPeerCandidateLimit`, `adminToken` | env -> typed config |

## API Contract Additions

### New Endpoint
- `GET /api/channel-admin/v1/whatsapp/personal/sessions/:sessionId/peer-candidates`

### Query Params
- `limit?: number` default `50`, max `200`
- `includeGroups?: boolean` default `true`

### Response
```json
{
  "sessionId": "wa-personal-...",
  "accountLabel": "Home WhatsApp",
  "status": "ACTIVE",
  "updatedAt": "2026-02-09T09:00:00.000Z",
  "items": [
    {
      "peerId": "491701234567@s.whatsapp.net",
      "peerType": "USER",
      "threadId": null,
      "displayName": "Alice",
      "lastMessageAt": "2026-02-09T08:57:11.000Z"
    }
  ]
}
```

## Behavior Rules
- Candidates are derived only from observed inbound events for that session.
- Messages marked `fromMe=true` are not indexed as peer candidates.
- Direct chat:
  - `peerId = senderJid`
  - `threadId = null`
- Group chat:
  - `peerId = participantJid ?? senderJid`
  - `threadId = chatJid`
- Index is bounded, deduplicated by `(peerId, threadId)` and sorted by `lastMessageAt desc`.
- Stop-session clears index for that session.

## Error Handling
- `403 PERSONAL_SESSION_DISABLED`
- `404 SESSION_NOT_FOUND`
- `400 INVALID_REQUEST` for bad `limit`/query values
- `401 ADMIN_TOKEN_REQUIRED` for missing/invalid admin token when auth gate enabled
- `500 CHANNEL_ADMIN_INTERNAL_ERROR` for unexpected failures

## Security And Privacy
- Endpoint remains admin/setup scoped.
- No message body is exposed in candidate DTO.
- No raw credential/session secrets are emitted.
- Admin route auth gate is enabled when `GATEWAY_ADMIN_TOKEN` is configured.

## Defaults
- Keep candidates in memory only (phase 1).
- Keep candidate TTL aligned to process lifetime.
- Default `includeGroups=true` to cover both DM and group onboarding.
- Admin auth gate defaults to disabled when `GATEWAY_ADMIN_TOKEN` is unset (local-dev compatibility).

## Notes
This design intentionally keeps peer-discovery in gateway because gateway is the only layer that can observe provider identity shape before server binding succeeds.
