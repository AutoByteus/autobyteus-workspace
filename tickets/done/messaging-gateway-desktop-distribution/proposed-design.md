# Proposed Design Document

## Design Version

- Current Version: `v2`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Defines server-owned dynamic install, release-manifest resolution, gateway supervision, and frontend diagnostic/status model. | 1 |
| v2 | Stage 5 Round 1 requirement-gap re-entry | Adds explicit server-mediated provider configuration flow plus disable/update lifecycle coverage and rollback expectations. | 1 |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/messaging-gateway-desktop-distribution/investigation-notes.md`
- Requirements: `tickets/in-progress/messaging-gateway-desktop-distribution/requirements.md`
- Requirements Status: `Refined`

## Summary

The selected node's server becomes the sole control plane for messaging gateway installation, lifecycle, configuration, update, and diagnostics. When messaging is enabled, the server resolves a compatible gateway artifact from an explicit compatibility manifest, downloads and verifies the artifact, extracts it into server-owned data, writes a managed runtime config, starts the gateway as a loopback-bound child process, and exposes status plus diagnostics through node-scoped server APIs. Provider configuration changes, disable actions, and version updates are all mediated by the same server-owned boundary, including rollback to the previous active runtime if an update activation fails. The current raw gateway URL/token setup path is removed for in-scope providers.

## Goals

- Eliminate manual gateway startup as the default setup path.
- Keep the gateway as an isolated companion process.
- Keep source ownership in the monorepo while separating distribution artifacts.
- Support embedded and remote nodes with one ownership model.
- Support configuration, disable, and update flows through the same node-owned lifecycle boundary.
- Expose install/start progress and runtime diagnostics without reintroducing direct gateway management UX.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the current raw gateway URL/token setup path for in-scope providers and replace it with server-managed enable/configure/status flows.
- Gate rule: design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| FR-001 | Server owns messaging lifecycle control plane | AC-001, AC-002 | Node-scoped control and activation flow | UC-001, UC-002, UC-003 |
| FR-002 | Server exposes messaging capability state | AC-001 | Queryable status model | UC-003, UC-005 |
| FR-003 | Enable triggers server-owned install/activation | AC-002 | No manual gateway startup | UC-001, UC-002 |
| FR-003A | Download artifact on demand when missing | AC-002A | Automatic artifact fetch | UC-001 |
| FR-003B | Artifact version resolved from compatibility source | AC-002B, AC-006 | Explicit version selection | UC-001, UC-006 |
| FR-004 | Gateway runs as separate child process | AC-004 | Isolated process boundary | UC-001, UC-002, UC-003 |
| FR-005 | Gateway files persist under server-owned data | AC-004 | Managed install root/config/log/state | UC-001, UC-002, UC-003 |
| FR-005A | Install includes integrity verification + extraction | AC-002A | Safe runtime install | UC-001, UC-004 |
| FR-006 | Default UX does not ask for raw gateway URL/token | AC-003 | Managed UX replaces manual connection card | UC-005, UC-007 |
| FR-007 | Provider config is mediated by server API | AC-003, AC-003A | Frontend talks to server, not gateway | UC-007 |
| FR-007A | Server persists/applies provider configuration and reports readiness | AC-003A | Config-write flow updates readiness state | UC-007 |
| FR-008 | Same ownership model for embedded and remote nodes | AC-005 | Node-neutral behavior | UC-001, UC-002, UC-003 |
| FR-009 | Server reports health/failure reasons | AC-001, AC-004B | Actionable status | UC-003, UC-004, UC-005 |
| FR-009A | Server reports runtime diagnostics incl. port/version | AC-004A | Read-only diagnostics | UC-005 |
| FR-009B | Server reports install/start progress | AC-001, AC-004B | Status-first UX with progress | UC-001, UC-004, UC-005 |
| FR-010 | Compatibility defined in release process | AC-002B, AC-006 | Server/gateway match guaranteed | UC-001, UC-006 |
| FR-011 | WeChat excluded | AC-007 | Non-WeChat providers only | UC-001, UC-002, UC-005 |
| FR-012 | No plugin marketplace or Docker daemon dependency | AC-002 | Clean server-managed capability | UC-001, UC-002 |
| FR-013 | Disable managed messaging through the server-owned lifecycle boundary | AC-008 | Server stops the managed gateway and surfaces inactive state | UC-008 |
| FR-014 | Update managed gateway through the server-owned lifecycle boundary with rollback | AC-009 | New compatible version activates cleanly or rollback preserves prior runtime | UC-009 |

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Frontend windows already bind to selected node base URLs; messaging currently bypasses this with direct gateway calls. | `autobyteus-web/stores/windowNodeContextStore.ts`, `autobyteus-web/components/settings/messaging/GatewayConnectionCard.vue`, `autobyteus-web/services/messagingGatewayClient.ts` | Whether node capability probing should include messaging in v1. |
| Current Naming Conventions | Runtime/process ownership sits under server/electron managers; GraphQL types sit under `src/api/graphql/types`; lifecycle/service naming tends to use `*Service` and `*ProcessManager`. | `autobyteus-server-ts/src/api/graphql/types/server-settings.ts`, `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts` | Whether messaging installer/supervisor should live in `services` or `runtime-management`. |
| Impacted Modules / Responsibilities | Messaging setup UI owns wrong concern today; external-channel resolver is about bindings, not gateway lifecycle; Electron has embedded-only diagnostics patterns. | `autobyteus-web/stores/gatewaySessionSetupStore.ts`, `autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts`, `autobyteus-web/components/server/ServerMonitor.vue` | Final split between messaging capability status API and provider config API. |
| Data / Persistence / External IO | Server already owns app data roots; gateway already uses file-backed runtime state; server can download files but not yet verify/extract artifacts. | `autobyteus-server-ts/src/config/app-config.ts`, `autobyteus-message-gateway/src/bootstrap/create-gateway-app.ts`, `autobyteus-server-ts/src/utils/download-utils.ts` | Final artifact format and verification strategy. |

## Current State (As-Is)

- Frontend messaging setup is built around direct gateway connection management.
- External channel bindings already live in the server API, but gateway lifecycle does not.
- Embedded server packaging exists, but gateway packaging is Docker/manual-start oriented.
- Desktop release and server Docker release lanes exist, but no standalone gateway artifact release lane exists.

## Target State (To-Be)

- The server owns a `managed messaging gateway` capability.
- The server ships with a compatibility manifest that points to a platform-specific gateway runtime artifact.
- On enable, the server downloads, verifies, extracts, configures, and starts the gateway.
- Provider configuration writes, disable requests, and update requests are handled through the same managed capability service.
- The gateway binds to loopback on a managed port and is treated as an internal server-side dependency.
- Frontend messaging settings talk only to the selected node's server APIs and render lifecycle/progress/diagnostics from there.
- The legacy raw gateway URL/token path is removed for in-scope providers.

## Shared Architecture Principles (Design + Review, Mandatory)

- Principle alignment statement: design and review both evaluate concern ownership, dependency direction, operability, and file placement using the same rules.
- SoC cause statement: release resolution, artifact install, runtime supervision, server-facing gateway orchestration, and frontend status rendering each have separate owners.
- Layering result statement: layering emerges as `GraphQL/REST API -> managed capability application services -> installer/supervisor/runtime-client infrastructure`.
- Decoupling rule statement: frontend depends on server APIs only; server lifecycle code depends on installer/supervisor/runtime-client boundaries; gateway remains a replaceable child runtime.
- Module/file placement rule statement: node-owned lifecycle code lives in `autobyteus-server-ts`; frontend messaging status/config UI lives in `autobyteus-web`; gateway runtime stays in `autobyteus-message-gateway`.

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Add` a server-owned managed-capability subsystem for messaging gateway lifecycle and `Remove` the direct gateway connection flow from the frontend.
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`): this keeps the ownership boundary consistent with the node model, isolates runtime failures, makes release compatibility explicit, and avoids carrying an Electron-only abstraction into a multi-node product.
- Layering fitness assessment (are current layering and interactions still coherent under emergent-layering rules?): `No`
- Decoupling assessment (are boundaries low-coupled with clear one-way dependency directions?): `Yes`, after the frontend no longer talks to the gateway directly.
- Module/file placement assessment (do file paths/folders match owning concerns for this scope?): `No`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Add`, `Split`, `Remove`
- Note: `Keep` is invalid for the current direct web-to-gateway setup boundary.

