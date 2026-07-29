# Design Spec — Universal Application Dual-Host Foundation

## Current-State Read

AutoByteus already has the central application runtime needed by both hosts:

- `ApplicationBundleService` discovers strict manifest-v4 bundles and resolves UI/backend paths.
- `ApplicationEngineHostService` prepares storage, applies app migrations, starts one worker process, validates backend definition v4, and bridges backend context capabilities.
- `ApplicationBackendApiGatewayService` is the authoritative application query/command/route/GraphQL/custom-WebSocket boundary.
- `ApplicationOrchestrationHostService` and related stores own resource resolution, run binding, recovery, lifecycle events, direct agent communication, and published-artifact access.
- Studio owns setup-first application selection and the iframe v4 ready/bootstrap exchange.
- `ApplicationClientTransport` already abstracts the post-bootstrap HTTP/WebSocket calls.

The first investigation found two primary coupling points; architecture review exposed two composition-critical secondary couplings that must be resolved in the same bounded refactor:

1. `autobyteus-application-frontend-sdk/src/hosted-application-startup.ts` treats Studio iframe launch hints and parent messaging as the only valid application entry. A top-level root entry deliberately becomes `unsupported_entry`.
2. `autobyteus-server-ts/src/server-runtime.ts`, `src/api/rest/index.ts`, `src/api/websocket/index.ts`, and the GraphQL schema construct one broad server. Application ingress, Studio/global APIs, MCP, remote access, mobile, and unrelated background capabilities are initialized or registered together.
3. Required application runtime readiness is hidden among detached background loaders. In particular, tool-group failures are logged and swallowed even though the representative real team depends on those tool registrations.
4. Composition-critical services have constructor seams but fall back to cached/global catalog, data-root, gateway, availability, engine, notification, streaming, and communication instances. `ApplicationGlobalPlatformStateStore` has no configured-root seam, and several listener-owning services lack aggregate disposal.
5. On the refreshed `6caf80930` baseline, the broad process root also owns operational database/root-key file-tool denial, repository-Prisma initialization, secret-vault bootstrap, provisioned Search-tool registration, and corresponding event-pipeline/vault/Prisma shutdown in that dependency order. These are real runtime prerequisites for application agent/tool execution and must be preserved in both compositions; they are not user authentication.

The current devkit mirrors the first coupling: `autobyteus-app dev` renders an iframe contract host and silently selects a mock backend when no real server URLs are provided. Its starter has no `dev:studio` or production `start` script. Both representative applications expose neither, use non-default `frontend-src`/`backend-src` layouts plus custom builders without `autobyteus-app.config.mjs`, and therefore cannot enter the devkit pack path through defaults. The existing server project also has no standalone process API.

The target must respect the current supported Studio production path and reuse the existing runtime/storage/orchestration authorities. Full evidence and commands are recorded in [investigation-notes.md](investigation-notes.md), especially BEH-001 through BEH-007.

## Intended Change

Implement one universal application startup boundary and two explicit host compositions:

- **Studio composition:** preserves the current setup-first Studio route and iframe v4 wire protocol.
- **Standalone composition:** selects one current application bundle from deployment configuration, serves that bundle's UI at `/`, supplies same-origin bootstrap data, and exposes only selected-application ingress under `/_autobyteus/*`.

Both compositions use one application-platform runtime graph and the same bundle, engine, gateway, storage, orchestration, communication, event, and artifact owners.

The application source calls `startApplication(...)` once. An SDK-owned bootstrap coordinator selects the correct bootstrap provider, normalizes provider-specific wire data into one host-neutral runtime bootstrap, creates the existing application client, and calls the business mount callback. Application code does not select a host and does not branch on Studio versus standalone.

The first slice keeps manifest v4 and the current package layout unchanged. Host selection, standalone root ownership, and the standalone package identity are deployment concerns, not new manifest fields.

The application package is assembled once and is a read-only runtime input in both hosts. Studio import/selection and standalone configured selection consume the same package bytes; every mutable database, log, migration-ledger, runtime-status, and orchestration write goes under the composition's configured application-data root.

The same design is exposed as a native application-folder workflow:

- `pnpm dev` builds a disposable package, starts the real standalone composition, watches application inputs, and performs a graceful rebuild/restart/browser reload cycle.
- `pnpm dev:studio` builds/watches the current package through the real local Studio import/reload and iframe lifecycle.
- `pnpm build` produces `dist/importable-package`; `pnpm validate` validates that output.
- `pnpm start` validates and runs the existing output through the production standalone composition. It never builds, watches, enables development reload, or registers mock routes.

`autobyteus-app` remains the thin application-project command facade. It delegates standalone process construction to a narrow exported `startStandaloneApplicationHost` boundary in the existing `autobyteus-server-ts` project. No extra top-level project or second server implementation is introduced.

### Architecture Review Round 1 Resolution Map

| Finding | Resolution Location | Scope Effect |
| --- | --- | --- |
| AR-001 | `Named Startup / Readiness Allocation`, lifecycle phase API, stop order, and updated sequence/guidance | No new product behavior; replaces a generic readiness placeholder with exact current/target ownership and failure policy |
| AR-002 | `Exact Frontend Startup API And Migration Inventory`, removal plan, file mapping, and clean-cut sequence | No compatibility path; accounts for source and generated iframe-only consumers |
| AR-003 | `Exact Composition-Critical Dependency Graph` and `Composition-Critical Modify / Retain Inventory` | Bounded in-scope DI conversion plus two narrow cycle-break seams; unrelated process globals remain explicitly retained |
| AR-004 | Canonical seven-row behavior table in [investigation-notes.md](investigation-notes.md) and corrected BEH-005 evidence below | Documentation/traceability only; security evidence is now `SEC-CONSTRAINT-001`, not a behavior ID |

### Architecture Review Round 2 Resolution Map

| Finding | Resolution Location | Scope Effect |
| --- | --- | --- |
| AR-001 | P2A/P2B/P6, dependency rule, graph/example, sequence/guidance, final file map, and SV-C24 | Bounded consistency correction: protected operational paths precede Prisma everywhere, and exactly seven tool groups include Search |
| AR-005 | DS-006 maintained-project mapping, Modify/Delete and target file maps, exact command example, sequence, and disposable pack probe in investigation/self-validation | Declaratively maps both maintained non-default layouts into the existing pack owner; removes rather than adapts their custom builders/generated mirrors |
| AR-006 | [proposal-critical-analysis.md](proposal-critical-analysis.md) correction, required behavior, roadmap, and decision table | Removes the current broad server as any standalone fallback/stage; named runtime prerequisites remain reusable only inside explicit compositions |

### Discussion-Stage Self-Validation Resolution Map

The use-case, canonical-principles, refreshed-base, and round-2 consistency audit is retained in [design-self-validation.md](design-self-validation.md). It produced eight bounded corrections before further review:

| Finding | Resolution Location | Scope Effect |
| --- | --- | --- |
| SV-001 | DS-007, package immutability rule, conformance sequence/guidance | Makes the approved build-once invariant a full operational spine; no new package format |
| SV-002 | Standalone wire payload, same-origin provider normalization, endpoint example/file mapping | Keeps `ApplicationRuntimeBootstrap` semantically tight and makes non-loopback browser access correct |
| SV-003 | R1/R2 selected-ID recovery filter and recovery guidance | Enforces the already-approved one-selected-application boundary without deleting or migrating dormant data |
| SV-004 | Standalone config/network boundary and composition guidance | Makes the local no-auth scope explicit: loopback default, explicit trusted-network non-loopback, no permissive CORS |
| SV-005 | DS-008 static/navigation spine and path/fallback rules | Stretches AC-009 from root request through safe assets/navigation to application startup |
| SV-006 | DS-006/DS-010, native command contract, devkit/server process boundary, command file mapping | Makes application-folder development and post-build production execution explicit without adding a project or allowing `start` to rebuild/mock |
| SV-007 | Latest-base readiness allocation, process-resource graph, Modify/Retain inventory, and stop order | Incorporates operational Prisma, secret vault, protected paths, Search tool registration, and their shutdown from refreshed `origin/personal`; no identity/account scope is added |
| SV-008 | Round-2 resolution map, exact maintained-app config/removal plan, singular lifecycle chain/tool count, and corrected critical analysis | Closes AR-001/AR-005/AR-006 without a new subsystem, custom-builder hook, or broad-server fallback |

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001, REQ-004 / AC-001, AC-003, AC-006 | Select/enter/reload/exit an installed app in Studio or start a configured standalone host | Investigation “Relevant Existing Behavior,” BEH-001 | Preserve complete Studio presentation lifecycle; add standalone root over the same bundle/runtime | Build/use: DS-007; Studio start: DS-001; Studio reload/exit: DS-009; standalone: DS-002/DS-008; shared invocation: DS-003 |
| BEH-002 | Contract | REQ-002 / AC-002, AC-003, AC-007 | Application calls `startApplication` | Investigation BEH-002; frontend SDK probe | Replace iframe-owned application entry with provider-owned bootstrap and one client construction path | DS-001, DS-002, DS-009 |
| BEH-003 | Contract | REQ-003 / AC-001, AC-004, AC-008 | Validate/discover package root and local application ID | Investigation BEH-003 | Reuse one read-only manifest-v4 package unchanged; standalone selection is configuration | DS-002, DS-005, DS-007, DS-008 |
| BEH-004 | System | REQ-004 / AC-005, AC-006 | Backend resolves configured resource and starts a run | Investigation BEH-004 | Both hosts call the same resource/orchestration owners and real runtimes | DS-003, DS-004 |
| BEH-005 | Operational | REQ-005 / AC-003, AC-009, AC-010 | Start Studio server or standalone application server | Investigation BEH-005 and fixed composition evidence | Split composition roots and route mounts without duplicating implementations | DS-005, then DS-001/DS-002 |
| BEH-006 | Operational | REQ-006 / AC-005, AC-006, AC-011, AC-013 | Developer runs application-folder development/build/validate/start commands or conformance | Devkit/server/package-script investigation and mock-default probe | Make `dev` real standalone, make `dev:studio` real Studio, preserve build/validate, and add production `start` over the existing build; mocks become test fixtures only | DS-006, DS-007, DS-010 |
| BEH-007 | System | REQ-004, REQ-005 / AC-006, AC-012 | Backend ensure-ready and runtime recovery | Storage/orchestration investigation | Reuse current schemas, migrations, binding/event recovery, and host-specific data roots | DS-003, DS-004, DS-005 |

The behavior map defines the real behavior this design serves. The spines below show how the target structure carries it.

## Reachable Product Use-Case To Spine Map

The authoritative reachable use-case inventory is in [requirements.md](requirements.md). No mechanically possible or unsupported future state is promoted into this map.

| Use Case ID | Primary / Secondary Spine(s) | Return / Local Spine(s) | Coverage Decision |
| --- | --- | --- | --- |
| UC-001 | DS-007, then DS-001 and DS-002 | DS-006 conformance evidence | Complete |
| UC-002 | DS-001, DS-003 | DS-004, DS-005 | Complete |
| UC-003 | DS-009 | DS-001 frontend startup state on explicit reload | Complete after DS-009 addition |
| UC-004 | DS-002, DS-008, DS-003 | DS-004, DS-005 | Complete |
| UC-005 | DS-002 | DS-005 failed preparation | Complete |
| UC-006 | DS-001 or DS-002 | Frontend startup state machine | Complete |
| UC-007 | DS-003 | Request result; DS-005 readiness gate | Complete |
| UC-008 | DS-003 | DS-004 live return/event path; DS-005 stop | Complete |
| UC-009 | DS-003, DS-004 | Existing runtime loops behind orchestration; DS-005 readiness | Complete |
| UC-010 | DS-003 | DS-005 storage/readiness | Complete |
| UC-011 | DS-004 | DS-005 R1–R3 recovery | Complete |
| UC-012 | DS-003 | DS-005 failed readiness/retained engine authority | Complete |
| UC-013 | DS-008, DS-002 | DS-005 readiness | Complete |
| UC-014 | DS-005 | Named stop-order local spine | Complete |
| UC-015 | DS-006, DS-007 | DS-005 process cleanup | Complete |
| UC-016 | DS-007, then DS-001/DS-002 | Frontend startup state; static dependency checks | Complete |
| UC-017 | DS-002, DS-008 | Provider origin normalization and ingress origin policy | Complete |
| UC-018 | DS-010, then DS-002/DS-008 | DS-005 production process lifecycle/stop | Complete after native-command refinement |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| [sources/autobyteus-vertical-application-developer-experience-proposal.md](sources/autobyteus-vertical-application-developer-experience-proposal.md) | Original universal-application vision | REQ-001–REQ-006 / AC-001–AC-013 | Product-direction input; illustrative contracts are not copied directly | Input source; approval `N/A` |
| [proposal-critical-analysis.md](proposal-critical-analysis.md) | Repository-backed readiness assessment and bounded recommendation | REQ-001–REQ-006 / AC-001–AC-013 | Supplies the accepted/revised/deferred decisions that constrain this design | Approved/refined through 2026-07-27 with identity/account concerns excluded and native commands confirmed |
| [design-self-validation.md](design-self-validation.md) | Use-case simulation, reachability classification, spine coverage, canonical design-principles audit, and latest-base reconciliation | REQ-001–REQ-006 / AC-001–AC-013 | Validates this design and records SV-001–SV-007 corrections before review | Complete validation evidence; approval `N/A` |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement`
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`
- Refactor needed now: `Yes`
- Evidence: Application startup combines app mount, iframe hint parsing, parent-window messaging, bootstrap validation, and client construction in one file. Server construction combines application ingress/lifecycle with unrelated server surfaces in fixed route registries and startup sequencing.
- Design response: Introduce a governing application-startup coordinator with provider-specific bootstrap owners; introduce explicit Studio and standalone composition roots over one application-platform lifecycle/runtime graph; split multi-app Studio route adapters from selected-app standalone adapters while retaining the same gateway/communication owners.
- Refactor rationale: A second host cannot be added coherently as another branch inside `startHostedApplication` or by launching a copied/full public server. Those shortcuts would leave host selection, public route scope, and lifecycle authority ambiguous.
- Intentional deferrals and residual risk: Manifest/release vNext, packaged skills/tools, marketplace execution, optimized server-module distribution, and a complete repository-wide removal of every singleton accessor are deferred. Composition-critical paths must receive explicit dependencies now; unrelated internals may keep existing accessors until their own refactor, but new code may not add more global lookups.

## Terminology

- **Application project:** One developer source tree used by the devkit.
- **Package root:** The current importable container with `applications/`.
- **Application bundle:** One strict manifest-v4 runnable application under `applications/<localApplicationId>/`.
- **Host:** The outer runtime that selects and presents an application. The two hosts are Studio and standalone.
- **Bootstrap provider:** SDK-owned mechanism that acquires and validates host-specific bootstrap data. It is not the business request transport.
- **Provider wire payload:** Host-specific data exchanged before normalization. Studio uses iframe payload v4; standalone uses a strict root-relative same-origin payload. Application business code never receives either wire shape.
- **Runtime bootstrap:** Host-neutral, minimal application identity and endpoint data consumed by the shared startup coordinator.
- **Application client transport:** Existing HTTP/WebSocket implementation used after bootstrap.
- **Application-platform lifecycle:** Server owner that prepares application/runtime dependencies, performs recovery, reports readiness, and stops application workers.
- **Composition root:** The only place that constructs a concrete server/runtime graph and chooses public route sets.
- **Selected application:** The single standalone bundle resolved from `{packageRoot, localApplicationId}`.
- **Application command facade:** `autobyteus-app`, which owns application-project config, packaging, validation, development orchestration, and the thin `start` delegation. It does not own the server graph.
- **Standalone process API:** `startStandaloneApplicationHost(config)` in `autobyteus-server-ts`, which owns construction/listen/signal-independent close for one standalone server process.

Naming rule: all current application SDK/contract code identifiers use natural unversioned names. Types, functions, constants, validators, and filenames do not carry `V1`, `V4`, `_V1`, `_V4`, or equivalent suffixes. Serialized files/messages continue to carry their existing numeric `manifestVersion`, `contractVersion`, `backendDefinitionContractVersion`, and `frontendSdkContractVersion` values because those are protocol data, not code-symbol names. This clean-cut change renames all in-scope consumers and generated exports; no suffixed aliases remain.

