# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Refined after downstream delivery reroute and user follow-up on 2026-06-18, then corrected after implementation/API-E2E `LF-002` blockmap reroute on 2026-06-19. Scope includes removing remote “Pair local browser” functionality, preserving host Electron embedded browser support, preserving container-local BrowserServer MCP support, adding Linux ARM64 Electron local-build/startup support required for user verification, adding GitHub desktop release pipeline support for Linux ARM64 artifacts/metadata, and using the correct Linux AppImage update contract: AppImage files carry embedded blockmaps referenced by `blockMapSize` in `latest-linux*.yml`; standalone `*.AppImage.blockmap` release assets are not required for Linux.

## Goal / Problem Statement

A Docker-hosted Codex agent is configured with BrowserServer MCP tools, but a running session misses same-named browser tools such as `open_tab` because the Agent Tools MCP catalog lets inactive embedded Electron browser adapter names reserve the namespace. The product direction is now clearer: remote/Docker nodes should use browser MCP configured inside the container/node, not a bridge back to the host Electron browser.

Therefore the system must simplify browser-source ownership:

- Host Electron-started server may expose embedded Electron browser tools through the existing env-injected local bridge.
- Remote/Docker nodes must not use the host Electron browser through “Pair local browser”. That functionality should be removed from backend, Electron, and UI surfaces.
- Remote/Docker browser automation should come from configured MCPs such as BrowserServer MCP.
- Inactive embedded browser providers must contribute no runtime tools and reserve no names, so configured MCP browser tools expose through the normal configured-MCP path.

During delivery verification, the user also needed to build and launch the Linux desktop app on the current Linux ARM64 host. The existing `build:electron:linux` path emits only a Linux x64 AppImage and the ad-hoc ARM64 package starts but fails embedded-server Prisma migration because runtime engine selection chooses x64 Debian engines before the ARM64 Prisma engines. The user then clarified that the GitHub pipeline should also be considered. The ticket must therefore include both an official Linux ARM64 local build/startup path and a GitHub desktop release workflow path for Linux ARM64 artifacts/metadata, so the corrected MCP/browser behavior can be verified locally and delivered through CI. A later implementation/API-E2E reroute showed the original Linux release artifact contract incorrectly required separate `*.AppImage.blockmap` files; the installed electron-builder/electron-updater AppImage path uses embedded AppImage blockmaps and records `blockMapSize` in `latest-linux*.yml`, so Linux release upload/publish requirements must use AppImage + metadata assets only.

## Investigation Findings

- Host Electron currently starts `BrowserRuntime`, starts `BrowserBridgeServer`, receives `AUTOBYTEUS_BROWSER_BRIDGE_BASE_URL` and `AUTOBYTEUS_BROWSER_BRIDGE_TOKEN`, and injects those env vars into the bundled server child process through platform server managers. This path should remain.
- Remote pairing currently uses Electron IPC to issue an expiring bridge descriptor, frontend GraphQL to send that descriptor to the remote node, and backend `RuntimeBrowserBridgeRegistrationService` to store an in-memory binding and dynamically register/unregister embedded browser tools. This path should be removed.
- The Docker server process has no browser bridge env vars and no need for host pairing; BrowserServer MCP is configured and registered in `/home/autobyteus/data/mcps.json`.
- `AgentToolMcpCatalog` currently reserves all static adapter names even when optional embedded browser support is inactive, causing BrowserServer MCP names like `open_tab` to be dropped as collisions.
- `attach_tab` survives because no embedded browser adapter has that name, proving the Agent Tools MCP descriptor reaches Codex and the failure is collision/routing policy.
- Frontend agent cards/details show configured `toolNames`, not the effective runtime tool manifest.
- `autobyteus-web/build/scripts/build.ts` parses `--arm64`/`--x64`, but Linux target resolution currently ignores the requested arch and always builds `Arch.x64`.
- Linux packaging/runtime is host-architecture sensitive because `prepare-server` bundles Prisma engines and rebuilds native modules such as `node-pty` before electron-builder packs the app.
- On the Linux ARM64 host, the bundled server contains both x64 Debian Prisma engines and `linux-arm64-openssl-3.0.x` engines, but `migrations.ts` prefers Debian targets for all Linux runtimes. This picks an x64 schema engine on ARM64 and causes `Could not parse schema engine response` during packaged startup.
- Fresh Linux ARM64 AppImage builds emit the AppImage and `latest-linux-arm64.yml` with `blockMapSize`, but no standalone `*.AppImage.blockmap`; local `electron-updater@6.8.3` uses `FileWithEmbeddedBlockMapDifferentialDownloader` for AppImage updates, so separate Linux AppImage blockmap upload globs are an invalid artifact expectation.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Change + Cleanup/Removal + Packaging/Startup Support.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus Legacy/Compatibility Pressure from remote host-browser pairing; Missing Invariant in Linux packaging/runtime architecture selection.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now.
- Evidence basis: Agent Tools MCP reserves inactive embedded browser names; remote pairing adds a second browser implementation path for Docker nodes even though the intended path is container-local BrowserServer MCP; delivery verification exposed that Linux desktop packaging is x64-only and that ARM64 packaged startup selects the wrong Prisma schema engine; API/E2E Round 3 exposed that Linux AppImage builds do not emit standalone blockmap files and instead rely on `blockMapSize` metadata for embedded blockmaps.
- Requirement or scope impact: Remove remote pairing, route effective runtime tools from active sources only, make Linux host-architecture Electron builds/startup verifiable on ARM64, and correct Linux release artifact publishing/docs to AppImage + metadata with embedded blockmaps.

