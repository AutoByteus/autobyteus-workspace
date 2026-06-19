# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Root cause identified; scope refined and approved by user to include remote “Pair local browser” removal in the same ticket. Delivery reroute on 2026-06-18 added Linux ARM64 Electron local-build/startup support as a verification-blocking requirement. User follow-up on 2026-06-18 added GitHub desktop release workflow support for Linux ARM64 artifacts/metadata.
- Investigation Goal: Determine why configured BrowserServer MCP tools are unavailable in Docker-hosted runtime, understand current host Electron vs remote-pairing browser support, define the simplified browser-source design, address Linux ARM64 Electron packaging/startup required for user verification, and integrate Linux ARM64 into the GitHub desktop release workflow.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: The final scope crosses backend Agent Tools MCP routing, backend browser bridge support resolution, GraphQL schema removal, Electron runtime/pairing code removal, frontend Nodes UI cleanup, Linux Electron packaging/runtime startup, GitHub release workflow publication, generated types, tests, and docs.
- Scope Summary: Remove remote host-browser pairing and fix Agent Tools MCP exposure so inactive embedded browser providers contribute no tools and reserve no names. Docker/remote browser automation should use configured BrowserServer MCP inside the node/container. Add official Linux ARM64 host-architecture Electron build/startup support for local verification and GitHub desktop release workflow support for Linux ARM64 artifacts/metadata alongside Linux x64.
- Primary Questions Resolved:
  - Frontend displayed tool list comes from configured agent `toolNames`, not effective runtime manifest.
  - Codex/Claude runtime tool exposure comes from server-created Agent Tools MCP sessions.
  - BrowserServer MCP is configured and registered; the missing tools are dropped during Agent Tools MCP collision resolution.
  - Host Electron browser support is env-injected at bundled-server startup and should remain.
  - Remote “Pair local browser” uses an Electron-issued descriptor plus remote GraphQL runtime binding and should now be removed.
  - Linux Electron build currently hardcodes x64; ARM64 package startup currently selects x64 Prisma engines before ARM64 engines.
  - GitHub desktop release workflow currently builds Linux x64 only; electron-updater expects `latest-linux-arm64.yml` for Linux ARM64 update metadata.

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


## Delivery Reroute Investigation: Linux ARM64 Electron Packaging / Startup

### Trigger and Classification

Delivery rerouted the ticket on 2026-06-18 after the user asked to build the Linux Electron app on the current Linux host and start it for manual verification. The current host is Linux `arm64`/aarch64. The normal package script completed but produced a Linux x64 AppImage, while an ad-hoc ARM64 electron-builder package launched and then failed during embedded-server Prisma migration.

Classification: requirement gap with design impact in the Electron packaging/startup path. This is in scope because user verification of the MCP/browser-tool cleanup depends on launching the Linux desktop app on this ARM64 host.

