# Design Document (autobyteus-ts: WeChat Personal + WeCom App Types)

## Summary
Extend shared external-channel types so AutoByteus can support:
- `WECOM` business API routing for WeCom app bridge mode.
- optional direct `WECHAT` personal-session routing for experimental RPA mode.

This module remains pure type/parse logic only.

## Goals
- Add canonical provider enum support for `WECHAT` without breaking current providers.
- Keep `BUSINESS_API` and `PERSONAL_SESSION` transport model unchanged.
- Preserve deterministic parse errors and shared contract safety.

## Non-Goals
- No HTTP client code.
- No persistence code.
- No provider-specific protocol logic.

## Requirements And Use Cases
- Use Case 1: Parse inbound envelope for `WECOM + BUSINESS_API` (WeCom app bridge).
- Use Case 2: Parse inbound envelope for `WECHAT + PERSONAL_SESSION` (experimental direct mode).
- Use Case 3: Parse outbound callback envelopes for both routes.

## Architecture Overview
Shared type surface continues to enforce normalized routing contracts:
`provider + transport + accountId + peerId (+ threadId)`.

## File And Module Breakdown

| File/Module | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-ts/src/external-channel/provider.ts` | Canonical provider enum/parser | `ExternalChannelProvider`, `parseExternalChannelProvider` | input: unknown -> output: enum | `errors.ts` |
| `/Users/normy/autobyteus_org/autobyteus-ts/src/external-channel/external-message-envelope.ts` | Canonical inbound envelope parse | `parseExternalMessageEnvelope` | input: unknown -> output: typed envelope | provider/transport parsers |
| `/Users/normy/autobyteus_org/autobyteus-ts/src/external-channel/external-outbound-envelope.ts` | Canonical outbound envelope parse | `parseExternalOutboundEnvelope` | input: unknown -> output: typed envelope | provider/transport parsers |
| `/Users/normy/autobyteus_org/autobyteus-ts/src/external-channel/channel-routing-key.ts` | Deterministic routing key | `createChannelRoutingKey` | input: routing fields -> output: key | none |
| `/Users/normy/autobyteus_org/autobyteus-ts/tests/unit/external-channel/provider.test.ts` | Provider parse coverage | parser tests | enum + invalid inputs | vitest |
| `/Users/normy/autobyteus_org/autobyteus-ts/tests/unit/external-channel/external-message-envelope.test.ts` | Inbound envelope coverage | parse tests | provider/transport combos | vitest |
| `/Users/normy/autobyteus_org/autobyteus-ts/tests/unit/external-channel/external-outbound-envelope.test.ts` | Outbound envelope coverage | parse tests | provider/transport combos | vitest |

## Public API Changes

1. `ExternalChannelProvider` adds:
- `WECHAT = 'WECHAT'`

2. `parseExternalChannelProvider(...)` accepts `WECHAT`.

No transport enum change in this ticket.

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `provider.ts` | `errors.ts` | gateway/server/web shared parsing | Low | keep enum+parser only |
| envelope parsers | provider+transport parsers | gateway/server ingress/callback layers | Low | no runtime/provider IO |
| routing-key helper | none | gateway/server routing | Low | pure deterministic helper |

## Error Handling And Edge Cases
- Unknown provider -> `INVALID_PROVIDER` parse error.
- Unknown transport -> `INVALID_TRANSPORT` parse error.
- Empty accountId/peerId/message fields -> parse hard error.

## Performance / Security Considerations
- Pure parsing, no IO.
- No sensitive-data handling changes.

## Migration / Rollout
1. Add enum/parser support.
2. Update tests for provider parsing and envelope parsing.
3. Release shared package version consumed by gateway/server.

## Open Questions
- None for type layer.
