# Critical Analysis — AutoByteus Universal Application Framework Proposal

## Document Status

- Assessment status: Complete for the repository baseline recorded below
- Recommendation status: **Approve the vision conditionally; revise the proposal before treating it as an implementation plan**
- Approval applicability: Approved/refined through 2026-07-30. User/account concerns are excluded; application-folder commands, complete package defaults, optional Studio overrides, and the internal Agent Tools/general-gateway/application-MCP boundary remain approved. SR-011 naming is implemented and passed. SR-013 preserves the approved SR-012 boundary/package-owner direction and corrects its two bounded lifecycle gaps: worker ensure/restart before artifact handler invocation and exact inactive/terminated run-resource cleanup. Architecture approval is required.
- Source proposal: [sources/autobyteus-vertical-application-developer-experience-proposal.md](sources/autobyteus-vertical-application-developer-experience-proposal.md)
- Requirements basis: [requirements.md](requirements.md)
- Evidence log: [investigation-notes.md](investigation-notes.md)
- Repository design baseline: refreshed before implementation to `origin/personal` at `6caf809303294252c109420b238588f0c68aca6a`; current design review authority is `ARCH-REV-010` over SR-012 at task commit `0cc258659554801898e4d2ef94860143d196dcb1` on 2026-07-31

## Executive Verdict

The proposal has a strong product thesis and the right high-level ownership split: an application should own its product UX and business state, while AutoByteus should own runtime execution, orchestration, application scoping, and host integration. The repository already contains more of that foundation than the proposal implies: Studio application discovery, a strict iframe bootstrap contract, a separate application worker process, app-owned SQLite migrations, durable application-to-agent/team bindings, bundled agents and teams, direct frontend agent communication, and a first devkit all exist.

The original proposal was **not implementation-ready**. The bounded dual-host architecture and SR-011 naming correction now pass implementation-source, API/E2E, and durable-test review. `CRR-029`, `API-REV-011`, and `CRR-030` validate real Studio/standalone launch, Codex/Luna package defaults, Agent Tools publication and recipient-name handoff, application projection, recovery/remount/restart/cleanup, naming, and exact `73/73` package parity. `CRR-031` identified no product-runtime gap; it requested a behavior-neutral structural correction. ARCH-REV-010 confirms the four-projection runtime boundary and package-owner split, but found that SR-012 dropped two current lifecycle behaviors while removing the cycles: artifact relay must ensure/restart an exited worker before handler invocation, and every inactive/terminated run removal must synchronously revoke sessions plus detach file/artifact/memory observers exactly once. At the original investigation baseline, the proposal treated several absent or partial capabilities as small adaptations:

1. there was no standalone application product host;
2. the frontend startup API was iframe-specific rather than host-neutral;
3. the server had one broad, fixed composition root rather than capability-driven application composition;
4. current installable package semantics and manifest v4 do not match the proposed artifact or sample manifest;
5. skills, tools, and shared execution resources are not closed, versioned application dependencies;
6. the worker subprocess is not a security sandbox and inherits the full server environment;
7. the Studio application iframe has no `sandbox` attribute;
8. version strings and capability/permission declarations do not yet amount to compatibility or security enforcement; and
9. there was no real dual-host conformance suite; and
10. it did not define who owns the portable runtime/model baseline, optional host overrides, or truthful application-run readiness.

The right decision remains **proceed, but narrow and reorder**. Prove one existing application bundle through the current Studio path and a deliberately bounded standalone host before expanding manifest v4, extracting packages, or building a marketplace. Treat all packages as trusted first-party code until an enforceable isolation and publisher-trust model exists.

## Readiness Matrix

Classification meanings:

- `Existing`: production code implements the material capability.
- `Partial`: a useful foundation exists but does not satisfy the proposal claim.
- `Absent`: no matching supported path was found.
- `Unverified`: evidence is insufficient; do not claim readiness.

