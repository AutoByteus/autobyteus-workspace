# Simulated Runtime Call Stacks (External Channel Types - autobyteus-ts)

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint
  - `[ASYNC]` async boundary
  - `[STATE]` in-memory transformation
  - `[IO]` external IO (not expected in this package)
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` validation/error branch

## Use Case Index

- Use Case 1: Parse inbound provider payload into canonical envelope (with transport).
- Use Case 2: Build and parse agent external-source metadata.
- Use Case 3: Parse outbound callback payload with chunk contract.
- Use Case 4: Reject transport/provider mismatch for WhatsApp payloads.

---

## Use Case 1: Parse Inbound Provider Payload Into Canonical Envelope (With Transport)

### Goal
Convert unknown provider-adapter output into a strict `ExternalMessageEnvelope` with validated fields.

### Preconditions
- Adapter extracted raw payload object.

### Expected Outcome
- Valid input returns `ExternalMessageEnvelope`.
- Invalid input throws `ExternalChannelParseError` with code.

### Primary Runtime Call Stack

```text
[ENTRY] src/external-channel/external-message-envelope.ts:parseExternalMessageEnvelope(input)
├── src/external-channel/provider.ts:parseExternalChannelProvider(input.provider) [STATE]
├── src/external-channel/channel-transport.ts:parseExternalChannelTransport(input.transport) [STATE]
├── src/external-channel/peer-type.ts:parseExternalPeerType(input.peerType) [STATE]
├── src/external-channel/external-attachment.ts:parseExternalAttachmentList(input.attachments) [STATE]
├── src/external-channel/channel-routing-key.ts:createChannelRoutingKey({ provider, transport, accountId, peerId, threadId }) [STATE]
└── src/external-channel/external-message-envelope.ts:freezeEnvelope(envelope) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if optional threadId is absent
src/external-channel/external-message-envelope.ts:parseExternalMessageEnvelope(...)
└── normalize threadId -> null
```

```text
[ERROR] invalid provider or peer type
src/external-channel/provider.ts:parseExternalChannelProvider(...)
└── src/external-channel/errors.ts:throwParseError(code="INVALID_PROVIDER")
```

```text
[ERROR] invalid transport enum
src/external-channel/channel-transport.ts:parseExternalChannelTransport(...)
└── src/external-channel/errors.ts:throwParseError(code="INVALID_TRANSPORT")
```

```text
[ERROR] invalid attachment object
src/external-channel/external-attachment.ts:parseExternalAttachment(...)
└── src/external-channel/errors.ts:throwParseError(code="INVALID_ATTACHMENT")
```

### State And Data Transformations

- `unknown` input -> typed primitives.
- typed primitives -> `ExternalAttachment[]`.
- validated fields (including transport) -> immutable `ExternalMessageEnvelope`.

### Observability And Debug Points

- This package emits no logs/metrics by design.
- Caller should map `ExternalChannelParseError.code` to API/log policy.

### Design Smells / Gaps

- No blocking smell in Phase 1 after enforcing parse-error-code mapping policy in gateway/server ingress handlers.

### Default Decisions

- Phase 1 contract uses throw-based parsers only; `safeParse` helpers are deferred.

---

## Use Case 2: Build And Parse Agent External-Source Metadata

### Goal
Create stable metadata for `AgentInputUserMessage.metadata` and recover it later without provider coupling.

### Preconditions
- Valid `ExternalMessageEnvelope` available.

### Expected Outcome
- Metadata includes stable source fields and `schemaVersion`.
- Parse can recover metadata from generic dictionary.

### Primary Runtime Call Stack

```text
[ENTRY] src/agent/message/external-source-metadata.ts:buildAgentExternalSourceMetadata(envelope)
├── src/external-channel/channel-routing-key.ts:createChannelRoutingKey({ provider, transport, accountId, peerId, threadId }) [STATE]
└── src/agent/message/external-source-metadata.ts:returnMetadata({ schemaVersion, source, transport, routingKey }) [STATE]

