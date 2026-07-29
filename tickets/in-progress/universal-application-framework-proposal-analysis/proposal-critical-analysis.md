# Critical Analysis — AutoByteus Universal Application Framework Proposal

## Document Status

- Assessment status: Complete for the repository baseline recorded below
- Recommendation status: **Approve the vision conditionally; revise the proposal before treating it as an implementation plan**
- Approval applicability: Approved/refined through 2026-07-27. User/account concerns are excluded, and the native application-folder commands are `dev`, `dev:studio`, `build`, `validate`, and `start`. SR-003 removes a contradictory fallback allowance and supplies maintained-project design precision without changing that approved behavior.
- Source proposal: [sources/autobyteus-vertical-application-developer-experience-proposal.md](sources/autobyteus-vertical-application-developer-experience-proposal.md)
- Requirements basis: [requirements.md](requirements.md)
- Evidence log: [investigation-notes.md](investigation-notes.md)
- Repository baseline: refreshed at the user's request to `origin/personal` at `6caf809303294252c109420b238588f0c68aca6a` on 2026-07-29

## Executive Verdict

The proposal has a strong product thesis and the right high-level ownership split: an application should own its product UX and business state, while AutoByteus should own runtime execution, orchestration, application scoping, and host integration. The repository already contains more of that foundation than the proposal implies: Studio application discovery, a strict iframe bootstrap contract, a separate application worker process, app-owned SQLite migrations, durable application-to-agent/team bindings, bundled agents and teams, direct frontend agent communication, and a first devkit all exist.

The proposal is **not implementation-ready**. It treats several absent or partial capabilities as though they are small adaptations:

1. there is no standalone application product host;
2. the frontend startup API is iframe-specific rather than host-neutral;
3. the server has one broad, fixed composition root rather than capability-driven application composition;
4. current installable package semantics and manifest v4 do not match the proposed artifact or sample manifest;
5. skills, tools, and shared execution resources are not closed, versioned application dependencies;
6. the worker subprocess is not a security sandbox and inherits the full server environment;
7. the Studio application iframe has no `sandbox` attribute;
8. version strings and capability/permission declarations do not yet amount to compatibility or security enforcement; and
9. there is no real dual-host conformance suite.

The right decision is therefore **proceed, but narrow and reorder**. Prove one existing application bundle through the current Studio path and a deliberately bounded standalone host before expanding manifest v4, extracting packages, or building a marketplace. Treat all packages as trusted first-party code until an enforceable isolation and publisher-trust model exists.

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
| Frontend SDK transport injection | Partial | `ApplicationClientTransport` is injectable and the current implementation uses HTTP/WebSocket endpoints, but `startHostedApplication` requires iframe hints and `window.parent.postMessage`. | Refactor bootstrap acquisition, not business-client APIs. |
| Backend SDK host neutrality | Partial, comparatively strong | The SDK is mainly types, `defineApplication`, target-address builders, and launch-profile helpers. Host-provided context capabilities carry runtime calls. | Reuse the context-capability boundary; correct proposal examples to current APIs. |
| Portable package | Partial and semantically mismatched | Current package roots contain `applications/` and can hold multiple applications. A generated devkit package contains one app under that container. There is no immutable release artifact. | Separate package-root, application-bundle, and signed-release terminology. |
| Bundled agents and teams | Existing | Bundle discovery creates canonical application-owned agent/team identities. | Reuse. |
| Bundled/versioned skills and tools | Absent | Devkit copies agents and agent teams only. Agent configs resolve named skills/tools through platform registries. | Exclude from MVP portability guarantee or design an explicit dependency model later. |
| No hidden global resources | Not satisfied | Execution-resource slots default to both `bundle` and `shared`; all visible shared agents/teams are listable and shared refs use unversioned definition IDs. | Revise the claim and introduce explicit, versioned dependency semantics before ecosystem distribution. |
| Standalone product host at `/` | Absent | No same-origin bootstrap provider, standalone lifecycle composition, product-root server, or application-selecting host configuration was found. | This is the main MVP feature, not an already available mode. |
| Capability-driven server composition | Absent | `server-runtime.ts`, REST, WebSocket, and GraphQL registration are fixed and broad; no platform module contract/composition folder exists. | First inventory and extract explicit application-platform composition boundaries. |
| Vue/React scaffolds and HMR | Absent | The devkit has one plain TypeScript/CSS template and one-shot esbuild output. | Defer until host portability works. |
| Standalone-first dev command | Absent | `autobyteus-app dev` renders a host bar and iframe. Without real server URLs it uses a mock backend. | Do not describe current dev as standalone product execution. |
| Dual-host conformance | Absent | Current durable tests cover iframe v4/client behavior only. | Add real same-package Studio/standalone scenarios as an MVP exit gate. |
| Package version/signature/integrity | Absent | No `.abapp`, release version, file checksum manifest, publisher identity, signature verification, or revocation path exists. | Defer distribution claims until defined and enforced. |
| Permissions and isolation | Absent beyond scoping/validation | Manifest v4 has no permissions. Worker code inherits host environment and Node privileges. The app iframe lacks a sandbox attribute. | Treat marketplace execution as blocked on a threat model and enforceable controls. |
| Marketplace | Absent | Public GitHub/default-branch archive import exists, but it is not a signed/versioned marketplace pipeline. | Defer as a separate program after security and release semantics. |