| Proposal area | Classification | Repository reality | Decision |
| --- | --- | --- | --- |
| Correct runtime model (`autobyteus-ts` vs `autobyteus-server-ts`) | Existing | `autobyteus-server-ts/src/agent-execution/backends/` contains separate AutoByteus, Codex, and Claude backend implementations selected by server orchestration. | Accept the proposal's correction. |
| Studio application host | Existing | `autobyteus-web` provides catalog/setup/enter/reload/exit flow, strict iframe v4 bootstrap, SDK startup, and backend ensure-ready. | Treat as the first host, not a prototype placeholder. |
| Application backend worker | Existing with a trust limitation | `ApplicationEngineHostService` starts one worker subprocess per application and bridges named capabilities over IPC. The subprocess is not sandboxed. | Reuse for trusted MVP packages; do not market it as third-party isolation. |
| App-owned storage and migrations | Existing | Per-app `app.sqlite` is separated from `platform.sqlite`; SQL migrations are ordered, checksummed, and restricted. | Reuse unchanged in the portability proof. |
| Application-owned orchestration | Existing | Backend context exposes `agentExecution`, `agentResources`, and `publishedArtifacts`; bindings and lifecycle events are durable and app-scoped. | Reuse as the canonical business-backend/runtime boundary. |
| Frontend SDK bootstrap/client separation | Existing in task implementation | `startApplication` selects provider-local Studio/standalone bootstrap and constructs one shared HTTP/WebSocket client. | Preserve; do not reopen the macro boundary. |
| Backend SDK host neutrality | Partial, comparatively strong | The SDK is mainly types, `defineApplication`, target-address builders, and launch-profile helpers. Host-provided context capabilities carry runtime calls. | Reuse the context-capability boundary; correct proposal examples to current APIs. |
| Portable package | Partial and semantically mismatched | Current package roots contain `applications/` and can hold multiple applications. A generated devkit package contains one app under that container. There is no immutable release artifact. | Separate package-root, application-bundle, and signed-release terminology. |
| Bundled agents and teams | Existing | Bundle discovery creates canonical application-owned agent/team identities. | Reuse. |
| Bundled/versioned skills and tools | Absent | Devkit copies agents and agent teams only. Agent configs resolve named skills/tools through platform registries. | Exclude from MVP portability guarantee or design an explicit dependency model later. |
| No hidden global resources | Not satisfied | Execution-resource slots default to both `bundle` and `shared`; all visible shared agents/teams are listable and shared refs use unversioned definition IDs. | Revise the claim and introduce explicit, versioned dependency semantics before ecosystem distribution. |
| Standalone product host at `/` | Existing and passed | Selected-app server, root/static serving, same-origin bootstrap, Codex/Luna defaults, readiness, dev/start, internal Agent Tools publication/handoff/projection, recovery/remount/restart, and cleanup pass. | Preserve behavior through SR-013; do not reopen product contracts. |
| Explicit server assembly | Existing in task implementation | Studio and selected-application standalone servers share one `ApplicationPlatformRuntime` model with bounded route inventories. | Preserve explicit assembly; do not add a generic module locator. |
| Vue/React scaffolds and HMR | Absent | The devkit has one plain TypeScript/CSS template and one-shot esbuild output. | Defer until host portability works. |
| Standalone-first dev command | Existing and passed | `autobyteus-app dev` runs the real standalone host through repeated atomic pack/watch/restart cycles and completes the maintained real team/tool journey. | Preserve command/validation/route/package behavior. |
| Dual-host conformance | Existing and passed | `API-REV-011` proves identical package artifacts (`73/73`), real provider/team execution, publication/message/handoff/projection, recovery/remount/restart, and cleanup in both hosts. | Use as the fixed regression baseline for SR-013. |
| Central framework naming | Existing and passed | IR-016 applies the exact server/runtime/manager/supervisor/coordinator/service/publisher/handler vocabulary; CRR-029/API-REV-011/CRR-030 pass. | Preserve it while deleting the two no-longer-needed bind-once implementations. |
| Runtime boundary and construction ownership | Needs bounded behavior-neutral correction | ARCH-REV-010 approves the four projections and package refresh owners. The remaining target must preserve worker ensure/restart for artifact delivery and exact session/observer cleanup for every run-removal origin while eliminating both bind-once cycles. | Apply SR-013 early session scope/resource manager/identity registry and closed artifact-command delivery around controller/launcher; no broad host, reverse callback, or generic deferred machinery. |
| Package version/signature/integrity | Absent | No `.abapp`, release version, file checksum manifest, publisher identity, signature verification, or revocation path exists. | Defer distribution claims until defined and enforced. |
| Permissions and isolation | Absent beyond scoping/validation | Manifest v4 has no permissions. Worker code inherits host environment and Node privileges. The app iframe lacks a sandbox attribute. | Treat marketplace execution as blocked on a threat model and enforceable controls. |
| Marketplace | Absent | Public GitHub/default-branch archive import exists, but it is not a signed/versioned marketplace pipeline. | Defer as a separate program after security and release semantics. |

## What The Proposal Gets Right

### 1. Product direction

“One application, replaceable host” is a valuable differentiator. AutoByteus already owns multiple runtimes, orchestration, agents, teams, tools, workspaces, persistence, and communication. A vertical product should consume these rather than recreate them.

### 2. Runtime responsibility model

The proposal correctly rejects the idea that `autobyteus-ts` is the whole platform runtime. The server is the multi-runtime owner and already selects separate backends under `autobyteus-server-ts/src/agent-execution/backends/`.

### 3. Application/platform ownership split

The repository reflects the proposal's strongest boundary: the host presents and guards the application, while the application backend decides when to start agent/team business work. The corrected shared journey is:

`Manifest package baseline -> selected-resource baseline/optional sparse host override -> authoritative effective profile + host validation -> RUNNABLE -> Studio iframe or standalone root -> app backend requires runnable resource -> binding/team runtime -> issued Agent Tools session capability -> authenticated eligible server-tool dispatch -> team handoff -> durable events/projected artifacts`.

Studio remains the optional experimentation surface. Package defaults, not a saved Studio row, are the standalone baseline.

### 4. Server assembly should be reused, not forked

A copied “mini server” would immediately split policy, lifecycle, recovery, and security behavior. The proposal is correct to demand explicit assembly from the same implementation. It is also correct that physical package extraction should follow proven module boundaries rather than precede them.

### 5. Root ownership belongs to the host

The application artifact should not declare itself as the global root. A standalone deployment selects an application and serves its frontend at `/`; Studio continues to host it under Studio-owned navigation and lifecycle.

### 6. Marketplace trust is not passive-file trust

The proposal explicitly recognizes executable backend/tool code as dangerous. That concern is correct; the proposed remedies are merely incomplete today.

### 7. The runtime is prepared infrastructure, not an automatically started run

Each host builds one `ApplicationPlatformRuntime`: the connected application services, managers, factories, stores, and lifecycle needed to serve applications. That build step does not create a new agent or team execution. Application business code remains the normal run trigger; the established recovery phase may restore only legitimate recorded runs. The SR-011 naming correction makes this distinction discoverable without changing the execution lifecycle. SR-013 preserves the distinction and makes the service boundary, artifact delivery, and exact run-resource lifecycle match it.

## Original Supported Production Spines

These paths record the repository baseline against which the proposal was judged. The task implementation has since added provider-local dual-host startup and explicit Studio/standalone server builders; the retained paths remain relevant evidence for the shared runtime/storage/orchestration behavior that the correction must preserve.

