# Implementation

## Scope Classification

- Classification: `Large`
- Reasoning:
  - The final implementation is a subsystem-level repair, not a narrow Telegram adapter fix.
  - The landed scope spans binding-owned run continuity, receipt-ledger ingress durability, accepted-receipt restart recovery, exact turn reply recovery, callback-outbox durability, retry classification, and file-only binding persistence.

## Upstream Artifacts

- Workflow state: `tickets/done/telegram-external-channel-outbound-reply/workflow-state.md`
- Investigation notes: `tickets/done/telegram-external-channel-outbound-reply/investigation-notes.md`
- Requirements: `tickets/done/telegram-external-channel-outbound-reply/requirements.md`
- Proposed design: `tickets/done/telegram-external-channel-outbound-reply/proposed-design.md`
- Future-state runtime call stack: `tickets/done/telegram-external-channel-outbound-reply/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/done/telegram-external-channel-outbound-reply/future-state-runtime-call-stack-review.md`

## Document Status

- Current Status: `Complete`
- Stage 6 Gate Result: `Pass`
- Notes:
  - Stage 6 reopened on a local-fix re-entry after Stage 8 round 5 and is now complete again.
  - The local-fix package closed the remaining boundary gaps:
    - duplicate `ACCEPTED` ingress now re-registers unfinished receipts with the accepted-receipt recovery owner,
    - the ingress boundary now reports `ACCEPTED` instead of the terminal `ROUTED` term,
    - runtime acceptance metadata now uses explicit AGENT and TEAM variants, and
    - dead latest-source lookup APIs plus the empty source-context provider layer were removed so the active source lookup boundary stays turn-scoped.
  - Stage 6 reopened again for the v5 storage-surface refinement and is complete with the new top-level `server-data/external-channel/` folder owner implemented.

## Implemented Change Inventory

