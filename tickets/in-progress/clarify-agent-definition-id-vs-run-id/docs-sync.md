# Docs Sync

## Outcome

- Product documentation impact: `Managed messaging product docs updated`
- Ticket artifact impact: `Updated`

## Rationale

- This ticket changes internal/server-web contract naming within the paired messaging/external-channel implementation.
- During validation, a follow-on documentation gap was identified around the managed Telegram flow and the user-facing meaning of runtime-scoped IDs.
- The effective documentation for the change is captured in the ticket artifacts:
  - `requirements.md`
  - `proposed-design.md`
  - `future-state-runtime-call-stack.md`
  - `implementation-progress.md`
  - `code-review.md`
- Public docs were updated to keep the managed messaging flow aligned with the implemented UI:
  - `autobyteus-web/README.md`
  - `autobyteus-web/docs/settings.md`
  - `autobyteus-web/docs/messaging.md`
  - `autobyteus-message-gateway/README.md`

## User-Facing Surface

- User-facing messaging docs now describe the gateway-first layout, Telegram polling as the recommended default, and `Telegram account id` as a stable binding identifier rather than a Telegram numeric ID.
- Channel-binding and verification labels continue to describe runtime IDs more precisely.
