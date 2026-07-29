# Design Self-Validation — Universal Application Dual-Host Foundation

## Status

- Validation status: Complete through architecture-review round-2 corrections and the 2026-07-29 latest-base audit
- Outcome: `Pass after bounded design corrections`; the final passes added the missing Studio presentation spine, production start spine, exact maintained-project pack mappings, singular refreshed-base process prerequisites, and explicit rejection of the broad-server fallback
- Review handoff status: Architecture round 2 returned `Fail — Design Impact`; SR-003 corrects AR-001, AR-005, and AR-006 and is ready for re-review after artifact consistency checks
- Validation type: Architecture simulation and canonical design-principles audit; no production implementation exists to execute yet
- Requirements effect: The approved native application-folder command contract adds one reachable production-launch use case and AC-013. Eighteen reachable product use cases now have stable IDs and complete requirement/acceptance/spine traceability. The corrections make build-once immutability, standalone same-origin endpoint normalization, selected-application recovery filtering, static-navigation flow, Studio reload/exit, production `start`, unversioned code naming, current Prisma/vault/Search readiness, and the local no-auth network boundary explicit.
- Approval applicability: `N/A` as validation evidence. The requirements and design spec remain the intended-behavior authorities.

## Inputs

- [requirements.md](requirements.md)
- [investigation-notes.md](investigation-notes.md)
- [design-spec.md](design-spec.md)
- [proposal-critical-analysis.md](proposal-critical-analysis.md)
- [design-review-report.md](design-review-report.md) and [architecture-review-revision-record.md](architecture-review-revision-record.md)
- Team canonical `shared/design-principles.md`
- Current production-path evidence in the application SDKs, Studio application host, server application/process modules, devkit, and representative applications
- Refreshed repository baseline `origin/personal` / task `HEAD` at `6caf809303294252c109420b238588f0c68aca6a`

## Invariants Under Validation

1. One application source is packaged once; the exact same package bytes are consumed by Studio and standalone.
2. Host choice is runtime composition, not application source, manifest, or build variation.
3. Application business code calls one `startApplication` API and contains no Studio/standalone branch.
4. Provider-specific bootstrap wires normalize into one tight `ApplicationRuntimeBootstrap`.
5. Both hosts reuse one gateway, engine, storage, orchestration, communication, event, and artifact path.
6. Standalone selects exactly one configured application and exposes only selected-application ingress.
7. Package files are read-only runtime inputs; all mutable state is written under the configured host data root.
8. Existing schemas and migration behavior remain current and require no data transformation.
9. The first slice is local/self-hosted, trusted-package, single-node, and has no user/account/authentication subsystem.
10. `pnpm dev` means real standalone development, `pnpm dev:studio` means real Studio development, and `pnpm start` runs the existing production build without rebuilding, watching, or mocking.
11. Both hosts preserve the refreshed-base operational database, protected-path, Prisma, secret-vault, provisioned Search-tool, event-pipeline, and shutdown requirements in the specified order.
12. Starter, Brief Studio, and Socratic use one devkit pack owner; maintained non-default layouts are declaratively mapped, not delegated to custom build hooks.
13. Standalone always uses the explicit selected-application composition. Loopback/trusted-network policy never authorizes the current broad `buildApp()` composition as a fallback or interim stage.

## Scenario Validation Matrix