## In-Scope Use Cases

- UC-001: Host Electron starts the bundled server and embedded browser tools are exposed through env-injected `AUTOBYTEUS_BROWSER_BRIDGE_*` support.
- UC-002: Docker/remote node has BrowserServer MCP configured and selected; its browser tools are exposed through Agent Tools MCP/configured-MCP routing.
- UC-003: Docker/remote node has no BrowserServer MCP selected and no Electron env support; no embedded browser tools are exposed.
- UC-004: The Nodes settings screen no longer shows Remote Browser Sharing settings, pair/unpair state badges, or “Pair local browser” controls.
- UC-005: The backend no longer accepts GraphQL mutations that register or clear a remote host-browser bridge binding.
- UC-006: Existing platform/control tools such as `send_message_to` remain protected from configured MCP name collisions.
- UC-007: Runtime `tools/list`, `tools/call`, and backend descriptor `enabledTools` derive from the same source route decision.
- UC-008: On a Linux ARM64 host, the official local Linux Electron build command produces a Linux ARM64 AppImage/unpacked app rather than a misleading generic Linux x64 artifact.
- UC-009: On a Linux x64 release/build host, the official release-oriented Linux build path produces a Linux x64 AppImage explicitly named as x64.
- UC-010: A Linux ARM64 packaged/unpacked Electron app starts its embedded server, runs Prisma migrations with ARM64-compatible Prisma engines, and reaches healthy startup.
- UC-011: GitHub desktop release workflow builds Linux ARM64 on an ARM64 runner, publishes the ARM64 AppImage and `latest-linux-arm64.yml` with embedded-blockmap metadata, and keeps Linux x64 AppImage metadata as `latest-linux.yml`.
- UC-012: Documentation tells developers how to choose host-architecture or explicit Linux architecture builds, how the GitHub pipeline builds/publishes Linux x64 and ARM64, and how to validate packaged startup.

## Out of Scope

- Redesigning BrowserServer MCP itself in `/home/autobyteus/workspace/autobyteus-mcps/browser-mcp`.
- Requiring BrowserServer MCP to use `tool_name_prefix`.
- Removing host Electron embedded browser support for the bundled local server.
- Changing Codex/Claude provider-level MCP namespacing conventions.
- Adding new browser automation capabilities beyond exposing/removing the existing intended sources correctly.
- Supporting Linux cross-architecture desktop builds where the package target architecture differs from the host architecture used to prepare native server resources. Such builds should fail clearly unless full target-aware native rebuild support is added.

## Functional Requirements

