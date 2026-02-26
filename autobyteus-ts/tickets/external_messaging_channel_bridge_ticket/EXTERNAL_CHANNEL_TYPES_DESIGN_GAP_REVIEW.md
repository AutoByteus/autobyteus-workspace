# Design Gap Review (External Channel Types - autobyteus-ts)

## Review Input
- `EXTERNAL_CHANNEL_TYPES_DESIGN.md`
- `EXTERNAL_CHANNEL_TYPES_RUNTIME_SIMULATION.md`

## Findings

1. **Attachment schema underspecified**
- Risk: adapters encode attachments inconsistently.
- Fix:
  - Add `src/external-channel/external-attachment.ts` with explicit fields and parser.

2. **Metadata versioning missing**
- Risk: future schema evolution can break backwards compatibility silently.
- Fix:
  - Add `schemaVersion` field to `AgentExternalSourceMetadata`.

3. **Parse errors missing machine-readable codes**
- Risk: APIs cannot map validation failures to consistent HTTP/application error responses.
- Fix:
  - Add typed parse error class with `code`.

4. **Outbound chunking contract missing**
- Risk: long text handling diverges across adapters.
- Fix:
  - Add optional `chunks` field and chunk strategy type in outbound envelope contract.

5. **Single-provider multi-transport ambiguity (WhatsApp)**
- Risk: business and personal WhatsApp flows become indistinguishable in downstream routing/observability.
- Fix:
  - Add `ExternalChannelTransport` enum in shared contracts.
  - Require transport in inbound/outbound envelopes and external-source metadata.

## Separation-of-Concern Verdict
- Current SoC is good.
- Required fixes are additive and keep `autobyteus-ts` pure and framework-agnostic.

## Required Design Updates
- Update type-file list and API contracts with explicit attachment model, parse error class, metadata version, and outbound chunking contract.