### Additional Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-18 | Delivery artifact | `docs/tasks/mcp-tool-exposure-docker/delivery-linux-arm64-reroute.md` | Read downstream blocker and evidence | Official `pnpm -C autobyteus-web build:electron:linux` emitted x64 AppImage; ad-hoc ARM64 AppImage/unpacked app launched but embedded server failed at Prisma migration. | Yes |
| 2026-06-18 | Runtime log | `docs/tasks/mcp-tool-exposure-docker/validation-artifacts/linux-electron-app-run.log` | Confirm ARM64 app startup failure mode | Electron launched, Browser bridge started, embedded server spawned, Prisma migration selected bundled engine overrides, then failed with `Could not parse schema engine response: SyntaxError: Unexpected end of JSON input`. | Yes |
| 2026-06-18 | Code | `sed -n '1,520p' autobyteus-web/build/scripts/build.ts` | Inspect Electron build target resolution and artifact naming | `RequestedArch` already parses `--arm64`/`--x64`, but `resolvePlatformTargets('LINUX', ...)` always returns `Arch.x64`; Linux artifact name is `AutoByteus_<flavor>_linux-${version}.AppImage` with no arch token. | Yes |
| 2026-06-18 | Code | `cat autobyteus-web/package.json | jq '.scripts | with_entries(select(.key|test("electron|build")))'` | Inspect official package scripts | `build:electron:linux` chains `pnpm prepare-server` before `node build/dist/build.js --linux`; there are no Linux x64/ARM64-specific scripts. | Yes |
| 2026-06-18 | Code | `sed -n '1,340p' autobyteus-server-ts/src/startup/migrations.ts` | Inspect Prisma migration engine resolution | `getRuntimeTargetPreference()` returns Debian OpenSSL targets first for all Linux architectures, so ARM64 runtimes can pick x64 Debian engine filenames when both x64 and ARM64 engines exist. | Yes |
| 2026-06-18 | Code | `sed -n '1,360p' autobyteus-web/scripts/prepare-server.sh`; `sed -n '1,430p' autobyteus-web/scripts/prepare-server.mjs`; `cat autobyteus-web/scripts/prepare-server-dispatch.mjs` | Inspect server resource preparation | Linux dispatch currently runs the bash script. Both bash and mjs preparation paths force/validate Debian Linux Prisma targets but do not validate ARM64 target engines. Native module rebuild happens before electron-builder and is host/target sensitive. | Yes |
| 2026-06-18 | Code | `sed -n '1,30p' autobyteus-server-ts/prisma/schema.prisma` | Confirm Prisma schema binary targets | Schema includes `native`, Darwin targets, and Debian OpenSSL targets. On ARM64 Linux, `native` resolves to `linux-arm64-openssl-3.0.x`. | Yes |
| 2026-06-18 | Probe | `node -p "process.platform + ' ' + process.arch + ' openssl ' + process.versions.openssl" && pnpm -C autobyteus-server-ts exec prisma -v` | Identify runtime architecture and Prisma computed target | Host is `linux arm64`; Prisma 5.22 computed binary target is `linux-arm64-openssl-3.0.x`. | Yes |
| 2026-06-18 | Probe | `find autobyteus-web/resources/server/node_modules -path '*@prisma/engines*' ...`; `file ...schema-engine-debian-openssl-3.0.x ...schema-engine-linux-arm64-openssl-3.0.x ...AppImage` | Confirm bundled engine/artifact architectures | Bundle contains both x64 Debian and ARM64 Prisma engines. `schema-engine-debian-openssl-3.0.x` is x86-64; `schema-engine-linux-arm64-openssl-3.0.x` is ARM aarch64. Official AppImage is x86-64; ad-hoc ARM64 AppImage is ARM aarch64. | Yes |
| 2026-06-18 | Code/tests | `rg -n "resolvePrismaEnginePair|getRuntimeTargetPreference|buildPrismaCommandEnv|migrations" autobyteus-server-ts/src autobyteus-server-ts/tests` | Locate existing coverage | Unit coverage exists in `tests/unit/startup/migrations-prisma-engine-env.test.ts` but current helper expectations use Debian targets on Linux and do not simulate ARM64 preference with mixed engine files. | Yes |
| 2026-06-18 | Workflow/docs | `.github/workflows/release-desktop.yml`, `autobyteus-web/docs/electron_packaging.md`, `autobyteus-web/README.md`, `README.md` | Determine release/docs behavior | Release desktop workflow has only `build-linux` on `ubuntu-22.04` x64. Docs say Linux artifact pattern is generic `linux-{version}` and release bullets list only Linux x64 AppImage. | Yes |
| 2026-06-18 | Code | `.github/workflows/release-desktop.yml` lines 367-570 | Inspect desktop release jobs and publish assets | Current workflow has one `build-linux` job on `ubuntu-22.04`, uploads artifact `linux-x64`, publishes `*.AppImage`, `*.AppImage.blockmap`, and `**/latest-linux.yml`. `publish-release` needs only `build-linux`, not ARM64. | Yes |
| 2026-06-18 | Code | `autobyteus-web/node_modules/electron-updater/out/providers/Provider.js` | Verify Linux updater metadata naming | Provider channel prefix is `-linux` for x64 and `-linux-${arch}` for non-x64. ARM64 clients request `latest-linux-arm64.yml`, while x64 clients request `latest-linux.yml`. `findFile` also prefers files whose URL includes `process.arch`. | Yes |
| 2026-06-18 | Local artifact | `autobyteus-web/electron-dist/latest-linux-arm64.yml`; `autobyteus-web/electron-dist/latest-linux.yml` | Confirm electron-builder generated metadata names during delivery probe | Ad-hoc ARM64 build generated `latest-linux-arm64.yml` referencing `AutoByteus_enterprise_linux-arm64-1.3.60.AppImage`; x64 build generated `latest-linux.yml` referencing the generic x64 artifact. | Yes |
| 2026-06-19 | Implementation reroute | Message from `implementation_engineer` for API/E2E Round 3 `LF-002`; `docs/tasks/mcp-tool-exposure-docker/validation-artifacts/api-e2e-round3-lf002-blockmap-evidence.log` | Investigate missing Linux `*.AppImage.blockmap` artifact after fresh ARM64 build | Fresh `pnpm -C autobyteus-web build:electron:linux:arm64` produced the ARM64 AppImage, `latest-linux-arm64.yml`, and `linux-arm64-unpacked`, but no standalone `.AppImage.blockmap`; workflow/docs/requirements still expected one. | Yes |
| 2026-06-19 | Local package source | `node_modules/.pnpm/app-builder-lib@25.1.8*/node_modules/app-builder-lib/out/targets/AppImageTarget.js`; `node_modules/.pnpm/app-builder-lib@25.1.8*/node_modules/app-builder-lib/out/targets/differentialUpdateInfoBuilder.js` | Verify electron-builder AppImage blockmap output behavior for installed version | `AppImageTarget` sends `updateInfo` returned by `executeAppBuilderAsJson(args)` to artifact completion and does not call `createBlockmap`; `differentialUpdateInfoBuilder` has separate `appendBlockmap` (embedded) and `createBlockmap` (standalone) paths, but AppImage uses the embedded update-info path. | Yes |
| 2026-06-19 | Local package source | `node_modules/.pnpm/electron-updater@6.8.3/node_modules/electron-updater/out/AppImageUpdater.js`; `node_modules/.pnpm/electron-updater@6.8.3/node_modules/electron-updater/out/differentialDownloader/FileWithEmbeddedBlockMapDifferentialDownloader.js` | Verify updater consumption path | `AppImageUpdater` uses `FileWithEmbeddedBlockMapDifferentialDownloader`; the downloader reads `packageInfo.blockMapSize`, fetches bytes from the end of the new AppImage, and reads the old blockmap from the old AppImage tail. It does not download a standalone `.AppImage.blockmap`. | Yes |
| 2026-06-19 | Local artifact/probe | `cat autobyteus-web/electron-dist/latest-linux-arm64.yml`; `find autobyteus-web/electron-dist -maxdepth 1 ...` | Confirm actual ARM64 artifact contract | Metadata file contains `blockMapSize: 335143` for `AutoByteus_enterprise_linux-arm64-1.3.60.AppImage`; no matching `*.AppImage.blockmap` file exists. | Yes |
| 2026-06-18 | External docs | GitHub-hosted runners reference: `https://docs.github.com/en/actions/reference/runners/github-hosted-runners` | Check current official Linux ARM64 runner labels | GitHub docs list Linux ARM64 hosted labels including `ubuntu-24.04-arm`, `ubuntu-22.04-arm`, and `ubuntu-26.04-arm` in public preview. | Yes |
| 2026-06-18 | External docs | electron-builder architecture docs: `https://www.electron.build/docs/architecture/`; auto-update docs: `https://www.electron.build/docs/features/auto-update/` | Check architecture and updater support | electron-builder documents Linux `--arm64`; native modules are architecture-specific; auto-update docs list Linux AppImage as an auto-updatable target and CI as the intended release provisioning path. | Yes |