## Layering Emergence And Extraction Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers (provider selection/fallback/retry/aggregation/routing/fan-out) exists | Yes | Install, status, start/stop, local gateway admin calls, and release resolution should not be repeated across UI callers. | Extract orchestration boundary |
| Responsibility overload exists in one file/module (multiple concerns mixed) | Yes | Current messaging setup store mixes connection config, direct gateway access, and session flows. | Split + lift coordination |
| Proposed new layer owns concrete coordination policy (not pass-through only) | Yes | Installer/supervisor services own manifest resolution, download, verify, extract, config writing, process control, and diagnostics aggregation. | Keep layer |
| Current layering can remain unchanged without SoC/decoupling degradation | No | Direct gateway client in frontend violates node ownership model. | Change |

### Optional Alternatives (Use For Non-Trivial Or Uncertain Changes)

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Dynamic server-managed runtime artifact download on enable | Small release payloads, explicit node ownership, works for embedded and remote nodes | Needs new artifact release lane + installer infra | Chosen | Best fit for user friction and product boundary |
| B | Bundle gateway into every desktop/server release | Simple runtime activation once shipped | Bloats installers/images for users who never enable messaging | Rejected | Conflicts with release-size concern |
| C | Keep manual external gateway + improve docs only | Minimal implementation | Preserves wrong ownership boundary and user friction | Rejected | Does not solve product problem |
| D | Merge gateway into main server process | Fewer moving processes | Harder failure isolation, muddier boundaries, poorer operability | Rejected | Violates separate-process requirement |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Add | N/A | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/*` | Introduce managed capability ownership for release resolution, install, status, and supervision. | Server backend | New subsystem |
| C-002 | Add | N/A | `autobyteus-server-ts/src/api/graphql/types/managed-messaging-gateway.ts` | Expose node-scoped lifecycle/status/config APIs. | Server backend, web frontend | New GraphQL type/resolver |
| C-003 | Add | N/A | `.github/workflows/release-messaging-gateway.yml` | Publish standalone gateway artifacts and manifest inputs. | Release automation | New workflow |
| C-004 | Add | N/A | `autobyteus-message-gateway/scripts/build-runtime-package.mjs` | Produce portable gateway runtime package similar to embedded server staging flow. | Gateway package, release automation | New packaging script |
| C-005 | Modify | `autobyteus-web/components/settings/messaging/GatewayConnectionCard.vue` | `autobyteus-web/components/settings/messaging/ManagedGatewayStatusCard.vue` | Replace raw connection form with managed lifecycle/progress/status/config UI. | Web frontend | Rename + responsibility change |
| C-006 | Modify | `autobyteus-web/stores/gatewaySessionSetupStore.ts` | `autobyteus-web/stores/managedMessagingGatewayStore.ts` | Move from direct gateway connection management to node-scoped managed lifecycle, config, and update state. | Web frontend | Split session flows from lifecycle |
| C-007 | Remove | `autobyteus-web/services/messagingGatewayClient.ts` | N/A | Remove direct browser-to-gateway contract from default product path. | Web frontend | Replace with server API service |
| C-008 | Modify | `autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts` | same path | Integrate binding UX with managed capability readiness where needed, without folding lifecycle ownership into the binding resolver. | Server backend | Small adapter change only |

## Module/File Placement And Ownership Check (Mandatory)

| File/Module | Current Path | Target Path | Owning Concern / Platform | Path Matches Concern? (`Yes`/`No`) | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| Direct gateway connection form | `autobyteus-web/components/settings/messaging/GatewayConnectionCard.vue` | `autobyteus-web/components/settings/messaging/ManagedGatewayStatusCard.vue` | Frontend messaging status/control UI | No | Move | Current name and behavior encode old ownership model |
| Gateway setup store | `autobyteus-web/stores/gatewaySessionSetupStore.ts` | `autobyteus-web/stores/managedMessagingGatewayStore.ts` plus provider/session-specific stores | Frontend managed lifecycle state | No | Split | Current store mixes lifecycle control and direct gateway session concerns |
| Direct web gateway client | `autobyteus-web/services/messagingGatewayClient.ts` | N/A | Obsolete browser-to-gateway transport | No | Remove | Server becomes the only control-plane owner |
| Managed capability backend | N/A | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/*` | Server-side lifecycle/install/supervision | N/A | Add | New owning boundary |
| External channel binding resolver | `autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts` | Keep | Binding CRUD only | Yes | Keep | Lifecycle stays separate from bindings |

## Target Architecture Shape And Boundaries (Mandatory)

| Layer/Boundary | Purpose | Owns | Must Not Own | Notes |
| --- | --- | --- | --- | --- |
| Web messaging settings UI | Render managed status, progress, diagnostics, and provider config inputs | UI state and presentation | Direct gateway HTTP access | Talks only to node-scoped server API |
| Server GraphQL boundary | Expose managed gateway lifecycle/status/config operations | Queries, mutations, DTO mapping | Artifact download logic, child-process details | Thin API layer |
| Managed capability application service | Orchestrate enable/disable/update/restart/status | Lifecycle rules, state transitions, readiness checks | Archive extraction details or raw process spawn calls | Central policy owner |
| Release/installer infrastructure | Resolve compatibility manifest, download artifact, verify integrity, extract/install/activate | Artifact IO and install roots | UI concerns or provider config rules | Platform-sensitive |
| Gateway supervisor/runtime client | Start/stop child process, probe health, capture diagnostics, call internal admin endpoints | Process lifecycle and runtime metadata | Release resolution logic | Loopback-only access |
| Gateway runtime | Provider adapters and messaging-specific behavior | Gateway HTTP/admin/provider logic | UI ownership or release policy | Remains separate package/process |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Replacement Clean-Cut Design |
| --- | --- | --- | --- |
| Keep raw gateway URL/token form as advanced mode | Easier migration from current UI | Rejected | Replace with server-managed lifecycle/status UI |
| Keep browser-side direct gateway client for some session flows | Faster initial implementation | Rejected | Server owns internal gateway admin client and exposes stable server APIs |
| Continue supporting manual external gateway as permanent fallback | Avoid breaking old setups | Rejected | Managed capability replaces legacy path for in-scope providers |

## File And Module Breakdown

| File/Module | Change Type | Layer / Boundary | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| `managed-messaging-gateway-service.ts` | Add | Application service | High-level lifecycle orchestration | `enable`, `disable`, `update`, `restart`, `getStatus`, `applyConfig` | Input: node-scoped commands/config. Output: status snapshots | Installer, supervisor, config writer |
| `messaging-gateway-release-manifest-service.ts` | Add | Infrastructure | Resolve compatible artifact metadata | `resolveArtifact(serverVersion, platform)` | Input: server version/platform. Output: artifact descriptor | Embedded manifest file |
| `messaging-gateway-installer-service.ts` | Add | Infrastructure | Download, verify, extract, activate runtime package | `ensureInstalled(version)` | Input: artifact descriptor. Output: install result | download utils, checksum/extract helpers |
| `messaging-gateway-process-supervisor.ts` | Add | Infrastructure | Spawn/monitor child process and probe health | `start`, `stop`, `restart`, `collectDiagnostics` | Input: runtime config. Output: process state/diagnostics | child_process, health client |
| `managed-messaging-gateway.ts` GraphQL type/resolver | Add | API | Expose lifecycle + diagnostics + config contract | GraphQL queries/mutations | Input: frontend node-scoped requests. Output: status DTOs | managed service |
| `managedMessagingGatewayStore.ts` | Add | Web store | Maintain lifecycle/progress/config/diagnostic state for selected node | `loadStatus`, `enable`, `disable`, `updateGateway`, `saveConfig` | Input: GraphQL responses. Output: reactive UI state | Apollo client |
| `ManagedGatewayStatusCard.vue` | Add | Web component | Show lifecycle controls, provider-config actions, install/start progress, and advanced diagnostics | UI events only | Input: store state. Output: user actions | managed store |

## Layer-Appropriate Separation Of Concerns Check

- UI/frontend scope: one store owns managed lifecycle state, while provider/session UI remains separate.
- Non-UI scope: lifecycle orchestration, release resolution, installation IO, and process supervision are split into separate server-side modules.
- Integration/infrastructure scope: artifact download/install and gateway runtime process management each own one integration concern.
- Layering note: no extra layer is introduced unless it owns lifecycle or installer policy.
- Decoupling check: frontend no longer depends on gateway contract; server holds the only dependency on the internal gateway admin client.
- Module/file placement check: all lifecycle/install logic moves to server-owned modules instead of remaining in web settings files.

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| File | `GatewayConnectionCard.vue` | `ManagedGatewayStatusCard.vue` | Name should reflect status/control UI, not raw connection wiring. | Direct rename |
| File | `gatewaySessionSetupStore.ts` | `managedMessagingGatewayStore.ts` | Lifecycle store should describe managed ownership. | Session-specific sub-stores may remain separate |
| Module | N/A | `ManagedMessagingGatewayService` | Clear orchestration owner | New server service |
| Module | N/A | `MessagingGatewayReleaseManifestService` | Explicitly owns compatibility lookup | New server service |
| Module | N/A | `MessagingGatewayProcessSupervisor` | Explicit runtime/process ownership | New server service |
| API | N/A | `managedMessagingGatewayStatus` | Reads like node-owned status query | GraphQL query |
| API | N/A | `enableManagedMessagingGateway` | Explicit lifecycle mutation | GraphQL mutation |

## Naming Drift Check (Mandatory)

| Item | Current Responsibility | Does Name Still Match? (`Yes`/`No`) | Corrective Action (`Rename`/`Split`/`Move`/`N/A`) | Mapped Change ID |
| --- | --- | --- | --- | --- |
| `GatewayConnectionCard.vue` | Would become managed lifecycle/progress UI if kept | No | Rename | C-005 |
| `gatewaySessionSetupStore.ts` | Currently mixes lifecycle, connection config, and session state | No | Split | C-006 |
| `messagingGatewayClient.ts` | Browser-side direct gateway transport | No, obsolete | Remove | C-007 |

## Existing-Structure Bias Check (Mandatory)

| Candidate Area | Current-File-Layout Bias Risk | Architecture-First Alternative | Decision | Why |
| --- | --- | --- | --- | --- |
| Messaging setup files in web | High | Move lifecycle ownership to server and keep web as pure control surface | Change | Current layout encodes wrong ownership boundary |
| External channel binding resolver | Medium | Keep bindings separate and add dedicated managed gateway resolver | Keep separate | Avoid overloading binding concern |
| Electron updater pattern | Low | Reuse status model only, not installer ownership | Keep pattern, not implementation | Remote nodes cannot depend on Electron IPC |

Rule:
- Do not keep a misplaced file in place merely because many callers already import it from there; that is structure bias, not design quality.

## Anti-Hack Check (Mandatory)

| Candidate Change | Shortcut/Hack Risk | Proper Structural Fix | Decision | Notes |
| --- | --- | --- | --- | --- |
| Reusing browser-side gateway client against localhost port | High | Server-only internal gateway client plus stable server API | Reject shortcut | Would leak internal port semantics back into UI |
| Stuffing lifecycle fields into external-channel binding resolver | Medium | Dedicated managed lifecycle API boundary | Reject shortcut | Binding CRUD is not lifecycle orchestration |
| Hardcoding "latest" gateway asset URL in frontend | High | Manifest-driven server-side compatibility resolution | Reject shortcut | Violates explicit compatibility requirement |

Rule:
- A functionally working local fix is still invalid here if it degrades layering or responsibility boundaries.

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| Managed GraphQL resolver | Apollo/web UI | Managed messaging service | Low | Keep resolver thin |
| Managed messaging service | Resolver | Installer, supervisor, config store | Medium | Single orchestration owner prevents logic spread |
| Installer service | Managed service | Manifest resolver, download helper, checksum/extractor | Medium | Keep artifact IO behind one boundary |
| Supervisor | Managed service | child process, health client, internal admin client | Medium | No release-resolution dependencies |
| Web managed store | UI components | Apollo client | Low | Keep gateway details out of the UI |

## Allowed Dependency Direction (Mandatory)

- Allowed direction rules: `web UI/store -> server GraphQL -> managed messaging service -> installer/supervisor/internal gateway client -> gateway runtime`
- Temporary boundary violations and cleanup deadline: `None planned`

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| Raw gateway connection card | Remove route/state imports and replace rendered component | No advanced-mode retention | Web spec updates |
| Browser-side gateway client | Remove service and all direct callers | Server becomes sole control-plane owner | TypeScript compile + targeted tests |
| Direct gateway token persistence in frontend | Remove persisted manual gateway config for managed path | No manual setup fallback | Store tests |

## Data Models (If Needed)

- `ManagedMessagingGatewayArtifactDescriptor`
  - `artifactVersion`, `platformKey`, `downloadUrl`, `sha256`, `archiveType`
- `ManagedMessagingGatewayInstallState`
  - `desiredVersion`, `installedVersion`, `activeVersion`, `state`, `progressPercent`, `message`, `lastError`, `updatedAt`
- `ManagedMessagingGatewayRuntimeDiagnostics`
  - `bindHost`, `bindPort`, `pid`, `healthUrl`, `logsDir`, `configPath`, `startedAt`, `runningVersion`
- `ManagedMessagingGatewayConfig`
  - provider settings, secrets presence flags, enablement flags, runtime options

## Error Handling And Edge Cases

- Manifest missing or incompatible for current platform -> capability state `blocked` with explicit reason.
- Artifact download fails -> install state `error`, retain no partial active switch.
- Checksum/integrity verification fails -> delete staged archive and refuse install.
- Archive extraction fails -> leave existing active version untouched.
- Provider config save fails validation -> state `misconfigured` or `blocked` with field-safe reasons and no direct secret echo.
- Port allocation conflict -> allocate or persist a replacement before process start; report chosen port as diagnostics.
- Process crashes after start -> state `degraded` or `error`, include restart recommendation and last error.
- Server restart with capability enabled -> supervisor restores configured install and restarts gateway automatically.
- Update activation fails -> restore previous active version pointer, keep or restart the last known-good runtime, and expose rollback result in diagnostics.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Requirement | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- | --- |
| UC-001 | FR-001, FR-003A, FR-005A, FR-009B, FR-010 | Enable messaging on embedded node with missing artifact | Yes | Yes | Yes | `future-state-runtime-call-stack.md#UC-001` |
| UC-002 | FR-001, FR-003, FR-004, FR-005, FR-008 | Enable messaging on remote node with artifact already installed | Yes | Yes | Yes | `future-state-runtime-call-stack.md#UC-002` |
| UC-003 | FR-002, FR-004, FR-005, FR-009 | Server restart auto-restores enabled managed gateway | Yes | Yes | Yes | `future-state-runtime-call-stack.md#UC-003` |
| UC-004 | FR-005A, FR-009, FR-009B | Artifact verification or extraction failure during install | Yes | N/A | Yes | `future-state-runtime-call-stack.md#UC-004` |
| UC-005 | FR-006, FR-009A | Frontend reads managed status and advanced diagnostics | Yes | N/A | Yes | `future-state-runtime-call-stack.md#UC-005` |
| UC-006 | FR-003B, FR-010, FR-011 | Compatibility resolution excludes unsupported provider/runtime combinations | Yes | N/A | Yes | `future-state-runtime-call-stack.md#UC-006` |
| UC-007 | FR-007, FR-007A, FR-009 | Frontend saves provider configuration through the server-owned flow | Yes | Yes | Yes | `future-state-runtime-call-stack.md#UC-007` |
| UC-008 | FR-001, FR-004, FR-013 | User disables managed messaging and the server stops the gateway | Yes | N/A | Yes | `future-state-runtime-call-stack.md#UC-008` |
| UC-009 | FR-004, FR-010, FR-014 | User updates the managed gateway and activation either succeeds or rolls back | Yes | Yes | Yes | `future-state-runtime-call-stack.md#UC-009` |

## Performance / Security Considerations

- Bind managed gateway to loopback by default; do not expose it publicly unless a later explicit requirement appears.
- Store secrets in server-owned config surfaces; expose only configured/not-configured booleans to the frontend.
- Verify artifact integrity before extraction and activation.
- Switch active version only after successful extraction and config generation.
- Limit download/install concurrency to one gateway operation per node.

## Migration / Rollout (If Needed)

- Remove the raw gateway connection UI path for in-scope providers as part of the same change set.
- Provide one-way migration messaging in UI/docs if existing users have configured manual gateway values.
- Do not retain a dual-path managed-vs-manual runtime architecture in code.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/API/E2E) | Status |
| --- | --- | --- | --- |
| C-001 | T-001, T-002, T-003 | Unit + integration + API | Planned |
| C-002 | T-004, T-005 | Unit + API + E2E | Planned |
| C-003 | T-006 | CI/release validation | Planned |
| C-004 | T-007 | Packaging verification | Planned |
| C-005 | T-008 | UI/store unit + E2E | Planned |
| C-006 | T-008, T-009 | Store unit + API/E2E | Planned |
| C-007 | T-010 | Compile/test + review cleanup | Planned |
| C-008 | T-011 | API unit/integration | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Design Smell | Requirements Updated? | Design Update Applied | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-08 | Requirement refinement before Stage 3 | Requirement Gap | On-demand delivery and diagnostics were under-specified in the earlier draft. | Yes | Yes | Closed |
| 2026-03-08 | Stage 5 Round 1 review | Requirement Gap | Provider-configuration writes and disable/update lifecycle flows were missing from the v1 design coverage. | Yes | Yes | Closed |

## Open Questions

- Should lifecycle/status/config all stay in GraphQL, or should long-running lifecycle operations use REST with GraphQL reads?
- Should the compatibility manifest be embedded into server builds only, or also remotely refreshable for hotfix recovery?
- Should the active managed gateway port be persistent across restarts or reallocated on every enable/restart?
- Should provider configuration writes trigger immediate hot-reload, controlled restart, or explicit user-applied restart depending on the provider/runtime combination?