- REQ-001: Remote “Pair local browser” functionality must be removed from the product surface and runtime path.
- REQ-002: Host Electron embedded browser support must remain available through process-start env injection of `AUTOBYTEUS_BROWSER_BRIDGE_BASE_URL` and `AUTOBYTEUS_BROWSER_BRIDGE_TOKEN` into the bundled server.
- REQ-003: Backend runtime browser support resolution must no longer use an in-memory remote browser bridge registration as a browser-support source.
- REQ-004: Backend GraphQL schema must no longer expose `registerRemoteBrowserBridge` or `clearRemoteBrowserBridge` mutations or their associated input/result types.
- REQ-005: Electron IPC handlers and state controllers for remote browser sharing/pairing must be removed.
- REQ-006: Frontend Nodes settings must remove Remote Browser Sharing panel, pairing badges, and pair/unpair actions.
- REQ-007: Node registry/domain types and persisted normalization must stop modeling browser pairing state as an effective node capability; legacy persisted pairing fields may be ignored/dropped during normalization.
- REQ-008: Browser bridge server must bind for local embedded Electron support only; remote sharing listener-host configuration and remote descriptor issuing must be removed.
- REQ-009: Configured MCP-origin tools, including BrowserServer MCP browser tools, must remain independently visible/exposable when their MCP server is enabled and their registered tool is selected.
- REQ-010: Embedded browser adapter names must not reserve configured MCP tool names when host Electron env support is absent for the target process.
- REQ-011: Agent Tools MCP session exposure must use a source-aware route decision so `enabledTools`, `tools/list`, and `tools/call` agree on whether a tool is static embedded-browser/platform or configured MCP-origin.
- REQ-012: If an optional embedded browser route and a configured MCP route are both possible for the same selected browser name, the system must emit one deterministic route and no duplicate definitions; explicit configured MCP selection should take precedence for browser-tool overlaps.
- REQ-013: Protected non-browser/platform static tools must remain protected from configured MCP name collisions.
- REQ-014: Existing remote-node add/open/rename/remove behavior must continue without attempting remote browser cleanup.
- REQ-015: Tests and durable docs must be updated or removed to reflect that Docker/remote browser automation is MCP-based, not host-browser-pairing-based.
- REQ-016: `pnpm -C autobyteus-web build:electron:linux` must build the Linux package for the current Linux host architecture when no explicit Linux architecture flag is supplied.
- REQ-017: Explicit Linux architecture build entrypoints must exist for x64 and ARM64, either as package scripts and/or documented `--x64` / `--arm64` flags, and they must fail with a clear message when the requested architecture is unsupported by the current host/native packaging flow.
- REQ-018: Linux Electron artifact names must include architecture (`linux-x64` or `linux-arm64`) so x64 and ARM64 outputs cannot be confused or overwritten as a generic `linux` artifact.
- REQ-019: Release/CI Linux desktop build behavior must include explicit Linux x64 and Linux ARM64 jobs; neither job may rely on a host-architecture default implicitly.
- REQ-020: Linux packaged server preparation must include and validate the Prisma engine targets required by the target/host Linux architecture, including `linux-arm64-openssl-3.0.x` on ARM64 hosts.
- REQ-021: Server startup Prisma engine resolution must prefer architecture-compatible Linux Prisma engines for the running process before considering incompatible Linux engine filenames.
- REQ-022: Linux ARM64 packaged/unpacked Electron startup validation must prove embedded server startup reaches successful Prisma migration/health rather than only proving the shell window launches.
- REQ-023: GitHub desktop release workflow must build Linux ARM64 on an ARM64 Linux runner and upload the `linux-arm64` AppImage plus `latest-linux-arm64.yml`; it must not require or publish standalone `*.AppImage.blockmap` files for Linux AppImage targets.
- REQ-024: GitHub desktop release workflow must publish Linux ARM64 updater metadata under `latest-linux-arm64.yml` while preserving Linux x64 updater metadata under `latest-linux.yml`.
- REQ-025: GitHub desktop release workflow must validate Linux x64 and ARM64 artifact architecture, required Prisma engine files, packaged server startup/migration health, and updater metadata `blockMapSize` for each Linux AppImage architecture it builds.
- REQ-026: Linux build/test documentation must describe host-architecture defaults, explicit architecture entrypoints, artifact naming, GitHub release pipeline x64/ARM64 behavior, updater metadata names, Linux AppImage embedded-blockmap behavior, absence of standalone Linux `*.AppImage.blockmap` assets, and ARM64 packaged startup validation.

## Acceptance Criteria

