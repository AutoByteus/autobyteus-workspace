# Design Spec — Universal Application Dual-Host Foundation

## Current-State Read

The Universal Application Dual-Host Foundation, SR-011 naming correction, SR-013 architecture simplification, and SR-016 executable boundary are functionally passed:

- architecture approval is recorded through `ARCH-REV-014`;
- cumulative source and durable-test review pass through `CRR-037` and `CRR-038`;
- real Studio/standalone publication, recipient-name handoff, worker-exit restart, projection, restart/recovery, remount, cleanup, and exact `73/73` package parity pass through `API-REV-013`;
- delivery protected that v1.4.35 state at `42d43674d8215c3987d8a6e265a2648c754bf6de`.

The required delivery refresh to `origin/personal@54890a07f74e941a7a12b6daaa26364f4c927b72` (v1.4.50) is paused on three semantic conflicts after 231 upstream commits. Source analysis also finds a non-conflicting semantic break: v1.4.50 removed two `CodexThreadBootstrapper` parameters, while both ticket callers and AFB-004 still pass/check the application/process Agent Tools session manager at obsolete argument 7. JavaScript ignores it and the constructor can select a process default.

SR-017 added DS-017 as `Design Impact — Base Evolution`. SR-018 closes the bounded AR-012 transition-inventory gap without changing that production design: two checkpoint-owned tests must use the current v1.4.50 prompt-bootstrap and runtime-tool-exposure owners, while three other deleted-exposure imports are already correctly reconciled inside the 23 common auto-merged paths. DS-017 preserves the complete passed architecture and combines four current base contracts: mandatory readable-provider migration gating before Studio listen, awaited active-run event publication after durable artifact projection, retention/blocking of unavailable explicit-or-inherited effective models, and the current six-argument Codex bootstrapper with session manager at argument 5. The complete conflict/overlap/inventory/verification proof is in [latest-base-integration-design-analysis.md](latest-base-integration-design-analysis.md).

This is a bounded semantic integration, not a new platform refactor. All earlier DS-014/SR-010/SR-011 bind-once descriptions remain historical; DS-015 remains the runtime authority; DS-016 remains the executable boundary with its one updated position fact. No broad facade, shared server mode, compatibility overload, new lifecycle, package/schema change, or process-global application fallback is introduced.

## Intended Change

Implement one universal application startup boundary and two explicit server builders:

- **Studio server:** preserves the current setup-first Studio route and iframe v4 wire protocol.
- **Standalone application server:** selects one current application bundle from deployment configuration, serves that bundle's UI at `/`, supplies same-origin bootstrap data, exposes selected-application browser ingress under `/_autobyteus/*`, and registers the required capability-scoped internal runtime callback at `/mcp/agent-tools/:sessionId`.

Both server assembly roots build one `ApplicationPlatformRuntime` and use the same bundle, engine, gateway, storage, orchestration, communication, event, and artifact owners. Each server process creates one `AgentToolsMcpRuntime` and passes its exact route dependencies to the internal registrar. Application-runtime construction creates a `ScopedAgentToolMcpSessionManager` over that process family and binds its sessions to the application-runtime-scoped publisher. Studio also registers the separate general external-client MCP gateway. Standalone registers only the per-run Agent Tools route; it never registers the external gateway or inherits Studio MCP configuration.

The application source calls `startApplication(...)` once. An SDK-owned bootstrap coordinator selects the correct bootstrap provider, normalizes provider-specific wire data into one host-neutral runtime bootstrap, creates the existing application client, and calls the business mount callback. Application code does not select a host and does not branch on Studio versus standalone.

The first slice keeps manifest v4 and the current package layout unchanged. Host selection, standalone root ownership, and the standalone package identity are deployment concerns, not new manifest fields.

The application package is assembled once and is a read-only runtime input in both hosts. Studio import/selection and standalone configured selection consume the same package bytes; every mutable database, log, migration-ledger, runtime-status, and orchestration write goes under the host's configured application-data root.

The executable hardening layer is development-time only: standard tests parse/resolve critical production/application imports and scoped-global call sites, reject forbidden directions, and point contributors to the exact documented correction. DS-017 updates its Codex session-manager position fact from 7 to 5 while reconciling v1.4.50 production behavior at the existing owners.


A standalone-capable application also owns its portable launch baseline. Its source-only devkit config declares `standalone.enabled: true`; each required slot has a bundled manifest default and every effective leaf resolves package-owned `runtimeKind` plus `llmModelIdentifier`. Studio may store an override overlay under its data root, but it never mutates the package. A fresh standalone data root contains no override row and normally runs directly from package defaults.

One `ApplicationLaunchConfigurationService` becomes authoritative for resource selection, package-baseline resolution, optional host override overlay, structured provenance, host capability validation, and the runnable result. Process/platform lifecycle readiness remains separate. Application run readiness has exactly three terminal meanings: `RUNNABLE`, `INVALID_PACKAGE`, and `HOST_REQUIREMENT_MISSING`. `INVALID_PACKAGE` is reserved for package-baseline defects. `HOST_REQUIREMENT_MISSING` means a valid package is blocked by host-local state: either a missing runtime/model/credential or an invalid/stale saved host override. A required runnable result never contains a null effective profile, and an invalid override never silently falls back to the package baseline.

The same design is exposed as a native application-folder workflow:

- `pnpm dev` builds a disposable package, starts the real standalone application server, watches application inputs, and performs a graceful rebuild/restart/browser reload cycle.
- `pnpm dev:studio` builds/watches the current package through the real local Studio import/reload and iframe lifecycle.
- `pnpm build` produces `dist/importable-package`; `pnpm validate` validates that output.
- `pnpm start` validates and runs the existing output through the production standalone application server. It never builds, watches, enables development reload, or registers mock routes.

`autobyteus-app` remains the thin application-project command facade. It delegates standalone process construction to a narrow exported `startStandaloneApplicationHost` boundary in the existing `autobyteus-server-ts` project. No extra top-level project or second server implementation is introduced.

### Architecture Review Round 1 Resolution Map

| Finding | Resolution Location | Scope Effect |
| --- | --- | --- |
| AR-001 | `Named Startup / Readiness Allocation`, lifecycle phase API, stop order, and updated sequence/guidance | No new product behavior; replaces a generic readiness placeholder with exact current/target ownership and failure policy |
| AR-002 | `Exact Frontend Startup API And Migration Inventory`, removal plan, file mapping, and clean-cut sequence | No compatibility path; accounts for source and generated iframe-only consumers |
| AR-003 | Exact dependency-construction diagram and server/application-runtime-critical Modify / Retain inventory | Bounded in-scope DI conversion plus two narrow cycle-break seams; unrelated process globals remain explicitly retained |
| AR-004 | Canonical seven-row behavior table in [investigation-notes.md](investigation-notes.md) and corrected BEH-005 evidence below | Documentation/traceability only; security evidence is now `SEC-CONSTRAINT-001`, not a behavior ID |

### Architecture Review Round 2 Resolution Map

| Finding | Resolution Location | Scope Effect |
| --- | --- | --- |
| AR-001 | P2A/P2B/P6, dependency rules/diagram, sequence/guidance, final file map, and SV-C24 | Bounded consistency correction: protected operational paths precede Prisma everywhere, and exactly seven tool groups include Search |
| AR-005 | DS-006 maintained-project mapping, Modify/Delete and target file maps, exact command example, sequence, and disposable pack probe in investigation/self-validation | Declaratively maps both maintained non-default layouts into the existing pack owner; removes rather than adapts their custom builders/generated mirrors |
| AR-006 | [proposal-critical-analysis.md](proposal-critical-analysis.md) correction, required behavior, roadmap, and decision table | Removes the current broad server as any standalone fallback/stage; named runtime prerequisites remain reusable only inside the explicit server builders |

### Downstream Code Review Resolution Map

| Finding | Resolution Location | Scope Effect |
| --- | --- | --- |
| CR-006 | DS-011/DS-012, package-default contract, precedence, validation, Studio override/reset, business-consumption rule, file/change map | Makes complete application-owned defaults the standalone baseline; no mandatory standalone setup UI or copied state |
| CR-007 | Run-readiness union, host capability validation, lifecycle separation, standalone/Studio failure policy, conformance cases | Replaces overloaded resource `READY` with one truthful application-run invariant |
| CR-008 | DS-013, exact mixed-team builder propagation, runtime dependency/change map, prompt-semantic conformance | Bounded injected-definition-service correction; no catalog merge, package special case, or repository-wide DI rewrite |

### Architecture Round-4 And Round-5 Resolution Map

| Finding | Resolution Location | Scope Effect |
| --- | --- | --- |
| AR-007 | DS-012 evaluation precedence, aggregate/per-slot types, invalid-override branch/example, Studio reset, persistence semantics, sequence, tests, SV-010 | Keeps the approved three statuses while representing a valid package plus missing selected resource or stale saved member topology without fallback or package blame |
| ARCH-REV-005 | Architecture approval of SR-005 | Confirms the package-default, invalid-override, three-status, direct-use persistence, and application-runtime dependency foundation before IR-007 |

### Code Review Round 12 Resolution Map

| Finding | Resolution Location | Scope Effect |
| --- | --- | --- |
| CR-009 | DS-011 portable launch configuration policy, validator/file mapping, tests, and SV-C35 | Retains exact supported token-count/pricing tuning while recursively rejecting credential, authorization, endpoint, and host-local fields; no broad token exception or compatibility branch |
| CR-012 | DS-012 selected-resource baseline/preview, provenance, refresh/concurrency, mixed-runtime editing, UI/API mapping, SV-C33/SV-C34 | Strengthens the existing launch service so Studio can edit sparse alternate-resource overrides without definition traversal, post-overlay self-inheritance, or implicit fallback |

### Code Review Round 16–20 / API-E2E Round 5–7 Resolution Map

| Finding | Resolution Location | Scope Effect |
| --- | --- | --- |
| APIE2E-F005 / APIE2E-STANDALONE-MCP-001 | DS-014 server/configured-MCP projection and bounded route-registration map; SV-C36–SV-C38 corrected by SV-013/SV-014 | Completes AC-005/AC-006 in standalone after package launch succeeds; API/E2E must inspect the descriptor rather than package `toolNames`; unrelated runtime internals are not part of that proof |
| CR-013 | DS-014 route placement and negative surface assertions | Resolved by IR-010/CRR-017; both hosts now mount the established internal callback |
| CR-014 | DS-013 application-runtime-scoped runtime definition construction | Resolved by IR-011/CRR-019; both real package members receive valid descriptors |
| APIE2E-F007 / APIE2E-STANDALONE-MCP-003 | DS-014 session-bound publication publisher and SV-C39–SV-C42 | Historical trigger proved route/auth/tools/messaging while publication used the wrong manager; the corrected application-runtime publication/journal/projection path now passes in API-REV-009/010 |
| CR-015 | DS-014 process/session manager, bind-once publication publisher, lifecycle and file/dependency maps | Resolved through ARCH-REV-008, IR-015, CRR-026, and API-REV-009/010; SR-011 preserves the exact instances and lifecycle while renaming their roles |
| APIE2E-REPO-005 | Residual-risk/evidence sections only | Preserved as `Unclear` broad-suite diagnostic; it neither changes nor justifies the design |

### Code Review Round 28 Naming Resolution Map

| Finding | Resolution Location | Scope Effect |
| --- | --- | --- |
| `CR-018` / `CRR-028` | Current-state read; terminology; role vocabulary; exact current-to-target name/file map; dependency diagram; main-domain naming check; server/runtime-critical inventory; docs/test/export plan; SV-016 | Resolved through ARCH-REV-009, IR-016, CRR-029, API-REV-011, and CRR-030. SR-013 preserves the familiar vocabulary while removing the two now-unnecessary bind-once roles and making the replacement lifecycle owners explicit. |

### Code Review Round 31 Architecture-Simplification Resolution Map

| Finding | Resolution Location | Scope Effect |
| --- | --- | --- |
| `CR-019` | DS-015; narrow runtime boundary; exact REST/realtime/host-management contracts; registrar and file maps; SV-017 | Replaces a 19-field outward service collection with four immutable projections; private stores/recovery/run/engine/session/shutdown owners stay inside runtime construction. No route or wire change. |
| `CR-020` | DS-015 package ownership, construction, refresh/rollback sequence, GraphQL mapping, file inventory; SV-017 | Separates package state/query, package commands, and ordered bundle -> availability -> agent -> team propagation. Removes later-bound callbacks and application-path defaults without changing package/UI behavior. |
| `CR-021` | Initial DS-015 target in SV-017; corrected DS-015 artifact-delivery and run-cleanup contracts in SV-018 | SR-012's general direction was proportionate but incomplete. SR-013 removes both proxies/broad host while preserving ensure/restart and exact cleanup through closed queues and early lifecycle owners. |

### Architecture Review Round 10 Resolution Map

| Finding | Resolution Location | Scope Effect |
| --- | --- | --- |
| `AR-008` / `MP-ARCH-010-001` | DS-015 artifact-delivery queue/service; return spine; lifecycle; construction/file/validation maps; SV-018 | Preserves current worker ensure/restart before application artifact-handler invocation after the controller/launcher split. Adds one closed domain queue and real consumer; does not restore the broad engine host or add a deferred handler. |
| `AR-009` / `MP-ARCH-010-002` | DS-015 application session scope, `AgentRunResourceManager`, exact registry methods/results, cleanup sequence, file/validation maps; SV-018 | Preserves inactive-discovery/replacement/terminate/stop cleanup through early dependencies. Removes the later registry-to-manager callback and does not add a generic event bus or global fallback. |
| `CR-019`, `CR-020` | Retained DS-015 four projections and package owner sequence | ARCH-REV-010 confirms both resolved in design; SR-013 does not reopen them. |

### Eight-Candidate Hardening Audit Resolution Map

| Candidate | Decision And Resolution Location | Scope Effect |
| --- | --- | --- |
| Automated module-boundary enforcement | **Adopt Now** — DS-016, AFB-001–AFB-005, architecture test/file map, docs plan, SV-019 | Adds one standard test; prevents a contributor from compiling reviewed forbidden directions; no runtime source change. |
| Deliberate application-platform public API | **Defer With Named Evidence Gap** — hardening supplement | Current private root API remains unchanged until a published server or supported external host consumer exists. |
| Shared Studio/standalone conformance suite | **Defer With Named Evidence Gap** — hardening supplement | Zero same-layer duplicated host-builder assertions exist; retain owner tests and API/E2E rather than add a generic host harness. |
| Consistent lifecycle vocabulary/contracts | **Reject** — hardening supplement lifecycle inventory | Distinct subject lifecycles remain separate; no generic state machine. |
| Ownership-led directory mapping | **Reject** — hardening supplement ownership inventory | Current placement remains; no cosmetic move. |
| Standardized role suffixes | **Reject** — hardening supplement role audit | Passed SR-011 vocabulary remains; no preference rename. |
| Cross-boundary observability correlation | **Defer With Named Evidence Gap** — hardening supplement identifier trace | Existing canonical identities remain; no ambient correlation/event machinery without a demonstrated diagnostic dead end. |
| Executable architecture documentation | **Adopt Now** — DS-016 docs plan | Adds one matching table to existing docs and a pointer; no generator or duplicated diagram system. |

### Architecture Review Round 12 Resolution Map

| Finding | Resolution Location | Scope Effect |
| --- | --- | --- |
| `AR-010` / `MP-ARCH-012-001` | DS-016 AFB-004 obligation table, exact binding/shape rules, omission fixtures, hardening supplement, SV-019 | Adds fail-closed checks for optional application construction inputs across publication/resource, run, session/provider, and team/context families. Named general-process assembly remains explicit; no production constructor or runtime source changes. |
| `AR-011` / `MP-ARCH-012-002` | DS-016 SFC extraction, seven project profiles, manifest/unresolved rules, parser dependency/file inventory, SFC/cross-project fixtures, hardening supplement, SV-019 | Governs all eleven Vue SFCs and every server/web/Brief/Socratic/template source with deterministic parsing and ownership. Adds one test-only direct dev dependency and lockfile entry; no generated `.nuxt` or runtime dependency. |
| `AR-010` remaining in `ARCH-REV-013` | DS-016 nested-parent audit plus Codex/Claude backend-factory rows/fixtures, hardening supplement, SV-019/SV-C60 | Requires the exact graph-local provider bootstrap/session objects inside the present parent factory properties; preserves deliberately process-scoped Codex manager/cleanup and adds no recursive constructor rule. |

### Latest-Base v1.4.50 Integration Resolution Map

| Base Change / Conflict | Resolution Location | Scope Effect |
| --- | --- | --- |
| Mandatory readable-provider migration gate versus explicit Studio builder/lifecycle | DS-017 startup spine; process-resource failure/unwind rules; SV-020 | Run/check the base-owned migration after Prisma/vault and before `buildStudioServer`/listen; retain standalone's generalized required-migration gate and all explicit assembly |
| Awaited `run.publishEvent` versus application-scoped publication durability | DS-017 publication spine; DS-004/DS-015 preservation; SV-020 | Retain exact application dependencies and snapshot/projection atomicity; await the current run pipeline after commit and never delete committed state on later failure |
| Unavailable-selector retention versus sparse inherited editing | DS-017 editor spine; DS-012 preservation; SV-020 | Compute availability from explicit-or-inherited effective model, retain/warn/block, and preserve package baseline/override/reset authority |
| Six-argument Codex bootstrapper versus obsolete application/process argument 7 | DS-017 construction table; corrected DS-016 AFB-004 row; SV-020 | Move the session manager to current argument 5 in both callers/checker; retain application definition service argument 2; no compatibility overload |
| Twenty-three auto-merged common paths | DS-017 overlap disposition and verification matrix | Preserve application-scoped identity and adopt current base lifecycle/prompt/session behavior through focused plus full dual-host proof, not textual merge confidence |
| `AR-012` / checkpoint tests importing v1.4.50-removed seams | DS-017 exact durable-test inventory; checkpoint transition audit; SV-020/SV-C67–SV-C68 | Move Brief prompt proof through current `CodexThreadBootstrapper -> composeCarpenterPrompt` and MCP runtime proof through `RuntimeAgentToolExposure`; restore no deleted module or compatibility wrapper |

### Discussion-Stage Self-Validation Resolution Map

The use-case, canonical-principles, refreshed-base, and downstream consistency audit is retained in [design-self-validation.md](design-self-validation.md). It produced nineteen bounded corrections across discussion and downstream rework; SV-019 now includes the ARCH-REV-012/013 checker-completeness correction:

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
| SV-013 | DS-014 existing-route registration plus correct server/configured-MCP projection | Restores the verified source boundary, preserves ARCH-REV-006, and routes CR-013 as Local Fix |
| SV-014 | General gateway purpose, Studio MCP-state boundary, deferred application-owned MCP provisioning, and upstream runtime-tool exclusion | Makes the final user-confirmed ownership explicit without changing CR-013 source scope or architecture |
| SV-015 | Application-runtime-scoped publication authority, exact process/session family, bind-once cycle break, scoped revocation, and bounded adapter proof | Corrects the publication premise disproven by API-REV-007 without reopening native tools, configured MCP provisioning, or the general gateway |
| SV-016 | Familiar role vocabulary, clean current-to-target map, source/export impact, and behavior-preservation proof | Resolved CR-018 without changing runtime behavior or expanding into an automatic repository-wide rename |
| SV-017 | Initial narrow outward runtime contracts, explicit package refresh ownership, and proposed acyclic run/publication/engine/event construction | Resolves CR-019/CR-020; superseded for the two CR-021 lifecycle edges by SV-018 after ARCH-REV-010 |
| SV-018 | Ensure-before-artifact delivery and exact acyclic run-resource cleanup | Resolves AR-008/AR-009 through a closed artifact-delivery queue/service and early session-scope/resource/registry chain while retaining every passed behavior and avoiding generic deferred machinery |
| SV-019 | Eight-candidate proof and executable boundary policy, corrected through ARCH-REV-013 | Adopts only one architecture test plus matching existing-doc table; adds complete application-construction obligations and heterogeneous TS/JS/Vue project resolution; defers/rejects unsupported abstractions and preserves all passed production behavior |
| SV-020 | Required v1.4.50 semantic integration | Combines the provider migration gate, awaited run event, unavailable effective model, and current Codex constructor with the passed dual-host/application-scoped architecture; proves all common overlaps without broadening |

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001, REQ-004 / AC-001, AC-003, AC-006 | Select/enter/reload/exit an installed app in Studio or start a configured standalone host | Investigation “Relevant Existing Behavior,” BEH-001 | Preserve complete Studio presentation lifecycle; add standalone root over the same bundle/runtime | Build/use: DS-007; Studio start: DS-001; Studio reload/exit: DS-009; standalone: DS-002/DS-008; shared invocation: DS-003 |
| BEH-002 | Contract | REQ-002 / AC-002, AC-003, AC-007 | Application calls `startApplication` | Investigation BEH-002; frontend SDK probe | Replace iframe-owned application entry with provider-owned bootstrap and one client construction path | DS-001, DS-002, DS-009 |
| BEH-003 | Contract | REQ-003 / AC-001, AC-004, AC-008 | Validate/discover package root and local application ID | Investigation BEH-003 | Reuse one read-only manifest-v4 package unchanged; standalone selection is configuration | DS-002, DS-005, DS-007, DS-008 |
| BEH-004 | System | REQ-004, REQ-005, REQ-007, REQ-009, REQ-010 / AC-005, AC-006, AC-010, AC-014–AC-016, AC-018, AC-022 | Backend starts a configured real run, or an active run publishes after its application worker exits | Investigation BEH-004; API-REV-009/010; MP-ARCH-010-001 | Preserve launch/route/publication/messaging/projection identity and worker ensure/restart before artifact handler invocation | DS-011, DS-012, DS-003, DS-004, DS-014, DS-015 |
| BEH-005 | Operational | REQ-005, REQ-009, REQ-010 / AC-003, AC-009, AC-010, AC-018, AC-023 | Start/stop either server or discover/replace/terminate an application run | Investigation BEH-005; API-REV-011; MP-ARCH-010-002 | Preserve split surfaces, scoped session identity, and synchronous exact-run session/file/artifact/memory cleanup through familiar owners | DS-005, DS-014, DS-015, then DS-001/DS-002 |
| BEH-006 | Operational | REQ-004–REQ-007, REQ-009 / AC-005, AC-006, AC-010, AC-011, AC-013–AC-016, AC-018 | Developer runs application-folder development/build/validate/start commands or conformance | API-REV-011 / CRR-030 | Preserve passed commands, canonical package parity, real-host execution, and cleanup; update names/imports/tests/docs without changing output bytes or behavior | DS-006, DS-007, DS-010–DS-012, DS-014 |
| BEH-007 | System | REQ-004, REQ-005, REQ-007 / AC-006, AC-012, AC-015, AC-016 | Backend ensure-ready, host override save/invalidation/reset, and recovery | Storage/orchestration/configuration investigation; AR-007 | Reuse current schemas/rows; preserve invalid saved rows as host-override diagnostics, block launch, and remove the row only on explicit reset | DS-003, DS-004, DS-005, DS-012 |
| BEH-008 | System | REQ-008 / AC-017 | Real package-team run constructs member prompts | Investigation BEH-008; CR-008 | Carry the exact application-runtime-scoped team definition service through member context so package team instructions reach prompts | DS-013, then DS-004 |
| BEH-009 | Developer / Contract | REQ-009 / AC-018 | Contributor follows either server construction into the application runtime, Agent Tools session handling, run lifecycle, and cleanup | IR-016; CRR-029; API-REV-011; CRR-030 | Preserve the implemented responsibility vocabulary while removing the two superseded bind-once implementations | Cross-cutting vocabulary over DS-001–DS-005, DS-014, and DS-015 |
| BEH-010 | Developer / Contract | REQ-010 / AC-019–AC-023 | Contributor changes a route, package command/refresh flow, run cleanup/publication, event/artifact delivery, or engine lifecycle | CRR-031; ARCH-REV-010; MP-ARCH-010-001/002 | Follow the four projections, package owners, exact session-scope/resource/registry chain, and ensure-before-invoke delivery without private access, callbacks, globals, or deferred binding | DS-015 plus unchanged DS-001–DS-014 product spines |
| BEH-011 | Developer / Contract | REQ-011 / AC-024 | Contributor changes an application transport, package/bundle dependency, runtime/scoped publication dependency, or maintained application import | Current import/call scan; TypeScript resolution probe; hardening evaluation | Fail a forbidden dependency in the standard suite with exact AFB diagnostic; keep every permitted direction and production behavior unchanged | DS-016 development-time check over DS-001–DS-015 ownership boundaries |
| BEH-012 | Operational / System / Developer | REQ-012 / AC-025 | Operator starts upgraded host, agent publishes, Studio edits an unavailable effective model, or contributor integrates current Codex constructor | Paused v1.4.50 merge; three stage conflicts; constructor-source/AFB probe; latest-base supplement | Combine both approved behavior sets at their existing owners; reject whole-side selection, obsolete arguments, global fallback, and new subsystem | DS-017 over DS-005 startup, DS-004 publication, DS-012 editing, DS-014/DS-016 scoped construction |

The behavior map defines the real behavior this design serves. The spines below show how the target structure carries it.

## Reachable Product Use-Case To Spine Map

The authoritative reachable use-case inventory is in [requirements.md](requirements.md). No mechanically possible or unsupported future state is promoted into this map.

| Use Case ID | Primary / Secondary Spine(s) | Return / Local Spine(s) | Coverage Decision |
| --- | --- | --- | --- |
| UC-001 | DS-007, then DS-001 and DS-002 | DS-006 conformance evidence | Complete |
| UC-002 | DS-001, DS-003 | DS-004, DS-005 | Complete |
| UC-003 | DS-009 | DS-001 frontend startup state on explicit reload | Complete after DS-009 addition |
| UC-004 | DS-002, DS-008, DS-003, DS-014 | DS-004, DS-005 | Complete; passed through API-REV-011 |
| UC-005 | DS-002 | DS-005 failed preparation | Complete |
| UC-006 | DS-001 or DS-002 | Frontend startup state machine | Complete |
| UC-007 | DS-003 | Request result; DS-005 readiness gate | Complete |
| UC-008 | DS-003 | DS-004 live return/event path; DS-005 stop | Complete |
| UC-009 | DS-011, DS-012, DS-003, DS-004, DS-014 | Existing native/runtime loops; DS-005 platform readiness/stop | Complete; passed through API-REV-011 |
| UC-010 | DS-003 | DS-005 storage/readiness | Complete |
| UC-011 | DS-004 | DS-005 R1–R3 recovery | Complete |
| UC-012 | DS-012, DS-003 | DS-005 platform failure or application-run non-runnable result; retained engine service owner | Complete; passed through API-REV-011 |
| UC-013 | DS-008, DS-002 | DS-005 readiness | Complete |
| UC-014 | DS-005 | Existing stop/cleanup spine | Complete |
| UC-015 | DS-006, DS-007 | DS-005 process cleanup | Complete |
| UC-016 | DS-007, then DS-001/DS-002 | Frontend startup state; DS-016 dependency check | Complete; durable enforcement refined by SR-016 |
| UC-017 | DS-002, DS-008, DS-014 | Provider origin normalization, browser ingress origin policy, and established internal capability auth | Complete; CR-015 preserves route/security behavior |
| UC-018 | DS-010–DS-012, DS-014, then DS-002/DS-008 | DS-005 production process lifecycle/stop | Complete after CR-015 bind/revoke/close correction |
| UC-019 | DS-011 | Package-validation diagnostic return, including recursive portable-field policy | Complete after SR-006 correction |
| UC-020 | DS-012 | Selected-resource preview, sparse override save/edit/delete, and readiness recomputation | Complete after SR-006 correction |
| UC-021 | DS-012 | Host-capability diagnostic return; DS-005 process cleanup | Complete after SR-004 correction |
| UC-022 | DS-013, then DS-004 | Member prompt semantic assertion | Complete after SR-004 correction |
| UC-023 | DS-012 | Saved shared-resource deletion/stale-member invalidation -> host-override issue -> blocked launch -> explicit reset/delete -> package-default reevaluation | Complete after SR-005 correction |
| UC-024 | Naming projection over DS-001–DS-005 and DS-014 | Structural import/export/file/doc map plus retained behavioral regression | Complete and passed through CRR-030 |
| UC-025 | DS-015 narrow route/package/run/engine ownership | DS-001–DS-014 unchanged request/return/recovery/shutdown behavior | Complete and passed through API-REV-012 |
| UC-026 | DS-014 publication, then DS-015 artifact delivery | Worker-exit -> queue lease -> launcher ensure/restart -> controller artifact invoke -> projection | Complete and passed through API-REV-012 |
| UC-027 | DS-015 exact active-run removal | Inactive discovery/replacement/terminate/stop-all -> resource release -> result | Complete and passed through CRR-033/API-REV-012 |
| UC-028 | DS-016 contributor boundary check | Policy diagnostic -> replace private/global dependency with contract/SDK/injected dependency -> re-run | Complete and passed through CRR-037/API-REV-013 |
| UC-029 | DS-017 Studio migration gate, then DS-005 | Required migration result -> continue or pre-builder/listen failure -> resource unwind | Complete at design level; latest-base implementation/test required |
| UC-030 | DS-017 publication, then DS-004/DS-015 delivery | Commit -> awaited run pipeline -> queue/ensure/invoke; post-commit failure preserves durable state | Complete at design level; latest-base implementation/test required |
| UC-031 | DS-017 effective model editing, retaining DS-012 | Explicit-or-inherited selector -> availability warning/block -> valid choice or Reset | Complete at design level; latest-base implementation/test required |
| UC-032 | DS-017 constructor reconciliation plus corrected DS-016 | Current argument 2/5 injection -> application/process session identity -> AFB proof | Complete at design level; latest-base implementation/test required |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| [sources/autobyteus-vertical-application-developer-experience-proposal.md](sources/autobyteus-vertical-application-developer-experience-proposal.md) | Original universal-application vision | REQ-001–REQ-010 / AC-001–AC-023 | Product-direction input; illustrative contracts are not copied directly | Input source; approval `N/A` |
| [proposal-critical-analysis.md](proposal-critical-analysis.md) | Repository-backed readiness assessment and bounded recommendation | REQ-001–REQ-010 / AC-001–AC-023 | Supplies the accepted/revised/deferred decisions that constrain this design | Approved/refined through 2026-07-30; implemented foundation baseline |
| [design-self-validation.md](design-self-validation.md) | Use-case simulation, reachability classification, spine coverage, canonical design-principles audit, and latest-base reconciliation | REQ-001–REQ-012 / AC-001–AC-025 | Validates this design and records SV-001–SV-020 through downstream rework, hardening, and v1.4.50 integration | Complete validation evidence; approval `N/A` |
| [application-framework-architecture-simplification.md](application-framework-architecture-simplification.md) | Exact CRR-031/ARCH-REV-010 contracts, owners, spines, lifecycle, file inventory, sequence, and evidence | REQ-010 / AC-019–AC-023 | Defines the implemented behavior-neutral SR-013 architecture | Approved in ARCH-REV-011; implemented and passed through CRR-033/API-REV-012/CRR-034 |
| [application-framework-hardening-evaluation.md](application-framework-hardening-evaluation.md) | Eight-candidate source/reachability/proportionality proof and exact AFB dependency policy | REQ-011 / AC-024 | Defines DS-016 and records why the other six candidates do not justify source architecture change | Architecture-approved and passed through ARCH-REV-014/CRR-037/API-REV-013/CRR-038; DS-017 updates one position fact |
| [latest-base-integration-design-analysis.md](latest-base-integration-design-analysis.md) | v1.4.50 conflict, overlap, checkpoint-test transition, inventory, verification, and principles analysis | REQ-012 / AC-025 | Defines DS-017 combined behavior and current-owner proof without reopening the platform architecture | Corrected through SR-018; requires architecture approval |

## Task Design Health Assessment (Mandatory)

