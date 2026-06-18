# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Root cause identified; scope refined and approved by user to include remote “Pair local browser” removal in the same ticket.
- Investigation Goal: Determine why configured BrowserServer MCP tools are unavailable in Docker-hosted runtime, understand current host Electron vs remote-pairing browser support, and define the simplified browser-source design.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: The final scope crosses backend Agent Tools MCP routing, backend browser bridge support resolution, GraphQL schema removal, Electron runtime/pairing code removal, frontend Nodes UI cleanup, generated types, tests, and docs.
- Scope Summary: Remove remote host-browser pairing and fix Agent Tools MCP exposure so inactive embedded browser providers contribute no tools and reserve no names. Docker/remote browser automation should use configured BrowserServer MCP inside the node/container.
- Primary Questions Resolved:
  - Frontend displayed tool list comes from configured agent `toolNames`, not effective runtime manifest.
  - Codex/Claude runtime tool exposure comes from server-created Agent Tools MCP sessions.
  - BrowserServer MCP is configured and registered; the missing tools are dropped during Agent Tools MCP collision resolution.
  - Host Electron browser support is env-injected at bundled-server startup and should remain.
  - Remote “Pair local browser” uses an Electron-issued descriptor plus remote GraphQL runtime binding and should now be removed.

## Request Context

User reported a Docker-hosted Codex agent showing BrowserServer MCP tools in frontend configuration while runtime lacks `open_tab`. Screenshots show BrowserServer MCP tools (`open_tab`, `attach_tab`, `close_tab`, `list_tabs`, `navigate_to`, `read_page`, `screenshot`, `dom_snapshot`, `run_script`) configured on the agent/MCP settings, but Codex only discovers `attach_tab` among those browser-like tools. During discussion, user clarified the intended product direction: Docker/remote nodes should configure BrowserServer MCP inside the container/node rather than pair back to the host Electron browser. User approved removing remote “Pair local browser” functionality in this ticket.

