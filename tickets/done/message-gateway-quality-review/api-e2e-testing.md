# API / E2E Testing

## Scope

- Ticket: `message-gateway-quality-review`
- Date: `2026-03-24`
- Validation targets:
  - `channel-admin` route review slice
  - bootstrap lifecycle review slice
  - shared support-structure refactor for peer-candidate indexes and worker retry policy
  - inbound ingress response-contract refactor
  - server-callback response-contract refactor
  - runtime-replay typed error-contract refactor
  - legacy direct-send outbound cleanup
  - telegram discovery config ownership refactor
  - runtime-reliability release-state truth fix
  - WeCom app enablement runtime-truth fix

## Executed Validation

### V-001 Full gateway package test suite

- Command:
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway test`
- Result:
  - `Pass`
- Evidence:
  - `81` test files passed
  - `235` tests passed

### V-002 Full gateway package typecheck

- Command:
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway typecheck`
- Result:
  - `Pass`

### V-003 Focused channel-admin route regression suite

- Command:
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/integration/http/routes/channel-admin-route.integration.test.ts`
- Result:
  - `Pass`

### V-004 Focused bootstrap integration suite

- Command:
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/integration/bootstrap/create-gateway-app.integration.test.ts`
- Result:
  - `Pass`

### V-005 Lifecycle rollback unit suite

- Covered by:
  - `tests/unit/bootstrap/gateway-runtime-lifecycle.test.ts`
- Result:
  - `Pass`

### V-006 Shared support-structure focused unit suite

- Command:
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/unit/infrastructure/adapters/shared/account-peer-candidate-index.test.ts tests/unit/infrastructure/adapters/discord-business/discord-peer-candidate-index.test.ts tests/unit/infrastructure/adapters/telegram-business/telegram-peer-candidate-index.test.ts tests/unit/infrastructure/retry/retry-decision.test.ts tests/unit/application/services/inbound-forwarder-worker.test.ts tests/unit/application/services/outbound-sender-worker.test.ts`
- Result:
  - `Pass`
- Evidence:
  - `6` test files passed
  - `17` tests passed

### V-007 Ingress boundary focused validation suite

- Command:
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/unit/application/services/inbound-message-service.test.ts tests/unit/application/services/inbound-envelope-bridge-service.test.ts tests/integration/http/routes/provider-webhook-route.integration.test.ts tests/integration/http/routes/wecom-app-webhook-route.integration.test.ts tests/integration/http/hooks/raw-body-capture.integration.test.ts tests/e2e/inbound-webhook-forwarding.e2e.test.ts`
- Result:
  - `Pass`
- Evidence:
  - `6` test files passed
  - `14` tests passed

### V-008 Server-callback focused validation suite

- Command:
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/integration/http/routes/server-callback-route.integration.test.ts`
- Result:
  - `Pass`
- Evidence:
  - `1` test file passed
  - `4` tests passed

### V-009 Runtime-replay focused validation suites

- Commands:
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/integration/http/routes/runtime-reliability-route.integration.test.ts`
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/unit/application/services/inbound-inbox-service.test.ts tests/unit/application/services/outbound-outbox-service.test.ts`
- Result:
  - `Pass`
- Evidence:
  - `3` test files passed
  - `13` tests passed

### V-010 Active outbound spine focused validation suites

- Commands:
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/unit/application/services/outbound-sender-worker.test.ts tests/integration/http/routes/server-callback-route.integration.test.ts`
  - `rg -n "OutboundMessageService|DeadLetterService|DeliveryStatusService" src tests`
- Result:
  - `Pass`
- Evidence:
  - `2` test files passed
  - `8` tests passed
  - no remaining `src/` or `tests/` references to the removed legacy outbound stack

### V-011 Telegram discovery config focused validation suites

- Commands:
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/unit/config/runtime-config.test.ts tests/integration/bootstrap/create-gateway-app.integration.test.ts`
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/integration/http/routes/channel-admin-route.integration.test.ts`
- Result:
  - `Pass`
- Evidence:
  - `3` test files passed
  - `32` tests passed

### V-012 Reliability truth focused validation suites

- Commands:
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/unit/application/services/reliability-status-service.test.ts tests/integration/http/routes/runtime-reliability-route.integration.test.ts`
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/unit/bootstrap/gateway-runtime-lifecycle.test.ts`
- Result:
  - `Pass`
- Evidence:
  - `3` test files passed
  - `9` tests passed

### V-013 WeCom enablement truth focused validation suite

- Command:
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/message-gateway-quality-review/autobyteus-message-gateway exec vitest run tests/integration/bootstrap/create-gateway-app.integration.test.ts tests/integration/http/routes/wecom-app-webhook-route.integration.test.ts`
- Result:
  - `Pass`
- Evidence:
  - `2` test files passed
  - `15` tests passed

## Validation Conclusion

- The route-boundary refactor remains green.
- The bootstrap-lifecycle refactor is validated.
- The third-cycle shared support-structure refactor is validated.
- The fourth-cycle ingress response-contract refactor is validated.
- The fifth-cycle server-callback response-contract refactor is validated.
- The sixth-cycle runtime-replay typed error-contract refactor is validated.
- The seventh-cycle legacy outbound cleanup is validated.
- The eighth-cycle Telegram discovery config refactor is validated.
- The ninth-cycle runtime-reliability release-state fix is validated.
- The tenth-cycle WeCom app enablement truth fix is validated.
- The earlier repo-wide validation blocker in the Discord adapter test file remains fixed.