## What The Proposal Gets Right

### 1. Product direction

“One application, replaceable host” is a valuable differentiator. AutoByteus already owns multiple runtimes, orchestration, agents, teams, tools, workspaces, persistence, and communication. A vertical product should consume these rather than recreate them.

### 2. Runtime responsibility model

The proposal correctly rejects the idea that `autobyteus-ts` is the whole platform runtime. The server is the multi-runtime authority and already selects separate backends under `autobyteus-server-ts/src/agent-execution/backends/`.

### 3. Application/platform ownership split

The repository already reflects the proposal's strongest boundary: the Studio host starts the application, but the application backend decides when and how to start agent or team work. The current route journey is:

`Applications card -> setup-first route -> saved execution-resource configuration -> Enter application -> ensure backend ready -> iframe v4 bootstrap -> app backend starts agent/team through context capabilities -> durable binding/events/artifacts`.

That path should remain the governing path for both hosts.

### 4. Server composition should be reused, not forked

A copied “mini server” would immediately split policy, lifecycle, recovery, and security behavior. The proposal is correct to demand composition from the same implementation. It is also correct that physical package extraction should follow proven module boundaries rather than precede them.

### 5. Root ownership belongs to the host

The application artifact should not declare itself as the global root. A standalone deployment selects an application and serves its frontend at `/`; Studio continues to host it under Studio-owned navigation and lifecycle.

### 6. Marketplace trust is not passive-file trust

The proposal explicitly recognizes executable backend/tool code as dangerous. That concern is correct; the proposed remedies are merely incomplete today.

## Current Supported Production Spines

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

## Critical Architecture Gaps

### P0-1 — “Transport” currently conflates bootstrap with network traffic

The proposal names `StudioIframeTransport` and `StandaloneSameOriginTransport`. That terminology does not match the current physical path:

- iframe `postMessage` is used only to deliver bootstrap metadata;
- application queries, commands, GraphQL, notifications, custom WebSockets, and direct agent communication use HTTP/WebSocket endpoints after bootstrap; and
- the lower-level `ApplicationClientTransport` already represents the request/communication abstraction.

**Correction:** introduce a host-specific **bootstrap provider**, not two unrelated business transports. For example:

- `StudioIframeBootstrapProvider` obtains the strict v4/vNext bootstrap via `postMessage`;
- `StandaloneSameOriginBootstrapProvider` obtains equivalent bootstrap data from a same-origin host endpoint or injected document data; and
- both construct the existing shared HTTP/WebSocket client transport.

The app entrypoint should become host-neutral (`startApplication` or equivalent), while host selection remains outside application business code.

### P0-2 — Proposed package and manifest examples are incompatible with current v4

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

### P0-3 — Subprocess separation is not marketplace isolation

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

### P0-4 — Current server construction cannot yet express a bounded standalone surface