| Case ID | Supported Trigger / Governing Contract | Reachability | Spine(s) Exercised | Expected Production Path And Outcome | Result |
| --- | --- | --- | --- | --- | --- |
| SV-C01 | Developer runs the supported package command and dual-host conformance command | Reachable — approved operational path | DS-006, DS-007 | Source -> one package assembly -> manifest-v4 validation -> digest -> the unchanged package is consumed by Studio and standalone -> digest remains unchanged after both runs | Pass after SV-001 made this an explicit spine and read-only invariant |
| SV-C02 | User imports/selects the package in Studio, completes setup, and enters the application | Reachable — current supported Studio path | DS-001, DS-003, DS-004, DS-005 | Studio catalog/setup -> ensure-ready -> worker -> iframe v4 provider -> normalized runtime bootstrap -> shared client -> business UI; backend/runtime return path remains current | Pass |
| SV-C03 | Operator starts standalone with a valid package root, local application ID, and new or existing isolated data root; browser opens `/` | Reachable — approved target operational path | DS-002, DS-003, DS-005, DS-008 | Config owner preserves existing host config or creates only a missing empty/non-secret `.env` -> shared process/graph preparation -> listen/recovery -> selected UI -> same-origin bootstrap provider -> normalized runtime bootstrap -> shared client -> business UI | Pass after SV-002/SV-005/SV-006 corrections |
| SV-C04 | Operator binds standalone to loopback or another explicit interface and accesses it using the browser-visible origin | Reachable — `host` is supported config | DS-002 | Standalone wire returns root-relative platform paths; the provider resolves HTTP/WS endpoints against `window.location.origin`, never the server bind address or an untrusted reflected host | Pass after SV-002/SV-004; the former absolute `127.0.0.1` response example was insufficient |
| SV-C05 | Operator supplies an invalid package root or missing local application ID | Reachable — supported config can be invalid | DS-002, DS-005 | Selection delegates to current parser and fails before listen with an exact diagnostic; no implicit first application and no partial data initialization | Pass |
| SV-C06 | A valid package root contains multiple applications and the operator supplies one local ID | Reachable — current package container supports multiple applications | DS-002, DS-005, DS-007 | Selection filters only the configured application; static routes, bootstrap, ingress, availability, and recovery receive one immutable selected descriptor | Pass |
| SV-C07 | Studio iframe hints/envelope are malformed, mismatched, or unsupported | Reachable — iframe v4 is a governing host contract | DS-001 | Studio provider validates origin/window/application/launch correlation and fails startup; it never falls through to standalone fetch | Pass |
| SV-C08 | Top-level standalone bootstrap is unavailable, malformed, or reports failed readiness | Reachable — approved standalone startup path | DS-002, DS-005 | Standalone provider fails strict acquisition/validation; coordinator reaches `startup_failed`; no mock or Studio fallback occurs | Pass |
| SV-C09 | Required workspace/tool/definition/runtime readiness fails | Reachable — named modules and configured resources are exercised by real startup | DS-005 | Named P4–P9 phase rejects, lifecycle becomes failed, ingress cannot report ready; standalone closes/exits non-zero and Studio does not report application readiness | Pass |
| SV-C10 | Application frontend invokes query, command, route, GraphQL, notification, custom backend WebSocket, or direct agent-communication capability | Reachable — current SDK/gateway/communication contracts | DS-003, DS-004 | Shared client -> host mount -> exact gateway/notification/custom-WS/agent-communication owner -> engine/orchestration as applicable -> result/event/socket; host code never imports backend business modules | Pass |
| SV-C11 | Application backend resolves a configured bundled team and starts a real run that emits events and artifacts | Reachable — Brief Studio current behavior and approved proof | DS-003, DS-004 | Context capability -> orchestration -> real runtime -> durable binding/journal -> handler/notification/artifact relay -> frontend reconciliation | Pass; host-provided tools/runtimes remain a declared first-slice dependency |
| SV-C12 | Standalone restarts using the same selected application and data root | Reachable — supported operational restart | DS-004, DS-005 | Existing schemas open directly -> selected application known-state intersection -> binding recovery -> availability reconciliation -> pending event resume | Pass after SV-003 made the selected-ID filter explicit |
| SV-C13 | A standalone data root contains dormant state for a previously selected different local application | Reachable — operator can change supported selection config while reusing a root | DS-005 | Recovery may inspect the store but activates only `known IDs ∩ {selected canonical ID}`; dormant records are preserved and never recovered/exposed by the new selected-app host | Pass after SV-003; no destructive cleanup or migration |
| SV-C14 | Worker exits after readiness and the frontend later invokes the backend or reloads | Reachable — process failure/reload are current lifecycle conditions | DS-003, DS-005 | Existing engine/availability owners retain worker state and ensure-ready behavior; host adapters do not implement a second restart policy | Pass structurally; implementation/API-E2E must verify the retained current behavior |
| SV-C15 | Operator terminates standalone while timers, workers, notifications, custom sockets, agent streams, event pipeline, vault, or Prisma are active | Reachable — supported process signal/close | DS-005, DS-010 | Stop ingress -> application lifecycle cleanup -> default run-event pipeline -> vault -> Prisma, with finally-style cleanup and one process timeout | Pass after latest-base stop audit |
| SV-C16 | Browser requests `/`, a relative asset, a valid SPA navigation, traversal input, or `/_autobyteus/unknown` | Reachable — normal browser/static and HTTP paths | DS-008 | Selected UI resolver confines real paths under `ui/`; platform prefix is excluded first; eligible document navigation alone falls back to entry HTML; API/traversal errors never become HTML | Pass after DS-008 made the flow explicit |
| SV-C17 | Standalone starts with its default network configuration and no account/auth subsystem | Reachable — approved local/self-hosted product mode | DS-002, DS-005 | Default bind is loopback; standalone registers no permissive cross-origin middleware and requires browser WebSocket `Origin` authority to equal request `Host` authority; non-loopback bind is explicit trusted-network operation | Pass after SV-004; this is a network boundary, not user authentication |
| SV-C18 | Developer runs `pnpm dev` or `pnpm dev:studio` in the starter, Brief Studio, or Socratic project | Reachable — approved developer workflow | DS-006, DS-007 | Devkit loads the checked-in project mapping, resolves the real sources/resources, and uses one pack/validator; `dev` watches/restarts the real standalone host while `dev:studio` reloads through real Studio and preserves Studio's explicit Reload action. No missing config invokes a mock or custom builder. The exact Brief/Socratic mappings currently pack and validate their icons, teams, migrations, and exposure manifests in a disposable probe | Pass after SV-006/SV-008 |
| SV-C19 | Application source or template imports Studio, Electron, standalone-host, or server-internal modules | Reachable as a source change, prohibited by approved contract | DS-001, DS-002, DS-007 | Static dependency checks and exact migration inventory reject the import/branch; providers remain SDK-owned | Pass |
| SV-C20 | Studio user reloads, exits, or leaves the application route | Reachable — current documented Studio action/path | DS-009 | Reload creates a fresh launch generation and iframe document; exit/leave clears route-visit launch state, tears down the document, closes browser-scoped resources, and restores the standard Studio shell without creating a runtime run | Pass after DS-009 made the preserved lifecycle explicit |
| SV-C21 | Standalone selected application declares a required execution-resource slot with neither a manifest default nor existing data-root configuration | Reachable — current resource-slot contract applied to approved standalone selection | DS-005 | Definition/resource readiness reports an explicit selected-application setup diagnostic and does not report ready or silently select a resource; the first proof passes because Brief Studio supplies a resolvable bundled-team default | Pass with declared first-slice limitation; a general standalone setup UI remains outside this proof |
| SV-C22 | Studio user saves execution-resource setup after entry and then chooses whether to reload | Reachable — current documented Studio setup/presentation path | DS-009 | Saving setup updates configuration but preserves the current launch/iframe; only explicit Reload produces a new launch generation and remount | Pass after DS-009 expanded to the full presentation lifecycle |
| SV-C23 | Developer/operator runs `pnpm build`, `pnpm validate`, and `pnpm start` from an application project | Reachable — approved native production workflow | DS-007, DS-010, DS-002, DS-005 | Build produces `dist/importable-package`; validate checks it; start revalidates the existing output, derives the explicit source-manifest local ID, uses separate durable data, invokes the real standalone process once, and never packs/watches/mocks/mutates package bytes | Pass after SV-006 added DS-010 and AC-013 |
| SV-C24 | Either host starts on refreshed base `6caf80930` and completes required platform preparation before reporting application readiness | Reachable — current server startup always performs the operational DB/vault/Search prerequisites and the approved target preserves that governing runtime contract | DS-005, DS-010 | Exact AppConfig/database location -> core migration -> protected DB/root-key/WAL/SHM/journal paths -> Prisma -> secret vault -> app-data migration -> exactly seven named tool groups including Search -> runtime readiness; close reverses consumer dependencies and shuts event pipeline/vault/Prisma | Pass after SV-007/SV-008 consistency correction; no user authentication introduced |

