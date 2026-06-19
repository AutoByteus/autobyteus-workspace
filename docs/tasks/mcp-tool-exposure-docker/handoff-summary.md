# Handoff Summary: MCP/browser tool exposure cleanup

## Summary Meta

- Ticket: `mcp-tool-exposure-docker`
- Date: 2026-06-18
- Current Status: `Ready for user verification; repository finalization on hold`
- Workflow State Source: cumulative delivery artifact chain under `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/`.
- Worktree: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker`
- Ticket branch: `codex/mcp-tool-exposure-docker`
- Finalization target: `origin/personal` / `personal`

## Delivery Summary

- Delivered scope:
  - Removed remote “Pair local browser” / remote browser sharing across backend GraphQL/runtime, Electron IPC/state/runtime, frontend Node Manager UI/store/client/types, localization, tests, and docs.
  - Preserved desktop Electron embedded browser support through Browser bridge environment variables injected into the bundled server at startup.
  - Fixed Agent Tools MCP exposure by snapshotting source-aware routes per session so `enabledTools`, `tools/list`, and `tools/call` use the same source decision.
  - Allowed configured MCP-origin BrowserServer browser tools such as `open_tab` to route on Docker/remote nodes when selected, without requiring host Electron browser pairing.
  - Kept protected first-party platform/control names such as `send_message_to` protected from configured MCP collisions.
  - Updated generated GraphQL types, durable tests, localization, and long-lived docs for the removed remote pairing path and route-backed MCP behavior.
- Planned scope reference: `requirements.md`, `design-spec.md`, `implementation-handoff.md`.
- Deferred / not delivered:
  - No BrowserServer MCP package changes.
  - No provider-level MCP namespacing redesign.
  - No persisted source-aware user selection for host embedded browser vs configured MCP browser duplicates; current policy deterministically prefers configured MCP for browser overlaps.
  - No full model-driven Codex run against a live BrowserServer subprocess; API/E2E validated representative Agent Tools MCP route/list/call and actual BrowserServer `open_tab` structured output shape.
- Key architectural or ownership changes: `AgentToolMcpToolRoute` and session route tables own Agent Tools MCP source selection; `BrowserBridgeConfigResolver` is env-only; Docker/remote browser automation belongs to configured MCP-origin tools.
- Removed / decommissioned items: remote runtime browser bridge registration, remote browser bridge GraphQL mutations/types, Electron remote browser sharing/pairing IPC/settings/state, Node Manager remote pairing controls, remote pairing store/client, stale remote pairing tests.

## Initial Delivery Integration Refresh

- Recorded base branch: `origin/personal`.
- Branch creation/base reference: `39449cfb9307c5dddcf24bc4c9710ccc8d8baf72` (`39449cfb`) from `investigation-notes.md`.
- Delivery latest tracked base checked: `origin/personal` at `79857c513dd6d6e25c4b7761cb5aa0d3a805c227` after `git fetch --prune origin` on 2026-06-18.
- Base advanced at delivery start: `Yes` — `origin/personal` moved from `39449cfb` to `79857c51`.
- Local checkpoint commit: `1c088561cd10a7782165fece47051c7c75792cea` (`chore(ticket): checkpoint mcp browser tool cleanup`) created to preserve the reviewed/API-E2E-validated candidate before integration.
- Integration method: merge `origin/personal` into `codex/mcp-tool-exposure-docker`.
- Integration result: completed with merge commit `a3791dc947f8e81f7e47fceca35b55abf0946772`; no conflicts.
- Delivery edits started only after integrated state was current: `Yes`.
- Current merge-base check: `git merge-base HEAD origin/personal` equals `79857c513dd6d6e25c4b7761cb5aa0d3a805c227`.

## Verification Summary

Authoritative upstream validation before delivery:

- API/E2E coverage investigation: `api-e2e-coverage-investigation.md`.
- API/E2E execution coverage report: `api-e2e-execution-coverage-report.md`.
- API/E2E result: `Pass`.
- No repository-resident durable coverage code was added, updated, or removed during API/E2E; no coverage-code re-review was required.

Post-integration checks after delivery latest-base merge:

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts tests/unit/agent-tools/browser/browser-bridge-config-resolver.test.ts tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts --config vitest.config.ts --reporter=verbose` — passed (4 files / 28 tests).
- `pnpm -C autobyteus-web exec vitest run components/settings/__tests__/NodeManager.spec.ts --config vitest.config.mts --reporter=verbose` — passed (1 file / 9 tests).
- `pnpm -C autobyteus-web exec vitest run electron/browser/__tests__/browser-runtime.spec.ts electron/__tests__/nodeRegistryStore.spec.ts --config electron/vitest.config.ts --reporter=verbose` — passed (2 files / 5 tests).
- `git diff --check` — passed after delivery docs/report artifacts were written.

