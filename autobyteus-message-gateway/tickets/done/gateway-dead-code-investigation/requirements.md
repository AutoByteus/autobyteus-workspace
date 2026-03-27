# Requirements

## Status

- Current Status: `Design-ready`
- Ticket: `gateway-dead-code-investigation`
- Last Updated: `2026-03-27`
- Scope Classification: `Medium`

## Goal

Remove only the gateway code that is now provably dead or legacy while preserving the live Telegram-centered runtime spine and the current durable inbox/outbox delivery model.

## Problem Statement

The gateway is smaller and cleaner than expected, but it still contains a narrow legacy cluster left behind by earlier idempotency and chunk-planning abstractions. The cleanup needs to distinguish:

- live runtime code that must stay intact,
- production-source code that is now unused and should be removed,
- config surface that no longer affects live behavior,
- test-only helpers that are still acceptable to keep in production source for this round.

## In-Scope Use Cases

| Use Case ID | Description | Primary Goal |
| --- | --- | --- |
| UC-001 | Preserve the live Telegram runtime spine from bootstrap through webhook or polling ingress, durable forwarding, outbound callback enqueue, outbound send, and peer discovery. | Protect live behavior while removing unrelated dead code. |
| UC-002 | Remove the legacy callback-idempotency cluster that has no production-source callers. | Eliminate dead service and store code without changing live callback dedupe behavior. |
| UC-003 | Trim `idempotency-service.ts` down to the still-live inbound ingress-key helper. | Remove the dead class while preserving inbox dedupe behavior. |
| UC-004 | Remove the unused centralized outbound chunk planner and keep chunk normalization adapter-local. | Delete dead abstraction without changing outbound send semantics. |
| UC-005 | Remove gateway-local config/env fields that only served deleted idempotency abstractions. | Make runtime config match live behavior. |

## Out Of Scope

- Behavioral redesign of the Telegram flow, queue lifecycle, or adapter boundaries
- Cross-repository cleanup in `autobyteus-server-ts`, even when that repo still emits now-unused gateway env vars
- Moving `defaultRuntimeConfig()` out of production source in this round
- Broad codebase pruning outside the confirmed dead-code cluster

## Requirements

| Requirement ID | Description | Use Case IDs |
| --- | --- | --- |
| R-001 | The cleanup must preserve the live Telegram composition root, webhook path, polling supervision, durable inbound forwarding, durable outbound sending, and peer discovery behavior. | `UC-001` |
| R-002 | The legacy callback-idempotency cluster must be removed from production source when no production-source imports remain. | `UC-002` |
| R-003 | `src/application/services/idempotency-service.ts` must retain the live `buildInboundIdempotencyKey(...)` helper and remove the unused `IdempotencyService` abstraction. | `UC-003` |
| R-004 | The unused `OutboundChunkPlanner` abstraction must be removed, and the adapters that already own outbound chunk normalization must remain the active behavior. | `UC-004` |
| R-005 | Gateway env/runtime-config fields that only exist for removed idempotency abstractions must be removed from gateway source and gateway tests. | `UC-005` |
| R-006 | Tests must be updated so they no longer keep deleted production files alive artificially. | `UC-002`, `UC-003`, `UC-004`, `UC-005` |

## Acceptance Criteria

| Acceptance Criteria ID | Requirement ID | Verifiable Outcome |
| --- | --- | --- |
| AC-001 | `R-001` | Telegram bootstrap wiring, webhook ingress, polling lifecycle, outbound send routing, and peer discovery remain covered by existing integration or unit tests after cleanup. |
| AC-002 | `R-002` | `src/application/services/callback-idempotency-service.ts`, `src/domain/models/idempotency-store.ts`, and `src/infrastructure/idempotency/in-memory-idempotency-store.ts` are removed from gateway production source. |
| AC-003 | `R-002` | Production-source search no longer shows imports of the deleted callback-idempotency files, and callback routing still deduplicates via `OutboundOutboxService.enqueueOrGet(...)`. |
| AC-004 | `R-003` | `src/application/services/idempotency-service.ts` exports only the inbound key builder that is still used by `InboundInboxService`, and related tests cover only the live helper behavior. |
| AC-005 | `R-004` | `src/application/services/outbound-chunk-planner.ts` is removed, no production-source imports remain, and adapter-local chunk handling remains unchanged. |
| AC-006 | `R-005` | `GATEWAY_IDEMPOTENCY_TTL_SECONDS`, `GATEWAY_CALLBACK_IDEMPOTENCY_TTL_SECONDS`, `idempotencyTtlSeconds`, and `callbackIdempotencyTtlSeconds` are removed from gateway source and gateway config tests. |
| AC-007 | `R-006` | Deleted production files no longer have dedicated unit tests, and remaining tests still pass for the cleaned scope. |

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered By Use Case ID(s) |
| --- | --- |
| R-001 | `UC-001` |
| R-002 | `UC-002` |
| R-003 | `UC-003` |
| R-004 | `UC-004` |
| R-005 | `UC-005` |
| R-006 | `UC-002`, `UC-003`, `UC-004`, `UC-005` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| AC-001 | Regression-check the live Telegram spine after the dead-code cleanup. |
| AC-002 | Verify the callback-idempotency source cluster is physically removed. |
| AC-003 | Verify callback dedupe still happens through the durable outbox path. |
| AC-004 | Verify inbound ingress-key generation still works after trimming the file. |
| AC-005 | Verify outbound send behavior still relies on adapter-local chunk handling. |
| AC-006 | Verify gateway runtime config no longer exposes unused idempotency TTL fields. |
| AC-007 | Verify tests no longer reference deleted production files and the remaining scoped suite passes. |

## Constraints And Dependencies

- The gateway runtime must continue to support both Telegram polling and webhook ingress.
- The durable inbox/outbox queue model is the active reliability design and must not be replaced during cleanup.
- `autobyteus-server-ts` still emits the old idempotency env vars into managed gateway runtime env; this cleanup is limited to gateway-local source and tests.
- Validation depends on the locally available workspace dependencies and the current `pnpm` test environment.

## Assumptions

- Environment variables that the gateway no longer reads can remain present externally without changing gateway runtime behavior.
- Keeping `defaultRuntimeConfig()` in `src/config/runtime-config.ts` for test ergonomics is acceptable in this round because it is not dead runtime logic.
- The deleted abstractions are not loaded through any dynamic import path; production-source grep and test imports are sufficient evidence here.

## Open Questions And Risks

- The managed runtime env generator in `autobyteus-server-ts` still emits the old idempotency TTL env vars; that upstream cleanup is a separate follow-up.
- Historical ticket docs inside `tickets/` still mention some removed abstractions. They are not part of the runtime truth, but they may deserve later archival cleanup.
- If the local test environment is incomplete, validation may need to rely on the highest-signal scoped test subset rather than the full suite.
