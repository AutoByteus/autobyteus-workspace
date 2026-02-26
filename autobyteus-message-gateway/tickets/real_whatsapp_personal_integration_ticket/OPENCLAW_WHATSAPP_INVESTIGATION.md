# OpenClaw WhatsApp Investigation (Real Integration Reference)

## Summary
This investigation validates how OpenClaw integrates WhatsApp and extracts decisions we should carry into AutoByteus.

Conclusion:
- OpenClaw uses two distinct WhatsApp channel strategies.
- Real personal WhatsApp integration is session/socket based (Baileys), not webhook based.
- Official WhatsApp Business/Cloud API integration is webhook based.
- Our current gateway personal adapter is a scaffold and must be replaced with real session/socket lifecycle code.

## Source Links
- OpenClaw WhatsApp docs: https://docs.openclaw.ai/channels/whatsapp
- OpenClaw quick start: https://docs.openclaw.ai/start/getting-started
- WhatsApp Cloud API examples (official business API style): https://whatsapp.github.io/WhatsApp-Nodejs-SDK/

## Findings Relevant To Our Architecture

1. OpenClaw separates business and personal modes
- Business mode uses webhook/API credentials.
- Personal mode uses a WhatsApp Web session client (Baileys).
- This matches our provider+transport model (`WHATSAPP + BUSINESS_API` vs `WHATSAPP + PERSONAL_SESSION`).

2. Personal mode requires a long-lived gateway listener
- Inbound events are socket-driven (`messages.upsert` style), not public webhook callbacks.
- Outbound send only works while the session listener is active.
- Gateway must own reconnect/backoff and keep the session alive.

3. Personal onboarding is QR/session lifecycle driven
- Real setup requires a generated QR and session authentication state persistence.
- Session credentials must survive process restarts.
- Admin setup APIs should expose session status transitions, QR refresh, and stop/logout.

4. Business API remains webhook-first
- Official business APIs are webhook + token based.
- This path is suitable for production/compliance use.
- Personal mode is ideal for local/personal setup speed but carries policy/compliance risk.

5. Runtime and reliability notes
- OpenClaw docs explicitly caution about runtime choice for WhatsApp personal mode reliability.
- Reconnect strategy, heartbeat, and bounded retries are mandatory for stable operation.

## Gap Between Investigation And Current Gateway

Current scaffold in `autobyteus-message-gateway`:
- Uses in-memory session map.
- Returns synthetic QR payload (`QR:<sessionId>`).
- Uses test helper methods to emit inbound events.

Therefore:
- Current personal mode is not a real WhatsApp connection.
- Setup docs/UX can appear valid while message transport is simulated.

## Architecture Direction Chosen

We will support both modes under one gateway abstraction:
- `BUSINESS_API` (official webhook/API mode)
- `PERSONAL_SESSION` (real WhatsApp Web session mode)

The gateway remains the only channel-facing process.
`autobyteus-server-ts` and `autobyteus-web` stay transport-agnostic and consume normalized channel contracts.

## Design Constraints For Implementation

- Keep provider-specific protocol details in adapters only.
- Keep all outbound routing keyed by `(provider, transport)`.
- Persist personal auth/session material in a dedicated store module.
- Do not re-introduce server-side conversation persistence; external-channel source context should remain separate from memory history.
- Keep setup UI focused on onboarding/configuration, not full monitoring.