## Design Reading Order

This design proceeds from the two verified coupling points to the host-neutral startup boundary, shared lifecycle, route mounts, concrete file allocation, and staged clean-cut replacement. Package-vNext and marketplace concerns are intentionally absent from the main design.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Remove `startHostedApplication`, every `HostedApplication*`/`StartHostedApplicationOptions` public type, `unsupported_entry`, hosted-only default-screen copy, app/runtime consumers of `iframeLaunchId` and bootstrap `requestContext`, related tests/docs, and generated/vendor copies after all in-tree applications move to the exact `startApplication` context below.
- Required action: Rename every version-suffixed application contract identifier in the touched contracts (`*V1`, `*V4`, `*_V1`, `*_V4`) to its unversioned current-contract name and update SDK, devkit, server, Studio, tests, documentation, and generated outputs. Preserve serialized numeric version fields/values unchanged; do not keep aliases.
- Required action: Replace the current public iframe-contract/mock `dev` behavior with real standalone `dev` and real Studio-connected `dev:studio`; add production `start`. Move any useful mock/iframe-contract host into test fixtures with no public application script or implicit fallback.
- Required action: Remove application route registration from the broad REST/WebSocket index owners after Studio and standalone composition-specific registrars own it.
- Required action: Replace monolithic `buildApp` construction with an explicitly named Studio composition and a standalone composition; update internal callers/tests rather than retaining an alias wrapper. The new compositions must construct the graph in the specified order and may not seed it indirectly by calling route-level singleton accessors.
- Preserved current protocol: Studio iframe messages retain their current on-wire `contractVersion: "4"` value and schema. Code symbols become unversioned. The protocol is not a compatibility fallback and is not exposed as the universal application startup API.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Per-app `db/app.sqlite`, `db/platform.sqlite`, logs/runtime files, plus `applications/_global/db/orchestration.sqlite`; volume is installation-dependent.
- Relevant code-model, serialization, semantic, or physical-store change: None. The same storage layout, stores, migration ledger, bindings, events, and recovery services remain authoritative.
- Normal reader/writer behavior and representative evidence: `ApplicationStorageLifecycleService` prepares the two per-app databases; the worker receives only app storage context; orchestration stores own reserved platform state. See application storage/orchestration docs in investigation notes.
- Required semantics and invariants under direct use: Studio canonical application identity and storage root remain unchanged. Standalone uses a separate data root and a stable current-format canonical identity derived from package ID `standalone` plus the configured local application ID. Standalone recovery activates only `persistedKnownApplicationIds ∩ {selection.applicationId}`; dormant state for another previously selected local application is preserved but is never recovered or exposed.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Standalone and Studio installations do not silently share live databases. Copy/import of business data is a separate future feature.
- Decision: `Directly Usable — No Migration`
- Decision rationale: All current readers/writers and persisted schemas remain unchanged. Rewriting databases would provide no semantic benefit and would add corruption, I/O, recovery, and rollout risk.
- Acceptance criteria or design constraints supported: AC-006 and AC-012.

No migration plan is required.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002 | Studio route entry | Business UI mounted with shared application client | `ApplicationStartupCoordinator` plus Studio host lifecycle | Preserves current host while removing app-level iframe coupling |
| DS-002 | Primary End-to-End | BEH-001, BEH-002, BEH-003 | Standalone process/root request | Business UI mounted at `/` with same application client | `StandaloneApplicationHost` plus `ApplicationStartupCoordinator` | Proves same bundle through second host |
| DS-003 | Primary End-to-End | BEH-004, BEH-007 | Frontend backend operation | Application worker handler result | `ApplicationBackendApiGatewayService` | Ensures hosts share one backend path |
| DS-004 | Return-Event | BEH-004, BEH-007 | App backend starts agent/team | Runtime events/artifacts/notifications reach app | `ApplicationOrchestrationHostService` and existing event/artifact owners | Proves real runtime equivalence, not only static hosting |
| DS-005 | Bounded Local | BEH-003, BEH-005, BEH-007 | Server composition start | Application platform ready/stopped | `ApplicationPlatformLifecycle` | Makes lifecycle reusable and deterministic across hosts |
| DS-006 | Operational Development | BEH-006 | `pnpm dev` or `pnpm dev:studio` in an application project | Project-specific inputs resolve through one devkit pack owner and the real standalone or Studio session remains ready across supported source rebuilds | Devkit config/pack and development-session owners delegating to real host owners | Gives developers the native real-host workflow, supports maintained non-default layouts, and removes ambiguous mock/custom-builder defaults |
| DS-007 | Operational Portability | BEH-001, BEH-003, BEH-006 | Application source/package command | The same unchanged package digest completes both real host scenarios | Dual-host conformance command/harness over the devkit package owner | Makes “build once, use twice” a verifiable production/deployment invariant rather than a narrative claim |
| DS-008 | Secondary End-to-End | BEH-001, BEH-003, BEH-005 | Standalone browser root/asset/navigation request | Selected application UI starts without platform-path collision or unsafe fallback | `StandaloneApplicationHost` static-route owner | Carries AC-009 through root, relative assets, SPA navigation, and reserved platform routes |
| DS-009 | Secondary End-to-End | BEH-001, BEH-002 | Studio reload/exit/route-leave action | Fresh iframe launch or restored Studio shell with route-visit launch state cleared | `ApplicationShell` presentation owner plus `applicationHostStore` launch-state owner | Preserves the complete current Studio presentation lifecycle, not only initial mount |
| DS-010 | Operational Production | BEH-001, BEH-003, BEH-005, BEH-006, BEH-007 | `pnpm build`/`pnpm validate` followed by `pnpm start` | Existing validated package is running through the production standalone process with separate durable data and graceful stop | Devkit `start` facade plus `startStandaloneApplicationHost`/standalone composition | Makes “after build, run standalone” an explicit production path rather than an assumed use of development mode |

## Primary Execution Spine(s)

### DS-001 — Studio application startup

`Studio route/setup -> ensure backend ready -> iframe launch hints -> StudioIframeBootstrapProvider -> iframe v4 ready/bootstrap -> ApplicationRuntimeBootstrap normalization -> ApplicationStartupCoordinator -> ApplicationClient -> business mount`

### DS-002 — Standalone application startup

`Standalone composition -> configured bundle selection -> root UI asset -> StandaloneSameOriginBootstrapProvider -> GET /_autobyteus/bootstrap -> StandaloneApplicationBootstrapPayload validation -> same-origin endpoint normalization -> ApplicationRuntimeBootstrap -> ApplicationStartupCoordinator -> ApplicationClient -> business mount`

### DS-003 — Shared backend invocation

`ApplicationClient -> host-specific endpoint mount -> application backend route handler -> ApplicationBackendApiGatewayService -> ApplicationEngineHostService -> worker ApplicationBackendHost -> handler result -> ApplicationClient`

### DS-007 — Build once, consume through two hosts

`Application source -> devkit package assembly -> current manifest-v4/package validation -> content digest + frontend/backend entry digests -> unchanged read-only package input -> Studio import/selection and standalone configured selection -> current bundle parser in each host -> DS-001 and DS-002 real-host results -> pre/post digest equality`

### DS-008 — Standalone root, assets, and navigation

`Browser GET / -> selected UI root resolver -> decoded/real-path confinement + reserved-prefix exclusion -> entry HTML -> relative asset request or eligible document navigation -> exact asset or SPA entry fallback -> application frontend -> DS-002 startup`

### DS-009 — Studio presentation lifecycle

- Post-entry setup save: `Setup save -> current resource configuration owner -> applicationHostStore launch identity unchanged -> current iframe remains mounted -> explicit Reload action required for a fresh document`
- Reload: `Reload application action -> ApplicationShell -> applicationHostStore.startLaunch -> fresh launch generation/iframeLaunchId -> ApplicationSurface keyed iframe replacement -> new Studio provider bootstrap -> business UI remount`
- Exit/route leave: `Exit or route-leave action -> ApplicationShell cleanupRouteVisit -> applicationHostStore.clearLaunchState -> ApplicationSurface/document teardown -> pagehide startup-handle disposal + browser-scoped socket close -> standard Studio shell presentation`
- Preserved invariant: presentation reload/exit does not itself create an agent/team run and does not introduce a second worker-lifecycle owner.

### DS-006 — Native development commands

- Standalone: `Application project -> pnpm dev -> autobyteus-app dev --host standalone -> load checked-in devkit config -> resolve exact source/resource inputs -> initial pack/validation into .autobyteus/dev/package -> startStandaloneApplicationHost with .autobyteus/dev/data -> DS-002/DS-003 real runtime -> resolved-input/config watch -> stop current host -> atomic repack -> restart same real host -> browser full reload`
- Studio: `Application project -> pnpm dev:studio -> autobyteus-app dev --host studio -> load the same checked-in devkit config -> pack/validation to configured dist/importable-package -> current Studio local-path import/reload API -> current Studio setup/iframe path -> DS-001/DS-003 -> resolved-input/config watch -> repack + package reload -> developer uses Studio's existing explicit Reload application action -> DS-009 fresh iframe presentation`
- Development data survives a watcher restart but remains separate from production data. The first slice requires reliable full reload/restart, not framework-specific HMR.
- No missing URL, missing host, or failed real-host connection selects a mock. Failures terminate or remain visibly failed with actionable diagnostics.
- `build`, `dev`, and `dev:studio` call `packApplicationProject` directly. A project configuration describes inputs; it is not an executable build-hook interface and cannot call a project script, CLI command, or another pack. `start` remains build-free over `dist/importable-package`.

#### Maintained Brief Studio / Socratic package-input mapping

Both maintained applications use the same exact mapping because their source layouts and backend exposure contracts are identical. Each adds `autobyteus-app.config.mjs`:

```js
/** @type {import('@autobyteus/application-devkit').ApplicationDevkitConfig} */
export default {
  source: {
    frontendDir: "frontend-src",
    backendDir: "backend-src",
    agentsDir: "agents",
    agentTeamsDir: "agent-teams",
  },
  output: {
    packageRoot: "dist/importable-package",
  },
  frontend: {
    entryPoint: "app.js",
    entryHtml: "index.html",
  },
  backend: {
    entryPoint: "index.ts",
    targetRuntimeSemver: ">=22 <23",
    supportedExposures: {
      queries: false,
      commands: false,
      routes: false,
      graphql: true,
      notifications: true,
      eventHandlers: true,
      webSockets: false,
    },
    migrationsDir: "migrations",
    assetsDir: "assets",
  },
};
```

`agentsDir: "agents"` and `assetsDir: "assets"` intentionally name optional directories; the current copier omits their bundle fields/output when the directories do not exist. Root `agent-teams`, backend migrations, and every exposure flag are explicit. Each current `ui/icon.svg` becomes the source-owned `frontend-src/icon.svg` so the frontend builder copies the manifest-referenced icon. Each `frontend-src/app.js` imports `startApplication` from `@autobyteus/application-frontend-sdk`; esbuild bundles that dependency, so no source or output imports `./vendor/application-frontend-sdk.js`.

Each maintained `package.json` maps `build` directly to `autobyteus-app pack`, adds the devkit workspace dependency, and exposes the five approved scripts. `scripts/build-package.mjs` is deleted, not wrapped. Source-root generated `ui/` and `backend/` mirrors and their local vendor trees are deleted; `dist/importable-package` is regenerated only by the devkit pack owner. `api/graphql/schema.graphql` and `tsconfig.backend.json` may remain source documentation/typecheck inputs, but neither is a runtime package input unless a future explicit devkit resource field is designed.

The watch set is derived after config resolution: `application.json`, `autobyteus-app.config.mjs`, the existing configured frontend/backend/agents/team directories, and pack-owner/config implementation changes. Generated `dist/**`, `.autobyteus/**`, source-root legacy `ui/**`/`backend/**`, and absent optional directories are not watched. A disposable current-devkit probe using this exact mapping packed and validated both maintained apps with their icons, teams, migrations, and exposure manifests; it validates the chosen input seam, not the not-yet-implemented host commands.

### DS-010 — Build, validate, and production standalone start

`Application project -> pnpm build -> autobyteus-app pack -> dist/importable-package + current validator -> optional pnpm validate -> pnpm start -> autobyteus-app start -> resolve package root + source-manifest local ID + app-data/host/port config -> validate existing package without rebuilding -> startStandaloneApplicationHost -> buildStandaloneApplicationServerComposition -> DS-005 readiness/listen -> DS-008 root -> DS-002 bootstrap/business mount -> signal -> DS-005 graceful stop`

The command facade derives `localApplicationId` from the project's source `application.json` and passes it explicitly to selection. The standalone selection service still never scans a multi-application package and silently chooses the first entry.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Studio performs its existing setup and iframe correlation. The SDK's Studio provider owns that wire exchange, drops iframe-only correlation fields after validation, and returns the same runtime bootstrap used by standalone. | Studio launch, bootstrap provider, runtime bootstrap, application client | `ApplicationStartupCoordinator` governs SDK startup; Studio retains host launch ownership | Origin/correlation validation, startup screen, disposal/timeouts |
| DS-002 | Standalone resolves one bundle before listening, serves its entry at `/`, and exposes a same-origin bootstrap endpoint. The provider validates the root-relative standalone wire payload, resolves endpoint URLs from the browser-visible origin, and hands one absolute-endpoint runtime bootstrap to the same coordinator. | Host config, selected bundle, root asset, provider wire, runtime bootstrap, application client | `StandaloneApplicationHost` governs selected-app presentation; provider owns wire normalization; startup coordinator governs frontend mount | Readiness, endpoint-path validation, origin policy |
| DS-003 | Both route mounts adapt their URL shape to one explicit application ID and delegate to the existing gateway and worker. Neither host imports backend business code. | Backend request, application ID, gateway, worker handler | `ApplicationBackendApiGatewayService` | Body/header normalization, error mapping, request limits |
| DS-004 | Backend context capability calls reach the existing orchestration owner, which resolves resources, starts real runtimes, persists bindings, and returns lifecycle/artifact output through existing channels. | Resource ref, binding, run, event, artifact, notification | `ApplicationOrchestrationHostService` and existing dispatch/relay owners | At-least-once idempotency, recovery gate, tool/runtime availability |
| DS-005 | Each composition constructs an explicit graph, starts required shared application/runtime facilities, reconciles only its catalog, marks readiness, and stops workers/listeners in reverse order. | Runtime graph, catalog, readiness, recovery, worker set | `ApplicationPlatformLifecycle` | Logging, failure classification, shutdown timeout, background extras |
| DS-006 | Devkit first resolves the project's declarative source/resource mapping, then owns two real development sessions: default standalone watch/repack/restart/browser reload and explicit Studio local-package watch/reload. Both call the same pack owner and delegate runtime work to real host owners; custom builders and mock infrastructure are not product paths. | Application project config, resolved inputs, generated dev package, host session, rebuild result | Devkit config/pack and development-session owners; standalone/Studio remain host authorities | Watch coalescing, atomic output swap, process cleanup, ports, logs, browser reload |
| DS-007 | One conformance invocation packages once, freezes digest evidence, supplies the unchanged output to both host consumers, and rejects any runtime package mutation or host-specific rebuild. | Application source, validated package, digest evidence, two host consumers | Dual-host conformance harness over the existing devkit pack owner | Temporary paths, deterministic exclusions, process cleanup |
| DS-008 | Standalone resolves only files under the selected `ui/`, excludes the platform namespace before fallback, and permits entry fallback only for eligible HTML navigation. | Root request, selected UI root, asset/navigation request, business entry | `StandaloneApplicationHost` static-route owner | Decode/realpath checks, content types, cache behavior |
| DS-009 | Post-entry setup saves preserve the current route-visit launch until explicit reload; reload creates a fresh launch/iframe document; exit/route leave clears launch state, tears down the document, and restores normal presentation while server runtime ownership remains unchanged. | Studio action, resource setup, route-visit launch, iframe document, Studio shell | `ApplicationShell` governs presentation; `applicationHostStore` governs launch identity/state | Pending launch cancellation, page teardown, socket close, no implicit run creation |
| DS-010 | The production facade accepts only an existing package, validates it, derives the explicit local ID from source config, normalizes host/data configuration, and delegates one process to the real standalone API. Build/watch/mock behavior is absent. | Validated package, explicit selection, standalone process, durable data root | Devkit `start` facade governs project/config translation; server standalone API governs runtime/process | Missing build diagnostics, loopback/port config, signal forwarding, exit code |