Reference screenshots:
- `/home/autobyteus/data/memory/agent_teams/software_engineering_team_f4741a337800412488d4ef7ad45e0fe1/solution_designer_0a0d264cf92b41e988805c4cc835af50/context_files/ctx_fa1dbb54f5dd__image.png`
- `/home/autobyteus/data/memory/agent_teams/software_engineering_team_f4741a337800412488d4ef7ad45e0fe1/solution_designer_0a0d264cf92b41e988805c4cc835af50/context_files/ctx_2d94aaf727d9__image.png`
- `/home/autobyteus/data/memory/agent_teams/software_engineering_team_f4741a337800412488d4ef7ad45e0fe1/solution_designer_0a0d264cf92b41e988805c4cc835af50/context_files/ctx_3dcae27522e3__image.png`
- `/home/autobyteus/data/memory/agent_teams/software_engineering_team_f4741a337800412488d4ef7ad45e0fe1/solution_designer_0a0d264cf92b41e988805c4cc835af50/context_files/ctx_6f10b244b3d2__image.png`
- `/home/autobyteus/data/memory/agent_teams/software_engineering_team_f4741a337800412488d4ef7ad45e0fe1/solution_designer_0a0d264cf92b41e988805c4cc835af50/context_files/ctx_eafe3b541223__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker`
- Task Artifact Folder: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker`
- Current Branch: `codex/mcp-tool-exposure-docker`
- Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch --prune origin` completed successfully on 2026-06-18.
- Bootstrap Blockers: None

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-18 | Command | `git -C /home/autobyteus/workspace/autobyteus-workspace remote show origin`; `git fetch --prune origin`; `git worktree add -b codex/mcp-tool-exposure-docker ... origin/personal` | Bootstrap isolated task branch | Base branch is `personal`; worktree created. | No |
| 2026-06-18 | Screenshot | User reference images | Confirm mismatch and pair UI | Agent lists BrowserServer MCP browser tools; runtime lacks `open_tab`; Nodes UI shows remote nodes with “Pair local browser”. | No |
| 2026-06-18 | Code | `autobyteus-web/components/agents/AgentDefinitionDetailSections.vue`, `AgentCard.vue` | Determine frontend tool display source | UI shows configured `agentDefinition.toolNames`, not effective runtime manifest. | No |
| 2026-06-18 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`, `codex-agent-tools-mcp-materializer.ts` | Trace Codex tool exposure | Codex gets a run-scoped `autobyteus_agent_tools` MCP descriptor from `AgentToolMcpSessionService`. | No |
| 2026-06-18 | Code | `agent-tool-mcp-session-service.ts`, `agent-tool-mcp-catalog.ts`, `configured-mcp-agent-tool-source-resolver.ts` | Locate exposure bug | Catalog enables static adapters by availability but reserves all static adapter names for MCP collision checks. `tools/list` and `tools/call` also derive ownership from static names. | Yes |
| 2026-06-18 | Code | `browser-tools-mcp-adapter-provider.ts`, `browser-tool-service.ts`, `browser-bridge-config-resolver.ts` | Check embedded browser gate | Embedded browser execution depends on `BrowserToolService.isBrowserSupported()`, which currently checks env config then runtime remote binding. | Yes |
| 2026-06-18 | Probe | `/proc/57/environ`; `ss -ltnp`; process listing | Check live Docker server | Server has no `AUTOBYTEUS_BROWSER_BRIDGE_BASE_URL` or `AUTOBYTEUS_BROWSER_BRIDGE_TOKEN`; Chrome/CDP is present for BrowserServer MCP. | No |
| 2026-06-18 | Data | `/home/autobyteus/data/mcps.json` | Inspect MCP config | `BrowserServer` is enabled as stdio MCP using `uv --directory /home/autobyteus/workspace/autobyteus-mcps/browser-mcp run python -m browser_mcp.server`; env includes `CHROME_REMOTE_DEBUGGING_PORT=9222`. | No |
| 2026-06-18 | Probe | GraphQL query to `http://127.0.0.1:8000/graphql` for `mcpServers`, `tools`, `agentDefinition(id:"codex")` | Verify live registry | BrowserServer registered MCP-origin tools including `open_tab`; Codex agent selected those raw names. | No |
| 2026-06-18 | Log | `rg "Configured MCP tool|Successfully registered tool definition: 'open_tab'" /home/autobyteus/data/logs/server.log` | Confirm failure point | BrowserServer registration succeeded, then Agent Tools MCP session creation logged collision drops for `open_tab`, `read_page`, etc. | No |
| 2026-06-18 | Code | `autobyteus-web/electron/browser/browser-runtime.ts`, `browser-bridge-server.ts`, platform `*ServerManager.ts`, `serverRuntimeEnv.ts` | Understand host Electron path | Electron starts local bridge, gets env overrides, and server managers inject env vars into bundled server child. | Preserve path. |
| 2026-06-18 | Code | `remoteBrowserSharingStore.ts`, `RemoteBrowserSharingPanel.vue`, `RemoteNodePairingControls.vue`, `browser-pairing-state-controller.ts`, `register-browser-pairing-ipc-handlers.ts`, `nodeRemoteBrowserPairingClient.ts` | Understand remote pairing UI/Electron/frontend flow | Pair local browser is a product surface with settings, IPC, frontend store, GraphQL descriptor registration, node pairing state. | Remove path. |
| 2026-06-18 | Code | `remote-browser-bridge.ts`, `runtime-browser-bridge-registration-service.ts`, `browser-tool-registry-sync.ts`, GraphQL schema import | Understand backend remote binding | Remote GraphQL stores in-memory bridge binding and dynamically registers/unregisters embedded browser tools. | Remove path. |
| 2026-06-18 | Code | `types/node.ts`, `electron/nodeRegistryStore.ts`, `electron/nodeRegistryTypes.ts` | Understand persisted node pairing state | Node profiles include `browserPairing`; loader normalizes active pairing to expired after restart. | Remove/ignore field. |
| 2026-06-18 | Tests | Browser pairing/sharing tests; runtime remote bridge e2e; Agent Tools MCP catalog/session tests | Determine test impact | Pairing tests should be removed/replaced; Agent Tools MCP tests need route/inactive-provider cases. | Yes |

## Current Behavior / Current Flow

### Agent Tools MCP exposure

1. Agent definition includes browser tool names like `open_tab` and `attach_tab`.
2. Backend bootstrap creates an Agent Tools MCP session for the run.
3. `AgentToolMcpCatalog` enables configured static adapters only if `adapter.isAvailable(context)` returns true.
4. The catalog then resolves configured MCP tools with `reservedToolNames = this.listSupportedToolNames()`.
5. Static embedded browser adapter names are always in that supported-name list, even when Electron support is absent.
6. Configured MCP BrowserServer tools with overlapping names are dropped as collisions.
7. `attach_tab` remains because it does not overlap an embedded adapter name.
8. `tools/list` and `tools/call` are also static-name-biased, so a correct fix needs route ownership, not only a different reserved-name list.

### Host Electron-started server path to preserve