- Change posture: `Passed architecture plus bounded v1.4.50 semantic integration`
- Current design issue found: `Yes — Base Evolution`
- Root cause classification: `Tracked-Base Contract Change / Semantic Merge`
- Refactor needed now: `No new subsystem; reconcile five existing production files/call sites, current tests, and one AFB position fact`
- Evidence: the required base adds a mandatory provider-identity startup gate, awaited run-event publication, unavailable-selector retention, and a shorter Codex constructor. Three conflict paths combine separately approved behavior, while the auto-merged obsolete argument 7 silently discards the intended session manager.
- Design response: DS-017 keeps explicit builders, four projections, application-scoped authorities, durability, sparse inheritance, and route/package/schema behavior while adopting current base contracts at their existing owners. The detailed resolution and verification delta are in the latest-base supplement.
- Proportionality: no new framework, facade, server-mode builder, migration owner, event path, UI configuration authority, compatibility overload, or broad refactor. The earlier eight-candidate decisions remain closed.
- Intentional deferrals and residual risk: all prior public API/shared harness/correlation and marketplace/distribution gaps remain unchanged. Auto-merged common paths are regression scope, not grounds for speculative redesign.

## Terminology

- **Application project:** One developer source tree used by the devkit.
- **Package root:** The current importable container with `applications/`.
- **Application bundle:** One strict manifest-v4 runnable application under `applications/<localApplicationId>/`.
- **Host:** The outer runtime that selects and presents an application. The two hosts are Studio and standalone.
- **Bootstrap provider:** SDK-owned mechanism that acquires and validates host-specific bootstrap data. It is not the business request transport.
- **Provider wire payload:** Host-specific data exchanged before normalization. Studio uses iframe payload v4; standalone uses a strict root-relative same-origin payload. Application business code never receives either wire shape.
- **Runtime bootstrap:** Host-neutral, minimal application identity and endpoint data consumed by the shared startup coordinator.
- **Application client transport:** Existing HTTP/WebSocket implementation used after bootstrap.
- **Application-platform lifecycle:** Server owner that prepares application-runtime dependencies, performs recovery, reports readiness, and stops application workers and services in the reviewed order.
- **Server assembly root:** The top-level function/file that constructs one server and chooses its route set. “Composition root” remains an architecture description for this activity/folder only; `Composition` is not a type, return value, variable, or lifecycle role.
- **Application platform runtime:** One live, read-only set of connected application services plus its lifecycle, shared by all installed applications in Studio and restricted to the selected application in standalone. Building it prepares managers/factories/services; it does not start an agent/team run. Runs start only from business demand or legitimate recovery.
- **Dependency graph:** A design-only description of object references and construction order. No returned code object or variable uses `Graph`.
- **Agent Tools MCP runtime:** One process-lived registry/catalog/executor/dispatcher family plus route dependencies and scoped-session-manager creation. It is not the Studio external MCP gateway.
- **Scoped Agent Tools session manager:** Owns creation, tracking, redaction, selective revocation, issue blocking, and close for one session collection. One instance serves general process runs and a distinct instance serves each application platform runtime.
- **General process run supervisor:** Constructs and releases the process-level agent/team run managers and stops their runs during process cleanup.
- **Application run shutdown coordinator:** Idempotently stops application team runs and then agent runs while aggregating failures. It neither starts nor manages runs.
- **Acyclic lifecycle owners:** `ApplicationAgentToolMcpSessionScope`, `AgentRunResourceManager`, `ActiveAgentRunRegistry`, `ApplicationEngineController`, and the two closed queues are created before the services that issue sessions, publish, launch, or dispatch. The former bind-once publisher/handler are removed rather than generalized.
- **Selected application:** The single standalone bundle resolved from `{packageRoot, localApplicationId}`.
- **Application command facade:** `autobyteus-app`, which owns application-project config, packaging, validation, development orchestration, and the thin `start` delegation. It does not own server assembly or the application runtime.
- **Standalone process API:** `startStandaloneApplicationHost(config)` in `autobyteus-server-ts`, which owns construction/listen/signal-independent close for one standalone server process.
- **Standalone-capable project:** An application project whose source-only devkit config declares `standalone.enabled: true`; its current package manifest remains v4.
- **Package launch baseline:** Application-owned runtime/model values resolved from the manifest-selected bundled resource, enclosing application-owned team defaults, and leaf application-owned agent defaults. It contains no secrets or host endpoints.
- **Selected-resource launch baseline:** The exact currently selected bundle/shared agent or team’s definition-derived runtime/model values before any sparse host field override. For the manifest selection it equals the package baseline; for an alternate selection it is computed by the same server owner.
- **Selection preview:** A no-write, identity-bound evaluation of an unsaved execution-resource selection that returns either its selected-resource baseline or structured selection issues.
- **Host launch override:** Optional persisted Studio/host delta that selects a resource and/or overlays sparse fields without modifying/copying resource definitions.
- **Effective launch configuration:** The selected resource plus complete per-leaf runtime/model profile and field provenance after the selected-resource baseline and optional sparse host fields are combined.
- **Application-run readiness:** `RUNNABLE`, `INVALID_PACKAGE`, or `HOST_REQUIREMENT_MISSING`; distinct from process/platform lifecycle health. Host-local override invalidity and host capability absence share the last terminal status but are never conflated because every issue has a closed scope.
- **MCP Server Management:** Existing Studio/platform subsystem that starts or connects to host-configured external MCP servers and registers their tools as `ToolOrigin.MCP`.
- **Internal Agent Tools MCP transport:** Existing machine-to-process callback at `/mcp/agent-tools/:sessionId` for session-enabled server-owned adapters and selected available `ToolOrigin.MCP` tools. Its descriptor `enabled_tools` is a resolved run projection, not a copy of package `toolNames`; it is not browser bootstrap or user authentication.
- **General external MCP gateway:** Studio process endpoint at `/mcp/gateway` that exposes current host-registered `ToolOrigin.MCP` tools to external clients such as Cursor or Claude Code. It neither provisions MCP servers nor scopes tools to an application/run and is absent from standalone.
- **Application-owned MCP resource:** Deferred package-level declaration by which a focused application could request MCP servers/tools while shared platform provisioning owns lifecycle and host secrets. It does not exist in this ticket and must not be emulated by copying Studio MCP state.

Naming rule: all current application SDK/contract code identifiers use natural unversioned names. Types, functions, constants, validators, and filenames do not carry `V1`, `V4`, `_V1`, `_V4`, or equivalent suffixes. Serialized files/messages continue to carry their existing numeric `manifestVersion`, `contractVersion`, `backendDefinitionContractVersion`, and `frontendSdkContractVersion` values because those are protocol data, not code-symbol names. This clean-cut change renames all in-scope consumers and generated exports; no suffixed aliases remain.

## Design Reading Order

This design proceeds from the two verified coupling points to the host-neutral startup boundary, shared lifecycle, route mounts, concrete file allocation, and staged clean-cut replacement. Package-vNext and marketplace concerns are intentionally absent from the main design.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Remove `startHostedApplication`, every `HostedApplication*`/`StartHostedApplicationOptions` public type, `unsupported_entry`, hosted-only default-screen copy, app/runtime consumers of `iframeLaunchId` and bootstrap `requestContext`, related tests/docs, and generated/vendor copies after all in-tree applications move to the exact `startApplication` context below.
- Required action: Rename every version-suffixed application contract identifier in the touched contracts (`*V1`, `*V4`, `*_V1`, `*_V4`) to its unversioned current-contract name and update SDK, devkit, server, Studio, tests, documentation, and generated outputs. Preserve serialized numeric version fields/values unchanged; do not keep aliases.
- Required action: Replace the current public iframe-contract/mock `dev` behavior with real standalone `dev` and real Studio-connected `dev:studio`; add production `start`. Move any useful mock/iframe-contract host into test fixtures with no public application script or implicit fallback.
- Required action: Remove application route registration from the broad REST/WebSocket index owners after the Studio and standalone server-specific registrars own it.
- Required action: Replace monolithic `buildApp` construction with the explicitly named `buildStudioServer` and `buildStandaloneApplicationServer` assembly roots; update internal callers/tests rather than retaining an alias wrapper. Both builders must construct `ApplicationPlatformRuntime` in the specified order and may not seed it indirectly by calling route-level singleton accessors.
- Required action: Preserve the registered Agent Tools route in both hosts, but make its process registry/catalog/dispatcher family explicit and attach the application-runtime-scoped publication publisher to application-created sessions. Do not add an alternate route, proxy the external gateway, copy Studio MCP state, or touch provider-native tools.
- Preserved current protocol: Studio iframe messages retain their current on-wire `contractVersion: "4"` value and schema. Code symbols become unversioned. The protocol is not a compatibility fallback and is not exposed as the universal application startup API.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Per-app `db/app.sqlite`, `db/platform.sqlite`, logs/runtime files, plus `applications/_global/db/orchestration.sqlite`; volume is installation-dependent.
- Relevant code-model/semantic change: configuration DTOs distinguish manifest package baseline, computed selected-resource baseline, persisted sparse host override, and effective configuration. The no-write selection preview and selected baseline are derived projections only. Physical table/JSON fields, storage layout, stores, migrations, bindings, events, and recovery services remain authoritative.
- Normal reader/writer behavior and representative evidence: `ApplicationStorageLifecycleService` prepares the two per-app databases; the worker receives only app storage context; orchestration stores own reserved platform state. See application storage/orchestration docs in investigation notes.
- Required semantics and invariants under direct use: Current stored launch-profile rows are read as sparse host overrides. Valid rows select a resource and overlay its current computed definition baseline. Invalid/unresolvable or topology-stale rows remain stored, are projected with `HOST_OVERRIDE` issues, and block launch; they are neither auto-deleted nor bypassed. No row means the manifest package baseline. Selected baselines/previews are never stored. Explicit Reset deletes the row. Studio canonical application identity and storage root remain unchanged. Standalone uses a separate data root and a stable current-format canonical identity derived from package ID `standalone` plus the configured local application ID. Standalone recovery activates only `persistedKnownApplicationIds ∩ {selection.applicationId}`; dormant state for another previously selected local application is preserved but is never recovered or exposed.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Standalone and Studio installations do not silently share live databases. Agent Tools session IDs/token hashes are ephemeral process memory, revoked/cleared at stop, and never added to these stores. Copy/import of business data is a separate future feature.
- Decision: `Directly Usable — No Ticket-Owned Migration`; required tracked-base migrations still gate host readiness
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
| DS-005 | Bounded Local | BEH-003, BEH-005, BEH-007 | Server assembly start | Process/platform ready/stopped | `ApplicationPlatformLifecycle` | Keeps process health reusable and distinct from per-application run readiness |
| DS-006 | Operational Development | BEH-006 | `pnpm dev` or `pnpm dev:studio` in an application project | Project-specific inputs resolve through one devkit pack owner and the real standalone or Studio session remains ready across supported source rebuilds | Devkit config/pack and development-session owners delegating to real host owners | Gives developers the native real-host workflow, supports maintained non-default layouts, and removes ambiguous mock/custom-builder defaults |
| DS-007 | Operational Portability | BEH-001, BEH-003, BEH-006 | Application source/package command | The same unchanged package digest completes both real host scenarios | Dual-host conformance command/harness over the devkit package owner | Makes “build once, use twice” a verifiable production/deployment invariant rather than a narrative claim |
| DS-008 | Secondary End-to-End | BEH-001, BEH-003, BEH-005 | Standalone browser root/asset/navigation request | Selected application UI starts without platform-path collision or unsafe fallback | `StandaloneApplicationHost` static-route owner | Carries AC-009 through root, relative assets, SPA navigation, and reserved platform routes |
| DS-009 | Secondary End-to-End | BEH-001, BEH-002 | Studio reload/exit/route-leave action | Fresh iframe launch or restored Studio shell with route-visit launch state cleared | `ApplicationShell` presentation owner plus `applicationHostStore` launch-state owner | Preserves the complete current Studio presentation lifecycle, not only initial mount |
| DS-010 | Operational Production | BEH-001, BEH-003–BEH-007 | `pnpm build`/`pnpm validate` followed by `pnpm start` | Existing package passes DS-011 and DS-012, then runs through production standalone with separate durable data and graceful stop | Devkit facade, launch configuration owner, and standalone server | Makes production start depend on a valid package and runnable host, not UI-time failure |
| DS-011 | Operational Validation | BEH-004, BEH-006 | Standalone-enabled project pack/validate | Valid standalone package or exact `INVALID_PACKAGE` diagnostics | `ApplicationStandalonePackageValidator` exposed through devkit pack/project validate | Prevents incomplete application-owned defaults from becoming an artifact/runtime failure |
| DS-012 | Primary End-to-End | BEH-004, BEH-005, BEH-007 | Studio loads/selects/edits a resource, or either host evaluates launch | Authoritative selected baseline/preview, sparse edit/save/reset, then guarded run or scoped non-runnable diagnosis | `ApplicationLaunchConfigurationService` | Centralizes manifest and selected-resource baselines, no-write preview, sparse overlay, host validation, and launch guard without fallback |
| DS-013 | Primary Runtime Semantic | BEH-008 | Package-team launch creates first member | Final member system prompt contains application-runtime-scoped package team instruction | Application-runtime-scoped run services plus `MemberTeamContextBuilder` | Proves runtime behavior uses the exact definition service, not a global fallback |
| DS-014 | Primary Runtime Callback / Return | BEH-004, BEH-005, BEH-006 | An application-runtime-scoped agent receives an application-scoped Agent Tools descriptor and invokes an eligible server tool | Exact application-runtime publication journal/application projection and recipient-name handoff complete through the authenticated route | `AgentToolsMcpRuntime`, `ScopedAgentToolMcpSessionManager`, and the session-bound `PublishedArtifactPublisher` | Prevents process-global dependency bypass while retaining one route/catalog and the external-gateway boundary |

## Primary Execution Spine(s)

### DS-001 — Studio application startup

`Studio route/setup -> ensure backend ready -> iframe launch hints -> StudioIframeBootstrapProvider -> iframe v4 ready/bootstrap -> ApplicationRuntimeBootstrap normalization -> ApplicationStartupCoordinator -> ApplicationClient -> business mount`

### DS-002 — Standalone application startup

`buildStandaloneApplicationServer -> configured bundle selection -> DS-011 package validation -> DS-005 platform preparation -> DS-012 effective profile/host validation -> RUNNABLE -> root UI asset -> StandaloneSameOriginBootstrapProvider -> GET /_autobyteus/bootstrap -> StandaloneApplicationBootstrapPayload validation -> same-origin endpoint normalization -> ApplicationRuntimeBootstrap -> ApplicationStartupCoordinator -> ApplicationClient -> business mount`

### DS-003 — Shared backend invocation

`ApplicationClient -> host-specific endpoint mount -> application backend route handler -> ApplicationBackendApiGatewayService -> ApplicationEngineLauncher.ensureReady -> ApplicationEngineController.invoke -> worker ApplicationBackendHost -> handler result -> ApplicationClient`

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

`Application project -> pnpm build -> autobyteus-app pack -> dist/importable-package + DS-011 validation -> optional pnpm validate -> pnpm start -> autobyteus-app start -> resolve package root + source-manifest local ID + app-data/host/port config -> DS-011 validate existing package without rebuilding -> startStandaloneApplicationHost -> buildStandaloneApplicationServer -> DS-005 platform preparation -> DS-012 RUNNABLE -> listen -> DS-008 root -> DS-002 bootstrap/business mount -> signal -> DS-005 graceful stop`

The command facade derives `localApplicationId` from the project's source `application.json` and passes it explicitly to selection. The standalone selection service still never scans a multi-application package and silently chooses the first entry.

## Application Launch Configuration And Run-Readiness Contract

### DS-011 — Standalone package-default validation

`source application -> devkit project config -> canonical pack owner -> read-only application-runtime-scoped package validation -> portable launch config policy -> validated package or exact package diagnostic`

`standalone.enabled` is source-only `autobyteus-app.config.mjs` metadata. It is explicitly `true` in the starter, Brief, and Socratic configs. It is not copied into `application.json` and therefore does not change manifest v4. `dev` and `start` reject a project that is not enabled. `pack` and project-root `validate` apply standalone validation only when enabled; an explicit package-only validation can request the standalone target, while structural package validation remains reusable for Studio-only imports.

`validateStandaloneApplicationPackage({ packageRoot, localApplicationId })` is a pure exported boundary in `autobyteus-server-ts`. It constructs a application-runtime-scoped read-only bundle/agent/team catalog using the existing file providers and canonical identity/traversal rules. It does not initialize `AppConfig`, Prisma, vault, configuration stores, runtime processes, or global singleton catalogs. Devkit already depends on the server project for the standalone process API, so using this narrow export adds no dependency cycle and avoids a second parser.

For each required slot, package validation requires:

1. a `defaultExecutionResourceRef`;
2. `source: "bundle"` so the baseline is application-owned;
3. a resource kind allowed by the slot;
4. a resolvable application-owned agent/team definition with no cycle/stale member;
5. every effective leaf to resolve non-empty `runtimeKind` and `llmModelIdentifier` using package-only precedence; and
6. every package launch field to pass `ApplicationPortableLaunchConfigPolicy`.

`ApplicationPortableLaunchConfigPolicy` is the one package-portability field owner. Runtime adapters declare closed root fields plus typed nested schemas. The policy recursively traverses objects and arrays, canonicalizes each path/key, and applies these rules:

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

- manifest package-baseline resolution from exact application-runtime-scoped definition services;
- selected-resource baseline resolution for the current saved selection;
- no-write baseline preview for an unsaved selection;
- declared slot and saved resource selection (`saved host selection > manifest default`) without silent fallback;
- host override normalization/persistence/removal;
- preservation and diagnosis of invalid/unresolvable saved overrides;
- effective profile construction with per-field provenance;
- required-slot/package validity;
- host runtime/model/credential validation through narrow capability adapters; and
- `getApplicationLaunchConfigurationView`, `previewSelectedResourceBaseline`, `upsertOverride`, `removeOverride`, `evaluateApplicationReadiness`, and `requireRunnableConfiguration`.

`ApplicationLaunchResourceBaselineBuilder` is an internal application-runtime-scoped collaborator that resolves an exact bundle or shared resource. It is the clean-cut replacement for the misleading `ApplicationLaunchPackageBaselineBuilder` name; no alias remains. The store remains an internal persistence adapter. `ApplicationDefinitionRuntimeReadiness` continues to validate catalogs/tools/skills and delegates required-slot launch semantics to `ApplicationLaunchConfigurationService`; it may not independently infer runnable state.

#### Four semantically distinct stages

For each slot the launch service keeps four meanings separate:

1. **`packageBaseline`:** definition values for the manifest-selected bundled resource. Standalone package validation requires it to be complete.
2. **`selectedResourceBaseline`:** definition values for the currently selected resource before any host field overlay. It equals `packageBaseline` only when the selected ref is the manifest ref. An alternate shared/bundled resource is resolved from that exact definition set.
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
2. resolves the exact selected resource through the same application-runtime-scoped baseline builder used by GET/PUT;
3. returns the closed `RESOLVED`/`INVALID_SELECTION` union above;
4. performs no store read/write, override overlay, host capability evaluation, package-default fallback, or readiness transition; and
5. returns structured selection issues without secret data.

Studio requests preview immediately when the draft resource ref differs from the persisted view. Each request carries the exact application/slot/ref identity; the UI cancels or discards an older result if the selection changes. Save is disabled while preview is pending or invalid. Setup load, selection change, definition/catalog refresh, and save/reset completion all recompute or reload the projection. `upsertOverride` independently re-resolves the selected baseline and is the final concurrency check; if resource identity/topology changes between preview and PUT, PUT rejects structurally and Studio reloads instead of saving against stale context.

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

#### Host capability adapters and failure policy

- `ApplicationRuntimeAvailabilityPort` adapts current `RuntimeAvailabilityService` and rejects an unknown/disabled runtime.
- `ApplicationModelAvailabilityPort` adapts `ModelCatalogService` and requires an exact `model_identifier` under the resolved runtime.
- `ApplicationProviderCredentialReadinessPort` adapts current provider/vault/runtime-specific readiness. It reports only configured/not configured/reason; package code never reads vault internals.
- These adapters are application-runtime-scoped dependencies of `ApplicationLaunchConfigurationService`; it does not call process-global getters.

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

### DS-013 — Application-runtime-scoped package-team prompt semantics

`Application backend real team launch -> createApplicationRunServices(exact agent/team services) -> new MemberTeamContextBuilder(exact team service) -> MixedTeamRunBackendFactory root/subteam manager factory -> MixedTeamManager -> persistent/task-agent registries -> new/restored MixedAgentMemberHandle -> builder.build(teamDefinitionId) -> package team instruction -> member system prompt composer -> provider invocation`

Exact construction rules:

1. `createApplicationRunServices` creates one `MemberTeamContextBuilder(input.agentTeamDefinitionService)`.
2. It passes that builder into every `MixedTeamManager` created by `MixedTeamRunBackendFactory`, including nested subteams through the existing manager factory closure.
3. `MixedTeamManager` passes it to `MixedPersistentMemberRegistry` and `MixedTaskAgentInstanceRegistry`.
4. Both registries pass it to every new and restored `MixedAgentMemberHandle`.
5. `MixedAgentMemberHandle` requires the builder; its `getMemberTeamContextBuilder()` fallback is removed.
6. The general non-application run factory may construct a builder from its own exact process catalog at the server assembly boundary, but no member handle performs hidden catalog selection.

A focused durable test uses distinct application-runtime-scoped and process-global catalogs, launches/reconstructs the package team through the real mixed path, captures the final member system prompt, and asserts the non-empty Brief `team.md` instruction section. A real API/E2E run rechecks provider/events/artifacts plus the prompt semantic. Catalog merge, package-ID conditional, global fallback, and a repository-wide DI rewrite are forbidden.

### DS-014 — Application-scoped Agent Tools publication

Corrected full forward/return spine:

`Brief backend -> guarded team-run request -> application run manager starts the team on demand -> ScopedAgentToolMcpSessionManager issues a capability session -> descriptor { /mcp/agent-tools/:sessionId, bearer, enabled_tools } -> AgentToolsMcpRuntime route/registry/catalog/dispatcher -> authenticated session execution capabilities -> publish_artifacts through the exact PublishedArtifactPublisher / send_message_to through session member context -> writer handoff -> application-runtime event + publication journal -> application artifact projection`

Building `ApplicationPlatformRuntime` prepares the run managers, factories, lifecycle services, and scoped Agent Tools manager. It does **not** start an agent or team merely because the host started. An actual run is created only when application business code calls the guarded agent/team execution API or when the established recovery service restores a legitimate recorded run. This distinction is part of the naming contract: `Runtime` means ready infrastructure, not an execution instance.

#### Tool-surface classification

1. **Eligible server-owned Agent Tools MCP adapters:** the existing default providers include `publish_artifacts`, `send_message_to`, browser, media, and task-delegation adapters. Only configured and available adapters enter the descriptor.
2. **Configured MCP-origin tools:** `ConfiguredMcpAgentToolSourceResolver` forwards registered definitions only when `origin === ToolOrigin.MCP`; an explicitly selected tool can enter the per-run descriptor only if it is available in the current host registry. This is route capability, not a promise that standalone inherits Studio MCP configuration.
3. **General external MCP gateway:** `/mcp/gateway` exposes current host-configured MCP-origin tools to external MCP clients. It is process-level, not run-scoped, and remains absent from standalone.
4. **Application-owned MCP provisioning:** not implemented in this ticket. A future package resource contract may declare focused MCP requirements for shared platform provisioning, but it must not be represented by the general gateway or copied Studio state.

Package `toolNames`, the session descriptor's `enabledTools`, MCP `tools/list`, and the general gateway catalog remain distinct. Tests inspect the actual descriptor/list rather than infer exposure from the package list or Studio gateway.

#### Process runtime and scoped session managers

One `AgentToolsMcpRuntime` is created by each server assembly root. It owns the exact process-wide session registry, catalog/provider family, executor, dispatcher, route dependencies, general-process session manager, and the factory used to create scoped session managers. It does not own application run state and it does not select an application by ID.

`ScopedAgentToolMcpSessionManager` owns one explicitly constructed session collection. An instance:

- creates sessions in the exact registry/catalog owned by `AgentToolsMcpRuntime`;
- attaches the scope's immutable `AgentToolMcpSessionExecutionCapabilities`;
- supplies that same session service to application-created Codex and Claude runtime construction;
- records only the session IDs it created; and
- blocks new issue on close and revokes only its recorded sessions idempotently.

The same implementation is usable for the named general-process scope and an application-runtime scope; its target name therefore does not falsely say that every instance belongs to an application. A request never selects an application runtime by package ID, run ID, global registry search, or mutable current-runtime pointer.

#### Tight session execution shape

The session retains one non-wire field:

```ts
interface AgentToolMcpSessionExecutionCapabilities {
  publishedArtifactPublisher: PublishedArtifactPublisher;
}
```

`AgentToolMcpSession.executionCapabilities` remains process memory only. It is absent from descriptors, JSON protocol, logs, persistence, token payloads, and application packages. The registry returns the authenticated session object unchanged to dispatcher, executor, and provider execution.

`PublishedArtifactPublisher` exposes only `publishManyForRun(request)`. `PublishedArtifactPublicationService` implements it for a concrete run manager/relay. `PublishArtifactsMcpAdapterProvider` reads `session.executionCapabilities.publishedArtifactPublisher`; it never calls the default publication-service getter or process-global `AgentRunManager`. A missing, unbound, closed, or wrong-scope publisher fails before snapshot persistence, journal mutation, relay emission, or application projection. Recipient-name `send_message_to` retains its proven session-local member-context path.

#### Acyclic publication construction

SR-013 replaces the implemented bind-once baseline. `ApplicationAgentToolMcpSessionScope`, the queue-backed relay, `AgentRunResourceManager`, and `ActiveAgentRunRegistry` are created before publication. The exact application `PublishedArtifactPublicationService` receives that registry's reader and explicit stores/relay. `ScopedAgentToolMcpSessionManager` then receives the early scope, exact process family, and concrete publisher; provider/run managers receive the exact issuer and registry. Session revocation and observer detach occur through the resource manager during registry removal, so no reverse manager callback is required. No application session can exist without its publisher, and no application path can resolve the general-process manager/publisher. `BindOncePublishedArtifactPublisher` is removed.

#### Server assembly and route contract

Both server assembly roots perform the same relevant construction:

```text
server assembly root
  -> createAgentToolsMcpRuntime()
  -> buildApplicationPlatformRuntime({ sessionManagerFactory })
       -> create ApplicationAgentToolMcpSessionScope
       -> create queue-backed relay + AgentRunResourceManager
       -> create ActiveAgentRunRegistry(resource manager)
       -> create concrete application publication service
       -> create ScopedAgentToolMcpSessionManager(scope, concrete publisher)
       -> create application run managers against the same registry/session manager
  -> registerAgentToolsMcpRoutes(app, agentToolsMcpRuntime.routeDependencies)
```

Standalone registers the internal route before its static fallback. Studio registers the same internal route and separately registers `/mcp/gateway`. The internal route preserves its path, capability token/hash, origin/content negotiation, redaction, missing-bearer 401, and unavailable/wrong/revoked-session 404 behavior. No alias, alternate route, user authentication, persisted session, external-gateway proxy, or application MCP provisioning is added.

#### Maintained reachable adapter inventory

The maintained Brief/Socratic paths require the existing eligible server adapters and configured MCP-origin projection, with `publish_artifacts` and `send_message_to` proven in the application run. Provider-native Codex/Claude file tools remain untouched upstream behavior. Application-framework conformance proves only the actual descriptor/list plus authenticated server-tool dispatch; it does not redefine provider-native tools or make Studio's external gateway part of standalone.

#### Required proof retained after the rename

The naming change must keep the already-passed identity and lifecycle evidence:

1. the route and issued session use the same `AgentToolsMcpRuntime` registry/catalog/dispatcher family;
2. an application session carries only its exact application `PublishedArtifactPublisher` and cannot publish through a deliberately different process-global run manager;
3. missing/wrong-scope publisher and revoked-session dispatch fail before mutation; no bind/rebind state exists;
4. closing one scoped manager does not revoke another scope's sessions;
5. actual `publish_artifacts` and `send_message_to` complete publication, handoff, journal, and projection in both hosts; and
6. `/mcp/gateway` remains absent from standalone.


### DS-015 — Narrow runtime boundary and acyclic application framework

DS-015 is the authoritative SR-013 correction for CR-019–CR-021 and incorporates [application-framework-architecture-simplification.md](application-framework-architecture-simplification.md). ARCH-REV-010 confirms the outward runtime and package-owner subsections; the run/artifact/engine subsections below supersede SR-012's controller-only relay and manager-callback cleanup mechanics. All DS-014 transport/session/publication behavior remains mandatory.

#### Outward boundary — retained and architecture-confirmed

`ApplicationPlatformRuntime` freezes exactly four fields: `lifecycle`, `rest`, `realtime`, and `hostManagement`. `rest` has exact assets/backend/availability/execution-resource contracts. `realtime` has exact backend/notification/agent-communication contracts. `hostManagement` exposes only `catalogReconciliation`. REST/WebSocket/standalone registrars accept lifecycle readiness plus their exact projection and cannot receive the runtime aggregate. Storage/global/platform/run stores, recovery, availability state, dispatch, run/session/publication, engine, and shutdown participants remain private to runtime construction/lifecycle.

#### Package owner sequence — retained and architecture-confirmed

Studio constructs package settings/record stores and `ApplicationPackageRegistryService` first; constructs `ApplicationBundleService` from the exact registry reader and `FileApplicationBundleProvider`; constructs definition services and the runtime; then constructs `ApplicationCatalogRefreshCoordinator` and `ApplicationPackageCommandService`. No callback closes over a later assignment. The coordinator alone performs bundle refresh -> snapshot -> runtime catalog reconciliation -> agent-definition refresh -> team-definition refresh. Commands preserve validation, diagnostics, identity, managed-install cleanup, rollback, and one best-effort post-rollback reconciliation. GraphQL keeps its existing wire and receives separate query/command contracts.

#### Run/publication/session sequence — corrected for AR-009

The construction order is:

```text
ApplicationAgentToolMcpSessionScope
  -> queue-backed ApplicationPublishedArtifactRelayService + file/memory observers
  -> AgentRunResourceManager
  -> ActiveAgentRunRegistry
  -> PublishedArtifactPublicationService
  -> ScopedAgentToolMcpSessionManager
  -> AgentRunManager / AgentTeamRunManager
```

`ApplicationAgentToolMcpSessionScope` is created from the exact process session service/registry before the publisher. It owns only application-scope session ownership and revocation: record an issued session; revoke by run/member/owner; block new recording; close/revoke the scope. It does not choose tools, create descriptors, carry a publisher, or know a run manager. If later session issuance succeeds but scope recording fails, the scoped issuer immediately revokes that exact newly created process session.

`AgentRunResourceManager` receives only that early scope revoker and the file-change, queue-backed artifact-relay, and memory observer capabilities. `attach(run)` records each disposer as it succeeds. `release(runId, expectedRun)` removes its resource record before cleanup, revokes run sessions, attempts all three observer disposers, and returns a release result. Repeated release is an `already_released` no-op; no disposer/revoker runs twice. Partial attachment failure releases every recorded partial resource before it propagates.

`ActiveAgentRunRegistry` owns the active map and exact identity transitions. Its authoritative contract is:

```ts
type AgentRunRemovalReason =
  | "inactive_discovery"
  | "explicit_termination"
  | "inactive_replacement"
  | "stop_all"
  | "registration_rollback";

type AgentRunRemovalResult =
  | { kind: "removed"; run: AgentRun; reason: AgentRunRemovalReason; resources: AgentRunResourceReleaseResult }
  | { kind: "not_found"; runId: string; reason: AgentRunRemovalReason }
  | { kind: "identity_mismatch"; runId: string; expectedRun: AgentRun; currentRun: AgentRun; reason: AgentRunRemovalReason };

interface ActiveAgentRunRegistry {
  register(run: AgentRun): void;
  getActiveRun(runId: string): AgentRun | null;
  listActiveRuns(): readonly AgentRun[];
  removeIfCurrent(input: {
    runId: string;
    expectedRun: AgentRun;
    reason: AgentRunRemovalReason;
  }): AgentRunRemovalResult;
}
```

Exact transition rules:

1. registration rejects an active duplicate; an inactive existing run is identity-removed and fully cleaned before the replacement is stored/attached;
2. `getActiveRun` discovers an inactive exact object, synchronously removes/releases it with `inactive_discovery`, then returns null; cleanup errors surface only after all cleanup actions were attempted;
3. explicit terminate awaits the exact run's accepted termination, calls `removeIfCurrent(expectedRun, "explicit_termination")`, and consumes the result;
4. stop-all snapshots exact active objects, terminates/removes each with `stop_all`, and aggregates failures after every snapshot entry;
5. stale/duplicate completion returns `not_found` or `identity_mismatch` and cannot remove or clean a replacement;
6. map/resource ownership is deleted before cleanup. Cleanup errors carry the removal result and are never converted to a false clean success or retried implicitly.