### Current-State Findings

1. **Build target owner is partially designed but incomplete.** `autobyteus-web/build/scripts/build.ts` already has a `RequestedArch` parser and uses requested architecture for macOS, but Linux ignores it and always builds `Arch.x64`. This explains why the official Linux command generated an x86-64 AppImage on the ARM64 host.
2. **Linux artifact naming hides architecture.** Current Linux artifact names omit an architecture token, so a generic `AutoByteus_<flavor>_linux-<version>.AppImage` can be x64 or ARM64 depending on how electron-builder was invoked. This is unsafe once ARM64 support exists.
3. **Server packaging is target-sensitive.** The Electron app bundles `resources/server`, Prisma engines, Prisma Client native engines, and native modules such as `node-pty`. Preparing these resources on one architecture and packaging for a different Linux architecture risks invalid runtime binaries. The supported design should prefer host-architecture Linux builds and fail clearly for unsupported cross-arch requests unless a target-aware native rebuild path is implemented.
4. **ARM64 Prisma engines are present but not selected.** On the ARM64 host, the packaged server bundle contains `schema-engine-linux-arm64-openssl-3.0.x` and `libquery_engine-linux-arm64-openssl-3.0.x.so.node`. The runtime resolver still picks Debian engine filenames first. The x64 schema engine cannot emit valid JSON on ARM64, producing the observed Prisma parse failure.
5. **Preparation validation is incomplete for ARM64.** Linux preparation scripts currently validate Debian OpenSSL engine files only. They do not assert that the host/target ARM64 Prisma engine pair exists when building on ARM64.
6. **Release publication is x64-only today and must be extended.** `.github/workflows/release-desktop.yml` originally built Linux only on x64 Ubuntu and uploaded/published x64 artifacts. User follow-up makes this an in-scope pipeline requirement: add a Linux ARM64 build job on an ARM64 Linux runner, upload/publish ARM64 AppImage artifacts, and publish ARM64 updater metadata as `latest-linux-arm64.yml` alongside x64 `latest-linux.yml`.
7. **Linux updater metadata is already architecture-suffixed by electron-updater.** The installed `electron-updater` provider computes channel names as `latest-linux.yml` for x64 and `latest-linux-arm64.yml` for ARM64. The release workflow should publish both metadata files, not merge them into one Linux file and not upload duplicate basenames.
8. **Pipeline validation should cover runtime, not only artifact existence.** Existing macOS jobs validate Prisma engines and packaged terminal runtime. Linux x64/ARM64 jobs should similarly validate AppImage architecture, required Prisma engine files, and packaged server startup/migrations using the unpacked app or Electron-as-Node server spawn.
9. **Linux AppImage blockmaps are embedded, not standalone release assets.** `app-builder-lib@25.1.8` AppImage output produces AppImage update info with `blockMapSize`, and `electron-updater@6.8.3` reads embedded blockmap data from the AppImage tail through `FileWithEmbeddedBlockMapDifferentialDownloader`. Requiring `*.AppImage.blockmap` in Linux upload/publish globs is a requirements/design/docs error; the release asset set should be AppImage + `latest-linux*.yml` metadata for Linux, while macOS DMG/ZIP standalone blockmaps remain separate assets.

