# Handoff Summary

## Outcome

- Created a dedicated worktree from refreshed `origin/personal`:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review`
- Worked on branch:
  - `codex/message-gateway-quality-review`
- Reviewed `autobyteus-message-gateway` against the workflow design principles and common design practices.
- Completed ten review/refactor cycles:
  - route-boundary quality in `channel-admin-route`
  - bootstrap lifecycle ownership in `create-gateway-app`
  - shared support-structure ownership for peer-candidate discovery indexes and worker retry policy
  - inbound ingress response-contract ownership for webhook handling
  - server-callback response-contract ownership for duplicate callback handling
  - runtime-replay typed error-contract ownership for reliability replay handling
  - legacy outbound cleanup for unused direct-send application services
  - telegram discovery config ownership in bootstrap/runtime config
  - runtime-reliability release-state truth in the reliability status owner
  - WeCom app enablement truth between capability reporting and bootstrap/runtime exposure
- Fixed the unrelated Discord adapter test-file issue that had been blocking package-wide validation.

## What Changed

- Extracted helper-owned peer-discovery route registration in `src/http/routes/channel-admin-route.ts`.
- Extracted helper-owned personal-session route-family registration in `src/http/routes/channel-admin-route.ts`.
- Fixed the Telegram peer-discovery route so it uses the general peer-candidate limit settings instead of the WeChat-specific override settings.
- Added focused integration coverage for the Telegram limit regression.
- Added `src/bootstrap/gateway-runtime-lifecycle.ts` to own bootstrap startup/shutdown support behavior, heartbeat management, and rollback semantics.
- Simplified `src/bootstrap/create-gateway-app.ts` so it assembles dependencies and delegates lifecycle start/stop.
- Added lifecycle-helper unit coverage for partial-startup rollback semantics.
- Fixed the duplicate `observedAt` declaration in `tests/unit/infrastructure/adapters/discord-business/discord-business-adapter.test.ts`.
- Added `src/infrastructure/adapters/shared/account-peer-candidate-index.ts` and converted the Discord and Telegram peer-candidate indexes into thin wrappers over the shared owner.
- Added `src/infrastructure/retry/retry-decision.ts` and removed duplicate retry classification/backoff coordination from the inbound and outbound worker files.
- Added shared-unit coverage for the extracted peer-candidate index and retry-decision owners, while reducing provider-wrapper test duplication.
- Tightened `src/application/services/inbound-message-service.ts` so the ingress contract reports queue-time truth only.
- Removed the misleading synchronous `blocked` / `forwarded` ingress response fields and aligned the affected ingress unit, integration, hook, and e2e tests to `queued`.
- Tightened `src/http/routes/server-callback-route.ts` so duplicate callbacks now report `queued: false` instead of claiming fresh outbox queueing.
- Updated callback integration coverage to assert the corrected duplicate callback contract.
- Added `src/application/services/replay-error.ts` so replay failures are expressed as typed codes instead of message text.
- Tightened `src/http/routes/runtime-reliability-route.ts` so replay endpoints map typed replay failures directly to stable HTTP responses.
- Updated runtime-reliability integration coverage and inbox/outbox service unit coverage to assert typed replay-error behavior for both status mismatch and record-not-found cases.
- Removed the unused direct-send outbound stack from `src/application/services` by deleting `outbound-message-service.ts`, `delivery-status-service.ts`, and `dead-letter-service.ts`.
- Removed the three unit suites that only exercised that deleted legacy outbound path.
- Added Telegram discovery max-candidate and TTL fields to the env/runtime-config surface.
- Updated `src/bootstrap/create-gateway-app.ts` so the Telegram peer-candidate index uses configured discovery values instead of hardcoded literals.
- Added a bootstrap integration regression proving the bootstrapped Telegram discovery route honors a configured max-candidate limit.
- Tightened `src/application/services/reliability-status-service.ts` so released locks clear stale ownership and release-state fields.
- Added a focused unit regression for reliability release-state truth.
- Tightened `src/bootstrap/create-gateway-app.ts` so WeCom app accounts and app webhook route registration both honor `wecomAppEnabled`.
- Added a bootstrap integration regression proving disabled WeCom app mode leaves `/webhooks/wecom-app/:accountId` unavailable even when app accounts are configured.

## Validation

- Passed:
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/integration/bootstrap/create-gateway-app.integration.test.ts tests/integration/http/routes/wecom-app-webhook-route.integration.test.ts`
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway test`
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway typecheck`
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/unit/infrastructure/adapters/shared/account-peer-candidate-index.test.ts tests/unit/infrastructure/adapters/discord-business/discord-peer-candidate-index.test.ts tests/unit/infrastructure/adapters/telegram-business/telegram-peer-candidate-index.test.ts tests/unit/infrastructure/retry/retry-decision.test.ts tests/unit/application/services/inbound-forwarder-worker.test.ts tests/unit/application/services/outbound-sender-worker.test.ts`
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/unit/application/services/inbound-message-service.test.ts tests/unit/application/services/inbound-envelope-bridge-service.test.ts tests/integration/http/routes/provider-webhook-route.integration.test.ts tests/integration/http/routes/wecom-app-webhook-route.integration.test.ts tests/integration/http/hooks/raw-body-capture.integration.test.ts tests/e2e/inbound-webhook-forwarding.e2e.test.ts`
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/integration/http/routes/server-callback-route.integration.test.ts`
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/integration/http/routes/runtime-reliability-route.integration.test.ts`
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/unit/application/services/inbound-inbox-service.test.ts tests/unit/application/services/outbound-outbox-service.test.ts`
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/unit/application/services/outbound-sender-worker.test.ts tests/integration/http/routes/server-callback-route.integration.test.ts`
  - `rg -n "OutboundMessageService|DeadLetterService|DeliveryStatusService" /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway/src /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway/tests`
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/unit/config/runtime-config.test.ts tests/integration/bootstrap/create-gateway-app.integration.test.ts`
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/integration/http/routes/channel-admin-route.integration.test.ts`
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/unit/application/services/reliability-status-service.test.ts tests/integration/http/routes/runtime-reliability-route.integration.test.ts`
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/unit/bootstrap/gateway-runtime-lifecycle.test.ts`

## Pending User Gate

- User verification is complete.
- Ticket is archived in `tickets/done/message-gateway-quality-review/` and is being finalized into the latest `personal` branch without a release step.
