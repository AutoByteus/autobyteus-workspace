# External Channel Shared Types Design (autobyteus-ts)

## Goal
Define shared, strongly typed contracts for external channel messaging so `autobyteus-message-gateway` and `autobyteus-server-ts` can communicate through stable interfaces.

## Scope
- In scope:
  - Common provider enums and envelope types.
  - Common transport-mode enum for official API vs personal session channels.
  - Validation helpers for inbound and outbound payloads.
  - Metadata helpers for `AgentInputUserMessage` source attribution.
- Out of scope:
  - Provider HTTP clients.
  - Fastify route definitions.

## Separation-of-Concern Principles
1. `autobyteus-ts` only provides framework-agnostic types and pure helpers.
2. No network calls in this module.
3. No persistence concerns in this module.
4. Validation helpers remain deterministic and side-effect free.

## File-Level Design

### External Channel Type Surface

#### `src/external-channel/provider.ts` (new)
- Concern: external channel provider enumeration.
- Public APIs:
  - `enum ExternalChannelProvider { WHATSAPP, WECOM }`

#### `src/external-channel/channel-transport.ts` (new)
- Concern: normalized transport mode for provider delivery path.
- Public APIs:
  - `enum ExternalChannelTransport { BUSINESS_API, PERSONAL_SESSION }`
  - `function parseExternalChannelTransport(input: unknown): ExternalChannelTransport`

#### `src/external-channel/peer-type.ts` (new)
- Concern: standardized peer kinds.
- Public APIs:
  - `enum ExternalPeerType { USER, GROUP, CHANNEL }`

#### `src/external-channel/external-message-envelope.ts` (new)
- Concern: canonical inbound message contract.
- Public APIs:
  - `type ExternalMessageEnvelope`
  - `type ExternalMessageEnvelopeInput`
  - `function parseExternalMessageEnvelope(input: unknown): ExternalMessageEnvelope`

Expected fields:
- `provider`
- `transport`
- `accountId`
- `peerId`
- `peerType`
- `threadId | null`
- `externalMessageId`
- `content`
- `attachments[]`
- `receivedAt`
- `metadata`

#### `src/external-channel/external-attachment.ts` (new)
- Concern: canonical attachment contract used by inbound/outbound envelopes.
- Public APIs:
  - `type ExternalAttachment`
  - `function parseExternalAttachment(input: unknown): ExternalAttachment`

#### `src/external-channel/external-outbound-envelope.ts` (new)
- Concern: canonical outbound callback contract.
- Public APIs:
  - `type ExternalOutboundEnvelope`
  - `function parseExternalOutboundEnvelope(input: unknown): ExternalOutboundEnvelope`

Expected fields:
- `provider`
- `transport`
- `accountId`
- `peerId`
- `threadId | null`
- `correlationMessageId`
- `callbackIdempotencyKey`
- `replyText`
- `attachments[]`
- `chunks[]` (optional provider chunk plan for long responses)
- `metadata`

#### `src/external-channel/errors.ts` (new)
- Concern: machine-readable parse errors for contract validation.
- Public APIs:
  - `class ExternalChannelParseError extends Error`
  - `type ExternalChannelParseErrorCode`

#### `src/external-channel/external-delivery-event.ts` (new)
- Concern: canonical delivery status contract.
- Public APIs:
  - `enum ExternalDeliveryStatus`
  - `type ExternalDeliveryEvent`
  - `function parseExternalDeliveryEvent(input: unknown): ExternalDeliveryEvent`

#### `src/external-channel/channel-routing-key.ts` (new)
- Concern: deterministic routing key derivation helper.
- Public APIs:
  - `type ChannelRoutingKey`
  - `function createChannelRoutingKey(input: { provider; transport; accountId; peerId; threadId? }): ChannelRoutingKey`

### Agent Message Metadata Bridge

#### `src/agent/message/external-source-metadata.ts` (new)
- Concern: source metadata shape for `AgentInputUserMessage.metadata`.
- Public APIs:
  - `type AgentExternalSourceMetadata`
  - `function buildAgentExternalSourceMetadata(envelope: ExternalMessageEnvelope): AgentExternalSourceMetadata`
  - `function parseAgentExternalSourceMetadata(input: unknown): AgentExternalSourceMetadata | null`

Required field:
- `schemaVersion: number`
- `transport: ExternalChannelTransport`

#### `src/agent/message/agent-input-user-message.ts` (modify)
- Concern: message value object.
- Change:
  - keep `metadata` generic for compatibility.
  - add helper method:
    - `getExternalSourceMetadata(): AgentExternalSourceMetadata | null`

### Exports

#### `src/external-channel/index.ts` (new)
- Concern: barrel export for external channel module.
- Public APIs:
  - exports all new types/helpers.

#### `src/index.ts` (modify)
- Concern: package root export surface.
- Change:
  - export external channel module.

## Existing Files Explicitly Involved
- `src/agent/message/agent-input-user-message.ts` (small additive API)
- `src/index.ts` (export wiring)

## Validation and Error Policy
- Parse helpers throw `ExternalChannelParseError` with machine-readable error code.
- Unknown optional metadata fields are preserved in `metadata` bags.
- Enum parsing defaults are not allowed for provider and peer type; invalid values are hard errors.
- Transport value is required for WhatsApp envelopes and optional for legacy backfill payloads from migration scripts.

## Testing Strategy
- Unit tests for parse helpers with valid/invalid fixtures.
- Unit tests for routing key determinism.
- Unit tests for `buildAgentExternalSourceMetadata` round-trip behavior.
- Unit tests for parse error codes.
- Unit tests for outbound chunk contract compatibility.

## Pre-Implementation Blocking Gate
- Shared-contract implementation follows cross-project validation matrix in:
  - `/Users/normy/autobyteus_org/autobyteus-message-gateway/tickets/external_messaging_channel_bridge_ticket/PRE_IMPLEMENTATION_VALIDATION_GATE.md`
- Contract changes are blocked until P0 transport and callback-idempotency scenarios pass.

## Refinements After Runtime Simulation
1. Add explicit attachment model to avoid adapter-level schema drift.
2. Add `schemaVersion` in metadata for forward-compatible evolution.
3. Replace generic type errors with coded parse errors.
4. Add optional outbound chunking contract for long-message providers.
5. Add explicit channel-transport enum so one provider can support both official API and personal-session paths.