### Root Cause for ARM64 Startup Failure

The ARM64 packaged app failed because runtime Prisma engine selection used a platform-only Linux preference list:

`debian-openssl-3.0.x -> debian-openssl-1.1.x -> linux-musl`

On ARM64 Linux this list is wrong. It chooses x86-64 Debian engine files before `linux-arm64-openssl-3.0.x`, even when the correct ARM64 files are bundled. The target invariant should be architecture-first:

- Linux ARM64: prefer `linux-arm64-openssl-3.0.x`, then other ARM64-compatible Linux targets if supported; do not fall back to x64 Debian engines.
- Linux x64: prefer `debian-openssl-3.0.x`, then `debian-openssl-1.1.x`, then other x64-compatible targets.

### Design Implications

- Add Linux architecture resolution as a packaging invariant, not only an electron-builder target flag.
- Make the default Linux build host-architecture aware (`process.arch` -> `x64` or `arm64`) and add explicit x64/ARM64 entrypoints or flags.
- Keep release Linux x64 explicit in workflow/docs and add an explicit Linux ARM64 release job; do not rely on host-architecture defaults in either job.
- Include architecture in Linux artifact names (`linux-x64`, `linux-arm64`).
- Update server startup Prisma engine selection and tests so ARM64-compatible engines win over incompatible x64 Debian names.
- Update Linux preparation validation in both maintained preparation paths or retire one path so there is no split behavior.
- Add packaged/unpacked ARM64 startup validation evidence: build ARM64 on ARM64, launch unpacked app or AppImage, confirm Prisma migration success and embedded server health.
- Add CI/release validation gates for Linux x64 and ARM64: architecture inspection, metadata naming, `blockMapSize` in updater metadata, required Prisma engine files, and packaged server startup/migration health.
- Remove Linux `*.AppImage.blockmap` upload/publish/documentation requirements; AppImage blockmaps are embedded and only macOS DMG/ZIP targets should keep separate `.blockmap` artifacts.

### Open Unknowns / Scope Boundaries

- Linux ARM64 release publication is now in scope. The workflow must use a distinct ARM64 metadata asset (`latest-linux-arm64.yml`) rather than publishing two `latest-linux.yml` files. Linux AppImage release publication should not include standalone `.AppImage.blockmap` files; updater metadata `blockMapSize` validates the embedded blockmap.
- Full Linux cross-architecture packaging remains out of scope unless implementation deliberately adds target-aware native module rebuilding and Prisma target preparation. The safe default is to use native x64 and native ARM64 CI runners and fail unsupported cross-arch requests early and clearly.