| Change ID | Area | Files | Outcome |
| --- | --- | --- | --- |
| C-001 | Accepted turn propagation | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts`, `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend.ts`, `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts`, `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | Runtime acceptance now preserves the `turnId` and team-member correlation metadata needed by external-channel reply routing. |
| C-002 | File-only binding persistence | `autobyteus-server-ts/src/external-channel/providers/file-channel-binding-provider.ts`, `autobyteus-server-ts/src/external-channel/providers/external-channel-storage.ts` | Bindings remain file-backed only and now live inside the top-level app-data external-channel folder. |
| C-003 | Symmetric bound-run continuity | `autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts` | AGENT and TEAM routes both restore persisted cached run ids before falling back to fresh run creation. |
| C-004 | Receipt-ledger ingress lifecycle | `autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts`, `autobyteus-server-ts/src/external-channel/services/channel-message-receipt-service.ts`, `autobyteus-server-ts/src/external-channel/providers/channel-message-receipt-provider.ts`, `autobyteus-server-ts/src/external-channel/providers/file-channel-message-receipt-provider.ts`, `autobyteus-server-ts/src/external-channel/providers/sql-channel-message-receipt-provider.ts`, `autobyteus-server-ts/src/external-channel/domain/models.ts` | Ingress state now lives in the receipt ledger with `PENDING -> DISPATCHING -> ACCEPTED -> ROUTED/UNBOUND`, dispatch leases, accepted correlation updates, and reply-publication transitions. |
| C-005 | Accepted receipt recovery runtime | `autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts`, `autobyteus-server-ts/src/app.ts`, `autobyteus-server-ts/src/external-channel/index.ts` | Startup now restores unfinished accepted receipts, attempts persisted exact-turn reply publication first, and falls back to live observation without reposting the inbound message. |
| C-006 | Observation-only reply bridges | `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-reply-bridge.ts`, `autobyteus-server-ts/src/external-channel/runtime/channel-team-run-reply-bridge.ts`, `autobyteus-server-ts/src/external-channel/runtime/channel-reply-bridge-support.ts`, `autobyteus-server-ts/src/external-channel/services/channel-turn-reply-recovery-service.ts` | Bridges now observe one accepted turn and return reply-ready results; durable receipt mutation and callback publication moved to the recovery runtime. |
| C-007 | Facade boundary cleanup | `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts`, `autobyteus-server-ts/src/external-channel/runtime/channel-team-run-facade.ts`, `autobyteus-server-ts/src/external-channel/runtime/channel-run-dispatch-result.ts` | Facades now own only run dispatch plus live frontend user-message publication and return accepted metadata for the receipt owner. |
| C-008 | Outbox-owned outbound durability | `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts`, `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-delivery-runtime.ts`, `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-publisher.ts`, `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-worker.ts` | Durable outbound uniqueness belongs to the callback outbox, delivery events remain observational, and callback failures are explicitly classified into retryable vs terminal paths. |
| C-009 | Legacy owner removal and startup cleanup | `autobyteus-server-ts/src/startup/agent-customization-loader.ts`, `autobyteus-server-ts/src/external-channel/providers/provider-proxy-set.ts`, removed idempotency providers/services and external-channel processors | Duplicate ingress/callback idempotency owners and the old AutoByteus-only processor path were removed from the active runtime surface. |
| C-010 | Schema, docs, and validation refresh | `autobyteus-server-ts/prisma/schema.prisma`, `autobyteus-server-ts/prisma/migrations/20260331102000_remove_channel_bindings_table/migration.sql`, `autobyteus-server-ts/prisma/migrations/20260331130000_receipt_lifecycle_and_remove_channel_idempotency/migration.sql`, `autobyteus-server-ts/docs/ARCHITECTURE.md`, `autobyteus-server-ts/docs/PROJECT_OVERVIEW.md`, external-channel tests | Schema/runtime/docs/tests now align to the v4 ownership model. |
| C-011 | Local-fix re-entry package | `autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts`, `autobyteus-server-ts/src/external-channel/runtime/channel-run-dispatch-result.ts`, `autobyteus-server-ts/src/external-channel/providers/channel-message-receipt-provider.ts`, `autobyteus-server-ts/src/external-channel/providers/file-channel-message-receipt-provider.ts`, `autobyteus-server-ts/src/external-channel/providers/sql-channel-message-receipt-provider.ts`, ingress route/tests | Closed the round-5 gaps by restoring the `ACCEPTED` retry spine, making ingress acceptance terminology truthful, specializing the AGENT/TEAM dispatch contract, and removing dead mixed-subject latest-source lookups plus the empty source-context provider indirection. |
| C-012 | Top-level external-channel storage folder | `autobyteus-server-ts/src/external-channel/providers/external-channel-storage.ts`, `autobyteus-server-ts/src/external-channel/providers/file-channel-binding-provider.ts`, `autobyteus-server-ts/src/external-channel/providers/file-channel-message-receipt-provider.ts`, `autobyteus-server-ts/src/external-channel/providers/file-delivery-event-provider.ts`, `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-store.ts`, related tests | All file-backed external-channel artifacts now resolve under one top-level `server-data/external-channel/` folder, and the live server-data folder was updated to match. |
| C-013 | Compile-clean external-channel branch fixes | `autobyteus-server-ts/src/external-channel/index.ts`, `autobyteus-server-ts/src/external-channel/providers/provider-proxy-set.ts`, `autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts`, `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-reply-bridge.ts`, `autobyteus-server-ts/src/external-channel/runtime/channel-team-run-reply-bridge.ts` | Removed one stale export, restored a missing type import, and tightened null/type boundaries so the server bundle builds cleanly again. |

## Removed Surface Area

- `autobyteus-server-ts/src/external-channel/providers/channel-idempotency-provider.ts`
- `autobyteus-server-ts/src/external-channel/providers/file-channel-idempotency-provider.ts`
- `autobyteus-server-ts/src/external-channel/providers/file-channel-callback-idempotency-provider.ts`
- `autobyteus-server-ts/src/external-channel/providers/sql-channel-idempotency-provider.ts`
- `autobyteus-server-ts/src/external-channel/providers/sql-channel-callback-idempotency-provider.ts`
- `autobyteus-server-ts/src/external-channel/services/channel-idempotency-service.ts`
- `autobyteus-server-ts/src/external-channel/services/callback-idempotency-service.ts`
- `autobyteus-server-ts/src/agent-customization/processors/persistence/external-channel-turn-receipt-binding-processor.ts`
- `autobyteus-server-ts/src/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.ts`
- obsolete processor/idempotency test files removed from `autobyteus-server-ts/tests/unit/**` and `autobyteus-server-ts/tests/integration/**`

