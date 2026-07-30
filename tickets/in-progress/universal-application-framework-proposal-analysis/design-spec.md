# Design Spec — Universal Application Dual-Host Foundation

## Current-State Read

AutoByteus already has the central application runtime needed by both hosts:

- `ApplicationBundleService` discovers strict manifest-v4 bundles and resolves UI/backend paths.
- `ApplicationEngineHostService` prepares storage, applies app migrations, starts one worker process, validates backend definition v4, and bridges backend context capabilities.
- `ApplicationBackendApiGatewayService` is the authoritative application query/command/route/GraphQL/custom-WebSocket boundary.
- `ApplicationOrchestrationHostService` and related stores own resource resolution, run binding, recovery, lifecycle events, direct agent communication, and published-artifact access.
- Studio owns setup-first application selection and the iframe v4 ready/bootstrap exchange.
- `ApplicationClientTransport` already abstracts the post-bootstrap HTTP/WebSocket calls.

The original coupling and later launch/edit/prompt gaps are architecture-approved through `ARCH-REV-006`, implemented through `IR-009`, and source-reviewed through `CRR-014`. API/E2E round `API-REV-005` reaches a deeper product-reachable boundary:

1. Clean standalone Brief validates package-owned Codex/Luna defaults, becomes runnable, creates a binding/team run, and gives the researcher an Agent Tools MCP descriptor for `/mcp/agent-tools/:sessionId`.
2. Studio registers that internal session route; standalone does not. The direct standalone probe reaches a generic platform 404 instead of the route's established 401 authorization gate.
3. Codex and Claude retain native file tools. `buildDefaultAgentToolMcpAdapterProviders()` includes eligible server adapters such as `publish_artifacts` and `send_message_to`, but no read/write file adapter; `ConfiguredMcpAgentToolSourceResolver` forwards only `ToolOrigin.MCP`.
4. `CRR-016` supersedes `CRR-015`: the existing session service, route, catalog, dispatcher, capability gates, adapters, and runtime materializers already own the working behavior in Studio. The valid defect is only missing standalone route registration.
5. The optional external `/mcp/gateway` is a separate Studio route. It must not be confused with the per-run Agent Tools callback or exposed in standalone.

The correction is bounded: import and await the existing `registerAgentToolsMcpRoutes(app)` in `buildStandaloneApplicationServerComposition` before static fallback. It does not add a runtime owner, ports, path builder, publication bridge, native file adapter, user/account system, external gateway exposure, persistence, compatibility route, or broad-server fallback. Full evidence is recorded in [investigation-notes.md](investigation-notes.md), BEH-004–BEH-006, `API-REV-005`, and `CRR-016`.

## Intended Change

Implement one universal application startup boundary and two explicit host compositions:

- **Studio composition:** preserves the current setup-first Studio route and iframe v4 wire protocol.
- **Standalone composition:** selects one current application bundle from deployment configuration, serves that bundle's UI at `/`, supplies same-origin bootstrap data, exposes selected-application browser ingress under `/_autobyteus/*`, and registers the required capability-scoped internal runtime callback at `/mcp/agent-tools/:sessionId`.

Both compositions use one application-platform runtime graph and the same bundle, engine, gateway, storage, orchestration, communication, event, artifact, and existing Agent Tools session authorities. Studio already registers the per-run Agent Tools route and the separate optional external MCP gateway. Standalone registers only the existing per-run Agent Tools route; it never registers the external gateway. Codex/Claude native tools remain outside both server gateway surfaces.

The application source calls `startApplication(...)` once. An SDK-owned bootstrap coordinator selects the correct bootstrap provider, normalizes provider-specific wire data into one host-neutral runtime bootstrap, creates the existing application client, and calls the business mount callback. Application code does not select a host and does not branch on Studio versus standalone.

The first slice keeps manifest v4 and the current package layout unchanged. Host selection, standalone root ownership, and the standalone package identity are deployment concerns, not new manifest fields.

The application package is assembled once and is a read-only runtime input in both hosts. Studio import/selection and standalone configured selection consume the same package bytes; every mutable database, log, migration-ledger, runtime-status, and orchestration write goes under the composition's configured application-data root.


A standalone-capable application also owns its portable launch baseline. Its source-only devkit config declares `standalone.enabled: true`; each required slot has a bundled manifest default and every effective leaf resolves package-owned `runtimeKind` plus `llmModelIdentifier`. Studio may store an override overlay under its data root, but it never mutates the package. A fresh standalone data root contains no override row and normally runs directly from package defaults.

One `ApplicationLaunchConfigurationService` becomes authoritative for resource selection, package-baseline resolution, optional host override overlay, structured provenance, host capability validation, and the runnable result. Process/platform lifecycle readiness remains separate. Application run readiness has exactly three terminal meanings: `RUNNABLE`, `INVALID_PACKAGE`, and `HOST_REQUIREMENT_MISSING`. `INVALID_PACKAGE` is reserved for package-baseline defects. `HOST_REQUIREMENT_MISSING` means a valid package is blocked by host-local state: either a missing runtime/model/credential or an invalid/stale saved host override. A required runnable result never contains a null effective profile, and an invalid override never silently falls back to the package baseline.

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

### Downstream Code Review Resolution Map

| Finding | Resolution Location | Scope Effect |
| --- | --- | --- |
| CR-006 | DS-011/DS-012, package-default contract, precedence, validation, Studio override/reset, business-consumption rule, file/change map | Makes complete application-owned defaults the standalone baseline; no mandatory standalone setup UI or copied state |
| CR-007 | Run-readiness union, host capability validation, lifecycle separation, standalone/Studio failure policy, conformance cases | Replaces overloaded resource `READY` with one truthful application-run invariant |
| CR-008 | DS-013, exact mixed-team builder propagation, composition graph/change map, prompt-semantic conformance | Bounded graph-authority correction; no catalog merge, package special case, or repository-wide DI rewrite |

### Architecture Round-4 And Round-5 Resolution Map

| Finding | Resolution Location | Scope Effect |
| --- | --- | --- |
| AR-007 | DS-012 evaluation precedence, aggregate/per-slot types, invalid-override branch/example, Studio reset, persistence semantics, sequence, tests, SV-010 | Keeps the approved three statuses while representing a valid package plus missing selected resource or stale saved member topology without fallback or package blame |
| ARCH-REV-005 | Architecture approval of SR-005 | Confirms the package-default, invalid-override, three-status, direct-use persistence, and graph-authority foundation before IR-007 |

### Code Review Round 12 Resolution Map

| Finding | Resolution Location | Scope Effect |
| --- | --- | --- |
| CR-009 | DS-011 portable launch configuration policy, validator/file mapping, tests, and SV-C35 | Retains exact supported token-count/pricing tuning while recursively rejecting credential, authorization, endpoint, and host-local fields; no broad token exception or compatibility branch |
| CR-012 | DS-012 selected-resource baseline/preview, provenance, refresh/concurrency, mixed-runtime editing, UI/API mapping, SV-C33/SV-C34 | Strengthens the existing launch authority so Studio can edit sparse alternate-resource overrides without definition traversal, post-overlay self-inheritance, or implicit fallback |

### Code Review Round 16 / API-E2E Round 5 Resolution Map

| Finding | Resolution Location | Scope Effect |
| --- | --- | --- |
| APIE2E-F005 / APIE2E-STANDALONE-MCP-001 | DS-014 native/server/configured-MCP projection and bounded route-registration map; SV-C36–SV-C38 corrected by SV-013 | Completes AC-005/AC-006 in standalone after package launch succeeds; API/E2E must inspect the descriptor rather than package `toolNames` |
| CR-013 | DS-014 existing registrar placement, composition/file map, and negative tool-boundary assertions | `CRR-016` classifies a Local Fix: add the route to standalone without redesigning the established subsystem or exposing native file tools |
| APIE2E-REPO-005 | Residual-risk/evidence sections only | Preserved as `Unclear` broad-suite diagnostic; it neither changes nor justifies the design |

### Discussion-Stage Self-Validation Resolution Map

The use-case, canonical-principles, refreshed-base, and downstream consistency audit is retained in [design-self-validation.md](design-self-validation.md). It produced thirteen bounded corrections across discussion and downstream rework:

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
| SV-009 | DS-011–DS-013, package baseline/override/readiness contract, negative package/host cases, prompt authority, and SR-004 consistency audit | Corrects CR-006–CR-008 without a standalone setup subsystem, package mutation, hidden seeding, or global prompt fallback |
| SV-010 | DS-012 invalid/stale host-override branch and two durable scenarios | Refines SV-009 so host-local saved-state invalidation is explicit within the same readiness authority and three-status contract |
| SV-011 | DS-011 recursive portable-field policy and DS-012 selected-resource baseline/preview/edit semantics | Resolves CR-009/CR-012 at the owning server boundaries without UI inference, data migration, compatibility handling, or fallback |
| SV-012 | Withdrawn broad Agent Tools runtime redesign based on superseded CRR-015 premise | Historical only; not implementation or review authority |
| SV-013 | DS-014 existing-route registration plus native/server/configured-MCP/external-gateway separation | Restores the verified source boundary, preserves ARCH-REV-006, and routes CR-013 as Local Fix |

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001, REQ-004 / AC-001, AC-003, AC-006 | Select/enter/reload/exit an installed app in Studio or start a configured standalone host | Investigation “Relevant Existing Behavior,” BEH-001 | Preserve complete Studio presentation lifecycle; add standalone root over the same bundle/runtime | Build/use: DS-007; Studio start: DS-001; Studio reload/exit: DS-009; standalone: DS-002/DS-008; shared invocation: DS-003 |
| BEH-002 | Contract | REQ-002 / AC-002, AC-003, AC-007 | Application calls `startApplication` | Investigation BEH-002; frontend SDK probe | Replace iframe-owned application entry with provider-owned bootstrap and one client construction path | DS-001, DS-002, DS-009 |
| BEH-003 | Contract | REQ-003 / AC-001, AC-004, AC-008 | Validate/discover package root and local application ID | Investigation BEH-003 | Reuse one read-only manifest-v4 package unchanged; standalone selection is configuration | DS-002, DS-005, DS-007, DS-008 |
| BEH-004 | System | REQ-004, REQ-005, REQ-007 / AC-005, AC-006, AC-010, AC-014–AC-016 | Backend starts a configured real run; runtime uses native tools and its issued Agent Tools session for eligible server/MCP tools | Investigation BEH-004; API-REV-005/CRR-016 | Preserve launch/readiness and native tools; mount the existing callback in standalone so `publish_artifacts`/`send_message_to`, handoff, and projection complete | DS-011, DS-012, DS-003, DS-004, DS-014 |
| BEH-005 | Operational | REQ-005 / AC-003, AC-009, AC-010 | Start Studio server or standalone application server | Investigation BEH-005; CR-013/CRR-016 | Preserve split composition roots; register the existing Agent Tools route in standalone while external MCP gateway remains Studio-only | DS-005, DS-014, then DS-001/DS-002 |
| BEH-006 | Operational | REQ-004–REQ-007 / AC-005, AC-006, AC-010, AC-011, AC-013–AC-016 | Developer runs application-folder development/build/validate/start commands or conformance | Current devkit/host implementation; API-REV-005/CRR-016 | Preserve passed validation/launch/native-tool paths; add only the missing standalone registrar and validate the actual MCP descriptor/tools list | DS-006, DS-007, DS-010–DS-012, DS-014 |
| BEH-007 | System | REQ-004, REQ-005, REQ-007 / AC-006, AC-012, AC-015, AC-016 | Backend ensure-ready, host override save/invalidation/reset, and recovery | Storage/orchestration/configuration investigation; AR-007 | Reuse current schemas/rows; preserve invalid saved rows as host-override diagnostics, block launch, and remove the row only on explicit reset | DS-003, DS-004, DS-005, DS-012 |
| BEH-008 | System | REQ-008 / AC-017 | Real package-team run constructs member prompts | Investigation BEH-008; CR-008 | Carry the exact graph-local team definition service through member context so package team instructions reach prompts | DS-013, then DS-004 |

The behavior map defines the real behavior this design serves. The spines below show how the target structure carries it.

## Reachable Product Use-Case To Spine Map

The authoritative reachable use-case inventory is in [requirements.md](requirements.md). No mechanically possible or unsupported future state is promoted into this map.