## Spine Actors / Main-Line Nodes

- `startApplication` — thin public SDK entry.
- `ApplicationStartupCoordinator` — owns frontend startup state, provider selection result, shared client construction, business callback, failure containment, and disposal.
- `StudioIframeBootstrapProvider` — owns current iframe v4 hints, ready emission, parent/origin/correlation validation, and normalization.
- `StandaloneSameOriginBootstrapProvider` — owns top-level same-origin wire fetch/validation, root-relative path confinement, browser-origin HTTP/WS resolution, and runtime-bootstrap normalization.
- `StandaloneApplicationHost` — owns one configured application, root UI presentation, selected-app root-relative platform paths, network policy, and reserved platform namespace.
- `ApplicationProjectCommandService` — owns application-project config/source-manifest resolution and delegates pack, validate, development session, or production host start without becoming a runtime container.
- `StandaloneDevelopmentSession` / `StudioDevelopmentSession` — own watch/coalescing/rebuild and host-specific development-session cleanup; they do not implement server or Studio lifecycle.
- `startStandaloneApplicationHost` — narrow server-owned process API used by devkit `dev` and `start`; it constructs exactly one standalone composition and returns its address/close handle.
- `ApplicationPlatformLifecycle` — owns application/runtime preparation, readiness, recovery, and shutdown sequencing.
- `ApplicationBackendApiGatewayService` — continues to own backend exposure and invocation.
- `ApplicationEngineHostService` — continues to own worker lifecycle.
- `ApplicationOrchestrationHostService` — continues to own app-scoped runtime work.

## Ownership Map