`AgentRunManager` retains backend selection, create, restore, terminate, and stop-all. It no longer owns the active map or observer/session disposer maps. There is no registry-to-manager callback, publisher binding phase, application fallback to a general-process manager/publisher, or `BindOncePublishedArtifactPublisher` file.

#### Engine, artifact-delivery, and event sequence — corrected for AR-008

`ApplicationEngineController` owns worker handles, statuses, listener collections, attached-handle invocation, and attached-worker stop. It does not discover bundles, prepare storage, launch processes, load definitions, or route application context capabilities. After run/orchestration/streaming services exist, `ApplicationEngineLauncher` owns coalesced startup, bundle/storage preparation, worker/client creation, definition load, context-capability/stream wiring, controller attach/detach, `ensureReady`, and worker stop.

`ApplicationPublishedArtifactRelayService` retains binding lookup, malformed/unbound diagnostics, application-event mapping, and current caller semantics. It no longer calls the controller or a broad engine service. It enqueues this exact in-memory command:

```ts
type ApplicationPublishedArtifactDeliveryCommand = Readonly<{
  runId: string;
  applicationId: string;
  bindingId: string;
  revisionId: string;
  event: ApplicationPublishedArtifactEvent;
}>;
```

`ApplicationPublishedArtifactDeliveryQueue` is created early and owns FIFO within one run, independent progress across run lanes, one completion promise per accepted command, lease settlement, `stopAccepting`, and `awaitDrained`. It has no arbitrary topic, subscriber, callback, or handler-binding API. The relay awaits enqueue internally. DS-017 first awaits the active run event pipeline after durable projection; its application artifact listener may still enqueue delivery without making worker delivery part of the publication transaction. The fallback no-active-run publication path awaits relay completion. Event or delivery failure does not roll back or delete the already persisted artifact snapshot/projection.

`ApplicationPublishedArtifactDeliveryService` is constructed after launcher/controller and consumes the queue:

```text
lease command
  -> ApplicationEngineLauncher.ensureReady(applicationId)
  -> ApplicationEngineController.invokeApplicationArtifactHandler(applicationId, event)
  -> complete/fail lease
```

It starts before lifecycle readiness or recorded-run recovery. A worker exit while a provider run remains active is therefore followed by coalesced restart before handler invocation. An absent handle is not treated as the current steady-state relay outcome.

Event ingress separately appends the existing durable journal and enqueues only the application ID in `ApplicationExecutionEventDispatchQueue`. The late event dispatcher consumes that closed queue, checks availability, ensures through launcher, invokes through controller, and retains existing acknowledge/failure/retry/backoff/resume/suspend/stop semantics. `ApplicationReentryService` retains the explicit stop/reload/reconcile/recover/resume transition. There is no `BindOnceApplicationEngineEventHandler` or broad `ApplicationEngineHostService` target.

#### Complete construction order

1. bundle, storage, platform stores, availability state;
2. engine controller, application-ID event queue, and artifact-delivery queue;
3. run/binding/override/journal stores and startup gate;
4. application MCP session scope, file/memory observer capabilities, and queue-backed artifact relay;
5. `AgentRunResourceManager` and `ActiveAgentRunRegistry`;
6. concrete application publication service;
7. application-scoped Agent Tools session issuer with concrete publisher;
8. agent/team run managers and run services;
9. event ingress, recovery, orchestration, streaming, communication;
10. engine launcher;
11. artifact delivery service, event dispatcher, and re-entry service;
12. backend gateway, WebSocket sessions, notifications;
13. catalog reconciliation and lifecycle;
14. frozen four-projection runtime.

Construction starts no run. Delivery/event consumers start before recovery; `recoverAfterListen` alone restores recorded runs; business context operations alone start new runs.

#### Lifecycle stop order

Fastify stops accepting/drains transport work before runtime `onClose`. The private runtime then:

1. blocks new application Agent Tools session issuance;
2. stops execution-event intake/timers;
3. closes direct communication and disposes gateway/WebSocket/notification ingress;
4. stops artifact-delivery intake and drains already accepted commands through launcher ensure + controller invoke;
5. disposes remaining runtime-level run observers;
6. stops engine startups/workers through launcher/controller;
7. stops team then agent runs, whose exact registry removals release run sessions and file/artifact/memory observers;
8. closes the application session scope/scoped issuer and revokes any remaining sessions;
9. stops streaming;
10. lets the server close process MCP/general-run/channel/event/vault/Prisma owners in their established order.

No accepted artifact command is abandoned because a worker handle disappeared. There is no publisher-bind close or later cleanup callback.

#### Clean removal and fixed proof

Remove both `BindOnce*` files/symbols/tests, `ApplicationEngineHostService`, the 19-field runtime shape, late-assigned Studio callbacks, manager-owned active/disposer collections, and application-path optional/global dependency branches in the same implementation. Named general-process assembly factories preserve supported process behavior without becoming an application fallback. No alias, dual path, migration, service locator, generic container/event bus/deferred handler, reverse callback, or `buildServer(mode)` is permitted.

Required proof covers exact four-field runtime shape, narrow registrar signatures, package refresh/rollback, zero run on construction, exact session-scope/resource/registry/publication/issuer identity, all removal origins and stale duplicate identity, journal-before-enqueue and retry, per-run artifact FIFO/caller semantics, worker-exit-before-publication ensure/restart/invoke, real Studio/standalone Codex/Luna publication/handoff/projection, shutdown, and unchanged `73/73` package parity.

#### SR-013 file overlay

| Disposition | Exact files / areas | Target responsibility |
| --- | --- | --- |
| Add | `application-platform/runtime/application-platform-runtime-contracts.ts`; `application-catalog-reconciliation-service.ts` | Four outward projections and the sole host catalog-reconciliation command |
| Add | `application-packages/services/application-package-command-service.ts`; `application-catalog-refresh-coordinator.ts` | Package command/rollback owner and exact ordered propagation owner |
| Add | `agent-tools/mcp/application-agent-tool-mcp-session-scope.ts`; `agent-execution/services/agent-run-resource-manager.ts`; `agent-execution/runtime/active-agent-run-registry.ts` | Early application session revocation, exact per-run resources, and active run identity/removal |
| Add | `application-engine/services/application-engine-controller.ts`; `application-engine-launcher.ts` | Stable handle/status/invocation owner and later process/startup owner |
| Add | `application-orchestration/services/application-execution-event-dispatch-queue.ts`; `application-published-artifact-delivery-queue.ts`; `application-published-artifact-delivery-service.ts`; `application-reentry-service.ts` | Closed journal wakeup, closed per-run artifact delivery with ensure/invoke, and reload/re-enter coordination |
| Modify | both server builders; runtime builder/contracts/lifecycle; REST/WebSocket/standalone registrars; package registry/bundle/GraphQL configuration; scoped MCP session manager/factory; run/publication/projection/relay; event/availability/recovery; gateway/WebSocket/streaming seams | Apply exact outward boundary, cleanup contracts, and construction order |
| Remove | both `bind-once-*.ts` files; `application-engine-host-service.ts`; manager active/disposer maps; 19-field runtime fields; later-assigned Studio callbacks; application-path optional/global branches; proxy/broad-runtime tests | Clean replacement with no alias, reverse callback, dual path, or data migration |

### DS-016 — Executable application-framework dependency boundary

DS-016 is the bounded SR-014–SR-016 hardening selected by the eight-candidate proof in [application-framework-hardening-evaluation.md](application-framework-hardening-evaluation.md). `ARCH-REV-013` accepts the Adopt/Defer/Reject result, resolves AR-011, and narrows AR-010 to the nested provider factories inside present parent properties. The corrected target still changes no production source, runtime object graph, route, wire contract, persisted data, package byte, lifecycle, or user-visible behavior.

#### Governing owner and check shape

`autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts` remains the sole executable policy owner. It derives the repository root from `import.meta.url`, never process CWD; owns one closed table for `AFB-001`–`AFB-005`; scans only the governed source families; extracts imports according to the actual source kind; maps every importer to one deterministic project profile; resolves repository-owned targets; and evaluates normalized real source paths. It parses static imports/exports, literal `require`, literal dynamic `import()`, and TypeScript `ImportTypeNode` specifiers. It does not inspect comments, arbitrary strings, generated package output, or non-literal runtime module names.

The test uses the existing direct `typescript` dev dependency for TS/JS AST and module resolution. It adds `@vue/compiler-sfc` `^3.5.28` as a direct **server test dev dependency** rather than relying on Nuxt's transitive installation. `parse()` extracts both `<script>` and `<script setup>` blocks. Each block is parsed as TS, TSX, JS, or JSX from its `lang`; compiler errors, an unsupported script language, or an unresolved external `src` block fail the enclosing AFB policy. Template markup and style imports are outside this JavaScript dependency policy. The test does not run `compileScript`, does not execute an SFC, and does not depend on generated `.nuxt` output.

Every failure reports the stable policy ID, importer, source location, original specifier or constructor/factory symbol, resolved dependency when one exists, violated direction or missing injection path, owning project profile, and correction. The correction is one of: use an exact runtime projection; use the application SDK/local or manifest-declared dependency; inject the named application-scoped dependency; or move genuine general-process construction to a named assembly owner.

#### Importer-to-project, config, and manifest map

The resolver is a dependency-policy resolver, not a substitute for each project's build. Its closed profiles prevent one project's aliases or package declarations from leaking into another.