- AC-001: In a Docker/no-env/no-pairing scenario with BrowserServer MCP `open_tab` registered and selected, Agent Tools MCP session exposure includes `open_tab` as a configured MCP route and includes it in descriptor `enabledTools` and `tools/list`.
- AC-002: In a Docker/no-env/no-BrowserServer scenario, no embedded browser tools such as `open_tab`, `read_page`, or `screenshot` appear in any effective runtime tool manifest.
- AC-003: In a host Electron env-supported scenario with no configured MCP duplicate, embedded browser tools can appear as effective runtime tools.
- AC-004: `resolveToolCallAvailability(session, "open_tab")` routes to the same source chosen at session exposure time and does not prefer static adapters merely because a static adapter with that name exists in code.
- AC-005: `tools/list` never emits duplicate definitions for a same-named browser tool.
- AC-006: The Nodes settings screen no longer contains Remote Browser Sharing panel, pairing state badges, or Pair/Unpair local browser controls.
- AC-007: Electron preload/main no longer exposes remote browser pairing IPC APIs.
- AC-008: Backend GraphQL introspection no longer includes remote browser bridge mutations/types, and generated frontend GraphQL types no longer expose them.
- AC-009: Remote node removal no longer calls remote browser cleanup logic and still removes nodes correctly.
- AC-010: Tests for runtime remote browser bridge registration/pairing are removed or replaced with tests proving the removed surface is absent.
- AC-011: Existing host Electron browser runtime tests still prove env overrides are injected into the bundled server.
- AC-012: Existing protected static collision tests for platform/control tools still pass.
- AC-013: Documentation no longer instructs users to pair the local Electron browser to remote/Docker nodes; it should direct Docker/remote browser automation to configured BrowserServer MCP or no browser tools.
- AC-014: On Linux ARM64, `pnpm -C autobyteus-web build:electron:linux` or the documented ARM64 entrypoint produces an ARM64 AppImage/unpacked app with `linux-arm64` in the artifact name.
- AC-015: In GitHub release CI, the Linux x64 job produces an x64 AppImage with `linux-x64` in the artifact name and `latest-linux.yml` referencing that x64 artifact.
- AC-016: A Linux build requested for an architecture different from the host/native packaging architecture fails before emitting a misleading artifact, unless implementation adds full target-aware native rebuild support for that cross-arch path.
- AC-017: Packaged Linux ARM64 startup logs show Prisma engine overrides selecting `linux-arm64-openssl-*` engine files, migrations complete successfully, and the embedded server reaches healthy state.
- AC-018: Unit coverage proves Linux ARM64 engine selection prefers ARM64 Prisma engines over x64 Debian engine filenames when both exist in the bundle.
- AC-019: Packaging validation fails if the required Linux ARM64 Prisma engine files are missing from an ARM64 package.
- AC-020: In GitHub release CI, the Linux ARM64 job runs on an ARM64 Linux runner, produces an ARM64 AppImage with `linux-arm64` in the artifact name, and uploads/publishes `latest-linux-arm64.yml` referencing that ARM64 artifact with `blockMapSize` metadata.
- AC-021: GitHub release publishing includes both Linux x64 and Linux ARM64 AppImage assets plus `latest-linux.yml` and `latest-linux-arm64.yml`, without standalone Linux `*.AppImage.blockmap` asset requirements, duplicate metadata asset names, or architecture ambiguity.
- AC-022: GitHub release CI fails if Linux x64/ARM64 AppImage architecture inspection, Prisma engine validation, updater metadata `blockMapSize` validation, or packaged server startup/migration health fails for either Linux architecture.
- AC-023: Durable docs/README entries show Linux host-architecture default builds, explicit x64/ARM64 build commands, `linux-{arch}` artifact naming, GitHub release pipeline x64/ARM64 behavior, updater metadata names, Linux AppImage embedded blockmaps/no standalone `.AppImage.blockmap` assets, and the Linux ARM64 startup validation procedure.

## Constraints / Dependencies

- Authoritative app/server code is in `/home/autobyteus/workspace/autobyteus-workspace`; BrowserServer MCP package should not need changes.
- Host Electron local browser bridge env injection is still required for the embedded desktop server path.
- Agent Tools MCP sessions are in-memory and run-scoped; route ownership can be added without persisted migration.
- No backward-compatibility dual path should preserve removed remote pairing behavior.
- Linux desktop packages include native Node modules and Prisma engines; architecture selection must be coordinated before packaging rather than treated as an electron-builder-only option.
- Current release workflow runs Linux only on `ubuntu-22.04` x64; this ticket must add a Linux ARM64 job using a supported ARM64 Linux runner label such as `ubuntu-24.04-arm` or an equivalent self-hosted ARM64 runner if hosted ARM64 is unavailable for the repository. Linux AppImage upload/publish paths must target AppImage + updater metadata assets only; macOS blockmap asset requirements must not be copied to Linux AppImage targets.

## Assumptions

- The intended Docker/remote browser automation path is BrowserServer MCP configured inside the container/node.
- Users do not need Docker/remote nodes to control the host Electron browser.
- Legacy persisted node records may contain `browserPairing`; dropping/ignoring that field is acceptable in this no-backward-compatibility task.
- The current Linux ARM64 host should be able to build and run a host-architecture ARM64 AppImage/unpacked app for manual verification.
- GitHub-hosted Linux ARM64 runner labels are available for current GitHub Actions environments, but if repository policy or account plan blocks them, an equivalent self-hosted ARM64 runner is acceptable for the workflow design.

## Risks / Open Questions

