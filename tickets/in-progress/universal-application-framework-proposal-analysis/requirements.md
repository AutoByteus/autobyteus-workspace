# Requirements Doc — Universal Application Dual-Host Architecture

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Define the correct architecture and refactor path for one AutoByteus application package to run through both:

1. the existing AutoByteus Studio iframe host; and
2. a standalone application host that presents the same application UI at `/`.

The design must reuse the current application engine, backend API gateway, storage/migration lifecycle, agent/team orchestration, resources, events, and artifacts. It must not copy the server, create host-specific application business code, or redesign the package/marketplace before dual-host execution is proven.

Identity/account features are outside the current platform and this architecture scope.

Source proposal snapshot: [sources/autobyteus-vertical-application-developer-experience-proposal.md](sources/autobyteus-vertical-application-developer-experience-proposal.md).

Repository-backed assessment: [proposal-critical-analysis.md](proposal-critical-analysis.md).

Discussion-stage use-case and design-principles validation: [design-self-validation.md](design-self-validation.md).

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | Studio supports a setup-first, iframe-hosted lifecycle backed by a real application worker and app-owned orchestration. No standalone vertical-product host exists. | The same validated application package can be selected by Studio or by a standalone composition that serves its UI at `/`. | Studio setup/enter/reload/exit, iframe correlation, and app-owned run creation remain authoritative. | REQ-001, REQ-004 / AC-001, AC-003, AC-006 |
| BEH-002 | `ApplicationClientTransport` is injectable, but `startHostedApplication` requires iframe hints/parent messaging and passes raw iframe bootstrap fields into business callbacks. | Application source calls one `startApplication` API. The SDK selects a Studio-iframe or standalone-same-origin bootstrap provider and then constructs the same shared application client. | HTTP/WebSocket business communication and current backend context capabilities remain shared and host-neutral. | REQ-002 / AC-002, AC-003, AC-007 |
| BEH-003 | Current package roots contain `applications/`; manifest v4 and local IDs are strict. A generated package normally contains one application inside that container. | The first dual-host implementation uses the same current package contents and manifest v4 in both hosts. Standalone deployment configuration selects the package root and local application ID. | No `.abapp`, manifest-vNext, compatibility wrapper, or dual parser is introduced in this slice. | REQ-003 / AC-001, AC-004, AC-008 |
| BEH-004 | Bundled agents/teams are application-scoped. Execution-resource configuration may select bundled or shared definitions; tools/skills are resolved by the existing platform. | Both hosts resolve resources through the same current resource/configuration/orchestration owners and execute real agent/team paths. | Current resource-slot contract, bundled identities, selected runtime configuration, and configured tool/skill behavior remain unchanged. | REQ-004 / AC-005, AC-006 |
| BEH-005 | `server-runtime.ts` builds one broad server and route registries mix application APIs with unrelated Studio/platform APIs. | Explicit Studio and standalone composition roots reuse a shared application-platform lifecycle and route adapters. Standalone exposes only its root UI, bootstrap/readiness, selected-app backend, notification, custom WebSocket, and agent-communication surfaces. | Runtime implementations and existing engine/gateway/orchestration owners remain single-source; no server fork is created. | REQ-005 / AC-003, AC-009, AC-010 |
| BEH-006 | `autobyteus-app dev` currently serves an iframe-contract host and defaults to a mock backend when real server URLs are absent. The starter exposes `build`, `validate`, and that mock-capable `dev`; Brief Studio and Socratic expose only custom `build`/backend typecheck scripts, use non-default `frontend-src`/`backend-src` layouts, and have no devkit config or application-folder production `start` command. | Every maintained application project exposes one native command surface: `pnpm dev` runs real standalone watch/rebuild/restart, `pnpm dev:studio` exercises the real Studio host, `pnpm build` produces `dist/importable-package`, `pnpm validate` validates it, and `pnpm start` runs that already-built package through the real production standalone composition without rebuilding, watching, or mocking. Each maintained non-default project supplies a checked-in devkit mapping for its real source/resource directories, entrypoints, migrations, exposures, and output so all five commands use the same package owner. | Focused mocks remain test fixtures only and never satisfy developer product flow, production start, or dual-host conformance. Custom sample builders do not become a second package path. | REQ-006 / AC-005, AC-006, AC-011, AC-013 |
| BEH-007 | Application data uses per-app `app.sqlite`; platform orchestration state uses per-app `platform.sqlite` and a global lookup store. | Both hosts use the same current storage lifecycle and migrations under host-specific data roots. Existing data shapes do not change. | App/platform database ownership, migration ordering/checksums, binding recovery, and event semantics remain unchanged. | REQ-004, REQ-005 / AC-006, AC-012 |