Acceptance-criteria closure summary:

- BrowserServer MCP `open_tab` on a Docker/no-env BrowserServer-style route is exposed as configured MCP and calls successfully through Agent Tools MCP.
- Docker/no-env/no-BrowserServer exposure does not produce embedded browser tools.
- Host Electron embedded browser support remains available through env-injected bridge configuration.
- `enabledTools`, `tools/list`, and `tools/call` share one route decision and avoid duplicate same-name browser definitions.
- Remote browser bridge GraphQL mutations/types, Electron IPC APIs, Nodes settings pairing controls, and stale remote pairing tests are removed.
- Durable docs now direct Docker/remote browser automation to configured BrowserServer MCP or no browser tools.

Residual risk:

- Broad `pnpm -C autobyteus-server-ts typecheck` and `pnpm -C autobyteus-web exec nuxi typecheck` remain known noisy baseline checks per implementation handoff; focused server build tsc and web Electron transpile passed upstream.
- Full live model-driven Codex run against a spawned BrowserServer subprocess and desktop browser activity card rendering were not run; API/E2E validated representative MCP route/list/call, actual BrowserServer output shape, and canonical event payload instead.

## Documentation Sync Summary

- Docs sync artifact: `docs-sync-report.md`.
- Docs result: `Updated`.
- Docs updated:
  - `autobyteus-server-ts/docs/modules/agent_tools.md`
  - `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`
  - `autobyteus-web/docs/browser_sessions.md`
- Documentation search confirmed no stale remote bridge/pairing guidance remains in long-lived docs outside intentional absence/drop assertions in tests.

## Release Notes Status

- Release notes required: `Yes` — this is a user-facing runtime/tool exposure fix plus product-surface removal.
- Release notes artifact: `release-notes.md`.
- Notes: Release notes are prepared for a future finalization/release path but have not been used for publication because explicit user finalization/release instruction has not been received.

## User Verification Hold

- Explicit user completion/verification received: `No`.
- Waiting for explicit user verification/finalization instruction: `Yes`.
- Notes: Per delivery workflow, ticket archival, final ticket-branch commit for delivery docs, push, merge into `personal`, release/tag publication, deployment, and worktree/branch cleanup are all on hold until the user confirms verification and asks to finalize.

## Finalization Record

- Ticket archived to: `Not yet`.
- Current ticket artifact path: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/`.
- Ticket worktree path: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker`.
- Ticket branch: `codex/mcp-tool-exposure-docker`.
- Finalization target remote: `origin`.
- Finalization target branch: `personal`.
- Commit status: `Pending user verification` — only the delivery checkpoint and latest-base merge are committed; delivery docs/report edits are intentionally uncommitted pending finalization.
- Push status: `Pending user verification`.
- Merge status: `Pending user verification`.
- Release/publication/deployment status: `Not started`.
- Worktree cleanup status: `Not started`.
- Blockers / notes: No product blocker. The only hold is the required explicit user verification/finalization signal.