| Profile | Governed importers | Config authority | Project root / owning manifest | Exact resolution behavior |
| --- | --- | --- | --- | --- |
| `server` | All AFB-001, server-side AFB-002/003/004 inputs | `autobyteus-server-ts/tsconfig.json` loaded with the TypeScript config API | `autobyteus-server-ts/` / `package.json` | `NodeNext` options and paths from the checked-in config; `.js` source imports may resolve to their `.ts` owner exactly as the server compiler does. |
| `studio-web` | Production `.vue`, `.ts`, and `.js` inputs under the closed AFB-002 web paths | `autobyteus-web/tsconfig.json` identifies the Nuxt project; the test intentionally does not load its generated `.nuxt` parent | `autobyteus-web/` / `package.json` | Test-local deterministic Nuxt source aliases `~`, `@`, `~~`, and `@@` (with slash forms) resolve to the web root; relative and extensionless source candidates include `.vue`, `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, and `index.*`. Bare forbidden server packages are classified before physical package resolution. |
| `brief-backend` | `applications/brief-studio/backend-src/**` | `applications/brief-studio/tsconfig.backend.json` | Brief root / Brief `package.json` | Checked-in `NodeNext` backend options; only local source, built-ins, SDKs, or manifest-declared libraries may be imported. |
| `brief-frontend` | `applications/brief-studio/frontend-src/**` | No frontend tsconfig exists; `autobyteus-app.config.mjs#source.frontendDir` plus a test-local `NodeNext`/`allowJs` profile is authoritative | Brief root / Brief `package.json` | Relative JS source resolution plus the same manifest rule; checked-in `frontend-src/generated/**` is scanned because it is packaged source, while `.build/**` and `dist/**` are excluded. |
| `socratic-backend` | `applications/socratic-math-teacher/backend-src/**` | `applications/socratic-math-teacher/tsconfig.backend.json` | Socratic root / Socratic `package.json` | Same backend rule as Brief with its own config and manifest. |
| `socratic-frontend` | `applications/socratic-math-teacher/frontend-src/**` | No frontend tsconfig exists; its `autobyteus-app.config.mjs#source.frontendDir` plus the same explicit JS profile is authoritative | Socratic root / Socratic `package.json` | Same frontend rule as Brief with no cross-application manifest lookup. |
| `devkit-template:<name>` | Each `autobyteus-application-devkit/templates/<name>/src/**` tree independently | The template's `autobyteus-app.config.mjs`; no template tsconfig is assumed | That template root / that template's `package.json` | Explicit `NodeNext`/`allowJs` profile; each future template is discovered only when both config and manifest exist, and never inherits the devkit host manifest. |

For relative, absolute, Nuxt-alias, or package-`imports` specifiers that should resolve to repository source, resolution failure is a test failure under the enclosing AFB policy with reason `UNRESOLVED_GOVERNED_IMPORT`; it is never silently skipped. A `#` specifier is accepted only when the owning manifest declares an `imports` mapping that resolves within that project. A bare external package is reduced to its canonical name (`@scope/name` or first unscoped segment). For AFB-005 it is allowed only when that exact name appears in the owning manifest's `dependencies`, `devDependencies`, `peerDependencies`, or `optionalDependencies`; a declaration in the repository root, devkit host, or another application does not count. `node:` imports and unprefixed names in Node's `builtinModules` are allowed without a manifest entry. An explicitly forbidden host/runtime package remains forbidden even if someone adds it to the application manifest. For AFB-001–AFB-004, an external bare package that is not repository-owned is outside the cross-owner path test; known workspace/server package names and all local/alias imports are still resolved or classified fail-closed.

#### Exact closed policy

| Policy | Governed importer families | Allowed direction | Forbidden direction | Narrow exception |
| --- | --- | --- | --- | --- |
| `AFB-001` | `src/api/rest/**`, `src/api/websocket/**`, `src/standalone-application-host/api/**`, and `standalone-application-bootstrap-service.ts` | Application runtime access through `application-platform-runtime-contracts.ts` and exact subject inputs supplied by an assembly root | Importing runtime builder, lifecycle implementation, stores, recovery, availability state, run/session/publication, engine, queue, or shutdown internals | None |
| `AFB-002` | `src/api/graphql/**`; production files under `autobyteus-web/components/applications/**` and `autobyteus-web/utils/application/**`; `autobyteus-web/composables/useRuntimeScopedModelSelection.ts` (exclude `__tests__`, `*.spec.*`, `*.test.*`) | GraphQL receives declared package/query/command contracts; Studio presentation consumes application SDK contracts/client and presentation-local helpers | GraphQL directly importing application-runtime private owners; Studio presentation importing server package/bundle/runtime implementation | No exception for convenience in production files |
| `AFB-003` | `src/application-packages/**`, `src/application-bundles/**` | Package stores/readers/commands and bundle providers depend inward on their own domain contracts | Imports from API/presentation, server assembly, standalone host, or application-runtime private implementation | `ApplicationCatalogRefreshCoordinator` may depend on the exact `ApplicationCatalogReconciliationService` contract required by its approved bundle -> reconciliation -> agent -> team sequence |
| `AFB-004` | `src/application-platform/runtime/**`; `application-agent-tool-mcp-session-scope.ts`; `scoped-agent-tool-mcp-session-manager.ts`; `providers/publish-artifacts-mcp-adapter-provider.ts` | The complete application-scoped injection obligations below, plus no direct process-global/default call | A named direct global/default callee **or** omission/null/`undefined`/opaque-spread of a required constructor/factory dependency that would let the reusable implementation choose a general-process/default owner | Only `build-studio-server.ts` and `start-standalone-application-host.ts` may select the named general-process supervisor/publisher for process work. Their definitions remain in `general-process-run-supervisor.ts` and `published-artifact-publication-service.ts`; none is an application-construction exemption. Existing unrelated process-scoped workspace/runtime/model getters are not governed. |
| `AFB-005` | Brief/Socratic `frontend-src`/`backend-src`; every valid devkit template `src` tree | Project-local modules, application backend/frontend SDKs, Node built-ins, and libraries declared in that importer's own manifest fields listed above | Bare or resolved imports into `autobyteus-server-ts`, `autobyteus-web`, Electron, standalone-host, or devkit host/runtime internals; undeclared libraries; local/alias paths escaping the owning project | None; package `dist/**` and `.build/**` are not scanned |

The exact direct-callee set remains: `AgentRunManager.getInstance`, `AgentTeamRunManager.getInstance`, `AgentToolMcpSessionService.getInstance`, `getAgentToolMcpSessionService`, `getGeneralProcessPublishedArtifactPublisher`, `createGeneralProcessPublishedArtifactPublisher`, and `createGeneralProcessPublishedArtifactRelayService`. Binding resolution follows named-import aliases and namespace members to the exact source export; similarly named declarations do not match.

#### AFB-004 application construction obligations

The checker resolves constructor imports to the exact source module/export, scans all occurrences in governed application paths, and requires the specified argument/property shape. A required object argument must be an inline object literal; required properties must be explicit, non-computed, and non-`null`/non-`undefined`; a spread cannot satisfy an obligation. Required positional arguments must be present and non-`null`/non-`undefined`. The test also asserts the current construction site contains the expected occurrence so deletion or hiding the construction behind an unchecked helper fails. This enforces application-side completeness while leaving the reusable constructors' established general-process defaults untouched.

| Fallback family | Exact target in `create-application-run-services.ts` | Required application-side shape |
| --- | --- | --- |
| Publication / run-resource identity | `new AgentRunResourceManager(...)` | argument 0: `sessionScope`, `runFileChangeService`, `publishedArtifactRelayService`, `memoryRecorder` |
| Publication / run-resource identity | `new PublishedArtifactPublicationService(...)` | argument 0: `activeRunReader`, `publishedArtifactRelayService`, `projectionStore`, `snapshotStore` |
| Publication / run-resource identity | `new PublishedArtifactProjectionService(...)` | argument 0: `activeRunReader`, `metadataService`, `projectionStore`, `snapshotStore` |
| Run ownership and persistence | `new AgentRunManager(...)` | argument 0: `autoByteusBackendFactory`, `codexBackendFactory`, `claudeBackendFactory`, `activeRunRegistry`, `memoryRecorder` |
| Run ownership and persistence | `new AgentRunIdentityAllocator(...)` | argument 0: `agentDefinitionService`, `agentRunManager`, `agentRunMetadataService`, `teamRunMetadataService`, `memoryDir` |
| Run ownership and persistence | `new AgentRunService(...)` | argument 1: `agentRunManager`, `metadataService`, `agentRunIdentityAllocator` |
| Session / provider scope | `ApplicationAgentToolsSessionFactory.createApplicationSessionManager(...)` | argument 0: `scope`, `executionCapabilities.publishedArtifactPublisher`, `assertExecutionCapabilitiesReady` |
| Session / provider scope | `new AutoByteusAgentRunBackendFactory(...)` | argument 0: `agentDefinitionService` |
| Session / provider scope | `new CodexAgentRunBackendFactory(...)` | positional argument 1: application `codexThreadBootstrapper`; positional arguments 0 (`threadManager`) and 2 (`threadCleanup`) may remain omitted/`undefined` because they are deliberately process-scoped under the approved one-server-per-process runtime inventory |
| Session / provider scope | `new ClaudeAgentRunBackendFactory(...)` | positional argument 0: application `claudeSessionManager`; positional argument 1: application `claudeSessionBootstrapper` |
| Session / provider scope | `new CodexThreadBootstrapper(...)` | argument 2 `agentDefinitionService`; current argument 5 application `agentToolsSessionManager` |
| Session / provider scope | `new ClaudeSessionManager(...)` | argument 2 application `agentToolsSessionManager` |
| Session / provider scope | `new ClaudeSessionBootstrapper(...)` | argument 2 `agentDefinitionService` |
| Team / context scope | `new MemberTeamContextBuilder(...)` | argument 0 `agentTeamDefinitionService` |
| Team / context scope | `new MixedTeamRunBackendFactory(...)` | argument 0: `memberTeamContextBuilder`, `createTeamManager` |
| Team / context scope | nested `new MixedTeamManager(...)` | argument 1: `subTeamRunFactory`, `agentRunManager`, `agentToolMcpSessionManager`, `memberTeamContextBuilder` |
| Team / context scope | `new AgentTeamRunManager(...)` | argument 0: `mixedTeamRunBackendFactory`, `teamCommunicationService`, `runFileChangeService` |
| Team / context scope | nested `new TeamRunHistoryCatalogService(...)` | argument 1: `teamRunManager` |
| Team / context scope | `new TeamRunService(...)` | argument 0: `agentTeamRunManager`, `teamDefinitionService`, `teamRunMetadataService`, `agentRunIdentityAllocator`, `teamRunHistoryCatalogService`, `memoryDir`, `memoryLocationService` |

This is a source architecture contract, not a demand that every reusable constructor become mandatory-only. If a target constructor signature or application composition legitimately changes, the obligation table, synthetic fixtures, docs, and architecture review change together; the checker is not bypassed by a compatibility wrapper or broad allow-list.

The required-parent nested-constructor audit is closed and non-recursive:

| Required parent property / callback | Inline reusable owner | Audit result |
| --- | --- | --- |
| `AgentRunManager.autoByteusBackendFactory` | `AutoByteusAgentRunBackendFactory` | `agentDefinitionService` is already required. Its workspace, skill, processor, LLM, and agent-factory defaults are approved process runtime resources, not application definition/session/publication authorities. |
| `AgentRunManager.codexBackendFactory` | `CodexAgentRunBackendFactory` | **Corrected in SR-016:** require argument 1 `codexThreadBootstrapper`. Arguments 0/2 remain deliberately process-scoped thread manager/cleanup. |
| `AgentRunManager.claudeBackendFactory` | `ClaudeAgentRunBackendFactory` | **Corrected in SR-016:** require arguments 0/1 `claudeSessionManager` and `claudeSessionBootstrapper`. |
| `AgentTeamRunManager.mixedTeamRunBackendFactory` and its `createTeamManager` callback | `MixedTeamRunBackendFactory` -> `MixedTeamManager` | Existing rows already require member context, team-manager factory, subteam/run/session/context inputs. The memory-location default is an approved process memory-layout resource. |
| `AgentTeamRunManager.teamCommunicationService` | `TeamCommunicationService` | No additional graph-owner obligation: current source passes `memoryDir`; only the projection-store default remains, and it is an approved process data resource that does not choose application definitions, runs, sessions, or publication. |
| `TeamRunService.teamRunHistoryCatalogService` | `TeamRunHistoryCatalogService` | Existing row already requires the graph-local `teamRunManager`; index/metadata stores are constructed from mandatory `memoryDir` and do not select another runtime authority. |

This audit is an exact review of the current required parent value expressions, not a generic recursive-constructor policy. A future new inline defaulting owner requires a deliberate obligation-table/design update rather than implicit recursive rejection.

#### Fixture and current-tree proof

Synthetic fixtures use the same extractors, profiles, manifest rules, resolver, binding matcher, and obligation evaluator as the current-tree scan. They are created under an OS temp root with a miniature server/web/application/template layout and deleted in `finally`/test cleanup.

Required fixture matrix:

1. one allowed and one forbidden TS/JS import for each AFB import family;
2. one allowed Vue `<script setup lang="ts">` alias import and one forbidden Vue server-runtime import, plus a `<script>` case and a parse-error case;
3. Brief/Socratic/template examples showing the same bare library accepted only from the importing project's own manifest, an undeclared library rejected, a Node built-in accepted, and an escaping/unresolved relative path rejected;
4. one allowed complete AFB-004 construction fixture for each of the four fallback families, including `new CodexAgentRunBackendFactory(undefined, codexThreadBootstrapper)` and `new ClaudeAgentRunBackendFactory(claudeSessionManager, claudeSessionBootstrapper)`;
5. table-driven omission negatives for every required property/positional argument above (therefore at least one rejected omission for publication, run ownership, session/provider, and team/context), plus direct forbidden-callee negatives and the exact two assembly-root positives. Provider-factory negatives cover Codex argument 1 and Claude arguments 0/1 independently for omitted, explicit `null`, and explicit `undefined`; Codex arguments 0/2 have allowed omission/`undefined` cases;
6. a full current-tree assertion covering all governed files, including all eleven current Vue SFCs and every discovered valid devkit template.

Each negative asserts the exact AFB ID, profile, importer, dependency/callee or missing property path, and correction. A fixture cannot opt out of resolution or use a simplified parser unavailable to the current-tree path.

#### Development-time primary and return spine

```text
contributor changes governed TS / JS / Vue source or application construction
  -> standard server test selects the exact project/config/manifest profile
  -> source-kind extractor yields imports and AFB-004 construction calls
  -> resolver/binding checker maps repository targets and required injection shapes
  -> AFB-001..AFB-005 evaluate exact direction/completeness
  -> allowed: suite continues
  -> forbidden/unresolved/omitted: exact diagnostic returns to contributor
  -> contributor uses contract/SDK/declared library/explicit scoped injection
  -> same current-tree check reruns and passes
```

This is a development/CI spine only. No checker, registry, middleware, or policy object is loaded in Studio or standalone production startup.

#### Documentation contract

`autobyteus-server-ts/docs/modules/applications.md` owns the human-readable AFB-001–AFB-005 table, the four AFB-004 obligation families, the project/manifest rule, and the correction for each failure. `autobyteus-server-ts/docs/ARCHITECTURE.md` contains only a short boundary summary and a pointer to that module page and executable test. Policy identifiers and meanings must match exactly; the test remains the executable source of truth. No generated documentation system or duplicate architecture reference is introduced.

#### Exact change inventory and proof

| Disposition | File | Responsibility |
| --- | --- | --- |
| Add | `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts` | TypeScript/JavaScript/Vue extraction, project resolver profiles, AFB-004 obligations, current-tree checks, and synthetic positive/negative fixtures |
| Modify | `autobyteus-server-ts/package.json` | Add direct test-only dev dependency `@vue/compiler-sfc` `^3.5.28`; no production dependency |
| Modify | `pnpm-lock.yaml` | Record the direct server test dependency using the already-resolved compiler version |
| Modify | `autobyteus-server-ts/docs/modules/applications.md` | Exact policies, injection families, project/manifest rules, and remediation guidance |
| Modify | `autobyteus-server-ts/docs/ARCHITECTURE.md` | Concise architecture boundary summary and canonical links |
| Production source change | None | Preserve the already-passed runtime and dual-host implementation exactly |

Required proof is: every synthetic forbidden fixture fails only its intended AFB policy; every allowed fixture passes; all required omission variants fail; all eleven SFCs and the complete governed tree pass; diagnostics are asserted; dependency installation and the focused test work without pre-generated `.nuxt`; the existing affected server matrix and complete API-REV-012 dual-host characterization remain green; package parity remains `73/73`; and `git diff` confirms no production-source, runtime dependency, schema, package output, or generated-artifact change. No compatibility alias or data migration applies.
### DS-017 — Integrate v1.4.50 without weakening dual-host ownership

DS-017 is the bounded SR-017 base-evolution target, corrected by SR-018 for the exact durable-test transition inventory. It does not supersede DS-001–DS-016; it reconciles current base contracts at four existing owners and moves checkpoint proof to current v1.4.50 production seams without adding a fifth production owner.

#### Startup spine

```text
Studio start
  -> schema/protected-path/Prisma/vault initialization
  -> run pending base-owned app-data migrations
  -> require readable-provider migration SUCCEEDED or SUCCEEDED_WITH_WARNINGS
  -> buildStudioServer -> lifecycle.prepareBeforeListen -> listen -> recover
```

Missing/nonterminal result or runner exception fails before builder/listen and unwinds vault/Prisma. Ordinary non-required Studio migration results keep their current warning policy. Standalone continues to enforce every `requiredOnStartup` migration through its existing generalized gate; no duplicate special service is added.

#### Publication spine

```text
exact application publisher
  -> snapshot file
  -> write projection referencing revision
     failure: delete new unreferenced snapshot
  -> await active run.publishEvent(ARTIFACT_PERSISTED)
     or await permitted fallback emitter/relay
  -> existing queue-backed application delivery -> ensureReady -> invoke -> UI
```

The application `activeRunReader`, relay, projection/snapshot stores, publisher contract, session capability, and fallback context remain injected. Post-commit run-pipeline or fallback-relay rejection may surface; active listener/delivery failure retains its logged/contained policy. Neither can delete the snapshot/projection. No `emitLocalEvent` compatibility branch or global application publisher is retained.

#### Effective launch-editor spine

```text
selected-resource/package baseline + sparse draft
  -> effective runtime/model
  -> host catalog availability
     available: normal readiness
     unavailable: retain identifier + warning + block
     missing: required-model diagnostic + block
  -> explicit valid override or Reset/delete
```

The editor consumes `inheritedProfile` and never reconstructs server precedence. Availability uses the effective explicit-or-inherited model. Blank override fields remain inheritance; unavailable values are never auto-cleared or silently replaced; `llmConfig` retains its current support/runtime sanitization.

#### Current Codex construction contract

| Constructor input | Position | Application rule |
| --- | --- | --- |
| Workspace skill materializer | 0 | approved process default |
| Workspace resolver | 1 | approved process default |
| Agent definition service | 2 | exact application service required |
| Skill service | 3 | approved process default |
| Client manager | 4 | approved process default |
| Agent Tools session manager | 5 | exact application manager required |

`create-application-run-services.ts` and `general-process-run-supervisor.ts` use argument 5. Corrected DS-016 AFB-004 requires application arguments 2/5 and exercises omission/null/undefined at current positions. The old eight-argument call shape and position-7 rule are removed cleanly.

#### Exact integration inventory

| Disposition | Paths / owners |
| --- | --- |
| Modify — production | the three conflict paths; `create-application-run-services.ts`; `general-process-run-supervisor.ts` |
| Modify — durable tests | architecture boundary, Studio migration gate, publication service, agent launch editor, `brief-package-team-prompt.integration.test.ts`, and `agent-tools-mcp-runtime.test.ts`; only failing common-overlap owner tests after classification |
| Retain | explicit server builders, four runtime projections, package owners, DS-012 launch service, DS-014 session route/runtime, DS-015 queues/cleanup, immutable packages, all routes/schemas/capabilities |
| Add / Remove / Rename / Move | no production module and no compatibility artifact beyond upstream's already-landed removals |

#### Verification

Architecture test with current argument positions, startup gate/unwind matrix, projection/event durability matrix, explicit/inherited unavailable-model matrix, current-path Brief prompt proof, current-shape Agent Tools runtime lifecycle proof, no-removed-test-seam scan, common agent/team/MCP/prompt/tool-readiness suites, server build, full source review, complete real Studio/standalone v1.4.50 Brief journey, worker restart/recovery/remount/cleanup, exact `73/73` parity, and latest-base Electron packaging are mandatory. Textual auto-merge is not evidence.

## Spine Actors / Main-Line Nodes

- `startApplication` — thin public SDK entry.
- `ApplicationStartupCoordinator` — owns frontend startup state, provider selection result, shared client construction, business callback, failure containment, and disposal.
- `StudioIframeBootstrapProvider` — owns current iframe v4 hints, ready emission, parent/origin/correlation validation, and normalization.
- `StandaloneSameOriginBootstrapProvider` — owns top-level same-origin wire fetch/validation, root-relative path confinement, browser-origin HTTP/WS resolution, and runtime-bootstrap normalization.
- `StandaloneApplicationHost` — owns one configured application, root UI presentation, selected-app root-relative platform paths, network policy, and reserved platform namespace.
- `ApplicationProjectCommandService` — owns application-project config/source-manifest resolution and delegates pack, validate, development session, or production host start without becoming a runtime container.
- `StandaloneDevelopmentSession` / `StudioDevelopmentSession` — own watch/coalescing/rebuild and host-specific development-session cleanup; they do not implement server or Studio lifecycle.
- `startStandaloneApplicationHost` — narrow server-owned process API used by devkit `dev` and `start`; it builds exactly one standalone application server and returns its address/close handle.
- `ApplicationPlatformLifecycle` — owns process/application-platform preparation, recovery, and shutdown sequencing; it does not decide per-application run configuration.
- `ApplicationStandalonePackageValidator` — owns pure package-default completeness for standalone-capable artifacts and delegates nested portable-field semantics to `ApplicationPortableLaunchConfigPolicy`.
- `ApplicationLaunchConfigurationService` — owns manifest and selected-resource baselines, no-write selection preview, sparse host override/effective provenance, host validation, and run guard.
- `MemberTeamContextBuilder` — owns team instruction/name/context resolution against the exact injected team-definition service.
- `ApplicationBackendApiGatewayService` — continues to own backend exposure and invocation.
- `ApplicationEngineController` — owns application worker handles/status/listeners/invocation; `ApplicationEngineLauncher` owns bundle/storage preparation, process/client launch, definition load, capability wiring, and controller attachment.
- `ApplicationOrchestrationHostService` — continues to own app-scoped runtime work.

- `AgentToolsMcpRuntime` — owns the exact registry/catalog/executor/dispatcher family and exposes only route and scoped-session construction dependencies.
- `ScopedAgentToolMcpSessionManager` — owns sessions issued for one explicit scope, attaches its execution capabilities, and revokes that scope deterministically.
- `ActiveAgentRunRegistry` — owns application active-run identity/state so the concrete publisher can be constructed before scoped sessions and run launch; no bind-once publication proxy remains.
- `PublishedArtifactPublicationService` — remains the application-runtime-scoped publication invariant owner behind the narrow publisher interface.
- `application-framework-boundaries.test.ts` — development-time policy owner for AFB-001–AFB-005. It resolves governed imports and has no production runtime role.

## Ownership Map

- **ApplicationStartupCoordinator:** the governing frontend startup owner. It must not implement provider wire protocols itself.
- **Bootstrap providers:** each owns one acquisition protocol and returns the same strict runtime bootstrap. They must not mount business UI or invoke backend operations.
- **StandaloneApplicationHost:** governs selected-app presentation and endpoint mounting. It must not become a second application engine or orchestration service.
- **Devkit command services:** govern project-relative config, package lifecycle commands, development watching, and translation into a standalone host config. They must not import managers beneath the standalone process API or duplicate Studio/server behavior.
- **Standalone process API:** governs construction, listen, and close for one standalone application server. Signal registration stays in CLI/process facades so tests and development restart can close the handle directly.
- **Server assembly roots:** construct exact dependencies and choose public surfaces. “Composition” describes this assembly activity and its folder only; the returned value is a server, not a service locator.
- **ApplicationPlatformLifecycle:** governs process/platform start/recovery/stop sequencing. It does not register HTTP routes or decide model/profile completeness.
- **ApplicationLaunchConfigurationService:** governs selected-resource edit projections, effective launch configuration, and per-application run readiness. Callers may not bypass it by reading the override store, traversing definitions, inferring from package/effective states, or consulting runtime/model owners directly.
- **MemberTeamContextBuilder:** resolves prompt team context only through its injected team-definition service; mixed handles may not choose a catalog.
- **Agent Tools MCP runtime:** governs the process registry/catalog/executor/dispatcher family and route dependencies. Server assembly roots do not depend on those internals separately.
- **Scoped Agent Tools session manager:** governs issue/revoke and session execution-capability attachment for one explicit scope. It depends on the MCP runtime's manager factory, not its internals.
- **Application-runtime publication owner:** remains `PublishedArtifactPublicationService` over the exact application run manager and relay. The MCP adapter depends only on the authenticated session's publisher.
- **External MCP gateway:** remains the Studio-owned generic integration surface. It does not issue or resolve Agent Tools run sessions and is absent from standalone.
- **Gateway/engine/orchestration:** retain their current subject ownership. Host adapters cannot bypass them.
- **Architecture boundary test:** owns executable enforcement of the already-approved dependency directions only. It must not become a production registry, a generic layer framework, or a replacement for source owners.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `startApplication(options)` | `ApplicationStartupCoordinator` | Stable public SDK call | Provider protocol details or app business state |
| Studio server main | `buildStudioServer` + lifecycle | CLI/process boundary | Standalone branches |
| Standalone host main | `buildStandaloneApplicationServer` + `StandaloneApplicationHost` | CLI/process boundary | Package parsing, worker implementation, orchestration |
| REST/WebSocket registrars | Gateway/communication services | Bind Fastify paths to exact service calls | Business policy or runtime lifecycle |
| Internal Agent Tools MCP registrar | `AgentToolsMcpRuntime.routeDependencies` | Bind `/mcp/agent-tools/:sessionId` in both servers | Default runtime discovery, external gateway policy, browser bootstrap, or unrelated runtime internals |
| `autobyteus-app dev` / `dev --host studio` | Host-specific dev session services | Stable application-folder development commands | Mock fallback, application runtime internals, Studio package-registry internals |
| `autobyteus-app start` | `ApplicationStandalonePackageValidator` then `startStandaloneApplicationHost` | Validate project/package target and delegate a runnable package | Build/watch/mock behavior or runtime managers |
| Studio launch setup routes/panel | `ApplicationLaunchConfigurationService` | View selected baseline, preview unsaved selection, save/remove sparse override, and show readiness | Definition traversal, package/effective inference, package mutation, independent readiness rules |
| `context.agentResources.requireRunnable` | `ApplicationLaunchConfigurationService` | Return one complete guarded effective profile | Resource/model fallback or null profile |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Central application-framework `*Composition`, `*Graph`, `*Authority`, and bind-once `*Port` symbols/files from the SR-011 map | The ambiguous names were replaced in IR-016 | Familiar `Server`, `Runtime`, `Manager`, `Supervisor`, `Coordinator`, `Service`, `Publisher`, and `Handler` names; SR-013 removes the two `BindOnce*` implementations after eliminating their cycles | Completed naming change plus SR-013 cleanup | Preserve the implemented vocabulary; delete the two proxy files/symbols/tests with no replacement alias |
| `autobyteus-application-frontend-sdk/src/hosted-application-startup.ts` | Encodes one host as the universal app entry | `src/application-startup/application-startup-coordinator.ts` plus providers | In This Change | Delete exports/types/tests after migrations |
| Version-suffixed application contract symbols/files (`*V1`, `*V4`, `*_V1`, `*_V4`, iframe contract doc filename) | Current code has one accepted version of each contract and the suffixes add symbol noise | Unversioned current-contract names in the exact naming inventory; numeric version fields remain serialized data | In This Change | Clean rename across contracts, SDK, devkit, server, Studio, tests/docs, dist/vendor/importable outputs; no aliases |
| `startHostedApplication` imports in both sample apps and starter template | Old app-facing contract | Package import of `startApplication` | In This Change | Starter and sample sources migrate; devkit/esbuild bundles the SDK into generated package output |
| `applications/{brief-studio,socratic-math-teacher}/scripts/build-package.mjs` | Duplicates frontend/backend/resource/package assembly and creates a second build owner | Checked-in `autobyteus-app.config.mjs` plus shared `packApplicationProject` | In This Change | Delete, do not wrap or expose as a devkit hook |
| `applications/{brief-studio,socratic-math-teacher}/{ui,backend}/**` including local SDK vendor trees | Generated source-root mirrors are not inputs to the canonical devkit pack and can drift from source/package output | `frontend-src`/`backend-src`/root resources as source; `dist/importable-package` as sole generated runtime package | In This Change | Move each icon into `frontend-src` first; regenerate `dist` and update tests/docs that referenced vendor files |
| Public iframe-contract host and mock backend as implicit `autobyteus-app dev` default | Produces misleading portability signal | Real standalone `dev`; real Studio `dev:studio`; mock/iframe helpers retained only under test fixtures if still useful | In This Change | No public `dev:contract` requirement and no endpoint-absence fallback |
| Application route registration inside broad REST/WS indices | Prevents host-specific public surfaces | Studio and standalone application ingress registrars | In This Change | Unrelated Studio routes stay in Studio registries |
| Monolithic `buildApp` construction as the only server assembly path | Cannot express selected-app surface | `buildStudioServer` and `buildStandaloneApplicationServer` | In This Change | Update callers/tests; no alias wrapper |
| New server-construction-path global singleton lookups | Hide which application runtime a host uses | Explicit constructor/registrar dependencies | In This Change | Existing unrelated internals may be follow-up |
| Default publish-provider capture of `getPublishedArtifactPublicationService()` / process-global manager | Bypasses the authenticated application session and exact application-runtime publication owner | `session.executionCapabilities.publishedArtifactPublisher` | In This Change | Remove cleanly; no request-time fallback or compatibility branch |
| Independent default Agent Tools registry/catalog/dispatcher resolution in runtime/route construction paths | Can issue sessions against a different provider family than the registered route | One server-owned `AgentToolsMcpRuntime` | In This Change | General process consumers use an explicit process session manager; application paths use their scoped manager |
| Manager/global Agent Tools session service inside application run cleanup | Revocation can target the wrong registry and creates a reverse cleanup dependency | Early `ApplicationAgentToolMcpSessionScope` used only through `AgentRunResourceManager` | In This Change | Scoped issuer records into the same scope; run removal never depends on issuer/publisher/manager |
| Unapproved broad SR-007 aggregate runtime/ports redesign | Was based on the false claim that all package tools belonged in the gateway | Narrow process MCP runtime + one session publication publisher justified by CRR-020 | Remains Removed | Do not restore its native-tool/configured-MCP/general-runtime expansion |
| `ApplicationExecutionResourceConfigurationStatus.READY` and ambiguous configured/effective DTO use | Conflates selected resource, saved override, effective profile, and host runnable state | Package baseline/override/effective types plus `ApplicationLaunchReadiness` | In This Change | Clean-cut contract/source/UI/test update; no alias |
| Brief hard-coded `BRIEF_STUDIO_TEAM_RESOURCE`, `fallbackExecutionResourceRef`, request-model rescue, and null-profile preset builder path | Bypasses the authoritative package/effective configuration owner | `context.agentResources.requireRunnable` plus complete effective-profile builder | In This Change | Business schemas may remove unused model input; no fallback retained |
| Studio reset-draft action labeled as Reset to defaults | Does not remove persisted override | Explicit delete/reset-to-package-default action; optional cancel-edit remains separately named | In This Change | Existing store removal API is reused |
| Studio alternate-resource inheritance from `effectiveConfiguration` or manifest `packageBaseline` | Uses post-overlay or wrong-resource state as the editor baseline | `selectedResourceBaseline` plus identity-bound no-write selection preview | In This Change | Delete the web heuristic; no definition traversal or compatibility branch |
| `MixedAgentMemberHandle` global builder fallback | Chooses wrong catalog after application-runtime-scoped construction | Required injected `MemberTeamContextBuilder` through managers/registries | In This Change | General-process server construction supplies its own exact builder at the boundary |
| Physical server-package minimization | Not needed to prove the server boundary | Proven Studio/standalone server paths followed by distribution optimization | Follow-up | Do not fork/copy code |

## Return Or Event Spine(s) (If Applicable)

### DS-004 — Runtime return/event flow

`Application backend context call -> ApplicationOrchestrationHostService -> AgentRunManager/team runtime -> durable binding + global lookup -> lifecycle event journal and/or published artifact projection -> queue-backed application event/artifact delivery -> ApplicationEngineLauncher.ensureReady -> ApplicationEngineController.invoke -> application worker handler -> backend notification/frontend reconciliation`

The host type is not present in this spine. That absence is an invariant: Studio and standalone differ only before the shared client ingress and at endpoint mounting. Eligible server/selected available MCP-origin calls traverse DS-014's same existing callback in either host before returning to event/artifact projection. Runtime internals are outside this spine.

## Bounded Local / Internal Spines (If Applicable)

### DS-005 — Application platform lifecycle

- Parent owner: `ApplicationPlatformLifecycle`
- Chain: `constructed -> preparing_runtime -> catalog_ready -> waiting_for_listener -> recovering -> ready -> stopping -> stopped` or `failed`.
- Public phase methods: `prepareBeforeListen()`, `recoverAfterListen()`, `awaitReady()`, and `stop()`; concurrent calls to the same phase share one promise, invalid phase order throws, and stop is idempotent.
- Why the listener split is explicit: current recovery runs after Fastify listens and may rely on the configured internal endpoint. The server start boundary owns `app.listen`; the lifecycle owns every named preparation/recovery collaborator on either side of it. No callback array or `requiredStartupTasks` bag exists.
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

The two server builders use the same lifecycle collaborators but may make different process-level decisions after a failure. “Fatal” means the named phase rejects and lifecycle state becomes `failed`; Studio and standalone do not report application readiness. Standalone closes/exits non-zero. Studio also fails process startup for required pre-listen work; only rows explicitly marked degraded/background preserve current noncritical behavior.

| Order / Capability | Current owner and observed behavior | Studio target | Standalone target | Await / failure classification | Stop responsibility |
| --- | --- | --- | --- | --- | --- |
| P0 App-data and host configuration | `AppConfigProvider`; current `AppConfig.initialize()` requires `<appDataDir>/.env` and an `AUTOBYTEUS_SERVER_HOST` value | `AppConfigProvider.initialize()` current root; pass returned `AppConfig` explicitly into the application-runtime builder | Validate `{packageRoot, localApplicationId, appDataDir, host, port, publicBaseUrl?}`; default host to `127.0.0.1`. `StandaloneHostConfigMaterializer` creates the data directory and an empty/non-secret `.env` only when absent, never overwrites it, and supplies derived loopback `AUTOBYTEUS_SERVER_HOST` or the explicit non-loopback `publicBaseUrl` through process/config input. Initialize `AppConfigProvider` before any accessor and pass the same instance into the application-runtime builder | Awaited initialization; unwritable root, invalid/missing non-loopback public base, or invalid config fatal. Non-loopback bind is trusted-network operation, not authentication/public-internet support | None; config immutable for process lifetime; materializer never writes credentials or package files |
| P1 Runtime logging | `initializeRuntimeLoggerBootstrap` / `initializeServerAppLogger` before migrations | Required | Required using configured standalone log root | Synchronous/awaited; fatal both | Logger flush remains process owner |
| P2 Core database migrations | `runMigrations({appRoot,databaseUrl})`; current fatal | Required with exact `AppConfig.getOperationalDatabaseUrl()` | Same against isolated standalone data root | Awaited; fatal both | None |
| P2A Operational database runtime + protected paths | Refreshed base resolves `ApplicationDatabaseLocation`, calls `configureFileToolDeniedPaths` for DB/root-key/WAL/SHM/journal, then `initializePrisma({datasourceUrl})` | Required before any repository-backed service | Same exact location from standalone `AppConfig` | Awaited; path registration or Prisma initialization failure fatal both | Server close hook calls `shutdownPrisma()` after all repository consumers stop |
| P2B Secret-vault bootstrap | Refreshed base calls `getSecretVaultRuntime().initialize(databaseLocation)`; LLM/media/search configuration reads the resulting service | Required after P2A and before app-data migrations, built-ins, definitions, tools, or model/runtime readiness | Same; this is provider-secret runtime configuration, not login/user auth | Awaited; bootstrap/verification failure fatal both and must be caught with a startup diagnostic rather than becoming an unhandled rejection | Server close hook closes the vault after application/runtime/event consumers stop and before Prisma shutdown |
| P3 App-data migrations | `AppDataMigrationRunner.runPending()` returns statuses and current caller logs outer failure | Required scan; preserve `FAILED`/warning result as degraded log and continue Studio, matching current noncritical policy | Required scan on isolated root; any startup-required `FAILED`/stale `RUNNING` result is fatal | Awaited; Studio degraded, standalone fatal | None |
| P4 Workspace runtime registration and temp workspace | `loadWorkspaces()` background; `WorkspaceManager.getOrCreateTempWorkspace()` later fatal | Required before app readiness | Required before app readiness | Awaited; fatal both | Workspace manager is process-scoped; no application lifecycle close |
| P5 Agent customization processors | `loadAgentCustomizations()` background | Required because real native runs use these registries | Required | Awaited idempotent registration; fatal both | Registries process-scoped; no stop |
| P6 Built-in agent tool groups | `loadAllAgentTools()` registers six groups in background and swallows missing/failure; refreshed `buildApp()` separately calls `registerProvisionedSearchTool()` | Replace with `AgentToolRegistryReadiness.registerRequiredGroups()` returning one result for each current group (`Skills Tools`, `Browser Tools`, `Task Delegation Tools`, `Agent Communication Tools`, `Published Artifact Tools`, `Media Tools`, `Search Tools`); all seven are explicitly registered once, and Search registration receives the prepared vault-backed provisioning service | Same strict owner and seven groups | Awaited; missing export/module/registration failure rejects with aggregate diagnostics; fatal both | Registries process-scoped; no stop |
| P6A Application Agent Tools session capability ready | Default publish provider previously captured a process-global service | Require the application scoped-session manager to be constructed with the concrete application publisher and exact MCP-runtime family | Same | Synchronous construction invariant before P7; missing publisher/family is fatal and no session manager is returned | Lifecycle blocks issue and revokes scope sessions; no publisher bind/close phase exists |
| P7 Package/catalog snapshot | Current package registry + `ApplicationBundleService.getCatalogSnapshot()` after listen | Studio package-registry snapshot + explicit bundle provider; invalid installed apps remain catalog diagnostics/quarantined instead of failing unrelated apps | Immutable configured package snapshot containing package ID `standalone`, delegated through current file bundle provider and filtered selection | Awaited before listen; infrastructure/snapshot failure fatal both. Studio per-app diagnostics are preserved; a diagnostic for the standalone selected app is fatal | Cache owned by `ApplicationPlatformRuntime`, discarded on process stop |
| P8 Built-in agent bootstrap | `bootstrapBuiltInAgents()` currently pre-listen; thrown error is fatal while unresolved definitions are reported as warnings | Required with explicit config/definition services | Required against isolated root | Awaited; thrown failure fatal both. Unresolved optional built-ins remain diagnostic unless P9 proves the selected/catalog resource depends on one | None |
| P9 Definition/tool/skill catalog readiness | Definition caches were lazy/background; current implementation refreshes and validates definitions/tools/skills but also incorrectly treats null launch profiles as ready | Refresh application-runtime-scoped agent/team providers and validate all active definitions plus named tool/skill references. Do not decide package default completeness or model/credential readiness here; delegate those to DS-011/DS-012 | Same restricted to selected application, followed by DS-012 | Awaited platform validation; invalid definitions/tools/skills fatal for selected standalone and per-app diagnostic in Studio. DS-012 separately governs run readiness | No stop; providers/caches application-runtime-owned |
| L1 Fastify construction/listen | `buildApp` registers every surface then listens | Full Studio surface plus Studio application registrars, internal Agent Tools callback, and separate external MCP gateway | Static/health/bootstrap/selected-app registrars plus the internal Agent Tools callback; no external MCP gateway | Await listen; fatal bind error | Returned server close handle calls `app.close()` |
| S1 Channel output + callback runtimes | Started immediately after Studio listen | Required Studio-only; current start semantics | Omitted | Await/synchronous as current; failure policy remains existing Studio owner | Studio `onClose` stops both |
| S2 Internal base URL seed | Current Studio/standalone process entry seeds the actual post-listen internal endpoint used by established Agent Tools descriptors and managed messaging | Preserve current behavior | Preserve current behavior | Awaited/current failure behavior unchanged | Existing process endpoint owner; independent of the session-bound publisher |
| S3 Managed messaging restore | Best-effort after listen | Studio-only best-effort | Omitted | Awaited; degraded log | Studio `onClose` closes service |
| R1 State inventory | `ApplicationPlatformStateStore.listKnownApplicationIds()` after listen | Explicit Studio data-root store and full catalog | Explicit standalone data-root store; compute recoverable IDs as `persistedKnownApplicationIds ∩ {selection.applicationId}` | Awaited; fatal both. Dormant non-selected records are retained unchanged | Per-operation SQLite handles close immediately |
| R2 Binding recovery + availability reconciliation | Startup gate/recovery/availability global accessors | Application-runtime-scoped gate/recovery/registry; reconcile full catalog + persisted known IDs | Same instances, but every lookup/recovery/availability input is scoped to the selected canonical ID from R1; never recover a previously selected different app | Awaited in `recoverAfterListen`; fatal both | Run observer owns recovered subscriptions; lifecycle disposes them |
| R3 Pending application event resume | Dispatch global accessor after recovery | Application-runtime-scoped dispatcher | Same | Awaited initial resume; fatal both. Later retry failures use existing durable backoff semantics | Dispatcher `stop()` clears timers and rejects new schedules |
| B1 Cache preloading | Detached background task with per-cache swallowed errors | Studio-only performance task, explicit best-effort scheduler after ready | Omitted; P9 already performs required reads | Background/degraded | None |
| B2 External configured-MCP source discovery/import | `mcp-loader` discovers host-configured external MCP sources in detached background work; this is not the internal Agent Tools callback | Studio-only best-effort, preserving current optional integration | Omitted from standalone first proof; `/mcp/gateway` also remains absent | Background/degraded | Existing external MCP/gateway owner during Studio shutdown |
| B3 Memory sync worker | Detached background task | Studio-only best-effort | Omitted from standalone proof | Background/degraded | Studio `onClose` calls `stopMemorySyncWorker()` |

`scheduleBackgroundTasks()` is decommissioned as the mixed owner. Required P4–P9 work becomes named lifecycle collaborators; B1–B3 are scheduled explicitly only by `buildStudioServer`, with their best-effort behavior visible at the callsite. B2 never registers the per-run Agent Tools session route.

### Application lifecycle stop order

After Fastify stops accepting new ingress and drains admitted handlers, `ApplicationPlatformLifecycle.stop()` runs once in this order: (1) set `stopping`, block new runs and new application Agent Tools session issuance, and stop execution-event intake/timers; (2) close application-agent communication; (3) dispose backend gateway/custom-WebSocket sessions and notifications; (4) stop artifact-delivery intake and drain every already accepted command through launcher ensure + controller invoke while workers remain available; (5) dispose remaining runtime-level run observers; (6) stop pending engine startups and attached workers through launcher/controller; (7) stop application team runs and then agent runs, where identity-checked registry removal synchronously revokes each run's sessions and detaches file/artifact/memory observers; (8) close the application session scope/scoped issuer and revoke any remaining sessions; (9) stop streaming; (10) mark `stopped`. There is no bind-once publisher close or later cleanup callback.

The process handle then closes process-scoped resources in dependency order: Studio alone stops memory sync, channel output, gateway callback, external MCP, and managed messaging owners; both hosts close `AgentToolsMcpRuntime` after every application scope has revoked, stop the default agent-run event pipeline, close the secret-vault runtime, and finally call `shutdownPrisma()`. Application platform stores hold no long-lived per-app SQLite connection, while repository Prisma is explicitly process-lived. Each close step runs in `finally`-style nesting so a failure cannot skip later session, vault, or database cleanup. `startStandaloneApplicationHost` returns an idempotent close handle used by development restart and tests; only the CLI main installs SIGINT/SIGTERM handlers. A bounded shutdown timeout is a process concern, and timeout expiry exits non-zero after preserving logs.

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
| Startup logging | DS-005, DS-006 | Server/CLI | Mode, selected local ID, canonical ID, data root, bound address | Operability | Business services log deployment policy |
| Tool/runtime preparation | DS-004, DS-005 | Lifecycle plus existing runtime loaders | Await current required loaders before readiness | Avoid first-run race | App backend compensates for platform readiness |
| Internal MCP capability security | DS-014 | `AgentToolsMcpRuntime` and existing route/session gate | Preserve current bearer/session and 401/404 behavior | Runtime callback is network-reachable even without user accounts | Application-runtime-specific logic leaks into route auth or bypasses registrar |
| Runtime callback base URL | DS-014 | Existing process endpoint owner plus scoped session manager | Preserve current descriptor URL behavior already proven in standalone | Descriptor must reach the registered listener | A second URL/path contract is invented |
| Publication capability selection | DS-014 | Authenticated session execution capabilities | Carry the exact application-runtime publisher without exposing runtime internals | Server adapter must act on the same run/journal/relay owner | Provider captures a global service or route looks up an application runtime at request time |
| Acyclic construction | DS-005, DS-014, DS-015 | Application platform runtime | Create session scope/run resources/registry, controller, and closed queues before publisher/session/launcher/delivery/dispatcher; remove both proxies | Exact identity, ensure, and cleanup without temporal binding | Mutable singleton, reverse callback, generic deferred container/handler, or service locator |
| Process cleanup | DS-005, DS-006, DS-010, DS-014 | Lifecycle/server assembly/CLI | Programmatic close, scoped session revoke and direct publisher release, child cleanup, event-pipeline/vault/Prisma stop, timeout | Reliable development restart and standalone exit | Devkit owns internals or sessions outlive their runtime |
| Content digest evidence | DS-006, DS-007 | Conformance harness | Prove the same read-only package files and entry digests serve both hosts before and after both runs | Supports AC-001 | Runtime mutates the distribution package or performs host-specific rebuilds |

## Ownership Boundaries

1. **Application source -> frontend SDK:** application code provides a root and mount callback only. It has no host imports.
2. **Frontend SDK -> bootstrap provider:** coordinator asks one resolved provider for `ApplicationRuntimeBootstrap`; provider mechanics stay encapsulated.
3. **Host route -> gateway/communication service:** route adapters bind a fixed/multi-app URL shape to an explicit application ID and delegate. They do not interpret business operations.
4. **Gateway -> engine:** gateway validates availability/exposures and delegates worker invocation.
5. **Worker context -> orchestration:** named capabilities remain the only runtime-control path from application backend code.
6. **Server assembly -> lifecycle/routes:** the server builder constructs exact instances; lifecycle sequences them; route registrars receive only subject-specific dependencies.
7. **Standalone config -> selection:** package root/local ID are validated once into an immutable selected-application descriptor used by root serving/bootstrap/ingress.
8. **Standalone wire -> runtime bootstrap:** the server owns selected identity/root-relative route advertisement; the same-origin provider owns browser-visible origin resolution; application code sees absolute runtime endpoints only.
9. **Package input -> host data root:** package/bundle owners read immutable files; storage, migration, log, status, and orchestration owners write only under the configured data root.
10. **Application command -> standalone process API:** devkit resolves project-relative package/ID/data/network values and invokes one narrow public start boundary. It never reaches application-runtime services directly.
11. **Server assembly -> process resources:** both server assembly roots explicitly complete core migration -> protected operational paths -> Prisma -> vault before app-data/tool/runtime readiness and close the event pipeline/vault/Prisma after application consumers. Process-global access is tolerated only under the one-server-per-process invariant.
12. **Resource definition -> Studio edit/effective launch:** `ApplicationLaunchConfigurationService` alone resolves manifest/selected baselines, previews an unsaved ref, overlays sparse host fields, validates the host, and guards run. Studio consumes these projections and never traverses definitions or treats the post-overlay result as its baseline.
13. **Application runtime -> member prompt:** `MemberTeamContextBuilder` is constructed from the exact application-runtime-scoped team-definition service and injected through mixed manager/registries/handles.
14. **Runtime configuration -> tool projection:** the Agent Tools process catalog projects only eligible server adapters and selected available MCP-origin tools into its descriptor. Package `toolNames` are not copied into that projection.
15. **Server assembly -> internal Agent Tools route/session:** one `AgentToolsMcpRuntime` supplies the exact registry/catalog/executor/dispatcher family to both the registrar and scoped session-manager creation. Neither side independently resolves defaults.
16. **Authenticated session -> publication:** `PublishArtifactsMcpAdapterProvider` uses only the session’s `PublishedArtifactPublisher`; it may not capture/discover a global service or resolve an application runtime from request identity.
17. **Application runtime -> publisher lifecycle:** the runtime creates application session scope -> run resources -> active registry -> exact publication service -> scoped issuer -> run managers. Sessions receive the concrete publisher once at issue; cleanup uses the early scope and never binds, calls back, or falls back.
18. **Artifact relay -> application worker:** the relay resolves binding/maps the event and enqueues one command; the late delivery service always asks launcher to ensure/restart before controller invoke.
19. **Run removal -> resources:** the registry identity-checks/deletes the exact run and synchronously delegates once to `AgentRunResourceManager`; no manager callback or application global is involved.

## Exact Application Runtime Dependency Wiring

`buildApplicationPlatformRuntime` is used only by an explicit server assembly root. Its dependencies and order are fixed by DS-015 and the [architecture-simplification supplement](application-framework-architecture-simplification.md):

1. **Process prerequisites:** initialized config/database location -> core migration -> protected DB/key paths -> Prisma -> secret vault. No application/tool/definition readiness precedes this chain.
2. **Catalog/storage:** explicit package-registry reader -> one file provider -> one bundle service; config/bundle -> storage lifecycle -> platform/global state and application stores.
3. **Stable early state:** availability state, `ApplicationEngineController`, `ApplicationExecutionEventDispatchQueue`, and `ApplicationPublishedArtifactDeliveryQueue`.
4. **Early cleanup capabilities:** application MCP session scope over the exact process registry; file-change and memory services; binding store + artifact queue -> queue-backed artifact relay.
5. **Run identity/resources:** session-scope revoker + exact three observer capabilities -> `AgentRunResourceManager`; resource manager -> `ActiveAgentRunRegistry`.
6. **Publication/session/run:** active-run reader + explicit workspace/projection/snapshot/relay -> concrete publication service; concrete publisher + session scope + process MCP family -> scoped issuer; then explicit provider factories, agent/team run managers, run services, and shutdown coordinator.
7. **Configuration/orchestration:** bundle/definitions/override/host adapters -> launch configuration; journal + event queue -> ingress; binding/lookup/ingress -> recovery/terminal transition; exact run services -> orchestration; orchestration -> streaming/communication.
8. **Engine/event/artifact:** bundle/storage/orchestration/streaming/controller -> `ApplicationEngineLauncher`; artifact queue/launcher/controller -> artifact delivery service; event queue/journal/availability/launcher/controller -> event dispatcher; launcher/controller/recovery/dispatcher/availability -> re-entry.
9. **Gateway/lifecycle:** controller/launcher + notification/WebSocket owners -> backend gateway; private preparation/recovery/queues/delivery/session/run/engine/streaming disposables -> lifecycle; private state + availability -> catalog reconciliation.
10. **Outward result:** freeze exactly `lifecycle`, `rest`, `realtime`, and `hostManagement`. Server builders pass only exact projections to registrars and keep the complete lifecycle for prepare/recover/stop.

```text
PackageRegistryReader -> BundleService -> DefinitionServices
        |                    |                 |
        +--------------------+-----------------+-> ApplicationPlatformRuntime builder

ProcessMcpFamily -> ApplicationSessionScope -> AgentRunResourceManager -> ActiveAgentRunRegistry
ArtifactDeliveryQueue -> QueueBackedRelay -----^                |
ActiveAgentRunRegistry -> PublicationService -> ScopedSessionIssuer -> RunManagers
RunManagers + Stores -> Orchestration -> Streaming -> EngineLauncher -> EngineController.attach
ArtifactDeliveryQueue -> ArtifactDeliveryService -> EngineLauncher.ensure -> EngineController.invokeArtifact
Journal -> EventDispatchQueue -> EventDispatcher -> EngineLauncher.ensure -> EngineController.invokeEvent
Private owners -> Lifecycle / CatalogReconciliation
Lifecycle + REST + Realtime + HostManagement -> outward ApplicationPlatformRuntime
```

There is no whole-runtime consumer below server assembly, no bind phase, no registry-to-manager callback, no relay-to-controller bypass, and no run creation during construction.

### Application runtime output shape

```ts
type ApplicationPlatformRuntime = Readonly<{
  lifecycle: ApplicationPlatformLifecycle;
  rest: ApplicationPlatformRestContracts;
  realtime: ApplicationPlatformRealtimeContracts;
  hostManagement: ApplicationPlatformHostManagementContracts;
}>;
```

`registerRestRoutes` receives `{ lifecycleReadiness, application: runtime.rest }`. `registerWebsocketRoutes` receives `{ lifecycleReadiness, application: runtime.realtime }`. Studio package refresh receives only `runtime.hostManagement.catalogReconciliation`. Stores, recovery, event dispatch, run/session/publication, engine, and shutdown services are not fields.

## Server / Application-Runtime-Critical Modify / Retain Inventory

This table retains the cumulative foundation inventory so downstream work does not lose earlier ownership decisions. For every overlapping file or accessor, the DS-015 **SR-013 file overlay** and [application-framework-architecture-simplification.md](application-framework-architecture-simplification.md) are the current disposition authority. Earlier `Rename`/`Create` wording records already-completed SR-011/foundation work and must not be repeated.

| Current file / accessor | Disposition | Exact target instance and fallback policy | Rationale / shutdown ownership |
| --- | --- | --- | --- |
| `config/app-config-provider.ts` | Retain process singleton, explicitly initialize first | Both mains call `initialize`; the returned `AppConfig` is passed into `buildApplicationPlatformRuntime`. No critical store re-reads it. | Many unrelated server owners are process-scoped; one host server runs per process. |
| `config/app-config.ts`, `config/application-database-location.ts`, `startup/migrations.ts` | Modify server-builder callsites; retain refreshed-base explicit contracts | Standalone config materializer ensures a new data root has only a missing empty/non-secret `.env`; CLI supplies explicit runtime values. Both server builders obtain one exact database location and call `runMigrations({appRoot,databaseUrl})`; no migration code re-reads a global provider. | Native standalone start must satisfy current config prerequisites without writing credentials or package files; operational DB identity must match the server data root. |
| `repository_prisma` `initializePrisma`/`shutdownPrisma`, `config/prisma-client-factory.ts` | Retain process runtime; make server ownership explicit | Both server builders initialize once from the exact database URL before repository consumers. Runtime-owned/current callsites that create clients resolve the same initialized location; process close shuts Prisma down last. | Refreshed base makes repository Prisma an actual process dependency. One server per process avoids cross-root ambiguity. |
| `secret-management/secret-vault-runtime.ts` and `autobyteus-ts/tools/file/workspace-path-utils.ts` denied-path configuration | Retain process-scoped runtime/config; make startup/stop explicit in both server builders | Initialize vault with the exact `ApplicationDatabaseLocation`; deny DB/root-key/sidecar paths before tool registration; close vault after event/runtime consumers and before Prisma. No host or devkit code reads secret values. | Provider/model/media/search execution now depends on the vault. This is runtime configuration, not authentication. |
| `agent-tools/search/register-search-tool.ts` | Move into strict tool-readiness owner | `AgentToolRegistryReadiness` registers Search as the seventh named group after vault readiness; `buildApp()` no longer performs hidden tool registration. | Route construction must not mutate a required application tool registry. |
| `agent-tools/mcp/agent-tools-mcp-runtime.ts` | Rename from current authority file; retain behavior | Construct exactly one registry, catalog/provider family, executor, dispatcher; expose narrow `routeDependencies` plus early application-session-scope and later concrete-publisher manager creation only | Server process owns runtime identity and close; no locator or whole-container injection |
| `agent-tools/mcp/agent-tool-mcp-session.ts` | Modify names only | Rename the non-wire field to `executionCapabilities` containing the narrow `publishedArtifactPublisher`; never serialize/log/persist it | Authenticated session is the exact run-scope capability boundary |
| `agent-tools/mcp/agent-tool-mcp-session-registry.ts` | Modify names only; retain semantics | Retain the exact in-memory session object through authentication/dispatch; preserve token hashing and revoke behavior | Route must see the same publisher issued by the application-runtime scope |
| `agent-tools/mcp/agent-tool-mcp-session-service.ts` plus `scoped-agent-tool-mcp-session-manager.ts` | Rename current interface/implementation; retain behavior | Accept exact registry/catalog and execution capabilities; each scope tracks issue/revoke/close; remove application-path default service lookup | Session issuance, route lookup, and cleanup share one family |
| `agent-tools/mcp/{agent-tool-mcp-catalog,agent-tool-mcp-tool-executor,agent-tools-mcp-method-dispatcher}.ts` | Modify construction only | Require explicit process-owned instances in server/runtime construction paths; provider execution receives the authenticated session | Preserve tool projection/protocol while removing mismatched default families |
| `agent-tools/mcp/providers/publish-artifacts-mcp-adapter-provider.ts` | Modify names only; retain passed behavior | Require `session.executionCapabilities.publishedArtifactPublisher` per call; no cached/default publication service | Exact application run/journal/relay owner; missing/unbound/closed fails before mutation |
| `services/published-artifacts/published-artifact-publisher.ts` | Retain narrow contract | One-method publisher implemented by the explicit application publication service | Prevent adapter dependence on manager/relay/service locator |
| `application-platform/runtime/bind-once-published-artifact-publisher.ts` | Delete in SR-013 | Replaced by `ApplicationAgentToolMcpSessionScope -> AgentRunResourceManager -> ActiveAgentRunRegistry -> concrete publication service -> ScopedAgentToolMcpSessionManager` construction | Removes the publication/session/cleanup cycle without alias, reverse callback, or deferred state |
| `agent-tools/mcp/agent-tools-mcp-routes.ts` | Modify names/imports only; preserve protocol | Registrar requires exact MCP-runtime route dependencies; both servers pass them | Preserve path/auth/401/404/origin/content behavior without default discovery |
| `mcp-gateway/mcp-gateway-routes.ts` | Retain Studio-only | Keep optional external gateway under the Studio server only; it cannot resolve Agent Tools run sessions. | Avoid conflating external integration with required runtime callback. |
| `server-runtime-endpoints.ts`, Studio and standalone process entries | Retain endpoint contract; rename construction variables | Preserve proven descriptor URL; construct one `AgentToolsMcpRuntime`, pass it to application-runtime builder and route, close it after scoped managers | No second URL/path or reflected request host |
| `application-packages/{stores/application-package-registry-store.ts,stores/application-package-root-settings-store.ts,services/application-package-registry-service.ts}` | Modify Studio construction; retain implementations | The Studio server builder constructs/injects stores with the exact `AppConfig`. Standalone does not persist package settings and supplies an immutable registry snapshot provider. | Prevent standalone package selection from mutating Studio settings. |
| `application-bundles/services/application-bundle-service.ts` | Modify | Constructor requires provider + registry snapshot provider in the application-runtime construction path; the runtime builder never calls `getInstance()`. | Catalog identity must be application-runtime-scoped. |
| `application-bundles/providers/file-application-bundle-provider.ts` and current manifest/identity utilities | Retain parser/validator; inject where needed | One explicit provider per application runtime; standalone wrapper filters configured local ID after current validation. | No second parser or manifest. |
| `application-storage/services/application-storage-lifecycle-service.ts` | Modify | Require exact `AppConfig`, bundle service, migration service; remove application-runtime-path fallback getters. | App DB root and bundle migrations must match the selected runtime. |
| `application-storage/stores/application-platform-state-store.ts` | Modify | Require exact config + storage lifecycle. | Known-app inventory and platform DBs use host data root. |
| `application-storage/stores/application-global-platform-state-store.ts` | Modify | Add constructor accepting `ApplicationStoragePathConfig` or resolved DB path; remove module-level `appConfigProvider` resolution. | Global lookup DB is application-runtime-construction-critical. |
| `application-orchestration/stores/{application-run-lookup-store,application-run-binding-store,application-execution-resource-configuration-store,application-execution-event-journal-store}.ts` | Modify runtime construction; retain schemas | Construct once from the exact global/platform store and inject downstream; no fallback construction in application-runtime-owned services. | All orchestration persistence shares one root/identity. |
| `agent-definition/providers/file-agent-definition-provider.ts`, `agent-team-definition/providers/file-agent-team-definition-provider.ts`, and their persistence-provider wrappers | Modify | Accept exact config + bundle service instead of field-initializing globals; the runtime builder constructs agent/team definition services from them. | Application-owned definitions must come from the selected catalog. |
| `startup/{agent-tool-loader,workspace-loader,agent-customization-loader}.ts` | Modify ownership | Expose strict named readiness methods/results; lifecycle receives these exact collaborators. Remove P4–P6 from background runner. | Real tool/runtime readiness cannot log-and-continue. |
| `startup/background-runner.ts` | Decommission mixed scheduler | `buildStudioServer` explicitly schedules B1–B3; standalone omits them. | Separates required readiness from optional extras. |
| `application-orchestration/services/application-orchestration-startup-gate.ts` | Modify | Public constructor/application-runtime instance; lifecycle completes/fails it. Runtime construction never uses the getter. | One readiness promise per application runtime. |
| new `application-availability-state-registry.ts` + existing `application-availability-service.ts` | Create/Modify | One application-runtime-scoped registry reader/writer; availability service coordinates reload/recovery/dispatch using writer. Remove internal state map/fallbacks. | Break availability/dispatch cycle and keep active checks singular. |
| `application-execution-event-{dispatch,ingress}-service.ts` plus new dispatch queue | Modify | Ingress appends journal then enqueues application ID; dispatcher receives exact journal/availability/launcher/controller and retains retry/stop. Remove global accessors. | Correct event root, acyclic construction, and timer cleanup. |
| `application-run-binding-{terminal-transition-service,lifecycle-hub}.ts`, `application-run-observer-service.ts` | Modify | One application-runtime-scoped hub/stores/ingress/observer; observer adds `dispose()` to detach all registrations. | Recovery and shutdown cannot reach a default runtime or leak listeners. |
| `application-orchestration-recovery-service.ts` | Modify | Exact bundle/platform/binding/lookup/observer/ingress/terminal instances; no global fallbacks. | Recovery must reconcile only the application runtime's catalog/data. |
| `application-execution-resource-{resolver,configuration-service}.ts`, `application-run-binding-launch-service.ts`, `application-agent-target-authorization-service.ts` | Modify | Exact bundle, definitions, configuration/binding stores, availability reader, startup gate, run services. | Selected resources and authorization use one application runtime. |
| `application-orchestration-host-service.ts` | Modify | Require exact gate, availability reader, resolver/configuration/launch, stores, observer, run/history/artifact/memory services. Remove application-runtime-path getters. | Core orchestration owner remains; construction becomes explicit. |
| `application-published-artifact-relay-service.ts`, `services/published-artifacts/published-artifact-publication-service.ts`, `agent-execution/services/agent-run-manager.ts` | Modify construction/lifecycle only | Relay maps the current event then submits a complete command to the closed artifact queue; publication reads the exact active registry; manager keeps create/restore/terminate/stop commands but delegates identity transitions to the registry and resource cleanup to `AgentRunResourceManager` | Preserve publication/event/manager semantics while making ensure-before-invoke and exact cleanup explicit and acyclic |
| application Codex/Claude bootstrap/session construction | Modify application construction only | Inject the application-runtime-scoped session manager for application-created runs; do not change provider-native tool behavior | Runtime session issue must attach the exact application-runtime execution capabilities |
| general-process Codex/Claude Agent Tools session construction | Modify construction only as required by shared provider contract | Receive the explicit general-process session manager from the server assembly root; attach the existing general-process publication publisher | Preserve non-application behavior after provider stops capturing a service; never reuse this manager in an application runtime |
| mixed team manager/member registries/handles cleanup | Modify bounded construction only | Carry the same scoped session revoker through new/restored member paths | Every created application session is revoked by its issuing scope |
| `agent-tools/published-artifacts/{register-published-artifact-tools.ts,publish-artifacts-tool.ts}` | Retain tool behavior | Existing `publish_artifacts` remains eligible; provider delegates through the session-bound publisher | No duplicate publication tool or package special case |
| `application-agent-streaming/services/application-agent-streaming-service.ts` | Modify | Exact orchestration/runtime source/mapper; add `stopAll()`. Remove application-runtime-path getters. | Agent streams bind to correct orchestration and are disposable. |
| `application-agent-communication/services/application-agent-communication-{service,session}.ts` | Modify | Exact streaming + orchestration; session adds public abort, service adds `closeAll()`. | Direct sockets must close cleanly. |
| `application-engine/services/application-engine-host-service.ts` | Delete after split | Move handle/status/listeners/invocation/attached stop to `ApplicationEngineController`; move bundle/storage/process/definition/capability startup to `ApplicationEngineLauncher`; explicit dependencies only | Removes engine/orchestration cycle while preserving one worker owner and shutdown |
| `application-backend-api-gateway/notifications/application-backend-notification-hub.ts` | Modify | `new` application-runtime-scoped hub; add `closeAll()`. No getter in route path. | Notifications cannot cross application runtimes and sockets close. |
| `application-backend-api-gateway/websockets/application-backend-websocket-session-service.ts` | Modify | Exact engine; retain engine listener unsubscribe handles; add `dispose()`/close-all. | Custom WS listeners and sessions have an owner. |
| `application-backend-api-gateway/services/application-backend-api-gateway-service.ts` | Modify | Exact bundle, availability reader, engine, hub, custom-WS service; retain notification unsubscribe and add `dispose()`. No application-runtime-path getter/static instance. | Correct gateway dependencies and listener cleanup. |
| `api/rest/application-{bundles,availability,backends,execution-resources}.ts` | Refactor | Handler/registrar factories receive exact services; Studio paths keep caller application ID, standalone registrar supplies selected ID. | Remove route closures over globals. |
| `api/websocket/application-{backend-notifications,backends,agent-communication}.ts` | Refactor | Registrars receive exact hub/custom-WS/communication service and cardinality adapter. | Same service owner, explicit host surface. |
| `server-runtime.ts`, `app.ts`, `index.ts` | Refactor | Studio main delegates to `buildStudioServer`; process signal registration is once per main, not in the application runtime. | Remove monolithic sole assembly path and duplicate signal listeners. |
| `autobyteus-application-devkit/src/{cli.ts,commands/dev.ts,config/*}`, template/sample `package.json` files | Modify | Add exact `dev --host <standalone-or-studio>` and `start` facades, host-specific development-session owners, standalone config materializer, and the five approved project scripts. Devkit calls only pack/validate, Studio public API, and `startStandaloneApplicationHost`; no server manager imports. | Native application-folder workflow is in scope; mocks become test fixtures only. |
| `applications/{brief-studio,socratic-math-teacher}/autobyteus-app.config.mjs`, `package.json`, `frontend-src/icon.svg`, and frontend entry imports | Add/Modify | Apply the exact declarative mapping above; scripts call devkit directly; SDK is a package import; icon is source-owned. | Makes both maintained layouts executable through the same package owner. |
| `applications/{brief-studio,socratic-math-teacher}/scripts/build-package.mjs` and source-root `ui/**`/`backend/**` | Delete after source icon migration | No adapter or wrapper. Regenerate only `dist/importable-package` from configured sources and update tests/docs away from local vendor paths. | Removes the conflicting package owner and stale generated layers. |
| `autobyteus-application-devkit/package.json` | Modify for first proof | Add a direct `workspace:*` dependency on the existing private `autobyteus-server-ts` project and import only its exported standalone start boundary. Do not resolve a relative source path or shell to a global executable. | Makes in-workspace/open-source-distribution `pnpm dev`/`start` deterministic without a new package; independent npm host publication remains deferred. |
| new `standalone-application-host/start-standalone-application-host.ts` plus existing server package export/build metadata | Add/Modify existing project | Public API accepts normalized standalone config, constructs/listens once, and returns `{url, close}`; CLI main alone installs signals. Initial implementation remains in `autobyteus-server-ts`; no extra package/project extraction. | Gives `dev` and `start` the same real standalone server and supports in-process test/dev cleanup without duplicating server internals. |
| Core Prisma/database migrations, application SQL migration schema/ledger, current manifest/backend/iframe serialized contracts | Retain wire/schema values; clean-cut rename code symbols | Same readers/writers/contracts receive configured paths/identity. Numeric version fields remain unchanged; all code identifiers use the unversioned current-contract names in the naming inventory. | AC-008/AC-012; no migration, dual parser, or suffixed alias. |
| Runtime/processor/tool registries, `WorkspaceManager`, model/LLM factories, low-level agent/team runtime managers | Retain process-scoped, but inject the chosen instances into application-runtime-owned run services/factories | One server process; P4–P9 completes required registration/readiness. No host mode or catalog selection is read from these registries. | Repository-wide DI rewrite is unnecessary; active runs are process resources. |
| External channel, callback delivery, managed messaging, external MCP gateway, mobile, remote access, memory sync | Retain Studio-only | Construct/register/stop only in `buildStudioServer`; absent from `buildStandaloneApplicationServer`. This row does not include internal Agent Tools MCP transport. | Preserve Studio capability without expanding standalone surface. |

All cached `getApplication*` accessors in modified application-runtime construction nodes are removed or restricted as specified by ARCH-REV-006. CR-015 also removes `getAgentToolMcp*`/default publication access from the application session, publish-adapter, route, and cleanup construction paths listed above. Unrelated general-process consumers remain explicit under the one-process MCP runtime; the broader SR-007 runtime/tool redesign remains rejected.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `startApplication` | Coordinator, provider resolution, client creation | All app frontends/templates | Direct `window.parent`, direct bootstrap fetch in app code | Extend provider/coordinator contract |
| `ApplicationBootstrapProvider.acquire()` | Iframe message loop or same-origin fetch | Startup coordinator | Coordinator branching on postMessage/fetch | Add provider-specific method/state internally |
| `StandaloneApplicationSelectionService.resolve()` | Package snapshot, current parser/provider, selected bundle validation | Standalone server/host | Reading `application.json` directly in route/main | Extend selection result/diagnostics |
| `ApplicationBackendApiGatewayService` | Availability, engine start, exposure checks, backend WS sessions | Both host ingress adapters | Route calling worker client directly | Add a singular gateway method |
| `ApplicationPlatformLifecycle` | preparation, recovery, readiness, stop order | Both servers, bootstrap readiness | Route/CLI invoking recovery services ad hoc | Add lifecycle phase/API |
| `ApplicationOrchestrationHostService` | resource/run/binding/event/artifact coordination | Worker context capability bridge | Backend importing run manager/runtime factory | Add named context capability |
| `ApplicationLaunchConfigurationService` | Resource baseline builder, selection preview, override store/normalizer, host capability adapters | Studio setup, lifecycle projection, backend context, standalone server | Caller reads definitions/store/catalog or infers selected baseline from package/effective state | Strengthen view/preview/command/require-runnable API |
| Application-runtime-scoped run services | Mixed manager/registries/member context builder | Application team execution | Member handle calls global builder/team service | Pass exact builder through construction |
| `AgentToolsMcpRuntime` | Registry, catalog/provider family, executor, dispatcher, route dependencies | Studio/standalone servers and application-runtime scoped-session-manager factory | Server/route/session independently resolves defaults or receives the whole application runtime | Add a narrow route/scoped-session-manager method on the runtime |
| `ApplicationAgentToolMcpSessionScope` + `ScopedAgentToolMcpSessionManager` | Early ownership/revocation plus later issue/execution-capability attachment | Application Codex/Claude factories; run cleanup uses only the scope | Runtime factory calls global service, or cleanup depends on issuer/publisher | Split exact scope lifecycle from later issuance without duplicating ownership |
| `AgentRunResourceManager` + `ActiveAgentRunRegistry` | Exact per-run session/observer resources plus current-run identity transitions | Application publication, run manager commands, lifecycle shutdown | Manager-owned active/disposer maps, later callback, or stale completion deleting a replacement | Extend the typed removal/release results; never add a reverse callback |
| `ApplicationPublishedArtifactDeliveryQueue` + `ApplicationPublishedArtifactDeliveryService` | Accepted artifact commands, per-run FIFO, drain, worker ensure/restart, controller invoke | Application artifact relay and lifecycle | Relay invoking a controller-only handle, generic event bus, or deferred handler binding | Extend the closed command/completion contract or delivery service |
| Authenticated `AgentToolMcpSession.executionCapabilities` | Exact application-runtime `PublishedArtifactPublisher` | Tool executor/providers after route authentication | Provider captures global publication service or resolves runtime identity by request IDs | Add the narrowly typed publisher capability |
| `AFB-001–AFB-005` architecture test | Resolved source-dependency directions across transports, packages/bundles, application runtime/session/publication, and maintained application code | Standard server test suite and contributors | Bypassing an approved contract/SDK/injected dependency or suppressing a violation with a broad allow-list | Update the real owner contract first; change a policy only with architecture review |

## Dependency Rules

The prose rules below remain the design explanation. DS-016 makes the critical subset executable under stable IDs AFB-001–AFB-005; the exact table in DS-016 and [application-framework-hardening-evaluation.md](application-framework-hardening-evaluation.md) governs test scope and exceptions.

- Application frontend source may depend only on frontend SDK/contracts and its own UI/business modules.
- Application backend source may depend only on backend SDK/contracts and its own business modules.
- Application code must not import Studio, Electron, standalone-host, or server-internal modules.
- Bootstrap providers may depend on contracts, browser APIs, and provider-local helpers; they may not depend on app components.
- `ApplicationStartupCoordinator` may depend on the provider interface, resolver, client factory, and startup renderer; it may not contain provider wire branches.
- Standalone host code may depend on bundle selection, lifecycle readiness, gateway/communication adapters, and asset resolution; it may not import backend entry modules.
- Standalone package selection and serving are read-only. No host, worker, migration, or conformance path may write generated assets, identifiers, status, or caches into `packageRoot`; mutable output belongs under `appDataDir` or a disposable conformance work directory.
- Devkit commands may depend on pack/validate services, a narrow Studio public API client, and the exported `startStandaloneApplicationHost` boundary. They may not import application-platform lifecycle, gateway, engine, storage, orchestration, vault, or route internals.
- For a new standalone data root, the command/config owner may create only a missing empty/non-secret `.env` required by current `AppConfig`; it never overwrites an existing file or persists credentials. Exact host/public-base values are supplied as command/runtime inputs.
- Both server builders must complete one exact prerequisite chain before app-data migration or remaining readiness: `AppConfig/database location -> core migration -> protected DB/root-key/WAL/SHM/journal path registration -> Prisma initialization -> secret-vault initialization`. Both must stop the default run-event pipeline -> vault -> Prisma after application consumers.
- Standalone server bootstrap advertises only strict root-relative platform paths. The browser provider, not application code or bind configuration, resolves those paths to absolute HTTP/WS endpoints using the visible same origin.
- The standalone server defaults to loopback and does not install broad Studio CORS policy. Browser WebSocket upgrades require an `http(s)` `Origin` whose normalized host/port equals the normalized HTTP request `Host` host/port; missing/mismatched origins are rejected for these browser ingress routes. Trusted-proxy origin rewriting is not claimed in the first slice. An explicit non-loopback bind remains a trusted-network operator choice and adds no account/authentication subsystem.
- Server assembly roots may construct concrete services. No generic `get(name)`/`resolve<T>()` container is introduced.
- Route registrars receive exact services (`gateway`, `notificationHub`, `agentCommunicationService`, selected descriptor), not a whole application platform runtime.
- Both servers call `registerAgentToolsMcpRoutes(app, agentToolsMcpRuntime.routeDependencies)`; standalone does so before its static wildcard. Only Studio registers external `/mcp/gateway`; neither route aliases or proxies the other.
- Process route registration and application session creation use the exact same process MCP runtime family. The registrar/session service may not independently call default registry/catalog/dispatcher accessors.
- Application-created sessions carry the exact application runtime `PublishedArtifactPublisher`. Publish providers may not capture `getPublishedArtifactPublicationService()`, call `AgentRunManager.getInstance()`, resolve application-runtime identity at request time, or silently use a process default.
- The early application session scope is created before publication and records/revokes exact process-family sessions. The later scoped-session manager is constructed with that scope and the concrete application publisher before P6A readiness. Stop blocks issue/recording, run removal revokes per-run sessions, scope close revokes any remainder, and restart creates a new scope/publisher/registry/issuer set.
- Existing Agent Tools bearer/session gates and descriptor behavior remain unchanged. The correction must preserve the established 401/404 path rather than implement another authorization layer.
- The descriptor exposes only configured eligible static server adapters and selected available `ToolOrigin.MCP` definitions; tests inspect the descriptor/`tools/list` rather than package `toolNames`. Runtime-internal tools are outside the changed/tested boundary.
- Studio MCP Server Management may populate the Studio process registry and `/mcp/gateway`, but standalone may not read or copy that host state. The current proof does not promise configured MCP-origin tools in standalone.
- A future application-owned MCP resource may reuse platform provisioning internals, but it requires an explicit package, secret-binding, lifecycle, readiness, and application-scoping design. It must not reuse `/mcp/gateway` as the application runtime route.
- Shared gateway/engine/orchestration services remain unaware of Studio versus standalone.
- Host mode must not be added to `application.json` or backend handler inputs.
- Package default values may contain runtime/model identifiers and only `ApplicationPortableLaunchConfigPolicy`-approved tuning/pricing. Recursive credential/password/authorization/token-value/endpoint/workspace/machine fields are forbidden and diagnostics omit values. No package or business request may silently supply a missing host requirement.
- `ApplicationLaunchConfigurationService` is the authoritative boundary. Studio routes/UI, lifecycle projections, standalone start, and backend context may not read the override store, traverse definition defaults, infer a selected baseline from package/effective results, or consult model/runtime availability directly. Unsaved selection uses its no-write preview API.
- A required standalone baseline must use a bundled manifest-default resource. Studio may select a shared or alternate bundled resource only through an authoritative selected baseline/preview; a sparse override may complete missing definition fields, but save/run validation remains final.
- Mixed member handles require an injected `MemberTeamContextBuilder`; no handle/registry selects `AgentTeamDefinitionService.getInstance()`.
- New server/application-runtime construction code must not call global singleton accessors beyond the retained one-process resources in the inventory. `AgentToolsMcpRuntime` is the concrete process owner, not a general service locator; its internals are not passed alongside it.
- REST/WebSocket/standalone registrars must import application-runtime behavior through `application-platform-runtime-contracts.ts` and exact subject inputs, never private runtime owners (`AFB-001`).
- GraphQL must consume declared package/query/command contracts; maintained application sources/templates must remain on local modules, SDKs, Node built-ins, and declared libraries rather than host/runtime internals (`AFB-002`, `AFB-005`).
- Package/bundle code must not depend on presentation, API, assembly, standalone-host, or runtime implementation. The sole reviewed cross-owner edge is the catalog refresh coordinator's exact reconciliation contract (`AFB-003`).
- Application runtime, scoped session, and publish-adapter paths must use required injected application-scoped dependencies and may not reach general-process/default getters; only named general-process assembly factories are exempt (`AFB-004`).

## Interface Boundary Mapping

| Interface / API / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `startApplication(options)` | One frontend startup | Resolve provider, create client, mount app once | `StartApplicationOptions` exact shape above | Only public app entry |
| `ApplicationBootstrapProvider.acquire(signal)` | One provider acquisition | Return strict runtime bootstrap | Provider-local launch identity | Provider validates before normalization |
| `resolveApplicationBootstrapProvider(window)` | Host protocol choice | Select provider from unambiguous environment | Valid iframe hints or top-level same-origin | Malformed iframe hints fail; no fallback |
| `ApplicationRuntimeBootstrap` | One mounted application runtime | Minimal application identity + endpoint bases | Canonical application ID and local/package IDs | No iframe-only fields |
| `StandaloneApplicationBootstrapPayload` | One standalone provider-wire response | Selected identity + root-relative platform route bases | Selected canonical application ID; confined `/_autobyteus/*` paths | `contractVersion` owns serialization version; provider resolves visible origin; never passed to application callback |
| `StandaloneApplicationSelectionService.resolve(config)` | One standalone selected bundle | Validate root/local ID and build immutable descriptor | `{packageRoot, localApplicationId}` | Never selects first app implicitly |
| `ApplicationPlatformLifecycle.prepareBeforeListen()` | One application platform runtime | Run named P4–P9 including P6A concrete session-capability assertion through `catalog_ready` | Server-owned exact collaborators | Concurrent calls share promise |
| `ApplicationPlatformLifecycle.recoverAfterListen()` | One application platform runtime | Run R1–R3 and complete readiness | Already-listening server | Invalid order rejects |
| `ApplicationPlatformLifecycle.awaitReady()` | One application platform runtime | Gate application ingress | Same lifecycle | Failed state rethrows cause |
| `ApplicationPlatformLifecycle.stop()` | One application platform runtime | Close timers/sockets/listeners/workers in specified order | Same runtime | Idempotent |
| `autobyteus-app dev --host <standalone-or-studio>` | One application-project development session | Resolve project inputs, pack/watch, and delegate to exactly one real host session | Project root + closed host enum; default `standalone` | No mock value or missing-URL fallback |
| `autobyteus-app start` | One built application-project launch | Resolve existing output, explicit source-manifest local ID, data/network config; validate and delegate once | Project root plus optional package/data/host/port/public-base overrides | Does not pack/watch; absent/invalid build rejects |
| `startStandaloneApplicationHost(config)` | One standalone server process | Prepare process resources, build/listen selected-app server, return idempotent close handle | `{packageRoot, localApplicationId, appDataDir, host, port, publicBaseUrl?}` | Server-owned public boundary; no signal installation |
| `GET /_autobyteus/bootstrap` | Selected app bootstrap wire | Await readiness/engine and return strict standalone root-relative payload | No selector from request | Selected ID is standalone-server-owned; response does not derive absolute URLs from bind address or request Host |
| `GET /_autobyteus/health` | Standalone readiness | Report lifecycle state | None | Does not start app by itself |
| `/_autobyteus/backend/*` | Selected app backend | Fixed-app HTTP backend mount | Selected canonical ID | Delegates gateway |
| `/_autobyteus/backend/notifications` | Selected app notifications | Fixed-app notification socket | Selected canonical ID | Existing hub |
| `/_autobyteus/backend/ws/*` | Selected app custom sockets | Fixed-app backend WS mount | Selected canonical ID + route path | Existing WS session service |
| `/_autobyteus/agent/*` | Selected app direct agent communication | Fixed-app target connection | Selected canonical ID + binding/target path | Existing communication service |
| `POST/GET /mcp/agent-tools/:sessionId` | One internal runtime tool session | Authorize bearer, dispatch MCP against session-enabled configured tools/context/capabilities | Server-issued session ID + bearer only | Required in both hosts; exact MCP-runtime route dependencies; no application selector/body-selected capability; `cors:false`; not external gateway |
| `AgentToolsMcpRuntime.createApplicationSessionScope(scopeIdentity)` | One early application session scope | Reuse the exact process session service/registry for ownership and revocation before a publisher exists | Explicit application-runtime scope identity | Does not choose tools, create descriptors, or carry publisher/run-manager state |
| `AgentToolsMcpRuntime.createApplicationSessionManager(input)` | One later application session issuer | Reuse exact process registry/catalog, existing application session scope, and concrete execution capabilities | Scope object + narrow execution capabilities | Does not expose catalog/registry internals; created only after concrete publisher |
| `ScopedAgentToolMcpSessionManager.createAgentToolMcpSession(input)` | One scoped runtime session | Issue descriptor/session with concrete publisher, then record exact scope ownership | Existing execution/team/member/tool context | Uses exact process family; on record failure revokes that new session; rejects after close |
| `ApplicationAgentToolMcpSessionScope.close()` | One application session scope | Block recording and revoke every remaining scope-created session | Scope-owned session IDs | Idempotent; lifecycle owns call |
| `AgentRunResourceManager.attach(run)` | One exact application agent run | Attach file-change, artifact-relay, and memory observers while recording every successful disposer | Exact `AgentRun` object | Partial failure releases recorded resources before propagating |
| `AgentRunResourceManager.release(runId, expectedRun)` | One exact application agent run | Remove resource ownership, revoke run sessions, detach all recorded observers, and aggregate failures exactly once | Run ID + exact expected object | Repeated release is `already_released`; no callback to run manager |
| `ActiveAgentRunRegistry.removeIfCurrent(...)` | One exact application agent run | Identity-delete and synchronously release its four resource categories | `{runId, expectedRun, reason}` | Returns removed/not-found/identity-mismatch; stale completion cannot remove replacement |
| `ApplicationPublishedArtifactDeliveryQueue.accept(command)` | One accepted artifact relay command | Enqueue complete mapped event with per-run FIFO and return its completion | `{runId, applicationId, bindingId, revisionId, event}` | Rejects after intake stop; no topic/subscriber/handler API |
| `ApplicationPublishedArtifactDeliveryService` | Accepted artifact delivery commands | Consume, call `launcher.ensureReady(applicationId)`, then controller artifact-handler invoke and settle completion | Queue lease + complete command | Drained before engine stop; publication awaits the run pipeline, downstream listener enqueue remains non-transactional, and fallback awaits |
| `buildStudioServer()` | Studio server | Full existing platform + app surface | Multi-app catalog | Current product server |
| `buildStandaloneApplicationServer(config)` | Standalone server | Selected app browser surface plus existing Agent Tools callback only | Package root + local app ID | Calls existing registrar before static wildcard; no Studio/admin registries or external MCP gateway |
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
| Member context builder injection | Yes | Team definition identity explicit | Low | Require builder in handles; general-process server construction and application-runtime construction provide the exact instance |
| Agent Tools MCP runtime + route registrar | Yes | One process runtime plus session ID/bearer | Low | Route receives exact runtime dependencies; external gateway remains separate |
| Scoped Agent Tools session manager | Yes | One explicit session scope and its IDs | Low | Attach exact publisher and revoke only scope-owned sessions |
| Published-artifact publisher | Yes | One authenticated session’s application runtime | Low | Keep one command; never expose manager/relay or resolve by package/run ID |
| Application platform runtime | Yes | One host-owned connected service set | Low | Return a typed read-only result to the assembly root; pass exact fields to route registrars and deeper services |

## Framework Role Vocabulary

| Role Noun | Use It When | Do Not Use It For | In-Scope Examples |
| --- | --- | --- | --- |
| `Server` | A configured HTTP/WebSocket server and its explicitly returned server-facing services | The construction activity or a generic dependency container | `StudioServer`; `buildStandaloneApplicationServer` |
| `Runtime` | A long-lived connected subsystem/service set created once for a host or process and explicitly closed by its owner | An individual agent/team execution, a DTO, or an arbitrary service bag | `ApplicationPlatformRuntime`; `AgentToolsMcpRuntime` |
| `Manager` | A stateful owner of a scoped collection with create/find/revoke/close operations | One-shot sequencing across unrelated peers | `ScopedAgentToolMcpSessionManager`; `AgentToolMcpSessionManager` interface |
| `Supervisor` | An owner that constructs long-lived run managers and controls their lifetime/release | A manager of one keyed collection or a stop-only helper | `GeneralProcessRunSupervisor` |
| `Coordinator` | A small owner that sequences peer operations and aggregates their outcome | Resource storage, lookup, or construction | `ApplicationRunShutdownCoordinator` |
| `Service` | The authoritative owner of one domain capability or workflow | A miscellaneous dependency bag | `ApplicationLaunchConfigurationService`; `createApplicationOrchestrationServices` returns named services |
| `Publisher` / `Handler` | A narrow callable capability named by the action it performs | A generic “port” without a developer-visible role | `PublishedArtifactPublisher`; `ApplicationEngineEventHandler` |
| Session scope / run resource manager / active registry / engine controller / closed queues | Stable early lifecycle owners created before services that issue/publish/launch/dispatch | A reverse callback, generic deferred container/handler, service locator, or event bus | Exact run resources/identity and worker delivery control |
| `Registry` | Keyed in-memory identity lookup/registration | Orchestration or lifecycle | `AgentToolMcpSessionRegistry`; `ApplicationAvailabilityStateRegistry` |
| `Gateway` | A protocol/request boundary translating external or worker-facing calls into services | Process construction or a shared runtime | Existing application backend and external MCP gateways |
| `Store` | Durable or explicitly stateful persistence access | Runtime coordination | Existing binding, override, event, and lookup stores |
| `Resolver` / `Builder` / `Factory` | Pure or bounded selection, structured construction, or creation of a known product | A live subsystem that also owns shutdown | Existing resource resolver/baseline builder; application session-manager factory interface |

`Composition` and `Graph` remain architecture relationship terms only:

- `compositions/` is retained as the folder containing top-level server assembly roots; no type, returned value, parameter, or variable carries `Composition`.
- “Dependency graph” may describe the construction diagram below, but no code symbol, filename, property, or variable carries `Graph`.
- `Authority` is removed from this central naming scope because none of the affected types adds a unique authorization or command-sovereignty meaning. Security authorization remains explicitly named in the existing bearer/session authorization code.
- The SR-011 `BindOnce*` names correctly described the then-current proxies. SR-013 removes both proxies after eliminating their cycles; it does not replace them with another deferred abstraction.

## Exact Current-To-Target Naming And Responsibility Map

| Current Name / File | Target Name / File | Concrete Responsibility | Scope | Lifecycle Owner / Close Semantics | Contract Impact |
| --- | --- | --- | --- | --- | --- |
| `StudioServerComposition`; `buildStudioServerComposition`; `compositions/build-studio-server-composition.ts` | `StudioServer`; `buildStudioServer`; `compositions/build-studio-server.ts` | Build the configured Studio Fastify server, its application runtime, package registry, route set, and close hook | One Studio process | `FastifyInstance.onClose`; `startConfiguredServer` calls the returned server | Root export cleanly renamed; private package and no repository-external consumer; no alias |
| `StudioServerComposition.app`; `applicationGraph` property/local; `composition` local | `StudioServer.fastify`; `applicationRuntime`; `studioServer` | Name the actual Fastify server, live application services, and assembled server handle | Studio call sites | Same lifecycle objects | Source-only |
| `createStudioApplicationAuthorities`; `studioAuthorities` | `createStudioApplicationServices`; `studioServices` | Construct and return Studio package/bundle/definition services plus the application runtime | Studio server construction only | Returned services retain existing lifecycles | Internal helper/local clean rename |
| `agentToolsProcessAuthority`; `generalProcessRunAuthority` | `agentToolsMcpRuntime`; `generalProcessRunSupervisor` | Name the process MCP subsystem and general run-manager lifetime owner used by server cleanup | Studio and standalone process construction | Server close hook | Source-only rename; exact instances/order unchanged |
| `buildStandaloneApplicationServerComposition`; `compositions/build-standalone-application-server-composition.ts` | `buildStandaloneApplicationServer`; `compositions/build-standalone-application-server.ts` | Configure selected-app REST/WS/internal-Agent-Tools/static routes on one Fastify server; does not listen | One standalone host start | `startStandaloneApplicationHost` owns listen/close | Internal clean rename |
| `graph` parameter/local in standalone and route registrars | `applicationRuntime` | Name the exact live application service set | One standalone host | `applicationRuntime.lifecycle` | Source-only |
| `ApplicationPlatformRuntimeGraph`; `createApplicationPlatformRuntimeGraph`; `application-platform-runtime-graph.ts`; `create-application-platform-runtime-graph.ts` | `ApplicationPlatformRuntime`; `buildApplicationPlatformRuntime`; `application-platform-runtime.ts`; `build-application-platform-runtime.ts` | Build and return the read-only connected application services plus lifecycle; prepares execution infrastructure but starts no run | One per Studio host; one selected-app instance per standalone host | `ApplicationPlatformLifecycle` | Internal type/factory clean rename; test filename becomes `application-platform-runtime-isolation.test.ts` |
| `AgentToolsMcpProcessAuthority`; `createAgentToolsMcpProcessAuthority`; `agent-tools-mcp-process-authority.ts` | `AgentToolsMcpRuntime`; `createAgentToolsMcpRuntime`; `agent-tools-mcp-runtime.ts` | Own the process registry/catalog/executor/dispatcher family, route dependencies, general session manager, scoped manager creation, and registry clear | One server process | Studio/standalone process cleanup closes after scoped managers/runs | Internal clean rename; test becomes `agent-tools-mcp-runtime.test.ts` |
| `ApplicationAgentToolsSessionAuthority`; `application-agent-tools-session-authority.ts` | `ScopedAgentToolMcpSessionManager`; `scoped-agent-tool-mcp-session-manager.ts` | Create, track, redact, selectively revoke, block, and close sessions for one explicit scope; used for both general-process and application-runtime scopes | One manager per scope | General run supervisor or application lifecycle | Internal clean rename; removes inaccurate `Application` label from the general scope |
| `AgentToolMcpSessionAuthority` | `AgentToolMcpSessionManager` | Minimal session create/revoke/redact contract consumed by run backends/managers | Consumer interface; implementation scope explicit at construction | Implementing manager | Internal symbol rename across exact consumers |
| `ApplicationAgentToolsSessionAuthorityFactory`; `createApplicationSessionAuthority`; `generalProcessSessionAuthority` | SR-011 `ApplicationAgentToolsSessionManagerFactory` / SR-013 `ApplicationAgentToolsSessionFactory`; `createApplicationSessionScope`; `createApplicationSessionManager`; `generalProcessSessionManager` | Expose early application session-scope creation and later concrete-publisher session-manager creation from the same process MCP runtime; identify the general scope separately | One process runtime | Process MCP runtime | Internal clean evolution; no alias or second registry/catalog family |
| `createSessionAuthority`; `agentToolsSessionAuthority`; `agentToolMcpSessionAuthority` | `createSessionManager`; `agentToolsSessionManager`; `agentToolMcpSessionManager` | Name private construction and injected/returned manager references consistently | MCP runtime, runtime output, and agent/team construction call sites | The referenced scoped manager | Source-only rename; no object replacement |
| `AgentToolMcpSessionExecutionAuthorities`; `executionAuthorities`; `publishedArtifactPublication` | `AgentToolMcpSessionExecutionCapabilities`; `executionCapabilities`; `publishedArtifactPublisher` | Carry the narrow non-wire callable capabilities selected for one authenticated session | One in-memory session | Issuing scoped session manager; never persisted/serialized | Internal type/property rename; descriptor and wire schema unchanged |
| `assertExecutionAuthoritiesReady`; `generalProcessPublication` | `assertExecutionCapabilitiesReady`; `generalProcessPublisher` | State exactly which session capabilities are validated and which publisher is supplied for general-process sessions | MCP runtime construction | MCP runtime and supplied publisher | Source-only parameter/callback rename |
| `GeneralProcessRunAuthority`; `general-process-run-authority.ts` | `GeneralProcessRunSupervisor`; `general-process-run-supervisor.ts` | Construct process-singleton agent/team managers with the general session manager; stop and release them in order | One server process | Studio/standalone process cleanup | Internal clean rename |
| `ApplicationRunShutdownAuthority`; `application-run-shutdown-authority.ts` | `ApplicationRunShutdownCoordinator`; `application-run-shutdown-coordinator.ts` | Idempotently stop all application team runs, then agent runs, aggregating failures | One application platform runtime | `ApplicationPlatformLifecycle.stop()` | Internal clean rename; test filename follows |
| `ApplicationTeamRunShutdownPort`; `ApplicationAgentRunShutdownPort` | `ApplicationTeamRunStopper`; `ApplicationAgentRunStopper` | Narrow structural dependencies exposing only stop operations | Shutdown coordinator constructor | No independent lifecycle | Internal type rename |
| `PublishedArtifactPublicationPort`; `published-artifact-publication-port.ts` | `PublishedArtifactPublisher`; `published-artifact-publisher.ts` | Narrow capability used to publish artifact batches for a run | General or application-runtime publisher selected by authenticated session | Implementing publication service/proxy | Internal interface/file rename; request/result shapes unchanged |
| `DeferredPublishedArtifactPublicationPort` -> SR-011 `BindOncePublishedArtifactPublisher` | Removed in SR-013 | Replaced by early application session scope, run resource manager, identity registry, and concrete publisher-before-issuer construction | One application platform runtime | Registry removal releases run resources; lifecycle closes the scope | Clean deletion; no alias |
| `DeferredPublicationPortState` -> SR-011 bind-once state | Removed in SR-013 | No replacement state machine; exact publisher is a constructor dependency of the later scoped issuer | Application runtime builder | Application lifecycle | Clean deletion |
| `ApplicationEngineEventHandlerPort` -> SR-011 `BindOnceApplicationEngineEventHandler` | Removed in SR-013 | Replaced by early controller and two closed queues plus late launcher, event dispatcher, and artifact delivery service | One application platform runtime | Queue intake/drain and launcher/controller stop are lifecycle-owned | Clean deletion |
| `createApplicationOrchestrationAuthorities`; `create-application-orchestration-authorities.ts` | `createApplicationOrchestrationServices`; `create-application-orchestration-services.ts` | Construct the named orchestration/configuration/event/communication services returned to the runtime builder | Runtime construction only | Returned services retain their existing owners | Internal factory/file rename; locals `authorities` -> `services` |
| `createApplicationRunAuthorities`; `create-application-run-authorities.ts` | `createApplicationRunServices`; `create-application-run-services.ts` | Construct application-runtime run/team services, publisher/projection, metadata/memory, and shutdown coordinator | Runtime construction only | Runtime lifecycle through returned services | Internal factory/file rename; locals `runAuthorities` -> `runServices` |
| `applicationRunShutdownAuthority` | `applicationRunShutdownCoordinator` | Name the returned stop-only coordinator used by lifecycle | One application runtime | `ApplicationPlatformLifecycle.stop()` | Source-only property/local rename |
| `StudioApplicationApiAuthorities`; `configureStudioApplicationApiAuthorities`; `studio-application-api-authorities.ts` | `StudioApplicationApiServices`; `configureStudioApplicationApiServices`; `studio-application-api-services.ts` | Configure the exact Studio bundle/package/definition services consumed by GraphQL resolvers | One Studio process | Existing process lifetime; no new close | Internal clean rename; getters retain concrete service names |

The returned Studio handle is explicit rather than another container:

```ts
type StudioServer = Readonly<{
  fastify: FastifyInstance;
  applicationRuntime: ApplicationPlatformRuntime;
  packageRegistryService: ApplicationPackageRegistryService;
}>;
```

`buildStudioServer` configures this server but does not listen. The existing process entry calls `studioServer.fastify.listen(...)`; its close hook stops `applicationRuntime` and process resources in the already-passed order.

Test and source filenames that repeat a replaced role follow the same clean map: `standalone-application-composition.integration.test.ts` becomes `standalone-application-server.integration.test.ts`; `application-platform-runtime-graph-isolation.test.ts`, `agent-tools-mcp-process-authority.test.ts`, and `application-run-shutdown-authority.test.ts` become the target-role filenames above. No duplicate old/new test is retained.

## Main Domain Subject Naming Check

| Node / Subject | Target Name | Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Provider-specific host acquisition | `ApplicationBootstrapProvider` | Yes | Low | Do not call it business transport |
| Shared normalized data | `ApplicationRuntimeBootstrap` | Yes | Low | Exclude iframe correlation fields |
| Frontend owner | `ApplicationStartupCoordinator` | Yes | Low | Do not retain “Hosted” as universal name |
| Standalone bundle identity | `StandaloneApplicationSelection` | Yes | Low | Keep separate from package import registry record |
| Server lifecycle | `ApplicationPlatformLifecycle` | Yes | Medium | Do not let it become whole-server lifecycle |
| Host-facing root owner | `StandaloneApplicationHost` | Yes | Low | Keep gateway/engine behind existing owners |
| Programmatic process entry | `startStandaloneApplicationHost` | Yes | Low | Do not call it a dev server or platform container |
| Development owners | `StandaloneDevelopmentSession`, `StudioDevelopmentSession` | Yes | Low | Keep watch/rebuild policy out of production start |
| Exact selected definition baseline | `ApplicationLaunchResourceBaselineBuilder` | Yes | Low | Clean-cut rename package-only builder; one definition traversal for manifest/shared selection |
| Package portable-field owner | `ApplicationPortableLaunchConfigPolicy` | Yes | Low | Do not call it secret detection or use a broad token heuristic |
| Internal configured-tool route | `registerAgentToolsMcpRoutes` | Yes | Low | Reuse the established registrar in both servers; do not call it the external gateway |
| Application service set | `ApplicationPlatformRuntime` | Yes | Low | “Runtime” means one live connected set; builder does not create business runs |
| Process Agent Tools subsystem | `AgentToolsMcpRuntime` | Yes | Low | “Runtime” means one process-lived MCP family; do not call it a gateway or container |
| Scoped session collection | `ScopedAgentToolMcpSessionManager` | Yes | Low | Scope is explicit at construction/property names; class is valid for general and application runtime scopes |
| General run-manager lifetime | `GeneralProcessRunSupervisor` | Yes | Low | Supervisor constructs/releases managers; it is not the application runtime |
| Application run stopping | `ApplicationRunShutdownCoordinator` | Yes | Low | Coordinator sequences stop only; it does not own run creation |
| Run identity and cleanup | `ApplicationAgentToolMcpSessionScope` + `AgentRunResourceManager` + `ActiveAgentRunRegistry` | Yes | Low | Exact identity/removal results; no manager callback or deferred binding |
| Engine delivery construction | `ApplicationEngineController` + `ApplicationEngineLauncher` + event queue/dispatcher + artifact queue/delivery service | Yes | Low | Separate stable handle state, process ensure, durable event wakeup, and complete artifact delivery; no generic port |
| Agent Tools/general-gateway projection | Eligible Agent Tools adapters / selected available MCP-origin tools / process-level external gateway catalog | Yes | Medium | Do not treat package `toolNames` or the Studio gateway catalog as the run descriptor |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Backend invocation | Application Backend API Gateway | Reuse | Already authoritative across handler families | N/A |
| Worker lifecycle | Application Engine | Reuse | Already owns storage/start/invocation/stop | N/A |
| Runtime execution | Application Orchestration + agent execution backends | Reuse | Already app-scoped and multi-runtime | N/A |
| Package parsing/assets | Application Packages/Bundles | Extend | Need standalone configured snapshot/selection, not new parser | N/A |
| Host bootstrap acquisition | Frontend SDK iframe startup | Extend/Refactor | Existing logic is correct for Studio but owns too much | N/A |
| Standalone root/static/bootstrap | None | Create New | A second host is genuinely new | Existing Studio components cannot own a non-Studio server root |
| Server lifecycle construction | `server-runtime.ts` startup | Extend/Refactor | Current steps exist but are monolithic | N/A |
| Storage/migrations | Application Storage | Reuse | No schema or ownership change | N/A |
| Dev packaging/validation | Application Devkit | Extend | Existing package output is the proof artifact | N/A |
| Production standalone process | Existing server process project | Extend | The new standalone server builder belongs beside the Studio server builder | N/A; creating a new top-level host project would split server ownership before the boundary is proven |
| Package-default and selected-resource traversal | Application bundles + application/shared definition providers/traversal | Reuse/Extend | Existing sources already parse defaults and canonical definition identity | Strengthen one application-runtime-scoped resource-baseline builder, not a UI/parser duplicate |
| Portable package launch fields | Application launch configuration + runtime config schemas | Extend | Existing schemas identify valid tuning; one policy must recursively reject host-only fields | Add a narrow schema-aware policy, not a generic secret scanner or app allowlist |
| Effective launch configuration | Current execution-resource configuration service/store | Refactor | Current owner has selection/persistence but conflates override/effective/readiness | Rename/strengthen one owner; store stays internal |
| Host runtime/model/credential preflight | Runtime availability, model catalog, provider/vault services | Adapt | Existing capability owners contain real host knowledge | Add narrow application-runtime-scoped adapters, not generic secret logic |
| Package team prompt context | MemberTeamContextBuilder + mixed construction | Refactor | Existing builder owns semantics but receives the wrong team-definition service | Inject the exact application-runtime service through the bounded path |
| Internal Agent Tools MCP session transport | Existing route/session/catalog/dispatcher/tool adapters | Bounded refactor | Protocol/security behavior already works; construction/selection needs one explicit runtime | Add process MCP runtime and application-runtime-scoped session manager; preserve wire behavior |
| Application publication execution | Existing application-runtime-scoped publication service, relay, and default MCP adapter | Refactor dependency boundary | Business owner is correct; application path must use exact active-run registry and ensure-before-invoke delivery | Session-bound concrete publisher plus closed artifact queue/delivery service |
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
| Studio Server | Full current server surface | DS-001, DS-005 | Studio process | Rename assembly result; preserve behavior | Built by the Studio server assembly root |
| Devkit | Pack/validate, standalone capability metadata, real host sessions, production `start` facade | DS-006, DS-007, DS-010, DS-011 | Application project command services | Extend | Calls pure package validator; does not parse definitions itself |
| Application Launch Configuration | Manifest/selected baselines, unsaved selection preview, sparse host override, effective provenance, host validation, run guard | DS-012, DS-003 | Studio edit/read API, both hosts, backend context | Refactor existing service | One authoritative server owner; UI is a consumer |
| Mixed Team Prompt Context | Exact builder propagation and prompt semantics | DS-013, DS-004 | Application run services | Bounded refactor | No catalog merge/global fallback |
| Agent Tools MCP Process Runtime | Registry/catalog/executor/dispatcher and route dependencies | DS-014, DS-004 | `AgentToolsMcpRuntime` | Refactor grouping over existing owners | One process family; distinct from external gateway |
| Scoped Agent Tools Sessions | Session issue/execution capabilities/revocation | DS-014, DS-005 | `ScopedAgentToolMcpSessionManager` | Rename existing bounded owner | One explicit scope over process family |
| Application Run Identity/Resources | Active run identity, exact removal, session revocation, file/artifact/memory observer detach | DS-015, DS-014 | `ApplicationAgentToolMcpSessionScope`, `AgentRunResourceManager`, `ActiveAgentRunRegistry` | Bounded decomposition | Manager retains run commands; no reverse callback |
| Application Artifact Delivery | Mapped artifact command queue, per-run FIFO/drain, worker ensure/restart, controller invoke | DS-015, DS-004, DS-014 | `ApplicationPublishedArtifactDeliveryQueue`, `ApplicationPublishedArtifactDeliveryService` | Bounded decomposition | Distinct from durable event-journal wakeup queue |
| Application Published Artifacts | Exact run validation, journal/relay/projection | DS-014, DS-004 | Existing `PublishedArtifactPublicationService` behind `PublishedArtifactPublisher` | Rename boundary only | No change to publication semantics |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `application-runtime-bootstrap.ts` | Contracts | Runtime bootstrap schema | Current type, constants, validator | One wire-neutral contract | N/A |
| `standalone-application-bootstrap.ts` | Contracts | Standalone provider wire | Selected identity, strict root-relative platform paths, validator | One host-wire contract shared by server/provider | Runtime application identity fields |
| `application-startup-types.ts` | Frontend SDK | Public contract | Exact options/context/state/handle types | One public type family | Runtime bootstrap/client |
| `application-startup-coordinator.ts` | Frontend SDK | Startup owner | State, acquire, client, mount, dispose | One lifecycle owner | Runtime bootstrap/provider interface |
| provider files | Frontend SDK | Provider owners | One acquisition protocol each | Avoid coordinator branches | Provider interface/runtime bootstrap |
| `standalone-application-selection-service.ts` | Standalone host | Selection owner | Validate configured app and stable identity | One immutable selection concern | Current bundle parser/provider |
| `application-platform-lifecycle.ts` | Application platform | Lifecycle owner | Named P4–P9 including P6A, R1–R3 recovery, scope revoke/ready/stop | One state machine | Exact readiness/disposable collaborators |
| `application-definition-runtime-readiness.ts` | Application platform | Runtime readiness owner | Definition refresh/resource/runtime preflight | One readiness concern | Bundle/definitions/runtime availability |
| `agent-tool-registry-readiness.ts` | Application platform | Tool readiness owner | Strict results for the exact seven named groups including Search | One readiness concern | Current six-group loader plus provisioned Search registration |
| `agent-tools/mcp/agent-tools-mcp-runtime.ts` | Agent Tools MCP | Process runtime | Construct exact registry/catalog/executor/dispatcher and expose route dependencies plus the two-operation application session factory | One process ownership concern | Existing components |
| `agent-tools/mcp/scoped-agent-tool-mcp-session-manager.ts` | Agent Tools MCP | Scoped session manager | Attach execution capabilities, issue/track/revoke/close | One scoped lifecycle concern | MCP runtime + session service |
| `agent-tools/mcp/application-agent-tool-mcp-session-scope.ts` | Agent Tools MCP | Early application session scope | Record/revoke exact process-family sessions by run/member/owner; block/close | One revocation/ownership lifecycle independent of publisher | Process session service/registry |
| `agent-execution/services/agent-run-resource-manager.ts` | Agent Execution | Run resource cleanup owner | Attach/dispose file, artifact, memory observers and revoke run sessions exactly once | One four-category cleanup concern | Early application session scope |
| `agent-execution/runtime/active-agent-run-registry.ts` | Agent Execution | Run identity owner | Register/read/list/remove exact active run identity and return typed removal results | One keyed identity concern | Run resource manager |
| `application-orchestration/services/application-published-artifact-delivery-queue.ts` | Application Orchestration | Closed artifact command queue | Per-run FIFO, independent lanes, intake stop, completion, drain | One domain queue; no arbitrary topics | Mapped application artifact event |
| `application-orchestration/services/application-published-artifact-delivery-service.ts` | Application Orchestration | Artifact delivery consumer | Pull command, ensure/restart worker, invoke controller handler, settle lease | One executable delivery path | Queue + launcher + controller |
| `agent-tools/mcp/agent-tools-mcp-routes.ts` | Agent Tools MCP | Route registrar | Preserve bearer/session/protocol handling with required route dependencies | One established transport concern | MCP runtime route dependencies |
| `services/published-artifacts/published-artifact-publisher.ts` | Retain narrow contract | One-method publisher implemented by the explicit application publication service | Prevent adapter dependence on manager/relay/service locator |
| `application-platform/runtime/bind-once-published-artifact-publisher.ts` | Delete in SR-013 | Replaced by `ApplicationAgentToolMcpSessionScope -> AgentRunResourceManager -> ActiveAgentRunRegistry -> concrete publication service -> ScopedAgentToolMcpSessionManager` construction | Removes the publication/session/cleanup cycle without alias, reverse callback, or deferred state |
| `application-platform/runtime/bind-once-application-engine-event-handler.ts` | Application platform | Delete in SR-013 | Replaced by controller, launcher, event queue/dispatcher, and artifact delivery queue/service owners | No remaining construction concern | No replacement alias |
| `compositions/build-{studio,standalone-application}-server.ts` | Server assembly | Construction roots | Build servers/register chosen surfaces | One file per product server | Shared application runtime/lifecycle/registrars |
| route handler/registrar files | API transport | Thin adapters | Shared handler logic + distinct mounts | Split by HTTP/WS and host cardinality | Existing gateway/communication services |
| `commands/dev.ts` | Devkit | Dev command facade | Parse `--host`, select one development-session owner | One command boundary | Standalone/Studio session interfaces |
| `development/standalone-development-session.ts` | Devkit | Standalone dev owner | Disposable pack, watch/coalesce, graceful host restart, browser reload | One lifecycle concern | Pack/validate + server start API |
| `development/studio-development-session.ts` | Devkit | Studio dev owner | Stable pack, watch/coalesce, current Studio local import/reload, presentation refresh | One lifecycle concern | Pack/validate + Studio public API client |
| `commands/start.ts` | Devkit | Production command facade | Resolve existing output/ID/data/network and call standalone process API once | One no-build command concern | Config loader, validator, server public start API |
| `standalone-application-host/start-standalone-application-host.ts` | Existing server project | Public standalone process boundary | Validate selected package/host readiness, construct/listen/return close handle | One programmatic process lifecycle | `buildStandaloneApplicationServer` |
| `application-platform/launch-configuration/application-standalone-package-validator.ts` | Application platform | Pure package validator | Traverse current bundle defaults and emit package diagnostics | One package-only concern | Existing providers/traversal/policy |
| `application-platform/launch-configuration/application-portable-launch-config-policy.ts` | Application platform | Portable package policy | Recursively validate exact runtime schemas/paths | One policy concern | Runtime portable schemas |
| `application-platform/launch-configuration/application-launch-resource-baseline-builder.ts` | Application platform | Definition baseline owner | Resolve exact selected resource and definition provenance | One traversal concern | Application-runtime-scoped definitions |
| `application-platform/launch-configuration/application-launch-configuration-service.ts` | Application platform | Authoritative launch owner | View/preview/override/effective/readiness/guard | One domain owner | Builder, store, host capability adapters |
| `application-platform/launch-configuration/application-launch-host-capability-validator.ts` | Application platform | Host validation adapter | Runtime/model/credential readiness | One off-spine concern | Existing capability services |
| `application-platform/launch-configuration/application-launch-configuration-types.ts` | Application platform/contracts | Tight launch shapes | Baseline/preview/override/effective/provenance/readiness/issues | One type family | SDK contract resource refs |
| `application-platform/runtime/create-application-run-services.ts` and mixed factory/manager/registry/handle files | Runtime construction | Exact prompt service | Propagate application-runtime-scoped builder to all member handles | One bounded construction correction | Existing builder |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Normalized app identity + absolute endpoints | `application-runtime-bootstrap.ts` | Contracts | Both providers return it and the coordinator/client consume it | Yes: drops iframe launch/request-context/bind-origin duplication | Yes | Universal manifest or deployment config |
| Standalone identity + relative paths | `standalone-application-bootstrap.ts` | Contracts | Server and same-origin provider share one strict wire meaning | Yes: bind/request-origin values excluded | Yes | A second runtime-bootstrap shape |
| Bootstrap provider contract | `application-bootstrap-provider.ts` | Frontend SDK startup | Coordinator is provider-agnostic | Yes | Yes | Generic plugin registry |
| Backend HTTP handler invocation | `application-backend-route-handlers.ts` | REST transport | Studio and standalone mounts parse bodies the same way | Yes | Yes | Business gateway replacement |
| Selected application descriptor | `standalone-application-selection.ts` | Standalone host | Root, bootstrap, ingress, lifecycle need identical immutable identity | Yes | Yes | General multi-app catalog DTO |
| Application platform lifecycle state | `application-platform-lifecycle-state.ts` or colocated if small | Application platform | Health/bootstrap/server observe same state | Yes | Yes | Whole-server feature-state bag |
| Selected resource definition traversal | `application-launch-resource-baseline-builder.ts` | Application launch configuration | GET, preview, PUT, and package validation need identical definition precedence/provenance | Yes | Yes: replaces package-only builder meaning | UI helper or generic repository |
| Portable launch field policy | `application-portable-launch-config-policy.ts` | Application launch configuration | Package validator/runtime schemas need one recursive accept/reject rule | Yes | Yes: removes broad token exceptions | Secret scanner or app-specific allowlist |
| Agent Tools route registration | existing `agent-tools-mcp-routes.ts` | Agent Tools MCP | Both servers need the same established registrar | N/A: reuse | Yes: avoids a second route implementation | External gateway or unrelated runtime changes |
| Agent Tools process family | `agent-tools-mcp-runtime.ts` | Agent Tools MCP | Route and scoped-session-manager creation share one registry/catalog/dispatcher identity | Yes: removes repeated default construction | Yes | General service container |
| Application-runtime publication invocation | `published-artifact-publisher.ts` + `active-agent-run-registry.ts` | Published artifacts / agent execution | Exact active-run reader and one semantic command | Yes: hides manager identity | Yes | Runtime/service locator |
| Application artifact worker delivery | `application-published-artifact-delivery-{queue,service}.ts` | Application orchestration / engine | Relay and lifecycle share one closed accepted-command/drain contract | Yes: removes controller-only shortcut | Yes | Generic event bus, callback registry, or journal duplicate |

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
| `AgentToolMcpSessionExecutionCapabilities` | Yes: non-wire callable capabilities for one authenticated session | No descriptor/config duplication | Low | Rename current `*Authorities`; initially contains only exact publisher; add another field only for a separately proven runtime-sensitive adapter |
| `PublishedArtifactPublisher` | Yes: one publication command | Manager/relay/service identity excluded | Low | Implemented by the explicit application publication service and carried by session capabilities; never generalized into a tool context bag |

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
| `autobyteus-server-ts/src/application-platform/runtime/application-platform-lifecycle.ts` | Application Platform | Lifecycle owner | Named pre-listen/recovery/readiness/stop including P6A concrete session capability and scoped-session revoke | One control owner | Exact readiness/disposable capabilities |
| `.../application-platform/runtime/application-platform-runtime.ts` | Application Platform | Live runtime boundary | Freeze only lifecycle, REST, realtime, and host-management projections | One host-owned runtime meaning | Exact outward contracts |
| `.../application-platform/runtime/application-platform-runtime-contracts.ts` | Application Platform | Outward contract family | Exact REST/realtime/host-management subject projections | One cross-registrar contract family | Existing subject service interfaces |
| `.../application-platform/runtime/build-application-platform-runtime.ts` | Application Platform | Runtime builder | Construct private owners in DS-015 order and freeze four outward projections | One assembly concern | MCP runtime + explicit constructors |
| `.../application-platform/runtime/application-catalog-reconciliation-service.ts` | Application Platform | Host catalog reconciliation | Reconcile one supplied catalog snapshot against private known-state and availability owners | One host-management command | Platform state + availability |
| `.../application-platform/runtime/application-availability-state-registry.ts` | Application Platform | Availability state core | Reader/writer capabilities | Break one concrete constructor cycle | Availability record |
| `.../application-platform/runtime/bind-once-application-engine-event-handler.ts` | Application Platform | Delete | Controller/launcher plus closed event and artifact delivery paths remove cycle while preserving ensure/restart | Clean removal concern | None |
| `.../application-platform/runtime/bind-once-published-artifact-publisher.ts` | Application Platform | Delete | Early session scope/resource manager/registry and concrete publisher-before-issuer order remove cycle | Clean removal concern | None |
| `.../application-platform/runtime/application-definition-runtime-readiness.ts` | Application Platform | Required runtime readiness | Definitions/resources/runtime mappings | One readiness boundary | Current providers/availability |
| `.../application-platform/runtime/agent-tool-registry-readiness.ts` | Application Platform | Required tool readiness | Strict result for exactly seven named groups: Skills, Browser, Task Delegation, Agent Communication, Published Artifact, Media, and Search Tools | One readiness boundary | Current six-group loader plus provisioned Search registration |
| `.../agent-tools/mcp/agent-tools-mcp-runtime.ts` | Agent Tools MCP Transport | Process runtime | Own exact registry/catalog/executor/dispatcher, route dependencies, and early-scope/later-manager application session factory | One process identity/lifecycle | Existing components |
| `.../agent-tools/mcp/scoped-agent-tool-mcp-session-manager.ts` | Agent Tools MCP Transport | Scoped session manager | Attach execution capabilities, issue/track/revoke/close sessions | One explicit scope lifecycle | MCP runtime/session service |
| `.../agent-tools/mcp/application-agent-tool-mcp-session-scope.ts` | Agent Tools MCP Transport | Early application session scope | Record/revoke application sessions by exact run/member/owner; block/close | One ownership/revocation lifecycle | Exact process session service/registry |
| `.../agent-tools/mcp/agent-tool-mcp-session.ts` | Agent Tools MCP Transport | Authenticated session | Carry non-wire `executionCapabilities` | One in-memory session subject | Published-artifact publisher |
| `.../agent-tools/mcp/providers/publish-artifacts-mcp-adapter-provider.ts` | Agent Tools MCP Transport | Publish adapter | Delegate only through authenticated session publisher | One adapter concern | Existing publish input/result |
| `.../services/published-artifacts/published-artifact-publisher.ts` | Published Artifacts | Narrow publisher | One publication command contract | One runtime-sensitive capability | Existing publication DTO/result |
| `.../agent-tools/mcp/agent-tools-mcp-routes.ts` | Agent Tools MCP Transport | Existing registrar | Preserve auth/origin/protocol; require exact MCP-runtime route dependencies | One established transport concern | MCP runtime registry/dispatcher |
| `.../application-platform/launch-configuration/application-standalone-package-validator.ts` | Application Platform | Pure package validation | Validate bundled required resource, every leaf default, and portable fields | One validation owner | Existing bundle/definition providers + policy |
| `.../application-platform/launch-configuration/application-portable-launch-config-policy.ts` | Application Platform | Package portability policy | Recursive schema-aware accept/reject with exact paths | One narrow policy owner | Runtime portable field schemas |
| `.../application-platform/launch-configuration/application-launch-resource-baseline-builder.ts` | Application Platform | Definition baseline owner | Resolve exact bundle/shared agent/team baseline with definition provenance | One definition traversal concern | Exact application-runtime-scoped definition services |
| `.../application-platform/launch-configuration/application-launch-configuration-service.ts` | Application Platform | Launch service | View/preview/persist/remove/evaluate/require runnable | One subject owner | Baseline builder/store/host capability interfaces |
| `.../application-platform/launch-configuration/application-launch-host-capability-validator.ts` | Application Platform | Host readiness concern | Exact runtime/model/credential validation | One adapter owner | Existing runtime/model/provider services |
| `autobyteus-application-sdk-contracts/src/execution-resources.ts` | SDK Contracts | Launch view/preview contract | Selected baseline, preview union, provenance, sparse override/effective/readiness shapes | One cross-boundary type family | Current resource refs |
| `autobyteus-server-ts/src/api/rest/application-execution-resources.ts` | REST Transport | Studio launch adapter | GET view, POST selection preview, PUT sparse override, DELETE reset | One route family | Launch service only |
| `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue` | Studio UI | Setup coordinator | Load/refresh slots, request preview, save/reset, render issues | One page workflow | SDK launch contracts |
| `autobyteus-web/components/applications/setup/ApplicationExecutionResourceSlotEditor.vue` | Studio UI | Slot editor | Identity-bound selection preview and sparse draft | One slot concern | Selected baseline/preview |
| `autobyteus-web/components/applications/setup/{ApplicationAgentLaunchProfileEditor,ApplicationTeamLaunchProfileEditor,ApplicationTeamMemberOverrideItem}.vue` and `useRuntimeScopedModelSelection.ts` | Studio UI | Profile editors | Per-field inheritance/provenance and mixed-runtime catalog behavior | One nested edit family | Selected baseline leaves/catalogs |
| `.../application-platform/runtime/create-application-orchestration-services.ts` | Application Platform | Internal service builder | Construct named orchestration/configuration/event/communication services | One internal construction concern | Existing services/stores |
| `.../application-platform/runtime/create-application-run-services.ts` | Application Platform | Internal run-service builder | Construct exact application run/team services, publisher/projection, memory/metadata, and shutdown coordinator | One internal construction concern | Existing managers/factories |
| `.../application-platform/runtime/application-run-shutdown-coordinator.ts` | Application Platform | Shutdown coordinator | Stop team runs then agent runs; aggregate failures idempotently | One stop-sequencing concern | Exact run stoppers |
| `.../agent-execution/services/agent-run-resource-manager.ts` | Agent Execution | Exact run-resource cleanup | Attach/release session plus file/artifact/memory observers, including partial attach | One cleanup lifecycle independent of commands | Application session scope + observer capabilities |
| `.../agent-execution/runtime/active-agent-run-registry.ts` | Agent Execution | Active-run identity owner | Register/read/list and identity-remove with typed reason/result; synchronously delegates exact cleanup | One state concern needed before publication | Existing `AgentRun` identity + resource manager |
| `.../agent-execution/runtime/general-process-run-supervisor.ts` | Agent Execution | Process run supervisor | Construct/release process agent/team managers and stop them in order | One process lifecycle | General scoped session manager |
| `.../application-engine/services/application-engine-controller.ts` | Application Engine | Attached-worker control | Worker handle/status/listener state, invocation, attach/detach, attached stop | One stable early owner | Existing worker handle/status contracts |
| `.../application-engine/services/application-engine-launcher.ts` | Application Engine | Worker launch lifecycle | Bundle/storage preparation, process/client launch, definitions/capabilities/stream wiring, ensure/stop | One late launch owner | Controller + existing launch dependencies |
| `.../application-orchestration/services/application-published-artifact-delivery-queue.ts` | Application Orchestration | Artifact command queue | Accept complete mapped events, per-run FIFO, independent lanes, completion, intake stop/drain | One closed domain queue | Application artifact event |
| `.../application-orchestration/services/application-published-artifact-delivery-service.ts` | Application Orchestration | Artifact delivery consumer | Ensure/restart worker then invoke controller artifact handler and settle queue lease | One executable delivery path | Artifact queue + launcher/controller |
| `.../application-orchestration/services/application-execution-event-dispatch-queue.ts` | Application Orchestration | Journal wakeup queue | Coalesce application IDs after durable append; no arbitrary payload/topic API | One closed bounded-local queue | Application ID only |
| `.../application-orchestration/services/application-reentry-service.ts` | Application Orchestration | Re-entry transition owner | Stop/reload/reconcile/recover/resume and availability transition | One explicit state transition | Launcher/controller/recovery/dispatcher |
| `.../application-packages/services/application-package-registry-service.ts` | Application Packages | Package registry state/query | Package roots, records, snapshots, list/details, diagnostics, command-facing state mutations | One package-state owner | Existing settings/record stores |
| `.../application-packages/services/application-package-command-service.ts` | Application Packages | Package command/rollback owner | Local/GitHub import, reload, remove, validation, managed cleanup, rollback, results | One command owner | Registry + installer + provider validator + refresh coordinator |
| `.../application-packages/services/application-catalog-refresh-coordinator.ts` | Application Packages | Ordered catalog propagation | Bundle refresh/snapshot, runtime reconciliation, agent cache, then team cache | One sequencing invariant | Bundle + host reconciliation + definitions |
| `.../api/graphql/studio-application-api-services.ts` | Studio GraphQL | Configured service set | Supply exact bundle/package/definition services to existing resolvers | One Studio process concern | Existing service getters |
| `.../api/rest/index.ts` | REST Transport | REST composition boundary | Accept lifecycle readiness plus `runtime.rest` and fan out exact subject contracts | One transport registration concern | Application platform REST contracts |
| `.../api/websocket/index.ts` | WebSocket Transport | Realtime composition boundary | Accept lifecycle readiness plus `runtime.realtime` and fan out exact subject contracts | One transport registration concern | Application platform realtime contracts |
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
| `.../compositions/build-studio-server.ts` | Server Assembly | Studio server builder | Build one MCP runtime, shared application runtime, internal route with exact deps, and separate external gateway | One product root | Existing components/lifecycle |
| `.../compositions/build-standalone-application-server.ts` | Server Assembly | Standalone server builder | Build the selected-app server and internal route before static wildcard | One product root | Same application runtime/lifecycle; no external gateway |
| `.../standalone-application-host/config/standalone-host-config-materializer.ts` | Standalone Host | Data-root config boundary | Create missing data root/empty non-secret `.env`, preserve existing config, derive/validate public base | One current-AppConfig adaptation concern | Normalized standalone config |
| `.../standalone-application-host/start-standalone-application-host.ts` | Standalone Host | Public programmatic process boundary | Prepare process prerequisites, build/listen, return `{url, close}` | One reusable process lifecycle | Standalone server builder + process resources |
| `.../standalone-application-host/main.ts` | Standalone Host | CLI/process facade | Parse normalized config, call public start, install signals/exit policy | One OS process entry | Public start API |
| `autobyteus-application-devkit/src/config/application-devkit-config.ts` | Devkit | Project capability/config | Resolve explicit `standalone.enabled` | One project metadata concern | No manifest field |
| `autobyteus-application-devkit/src/commands/{pack,validate,dev,start}.ts` | Devkit | Command facades | Invoke standalone package validation when enabled/required | One command boundary each | Pure server validator |
| `autobyteus-application-devkit/src/commands/dev.ts` | Devkit | Dev command facade | Parse the closed `standalone`/`studio` host option and delegate | One command | Development-session owners |
| `autobyteus-application-devkit/src/development/standalone-development-session.ts` | Devkit | Standalone dev lifecycle | Disposable pack/validate, watch/coalesce, close/restart real host, reload browser | One real-host dev concern | Pack owner + public server start |
| `autobyteus-application-devkit/src/development/studio-development-session.ts` | Devkit | Studio dev lifecycle | Pack/validate, watch/coalesce, call current local-package import/reload API, refresh Studio presentation | One real-host dev concern | Pack owner + Studio public client |
| `autobyteus-application-devkit/src/commands/start.ts` | Devkit | Production start facade | Resolve existing package/source ID/data/network, validate, call public server start once | One no-build production command | Validator + public server start |
| `autobyteus-application-devkit/src/studio/studio-application-package-client.ts` | Devkit | Studio public adapter | Local package import/reload requests and diagnostics | One external host API concern | Existing Studio GraphQL/application package contract |
| `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts` | Server Architecture Test | Executable dependency-policy owner | Resolve governed imports; enforce AFB-001–AFB-005 against current tree and synthetic allowed/rejected fixtures | One development-time invariant with no runtime role | Generic layering framework, broad allow-list, generated-output scan, or production dependency |
| `autobyteus-server-ts/docs/modules/applications.md` | Server Documentation | Canonical application-framework boundary table | Publish exact AFB IDs, allowed/forbidden directions, exceptions, and remediation | Existing owner already explains application runtime architecture | Duplicate runtime behavior source or unreviewed exception |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | Server Documentation | Top-level architecture index | Summarize the boundary and link to module policy/test | Existing architecture entrypoint | Duplicated full policy or generated-doc subsystem |

## Applied Patterns (If Any)

- **Strategy/provider pattern:** only for bootstrap acquisition, where two protocols genuinely differ.
- **Server assembly root:** Studio and standalone construct explicit service dependency relationships without a generic locator.
- **Thin transport adapters:** distinct URL/cardinality mounts delegate to one gateway/communication service.
- **Lifecycle state machine:** reusable start/readiness/recovery/stop order is explicit rather than hidden across entrypoint callbacks.
- **Adapter normalization:** Studio iframe v4 and standalone `contractVersion: "1"` wire payloads normalize before client creation; app business code sees one unversioned current SDK type.
- **Capability-scoped internal transport:** an issued bearer session closes runtime-to-host configured-tool callbacks without creating user authentication or an external gateway.
- **Process MCP runtime plus scoped managers:** one runtime controls registry/catalog/dispatcher identity; explicit scopes attach exact execution capabilities without duplicating the route or catalog.
- **Early run identity/resource owners:** application session scope, run resource manager, and identity registry exist before publication/issuance; every removal path releases the exact resources once and no deferred publisher or reverse callback remains.
- **Closed delivery queues:** a journal-wakeup queue drives durable event retry while a complete-command queue drives artifact ensure/invoke/drain. Neither is a generic event bus or handler registry.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/application-runtime-bootstrap.ts` | File | Shared contract | Host-neutral runtime bootstrap | Cross-host normalized contract owner | Manifest/deployment policy |
| `autobyteus-application-sdk-contracts/src/standalone-application-bootstrap.ts` | File | Standalone provider wire | Selected identity + strict root-relative platform paths | Server/provider cross-boundary contract | Bind address, request Host, absolute runtime URLs |
| `autobyteus-application-sdk-contracts/src/execution-resources.ts` | File | Launch configuration contract | Manifest/selected baseline, selection preview, sparse override, effective provenance, readiness | Server/Studio shared contract owner | UI state or definition traversal |
| `autobyteus-application-frontend-sdk/src/application-startup/` | Folder | Frontend startup subsystem | Coordinator/provider structure | Exposes structural depth clearly | Business UI components |
| `autobyteus-server-ts/src/application-platform/runtime/` | Folder | Shared application lifecycle | Runtime/lifecycle/readiness, narrow outward contracts, catalog reconciliation, and runtime construction | Host-neutral application platform grouping | Fastify route paths, private-store exposure, or generic dependency containers |
| `autobyteus-server-ts/src/application-platform/launch-configuration/` | Folder | Launch configuration subsystem | Portable policy, resource baseline builder, view/preview/override/effective/readiness service | One server-owned application-launch boundary | Web presentation or host-specific fallback |
| `autobyteus-server-ts/src/agent-tools/mcp/` | Folder | Internal Agent Tools transport | Process MCP runtime, scoped session manager, session registry/catalog/executor/dispatcher, providers, and route registrar | Existing subject boundary owns this protocol and scoped capability selection | External gateway policy, application browser bootstrap, or provider-native tooling |
| `autobyteus-server-ts/src/standalone-application-host/` | Folder | Standalone product host | Config, selection, root/bootstrap/fixed ingress, process entry | New host-specific capability | Worker/orchestration implementations |
| `autobyteus-server-ts/src/compositions/` | Folder | Server assembly | `buildStudioServer` and `buildStandaloneApplicationServer` | Only place choosing a full product surface | Runtime business logic or returned `*Composition` types |
| `autobyteus-server-ts/tests/architecture/` | Folder | Development-time architecture verification | Closed executable dependency checks for the application framework | Keeps policy tests distinct from production code and behavioral integration tests | Runtime code, service container, generic repository layer rules, or generated fixtures |
| `autobyteus-server-ts/src/api/rest/` | Folder | REST transport | Shared handler set, Studio launch view/selection-preview/PUT/DELETE, and Studio mount | Existing transport convention | Definition traversal, launch precedence, standalone root/static policy |
| `autobyteus-web/components/applications/setup/` + `useRuntimeScopedModelSelection.ts` | Folder/files | Studio launch editor | Consume selected baseline/preview, edit sparse fields, represent mixed-runtime inheritance | Host presentation over `ApplicationLaunchConfigurationService` | Definition parsing, precedence, fallback, derived baseline persistence |
| `autobyteus-server-ts/src/api/websocket/` | Folder | WS transport | Studio application sockets and unrelated Studio sockets | Existing transport convention | Standalone fixed route policy |
| `autobyteus-application-devkit/src/{commands,development,studio}/` | Folders | Application project CLI | Pack/validate/start facades, two real development sessions, narrow Studio API adapter | Existing devkit ownership with lifecycle depth visible | Server/application-runtime internals or mock fallback |
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
| `agent-tools/mcp/` | Runtime transport + process/scoped session manager + route adapter | Yes | Medium bounded | Keep process runtime versus explicit session-scope files clear; external gateway stays separate |
| Existing `api/rest` and `api/websocket` | Transport | Yes after split | Medium | Remove application registration from general indices |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Bootstrap | `startApplication -> provider.acquire -> ApplicationRuntimeBootstrap -> createApplicationClient` | `if (isStudio) ... else ...` inside every app | Host difference stays in SDK infrastructure |
| Server assembly | `buildStandaloneApplicationServer(config)` registers selected-app adapters plus the capability-scoped internal Agent Tools callback over shared services | Start full `buildApp()` on a public port and hide Studio UI | Public/API scope is structural, not cosmetic |
| Identity | Config accepts `{packageRoot, localApplicationId}` then derives canonical ID once | Accept path, local ID, canonical ID, and manifest root flag | Avoid overlapping selectors |
| Gateway | Both route mounts call `ApplicationBackendApiGatewayService` | Standalone route imports worker/backend module | Preserves one backend lifecycle |
| Provider selection | Valid iframe hints select Studio; top-level selects standalone; malformed iframe context fails | Try iframe, catch, then silently fetch standalone | Prevents incorrect fallback and hard-to-debug mixed host state |
| Native commands | `dev` = real standalone development; `dev:studio` = real Studio development; `build`/`validate` own the package; `start` = production use of the existing package | `dev` silently mocks, or `start` rebuilds/watches | Developer and production evidence is unambiguous |
| Package use | Package once, record digest, mount the same read-only root in both hosts, write only under each host data root | Rebuild assets per host or write runtime state into the package | Makes build-once portability factual |
| Standalone endpoints | Server returns strict relative platform paths; provider resolves them from browser origin | Server returns `0.0.0.0`, reflected Host, or hard-coded localhost absolute URLs | Works through a browser-visible hostname while preserving one absolute runtime type |
| Selected-resource edit | Manifest baseline or `selection-preview(ref)` -> selected definition baseline -> sparse draft -> PUT revalidation -> effective profile | Editor uses post-overlay `effectiveConfiguration`, old resource baseline, or local definition traversal | Inheritance remains server-authoritative before first save and after field clearing |
| Portable config | Recursive schema-aware policy accepts exact token-count/pricing fields and rejects nested password/auth/token-value/endpoint paths | Broad `endsWith("token")` exception or app-name special case | Package portability is narrow, testable, and secret-safe |
| Readiness | Platform ready + application `RUNNABLE` are separate gates | `READY` with null profile or business-time model failure | Each state has one meaning |
| Prompt context | Application-runtime-scoped team service -> injected builder -> member prompt | Member handle calls global builder/catalog | Package instructions remain semantically authoritative |
| Internal Agent Tools callback | One process route family -> authenticated application session -> application-runtime publisher/member context -> journal/projection/handoff | Provider captures a global service, request resolves an application runtime by ID, catalog is duplicated/merged, or external `/mcp/gateway` is proxied | Preserves protocol while retaining exact dependency identity |
| Session authorization | Missing bearer 401; unknown/wrong/revoked 404; token hash only; redacted descriptor | Public tool list, request-selected application/run, raw token log, or persisted session | No existence leak or cross-run capability |

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

Server assembly shape:

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

const agentToolsMcpRuntime = createAgentToolsMcpRuntime({
  configuredMcpSourceResolver,
});
const applicationRuntime = buildApplicationPlatformRuntime({
  appConfig,
  catalogSource: createStandaloneCatalogSource(selection),
  processRuntimeDependencies,
  applicationSessionManagerFactory: agentToolsMcpRuntime,
});

const app = await buildStandaloneApplicationServer({
  config,
  applicationRuntime,
  selection,
  agentToolsRouteDependencies: agentToolsMcpRuntime.routeDependencies,
}); // internal route before static wildcard
await applicationRuntime.lifecycle.prepareBeforeListen(); // P4-P6A-P9; concrete session capabilities already wired
const listenAddress = await app.listen({ host: config.host, port: config.port });
seedInternalServerBaseUrlFromListenAddress({
  requestedHost: config.host,
  listenAddress,
}); // existing descriptor endpoint behavior
await applicationRuntime.lifecycle.recoverAfterListen();
return createStandaloneApplicationHostHandle({
  app,
  lifecycle: applicationRuntime.lifecycle,
  processResources: {
    agentToolsMcpRuntime,
    defaultAgentRunEventPipeline,
    secretVaultRuntime,
    prismaRuntime,
  },
});
```

`applicationRuntime` stays local to the server assembly root. Route registration receives only the MCP runtime's route dependencies; application-runtime construction receives only its scoped-session-manager factory. Provider execution receives only the authenticated session and its narrow publisher.

## Developer And Module Documentation Synchronization Plan

| Documentation | Required Target Vocabulary / Explanation | Behavior That Must Remain Explicit | Verification |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/applications.md` | Retain `ApplicationPlatformRuntime`/lifecycle explanation and add the exact AFB-001–AFB-005 allowed/forbidden dependency table plus correction guidance | Building the runtime starts no new run; current owner directions, application-scoped injection, and host-neutral application imports remain unchanged | Policy IDs/meanings match the executable architecture test; links resolve; no duplicate exception |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | Add a concise application-framework boundary summary and point to the canonical module table and test | The architecture index does not become a second policy owner | Link and policy-family name match DS-016; detailed rules remain only in the module page/test |
| `autobyteus-server-ts/docs/modules/application_engine.md` | Describe the engine service and `ApplicationRunShutdownCoordinator` by their concrete start/stop roles | Worker ownership, run timing, team-then-agent stop order, and passed Studio/standalone behavior are unchanged | Lifecycle sequence matches the design and mapped tests |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | Use `createApplicationOrchestrationServices`, `createApplicationRunServices`, named services, and the injected `MemberTeamContextBuilder` | Business launch remains the only new-run trigger; no service locator or global team-definition fallback | Examples use target factories/fields and exact injected service |
| `autobyteus-server-ts/docs/modules/application_sessions.md` and `application_backend_api_gateway.md` | Distinguish `AgentToolsMcpRuntime`, `ScopedAgentToolMcpSessionManager`, session execution capabilities, and `PublishedArtifactPublisher` | `/mcp/agent-tools/:sessionId` remains capability-scoped; `/mcp/gateway` remains a separate Studio external-client surface; native provider tools remain untouched | Route/session diagrams contain the exact two route meanings and no “authority/graph/port” code labels |
| `autobyteus-web/docs/applications.md` | Describe Studio as a consumer of `ApplicationLaunchConfigurationService` and one shared application runtime | Package defaults, sparse overrides, reset, iframe lifecycle, and run readiness stay unchanged | UI flow names the service and never claims definition traversal in the browser |
| `docs/custom-application-development.md` | Explain build once/use in Studio or standalone, the two server builders, package-owned launch defaults, and business-triggered execution | `pnpm dev`, `dev:studio`, `build`, `validate`, and `start` keep their passed meanings; a built package does not start an agent merely by loading | Command and architecture examples use only target code names |
| `autobyteus-application-devkit/README.md` | Keep the developer workflow concrete; refer to `startStandaloneApplicationHost` and the standalone server rather than an abstract composition/graph | Devkit owns project build/validation/watch; server package owns runtime construction/listen/close | Repository search plus command examples show no old framework symbol |

Historical ticket reports and the exact current-to-target map may retain old names to explain the clean rename. Current module/developer docs, source comments, diagrams, examples, exports, and test descriptions must use only the target vocabulary.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `startHostedApplication` as alias | Avoid sample/external source edits | Rejected | Replace all in-tree callers/exports and publish the new SDK contract cleanly |
| Auto-fallback from standalone to mock or public `dev:contract` product mode | Preserve current dev convenience | Rejected | Real `dev`/`dev:studio`; move any useful contract host under test fixtures only |
| Add `hostMode` or `rootApplication` to manifest v4 | Let package choose host | Rejected | Host/deployment config selects server/application |
| Accept both old/new bootstrap shapes in business callback | Ease transition | Rejected | Providers normalize before callback; callback receives only the current unversioned runtime type |
| Run current full server and merely omit Studio frontend | Fastest standalone launch | Rejected | Explicit standalone server builder and route inventory |
| Copy app gateway/engine into standalone host | Avoid refactoring server | Rejected | Shared gateway/engine instances with fixed-app transport adapters |
| Persist configured standalone package through normal Studio package settings | Reuse import UI storage | Rejected | Ephemeral configured catalog/selection owned by the standalone server |
| Transform existing application databases | New host introduced | N/A | Direct use with separate host data root; no schema change |
| Add mandatory standalone setup UI or seed/copy Studio configuration | Current package is incomplete | Rejected | Complete package defaults plus optional host override |
| Keep `READY` as resource-only state and add another runnable boolean | Minimize contract edits | Rejected | One closed run-readiness union and complete effective profile |
| Treat invalid saved host override as `INVALID_PACKAGE` or silently use package defaults | Avoid a partial per-slot result | Rejected | `HOST_REQUIREMENT_MISSING` + `HOST_OVERRIDE` issue, preserved row/baseline, null affected effective config, explicit Replace/Reset |
| Let Brief request model/hard-coded resource rescue missing baseline | Preserve current API | Rejected | Backend consumes `requireRunnable` result only |
| Merge package definitions into global catalog for prompts | Avoid injection | Rejected | Inject exact application-runtime-scoped builder through mixed construction |
| Restore the broad SR-007 Agent Tools runtime/tool redesign | Superseded claim that all package tools belonged in MCP | Rejected | Keep native/configured-MCP/external-gateway boundaries; add only the CRR-020 process runtime, scoped session manager, and session-bound publisher |
| Inject application-runtime publication service directly into one catalog/provider while route/session keep independent defaults | Appears locally small | Rejected | One process MCP runtime family plus an authenticated session publisher; no mixed dependency levels |
| Replace process-global publication singleton at startup | Avoid session shape change | Rejected | Carry one concrete application publisher in each scoped session; construct it from the exact active-run registry before session creation |
| Resolve publication service from package/application/run ID during each request | Avoid construction cycle | Rejected | Session carries the exact publisher established at issue; request cannot discover an application runtime |
| Merge a application-runtime-specific publish provider into a second catalog | Avoid changing default provider | Rejected | One process catalog/provider; provider dispatches through session execution capability |
| Reuse or proxy external `/mcp/gateway` for Agent Tools sessions | Avoid a second route name | Rejected | Keep required session callback and optional external gateway as distinct owners/surfaces |
| Add alternate/legacy Agent Tools route or fall through to generic 404/static | Preserve unknown callers | Rejected | Existing exact route/registrar in both servers; no alias |
| Persist Agent Tools tokens/sessions for restart | Simplify recovery | Rejected | Ephemeral capability state; recovered work creates fresh runtime sessions |

## Derived Layering (If Useful)

1. **Application source layer:** host-neutral frontend/backend business code.
2. **SDK contract/startup layer:** runtime bootstrap, providers, client/context APIs.
3. **Host transport layer:** Studio iframe and standalone HTTP/root adapters plus the shared internal Agent Tools MCP callback adapter.
4. **Application-platform control layer:** lifecycle, gateway, engine, orchestration.
5. **Runtime/provider/persistence layer:** current runtimes, stores, migrations, tools, artifacts.
6. **Server assembly layer:** Studio or standalone selects and wires the above.

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
3. Historical implemented baseline: availability registry plus bind-once engine handler. SR-013 Sequence 10 supersedes the handler with controller/launcher and two closed queue/consumer pairs while preserving ensure-before-artifact-invoke.
4. Preserve the refreshed-base process prerequisite chain in explicit `buildStudioServer` code: `AppConfig/database location -> core migration -> protected DB/root-key/sidecar path registration -> Prisma -> secret vault`; move provisioned Search registration into the strict seventh tool group.
5. Add `ApplicationPlatformLifecycle` with P4–P9 and R1–R3 named collaborators; split required startup work from Studio-only B1–B3 tasks.
6. Apply every `Modify` row and add the specified `stop`/`dispose` APIs; route registrars receive exact fields and no production application-runtime accessor fallback remains.
7. Build `compositions/build-studio-server.ts`, update the normal server entry, and verify current Studio route surface plus explicit readiness/failure/stop behavior, including event-pipeline/vault/Prisma cleanup, before adding standalone.

### Sequence 4 — Add standalone application selection and host

1. Add strict config `{packageRoot, localApplicationId, appDataDir, host, port, publicBaseUrl?}` with loopback default and explicit non-loopback trusted-network mode. Add the bounded config materializer that creates only a missing empty/non-secret data-root `.env`, never overwrites it, and supplies current `AppConfig` runtime values explicitly.
2. Add a configured catalog provider that delegates to current package/bundle parsers, assigns package ID `standalone`, filters to exactly the configured local application, and produces an immutable selection.
3. Treat the selected package root as read-only and direct every mutable path to the configured data root.
4. Add standalone root/static route behavior with decoded/real-path containment, reserved-prefix exclusion, exact asset serving, and eligible-document SPA fallback.
5. Add lifecycle health and bootstrap service; bootstrap awaits platform readiness/application engine readiness and returns the strict relative-path standalone wire payload.
6. Scope state inventory, binding recovery, availability, pending event resume, and worker recovery to `known IDs ∩ {selected ID}`.
7. Add selected-app REST/notification/custom-WebSocket/agent-communication mounts over existing services and reserve `/_autobyteus/*` before static fallback. Omit broad Studio CORS and enforce equality between browser WebSocket `Origin` host/port and request `Host` host/port.
8. Add `compositions/build-standalone-application-server.ts`, the programmatic `startStandaloneApplicationHost` `{url,close}` boundary, and a thin signal-owning process entry. Reuse the exact core-migration/protected-path/Prisma/vault prerequisite chain and process-resource close order proven in Studio.
9. Assert the route inventory contains no unrelated Studio/platform APIs. The later DS-014 correction adds only the internal Agent Tools callback and explicitly keeps external `/mcp/gateway` absent.

### Sequence 5 — Developer workflow and conformance seam

1. Add the exact Brief/Socratic `autobyteus-app.config.mjs` mappings and source-icon/package-import changes, switch all three project types to the exact native scripts, and delete the two sample custom builders plus source-root generated mirrors.
2. Make `autobyteus-app dev` load the project config, resolve/watch the named inputs, and default to the real standalone development session over `.autobyteus/dev/package` and `.autobyteus/dev/data`; coalesce changes, close the current host, atomically repack/validate, restart the real host, and full-reload the browser.
3. Make `autobyteus-app dev --host studio` load the same mapping, pack/watch `dist/importable-package`, use the existing Studio local-package import/reload API at the configured Studio server, and preserve Studio's explicit Reload application action as the iframe remount owner.
4. Add `autobyteus-app start`; resolve the current built output and source-manifest local ID, validate without packing, invoke `startStandaloneApplicationHost` once, and forward signals/exit status. Remove public mock fallback/contract command; keep any useful host fixture only in tests.
5. Add a closed host-mode test command interface for later API/E2E ownership.
6. Package Brief Studio once, record whole-package and frontend/backend entry digests, and give that unchanged read-only output to both real host scenarios.
7. Recompute digests after both scenarios and fail if either host mutated the package.
8. Validate the exact maintained-project configs first, including icon/team/migration/exposure output and ignored generated roots, then validate the real team/migration/event/notification/artifact journey, latest-base operational DB/vault/Search prerequisites, stale non-selected recovery filtering, root/assets/navigation, route/origin surface, and process cleanup.

### Sequence 6 — Package defaults, selected-resource editing, and prompt dependency correction

1. Retain source-only `standalone.enabled`, complete Brief/Socratic defaults, and the pure application-runtime-scoped validator through pack/validate/dev/start.
2. Add `ApplicationPortableLaunchConfigPolicy`; route every runtime-specific package `llmConfig` through its recursive schema-aware validation. Preserve exact token-count/pricing fields and reject the CR-009 nested password/authorization/access-token/endpoint cases with config paths.
3. Clean-cut rename `ApplicationLaunchPackageBaselineBuilder` to `ApplicationLaunchResourceBaselineBuilder`; make its definition-only provenance distinguish manifest-package from alternate-selected resource sources.
4. Extend the shared contract with `selectedResourceBaseline` and `ApplicationLaunchSelectionPreview`; keep manifest package baseline, selected baseline, sparse saved override, and post-overlay effective configuration as distinct shapes/stages.
5. Add `previewSelectedResourceBaseline` and the narrow Studio selection-preview route. It resolves the exact unsaved ref without persistence, overlay, host validation, readiness change, or package fallback.
6. Update stored-view evaluation: no row uses package=selected baseline; valid alternate row exposes its baseline before overlay; deleted selection has null selected/effective; stale topology exposes current selected baseline for explicit replacement but keeps the saved row invalid and non-runnable.
7. Update Studio setup/editor components to request/discard identity-bound previews, disable save while pending/invalid, use only selected baseline for inherited values, persist sparse fields, and reload after definition refresh/save/reset. Remove the `packageBaseline`/`effectiveConfiguration` inheritance heuristic.
8. Implement mixed-runtime editing: blank team fields mean per-member inheritance; common inherited runtime may drive team model catalog; mixed inherited runtimes disable team-wide model selection until an explicit common runtime is selected.
9. Keep PUT as final concurrency validation. If definition identity/topology changes after preview, reject and reload; do not persist preview or derived baselines.
10. Preserve runtime/model/credential capability adapters, three readiness statuses, standalone pre-listen gate, invalid-row preservation, explicit Replace/Reset, and guarded backend consumption.
11. Preserve exact application-runtime-scoped `MemberTeamContextBuilder` propagation through all mixed root/subteam/persistent/task/recovered member paths.
12. Add durable coverage for recursive portable policy, unsaved alternate preview, saved alternate field clearing, mixed-runtime team editing, preview/PUT catalog race, deleted selection, stale topology, effective provenance, and prompt semantics. Replace the obsolete no-context auto-repair test.
13. Rerun fresh-root standalone and Studio package-default/alternate-override/edit/reset real journeys, then API/E2E prompt/provider/events/artifacts and cleanup evidence.

### Sequence 7 — Bind application Agent Tools sessions to the application-runtime publisher

1. Preserve the route path, descriptor, token security, endpoint seeding, eligible tool projection, configured-MCP resolver, recipient-name messaging, and external-gateway boundary.
2. Retain `PublishedArtifactPublisher`; SR-013 constructs its concrete application implementation from `ActiveAgentRunRegistry` before the later scoped session issuer.
3. Add `AgentToolsMcpRuntime` over the existing registry/catalog/executor/dispatcher and require exact route dependencies. Remove default runtime discovery from the two server assembly paths.
4. Retain `ScopedAgentToolMcpSessionManager`; attach the concrete application publisher to each issued session and inject the manager into application Codex/Claude construction.
5. SR-013 order is application session scope -> queue-backed relay/resource manager -> active-run registry -> publication service -> scoped session issuer -> run managers. P6A asserts concrete capabilities; cached/global provider capture remains forbidden.
6. Carry the exact scoped session revoker through `AgentRunManager` and mixed new/restored member cleanup. Stop blocks issue, revokes scope sessions, stops runs, releases the concrete publisher with the private runtime, and later closes the process MCP runtime.
7. Register both hosts’ existing internal route with `agentToolsMcpRuntime.routeDependencies`; standalone remains before static fallback and lacks external `/mcp/gateway`.
8. Add deliberately distinct general-process-versus-application-runtime publication proof, missing/wrong-scope/revoked-session negatives, and maintained adapter inventory checks. Then rerun real standalone and Studio Brief publication/message/handoff/journal/projection.
9. Preserve `APIE2E-REPO-005` separately as Unclear.

### Sequence 8 — Documentation and removals

1. Update application development, SDK, server application-engine/storage/orchestration, Agent Tools transport, and Studio application docs.
2. Document standalone config, browser and internal runtime route surfaces, capability auth, data root, readiness, and shutdown behavior; distinguish external MCP gateway.
3. Remove obsolete startup/dev files and the Agent Tools global/default bypasses listed above; do not expand into provider-native tools or the external gateway.
4. Confirm no compatibility aliases, route aliases, hidden mock fallback, external gateway exposure, or out-of-scope source change is introduced.

### Sequence 9 — Clean-cut framework vocabulary correction

1. Historical SR-011 step: rename the callable contracts and bind-once implementations. SR-013 preserves the callable `PublishedArtifactPublisher` contract but removes both proxy implementations in Sequence 10.
2. Rename the scoped session implementation/interface/factory, process MCP runtime, general run supervisor, and application shutdown coordinator. Preserve the exact instances, construction order, session registry, close order, and token behavior.
3. Rename the application orchestration/run builder functions from `*Authorities` to `*Services`, then rename `ApplicationPlatformRuntimeGraph`/factory/files to `ApplicationPlatformRuntime`/`buildApplicationPlatformRuntime`. Replace code fields and locals such as `graph`, `applicationGraph`, `authorities`, and `runAuthorities` with their mapped role names.
4. Rename the Studio and standalone returned server types/builders/files last, then update the private root export and all repository consumers. Keep the `compositions/` folder only as the explicit assembly-activity boundary.
5. Rename the four mapped test files and update test descriptions/fixtures without duplicating tests. Add structural assertions that building the application runtime creates no agent/team run, while an application business request and legitimate recovery still create/restore runs through the existing managers.
6. Update the vocabulary and module-boundary narrative in `autobyteus-server-ts/docs/modules/application_backend_api_gateway.md`, `application_engine.md`, `application_orchestration.md`, `application_sessions.md`, and `applications.md`; update `autobyteus-web/docs/applications.md`, `docs/custom-application-development.md`, and `autobyteus-application-devkit/README.md`.
7. Those docs must state: one application runtime is built per host process; Studio shares it across installed applications while standalone selects one application; the runtime prepares managers/services but starts no run; business demand or recorded-run recovery creates execution; `AgentToolsMcpRuntime` is process-wide; `ScopedAgentToolMcpSessionManager` is per explicit scope; and `/mcp/gateway` remains distinct from `/mcp/agent-tools/:sessionId`.
8. Run a source/docs/test-name search for every retired symbol and filename. Only the ticket's historical current-to-target map and revision history may mention old names. Run TypeScript/import checks, mapped unit/integration tests, and focused dual-host behavior checks; escalate to broader API/E2E only if source review identifies a semantic change.

### Sequence 10 — Narrow boundaries and remove construction cycles

1. Add characterization coverage for current runtime consumers, package refresh/rollback, zero-run-on-build, event retry, artifact publication, worker-exit-before-publication, inactive discovery/replacement, explicit terminate, stop-all, recovery/remount, and shutdown.
2. Add `ApplicationPlatformRestContracts`, `ApplicationPlatformRealtimeContracts`, and `ApplicationPlatformHostManagementContracts`; migrate registrars/host assembly to exact projections; then remove the 19-field outward shape.
3. Split early package registry state/query from late package commands. Construct `ApplicationCatalogRefreshCoordinator` only after bundle, runtime catalog reconciliation, and definition services exist; remove every late-assigned Studio callback and package-path default.
4. Create `ApplicationEngineController`, `ApplicationExecutionEventDispatchQueue`, and `ApplicationPublishedArtifactDeliveryQueue` as early stable owners. Create the application MCP session scope and queue-backed artifact relay, then `AgentRunResourceManager` and identity-checked `ActiveAgentRunRegistry`. Construct the concrete publisher from that registry before the later scoped session issuer and run managers; remove `BindOncePublishedArtifactPublisher` without a reverse callback.
5. Split `ApplicationEngineLauncher` from the controller. After orchestration/streaming exist, construct `ApplicationPublishedArtifactDeliveryService` and the journal event dispatcher. Both call launcher ensure before controller invoke; only the event dispatcher owns journal acknowledge/retry. Remove `BindOnceApplicationEngineEventHandler` and `ApplicationEngineHostService`.
6. Move every active-run transition to the exact registry/resource contract: inactive discovery, inactive replacement, accepted explicit termination, stop-all, registration rollback, and stale duplicate removal. Delete map/resource ownership before cleanup, attempt session revocation plus all three observer detaches exactly once, and surface aggregate errors without deleting a newer replacement.
7. Rebuild lifecycle stop from private participants: block session/event/artifact intake, terminate/remove runs, drain accepted artifact commands while launcher/controller remain live, close the application session scope, then stop engines and later process resources. Freeze only the four runtime projections. Remove application-path optional/global branches; keep supported general-process defaults only in named assembly factories.
8. Delete superseded files/tests/imports in the same change, run retired-symbol/no-alias/no-whole-runtime/no-reverse-callback scans, then complete source review and the full API-REV-011 dual-host characterization loop plus SV-C52–SV-C57.

### Sequence 11 — Make approved dependency directions executable

1. Add direct server test dev dependency `@vue/compiler-sfc` `^3.5.28` and update `pnpm-lock.yaml`; do not add a production/runtime dependency or rely on Nuxt's transitive compiler.
2. Add the architecture test with TypeScript plus Vue SFC extractors, the seven exact project/config/manifest profiles, normalized resolution/unresolved policy, closed AFB-001–AFB-005 table, and AFB-004 constructor/factory obligation table inside the test file. Do not add a production helper.
3. Add disposable synthetic fixtures that use the same current-tree machinery: TS/JS/Vue allowed/rejected imports; project-local manifest/builtin/unresolved cases; complete AFB-004 examples; and table-driven omission negatives for every required injection path.
4. Run the same rules over the complete governed tree, including all eleven Vue SFCs and every valid devkit template. Correct the test if it reports outside the closed policy; do not edit production source or add a broad exception merely to make the test pass.
5. Update `docs/modules/applications.md` with the exact policy, obligation-family, project/manifest, and remediation tables, then add the short pointer in `docs/ARCHITECTURE.md`. Assert policy IDs and links remain aligned.
6. Run dependency installation/focused architecture test without generated `.nuxt`, the affected server test matrix, TypeScript checks, and the full API-REV-012 dual-host characterization baseline. Verify exact `73/73` package parity and inspect the change set for zero production-source/runtime-dependency/schema/package-output/generated-output changes.

### Sequence 12 — Resolve the v1.4.50 semantic merge

1. Keep delivery's paused merge and protected checkpoint; resolve no production conflict until corrected SR-018 passes architecture review.
2. Combine Studio process-resource initialization with the base-owned readable-provider terminal gate before `buildStudioServer`; align startup tests with builder/lifecycle and unwind boundaries.
3. Combine the exact application publisher dependencies with post-projection awaited `run.publishEvent`; add pre-commit deletion and post-commit preservation proofs.
4. Combine sparse inherited editor behavior with effective-selector unavailable retention/warning/blocking; align explicit and inherited fixtures.
5. Move application and general-process Codex session-manager arguments to current position 5; update AFB-004/current-tree/omission fixtures and documentation; retain application definition service position 2.
6. Move `brief-package-team-prompt.integration.test.ts` through the current `CodexThreadBootstrapper.bootstrapForCreate -> composeCarpenterPrompt` path and `agent-tools-mcp-runtime.test.ts` to `buildRuntimeAgentToolExposure` / `runtimeExposure`; assert no checkpoint durable test retains either deleted seam.
7. Run focused common-overlap tests, full build/review/API-E2E/Electron verification, then return to delivery for integrated-state finalization. Do not add compatibility or select a complete conflict side.

## Key Tradeoffs

- **Keep manifest v4 versus design vNext now:** Keeping v4 minimizes variables and proves the host boundary first. It does not solve immutable release/version metadata, which remains a later program.
- **Provider auto-selection versus injected host configuration:** Auto-selection inside the SDK is required for identical built UI files. Strict unambiguous rules prevent it from becoming application-level environment branching.
- **Stable standalone package ID `standalone` versus path-derived package ID:** A fixed host-owned package ID preserves standalone data when the downloaded package directory moves. The isolated standalone data root and required local ID prevent collision.
- **Relative standalone provider wire versus absolute server-generated URLs:** A strict relative-path wire lets the browser provider derive the actually visible origin and WebSocket scheme. Keeping absolute URLs only in `ApplicationRuntimeBootstrap` avoids an ambiguous shared DTO and avoids bind-address/Host-header mistakes.
- **Explicit route adapters versus one mode-heavy generic registrar:** Separate Studio/standalone registrars make public cardinality and paths obvious. Shared handler functions avoid duplicated request parsing/gateway delegation.
- **Partial dependency-injection refactor versus repository-wide rewrite:** Server/runtime-construction-critical services and touched adapters become explicit now. Unrelated internal singleton cleanup is deferred to keep the dual-host slice deliverable.
- **Standalone inside server package versus immediate physical extraction:** The standalone server path is proven in `autobyteus-server-ts` first. A later thin published host package/binary may depend on the proven server boundary without copying it.
- **Native `autobyteus-app start` facade versus a second application project:** The devkit owns project-relative config/validation and delegates to the existing server project's public standalone API. This preserves `pnpm start` without making every application contain a server implementation.
- **Materialize missing non-secret host config versus require manual `.env`:** Creating only a missing empty `.env` in the mutable data root preserves current `AppConfig` while delivering zero-setup loopback start. Existing files are never overwritten and credentials are never written.
- **Retain exact process globals versus refactor all platform configuration:** Latest-base Prisma, vault, protected-path, and runtime registries remain process-scoped under a one-server-per-process rule. Their initialization/stop is explicit; application runtime globals are still removed.
- **Package default versus mandatory standalone setup:** Package defaults make the artifact runnable and Studio overrides optional. This trades machine-independent selection for an honest host-requirement check; credentials/endpoints remain outside the package.
- **One launch service versus standalone-specific config:** Extending/refactoring the current configuration owner preserves one policy across hosts. It is more contract work than a local standalone patch but prevents duplicated selection/readiness semantics.
- **Source-only standalone declaration versus manifest v4 field:** Devkit metadata lets build tooling enforce the promise without altering runtime manifest v4. Standalone start still validates the selected package even when invoked outside a project.
- **Three statuses versus a fourth invalid-override status:** Keep the approved product-level outcomes small. `HOST_REQUIREMENT_MISSING` covers all host-local blockers, while closed issue scope and per-slot override state preserve exact diagnosis. This avoids both status proliferation and the false claim that an invalid saved override corrupts package bytes.
- **Computed selected baseline versus persisted snapshot:** Recompute from the current definition set on read/preview/PUT. This keeps definitions authoritative and avoids migration/stale duplication; identity-bound preview plus PUT revalidation handles catalog races.
- **No-write preview versus UI definition traversal:** One narrow server preview adds an API round trip but preserves one traversal/precedence owner and supports sparse editing correctly. The UI never imports server definition semantics.
- **Schema-aware portability versus broad secret keywords:** Closed runtime schemas safely retain legitimate token/pricing tuning while recursive semantic rejection blocks credentials/endpoints at any depth without app-specific exceptions.
- **Explicit process MCP runtime versus independent defaults:** one small process owner makes registry/catalog/dispatcher identity observable to both route and application sessions. It adds construction wiring but prevents mismatched dependency families without introducing a general container.
- **Concrete session-bound publisher versus request-time runtime lookup:** carrying the exact publisher on the authenticated session avoids package/run-ID routing and mutable global state. The active-run registry makes that publisher constructible before sessions, eliminating the proxy.
- **One shared catalog versus application-runtime-specific catalog:** one process catalog preserves existing tool projection and route behavior; application-runtime-sensitive execution is selected by session manager rather than provider duplication or catalog merge.
- **Internal session callback versus external MCP gateway reuse:** Separate paths/owners avoid granting standalone a broad generic integration surface. The cost is two clearly named MCP transport concepts in Studio; documentation and route tests keep them distinct.
- **Runtime internals versus Agent Tools projection:** Runtime internals are not part of the designed or validated path. Eligible publication/message and selected available MCP-origin tools remain reachable through the existing session route.
- **Four outward projections versus one service collection:** Exact lifecycle/REST/realtime/host-management views add several small contract types but prevent every route/host caller from depending on private stores and runtime mechanics.
- **Late catalog coordinator versus callbacks into future services:** One explicit coordinator adds a real sequencing owner and permits acyclic construction. The alternative hides temporal coupling in non-null variables and makes rollback/refresh order harder to prove.
- **Run identity/resource split versus publication depending on the full run manager:** An early identity registry plus resource manager slightly decomposes run management, but it lets publication and sessions be constructed in natural order while keeping create/restore/terminate commands with `AgentRunManager`. Exact identity removal prevents stale completion from deleting a replacement and centralizes session/observer cleanup without a reverse callback.
- **Controller/launcher plus two closed delivery paths versus a permanent callback proxy:** The split creates two engine roles, one journal-wakeup queue/dispatcher, and one complete artifact-command queue/delivery service. That is more source files than one host service, but each has one protocol-specific lifecycle; both delivery paths preserve ensure/restart before controller invocation without a generic deferred handler.
- **One bounded architecture test versus another runtime refactor or generic layering tool:** A parser/resolver-backed test adds durable enforcement without changing the working object graph or introducing a repository-wide layer framework. Its closed policy requires explicit maintenance when an approved owner direction changes, which is intentional: architecture changes should be reviewed rather than silently absorbed by a broad allow-list.

## Risks

1. **Hidden singleton coupling:** A service constructed for standalone may still reach a default global bundle/gateway instance. Mitigation: the Modify inventory removes application-runtime-path fallbacks; server-construction tests use distinct catalog/data-root sentinels and fail if another app or lookup record becomes visible.
2. **Startup readiness race:** Tools/definitions/recovery may still be background work. Mitigation: P4–P9 and R1–R3 are named/awaited; only B1–B3 and stated Studio peripherals are best-effort.
3. **Route collision/static fallback:** SPA fallback could swallow platform/API errors. Mitigation: reserve `/_autobyteus/` first and limit fallback to eligible document requests.
4. **Absolute asset URLs:** Apps built for `/` may fail in Studio nested asset paths. Mitigation: devkit guidance and dual-host asset/navigation conformance; prefer relative asset base.
5. **Checked-in vendor divergence:** Sample UI vendor copies can become stale. Mitigation: regenerate through build scripts and compare outputs rather than hand edits.
6. **Standalone distribution weight:** The initial standalone server may still initialize broad underlying runtime dependencies even though it exposes a small surface. Mitigation: accept for proof, measure, then modularize initialization/package distribution without changing app contracts.
7. **Resource availability:** Current manifest v4 does not declare every tool/skill/runtime dependency. Mitigation: use the representative bundled team/current environment for the proof; define dependency packaging only after portability is demonstrated.
8. **Canonical identity mismatch between hosts:** Studio and standalone use different canonical IDs/data roots. This is intentional; conformance compares behavior and package contents, not shared live identity/data.
9. **Stale state from a previous standalone selection:** Reusing a data root after changing local application ID can leave valid dormant records. Mitigation: recovery and availability use only the selected-ID intersection; preserve other data without recovery or deletion.
10. **No-auth network exposure:** A permissive bind/CORS/WS configuration would exceed the local trusted scope. Mitigation: loopback default, explicit trusted-network non-loopback mode, no broad Studio CORS, same-origin WebSocket validation, and no public-internet security claim.
11. **Latest-base process-resource drift:** Omitting operational Prisma, secret vault, protected DB/key paths, Search registration, or their cleanup would make the standalone path differ from current Studio/runtime behavior. Mitigation: P2A/P2B/P6, exact process-dependency rows, and stop-order coverage are mandatory in both servers.
12. **Development restart leakage:** Watch changes can race or leave a worker/socket/vault/Prisma instance alive. Mitigation: coalesce changes, close the current host handle completely, atomically rebuild, then start; assert no listener/child/process resource remains between generations.
13. **Studio development expectation:** Repacking/reloading the local package does not itself replace the route-visit iframe. Mitigation: `dev:studio` reports package reload completion and preserves the existing explicit Studio `Reload application` action as DS-009's remount owner.
14. **Default portability versus host availability:** A correct package can declare a runtime/model missing on a machine. Mitigation: exact host capability adapters yield `HOST_REQUIREMENT_MISSING` before listen/entry; never silently select another model.
15. **Override/package tuning mismatch:** A model/runtime override could inherit incompatible `llmConfig`. Mitigation: atomic provenance rule clears or revalidates tuning when the pair changes.
16. **False readiness regression:** Multiple UI/lifecycle/SDK checks could drift. Mitigation: all call the same launch service; no `READY` status or nullable required profile remains.
17. **Prompt service regression:** New/restored/task member handles might omit builder injection. Mitigation: require builder in handle constructors and cover all registry/factory paths with distinct-catalog prompt tests.
18. **Invalid override fallback or loss:** A deleted shared resource or changed member topology could cause the resolver to use package defaults silently or auto-delete user state. Mitigation: preserve the row and baseline separately, emit `HOST_OVERRIDE` issue, set the affected effective configuration null, block `requireRunnable`, and require explicit Replace/Reset.
19. **Editor self-inheritance:** Clearing a saved alternate field could preserve its old value if Studio uses the effective result as baseline. Mitigation: expose selected-resource baseline explicitly, delete the web heuristic, and test first-save plus field-clear paths.
20. **Preview/catalog race:** A selected resource may change or disappear after preview. Mitigation: bind results to exact app/slot/ref, discard stale responses, and make PUT re-resolve identity/topology before write.
21. **Mixed-runtime bulk edit ambiguity:** A team-wide model control could incorrectly assume one runtime. Mitigation: represent mixed inheritance explicitly and require an explicit common runtime before team-wide model selection.
22. **Recursive secret-policy over/under-match:** A broad token heuristic can reject tuning or admit credentials. Mitigation: closed typed token-count/pricing schemas plus recursive negative cases for password, authorization, access-token value, endpoint, and workspace fields.
23. **False gateway-tool expectation:** Package `toolNames` could be mistaken for descriptor `enabled_tools`, causing unrelated runtime tooling to enter scope. Mitigation: assert actual descriptor/`tools/list`, eligible adapter providers, and `ToolOrigin.MCP` resolution; do not add runtime-internal source or test work.
24. **Registrar bypass:** A local reimplementation could skip the existing capability/session gates. Mitigation: reuse the route implementation with the required `AgentToolsMcpRuntime` route dependencies and assert its established 401/404 behavior.
25. **Internal/external MCP conflation:** Reusing `/mcp/gateway` could expand standalone's public surface. Mitigation: separate files/registrars/owners, exact route inventory, and negative external-route conformance.
26. **Descriptor/route mismatch:** Standalone can issue a valid descriptor while omitting its route. Mitigation: the standalone server test exercises the advertised path and reaches the existing authorization gate before any API/E2E business run.
27. **Wrong runtime instance survives behind a default:** a new scoped service could be built while provider/route/cleanup still resolve defaults. Mitigation: exact server-assembly identity tests, required constructor dependencies, and deliberately distinct process/application-runtime sentinels.
28. **Acyclic-construction regression:** a hidden default or new deferred binder could recreate the removed cycle. Mitigation: exact registry/controller identities, retired-symbol scans, constructor-required dependencies, and no application-path global/default access.
29. **Session leakage across application-runtime stop/restart:** a descriptor could outlive its owning runtime. Mitigation: scope-owned session tracking, block issue first, revoke all scope sessions before publisher/runtime close, then close the MCP runtime; restart uses a new scope.
30. **Rename accidentally changes behavior:** constructor rewiring or an incomplete import rename could replace an already-passed dependency instance. Mitigation: perform the exact clean map in dependency order, compare construction/close call order, compile after each cluster, and rerun identity/lifecycle tests plus focused dual-host smoke coverage.
31. **Hidden consumer of a private root export:** repository search shows no consumer outside `autobyteus-server-ts`, but an undocumented local integrator could import it. Mitigation: treat the package's `private: true` boundary as authoritative, document the clean rename, and add no compatibility alias without evidence of a supported consumer.
32. **Over-broad corrective scope:** the superseded SR-007 native/configured-MCP/runtime redesign could re-enter implementation. Mitigation: the maintained adapter inventory limits CR-015 to publication plus common session manager; messaging is retained and other adapters require separate reachable evidence.
33. **Broad-suite unattributed failures:** `APIE2E-REPO-005` may conceal independent debt. Mitigation: preserve exact output for API/E2E reconciliation; do not claim it is fixed by DS-014 or use it to expand this design.
34. **Narrow-contract drift:** a registrar may regain the whole runtime or reconstruct a private service. Mitigation: compile-time exact registrar inputs, runtime-key assertion, import-boundary scan, and no outward store/recovery/run/engine fields.
35. **Package rollback divergence:** splitting commands from refresh could change cleanup order or mask the original error. Mitigation: command-level state snapshots, exact success/failure sequence tests, one best-effort post-rollback refresh, and unchanged GraphQL responses/diagnostics.
36. **Lazy engine/event regression:** splitting controller/launcher and adding a wakeup queue could change ensure, retry, crash, or remount timing. Mitigation: the journal remains authoritative; event ingress appends before enqueue; dispatcher retains current backoff/ack semantics; API-REV-011 restart/recovery/remount is a mandatory gate.
37. **Run cleanup/identity regression:** an active-run registry could detach file/artifact/memory/session cleanup from terminate, inactive discovery/replacement, stop-all, rollback, or stale duplicate removal. Mitigation: `removeIfCurrent` identity results plus `AgentRunResourceManager.release`; delete ownership before attempting all four cleanup categories, never callback into a later manager, and test exact-once cleanup with deliberately distinct general/application scopes.
38. **Artifact relay restart regression:** a controller-only relay could fail after a worker exits even though the current path restarts it. Mitigation: every accepted artifact command passes through `ApplicationPublishedArtifactDeliveryService -> ApplicationEngineLauncher.ensureReady -> ApplicationEngineController.invokeApplicationArtifactHandler`; lifecycle drains accepted commands before engine stop and SV-C52 proves the worker-exit witness.
39. **Architecture-check false confidence or false positive:** a substring scan could miss aliased/resolved imports, or an over-broad rule could block legitimate domain dependencies and invite suppression. Mitigation: parse and resolve imports against TypeScript configuration, govern only AFB-001–AFB-005 source families, prove positive and negative synthetic fixtures, report corrective direction, and require architecture review for policy/exception changes.
40. **Latest-base semantic loss:** whole-side conflict selection can drop either required provider migration/event/model behavior or the reviewed builders/durability/inheritance/scoped owners. Mitigation: implement DS-017 owner-by-owner and execute the exact focused/full matrix.
41. **Silent Codex session fallback after signature change:** obsolete extra argument 7 is ignored, activating the constructor default. Mitigation: move both callers and AFB to argument 5, retain application argument 2, and require current-tree/omission plus real scoped-session proof.

## Guidance For Implementation

- Begin with contract/frontend SDK changes and prove Studio still works before constructing the standalone host.
- Treat provider selection and lifecycle states as closed discriminated unions with strict validators.
- Never let a malformed iframe launch fall through to standalone bootstrap.
- Keep `ApplicationRuntimeBootstrap` minimal. Do not copy iframe correlation, host route state, deployment config, or unrelated platform capability lists into it.
- Keep `ApplicationRuntimeBootstrap` endpoint fields absolute. Validate standalone relative routes in `StandaloneApplicationBootstrapPayload`, then resolve them from `window.location.origin` inside the standalone provider. Never use Fastify's bind address or a reflected `Host` header as the browser endpoint origin.
- Reuse `createApplicationBackendMountTransport`; add only the endpoint flexibility required by fixed standalone mounts.
- Build standalone selection by delegating to current package/bundle validators. Do not write a second manifest parser.
- Resolve `applicationId` once in the standalone selection and pass the immutable descriptor to root/bootstrap/route registrars.
- Treat `packageRoot` as immutable input; verify pre/post conformance digests and keep databases, logs, caches, runtime state, and generated diagnostics under `appDataDir` or disposable harness output.
- In standalone recovery, filter every known-ID/global-lookup/binding/event input to the selected canonical ID. Do not recover, expose, migrate, or delete dormant records for another selection.
- Refactor route files so request parsing/error mapping is shared, while URL/cardinality remains explicit per host.
- Default standalone bind to loopback. Do not install Studio's broad CORS configuration; require the browser WebSocket `Origin` host/port to equal the request `Host` host/port and reject missing/mismatched origins. Trusted-proxy rewriting remains outside this first slice. This is a network boundary, not a user/account feature.
- Build `ApplicationPlatformRuntime` only in the two server assembly files and in the exact order specified. Pass exact service dependencies; the typed runtime result is never passed as a container.
- Freeze only `lifecycle`, `rest`, `realtime`, and `hostManagement`. Route registrars accept exact subject contracts; do not expose stores, recovery, run/session/publication, engine, dispatch, or shutdown owners to simplify one callsite.
- Build Studio package services without later-assigned variables: registry reader -> bundle -> definitions/runtime -> catalog refresh coordinator -> package commands. Keep rollback in the command owner and the bundle -> reconciliation -> agent -> team order in the coordinator.
- On the refreshed base, run the exact core-migration/protected-path/Prisma/vault prerequisite chain before application/tool/runtime readiness. Register provisioned Search only through the strict seven-group tool owner. Close event pipeline, vault, and Prisma after application consumers in both hosts.
- Implement P4–P9 plus P6A as named awaited collaborators. P6A asserts the concrete scoped-session capability family; there is no bind phase. Required tool/runtime/dependency failures fail both lifecycle states; only explicitly listed Studio extras remain degraded/background.
- Implement the exact stop order for dispatch intake/timers, communication, custom WS/notifications, run observers, engine launcher/controller, team then agent runs, scoped Agent Tools sessions, streaming, process MCP runtime, event pipeline, vault, and Prisma.
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
- Pass the exact application-runtime-scoped `MemberTeamContextBuilder` through every mixed member construction/recovery path and assert final prompt semantics.
- Do not include Codex/Claude runtime-internal tooling in the application-framework implementation or test scope; untouched upstream behavior remains in place by default.
- Construct one `AgentToolsMcpRuntime` per server and pass its exact route dependencies to the registrar and its scoped-session-manager factory to the application runtime. Never pass the whole runtime alongside its internals.
- Attach only `PublishedArtifactPublisher` to application sessions. Remove cached/default publication service use from the provider; do not resolve an application runtime from application/package/run identity.
- Create the application session scope, queue-backed artifact relay, run resource manager, and identity registry before the concrete publisher; create the scoped session issuer and run managers afterward. Remove both bind-once source files/tests and prove no deferred binding, reverse callback, or application fallback remains.
- Inject the later application-scoped session issuer into application Codex/Claude session creation; record every issued session in the early scope, and route every new/restored run/member cleanup through registry identity removal and the resource manager. Do not change provider-native tool behavior.
- Stop new issue/event/artifact intake, terminate and identity-remove runs, drain accepted artifact commands while launcher/controller remain live, close the application session scope, then stop workers and private runtime owners in the specified order. Tests must prove an old descriptor cannot dispatch after stop/restart.
- Construct `ApplicationEngineController` and both closed queues before run/publication services, then construct `ApplicationEngineLauncher`, the artifact delivery service, and event dispatcher after orchestration/streaming. Event ingress appends the journal before its application-ID wakeup; artifact relay enqueues the complete artifact command. Both consumers call launcher ensure before controller invoke; only the event dispatcher acknowledges/retries the journal.
- Keep internal `/mcp/agent-tools/:sessionId` and external `/mcp/gateway` separate. Standalone registers only the former and adds no alias/proxy.
- Implementation proves exact process-family identity, session-bound publisher dispatch, missing/wrong-scope/revoked-session negatives, the existing route's 401/404 gates, and external-gateway absence. API/E2E inspects descriptor/`tools/list` and proves application-runtime-scoped `publish_artifacts`, recipient-name `send_message_to`, handoff, journal, and application projection in standalone and Studio.
- Do not change application storage schemas or create a ticket-owned data migration. Run and gate every required base-owned migration, including readable-provider identity, before serving either host.
- Do not add package-vNext, marketplace, or identity/account concerns to this implementation.
- Preserve exact current Studio behavior through tests and use Brief Studio as the real cross-host proof.
- Apply the exact framework-name map as a clean internal rename. Do not retain old exports, wrappers, re-export aliases, duplicate files, or deprecated names.
- Preserve the execution timing invariant explicitly: building `ApplicationPlatformRuntime` prepares services and managers only; it may restore recorded work in the established recovery phase, but it never starts a new agent/team until application business code requests one.
- Keep the target vocabulary consistent in code, tests, diagrams, and affected developer/module documentation; use “composition” only for top-level assembly activity and “dependency graph” only for architecture relationships.
- Implement DS-016 only as the exact test, test-dev-dependency/lockfile, and two-doc change. Do not edit production source to satisfy the new check unless a real current violation is independently proven and rerouted as design impact.
- Resolve each governed importer with its DS-016 server/web/Brief/Socratic/template profile and owning manifest. Use `@vue/compiler-sfc` for SFC script blocks and TypeScript for TS/JS AST; cover static import/export, `ImportTypeNode`, and literal `require`/dynamic import. Fail unresolved governed local/alias paths; do not use broad text matching or scan `dist`/`.build`.
- Keep AFB-001–AFB-005, the exact catalog-reconciliation seam, the two named general-process assembly call sites, and every AFB-004 injection obligation closed. A new exception or obligation change requires an owner, reachable production rationale, updated design/docs/test, and architecture review.
- For v1.4.50, implement DS-017 rather than selecting whole conflict sides. Use current Codex argument 5 in both callers and AFB; await `run.publishEvent` only after durable projection; compute editor availability from the effective inherited-or-explicit model; gate Studio on the base migration before builder/listen.
- Run the complete existing behavior baseline after the focused latest-base matrix; preserve exact Studio/standalone outputs and `73/73` package parity, then rebuild Electron before delivery resumes.