### APP-CURRENT-001 — Studio host launch

1. `autobyteus-web/pages/applications/[id].vue` delegates to `ApplicationShell.vue`.
2. The shell loads manifest-declared execution-resource slots and blocks entry until required saved setup is ready.
3. `applicationHostStore.startLaunch(applicationId)` calls `POST /rest/applications/:id/backend/ensure-ready`.
4. `ApplicationEngineHostService` prepares per-app storage and migrations, then spawns the application worker.
5. The worker loads and validates backend definition contract v4.
6. `ApplicationSurface.vue` builds one route-visit-scoped iframe launch descriptor.
7. `ApplicationIframeHost.vue` validates window, origin, application ID, and iframe launch ID, then posts the v4 bootstrap envelope.
8. App code calls `startHostedApplication`, which builds an application client from fixed HTTP/WebSocket endpoint bases.

### APP-CURRENT-002 — Application-owned agent/team execution

1. Application backend code calls `context.agentResources.getConfigured(slotKey)`.
2. It constructs the concrete current launch request and calls `context.agentExecution.startAgent(...)` or `startAgentTeam(...)`.
3. Worker IPC routes the named capability to `ApplicationOrchestrationHostService`.
4. The platform validates the resource reference and starts the actual server-owned runtime.
5. Durable per-app binding and global run lookup state are recorded.
6. Lifecycle events are journaled and delivered at least once to application handlers.
7. Published artifacts are relayed best-effort and can be reconciled through app-scoped reads.

### APP-CURRENT-003 — Storage lifecycle

1. The platform derives the canonical per-app storage root from `applicationId`.
2. It prepares platform-owned `platform.sqlite` and app-owned `app.sqlite`.
3. App SQL migrations execute lexicographically against `app.sqlite` only.
4. Applied checksums prevent silent migration drift.
5. The worker receives the app database path/URL in `ApplicationStorageContext`.

These are real foundations. The standalone path should reuse them rather than invent parallel run, storage, or package loaders.

## Original Architecture Gaps And Remaining Corrections

### P0-1 — “Transport” conflated bootstrap with network traffic — resolved by the implemented macro slice

The proposal names `StudioIframeTransport` and `StandaloneSameOriginTransport`. That terminology does not match the current physical path:

- iframe `postMessage` is used only to deliver bootstrap metadata;
- application queries, commands, GraphQL, notifications, custom WebSockets, and direct agent communication use HTTP/WebSocket endpoints after bootstrap; and
- the lower-level `ApplicationClientTransport` already represents the request/communication abstraction.

**Correction:** introduce a host-specific **bootstrap provider**, not two unrelated business transports. For example:

- `StudioIframeBootstrapProvider` obtains the strict v4/vNext bootstrap via `postMessage`;
- `StandaloneSameOriginBootstrapProvider` obtains equivalent bootstrap data from a same-origin host endpoint or injected document data; and
- both construct the existing shared HTTP/WebSocket client transport.

The app entrypoint should become host-neutral (`startApplication` or equivalent), while host selection remains outside application business code.

### P0-2 — Proposed package and manifest examples are incompatible with current v4 — deferred intentionally

Current package and identity facts:

- an importable package root must contain `applications/` and may contain multiple apps;
- canonical application identity is an opaque encoding of `(packageId, localApplicationId)`;
- manifest v4 rejects unknown top-level fields;
- local IDs disallow dots, so `com.example.evidence-desk` is invalid as a current local ID;
- current runtime folders are `ui/`, `backend/`, `agents/`, and `agent-teams/`; and
- the current agent definition file is `agent.md`, not `AGENT.md`.

The proposal's `version`, `publisher`, `platformVersion`, `resources`, `capabilities`, `runtimeRequirements`, permissions, dependencies, `.abapp`, integrity, and signature fields are future contract work, not additive documentation.

**Correction:** define three terms explicitly:

1. **application project** — one developer source tree;
2. **application bundle** — one runnable application under the current package root; and
3. **application release artifact (`.abapp`)** — a future immutable, versioned, signed distribution unit containing exactly one application release.

Use manifest v4 unchanged for the first portability proof. If distribution metadata is later required, design a clean new contract version and migrate all in-tree apps; do not silently widen v4 or maintain dual compatibility readers indefinitely.

### P0-3 — Subprocess separation is not marketplace isolation — remains out of this trusted-package slice

`ApplicationWorkerSupervisor` starts Node with the bundle as `cwd`, inherits all of `process.env`, and applies no Node permission flags, OS sandbox, container boundary, filesystem allowlist, network allowlist, syscall restriction, or secret filtering. Application code can import Node APIs available in its self-contained bundle. The application UI iframe also has no `sandbox` attribute.

Current protections are valuable but different:

1. strict manifest/path validation;
2. canonical application identity and orchestration scoping;
3. app/platform SQLite separation and guarded migrations;
4. IPC-mediated runtime context capabilities; and
5. worker crash containment.

They do not make third-party backend/frontend code safe.

**Correction:** classify MVP packages as trusted first-party code. Before marketplace execution, specify and prove:

- frontend origin/sandbox/CSP policy;
- worker filesystem, environment, process, subprocess, and network policy;
- platform capability authorization and quotas;
- secret delivery and redaction;
- tool execution policy;
- package signature, publisher trust, revocation, and update approval; and
- audit logging and incident containment.

Displaying a permission list is not an enforcement mechanism.

### P0-4 — Original server construction could not express a bounded standalone surface — resolved by the implemented macro slice