`server-runtime.ts` always registers MCP, gateway, permissive CORS, multipart, WebSockets, mobile static content, every REST route, every GraphQL resolver, remote access policy, managed messaging, background tasks, and application recovery. REST and GraphQL owners use fixed registries. No `AutoByteusPlatformModule` or composition folder exists.

**Correction:** the first proof must replace the current broad `buildApp()` path with explicit Studio and standalone compositions. The standalone composition may initialize only the named shared runtime prerequisites it actually depends on and registers only root/readiness/bootstrap plus selected-application ingress. Loopback remains the default network boundary, but loopback binding does not authorize the broad server composition as a fallback. Extract explicit registration/start/stop owners and avoid a generic service locator.

### P1-1 — Application resources are not yet closed portable dependencies

Bundled agents and teams are application-scoped. Skills and tools are not packaged by the devkit, and agent configs resolve their names through platform registries. Execution-resource slots permit shared definitions by default and shared refs are unversioned IDs.

**Correction:** distinguish:

- bundled owned resources;
- explicit versioned application dependencies;
- host/operator-selected execution resources; and
- forbidden ambient discovery.

The first proof may use bundled agents/teams plus named built-in tools on a declared supported host, but it must not claim that skills/tools are fully portable yet.

### P1-2 — One `capabilities` array cannot own composition, compatibility, and security

The proposal uses “capability” for at least three different concepts:

1. application feature/API usage;
2. server module dependencies needed for composition; and
3. sensitive permissions requested from the operator.

**Correction:** keep these separate. Each requires its own identifier namespace, version/compatibility rule, required/optional behavior, failure mode, and enforcement owner. Transitive dependencies and runtime-adapter availability also need an owner.

### P1-3 — Version declarations are not fully enforced compatibility

The backend manifest parses `targetRuntime.semver`, but repository search found no runtime-range comparison before worker startup. SDK compatibility uses exact contract constants, not negotiated ranges. Current GitHub import downloads the repository's current default branch rather than an immutable release.

**Correction:** future release compatibility must define:

- immutable artifact version and digest;
- manifest/SDK/platform contract compatibility;
- Node/runtime-adapter compatibility enforcement;
- dependency resolution and lock semantics;
- upgrade/rollback and data migration ownership; and
- how increased permissions block automatic update.

### P1-4 — Standalone operations are underdefined

A real product host needs more than serving `/` and starting a process. Missing decisions include readiness, graceful shutdown/drain, worker crash behavior, data directories, secrets/provider configuration, backups, upgrade/rollback, logs/metrics, bind address/TLS/reverse-proxy contract, WebSocket routing, persistent file/object storage, and concurrency.

**Correction:** explicitly bound the first standalone host to single-node, local SQLite, trusted packages, one selected application, and documented process/data lifecycle. Multi-tenant or horizontally scaled operation is a later architecture.

## Claims That Need Corrective Language

| Current proposal language or implication | Problem | Recommended replacement |
| --- | --- | --- |
| “The frontend, backend, migrations, agents, teams, skills, tools, and tests remain the same.” | Skills/tools are not portable package-owned resources today; deployment config necessarily varies. | “The same application source and built application artifacts run without host-specific business-code branches. Host configuration, secrets, URLs, and operational storage placement remain host-owned.” |
| `StudioIframeTransport` vs `StandaloneSameOriginTransport` | Misstates current traffic; iframe messaging is bootstrap only. | Use host-specific bootstrap providers plus one shared HTTP/WebSocket application-client transport. |
| “The same backend bundle must run in both modes.” | Directionally right but unproven. | Keep as an MVP invariant and verify identical backend entry digest in both hosts. |
| Proposed root-level manifest sample | Incompatible with current package root, ID rules, folder names, and manifest v4. | Label it “future contract sketch”; use current v4 for the first proof and design vNext separately. |
| Permission declaration + process isolation | Suggests policy declarations provide safety. | State that declarations are metadata until enforced by frontend/worker/platform isolation controls. |
| “Initial implementation can run full server headlessly.” | Conflicts with the bounded product surface and leaves unrelated route/startup ownership in the standalone process even when loopback-bound. | Reject the current broad `buildApp()` composition for standalone. Construct the explicit selected-application composition from named shared runtime prerequisites and verify its exact route inventory. |
| Phase 1 “universal package” before standalone proof | Risks redesigning the artifact without a second real host. | Prove current bundle through both hosts first; evolve the artifact only from observed host differences. |
| “No mock substitution” | Correct for conformance but conflicts with current default dev behavior. | Keep mocks for unit/contract iteration only; require real backend/runtime paths for portability conformance. |
| Marketplace follows portability | Trust work is a separate program. | Gate marketplace execution on sandbox, signature, revocation, permission enforcement, immutable release, and audit controls. |

