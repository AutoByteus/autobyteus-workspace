# Proposed Design

## Summary

Harden the managed Telegram product path around one explicit rule:

- managed Telegram in AutoByteus is a polling-first, node-owned capability

The gateway already has broader Telegram support, but the managed product flow should only expose what the server-managed runtime can actually own reliably.

## Design Decisions

### 1. Managed Telegram becomes polling-only

Decision:

- keep raw gateway webhook support for direct operator/runtime use
- remove webhook controls from the normal managed UI flow
- normalize managed Telegram config to polling mode on the server side

Why:

- the managed server launches the gateway on `127.0.0.1`
- no server-owned public webhook ingress/proxy exists today
- leaving webhook controls in the managed UI creates a false-success path

Implementation direction:

- web: remove managed Telegram webhook controls and replace them with a polling-mode note
- server: coerce managed Telegram config to `polling=true`, `webhook=false`, `secret=null`
- docs: explain that webhook remains a low-level/operator path, not the standard managed product path

### 2. Provider account scope must synchronize immediately after save

Decision:

- keep `providerScopeStore` for selected-provider navigation
- synchronize Discord/Telegram account scope from the latest managed gateway status whenever managed status changes

Why:

- binding and verification currently read provider-scope account ids
- provider config save only updates gateway status/config
- the page must not require a full bootstrap/refresh before binding reflects the saved Telegram account id

Implementation direction:

- add a provider-scope synchronization path driven from `gatewayStore.managedStatus`
- keep available-provider selection behavior intact
- ensure binding draft/account hints and verification scope use the synchronized account id immediately after save

### 2a. Managed provider activation is inferred from valid configuration

Decision:

- keep one global managed-gateway enable/disable control
- remove provider-specific enable toggles from the managed UI for `WHATSAPP`, `WECOM`, `DISCORD`, and `TELEGRAM`
- treat those providers as active whenever their required configuration is present
- coerce legacy persisted `...Enabled=false` values into the new inferred-enable model

Why:

- live Telegram testing showed the extra provider checkbox is easy to miss
- valid credentials plus `...Enabled=false` created a false-negative setup state
- the user expectation is: configure provider once, save, restart later, and it still works

Implementation direction:

- web: remove provider enable checkboxes and update copy so saving valid config is the activation step
- web: default the managed provider flags to enabled internally so save payloads are aligned with the new rule
- server: normalize non-WeChat provider flags to enabled regardless of stale stored false values
- server/runtime: compute effective provider enablement from valid config presence rather than a second explicit opt-in
- migration behavior: old saved configs recover automatically on next read/save without a manual data migration

### 3. Verification needs a provider-readiness check

Decision:

- add an explicit `provider` verification check before binding/runtime checks

Why:

- current verification only checks generic scaffolding
- it can miss that Telegram itself is not effectively configured/enabled

Implementation direction:

- extend verification model with `provider`
- fail early when the selected provider is not effectively enabled or is missing required account/token data
- keep existing binding and target-runtime checks

### 4. Reuse the existing reliability model, do not invent a second one

Decision:

- keep the current file-backed inbox/outbox, retry, dead-letter, and lock-heartbeat model
- surface its status more clearly in the managed UX and docs

Why:

- the system already has stronger guarantees than a simple heartbeat
- new reliability primitives are unnecessary for this round

Implementation direction:

- preserve:
  - inbound inbox persistence + idempotent enqueue
  - inbound forwarder retry/dead-letter
  - outbound outbox persistence + retry/dead-letter
  - queue-owner lock heartbeat and `CRITICAL_LOCK_LOST`
- optionally show compact reliability counters/status in the managed runtime card if low-risk
- document the guarantees and limitations explicitly

### 5. Clean the stale Telegram test debt in the gateway package

Decision:

- fix the currently stale Telegram test expectations that block a clean focused slice

Why:

- product-facing web/server slices already pass
- stale gateway Telegram tests reduce confidence unnecessarily

Implementation direction:

- fix duplicated variable declaration in Telegram adapter test
- update runtime-config expectations to include current runtime-data-root behavior

## Future-State Boundaries

### Managed Product Path

- user creates bot in BotFather
- user returns to `Settings -> Messaging`
- user starts the managed gateway
- user configures Telegram polling
- user saves config and Telegram becomes active without another provider toggle
- account scope is immediately reusable for binding/verification
- user sends a real Telegram message to the bot
- user binds discovered peer to an active `AGENT` runtime
- user verifies readiness

### Low-Level Operator Path

- direct gateway execution
- manual webhook configuration
- operator-owned public ingress exposure

That path remains documented, but is no longer presented as the default managed experience.

## Risks

1. If some existing user depends on managed webhook fields, removing them is a behavior change.
2. Verification can become too strict if it requires evidence that is not always available without a live inbound message.
3. The live real-bot proof step still requires manual credentials and cannot be fully automated in this repo.