| Use Case ID | Primary / Secondary Spine(s) | Return / Local Spine(s) | Coverage Decision |
| --- | --- | --- | --- |
| UC-001 | DS-007, then DS-001 and DS-002 | DS-006 conformance evidence | Complete |
| UC-002 | DS-001, DS-003 | DS-004, DS-005 | Complete |
| UC-003 | DS-009 | DS-001 frontend startup state on explicit reload | Complete after DS-009 addition |
| UC-004 | DS-002, DS-008, DS-003, DS-014 | DS-004, DS-005 | Complete after bounded CR-013 Local Fix |
| UC-005 | DS-002 | DS-005 failed preparation | Complete |
| UC-006 | DS-001 or DS-002 | Frontend startup state machine | Complete |
| UC-007 | DS-003 | Request result; DS-005 readiness gate | Complete |
| UC-008 | DS-003 | DS-004 live return/event path; DS-005 stop | Complete |
| UC-009 | DS-011, DS-012, DS-003, DS-004, DS-014 | Existing native/runtime loops; DS-005 platform readiness/stop | Complete after bounded CR-013 Local Fix |
| UC-010 | DS-003 | DS-005 storage/readiness | Complete |
| UC-011 | DS-004 | DS-005 R1–R3 recovery | Complete |
| UC-012 | DS-012, DS-003 | DS-005 platform failure or application-run non-runnable result; retained engine authority | Complete after readiness separation |
| UC-013 | DS-008, DS-002 | DS-005 readiness | Complete |
| UC-014 | DS-005 | Existing stop/cleanup spine | Complete |
| UC-015 | DS-006, DS-007 | DS-005 process cleanup | Complete |
| UC-016 | DS-007, then DS-001/DS-002 | Frontend startup state; static dependency checks | Complete |
| UC-017 | DS-002, DS-008, DS-014 | Provider origin normalization, browser ingress origin policy, and established internal capability auth | Complete after bounded CR-013 Local Fix |
| UC-018 | DS-010–DS-012, DS-014, then DS-002/DS-008 | DS-005 production process lifecycle/stop | Complete after bounded CR-013 Local Fix |
| UC-019 | DS-011 | Package-validation diagnostic return, including recursive portable-field policy | Complete after SR-006 correction |
| UC-020 | DS-012 | Selected-resource preview, sparse override save/edit/delete, and readiness recomputation | Complete after SR-006 correction |
| UC-021 | DS-012 | Host-capability diagnostic return; DS-005 process cleanup | Complete after SR-004 correction |
| UC-022 | DS-013, then DS-004 | Member prompt semantic assertion | Complete after SR-004 correction |
| UC-023 | DS-012 | Saved shared-resource deletion/stale-member invalidation -> host-override issue -> blocked launch -> explicit reset/delete -> package-default reevaluation | Complete after SR-005 correction |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| [sources/autobyteus-vertical-application-developer-experience-proposal.md](sources/autobyteus-vertical-application-developer-experience-proposal.md) | Original universal-application vision | REQ-001–REQ-008 / AC-001–AC-017 | Product-direction input; illustrative contracts are not copied directly | Input source; approval `N/A` |
| [proposal-critical-analysis.md](proposal-critical-analysis.md) | Repository-backed readiness assessment and bounded recommendation | REQ-001–REQ-008 / AC-001–AC-017 | Supplies the accepted/revised/deferred decisions that constrain this design | Approved/refined through 2026-07-30 with identity/account excluded, native commands confirmed, package-default/optional-override behavior clarified, and CRR-016 tool-boundary correction applied |
| [design-self-validation.md](design-self-validation.md) | Use-case simulation, reachability classification, spine coverage, canonical design-principles audit, and latest-base reconciliation | REQ-001–REQ-008 / AC-001–AC-017 | Validates this design and records SV-001–SV-013 corrections through downstream rework | Complete validation evidence; approval `N/A` |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger approved requirement plus bounded downstream Local Fix`
- Current design issue found: `No`
- Root cause classification: `Missing Composition Registration`
- Refactor needed now: `No`
- Evidence: standalone run provisioning advertises the established Agent Tools session callback but the standalone composition omits the same registrar used by Studio. Reviewed source verifies native file tools are separate and the existing route/session/catalog/dispatcher/adapters already work.
- Design response: Preserve every ARCH-REV-006/CRR-014 launch/edit/prompt decision and the existing Agent Tools subsystem. Add only `registerAgentToolsMcpRoutes(app)` to standalone before static fallback; correct tool expectations and keep external gateway Studio-only.
- Refactor rationale: CRR-016 proves the route omission is local. A broad runtime/ports/publication redesign would violate proportionality and the existing-capability reuse principle.
- Intentional deferrals and residual risk: Manifest/release vNext, packaged/versioned skill/tool dependencies, marketplace execution, optimized distribution, and unrelated singleton cleanup remain deferred. `APIE2E-REPO-005` remains separately Unclear.

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
- **Standalone-capable project:** An application project whose source-only devkit config declares `standalone.enabled: true`; its current package manifest remains v4.
- **Package launch baseline:** Application-owned runtime/model values resolved from the manifest-selected bundled resource, enclosing application-owned team defaults, and leaf application-owned agent defaults. It contains no secrets or host endpoints.
- **Selected-resource launch baseline:** The exact currently selected bundle/shared agent or team’s definition-derived runtime/model values before any sparse host field override. For the manifest selection it equals the package baseline; for an alternate selection it is computed by the same server owner.
- **Selection preview:** A no-write, identity-bound evaluation of an unsaved execution-resource selection that returns either its selected-resource baseline or structured selection issues.
- **Host launch override:** Optional persisted Studio/host delta that selects a resource and/or overlays sparse fields without modifying/copying resource definitions.
- **Effective launch configuration:** The selected resource plus complete per-leaf runtime/model profile and field provenance after the selected-resource baseline and optional sparse host fields are combined.
- **Application-run readiness:** `RUNNABLE`, `INVALID_PACKAGE`, or `HOST_REQUIREMENT_MISSING`; distinct from process/platform lifecycle health. Host-local override invalidity and host capability absence share the last terminal status but are never conflated because every issue has a closed scope.
- **Runtime-native tools:** Capabilities supplied directly by Codex/Claude, including native file operations. They are not exposed by the server Agent Tools MCP route merely because their names appear in package configuration.
- **Internal Agent Tools MCP transport:** Existing machine-to-process callback at `/mcp/agent-tools/:sessionId` for eligible server-owned adapters and configured `ToolOrigin.MCP` tools. Its descriptor `enabled_tools` is a runtime projection, not a copy of package `toolNames`; it is not browser bootstrap or user authentication.
- **External MCP gateway:** Optional generic Studio integration at `/mcp/gateway`; it does not issue/resolve Agent Tools run sessions and is absent from standalone.

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
- Required action: Register the existing Agent Tools MCP registrar in standalone before static fallback. Do not add native file adapters, an alternate/legacy route, or an external-gateway proxy. Existing route/session/catalog/dispatcher ownership remains unchanged by CR-013.
- Preserved current protocol: Studio iframe messages retain their current on-wire `contractVersion: "4"` value and schema. Code symbols become unversioned. The protocol is not a compatibility fallback and is not exposed as the universal application startup API.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Per-app `db/app.sqlite`, `db/platform.sqlite`, logs/runtime files, plus `applications/_global/db/orchestration.sqlite`; volume is installation-dependent.
- Relevant code-model/semantic change: configuration DTOs distinguish manifest package baseline, computed selected-resource baseline, persisted sparse host override, and effective configuration. The no-write selection preview and selected baseline are derived projections only. Physical table/JSON fields, storage layout, stores, migrations, bindings, events, and recovery services remain authoritative.
- Normal reader/writer behavior and representative evidence: `ApplicationStorageLifecycleService` prepares the two per-app databases; the worker receives only app storage context; orchestration stores own reserved platform state. See application storage/orchestration docs in investigation notes.
- Required semantics and invariants under direct use: Current stored launch-profile rows are read as sparse host overrides. Valid rows select a resource and overlay its current computed definition baseline. Invalid/unresolvable or topology-stale rows remain stored, are projected with `HOST_OVERRIDE` issues, and block launch; they are neither auto-deleted nor bypassed. No row means the manifest package baseline. Selected baselines/previews are never stored. Explicit Reset deletes the row. Studio canonical application identity and storage root remain unchanged. Standalone uses a separate data root and a stable current-format canonical identity derived from package ID `standalone` plus the configured local application ID. Standalone recovery activates only `persistedKnownApplicationIds ∩ {selection.applicationId}`; dormant state for another previously selected local application is preserved but is never recovered or exposed.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Standalone and Studio installations do not silently share live databases. Agent Tools session IDs/token hashes are ephemeral process memory, revoked/cleared at stop, and never added to these stores. Copy/import of business data is a separate future feature.
- Decision: `Directly Usable — No Migration`
- Decision rationale: Current stored fields map directly to the override DTO and existing complete rows remain valid. Package defaults are read from immutable definition files and are never seeded into the database. Rewriting databases would provide no semantic benefit and would add corruption, I/O, recovery, and rollout risk.
- Acceptance criteria or design constraints supported: AC-006, AC-010, and AC-012.

No migration plan is required.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002 | Studio route entry | Business UI mounted with shared application client | `ApplicationStartupCoordinator` plus Studio host lifecycle | Preserves current host while removing app-level iframe coupling |
| DS-002 | Primary End-to-End | BEH-001, BEH-002, BEH-003, BEH-004 | Standalone process/root request | Runnable business UI mounted at `/` with same application client | `StandaloneApplicationHost` plus `ApplicationLaunchConfigurationService` and `ApplicationStartupCoordinator` | Proves the second host only after the package baseline is host-runnable |
| DS-003 | Primary End-to-End | BEH-004, BEH-007 | Runnable frontend backend operation | Application worker handler result | `ApplicationBackendApiGatewayService` | Ensures hosts share one guarded backend path |
| DS-004 | Return-Event | BEH-004, BEH-007 | App backend starts agent/team | Runtime events/artifacts/notifications reach app | `ApplicationOrchestrationHostService` and existing event/artifact owners | Proves real runtime equivalence, not only static hosting |
| DS-005 | Bounded Local | BEH-003, BEH-005, BEH-007 | Server composition start | Process/platform ready/stopped | `ApplicationPlatformLifecycle` | Keeps process health reusable and distinct from per-application run readiness |
| DS-006 | Operational Development | BEH-006 | `pnpm dev` or `pnpm dev:studio` in an application project | Project-specific inputs resolve through one devkit pack owner and the real standalone or Studio session remains ready across supported source rebuilds | Devkit config/pack and development-session owners delegating to real host owners | Gives developers the native real-host workflow, supports maintained non-default layouts, and removes ambiguous mock/custom-builder defaults |
| DS-007 | Operational Portability | BEH-001, BEH-003, BEH-006 | Application source/package command | The same unchanged package digest completes both real host scenarios | Dual-host conformance command/harness over the devkit package owner | Makes “build once, use twice” a verifiable production/deployment invariant rather than a narrative claim |
| DS-008 | Secondary End-to-End | BEH-001, BEH-003, BEH-005 | Standalone browser root/asset/navigation request | Selected application UI starts without platform-path collision or unsafe fallback | `StandaloneApplicationHost` static-route owner | Carries AC-009 through root, relative assets, SPA navigation, and reserved platform routes |
| DS-009 | Secondary End-to-End | BEH-001, BEH-002 | Studio reload/exit/route-leave action | Fresh iframe launch or restored Studio shell with route-visit launch state cleared | `ApplicationShell` presentation owner plus `applicationHostStore` launch-state owner | Preserves the complete current Studio presentation lifecycle, not only initial mount |
| DS-010 | Operational Production | BEH-001, BEH-003–BEH-007 | `pnpm build`/`pnpm validate` followed by `pnpm start` | Existing package passes DS-011 and DS-012, then runs through production standalone with separate durable data and graceful stop | Devkit facade, launch configuration owner, and standalone composition | Makes production start depend on a valid package and runnable host, not UI-time failure |
| DS-011 | Operational Validation | BEH-004, BEH-006 | Standalone-enabled project pack/validate | Valid standalone package or exact `INVALID_PACKAGE` diagnostics | `ApplicationStandalonePackageValidator` exposed through devkit pack/project validate | Prevents incomplete application-owned defaults from becoming an artifact/runtime failure |
| DS-012 | Primary End-to-End | BEH-004, BEH-005, BEH-007 | Studio loads/selects/edits a resource, or either host evaluates launch | Authoritative selected baseline/preview, sparse edit/save/reset, then guarded run or scoped non-runnable diagnosis | `ApplicationLaunchConfigurationService` | Centralizes manifest and selected-resource baselines, no-write preview, sparse overlay, host validation, and launch guard without fallback |
| DS-013 | Primary Runtime Semantic | BEH-008 | Package-team launch creates first member | Final member system prompt contains graph-local package team instruction | Graph-local run authorities plus `MemberTeamContextBuilder` | Proves runtime behavior uses the exact definition graph, not a global fallback |
| DS-014 | Bounded Runtime Callback | BEH-004, BEH-005, BEH-006 | A configured Codex/Claude runtime receives the established Agent Tools descriptor and invokes an eligible server/MCP tool | Standalone reaches the existing route; `publish_artifacts`/`send_message_to`, handoff, and projected artifacts complete while native file tools stay native | Existing Agent Tools MCP route/session/catalog/dispatcher owners; standalone composition owns only route mounting | Completes the missing host mount without redesigning the gateway or exposing the external MCP gateway |

## Primary Execution Spine(s)

### DS-001 — Studio application startup

`Studio route/setup -> ensure backend ready -> iframe launch hints -> StudioIframeBootstrapProvider -> iframe v4 ready/bootstrap -> ApplicationRuntimeBootstrap normalization -> ApplicationStartupCoordinator -> ApplicationClient -> business mount`

### DS-002 — Standalone application startup

`Standalone composition -> configured bundle selection -> DS-011 package validation -> DS-005 platform preparation -> DS-012 effective profile/host validation -> RUNNABLE -> root UI asset -> StandaloneSameOriginBootstrapProvider -> GET /_autobyteus/bootstrap -> StandaloneApplicationBootstrapPayload validation -> same-origin endpoint normalization -> ApplicationRuntimeBootstrap -> ApplicationStartupCoordinator -> ApplicationClient -> business mount`

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
  standalone: { enabled: true },
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

`Application project -> pnpm build -> autobyteus-app pack -> dist/importable-package + DS-011 validation -> optional pnpm validate -> pnpm start -> autobyteus-app start -> resolve package root + source-manifest local ID + app-data/host/port config -> DS-011 validate existing package without rebuilding -> startStandaloneApplicationHost -> buildStandaloneApplicationServerComposition -> DS-005 platform preparation -> DS-012 RUNNABLE -> listen -> DS-008 root -> DS-002 bootstrap/business mount -> signal -> DS-005 graceful stop`

The command facade derives `localApplicationId` from the project's source `application.json` and passes it explicitly to selection. The standalone selection service still never scans a multi-application package and silently chooses the first entry.

## Application Launch Configuration And Run-Readiness Contract

### DS-011 — Standalone package-default validation

`source application -> devkit project config -> canonical pack owner -> read-only graph-local package validation -> portable launch config policy -> validated package or exact package diagnostic`

`standalone.enabled` is source-only `autobyteus-app.config.mjs` metadata. It is explicitly `true` in the starter, Brief, and Socratic configs. It is not copied into `application.json` and therefore does not change manifest v4. `dev` and `start` reject a project that is not enabled. `pack` and project-root `validate` apply standalone validation only when enabled; an explicit package-only validation can request the standalone target, while structural package validation remains reusable for Studio-only imports.

`validateStandaloneApplicationPackage({ packageRoot, localApplicationId })` is a pure exported boundary in `autobyteus-server-ts`. It constructs a graph-local read-only bundle/agent/team catalog using the existing file providers and canonical identity/traversal rules. It does not initialize `AppConfig`, Prisma, vault, configuration stores, runtime processes, or global singleton catalogs. Devkit already depends on the server project for the standalone process API, so using this narrow export adds no dependency cycle and avoids a second parser.

For each required slot, package validation requires:

1. a `defaultExecutionResourceRef`;
2. `source: "bundle"` so the baseline is application-owned;
3. a resource kind allowed by the slot;
4. a resolvable application-owned agent/team definition with no cycle/stale member;
5. every effective leaf to resolve non-empty `runtimeKind` and `llmModelIdentifier` using package-only precedence; and
6. every package launch field to pass `ApplicationPortableLaunchConfigPolicy`.

`ApplicationPortableLaunchConfigPolicy` is the one package-portability field authority. Runtime adapters declare closed root fields plus typed nested schemas. The policy recursively traverses objects and arrays, canonicalizes each path/key, and applies these rules:

- accept portable runtime/model values and the exact runtime-supported tuning fields, including `max_tokens`, `token_limit`, and `safety_margin_tokens`;
- accept only the explicitly typed pricing schema and validate its value types/ranges, even where a legitimate pricing key contains `token`;
- reject password/passphrase, secret/credential, API key/client secret/private key, authorization/auth-header/bearer, access/refresh/ID-token or token-value, endpoint/base-URL/API-base/host, workspace root, and machine-path semantics at any depth, including under `extra_params`;
- treat any other token-bearing key outside the closed token-count/pricing schema as forbidden rather than maintaining a broad token exception; and
- inspect field names, paths, and declared schemas—not arbitrary prose values such as a system message.

A rejection is `PACKAGE_FORBIDDEN_HOST_FIELD` and includes the exact configuration path and non-secret reason. Diagnostics never echo the value. There is no compatibility allowlist, runtime-default fallback, or special case for Brief/Socratic.

The user-confirmed maintained-application baseline is applied to all three effective leaves:

| Application leaf | Current repository value | Target package default |
| --- | --- | --- |
| Brief researcher | `runtimeKind: "autobyteus"`; model absent | `runtimeKind: "codex_app_server"`, `llmModelIdentifier: "gpt-5.6-luna"` |
| Brief writer | `runtimeKind: "autobyteus"`; model absent | `runtimeKind: "codex_app_server"`, `llmModelIdentifier: "gpt-5.6-luna"` |
| Socratic tutor | `runtimeKind: "codex_app_server"`, `llmModelIdentifier: "gpt-5.6-sol"` | `runtimeKind: "codex_app_server"`, `llmModelIdentifier: "gpt-5.6-luna"` |

Each target `agent-config.json` therefore contains:

```json
{
  "defaultLaunchConfig": {
    "runtimeKind": "codex_app_server",
    "llmModelIdentifier": "gpt-5.6-luna"
  }
}
```

This is a package-owned portable selection, not a promise that every host has Codex/Luna access. DS-012 validates the exact runtime, model, and credentials. It must report `HOST_REQUIREMENT_MISSING` with `HOST_CAPABILITY` issues if Luna is unavailable; it must not substitute Socratic’s previous Sol model or any platform default.

### DS-012 — Effective launch configuration and host readiness

`Studio setup load -> manifest package baseline + current selected-resource baseline -> optional unsaved selection preview -> sparse saved host override validation/overlay -> effective per-leaf profile + provenance -> host validation -> Studio presentation/save/reset`

`Standalone selected start -> manifest package baseline -> absent optional override -> effective per-leaf profile + provenance -> host validation -> RUNNABLE -> guarded business mount -> requireRunnableConfiguration(slot) -> real runtime launch`

#### Authoritative owner

`ApplicationLaunchConfigurationService` is the only owner above definition baselines, override persistence, and host capability validation. It replaces the dual meaning of `ApplicationExecutionResourceConfigurationService`; callers do not depend on the service and its store/builder/normalizer/provider internals simultaneously. It owns:

- manifest package-baseline resolution from exact graph-local definition services;
- selected-resource baseline resolution for the current saved selection;
- no-write baseline preview for an unsaved selection;
- declared slot and saved resource selection (`saved host selection > manifest default`) without silent fallback;
- host override normalization/persistence/removal;
- preservation and diagnosis of invalid/unresolvable saved overrides;
- effective profile construction with per-field provenance;
- required-slot/package validity;
- host runtime/model/credential validation through narrow ports; and
- `getApplicationLaunchConfigurationView`, `previewSelectedResourceBaseline`, `upsertOverride`, `removeOverride`, `evaluateApplicationReadiness`, and `requireRunnableConfiguration`.

`ApplicationLaunchResourceBaselineBuilder` is an internal graph-local collaborator that resolves an exact bundle or shared resource. It is the clean-cut replacement for the misleading `ApplicationLaunchPackageBaselineBuilder` name; no alias remains. The store remains an internal persistence adapter. `ApplicationDefinitionRuntimeReadiness` continues to validate catalogs/tools/skills and delegates required-slot launch semantics to the launch authority; it may not independently infer runnable state.

#### Four semantically distinct stages

For each slot the authority keeps four meanings separate:

1. **`packageBaseline`:** definition values for the manifest-selected bundled resource. Standalone package validation requires it to be complete.
2. **`selectedResourceBaseline`:** definition values for the currently selected resource before any host field overlay. It equals `packageBaseline` only when the selected ref is the manifest ref. An alternate shared/bundled resource is resolved from that exact definition graph.
3. **`savedOverride`:** the persisted sparse host selection/field delta, including topology identity where applicable.
4. **`effectiveConfiguration`:** the selected baseline after only a valid sparse host override is overlaid.

No stage substitutes for another. In particular, Studio never uses `effectiveConfiguration` as the inheritance source for the override that produced it, and it never reconstructs a selected baseline from available-resource summaries or definition catalogs.

#### Exact precedence

For a single agent:

`host agent override -> selected agent definition default`

For every selected team leaf, each `runtimeKind` and `llmModelIdentifier` field resolves independently in this order:

1. exact host member override for `memberRouteKey`;
2. host team/slot default override;
3. innermost enclosing selected team default with a non-null value;
4. each outer enclosing selected team default, nearest first;
5. selected leaf agent default.

Package validation applies steps 3–5 to the manifest-selected bundled resource. Standalone fresh-root execution has no host override, so it also uses only 3–5. No value comes from `RuntimeKind.AUTOBYTEUS`, an LLM factory default, first listed provider/model, ambient catalog, prior effective result, business request, copied Studio row, or package-ID branch.

`llmConfig` is atomic with its source launch layer, not merged field-by-field across incompatible runtime/model selections. A definition layer’s `llmConfig` applies only when that same layer supplies the effective runtime/model pair or validates against the resulting pair. If a host override changes runtime or model without an explicit supported tuning override, inherited runtime-specific `llmConfig` becomes null. `workspaceRootPath` remains host override/runtime context, never a definition baseline.

#### Tight shared shapes and provenance

```ts
type ApplicationLaunchDefinitionValueSource =
  | { kind: "PACKAGE_TEAM_DEFAULT"; teamDefinitionId: string }
  | { kind: "PACKAGE_AGENT_DEFAULT"; agentDefinitionId: string }
  | { kind: "SELECTED_RESOURCE_TEAM_DEFAULT"; teamDefinitionId: string }
  | { kind: "SELECTED_RESOURCE_AGENT_DEFAULT"; agentDefinitionId: string };

