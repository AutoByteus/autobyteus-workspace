# Simulated Runtime Call Stacks (Gateway Peer Discovery)

## Simulation Basis
- Design source:
  - `/Users/normy/autobyteus_org/autobyteus-message-gateway/tickets/external_messaging_binding_ux_ticket/WHATSAPP_PERSONAL_PEER_DISCOVERY_DESIGN.md`

## Conventions
- Frame: `path/to/file.ts:functionName(...)`
- Tags: `[ENTRY] [ASYNC] [STATE] [IO] [FALLBACK] [ERROR]`

## Use Case 1: Observe DM Peer And List Candidates

```text
[ENTRY] src/infrastructure/adapters/whatsapp-personal/baileys-session-client.ts:onInboundMessage(event)
└── src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.ts:handleInboundMessage(record, event) [ASYNC]
    ├── src/infrastructure/adapters/whatsapp-personal/personal-peer-candidate-index.ts:recordObservation(sessionId, observation) [STATE]
    ├── src/infrastructure/adapters/whatsapp-personal/inbound-envelope-mapper.ts:toExternalMessageEnvelope(event) [STATE]
    └── src/application/services/session-inbound-bridge-service.ts:handleSessionEnvelope(envelope) [ASYNC]

[ENTRY] src/http/routes/channel-admin-route.ts:GET /api/channel-admin/v1/whatsapp/personal/sessions/:sessionId/peer-candidates
└── src/application/services/whatsapp-personal-session-service.ts:listPersonalSessionPeerCandidates(sessionId, options) [ASYNC]
    └── src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.ts:listSessionPeerCandidates(sessionId, options) [STATE]
        └── src/infrastructure/adapters/whatsapp-personal/personal-peer-candidate-index.ts:listCandidates(...) [STATE]
```

Verification:
- End-to-end for discoverability: Pass
- Separation of concerns: Pass

## Use Case 2: Observe Group Peer Candidate

```text
[ENTRY] baileys-session-client.ts:onInboundMessage(event with chatJid @g.us)
└── whatsapp-personal-adapter.ts:handleInboundMessage(...) [ASYNC]
    ├── personal-peer-candidate-index.ts:recordObservation({
    │     peerId: participantJid ?? senderJid,
    │     threadId: chatJid,
    │     peerType: GROUP
    │   }) [STATE]
    └── inbound-envelope-mapper.ts:toExternalMessageEnvelope(event) [STATE]
```

Verification:
- Group binding fields resolved from one source: Pass
- File ownership clear: Pass

## Use Case 3: No Inbound Yet

```text
[ENTRY] channel-admin-route.ts:GET .../peer-candidates
└── whatsapp-personal-session-service.ts:listPersonalSessionPeerCandidates(...) [ASYNC]
    └── whatsapp-personal-adapter.ts:listSessionPeerCandidates(...) [STATE]
        └── personal-peer-candidate-index.ts:listCandidates(...) => [] [STATE]
```

Verification:
- Expected empty setup state is explicit: Pass
- Operator guidance implies external sender is required (self-sent messages are filtered): Pass

## Use Case 4: Session Missing Or Disabled

```text
[ENTRY] channel-admin-route.ts:GET .../peer-candidates
└── whatsapp-personal-session-service.ts:listPersonalSessionPeerCandidates(...) [ASYNC]
    ├── [ERROR] PERSONAL_SESSION_DISABLED
    └── [ERROR] SESSION_NOT_FOUND
```

Verification:
- Error branches deterministic and route-local: Pass

## Use Case 5: Self-Sent Messages Do Not Produce Peer Candidates

```text
[ENTRY] src/infrastructure/adapters/whatsapp-personal/baileys-session-client.ts:onInboundMessage(event)
└── mapInboundMessage(...) marks fromMe=true [STATE]
    └── baileys-session-client.ts:open(...) listener skips mapped.fromMe events [FALLBACK]
        └── whatsapp-personal-adapter.ts:handleInboundMessage(...) is not called
```

Verification:
- Behavior is explicit and consistent with inbound dispatch policy: Pass
- UX implication (requires external sender for discovery) is documented: Pass

## Use Case 6: Admin Token Gate On Peer-Candidate Route

```text
[ENTRY] src/http/routes/channel-admin-route.ts:GET .../peer-candidates
└── src/http/middleware/require-admin-token.ts:requireAdminToken(request, reply) [STATE]
    ├── [FALLBACK] token valid -> continue route handler
    └── [ERROR] token missing/invalid -> 401 ADMIN_TOKEN_REQUIRED
```

Verification:
- Setup surface access control is deterministic: Pass
- Auth concern remains middleware-local: Pass

## Design Smell Check
- Cross-cutting leakage: None detected
- Adapter vs route/service responsibility mixing: None detected
- Hidden coupling to server binding: None detected