## Reachable Product Use-Case Completeness Audit

The use-case inventory contains only paths with an independent supported user/developer/operational action, system event, or governing contract. Unsupported multi-process, marketplace, multi-node, and public-internet modes remain ordinary out-of-scope statements; they are not counted as use cases.

| Use Case ID | Reachable Validation Case(s) | Design Spine(s) | Listed In Requirements? | Outcome |
| --- | --- | --- | --- | --- |
| UC-001 — Build once, consume in both hosts | SV-C01, SV-C18, SV-C19 | DS-007 -> DS-001/DS-002; DS-006 evidence | Yes | Complete |
| UC-002 — Studio setup and entry | SV-C02, SV-C09, SV-C10, SV-C11 | DS-001, DS-003, DS-004, DS-005 | Yes | Complete |
| UC-003 — Studio presentation lifecycle | SV-C20, SV-C22 | DS-009 | Yes | Complete after second audit |
| UC-004 — Standalone start and browser entry | SV-C03, SV-C04, SV-C08, SV-C10 | DS-002, DS-003, DS-005, DS-008 | Yes | Complete |
| UC-005 — Standalone selection rejection | SV-C05, SV-C06 | DS-002, DS-005 | Yes | Complete |
| UC-006 — Host-specific bootstrap normalization | SV-C07, SV-C08, SV-C19 | DS-001, DS-002 and frontend state | Yes | Complete |
| UC-007 — Shared backend operation | SV-C10 | DS-003 | Yes | Complete |
| UC-008 — Live application communication | SV-C10, SV-C11, SV-C15 | DS-003, DS-004, DS-005 | Yes | Complete |
| UC-009 — Real resource and agent/team execution | SV-C09, SV-C11, SV-C21 | DS-003, DS-004, DS-005 | Yes | Complete, including missing-setup product failure |
| UC-010 — Storage preparation and migrations | SV-C02, SV-C03, SV-C12 | DS-003, DS-005 | Yes | Complete |
| UC-011 — Restart and recovery | SV-C12, SV-C13 | DS-004, DS-005 | Yes | Complete |
| UC-012 — Required readiness or worker failure | SV-C09, SV-C14 | DS-003, DS-005 | Yes | Complete |
| UC-013 — Standalone root, assets, navigation, and public boundary | SV-C16, SV-C17 | DS-008, DS-002 | Yes | Complete |
| UC-014 — Graceful process stop | SV-C15 | DS-005 | Yes | Complete |
| UC-015 — Native application-folder development | SV-C01, SV-C18 | DS-006, DS-007 | Yes | Complete |
| UC-016 — Host-neutral application authoring | SV-C01, SV-C19 | DS-007, DS-001, DS-002 | Yes | Complete |
| UC-017 — Local or explicit trusted-network standalone access | SV-C04, SV-C17 | DS-002, DS-008 | Yes | Complete |
| UC-018 — Build, validate, and start standalone production | SV-C03, SV-C15, SV-C23, SV-C24 | DS-010 -> DS-005/DS-008/DS-002 | Yes | Complete after native-command and latest-base audit |