type ApplicationLaunchValueSource =
  | ApplicationLaunchDefinitionValueSource
  | { kind: "HOST_MEMBER_OVERRIDE"; memberRouteKey: string }
  | { kind: "HOST_SLOT_OVERRIDE" };

type ApplicationResolvedLaunchBaselineLeaf = {
  memberRouteKey: string | null;
  memberName: string | null;
  agentDefinitionId: string;
  runtimeKind: string | null;
  llmModelIdentifier: string | null;
  llmConfig: Record<string, unknown> | null;
  provenance: {
    runtimeKind: ApplicationLaunchDefinitionValueSource | null;
    llmModelIdentifier: ApplicationLaunchDefinitionValueSource | null;
    llmConfig: ApplicationLaunchDefinitionValueSource | null;
  };
};

type ApplicationResolvedResourceLaunchBaseline = {
  slotKey: string;
  executionResourceRef: ApplicationExecutionResourceRef;
  resourceDefinitionId: string;
  resourceKind: "AGENT" | "AGENT_TEAM";
  leaves: ApplicationResolvedLaunchBaselineLeaf[];
};

type ApplicationEffectiveLeafLaunchProfile = {
  memberRouteKey: string | null;
  memberName: string | null;
  agentDefinitionId: string;
  runtimeKind: string;
  llmModelIdentifier: string;
  llmConfig: Record<string, unknown> | null;
  workspaceRootPath: string | null;
  provenance: {
    runtimeKind: ApplicationLaunchValueSource;
    llmModelIdentifier: ApplicationLaunchValueSource;
    llmConfig: ApplicationLaunchValueSource | null;
    workspaceRootPath: "HOST_OVERRIDE" | "APPLICATION_RUNTIME";
  };
};

type ApplicationEffectiveLaunchConfiguration = {
  slotKey: string;
  executionResourceRef: ApplicationExecutionResourceRef;
  resourceDefinitionId: string;
  resourceKind: "AGENT" | "AGENT_TEAM";
  leaves: ApplicationEffectiveLeafLaunchProfile[];
};

type ApplicationPackageLaunchIssue =
  ApplicationLaunchIssue & { scope: "PACKAGE" };

type ApplicationHostLaunchIssue =
  ApplicationLaunchIssue & { scope: "HOST_OVERRIDE" | "HOST_CAPABILITY" };

type ApplicationLaunchSelectionIssue = {
  scope: "SELECTION";
  code: "SELECTION_UNAVAILABLE" | "SELECTION_NOT_ALLOWED" | "SELECTION_TOPOLOGY_INVALID";
  applicationId: string;
  slotKey: string;
  executionResourceRef: ApplicationExecutionResourceRef;
  message: string;
};

type ApplicationLaunchReadiness =
  | { status: "RUNNABLE"; issues: [] }
  | { status: "INVALID_PACKAGE"; issues: ApplicationPackageLaunchIssue[] }
  | { status: "HOST_REQUIREMENT_MISSING"; issues: ApplicationHostLaunchIssue[] };

type ApplicationHostOverrideState =
  | "ABSENT"
  | "VALID"
  | "INVALID"
  | "NOT_EVALUATED";

type ApplicationLaunchSlotView = {
  slot: ApplicationExecutionResourceSlotDeclaration;
  packageBaseline: ApplicationResolvedResourceLaunchBaseline | null;
  selectedResourceBaseline: ApplicationResolvedResourceLaunchBaseline | null;
  savedOverride: ApplicationExecutionResourceOverride | null;
  savedOverrideState: ApplicationHostOverrideState;
  effectiveConfiguration: ApplicationEffectiveLaunchConfiguration | null;
  issues: ApplicationLaunchIssue[];
  canResetToPackageDefaults: boolean;
  updatedAt: string | null;
};

type ApplicationLaunchConfigurationView = {
  applicationId: string;
  slots: ApplicationLaunchSlotView[];
  readiness: ApplicationLaunchReadiness;
};

type ApplicationLaunchSelectionPreview =
  | {
      status: "RESOLVED";
      applicationId: string;
      slotKey: string;
      executionResourceRef: ApplicationExecutionResourceRef;
      selectedResourceBaseline: ApplicationResolvedResourceLaunchBaseline;
      issues: [];
    }
  | {
      status: "INVALID_SELECTION";
      applicationId: string;
      slotKey: string;
      executionResourceRef: ApplicationExecutionResourceRef;
      selectedResourceBaseline: null;
      issues: ApplicationLaunchSelectionIssue[];
    };