## Validation Executed During Stage 6

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
| 2026-03-31 | `NO_TIMESTAMP=1 APPLE_TEAM_ID= pnpm -C autobyteus-web build:electron:mac` | Partial pass: regenerated bundled server and produced updated `.app`/`.zip`; DMG step hit the existing `hdiutil detach` failure. |

## Known Repo-Level Non-Gating Issue

- `pnpm --dir autobyteus-server-ts exec tsc --noEmit --pretty false` still fails with the existing repo-wide `TS6059` `rootDir` vs `tests/**` mismatch. This was already present and is not introduced by this ticket.

## Progress Log

- 2026-03-31: Preserved accepted `turnId` propagation in the Codex and Claude backend adapters.
- 2026-03-31: Added accepted-turn propagation for the AutoByteus runtime paths used by external-channel dispatch.
- 2026-03-31: Moved binding persistence to the root-level file-only storage helper and removed the legacy binding-file migration shim.
- 2026-03-31: Reworked `ChannelBindingRunLauncher` so TEAM restore follows the same persisted-id policy as AGENT restore.
- 2026-03-31: Replaced ingress/callback duplicate durable owners with receipt-ledger and outbox ownership.
- 2026-03-31: Added receipt lifecycle state plus dispatch lease handling to file and SQL receipt providers, including `ACCEPTED` and reply-publication transitions.
- 2026-03-31: Added `ChannelTurnReplyRecoveryService` plus the accepted-receipt recovery runtime for persisted reply publication and live observation fallback after restart.
- 2026-03-31: Converted the external-channel reply bridges into observation-only components and removed facade-owned reply arming.
- 2026-03-31: Added structured callback retry classification in the publisher/worker stack.
- 2026-03-31: Removed obsolete binding/idempotency schema and runtime surfaces, plus the old AutoByteus-only external-channel processors.
- 2026-03-31: Refreshed unit/integration/e2e coverage to the v4 ownership model and closed Stage 6 with a full green subsystem slice.
- 2026-03-31: Reopened Stage 6 for a local-fix package after Stage 8 round 5 found that `ACCEPTED` retries still bypass the recovery owner and that the ingress / accepted-dispatch boundaries remain weaker than intended.
- 2026-03-31: Re-registered duplicate `ACCEPTED` receipts with the accepted-receipt recovery runtime and changed the public ingress disposition to `ACCEPTED` so the external contract matches the durable receipt lifecycle.
- 2026-03-31: Split accepted dispatch metadata into explicit AGENT and TEAM variants so runtime acceptance identity no longer flows through one mixed nullable structure.
- 2026-03-31: Removed dead latest-source receipt lookup APIs and the empty `ChannelSourceContextProvider` layer, keeping the active source-resolution boundary strictly turn-scoped via `(agentRunId, turnId)`.
- 2026-03-31: Collapsed file-backed external-channel storage into one top-level `server-data/external-channel/` folder and updated the live `~/.autobyteus/server-data` layout to match.
- 2026-03-31: Fixed the branch-local external-channel TypeScript regressions so the server bundle builds cleanly again before Electron packaging.

## Downstream Stage Status Pointers

| Stage | Canonical Artifact | Status | Notes |
| --- | --- | --- | --- |
| 7 API/E2E + Executable Validation | `tickets/done/telegram-external-channel-outbound-reply/api-e2e-testing.md` | Pass | Stage 7 round 5 passed after the storage-surface refinement, clean server build, and updated Electron packaging path. |
| 8 Code Review | `tickets/done/telegram-external-channel-outbound-reply/code-review.md` | Pass | Review round 7 kept the architecture above the desired bar after the storage-surface cleanup and compile-clean fixes. |
| 9 Docs Sync | `tickets/done/telegram-external-channel-outbound-reply/docs-sync.md` | Pass | Docs now explicitly reflect the unified `server-data/external-channel/` ownership surface. |
| 10 Handoff | `tickets/done/telegram-external-channel-outbound-reply/handoff-summary.md` | In Progress | Back on the user-verification hold pending manual Telegram confirmation and finalization. |