## Corrections Produced By The Validation

Discussion naming refinement: all current application SDK/contract code symbols are unversioned. This includes existing manifest, backend-bundle, backend-definition, frontend-SDK, and Studio-iframe constants, types, validators, factories, and filenames. Their serialized numeric version fields remain unchanged, but no `V1`, `V4`, `_V1`, `_V4`, or equivalent suffix and no suffixed compatibility alias remains in the target code.

### SV-001 — Make “build once, consume twice” a real spine

**Problem:** AC-001 and DS-006 mentioned digest evidence, but the design lacked a full package-production-to-host-consumption spine. That made the main product invariant look like test metadata rather than an architectural flow.

**Correction:**

- Add DS-007 from application source through one package assembly/validation/digest to both host consumers.
- State that both hosts treat the package root as read-only.
- Require pre-run/post-run digest evidence and the same frontend/backend entry digests in conformance.
- Keep all runtime writes under the host-configured data root.

### SV-002 — Separate the standalone wire payload from normalized absolute runtime endpoints

**Problem:** The design example returned absolute `127.0.0.1` URLs from `GET /_autobyteus/bootstrap`. That breaks when Fastify binds `0.0.0.0`, the browser uses a LAN hostname, or TLS is terminated before the process. Allowing one runtime type to contain either relative or absolute endpoint meanings would also loosen the shared structure.

**Correction:**