```

Baseline provenance contains definition sources only. `HOST_SLOT_OVERRIDE` and `HOST_MEMBER_OVERRIDE` can occur only after overlay in `effectiveConfiguration`; a shared resource’s own definition default is never mislabeled as a host field override. The readiness union contains only aggregate classification and typed issues; configuration data has exactly one home in `slots`. Selection preview is an edit projection, not a readiness result and not persisted state.

#### Stored-view evaluation

Evaluation order and invariants are exact:

1. Resolve every manifest `packageBaseline` independently of saved host state. A package-baseline error yields aggregate `INVALID_PACKAGE`, package-scoped issues, and `savedOverrideState: "NOT_EVALUATED"` for affected stored rows.
2. If every required package baseline is valid, validate each saved override’s source/kind/ref and resolve that exact selected resource using `ApplicationLaunchResourceBaselineBuilder`.
3. With no saved override, `selectedResourceBaseline` equals `packageBaseline`, `savedOverrideState` is `ABSENT`, and the baseline becomes the candidate effective configuration.
4. With a valid saved resource selection, `selectedResourceBaseline` is its current pre-overlay definition baseline. With a valid sparse field override, `savedOverrideState` is `VALID` and the fields overlay that selected baseline using the exact precedence/provenance rules.
5. If the selected resource still resolves but saved member topology is stale, expose the resource’s current `selectedResourceBaseline` for diagnosis/editing, preserve the raw row, set the affected `effectiveConfiguration` null, emit `HOST_OVERRIDE/SAVED_MEMBER_TOPOLOGY_STALE`, and block run. The UI may offer explicit replacement using current topology; it may not silently drop stale members or treat the current baseline as executable.
6. If the saved selected resource is deleted/unavailable/not allowed, set `selectedResourceBaseline` and `effectiveConfiguration` null, preserve the raw row/ref, emit the exact `HOST_OVERRIDE` issue, and block run. `packageBaseline` remains explanatory only and is not substituted.
7. Only fully constructed effective configurations proceed to runtime/model/credential validation. A capability failure preserves that slot’s effective configuration, emits a `HOST_CAPABILITY` issue, and yields `HOST_REQUIREMENT_MISSING`.
8. `RUNNABLE` means every required slot has a non-null complete `effectiveConfiguration` and no issue. `requireRunnableConfiguration` returns a slot only under that aggregate state; otherwise it throws the structured aggregate/slot issues.

`HOST_REQUIREMENT_MISSING` retains one product meaning: the package is valid but current host-local state prevents execution. `HOST_OVERRIDE` versus `HOST_CAPABILITY`, resource/member identity, and value provenance provide exact diagnosis without a fourth terminal status. `canResetToPackageDefaults` is true exactly when `savedOverride` is non-null; it denotes the delete action, not guaranteed host readiness after deletion.

#### No-write selection preview

`previewSelectedResourceBaseline(applicationId, slotKey, executionResourceRef)` is exposed through a narrow Studio route such as `POST /applications/:applicationId/execution-resource-configurations/:slotKey/selection-preview`. It:

1. validates application/slot/ref/source/kind against current allowed resources;
2. resolves the exact selected resource through the same graph-local baseline builder used by GET/PUT;
3. returns the closed `RESOLVED`/`INVALID_SELECTION` union above;
4. performs no store read/write, override overlay, host capability evaluation, package-default fallback, or readiness transition; and
5. returns structured selection issues without secret data.

Studio requests preview immediately when the draft resource ref differs from the persisted view. Each request carries the exact application/slot/ref identity; the UI cancels or discards an older result if the selection changes. Save is disabled while preview is pending or invalid. Setup load, selection change, definition/catalog refresh, and save/reset completion all recompute or reload the projection. `upsertOverride` independently re-resolves the selected baseline and is the final concurrency authority; if resource identity/topology changes between preview and PUT, PUT rejects structurally and Studio reloads instead of saving against stale context.

#### Mixed-runtime Studio editing

The selected baseline/preview returns every effective leaf’s runtime/model and definition provenance. Studio represents a blank team-wide runtime/model as **inherit per member**, not as AutoByteus or the previous effective selection:

- if all inherited leaves share one runtime, the team-wide model control may use that runtime’s model catalog;
- if inherited leaves have mixed runtimes and no explicit team-wide runtime, display `Mixed / inherited per member` and disable team-wide model selection;
- member editors use each leaf’s resolved runtime/model catalog;
- selecting a team-wide model requires selecting an explicit common runtime first, and both become sparse `HOST_SLOT_OVERRIDE` values; and
- effective precedence remains member override > slot/team override > selected-resource definition baseline.

The web receives catalogs and preview/view projections through supported APIs. It never traverses agent/team definitions, reimplements precedence, fills a blank runtime, or infers a baseline from `packageBaseline`/`effectiveConfiguration`.

#### Invalid saved override example

After a Studio user saves shared team `team-shared-1` and deletes that definition, the view keeps the valid manifest baseline and the raw row but has no selected/effective configuration:

```ts
{
  readiness: {
    status: "HOST_REQUIREMENT_MISSING",
    issues: [{
      scope: "HOST_OVERRIDE",
      code: "SAVED_RESOURCE_UNAVAILABLE",
      slotKey: "draftingTeam",
      message: "The saved Studio resource is no longer available."
    }]
  },
  slots: [{
    slot: draftingTeamSlot,
    packageBaseline: completeBundledBriefBaseline,
    selectedResourceBaseline: null,
    savedOverride: deletedSharedTeamOverride,
    savedOverrideState: "INVALID",
    effectiveConfiguration: null,
    canResetToPackageDefaults: true,
    issues: [sameHostOverrideIssue],
    updatedAt: savedAt
  }]
}
```

Reset explicitly deletes the row, reevaluates the package baseline, and may yield `RUNNABLE` if host capabilities pass. There is no automatic fallback, repair, or data rewrite.

#### Contract migration and issue semantics

The contract migration is a clean semantic rename/split, not a compatibility layer:

| Current public/internal name | Target current-contract name or action | Semantic boundary |
| --- | --- | --- |
| `ApplicationConfiguredAgentLaunchProfile` | `ApplicationAgentLaunchOverride` | Sparse host-owned agent override only |
| `ApplicationConfiguredTeamLaunchDefaults` | `ApplicationTeamLaunchOverrideDefaults` | Sparse host-owned slot/team default override only |
| `ApplicationConfiguredTeamMemberProfile` | `ApplicationTeamMemberLaunchOverride` | Sparse host-owned member override only |
| `ApplicationConfiguredTeamLaunchProfile` | `ApplicationTeamLaunchOverride` | Host-owned team override aggregate only |
| `ApplicationConfiguredLaunchProfile` | `ApplicationLaunchOverride` | Union of host override shapes; never a baseline/effective profile |
| `ApplicationConfiguredExecutionResource` | `ApplicationExecutionResourceOverride` | Optional saved resource selection plus sparse launch override |
| `ApplicationExecutionResourceConfigurationStatus` | Delete; use aggregate `ApplicationLaunchReadiness.status` plus per-slot `savedOverrideState` | No resource-selected `READY` meaning remains |
| `ApplicationExecutionResourceConfigurationView` | `ApplicationLaunchConfigurationView` | Package baseline, selected baseline, optional saved override, effective result, and aggregate readiness |
| `ApplicationLaunchPackageBaselineBuilder` | `ApplicationLaunchResourceBaselineBuilder` | Resolves any exact selected resource; no misleading package-only name/alias |
| `agentResources.getConfigured(slotKey)` | `agentResources.requireRunnable(slotKey)` | Backend receives only guarded complete effective configuration |

All source, contract, SDK, Studio route/store/UI, server, tests, docs, and generated-output consumers move together. Existing persisted JSON remains readable in place; there is no alias export, compatibility reader, or second status/profile family.

`ApplicationLaunchIssue` remains a closed family:

- `PACKAGE` covers incomplete package defaults, invalid bundled topology, and `PACKAGE_FORBIDDEN_HOST_FIELD`; only this scope produces `INVALID_PACKAGE`.
- `HOST_OVERRIDE` covers saved unavailable/not-allowed/malformed resources and stale topology; these produce `HOST_REQUIREMENT_MISSING`.
- `HOST_CAPABILITY` covers unavailable runtime, unknown/unavailable exact model, and missing provider/runtime credential/endpoint readiness; these also produce `HOST_REQUIREMENT_MISSING`.
- `ApplicationLaunchSelectionIssue` is separate edit-time diagnosis for an unsaved invalid selection. It never changes persisted readiness until a valid override is saved.

Diagnostics never expose secret values. They retain exact application/slot/resource and optional member/agent/config-path identity.

#### Host capability ports and failure policy

- `ApplicationRuntimeAvailabilityPort` adapts current `RuntimeAvailabilityService` and rejects an unknown/disabled runtime.
- `ApplicationModelAvailabilityPort` adapts `ModelCatalogService` and requires an exact `model_identifier` under the resolved runtime.
- `ApplicationProviderCredentialReadinessPort` adapts current provider/vault/runtime-specific readiness. It reports only configured/not configured/reason; package code never reads vault internals.
- These adapters are graph-local dependencies of `ApplicationLaunchConfigurationService`; it does not call process-global getters.

Process/platform P0–P9 readiness and application-run readiness are separate:

- **Standalone:** selection and DS-011 run before expensive process initialization. After P0–P9 prepare, the selected application is evaluated. A non-runnable result closes prepared resources and exits nonzero before `listen`, bootstrap, static business UI, or backend action.
- **Studio:** P0–P9 can succeed while one application is non-runnable. Studio shell/setup remains available; entry and business run are blocked by the same readiness result. The panel displays package baseline, selected-resource baseline, saved override/state, effective provenance, and host diagnostics.
- **Runtime guard:** `requireRunnableConfiguration(applicationId, slotKey)` reevaluates at the backend context boundary so later runtime/model/resource removal or topology drift cannot be bypassed.

#### Studio override, replacement, and reset

The existing `platform.sqlite` row is `ApplicationExecutionResourceOverride`: optional resource selection plus sparse agent/team/member launch values and topology identity. Existing complete rows deserialize directly. Selected-resource baseline and preview are computed projections and are never stored.

Studio setup behavior:

1. no row: show package/selected baseline and source badges; entry is enabled only when host validation returns `RUNNABLE`;
2. choose alternate: fetch its no-write preview before rendering inherited field values or enabling save;
3. edit/save: use only the preview/current selected baseline as inheritance, persist only explicit sparse fields plus selection/topology identity, then reload/recompute;
4. clear field: remove that host field so the exact selected-resource definition value becomes effective; never copy the old effective value into the row;
5. missing selected resource: show raw identity as unavailable, package baseline separately, blocked entry/run, and enabled Replace/Reset; do not preselect/execute the package default;
6. stale member topology: show current selected baseline plus stale route/member/agent details; require explicit Replace against current topology or Reset; do not auto-drop stale members;
7. Reset to package defaults: call `DELETE /applications/:applicationId/execution-resource-configurations/:slotKey`, remove the row, reload, and recompute; and
8. cancel/reset draft, if retained, remains a separate local edit action and is not labeled as package reset.

Reading or previewing never writes. A successful replacement PUT is an explicit user write; Reset DELETE is the only operation that abandons the saved override in favor of manifest package selection. There is no mandatory standalone setup UI. A later optional CLI/config adapter may supply the same sparse override contract but may not create a second profile model or make persistence necessary for a valid package.

#### Business consumption and removal

The backend context exposes `agentResources.requireRunnable(slotKey)` returning the complete effective resource/profile. Brief removes `BRIEF_STUDIO_TEAM_RESOURCE`, `fallbackExecutionResourceRef`, and `input.llmModelIdentifier` as launch rescue paths. `buildConfiguredTeamRunLaunch` is replaced by a builder that accepts the non-null effective team profile and cannot emit a preset from null. SDK/runtime launch validation remains defense in depth, not the first owner of completeness.

### DS-013 — Graph-local package-team prompt semantics

`Application backend real team launch -> createApplicationRunAuthorities(exact agent/team services) -> new MemberTeamContextBuilder(exact team service) -> MixedTeamRunBackendFactory root/subteam manager factory -> MixedTeamManager -> persistent/task-agent registries -> new/restored MixedAgentMemberHandle -> builder.build(teamDefinitionId) -> package team instruction -> member system prompt composer -> provider invocation`

Exact construction rules:

1. `createApplicationRunAuthorities` creates one `MemberTeamContextBuilder(input.agentTeamDefinitionService)`.
2. It passes that builder into every `MixedTeamManager` created by `MixedTeamRunBackendFactory`, including nested subteams through the existing manager factory closure.
3. `MixedTeamManager` passes it to `MixedPersistentMemberRegistry` and `MixedTaskAgentInstanceRegistry`.
4. Both registries pass it to every new and restored `MixedAgentMemberHandle`.
5. `MixedAgentMemberHandle` requires the builder; its `getMemberTeamContextBuilder()` fallback is removed.
6. The general non-application team composition may construct a builder from its own exact process catalog at its factory/composition boundary, but no member handle performs hidden catalog selection.

A focused durable test uses distinct graph-local and process-global catalogs, launches/reconstructs the package team through the real mixed path, captures the final member system prompt, and asserts the non-empty Brief `team.md` instruction section. A real API/E2E run rechecks provider/events/artifacts plus the prompt semantic. Catalog merge, package-ID conditional, global fallback, and a repository-wide DI rewrite are forbidden.

### DS-014 — Existing Agent Tools MCP route parity

Corrected forward spine:

`Brief backend -> guarded Codex/Claude team run -> native runtime file operation -> existing AgentToolMcpSessionService projects eligible server adapters/configured MCP-origin tools -> descriptor { /mcp/agent-tools/:sessionId, bearer, enabled_tools } -> standalone Fastify existing Agent Tools registrar -> existing authorization/catalog/dispatcher -> publish_artifacts / send_message_to -> writer handoff -> lifecycle events and projected artifacts`

#### Tool-surface classification

1. **Runtime-native tools:** Codex/Claude own native file capabilities. `read_file`/`write_file` are not added to Agent Tools MCP merely because an application definition lists them.
2. **Eligible server-owned Agent Tools MCP adapters:** the existing default providers include `publish_artifacts`, `send_message_to`, browser, media, and task-delegation adapters. Only configured and available adapters enter the descriptor.
3. **Configured MCP-origin tools:** `ConfiguredMcpAgentToolSourceResolver` forwards registered definitions only when `origin === ToolOrigin.MCP`; these can also enter the per-run descriptor.
4. **External MCP gateway:** `/mcp/gateway` is a separate generic Studio surface and remains absent from standalone.

Package `toolNames`, the session descriptor's `enabledTools`, and MCP `tools/list` are therefore distinct. Tests and reports must inspect the latter two rather than infer gateway exposure from the package list.

#### Bounded composition correction

`buildStudioServerComposition` already calls `registerAgentToolsMcpRoutes(app)` and separately registers `/mcp/gateway`. `buildStandaloneApplicationServerComposition` must import and await the same existing Agent Tools registrar after Fastify/websocket setup and before `registerStandaloneApplicationStaticRoutes` installs `/*`.

The correction does not change the registrar signature or construct new session/catalog/dispatcher objects. Its default dependencies intentionally resolve the same established process-scoped authority already used by Codex/Claude session provisioning in the one-server-process composition. CRR-016 verified that this subsystem works in Studio and that no material ambiguity remains for the Local Fix.

The existing route keeps its current protocol and security behavior, including the bearer/session gate and established missing-authorization 401 versus unavailable-session 404 behavior. This ticket adds no alias, path builder, alternate route, user authentication, persistence, native-file adapter, external-gateway proxy, or broader public surface.

#### Exact implementation delta and validation boundary

Production change:

```ts
import { registerAgentToolsMcpRoutes } from "../agent-tools/mcp/agent-tools-mcp-routes.js";

// after websocket/plugin setup and before standalone static wildcard registration
await registerAgentToolsMcpRoutes(app);
```

Implementation-owned proof is bounded to composition wiring: the standalone route is registered before static fallback, an unauthenticated request reaches the existing 401 gate instead of generic/static 404, and `/mcp/gateway` remains absent. API/E2E owns the corrected runtime proof after source review: inspect descriptor/`tools/list`, require Brief `publish_artifacts` and `send_message_to`, do not require gateway `write_file`, and complete the native-file -> publish/message -> handoff/artifact journey.

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
| DS-010 | The production facade accepts only an existing package, applies standalone package and host readiness, and delegates one runnable process. | Validated package, explicit selection, effective profile, standalone process, durable data root | Devkit facade, launch configuration owner, server process API | Package/host diagnostics, signals, exit code |
| DS-011 | A standalone-enabled project cannot produce/pass validation unless every required bundled leaf has complete package-owned runtime/model defaults and recursively portable configuration. | Project capability, package graph, leaf baseline, portable config, validation result | `ApplicationStandalonePackageValidator` | Pure graph construction, schema-aware field policy, diagnostic formatting |
| DS-012 | One authority projects the manifest and selected-resource baselines, previews unsaved selections, overlays only valid sparse host fields, validates capabilities, and guards mount/run. | Package baseline, selected baseline/preview, sparse override/state, effective configuration, scoped issue, readiness | `ApplicationLaunchConfigurationService` | Definition builder, override store, runtime/model/credential ports, provenance |
| DS-013 | The exact graph-local team-definition authority reaches every member-context builder and final prompt. | Team definition, member handle, team context, system prompt | Application run authority construction | General-process composition adapter, prompt capture |
| DS-014 | Standalone mounts the same established Agent Tools route as Studio, so eligible server-owned/configured-MCP tools can reach the existing capability/session/catalog/dispatcher path while native tools remain runtime-owned. | Existing session descriptor, internal callback, eligible server/MCP tool route, handoff, artifact | Existing Agent Tools MCP subsystem; standalone composition owns route mounting only | Correct tool projection, registrar order, external-gateway exclusion |

## Spine Actors / Main-Line Nodes

- `startApplication` — thin public SDK entry.
- `ApplicationStartupCoordinator` — owns frontend startup state, provider selection result, shared client construction, business callback, failure containment, and disposal.
- `StudioIframeBootstrapProvider` — owns current iframe v4 hints, ready emission, parent/origin/correlation validation, and normalization.
- `StandaloneSameOriginBootstrapProvider` — owns top-level same-origin wire fetch/validation, root-relative path confinement, browser-origin HTTP/WS resolution, and runtime-bootstrap normalization.
- `StandaloneApplicationHost` — owns one configured application, root UI presentation, selected-app root-relative platform paths, network policy, and reserved platform namespace.
- `ApplicationProjectCommandService` — owns application-project config/source-manifest resolution and delegates pack, validate, development session, or production host start without becoming a runtime container.
- `StandaloneDevelopmentSession` / `StudioDevelopmentSession` — own watch/coalescing/rebuild and host-specific development-session cleanup; they do not implement server or Studio lifecycle.
- `startStandaloneApplicationHost` — narrow server-owned process API used by devkit `dev` and `start`; it constructs exactly one standalone composition and returns its address/close handle.
- `ApplicationPlatformLifecycle` — owns process/application-platform preparation, recovery, and shutdown sequencing; it does not decide per-application run configuration.
- `ApplicationStandalonePackageValidator` — owns pure package-default completeness for standalone-capable artifacts and delegates nested portable-field semantics to `ApplicationPortableLaunchConfigPolicy`.
- `ApplicationLaunchConfigurationService` — owns manifest and selected-resource baselines, no-write selection preview, sparse host override/effective provenance, host validation, and run guard.
- `MemberTeamContextBuilder` — owns team instruction/name/context resolution against the exact injected team-definition service.
- `ApplicationBackendApiGatewayService` — continues to own backend exposure and invocation.
- `ApplicationEngineHostService` — continues to own worker lifecycle.
- `ApplicationOrchestrationHostService` — continues to own app-scoped runtime work.

- Existing Agent Tools MCP route/session/catalog/dispatcher owners — retain their established Studio behavior; standalone composes only the missing registrar.

## Ownership Map

- **ApplicationStartupCoordinator:** the governing frontend startup owner. It must not implement provider wire protocols itself.
- **Bootstrap providers:** each owns one acquisition protocol and returns the same strict runtime bootstrap. They must not mount business UI or invoke backend operations.
- **StandaloneApplicationHost:** governs selected-app presentation and endpoint mounting. It must not become a second application engine or orchestration service.
- **Devkit command services:** govern project-relative config, package lifecycle commands, development watching, and translation into a standalone host config. They must not import managers beneath the standalone process API or duplicate Studio/server behavior.
- **Standalone process API:** governs construction, listen, and close for one standalone composition. Signal registration stays in CLI/process facades so tests and development restart can close the handle directly.
- **Composition roots:** construct exact dependencies and choose public surfaces. They are construction owners, not runtime service locators.
- **ApplicationPlatformLifecycle:** governs process/platform start/recovery/stop sequencing. It does not register HTTP routes or decide model/profile completeness.
- **ApplicationLaunchConfigurationService:** governs selected-resource edit projections, effective launch configuration, and per-application run readiness. Callers may not bypass it by reading the override store, traversing definitions, inferring from package/effective states, or consulting runtime/model owners directly.
- **MemberTeamContextBuilder:** resolves prompt team context only through its injected team-definition authority; mixed handles may not choose a catalog.
- **Existing Agent Tools MCP subsystem:** continues to govern per-run session issuance, capability resolution, eligible server/configured-MCP dispatch, and cleanup. CR-013 does not change its construction or tool projection.
- **External MCP gateway:** remains the Studio-owned generic integration surface. It does not issue or resolve Agent Tools run sessions and is absent from standalone.
- **Gateway/engine/orchestration:** retain their current subject authority. Host adapters cannot bypass them.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `startApplication(options)` | `ApplicationStartupCoordinator` | Stable public SDK call | Provider protocol details or app business state |
| Studio server main | `buildStudioServerComposition` + lifecycle | CLI/process boundary | Standalone branches |
| Standalone host main | `buildStandaloneApplicationServerComposition` + `StandaloneApplicationHost` | CLI/process boundary | Package parsing, worker implementation, orchestration |
| REST/WebSocket registrars | Gateway/communication services | Bind Fastify paths to exact service calls | Business policy or runtime lifecycle |
| Internal Agent Tools MCP registrar | Existing Agent Tools MCP session/catalog/dispatcher owners | Bind `/mcp/agent-tools/:sessionId` in both compositions | Native tool projection, new session/catalog construction, external gateway policy, or browser bootstrap |
| `autobyteus-app dev` / `dev --host studio` | Host-specific dev session services | Stable application-folder development commands | Mock fallback, server graph, Studio package-registry internals |
| `autobyteus-app start` | `ApplicationStandalonePackageValidator` then `startStandaloneApplicationHost` | Validate project/package target and delegate a runnable package | Build/watch/mock behavior or runtime managers |
| Studio launch setup routes/panel | `ApplicationLaunchConfigurationService` | View selected baseline, preview unsaved selection, save/remove sparse override, and show readiness | Definition traversal, package/effective inference, package mutation, independent readiness rules |
| `context.agentResources.requireRunnable` | `ApplicationLaunchConfigurationService` | Return one complete guarded effective profile | Resource/model fallback or null profile |

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
| Unapproved SR-007 `AgentToolsMcpRuntime`, ports, route-path, and deferred-publication drafts | CRR-016 proves they are unnecessary for CR-013 | Existing Agent Tools MCP subsystem plus one standalone registrar call | Removed Before Local Fix | Production source was restored to HEAD; no compatibility wrapper |
| `ApplicationExecutionResourceConfigurationStatus.READY` and ambiguous configured/effective DTO use | Conflates selected resource, saved override, effective profile, and host runnable state | Package baseline/override/effective types plus `ApplicationLaunchReadiness` | In This Change | Clean-cut contract/source/UI/test update; no alias |
| Brief hard-coded `BRIEF_STUDIO_TEAM_RESOURCE`, `fallbackExecutionResourceRef`, request-model rescue, and null-profile preset builder path | Bypasses the authoritative package/effective configuration owner | `context.agentResources.requireRunnable` plus complete effective-profile builder | In This Change | Business schemas may remove unused model input; no fallback retained |
| Studio reset-draft action labeled as Reset to defaults | Does not remove persisted override | Explicit delete/reset-to-package-default action; optional cancel-edit remains separately named | In This Change | Existing store removal API is reused |
| Studio alternate-resource inheritance from `effectiveConfiguration` or manifest `packageBaseline` | Uses post-overlay or wrong-resource state as the editor baseline | `selectedResourceBaseline` plus identity-bound no-write selection preview | In This Change | Delete the web heuristic; no definition traversal or compatibility branch |
| `MixedAgentMemberHandle` global builder fallback | Chooses wrong catalog after graph-local construction | Required injected `MemberTeamContextBuilder` through managers/registries | In This Change | General composition supplies its own exact builder at boundary |
| Physical server-package minimization | Not needed to prove composition | Proven composition followed by distribution optimization | Follow-up | Do not fork/copy code |

## Return Or Event Spine(s) (If Applicable)

### DS-004 — Runtime return/event flow

`Application backend context call -> ApplicationOrchestrationHostService -> AgentRunManager/team runtime -> durable binding + global lookup -> lifecycle event journal -> application event handler -> backend notification and/or published artifact -> frontend subscriptions/reconciliation`

The host type is not present in this spine. That absence is an invariant: Studio and standalone differ only before the shared client ingress and at endpoint mounting. Runtime-native tools execute directly in Codex/Claude; eligible server/configured-MCP calls traverse DS-014's same existing callback in either host before returning to event/artifact projection.

## Bounded Local / Internal Spines (If Applicable)

### DS-005 — Application platform lifecycle

- Parent owner: `ApplicationPlatformLifecycle`
- Chain: `constructed -> preparing_runtime -> catalog_ready -> waiting_for_listener -> recovering -> ready -> stopping -> stopped` or `failed`.
- Public phase methods: `prepareBeforeListen()`, `recoverAfterListen()`, `awaitReady()`, and `stop()`; concurrent calls to the same phase share one promise, invalid phase order throws, and stop is idempotent.
- Why the listener split is explicit: current recovery runs after Fastify listens and may rely on the configured internal endpoint. The composition owns `app.listen`; the lifecycle owns every named preparation/recovery collaborator on either side of it. No callback array or `requiredStartupTasks` bag exists.
- Ingress rule: process/platform routes await `awaitReady()`. Application bootstrap/backend/orchestration additionally require DS-012 `RUNNABLE`. Static health may report both projections but cannot collapse them into one `ready` boolean.

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
| P9 Definition/tool/skill catalog readiness | Definition caches were lazy/background; current implementation refreshes and validates definitions/tools/skills but also incorrectly treats null launch profiles as ready | Refresh graph-local agent/team providers and validate all active definitions plus named tool/skill references. Do not decide package default completeness or model/credential readiness here; delegate those to DS-011/DS-012 | Same restricted to selected application, followed by DS-012 | Awaited platform validation; invalid definitions/tools/skills fatal for selected standalone and per-app diagnostic in Studio. DS-012 separately governs run readiness | No stop; providers/caches graph-owned |
| L1 Fastify construction/listen | `buildApp` registers every surface then listens | Full Studio surface plus Studio application registrars, internal Agent Tools callback, and separate external MCP gateway | Static/health/bootstrap/selected-app registrars plus the internal Agent Tools callback; no external MCP gateway | Await listen; fatal bind error | Composition calls `app.close()` |
| S1 Channel output + callback runtimes | Started immediately after Studio listen | Required Studio-only; current start semantics | Omitted | Await/synchronous as current; failure policy remains existing Studio owner | Studio `onClose` stops both |
| S2 Internal base URL seed | Current Studio/standalone process entry seeds the actual post-listen internal endpoint used by established Agent Tools descriptors and managed messaging | Preserve current behavior | Preserve current behavior; CR-013 changes only route registration | Awaited/current failure behavior unchanged | Existing process endpoint owner |
| S3 Managed messaging restore | Best-effort after listen | Studio-only best-effort | Omitted | Awaited; degraded log | Studio `onClose` closes service |
| R1 State inventory | `ApplicationPlatformStateStore.listKnownApplicationIds()` after listen | Explicit Studio data-root store and full catalog | Explicit standalone data-root store; compute recoverable IDs as `persistedKnownApplicationIds ∩ {selection.applicationId}` | Awaited; fatal both. Dormant non-selected records are retained unchanged | Per-operation SQLite handles close immediately |
| R2 Binding recovery + availability reconciliation | Startup gate/recovery/availability global accessors | Graph-local gate/recovery/registry; reconcile full catalog + persisted known IDs | Same instances, but every lookup/recovery/availability input is scoped to the selected canonical ID from R1; never recover a previously selected different app | Awaited in `recoverAfterListen`; fatal both | Run observer owns recovered subscriptions; lifecycle disposes them |
| R3 Pending application event resume | Dispatch global accessor after recovery | Graph-local dispatcher | Same | Awaited initial resume; fatal both. Later retry failures use existing durable backoff semantics | Dispatcher `stop()` clears timers and rejects new schedules |
| B1 Cache preloading | Detached background task with per-cache swallowed errors | Studio-only performance task, explicit best-effort scheduler after ready | Omitted; P9 already performs required reads | Background/degraded | None |
| B2 External configured-MCP source discovery/import | `mcp-loader` discovers host-configured external MCP sources in detached background work; this is not the internal Agent Tools callback | Studio-only best-effort, preserving current optional integration | Omitted from standalone first proof; `/mcp/gateway` also remains absent | Background/degraded | Existing external MCP/gateway owner during Studio shutdown |
| B3 Memory sync worker | Detached background task | Studio-only best-effort | Omitted from standalone proof | Background/degraded | Studio `onClose` calls `stopMemorySyncWorker()` |

`scheduleBackgroundTasks()` is decommissioned as the mixed owner. Required P4–P9 work becomes named lifecycle collaborators; B1–B3 are scheduled explicitly only by the Studio composition, with their best-effort behavior visible at the callsite. B2 never registers the per-run Agent Tools session route.

### Application lifecycle stop order

After Fastify stops accepting new ingress and drains admitted handlers, `ApplicationPlatformLifecycle.stop()` runs once in this order: (1) set `stopping` and block new runs; (2) stop event scheduling and clear retry timers; (3) close application-agent communication sessions; (4) dispose the gateway/custom-WebSocket session service, closing custom sessions and unregistering engine/notification listeners; (5) close notification hub connections; (6) detach recovered run observers without emitting terminal business events; (7) stop all application worker engines and run/member handles under their existing cleanup behavior; (8) stop remaining streaming subscriptions; (9) mark `stopped`.

The process handle then closes process-scoped resources in dependency order: Studio alone stops memory sync, channel output, gateway callback, external MCP, and managed messaging owners; both hosts stop the default agent-run event pipeline, close the secret-vault runtime, and finally call `shutdownPrisma()`. CR-013 adds no new stop owner. Application platform stores hold no long-lived per-app SQLite connection, while repository Prisma is explicitly process-lived. Each close step runs in `finally`-style nesting so a failure cannot skip later vault/database cleanup. `startStandaloneApplicationHost` returns an idempotent close handle used by development restart and tests; only the CLI main installs SIGINT/SIGTERM handlers. A bounded shutdown timeout is a process concern, and timeout expiry exits non-zero after preserving logs.

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
| Internal MCP capability security | DS-014 | Existing Agent Tools route/session owners | Preserve current bearer/session and 401/404 behavior | Runtime callback is network-reachable even without user accounts | Local route registration bypasses the established registrar |
| Runtime callback base URL | DS-014 | Existing process endpoint/session-service owners | Preserve the current descriptor URL behavior already proven to issue in standalone | Descriptor must reach the registered listener | Local fix invents a second URL/path contract |
| Process cleanup | DS-005, DS-006, DS-010 | Lifecycle/composition/CLI | Programmatic close, signal handling, existing run/session cleanup, child cleanup, event-pipeline/vault/Prisma stop, timeout | Reliable development restart and standalone exit | Devkit owns internals or signals are installed below process facade |
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
12. **Resource definition -> Studio edit/effective launch:** `ApplicationLaunchConfigurationService` alone resolves manifest/selected baselines, previews an unsaved ref, overlays sparse host fields, validates the host, and guards run. Studio consumes these projections and never traverses definitions or treats the post-overlay result as its baseline.
13. **Application run graph -> member prompt:** `MemberTeamContextBuilder` is constructed from the exact graph-local team-definition service and injected through mixed manager/registries/handles.
14. **Runtime configuration -> tool projection:** Codex/Claude retain native tools; the existing Agent Tools catalog projects only eligible server adapters and configured MCP-origin tools into its descriptor.
15. **Standalone composition -> internal Agent Tools route:** standalone calls the same existing registrar as Studio before static fallback; it does not construct a second gateway or expose external `/mcp/gateway`.

## Exact Composition-Critical Dependency Graph

`createApplicationPlatformRuntimeGraph` is a construction function used only by a composition root. It returns a typed record so the composition can pass exact fields to lifecycle and registrars; no runtime service accepts the whole record. CR-013 does not alter this graph or the existing process-scoped Agent Tools subsystem.

Construction order and edges are fixed:

1. **Process configuration and persistence prerequisites:** one initialized `AppConfig` -> exact `ApplicationDatabaseLocation` -> core migration -> operational DB/key deny paths -> repository Prisma initialization -> secret-vault initialization. No tool, model/provider service, app-data migration, definition, or runtime readiness runs before this chain succeeds.
2. **Config/catalog:** the same `AppConfig` -> explicit package-registry snapshot provider (Studio registry service or standalone immutable read-only snapshot) -> explicit `FileApplicationBundleProvider` -> one `ApplicationBundleService`.
3. **Storage:** config + bundle service -> `ApplicationStorageLifecycleService` -> `ApplicationPlatformStateStore`; config -> `ApplicationGlobalPlatformStateStore` -> `ApplicationRunLookupStore`; platform-state store -> binding/configuration/event-journal stores.
4. **Definition/runtime foundations:** config + bundle service + prepared vault-backed provider resolution -> explicit file agent/team definition providers -> agent/team definition services; workspace, processor, strict seven-group tool readiness, runtime/model/provider availability ports, agent-run, team-run, and member-team-context builder receive those exact instances.
5. **Cycle-break primitives:** create one `ApplicationAvailabilityStateRegistry` exposing reader/writer ports and one `DeferredApplicationEngineEventHandlerPort`; bind it exactly once before readiness. It is a narrow capability, not a locator.
6. **Launch configuration:** bundle + exact definition services/`ApplicationLaunchResourceBaselineBuilder` + override store/normalizer + runtime/model/provider capability ports -> `ApplicationLaunchConfigurationService`; package validation reuses the graph/policy subset without stores/host ports.
7. **Event/orchestration and run authorities:** availability reader + event store + deferred engine port -> event dispatcher; dispatcher + journal -> ingress; binding + lookup + ingress + lifecycle hub -> terminal transition and run observer; those plus bundle/platform stores -> recovery. Resolver/configuration/launch/orchestration services receive the same bundle, definition, stores, availability reader, startup gate, run services, and observer instances. Existing Codex/Claude Agent Tools session provisioning is retained unchanged.
8. **Streaming/engine:** orchestration -> application-agent streaming -> application-agent communication; bundle + storage + orchestration + streaming -> engine host; bind the deferred engine event port to that engine exactly once. Artifact relay uses the same port, avoiding a hidden relay -> global engine cycle.
9. **Availability/gateway:** registry writer + bundle + recovery + dispatcher + engine -> availability coordinator; routes/gateway/orchestration depend only on the registry reader for active checks. Engine + notification hub -> custom-WS session service and gateway. The gateway receives bundle, availability reader, engine, notification hub, and custom-WS service explicitly.
10. **Lifecycle/ingress:** lifecycle receives P4–P9, catalog/state/recovery/availability/dispatcher, and exact disposables. Studio/standalone browser registrars receive only gateway/communication/readiness dependencies. Both compositions call the existing Agent Tools route registrar before standalone static fallback; only Studio separately registers external `/mcp/gateway`. Standalone recovery inputs and browser route identities remain filtered to its immutable descriptor.

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
LaunchConfig(Bundle, Definitions, OverrideStore, HostPorts) -> per-app run readiness
RunAuthorities(ExactTeamDefinitions -> MemberTeamContextBuilder) -> prompt semantics
Existing AgentTools Session/Catalog/Dispatcher -> Studio Route + Standalone Route
  Runtime-native files stay native; eligible Server/MCP adapters -> Handoff/Artifacts
Lifecycle(P4..P9, Recovery, Dispatcher, Disposables) -> platform readiness/stop
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
  launchConfigurationService: ApplicationLaunchConfigurationService;
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

This is a construction result, not a public container. Route registration such as `registerStandaloneApplicationWebSockets` receives only `selection`, `notificationHub`, `backendWebSocketSessionService`, and `agentCommunicationService`. The bounded CR-013 fix separately invokes the existing no-new-owner `registerAgentToolsMcpRoutes(app)` before the static wildcard.

## Composition-Critical Modify / Retain Inventory

| Current file / accessor | Disposition | Exact target instance and fallback policy | Rationale / shutdown ownership |
| --- | --- | --- | --- |
| `config/app-config-provider.ts` | Retain process singleton, explicitly initialize first | Both mains call `initialize`; the returned `AppConfig` is passed into graph. No critical store re-reads it. | Many unrelated server owners are process-scoped; one host composition runs per process. |
| `config/app-config.ts`, `config/application-database-location.ts`, `startup/migrations.ts` | Modify composition callsites; retain refreshed-base explicit contracts | Standalone config materializer ensures a new data root has only a missing empty/non-secret `.env`; CLI supplies explicit runtime values. Both compositions obtain one exact database location and call `runMigrations({appRoot,databaseUrl})`; no migration code re-reads a global provider. | Native standalone start must satisfy current config prerequisites without writing credentials or package files; operational DB identity must match the composition data root. |
| `repository_prisma` `initializePrisma`/`shutdownPrisma`, `config/prisma-client-factory.ts` | Retain process runtime; make composition ownership explicit | Both compositions initialize once from the exact database URL before repository consumers. Graph-owned/current callsites that create clients must resolve the same initialized location; process close shuts Prisma down last. | Refreshed base makes repository Prisma an actual process dependency. One composition per process avoids cross-root ambiguity. |
| `secret-management/secret-vault-runtime.ts` and `autobyteus-ts/tools/file/workspace-path-utils.ts` denied-path configuration | Retain process-scoped runtime/config; make startup/stop explicit in both compositions | Initialize vault with the exact `ApplicationDatabaseLocation`; deny DB/root-key/sidecar paths before tool registration; close vault after event/runtime consumers and before Prisma. No host or devkit code reads secret values. | Provider/model/media/search execution now depends on the vault. This is runtime configuration, not authentication. |
| `agent-tools/search/register-search-tool.ts` | Move into strict tool-readiness owner | `AgentToolRegistryReadiness` registers Search as the seventh named group after vault readiness; `buildApp()` no longer performs hidden tool registration. | Route construction must not mutate a required application tool registry. |
| `agent-tools/mcp/{agent-tool-mcp-session-registry,agent-tool-mcp-catalog,agent-tool-mcp-tool-executor,agent-tools-mcp-method-dispatcher,agent-tool-mcp-session-service}.ts` | Retain unchanged for CR-013 | Existing process-scoped construction and runtime projection remain authoritative. | CRR-016 verifies the subsystem works in Studio; Local Fix must not redesign it. |
| `agent-tools/mcp/agent-tools-mcp-routes.ts` | Retain unchanged; reuse registrar | Existing auth/origin/content negotiation/session dependencies remain intact. Standalone imports and calls the registrar. | Missing host mount, not missing transport semantics. |
| `mcp-gateway/mcp-gateway-routes.ts` | Retain Studio-only | Keep optional external gateway under Studio composition only; it cannot resolve Agent Tools run sessions. | Avoid conflating external integration with required runtime callback. |
| `server-runtime-endpoints.ts`, Studio and standalone process entries | Retain current endpoint behavior for CR-013 | The existing standalone run already receives a valid descriptor URL; only the route registration is absent. | Do not add a second URL/path contract. |
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
| `application-published-artifact-relay-service.ts`, `services/published-artifacts/published-artifact-publication-service.ts`, `agent-execution/services/agent-run-manager.ts` | Preserve ARCH-REV-006 implementation; no CR-013 change | Existing publication, relay, run, and Agent Tools adapter behavior remains authoritative. | CRR-016 confirms the missing route, not publication ownership, caused the standalone failure. |
| `agent-tools/published-artifacts/{register-published-artifact-tools.ts,publish-artifacts-tool.ts}` | Retain unchanged for CR-013 | Existing `publish_artifacts` static adapter remains eligible for the descriptor. | Do not replace it with a new deferred bridge in this Local Fix. |
| Codex/Claude backend factories, `codex-thread-bootstrapper.ts`, `claude-session-manager.ts`, `agent-run-manager.ts`, and `mixed-agent-member-handle.ts` | Retain Agent Tools behavior for CR-013 | Existing native-tool and Agent Tools session materialization/cleanup stays unchanged. | Native file tools must not be routed through new server adapters. |
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
| Runtime/processor/tool registries, `WorkspaceManager`, model/LLM factories, low-level agent/team runtime managers | Retain process-scoped, but inject the chosen instances into graph-owned run services/factories | One composition per process; P4–P9 completes required registration/readiness. No host mode or catalog selection is read from these registries. | Repository-wide DI rewrite is unnecessary; active runs are process resources. |
| External channel, callback delivery, managed messaging, external MCP gateway, mobile, remote access, memory sync | Retain Studio-only | Construct/register/stop only in Studio composition; absent from standalone composition. This row does not include internal Agent Tools MCP transport. | Preserve Studio capability without expanding standalone surface. |

All cached `getApplication*` accessors in modified application-graph nodes are removed or restricted as specified by the ARCH-REV-006 design. Existing `getAgentToolMcp*` use is not changed by CR-013; CRR-016 verified the established one-process behavior and rejected the broader SR-007 refactor.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `startApplication` | Coordinator, provider resolution, client creation | All app frontends/templates | Direct `window.parent`, direct bootstrap fetch in app code | Extend provider/coordinator contract |
| `ApplicationBootstrapProvider.acquire()` | Iframe message loop or same-origin fetch | Startup coordinator | Coordinator branching on postMessage/fetch | Add provider-specific method/state internally |
| `StandaloneApplicationSelectionService.resolve()` | Package snapshot, current parser/provider, selected bundle validation | Standalone composition/host | Reading `application.json` directly in route/main | Extend selection result/diagnostics |
| `ApplicationBackendApiGatewayService` | Availability, engine start, exposure checks, backend WS sessions | Both host ingress adapters | Route calling worker client directly | Add a singular gateway method |
| `ApplicationPlatformLifecycle` | preparation, recovery, readiness, stop order | Both compositions, bootstrap readiness | Route/CLI invoking recovery services ad hoc | Add lifecycle phase/API |
| `ApplicationOrchestrationHostService` | resource/run/binding/event/artifact coordination | Worker context capability bridge | Backend importing run manager/runtime factory | Add named context capability |
| `ApplicationLaunchConfigurationService` | Resource baseline builder, selection preview, override store/normalizer, host capability ports | Studio setup, lifecycle projection, backend context, standalone composition | Caller reads definitions/store/catalog or infers selected baseline from package/effective state | Strengthen view/preview/command/require-runnable API |
| Graph-local run authorities | Mixed manager/registries/member context builder | Application team execution | Member handle calls global builder/team service | Pass exact builder through construction |
| `registerAgentToolsMcpRoutes(app)` | Existing bearer lookup, MCP dispatch, configured eligible server/MCP tool execution/error mapping | Studio and standalone composition roots | Reimplement route, add native file adapter, or call external gateway | Reuse the registrar unchanged; fix only host mounting |

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
- Both compositions call the existing `registerAgentToolsMcpRoutes(app)`; standalone does so before its static wildcard. Only Studio registers external `/mcp/gateway`; neither route aliases or proxies the other.
- Existing Agent Tools bearer/session gates and descriptor behavior remain unchanged. The Local Fix must reach the established 401/404 path rather than implement another authorization layer.
- Runtime-native Codex/Claude tools are not Agent Tools MCP adapters. The descriptor exposes only configured eligible static server adapters and configured `ToolOrigin.MCP` definitions; tests inspect the descriptor/`tools/list` rather than package `toolNames`.
- Shared gateway/engine/orchestration services remain unaware of Studio versus standalone.
- Host mode must not be added to `application.json` or backend handler inputs.
- Package default values may contain runtime/model identifiers and only `ApplicationPortableLaunchConfigPolicy`-approved tuning/pricing. Recursive credential/password/authorization/token-value/endpoint/workspace/machine fields are forbidden and diagnostics omit values. No package or business request may silently supply a missing host requirement.
- `ApplicationLaunchConfigurationService` is the authoritative boundary. Studio routes/UI, lifecycle projections, standalone start, and backend context may not read the override store, traverse definition defaults, infer a selected baseline from package/effective results, or consult model/runtime availability directly. Unsaved selection uses its no-write preview API.
- A required standalone baseline must use a bundled manifest-default resource. Studio may select a shared or alternate bundled resource only through an authoritative selected baseline/preview; a sparse override may complete missing definition fields, but save/run validation remains final.
- Mixed member handles require an injected `MemberTeamContextBuilder`; no handle/registry selects `AgentTeamDefinitionService.getInstance()`.
- New composition-critical application-graph code must not call global singleton accessors beyond the retained one-process resources in the ARCH-REV-006 inventory. CR-013 introduces no new Agent Tools runtime code or ownership change.

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
| `POST/GET /mcp/agent-tools/:sessionId` | One internal runtime tool session | Authorize bearer, dispatch MCP against session-enabled configured tools/context | Composition-issued session ID + bearer only | Required in both hosts; no application selector/body authority; `cors:false`; not external gateway |
| `buildStudioServerComposition()` | Studio server | Full existing platform + app surface | Multi-app catalog | Current product server |
| `buildStandaloneApplicationServerComposition(config)` | Standalone server | Selected app browser surface plus existing Agent Tools callback only | Package root + local app ID | Calls existing registrar before static wildcard; no Studio/admin registries or external MCP gateway |
| `validateStandaloneApplicationPackage(input)` | One standalone artifact | Pure package baseline completeness and recursive portable-field validation | Package root + local app ID | Existing bundle/definition parser plus `ApplicationPortableLaunchConfigPolicy`; no host state |
| `ApplicationLaunchConfigurationService.getApplicationLaunchConfigurationView(applicationId)` | One application configuration view | Show package baseline, current selected-resource baseline, saved override/state, nullable effective configuration, scoped issues, and aggregate readiness | Canonical application ID | Computed read boundary; invalid rows are preserved and never fallback |
| `ApplicationLaunchConfigurationService.previewSelectedResourceBaseline(applicationId, slotKey, ref)` | One unsaved resource selection | Resolve exact pre-overlay baseline or structured selection issue without writing | Canonical app ID + declared slot + exact resource ref | Identity-bound Studio edit projection; no store/host validation/readiness/fallback |
| `upsertOverride` / `removeOverride` | One slot host override | Validate/persist/delete override and recompute | Application ID + slot key | Reset deletes row |
| `evaluateApplicationReadiness(applicationId)` | One application run-readiness projection | Resolve all required slots and validate host | Canonical application ID | Separate from platform health |
| `requireRunnableConfiguration(applicationId, slotKey)` | One guarded effective launch | Return non-null effective config only under aggregate `RUNNABLE`; otherwise throw package, host-override, or host-capability issues | Application ID + declared slot key | Backend context uses this only; invalid override cannot reach package baseline |

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
| Launch configuration view/preview/command service | Yes | Yes | Low | Keep definition baseline, sparse overlay, host validation, and concurrency recheck behind one owner |
| Member context builder injection | Yes | Team definition identity explicit | Low | Require builder in handles; general/application compositions construct exact instance |
| Existing Agent Tools route registrar | Yes | Session ID plus established bearer gate | Low | Reuse unchanged in both compositions; native tools and external gateway remain separate |
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
| Exact selected definition baseline | `ApplicationLaunchResourceBaselineBuilder` | Yes | Low | Clean-cut rename package-only builder; one graph traversal for manifest/shared selection |
| Package portable-field authority | `ApplicationPortableLaunchConfigPolicy` | Yes | Low | Do not call it secret detection or use a broad token heuristic |
| Internal configured-tool route | `registerAgentToolsMcpRoutes` | Yes | Low | Reuse the established registrar in both compositions; do not call it the external gateway |
| Runtime/gateway tool projection | Native tools / eligible Agent Tools adapters / configured MCP-origin tools | Yes | Medium | Do not treat package `toolNames` as the MCP descriptor |

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
| Package-default and selected-resource traversal | Application bundles + application/shared definition providers/traversal | Reuse/Extend | Existing sources already parse defaults and canonical graph identity | Strengthen one graph-local resource-baseline builder, not a UI/parser duplicate |
| Portable package launch fields | Application launch configuration + runtime config schemas | Extend | Existing schemas identify valid tuning; one policy must recursively reject host-only fields | Add a narrow schema-aware policy, not a generic secret scanner or app allowlist |
| Effective launch configuration | Current execution-resource configuration service/store | Refactor | Current owner has selection/persistence but conflates override/effective/readiness | Rename/strengthen one owner; store stays internal |
| Host runtime/model/credential preflight | Runtime availability, model catalog, provider/vault services | Adapt | Existing capability owners contain real host knowledge | Add narrow graph-local ports, not generic secret logic |
| Package team prompt context | MemberTeamContextBuilder + mixed construction | Refactor | Existing builder owns semantics but receives wrong authority | Inject exact graph service through bounded path |
| Internal Agent Tools MCP session transport | Existing Agent Tools session/route/catalog/dispatcher/tool adapters | Reuse; add one standalone mount | Existing mechanisms and auth gates are correct and work in Studio; standalone mounting alone is incomplete | No new subsystem |
| External MCP gateway | Existing MCP gateway | Retain Studio-only | Different generic integration purpose and authorization | Do not reuse it for Agent Tools sessions or expose it in standalone |

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
| Devkit | Pack/validate, standalone capability metadata, real host sessions, production `start` facade | DS-006, DS-007, DS-010, DS-011 | Application project command services | Extend | Calls pure package validator; does not parse definitions itself |
| Application Launch Configuration | Manifest/selected baselines, unsaved selection preview, sparse host override, effective provenance, host validation, run guard | DS-012, DS-003 | Studio edit/read API, both hosts, backend context | Refactor existing service | One authoritative server owner; UI is a consumer |
| Mixed Team Prompt Context | Exact builder propagation and prompt semantics | DS-013, DS-004 | Application run authorities | Bounded refactor | No catalog merge/global fallback |
| Internal Agent Tools MCP route | Existing session issue/auth/dispatch and eligible-tool projection | DS-014, DS-004 | Existing Agent Tools MCP owners; composition owns mounting | Reuse | Both hosts register it; distinct from native tools and external gateway |

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
| `agent-tools/mcp/agent-tools-mcp-routes.ts` | Agent Tools MCP | Existing route registrar | Preserve current bearer/session/protocol handling; reuse in standalone | One established transport concern | Existing session registry/dispatcher |
| composition files | Server composition | Construction owners | Construct graph/register chosen surfaces | One file per product composition | Shared lifecycle/registrars |
| route handler/registrar files | API transport | Thin adapters | Shared handler logic + distinct mounts | Split by HTTP/WS and host cardinality | Existing gateway/communication services |
| `commands/dev.ts` | Devkit | Dev command facade | Parse `--host`, select one development-session owner | One command boundary | Standalone/Studio session interfaces |
| `development/standalone-development-session.ts` | Devkit | Standalone dev owner | Disposable pack, watch/coalesce, graceful host restart, browser reload | One lifecycle concern | Pack/validate + server start API |
| `development/studio-development-session.ts` | Devkit | Studio dev owner | Stable pack, watch/coalesce, current Studio local import/reload, presentation refresh | One lifecycle concern | Pack/validate + Studio public API client |
| `commands/start.ts` | Devkit | Production command facade | Resolve existing output/ID/data/network and call standalone process API once | One no-build command concern | Config loader, validator, server public start API |
| `standalone-application-host/start-standalone-application-host.ts` | Existing server project | Public standalone process boundary | Validate selected package/host readiness, construct/listen/return close handle | One programmatic process lifecycle | Standalone composition |
| `application-platform/launch-configuration/application-standalone-package-validator.ts` | Application platform | Pure package validator | Traverse current bundle defaults and emit package diagnostics | One package-only concern | Existing providers/traversal/policy |
| `application-platform/launch-configuration/application-portable-launch-config-policy.ts` | Application platform | Portable package policy | Recursively validate exact runtime schemas/paths | One policy concern | Runtime portable schemas |
| `application-platform/launch-configuration/application-launch-resource-baseline-builder.ts` | Application platform | Definition baseline owner | Resolve exact selected resource and definition provenance | One traversal concern | Graph-local definitions |
| `application-platform/launch-configuration/application-launch-configuration-service.ts` | Application platform | Authoritative launch owner | View/preview/override/effective/readiness/guard | One domain owner | Builder, store, host ports |
| `application-platform/launch-configuration/application-launch-host-capability-validator.ts` | Application platform | Host validation adapter | Runtime/model/credential readiness | One off-spine concern | Existing capability services |
| `application-platform/launch-configuration/application-launch-configuration-types.ts` | Application platform/contracts | Tight launch shapes | Baseline/preview/override/effective/provenance/readiness/issues | One type family | SDK contract resource refs |
| `application-platform/runtime/create-application-run-authorities.ts` and mixed factory/manager/registry/handle files | Runtime construction | Exact prompt authority | Propagate graph-local builder to all member handles | One bounded construction correction | Existing builder |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Normalized app identity + absolute endpoints | `application-runtime-bootstrap.ts` | Contracts | Both providers return it and the coordinator/client consume it | Yes: drops iframe launch/request-context/bind-origin duplication | Yes | Universal manifest or deployment config |
| Standalone identity + relative paths | `standalone-application-bootstrap.ts` | Contracts | Server and same-origin provider share one strict wire meaning | Yes: bind/request-origin values excluded | Yes | A second runtime-bootstrap shape |
| Bootstrap provider contract | `application-bootstrap-provider.ts` | Frontend SDK startup | Coordinator is provider-agnostic | Yes | Yes | Generic plugin registry |
| Backend HTTP handler invocation | `application-backend-route-handlers.ts` | REST transport | Studio and standalone mounts parse bodies the same way | Yes | Yes | Business gateway replacement |
| Selected application descriptor | `standalone-application-selection.ts` | Standalone host | Root, bootstrap, ingress, lifecycle need identical immutable identity | Yes | Yes | General multi-app catalog DTO |
| Application platform lifecycle state | `application-platform-lifecycle-state.ts` or colocated if small | Application platform | Health/bootstrap/composition observe same state | Yes | Yes | Whole-server feature-state bag |
| Selected resource definition traversal | `application-launch-resource-baseline-builder.ts` | Application launch configuration | GET, preview, PUT, and package validation need identical definition precedence/provenance | Yes | Yes: replaces package-only builder meaning | UI helper or generic repository |
| Portable launch field policy | `application-portable-launch-config-policy.ts` | Application launch configuration | Package validator/runtime schemas need one recursive accept/reject rule | Yes | Yes: removes broad token exceptions | Secret scanner or app-specific allowlist |
| Agent Tools route registration | existing `agent-tools-mcp-routes.ts` | Agent Tools MCP | Both compositions need the same established registrar | N/A: reuse | Yes: avoids a second route implementation | External gateway or native-tool adapter |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `ApplicationRuntimeBootstrap` | Yes | Yes | Low | Keep only application identity and absolute ready-to-use endpoint bases |
| `StandaloneApplicationBootstrapPayload` | Yes | Yes | Low | Keep only selected identity and confined root-relative platform paths; normalize before coordinator |
| `ApplicationBootstrapPayload` | Yes, for Studio wire | Existing tight validator under its unversioned target name | Low | Keep provider-local after normalization |
| `StandaloneApplicationSelection` | Yes | Yes | Low | Derive canonical ID once; do not also accept it as config |
| `ApplicationPlatformLifecycleState` | Yes | Yes | Low | State owner only; no duplicate booleans outside derived getters |
| `ApplicationClientTransport` | Yes | Existing | Low | Reuse unchanged unless fixed-mount URL adapter needs a narrow option |
| `ApplicationExecutionResourceOverride` | Yes: persisted sparse host delta only | Definition defaults excluded | Low | Existing rows deserialize directly; no default copy |
| `ApplicationResolvedResourceLaunchBaseline` | Yes: one selected definition before host fields | Host fields and readiness excluded | Low | Distinct from manifest package baseline and post-overlay effective result |
| `ApplicationLaunchSelectionPreview` | Yes: one no-write unsaved selection result | Persistence/readiness excluded | Low | Closed identity-bound resolved/invalid union |
| `ApplicationEffectiveLaunchConfiguration` | Yes: resolved complete post-overlay configuration | Null/incomplete profiles excluded | Low | Include definition/host provenance; never reuse as edit baseline |
| `ApplicationLaunchReadiness` | Yes: per-application run readiness | No overloaded ready booleans | Low | Closed union `RUNNABLE\|INVALID_PACKAGE\|HOST_REQUIREMENT_MISSING` |

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
| `.../agent-tools/mcp/agent-tools-mcp-routes.ts` | Agent Tools MCP Transport | Existing registrar | Preserve current auth/origin/protocol/session dispatch and reuse it in standalone | One established transport concern | Existing registry/dispatcher |
| `.../application-platform/launch-configuration/application-standalone-package-validator.ts` | Application Platform | Pure package validation | Validate bundled required resource, every leaf default, and portable fields | One validation owner | Existing bundle/definition providers + policy |
| `.../application-platform/launch-configuration/application-portable-launch-config-policy.ts` | Application Platform | Package portability policy | Recursive schema-aware accept/reject with exact paths | One narrow policy owner | Runtime portable field schemas |
| `.../application-platform/launch-configuration/application-launch-resource-baseline-builder.ts` | Application Platform | Definition baseline owner | Resolve exact bundle/shared agent/team baseline with definition provenance | One graph traversal concern | Exact graph-local definition services |
| `.../application-platform/launch-configuration/application-launch-configuration-service.ts` | Application Platform | Launch authority | View/preview/persist/remove/evaluate/require runnable | One subject owner | Baseline builder/store/host ports |
| `.../application-platform/launch-configuration/application-launch-host-capability-validator.ts` | Application Platform | Host readiness concern | Exact runtime/model/credential validation | One adapter owner | Existing runtime/model/provider services |
| `autobyteus-application-sdk-contracts/src/execution-resources.ts` | SDK Contracts | Launch view/preview contract | Selected baseline, preview union, provenance, sparse override/effective/readiness shapes | One cross-boundary type family | Current resource refs |
| `autobyteus-server-ts/src/api/rest/application-execution-resources.ts` | REST Transport | Studio launch adapter | GET view, POST selection preview, PUT sparse override, DELETE reset | One route family | Launch authority only |
| `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue` | Studio UI | Setup coordinator | Load/refresh slots, request preview, save/reset, render issues | One page workflow | SDK launch contracts |
| `autobyteus-web/components/applications/setup/ApplicationExecutionResourceSlotEditor.vue` | Studio UI | Slot editor | Identity-bound selection preview and sparse draft | One slot concern | Selected baseline/preview |
| `autobyteus-web/components/applications/setup/{ApplicationAgentLaunchProfileEditor,ApplicationTeamLaunchProfileEditor,ApplicationTeamMemberOverrideItem}.vue` and `useRuntimeScopedModelSelection.ts` | Studio UI | Profile editors | Per-field inheritance/provenance and mixed-runtime catalog behavior | One nested edit family | Selected baseline leaves/catalogs |
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
| `.../compositions/studio-server-composition.ts` | Composition | Studio construction | Full current server + shared app runtime + existing internal Agent Tools route + separate external gateway | One product root | Existing runtime graph/lifecycle/Agent Tools subsystem |
| `.../compositions/standalone-application-server-composition.ts` | Composition | Standalone construction | Selected app browser server + existing Agent Tools registrar before static wildcard | One product root | Same runtime graph/lifecycle; no external gateway |
| `.../standalone-application-host/config/standalone-host-config-materializer.ts` | Standalone Host | Data-root config boundary | Create missing data root/empty non-secret `.env`, preserve existing config, derive/validate public base | One current-AppConfig adaptation concern | Normalized standalone config |
| `.../standalone-application-host/start-standalone-application-host.ts` | Standalone Host | Public programmatic process boundary | Prepare process prerequisites, build/listen, return `{url, close}` | One reusable process lifecycle | Standalone composition + process resources |
| `.../standalone-application-host/main.ts` | Standalone Host | CLI/process facade | Parse normalized config, call public start, install signals/exit policy | One OS process entry | Public start API |
| `autobyteus-application-devkit/src/config/application-devkit-config.ts` | Devkit | Project capability/config | Resolve explicit `standalone.enabled` | One project metadata concern | No manifest field |
| `autobyteus-application-devkit/src/commands/{pack,validate,dev,start}.ts` | Devkit | Command facades | Invoke standalone package validation when enabled/required | One command boundary each | Pure server validator |
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
- **Capability-scoped internal transport:** an issued bearer session closes runtime-to-host configured-tool callbacks without creating user authentication or an external gateway.
- **Existing-capability reuse:** standalone mounts the existing Agent Tools registrar; no parallel runtime, ports, or adapter system is introduced.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/application-runtime-bootstrap.ts` | File | Shared contract | Host-neutral runtime bootstrap | Cross-host normalized contract owner | Manifest/deployment policy |
| `autobyteus-application-sdk-contracts/src/standalone-application-bootstrap.ts` | File | Standalone provider wire | Selected identity + strict root-relative platform paths | Server/provider cross-boundary contract | Bind address, request Host, absolute runtime URLs |
| `autobyteus-application-sdk-contracts/src/execution-resources.ts` | File | Launch configuration contract | Manifest/selected baseline, selection preview, sparse override, effective provenance, readiness | Server/Studio shared contract owner | UI state or definition traversal |
| `autobyteus-application-frontend-sdk/src/application-startup/` | Folder | Frontend startup subsystem | Coordinator/provider structure | Exposes structural depth clearly | Business UI components |
| `autobyteus-server-ts/src/application-platform/runtime/` | Folder | Shared application lifecycle | Runtime graph/lifecycle/readiness | Host-neutral application platform grouping | Fastify route paths |
| `autobyteus-server-ts/src/application-platform/launch-configuration/` | Folder | Launch configuration subsystem | Portable policy, resource baseline builder, view/preview/override/effective/readiness authority | One server-owned application-launch boundary | Web presentation or host-specific fallback |
| `autobyteus-server-ts/src/agent-tools/mcp/` | Folder | Internal Agent Tools transport | Existing session registry/catalog/executor/dispatcher and route registrar | Existing subject boundary already owns this runtime protocol | Native runtime file tools, external gateway policy, application browser bootstrap |
| `autobyteus-server-ts/src/standalone-application-host/` | Folder | Standalone product host | Config, selection, root/bootstrap/fixed ingress, process entry | New host-specific capability | Worker/orchestration implementations |
| `autobyteus-server-ts/src/compositions/` | Folder | Product construction | Studio/standalone roots | Only place choosing full surface | Runtime business logic |
| `autobyteus-server-ts/src/api/rest/` | Folder | REST transport | Shared handler set, Studio launch view/selection-preview/PUT/DELETE, and Studio mount | Existing transport convention | Definition traversal, launch precedence, standalone root/static policy |
| `autobyteus-web/components/applications/setup/` + `useRuntimeScopedModelSelection.ts` | Folder/files | Studio launch editor | Consume selected baseline/preview, edit sparse fields, represent mixed-runtime inheritance | Host presentation over server authority | Definition parsing, precedence, fallback, derived baseline persistence |
| `autobyteus-server-ts/src/api/websocket/` | Folder | WS transport | Studio application sockets and unrelated Studio sockets | Existing transport convention | Standalone fixed route policy |
| `autobyteus-application-devkit/src/{commands,development,studio}/` | Folders | Application project CLI | Pack/validate/start facades, two real development sessions, narrow Studio API adapter | Existing devkit ownership with lifecycle depth visible | Server graph/runtime internals or mock fallback |
| `autobyteus-application-devkit/templates/basic/{package.json,autobyteus-app.config.mjs,README.md}` | Files | Starter command contract | Exact `dev`, `dev:studio`, `build`, `validate`, `start` scripts/config/docs | New projects receive the approved native workflow | Host-specific application source |
| `applications/{brief-studio,socratic-math-teacher}/autobyteus-app.config.mjs` | Files | Representative project/target contract | Existing mappings plus explicit `standalone.enabled: true` | Declares validation promise outside manifest v4 | Executable hook, shell command, custom builder |
| `applications/{brief-studio,socratic-math-teacher}/package.json` | Files | Representative application command contract | Same five scripts; `validate` loads project config/output so standalone target validation applies | In-tree proof matches starter DX | Divergent builder or structural-only project validation |
| `applications/brief-studio/frontend-src/{app.js,brief-studio-runtime.js,icon.svg}` | Files | Sample app startup/runtime/static source | Import package SDK, call `startApplication`, dispose on `pagehide`, consume runtime bootstrap, remove iframe diagnostics, own icon source | Proves app code/document lifetime and static inputs are host-neutral | Host detection/correlation or generated vendor import |
| `applications/socratic-math-teacher/frontend-src/{app.js,socratic-runtime.js,socratic-renderer.js,icon.svg}` | Files | Sample app startup/runtime/UI/static source | Import package SDK, call `startApplication`, dispose on `pagehide`, consume runtime bootstrap, replace iframe-only panel, own icon source | Keeps all in-tree app/static sources current | Host detection/correlation or generated vendor import |
| `applications/{brief-studio,socratic-math-teacher}/scripts/build-package.mjs`, `ui/**`, `backend/**` | Delete | Obsolete sample package path | Removed after icons move and devkit pack equivalence is covered | Prevents a second builder/generated source mirror | Any retained wrapper or vendor tree |
| `autobyteus-application-devkit/templates/basic/src/frontend/app.ts` | File | Starter entry | Call `startApplication` and dispose its handle on `pagehide` | New projects use one API/lifetime rule | Host detection |
| `applications/brief-studio/agent-teams/brief-studio-team/agents/{researcher,writer}/agent-config.json` | Files | Brief package baseline | Declare complete Codex runtime/model defaults | Makes clean standalone package-runnable | Credentials/endpoints |
| `applications/brief-studio/backend-src/services/brief-run-launch-service.ts` | File | Brief business launch | Consume `requireRunnable` effective profile | One business orchestration concern | Resource/model fallback |
| `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue` and `setup/*` editors/composable | Files | Studio sparse override adapter | Consume selected baseline/preview, show definition/host provenance, handle mixed-runtime inheritance, save/delete override | One host UI adapter with component depth | Definition traversal, package/effective inference, default filling |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| Frontend `application-startup/` | Main-Line Domain-Control + protocol adapters | Yes | Low | Coordinator separate from provider protocols |
| Server `application-platform/runtime/` | Main-Line Domain-Control | Yes | Medium | Keep routes/config outside; avoid generic container |
| `standalone-application-host/` | Mixed Justified | Yes | Medium | Subfolders split config/domain/services/api/process |
| `compositions/` | Main-Line construction | Yes | Low | Two product roots only |
| `agent-tools/mcp/` | Existing runtime transport + route adapter | Yes | Low for CR-013 | Reuse the registrar unchanged; external gateway and native tools remain separate |
| Existing `api/rest` and `api/websocket` | Transport | Yes after split | Medium | Remove application registration from general indices |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Bootstrap | `startApplication -> provider.acquire -> ApplicationRuntimeBootstrap -> createApplicationClient` | `if (isStudio) ... else ...` inside every app | Host difference stays in SDK infrastructure |
| Composition | `buildStandalone...(config)` registers selected-app adapters plus the capability-scoped internal Agent Tools callback over shared authorities | Start full `buildApp()` on a public port and hide Studio UI | Public/API scope is structural, not cosmetic |
| Identity | Config accepts `{packageRoot, localApplicationId}` then derives canonical ID once | Accept path, local ID, canonical ID, and manifest root flag | Avoid overlapping selectors |
| Gateway | Both route mounts call `ApplicationBackendApiGatewayService` | Standalone route imports worker/backend module | Preserves one backend lifecycle |
| Provider selection | Valid iframe hints select Studio; top-level selects standalone; malformed iframe context fails | Try iframe, catch, then silently fetch standalone | Prevents incorrect fallback and hard-to-debug mixed host state |
| Native commands | `dev` = real standalone development; `dev:studio` = real Studio development; `build`/`validate` own the package; `start` = production use of the existing package | `dev` silently mocks, or `start` rebuilds/watches | Developer and production evidence is unambiguous |
| Package use | Package once, record digest, mount the same read-only root in both hosts, write only under each host data root | Rebuild assets per host or write runtime state into the package | Makes build-once portability factual |
| Standalone endpoints | Server returns strict relative platform paths; provider resolves them from browser origin | Server returns `0.0.0.0`, reflected Host, or hard-coded localhost absolute URLs | Works through a browser-visible hostname while preserving one absolute runtime type |
| Selected-resource edit | Manifest baseline or `selection-preview(ref)` -> selected definition baseline -> sparse draft -> PUT revalidation -> effective profile | Editor uses post-overlay `effectiveConfiguration`, old resource baseline, or local definition traversal | Inheritance remains server-authoritative before first save and after field clearing |
| Portable config | Recursive schema-aware policy accepts exact token-count/pricing fields and rejects nested password/auth/token-value/endpoint paths | Broad `endsWith("token")` exception or app-name special case | Package portability is narrow, testable, and secret-safe |
| Readiness | Platform ready + application `RUNNABLE` are separate gates | `READY` with null profile or business-time model failure | Each state has one meaning |
| Prompt authority | Graph-local team service -> injected builder -> member prompt | Member handle calls global builder/catalog | Package instructions remain semantically authoritative |
| Internal Agent Tools callback | Native file operation stays in Codex/Claude; existing descriptor/route carries eligible `publish_artifacts`/`send_message_to` and configured MCP-origin tools -> handoff/artifact | Treat package `toolNames` as MCP tools, add file adapters, proxy external `/mcp/gateway`, or create a second route/runtime | Corrects the missing mount without changing tool semantics |
| Session authorization | Missing bearer 401; unknown/wrong/revoked 404; token hash only; redacted descriptor | Public tool list, request-selected application/run, raw token log, or persisted session | No existence leak or cross-run authority |

Exact application-project script contract:

```json
{
  "scripts": {
    "dev": "autobyteus-app dev",
    "dev:studio": "autobyteus-app dev --host studio",
    "build": "autobyteus-app pack",
    "validate": "autobyteus-app validate",
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
}); // internally calls existing registerAgentToolsMcpRoutes(app) before static wildcard
await graph.lifecycle.prepareBeforeListen(); // P4-P9
const listenAddress = await app.listen({ host: config.host, port: config.port });
seedInternalServerBaseUrlFromListenAddress({
  requestedHost: config.host,
  listenAddress,
}); // existing descriptor endpoint behavior
await graph.lifecycle.recoverAfterListen();
return createStandaloneApplicationHostHandle({
  app,
  lifecycle: graph.lifecycle,
  processResources: { defaultAgentRunEventPipeline, secretVaultRuntime, prismaRuntime },
});
```

The `graph` stays local to the composition root. The CR-013 delta is inside standalone Fastify construction: reuse the existing registrar before static fallback. No new Agent Tools owner or graph dependency is introduced.

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
| Add mandatory standalone setup UI or seed/copy Studio configuration | Current package is incomplete | Rejected | Complete package defaults plus optional host override |
| Keep `READY` as resource-only state and add another runnable boolean | Minimize contract edits | Rejected | One closed run-readiness union and complete effective profile |
| Treat invalid saved host override as `INVALID_PACKAGE` or silently use package defaults | Avoid a partial per-slot result | Rejected | `HOST_REQUIREMENT_MISSING` + `HOST_OVERRIDE` issue, preserved row/baseline, null affected effective config, explicit Replace/Reset |
| Let Brief request model/hard-coded resource rescue missing baseline | Preserve current API | Rejected | Backend consumes `requireRunnable` result only |
| Merge package definitions into global catalog for prompts | Avoid injection | Rejected | Inject exact graph-local builder through mixed construction |
| Replace the established Agent Tools subsystem with new runtime/ports/deferred-publication ownership | Superseded CRR-015 design-impact premise | Rejected by CRR-016 | Reuse `registerAgentToolsMcpRoutes(app)` in standalone |
| Reuse or proxy external `/mcp/gateway` for Agent Tools sessions | Avoid a second route name | Rejected | Keep required session callback and optional external gateway as distinct owners/surfaces |
| Add alternate/legacy Agent Tools route or fall through to generic 404/static | Preserve unknown callers | Rejected | Existing exact route/registrar in both compositions; no alias |
| Persist Agent Tools tokens/sessions for restart | Simplify recovery | Rejected | Ephemeral capability state; recovered work creates fresh runtime sessions |

## Derived Layering (If Useful)

1. **Application source layer:** host-neutral frontend/backend business code.
2. **SDK contract/startup layer:** runtime bootstrap, providers, client/context APIs.
3. **Host transport layer:** Studio iframe and standalone HTTP/root adapters plus the shared internal Agent Tools MCP callback adapter.
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
7. Add selected-app REST/notification/custom-WebSocket/agent-communication mounts over existing services and reserve `/_autobyteus/*` before static fallback. Omit broad Studio CORS and enforce equality between browser WebSocket `Origin` authority and request `Host` authority.
8. Add `standalone-application-server-composition.ts`, the programmatic `startStandaloneApplicationHost` `{url,close}` boundary, and a thin signal-owning process entry. Reuse the exact core-migration/protected-path/Prisma/vault prerequisite chain and process-resource close order proven in Studio.
9. Assert the route inventory contains no unrelated Studio/platform APIs. The later DS-014 correction adds only the internal Agent Tools callback and explicitly keeps external `/mcp/gateway` absent.

### Sequence 5 — Developer workflow and conformance seam

1. Add the exact Brief/Socratic `autobyteus-app.config.mjs` mappings and source-icon/package-import changes, switch all three project types to the exact native scripts, and delete the two sample custom builders plus source-root generated mirrors.
2. Make `autobyteus-app dev` load the project config, resolve/watch the named inputs, and default to the real standalone development session over `.autobyteus/dev/package` and `.autobyteus/dev/data`; coalesce changes, close the current host, atomically repack/validate, restart the real host, and full-reload the browser.
3. Make `autobyteus-app dev --host studio` load the same mapping, pack/watch `dist/importable-package`, use the existing Studio local-package import/reload API at the configured Studio server, and preserve Studio's explicit Reload application action as the iframe remount authority.
4. Add `autobyteus-app start`; resolve the current built output and source-manifest local ID, validate without packing, invoke `startStandaloneApplicationHost` once, and forward signals/exit status. Remove public mock fallback/contract command; keep any useful host fixture only in tests.
5. Add a closed host-mode test command interface for later API/E2E ownership.
6. Package Brief Studio once, record whole-package and frontend/backend entry digests, and give that unchanged read-only output to both real host scenarios.
7. Recompute digests after both scenarios and fail if either host mutated the package.
8. Validate the exact maintained-project configs first, including icon/team/migration/exposure output and ignored generated roots, then validate the real team/migration/event/notification/artifact journey, latest-base operational DB/vault/Search prerequisites, stale non-selected recovery filtering, root/assets/navigation, route/origin surface, and process cleanup.

### Sequence 6 — Package defaults, selected-resource editing, and prompt authority correction

1. Retain source-only `standalone.enabled`, complete Brief/Socratic defaults, and the pure graph-local validator through pack/validate/dev/start.
2. Add `ApplicationPortableLaunchConfigPolicy`; route every runtime-specific package `llmConfig` through its recursive schema-aware validation. Preserve exact token-count/pricing fields and reject the CR-009 nested password/authorization/access-token/endpoint cases with config paths.
3. Clean-cut rename `ApplicationLaunchPackageBaselineBuilder` to `ApplicationLaunchResourceBaselineBuilder`; make its definition-only provenance distinguish manifest-package from alternate-selected resource sources.
4. Extend the shared contract with `selectedResourceBaseline` and `ApplicationLaunchSelectionPreview`; keep manifest package baseline, selected baseline, sparse saved override, and post-overlay effective configuration as distinct shapes/stages.
5. Add `previewSelectedResourceBaseline` and the narrow Studio selection-preview route. It resolves the exact unsaved ref without persistence, overlay, host validation, readiness change, or package fallback.
6. Update stored-view evaluation: no row uses package=selected baseline; valid alternate row exposes its baseline before overlay; deleted selection has null selected/effective; stale topology exposes current selected baseline for explicit replacement but keeps the saved row invalid and non-runnable.
7. Update Studio setup/editor components to request/discard identity-bound previews, disable save while pending/invalid, use only selected baseline for inherited values, persist sparse fields, and reload after definition refresh/save/reset. Remove the `packageBaseline`/`effectiveConfiguration` inheritance heuristic.
8. Implement mixed-runtime editing: blank team fields mean per-member inheritance; common inherited runtime may drive team model catalog; mixed inherited runtimes disable team-wide model selection until an explicit common runtime is selected.
9. Keep PUT as final concurrency validation. If definition identity/topology changes after preview, reject and reload; do not persist preview or derived baselines.
10. Preserve runtime/model/credential ports, three readiness statuses, standalone pre-listen gate, invalid-row preservation, explicit Replace/Reset, and guarded backend consumption.
11. Preserve exact graph-local `MemberTeamContextBuilder` propagation through all mixed root/subteam/persistent/task/recovered member paths.
12. Add durable coverage for recursive portable policy, unsaved alternate preview, saved alternate field clearing, mixed-runtime team editing, preview/PUT catalog race, deleted selection, stale topology, effective provenance, and prompt semantics. Replace the obsolete no-context auto-repair test.
13. Rerun fresh-root standalone and Studio package-default/alternate-override/edit/reset real journeys, then API/E2E prompt/provider/events/artifacts and cleanup evidence.

### Sequence 7 — Mount the existing Agent Tools route in standalone

1. Keep Codex/Claude native file tools, existing Agent Tools session/catalog/dispatcher/adapters, configured MCP-origin resolution, descriptor materializers, authorization gates, endpoint seeding, and cleanup unchanged.
2. Import `registerAgentToolsMcpRoutes` into `build-standalone-application-server-composition.ts`.
3. Await `registerAgentToolsMcpRoutes(app)` after current plugin setup and before `registerStandaloneApplicationStaticRoutes(app, selection)`.
4. Add/update the composition test so an unauthenticated request reaches the existing 401 gate instead of generic/static 404; assert external `/mcp/gateway` remains unavailable. Do not add route aliases or native file adapters.
5. Return through source review. API/E2E then corrects its expectation to inspect descriptor/`tools/list`, requires Brief `publish_artifacts` and `send_message_to` but not gateway `write_file`, and reruns native file operation -> publication/message -> researcher/writer handoff -> projected artifacts.
6. Preserve `APIE2E-REPO-005` separately as Unclear.

### Sequence 8 — Documentation and removals

1. Update application development, SDK, server application-engine/storage/orchestration, Agent Tools transport, and Studio application docs.
2. Document standalone config, browser and internal runtime route surfaces, capability auth, data root, readiness, and shutdown behavior; distinguish external MCP gateway.
3. Remove obsolete startup/dev files listed above; do not remove or redesign established Agent Tools owners for CR-013.
4. Confirm no compatibility aliases, route aliases, hidden mock fallback, native-file gateway adapter, or external gateway exposure is introduced.

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
- **Package default versus mandatory standalone setup:** Package defaults make the artifact runnable and Studio overrides optional. This trades machine-independent selection for an honest host-requirement check; credentials/endpoints remain outside the package.
- **One launch authority versus standalone-specific config:** Extending/refactoring the current configuration owner preserves one policy across hosts. It is more contract work than a local standalone patch but prevents duplicated selection/readiness semantics.
- **Source-only standalone declaration versus manifest v4 field:** Devkit metadata lets build tooling enforce the promise without altering runtime manifest v4. Standalone start still validates the selected package even when invoked outside a project.
- **Three statuses versus a fourth invalid-override status:** Keep the approved product-level outcomes small. `HOST_REQUIREMENT_MISSING` covers all host-local blockers, while closed issue scope and per-slot override state preserve exact diagnosis. This avoids both status proliferation and the false claim that an invalid saved override corrupts package bytes.
- **Computed selected baseline versus persisted snapshot:** Recompute from the current definition graph on read/preview/PUT. This keeps definitions authoritative and avoids migration/stale duplication; identity-bound preview plus PUT revalidation handles catalog races.
- **No-write preview versus UI definition traversal:** One narrow server preview adds an API round trip but preserves one traversal/precedence owner and supports sparse editing correctly. The UI never imports server definition semantics.
- **Schema-aware portability versus broad secret keywords:** Closed runtime schemas safely retain legitimate token/pricing tuning while recursive semantic rejection blocks credentials/endpoints at any depth without app-specific exceptions.
- **Existing registrar reuse versus gateway refactor:** CRR-016 proves the route/session/catalog/dispatcher already work together in Studio. Reusing that registrar is the proportionate fix; a new runtime/ports layer would add risk without serving the failure.
- **Internal session callback versus external MCP gateway reuse:** Separate paths/owners avoid granting standalone a broad generic integration surface. The cost is two clearly named MCP transport concepts in Studio; documentation and route tests keep them distinct.
- **Native tools versus server MCP projection:** Keeping native file operations in Codex/Claude avoids redundant server adapters and preserves runtime capability semantics; eligible publication/message and configured MCP-origin tools remain reachable through the existing session route.

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
14. **Default portability versus host availability:** A correct package can declare a runtime/model missing on a machine. Mitigation: exact host ports yield `HOST_REQUIREMENT_MISSING` before listen/entry; never silently select another model.
15. **Override/package tuning mismatch:** A model/runtime override could inherit incompatible `llmConfig`. Mitigation: atomic provenance rule clears or revalidates tuning when the pair changes.
16. **False readiness regression:** Multiple UI/lifecycle/SDK checks could drift. Mitigation: all call the same authority; no `READY` status or nullable required profile remains.
17. **Prompt authority regression:** New/restored/task member handles might omit builder injection. Mitigation: require builder in handle constructors and cover all registry/factory paths with distinct-catalog prompt tests.
18. **Invalid override fallback or loss:** A deleted shared resource or changed member topology could cause the resolver to use package defaults silently or auto-delete user state. Mitigation: preserve the row and baseline separately, emit `HOST_OVERRIDE` issue, set the affected effective configuration null, block `requireRunnable`, and require explicit Replace/Reset.
19. **Editor self-inheritance:** Clearing a saved alternate field could preserve its old value if Studio uses the effective result as baseline. Mitigation: expose selected-resource baseline explicitly, delete the web heuristic, and test first-save plus field-clear paths.
20. **Preview/catalog race:** A selected resource may change or disappear after preview. Mitigation: bind results to exact app/slot/ref, discard stale responses, and make PUT re-resolve identity/topology before write.
21. **Mixed-runtime bulk edit ambiguity:** A team-wide model control could incorrectly assume one runtime. Mitigation: represent mixed inheritance explicitly and require an explicit common runtime before team-wide model selection.
22. **Recursive secret-policy over/under-match:** A broad token heuristic can reject tuning or admit credentials. Mitigation: closed typed token-count/pricing schemas plus recursive negative cases for password, authorization, access-token value, endpoint, and workspace fields.
23. **False gateway-tool expectation:** Package `toolNames` could be mistaken for descriptor `enabled_tools`, causing native file tools to be duplicated through MCP. Mitigation: assert actual descriptor/`tools/list`, eligible adapter providers, and `ToolOrigin.MCP` resolution.
24. **Registrar bypass:** A local reimplementation could skip the existing capability/session gates. Mitigation: reuse `registerAgentToolsMcpRoutes(app)` unchanged and assert its established 401/404 behavior.
25. **Internal/external MCP conflation:** Reusing `/mcp/gateway` could expand standalone's public surface. Mitigation: separate files/registrars/owners, exact route inventory, and negative external-route conformance.
26. **Descriptor/route mismatch:** Standalone can issue a valid descriptor while omitting its route. Mitigation: composition test exercises the advertised path and reaches the existing authorization gate before any API/E2E business run.
27. **Over-broad corrective scope:** The superseded SR-007 design could re-enter implementation. Mitigation: SR-008 explicitly withdraws it, production source is restored, and the Local Fix file list is closed.
28. **Broad-suite unattributed failures:** `APIE2E-REPO-005` may conceal independent debt. Mitigation: preserve exact output for API/E2E reconciliation; do not claim it is fixed by DS-014 or use it to expand this design.

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
- Implement the exact ARCH-REV-006 stop order and disposal methods for timers, communication sessions, custom WS sessions/listeners, notification sockets/bridge, run observers, workers, and streaming subscriptions; CR-013 adds no stop owner.
- Keep `autobyteus-app start` build-free: validate the existing package, derive the source-manifest local ID, materialize only missing non-secret data-root config, and call `startStandaloneApplicationHost`. The public server start API must not install process signals.
- Keep `dev:studio` on the current Studio local-package import/reload boundary and preserve the explicit Studio Reload action; do not inject a second iframe lifecycle or browser automation into the devkit.
- Treat package defaults as immutable baseline and host rows as overrides only. Never seed/copy defaults or credentials.
- Keep manifest package baseline, selected-resource baseline, sparse host override, and effective configuration as four distinct meanings. Rename the baseline builder cleanly; do not keep the package-only alias.
- Expose unsaved resource selection only through the no-write preview boundary. Studio must not traverse definitions, infer from summaries, or reuse a post-overlay effective result as inheritance.
- Bind preview results to exact application/slot/ref, discard stale responses, and re-resolve on PUT. Never persist the preview or selected baseline.
- For mixed-runtime teams, blank bulk fields mean per-member inheritance; require an explicit common runtime before accepting a bulk model override.
- Enforce package portable configuration through one recursive schema-aware policy. Preserve only exact approved token-count/pricing fields; reject nested credential/authorization/token-value/endpoint/workspace semantics and never log values.
- Resolve package validity before saved override validity. When a saved resource/member topology is invalid, retain the row and package baseline, set only the affected effective configuration null, emit a `HOST_OVERRIDE` issue, and never execute the baseline until explicit replacement/reset.
- Keep aggregate readiness free of duplicated configuration arrays; per-slot views are the single configuration projection and `requireRunnableConfiguration` requires aggregate `RUNNABLE`.
- Run pure package completeness validation in pack/project validate/dev/start; run host availability only after process prerequisites are ready.
- Keep platform lifecycle health and application-run readiness separate in types, health output, Studio gating, standalone exit policy, and backend guards.
- Remove every null-profile and request/resource fallback on the Brief launch path.
- Pass the exact graph-local `MemberTeamContextBuilder` through every mixed member construction/recovery path and assert final prompt semantics.
- Keep Codex/Claude native file tools native. Never add read/write file adapters because a package lists those names.
- Import and await the existing `registerAgentToolsMcpRoutes(app)` in standalone before the static wildcard. Do not modify its signature, session/catalog/dispatcher construction, descriptor path, or authorization behavior for CR-013.
- Keep internal `/mcp/agent-tools/:sessionId` and external `/mcp/gateway` separate. Standalone registers only the former and adds no alias/proxy.
- Implementation proves the existing route's 401 gate and external-gateway absence. API/E2E separately inspects descriptor/`tools/list` and proves native file operation plus server `publish_artifacts`/`send_message_to`, handoff, and artifacts.
- Do not change application storage schemas or create a data migration.
- Do not add package-vNext, marketplace, or identity/account concerns to this implementation.
- Preserve exact current Studio behavior through tests and use Brief Studio as the real cross-host proof.
