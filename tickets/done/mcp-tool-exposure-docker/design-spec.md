# Design Spec

## Current-State Read

Current code supports two browser paths:

1. **Host Electron embedded browser path**: Electron starts `BrowserRuntime`, starts `BrowserBridgeServer`, receives `AUTOBYTEUS_BROWSER_BRIDGE_BASE_URL` and `AUTOBYTEUS_BROWSER_BRIDGE_TOKEN`, then injects those env vars into the bundled backend server process. Backend browser support is available when `BrowserBridgeConfigResolver` can read those env vars.
2. **Remote/Docker host-browser pairing path**: Electron can expose its local browser bridge to a remote node. The UI shows Remote Browser Sharing and Pair/Unpair controls; Electron issues an expiring descriptor; the frontend sends it to the remote node via GraphQL; the remote backend stores it in `RuntimeBrowserBridgeRegistrationService` and dynamically registers embedded browser tools.

The user clarified that remote/Docker nodes should not use the host Electron browser. They should use BrowserServer MCP configured inside the container/node. Therefore path 2 is now legacy and should be removed in this ticket.

There is also an independent Agent Tools MCP exposure bug: the catalog always treats static embedded browser adapter names as reserved even when Electron browser support is absent. This causes configured BrowserServer MCP tools such as `open_tab` to be dropped. `tools/list` and `tools/call` also derive ownership by static adapter name, so the target design must store explicit route ownership per session.

Delivery verification exposed a second in-scope architecture/startup issue: Linux Electron packaging is not host-architecture aware. `autobyteus-web/build/scripts/build.ts` parses `--arm64`/`--x64` but hardcodes Linux to `Arch.x64`, and Linux artifact names omit architecture. An ad-hoc Linux ARM64 package launched, but embedded server startup failed because `autobyteus-server-ts/src/startup/migrations.ts` prefers x64 Debian Prisma engine filenames for every Linux runtime before checking ARM64-compatible engines. User follow-up clarified that the GitHub desktop release pipeline should support this too. The target design must add a host-architecture Linux build path, architecture-aware Prisma engine selection, and Linux ARM64 release workflow support so verification and release artifacts cover ARM64. A subsequent `LF-002` reroute corrected one release-contract detail: Linux AppImage differential update data is embedded in the AppImage and referenced by `blockMapSize` in `latest-linux*.yml`; the workflow and docs must not require standalone `*.AppImage.blockmap` assets for Linux.

## Intended Change

Simplify the browser-source model and fix Agent Tools MCP routing:

```text
Host Electron-started server:
  embedded browser tools via env-injected local bridge

Remote/Docker server:
  BrowserServer MCP tools if configured/selected
  otherwise no browser tools

Remote/Docker server:
  no host Electron browser pairing
```

Implementation design:

1. Remove remote browser sharing/pairing UI, Electron IPC/state, frontend store/client, backend GraphQL mutations, backend runtime binding service, dynamic browser tool registry sync, generated types, tests, and docs.
2. Keep host Electron embedded browser support through env injection only.
3. Simplify backend browser support resolution to env-only.
4. Refactor Agent Tools MCP session exposure to build a source-aware route table from active providers and configured MCP sources.
5. Ensure `enabledTools`, `tools/list`, and `tools/call` all derive from the frozen session route table.
6. Make Linux Electron packaging host-architecture aware: default Linux builds target the current Linux host architecture; explicit x64/ARM64 entrypoints are available; unsupported cross-architecture Linux builds fail clearly.
7. Include Linux architecture in AppImage artifact names.
8. Make packaged server Prisma engine selection and preparation validation architecture-aware, including Linux ARM64 startup validation.
9. Extend `.github/workflows/release-desktop.yml` with explicit Linux x64 and Linux ARM64 build jobs, architecture-specific updater metadata (`latest-linux.yml` for x64, `latest-linux-arm64.yml` for ARM64), release publishing, and CI validation for both Linux architectures; Linux AppImage upload/publish paths include AppImage + metadata assets only and validate embedded blockmap metadata (`blockMapSize`) instead of standalone `.AppImage.blockmap` files.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Change + Removal/Cleanup + Packaging/Startup Support.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus Legacy Or Compatibility Pressure for browser sources; Missing Invariant for Linux package target architecture and Prisma runtime engine selection.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence: Runtime Docker server has BrowserServer MCP registered and no Electron bridge env. Catalog still reserves embedded browser names, and remote pairing code adds a second unsupported browser source for remote nodes. Delivery verification shows the official Linux build emits x64 on ARM64, while an ad-hoc ARM64 package fails Prisma migration after selecting x64 Debian engine files. API/E2E Round 3 shows Linux ARM64 AppImage builds emit metadata with `blockMapSize` but no standalone `.AppImage.blockmap`, matching installed AppImage updater behavior.
- Design response: Remove the remote pairing source entirely, make Agent Tools MCP source ownership explicit through route-backed sessions, add a Linux packaging/startup invariant that ties build target, artifact naming, server resource preparation, and Prisma engine selection to the runtime architecture, and correct Linux release publication to AppImage + metadata with embedded blockmap validation.
- Refactor rationale: Removing pairing without route-backed exposure still leaves static-name suppression and static-first call routing. Route ownership is needed for correctness.
- Intentional deferrals and residual risk, if any: Persisted source-aware agent tool selection is deferred. The current bare-name configuration remains, with deterministic runtime source routing. Any future need for user-selectable browser source on host Electron should be a separate source-aware configuration feature. Linux cross-architecture packaging remains deferred; this ticket uses native Linux x64 and native Linux ARM64 build hosts/runners.

## Terminology

- Embedded browser: AutoByteus-owned Electron/local bridge browser tools for the host Electron-started bundled server.
- Remote pairing: removed flow that allowed remote/Docker nodes to use the host Electron browser bridge.
- Configured MCP source: a tool registered from a user-configured MCP server such as BrowserServer.
- Effective provider: a provider that participates in a specific runtime/session.
- Route: per-session source ownership for one Agent Tools MCP wire tool name.
- Protected static tool: internal platform/control tool that must not be overridden by configured MCP, e.g. `send_message_to`.
- Linux package target architecture: the architecture (`x64` or `arm64`) of the Linux Electron artifact and bundled native server resources. For this ticket it must match the Linux host architecture unless full cross-architecture native packaging is explicitly added.
- Linux AppImage embedded blockmap: electron-builder/electron-updater's Linux AppImage differential update contract where compressed blockmap data is appended to the AppImage and its size is stored as `blockMapSize` in `latest-linux*.yml`; no separate Linux `*.AppImage.blockmap` asset is produced or consumed.
- Prisma runtime target: the Prisma binary target string compatible with the running packaged server process, e.g. `linux-arm64-openssl-3.0.x` on this ARM64 host.