1. Electron main starts `BrowserRuntime` before initializing the bundled server.
2. `BrowserRuntime.start()` creates `BrowserBridgeServer` around Electron tab/session managers.
3. `BrowserBridgeServer.start()` binds an HTTP bridge on a random local port and issues an embedded token.
4. It returns:
   - `AUTOBYTEUS_BROWSER_BRIDGE_BASE_URL=http://127.0.0.1:<port>`
   - `AUTOBYTEUS_BROWSER_BRIDGE_TOKEN=<token>`
5. Electron calls `serverManager.setRuntimeEnvOverrides(browserRuntimeEnv)`.
6. Platform server managers spawn the bundled backend server with those env vars.
7. Backend `BrowserBridgeConfigResolver.resolve()` reads the env vars; `BrowserToolService.isBrowserSupported()` is true; embedded browser tools may be registered/exposed for that host server.

### Remote “Pair local browser” path to remove

1. Remote browser sharing settings are persisted in Electron user data and can change bridge listener host from loopback to remote-reachable host after restart.
2. Nodes settings shows Remote Browser Sharing panel and per-remote-node pairing controls.
3. Pairing calls Electron IPC `browser-pairing:issue-descriptor`.
4. Electron creates an expiring `{ baseUrl, authToken, expiresAt }` descriptor and updates local node registry state to `pairing`.
5. Frontend sends the descriptor to remote backend GraphQL `registerRemoteBrowserBridge`.
6. Remote backend stores the binding in `RuntimeBrowserBridgeRegistrationService`, schedules expiry, and calls `BrowserToolRegistrySync.syncWithSupport({ hasRuntimeBinding: true })` to register embedded browser tools.
7. Unpair/removal calls `clearRemoteBrowserBridge` and local revoke helpers.
8. This whole path is now contrary to product direction and should be removed.

## Current Design Problem

The current code has two separate browser implementation strategies for remote/Docker nodes:

- BrowserServer MCP inside the container/node.
- Host Electron browser shared to the remote node through pairing.

The user clarified that the intended strategy is the first one only. Keeping the second adds UI, API, state, security, and routing complexity while making tool exposure ambiguous. Removing remote pairing simplifies the architecture and makes the correct rule explicit:

```text
Remote/Docker node browser tools = configured MCP tools, or no browser tools.
Host Electron embedded browser tools = only for the host Electron-started server.
```

## Design Health Assessment Evidence

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `agent-tool-mcp-catalog.ts` | Uses all static adapter names as reserved names. | Inactive optional providers can suppress active MCP sources. | Route-backed exposure. |
| Server logs | `Configured MCP tool 'open_tab' was not exposed because it collides...` | Missing tool is server-side collision policy. | Fix diagnostics/tests. |
| Docker process env | No browser bridge env vars. | Embedded host browser is not available in Docker. | Docker should use BrowserServer MCP. |
| Remote pairing code | Several UI/Electron/backend layers exist solely to share host browser to remote nodes. | Product direction says this path should be removed. | Remove code/tests/docs. |
| BrowserServer MCP registry | `open_tab` registered as MCP. | Correct active source exists. | Route to it. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Target Direction |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts` | Effective Agent Tools MCP exposure/list/call. | Build route-backed exposure from active sources. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session*.ts` | Session descriptor/storage. | Store route ownership in session. |
| `autobyteus-server-ts/src/agent-tools/mcp/configured-mcp/*` | MCP source metadata/execution. | Keep; remove static collision policy from resolver. |
| `autobyteus-server-ts/src/agent-tools/browser/browser-bridge-config-resolver.ts` | Resolve env or runtime binding. | Resolve env only after remote pairing removal. |
| `autobyteus-server-ts/src/agent-tools/browser/runtime-browser-bridge-registration-service.ts` | In-memory remote bridge binding. | Delete. |
| `autobyteus-server-ts/src/agent-tools/browser/browser-tool-registry-sync.ts` | Dynamic register/unregister on pairing. | Delete if only used by removed runtime binding. |
| `autobyteus-server-ts/src/api/graphql/types/remote-browser-bridge.ts` | GraphQL mutations for remote binding. | Delete and remove from schema. |
| `autobyteus-web/electron/browser/browser-runtime.ts` | Starts local browser bridge and passes env overrides. | Keep, but remove remote listener/descriptor responsibilities. |
| `autobyteus-web/electron/browser/browser-bridge-server.ts` | Local bridge plus remote base URL support. | Keep local bridge; remove remote sharing helpers/tokens. |
| `autobyteus-web/electron/browser/browser-bridge-auth-registry.ts` | Embedded and remote token auth. | Keep embedded token only. |
| `autobyteus-web/electron/browser/browser-pairing-state-controller.ts` | Remote pairing state. | Delete. |
| `autobyteus-web/electron/browser/register-browser-pairing-ipc-handlers.ts` | Pairing IPC. | Delete and unregister from main/preload/types. |
| `autobyteus-web/electron/browser/remote-browser-sharing-settings-store.ts` | Remote sharing settings. | Delete. |
| `autobyteus-web/stores/remoteBrowserSharingStore.ts` | Frontend pairing store. | Delete. |
| `autobyteus-web/utils/nodeRemoteBrowserPairingClient.ts` | Frontend GraphQL client for pairing mutations. | Delete. |
| `autobyteus-web/components/settings/RemoteBrowserSharingPanel.vue` | Remote sharing settings UI. | Delete. |
| `autobyteus-web/components/settings/RemoteNodePairingControls.vue` | Pair/unpair UI. | Delete. |
| `autobyteus-web/components/settings/NodeManager.vue` | Nodes settings. | Remove panel, controls, store dependency, pairing cleanup during removal. |
| `autobyteus-web/types/node.ts`, `electron/nodeRegistryTypes.ts`, `electron/nodeRegistryStore.ts` | Node pairing types/persistence normalization. | Remove pairing types/field/update helper; ignore/drop legacy field. |
| `autobyteus-web/generated/graphql.ts` | Generated GraphQL types. | Regenerate/remove remote bridge types/mutations. |
| Localization `settings.ts` files | Remote sharing strings. | Remove obsolete strings and adjust add-node description. |
| Docs `autobyteus-web/docs/browser_sessions.md`, related remote-access docs if present | Document remote pairing. | Remove remote pairing docs; direct Docker to BrowserServer MCP. |

