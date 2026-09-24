# Docs Sync

## Updated Docs

- `autobyteus-web/docs/messaging.md`
- `autobyteus-web/README.md`
- `autobyteus-message-gateway/README.md`

## Coverage

- Managed messaging page hierarchy now documents:
  - gateway runtime first
  - provider configuration as a persistent section
  - binding and verification below it
- Managed Telegram is documented as polling-only in the product path.
- Managed non-WeChat provider activation is documented as save-driven and restart-persistent, with no extra provider enable switch.
- Telegram account entry is described as an internal account label, not a Telegram numeric chat ID.
- Delivery/reliability documentation now calls out:
  - queue heartbeat visibility
  - dead-letter counters
  - critical lock-loss behavior

## Remaining Gap

- Real-credential Telegram acceptance still needs a manual runbook execution. The docs now describe that acceptance path explicitly, but they do not replace an actual live bot test.