- Add a strict `StandaloneApplicationBootstrapPayload` wire contract containing selected application identity plus root-relative `/_autobyteus/*` paths.
- `StandaloneSameOriginBootstrapProvider` validates that wire shape and resolves absolute HTTP/WS URLs from `window.location.origin`.
- The provider returns the existing tight `ApplicationRuntimeBootstrap` with absolute endpoints.
- Studio continues to normalize iframe payload v4 into the same runtime type.
- Neither the application nor the server derives browser endpoints from the server bind address.

### SV-003 — Filter standalone recovery to the selected canonical application

**Problem:** “Selected catalog + isolated persisted IDs” was ambiguous when one data root contains state from a previous configured local application. Recovering every known ID would violate the one-selected-application host boundary.

**Correction:**

- Standalone recoverable IDs are exactly `persistedKnownApplicationIds ∩ {selection.applicationId}`.
- Global lookup, binding recovery, availability, dispatch resume, and worker recovery are scoped to that selected ID.
- State for other IDs remains dormant and unmodified; no deletion or data migration is introduced.
- Studio continues to reconcile its full installed catalog and known IDs.

### SV-004 — Make the no-auth local network boundary explicit

**Problem:** The design intentionally has no user/account/authentication subsystem, but it did not say what the standalone default bind/CORS/WebSocket boundary is. A broad or permissive default would contradict the local trusted-package scope.

**Correction:**

- Default standalone bind: `127.0.0.1`.
- A non-loopback bind must be explicit and is a trusted-network operator decision, not a public-internet security claim.
- Standalone does not install the Studio server's permissive CORS policy.
- Standalone browser WebSocket upgrades require normalized `Origin` authority to equal normalized request `Host` authority; missing/mismatched origins are rejected. Trusted-proxy rewriting is not claimed in the first slice.
- This adds no user identity, login, session, or authorization model.

### SV-005 — Add the standalone static/navigation spine

**Problem:** DS-002 covered initial root asset selection but did not stretch through relative assets, SPA navigation, reserved-prefix exclusion, and meaningful application startup. AC-009 therefore depended on off-spine prose without a complete supported flow.

**Correction:**

- Add DS-008 for root/static/navigation.
- Require decoded and real-path containment under the selected `ui/` root.
- Exclude `/_autobyteus/*` before static lookup and fallback.
- Apply SPA fallback only to eligible HTML document navigation, never API/WebSocket/asset failures.

### SV-006 — Make native development and post-build production start explicit

**Problem:** The earlier design distinguished real/mocked host modes but did not define the application-folder production command after `build`. It also retained a public contract-mock concept after the user selected the simpler native workflow.

**Correction:**

- Fix the public script contract to `dev`, `dev:studio`, `build`, `validate`, and `start`.
- Make `dev` real standalone watch/repack/graceful restart/browser reload and `dev:studio` real Studio local-package watch/reload; mock/iframe machinery is test-only.
- Add DS-010 from the existing validated build through `autobyteus-app start`, the public standalone process API, readiness, root/bootstrap, and graceful stop.
- Require `start` to derive the explicit source-manifest local ID, use a separate durable data root, and never build/watch/mock/mutate the package.
- Keep the process API in the existing server project and the command facade in the devkit; add no top-level project or server copy.

### SV-007 — Reconcile the design with refreshed `origin/personal`

**Problem:** The user requested a latest-base refresh. The server root changed after the initial investigation: real runtime startup now initializes operational repository Prisma and a secret vault, protects database/key paths from file tools, registers a provisioned Search tool, and closes the default run-event pipeline/vault/Prisma.

**Correction:**

- Refresh the dedicated branch by fast-forward to `6caf809303294252c109420b238588f0c68aca6a` and re-audit all application-critical changed paths. The final `a5ad63bb9..6caf80930` delta changes only completed-ticket delivery evidence and does not touch the designed production paths.
- Add named P2A/P2B operational database/protected-path/Prisma/vault readiness to both compositions.
- Add Search as the seventh required tool group and remove hidden registration from broad route construction.
- Extend the exact composition/Modify-Retain inventory and process stop order.
- Preserve one composition per process and treat the vault as provider/runtime configuration, not a user/account authentication feature.

### SV-008 — Close architecture-review round-2 consistency and maintained-project gaps

**Problem:** Architecture review round 2 found three bounded contradictions: one dependency rule reversed protected-path/Prisma order, one file row still said six required tool groups, Brief/Socratic's supported development commands lacked inputs for their non-default layouts, and the approved critical analysis still allowed the rejected full-server fallback.