## Recommended First Portability Proof

### Scope

Use one representative existing bundle, preferably **Brief Studio**, because it exercises:

- current manifest v4 and devkit packaging;
- a bundled agent team;
- application-owned backend state;
- saved execution-resource configuration;
- real runtime launch;
- application notifications/events; and
- published artifacts.

The proof should not add marketplace fields, package signing, Vue/React scaffolds, multi-tenancy, or third-party execution.

### Required target behavior

1. The same generated application package contents are installed/selected for both hosts.
2. Studio continues to run its current setup-first iframe lifecycle unchanged.
3. A new standalone host selects exactly one application through deployment configuration and serves the same UI artifact as the branded root at `/`.
4. The app frontend uses one host-neutral startup API with host-owned bootstrap providers; no business component branches on Studio vs standalone.
5. Both hosts start the same backend entry and use the same application engine, storage lifecycle, migrations, resource resolver, orchestration, event, and artifact owners.
6. Standalone development uses the real application worker and a real agent/team backend, not the current mock backend.
7. The standalone composition registers only its explicit selected-application surface. Broad Studio/admin route registries are not constructed or registered in that process.
8. The MVP remains local/self-hosted and introduces no user/account subsystem.
9. From an application folder, `pnpm start` runs the already-built `dist/importable-package` through the production standalone composition; it does not rebuild, watch, or substitute mocks.

### Exit criteria

- **MVP-EC-001:** One generated package passes current v4 validation and its content digest is identical in the Studio and standalone scenarios.
- **MVP-EC-002:** The same frontend entry and backend bundle entry digest are observed in both hosts.
- **MVP-EC-003:** Studio's current setup/enter/reload/exit journey still passes.
- **MVP-EC-004:** Direct standalone root launch reaches business UI without iframe launch hints or Studio globals.
- **MVP-EC-005:** The same app migration files produce the expected app-owned schema/state in each host-specific data root.
- **MVP-EC-006:** A real bundled agent/team execution starts through `context.agentExecution`, emits lifecycle progress, and produces/reconciles a published artifact in both hosts.
- **MVP-EC-007:** Restarting the standalone host preserves app data and restores/reconciles supported binding state according to current orchestration contracts.
- **MVP-EC-008:** No portability conformance scenario uses the devkit mock backend.
- **MVP-EC-009:** Static checks find no imports from `autobyteus-web`, Electron APIs, or server-internal managers in application business code.
- **MVP-EC-010:** A captured standalone public-route inventory contains only the approved application/product ingress; unrelated Studio/admin routes are unreachable externally.
- **MVP-EC-011:** Contract mismatch and missing-capability cases fail explicitly before business UI/handler execution.
- **MVP-EC-012:** Worker/frontend trust limitations are documented and the host refuses packages outside the configured trusted source set.
- **MVP-EC-013:** `pnpm dev`, `pnpm dev:studio`, `pnpm build`, `pnpm validate`, and `pnpm start` have the approved distinct meanings; the production start path consumes the existing package and writes only to a separate data root.

## Revised Roadmap

### Stage 0 — Contract and threat-boundary decisions

- Freeze terminology: project, bundle, package root, release artifact, host, bootstrap provider, client transport, feature dependency, composition dependency, permission.
- Record the trusted-package limitation.
- Inventory current application platform routes, startup/shutdown services, singleton dependencies, persistence, and background work.
- Freeze the standalone public ingress and readiness contract.

### Stage 1 — Same current bundle, two real hosts