## Runtime / Probe Findings

| Method | Observation | Implication |
| --- | --- | --- |
| Live process/env probe | Docker server lacks `AUTOBYTEUS_BROWSER_BRIDGE_*`. | No embedded browser support should exist for Docker. |
| GraphQL registry probe | BrowserServer MCP tools are registered as MCP-origin. | Browser MCP is available before Agent Tools MCP exposure. |
| Server log probe | Collision warnings happen during Agent Tools MCP session creation. | Exposure/routing bug is isolated. |
| Code trace of Electron startup | Host bridge env injection exists. | Keep host Electron local browser path. |
| Code trace of pairing | Pairing has broad surface and dynamic backend binding. | Remove all layers to simplify. |

## Findings From Code / Docs / Data / Logs

1. BrowserServer MCP is configured and registered correctly in the Docker node.
2. Missing `open_tab` is caused by Agent Tools MCP collision policy, not missing MCP configuration.
3. Host Electron server support is a clean env-injection path and should stay.
4. Remote pairing is a separate product path that lets remote nodes use host Electron browser; it is now intentionally out of product direction.
5. Removing remote pairing allows backend browser support resolution to simplify to env-only.
6. Agent Tools MCP still needs route-backed source ownership so inactive embedded browser names do not suppress MCP names and same-name list/call behavior is deterministic.

## Constraints / Dependencies / Compatibility Facts

- BrowserServer MCP names should remain raw; do not require prefixes to avoid collision.
- No duplicate runtime tool definitions for a single wire name.
- Host Electron embedded browser behavior must remain functional.
- Remote/Docker nodes should not show or use pair-local-browser functionality.
- No compatibility shim should preserve removed remote pairing mutations or IPC APIs.

## Open Unknowns / Risks

- Generated frontend GraphQL types may require regeneration after GraphQL schema removal.
- Legacy node registry files may contain `browserPairing`; implementation should drop/ignore the field without preserving pairing behavior.
- Docs/tests may contain multiple references to remote browser sharing; implementation should use repository search to remove stale references.
- If users depended on remote nodes controlling host browser cookies/session, that workflow is intentionally removed.

## Notes For Architecture Reviewer

This updated scope supersedes the earlier design review package. Review should focus on:

1. Whether removing remote pairing in the same ticket is coherent with the Agent Tools MCP route fix.
2. Whether backend browser support can simplify to env-only without hidden runtime binding consumers.
3. Whether route-backed session ownership remains necessary after removal. Investigation says yes, because static adapter names can still exist in code and same-name configured MCP routes need deterministic list/call behavior.
4. Whether frontend/Electron/backend removal boundaries are complete enough to avoid dead pair-local-browser surfaces.