`server-runtime.ts` always registers MCP, gateway, permissive CORS, multipart, WebSockets, mobile static content, every REST route, every GraphQL resolver, remote access policy, managed messaging, background tasks, and application recovery. REST and GraphQL owners use fixed registries. No `AutoByteusPlatformModule` or composition folder exists.

**Correction:** the first proof must use explicit `buildStudioServer` and `buildStandaloneApplicationServer` assembly roots. Standalone registers root/readiness/bootstrap and selected-application browser ingress plus the required session-scoped `/mcp/agent-tools/:sessionId` runtime callback. That internal bearer-capability route is not the optional external `/mcp/gateway`, which remains Studio-only. Loopback does not authorize broad `buildApp()` as fallback. Extract explicit construction/start/stop owners and avoid a generic locator.

### P1-1 — Application resources are not yet closed portable dependencies — remains a bounded limitation

Bundled agents and teams are application-scoped. Skills and tools are not packaged by the devkit, and agent configs resolve their names through platform registries. Execution-resource slots permit shared definitions by default and shared refs are unversioned IDs.

**Correction:** distinguish:

- bundled owned resources;
- explicit versioned application dependencies;
- host/operator-selected execution resources; and
- forbidden ambient discovery.

The first proof may use bundled agents/teams plus named built-in tools on a declared supported host, but it must not claim that skills/tools are fully portable yet.

### P1-2 — One `capabilities` array cannot own server assembly, compatibility, and security — deferred contract work

The proposal uses “capability” for at least three different concepts:

1. application feature/API usage;
2. server module dependencies needed for assembly; and
3. sensitive permissions requested from the operator.

**Correction:** keep these separate. Each requires its own identifier namespace, version/compatibility rule, required/optional behavior, failure mode, and enforcement owner. Transitive dependencies and runtime-adapter availability also need an owner.

### P1-3 — Version declarations are not fully enforced compatibility — deferred release work

The backend manifest parses `targetRuntime.semver`, but repository search found no runtime-range comparison before worker startup. SDK compatibility uses exact contract constants, not negotiated ranges. Current GitHub import downloads the repository's current default branch rather than an immutable release.

**Correction:** future release compatibility must define:

- immutable artifact version and digest;
- manifest/SDK/platform contract compatibility;
- Node/runtime-adapter compatibility enforcement;
- dependency resolution and lock semantics;
- upgrade/rollback and data migration ownership; and
- how increased permissions block automatic update.

### P1-4 — Standalone operations were underdefined — bounded local-host decisions are now implemented

A real product host needs more than serving `/` and starting a process. Missing decisions include readiness, graceful shutdown/drain, worker crash behavior, data directories, secrets/provider configuration, backups, upgrade/rollback, logs/metrics, bind address/TLS/reverse-proxy contract, WebSocket routing, persistent file/object storage, and concurrency.

**Correction:** explicitly bound the first standalone host to single-node, local SQLite, trusted packages, one selected application, and documented process/data lifecycle. Multi-tenant or horizontally scaled operation is a later architecture.

### P1-5 — Runnable defaults plus an authoritative sparse-edit projection — bounded current correction

The original implementation could select a bundled team while leaf definitions omitted `llmModelIdentifier`, then report `READY` with a null profile. That foundation is corrected: standalone-enabled packages now carry complete defaults and readiness is guarded. CRR-012 exposes the remaining related edit problem: the server computes an alternate selected-resource baseline but omits it from the Studio view, so first-save/field-clear inheritance can use no context or the old post-overlay result.

**Correction:** retain complete package defaults and the three statuses, but distinguish manifest package baseline, selected-resource definition baseline, sparse saved override, and effective result. The same launch owner exposes the current selected baseline and a no-write preview for an unsaved selection; Studio never traverses definitions or inherits from its post-overlay result. Pack/validate applies one recursive schema-aware portable policy: exact supported token-count/pricing fields remain valid, while password/secret/authorization/token-value/endpoint/workspace fields are rejected at any depth. No baseline/preview persistence, fallback, compatibility branch, or mandatory standalone setup UI is introduced.

### P1-6 — Agent Tools route parity is implemented, but application publication selects the wrong manager/publisher — resolved in the functional baseline

Run provisioning issues a session descriptor for eligible server-owned Agent Tools and selected available MCP-origin tools at `/mcp/agent-tools/:sessionId`. Both hosts now register the bearer-protected callback. API-REV-007 proves both Brief members authenticate, list real `publish_artifacts` and `send_message_to`, and complete recipient-name handoff. Publication still fails because `PublishArtifactsMcpAdapterProvider` captured a cached process-global `PublishedArtifactPublicationService`, while the active runs belong to the application-runtime-scoped `AgentRunManager`.

**Correction:** the functional route/session/publication behavior is now passed. Preserve the existing route, capability gates, descriptor, URL derivation, eligibility, and dispatcher semantics. SR-013 replaces only the construction mechanism: create the early application session scope, queue-backed artifact relay, run resource manager, and exact active registry; then create the publication service, scoped issuer, and run managers. Sessions receive the concrete publisher at construction; run removal revokes exact sessions and observers without a later manager callback; artifact delivery ensures/restarts the worker before handler invoke. No bind-once publisher or application fallback remains. Do not use mutable singleton replacement, request-time application-runtime lookup, catalog merge, package branches, a second route/gateway, compatibility fallback, user authentication, or runtime-internal changes.

The general `/mcp/gateway` exists so external MCP clients can call the Studio process’s host-configured `ToolOrigin.MCP` registry tools. MCP Server Management performs provisioning/import; the gateway re-exports those tools and excludes AutoByteus run-dependent tools. It is neither application provisioning nor an application/run-scoped catalog. Standalone does not inherit Studio MCP configuration. A future application-owned MCP resource contract may reuse shared provisioning internals, but package declaration, host-secret binding, lifecycle/readiness, and application scoping are separate work.