- Preserve manifest v4 and current package loader.
- Extract host-neutral startup around bootstrap acquisition.
- Add standalone product host and same-origin bootstrap.
- Reuse current worker/storage/orchestration owners.
- Add real dual-host conformance with one representative app.

### Stage 2 — Bounded application-platform composition

- Extract explicit application-platform HTTP/WebSocket registration and lifecycle functions from the monolithic root.
- Establish deterministic start/readiness/recovery/stop order.
- Build explicit Studio and standalone composition roots; the current full server is never a standalone fallback or interim stage.
- Add standalone operational contracts and route-surface verification.

### Stage 3 — Portable release contract

- Decide single-app immutable `.abapp` structure.
- Define version/digest/dependency metadata and runtime compatibility enforcement.
- Package skills/tools only after their ownership and dependency semantics are explicit.
- Use a clean contract revision rather than widening v4 silently.

### Stage 4 — Developer experience

- Standardize the native application-folder contract: `pnpm dev` for real standalone watch/rebuild/restart, `pnpm dev:studio` for the real Studio host, `pnpm build`, `pnpm validate`, and `pnpm start` for production standalone execution of the existing build.
- Give Brief Studio and Socratic checked-in devkit mappings for their real `frontend-src`, `backend-src`, root team, entrypoint, migration, exposure, and output inputs; retire their custom package builders so all five commands share one pack owner.
- Keep mock/iframe-contract machinery test-only; it is not a public product command and cannot satisfy conformance.
- Require reliable full reload/restart in the first slice; framework-specific HMR and Vue/React scaffolds remain later improvements.

### Stage 5 — Security and marketplace foundation

- Implement frontend and worker isolation, environment/secret minimization, network/filesystem policy, capability authorization, quotas, audit logging, signing, publisher trust, revocation, immutable versions, and update-permission approval.
- Conduct a threat-model/security review before accepting arbitrary third-party packages.

### Stage 6 — Distribution optimization

- Package only required modules/runtime adapters after composition boundaries are proven.
- Add deployment profiles, build/release automation, rollback, and multi-node work only when product requirements demand them.

## Decision Table

| Proposal element | Decision | Reason |
| --- | --- | --- |
| Universal application product vision | Accept | Strong leverage of existing platform capabilities. |
| Same business code/artifacts across hosts | Accept with precise wording | Correct invariant; host config and operations will differ. |
| Application owns product UX and business data | Accept | Correct domain ownership. |
| Platform owns runtime/orchestration/scoping/isolation | Accept | Matches existing runtime authority and required trust boundary. |
| Current runtime architecture description | Accept | Repository evidence supports it. |
| Host-specific transport classes as written | Revise | Bootstrap and business communication are different concerns. |
| Proposed manifest/sample directory as near-term contract | Reject | Incompatible with strict current v4 and package semantics. |
| Current package as immediately universal | Reject | No standalone host or conformance proof exists. |
| Full server headlessly for first proof | Reject | Standalone must use the explicit selected-application composition. Named underlying runtime prerequisites may be reused, but the broad server/route composition is neither a fallback nor an implementation stage. |
| Capability-driven composition | Accept as target, revise mechanism | Current graph is monolithic; avoid generic service-locator architecture. |
| Mock-free portability conformance | Accept | Required to prove real runtime behavior. |
| Mocks for local unit iteration | Retain | Useful when clearly not conformance evidence. |
| Marketplace after simple signing/permissions | Reject | Enforceable isolation/trust/revocation must precede arbitrary code. |
| Vue/React scaffold priority | Defer | Does not validate portability or trust boundaries. |
| Skills/tools automatically portable | Reject for current state | Current dependencies are ambient platform registries. |

## Final Recommendation

Approve the proposal as a **strategic direction**, not as the implementation specification. Authorize only the bounded, trusted-package, single-node dual-host proof first. Require evidence from that proof before changing the package contract or funding marketplace work.

A successful first slice would show that AutoByteus already has the core application runtime platform and only needs a second host plus cleaner bootstrap/composition boundaries. A failed or heavily divergent proof would reveal the real coupling early, before those assumptions are embedded into a new manifest, devkit API, or marketplace ecosystem.