- Removing remote pairing touches frontend, Electron, backend GraphQL, generated types, tests, and docs; implementation should remove all references rather than leave dead code.
- If any user relied on remote nodes using host browser cookies/session, that workflow is intentionally removed.
- BrowserServer MCP result shapes should still be validated against existing runtime event normalization for browser tool cards/activity.
- Changing the default Linux build from hardcoded x64 to host architecture is a behavior change; release automation must pin x64 to avoid accidental artifact changes.
- Linux updater metadata must avoid duplicate `latest-linux.yml` asset names: x64 keeps `latest-linux.yml`; ARM64 uses `latest-linux-arm64.yml`, matching electron-updater's Linux channel naming for non-x64 architectures. The metadata must carry `blockMapSize` for the embedded AppImage blockmap rather than relying on a separate `.AppImage.blockmap` file.
- Cross-architecture Linux packaging may remain unsupported because native module rebuilds and Prisma engine bundles are target-sensitive.

## Requirement-To-Use-Case Coverage

| Requirement | Covered Use Case(s) |
| --- | --- |
| REQ-001 | UC-004, UC-005 |
| REQ-002 | UC-001 |
| REQ-003 | UC-002, UC-003, UC-005 |
| REQ-004 | UC-005 |
| REQ-005 | UC-004 |
| REQ-006 | UC-004 |
| REQ-007 | UC-004 |
| REQ-008 | UC-001, UC-004 |
| REQ-009 | UC-002 |
| REQ-010 | UC-002, UC-003 |
| REQ-011 | UC-002, UC-007 |
| REQ-012 | UC-001, UC-002, UC-007 |
| REQ-013 | UC-006 |
| REQ-014 | UC-004 |
| REQ-015 | UC-002, UC-003, UC-004 |
| REQ-016 | UC-008 |
| REQ-017 | UC-008, UC-009 |
| REQ-018 | UC-008, UC-009 |
| REQ-019 | UC-009 |
| REQ-020 | UC-010 |
| REQ-021 | UC-010 |
| REQ-022 | UC-010 |
| REQ-023 | UC-011 |
| REQ-024 | UC-011 |
| REQ-025 | UC-010, UC-011 |
| REQ-026 | UC-012 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | Proves configured BrowserServer MCP browser names survive Docker exposure. |
| AC-002 | Proves remote/Docker nodes without MCP have no embedded browser tools. |
| AC-003 | Preserves host Electron browser tools. |
| AC-004 | Proves route-backed call dispatch. |
| AC-005 | Prevents ambiguous same-name definitions. |
| AC-006 | Confirms user-facing pairing removal. |
| AC-007 | Confirms Electron pairing API removal. |
| AC-008 | Confirms backend pairing API removal. |
| AC-009 | Confirms node management still works after cleanup removal. |
| AC-010 | Confirms stale pairing tests are removed/replaced. |
| AC-011 | Guards host Electron env-injection path. |
| AC-012 | Guards protected platform tools. |
| AC-013 | Keeps durable docs aligned with product direction. |
| AC-014 | Proves local Linux ARM64 packaging is official and correctly named. |
| AC-015 | Proves release-oriented Linux x64 packaging remains explicit and correctly named. |
| AC-016 | Prevents invalid/misleading Linux cross-architecture artifacts. |
| AC-017 | Proves Linux ARM64 packaged startup reaches the embedded server, not only Electron shell launch. |
| AC-018 | Guards the Prisma engine selection root cause. |
| AC-019 | Guards ARM64 Prisma engine packaging completeness. |
| AC-020 | Proves Linux ARM64 CI release artifact and metadata generation. |
| AC-021 | Proves release publishing handles both Linux updater metadata names and embedded AppImage blockmaps without collisions or standalone Linux blockmap assets. |
| AC-022 | Proves release CI validates native/runtime correctness and updater metadata integrity, not only artifact existence. |
| AC-023 | Keeps build/release/startup docs aligned with the new Linux architecture and AppImage update artifact behavior. |

## Approval Status

Approved by user on 2026-06-18 for same-ticket removal of remote “Pair local browser” functionality and simplification toward container-local BrowserServer MCP for Docker/remote browser automation. Delivery reroute on 2026-06-18 adds Linux ARM64 Electron local-build/startup support as a user-verification blocking requirement. User follow-up on 2026-06-18 adds GitHub desktop release workflow support for Linux ARM64 artifacts/metadata. Implementation/API-E2E `LF-002` reroute on 2026-06-19 corrects the Linux AppImage artifact contract to embedded blockmaps plus updater metadata instead of standalone `*.AppImage.blockmap`; this contract change requires architecture re-review before implementation resumes.