**Correction:**

- Make every lifecycle rule, sequence, example, guidance row, and SV-C24 use one chain: `AppConfig/database location -> core migration -> protected DB/root-key/sidecar paths -> Prisma -> secret vault -> app-data migration -> remaining readiness`.
- Name all seven P6 groups everywhere, including provisioned Search.
- Add the exact shared Brief/Socratic `autobyteus-app.config.mjs` mapping for `frontend-src`, `backend-src`, optional agents/assets, root teams, entries, migrations, seven backend exposure booleans, and `dist/importable-package`.
- Move each icon into `frontend-src`, import the frontend SDK package, switch the five scripts to direct devkit commands, and delete rather than wrap each custom builder plus source-root `ui`/`backend` mirrors/vendor trees.
- Validate the mapping seam with a disposable current-devkit pack/validate probe for both maintained apps; do not claim that this executes the not-yet-implemented host commands.
- Remove every recommendation, roadmap stage, target-behavior statement, and decision-table allowance for the current broad server as a standalone fallback. Named runtime prerequisites remain reusable only inside the explicit selected-application composition.

## Data-Flow Coverage Check

| In-Scope Use Case | Primary / Operational Spine | Return / Event Spine | Bounded Local Spine | Coverage Result |
| --- | --- | --- | --- | --- |
| Studio launch | DS-001 | DS-004 when runtime work starts | DS-001 frontend state; DS-005 lifecycle | Complete |
| Standalone launch | DS-002 | DS-004 when runtime work starts | DS-002 frontend state; DS-005 lifecycle | Complete |
| Shared backend invocation | DS-003 | Request result plus DS-004 for async output | Engine/worker internals retained behind existing owner | Complete |
| Real agent/team execution | DS-003 -> DS-004 | DS-004 | Existing runtime loops remain owned by runtime services | Complete |
| Startup/readiness/recovery/stop | DS-005 operational boundary | Readiness/failure projection | DS-005 lifecycle state machine plus process-resource close | Complete after latest-base audit |
| Native development | DS-006 | Command result/logs | Config resolution, watch coalescing, host close/restart, Studio explicit reload | Complete after SV-006/SV-008 |
| Build once / two hosts | DS-007 | Conformance evidence | Package assembly/validation owner | Complete after SV-001 |
| Standalone root/assets/navigation | DS-008 | Browser response/startup result | Static resolver/fallback policy | Complete after SV-005 |
| Studio presentation lifecycle | DS-009 | Stable launch after setup save, fresh bootstrap on reload, or shell restoration on exit | Route-visit launch state and iframe document teardown | Complete after reachable-use-case audit |
| Built-package production start | DS-010 -> DS-005/DS-008/DS-002 | Process result/logs and browser startup | No-build command translation, host config materialization, process close | Complete after SV-006/SV-007 |

## Canonical Design-Principles Audit

