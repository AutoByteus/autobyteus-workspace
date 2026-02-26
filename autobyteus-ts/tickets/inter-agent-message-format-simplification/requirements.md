# Requirements - inter-agent-message-format-simplification

## Goal / Problem
Received inter-agent messages are injected into recipient agents as overly verbose pseudo-system text (`Sender Agent ID`, `Message Type`, `Recipient Role Name`, section delimiters). This is unnatural and adds redundant noise. Users want a simple, human-like transfer: sender + message content.

## Scope Triage
- Size: `Small`
- Rationale: `autobyteus-ts` message formatting and tool argument semantics update; no required schema migration.

## In-Scope Use Cases
1. Recipient agent receives a direct inter-agent message and gets concise content: sender identity + message body.
2. Sender identity is always rendered with one strict template: readable sender name line + explicit sender ID line + message body.
3. `send_message_to` no longer forces rigid `message_type`; omission defaults to a generic direct message type.

## Acceptance Criteria
1. Inter-agent injected text removes `Message Type` and `Recipient Role Name` lines and section-divider boilerplate.
2. Injected text always uses one format:
   - `You received a message from <SenderName-or-ID>.`
   - `Sender ID: <sender_id>`
   - `Message: <content>`
3. `send_message_to` schema no longer requires `message_type`; omitting it still dispatches successfully.
4. Unit tests cover new format and optional message_type behavior.

## Constraints / Dependencies
- Preserve routing/event pipeline behavior for existing dispatch flow.
- Keep inter-agent event metadata (`message_type`) available for stream/debug channels even if not surfaced in injected prompt text.
- No backward-compat branches; update behavior directly.

## Assumptions
- Team runtime context is injected into member agents (`customData.teamContext`) and can resolve sender IDs to member names for local members.
- If sender name is unavailable at runtime, sender ID is used as the sender-name value, while keeping the same strict template (no alternate fallback template).

## Open Questions / Risks
- Distributed remote sender-name resolution may not always map to display name without extra uplink metadata; sender ID will appear in the sender-name position, but template remains unchanged.