## Investigation Findings

- Studio hosting, worker lifecycle, storage/migrations, backend gateway, bundled agents/teams, durable orchestration, events, and artifacts are reusable foundations.
- The frontend coupling is concentrated in bootstrap acquisition; normal business traffic already uses a reusable HTTP/WebSocket client transport.
- The backend SDK/context boundary is suitable for both hosts and should remain the only application-to-runtime API.
- The server needs two composition roots, but not two implementations. Application-platform lifecycle and ingress must be extracted from broad Studio server construction.
- Manifest v4 is sufficient for the first proof. Changing the distribution artifact first would add risk without proving portability.
- The standalone host should select exactly one application by `{packageRoot, localApplicationId}`, assign a stable standalone package identity inside its isolated data root, and fail startup on missing/ambiguous/invalid selection.
- No user/account architecture is needed for the current open-source, locally downloaded product model.

Full evidence is retained in [investigation-notes.md](investigation-notes.md).

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| [sources/autobyteus-vertical-application-developer-experience-proposal.md](sources/autobyteus-vertical-application-developer-experience-proposal.md) | User-supplied proposal snapshot | REQ-001–REQ-006 | AC-001–AC-013 | Input source; not accepted wholesale | Defines the original vision and claims evaluated by the task. |
| [proposal-critical-analysis.md](proposal-critical-analysis.md) | Claim/evidence/readiness assessment and revised roadmap | REQ-001–REQ-006 | AC-001–AC-013 | Approved/refined through 2026-07-27 with user/account concerns excluded and the native command surface confirmed; SR-003 removes a contradiction without changing approved behavior | Supplies the evidence classification and bounded dual-host recommendation used by the design. |
| [design-self-validation.md](design-self-validation.md) | Reachable use-case simulation, data-flow coverage, and canonical design-principles audit | REQ-001–REQ-006 | AC-001–AC-013 | Complete through SV-008; approval `N/A` | Records bounded design corrections without replacing the requirements or design authorities. |

## Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement`
- Design issue signal: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`
- Refactor posture: `Required Now`
- Evidence basis: Host-specific iframe bootstrap is embedded in the application startup API, while application ingress and lifecycle are embedded in a broad fixed server composition. Those two coupling points prevent a clean second host even though the underlying application engine and client transport are reusable.
- Required response: Separate bootstrap-provider ownership from application startup; extract application-platform lifecycle and ingress behind two explicit composition roots; keep manifest v4 and existing runtime/storage owners.
- Residual risk intentionally deferred: Full package release semantics, application-owned skills/tools packaging, optimized module distribution, and third-party marketplace isolation remain future programs. They must not block the dual-host proof or be implied by it.

## Recommendations

1. Replace `startHostedApplication` with one clean-cut `startApplication` API and migrate all in-tree apps/templates.
2. Add a host-neutral runtime bootstrap shape in `application-sdk-contracts` while retaining the current Studio iframe v4 wire protocol inside the Studio bootstrap provider.
3. Add `StudioIframeBootstrapProvider` and `StandaloneSameOriginBootstrapProvider`; do not create separate business client implementations.
4. Add a standalone host configured by package root and local application ID. It serves the selected UI at `/` and a reserved `/_autobyteus/*` platform namespace.
5. Extract a shared application-platform lifecycle owner for package discovery, required tool/runtime readiness, application recovery, event dispatch resumption, and shutdown.
6. Split route registration into Studio multi-application adapters and standalone selected-application adapters over the same gateway and communication services.
7. Keep manifest v4, current package layout, application worker, databases, migrations, resource slots, and orchestration contracts unchanged for this slice.
8. Give every maintained application folder the same native scripts: `dev` for real standalone development, `dev:studio` for real Studio-hosted development, `build`, `validate`, and `start` for production standalone execution of the existing build. Add checked-in devkit mappings for maintained non-default source layouts instead of retaining one-off package builders.
9. Prove the architecture using Brief Studio because it exercises backend state, migrations, a bundled team, real tools, events, and published artifacts.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

## In-Scope Use Cases

Only product-reachable user, developer, system, operational, and governing-contract paths are use cases. Hypothetical internal-state mutations and unsupported future modes are not use cases.

| Use Case ID | Reachable Independent Trigger / Governing Contract | Meaningful Product Outcome | Related Behavior / Requirement / Acceptance Criteria |
| --- | --- | --- | --- |
| UC-001 — Build once, consume in both hosts | Developer runs the supported package command and then chooses Studio import or standalone run | One validated read-only package and the same frontend/backend entry bytes run through both hosts without a host-specific rebuild | BEH-001, BEH-003, BEH-006 / REQ-001, REQ-003, REQ-006 / AC-001, AC-008, AC-011 |
| UC-002 — Studio setup and entry | Studio user imports/selects an application, completes its supported setup gate, and clicks `Enter application` | Existing ensure-ready, worker, iframe bootstrap, shared client, and business UI path remains operational | BEH-001, BEH-002, BEH-004 / REQ-001, REQ-002, REQ-004, REQ-005 / AC-002, AC-003, AC-005, AC-006 |
| UC-003 — Studio presentation lifecycle | Studio user saves setup after entry, clicks `Reload application`, clicks `Exit application`, or leaves the application route | Post-entry setup save does not silently relaunch; reload creates a fresh launch/iframe document; exit/route leave clears launch state, tears down the application document, and restores the Studio shell without inventing a runtime-run action | BEH-001, BEH-002, BEH-004 / REQ-001, REQ-002, REQ-004 / AC-003, AC-005, AC-006 |
| UC-004 — Standalone start and browser entry | Operator starts standalone with a valid package root/local ID/data root; browser opens or reloads `/` | One selected application is prepared, recovered, served at `/`, bootstrapped same-origin, and mounted with the shared client | BEH-001, BEH-002, BEH-003, BEH-005, BEH-007 / REQ-001–REQ-005 / AC-001, AC-003, AC-004, AC-006, AC-009, AC-010, AC-012 |
| UC-005 — Standalone selection rejection | Operator starts standalone with a missing local ID, invalid root, missing app, or selection that cannot resolve exactly one configured application | Startup fails before listen with a specific diagnostic; no implicit first-app choice or partial runtime graph becomes ready | BEH-003, BEH-005 / REQ-003, REQ-005 / AC-004 |
| UC-006 — Host-specific bootstrap normalization | A valid Studio iframe launch contract or valid top-level standalone document calls `startApplication`; malformed provider input exercises the same governing contract's failure path | Exactly one provider validates its wire, produces `ApplicationRuntimeBootstrap`, and hands off once; malformed iframe input never falls through to standalone | BEH-002 / REQ-002 / AC-002, AC-003, AC-007, AC-008 |
| UC-007 — Shared backend operation | Application frontend invokes a query, command, route, or GraphQL operation through `ApplicationClient` | Host mount delegates to the same gateway/engine/worker handler and returns the same business result | BEH-002, BEH-004 / REQ-002, REQ-004, REQ-005 / AC-003, AC-006, AC-010 |
| UC-008 — Live application communication | Application frontend subscribes to notifications, opens a custom backend WebSocket, or connects directly to an application-scoped agent target | Both hosts use the same notification, custom-WebSocket, streaming, and agent-communication owners through host-specific mounts | BEH-002, BEH-004, BEH-005 / REQ-002, REQ-004, REQ-005 / AC-003, AC-006, AC-010 |
| UC-009 — Real resource and agent/team execution | Application backend resolves its configured/default execution resource and calls `context.agentExecution` | The same resolver, runtime, binding, event, notification, and artifact path executes in both hosts; missing required setup/runtime produces an explicit application availability/setup result | BEH-004 / REQ-004, REQ-006 / AC-005, AC-006 |
| UC-010 — Storage preparation and migrations | Host ensures the selected/installed application backend is ready | Existing app/platform databases and application migrations are prepared under the host data root before worker use; package files remain immutable | BEH-003, BEH-007 / REQ-003, REQ-004, REQ-005 / AC-006, AC-012 |
| UC-011 — Restart and recovery | Operator restarts Studio or standalone with its existing data root | Current bindings, known state, availability, and pending events recover through existing owners; standalone activates only the currently selected canonical application | BEH-007 / REQ-004, REQ-005 / AC-006, AC-012 |
| UC-012 — Required readiness or worker failure | A named required startup dependency fails, or an active worker exits and a supported later request/reload exercises current recovery/ensure-ready behavior | Readiness never reports success prematurely; failures are explicit; existing engine/availability authority, not host adapters, owns worker state and retry/ensure-ready behavior | BEH-001, BEH-005, BEH-007 / REQ-004, REQ-005, REQ-006 / AC-003, AC-005, AC-006 |
| UC-013 — Standalone root, assets, navigation, and public boundary | Browser requests `/`, relative assets, valid SPA navigation, selected-app platform routes, or an invalid/reserved path | Valid UI/navigation works; path confinement and reserved namespace remain enforced; unrelated Studio/platform routes are absent | BEH-001, BEH-003, BEH-005 / REQ-001, REQ-003, REQ-005 / AC-009, AC-010 |
| UC-014 — Graceful process stop | Operator sends a normal process termination signal or the host closes | New ingress stops; timers, sockets, observers, workers, and streams close in the named order without creating terminal business events accidentally | BEH-005, BEH-007 / REQ-004, REQ-005 / AC-006, AC-010 |
| UC-015 — Native application-folder development | Developer changes into the starter, Brief Studio, or Socratic project and runs `pnpm dev` or `pnpm dev:studio` | The devkit resolves that project's checked-in source/resource mapping, then `dev` builds a disposable package and runs/watch-restarts the real standalone composition while `dev:studio` builds/watches the real local-path package through the real Studio import/reload and iframe path; neither mode silently substitutes a mock or invokes a second custom package builder | BEH-006 / REQ-006 / AC-001, AC-005, AC-006, AC-011 |
| UC-016 — Host-neutral application authoring | Developer implements an application or generates the starter and imports only application SDK/contracts | Source calls `startApplication`, contains no Studio/standalone branch or host/server import, and produces one package for both hosts | BEH-002, BEH-003, BEH-006 / REQ-001, REQ-002, REQ-003, REQ-006 / AC-001, AC-002, AC-007, AC-008, AC-011 |
| UC-017 — Local or explicit trusted-network standalone access | Operator accepts the loopback default or explicitly selects a non-loopback interface, then opens the application using that browser-visible origin | Same-origin HTTP/WS bootstrap works without user authentication; broad Studio CORS is absent and browser WebSocket origin/host authority is enforced | BEH-001, BEH-002, BEH-005 / REQ-001, REQ-002, REQ-005 / AC-003, AC-009, AC-010 |
| UC-018 — Build, validate, and start standalone production | Developer/operator runs `pnpm build`, optionally confirms with `pnpm validate`, and then runs `pnpm start` from the application folder | `start` selects `dist/importable-package` plus the source manifest's explicit local application ID, validates the existing output, and delegates to the real standalone process/composition with a separate durable data root; it does not repack, watch, enable development reload, or invoke mock routes | BEH-001, BEH-003, BEH-005, BEH-006, BEH-007 / REQ-001, REQ-003, REQ-005, REQ-006 / AC-001, AC-004, AC-009, AC-010, AC-012, AC-013 |

## Out of Scope

- Identity/account features.
- `.abapp`, signing, publisher identity, marketplace installation, or arbitrary third-party execution.
- Manifest vNext, package dependency resolution, or packaged/versioned skills and tools.
- A new standalone setup/configuration UI for applications whose required resource slots have no manifest default or existing data-root configuration.
- Multi-node/horizontal scaling or optimized per-application server binaries.
- Changing current application business schemas, migration files, runtime implementations, or orchestration semantics.
- Implementing the design under this solution-design task.

## Functional Requirements

- **REQ-001 — Same package, two hosts:** Studio and standalone must resolve and execute the same current application package contents without a host-specific application build.
- **REQ-002 — Host-neutral application startup:** Application source must call one startup API. Host-specific bootstrap acquisition and validation remain SDK-owned; business communication uses the same application client.
- **REQ-003 — Current package contract:** The first slice must use manifest v4 and the current `applications/<local-id>/` package layout unchanged. Standalone selection is deployment configuration, not a manifest root flag.
- **REQ-004 — Shared application runtime path:** Both hosts must use the current application engine, backend API gateway, storage lifecycle, migrations, execution-resource resolver, orchestration, events, and artifacts.
- **REQ-005 — Explicit composition roots:** Studio and standalone server entrypoints must compose shared application-platform lifecycle/services explicitly. Standalone must not expose unrelated Studio/platform API registries.
- **REQ-006 — Native development and production command path:** Maintained application folders must expose `dev`, `dev:studio`, `build`, `validate`, and `start`. Development and conformance must run real host/runtime paths, maintained non-default layouts must map into the shared devkit pack/validation owner, and `start` must consume the existing validated package through the production standalone composition. Mocks and one-off package builders may not be used as product, production, or portability evidence.

## Acceptance Criteria

- **AC-001:** One generated Brief Studio package validates under current manifest v4; the same read-only package content and frontend/backend entry digests are used by both host scenarios and remain unchanged after both runs.
- **AC-002:** Brief Studio, Socratic Math Teacher, and the devkit starter call `startApplication`; `startHostedApplication` and its application-facing exports are removed.
- **AC-003:** Studio iframe bootstrap and standalone same-origin bootstrap normalize to one host-neutral runtime bootstrap/context consumed by the same `ApplicationClient` construction path.
- **AC-004:** Standalone configuration selects `{packageRoot, localApplicationId}`; startup fails explicitly when the root is invalid, the app is missing, or selection is ambiguous.
- **AC-005:** A real Brief Studio bundled team starts through `context.agentExecution` in both hosts with the same selected resource/launch semantics.
- **AC-006:** Both hosts complete a real backend-state, migration, lifecycle-event, notification, and published-artifact journey without mock substitution.
- **AC-007:** Application business sources do not import `autobyteus-web`, Electron APIs, standalone host files, or server-internal managers and contain no Studio/standalone behavior branch.
- **AC-008:** The current serialized manifest (`"4"`), backend bundle (`"1"`), backend definition (`"4"`), frontend SDK (`"4"`), and Studio iframe (`"4"`) contract values and existing package identity rules remain the only accepted contracts for this slice; no compatibility wrapper or dual parser is added. Current code identifiers are clean-cut renamed without `V1`, `V4`, `_V1`, `_V4`, or equivalent suffixes, and no suffixed aliases remain.
- **AC-009:** Standalone serves the selected application entry at `/`, relative assets and SPA fallback safely, and reserves `/_autobyteus/*` from application static fallback.
- **AC-010:** The standalone executable exposes only readiness/bootstrap and selected-application backend/notification/custom-WebSocket/agent-communication ingress; unrelated Studio GraphQL, administration, MCP gateway, remote access, mobile, file explorer, terminal, and global catalog routes are absent. The standalone composition does not install broad Studio CORS behavior and applies its same-origin policy to browser WebSocket ingress.
- **AC-011:** From the devkit starter, Brief Studio, and Socratic project roots, `pnpm dev` runs a real standalone development session and `pnpm dev:studio` runs a real Studio-connected development session. Brief and Socratic each check in a devkit config that maps `frontend-src`, `backend-src`, root `agent-teams`, frontend/backend entrypoints, migrations, all seven backend exposure flags, and `dist/importable-package` into the shared pack owner; their frontend icon is an input under `frontend-src`, and their application entry imports the frontend SDK package rather than a generated local vendor tree. Both commands watch the resolved application inputs and rebuild through the same pack/validation owners; standalone performs a graceful full-host restart after an atomic rebuild and browser reload, while Studio uses the current local-package import/reload and iframe-host path. Neither command has an implicit mock or custom-builder fallback.
- **AC-012:** Existing per-app `app.sqlite`, `platform.sqlite`, global orchestration lookup, migration ledger/checksums, bindings, and event semantics require no data transformation.
- **AC-013:** From the same project roots, `pnpm build` produces `dist/importable-package`, `pnpm validate` checks that output, and `pnpm start` launches the existing output through the real standalone process with the source manifest's explicit local application ID, loopback default, configurable separate durable data root, and graceful signal handling. For a new writable data root it may create only a missing empty/non-secret host `.env` required by current `AppConfig`, without overwriting an existing file. `start` fails when the build is absent/invalid and never rebuilds, watches, serves mock routes, mutates the package root, or persists credentials.

## Constraints / Dependencies

- Baseline: refreshed at the user's request to `origin/personal` at `6caf809303294252c109420b238588f0c68aca6a` on 2026-07-29.
- The Studio iframe v4 message protocol remains an active host protocol, but it becomes internal to the Studio bootstrap provider rather than the application entry API.
- Contract versions remain serialized data fields, not code-symbol suffixes. In-scope current types, functions, constants, validators, and filenames use unversioned names.
- Runtime adapter and tool readiness must complete before standalone bootstrap reports ready.
- Current operational database initialization, secret-vault bootstrap, protected database/key path registration, and provisioned Search-tool registration are required runtime readiness for both hosts. These are provider/runtime configuration facilities, not user/account authentication.
- Application public APIs must remain under the SDK/context boundaries; a standalone host may not import application business modules directly.
- Existing checked-in sample package outputs must be regenerated by the devkit pack owner. Obsolete source-root `ui`/`backend` mirrors, local vendor trees, and custom package-builder scripts are removed rather than hand-maintained as a second build path.
- No copied server implementation or generic service-locator container is permitted.
- Both hosts treat the generated package root as immutable input. Mutable databases, migration ledgers, logs, runtime status, and orchestration state belong only under the host-configured data root.
- Standalone binds to `127.0.0.1` by default. A non-loopback bind is an explicit trusted-network operator choice; this local first slice makes no public-internet, multi-user, or authentication claim.
- Standalone bootstrap advertises strict root-relative platform paths; the frontend SDK provider resolves them from the browser-visible same origin into the absolute URLs consumed by the shared client.
- Standalone recovery activates only the configured selected canonical application. Dormant persisted records for a previous selection remain untouched and are not recovered or exposed.
- The production application-folder command is `pnpm start`. It is a thin devkit facade over the standalone process API owned by the existing `autobyteus-server-ts` project; it does not create another server implementation or top-level project.
- The first proof runs with the existing AutoByteus workspace/distribution present so the devkit can depend on the current private `autobyteus-server-ts` workspace package. The application package is not itself an executable. Publishing/extracting an independently installable optimized host runtime remains a later delivery decision.
- `pnpm dev` uses a disposable generated development package and a separate development data root. `pnpm start` uses `dist/importable-package` and a durable data root outside that package.
- When a new standalone data root has no host `.env`, the standalone command may create only the missing empty/non-secret host configuration file required by current `AppConfig` and supplies derived runtime values through explicit process/config inputs. It must never copy application package files or credentials into that file and must never overwrite an existing host configuration.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Per-app `db/app.sqlite`, `db/platform.sqlite`, logs/runtime status, and global orchestration lookup under the existing application data root.
- Required outcome: `Directly Usable — No Migration`
- Existing data to preserve: All current application business data, migration ledger, durable bindings, event journal/cursors, and global run lookup state.
- Unacceptable loss: Any destructive reset or change of an existing Studio application's canonical storage identity.
- Rationale: The target reuses current storage readers/writers and schemas unchanged. Standalone uses its own configured data root and a stable standalone package identity; it does not transform Studio data.
- Related requirement and acceptance-criteria IDs: REQ-004, REQ-005 / AC-006, AC-012

## Assumptions

- The current open-source deployment model is locally downloaded/self-hosted and intentionally has no user/account feature.
- Brief Studio is the representative conformance application because it covers the broadest current application-platform path.
- “Same application” means identical package files and application code, not shared live data between separate Studio and standalone installations.
- A standalone host selects one application even if the current package-root container can technically contain more than one.
- Approval authorizes the architecture/design package, not production implementation.

## Risks / Open Questions

- The first implementation keeps the standalone process API in the existing `autobyteus-server-ts` project and exposes it through `autobyteus-app start`; later physical extraction or optimized binary/container distribution may change delivery weight but must preserve this application-folder command contract.
- Current workspace/customization/tool registration and definition/runtime preflight must be split into named awaited readiness work; only explicitly noncritical Studio extras may remain background work.
- Refreshed-base protected DB/key path registration, operational Prisma, secret-vault, provisioned Search-tool, and event-pipeline shutdown behavior must not be lost when splitting the broad server root.
- Current singleton accessors in server subsystems may make composition extraction broader than the first route split; the design must remove composition-critical lookups without turning one change into a full repository dependency-injection rewrite.
- SPA history fallback and absolute asset URLs require dual-host conformance coverage across supported frontend build styles.
- A current package root may contain multiple apps; standalone configuration must never select implicitly when `localApplicationId` is missing.
- Browser-visible endpoint derivation must not use the server bind address or an untrusted reflected `Host`; the same-origin provider owns normalization from strict relative platform paths.
- Reusing a standalone data root after changing the selected local application must not recover old application bindings/workers; recovery uses only the selected-ID intersection and preserves other records dormant.
- The first standalone proof does not add a separate setup UI. A required execution-resource slot must resolve from existing data-root configuration or a manifest default; otherwise standalone fails readiness with an explicit setup-required diagnostic. Brief Studio is valid because it provides the representative bundled-team default.
- A new standalone data root currently lacks the `.env` required by `AppConfig`. The bounded materializer may create only a missing empty/non-secret file and explicit runtime values; overwriting operator config or writing credentials would violate the data/config boundary.

## Requirement-To-Use-Case Coverage

- REQ-001: UC-001, UC-002, UC-003, UC-004, UC-013, UC-016, UC-017
- REQ-002: UC-002, UC-003, UC-006, UC-007, UC-008, UC-016, UC-017
- REQ-003: UC-001, UC-004, UC-005, UC-010, UC-013, UC-016
- REQ-004: UC-002, UC-004, UC-007, UC-008, UC-009, UC-010, UC-011, UC-012, UC-014
- REQ-005: UC-002, UC-004, UC-005, UC-007, UC-008, UC-010, UC-011, UC-012, UC-013, UC-014, UC-017
- REQ-006: UC-001, UC-009, UC-012, UC-015, UC-016, UC-018

## Acceptance-Criteria-To-Scenario Intent

- AC-001: UC-001, UC-004, UC-015, UC-016
- AC-002: UC-002, UC-006, UC-016
- AC-003: UC-002, UC-003, UC-004, UC-006, UC-007, UC-008, UC-012, UC-017
- AC-004: UC-004, UC-005
- AC-005: UC-002, UC-009, UC-012, UC-015
- AC-006: UC-002, UC-003, UC-004, UC-007, UC-008, UC-009, UC-010, UC-011, UC-012, UC-014, UC-015
- AC-007: UC-006, UC-016
- AC-008: UC-001, UC-006, UC-016
- AC-009: UC-004, UC-013, UC-017
- AC-010: UC-004, UC-007, UC-008, UC-013, UC-014, UC-017
- AC-011: UC-001, UC-015, UC-016
- AC-012: UC-004, UC-010, UC-011
- AC-013: UC-001, UC-004, UC-014, UC-018

## Approval Status

Approved and refined by the user through 2026-07-27. User/account-related architecture is explicitly excluded. The user confirmed the native application-folder command surface (`dev`, `dev:studio`, `build`, `validate`, `start`), confirmed that `dev` means standalone development and `start` means production execution of the existing build, and authorized the revised package to proceed to architecture review.
