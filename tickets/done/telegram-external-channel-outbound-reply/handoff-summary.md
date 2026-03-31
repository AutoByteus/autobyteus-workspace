# Handoff Summary

## Summary Meta

- Ticket: `telegram-external-channel-outbound-reply`
- Date: `2026-03-31`
- Current Status: `Awaiting User Verification`
- Workflow State Source: `tickets/done/telegram-external-channel-outbound-reply/workflow-state.md`

## Delivery Summary

- Delivered scope:
  - Codex, Claude, and AutoByteus runtime boundaries now preserve the accepted metadata needed by external-channel reply routing, including `turnId` and team-member correlation where available.
  - All file-backed external-channel artifacts now live under one top-level `<appDataDir>/external-channel/` folder, including `bindings.json`, file-profile receipt/delivery stores, and `gateway-callback-outbox.json`.
  - Bound AGENT and TEAM routes now restore persisted cached run ids symmetrically before falling back to fresh run creation.
  - Receipt-ledger ownership now spans `PENDING -> DISPATCHING -> ACCEPTED -> ROUTED/UNBOUND`, and accepted receipts remain unfinished work until callback publication completes.
  - A shared accepted-receipt recovery runtime now restores unfinished accepted receipts on startup, attempts persisted exact-turn reply publication first, and falls back to live observation without reposting the original inbound message.
  - Reply bridges are observation-only, facades are dispatch-only, callback durability is outbox-owned, and callback retry classification is explicit.
  - Source-context resolution on the active reply path is now turn-scoped only; dead latest-source lookup APIs and the empty source-context provider abstraction were removed.
  - Stale SQL binding/idempotency schema support, idempotency services/providers, and the old AutoByteus-only external-channel processors were removed.
- Planned scope reference:
  - `tickets/done/telegram-external-channel-outbound-reply/implementation.md`
- Deferred / not delivered:
  - No live desktop Telegram manual verification was performed from the production UI during this ticket.
- Key architectural or ownership changes:
  - The durable reply-routing owner is now `AcceptedReceiptRecoveryRuntime`, not the agent/team facades.
  - The receipt ledger, not a facade-local watcher, is now the authority for whether an accepted inbound turn is still unfinished work.
  - Exact turn reply recovery is explicit through `ChannelTurnReplyRecoveryService`, preserving the turn-correlated routing model instead of falling back to run-level “latest message” guesses.
  - The receipt provider surface now exposes only the active turn-scoped source query used by reply publication, which removes dead mixed-subject lookup paths and improves mechanical simplicity.
- Removed / decommissioned items:
  - Prisma `ChannelBinding` model
  - SQL `channel_bindings` support path
  - split app-data storage between root binding file and `memory/persistence/external-channel/**`
  - ingress/callback idempotency providers and services
  - `ExternalChannelTurnReceiptBindingProcessor`
  - `ExternalChannelAssistantReplyProcessor`

## Verification Summary

- Unit / integration verification:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel/services/channel-message-receipt-service.test.ts tests/unit/external-channel/services/reply-callback-service.test.ts tests/unit/external-channel/services/channel-ingress-service.test.ts tests/unit/external-channel/runtime/channel-agent-run-reply-bridge.test.ts tests/unit/external-channel/runtime/channel-team-run-reply-bridge.test.ts --no-watch`
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/startup/agent-customization-loader.test.ts tests/integration/api/rest/channel-ingress.integration.test.ts tests/integration/external-channel/providers/sql-channel-message-receipt-provider.integration.test.ts tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts tests/unit/agent-execution/backends/claude/claude-agent-run-backend.test.ts --no-watch`
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel/runtime/channel-agent-run-facade.test.ts tests/unit/external-channel/runtime/channel-team-run-facade.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.test.ts --no-watch`
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel/services/channel-ingress-service.test.ts tests/unit/external-channel/runtime/channel-agent-run-facade.test.ts tests/unit/external-channel/runtime/channel-team-run-facade.test.ts tests/unit/api/rest/channel-ingress.test.ts tests/integration/api/rest/channel-ingress.integration.test.ts tests/integration/external-channel/providers/file-channel-binding-provider.integration.test.ts tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts --no-watch`
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel/services/channel-message-receipt-service.test.ts tests/unit/external-channel/services/reply-callback-service.test.ts tests/unit/external-channel/services/channel-ingress-service.test.ts tests/unit/api/rest/channel-ingress.test.ts tests/integration/api/rest/channel-ingress.integration.test.ts tests/integration/external-channel/providers/sql-channel-message-receipt-provider.integration.test.ts tests/integration/external-channel/providers/file-channel-binding-provider.integration.test.ts tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts --no-watch`
  - `pnpm -C autobyteus-server-ts exec vitest run tests/integration/external-channel/providers/file-channel-binding-provider.integration.test.ts tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts tests/unit/external-channel/runtime/gateway-callback-outbox-store.test.ts`
  - `pnpm -C autobyteus-server-ts build`
  - `NO_TIMESTAMP=1 APPLE_TEAM_ID= pnpm -C autobyteus-web build:electron:mac`
- API / E2E verification:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel tests/integration/external-channel tests/integration/api/rest/channel-ingress.integration.test.ts tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts tests/unit/startup/agent-customization-loader.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.test.ts tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts tests/unit/agent-execution/backends/claude/claude-agent-run-backend.test.ts --no-watch`
- Acceptance-criteria closure summary:
  - AC-001 through AC-010 are all recorded as `Passed` in `api-e2e-testing.md`
- Infeasible criteria / user waivers (if any):
  - None
- Residual risk:
  - A final manual Telegram round-trip in the desktop app is still useful to confirm the real gateway adapter delivers after the repaired server-side path.
  - `pnpm --dir autobyteus-server-ts typecheck` remains non-gating because the repo `tsconfig.json` includes `tests/**` while `rootDir` is `src`, causing broad `TS6059` failures unrelated to this ticket.

## Documentation Sync Summary

- Docs sync artifact:
  - `tickets/done/telegram-external-channel-outbound-reply/docs-sync.md`
- Docs result: `Updated`
- Docs updated:
  - `autobyteus-server-ts/docs/ARCHITECTURE.md`
  - `autobyteus-server-ts/docs/PROJECT_OVERVIEW.md`
- Notes:
  - Durable docs now record the unified `server-data/external-channel/` storage contract, accepted-receipt restart recovery, and the external-channel domain area.

## Release Notes Status

- Release notes required: `No`
- Release notes artifact:
  - `Not required`
- Notes:
  - This ticket is an internal bug fix / architecture repair and does not require a standalone release-note artifact.

## User Verification Hold

- Waiting for explicit user verification: `Yes`
- User verification received:
  - `No`
- Notes:
  - After your verification, Stage 10 still needs ticket archival plus repository finalization into `origin/personal`.

## Finalization Record

- Ticket archived to:
  - `Pending user verification`
- Ticket worktree path:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/telegram-external-channel-outbound-reply`
- Ticket branch:
  - `codex/telegram-external-channel-outbound-reply`
- Finalization target remote:
  - `origin`
- Finalization target branch:
  - `personal`
- Commit status:
  - `Not started`
- Push status:
  - `Not started`
- Merge status:
  - `Not started`
- Release/publication/deployment status:
  - `Not required yet`
- Worktree cleanup status:
  - `Not started`
- Local branch cleanup status:
  - `Not started`
- Blockers / notes:
  - Explicit user verification is still required before any archival, commit, push, merge, or worktree cleanup steps.
