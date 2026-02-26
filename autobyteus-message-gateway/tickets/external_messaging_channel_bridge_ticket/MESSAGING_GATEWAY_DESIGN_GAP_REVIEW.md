# Design Gap Review (Messaging Gateway)

## Review Input
- `MESSAGING_GATEWAY_DESIGN.md`
- `MESSAGING_GATEWAY_RUNTIME_SIMULATION.md`

## Findings

1. **Raw-body signature fidelity gap**
- Risk: Signature verification can fail or be bypassed if request body is reserialized before HMAC verification.
- Fix:
  - Add `src/http/hooks/raw-body-capture.ts`.
  - Ensure route verification uses captured raw bytes.

2. **Idempotency race gap**
- Risk: Duplicate webhooks can pass dedupe under concurrent arrivals across replicas.
- Fix:
  - Replace in-memory-only dedupe with provider-backed atomic `checkAndMark()` API.
  - Add durable idempotency provider implementation.

3. **Mention policy representation gap (WeCom groups)**
- Risk: Message routing behavior in group chats becomes ambiguous.
- Fix:
  - Add `src/application/services/channel-mention-policy-service.ts`.
  - Evaluate mention/allowlist before forwarding.

4. **No dead-letter handling for exhausted retries**
- Risk: Lost outbound messages with weak operational visibility.
- Fix:
  - Add `src/application/services/dead-letter-service.ts` and persistent dead-letter repository.

5. **Security observability gap**
- Risk: repeated signature attacks not measurable.
- Fix:
  - Add explicit audit event recording path in security rejection branch.

6. **Dual-mode WhatsApp boundary gap**
- Risk: business webhook and personal-session responsibilities can blend into one adapter, increasing coupling and regression risk.
- Fix:
  - Split WhatsApp adapters into `whatsapp-business` and `whatsapp-personal`.
  - Keep shared convergence point at normalized envelope + inbound orchestration service.

7. **Personal session credential handling gap**
- Risk: QR/session credentials stored without clear lifecycle controls create account takeover risk.
- Fix:
  - Add dedicated session credential store abstraction with encryption-at-rest policy.
  - Add admin-only lifecycle routes for session create/status/stop.

## Separation-of-Concern Verdict
- The architecture remains valid.
- The gaps are resolvable by adding narrowly scoped services/hooks without violating current SoC boundaries.

## Required Design Updates
- Update design doc file list and APIs with the five fixes above.
