# Implementation Progress

## Metadata

- Ticket: `message-gateway-quality-review`
- Last Updated: `2026-03-24`

## Status

- The previous `channel-admin-route` slice remains complete.
- The bootstrap-lifecycle slice is now implemented and validated.
- The earlier package-level validation blocker in `tests/unit/infrastructure/adapters/discord-business/discord-business-adapter.test.ts` has been fixed.
- The third-cycle local-fix refactor is now implemented and validated.
- The fourth-cycle ingress-boundary local-fix refactor is now implemented and validated.
- The fifth-cycle callback-boundary local-fix refactor is now implemented and validated.
- The sixth-cycle runtime-replay local-fix path is now in implementation planning.
- The seventh-cycle legacy-outbound local-fix path is now in implementation planning.
- The eighth-cycle telegram-discovery config local-fix path is now in implementation planning.
- The ninth-cycle reliability-status local-fix path is now in implementation planning.
- The tenth-cycle WeCom enablement-truth local-fix path is now implemented and validated.

## Progress Log

- `2026-03-24`: Planned refactor scope finalized for `channel-admin-route` and its focused integration coverage.
- `2026-03-24`: Extracted helper-owned peer-discovery and personal-session route-family registration inside `src/http/routes/channel-admin-route.ts`.
- `2026-03-24`: Fixed Telegram peer-discovery limit wiring to use the general peer-candidate limit settings.
- `2026-03-24`: Added focused integration coverage proving Telegram ignores WeChat-specific limit overrides.
- `2026-03-24`: Focused `vitest` route suite passed; broader package test/typecheck commands hit an unrelated existing blocker in `discord-business-adapter.test.ts`.
- `2026-03-24`: Fresh full-project review selected a second slice in `create-gateway-app` around bootstrap lifecycle ownership and startup rollback.
- `2026-03-24`: Added `src/bootstrap/gateway-runtime-lifecycle.ts` and delegated bootstrap startup/shutdown support ownership from `createGatewayApp`.
- `2026-03-24`: Added unit coverage for lifecycle rollback semantics and fixed the duplicate `observedAt` declaration in `discord-business-adapter.test.ts`.
- `2026-03-24`: Full gateway package `test` and `typecheck` both passed after the second review-cycle changes.
- `2026-03-24`: Third-cycle whole-project Stage 8 review failed on two duplicated support structures: provider peer-candidate TTL indexes and worker retry/backoff policy.
- `2026-03-24`: Local-fix implementation planning was reopened for the shared peer-candidate index extraction and shared retry-decision refactor.
- `2026-03-24`: Added a shared account-scoped peer-candidate index owner and converted the Discord and Telegram indexes into thin wrappers.
- `2026-03-24`: Added a shared retry-decision helper and removed duplicate retry timing/classification logic from the inbound and outbound workers.
- `2026-03-24`: Full gateway package `test` and `typecheck` passed again after the third review-cycle refactor.
- `2026-03-24`: Fourth-cycle Stage 8 review found that inbound webhook responses overstate downstream outcomes by reporting `blocked` and `forwarded` even though ingress only parses and enqueues work.
- `2026-03-24`: Local-fix implementation planning was reopened to tighten the ingress response contract and align route/service tests with queue-time truth.
- `2026-03-24`: Tightened `InboundMessageService` result shapes so ingress now reports `accepted`, `duplicate`, `queued`, and `envelopeCount` instead of impossible downstream worker outcomes.
- `2026-03-24`: Updated inbound ingress unit, integration, hook, and e2e coverage to assert queue-time truth rather than mocked forwarding/blocking semantics.
- `2026-03-24`: Full gateway package `test` and `typecheck` passed again after the fourth review-cycle refactor.
- `2026-03-24`: Fifth-cycle Stage 8 review found that duplicate server callbacks still return `queued: true` even though the outbox owner reused an existing record.
- `2026-03-24`: Local-fix implementation planning was reopened to tighten the server-callback response contract and align duplicate callback validation with real outbox behavior.
- `2026-03-24`: Tightened the server-callback response contract so duplicate callbacks now return `queued: false` when no fresh outbox record was queued.
- `2026-03-24`: Updated callback integration coverage to assert real duplicate queue semantics.
- `2026-03-24`: Full gateway package `test` and `typecheck` passed again after the fifth review-cycle refactor.
- `2026-03-24`: Sixth-cycle Stage 8 review found that the runtime-reliability route classifies replay failures by matching free-form service error text.
- `2026-03-24`: Local-fix implementation planning was reopened to introduce a typed replay-error contract and remove message-string parsing from the HTTP boundary.
- `2026-03-24`: Added `src/application/services/replay-error.ts` and moved inbound/outbound replay failure ownership to typed `ReplayError` codes.
- `2026-03-24`: Updated the runtime-reliability route to map typed replay failures directly to `409` and `404` without inspecting error text.
- `2026-03-24`: Expanded unit and route integration coverage to assert typed replay-error behavior for status mismatch and record-not-found cases.
- `2026-03-24`: Focused runtime-reliability suites plus full gateway package `test` and `typecheck` all passed after the sixth review-cycle refactor.
- `2026-03-24`: Seventh-cycle Stage 8 review found an orphaned direct-send outbound stack in `application/services` that is not wired into the bootstrapped gateway runtime.
- `2026-03-24`: Local-fix implementation planning was reopened to remove the unused direct-send outbound stack and its isolated legacy tests.
- `2026-03-24`: Removed the unused `OutboundMessageService`, `DeliveryStatusService`, and `DeadLetterService` files from `application/services`.
- `2026-03-24`: Removed the three unit suites that only validated the deleted legacy outbound path.
- `2026-03-24`: Focused outbound validation plus full gateway package `test` and `typecheck` all passed after the seventh review-cycle cleanup.
- `2026-03-24`: Eighth-cycle Stage 8 review found that Telegram discovery limits and TTL are hardcoded in `createGatewayApp` instead of being owned by runtime config.
- `2026-03-24`: Local-fix implementation planning was reopened to move Telegram discovery policy into the env/runtime-config surface and add bootstrap regression coverage.
- `2026-03-24`: Added Telegram discovery max-candidate and TTL fields to `env.ts` and `runtime-config.ts`.
- `2026-03-24`: Updated `createGatewayApp` to use configured Telegram discovery values instead of bootstrap-local literals.
- `2026-03-24`: Added config assertions and a bootstrap integration regression proving the bootstrapped Telegram discovery route honors a configured max-candidate limit.
- `2026-03-24`: Focused bootstrap/config validation plus full gateway package `test` and `typecheck` all passed after the eighth review-cycle refactor.
- `2026-03-24`: Ninth-cycle Stage 8 review found that `ReliabilityStatusService.setLockReleased` leaves stale lock ownership in the runtime snapshot.
- `2026-03-24`: Local-fix implementation planning was reopened to tighten release-state truth in the reliability status owner and add a focused unit regression.
- `2026-03-24`: Tightened `ReliabilityStatusService.setLockReleased` to clear stale owner, lost-state, heartbeat, and error fields on release.
- `2026-03-24`: Added a focused unit regression proving a released lock no longer reports an owner.
- `2026-03-24`: Focused reliability validation plus full gateway package `test` and `typecheck` all passed after the ninth review-cycle fix.
- `2026-03-24`: Tenth-cycle whole-project Stage 8 review found that `wecomAppEnabled` only changes capability reporting while bootstrap still wires the WeCom app account registry and webhook route.
- `2026-03-24`: Local-fix implementation planning was reopened to make the disabled WeCom app mode truthful at runtime and add a bootstrap regression for the disabled route path.
- `2026-03-24`: Tightened `createGatewayApp` so WeCom app accounts and WeCom app webhook registration are both gated by `wecomAppEnabled`.
- `2026-03-24`: Added a bootstrap integration regression proving WeCom app routes stay unavailable when app mode is disabled, even if app accounts are configured.
- `2026-03-24`: Focused bootstrap/WeCom validation plus full gateway package `test` and `typecheck` all passed after the tenth review-cycle fix.