## Design Reading Order

1. DS-001: browser-source simplification.
2. DS-002: Agent Tools MCP route-backed exposure.
3. DS-003: UI/Electron/backend removal of remote pairing.
4. DS-005/DS-006: Linux Electron architecture-aware packaging and ARM64 startup.
5. DS-007: GitHub desktop release pipeline support for Linux ARM64.
6. File responsibility and removal plan.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove remote “Pair local browser” functionality instead of hiding it behind a flag or keeping fallback APIs.
- The design is invalid if it preserves remote bridge GraphQL mutations, remote pairing IPC APIs, or runtime remote browser binding as compatibility paths.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Browser source setup | Effective browser provider availability | Browser tool service / Electron runtime | Defines host Electron only vs remote MCP. |
| DS-002 | Primary End-to-End | Agent selected tool names | Agent Tools MCP route table and descriptor | `AgentToolMcpCatalog` | Fixes MCP browser exposure and static collision policy. |
| DS-003 | Primary End-to-End | Nodes settings / Electron IPC / GraphQL pairing surfaces | Removed code paths | Frontend/Electron/backend owners | Ensures Pair local browser is actually gone. |
| DS-004 | Return-Event | Runtime tool execution event | Canonical UI tool event | Existing backend event converters | Must remain stable after BrowserServer MCP tools become visible. |
| DS-005 | Primary End-to-End | Linux Electron build request | Architecture-named AppImage/unpacked app with matching bundled server resources | Electron packaging build target owner | Enables local ARM64 verification and explicit release x64/ARM64 builds. |
| DS-006 | Primary End-to-End | Packaged server startup | Prisma migrations complete with compatible engine pair | Server startup migration owner | Fixes ARM64 startup failure. |
| DS-007 | Primary End-to-End | GitHub desktop release workflow | Published x64 + ARM64 Linux AppImages and updater metadata with embedded blockmap sizes | Desktop release workflow owner | Ensures CI/release delivers the architecture support, not only local builds. |

## Primary Execution Spine(s)

- Host Electron: `Electron BrowserRuntime -> BrowserBridgeServer -> env overrides -> serverManager spawn -> BrowserBridgeConfigResolver(env) -> embedded browser provider active`.
- Docker/remote MCP: `MCP config -> MCP registry -> AgentToolMcpCatalog route table -> descriptor enabledTools -> runtime tools/list/call -> ConfiguredMcpRegistryToolAdapter`.
- Removed remote pairing: `RemoteBrowserSharing UI -> Electron pairing IPC -> remote GraphQL register binding -> runtime binding service` is deleted.
- Linux ARM64 packaging: `pnpm build:electron:linux on ARM64 host -> prepare-server host/target validation -> electron-builder Linux arm64 target -> linux-arm64 artifact -> unpacked app`.
- Linux ARM64 packaged startup: `unpacked AppImage app -> serverManager spawn -> runMigrations -> architecture-aware Prisma engine pair -> migrate deploy -> health-ready server`.
- GitHub Linux release pipeline: `prepare-release -> build-linux-x64 on x64 runner -> build-linux-arm64 on ARM64 runner -> validate AppImage/Prisma/startup/updater metadata -> publish-release uploads both AppImages and latest-linux*.yml metadata`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Host Electron remains the only embedded browser source. It injects env vars into its bundled server. Remote/Docker servers do not register an in-memory host-browser binding anymore. | BrowserRuntime, BrowserBridgeServer, BrowserBridgeConfigResolver | Electron runtime + browser tool service | Env override tests, docs |
| DS-002 | Agent selected names become a route table. Active static adapters and configured MCP sources are considered; one source route is chosen per wire name and stored on the session. | Configured names, active adapters, MCP sources, routes | `AgentToolMcpCatalog` | diagnostics, protected static collisions |
| DS-003 | All remote pairing surfaces are removed from UI, Electron IPC, backend GraphQL, generated types, tests, and docs. Node management continues without pairing cleanup. | NodeManager, preload/main IPC, GraphQL schema | Respective UI/Electron/backend boundaries | localization, generated files |
| DS-004 | Browser result events continue through existing runtime event conversion. BrowserServer MCP-origin tools should normalize under the same known `autobyteus_agent_tools` browser names. | Runtime event converters | Existing backend event system | result shape validation |
| DS-005 | Linux build target resolution owns whether the package is host-architecture default, explicit x64, or explicit ARM64. It names artifacts with `linux-x64`/`linux-arm64` and refuses unsupported cross-arch package requests. | Package scripts, build target resolver, prepare-server target validation | Electron packaging | release docs/workflow, artifact upload patterns |
| DS-006 | Packaged server startup resolves a Prisma engine pair compatible with `process.platform` + `process.arch` before running migrations. ARM64 engines win over x64 Debian engine filenames on ARM64. | Runtime architecture resolver, Prisma engine pair resolver | Server startup migrations | prepare-server engine validation, unit tests |
| DS-007 | The desktop release workflow builds Linux x64 and Linux ARM64 on native runners, validates both, uploads architecture-named AppImage artifacts, and publishes `latest-linux.yml` plus `latest-linux-arm64.yml` with `blockMapSize`. It does not upload standalone Linux `.AppImage.blockmap` files. | Release jobs, upload/download artifacts, publish-release | `.github/workflows/release-desktop.yml` | GitHub runner availability, updater metadata validation |

## Spine Actors / Main-Line Nodes

- `BrowserRuntime`: starts local browser bridge for host Electron.
- `BrowserBridgeServer`: local-only HTTP bridge for embedded host browser.
- `BrowserBridgeConfigResolver`: env-only backend browser support resolver after removal.
- `AgentToolMcpCatalog`: owner of effective route construction, list, call, and collision policy.
- `AgentToolMcpSession`: stores frozen route ownership.
- `ConfiguredMcpAgentToolSourceResolver`: resolves MCP-origin registry metadata.
- `NodeManager.vue`: node management UI after pairing controls are removed.
- `Electron build target resolver`: owns Linux platform/architecture target selection and artifact architecture naming.
- `prepare-server` scripts: own bundled server native resource preparation and target/host architecture validation.
- `Prisma migration engine resolver`: owns compatible engine pair selection for the running packaged server process.
- `Desktop release workflow`: owns CI orchestration, artifact upload/download, architecture-specific Linux updater metadata publication, and release gating for Linux x64/ARM64.

