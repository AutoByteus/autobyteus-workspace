# Pre-Implementation Validation Gate (Dual-Mode External Messaging)

## Purpose
This is a blocking validation gate before implementation starts. It verifies that the current design and runtime call stacks are coherent, transport-safe, and end-to-end complete for:

- WhatsApp `BUSINESS_API`
- WhatsApp `PERSONAL_SESSION`
- WeCom webhook flow

Coding starts only after all P0/P1 validations pass.

## Validation Principles
1. Separation of concerns stays strict: route -> service -> adapter/provider boundaries only.
2. Shared contracts (`autobyteus-ts`) are the single source of truth.
3. Transport-aware routing is deterministic (no cross-mode ambiguity).
4. Idempotency is enforced for both inbound events and outbound callbacks.
5. Failure paths are explicit and observable.

## Blocking Exit Criteria
All items below must pass:

1. P0 scenarios pass with expected outputs and no unresolved design contradictions.
2. No runtime call stack bypasses normalized-envelope boundaries.
3. No duplicate contract ownership appears outside `autobyteus-ts`.
4. No unresolved "blocking smell" remains in runtime simulation docs.
5. Transport key consistency is preserved across:
   - idempotency keys
   - binding lookup keys
   - thread lock keys
   - callback idempotency keys

## Test Matrix

### P0 (Blocking)

| ID | Scenario | Transport | Expected Result | Owner Docs |
| --- | --- | --- | --- | --- |
| P0-01 | Business inbound webhook accepted once | BUSINESS_API | One server ingress forward, one ack | `MESSAGING_GATEWAY_RUNTIME_SIMULATION.md` Use Case 1 |
| P0-02 | Business duplicate webhook | BUSINESS_API | Duplicate ack, no re-forward | `MESSAGING_GATEWAY_RUNTIME_SIMULATION.md` Use Case 2 |
| P0-03 | Personal session inbound event | PERSONAL_SESSION | Session event converges to `handleNormalizedEnvelope` and one forward | `MESSAGING_GATEWAY_RUNTIME_SIMULATION.md` Use Case 4 |
| P0-04 | Server callback duplicate | BUSINESS_API + PERSONAL_SESSION | `checkAndMarkCallback` blocks duplicate outbound send | `MESSAGING_GATEWAY_RUNTIME_SIMULATION.md` Use Cases 1/3/4 |
| P0-05 | Transport mismatch with binding | BOTH | `409 CHANNEL_TRANSPORT_MISMATCH`, no runtime dispatch | `EXTERNAL_CHANNEL_INGRESS_RUNTIME_SIMULATION.md` Use Case 5 |
| P0-06 | Assistant completion callback loop | BOTH | Server publishes callback once; gateway dedupes and delivers once | `CROSS_PROJECT_END_TO_END_RUNTIME_SIMULATION.md` Use Cases 1/3 |
| P0-07 | Contract parse hard-fail on missing callback idempotency key | BOTH | Parse error code `MISSING_CALLBACK_IDEMPOTENCY_KEY` | `EXTERNAL_CHANNEL_TYPES_RUNTIME_SIMULATION.md` Use Case 3 |

### P1 (Required before coding finishes; can run after P0)

| ID | Scenario | Transport | Expected Result | Owner Docs |
| --- | --- | --- | --- | --- |
| P1-01 | Retry and dead-letter after repeated outbound failure | BUSINESS_API | Backoff retry then dead-letter + failure event | `MESSAGING_GATEWAY_RUNTIME_SIMULATION.md` Use Case 3 |
| P1-02 | Session reconnect branch | PERSONAL_SESSION | Reconnect flow exercised; callback retry path valid | `CROSS_PROJECT_END_TO_END_RUNTIME_SIMULATION.md` Use Case 3 |
| P1-03 | Per-thread serialization under concurrency | BOTH | No interleaving for identical thread keys | `EXTERNAL_CHANNEL_INGRESS_RUNTIME_SIMULATION.md` Use Case 2 |
| P1-04 | Parse error code mapping consistency | BOTH | Gateway/server map parse codes to deterministic API responses | `EXTERNAL_CHANNEL_TYPES_RUNTIME_SIMULATION.md` Use Cases 1/3/4 |
| P1-05 | Callback key composition consistency | BOTH | Key includes `(provider, transport, accountId, peerId, threadId, correlationMessageId, replyDigest)` | `CROSS_PROJECT_END_TO_END_RUNTIME_SIMULATION.md` Use Case 1 |

## Evidence Required Per Scenario
For each scenario, capture:

1. Runtime trace snippet (call path and branch taken).
2. Input payload fixture (or event fixture).
3. Expected output/side effect and actual observed result.
4. Metrics/log signals used to confirm behavior.

## Failure Handling During Gate
If any P0/P1 scenario fails:

1. Update affected design/runtime docs first.
2. Regenerate impacted runtime call stacks.
3. Re-run only failed scenarios, then full P0 smoke set.
4. Mark gate as passed only when all P0 and P1 are green.

## Pass Decision
Gate status is `PASS` only when:

- all P0 and P1 scenarios pass,
- no blocking smell remains in runtime docs,
- and no ownership ambiguity remains across gateway/server/shared-contract layers.
