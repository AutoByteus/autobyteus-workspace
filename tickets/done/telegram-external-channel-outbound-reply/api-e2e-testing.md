# Stage 7 Executable Validation (API/E2E)

## Validation Round Meta

- Current Validation Round: `5`
- Trigger Stage: `6`
- Prior Round Reviewed: `3`
- Latest Authoritative Round: `5`

## Testing Scope

- Ticket: `telegram-external-channel-outbound-reply`
- Scope classification: `Large`
- Workflow state source: `tickets/in-progress/telegram-external-channel-outbound-reply/workflow-state.md`
- Requirements source: `tickets/in-progress/telegram-external-channel-outbound-reply/requirements.md`
- Design source: `tickets/in-progress/telegram-external-channel-outbound-reply/proposed-design.md`
- Runtime call stack source: `tickets/in-progress/telegram-external-channel-outbound-reply/future-state-runtime-call-stack.md`
- Platform/runtime target: `autobyteus-server-ts` local Vitest + Prisma + SQLite runtime
- Lifecycle boundaries in scope: `Restart`, `Recovery`, `Migration`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked (`Yes`/`No`/`N/A`) | New Failures Found (`Yes`/`No`) | Gate Result (`Pass`/`Fail`/`Blocked`) | Latest Authoritative (`Yes`/`No`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Narrow Telegram bug-fix validation | N/A | No | Pass | No | Covered accepted-turn propagation, root-level binding persistence, and stale SQL binding cleanup in the original narrow scope. |
| 2 | Stage 6 exit after the durability/continuity re-entry implementation | Yes | No | Pass | No | Broadened validation covered persisted AGENT/TEAM continuity, receipt-ledger ingress lifecycle, accepted-turn propagation, outbox-owned reply durability, retry classification, and file-only binding persistence. |
| 3 | Stage 6 exit after the v4 accepted-receipt recovery implementation | Yes | No | Pass | Yes | Authoritative validation covered the v4 recovery runtime, observation-only facades/bridges, exact turn reply recovery, full external-channel unit/integration surface, and GraphQL/e2e coverage. |
| 4 | Stage 8 round 5 local-fix re-entry | Yes | No | Pass | Yes | Refreshed validation covered the repaired `ACCEPTED` retry spine, truthful ingress acceptance semantics, explicit AGENT/TEAM dispatch variants, and removal of dead latest-source lookup surfaces. |
| 5 | Stage 6 reopen for the v5 storage-surface refinement | Yes | No | Pass | Yes | Focused validation covered the top-level external-channel folder paths, clean server build, and updated Electron app artifact generation from the ticket worktree. |

## Acceptance Criteria Coverage Matrix

| Acceptance Criteria ID | Requirement ID(s) | Criterion Summary | Validation Asset(s) | Status |
| --- | --- | --- | --- | --- |
| AC-001 | R-001 | Persisted AGENT bindings restore the cached run id. | `tests/unit/external-channel/runtime/channel-binding-run-launcher.test.ts` | Passed |
| AC-002 | R-001 | Persisted TEAM bindings restore the cached run id. | `tests/unit/external-channel/runtime/channel-binding-run-launcher.test.ts` | Passed |
| AC-003 | R-002 | Inbound external-message retries remain resumable until the receipt ledger reaches a terminal state. | `tests/unit/external-channel/services/channel-ingress-service.test.ts`, `tests/integration/api/rest/channel-ingress.integration.test.ts`, `tests/integration/external-channel/providers/sql-channel-message-receipt-provider.integration.test.ts` | Passed |
| AC-004 | R-003 | External-channel runtime boundaries preserve accepted `turnId`. | `tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts`, `tests/unit/agent-execution/backends/claude/claude-agent-run-backend.test.ts`, `tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.test.ts` | Passed |
| AC-005 | R-004, R-005 | Outbound replies are durably owned by the outbox and delivery events remain observational. | `tests/unit/external-channel/services/reply-callback-service.test.ts`, `tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts` | Passed |
| AC-006 | R-006 | Callback dispatch distinguishes retryable and terminal failures. | `tests/unit/external-channel/runtime/gateway-callback-publisher.test.ts`, `tests/unit/external-channel/runtime/gateway-callback-dispatch-worker.test.ts` | Passed |
| AC-007 | R-007 | File-backed external-channel artifacts persist under one top-level folder and stale DB binding support stays removed. | `tests/integration/external-channel/providers/file-channel-binding-provider.integration.test.ts`, `tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts`, `tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts`, `prisma/migrations/20260331102000_remove_channel_bindings_table/migration.sql`, `prisma/migrations/20260331130000_receipt_lifecycle_and_remove_channel_idempotency/migration.sql` | Passed |
| AC-008 | R-008 | Stage 7 covers the broadened continuity/durability design. | Full round-3 subsystem validation command plus focused supporting runs, round-4 local-fix validation, and schema proof | Passed |
| AC-009 | R-009 | Successful external dispatch is only acknowledged once reply routing is durably recoverable. | `tests/unit/external-channel/runtime/channel-agent-run-facade.test.ts`, `tests/unit/external-channel/runtime/channel-team-run-facade.test.ts`, `tests/unit/external-channel/services/channel-ingress-service.test.ts`, `tests/unit/external-channel/runtime/accepted-receipt-recovery-runtime.test.ts` | Passed |
| AC-010 | R-010 | Accepted receipts recover across restart without reposting inbound user input. | `tests/unit/external-channel/runtime/accepted-receipt-recovery-runtime.test.ts`, `tests/unit/external-channel/runtime/channel-agent-run-reply-bridge.test.ts`, `tests/unit/external-channel/runtime/channel-team-run-reply-bridge.test.ts` | Passed |

## Scenario Catalog

| Scenario ID | Covers | Validation Asset(s) | Command / Harness | Status |
| --- | --- | --- | --- | --- |
| AV-001 | Persisted AGENT/TEAM continuity restore | `tests/unit/external-channel/runtime/channel-binding-run-launcher.test.ts` | Included in the consolidated vitest run | Passed |
| AV-002 | Receipt-ledger ingress lifecycle and duplicate/retry-safe behavior | `tests/unit/external-channel/services/channel-message-receipt-service.test.ts`, `tests/unit/external-channel/services/channel-ingress-service.test.ts`, `tests/integration/api/rest/channel-ingress.integration.test.ts`, `tests/integration/external-channel/providers/sql-channel-message-receipt-provider.integration.test.ts` | Included in the consolidated vitest run and the round-4 local-fix validation slice | Passed |
| AV-003 | Accepted-turn propagation for external-channel dispatch | `tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts`, `tests/unit/agent-execution/backends/claude/claude-agent-run-backend.test.ts`, `tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.test.ts` | Included in the consolidated vitest run | Passed |
| AV-004 | Outbox-owned outbound reply durability | `tests/unit/external-channel/services/reply-callback-service.test.ts`, `tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts` | Included in the consolidated vitest run | Passed |
| AV-005 | Publisher/worker retry classification | `tests/unit/external-channel/runtime/gateway-callback-publisher.test.ts`, `tests/unit/external-channel/runtime/gateway-callback-dispatch-worker.test.ts` | Included in the consolidated vitest run | Passed |
| AV-006 | Top-level external-channel folder persistence plus GraphQL setup path | `tests/integration/external-channel/providers/file-channel-binding-provider.integration.test.ts`, `tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts`, `tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts` | Included in the focused storage-surface validation slice | Passed |
| AV-007 | Schema/migration proof for binding/idempotency cleanup | `prisma/schema.prisma`, `prisma/migrations/20260331102000_remove_channel_bindings_table/migration.sql`, `prisma/migrations/20260331130000_receipt_lifecycle_and_remove_channel_idempotency/migration.sql` | Source review plus migrated test schema | Passed |
| AV-008 | Acceptance boundary moved from facade-owned arming to durable accepted-receipt recovery | `tests/unit/external-channel/runtime/channel-agent-run-facade.test.ts`, `tests/unit/external-channel/runtime/channel-team-run-facade.test.ts`, `tests/unit/external-channel/runtime/accepted-receipt-recovery-runtime.test.ts` | Included in the consolidated vitest run | Passed |
| AV-009 | Restart-safe accepted receipt recovery and exact turn reply publication | `tests/unit/external-channel/runtime/accepted-receipt-recovery-runtime.test.ts`, `tests/unit/external-channel/runtime/channel-agent-run-reply-bridge.test.ts`, `tests/unit/external-channel/runtime/channel-team-run-reply-bridge.test.ts` | Included in the consolidated vitest run | Passed |

## Commands Executed

| Date | Command | Result |
| --- | --- | --- |
| 2026-03-31 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel/services/channel-message-receipt-service.test.ts tests/unit/external-channel/services/reply-callback-service.test.ts tests/unit/external-channel/services/channel-ingress-service.test.ts tests/unit/external-channel/runtime/channel-agent-run-reply-bridge.test.ts tests/unit/external-channel/runtime/channel-team-run-reply-bridge.test.ts --no-watch` | Passed (`5` files, `29` tests) |
| 2026-03-31 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/startup/agent-customization-loader.test.ts tests/integration/api/rest/channel-ingress.integration.test.ts tests/integration/external-channel/providers/sql-channel-message-receipt-provider.integration.test.ts tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts tests/unit/agent-execution/backends/claude/claude-agent-run-backend.test.ts --no-watch` | Passed (`6` files, `21` tests) |
| 2026-03-31 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel/runtime/channel-agent-run-facade.test.ts tests/unit/external-channel/runtime/channel-team-run-facade.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.test.ts --no-watch` | Passed (`3` files, `14` tests) |
| 2026-03-31 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel tests/integration/external-channel tests/integration/api/rest/channel-ingress.integration.test.ts tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts tests/unit/startup/agent-customization-loader.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.test.ts tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts tests/unit/agent-execution/backends/claude/claude-agent-run-backend.test.ts --no-watch` | Passed (`31` files, `139` tests) |
| 2026-03-31 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel/services/channel-ingress-service.test.ts tests/unit/external-channel/runtime/channel-agent-run-facade.test.ts tests/unit/external-channel/runtime/channel-team-run-facade.test.ts tests/unit/api/rest/channel-ingress.test.ts tests/integration/api/rest/channel-ingress.integration.test.ts tests/integration/external-channel/providers/file-channel-binding-provider.integration.test.ts tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts --no-watch` | Passed (`7` files, `41` tests) |
| 2026-03-31 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel/services/channel-message-receipt-service.test.ts tests/unit/external-channel/services/reply-callback-service.test.ts tests/unit/external-channel/services/channel-ingress-service.test.ts tests/unit/api/rest/channel-ingress.test.ts tests/integration/api/rest/channel-ingress.integration.test.ts tests/integration/external-channel/providers/sql-channel-message-receipt-provider.integration.test.ts tests/integration/external-channel/providers/file-channel-binding-provider.integration.test.ts tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts --no-watch` | Passed (`8` files, `50` tests) |
| 2026-03-31 | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/external-channel/providers/file-channel-binding-provider.integration.test.ts tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts tests/unit/external-channel/runtime/gateway-callback-outbox-store.test.ts` | Passed (`4` files, `23` tests) |
| 2026-03-31 | `pnpm -C autobyteus-server-ts build` | Passed |
| 2026-03-31 | `NO_TIMESTAMP=1 APPLE_TEAM_ID= pnpm -C autobyteus-web build:electron:mac` | Partial pass: updated `.app` and `.zip` artifacts produced from the ticket worktree; DMG step hit the existing `hdiutil detach` failure. |

## Residual Risks

- Live Telegram round-trip verification was not rerun inside Stage 7. The validation evidence stops at the server-side callback runtime and persistence boundaries.
- `pnpm --dir autobyteus-server-ts exec tsc --noEmit --pretty false` remains unusable as a gate because of the existing repo-level `TS6059` `rootDir` issue.
- Manual Telegram round-trip verification is still outside Stage 7 because the harness stops at the server/gateway boundary.

## Stage 7 Gate Decision

- Latest authoritative round: `5`
- Latest authoritative result: `Pass`
- Stage 7 complete: `Yes`
- All in-scope acceptance criteria mapped to executable evidence: `Yes`
- All relevant spines covered by executable evidence: `Yes`
- Durable validation that should live in the repo was updated: `Yes`
- Ready to enter Stage 8 code review: `Yes`
- Notes:
  - Round 5 is now authoritative for the storage-surface refinement package.