[ENTRY] src/agent/message/agent-input-user-message.ts:getExternalSourceMetadata()
└── src/agent/message/external-source-metadata.ts:parseAgentExternalSourceMetadata(this.metadata) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] metadata exists but no external source block
src/agent/message/external-source-metadata.ts:parseAgentExternalSourceMetadata(...)
└── return null
```

```text
[ERROR] schemaVersion unsupported
src/agent/message/external-source-metadata.ts:parseAgentExternalSourceMetadata(...)
└── src/external-channel/errors.ts:throwParseError(code="UNSUPPORTED_SCHEMA_VERSION")
```

### State And Data Transformations

- Envelope -> source metadata structure.
- Generic metadata dictionary -> typed source metadata or `null`.

### Observability And Debug Points

- No logging in shared type package.
- Caller should emit warning when metadata parse returns `null` for channel-originated flow.

### Design Smells / Gaps

- No blocking smell in Phase 1 because only `schemaVersion=1` is supported and unsupported versions hard-fail.

### Default Decisions

- Unsupported schema versions are rejected; no downgrade transforms in Phase 1.

---

## Use Case 3: Parse Outbound Callback Payload With Chunk Contract

### Goal
Validate outbound callback payload shape including optional chunk plans for long channel replies.

### Preconditions
- Callback payload supplied by server reply-callback service.

### Expected Outcome
- Parsed envelope enforces required fields.
- Chunk contract is normalized if present.

### Primary Runtime Call Stack

```text
[ENTRY] src/external-channel/external-outbound-envelope.ts:parseExternalOutboundEnvelope(input)
├── src/external-channel/provider.ts:parseExternalChannelProvider(input.provider) [STATE]
├── src/external-channel/channel-transport.ts:parseExternalChannelTransport(input.transport) [STATE]
├── src/external-channel/external-attachment.ts:parseExternalAttachmentList(input.attachments) [STATE]
├── src/external-channel/external-outbound-envelope.ts:parseChunkPlan(input.chunks) [STATE]
└── src/external-channel/external-outbound-envelope.ts:returnEnvelope(envelope) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] no chunks provided
src/external-channel/external-outbound-envelope.ts:parseExternalOutboundEnvelope(...)
└── normalize chunks -> []
```

```text
[ERROR] correlation id missing
src/external-channel/external-outbound-envelope.ts:parseExternalOutboundEnvelope(...)
└── src/external-channel/errors.ts:throwParseError(code="MISSING_CORRELATION_ID")
```

```text
[ERROR] callback idempotency key missing
src/external-channel/external-outbound-envelope.ts:parseExternalOutboundEnvelope(...)
└── src/external-channel/errors.ts:throwParseError(code="MISSING_CALLBACK_IDEMPOTENCY_KEY")
```

### State And Data Transformations

- Unknown callback body -> typed outbound envelope.
- Optional chunk plan -> normalized chunk sequence.

### Observability And Debug Points

- None in package; caller handles telemetry.

### Design Smells / Gaps

- No blocking smell after explicitly keeping provider size-limit policy in adapter layer only.

### Default Decisions

- Provider size limits remain adapter-owned; shared chunk contract stays provider-agnostic.
- Outbound envelope parser enforces explicit transport even when provider is already known.

---

## Use Case 4: Reject Transport/Provider Mismatch For WhatsApp Payloads

### Goal
Prevent ambiguous routing by rejecting WhatsApp payloads tagged with unsupported transport values.

### Preconditions
- Input provider is `WHATSAPP`.

### Expected Outcome
- Business and personal transports pass.
- Unknown or conflicting transport values fail fast.

### Primary Runtime Call Stack

```text
[ENTRY] src/external-channel/external-message-envelope.ts:parseExternalMessageEnvelope(input)
├── src/external-channel/provider.ts:parseExternalChannelProvider(input.provider) [STATE]
├── src/external-channel/channel-transport.ts:parseExternalChannelTransport(input.transport) [STATE]
└── src/external-channel/external-message-envelope.ts:assertProviderTransportCompatibility(provider, transport) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] legacy payload without transport from migration replay
src/external-channel/external-message-envelope.ts:parseExternalMessageEnvelope(...)
└── normalize transport -> BUSINESS_API only when replayContext=true
```

```text
[ERROR] incompatible transport/provider pair
src/external-channel/external-message-envelope.ts:assertProviderTransportCompatibility(...)
└── src/external-channel/errors.ts:throwParseError(code="INCOMPATIBLE_TRANSPORT_PROVIDER")
```

### State And Data Transformations

- Provider + transport -> validated compatibility decision.

### Observability And Debug Points

- No in-package logs; caller maps parse code to `400` and warning metric.

### Design Smells / Gaps

- No blocking smell after centralizing compatibility assertions in shared parser layer.

### Default Decisions

- Compatibility assertion stays in `autobyteus-ts` parser layer, not gateway/service layer.