## Ownership Map

| Node | Owns |
| --- | --- |
| Electron browser runtime | Host local bridge lifecycle and env overrides. |
| Backend browser tool service | Whether embedded browser support exists in this server process. |
| Agent Tools MCP catalog | Effective tool source selection and runtime MCP exposure. |
| Configured MCP resolver/adapter | MCP source metadata validation and MCP registry execution. |
| Node Manager UI | Remote node add/open/rename/remove only, no browser pairing. |
| Backend GraphQL schema | No remote browser bridge mutations. |
| Electron packaging build target | Linux host-architecture default, explicit Linux x64/ARM64 entrypoints, architecture-named artifacts. |
| Packaged server preparation | Prisma and native server resources compatible with the Linux package target/host architecture. |
| Server startup migrations | Architecture-compatible Prisma engine pair selection before `migrate deploy`. |
| Desktop release workflow | Native x64 and ARM64 Linux build jobs, validation, artifact upload, and updater metadata publication. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentToolMcpSessionService.createAgentToolMcpSession` | `AgentToolMcpCatalog` | Creates session and descriptor. | Tool source policy. |
| Codex/Claude MCP materializers | Agent Tools MCP descriptor | Runtime-specific config projection. | Tool availability computation. |
| Electron preload API | Electron main | Renderer-safe host APIs. | Removed pairing APIs. |
| `pnpm build:electron:linux` / explicit arch scripts | Electron packaging target resolver | Developer/release package commands. | Server runtime startup policy. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `RuntimeBrowserBridgeRegistrationService` | Remote nodes no longer pair to host browser. | Env-only `BrowserBridgeConfigResolver`; BrowserServer MCP for remote nodes. | In This Change | Delete file and tests. |
| `browser-tool-registry-sync.ts` | Only used by runtime remote binding. | Startup `registerBrowserTools()` env gate. | In This Change | Delete if no remaining references. |
| GraphQL `remote-browser-bridge.ts` resolver/types | Remote bridge registration removed. | No replacement. | In This Change | Remove schema import and generated frontend types. |
| Electron `BrowserPairingStateController` | Pairing state removed. | No replacement. | In This Change | Delete IPC handlers too. |
| Electron `RemoteBrowserSharingSettingsStore` | Remote sharing disabled permanently by removal. | Local bridge binds loopback. | In This Change | Delete settings file/tests. |
| Frontend `remoteBrowserSharingStore.ts` and `nodeRemoteBrowserPairingClient.ts` | Pair/unpair flow removed. | No replacement. | In This Change | Delete tests. |
| `RemoteBrowserSharingPanel.vue` and `RemoteNodePairingControls.vue` | UI surface removed. | NodeManager basic node actions. | In This Change | Delete component tests. |
| `browserPairing` node fields/types/update helpers | Pairing state no longer modeled. | Node profile without pairing field. | In This Change | Loader drops legacy field. |
| Browser bridge remote-token support | Remote bridge consumers removed. | Embedded token only. | In This Change | Simplify auth registry. |
| `reservedToolNames = listSupportedToolNames()` | Reserves inactive optional provider names. | Route-backed exposure. | In This Change | Remove from resolver flow. |
| Static-first `resolveToolCallAvailability` | Ignores selected route source. | Session route lookup. | In This Change | Required for same-name MCP tools. |
| Remote pairing docs/tests/localization | Obsolete. | MCP-based Docker docs/tests. | In This Change | Remove stale references. |
| Generic Linux artifact name `AutoByteus_<flavor>_linux-${version}.AppImage` | Architecture is ambiguous once ARM64 is supported. | `linux-x64` / `linux-arm64` artifact naming. | In This Change | Update docs/workflow globs. |
| Linux x64 hardcoding in `resolvePlatformTargets('LINUX', ...)` | Blocks host ARM64 verification and ignores parsed requested arch. | Host-aware/explicit Linux target resolver. | In This Change | Release workflow must use explicit x64 and ARM64 commands. |
| Platform-only Linux Prisma engine preference list | Selects x64 Debian engines on ARM64. | Architecture-aware Prisma target preference. | In This Change | Add unit coverage. |

## Return Or Event Spine(s) (If Applicable)

Runtime event conversion stays in place. The implementation should verify that BrowserServer MCP-origin browser tool results under `autobyteus_agent_tools` continue to normalize into canonical browser tool events. No event architecture change is part of this ticket.

## Bounded Local / Internal Spines (If Applicable)

- `BrowserRuntime.start`: create tab manager -> create bridge server -> start local bridge -> set env overrides. Remote listener-host branching is removed.
- `AgentToolMcpCatalog.resolveConfiguredSessionToolExposure`: build active static map -> resolve MCP sources -> choose route per configured name -> freeze route table -> derive enabled names.
- Linux build target resolution: parse platform/arch request -> resolve host/target arch -> reject unsupported Linux cross-arch -> build electron-builder target map -> set artifact name containing `linux-{arch}`.
- Linux ARM64 packaged startup: spawn embedded server -> compute runtime Prisma target preferences from `process.platform`/`process.arch` -> select compatible query/schema engine pair -> run `prisma migrate deploy` -> health check.
- Node removal: confirm -> remove remote node -> sync drafts. Remote browser cleanup branch is removed.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Generated GraphQL types | DS-003 | Frontend build | Remove generated remote bridge types after schema deletion. | Prevent stale API references. | Compile may pass with dead generated API. |
| Localization cleanup | DS-003 | Node Manager UI | Remove remote sharing strings and adjust remote-node description. | Avoid untranslated/dead strings. | Users see obsolete feature. |
| Docs cleanup | DS-003 | Product docs | Remove pair-local-browser instructions; mention BrowserServer MCP for Docker. | Align user guidance. | Users follow removed flow. |
| Linux build docs | DS-005, DS-006, DS-007 | Electron packaging/release workflow | Document host-arch default, explicit x64/ARM64 commands, release x64+ARM64 behavior, metadata names, and ARM64 startup validation. | Enables user verification and release operation. | Users build wrong architecture or trust shell-only launch. |
| Diagnostics | DS-002 | Agent Tools MCP | Explain configured MCP route vs protected static collision. | Debugging. | Ambiguous warnings return. |
| Tests | All | Implementation | Remove stale tests and add route/removal tests. | Regression guard. | Dead code survives. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Host browser support | Electron BrowserRuntime + backend browser service | Reuse/Simplify | Already works through env injection. | N/A |
| Remote browser automation | Configured MCP management | Reuse | BrowserServer MCP is already registered. | N/A |
| Runtime source ownership | Agent Tools MCP | Extend | Existing owner of descriptor/list/call. | N/A |
| Electron package target architecture | Electron packaging build scripts | Extend | Existing owner already parses platform/arch and invokes electron-builder. | N/A |
| Bundled server native resource preparation | `prepare-server` scripts | Extend/Simplify | Existing owner prepares `resources/server`; must validate target/host arch and Prisma engines. | N/A |
| Prisma migration engine selection | Server startup migrations | Extend | Existing owner already sets Prisma engine env for `migrate deploy`. | N/A |
| Pair local browser | Remote pairing subsystem | Remove | Product direction rejects host-browser pairing for remote nodes. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP | Route-backed exposure/list/call. | DS-002 | Runtime backends | Extend | Primary bug fix. |
| Backend browser tools | Env-only support detection and embedded tool execution. | DS-001 | Host Electron server | Simplify | Remove runtime binding source. |
| Electron browser runtime | Local bridge/env override only. | DS-001, DS-003 | Host desktop app | Simplify | Remove remote sharing settings/pairing. |
| Frontend Nodes settings | Node management without browser pairing. | DS-003 | User settings UI | Simplify | Remove pair controls. |
| GraphQL schema | App API excluding remote bridge mutations. | DS-003 | Backend/frontend | Simplify | Remove resolver/types. |
| Configured MCP | BrowserServer MCP source metadata/execution. | DS-002 | Remote/Docker browser automation | Reuse | No BrowserServer code change. |
| Electron packaging | Linux build target resolution and architecture artifact naming. | DS-005 | Developer/release package commands | Extend | Host-arch default local; explicit x64/ARM64 commands for CI. |
| Packaged server preparation | Linux target/host native resources, Prisma engine validation. | DS-005, DS-006 | Electron packaged server runtime | Extend | Both maintained preparation scripts must match or one should be retired. |
| Server startup migrations | Architecture-aware Prisma engine selection. | DS-006 | Packaged server startup | Extend | Fix current ARM64 failure. |
| Desktop release workflow | Native Linux x64 + ARM64 builds, validations, metadata publication. | DS-007 | Release pipeline | Extend | Add `build-linux-arm64` and release publishing validation. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-tool-mcp-tool-route.ts` | Agent Tools MCP | Route model | Define route union and clone helpers. | Shared by session/catalog/registry. | N/A |
| `agent-tool-mcp-adapter.ts` | Agent Tools MCP | Adapter/provider contract | Add provider activity and/or reservation policy metadata. | Existing adapter contract. | Route model lightly. |
| `agent-tool-mcp-catalog.ts` | Agent Tools MCP | Exposure owner | Build active adapter map, MCP routes, protected collisions, route-backed list/call. | Existing catalog. | Route model. |
| `browser-bridge-config-resolver.ts` | Backend browser tools | Support resolver | Env-only support. | Existing resolver. | Browser env parser. |
| `build/scripts/build.ts` or extracted build-target helper | Electron packaging | Build target resolver | Resolve Linux host/explicit architecture, reject unsupported cross-arch, emit arch-named artifact config. | Existing build owner; helper extraction enables tests. | Platform/arch model. |
| `package.json` Electron scripts | Electron packaging | Developer command surface | Add explicit Linux x64/ARM64 commands or documented flag behavior. | Existing command surface. | Build target resolver. |
| `scripts/prepare-server.sh` / `scripts/prepare-server.mjs` | Packaged server preparation | Native resource preparation | Validate Linux target/host architecture and required Prisma targets. | Existing preparation owners. | Shared target env/helper if extracted. |
| `startup/migrations.ts` | Server startup | Prisma migration engine resolver | Prefer architecture-compatible Prisma engines. | Existing migration owner. | Runtime target resolver. |
| `browser-runtime.ts` / `browser-bridge-server.ts` | Electron browser runtime | Local bridge | Remove remote host/listener APIs; keep env overrides. | Existing runtime. | Embedded token auth. |
| `NodeManager.vue` | Frontend settings | Nodes UI | Remove pairing panel/controls/store dependency. | Existing Node Manager owner. | Node store only. |
| GraphQL schema files | Backend GraphQL | API schema | Remove remote bridge resolver. | Existing schema. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Tool route ownership | `agent-tool-mcp-tool-route.ts` | Agent Tools MCP | Needed by catalog/session/registry/tests. | Yes | Yes | A second registry. |
| Browser support source | Existing env config parser | Backend browser tools | Only env remains. | Yes | Yes | Runtime binding store. |
| Linux target architecture | New/extracted packaging target helper or env contract | Electron packaging | Needed by build script and preparation validation. | Yes | Yes | A second release matrix owner. |
| Prisma runtime target preference | `startup/migrations.ts` helper | Server startup | Needed by resolver/tests to avoid architecture-incompatible engines. | Yes | Yes | A generic file-type detector only. |
| Node profile shape | `types/node.ts` | Frontend/Electron shared types | Remove pairing fields. | Yes | Yes | Compatibility carrier for removed state. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentToolMcpToolRoute` | Yes | Yes | Low | One wire name, one source branch. |
| `NodeProfile` | Yes after cleanup | Yes | Low | Remove `browserPairing`. |
| Browser bridge config | Yes | Yes | Low | Env-only `{ baseUrl, authToken }`. |
| `enabledTools` | Yes as projection | Yes | Medium | Do not use as ownership; derive from routes. |
| Linux package target architecture | Yes after helper/env centralization | Yes | Medium | One resolved target per package invocation; no generic `linux` artifact. |
| Prisma engine pair | Yes | Yes | Medium | Pair must be compatible with runtime platform+arch; no x64 fallback on ARM64. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-tool-route.ts` | Agent Tools MCP | Route model | Route union/projection/clone helper. | Shared route authority. | N/A |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts` | Agent Tools MCP | Exposure/routing owner | Active providers, route decisions, route-backed list/call. | Existing authority. | Route model. |
| `autobyteus-server-ts/src/agent-tools/mcp/configured-mcp/configured-mcp-agent-tool-source-resolver.ts` | Configured MCP | MCP metadata resolver | Resolve MCP sources without static reservation policy. | Keeps registry concern isolated. | Configured source type. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts` | Agent Tools MCP | Session contract | Add route table. | Existing session type. | Route model. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-registry.ts` | Agent Tools MCP | In-memory session storage | Store cloned route table. | Existing registry. | Route clone helper. |
| `autobyteus-server-ts/src/agent-tools/browser/browser-bridge-config-resolver.ts` | Backend browser tools | Support resolver | Remove runtime binding lookup; env-only. | Existing boundary. | Browser env parser. |
| `autobyteus-server-ts/src/agent-tools/browser/runtime-browser-bridge-registration-service.ts` | Backend browser tools | Removed | Delete. | Obsolete. | N/A |
| `autobyteus-server-ts/src/api/graphql/schema.ts` and `types/remote-browser-bridge.ts` | Backend GraphQL | API schema | Remove resolver/types. | Existing schema owner. | N/A |
| `autobyteus-web/electron/browser/*` pairing/sharing files | Electron runtime | Removed | Delete pairing controller/settings IPC. | Obsolete. | N/A |
| `autobyteus-web/components/settings/NodeManager.vue` | Frontend settings | Nodes UI | Remove pairing UI and cleanup calls. | Existing owner. | Node store. |
| `autobyteus-web/types/node.ts` and Electron re-export | Shared frontend/Electron types | Node profile model | Remove browser pairing types/fields. | Existing model. | N/A |
| `autobyteus-web/build/scripts/build.ts` plus optional extracted helper | Electron packaging | Build target resolver | Linux host-arch default, explicit x64/ARM64 target, cross-arch guard, artifact name with arch. | Existing authoritative build script. | Target architecture helper. |
| `autobyteus-web/package.json` | Electron packaging | Command surface | Add `build:electron:linux:x64` and `build:electron:linux:arm64` or equivalent documented flags; keep `build:electron:linux` host-arch. | Existing scripts. | N/A |
| `autobyteus-web/scripts/prepare-server.sh` and `autobyteus-web/scripts/prepare-server.mjs` | Packaged server preparation | Native bundle preparation | Validate Linux target/host arch and required Prisma engine files for x64/ARM64; keep scripts behavior-equivalent or retire one. | Existing dual preparation paths. | Target env/helper if added. |
| `.github/workflows/release-desktop.yml` | Release workflow | Linux release builds | Split into explicit `build-linux-x64` and `build-linux-arm64`, validate both, upload/publish both AppImage artifacts and `latest-linux*.yml` metadata with `blockMapSize`; remove Linux `*.AppImage.blockmap` upload/publish globs. | Existing release owner. | N/A |
| `autobyteus-server-ts/src/startup/migrations.ts` | Server startup | Prisma engine resolution | Prefer runtime-compatible Prisma targets (`linux-arm64-openssl-*` on ARM64) and expose/test resolver behavior. | Existing migration owner. | Runtime target helper. |
| `autobyteus-server-ts/tests/unit/startup/migrations-prisma-engine-env.test.ts` | Server tests | Prisma engine selection coverage | Add ARM64 mixed-engine preference test. | Existing test file. | N/A |
| `scripts` release metadata validation helpers, if needed | Release tooling | Linux metadata validation | Validate `latest-linux.yml` and `latest-linux-arm64.yml` reference matching architecture artifacts and include numeric `blockMapSize`. | Existing script/test area already contains macOS metadata helper. | N/A |

## Ownership Boundaries

- Agent Tools MCP owns runtime tool exposure. No backend materializer, frontend screen, or configured MCP resolver should duplicate exposure decisions.
- Browser tools own only embedded browser support detection/execution for host Electron server.
- Electron owns local bridge startup and env injection; it no longer owns remote node browser capability.
- Configured MCP owns remote/Docker browser automation via BrowserServer MCP registration/execution.
- Node Manager owns node CRUD; it no longer owns browser pairing state.
- Electron packaging owns build target architecture and artifact naming; server startup must not infer package architecture from artifact names.
- Packaged server preparation owns bundled native resources; electron-builder target resolution must not silently package resources prepared for an incompatible architecture.
- Server startup migrations own Prisma engine selection for the running process; callers must not set incompatible `PRISMA_*` overrides.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentToolMcpCatalog.resolveConfiguredSessionToolExposure` | Active source selection and route table. | Session service. | Backends compute enabled tools from raw names. | Return route-backed exposure. |
| `AgentToolMcpCatalog.resolveToolCallAvailability` | Route-backed adapter dispatch. | MCP routes. | Static adapter lookup before route lookup. | Read `session.toolRoutes`. |
| `BrowserBridgeConfigResolver.resolve` | Env-only browser support. | Browser tool service. | Runtime remote binding fallback. | Remove binding code. |
| `NodeManager.vue` | Node CRUD UI. | Settings page. | Pair/unpair browser controls. | Delete pairing components. |
| Electron package build command | Build target resolver and prepare-server contract. | Developers/release workflow. | Direct electron-builder Linux target that bypasses server resource target validation. | Add explicit command/flag boundary. |
| `resolvePrismaEnginePair` | Runtime target preference helper. | `runMigrations`. | Passing x64 engine env overrides on ARM64. | Make resolver architecture-aware and testable. |

## Dependency Rules

- Backend browser support may depend on env parser only; it must not depend on runtime remote binding services.
- Agent Tools MCP catalog may depend on browser adapter provider and configured MCP resolver; browser provider must not call configured MCP code.
- Frontend Node Manager may depend on `nodeStore`; it must not depend on removed remote browser sharing store.
- Electron preload must not expose removed browser pairing APIs.
- GraphQL schema must not expose removed remote bridge mutations.
- Docs/tests must not refer to Pair local browser for remote nodes.
- Linux build scripts must not emit a generic `linux` AppImage name once multiple architectures are supported.
- Release workflow must not depend on host-arch default implicitly for either Linux architecture; it must invoke explicit x64 and ARM64 commands on matching native runners.
- Linux packaging must not support cross-architecture builds silently unless native module rebuild and Prisma target preparation are made target-aware.
- Prisma engine resolver must not select Debian/x64 engine files on ARM64 even when those filenames are present.
- Release publishing must not upload two files with the same `latest-linux.yml` asset name; Linux ARM64 metadata must remain `latest-linux-arm64.yml`.
- Release workflow and durable docs must not require standalone Linux `*.AppImage.blockmap` files; macOS `.dmg.blockmap`/`.zip.blockmap` assets remain separate and unaffected.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `BrowserBridgeConfigResolver.resolve(env)` | Host embedded browser support | Return env bridge config or null. | process env | No runtime binding fallback. |
| `resolveConfiguredSessionToolExposure(context)` | Runtime tool exposure | Return routes, enabled names, diagnostics. | configured names + context | Main route boundary. |
| `ConfiguredMcpAgentToolSourceResolver.resolve` | MCP metadata | Return MCP sources/missing diagnostics. | configured names | No reserved static names input. |
| Electron preload API | Renderer IPC | Host app operations. | explicit method calls | Pairing methods removed. |
| GraphQL schema | Backend API | App data operations. | typed GraphQL operations | Remote bridge mutations removed. |
| `build:electron:linux` | Linux desktop package build | Build host-architecture Linux package. | current host platform/arch plus optional explicit flags/scripts | Default target is host arch. |
| `build:electron:linux:x64` / `--x64` | Linux x64 package build | Build/pin Linux x64 when host/native preparation supports x64. | explicit target arch | Used by local x64 verification and `build-linux-x64`. |
| `build:electron:linux:arm64` / `--arm64` | Linux ARM64 package build | Build/pin Linux ARM64 when host/native preparation supports ARM64. | explicit target arch | Used for current ARM64 local verification and `build-linux-arm64`. |
| `latest-linux.yml` / `latest-linux-arm64.yml` | Linux updater metadata | Keep updater channel metadata architecture-specific and carry embedded AppImage blockmap size. | release artifact path, process arch, `blockMapSize` | x64 uses `latest-linux.yml`; ARM64 uses `latest-linux-arm64.yml`; no separate Linux `.AppImage.blockmap` asset. |
| `resolvePrismaEnginePair(appRoot, env, cacheRoot)` | Prisma engine pair | Return compatible query/schema engine paths. | runtime platform+arch and available files | Existing env still wins only if explicit paths are supplied; otherwise compatible bundled/cache pair. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Browser bridge resolver | Yes | Yes | Low | Env-only. |
| Agent Tools MCP exposure | Yes | Yes | Low | Route output. |
| Node profile | Yes after cleanup | Yes | Low | Remove pairing fields. |
| GraphQL schema | Yes after cleanup | Yes | Low | Remove remote bridge operations. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Host embedded browser | `embedded browser` | Yes | Low | Use only for host Electron path. |
| Remote pairing | `remote browser sharing` / `Pair local browser` | Obsolete | High | Remove names and strings. |
| Route model | `AgentToolMcpToolRoute` | Yes | Low | Add explicit route type. |
| BrowserServer MCP | Existing name | Yes | Low | No change. |

## Applied Patterns (If Any)

- **Removal as simplification**: delete unsupported product path instead of adding more gating logic.
- **Conditional provider**: provider code can exist, but only active sources participate in runtime exposure.
- **Route table ownership**: session route table is the source of truth for list/call.
- **Thin facade**: runtime materializers consume descriptors only.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp` | Folder | Agent Tools MCP | Route-backed exposure and MCP session behavior. | Existing subsystem. | Electron UI logic. |
| `autobyteus-server-ts/src/agent-tools/browser` | Folder | Backend browser tools | Env-only embedded browser support and tool implementations. | Existing browser capability area. | Remote runtime binding. |
| `autobyteus-server-ts/src/api/graphql/types` | Folder | GraphQL API | Remove remote bridge resolver. | API schema boundary. | Removed pairing operations. |
| `autobyteus-web/electron/browser` | Folder | Electron browser runtime | Local bridge and tab/session management. | Existing Electron runtime. | Remote pairing controller/settings. |
| `autobyteus-web/components/settings` | Folder | Settings UI | Node management without pairing controls. | Existing settings UI. | Remote browser sharing panel. |
| `autobyteus-web/stores` | Folder | Frontend state | Remove remote browser sharing store. | Store no longer needed. | Pairing state. |
| `autobyteus-web/types` | Folder | Shared frontend types | Node profile without browser pairing. | Existing type owner. | Removed pairing descriptors/settings. |
| `autobyteus-web/build/scripts` | Folder | Electron packaging | Build target resolution and artifact naming helpers. | Existing electron-builder script location. | Server startup runtime policy. |
| `autobyteus-web/scripts` | Folder | Packaged server preparation | Prepare/validate bundled server resources before Electron packaging. | Existing prepare-server scripts live here. | Agent Tools MCP exposure policy. |
| `.github/workflows/release-desktop.yml` | File | Release workflow | Build and publish Linux x64 and ARM64 artifacts/metadata through separate native jobs. | Existing desktop release workflow. | Cross-arch emulation without native resource validation. |
| `autobyteus-server-ts/src/startup` | Folder | Server startup | Prisma migration and engine env resolution. | Existing migration startup owner. | Electron-builder target selection. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-tools/mcp` | Main-Line Domain-Control + transport | Yes | Low | Existing owner of runtime MCP exposure. |
| `agent-tools/browser` | Capability area | Yes | Low | Browser implementation/support only. |
| `electron/browser` | Electron runtime | Yes | Medium | After deletion, should contain only local browser runtime/session code. |
| `components/settings` | UI | Yes | Low | Remove obsolete pairing components. |
| `build/scripts` | Electron packaging | Yes | Low | Add Linux target helper near existing build script or extract a testable sibling helper. |
| `scripts` | Packaging preparation | Medium | Medium | Contains several packaging scripts; keep `prepare-server.sh` and `.mjs` equivalent or remove one path to avoid drift. |
| `src/startup` | Server startup | Yes | Low | Prisma migration resolver belongs with existing startup/migration code. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Docker with BrowserServer MCP | `open_tab -> configured_mcp(BrowserServer)` route. | `open_tab` hidden by inactive embedded adapter. | Main bug fix. |
| Docker without BrowserServer MCP | no `open_tab` route. | Expose embedded `open_tab` with unavailable error. | Ensures inactive provider is absent. |
| Host Electron | `open_tab -> static_adapter(open_tab)` when no MCP duplicate. | Remove all embedded browser support. | Preserves desktop app. |
| Removed pairing | No Pair local browser button or GraphQL mutation. | Hide button but leave mutation/service. | Avoids dead compatibility path. |
| Protected static tool | `send_message_to -> static_adapter`, MCP duplicate diagnostic. | MCP overrides platform messaging. | Preserves internal control tools. |
| Linux ARM64 build | `build:electron:linux` on ARM64 -> `linux-arm64` artifact. | Build emits generic `linux` x64 artifact on ARM64. | Enables local verification. |
| Linux release x64 | release workflow x64 runner -> explicit x64 command -> `linux-x64` artifact + `latest-linux.yml`. | Release accidentally relies on host-arch default. | Prevents release drift. |
| Linux release ARM64 | release workflow ARM64 runner -> explicit ARM64 command -> `linux-arm64` artifact + `latest-linux-arm64.yml`. | Only local ARM64 build, no CI release artifact. | Ensures pipeline support. |
| ARM64 Prisma startup | ARM64 runtime selects `schema-engine-linux-arm64-openssl-3.0.x`. | ARM64 runtime selects `schema-engine-debian-openssl-3.0.x`. | Fixes packaged server migration failure. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Hide Pair local browser UI but keep backend GraphQL/runtime binding | Lower implementation risk. | Rejected | Delete UI, IPC, GraphQL, service, tests, docs. |
| Keep remote pairing behind a feature flag | Could preserve old users. | Rejected | Product direction says remote browser = MCP. |
| Prefix BrowserServer MCP names | Avoids collision. | Rejected | Keep raw names; fix runtime routing. |
| Only change `reservedToolNames` without route table | Smaller patch. | Rejected | `tools/list`/`tools/call` would still re-derive wrong source. |
| Preserve `browserPairing` field in node model | Avoid registry migration concern. | Rejected | Drop/ignore legacy field; no behavior retained. |
| Keep generic Linux artifact name | Avoid docs/workflow churn. | Rejected | Use `linux-x64` / `linux-arm64` names. |
| Keep Linux build hardcoded to x64 | Preserve prior local command behavior. | Rejected | Host-architecture default plus explicit x64 release command. |
| Publish both Linux architectures through one `latest-linux.yml` | One metadata file looks simpler. | Rejected | electron-updater uses `latest-linux.yml` for x64 and `latest-linux-arm64.yml` for ARM64; publish distinct metadata files. |
| Let ARM64 fallback to x64 Debian Prisma engines | More permissive filename matching. | Rejected | Architecture-compatible target preferences only. |

## Derived Layering (If Useful)

Target layering:

1. Electron host local browser bridge: starts only for local host support and provides env overrides.
2. Backend browser service: reads env and executes embedded browser tools only when env support exists.
3. Configured MCP registry: owns BrowserServer MCP tools for Docker/remote browser automation.
4. Agent Tools MCP catalog: route-backed runtime exposure across static and configured MCP sources.
5. Runtime backends: consume descriptors; no exposure decisions.
6. Frontend settings: node CRUD; no browser pairing.
7. Electron packaging: package target architecture and artifact naming.
8. Packaged server startup: runtime-compatible Prisma engine selection.

## Migration / Refactor Sequence

1. Remove backend remote bridge binding path:
   - delete `runtime-browser-bridge-registration-service.ts` and tests;
   - delete `browser-tool-registry-sync.ts` if only referenced there;
   - update `browser-bridge-config-resolver.ts` to env-only;
   - delete GraphQL `remote-browser-bridge.ts` and remove schema import.
2. Remove Electron remote pairing/sharing path:
   - delete pairing controller, IPC handler, remote sharing settings store and tests;
   - simplify `BrowserRuntime` options to remove `listenerHost` and remote bridge base URL helpers;
   - simplify `BrowserBridgeServer` to local bridge only;
   - simplify auth registry to embedded token only;
   - remove pairing setup from `electron/main.ts`, `preload.ts`, and Electron type declarations.
3. Remove frontend pairing UI/state:
   - delete `RemoteBrowserSharingPanel.vue`, `RemoteNodePairingControls.vue`, `remoteBrowserSharingStore.ts`, `nodeRemoteBrowserPairingClient.ts`, and tests;
   - update `NodeManager.vue` to remove panel/controls, busy state coupling, remote cleanup on node removal, and initialization call;
   - remove pairing/localization strings and adjust remote-node description;
   - remove pairing types from `types/node.ts` and Electron re-export types; update node registry loader to ignore/drop legacy field.
4. Regenerate/update GraphQL generated frontend types after schema removal.
5. Implement Agent Tools MCP route-backed exposure:
   - add route model;
   - add provider activity/reservation metadata;
   - make browser provider inactive when env support absent;
   - remove static reservation from configured MCP resolver;
   - route-backed `enabledTools`, `tools/list`, and `tools/call`.
6. Update tests:
   - remove obsolete pairing/sharing tests;
   - add absence tests for removed GraphQL/IPC/UI surfaces;
   - add Agent Tools MCP route tests for Docker BrowserServer MCP and host Electron env support;
   - keep host Electron env injection tests.
7. Update docs to remove remote pairing instructions and document BrowserServer MCP as Docker/remote browser path.
8. Implement Linux Electron architecture-aware packaging:
   - resolve Linux `AUTO` to `process.arch` (`x64` or `arm64`);
   - honor explicit `--x64` / `--arm64` or package scripts;
   - fail unsupported Linux cross-architecture requests before emitting artifacts;
   - change Linux artifact naming to `AutoByteus_<flavor>_linux-{arch}-${version}.AppImage`;
   - update release workflow with explicit `build-linux-x64` and `build-linux-arm64` jobs on native runners;
   - upload `linux-x64` artifacts with `latest-linux.yml`;
   - upload `linux-arm64` artifacts with `latest-linux-arm64.yml`;
   - make `publish-release` depend on and publish both Linux architecture outputs.
9. Implement architecture-aware packaged server resource and Prisma startup support:
   - update maintained `prepare-server` paths to validate required Prisma engines for Linux x64/ARM64 host targets;
   - update `migrations.ts` target preferences so ARM64-compatible engine names win on ARM64;
   - add unit coverage for mixed x64 + ARM64 engine directories.
10. Validate Linux ARM64 packaged startup on an ARM64 host:
   - build the Linux ARM64 package through the official command;
   - launch the unpacked app or AppImage;
   - confirm logs show ARM64 Prisma engine overrides, migrations complete, and embedded server health succeeds.
11. Update Linux build/release docs and README entries for host-architecture defaults, explicit architecture commands, artifact names, GitHub release x64+ARM64 behavior, updater metadata names, and ARM64 startup validation.

## Key Tradeoffs

- Removing remote pairing is larger than the original bug fix but simplifies the product model and reduces security/state complexity.
- Route-backed Agent Tools MCP adds a small internal model but prevents repeated source-ownership bugs.
- Dropping legacy `browserPairing` data may remove stale UI state for existing users, which is intended.
- Making `build:electron:linux` host-architecture aware changes local behavior on ARM64; using explicit x64/ARM64 commands in CI avoids release drift.
- Failing unsupported cross-architecture Linux builds is stricter than the current permissive but misleading x64 output on ARM64; this is preferable to shipping invalid native resources.

## Risks

- The broad removal may leave stale references in generated files, localization, tests, or docs; implementation should use repository-wide searches.
- GraphQL generated type updates may require the project’s codegen workflow.
- Host Electron browser support must be explicitly tested after simplifying `BrowserRuntime`/`BrowserBridgeServer`.
- Some result normalization tests may need updates once BrowserServer MCP browser tools are exposed.
- Release artifact globs/docs that expect generic `linux-<version>` names must be updated to avoid missing `linux-x64` or `linux-arm64` artifacts.
- If implementation changes only `build.ts` and not `prepare-server`, Linux target architecture may still drift from bundled native resources.
- If Prisma resolver keeps any architecture-incompatible fallback, ARM64 startup may fail with opaque Prisma JSON parse errors instead of clear missing-engine diagnostics.

## Guidance For Implementation

- Treat this as a clean-cut removal. Do not leave hidden GraphQL mutations or IPC methods for pairing.
- Keep host Electron env injection working; this is not removal of embedded browser for local desktop.
- Do not special-case BrowserServer MCP names. The generic rule is active source routing: inactive embedded browser provider reserves no names; configured MCP routes normally.
- Any code that dispatches by checking static adapter names before session route ownership is a regression.
- Run repository-wide searches for `RemoteBrowser`, `remoteBrowser`, `browserPairing`, `browser-pairing`, `Pair local browser`, `registerRemoteBrowserBridge`, `RuntimeBrowserBridge`, and `remote browser sharing` before handoff.
- Treat Linux build architecture as one resolved value for the whole packaging invocation. Do not let `prepare-server` prepare host ARM64 resources while `build.ts` packages x64 or vice versa.
- Prefer extracting pure helpers for build target/artifact naming and Prisma target preference if that is the cleanest way to add unit tests.
- For ARM64 startup validation, record the log lines that show `linux-arm64-openssl-*` Prisma engines and successful migrations/health.


## Delivery Reroute Addendum: Linux ARM64 Packaging / Startup Design

### Target Behavior

- `pnpm -C autobyteus-web build:electron:linux` is a host-architecture Linux desktop build. On this Linux ARM64 host it produces a Linux ARM64 AppImage/unpacked app; on an x64 Linux host it produces Linux x64.
- Explicit Linux architecture entrypoints are supported for same-host architecture builds, for example `build:electron:linux:arm64` / `--arm64` on ARM64 and `build:electron:linux:x64` / `--x64` on x64.
- Unsupported Linux cross-architecture builds fail before publishing artifacts unless implementation adds full target-aware native-module rebuild and Prisma target preparation.
- Linux artifact names always include architecture: `AutoByteus_<flavor>_linux-arm64-${version}.AppImage` or `AutoByteus_<flavor>_linux-x64-${version}.AppImage`.
- `.github/workflows/release-desktop.yml` has explicit `build-linux-x64` and `build-linux-arm64` jobs. The x64 job publishes `latest-linux.yml`; the ARM64 job publishes `latest-linux-arm64.yml`.
- Packaged Linux ARM64 startup selects `linux-arm64-openssl-*` Prisma engines and reaches successful migration/health.
- Release CI validates Linux x64 and ARM64 AppImage architecture, Prisma engine files, and packaged server startup/migration health.

### Architecture-Aware Prisma Selection Rule

The server migration resolver should compute target preference from runtime platform and architecture before scanning filenames. The important invariant is compatibility before general Linux preference:

```text
linux/arm64 -> linux-arm64-openssl-3.0.x -> linux-arm64-openssl-1.1.x -> other ARM64-compatible Linux targets
linux/x64   -> debian-openssl-3.0.x -> debian-openssl-1.1.x -> linux-musl x64 targets
```

The resolver must not choose `schema-engine-debian-*` or `libquery_engine-debian-*` on `process.arch === "arm64"` merely because those files exist in the bundle.

### Validation Contract

Implementation handoff should include evidence for:

1. Build-target helper/unit coverage or equivalent logs proving Linux AUTO resolves to host arch and explicit x64/ARM64 are handled deterministically.
2. Prisma resolver unit coverage with both x64 Debian and ARM64 engine filenames in one test directory, asserting ARM64 wins for ARM64 runtime simulation.
3. ARM64 package preparation validation that fails if `schema-engine-linux-arm64-openssl-3.0.x` or `libquery_engine-linux-arm64-openssl-3.0.x.so.node` is missing from an ARM64 package.
4. Packaged/unpacked ARM64 launch evidence showing migration success and embedded server health. Shell/window creation alone is insufficient.
5. Linux updater metadata validation proving `latest-linux.yml` and `latest-linux-arm64.yml` reference the matching architecture AppImage and include numeric `blockMapSize`; the workflow must fail if it still expects standalone Linux `*.AppImage.blockmap` files.


### GitHub Pipeline Shape

The release workflow target shape is:

```yaml
build-linux-x64:
  runs-on: ubuntu-22.04 # or equivalent x64 Linux runner
  run: pnpm build:electron:linux:x64
  uploads: '*linux-x64*.AppImage', 'latest-linux.yml'  # no standalone Linux .AppImage.blockmap

build-linux-arm64:
  runs-on: ubuntu-24.04-arm # or equivalent native ARM64 Linux runner
  run: pnpm build:electron:linux:arm64
  uploads: '*linux-arm64*.AppImage', 'latest-linux-arm64.yml'  # no standalone Linux .AppImage.blockmap

publish-release:
  needs: [build-linux-x64, build-linux-arm64, ...]
  publishes: both AppImage families and both latest-linux*.yml metadata files; no Linux .AppImage.blockmap assets
```

The implementation should avoid a Linux metadata merge step. The installed `electron-updater` provider already requests `latest-linux.yml` on x64 and `latest-linux-arm64.yml` on ARM64. The workflow should validate both metadata files and ensure each references an artifact whose filename contains the matching architecture token and whose file entry includes numeric `blockMapSize`. The standalone `.blockmap` artifact requirement remains valid for macOS DMG/ZIP assets only; it must not be copied to Linux AppImage upload or release-publish globs.
