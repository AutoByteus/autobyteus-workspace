# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/requirements.md`
- Investigation notes: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/investigation-notes.md`
- Design spec: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/design-spec.md`
- Design review report: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/design-review-report.md`

## What Changed

- Removed remote “Pair local browser” / remote browser sharing end to end.
  - Backend GraphQL remote bridge mutations/types and runtime remote browser binding are gone.
  - Electron pairing state, remote sharing settings, IPC/preload APIs, remote token authorization, and listener-host behavior are gone.
  - Frontend Node Manager no longer renders or calls remote browser pairing/sharing controls, stores, or clients.
  - Node profile/state no longer models `browserPairing`; legacy persisted fields are dropped during load with no retained behavior.
- Preserved host Electron embedded browser support through local bridge env injection only.
  - Electron still starts `BrowserRuntime`/`BrowserBridgeServer` and injects browser bridge env overrides into the bundled backend.
  - Backend `BrowserBridgeConfigResolver` is env-only.
- Refactored Agent Tools MCP exposure to be route-backed.
  - Added `AgentToolMcpToolRoute` / route table model.
  - `AgentToolMcpCatalog.resolveConfiguredSessionToolExposure` builds one frozen source route per enabled wire tool name.
  - `tools/list` and `tools/call` now use the session route table instead of static-name-first dispatch.
  - Configured MCP browser tools such as `open_tab` can be exposed on Docker/remote nodes when selected, because inactive static browser adapter names are no longer globally reserved.
- Encoded protected static collision policy explicitly.
  - Browser static adapters use `prefer_configured_mcp` so same-name BrowserServer MCP wins deterministically for this ticket.
  - Platform/control static adapters use `protect_static_adapter` so configured MCP cannot override tools such as `send_message_to`.
- Updated generated GraphQL types, localization, tests, and durable docs to remove remote browser pairing instructions/APIs.

## Key Files Or Areas

- Agent Tools MCP routing:
  - `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-tool-route.ts`
  - `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts`
  - `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session*.ts`
  - `autobyteus-server-ts/src/agent-tools/mcp/configured-mcp/configured-mcp-agent-tool-source-resolver.ts`
  - `autobyteus-server-ts/src/agent-tools/mcp/providers/*-mcp-adapter-provider.ts`
- Browser source simplification:
  - `autobyteus-server-ts/src/agent-tools/browser/browser-bridge-config-resolver.ts`
  - `autobyteus-web/electron/browser/browser-runtime.ts`
  - `autobyteus-web/electron/browser/browser-bridge-server.ts`
  - `autobyteus-web/electron/browser/browser-bridge-auth-registry.ts`
- Removed backend remote pairing files:
  - `autobyteus-server-ts/src/agent-tools/browser/runtime-browser-bridge-registration-service.ts`
  - `autobyteus-server-ts/src/agent-tools/browser/browser-tool-registry-sync.ts`
  - `autobyteus-server-ts/src/api/graphql/types/remote-browser-bridge.ts`
- Removed frontend/Electron remote pairing files:
  - `autobyteus-web/electron/browser/browser-pairing-state-controller.ts`
  - `autobyteus-web/electron/browser/register-browser-pairing-ipc-handlers.ts`
  - `autobyteus-web/electron/browser/remote-browser-sharing-settings-store.ts`
  - `autobyteus-web/components/settings/RemoteBrowserSharingPanel.vue`
  - `autobyteus-web/components/settings/RemoteNodePairingControls.vue`
  - `autobyteus-web/stores/remoteBrowserSharingStore.ts`
  - `autobyteus-web/utils/nodeRemoteBrowserPairingClient.ts`
- Updated surfaces:
  - `autobyteus-server-ts/src/api/graphql/schema.ts`
  - `autobyteus-web/generated/graphql.ts`
  - `autobyteus-web/components/settings/NodeManager.vue`
  - `autobyteus-web/electron/main.ts`, `preload.ts`, `types.d.ts`, `types/electron.d.ts`, `types/node.ts`
  - `autobyteus-web/docs/browser_sessions.md`
  - `docs/future-tickets/mobile-backend-authorization-hardening.md`

## Important Assumptions

- Docker/remote browser automation should come from configured BrowserServer MCP inside that node/container, not from the host Electron browser.
- If a host Electron embedded browser static adapter and a same-named configured BrowserServer MCP tool are both selected, the configured MCP route wins for this ticket. Persisted source-aware user selection remains deferred.
- Platform/control static tools should stay protected from configured MCP name collisions.
- Generated GraphQL types were updated consistently with the removed backend schema surface; a full codegen workflow was not required by the implementation path used here.

## Known Risks

- BrowserServer MCP result-shape/UI event normalization still needs API/E2E coverage validation downstream.
- The repo has pre-existing broad typecheck failures outside this scope:
  - `pnpm -C autobyteus-server-ts typecheck` fails on `TS6059` because the root tsconfig includes `tests/**` outside `rootDir`.
  - `pnpm -C autobyteus-web exec nuxi typecheck` fails on existing unrelated web/test/generated-type issues; no removed remote-browser API issue was identified in that attempted run.
- Repository-wide search for removed remote-pairing identifiers now only finds intentional legacy-drop assertions for persisted `browserPairing` in `autobyteus-web/electron/__tests__/nodeRegistryStore.spec.ts`.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix + Behavior Change + Removal/Cleanup.
- Reviewed root-cause classification: Boundary Or Ownership Issue plus Legacy Or Compatibility Pressure.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes: Implementation removed the legacy remote pairing path instead of hiding it, moved Agent Tools MCP source ownership into a per-session route table, and preserved the existing host Electron env-injected browser boundary.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`.
- Notes: Largest changed source implementation files remain under 500 effective non-empty lines (`electron/main.ts` 457, `NodeManager.vue` 310, `agent-tool-mcp-catalog.ts` 293). The route model was extracted to keep the catalog from absorbing route-table structure definitions.

## Environment Or Dependency Notes

- Dependencies were installed in the worktree with `corepack pnpm install --frozen-lockfile` so local checks could run.
- Prisma client generation was run for server build typechecking: `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma`.
- Nuxt prepare was run before focused web tests: `pnpm -C autobyteus-web exec nuxi prepare`.

## Local Implementation Checks Run

Implementation-scoped checks only:

- Passed: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts tests/unit/agent-tools/browser/browser-bridge-config-resolver.test.ts tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts`
  - Result: 4 files / 28 tests passed.
- Passed: `pnpm -C autobyteus-web exec vitest run components/settings/__tests__/NodeManager.spec.ts --config vitest.config.mts`
  - Result: 1 file / 9 tests passed.
- Passed: `pnpm -C autobyteus-web exec vitest run electron/browser/__tests__/browser-runtime.spec.ts electron/__tests__/nodeRegistryStore.spec.ts --config electron/vitest.config.ts`
  - Result: 2 files / 5 tests passed.
- Passed: `pnpm -C autobyteus-web guard:localization-boundary`.
- Passed: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` after Prisma generation.
- Passed: `pnpm -C autobyteus-web transpile-electron`.
- Passed: `git diff --check`.
- Passed search cleanup check: `rg` for removed remote browser pairing/bridge identifiers only reports the intentional legacy `browserPairing` drop assertions in `nodeRegistryStore.spec.ts`.
- Attempted, not passed due apparent baseline issues: `pnpm -C autobyteus-server-ts typecheck` (`TS6059` tests outside `rootDir`).
- Attempted, not passed due apparent baseline issues: `pnpm -C autobyteus-web exec nuxi typecheck` (existing unrelated web/test/generated-type errors).

## Downstream Coverage Hints / Suggested Scenarios

- Docker/remote node with configured BrowserServer MCP and selected `open_tab`: `tools/list` includes `open_tab`; `tools/call` routes to MCP registry adapter.
- Docker/remote node without BrowserServer MCP and without browser bridge env: browser tools are absent.
- Host Electron-started server with env-injected bridge and selected browser tool: static embedded browser route remains available.
- Same-name host embedded browser static adapter plus same-name configured BrowserServer MCP: deterministic configured MCP route wins.
- Protected static collision such as `send_message_to`: configured MCP duplicate is blocked and static route stays protected.
- UI/Electron/GraphQL absence checks: no Remote Browser Sharing panel, no Pair local browser controls, no preload IPC APIs, no GraphQL remote bridge mutations.
- Node removal flow: removes remote node without remote browser cleanup calls.
- Durable docs: Docker/remote browser automation points users to BrowserServer MCP, not host-browser pairing.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. API/E2E should own coverage investigation, broader execution, result-shape validation, and any durable coverage edits/removals after this code review pass.