| Principle / Derived Check | Result | Validation |
| --- | --- | --- |
| 1. Approved behavior and production reality | Pass | BEH-001–BEH-007 link approved intent, current evidence, target production paths, and preserved behavior. No user/account subsystem was reintroduced. |
| 2. Data-flow spine inventory and span sufficiency | Pass after SV-001/SV-005/SV-006 and DS-009 | DS-001–DS-010 cover both hosts, Studio reload/exit, backend/runtime return, lifecycle, native development, immutable dual-host package consumption, root/static navigation, and production use of the existing build. Primary paths contain the initiating surface, authoritative owners, downstream mechanisms, and meaningful outcomes. |
| 3. Ownership clarity and boundary encapsulation | Pass after SV-002/SV-003/SV-006/SV-007/SV-008 | Provider wires are provider-owned, normalized runtime shape stays tight, selection owns identity once, recovery cannot bypass selected-app authority, commands resolve declarative inputs and call only pack/host public boundaries, process prerequisites are composition-owned, routes delegate to gateway/communication owners, and composition alone constructs the graph. |
| 4. Off-spine concerns around the spine | Pass | Validation, static confinement, endpoint normalization, readiness projection, non-secret host-config materialization, logging, digest evidence, and process cleanup serve named owners and do not become competing coordinators. Existing package/runtime/storage/vault capabilities are reused. |
| 5. Current-schema runtime and proportionate persisted-data transition | Pass | Schemas/readers/writers remain unchanged; direct use under distinct roots is correct. Dormant non-selected records are preserved rather than migrated or deleted. |
| 6. Product-reachability gate | Pass | Every use case and validation case names a supported current/target trigger or governing contract. Unsupported future modes remain in requirements `Out of Scope` and are not inflated into use cases or validation scenarios. |
| Clean-cut replacement / no compatibility path | Pass | `startHostedApplication`, hosted-only types/copy, public mock fallback/contract mode, broad route registration, and composition-critical application-graph lookups are removed rather than wrapped. |
| Authoritative boundary / no mixed-level dependency | Pass | Application -> SDK, command -> public host API, route -> gateway, gateway -> engine, worker context -> orchestration, composition -> lifecycle/registrars/process resources. Forbidden bypasses are explicit. |
| Reusable shared structures are semantically tight | Pass after SV-002 | Runtime bootstrap means absolute ready-to-use endpoints only; standalone relative wire paths have their own strict type rather than making one DTO ambiguous. |
| Existing capability-area reuse before new helpers | Pass after SV-008 | New owners exist only for genuinely new host/bootstrap/lifecycle/command-session concerns; engine, gateway, storage, parser, orchestration, runtime, vault, communication, and the devkit pack implementation remain authoritative. No custom-builder adapter is introduced. |
| File/folder mapping follows ownership | Pass after SV-008 | SDK startup, standalone host, shared application-platform runtime, devkit command/development sessions/configs, maintained source inputs, transport adapters, and compositions have distinct physical owners without creating a new top-level project. |
| Removal/decommission completeness | Pass after SV-008 | The design enumerates source, generated output, custom builders/vendor mirrors, route registration, scheduler, accessor, and documentation removal. |
| Interface identity/selector clarity | Pass | Runtime application identity is canonical; standalone config accepts `{packageRoot, localApplicationId, appDataDir, host, port, publicBaseUrl?}` and derives canonical identity once; devkit derives local ID from source manifest and selected-app routes accept no caller application selector. |
| Empty-indirection/generic-container smell | Pass | The runtime graph factory owns exact construction and returns a typed composition result; it is never injected as a general container. |
| Persisted-data migration smell | Pass | No schema change and no speculative database rewrite; the current runtime remains current-schema-only. |

## Residual Risks That Remain Honest

1. The initial `pnpm start` command delegates to the existing server project/runtime available in the AutoByteus checkout/distribution. Later optimized binary/container/package extraction is not decided, but must preserve the command and package contract.
2. Manifest v4 does not package every tool, skill, model, or external runtime dependency. The first conformance proof uses declared current built-in dependencies and must not claim full offline portability.
3. Public-internet deployment, TLS/reverse-proxy support, authentication, multi-user tenancy, and multi-node execution are not claimed by this first local standalone host.
4. Current Studio behavior after a worker crash is retained structurally but must be verified by executable coverage once implementation exists.
5. A complete repository-wide dependency-injection conversion remains out of scope; the exact composition-critical graph paths may not use global fallback accessors.
6. Latest-base Prisma/vault/tool readiness is structurally designed but must be verified in real standalone execution, including restart cleanup and a provider-backed Search/tool path.
7. The disposable mapping probe proves existing pack support for the exact Brief/Socratic inputs, but downstream execution must still verify their new `dev`, `dev:studio`, and built-output production paths after those commands and the host exist.

## Self-Validation Decision

The macro design remains sound:

> One immutable application package is consumed by two thin hosts, which normalize host-specific bootstrap protocols and compose one shared application-platform runtime.

The design is stronger after eight bounded corrections, the unversioned naming refinement, the reachable-use-case audit that added DS-009, the native command refinement that added DS-010, and the latest-base/process/config audits. All eighteen listed reachable use cases map to one or more complete spines and at least one of twenty-four validation scenarios. No extra top-level project, second server implementation, host-specific application build, custom-builder adapter, broad-server fallback, public mock product mode, user/account subsystem, compatibility wrapper, data migration, or manifest-vNext work is required.

The user ended the discussion hold and authorized further review. The package may proceed after final consistency and solution-revision-record checks.