### P1-7 — Clear names still wrapped a broad runtime, mixed package refresh, and two construction cycles

IR-016 solved the vocabulary problem and all behavior passed, but CRR-031 traced three remaining structural issues: route/host callers select internals from a 19-field runtime; Studio package construction closes callbacks over later-assigned owners while package commands own cross-subsystem refresh; and publication/session plus engine/event dependency cycles remain as permanent bind-once objects. ARCH-REV-010 confirms the first two SR-012 directions and narrows the remaining design work to two source-grounded lifecycle edges.

**Correction:** expose only lifecycle plus exact REST/realtime/host-management projections. Construct package registry state first and one catalog-refresh coordinator after bundle/runtime/definition owners exist. For run/session cleanup, create an early application MCP session scope, `AgentRunResourceManager`, and identity-checked `ActiveAgentRunRegistry`; every inactive discovery/replacement, accepted terminate, stop-all, rollback, and duplicate-removal path consumes an exact typed result and releases sessions plus file/artifact/memory observers once, without a registry-to-manager callback. For artifact delivery, add a closed complete-command queue and a late delivery service that always calls `ApplicationEngineLauncher.ensureReady` before `ApplicationEngineController.invokeApplicationArtifactHandler`; preserve active-listener fire-and-forget, fallback awaiting, persisted-projection semantics, per-run FIFO, and drain-before-engine-stop. Remove both bind-once files and the broad engine-host service. No generic facade/container/event bus/deferred handler, reverse callback, or data migration is justified.

## Claims That Need Corrective Language

| Current proposal language or implication | Problem | Recommended replacement |
| --- | --- | --- |
| “The frontend, backend, migrations, agents, teams, skills, tools, and tests remain the same.” | Skills/tools are not portable package-owned resources today; deployment config necessarily varies. | “The same application source and built application artifacts run without host-specific business-code branches. Host configuration, secrets, URLs, and operational storage placement remain host-owned.” |
| `StudioIframeTransport` vs `StandaloneSameOriginTransport` | Misstates current traffic; iframe messaging is bootstrap only. | Use host-specific bootstrap providers plus one shared HTTP/WebSocket application-client transport. |
| “The same backend bundle must run in both modes.” | Directionally right but unproven. | Keep as an MVP invariant and verify identical backend entry digest in both hosts. |
| Proposed root-level manifest sample | Incompatible with current package root, ID rules, folder names, and manifest v4. | Label it “future contract sketch”; use current v4 for the first proof and design vNext separately. |
| Permission declaration + process isolation | Suggests policy declarations provide safety. | State that declarations are metadata until enforced by frontend/worker/platform isolation controls. |
| “Initial implementation can run full server headlessly.” | Conflicts with the bounded product surface and leaves unrelated route/startup ownership in the standalone process even when loopback-bound. | Reject the current broad `buildApp()` server for standalone. Construct the explicit selected-application server from named shared runtime prerequisites and verify its exact route inventory. |
| Phase 1 “universal package” before standalone proof | Risks redesigning the artifact without a second real host. | Prove current bundle through both hosts first; evolve the artifact only from observed host differences. |
| “No mock substitution” | Correct for conformance but conflicts with current default dev behavior. | Keep mocks for unit/contract iteration only; require real backend/runtime paths for portability conformance. |
| “A manifest default team makes the application standalone-ready.” | A resource reference does not supply every leaf runtime/model or prove host availability. | “A standalone-enabled package validates complete application-owned leaf defaults; the host then validates runtime/model/credentials before reporting `RUNNABLE`.” |
| “Standalone needs a setup screen to choose a model.” | Makes host state the baseline and duplicates Studio. | “Standalone normally uses package defaults. Studio/host overrides are optional overlays; invalid package or missing host requirements fail explicitly.” |
| “MCP gateway is Studio-only, so standalone needs no MCP route.” | Conflates the general external-client gateway with the internal session callback already issued to runtimes. | “Both hosts register the existing capability-scoped Agent Tools session callback for eligible server-owned/selected available MCP-origin tools. Only Studio registers the separate general external MCP gateway.” |
| Marketplace follows portability | Trust work is a separate program. | Gate marketplace execution on sandbox, signature, revocation, permission enforcement, immutable release, and audit controls. |

## Recommended First Portability Proof

### Scope

Use one representative existing bundle, preferably **Brief Studio**, because it exercises:

- current manifest v4 and devkit packaging;
- a bundled agent team;
- application-owned backend state;
- complete application-owned agent/team launch defaults;
- optional saved Studio execution-resource override and reset;
- real runtime launch;
- application notifications/events; and
- published artifacts.

The proof should not add marketplace fields, package signing, Vue/React scaffolds, multi-tenancy, or third-party execution.

### Required target behavior