- **ApplicationStartupCoordinator:** the governing frontend startup owner. It must not implement provider wire protocols itself.
- **Bootstrap providers:** each owns one acquisition protocol and returns the same strict runtime bootstrap. They must not mount business UI or invoke backend operations.
- **StandaloneApplicationHost:** governs selected-app presentation and endpoint mounting. It must not become a second application engine or orchestration service.
- **Devkit command services:** govern project-relative config, package lifecycle commands, development watching, and translation into a standalone host config. They must not import managers beneath the standalone process API or duplicate Studio/server behavior.
- **Standalone process API:** governs construction, listen, and close for one standalone composition. Signal registration stays in CLI/process facades so tests and development restart can close the handle directly.
- **Composition roots:** construct exact dependencies and choose public surfaces. They are construction owners, not runtime service locators.
- **ApplicationPlatformLifecycle:** governs start/readiness/recovery/stop sequencing. It does not register HTTP routes.
- **Gateway/engine/orchestration:** retain their current subject authority. Host adapters cannot bypass them.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `startApplication(options)` | `ApplicationStartupCoordinator` | Stable public SDK call | Provider protocol details or app business state |
| Studio server main | `buildStudioServerComposition` + lifecycle | CLI/process boundary | Standalone branches |
| Standalone host main | `buildStandaloneApplicationServerComposition` + `StandaloneApplicationHost` | CLI/process boundary | Package parsing, worker implementation, orchestration |
| REST/WebSocket registrars | Gateway/communication services | Bind Fastify paths to exact service calls | Business policy or runtime lifecycle |
| `autobyteus-app dev` / `dev --host studio` | Host-specific dev session services | Stable application-folder development commands | Mock fallback, server graph, Studio package-registry internals |
| `autobyteus-app start` | `startStandaloneApplicationHost` | Resolve project defaults and delegate the existing package to production standalone | Build/watch/mock behavior or runtime managers |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-application-frontend-sdk/src/hosted-application-startup.ts` | Encodes one host as the universal app entry | `src/application-startup/application-startup-coordinator.ts` plus providers | In This Change | Delete exports/types/tests after migrations |
| Version-suffixed application contract symbols/files (`*V1`, `*V4`, `*_V1`, `*_V4`, iframe contract doc filename) | Current code has one accepted version of each contract and the suffixes add symbol noise | Unversioned current-contract names in the exact naming inventory; numeric version fields remain serialized data | In This Change | Clean rename across contracts, SDK, devkit, server, Studio, tests/docs, dist/vendor/importable outputs; no aliases |
| `startHostedApplication` imports in both sample apps and starter template | Old app-facing contract | Package import of `startApplication` | In This Change | Starter and sample sources migrate; devkit/esbuild bundles the SDK into generated package output |
| `applications/{brief-studio,socratic-math-teacher}/scripts/build-package.mjs` | Duplicates frontend/backend/resource/package assembly and creates a second build authority | Checked-in `autobyteus-app.config.mjs` plus shared `packApplicationProject` | In This Change | Delete, do not wrap or expose as a devkit hook |
| `applications/{brief-studio,socratic-math-teacher}/{ui,backend}/**` including local SDK vendor trees | Generated source-root mirrors are not inputs to the canonical devkit pack and can drift from source/package output | `frontend-src`/`backend-src`/root resources as source; `dist/importable-package` as sole generated runtime package | In This Change | Move each icon into `frontend-src` first; regenerate `dist` and update tests/docs that referenced vendor files |
| Public iframe-contract host and mock backend as implicit `autobyteus-app dev` default | Produces misleading portability signal | Real standalone `dev`; real Studio `dev:studio`; mock/iframe helpers retained only under test fixtures if still useful | In This Change | No public `dev:contract` requirement and no endpoint-absence fallback |
| Application route registration inside broad REST/WS indices | Prevents host-specific public surfaces | Studio and standalone application ingress registrars | In This Change | Unrelated Studio routes stay in Studio registries |
| Monolithic `buildApp` construction as the only composition | Cannot express selected-app surface | `buildStudioServerComposition` and `buildStandaloneApplicationServerComposition` | In This Change | Update callers/tests; no alias wrapper |
| New composition-path global singleton lookups | Hide which graph a host uses | Explicit constructor/registrar dependencies | In This Change | Existing unrelated internals may be follow-up |
| Physical server-package minimization | Not needed to prove composition | Proven composition followed by distribution optimization | Follow-up | Do not fork/copy code |

## Return Or Event Spine(s) (If Applicable)

### DS-004 — Runtime return/event flow

`Application backend context call -> ApplicationOrchestrationHostService -> AgentRunManager/team runtime -> durable binding + global lookup -> lifecycle event journal -> application event handler -> backend notification and/or published artifact -> frontend subscriptions/reconciliation`

The host type is not present in this spine. That absence is an invariant: Studio and standalone differ only before the shared client ingress and at endpoint mounting.

## Bounded Local / Internal Spines (If Applicable)

### DS-005 — Application platform lifecycle

- Parent owner: `ApplicationPlatformLifecycle`
- Chain: `constructed -> preparing_runtime -> catalog_ready -> waiting_for_listener -> recovering -> ready -> stopping -> stopped` or `failed`.
- Public phase methods: `prepareBeforeListen()`, `recoverAfterListen()`, `awaitReady()`, and `stop()`; concurrent calls to the same phase share one promise, invalid phase order throws, and stop is idempotent.
- Why the listener split is explicit: current recovery runs after Fastify listens and may rely on the configured internal endpoint. The composition owns `app.listen`; the lifecycle owns every named preparation/recovery collaborator on either side of it. No callback array or `requiredStartupTasks` bag exists.
- Ingress rule: application bootstrap/backend/orchestration routes await `awaitReady()`. Static startup UI and health may report a non-ready state but cannot bypass recovery.

### DS-001/DS-002 — Frontend startup state

- Parent owner: `ApplicationStartupCoordinator`
- Chain: `resolving_provider -> acquiring_bootstrap -> starting_application -> handoff_complete` or `startup_failed`; `disposed` is terminal and aborts provider effects/listeners.
- `unsupported_entry` and `waiting_for_bootstrap` are removed from the public state union. A valid top-level document is now a supported standalone candidate; a malformed iframe context fails rather than falling through.
- Why it matters: provider-specific asynchronous behavior must not duplicate UI state or call the business mount more than once.

## Exact Frontend Startup API And Migration Inventory

The clean-cut public API is:

```ts
export type ApplicationRootElement = HTMLElement;

export type ApplicationBootstrappedContext = {
  runtimeBootstrap: ApplicationRuntimeBootstrap;
  applicationClient: ApplicationClient;
  rootElement: ApplicationRootElement;
};

export type StartApplicationOptions = {
  rootElement: ApplicationRootElement | null | undefined;
  onBootstrapped: (context: ApplicationBootstrappedContext) => void | Promise<void>;
};

export type ApplicationStartupState =
  | "resolving_provider"
  | "acquiring_bootstrap"
  | "starting_application"
  | "handoff_complete"
  | "startup_failed"
  | "disposed";

export type ApplicationStartupHandle = {
  dispose: () => void;
  getState: () => ApplicationStartupState;
};

export declare function startApplication(
  options: StartApplicationOptions,
): ApplicationStartupHandle;
```

Provider resolver/browser objects are injected only into coordinator/provider unit construction and are not public `StartApplicationOptions`. `runtimeBootstrap` is the normalized `ApplicationRuntimeBootstrap` shape, never the provider-local `ApplicationBootstrapPayload`. It intentionally exposes host-neutral identity and endpoints for diagnostics while excluding `iframeLaunchId`, host origin, and duplicated `requestContext`. `ApplicationClient` continues to create `{applicationId}` request context internally.

The application entry retains the returned startup handle and calls `dispose()` from one `pagehide` listener. Disposal is idempotent and owns pending provider listeners/fetches plus startup rendering only; after handoff, application-created subscription/connection handles remain business-UI owned and browser document teardown closes remaining browser sockets. This makes Studio reload/exit and standalone page reload use the same host-neutral document-lifetime rule.

The standalone fetch also has a distinct provider-wire shape, `StandaloneApplicationBootstrapPayload`. Its `contractVersion: "1"` field versions the serialized protocol without leaking that version into the domain type name. Its transport fields are strict root-relative `/_autobyteus/*` paths. `StandaloneSameOriginBootstrapProvider` resolves them against `window.location.origin` and returns an `ApplicationRuntimeBootstrap` whose transport fields are always absolute ready-to-use HTTP/WS URLs. The shared runtime type never accepts ambiguous “absolute or relative” endpoint semantics.

| Current source/derived consumer | Target action | Host-neutral replacement / owner |
| --- | --- | --- |
| `autobyteus-application-frontend-sdk/src/hosted-application-startup.ts` | Delete after logic is split | Coordinator + provider files; callback uses `runtimeBootstrap` |
| `src/default-startup-screen.ts`, `src/index.ts` | Rename hosted types/copy/exports; move screen under `application-startup/` | Generic resolving/acquiring/starting/failure copy; no “open from host” unsupported state |
| SDK startup unit/type tests, `tsconfig.type-tests.json`, `package.json` test paths, and SDK README | Replace names/scenarios | Provider/coordinator tests cover Studio wait, standalone fetch, strict failure, disposal, and exact public types |
| `applications/brief-studio/frontend-src/app.js` | Import the package SDK, use `startApplication`; pass `runtimeBootstrap`; dispose startup handle on `pagehide` | `ApplicationBootstrappedContext`, host-neutral document lifetime, and devkit/esbuild package bundling rather than a local vendor import |
| `applications/brief-studio/frontend-src/brief-studio-runtime.js` | Rename `bootstrap` input; delete iframe-launch logging and “hosted GraphQL” copy | Log canonical `runtimeBootstrap.application.applicationId`; say “application GraphQL backend” |
| `applications/socratic-math-teacher/frontend-src/app.js` and `socratic-runtime.js` | Import the package SDK, use `startApplication`; store `runtimeBootstrap`; app entry disposes startup handle on `pagehide` | Host-neutral runtime identity/endpoints, document lifetime, and devkit/esbuild package bundling |
| `applications/socratic-math-teacher/frontend-src/socratic-renderer.js` | Replace “hosted context” and Launch/iframe/request-context diagnostics | “Runtime” panel shows `contractVersion` and canonical application ID; endpoint diagnostics remain runtime transport fields |
| Both sample READMEs | Remove `startHostedApplication`/hosted-only claims | Document one startup API and two providers |
| `autobyteus-application-devkit/templates/basic/src/frontend/app.ts` and template copy | Use `startApplication`; bind startup-handle disposal to `pagehide` | “Business UI begins after runtime bootstrap”; same document lifetime in both hosts |
| `autobyteus-application-devkit/README.md`, root custom-app guide | Replace app-facing iframe contract instructions | One app API; exact `dev`, `dev:studio`, `build`, `validate`, `start` meanings; mocks are test-only |
| Devkit `dev-host-page.ts` / `dev-bootstrap-server.ts` | Remove from public `dev`; retain/move only the minimum useful iframe v4 fixture under tests | These are test/provider wires, not application callback fields or a product development host |
| `autobyteus-application-frontend-sdk/dist/**` | Regenerate; old hosted startup outputs disappear | SDK build owner |
| `applications/{brief-studio,socratic-math-teacher}/ui/**` and `backend/**` | Delete source-root generated mirrors and local SDK vendor trees; move each icon to `frontend-src/icon.svg` before deletion | Devkit pack consumes source directly and produces the sole runtime package output |
| `applications/{brief-studio,socratic-math-teacher}/dist/importable-package/**` | Regenerate package output directly from configured source/resource inputs | Shared devkit `packApplicationProject` owner |

The current application-contract symbol rename is clean-cut:

| Current identifier | Target identifier |
| --- | --- |
| `APPLICATION_MANIFEST_VERSION_V4` | `APPLICATION_MANIFEST_VERSION` |
| `ApplicationManifestV4` | `ApplicationManifest` |
| `APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION_V1` | `APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION` |
| `ApplicationBackendBundleManifestV1` | `ApplicationBackendBundleManifest` |
| `APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V4` | `APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION` |
| `APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V4` | `APPLICATION_FRONTEND_SDK_CONTRACT_VERSION` |
| `APPLICATION_IFRAME_CONTRACT_VERSION_V4` | `APPLICATION_IFRAME_CONTRACT_VERSION` |
| `ApplicationIframeEnvelopeV4` | `ApplicationIframeEnvelope` |
| `ApplicationUiReadyPayloadV4` | `ApplicationUiReadyPayload` |
| `ApplicationUiReadyEnvelopeV4` | `ApplicationUiReadyEnvelope` |
| `ApplicationBootstrapPayloadV4` | `ApplicationBootstrapPayload` |
| `ApplicationHostBootstrapEnvelopeV4` | `ApplicationHostBootstrapEnvelope` |
| `isApplicationIframeEnvelopeV4` | `isApplicationIframeEnvelope` |
| `isApplicationUiReadyPayloadV4` | `isApplicationUiReadyPayload` |
| `isApplicationUiReadyEnvelopeV4` | `isApplicationUiReadyEnvelope` |
| `isApplicationBootstrapPayloadV4` | `isApplicationBootstrapPayload` |
| `isApplicationHostBootstrapEnvelopeV4` | `isApplicationHostBootstrapEnvelope` |
| `createApplicationUiReadyEnvelopeV4` | `createApplicationUiReadyEnvelope` |
| `createApplicationHostBootstrapEnvelopeV4` | `createApplicationHostBootstrapEnvelope` |
| `normalizeStudioIframeBootstrapV4` | `normalizeStudioIframeBootstrap` |

This inventory applies to source imports, tests, README/API examples, `autobyteus-web/docs/application-bundle-iframe-contract-v4.md` (renamed without the suffix), SDK `dist`, and regenerated importable package outputs. Obsolete sample vendor copies are deleted with the source-root generated mirrors rather than regenerated. Serialized fields still contain their current values (`"4"` for the Studio iframe and current manifest/definition contracts, `"1"` for the backend bundle contract). No suffixed aliases or duplicate validators remain.

The checked-in iframe contract remains available in contract/vendor output under unversioned code names because the Studio provider still consumes that wire. What disappears is both the application-facing hosted startup contract and every version suffix from current application-contract code identifiers.

## Named Startup / Readiness Allocation

The two compositions use the same lifecycle collaborators but may make different process-level decisions after a failure. “Fatal” means the named phase rejects and lifecycle state becomes `failed`; Studio and standalone do not report application readiness. Standalone closes/exits non-zero. Studio also fails process startup for required pre-listen work; only rows explicitly marked degraded/background preserve current noncritical behavior.

| Order / Capability | Current owner and observed behavior | Studio target | Standalone target | Await / failure classification | Stop responsibility |
| --- | --- | --- | --- | --- | --- |
| P0 App-data and host configuration | `AppConfigProvider`; current `AppConfig.initialize()` requires `<appDataDir>/.env` and an `AUTOBYTEUS_SERVER_HOST` value | `AppConfigProvider.initialize()` current root; pass returned `AppConfig` explicitly into graph | Validate `{packageRoot, localApplicationId, appDataDir, host, port, publicBaseUrl?}`; default host to `127.0.0.1`. `StandaloneHostConfigMaterializer` creates the data directory and an empty/non-secret `.env` only when absent, never overwrites it, and supplies derived loopback `AUTOBYTEUS_SERVER_HOST` or the explicit non-loopback `publicBaseUrl` through process/config input. Initialize `AppConfigProvider` before any accessor and pass the same instance into graph | Awaited initialization; unwritable root, invalid/missing non-loopback public base, or invalid config fatal. Non-loopback bind is trusted-network operation, not authentication/public-internet support | None; config immutable for process lifetime; materializer never writes credentials or package files |
| P1 Runtime logging | `initializeRuntimeLoggerBootstrap` / `initializeServerAppLogger` before migrations | Required | Required using configured standalone log root | Synchronous/awaited; fatal both | Logger flush remains process owner |
| P2 Core database migrations | `runMigrations({appRoot,databaseUrl})`; current fatal | Required with exact `AppConfig.getOperationalDatabaseUrl()` | Same against isolated standalone data root | Awaited; fatal both | None |
| P2A Operational database runtime + protected paths | Refreshed base resolves `ApplicationDatabaseLocation`, calls `configureFileToolDeniedPaths` for DB/root-key/WAL/SHM/journal, then `initializePrisma({datasourceUrl})` | Required before any repository-backed service | Same exact location from standalone `AppConfig` | Awaited; path registration or Prisma initialization failure fatal both | Composition calls `shutdownPrisma()` after all repository consumers stop |
| P2B Secret-vault bootstrap | Refreshed base calls `getSecretVaultRuntime().initialize(databaseLocation)`; LLM/media/search configuration reads the resulting service | Required after P2A and before app-data migrations, built-ins, definitions, tools, or model/runtime readiness | Same; this is provider-secret runtime configuration, not login/user auth | Awaited; bootstrap/verification failure fatal both and must be caught with a startup diagnostic rather than becoming an unhandled rejection | Composition closes the vault after application/runtime/event consumers stop and before Prisma shutdown |
| P3 App-data migrations | `AppDataMigrationRunner.runPending()` returns statuses and current caller logs outer failure | Required scan; preserve `FAILED`/warning result as degraded log and continue Studio, matching current noncritical policy | Required scan on isolated root; any startup-required `FAILED`/stale `RUNNING` result is fatal | Awaited; Studio degraded, standalone fatal | None |
| P4 Workspace runtime registration and temp workspace | `loadWorkspaces()` background; `WorkspaceManager.getOrCreateTempWorkspace()` later fatal | Required before app readiness | Required before app readiness | Awaited; fatal both | Workspace manager is process-scoped; no application lifecycle close |
| P5 Agent customization processors | `loadAgentCustomizations()` background | Required because real native runs use these registries | Required | Awaited idempotent registration; fatal both | Registries process-scoped; no stop |
| P6 Built-in agent tool groups | `loadAllAgentTools()` registers six groups in background and swallows missing/failure; refreshed `buildApp()` separately calls `registerProvisionedSearchTool()` | Replace with `AgentToolRegistryReadiness.registerRequiredGroups()` returning one result for each current group (`Skills Tools`, `Browser Tools`, `Task Delegation Tools`, `Agent Communication Tools`, `Published Artifact Tools`, `Media Tools`, `Search Tools`); all seven are explicitly registered once, and Search registration receives the prepared vault-backed provisioning service | Same strict owner and seven groups | Awaited; missing export/module/registration failure rejects with aggregate diagnostics; fatal both | Registries process-scoped; no stop |
| P7 Package/catalog snapshot | Current package registry + `ApplicationBundleService.getCatalogSnapshot()` after listen | Studio package-registry snapshot + explicit bundle provider; invalid installed apps remain catalog diagnostics/quarantined instead of failing unrelated apps | Immutable configured package snapshot containing package ID `standalone`, delegated through current file bundle provider and filtered selection | Awaited before listen; infrastructure/snapshot failure fatal both. Studio per-app diagnostics are preserved; a diagnostic for the standalone selected app is fatal | Cache owned by graph, discarded on process stop |
| P8 Built-in agent bootstrap | `bootstrapBuiltInAgents()` currently pre-listen; thrown error is fatal while unresolved definitions are reported as warnings | Required with explicit config/definition services | Required against isolated root | Awaited; thrown failure fatal both. Unresolved optional built-ins remain diagnostic unless P9 proves the selected/catalog resource depends on one | None |
| P9 Definition, selected-resource, and runtime-adapter readiness | Definition caches are lazy/background; runtime availability is queried ad hoc | `ApplicationDefinitionRuntimeReadiness` refreshes explicit agent/team providers, verifies every active catalog-owned definition, resolves its named tool/skill references against the prepared registries, and verifies runtime factory mappings; Studio retains its setup gate for missing required resource selection/model input, while an unavailable external runtime remains a per-app setup/availability signal rather than a whole-Studio failure | Same definition/runtime checks restricted to the selected application. Every required slot must resolve from existing data-root configuration or a manifest default; every selected resource tool/skill and configured/default runtime must be available. Brief uses its bundled-team default. A missing required selection produces `APPLICATION_SETUP_REQUIRED` with slot diagnostics and standalone does not report ready or silently choose | Awaited; fatal for invalid/missing selected definitions, required tool groups, runtime factory mapping, or standalone selected-runtime/setup absence. Standalone closes/exits non-zero with the diagnostic; Studio isolates per-app setup/availability through its existing gate | No stop; providers/caches graph-owned |
| L1 Fastify construction/listen | `buildApp` registers every surface then listens | Full Studio surface plus Studio application registrars | Only static/health/bootstrap/selected-app registrars | Await listen; fatal bind error | Composition calls `app.close()` |
| S1 Channel output + callback runtimes | Started immediately after Studio listen | Required Studio-only; current start semantics | Omitted | Await/synchronous as current; failure policy remains existing Studio owner | Studio `onClose` stops both |
| S2 Internal base URL seed | Best-effort after listen for managed messaging | Studio-only best-effort | Omitted | Awaited derivation; degraded log on failure | Clear env value on failed derivation/process exit |
| S3 Managed messaging restore | Best-effort after listen | Studio-only best-effort | Omitted | Awaited; degraded log | Studio `onClose` closes service |
| R1 State inventory | `ApplicationPlatformStateStore.listKnownApplicationIds()` after listen | Explicit Studio data-root store and full catalog | Explicit standalone data-root store; compute recoverable IDs as `persistedKnownApplicationIds ∩ {selection.applicationId}` | Awaited; fatal both. Dormant non-selected records are retained unchanged | Per-operation SQLite handles close immediately |
| R2 Binding recovery + availability reconciliation | Startup gate/recovery/availability global accessors | Graph-local gate/recovery/registry; reconcile full catalog + persisted known IDs | Same instances, but every lookup/recovery/availability input is scoped to the selected canonical ID from R1; never recover a previously selected different app | Awaited in `recoverAfterListen`; fatal both | Run observer owns recovered subscriptions; lifecycle disposes them |
| R3 Pending application event resume | Dispatch global accessor after recovery | Graph-local dispatcher | Same | Awaited initial resume; fatal both. Later retry failures use existing durable backoff semantics | Dispatcher `stop()` clears timers and rejects new schedules |
| B1 Cache preloading | Detached background task with per-cache swallowed errors | Studio-only performance task, explicit best-effort scheduler after ready | Omitted; P9 already performs required reads | Background/degraded | None |
| B2 MCP tool registration | Detached background task | Studio-only best-effort, preserving current unrelated capability | Omitted from first standalone proof/public surface | Background/degraded | Existing MCP owner during Studio shutdown |
| B3 Memory sync worker | Detached background task | Studio-only best-effort | Omitted from standalone proof | Background/degraded | Studio `onClose` calls `stopMemorySyncWorker()` |

`scheduleBackgroundTasks()` is decommissioned as the mixed owner. Required P4–P9 work becomes named lifecycle collaborators; B1–B3 are scheduled explicitly only by the Studio composition, with their best-effort behavior visible at the callsite.

### Application lifecycle stop order

After Fastify stops accepting new ingress, `ApplicationPlatformLifecycle.stop()` runs once in this order: (1) set `stopping`; (2) stop event scheduling and clear retry timers; (3) close application-agent communication sessions; (4) dispose the gateway/custom-WebSocket session service, closing custom sessions and unregistering engine/notification listeners; (5) close notification hub connections; (6) detach recovered run observers without emitting terminal business events; (7) stop all application worker engines and their child supervisors; (8) stop remaining streaming subscriptions; (9) mark `stopped`.

The composition/process handle then closes process-scoped resources in dependency order: Studio alone stops memory sync, channel output, gateway callback, and managed messaging owners; both hosts stop the default agent-run event pipeline, close the secret-vault runtime, and finally call `shutdownPrisma()`. Application platform stores hold no long-lived per-app SQLite connection, while repository Prisma is explicitly process-lived. Each close step runs in `finally`-style nesting so a failure cannot skip later vault/database cleanup. `startStandaloneApplicationHost` returns an idempotent close handle used by development restart and tests; only the CLI main installs SIGINT/SIGTERM handlers. A bounded shutdown timeout is a process concern, and timeout expiry exits non-zero after preserving logs.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Bootstrap validation | DS-001, DS-002 | Bootstrap providers | Strict provider-wire and runtime-bootstrap validation | Prevent malformed/mismatched host data | Coordinator becomes protocol switch blob |
| Static path confinement | DS-008 | Standalone host | Decode once, reject traversal/null/invalid forms, enforce real-path containment under selected `ui/`, and reserve platform prefix | Prevent traversal/symlink escape/collision | Bundle/gateway polluted with host routing |
| SPA fallback policy | DS-008 | Standalone host | Fallback to entry HTML only for eligible HTML document navigation | Supports frontend routers | Backend/API/asset 404s accidentally become HTML |
| Readiness projection | DS-002, DS-005 | Lifecycle/standalone bootstrap | `starting/ready/failed/stopping` with useful detail | Deterministic startup and diagnostics | Root/bootstrap invent duplicate lifecycle state |
| Endpoint derivation | DS-001, DS-002 | Bootstrap providers | Studio normalizes absolute iframe endpoints; standalone validates root-relative platform paths and resolves absolute HTTP/WS URLs from `window.location.origin` | One client works under loopback, LAN hostname, or TLS termination without ambiguous endpoint types | Application code constructs URLs or server returns its bind address |
| Package selection diagnostics | DS-002, DS-005 | Standalone selection owner | Invalid root/missing app/duplicate selection failure | Avoid implicit first-app behavior | Bundle service gains host policy |
| Standalone host-config materialization | DS-006, DS-010 | Devkit command/config owner | Create only a missing empty/non-secret data-root `.env`, supply derived runtime values, preserve existing config | Current `AppConfig` requires a file but the native command must work with a new data root | Server runtime writes project/package config or the command overwrites operator state |
| Startup logging | DS-005, DS-006 | Composition/CLI | Mode, selected local ID, canonical ID, data root, bound address | Operability | Business services log deployment policy |
| Tool/runtime preparation | DS-004, DS-005 | Lifecycle plus existing runtime loaders | Await current required loaders before readiness | Avoid first-run race | App backend compensates for platform readiness |
| Process cleanup | DS-005, DS-006, DS-010 | Lifecycle/composition/CLI | Programmatic close, signal handling, child cleanup, event-pipeline/vault/Prisma stop, timeout | Reliable development restart and standalone exit | Devkit owns worker/database internals or signals are installed below the process facade |
| Content digest evidence | DS-006, DS-007 | Conformance harness | Prove the same read-only package files and entry digests serve both hosts before and after both runs | Supports AC-001 | Runtime mutates the distribution package or performs host-specific rebuilds |

## Ownership Boundaries

1. **Application source -> frontend SDK:** application code provides a root and mount callback only. It has no host imports.
2. **Frontend SDK -> bootstrap provider:** coordinator asks one resolved provider for `ApplicationRuntimeBootstrap`; provider mechanics stay encapsulated.
3. **Host route -> gateway/communication service:** route adapters bind a fixed/multi-app URL shape to an explicit application ID and delegate. They do not interpret business operations.
4. **Gateway -> engine:** gateway validates availability/exposures and delegates worker invocation.
5. **Worker context -> orchestration:** named capabilities remain the only runtime-control path from application backend code.
6. **Composition -> lifecycle/routes:** composition builds exact instances; lifecycle sequences them; route registrars receive only subject-specific dependencies.
7. **Standalone config -> selection:** package root/local ID are validated once into an immutable selected-application descriptor used by root serving/bootstrap/ingress.
8. **Standalone wire -> runtime bootstrap:** the server owns selected identity/root-relative route advertisement; the same-origin provider owns browser-visible origin resolution; application code sees absolute runtime endpoints only.
9. **Package input -> host data root:** package/bundle owners read immutable files; storage, migration, log, status, and orchestration owners write only under the configured data root.
10. **Application command -> standalone process API:** devkit resolves project-relative package/ID/data/network values and invokes one narrow public start boundary. It never reaches composition graph services directly.
11. **Composition -> process resources:** both compositions explicitly complete core migration -> protected operational paths -> Prisma -> vault before app-data/tool/runtime readiness and close the event pipeline/vault/Prisma after application consumers. Process-global access is tolerated only under the one-composition-per-process invariant.

## Exact Composition-Critical Dependency Graph

`createApplicationPlatformRuntimeGraph` is a construction function used only by a composition root. It returns a typed record so the composition can pass exact fields to lifecycle and registrars; no runtime service accepts the whole record.

Construction order and edges are fixed:

1. **Process configuration and persistence prerequisites:** one initialized `AppConfig` -> exact `ApplicationDatabaseLocation` -> core migration -> operational DB/key deny paths -> repository Prisma initialization -> secret-vault initialization. No tool, model/provider service, app-data migration, definition, or runtime readiness runs before this chain succeeds.
2. **Config/catalog:** the same `AppConfig` -> explicit package-registry snapshot provider (Studio registry service or standalone immutable read-only snapshot) -> explicit `FileApplicationBundleProvider` -> one `ApplicationBundleService`.
3. **Storage:** config + bundle service -> `ApplicationStorageLifecycleService` -> `ApplicationPlatformStateStore`; config -> `ApplicationGlobalPlatformStateStore` -> `ApplicationRunLookupStore`; platform-state store -> binding/configuration/event-journal stores.
4. **Definition/runtime foundations:** config + bundle service + prepared vault-backed provider resolution -> explicit file agent/team definition providers -> agent/team definition services; workspace, processor, strict seven-group tool readiness, runtime-availability, agent-run, and team-run collaborators receive those exact instances.
5. **Cycle-break primitives:** create one `ApplicationAvailabilityStateRegistry` exposing separate reader/writer ports; create one `DeferredApplicationEngineEventHandlerPort` that can bind exactly once before readiness. These are semantically narrow construction seams, not locators.
6. **Event/orchestration:** availability reader + event store + deferred engine port -> event dispatcher; dispatcher + journal -> ingress; binding + lookup + ingress + lifecycle hub -> terminal transition and run observer; those plus bundle/platform stores -> recovery. Resolver/configuration/launch/orchestration services receive the same bundle, definition, stores, availability reader, startup gate, run services, and observer instances.
7. **Streaming/engine:** orchestration -> application-agent streaming -> application-agent communication; bundle + storage + orchestration + streaming -> engine host; bind the deferred engine event port to that engine exactly once. Artifact relay uses the same port, avoiding a hidden relay -> global engine cycle.
8. **Availability/gateway:** registry writer + bundle + recovery + dispatcher + engine -> availability coordinator; routes/gateway/orchestration depend only on the registry reader for active checks. Engine + notification hub -> custom-WS session service and gateway. The gateway receives bundle, availability reader, engine, notification hub, and custom-WS service explicitly.
9. **Lifecycle/ingress:** lifecycle receives the named P4–P9 collaborators, catalog/state/recovery/availability/dispatcher, and exact disposable services. Studio/standalone registrars receive only the gateway, notification hub, custom-WS service, agent-communication service, lifecycle readiness, and (standalone only) immutable selected descriptor. Standalone recovery inputs and route identities are filtered to that descriptor before they reach graph owners.

The availability registry removes the current `ApplicationAvailabilityService <-> ApplicationExecutionEventDispatchService` constructor cycle. The single-bind engine event port removes the dispatcher/artifact-relay -> engine -> orchestration/run-manager cycle during construction; calls before bind throw, and lifecycle cannot enter `preparing_runtime` until binding is complete.

```text
AppConfig -> Catalog -> BundleService
    |             |          +-> Definition Services -> Runtime/Run Services
    |             +-> StorageLifecycle -> PlatformState -> per-app stores
    +-> GlobalPlatformState -> RunLookup -------------------------+
AvailabilityRegistry(reader) -> Orchestration -> Streaming ------+-> Engine
EventJournal -> Dispatcher -(DeferredEnginePort bound to Engine)-+
Stores + Observer + Ingress -> Recovery -> AvailabilityCoordinator
Engine + AvailabilityReader + Bundle + Notification + CustomWS -> Gateway
Lifecycle(P4..P9, Recovery, Dispatcher, Disposables) -> readiness/stop
```

### Composition graph output shape

```ts
type ApplicationPlatformRuntimeGraph = Readonly<{
  bundleService: ApplicationBundleService;
  storageLifecycleService: ApplicationStorageLifecycleService;
  platformStateStore: ApplicationPlatformStateStore;
  globalPlatformStateStore: ApplicationGlobalPlatformStateStore;
  runLookupStore: ApplicationRunLookupStore;
  startupGate: ApplicationOrchestrationStartupGate;
  availabilityReader: ApplicationAvailabilityReader;
  availabilityService: ApplicationAvailabilityService;
  recoveryService: ApplicationOrchestrationRecoveryService;
  eventDispatchService: ApplicationExecutionEventDispatchService;
  orchestrationHostService: ApplicationOrchestrationHostService;
  agentStreamingService: ApplicationAgentStreamingService;
  agentCommunicationService: ApplicationAgentCommunicationService;
  engineHostService: ApplicationEngineHostService;
  notificationHub: ApplicationBackendNotificationHub;
  backendWebSocketSessionService: ApplicationBackendWebSocketSessionService;
  backendGateway: ApplicationBackendApiGatewayService;
  lifecycle: ApplicationPlatformLifecycle;
}>;
```

This is a construction result, not a public container. Route registration such as `registerStandaloneApplicationWebSockets` receives only `selection`, `notificationHub`, `backendWebSocketSessionService`, and `agentCommunicationService`.

## Composition-Critical Modify / Retain Inventory

| Current file / accessor | Disposition | Exact target instance and fallback policy | Rationale / shutdown ownership |
| --- | --- | --- | --- |
| `config/app-config-provider.ts` | Retain process singleton, explicitly initialize first | Both mains call `initialize`; the returned `AppConfig` is passed into graph. No critical store re-reads it. | Many unrelated server owners are process-scoped; one host composition runs per process. |
| `config/app-config.ts`, `config/application-database-location.ts`, `startup/migrations.ts` | Modify composition callsites; retain refreshed-base explicit contracts | Standalone config materializer ensures a new data root has only a missing empty/non-secret `.env`; CLI supplies explicit runtime values. Both compositions obtain one exact database location and call `runMigrations({appRoot,databaseUrl})`; no migration code re-reads a global provider. | Native standalone start must satisfy current config prerequisites without writing credentials or package files; operational DB identity must match the composition data root. |
| `repository_prisma` `initializePrisma`/`shutdownPrisma`, `config/prisma-client-factory.ts` | Retain process runtime; make composition ownership explicit | Both compositions initialize once from the exact database URL before repository consumers. Graph-owned/current callsites that create clients must resolve the same initialized location; process close shuts Prisma down last. | Refreshed base makes repository Prisma an actual process dependency. One composition per process avoids cross-root ambiguity. |
| `secret-management/secret-vault-runtime.ts` and `autobyteus-ts/tools/file/workspace-path-utils.ts` denied-path configuration | Retain process-scoped runtime/config; make startup/stop explicit in both compositions | Initialize vault with the exact `ApplicationDatabaseLocation`; deny DB/root-key/sidecar paths before tool registration; close vault after event/runtime consumers and before Prisma. No host or devkit code reads secret values. | Provider/model/media/search execution now depends on the vault. This is runtime configuration, not authentication. |
| `agent-tools/search/register-search-tool.ts` | Move into strict tool-readiness owner | `AgentToolRegistryReadiness` registers Search as the seventh named group after vault readiness; `buildApp()` no longer performs hidden tool registration. | Route construction must not mutate a required application tool registry. |
| `application-packages/{stores/application-package-registry-store.ts,stores/application-package-root-settings-store.ts,services/application-package-registry-service.ts}` | Modify Studio construction; retain implementations | Studio graph constructs/injects stores with the exact `AppConfig`. Standalone does not persist package settings and supplies an immutable registry snapshot provider. | Prevent standalone package selection from mutating Studio settings. |
| `application-bundles/services/application-bundle-service.ts` | Modify | Constructor requires provider + registry snapshot provider in graph path; graph never calls `getInstance()`. | Catalog identity must be graph-local. |
| `application-bundles/providers/file-application-bundle-provider.ts` and current manifest/identity utilities | Retain parser/validator; inject where needed | One explicit provider per graph; standalone wrapper filters configured local ID after current validation. | No second parser or manifest. |
| `application-storage/services/application-storage-lifecycle-service.ts` | Modify | Require exact `AppConfig`, bundle service, migration service; remove graph-path fallback getters. | App DB root and bundle migrations must match selected graph. |
| `application-storage/stores/application-platform-state-store.ts` | Modify | Require exact config + storage lifecycle. | Known-app inventory and platform DBs use host data root. |
| `application-storage/stores/application-global-platform-state-store.ts` | Modify | Add constructor accepting `ApplicationStoragePathConfig` or resolved DB path; remove module-level `appConfigProvider` resolution. | Global lookup DB is composition-critical. |
| `application-orchestration/stores/{application-run-lookup-store,application-run-binding-store,application-execution-resource-configuration-store,application-execution-event-journal-store}.ts` | Modify graph construction; retain schemas | Construct once from the exact global/platform store and inject downstream; no fallback construction in graph-owned services. | All orchestration persistence shares one root/identity. |
| `agent-definition/providers/file-agent-definition-provider.ts`, `agent-team-definition/providers/file-agent-team-definition-provider.ts`, and their persistence-provider wrappers | Modify | Accept exact config + bundle service instead of field-initializing globals; graph constructs agent/team definition services from them. | Application-owned definitions must come from the selected catalog. |
| `startup/{agent-tool-loader,workspace-loader,agent-customization-loader}.ts` | Modify ownership | Expose strict named readiness methods/results; lifecycle receives these exact collaborators. Remove P4–P6 from background runner. | Real tool/runtime readiness cannot log-and-continue. |
| `startup/background-runner.ts` | Decommission mixed scheduler | Studio composition explicitly schedules B1–B3; standalone omits them. | Separates required readiness from optional extras. |
| `application-orchestration/services/application-orchestration-startup-gate.ts` | Modify | Public constructor/graph instance; lifecycle completes/fails it. Graph path never uses getter. | One readiness promise per graph. |
| new `application-availability-state-registry.ts` + existing `application-availability-service.ts` | Create/Modify | One graph-local registry reader/writer; availability service coordinates reload/recovery/dispatch using writer. Remove internal state map/fallbacks. | Break availability/dispatch cycle and keep active checks singular. |
| `application-execution-event-{dispatch,ingress}-service.ts` | Modify | Exact bundle/store/availability reader/deferred engine port; dispatcher adds `stop()`, ingress requires exact dispatcher. Remove global accessors from graph path. | Correct event root and timer cleanup. |
| `application-run-binding-{terminal-transition-service,lifecycle-hub}.ts`, `application-run-observer-service.ts` | Modify | One graph-local hub/stores/ingress/observer; observer adds `dispose()` to detach all registrations. | Recovery and shutdown cannot reach a default graph or leak listeners. |
| `application-orchestration-recovery-service.ts` | Modify | Exact bundle/platform/binding/lookup/observer/ingress/terminal instances; no global fallbacks. | Recovery must reconcile only the graph catalog/data. |
| `application-execution-resource-{resolver,configuration-service}.ts`, `application-run-binding-launch-service.ts`, `application-agent-target-authorization-service.ts` | Modify | Exact bundle, definitions, configuration/binding stores, availability reader, startup gate, run services. | Selected resources and authorization use one graph. |
| `application-orchestration-host-service.ts` | Modify | Require exact gate, availability reader, resolver/configuration/launch, stores, observer, run/history/artifact/memory services. Remove graph-path getters. | Core orchestration authority remains, construction becomes explicit. |
| `application-published-artifact-relay-service.ts`, `services/published-artifacts/published-artifact-publication-service.ts`, `agent-execution/services/agent-run-manager.ts` | Modify bounded cycle seam | Relay receives exact binding store + deferred engine event port; publication/run manager receive that relay. No `getApplicationEngineHostService()` fallback on this path. | Preserves artifact path without constructor cycle/global engine. |
| `agent-tools/published-artifacts/{register-published-artifact-tools.ts,publish-artifacts-tool.ts}` | Modify registration seam | P6 registers the tool with the exact graph-owned `PublishedArtifactPublicationService`; tool execution no longer calls a default publication-service accessor. | Brief Studio artifact proof must reach the selected graph. |
| `application-agent-streaming/services/application-agent-streaming-service.ts` | Modify | Exact orchestration/runtime source/mapper; add `stopAll()`. Remove graph-path getters. | Agent streams bind to correct orchestration and are disposable. |
| `application-agent-communication/services/application-agent-communication-{service,session}.ts` | Modify | Exact streaming + orchestration; session adds public abort, service adds `closeAll()`. | Direct sockets must close cleanly. |
| `application-engine/services/application-engine-host-service.ts` | Modify | Exact bundle/storage/orchestration/streaming; add `stopAllApplicationEngines()` and listener clearing after dependents unsubscribe. Graph does not use static getter. | Worker ownership remains single-source and shutdown becomes complete. |
| `application-backend-api-gateway/notifications/application-backend-notification-hub.ts` | Modify | `new` graph-local hub; add `closeAll()`. No getter in route path. | Notifications cannot cross graphs and sockets close. |
| `application-backend-api-gateway/websockets/application-backend-websocket-session-service.ts` | Modify | Exact engine; retain engine listener unsubscribe handles; add `dispose()`/close-all. | Custom WS listeners and sessions have an owner. |
| `application-backend-api-gateway/services/application-backend-api-gateway-service.ts` | Modify | Exact bundle, availability reader, engine, hub, custom-WS service; retain notification unsubscribe and add `dispose()`. No graph-path getter/static instance. | Correct gateway graph and listener cleanup. |
| `api/rest/application-{bundles,availability,backends,execution-resources}.ts` | Refactor | Handler/registrar factories receive exact services; Studio paths keep caller application ID, standalone registrar supplies selected ID. | Remove route closures over globals. |
| `api/websocket/application-{backend-notifications,backends,agent-communication}.ts` | Refactor | Registrars receive exact hub/custom-WS/communication service and cardinality adapter. | Same service authority, explicit host surface. |
| `server-runtime.ts`, `app.ts`, `index.ts` | Refactor | Studio main delegates to `buildStudioServerComposition`; process signal registration is once per main, not in graph. | Remove monolithic sole composition and duplicate signal listeners. |
| `autobyteus-application-devkit/src/{cli.ts,commands/dev.ts,config/*}`, template/sample `package.json` files | Modify | Add exact `dev --host <standalone-or-studio>` and `start` facades, host-specific development-session owners, standalone config materializer, and the five approved project scripts. Devkit calls only pack/validate, Studio public API, and `startStandaloneApplicationHost`; no server manager imports. | Native application-folder workflow is in scope; mocks become test fixtures only. |
| `applications/{brief-studio,socratic-math-teacher}/autobyteus-app.config.mjs`, `package.json`, `frontend-src/icon.svg`, and frontend entry imports | Add/Modify | Apply the exact declarative mapping above; scripts call devkit directly; SDK is a package import; icon is source-owned. | Makes both maintained layouts executable through the same package owner. |
| `applications/{brief-studio,socratic-math-teacher}/scripts/build-package.mjs` and source-root `ui/**`/`backend/**` | Delete after source icon migration | No adapter or wrapper. Regenerate only `dist/importable-package` from configured sources and update tests/docs away from local vendor paths. | Removes the conflicting package authority and stale generated layers. |
| `autobyteus-application-devkit/package.json` | Modify for first proof | Add a direct `workspace:*` dependency on the existing private `autobyteus-server-ts` project and import only its exported standalone start boundary. Do not resolve a relative source path or shell to a global executable. | Makes in-workspace/open-source-distribution `pnpm dev`/`start` deterministic without a new package; independent npm host publication remains deferred. |
| new `standalone-application-host/start-standalone-application-host.ts` plus existing server package export/build metadata | Add/Modify existing project | Public API accepts normalized standalone config, constructs/listens once, and returns `{url, close}`; CLI main alone installs signals. Initial implementation remains in `autobyteus-server-ts`; no extra package/project extraction. | Gives `dev` and `start` the same real composition and supports in-process test/dev cleanup without duplicating server internals. |
| Core Prisma/database migrations, application SQL migration schema/ledger, current manifest/backend/iframe serialized contracts | Retain wire/schema values; clean-cut rename code symbols | Same readers/writers/contracts receive configured paths/identity. Numeric version fields remain unchanged; all code identifiers use the unversioned current-contract names in the naming inventory. | AC-008/AC-012; no migration, dual parser, or suffixed alias. |
| Runtime/processor/tool registries, `WorkspaceManager`, model/LLM factories, low-level agent/team runtime managers | Retain process-scoped, but inject the chosen instances into graph-owned run services/factories | One composition per process; P4–P9 completes registration before readiness. No host mode or catalog selection is read from these registries. | Repository-wide DI rewrite is unnecessary; active runs are process resources. |
| External channel, callback delivery, managed messaging, MCP gateway, mobile, remote access, memory sync | Retain Studio-only | Construct/register/stop only in Studio composition; absent from standalone composition. | Preserve Studio capability without expanding standalone surface. |

All cached `getApplication*` accessors listed in the modified graph nodes are either removed or restricted to legacy tests/callers updated in this change; neither production composition nor any registrar may call them. Unrelated singleton cleanup remains deferred only where the retained row gives a process-scoped rationale.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `startApplication` | Coordinator, provider resolution, client creation | All app frontends/templates | Direct `window.parent`, direct bootstrap fetch in app code | Extend provider/coordinator contract |
| `ApplicationBootstrapProvider.acquire()` | Iframe message loop or same-origin fetch | Startup coordinator | Coordinator branching on postMessage/fetch | Add provider-specific method/state internally |
| `StandaloneApplicationSelectionService.resolve()` | Package snapshot, current parser/provider, selected bundle validation | Standalone composition/host | Reading `application.json` directly in route/main | Extend selection result/diagnostics |
| `ApplicationBackendApiGatewayService` | Availability, engine start, exposure checks, backend WS sessions | Both host ingress adapters | Route calling worker client directly | Add a singular gateway method |
| `ApplicationPlatformLifecycle` | preparation, recovery, readiness, stop order | Both compositions, bootstrap readiness | Route/CLI invoking recovery services ad hoc | Add lifecycle phase/API |
| `ApplicationOrchestrationHostService` | resource/run/binding/event/artifact coordination | Worker context capability bridge | Backend importing run manager/runtime factory | Add named context capability |

## Dependency Rules

- Application frontend source may depend only on frontend SDK/contracts and its own UI/business modules.
- Application backend source may depend only on backend SDK/contracts and its own business modules.
- Application code must not import Studio, Electron, standalone-host, or server-internal modules.
- Bootstrap providers may depend on contracts, browser APIs, and provider-local helpers; they may not depend on app components.
- `ApplicationStartupCoordinator` may depend on the provider interface, resolver, client factory, and startup renderer; it may not contain provider wire branches.
- Standalone host code may depend on bundle selection, lifecycle readiness, gateway/communication adapters, and asset resolution; it may not import backend entry modules.
- Standalone package selection and serving are read-only. No host, worker, migration, or conformance path may write generated assets, identifiers, status, or caches into `packageRoot`; mutable output belongs under `appDataDir` or a disposable conformance work directory.
- Devkit commands may depend on pack/validate services, a narrow Studio public API client, and the exported `startStandaloneApplicationHost` boundary. They may not import application-platform lifecycle, gateway, engine, storage, orchestration, vault, or route internals.
- For a new standalone data root, the command/config owner may create only a missing empty/non-secret `.env` required by current `AppConfig`; it never overwrites an existing file or persists credentials. Exact host/public-base values are supplied as command/runtime inputs.
- Both compositions must complete one exact prerequisite chain before app-data migration or remaining readiness: `AppConfig/database location -> core migration -> protected DB/root-key/WAL/SHM/journal path registration -> Prisma initialization -> secret-vault initialization`. Both must stop the default run-event pipeline -> vault -> Prisma after application consumers.
- Standalone server bootstrap advertises only strict root-relative platform paths. The browser provider, not application code or bind configuration, resolves those paths to absolute HTTP/WS endpoints using the visible same origin.
- Standalone composition defaults to loopback and does not install broad Studio CORS policy. Browser WebSocket upgrades require an `http(s)` `Origin` whose normalized authority equals the normalized HTTP request `Host` authority; missing/mismatched origins are rejected for these browser ingress routes. Trusted-proxy origin rewriting is not claimed in the first slice. An explicit non-loopback bind remains a trusted-network operator choice and adds no account/authentication subsystem.
- Composition roots may construct concrete services. No generic `get(name)`/`resolve<T>()` container is introduced.
- Route registrars receive exact services (`gateway`, `notificationHub`, `agentCommunicationService`, selected descriptor), not a whole runtime graph.
- Shared gateway/engine/orchestration services remain unaware of Studio versus standalone.
- Host mode must not be added to `application.json` or backend handler inputs.
- New composition-critical application-graph code must not call global singleton accessors. Existing owners should receive dependencies through constructors or registrar parameters where touched. The only process-global exceptions are the exact one-composition-per-process resources retained in the inventory (`AppConfigProvider`, repository Prisma runtime, secret-vault runtime, protected-path/tool registries, and low-level runtime registries), each initialized and stopped explicitly by composition.

## Interface Boundary Mapping

| Interface / API / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `startApplication(options)` | One frontend startup | Resolve provider, create client, mount app once | `StartApplicationOptions` exact shape above | Only public app entry |
| `ApplicationBootstrapProvider.acquire(signal)` | One provider acquisition | Return strict runtime bootstrap | Provider-local launch identity | Provider validates before normalization |
| `resolveApplicationBootstrapProvider(window)` | Host protocol choice | Select provider from unambiguous environment | Valid iframe hints or top-level same-origin | Malformed iframe hints fail; no fallback |
| `ApplicationRuntimeBootstrap` | One mounted application runtime | Minimal application identity + endpoint bases | Canonical application ID and local/package IDs | No iframe-only fields |
| `StandaloneApplicationBootstrapPayload` | One standalone provider-wire response | Selected identity + root-relative platform route bases | Selected canonical application ID; confined `/_autobyteus/*` paths | `contractVersion` owns serialization version; provider resolves visible origin; never passed to application callback |
| `StandaloneApplicationSelectionService.resolve(config)` | One standalone selected bundle | Validate root/local ID and build immutable descriptor | `{packageRoot, localApplicationId}` | Never selects first app implicitly |
| `ApplicationPlatformLifecycle.prepareBeforeListen()` | One runtime graph | Run named P4–P9 preparation through `catalog_ready` | Composition-owned exact collaborators | Concurrent calls share promise |
| `ApplicationPlatformLifecycle.recoverAfterListen()` | One runtime graph | Run R1–R3 and complete readiness | Already-listening composition | Invalid order rejects |
| `ApplicationPlatformLifecycle.awaitReady()` | One runtime graph | Gate application ingress | Same lifecycle | Failed state rethrows cause |
| `ApplicationPlatformLifecycle.stop()` | One runtime graph | Close timers/sockets/listeners/workers in specified order | Same graph | Idempotent |
| `autobyteus-app dev --host <standalone-or-studio>` | One application-project development session | Resolve project inputs, pack/watch, and delegate to exactly one real host session | Project root + closed host enum; default `standalone` | No mock value or missing-URL fallback |
| `autobyteus-app start` | One built application-project launch | Resolve existing output, explicit source-manifest local ID, data/network config; validate and delegate once | Project root plus optional package/data/host/port/public-base overrides | Does not pack/watch; absent/invalid build rejects |
| `startStandaloneApplicationHost(config)` | One standalone process composition | Prepare process resources, build/listen selected-app server, return idempotent close handle | `{packageRoot, localApplicationId, appDataDir, host, port, publicBaseUrl?}` | Server-owned public boundary; no signal installation |
| `GET /_autobyteus/bootstrap` | Selected app bootstrap wire | Await readiness/engine and return strict standalone root-relative payload | No selector from request | Selected ID is composition-owned; response does not derive absolute URLs from bind address or request Host |
| `GET /_autobyteus/health` | Standalone readiness | Report lifecycle state | None | Does not start app by itself |
| `/_autobyteus/backend/*` | Selected app backend | Fixed-app HTTP backend mount | Selected canonical ID | Delegates gateway |
| `/_autobyteus/backend/notifications` | Selected app notifications | Fixed-app notification socket | Selected canonical ID | Existing hub |
| `/_autobyteus/backend/ws/*` | Selected app custom sockets | Fixed-app backend WS mount | Selected canonical ID + route path | Existing WS session service |
| `/_autobyteus/agent/*` | Selected app direct agent communication | Fixed-app target connection | Selected canonical ID + binding/target path | Existing communication service |
| `buildStudioServerComposition()` | Studio server | Full existing platform + app surface | Multi-app catalog | Current product server |
| `buildStandaloneApplicationServerComposition(config)` | Standalone server | Selected app surface only | Package root + local app ID | No Studio route registries |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `startApplication` | Yes | Yes | Low | Keep provider details behind coordinator |
| Provider resolver | Yes | Yes | Medium | Reject malformed iframe context instead of falling through |
| Standalone provider wire | Yes | Yes | Low | Keep relative route paths in the provider-wire type and absolute endpoints in `ApplicationRuntimeBootstrap` |
| Standalone selection | Yes | Yes | Low | Require local ID even for one-app roots |
| Lifecycle start/stop | Yes | Yes | Low | Keep HTTP registration outside |
| Studio backend routes | Yes | Yes | Low | Route param maps to canonical app ID |
| Standalone backend routes | Yes | Yes | Low | No caller-provided selector |
| Dev/start command facade | Yes | Yes | Low | Closed host mode; source manifest provides explicit local ID; no first-app inference |
| Standalone process API | Yes | Yes | Low | Return close handle; keep signals and watch orchestration outside |
| Generic runtime graph object | N/A | N/A | High if exposed | Use only inside composition and pass exact fields onward |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Provider-specific host acquisition | `ApplicationBootstrapProvider` | Yes | Low | Do not call it business transport |
| Shared normalized data | `ApplicationRuntimeBootstrap` | Yes | Low | Exclude iframe correlation fields |
| Frontend owner | `ApplicationStartupCoordinator` | Yes | Low | Do not retain “Hosted” as universal name |
| Standalone bundle identity | `StandaloneApplicationSelection` | Yes | Low | Keep separate from package import registry record |
| Server lifecycle | `ApplicationPlatformLifecycle` | Yes | Medium | Do not let it become whole-server lifecycle |
| Host-facing root owner | `StandaloneApplicationHost` | Yes | Low | Keep gateway/engine behind existing owners |
| Programmatic process entry | `startStandaloneApplicationHost` | Yes | Low | Do not call it a dev server or platform container |
| Development owners | `StandaloneDevelopmentSession`, `StudioDevelopmentSession` | Yes | Low | Keep watch/rebuild policy out of production start |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Backend invocation | Application Backend API Gateway | Reuse | Already authoritative across handler families | N/A |
| Worker lifecycle | Application Engine | Reuse | Already owns storage/start/invocation/stop | N/A |
| Runtime execution | Application Orchestration + agent execution backends | Reuse | Already app-scoped and multi-runtime | N/A |
| Package parsing/assets | Application Packages/Bundles | Extend | Need standalone configured snapshot/selection, not new parser | N/A |
| Host bootstrap acquisition | Frontend SDK iframe startup | Extend/Refactor | Existing logic is correct for Studio but owns too much | N/A |
| Standalone root/static/bootstrap | None | Create New | A second host is genuinely new | Existing Studio components cannot own a non-Studio server root |
| Composition lifecycle | `server-runtime.ts` startup | Extend/Refactor | Current steps exist but are monolithic | N/A |
| Storage/migrations | Application Storage | Reuse | No schema or ownership change | N/A |
| Dev packaging/validation | Application Devkit | Extend | Existing package output is the proof artifact | N/A |
| Production standalone process | Existing server composition/process project | Extend | The new standalone composition belongs beside the current Studio server composition | N/A; creating a new top-level host project would split server authority before the boundary is proven |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| SDK Contracts | Current runtime-bootstrap type/validator | DS-001, DS-002 | Both bootstrap providers/coordinator | Extend | Manifest and host-specific wire contracts remain separate |
| Frontend SDK startup | Provider selection, acquisition, normalization, startup state/client creation | DS-001, DS-002 | `ApplicationStartupCoordinator` | Refactor | Clean replacement of hosted startup |
| Application Packages/Bundles | Current parser, ephemeral standalone catalog source, selected descriptor/assets | DS-002, DS-005 | Selection service, standalone host | Extend | No new manifest |
| Application Platform Runtime | Shared preparation/readiness/recovery/stop | DS-005 | `ApplicationPlatformLifecycle` | Create grouping over existing services | Not a new runtime implementation |
| API transport adapters | Studio multi-app and standalone fixed-app route mounts | DS-003, DS-004 | Gateway/communication services | Refactor/Extend | Keep policy in services |
| Standalone Application Host | Config, selection, root/static/bootstrap/readiness | DS-002, DS-005 | `StandaloneApplicationHost` | Create New | One selected app only |
| Studio Composition | Full current server surface | DS-001, DS-005 | Studio process | Refactor | Preserve behavior |
| Devkit | Pack/validate, real host development sessions, production `start` facade, command config | DS-006, DS-007, DS-010 | Application project command services | Extend | Mock becomes test-only; server graph stays behind narrow public start API |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `application-runtime-bootstrap.ts` | Contracts | Runtime bootstrap schema | Current type, constants, validator | One wire-neutral contract | N/A |
| `standalone-application-bootstrap.ts` | Contracts | Standalone provider wire | Selected identity, strict root-relative platform paths, validator | One host-wire contract shared by server/provider | Runtime application identity fields |
| `application-startup-types.ts` | Frontend SDK | Public contract | Exact options/context/state/handle types | One public type family | Runtime bootstrap/client |
| `application-startup-coordinator.ts` | Frontend SDK | Startup owner | State, acquire, client, mount, dispose | One lifecycle owner | Runtime bootstrap/provider interface |
| provider files | Frontend SDK | Provider owners | One acquisition protocol each | Avoid coordinator branches | Provider interface/runtime bootstrap |
| `standalone-application-selection-service.ts` | Standalone host | Selection owner | Validate configured app and stable identity | One immutable selection concern | Current bundle parser/provider |
| `application-platform-lifecycle.ts` | Application platform | Lifecycle owner | Named P4–P9 prepare, R1–R3 recovery, ready/stop | One state machine | Exact readiness/disposable ports |
| `application-definition-runtime-readiness.ts` | Application platform | Runtime readiness owner | Definition refresh/resource/runtime preflight | One readiness concern | Bundle/definitions/runtime availability |
| `agent-tool-registry-readiness.ts` | Application platform | Tool readiness owner | Strict results for the exact seven named groups including Search | One readiness concern | Current six-group loader plus provisioned Search registration |
| composition files | Server composition | Construction owners | Construct graph/register chosen surfaces | One file per product composition | Shared lifecycle/registrars |
| route handler/registrar files | API transport | Thin adapters | Shared handler logic + distinct mounts | Split by HTTP/WS and host cardinality | Existing gateway/communication services |
| `commands/dev.ts` | Devkit | Dev command facade | Parse `--host`, select one development-session owner | One command boundary | Standalone/Studio session interfaces |
| `development/standalone-development-session.ts` | Devkit | Standalone dev owner | Disposable pack, watch/coalesce, graceful host restart, browser reload | One lifecycle concern | Pack/validate + server start API |
| `development/studio-development-session.ts` | Devkit | Studio dev owner | Stable pack, watch/coalesce, current Studio local import/reload, presentation refresh | One lifecycle concern | Pack/validate + Studio public API client |
| `commands/start.ts` | Devkit | Production command facade | Resolve existing output/ID/data/network and call standalone process API once | One no-build command concern | Config loader, validator, server public start API |
| `standalone-application-host/start-standalone-application-host.ts` | Existing server project | Public standalone process boundary | Construct/listen/return close handle | One programmatic process lifecycle | Standalone composition |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Normalized app identity + absolute endpoints | `application-runtime-bootstrap.ts` | Contracts | Both providers return it and the coordinator/client consume it | Yes: drops iframe launch/request-context/bind-origin duplication | Yes | Universal manifest or deployment config |
| Standalone identity + relative paths | `standalone-application-bootstrap.ts` | Contracts | Server and same-origin provider share one strict wire meaning | Yes: bind/request-origin values excluded | Yes | A second runtime-bootstrap shape |
| Bootstrap provider contract | `application-bootstrap-provider.ts` | Frontend SDK startup | Coordinator is provider-agnostic | Yes | Yes | Generic plugin registry |
| Backend HTTP handler invocation | `application-backend-route-handlers.ts` | REST transport | Studio and standalone mounts parse bodies the same way | Yes | Yes | Business gateway replacement |
| Selected application descriptor | `standalone-application-selection.ts` | Standalone host | Root, bootstrap, ingress, lifecycle need identical immutable identity | Yes | Yes | General multi-app catalog DTO |
| Application platform lifecycle state | `application-platform-lifecycle-state.ts` or colocated if small | Application platform | Health/bootstrap/composition observe same state | Yes | Yes | Whole-server feature-state bag |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `ApplicationRuntimeBootstrap` | Yes | Yes | Low | Keep only application identity and absolute ready-to-use endpoint bases |
| `StandaloneApplicationBootstrapPayload` | Yes | Yes | Low | Keep only selected identity and confined root-relative platform paths; normalize before coordinator |
| `ApplicationBootstrapPayload` | Yes, for Studio wire | Existing tight validator under its unversioned target name | Low | Keep provider-local after normalization |
| `StandaloneApplicationSelection` | Yes | Yes | Low | Derive canonical ID once; do not also accept it as config |
| `ApplicationPlatformLifecycleState` | Yes | Yes | Low | State owner only; no duplicate booleans outside derived getters |
| `ApplicationClientTransport` | Yes | Existing | Low | Reuse unchanged unless fixed-mount URL adapter needs a narrow option |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/application-runtime-bootstrap.ts` | SDK Contracts | Runtime bootstrap contract | Current DTO/constants/strict validator | One contract family | N/A |
| `autobyteus-application-sdk-contracts/src/standalone-application-bootstrap.ts` | SDK Contracts | Standalone provider wire | Payload/constants/`contractVersion`/strict root-relative path validator | One host-wire family shared by server/provider | Runtime identity fields |
| `autobyteus-application-frontend-sdk/src/application-startup/application-bootstrap-provider.ts` | Frontend Startup | Provider boundary | Provider interface/cancellation result | One interface | Runtime bootstrap |
| `.../application-startup/application-startup-types.ts` | Frontend Startup | Public startup contract | Exact root/context/options/state/handle types | One type family | Runtime bootstrap/client |
| `.../application-startup/application-startup-coordinator.ts` | Frontend Startup | Governing owner | State/client/mount/dispose | One lifecycle | Provider/client factory |
| `.../application-startup/default-application-startup-screen.ts` | Frontend Startup | Startup renderer | Generic resolving/acquiring/starting/failure UI | One presentation concern | Startup state |
| `.../application-startup/studio-iframe-bootstrap-provider.ts` | Frontend Startup | Studio provider | Existing v4 wire exchange + normalization | One protocol | Iframe v4 + runtime bootstrap |
| `.../application-startup/standalone-same-origin-bootstrap-provider.ts` | Frontend Startup | Standalone provider | Fixed bootstrap fetch + validation | One protocol | Runtime bootstrap |
| `.../application-startup/resolve-application-bootstrap-provider.ts` | Frontend Startup | Provider selection | Unambiguous environment selection | One policy | Provider types |
| `autobyteus-server-ts/src/application-platform/runtime/application-platform-lifecycle.ts` | Application Platform | Lifecycle owner | Named pre-listen/recovery/readiness/stop state machine | One control owner | Exact readiness/disposable ports |
| `.../application-platform/runtime/application-availability-state-registry.ts` | Application Platform | Availability state core | Reader/writer ports | Break one concrete constructor cycle | Availability record |
| `.../application-platform/runtime/deferred-application-engine-event-handler-port.ts` | Application Platform | Single-bind construction seam | Event/artifact invocation until engine is bound | Break one concrete constructor cycle | Narrow engine methods |
| `.../application-platform/runtime/application-definition-runtime-readiness.ts` | Application Platform | Required runtime readiness | Definitions/resources/runtime mappings | One readiness boundary | Current providers/availability |
| `.../application-platform/runtime/agent-tool-registry-readiness.ts` | Application Platform | Required tool readiness | Strict result for exactly seven named groups: Skills, Browser, Task Delegation, Agent Communication, Published Artifact, Media, and Search Tools | One readiness boundary | Current six-group loader plus provisioned Search registration |
| `.../application-platform/runtime/create-application-platform-runtime-graph.ts` | Application Platform | Composition factory | Construct graph in fixed order above | One construction concern | Existing constructors |
| `.../api/rest/application-backend-route-handlers.ts` | REST Transport | Shared thin handler set | Normalize/delegate operations by explicit app ID | One protocol family | Gateway |
| `.../api/rest/studio-application-routes.ts` | REST Transport | Studio mount | Current multi-app paths | One host/cardinality | Shared handlers |
| `.../api/websocket/studio-application-websockets.ts` | WS Transport | Studio mount | Current multi-app sockets | One host/cardinality | Existing services |
| `.../standalone-application-host/config/standalone-application-host-config.ts` | Standalone Host | Config boundary | CLI/env normalization/validation, loopback default, explicit non-loopback mode | One config | N/A |
| `.../standalone-application-host/domain/standalone-application-selection.ts` | Standalone Host | Selected descriptor | Immutable selected identity/bundle paths | One domain shape | Current canonical ID |
| `.../standalone-application-host/services/standalone-application-selection-service.ts` | Standalone Host | Selection owner | Current package validation/catalog filtering | One selection lifecycle | Bundle provider/parser |
| `.../standalone-application-host/services/standalone-application-bootstrap-service.ts` | Standalone Host | Bootstrap wire owner | Await ready/ensure worker/return selected identity + strict relative platform paths | One provider-wire response | Standalone bootstrap contract/gateway |
| `.../standalone-application-host/api/standalone-application-static-routes.ts` | Standalone Host | Root asset adapter | Entry/assets/real-path confinement/eligible SPA fallback/reserved prefix | One HTTP concern | Bundle asset resolver |
| `.../standalone-application-host/api/standalone-application-platform-routes.ts` | Standalone Host | Fixed REST mount | Health/bootstrap/backend routes | One selected-app REST surface | Shared handlers/lifecycle |
| `.../standalone-application-host/api/standalone-application-websockets.ts` | Standalone Host | Fixed WS mount | Notifications/custom/agent sockets | One selected-app WS surface | Existing WS services |
| `.../compositions/studio-server-composition.ts` | Composition | Studio construction | Full current server + shared app runtime | One product root | Runtime graph/lifecycle |
| `.../compositions/standalone-application-server-composition.ts` | Composition | Standalone construction | Selected app server only | One product root | Same runtime graph/lifecycle |
| `.../standalone-application-host/config/standalone-host-config-materializer.ts` | Standalone Host | Data-root config boundary | Create missing data root/empty non-secret `.env`, preserve existing config, derive/validate public base | One current-AppConfig adaptation concern | Normalized standalone config |
| `.../standalone-application-host/start-standalone-application-host.ts` | Standalone Host | Public programmatic process boundary | Prepare process prerequisites, build/listen, return `{url, close}` | One reusable process lifecycle | Standalone composition + process resources |
| `.../standalone-application-host/main.ts` | Standalone Host | CLI/process facade | Parse normalized config, call public start, install signals/exit policy | One OS process entry | Public start API |
| `autobyteus-application-devkit/src/commands/dev.ts` | Devkit | Dev command facade | Parse the closed `standalone`/`studio` host option and delegate | One command | Development-session owners |
| `autobyteus-application-devkit/src/development/standalone-development-session.ts` | Devkit | Standalone dev lifecycle | Disposable pack/validate, watch/coalesce, close/restart real host, reload browser | One real-host dev concern | Pack owner + public server start |
| `autobyteus-application-devkit/src/development/studio-development-session.ts` | Devkit | Studio dev lifecycle | Pack/validate, watch/coalesce, call current local-package import/reload API, refresh Studio presentation | One real-host dev concern | Pack owner + Studio public client |
| `autobyteus-application-devkit/src/commands/start.ts` | Devkit | Production start facade | Resolve existing package/source ID/data/network, validate, call public server start once | One no-build production command | Validator + public server start |
| `autobyteus-application-devkit/src/studio/studio-application-package-client.ts` | Devkit | Studio public adapter | Local package import/reload requests and diagnostics | One external host API concern | Existing Studio GraphQL/application package contract |

## Applied Patterns (If Any)

- **Strategy/provider pattern:** only for bootstrap acquisition, where two protocols genuinely differ.
- **Composition root:** Studio and standalone construct explicit service graphs without a generic locator.
- **Thin transport adapters:** distinct URL/cardinality mounts delegate to one gateway/communication authority.
- **Lifecycle state machine:** reusable start/readiness/recovery/stop order is explicit rather than hidden across entrypoint callbacks.
- **Adapter normalization:** Studio iframe v4 and standalone `contractVersion: "1"` wire payloads normalize before client creation; app business code sees one unversioned current SDK type.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/application-runtime-bootstrap.ts` | File | Shared contract | Host-neutral runtime bootstrap | Cross-host normalized contract owner | Manifest/deployment policy |
| `autobyteus-application-sdk-contracts/src/standalone-application-bootstrap.ts` | File | Standalone provider wire | Selected identity + strict root-relative platform paths | Server/provider cross-boundary contract | Bind address, request Host, absolute runtime URLs |
| `autobyteus-application-frontend-sdk/src/application-startup/` | Folder | Frontend startup subsystem | Coordinator/provider structure | Exposes structural depth clearly | Business UI components |
| `autobyteus-server-ts/src/application-platform/runtime/` | Folder | Shared application lifecycle | Runtime graph/lifecycle/readiness | Host-neutral application platform grouping | Fastify route paths |
| `autobyteus-server-ts/src/standalone-application-host/` | Folder | Standalone product host | Config, selection, root/bootstrap/fixed ingress, process entry | New host-specific capability | Worker/orchestration implementations |
| `autobyteus-server-ts/src/compositions/` | Folder | Product construction | Studio/standalone roots | Only place choosing full surface | Runtime business logic |
| `autobyteus-server-ts/src/api/rest/` | Folder | REST transport | Shared handler set and Studio mount | Existing transport convention | Standalone root/static policy |
| `autobyteus-server-ts/src/api/websocket/` | Folder | WS transport | Studio application sockets and unrelated Studio sockets | Existing transport convention | Standalone fixed route policy |
| `autobyteus-application-devkit/src/{commands,development,studio}/` | Folders | Application project CLI | Pack/validate/start facades, two real development sessions, narrow Studio API adapter | Existing devkit ownership with lifecycle depth visible | Server graph/runtime internals or mock fallback |
| `autobyteus-application-devkit/templates/basic/{package.json,autobyteus-app.config.mjs,README.md}` | Files | Starter command contract | Exact `dev`, `dev:studio`, `build`, `validate`, `start` scripts/config/docs | New projects receive the approved native workflow | Host-specific application source |
| `applications/{brief-studio,socratic-math-teacher}/autobyteus-app.config.mjs` | Files | Representative application package-input contract | Exact shared mapping for `frontend-src`, `backend-src`, root teams, entries, migrations, seven exposure booleans, optional assets/agents, and output | Declaratively adapts maintained non-default layouts to the existing pack owner | Executable hook, shell command, custom builder, host mode |
| `applications/{brief-studio,socratic-math-teacher}/package.json` | Files | Representative application command contract | Same five scripts call `autobyteus-app` directly; add devkit workspace dependency; optional backend typecheck remains separate | In-tree proof matches starter DX with one package owner | Divergent one-off build or host script |
| `applications/brief-studio/frontend-src/{app.js,brief-studio-runtime.js,icon.svg}` | Files | Sample app startup/runtime/static source | Import package SDK, call `startApplication`, dispose on `pagehide`, consume runtime bootstrap, remove iframe diagnostics, own icon source | Proves app code/document lifetime and static inputs are host-neutral | Host detection/correlation or generated vendor import |
| `applications/socratic-math-teacher/frontend-src/{app.js,socratic-runtime.js,socratic-renderer.js,icon.svg}` | Files | Sample app startup/runtime/UI/static source | Import package SDK, call `startApplication`, dispose on `pagehide`, consume runtime bootstrap, replace iframe-only panel, own icon source | Keeps all in-tree app/static sources current | Host detection/correlation or generated vendor import |
| `applications/{brief-studio,socratic-math-teacher}/scripts/build-package.mjs`, `ui/**`, `backend/**` | Delete | Obsolete sample package path | Removed after icons move and devkit pack equivalence is covered | Prevents a second builder/generated source mirror | Any retained wrapper or vendor tree |
| `autobyteus-application-devkit/templates/basic/src/frontend/app.ts` | File | Starter entry | Call `startApplication` and dispose its handle on `pagehide` | New projects use one API/lifetime rule | Host detection |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| Frontend `application-startup/` | Main-Line Domain-Control + protocol adapters | Yes | Low | Coordinator separate from provider protocols |
| Server `application-platform/runtime/` | Main-Line Domain-Control | Yes | Medium | Keep routes/config outside; avoid generic container |
| `standalone-application-host/` | Mixed Justified | Yes | Medium | Subfolders split config/domain/services/api/process |
| `compositions/` | Main-Line construction | Yes | Low | Two product roots only |
| Existing `api/rest` and `api/websocket` | Transport | Yes after split | Medium | Remove application registration from general indices |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Bootstrap | `startApplication -> provider.acquire -> ApplicationRuntimeBootstrap -> createApplicationClient` | `if (isStudio) ... else ...` inside every app | Host difference stays in SDK infrastructure |
| Composition | `buildStandalone...(config)` registers only selected-app adapters over shared services | Start full `buildApp()` on a public port and hide Studio UI | Public/API scope is structural, not cosmetic |
| Identity | Config accepts `{packageRoot, localApplicationId}` then derives canonical ID once | Accept path, local ID, canonical ID, and manifest root flag | Avoid overlapping selectors |
| Gateway | Both route mounts call `ApplicationBackendApiGatewayService` | Standalone route imports worker/backend module | Preserves one backend lifecycle |
| Provider selection | Valid iframe hints select Studio; top-level selects standalone; malformed iframe context fails | Try iframe, catch, then silently fetch standalone | Prevents incorrect fallback and hard-to-debug mixed host state |
| Native commands | `dev` = real standalone development; `dev:studio` = real Studio development; `build`/`validate` own the package; `start` = production use of the existing package | `dev` silently mocks, or `start` rebuilds/watches | Developer and production evidence is unambiguous |
| Package use | Package once, record digest, mount the same read-only root in both hosts, write only under each host data root | Rebuild assets per host or write runtime state into the package | Makes build-once portability factual |
| Standalone endpoints | Server returns strict relative platform paths; provider resolves them from browser origin | Server returns `0.0.0.0`, reflected Host, or hard-coded localhost absolute URLs | Works through a browser-visible hostname while preserving one absolute runtime type |

Exact application-project script contract:

```json
{
  "scripts": {
    "dev": "autobyteus-app dev",
    "dev:studio": "autobyteus-app dev --host studio",
    "build": "autobyteus-app pack",
    "validate": "autobyteus-app validate --package-root dist/importable-package",
    "start": "autobyteus-app start"
  }
}
```

Brief Studio and Socratic do not keep their custom build implementations. Their checked-in mappings above make the same devkit pack owner authoritative for `build`, `dev`, and `dev:studio`; `start` only consumes its existing output. `autobyteus-app start` resolves `output.packageRoot`, reads the explicit local ID from source `application.json`, and uses these defaults unless config/CLI overrides them:

| Command | Package root | Data root | Host/port | Rebuild/watch | Real host outcome |
| --- | --- | --- | --- | --- | --- |
| `dev` | `.autobyteus/dev/package` | `.autobyteus/dev/data` | `127.0.0.1:43124` | Yes; coalesced full repack/restart/browser reload | Standalone |
| `dev:studio` | `dist/importable-package` | Studio-owned | Studio API `http://127.0.0.1:8000` | Yes; pack + current local-package reload; Studio's explicit Reload action remounts | Studio |
| `build` | `dist/importable-package` | N/A | N/A | One build | N/A |
| `validate` | `dist/importable-package` | N/A | N/A | No | N/A |
| `start` | `dist/importable-package` | `.autobyteus/standalone-data` | `127.0.0.1:43124` | Never | Production standalone |

All path defaults are project-root-relative and ignored from source control where mutable. CLI flags override config. A non-loopback `start` also requires an explicit browser/public base URL for current `AppConfig`; standalone browser bootstrap still derives client endpoints from `window.location.origin`, never that server configuration value.

Example host-neutral runtime bootstrap:

```ts
export type ApplicationRuntimeBootstrap = {
  contractVersion: "1";
  application: {
    applicationId: string;
    localApplicationId: string;
    packageId: string;
    name: string;
  };
  transport: {
    backendBaseUrl: string;
    backendNotificationsUrl: string | null;
    backendWebSocketBaseUrl: string | null;
    agentCommunicationWebSocketBaseUrl: string | null;
  };
};
```

Studio provider normalization:

```ts
const runtimeBootstrap = normalizeStudioIframeBootstrap(iframePayload);
// iframeLaunchId and host-origin correlation remain provider-local.
```

Standalone provider-wire response example:

```json
{
  "contractVersion": "1",
  "application": {
    "applicationId": "bundle-app__<encoded-standalone-and-local-id>",
    "localApplicationId": "brief-studio",
    "packageId": "standalone",
    "name": "Brief Studio"
  },
  "transportPaths": {
    "backendBasePath": "/_autobyteus/backend",
    "backendNotificationsPath": "/_autobyteus/backend/notifications",
    "backendWebSocketBasePath": "/_autobyteus/backend/ws",
    "agentCommunicationWebSocketBasePath": "/_autobyteus/agent"
  }
}
```

Standalone provider normalization:

```ts
const payload = validateStandaloneApplicationBootstrapPayload(responseBody);
const runtimeBootstrap = normalizeStandaloneBootstrap({
  payload,
  browserOrigin: window.location.origin,
});
// HTTP/WS URLs in runtimeBootstrap are now absolute and same-origin.
```

Composition shape:

```ts
// resolveStandaloneApplicationHostConfig defaults host to 127.0.0.1.
const config = resolveStandaloneApplicationHostConfig(cliAndEnvironment);
await materializeStandaloneHostConfig(config); // missing empty/non-secret .env only
const appConfig = AppConfigProvider.initialize({ appDataDir: config.appDataDir });
appConfig.initialize();
const databaseLocation = appConfig.getOperationalDatabaseLocation();
runMigrations({
  appRoot: appConfig.getAppRootDir(),
  databaseUrl: databaseLocation.databaseUrl,
});
configureOperationalDatabaseDeniedPaths(databaseLocation);
await initializePrisma({ datasourceUrl: databaseLocation.databaseUrl });
await secretVaultRuntime.initialize(databaseLocation);

const graph = createApplicationPlatformRuntimeGraph({
  appConfig,
  catalogSource: createStandaloneCatalogSource(selection),
  processRuntimeDependencies,
});

const app = await buildStandaloneApplicationServerComposition({
  config,
  graph,
  selection,
});
await graph.lifecycle.prepareBeforeListen(); // P4-P9, including seven tool groups
await app.listen({ host: config.host, port: config.port });
await graph.lifecycle.recoverAfterListen();
return createStandaloneApplicationHostHandle({
  app,
  lifecycle: graph.lifecycle,
  processResources: { defaultAgentRunEventPipeline, secretVaultRuntime, prismaRuntime },
});
```

The `graph` is local to the composition root. It is not passed into business services as a service locator.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `startHostedApplication` as alias | Avoid sample/external source edits | Rejected | Replace all in-tree callers/exports and publish the new SDK contract cleanly |
| Auto-fallback from standalone to mock or public `dev:contract` product mode | Preserve current dev convenience | Rejected | Real `dev`/`dev:studio`; move any useful contract host under test fixtures only |
| Add `hostMode` or `rootApplication` to manifest v4 | Let package choose host | Rejected | Host/deployment config selects composition/application |
| Accept both old/new bootstrap shapes in business callback | Ease transition | Rejected | Providers normalize before callback; callback receives only the current unversioned runtime type |
| Run current full server and merely omit Studio frontend | Fastest standalone launch | Rejected | Explicit standalone composition and route inventory |
| Copy app gateway/engine into standalone host | Avoid refactoring server | Rejected | Shared gateway/engine instances with fixed-app transport adapters |
| Persist configured standalone package through normal Studio package settings | Reuse import UI storage | Rejected | Ephemeral configured catalog/selection owned by standalone composition |
| Transform existing application databases | New host introduced | N/A | Direct use with separate host data root; no schema change |

## Derived Layering (If Useful)

1. **Application source layer:** host-neutral frontend/backend business code.
2. **SDK contract/startup layer:** runtime bootstrap, providers, client/context APIs.
3. **Host transport layer:** Studio iframe and standalone HTTP/root adapters.
4. **Application-platform control layer:** lifecycle, gateway, engine, orchestration.
5. **Runtime/provider/persistence layer:** current runtimes, stores, migrations, tools, artifacts.
6. **Composition layer:** Studio or standalone selects and wires the above.

The layering is derived from the spines. It is not a request to move every current module into a new top-level package.

## Change / Refactor Sequence

### Sequence 1 — Introduce the wire-neutral startup contract

1. Clean-cut rename the current application manifest/backend/iframe contract constants, types, validators, factories, tests, docs, and imports to the unversioned identifiers in the exact naming inventory. Keep serialized version fields/values unchanged and add no aliases.
2. Add `ApplicationRuntimeBootstrap` and strict validator to SDK contracts.
3. Add strict `StandaloneApplicationBootstrapPayload` with `contractVersion: "1"`, selected identity, and confined root-relative platform paths; keep it distinct from the absolute-endpoint runtime type.
4. Add provider interface, Studio provider, standalone provider, resolver, and coordinator. Standalone normalization resolves HTTP/WS endpoints from `window.location.origin`.
5. Add the exact public types/state union above and port generic startup rendering/failure containment into the coordinator.
6. Add focused provider/coordinator tests, including malformed iframe context with no standalone fallback, non-loopback browser-origin normalization, invalid relative paths, and disposal from every pending state.

### Sequence 2 — Clean-cut application API migration

1. Export `startApplication`; update every source consumer in the migration inventory, including Brief/Socratic runtime/renderer diagnostics and starter copy.
2. Regenerate SDK `dist`. Add the exact Brief/Socratic devkit configs, move icons to `frontend-src`, switch entries to the package SDK import, and regenerate `dist/importable-package` with the shared devkit pack owner.
3. Delete `startHostedApplication`, every hosted-only public type/state/copy/file, obsolete tests/exports, sample custom builders, source-root `ui`/`backend` mirrors and vendor trees, and stale generated package files.
4. Run current Studio contract/client tests to prove Studio remains supported.

### Sequence 3 — Extract application-platform lifecycle and route seams

1. Move application route registration out of broad REST/WebSocket indices into Studio application registrars.
2. Extract shared backend HTTP handler functions that always receive an explicit application ID and delegate to the existing gateway.
3. Add availability-registry and deferred-engine-port cycle breaks, then construct the exact graph in the specified order.
4. Preserve the refreshed-base process prerequisite chain in explicit Studio composition code: `AppConfig/database location -> core migration -> protected DB/root-key/sidecar path registration -> Prisma -> secret vault`; move provisioned Search registration into the strict seventh tool group.
5. Add `ApplicationPlatformLifecycle` with P4–P9 and R1–R3 named collaborators; split required startup work from Studio-only B1–B3 tasks.
6. Apply every `Modify` row and add the specified `stop`/`dispose` APIs; route registrars receive exact fields and no production graph accessor fallback remains.
7. Build `studio-server-composition.ts`, update the normal server entry, and verify current Studio route surface plus explicit readiness/failure/stop behavior, including event-pipeline/vault/Prisma cleanup, before adding standalone.

### Sequence 4 — Add standalone application selection and host

1. Add strict config `{packageRoot, localApplicationId, appDataDir, host, port, publicBaseUrl?}` with loopback default and explicit non-loopback trusted-network mode. Add the bounded config materializer that creates only a missing empty/non-secret data-root `.env`, never overwrites it, and supplies current `AppConfig` runtime values explicitly.
2. Add a configured catalog provider that delegates to current package/bundle parsers, assigns package ID `standalone`, filters to exactly the configured local application, and produces an immutable selection.
3. Treat the selected package root as read-only and direct every mutable path to the configured data root.
4. Add standalone root/static route behavior with decoded/real-path containment, reserved-prefix exclusion, exact asset serving, and eligible-document SPA fallback.
5. Add lifecycle health and bootstrap service; bootstrap awaits platform readiness/application engine readiness and returns the strict relative-path standalone wire payload.
6. Scope state inventory, binding recovery, availability, pending event resume, and worker recovery to `known IDs ∩ {selected ID}`.
7. Add selected-app REST/notification/custom-WebSocket/agent-communication mounts over existing services; omit broad Studio CORS and enforce equality between browser WebSocket `Origin` authority and request `Host` authority.
8. Add `standalone-application-server-composition.ts`, the programmatic `startStandaloneApplicationHost` `{url,close}` boundary, and a thin signal-owning process entry. Reuse the exact core-migration/protected-path/Prisma/vault prerequisite chain and process-resource close order proven in Studio.
9. Assert the route inventory contains no unrelated Studio/platform APIs.

### Sequence 5 — Developer workflow and conformance seam

1. Add the exact Brief/Socratic `autobyteus-app.config.mjs` mappings and source-icon/package-import changes, switch all three project types to the exact native scripts, and delete the two sample custom builders plus source-root generated mirrors.
2. Make `autobyteus-app dev` load the project config, resolve/watch the named inputs, and default to the real standalone development session over `.autobyteus/dev/package` and `.autobyteus/dev/data`; coalesce changes, close the current host, atomically repack/validate, restart the real host, and full-reload the browser.
3. Make `autobyteus-app dev --host studio` load the same mapping, pack/watch `dist/importable-package`, use the existing Studio local-package import/reload API at the configured Studio server, and preserve Studio's explicit Reload application action as the iframe remount authority.
4. Add `autobyteus-app start`; resolve the current built output and source-manifest local ID, validate without packing, invoke `startStandaloneApplicationHost` once, and forward signals/exit status. Remove public mock fallback/contract command; keep any useful host fixture only in tests.
5. Add a closed host-mode test command interface for later API/E2E ownership.
6. Package Brief Studio once, record whole-package and frontend/backend entry digests, and give that unchanged read-only output to both real host scenarios.
7. Recompute digests after both scenarios and fail if either host mutated the package.
8. Validate the exact maintained-project configs first, including icon/team/migration/exposure output and ignored generated roots, then validate the real team/migration/event/notification/artifact journey, latest-base operational DB/vault/Search prerequisites, stale non-selected recovery filtering, root/assets/navigation, route/origin surface, and process cleanup.

### Sequence 6 — Documentation and removals

1. Update application development, SDK, server application-engine/storage/orchestration, and Studio application docs.
2. Document standalone config, paths, readiness, public route surface, data root, and shutdown behavior.
3. Remove obsolete startup/dev files and registration calls listed above.
4. Confirm no compatibility aliases or hidden mock fallback remain.

## Key Tradeoffs

- **Keep manifest v4 versus design vNext now:** Keeping v4 minimizes variables and proves the host boundary first. It does not solve immutable release/version metadata, which remains a later program.
- **Provider auto-selection versus injected host configuration:** Auto-selection inside the SDK is required for identical built UI files. Strict unambiguous rules prevent it from becoming application-level environment branching.
- **Stable standalone package ID `standalone` versus path-derived package ID:** A fixed host-owned package ID preserves standalone data when the downloaded package directory moves. The isolated standalone data root and required local ID prevent collision.
- **Relative standalone provider wire versus absolute server-generated URLs:** A strict relative-path wire lets the browser provider derive the actually visible origin and WebSocket scheme. Keeping absolute URLs only in `ApplicationRuntimeBootstrap` avoids an ambiguous shared DTO and avoids bind-address/Host-header mistakes.
- **Explicit route adapters versus one mode-heavy generic registrar:** Separate Studio/standalone registrars make public cardinality and paths obvious. Shared handler functions avoid duplicated request parsing/gateway delegation.
- **Partial dependency-injection refactor versus repository-wide rewrite:** Composition-critical services and touched adapters become explicit now. Unrelated internal singleton cleanup is deferred to keep the dual-host slice deliverable.
- **Standalone inside server package versus immediate physical extraction:** The composition is proven in `autobyteus-server-ts` first. A later thin published host package/binary may depend on the proven composition without copying it.
- **Native `autobyteus-app start` facade versus a second application project:** The devkit owns project-relative config/validation and delegates to the existing server project's public standalone API. This preserves `pnpm start` without making every application contain a server implementation.
- **Materialize missing non-secret host config versus require manual `.env`:** Creating only a missing empty `.env` in the mutable data root preserves current `AppConfig` while delivering zero-setup loopback start. Existing files are never overwritten and credentials are never written.
- **Retain exact process globals versus refactor all platform configuration:** Latest-base Prisma, vault, protected-path, and runtime registries remain process-scoped under a one-composition-per-process rule. Their initialization/stop is explicit; application graph globals are still removed.

## Risks

1. **Hidden singleton coupling:** A service constructed for standalone may still reach a default global bundle/gateway instance. Mitigation: the Modify inventory removes graph-path fallbacks; composition tests use distinct catalog/data-root sentinels and fail if another app or lookup record becomes visible.
2. **Startup readiness race:** Tools/definitions/recovery may still be background work. Mitigation: P4–P9 and R1–R3 are named/awaited; only B1–B3 and stated Studio peripherals are best-effort.
3. **Route collision/static fallback:** SPA fallback could swallow platform/API errors. Mitigation: reserve `/_autobyteus/` first and limit fallback to eligible document requests.
4. **Absolute asset URLs:** Apps built for `/` may fail in Studio nested asset paths. Mitigation: devkit guidance and dual-host asset/navigation conformance; prefer relative asset base.
5. **Checked-in vendor divergence:** Sample UI vendor copies can become stale. Mitigation: regenerate through build scripts and compare outputs rather than hand edits.
6. **Standalone distribution weight:** Initial composition may still initialize broad underlying runtime dependencies even though it exposes a small surface. Mitigation: accept for proof, measure, then modularize initialization/package distribution without changing app contracts.
7. **Resource availability:** Current manifest v4 does not declare every tool/skill/runtime dependency. Mitigation: use the representative bundled team/current environment for the proof; define dependency packaging only after portability is demonstrated.
8. **Canonical identity mismatch between hosts:** Studio and standalone use different canonical IDs/data roots. This is intentional; conformance compares behavior and package contents, not shared live identity/data.
9. **Stale state from a previous standalone selection:** Reusing a data root after changing local application ID can leave valid dormant records. Mitigation: recovery and availability use only the selected-ID intersection; preserve other data without recovery or deletion.
10. **No-auth network exposure:** A permissive bind/CORS/WS configuration would exceed the local trusted scope. Mitigation: loopback default, explicit trusted-network non-loopback mode, no broad Studio CORS, same-origin WebSocket validation, and no public-internet security claim.
11. **Latest-base process-resource drift:** Omitting operational Prisma, secret vault, protected DB/key paths, Search registration, or their cleanup would make the standalone path differ from current Studio/runtime behavior. Mitigation: P2A/P2B/P6, exact process graph rows, and stop-order coverage are mandatory in both compositions.
12. **Development restart leakage:** Watch changes can race or leave a worker/socket/vault/Prisma instance alive. Mitigation: coalesce changes, close the current host handle completely, atomically rebuild, then start; assert no listener/child/process resource remains between generations.
13. **Studio development expectation:** Repacking/reloading the local package does not itself replace the route-visit iframe. Mitigation: `dev:studio` reports package reload completion and preserves the existing explicit Studio `Reload application` action as DS-009's remount authority.

## Guidance For Implementation

- Begin with contract/frontend SDK changes and prove Studio still works before constructing the standalone host.
- Treat provider selection and lifecycle states as closed discriminated unions with strict validators.
- Never let a malformed iframe launch fall through to standalone bootstrap.
- Keep `ApplicationRuntimeBootstrap` minimal. Do not copy iframe correlation, host route state, deployment config, or unrelated platform capability lists into it.
- Keep `ApplicationRuntimeBootstrap` endpoint fields absolute. Validate standalone relative routes in `StandaloneApplicationBootstrapPayload`, then resolve them from `window.location.origin` inside the standalone provider. Never use Fastify's bind address or a reflected `Host` header as the browser endpoint authority.
- Reuse `createApplicationBackendMountTransport`; add only the endpoint flexibility required by fixed standalone mounts.
- Build standalone selection by delegating to current package/bundle validators. Do not write a second manifest parser.
- Resolve `applicationId` once in the standalone selection and pass the immutable descriptor to root/bootstrap/route registrars.
- Treat `packageRoot` as immutable input; verify pre/post conformance digests and keep databases, logs, caches, runtime state, and generated diagnostics under `appDataDir` or disposable harness output.
- In standalone recovery, filter every known-ID/global-lookup/binding/event input to the selected canonical ID. Do not recover, expose, migrate, or delete dormant records for another selection.
- Refactor route files so request parsing/error mapping is shared, while URL/cardinality remains explicit per host.
- Default standalone bind to loopback. Do not install Studio's broad CORS configuration; require browser WebSocket `Origin` authority to equal request `Host` authority and reject missing/mismatched origins. Trusted-proxy rewriting remains outside this first slice. This is a network boundary, not a user/account feature.
- Construct the runtime graph only in composition files and in the exact order specified. Pass exact service dependencies; the typed graph result is never passed as a container.
- On the refreshed base, run the exact core-migration/protected-path/Prisma/vault prerequisite chain before application/tool/runtime readiness. Register provisioned Search only through the strict seven-group tool owner. Close event pipeline, vault, and Prisma after application consumers in both hosts.
- Implement P4–P9 as named awaited collaborators. Required tool/runtime failures fail both lifecycle states; standalone exits non-zero, while only explicitly listed Studio extras remain degraded/background.
- Implement the exact stop order and disposal methods for timers, communication sessions, custom WS sessions/listeners, notification sockets/bridge, run observers, workers, and streaming subscriptions.
- Keep `autobyteus-app start` build-free: validate the existing package, derive the source-manifest local ID, materialize only missing non-secret data-root config, and call `startStandaloneApplicationHost`. The public server start API must not install process signals.
- Keep `dev:studio` on the current Studio local-package import/reload boundary and preserve the explicit Studio Reload action; do not inject a second iframe lifecycle or browser automation into the devkit.
- Do not change application storage schemas or create a data migration.
- Do not add package-vNext, marketplace, or identity/account concerns to this implementation.
- Preserve exact current Studio behavior through tests and use Brief Studio as the real cross-host proof.