1. The same generated application package contents are installed/selected for both hosts.
2. Studio continues to run its iframe lifecycle, shows package defaults, and may persist/reset optional runtime/model overrides without mutating the package.
3. A new standalone host selects exactly one application through deployment configuration and serves the same UI artifact as the branded root at `/`.
4. The app frontend uses one host-neutral startup API with host-owned bootstrap providers; no business component branches on Studio vs standalone.
5. Both hosts start the same backend entry and use the same application engine, storage lifecycle, migrations, resource resolver, orchestration, event, and artifact owners.
6. Standalone development uses the real application worker and a real agent/team backend, not the current mock backend.
7. The standalone server registers only its explicit selected-application browser surface plus the capability-scoped internal Agent Tools runtime callback. Broad Studio/admin route registries and the external MCP gateway are not constructed or registered in that process.
8. The MVP remains local/self-hosted and introduces no user/account subsystem.
9. From an application folder, `pnpm start` runs the already-built `dist/importable-package` through the production standalone server; it does not rebuild, watch, or substitute mocks.
10. Every standalone-capable required execution leaf has complete application-owned runtime/model defaults; pack/validate rejects incompleteness. For the maintained Brief and Socratic applications, the user-confirmed leaf default is `codex_app_server` / `gpt-5.6-luna`.
11. Fresh standalone data uses package defaults without a setup UI or preseeded override row; the host fails before listen when runtime/model/credentials cannot be resolved.
12. The exact application-runtime-scoped team-definition service reaches member prompt construction, including package team instructions.
13. If a Studio-saved shared resource disappears or saved team-member topology becomes stale, the valid package is not blamed and its baseline is not executed silently; Studio blocks run, explains the saved override, and restores package evaluation only after explicit replacement/reset.
14. Selecting an alternate resource before save or clearing a saved field uses the server-computed selected-resource baseline/preview. Studio persists only explicit sparse fields, handles mixed-runtime inheritance without implicit defaults, and PUT revalidates resource/topology.
15. Package portable configuration accepts exact typed token-count/pricing fields and recursively rejects credential/password/authorization/token-value/endpoint/workspace fields with path-only diagnostics.
16. Both hosts register the existing Agent Tools session callback before static fallback. The server-owned `AgentToolsMcpRuntime` supplies one exact registry/catalog/dispatcher family to route registration and application session issuance.
17. Each application-created session carries the exact application-runtime-scoped publication publisher. `publish_artifacts` produces the application-runtime publication journal and application projection; recipient-name `send_message_to` remains session-context delivery. General `/mcp/gateway` stays Studio-only.
18. Server/route/package/run/engine construction uses the SR-013 narrow and acyclic owners while all API-REV-011 behavior remains unchanged: artifact delivery ensures/restarts an exited worker before invoke, and every exact run-removal origin revokes sessions plus detaches file/artifact/memory observers once.

### Exit criteria

- **MVP-EC-001:** One generated package passes current v4 validation and its content digest is identical in the Studio and standalone scenarios.
- **MVP-EC-002:** The same frontend entry and backend bundle entry digest are observed in both hosts.
- **MVP-EC-003:** Studio package-default entry plus optional override/run/reset-to-package-default/reload/exit journeys pass without package mutation.
- **MVP-EC-004:** Fresh-root standalone resolves the maintained application’s `codex_app_server` / `gpt-5.6-luna` package defaults and completes a real run without iframe hints, Studio globals, setup UI, or a preseeded configuration row.
- **MVP-EC-005:** The same app migration files produce the expected app-owned schema/state in each host-specific data root.
- **MVP-EC-006:** A real bundled agent/team execution starts through `context.agentExecution`, emits lifecycle progress, and produces/reconciles a published artifact in both hosts.
- **MVP-EC-007:** Restarting the standalone host preserves app data and restores/reconciles supported binding state according to current orchestration contracts.
- **MVP-EC-008:** No portability conformance scenario uses the devkit mock backend.
- **MVP-EC-009:** Static checks find no imports from `autobyteus-web`, Electron APIs, or server-internal managers in application business code.
- **MVP-EC-010:** A captured standalone public-route inventory contains only the approved application/product ingress; unrelated Studio/admin routes are unreachable externally.
- **MVP-EC-011:** Incomplete standalone package fails pack/validate as `INVALID_PACKAGE`; unavailable runtime/model/credentials yields `HOST_REQUIREMENT_MISSING` with `HOST_CAPABILITY` issues before standalone listen or Studio business entry/action.
- **MVP-EC-012:** Worker/frontend trust limitations are documented and the host refuses packages outside the configured trusted source set.
- **MVP-EC-013:** `pnpm dev`, `pnpm dev:studio`, `pnpm build`, `pnpm validate`, and `pnpm start` have the approved distinct meanings; the production start path consumes the existing package and writes only to a separate data root.
- **MVP-EC-014:** The application-run readiness result is only `RUNNABLE`, `INVALID_PACKAGE`, or `HOST_REQUIREMENT_MISSING`; no success state carries a null required profile and no business request silently supplies the missing model.
- **MVP-EC-015:** A real Brief member system prompt includes the non-empty package `team.md` instruction through the application-runtime-scoped team-definition service.
- **MVP-EC-016:** Deleting a Studio-selected shared team and separately changing saved team-member topology each yields `HOST_REQUIREMENT_MISSING` with `HOST_OVERRIDE` issue, preserves the package baseline and row, leaves the affected effective configuration null, blocks `requireRunnable`, and becomes eligible for package-default execution only after explicit Reset/delete.
- **MVP-EC-017:** Unsaved alternate selection returns an identity-bound no-write selected-resource baseline; clearing a saved alternate field reveals that definition value; stale preview/PUT races fail without write/fallback; mixed-runtime teams require an explicit common runtime before bulk model selection.
- **MVP-EC-018:** Validator accepts exact `max_tokens`, `token_limit`, `safety_margin_tokens`, and typed pricing fields; recursively rejects nested password, bearer authorization, access-token value, endpoint, and workspace paths without echoing values.
- **MVP-EC-019:** Both hosts register the existing `/mcp/agent-tools/:sessionId` route before static fallback. Fresh standalone Brief uses the actual descriptor/`tools/list` to execute eligible `publish_artifacts` and `send_message_to`, hand off researcher to writer, and project artifacts. Missing bearer reaches the established 401 gate, unknown/unavailable session remains 404, and general `/mcp/gateway` remains unreachable in standalone. Runtime internals are not part of this proof.
- **MVP-EC-020:** Application Agent Tools sessions and the authenticated route use one server-owned `AgentToolsMcpRuntime` registry/catalog/dispatcher family. An application publication call uses only its concrete session publisher and exact application `ActiveAgentRunRegistry`; a deliberately different general-process manager cannot receive its event/journal/projection. Missing/wrong-scope/revoked sessions fail before mutation.
- **MVP-EC-021:** Central framework names follow the implemented responsibility map: servers are `Server`, long-lived connected service sets are `Runtime`, scoped collections are `Manager`, general run lifetime is `Supervisor`, and ordered application stopping is `Coordinator`. Building `ApplicationPlatformRuntime` creates no new agent/team run. Retired names/aliases remain absent; SR-013 deletes both `BindOnce*` implementations.
- **MVP-EC-022:** Runtime exposes exactly lifecycle/REST/realtime/host-management; package import/reload/remove uses one late refresh coordinator with exact rollback/order; session scope/resource manager/identity registry/publication/issuer and engine/controller/launcher/event/artifact construction are acyclic; both hosts pass the complete API-REV-011 behavior and `73/73` parity unchanged.
- **MVP-EC-023:** After an application worker exits while a provider run remains active, the next accepted `publish_artifacts` command restarts/ensures the worker and invokes the application artifact handler; active-listener failure remains logged/fire-and-forget, fallback remains awaited, and persisted projection is not rolled back by delivery failure.
- **MVP-EC-024:** Inactive discovery/replacement, accepted explicit terminate, stop-all, registration rollback, and stale duplicate removal each identity-remove only the expected run and release session/file/artifact/memory resources exactly once; partial attachment and cleanup failures attempt all recorded cleanup and cannot delete a replacement run.

## Revised Roadmap

### Stage 0 — Contract and threat-boundary decisions

- Freeze terminology: project, bundle, package root, release artifact, host, bootstrap provider, client transport, feature dependency, server-assembly dependency, permission.
- Record the trusted-package limitation.
- Inventory current application platform routes, startup/shutdown services, singleton dependencies, persistence, and background work.
- Freeze the standalone public ingress and readiness contract.

### Stage 1 — Same current bundle, two real hosts

- Preserve manifest v4 and current package loader.
- Extract host-neutral startup around bootstrap acquisition.
- Add standalone product host and same-origin bootstrap.
- Reuse current worker/storage/orchestration owners.
- Require complete package-owned runtime/model defaults for standalone-capable projects.
- Add real dual-host conformance with one representative app, including fresh-root package-default execution.

### Stage 2 — Bounded application-platform runtime and server assembly

- Extract explicit application-platform HTTP/WebSocket registration and lifecycle functions from the monolithic root.
- Establish deterministic process start/recovery/stop plus a separate authoritative application-run readiness invariant.
- Build explicit Studio and standalone server assembly roots; the current full server is never a standalone fallback or interim stage.
- Add standalone operational contracts and route-surface verification.
- Keep the internal Agent Tools MCP session route in both hosts before static fallback and the external gateway Studio-only. Make the shared process transport family explicit, carry the concrete application publisher on scoped sessions, and give the scoped session owner deterministic revoke/close semantics.
- Preserve the passed familiar role vocabulary. Narrow runtime exposure to four projections; separate package commands from ordered catalog refresh; construct early session scope/resource/identity owners before publication/issuance and closed event/artifact delivery paths around controller/launcher; delete both bind-once implementations without aliases, reverse callbacks, or generic deferred handlers.

### Stage 3 — Portable release contract

- Decide single-app immutable `.abapp` structure.
- Define version/digest/dependency metadata and runtime compatibility enforcement.
- Package skills/tools only after their ownership and dependency semantics are explicit.
- Use a clean contract revision rather than widening v4 silently.

### Stage 4 — Developer experience

- Standardize the native application-folder contract: `pnpm dev` for real standalone watch/rebuild/restart, `pnpm dev:studio` for the real Studio host, `pnpm build`, `pnpm validate`, and `pnpm start` for production standalone execution of the existing build.
- Give Brief Studio and Socratic checked-in devkit mappings for their real `frontend-src`, `backend-src`, root team, entrypoint, migration, exposure, and output inputs; retire their custom package builders so all five commands share one pack owner.
- Keep mock/iframe-contract machinery test-only; it is not a public product command and cannot satisfy conformance.
- Make `build`/project `validate` reject incomplete defaults and recursively non-portable host-secret fields while preserving exact approved tuning/pricing. Make Studio overrides optional and resettable without changing package bytes.
- Preserve invalid saved overrides as diagnosable host-local blockers; never classify them as package failure, auto-delete them, or silently run the package baseline.
- Expose selected-resource baseline/unsaved preview from `ApplicationLaunchConfigurationService`; remove UI package/effective inference, persist only sparse fields, and represent mixed-runtime inheritance explicitly.
- Require reliable full reload/restart in the first slice; framework-specific HMR and Vue/React scaffolds remain later improvements.

### Stage 5 — Security and marketplace foundation

- Implement frontend and worker isolation, environment/secret minimization, network/filesystem policy, capability authorization, quotas, audit logging, signing, publisher trust, revocation, immutable versions, and update-permission approval.
- Conduct a threat-model/security review before accepting arbitrary third-party packages.

### Stage 6 — Distribution optimization

- Package only required modules/runtime adapters after server/runtime boundaries are proven.
- Add deployment profiles, build/release automation, rollback, and multi-node work only when product requirements demand them.

## Decision Table

| Proposal element | Decision | Reason |
| --- | --- | --- |
| Universal application product vision | Accept | Strong leverage of existing platform capabilities. |
| Same business code/artifacts across hosts | Accept with precise wording | Correct invariant; host config and operations will differ. |
| Application owns product UX and business data | Accept | Correct domain ownership. |
| Platform owns runtime/orchestration/scoping/isolation | Accept | Matches existing runtime ownership and required trust boundary. |
| Current runtime architecture description | Accept | Repository evidence supports it. |
| Host-specific transport classes as written | Revise | Bootstrap and business communication are different concerns. |
| Proposed manifest/sample directory as near-term contract | Reject | Incompatible with strict current v4 and package semantics. |
| Current package as universal proof artifact | Accept for the trusted local proof | Launch/edit/prompt/route/publication/messaging/projection/recovery and exact package parity pass through API-REV-011. |
| Full server headlessly for first proof | Reject | Standalone must use the explicit selected-application server. Named underlying runtime prerequisites may be reused, but the broad server/route assembly is neither a fallback nor an implementation stage. |
| Explicit capability-driven server assembly | Accept as target, revise mechanism | The original construction path was monolithic; avoid generic service-locator architecture. |
| Mock-free portability conformance | Accept | Required to prove real runtime behavior. |
| Mocks for local unit iteration | Retain | Useful when clearly not conformance evidence. |
| Marketplace after simple signing/permissions | Reject | Enforceable isolation/trust/revocation must precede arbitrary code. |
| Vue/React scaffold priority | Defer | Does not validate portability or trust boundaries. |
| Complete application-owned runtime/model defaults | Accept as foundation | Standalone model selection must travel with the application, while host capabilities/secrets remain local. |
| Mandatory standalone setup UI or copied Studio state | Reject | Duplicates the launch-configuration service and makes a valid package depend on host seeding. |
| Studio runtime/model override and reset | Accept | Useful experimentation overlay when selected-resource baseline/preview comes from the same launch service, persistence stays sparse, and package defaults are never mutated. |
| Silent package fallback when a saved override becomes invalid | Reject | Changes the user’s selected execution resource and hides host-state drift; require scoped diagnostics and explicit replacement/reset. |
| `READY` with nullable required launch profile | Reject | Resource selection is not runnable readiness. |
| Recursive portable package launch policy | Accept as required boundary | Closed schemas preserve valid tuning/pricing while rejecting credentials/endpoints/host paths at any depth. |
| UI reconstruction of selected definition baseline | Reject | It duplicates server traversal/precedence and can self-inherit from post-overlay values; use the launch service view/preview. |
| Skills/tools automatically portable | Reject for current state | Current dependencies are ambient platform registries. |
| Internal Agent Tools MCP callback in both hosts | Accept as required runtime infrastructure | Eligible server-owned/configured-MCP tools depend on it. Preserve its route/security contract, but make process transport and session execution capability explicit so application-runtime-sensitive adapters cannot fall back globally. |
| External MCP gateway in standalone | Reject | It is a different optional generic integration surface and would expand AC-010 unnecessarily. |
| Change or newly specify Codex/Claude runtime-internal tools in this ticket | Reject | `origin/personal` behavior remains untouched; this ticket owns only the application-platform route/server-assembly boundary. |
| Treat Studio MCP configuration or `/mcp/gateway` as an application dependency | Reject | The gateway serves external clients over host-configured MCP-origin tools; focused applications require a future application-owned MCP resource/provisioning contract. |
| Broad Agent Tools aggregate/runtime rewrite | Reject | CRR-020 justifies one explicit process family plus one narrow application-runtime publication publisher, not a general tool-runtime redesign or duplicate catalog/route. |
| Session-bound concrete `PublishedArtifactPublisher` over `ActiveAgentRunRegistry` | Accept as required boundary | The authenticated session carries the exact application owner without request-time lookup; SR-013's early session scope/resource manager/identity registry makes the publisher constructible before the later issuer and removes the bind-once/reverse-cleanup cycle. |
| Agent Tools compatibility alias, fallback, or persisted session path | Reject | The bounded fix reuses the existing route and behavior directly. |
| Familiar central framework role vocabulary | Accept; implemented and passed | Preserve the IR-016 map; do not restore old names while removing the two proxy types. |
| Narrow runtime/package/run/engine ownership | Accept as behavior-neutral correction | CRR-031 shows boundary leakage, temporal package callbacks, and avoidable cycles; ARCH-REV-010 requires the exact SR-013 ensure/restart and run-resource cleanup edges. Apply the supplement without changing product behavior. |
| Compatibility aliases for renamed private/internal symbols | Reject | The server package is private and no repository-external consumer was found; aliases would preserve the ambiguity without a supported contract need. |

## Final Recommendation

Approve the proposal as a **strategic direction**, not as the implementation specification. Authorize only the bounded, trusted-package, single-node dual-host proof first. Require evidence from that proof before changing the package contract or funding marketplace work.

The bounded dual-host proof and SR-011 vocabulary are functionally complete and validated. Before delivery resumes, apply the behavior-neutral SR-013 structural correction: retain the approved four runtime projections and package refresh owners; construct the application session scope, run resource manager, identity registry, publication, and issuer in natural order; split engine control from launch; preserve the journal wakeup path; add the closed artifact-command delivery path with ensure/restart before invoke; and delete both bind-once proxies and the broad engine-host service. Retain every CRR-029/API-REV-011/CRR-030 behavior, including exact run cleanup, the zero-run-on-runtime-build invariant, and `73/73` package parity. Do not redesign provider-native tools, expose the general gateway, inherit Studio MCP state, change routes/data/packages, add reverse callbacks/generic framework machinery, or expand into a repository-wide singleton rewrite. The broad-suite `APIE2E-REPO-005` diagnostic remains separate and unattributed.
