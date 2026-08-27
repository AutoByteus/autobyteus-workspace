# Application-Owned MCP Capability — Design Spec

## Current-State Read

The current system already has two healthy runtime-projection patterns but no application-owned tool subject:

- `AgentToolsMcpHost` owns one authenticated process MCP endpoint, session registry, static adapter/configured-MCP catalog, dispatcher, and scoped session-authority factory. Claude and Codex receive descriptors issued by the relevant execution scope.
- AutoByteus native does not consume that HTTP endpoint. `resolveAutoByteusRuntimeAgentToolExposure` and `buildRuntimeAgentToolExposure` compose its automatic foundation and Team tools, then `resolveAutoByteusAgentTools` materializes bound/local `BaseTool` instances. `send_message_to`, `get_handoff_rules`, and `delegate_task` already prove that universal product availability does not require one transport: native and MCP adapters call the same governing business service.
- `ApplicationExecutionScope` is one execution-family owner per `ApplicationPlatformRuntime`, not one owner per application. Studio may use the same scope for many applications. Application identity therefore has to remain data in a scoped route; it cannot be represented by another execution scope or a global application-to-manager locator.
- Application runs already carry host-created `ApplicationExecutionContext` with `applicationId`, `bindingId`, and producer `agentRunId`. Team-member sender context separately carries authoritative `rootTeamRunId`, `memberAddress`, and member `agentRunId`. The MCP session issuer already freezes those inputs into an authenticated session.
- `ApplicationBundleService` scans strict static package metadata without importing application code. The backend worker imports a strict `ApplicationBackendDefinition`, owns application business handlers/context/storage, and communicates with the host through completion-coupled JSON-RPC. The worker transport has a 4 MiB aggregate frame guard and no local completion timeout.
- Application definition readiness currently resolves every `toolNames` entry only through `defaultToolRegistry`. The Agent Tools MCP route table currently has only `static_adapter` and `configured_mcp_tool` routes. `tools/call` checks only that arguments are object-valued; it does not enforce the advertised JSON input schema.
- The current implementation branch adds application routes but conflates two collision subjects. `AgentToolMcpCatalog.adaptersByName` contains every platform/static MCP adapter. Each adapter's `configuredMcpCollisionPolicy` decides whether a host-configured MCP source or that static adapter wins; browser adapters such as `open_tab` deliberately use `prefer_configured_mcp`. The host/readiness/application route branch currently consume only `listProtectedStaticToolNames()`, so an application can shadow a registered static browser adapter. Approved application validity instead reserves every registered static-adapter name, independent of that configured-MCP policy and of current adapter availability.
- The supported Studio package path is `Settings -> application package store -> GraphQL mutation -> ApplicationPackageCommandService -> ApplicationCatalogRefreshCoordinator`. The command mutates registry/root state before the coordinator destructively refreshes the live `ApplicationBundleService` snapshot. Separately, `ApplicationReentryService` stops one worker and calls a global bundle reload. Neither path has application-tool admission/drain state or a shared staged catalog commit boundary.
- AutoByteus `McpSchemaMapper` can faithfully project the core object/property types, required fields, string enums, numeric minimum/maximum, string pattern, and raw array item schemas. It cannot represent nullability, string/array length constraints, closed-object semantics, or object defaults. Separately, generic `BaseTool.prepareExecution` coerces string integers/numbers/booleans, empty-string arrays, and supported nested values before `_execute`; Claude/Codex MCP arguments reach an adapter as raw JSON. The application contract therefore needs both a deliberately narrow advertised schema and an application-adapter-only raw preparation seam. The fundamental mapper, schema model, base class, and ordinary native tools remain healthy and unchanged.
- `ApplicationRunOwnershipService` is the existing authoritative read boundary for application/binding/run ownership. Its current query covers persisted root/configured binding members; application tool authorization must extend that owner for a server-minted Team descendant identity rather than duplicate binding-store and status policy in a new gateway.
- The current application manifest is version `4` and the backend definition contract is version `6`. Both maintained applications use those versions. No tool field exists in a database, binding, journal, launch override, Agent/Team definition shape, or global MCP configuration.

The verified production paths and commands are recorded in `investigation-notes.md`, especially BEH-001–BEH-007. The target must extend these paths rather than replace them with a greenfield MCP server or a global application-tool registry.

## Intended Change

Add an `application-agent-tools` capability area with one canonical application declaration, route identity, authorization/invocation boundary, and lifecycle. An application declares static `agentTools` in `application.json` and implements the exact `agentToolHandlers` map in its backend definition. The application platform converts selected declarations into immutable application-bound routes.

Claude and Codex receive those routes through the existing Agent Tools MCP session. AutoByteus receives bound `BaseTool` projections over the same route and invocation capability. Each native `ApplicationAgentTool` retains the checked `ParameterSchema` as its advertised definition but specializes `prepareExecution` so raw arguments reach the same common capability/Ajv boundary without generic `BaseTool` coercion or native-only schema validation. The application tool never enters `defaultToolRegistry`, and no new MCP listener, worker registry, or application execution-manager locator is created.

All registered Agent Tools MCP static-adapter names are reserved from application declarations. `AgentToolsMcpHost` exposes one immutable complete static-name snapshot to application readiness, which quarantines any colliding declaration regardless of adapter availability or configured-MCP collision policy. MCP route composition repeats the all-static rejection as defense in depth. Only after proving that no static adapter owns the name may an application route take precedence over a same-name host-configured MCP source. Existing configured-MCP-versus-static `protect_static_adapter` / `prefer_configured_mcp` behavior remains unchanged and internal to that separate policy.

At invocation, one application-tool gateway admits the call, revalidates current declaration, availability, binding/producer ownership, schema, and worker state, invokes the exact worker once, and validates a bounded MCP-safe result. One application catalog transition service becomes the only live package/application catalog commit owner: it identifies the old package applications before source/registry mutation, closes and drains them, stages the next package slice without touching live state, commits the bundle and application-tool slices together, and then recovers or quarantines the affected applications. Shutdown closes admission and drains admitted calls before worker stop.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001, REQ-002, REQ-008; AC-001–AC-004 | Package scan and backend load | Investigation: static manifest scan, strict worker definition load, no application tool owner | Manifest `agentTools` becomes the import-safe declaration authority; worker `agentToolHandlers` becomes the exact handler authority; process registries remain unchanged | Package source -> manifest parser -> application tool catalog; backend source -> worker loader -> handler map (`DS-001`, `DS-004`) |
| BEH-002 | System | REQ-003, REQ-004, REQ-009; AC-005–AC-009, AC-013 | Application package/readiness and Agent/Team run construction | Investigation and CRR-001: application readiness formerly used the global registry only; IR-001 added an application catalog but protected only static adapters whose configured-MCP collision policy was `protect_static_adapter`, allowing an application `open_tab` to shadow a registered browser adapter | Resolve selected names against process tools plus the exact application catalog; reject every application declaration colliding with any registered platform/static Agent Tools MCP adapter regardless of availability or configured-MCP policy; declaring is not granting; task-created members inherit the same application route policy | Static adapter registration -> immutable all-static name snapshot -> application readiness; run construction -> route projection with all-static defense before application-over-configured precedence (`DS-001`, `DS-002`, `DS-003`) |
| BEH-003 | System | REQ-005, REQ-006, REQ-012; AC-010–AC-014 | Supported runtime starts an application run | Investigation: Claude/Codex use shared MCP; native binds local tools, its current schema model cannot represent nullable/length/closed-object semantics, and generic `BaseTool` preparation coerces selected values | Keep one physical MCP host and current provider paths. Add application routes to scoped MCP sessions and bound native tools over one deliberately mapper-round-trippable schema subset; native application adapters retain that checked schema for advertisement but forward raw arguments, without migrating or changing native fundamentals | App execution capability -> MCP session composition for Claude/Codex or checked native schema/raw adapter composition for AutoByteus (`DS-002`, `DS-003`, `DS-012`) |
| BEH-004 | System | REQ-007–REQ-011; AC-015–AC-020 | Selected tool invocation | Investigation: no worker method or schema enforcement; generic native preparation would transform values before the common boundary | Preserve provider/native arguments as raw JSON until the common gateway, then authorize immutable application/binding/producer identity, validate input once with strict Ajv, invoke exact worker once, and validate/map a bounded result | Provider/native raw call -> route -> application tool gateway -> worker handler -> result (`DS-003`, `DS-004`, `DS-005`, `DS-012`) |
| BEH-005 | Operational | REQ-013–REQ-015; AC-021–AC-027 | Reload, removal, crash, termination, shutdown | Investigation: Settings/GraphQL package commands mutate registry/root state before destructive global bundle refresh; explicit reentry is separate; neither path drains application tools | Add per-application admission/drain and one staged package/application catalog transition owner before any live commit; preserve immutable routes; fail stale routes and crashed workers; never retry or impose a completion timeout | Settings/GraphQL/package command or exact-app reentry -> catalog transition -> call lifecycle -> package-scoped commit -> worker/session recovery or quarantine (`DS-006`, `DS-007`, `DS-011`) |
| BEH-006 | Contract | REQ-016, REQ-017; AC-028–AC-031 | Build/import maintained packages and reuse runtime data | Investigation: strict manifest v4/backend v6; package output rebuildable; DB/state separate | Move cleanly to manifest v5/backend definition v7, rebuild generated packages, retain durable state directly | Contract update -> devkit validation/build -> maintained package rebuild (`DS-001`, `DS-008`) |
| BEH-007 | System | REQ-003, REQ-012; AC-001, AC-005, AC-008 | Native Agent/Team construction | Investigation: exact automatic foundation/Team composition and compactor exclusion are encoded in current resolvers/tests | Preserve the existing automatic sets, ordering, additivity, deduplication, local execution, and compactor exclusion; application routes are a separate selected projection | Existing exposure resolvers -> process/local tools plus selected application bound tools -> `AgentConfig` (`DS-002`) |

The behavior map defines the approved outcomes. The spine inventory below defines the target structures that carry them.

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/application-owned-mcp-intended-behavior.md` | Authoritative intended-behavior and scope decision table | REQ-001–REQ-017; AC-001–AC-031 | Fixes the shared-host, runtime-projection, visibility, collision, caller, result, lifecycle, and clean-transition outcomes implemented by this design | Approved by the user on 2026-08-27 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` / `Larger Requirement`
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`
- Refactor needed now: `Yes`
- Evidence: process/global tool registration is the only current dynamic lookup, while the new subject is application-package-owned and application-worker-lived. Registering it globally would mix owners, create one collision domain across applications, and make reload mutate unrelated process state. Runtime projection is intentionally split: native is local while Claude/Codex use MCP. Copying application authorization and dispatch into three providers would duplicate policy. The current native schema model cannot carry several initially proposed keywords, so claiming them would make the contract runtime-dependent. Even for the portable subset, generic `BaseTool` coercion would transform native application arguments before the common gateway while MCP preserves raw JSON, so simply inheriting ordinary preparation would also create runtime-specific meaning. Package commands and exact-app reentry currently mutate live bundle state through separate paths without application-tool admission/drain, so removal or reload can race an admitted call. Finally, CRR-001 proved that using the per-adapter configured-MCP collision policy to derive application-reserved names is an ownership error: `prefer_configured_mcp` is valid for configured sources but cannot grant an application ownership of a platform/static name.
- Design response: add one application-owned catalog/route/gateway/lifecycle capability; inject its sealed projection only into `ApplicationExecutionScope`; use one explicitly mapper-round-trippable input-schema subset and a fail-closed native projector for advertisement; make the native application adapter alone preserve raw invocation arguments before the common Ajv gateway; expose the MCP catalog's complete registered static-adapter-name snapshot through the host to readiness while retaining configured-MCP precedence as a separate internal policy; extend the MCP and native projection seams; replace the split destructive refresh/reentry mutations with one staged `ApplicationCatalogTransitionService`; and extend existing application ownership, worker, readiness, and shutdown owners rather than bypassing them.
- Refactor rationale: the capability assembly and common route/gateway are required now to prevent global registration and provider-specific business policy. Narrowing the schema contract and specializing one application adapter avoid an unrelated fundamental native-schema or `BaseTool` refactor while still providing one validation meaning. Replacing the two live catalog mutation paths with one package/application transition owner is required because lifecycle correctness is an approved acceptance boundary, not optional cleanup.
- Intentional deferrals and residual risk: migrating native fundamental tools to Agent Tools HTTP MCP is explicitly deferred and unnecessary; the existing bound-local design is healthy and must be preserved. Arbitrary package-bundled MCP servers and external SDK publication remain separate product work. The supported application input-schema subset is intentionally smaller than general JSON Schema; expanding it later requires compatible projection and validation support across every runtime.

## Terminology

- **Application agent tool**: the canonical business capability declared by an application and executed by its worker. “MCP” describes one projection, not its ownership.
- **Declaration snapshot**: a normalized static tool declaration plus its per-tool SHA-256 fingerprint.
- **Application tool route**: an immutable declaration snapshot paired with exact server-minted application execution identity.
- **Application tool capability**: the application-execution-only port that resolves selected routes and invokes them through the application platform gateway.
- **Raw application tool arguments**: the JSON-object values emitted by the provider/native invocation pipeline before defaults, coercion, schema validation, cloning, or normalization. Both runtime projections pass these values to the common gateway, which alone decides application-schema validity.
- **Application catalog transition**: one serialized package- or application-scoped operation that captures the old live slice, quiesces affected existing applications, stages the next slice without live mutation, commits prepared bundle/tool snapshots, and then recovers, closes, or quarantines participants.
- **Admitted call**: a call that acquired the per-application lifecycle permit before quiesce began.
- **Platform/static adapter name**: any name registered in `AgentToolMcpCatalog` by an Agent Tools MCP static adapter provider. Every such name is reserved from application declarations, regardless of adapter availability or its configured-MCP collision policy.
- **Configured-MCP collision policy**: the existing per-static-adapter choice between `protect_static_adapter` and `prefer_configured_mcp`. It governs only a host-configured MCP source colliding with that static adapter; it never determines whether an application may declare the name.

## Design Reading Order

The remaining sections follow the template order: clean transition decisions first; then spines and owners; then boundaries and dependencies; then concrete files, examples, sequence, and risks.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Manifest version `4` and backend-definition version `6` cease to be accepted by the current readers. Maintained generated/importable packages are rebuilt as manifest `5` / backend definition `7`.
- Do not add `mcpTools`, `tools`, handler aliases, manifest fallback fields, dual version branches, a global registration fallback, or an AutoByteus-only application handler path.
- Do not retain an application-tool route after its declaration fingerprint stops matching the current catalog.
- There is no existing application-tool implementation to preserve. Existing platform/configured tool paths are not legacy and remain unchanged except for deterministic session/native composition around an application-local name.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: generated/importable package `application.json` and backend bundles for maintained/imported applications; application `app.sqlite`; platform `platform.sqlite` bindings, journal records, and launch overrides; file-owned Agent/Team definitions; process global MCP configuration. Two maintained source applications were inspected; both currently use manifest `4` / definition `6`.
- Relevant code-model, serialization, semantic, or physical-store change: the package manifest gains static `agentTools`; the backend definition gains `agentToolHandlers`; maintained Agent config selects the sample tool. No database or platform-state field changes.
- Normal reader/writer behavior and representative evidence: package/definition readers are strict-version readers; devkit regenerates package artifacts from source. Application and platform databases are read independently of package tool fields. Agent/Team definitions remain plain current files with the same `toolNames` field.
- Required semantics and invariants under direct use: all existing application business rows, binding identity/status, journals, overrides, Agent/Team identity, and configured MCP credentials/names must retain their current meaning and bytes/semantics.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: package artifacts are reproducible and contain no required durable state; application databases and global MCP credentials are not disposable and must not be rewritten.
- Decision: two explicit outcomes apply:
  - `Discard or Rebuild` for generated/importable package artifacts on manifest `4` / backend definition `6`.
  - `Directly Usable — No Migration` for application/platform databases, Agent/Team definition storage, and global MCP configuration.
- Decision rationale: rebuilding derived packages from maintained source gives the current strict contract without I/O, downtime, corruption, rollback, or mixed-schema complexity in durable stores. A database migration provides no benefit because no durable column or semantic changes.
- Acceptance criteria or design constraints supported: REQ-016, REQ-017; AC-028, AC-029, AC-031.

No migration plan is applicable.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002, BEH-006 | Static MCP adapter registration and application source/package scan | Ready exact-application declaration catalog and definition diagnostics | `AgentToolMcpCatalog`/`AgentToolsMcpHost` name boundary plus `ApplicationBundleService` and `ApplicationDefinitionRuntimeReadiness` | Establishes import-safe declarations and rejects the complete platform/static collision set before a run starts |
| DS-002 | Primary End-to-End | BEH-002, BEH-003, BEH-007 | Application run construction | Runtime-visible selected tools | `ApplicationExecutionScope` and provider factory boundary, with MCP route composition owned by `AgentToolMcpCatalog` | Proves runtime-independent availability, all-static collision defense, and application-over-configured precedence without changing automatic native provisioning or configured-MCP policy |
| DS-003 | Primary End-to-End | BEH-003, BEH-004 | Provider/native tool call | Authorized application-tool invocation request | `ApplicationAgentToolCapability` behind the execution scope | Keeps route identity and business policy common across MCP and native projections |
| DS-004 | Primary End-to-End | BEH-001, BEH-004 | Application tool gateway | Exact worker handler completion | `ApplicationAgentToolGateway` and `ApplicationBackendHost` | Carries validation, authorization, exact dispatch, context, and once-only completion |
| DS-005 | Return-Event | BEH-004 | Worker handler return/error | Provider/native effective tool result | Worker payload validator plus existing MCP/native result projection | Preserves MCP-safe structured/rich results and sanitized failure semantics |
| DS-006 | Primary End-to-End | BEH-005 | Studio Settings reload/removal, GraphQL package mutation, or exact-application reentry | Package-scoped live bundle/tool catalog committed with affected applications recovered, removed, or quarantined | `ApplicationCatalogTransitionService` with `ApplicationAgentToolCallLifecycle` | Reaches the real supported callers and prevents source mutation, worker stop, or live catalog replacement from racing admitted calls |
| DS-007 | Primary End-to-End | BEH-005 | Platform shutdown | Closed tool state, workers, runs, sessions | `ApplicationPlatformLifecycle` | Enforces tool drain before worker stop and idempotent owner order |
| DS-008 | Primary End-to-End | BEH-006 | Maintained application source | Regenerated importable/standalone package | Application devkit/package assembler | Makes the clean contract transition executable and reviewable |
| DS-009 | Bounded Local | BEH-005 | Call admission | Permit release/drain resolution | `ApplicationAgentToolCallLifecycle` | The per-application state machine is the concurrency invariant behind reload/shutdown |
| DS-010 | Bounded Local | BEH-004 | Worker JSON-RPC method | Handler selection/context/result validation | `ApplicationBackendHost` | Ensures exact handler ownership and prevents invalid/oversize result frames from leaving the worker |
| DS-011 | Bounded Local | BEH-005 | Catalog transition lock acquisition | Package/application transition completion and lock release | `ApplicationCatalogTransitionService` | Serializes live catalog commits while closing only the affected application call lanes |
| DS-012 | Bounded Local | BEH-003, BEH-004 | AutoByteus provider produces native application-tool arguments | Prepared native application-tool invocation carrying the same uncoerced JSON object | `ApplicationAgentTool` | Prevents generic native coercion/validation from changing the application contract before the common gateway |

## Primary Execution Spine(s)

- `DS-001`: `static adapter providers -> AgentToolMcpCatalog adaptersByName -> AgentToolsMcpHost staticAdapterToolNames snapshot` plus `application.json -> ApplicationManifest parser -> ApplicationBundle snapshot -> ApplicationAgentToolCatalog` converge at `ApplicationDefinitionRuntimeReadiness -> all-static collision diagnostics -> ready/quarantined application`
- `DS-002` (Claude/Codex): `Application run config -> runtime exposure -> scoped MCP session issuance -> AgentToolMcpCatalog route composition -> reject any registered static-adapter/application collision -> otherwise select application over configured MCP -> existing provider descriptor -> provider tool list`
- `DS-002` (AutoByteus): `Application run config -> unchanged native exposure composition -> application route projection -> ApplicationAgentToolNativeSchemaProjector -> bound ApplicationAgentTool with advertised checked schema + raw preparation override -> existing local resolver -> AgentConfig`
- `DS-003/DS-004`: `Provider MCP raw JSON or native ApplicationAgentTool raw preparation -> immutable ApplicationAgentToolRoute -> ApplicationAgentToolCapability -> ApplicationAgentToolGateway strict Ajv validation -> ApplicationAgentToolWorkerInvoker -> ApplicationEngineController -> ApplicationBackendHost handler`
- `DS-006` (package): `Studio Settings -> applicationPackagesStore -> GraphQL reload/remove mutation -> ApplicationPackageCommandService -> ApplicationCatalogTransitionService.runPackageTransition(packageId, mutation) -> capture old package application IDs -> availability reentry + application-tool quiesce/drain -> stop exact affected workers -> apply registry/source mutation -> stage next package catalog slice -> prepare bundle/tool/readiness commit -> synchronous live package-slice commit -> targeted reconciliation/definition refresh -> recover and validate current workers or close removed/quarantine invalid -> reopen successful affected applications`
- `DS-006` (exact application): `REST reloadAndReenter(applicationId) -> ApplicationCatalogTransitionService.reloadAndReenter -> resolve current package/application slice -> the same quiesce/stage/commit/recovery boundary`
- `DS-007`: `Platform stop -> execution quiesce -> application tool quiesce/drain -> other ingress cleanup -> worker stop -> run/session close -> tool capability close`
- `DS-008`: `Maintained source -> devkit validation/build -> strict manifest v5/backend v7 package -> server import/readiness`
- `DS-012`: `native provider argument object -> ApplicationAgentTool.prepareExecution -> bind ordinary agent identity/check abort/resolve result mode without argument transformation -> same raw object returned in ToolExecutionPreparation -> inherited execute -> ApplicationAgentTool._execute -> common capability`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Static JSON declarations are parsed and normalized without importing backend code, and the application-local catalog takes an immutable snapshot. Independently, the MCP catalog indexes every registered static adapter name and the host exposes a frozen complete snapshot. Readiness compares every application declaration—not only selected names—against that complete set regardless of adapter availability or `configuredMcpCollisionPolicy`, then validates referenced Agent/Team tool names against process tools plus the exact application snapshot. A collision quarantines the application with an application-specific diagnostic. | Static adapter namespace, package declaration, catalog snapshot, application definition readiness | MCP catalog/host name boundary plus bundle scan/readiness owners | JSON-schema subset validation, all-static-name policy, diagnostics |
| DS-002 | The application execution family receives one sealed application tool capability. MCP sessions snapshot selected application routes for Claude/Codex. Before an application route can win over configured MCP, MCP composition rejects a collision with any registered static adapter; the configured-MCP-versus-static protected/prefer branch remains unchanged for sessions with no application route. Native construction occurs only for readiness-approved applications, resolves the same application routes, requires the normalized schema to round-trip through current `McpSchemaMapper -> ParameterSchema.toJsonSchema`, removes those names from process/global materialization, then inserts bound native projections whose checked schema is used for advertisement and whose application-only preparation preserves raw arguments. Native code does not import MCP catalog policy. Automatic exposure builders and generic tool behavior remain untouched. | Run config, runtime exposure, immutable route, runtime tool surface | Application execution scope and MCP catalog route owner | all-static defense, configured-MCP policy separation, checked native schema projection, raw adapter preparation, compactor exclusion |
| DS-003 | Both runtime projections call one route-bound capability with the original JSON argument object. Claude/Codex forward MCP arguments; native `ApplicationAgentTool` bypasses inherited coercion/validation but preserves ordinary preparation lifecycle. The caller cannot choose application/binding/worker IDs in arguments, and only the common gateway decides declared-schema validity. | Application route, raw arguments, application tool capability, invocation command | Application tool capability assembly | typed invalid-input mapping, observer logging |
| DS-004 | The gateway obtains an application call permit, verifies current availability/declaration/ownership, validates arguments and payload size, asks the worker invoker for an allowed attached/cleanly-startable worker, sends one request, and validates the result. | Admitted call, current declaration, ownership evidence, worker invocation | Application tool gateway | Ajv validator cache, safe errors, frame limit |
| DS-005 | The worker validates the application result before writing JSON-RPC. The host validates again, maps an explicit `isError` result as a tool result, and sanitizes thrown/transport errors. | Application tool result, MCP/native result | Worker host and existing result projectors | rich-content schema, serialization bound, telemetry redaction |
| DS-006 | The package command enters one catalog transition before changing package registry/root/files. The transition captures all old application IDs for that package from the live snapshot, marks them reentering, closes their tool admission, drains without timeout, and stops only those workers. It then applies the command-owned mutation, stages a complete next slice for that package without touching live state, derives old/new/removed participants, and prepares bundle, application-tool, and readiness data. Prepared non-throwing bundle/tool commits run synchronously in one JavaScript turn; targeted reconciliation and definition refresh follow while affected lanes remain closed. Existing current apps recover and validate handlers before reopening, removed apps remain closed, and invalid apps are quarantined. Import has no old participants and cannot disturb existing lanes. Rollback restores source/registry state first, re-stages it, and reopens prior apps only after a successful restored commit/recovery. | Package catalog transition, application participants, prepared commit, worker generation, admission state | `ApplicationCatalogTransitionService` | command-owned source mutation/rollback, package-slice staging, recovery/events, diagnostics |
| DS-007 | Shutdown first prevents new runs/sessions, then blocks and drains application tools before stopping workers. Runs and MCP sessions close under their existing scope owners afterward. | Platform lifecycle, tool lifecycle, worker, execution scope | Platform lifecycle | aggregate cleanup errors, idempotency |
| DS-008 | Current source is updated once and built with strict current contracts. Old generated output is removed/regenerated, while durable databases/state are untouched. | Source contract, generated package | Devkit/package assembler | source validation, package smoke checks |
| DS-009 | `OPEN -> QUIESCING -> CLOSED/OPEN` is owned per application. Admission increments before async work; quiesce closes the gate then awaits the zero-in-flight promise; every completion decrements in `finally`. | Application call permit state | Application tool call lifecycle | no timer, idempotent transition promises |
| DS-010 | The worker method looks up exactly one declared handler, builds a caller-aware ordinary handler context, invokes once, validates the result union/size, and returns. | Loaded definition, handler context, result | Application backend host | exact handler-map validation at load |
| DS-011 | A single catalog-transition mutex serializes package/application live commits. Within the lock, only existing participants in the target package/application slice are marked reentering and drained; unrelated applications remain open and their bundle/tool entries are not replaced. Every success, rollback, or quarantine path releases the lock in `finally`. | Catalog transition lock, package slice, participant set | `ApplicationCatalogTransitionService` | deterministic ID ordering, aggregate rollback errors, no application-call global stop |
| DS-012 | The native application adapter overrides the public polymorphic `BaseTool.prepareExecution`. It binds `agentId` from context when needed, performs the ordinary pre-start abort check, resolves and locally normalizes the same result-mode union, and returns the original argument object unchanged. It does not call `super.prepareExecution`, coerce, apply defaults, clone, or validate against its `ParameterSchema`; inherited `execute` still performs its normal post-preparation abort check and calls `_execute`. | Native provider arguments, checked advertised schema, tool execution preparation | `ApplicationAgentTool` | adapter-local duplicate of the two-value mode guard, no worker cancellation protocol |

## Spine Actors / Main-Line Nodes

- Static application declaration (`ApplicationAgentToolDeclaration`).
- Current application declaration catalog (`ApplicationAgentToolCatalog`).
- Registered platform/static adapter namespace (`AgentToolMcpCatalog` -> `AgentToolsMcpHost.staticAdapterToolNames`).
- Application definition readiness (`ApplicationDefinitionRuntimeReadiness` / validator).
- Runtime exposure and immutable route (`ApplicationAgentToolRoute`).
- MCP session or native bound tool projection.
- Native application-tool raw preparation seam.
- Application tool capability (sealed application-execution-only port).
- Application tool gateway and per-application call lifecycle.
- Application run ownership service.
- Application worker invoker/controller and backend host handler.
- Application result and existing runtime result projection.
- Application catalog transition and platform lifecycle.

## Ownership Map

- **SDK contract package** owns the public static declaration, supported result/caller/handler shapes, name/schema subset constants/normalization, and contract version constants. It does not own runtime authorization.
- **Application bundle subsystem** owns import-safe parsing and placement of normalized declarations on the internal bundle snapshot. It never imports the backend entry module.
- **AgentToolMcpCatalog** owns the complete registered static-adapter-name set and route composition. Its per-adapter configured-MCP policy remains a separate internal concern: it never defines which static names an application may declare. For an application route, any registered static adapter is an unconditional collision; only a non-static name may proceed to application-over-configured precedence.
- **AgentToolsMcpHost** owns the narrow outward `staticAdapterToolNames` snapshot used by application readiness. The snapshot is captured from the catalog after default adapter registration, is read-only, includes inactive and `prefer_configured_mcp` adapters, and exposes no adapter implementations or configured-MCP policy.
- **ApplicationAgentToolCatalog** owns current in-memory per-application declaration snapshots and per-tool fingerprints. It is not a process-global registry and never holds handlers.
- **ApplicationDefinitionRuntimeReadiness** owns whether an application and its Agent/Team definitions are runnable. It rejects every application declaration colliding with the complete host static-adapter-name snapshot, then validates selected names against process tools and the exact application catalog. It does not inspect adapter availability or configured-MCP policy.
- **ApplicationAgentToolCapabilityAssembly** owns construction-time sealing: it exposes a stable port to the execution scope and is completed once with the gateway. It is not a service locator and accepts no arbitrary registrations.
- **MCP session catalog** owns MCP route-table composition. Its application branch consumes only the scoped application tool capability, rejects every static-adapter collision, then permits application-over-configured precedence. Its existing configured-MCP branch independently applies `protect_static_adapter` / `prefer_configured_mcp`. It stores pure immutable application routes.
- **ApplicationAgentToolNativeSchemaProjector** owns the AutoByteus compatibility check. It accepts only the normalized portable subset, maps through the current `McpSchemaMapper`, canonicalizes `ParameterSchema.toJsonSchema()`, and rejects any validation-semantic mismatch. It never extends or weakens `ParameterSchema`/`BaseTool` and never silently drops a property.
- **ApplicationAgentTool** owns the AutoByteus application-call preparation seam. Its checked `ParameterSchema` is the native advertised definition only. Its `prepareExecution` override preserves the original argument object while reproducing generic agent-ID setup, pre-start cancellation, and result-mode resolution/normalization; `_execute` passes those raw arguments to `ApplicationAgentToolCapability`. It does not call generic coercion or schema validation, and it does not change any other `BaseTool` subclass.
- **AutoByteus backend factory/composer** owns native materialization. Existing automatic exposure resolvers remain authoritative; the new composer only replaces an explicitly selected application-local name with its checked bound projection.
- **ApplicationAgentToolGateway** is the authoritative invocation boundary. It owns the order of admission, current-state checks, validation, authorization, worker call, and result validation.
- **ApplicationRunOwnershipService** remains the authoritative application binding/producer status reader. It owns the Team-root/configured-member/descendant identity rules; the gateway must not read stores itself.
- **ApplicationAgentToolCallLifecycle** owns per-application admission and drain state, not package or worker sequencing.
- **ApplicationAgentToolWorkerInvoker** owns the narrow worker-state policy: use/join `ready`/clean startup, reject unexpected `failed`/`stopping`, never retry the invocation.
- **ApplicationCatalogTransitionService** replaces `ApplicationCatalogRefreshCoordinator` and the catalog-mutation portion of `ApplicationReentryService.reloadAndReenter`. It owns the catalog-transition mutex, exact package/application participant calculation, sequencing across source mutation, staged bundle/tool commit, targeted reconciliation, rollback, and final outcome. It accepts command-owned mutation/rollback functions but no arbitrary catalog snapshot or participant IDs.
- **ApplicationReentryService** remains the per-application lifecycle owner behind the transition service. Its revised public methods prepare server-derived participants by marking availability, quiescing/draining tool calls, and stopping exact workers, then recover/reopen or quarantine those participants after a prepared catalog commit. It no longer reads or mutates bundle/catalog state and is not called by REST or package commands directly.
- **ApplicationBundleService** owns live bundle state plus package/application staging and prepared non-throwing slice commits. Package commands and REST reentry may not call destructive `refresh()`/`reloadApplication()` methods after the clean replacement.
- **ApplicationBackendDefinitionLoader/Host** own exact handler-map validation, handler execution with application context, and worker-side result validation.
- **ApplicationPlatformLifecycle** remains the top shutdown owner and orders application-tool drain before engine stop.

`ApplicationExecutionScope`, `AgentToolsMcpHost`, and REST/host-management surfaces remain thin composition/public boundaries around these governing owners; they do not gain application business rules.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentToolsMcpHost.routeDependencies` | MCP dispatcher/session registry/catalog | Fastify route wiring | Application authorization, worker routing, application catalog state |
| `AgentToolsMcpHost.staticAdapterToolNames` | `AgentToolMcpCatalog` static adapter index | Give application readiness an immutable complete reserved-name snapshot without exposing catalog internals | Adapter availability, configured-MCP precedence, application catalog lookup, or a policy-filtered subset |
| `ScopedAgentToolMcpSessionAuthority.issuer` | Scoped authority/ledger plus application tool capability | Authenticated provider descriptor issuance | Application handler lookup or provider-specific app policy |
| `ApplicationExecutionScope` projections | Run managers, session authority, application tool capability | Keeps application and general execution families isolated | Per-application worker lookup or package lifecycle |
| Native `ApplicationAgentTool` | `ApplicationAgentToolCapability` / common gateway | Advertises one checked native tool definition and translates the native `BaseTool` lifecycle into a raw route-bound call | Application schema validation, argument coercion, authorization, worker selection, or business policy |
| `ApplicationPlatformRuntime.rest.availability.reloadAndReenter` | `ApplicationCatalogTransitionService` | Stable exact-application reentry surface | Bundle refresh or drain logic duplicated in the wrapper |
| `ApplicationPackageCommandService` | `ApplicationCatalogTransitionService.runPackageTransition` | Own import/reload/remove registry, install, and rollback operations while delegating live catalog/lifecycle sequencing | Direct bundle refresh, affected-ID calculation, call lifecycle, worker stop, or live catalog commit |
| `ApplicationEngineController.invokeApplicationAgentTool` | Attached engine state/client | Narrow JSON-RPC dispatch | Binding authorization, schema validation, retry/start policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Manifest version `4` acceptance/current literals | Current contract becomes v5 | SDK constant, manifest/devkit strict readers | In This Change | Old packages are quarantined until rebuilt; no dual read |
| Backend definition version `6` acceptance/current literals | Current definition becomes v7 | SDK constant and worker loader | In This Change | Bundle contract remains v1 with compatibility value v7 |
| Generated maintained package output built on old contracts | Derived artifacts are stale | Devkit rebuild from maintained source | In This Change | Delete/regenerate; do not patch generated JSON manually |
| Global-registry-only application tool validation assumption | Cannot resolve application-local names | Exact-application catalog union in runtime definition validator | In This Change | Global registry remains authoritative for process tools |
| Silent native skip for a selected application-local name | Would make runtime availability differ | Application route projection before process/local materialization | In This Change | Other unknown global names retain existing behavior outside application readiness |
| Any provisional duplicate schema/fingerprint/result DTO introduced during implementation | One canonical shape is required | SDK contract + server route snapshot + one payload validator | In This Change | Do not leave mapper-local parallel representations |
| Native-over-HTTP MCP refactor proposal | Not required and would disrupt preserved fundamentals | Existing bound native projection over common gateway | Follow-up / rejected for this scope | No production code is removed because this proposal is not current behavior |
| Nullable, string/array length, closed-object, and object-default keywords in the application input contract | Current native schema model cannot preserve them | Exact mapper-round-trippable v5 subset | In This Change | Parser rejects them; do not extend fundamental `ParameterSchema`/`BaseTool` for this ticket |
| `ApplicationCatalogRefreshCoordinator.refresh()` and `ApplicationReentryService.reloadAndReenter()` direct live bundle reload path | Two independent destructive catalog mutation paths can bypass application-tool drain | `ApplicationCatalogTransitionService` plus revised participant-only `ApplicationReentryService` and staged `ApplicationBundleService` package/application commit APIs | In This Change | Remove the refresh coordinator and old reentry method; do not retain forwarding wrappers |
| Inherited coercive `BaseTool.prepareExecution` path for `ApplicationAgentTool` only | It changes schema-invalid native input before the runtime-neutral gateway | Explicit `ApplicationAgentTool.prepareExecution` specialization in the native adapter | In This Change | Do not remove or alter generic `BaseTool` preparation; every fundamental/configured/non-application tool keeps current behavior |
| `AgentToolsMcpHost.protectedStaticToolNames` plus ambiguous public `AgentToolMcpCatalog.listProtectedStaticToolNames()` / `listSupportedToolNames()` readers | The protected reader exposes only the configured-MCP subset, while “supported” does not name the exact registered-static subject; parallel readers invite policy reuse | One exact `AgentToolMcpCatalog.listStaticAdapterToolNames()` and `AgentToolsMcpHost.staticAdapterToolNames` snapshot | In This Change | Rename/remove the ambiguous readers; keep protected/prefer evaluation private for configured-MCP route resolution and do not retain aliases |

## Return Or Event Spine(s) (If Applicable)

`DS-005`: `Application handler -> worker result validator/size guard -> worker JSON-RPC response -> engine client -> application tool gateway host validator -> MCP adapter or native ApplicationAgentTool/BaseTool return -> provider effective result`.

An application-controlled `isError: true` result remains a successful JSON-RPC response whose MCP tool result is marked failed. A thrown handler, invalid result, stale route, authorization failure, or transport failure is not converted to application content; the provider receives a sanitized execution failure and no retry occurs.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ApplicationAgentToolCallLifecycle` (`DS-009`).
  - `admit -> increment -> run operation -> finally decrement -> resolve drain waiter`.
  - `quiesce -> close gate -> observe/wait for zero -> closed`; `reopen` is allowed only after the owning reentry transition succeeds.
  - This matters because worker stop and catalog replacement must be ordered after every admitted call without a timeout.
- Parent owner: `ApplicationBackendHost` (`DS-010`).
  - `receive invokeApplicationAgentTool -> require loaded definition -> select exact handler -> create caller context -> invoke once -> validate/measure result -> respond`.
  - This matters because handler-map ownership and “fail before leaving worker” are worker-local invariants.
- Parent owner: `AgentToolMcpCatalog` route composition.
  - `normalize requested names -> resolve registered/active/protected static views -> resolve exact application routes -> if application route and any registered static adapter then fail -> else application route wins over configured MCP -> otherwise apply existing configured-MCP protected/prefer branch -> freeze table`.
  - This matters because application/static validity and configured-MCP/static precedence are different policies. The complete static check must occur before application precedence, while the existing per-adapter configured policy remains intact.
- Parent owner: `ApplicationCatalogTransitionService` (`DS-011`).
  - `acquire transition lock -> capture old target slice -> quiesce/stop existing participants -> apply command mutation -> stage target slice -> prepare non-throwing commit -> commit bundle/tool slices -> reconcile/recover or rollback/quarantine -> finally release`.
  - This matters because every supported live catalog mutation must cross one boundary before package state changes and because unrelated application call lanes must remain open.
- Parent owner: native `ApplicationAgentTool` (`DS-012`).
  - `receive raw provider argument object -> bind agent identity if absent -> reject already-aborted preparation -> resolve/normalize result mode -> return the same object -> inherited execute rechecks abort -> _execute invokes common capability`.
  - This matters because the ordinary generic `BaseTool` preparation is intentionally coercive, while application tool validation meaning must remain identical to the MCP path. The specialization is confined to this adapter.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Supported JSON-schema parser/normalizer | DS-001, DS-004 | SDK contract/catalog/input validator | Enforce one portable self-contained subset | Native and MCP must advertise/validate the same contract | Provider branches or advisory-only schemas |
| Per-tool canonical fingerprint | DS-001, DS-003, DS-006 | Catalog and route | Detect name/description/schema change while allowing unrelated additions | Enables immutable stale-route policy | App-wide invalidation or silent rebinding |
| Complete static-adapter name reader | DS-001, DS-002 | Definition readiness/MCP catalog | Expose every registered platform/static adapter name from the MCP host as a frozen set | Avoid hard-coded duplicate lists while keeping adapter availability/policy internal | Application subsystem importing MCP internals, consuming only `protect_static_adapter`, or shadowing `prefer_configured_mcp` static tools |
| Ajv compiled-validator cache | DS-004 | Gateway | Validate exact normalized schema efficiently | Required pre-worker enforcement | Worker-only/advisory validation or per-provider differences |
| Checked native schema projector | DS-002 | Native projection | Convert the normalized portable subset through current `McpSchemaMapper`, canonical round-trip it through `ParameterSchema.toJsonSchema()`, and fail readiness on any semantic mismatch | Native LLM tool definition requires an exact representation without changing fundamentals | Silent property/keyword loss or a second native schema model |
| Raw native application-call preparation | DS-003, DS-012 | Native `ApplicationAgentTool` | Preserve the provider-produced JSON object while retaining ordinary agent-ID, abort, and result-mode preparation | Common Ajv must see the same value MCP would see | Generic coercion turns an invalid string/empty array/nested value into a native-only valid call |
| Payload serialization/size guard | DS-004, DS-005, DS-010 | Gateway/worker host | Enforce one 1 MiB application-tool payload limit | Headroom beneath 4 MiB transport frame | Transport crash or multiple contradictory limits |
| Safe error classification | DS-003–DS-005 | Gateway/MCP dispatcher/native tool | Distinguish invalid arguments, explicit tool error, route/authorization/transport failure | Correct protocol semantics without leaking internals | Handler messages or identities leaked through generic errors |
| Runtime observer/diagnostics | DS-003–DS-007 | Existing tool executor/lifecycle owners | Record app/tool/correlation outcomes without arguments/results/tokens | Operability | Logging becomes routing or leaks payloads |
| Maintained sample handler | DS-004, DS-008 | Brief Studio worker | Read existing durable brief state by caller binding | Real proof, not test-only fixture | Platform test stub mistaken for product capability |
| Package-slice staging and transition plan | DS-006, DS-011 | Catalog transition service | Build an immutable old/next participant and prepared bundle/tool commit without live mutation | Package command rollback and exact isolation require a stable before/after basis | Destructive scan before drain or unrelated-app replacement |

## Ownership Boundaries

1. **Package -> platform:** only normalized static declarations cross. Backend code is not imported during scan.
2. **Execution scope -> runtime provider:** only selected immutable routes/tool definitions cross. The application gateway and worker handles stay behind the application tool capability.
3. **MCP catalog/host -> application readiness:** only the immutable complete registered static-adapter-name set crosses. Adapter objects, availability, and configured-MCP collision policy remain in the MCP catalog. Readiness uses this set solely to reject application declarations.
4. **MCP/native projection -> application tool capability:** callers pass a route and the original JSON-object arguments. MCP forwards the session call object; native `ApplicationAgentTool` returns that same object from its specialized preparation and `_execute` forwards it without coercion, defaults, normalization, cloning, or `ParameterSchema` validation. They cannot pass an application ID, binding ID, worker ID, or handler function separately.
5. **Gateway -> ownership service:** the full compound route identity is checked by the existing ownership owner. The gateway does not read lookup/binding stores.
6. **Gateway -> worker invoker:** only an already authorized invocation command crosses. The invoker owns engine-state/start policy but not authorization.
7. **Host -> worker:** only tool name, validated arguments, and immutable public caller context cross. The raw MCP session, bearer, native Agent context, process registry, and run managers remain host-side.
8. **Worker handler -> application capabilities:** the handler receives the same application-owned storage/notification/agent/resource/artifact capabilities as other handlers plus immutable caller identity. It cannot address another application.
9. **Catalog transition -> package mutation:** `ApplicationPackageCommandService` supplies exact package identity and command-owned apply/rollback operations. It cannot mutate the live bundle/tool catalogs or choose participant application IDs.
10. **Catalog transition -> call lifecycle/worker owners:** the transition invokes quiesce/drain/open/close and exact worker stop/recovery through their public methods. It does not manipulate counters, waiter promises, worker handles, or handler maps directly.
11. **Catalog transition -> live catalog commit:** only a fully parsed package/application candidate and prepared non-throwing application-tool delta cross. The live bundle and tool slices commit synchronously with no `await` between them; unrelated package slices retain their existing objects/routes.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ApplicationAgentToolCapability` | catalog route resolution, sealed gateway reference | MCP session service, AutoByteus composer/tool | Provider reads bundle/catalog or calls controller | Add a subject-specific route/invoke method, not raw internals |
| `AgentToolsMcpHost.staticAdapterToolNames` | complete static adapter index snapshot from `AgentToolMcpCatalog` | Application platform runtime composition/readiness | Readiness imports providers/catalog, filters by availability, or reuses configured-MCP protection subset | Strengthen the exact name-snapshot API; never expose adapters or configured policy |
| `AgentToolMcpCatalog.resolveRuntimeSessionToolExposure(...)` | registered/active/protected static views, configured sources, application routes, deterministic route order | Scoped MCP session service only | Session/application adapter chooses precedence outside catalog or application route bypasses all-static collision | Keep both collision subjects explicit inside this owner |
| `ApplicationAgentToolGateway.invoke(route,args)` | admission, availability, fingerprint, ownership, Ajv, size, worker, result checks | MCP adapter and native bound tool only | Caller invokes ownership service and controller separately | Strengthen gateway result/error contract |
| `ApplicationRunOwnershipService.requireLiveApplicationToolProducer(...)` | startup gate, lookup/binding reads, root/member/status rules | Application tool gateway | Gateway reads stores or trusts argument-supplied IDs | Add explicit compound identity result/query |
| `ApplicationAgentToolWorkerInvoker.invoke(...)` | engine status, allowed clean start/join, controller request | Application tool gateway | Gateway calls launcher and controller independently | Add worker-invoker method/state disposition |
| `ApplicationAgentToolNativeSchemaProjector.project(schema)` | portable-subset assertion, current mapper call, canonical round-trip equivalence | AutoByteus application-tool composer only | Adapter maps arbitrary JSON Schema, accepts dropped properties, or changes `ParameterSchema`/`BaseTool` ad hoc | Narrow the shared parser subset; a richer schema is separate native-model work |
| `ApplicationAgentTool.prepareExecution(context,args,options)` | application-only raw argument preservation plus ordinary native preparation lifecycle | Native tool phase and inherited `BaseTool.execute` via polymorphic dispatch | Calls `super.prepareExecution`, invokes generic coercion/schema validation, or forwards a transformed copy | Keep the specialization in the bound adapter; the common gateway owns application validation |
| `ApplicationCatalogTransitionService.runPackageTransition(...)` / `reloadAndReenter(...)` | transition mutex, old participant capture, quiesce/stop, source mutation boundary, staged package/application plan, synchronous live commit, targeted reconciliation, recovery/rollback/quarantine | `ApplicationPackageCommandService` and REST availability facade | Command or reentry caller calls bundle refresh, tool catalog replace, lifecycle, or worker stop separately | Strengthen exact mutation/rollback or candidate APIs on this service; do not expose internals |
| `ApplicationReentryService.prepareParticipants/recoverParticipants/quarantineParticipants` | availability reentry, application-tool drain, exact worker stop, post-commit worker recovery/events, activate/reopen/quarantine | `ApplicationCatalogTransitionService` only | Transition service manipulates counters/workers directly, or REST/package callers invoke participant methods | Strengthen the participant token/result; do not restore catalog mutation to reentry |
| `ApplicationBackendHost.invokeAgentTool(...)` | handler lookup/context/result validation | Worker entry dispatcher | Worker entry imports app definition or calls handler map | Expand backend-host method only |

## Dependency Rules

Allowed directions:

- SDK contracts -> no server/runtime package.
- Backend SDK -> SDK contracts.
- Bundle parser/devkit -> SDK declaration parser/contract.
- Application tool catalog -> bundle snapshot and SDK declaration types; never backend handler code.
- Agent Tools MCP catalog -> complete registered static-adapter-name list; Agent Tools MCP host -> frozen `staticAdapterToolNames` snapshot; application runtime composition -> readiness dependency. No adapter object, availability function, or configured-MCP collision policy crosses into application subsystems.
- Application execution scope/provider construction -> application tool capability interface.
- MCP catalog/adapter and AutoByteus projection -> application tool capability; neither may depend on gateway internals.
- AutoByteus application-tool projection -> `ApplicationAgentToolNativeSchemaProjector` -> current `McpSchemaMapper`/`ParameterSchema` public APIs for advertisement, then bound `ApplicationAgentTool` -> `ApplicationAgentToolCapability` for raw invocation. The SDK contract and server catalog never depend on `autobyteus-ts` native schema types.
- Native `ApplicationAgentTool.prepareExecution` may reuse protected/public `BaseTool` lifecycle APIs and types (`getName`, `getToolResultExecutionMode`, `setAgentId`, `ToolExecutionOptions`, `ToolExecutionPreparation`) but must not call `super.prepareExecution` or treat its checked `ParameterSchema` as an invocation validator. Because the base result-mode normalizer is private, the adapter owns an exact local guard for `in_process | external_result`; no global base-class edit or new shared helper is introduced.
- Application tool gateway -> narrow availability reader, catalog reader, ownership reader, payload validator, call lifecycle, and worker invoker.
- Worker invoker -> engine launcher/controller only.
- Worker loader/host -> SDK handler/result types and worker payload validator.
- Studio Settings/GraphQL -> `ApplicationPackageCommandService` -> `ApplicationCatalogTransitionService`; package commands retain registry/install mutation and rollback, but receive no bundle/tool catalog commit or application lifecycle dependencies.
- REST application availability -> `ApplicationCatalogTransitionService.reloadAndReenter`; it does not call bundle reload directly.
- Catalog transition service -> bundle staging/prepared package/application commit, application tool catalog prepared delta, revised `ApplicationReentryService` participant lifecycle, and readiness/reconciliation owners through public methods. It does not receive call counters or engine handles directly.
- Platform lifecycle -> application tool lifecycle/worker/execution-scope owners through their public methods.

Forbidden shortcuts:

- No application tool in `defaultToolRegistry`, configured MCP registry, or a module-global application map.
- No `applicationId -> AgentRunManager/TeamRunManager/ApplicationExecutionManager` locator.
- No provider-specific application authorization, handler selection, retry, schema, or lifecycle policy.
- No application declaration/readiness rule derived from `configuredMcpCollisionPolicy`, `listProtectedStaticToolNames`, adapter availability, configured MCP registration, or currently requested/selected names. Every registered static-adapter name is reserved.
- No application route selected before checking the catalog's complete registered static-adapter index. Application-over-configured precedence applies only after the absence of a static adapter is established. Existing configured-MCP-versus-static protected/prefer behavior must not change.
- No accepted application schema keyword that the checked current native projection cannot round-trip; no nullable/length/closed-object fallback and no modification of `McpSchemaMapper`, `ParameterSchema`, or `BaseTool`.
- No generic `BaseTool` argument coercion or `ParameterSchema` invocation validation on the native application-tool path. Do not disable coercion globally; specialize only `ApplicationAgentTool` and pass the raw object to the common capability/gateway.
- No application code import during bundle scan and no handler function crossing the process boundary.
- No route chosen from tool arguments, raw bearer data, display name, or name alone.
- No caller above the gateway depending on the gateway plus ownership/catalog/controller internals.
- No fixed application-tool timeout, detached continuation, or automatic invocation retry.
- No worker lazy restart from `failed`. `stopped`/in-progress clean startup may be started/joined by the worker invoker; an unexpected `failed` state requires reentry or another owning backend recovery path.
- No `ApplicationPackageCommandService -> ApplicationBundleService.refresh/reloadApplication`, package command -> application tool catalog, or REST reentry -> direct bundle mutation dependency. No live catalog commit outside `ApplicationCatalogTransitionService`.
- No whole-catalog replacement for a package/application transition. Stage and commit only the target package/application slice; unrelated application declarations, routes, admissions, and workers stay untouched.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `parseApplicationAgentToolDeclarations(value)` | Static declarations | Validate/normalize portable declaration list | Manifest field path + JSON value | Pure/import-safe; no handler import |
| `AgentToolMcpCatalog.listStaticAdapterToolNames()` | Platform/static adapter namespace | Return every registered static adapter definition name in deterministic order | Catalog-owned `adaptersByName` after provider construction | Rename the current complete `listSupportedToolNames()` reader to this exact subject and remove public `listProtectedStaticToolNames()`; no availability or configured-policy filtering |
| `AgentToolsMcpHost.staticAdapterToolNames` | Application collision-readiness input | Expose a frozen complete snapshot without exposing the catalog | Host construction from `listStaticAdapterToolNames()` | Includes inactive adapters and both configured-MCP collision policies; composition passes it unchanged to readiness |
| `AgentToolMcpCatalog.resolveRuntimeSessionToolExposure(context)` | MCP session route composition | Resolve registered/active/protected static views, application routes, and configured sources under two explicit collision policies | Runtime exposure plus scoped sender/execution/application capability | If application route + any registered static adapter: fail. Else application route wins over configured MCP. Without app route, existing configured protected/prefer branch remains unchanged |
| `ApplicationAgentToolCatalog.initializeFromBundleSnapshot` | Initial declarations | Install the first immutable catalog before execution readiness | Startup bundle snapshot | Startup only; rejects a second initialization |
| `ApplicationAgentToolCatalog.prepareDelta/commitPreparedDelta` | Current declarations | Build a validated target package/application delta without state change, then apply its non-throwing assignments | Transition-owned target slice / internally minted delta | Commit callable only by catalog transition composition; per-tool fingerprint, no handlers |
| `ApplicationAgentToolCapability.resolveSelectedRoutes(input)` | Runtime routes | Resolve exact selected app declarations and mint route identity | `ApplicationExecutionContext` + sender/team identity + requested names | Synchronous after catalog readiness |
| `ApplicationAgentToolCapability.invoke({route,arguments})` | Route-bound call | Forward the selected route and original JSON argument object into the sealed gateway | Complete `ApplicationAgentToolRoute` plus raw arguments from MCP/native adapter | No separate selector IDs and no adapter-level coercion/defaulting/validation |
| `ApplicationAgentToolNativeSchemaProjector.project(inputSchema)` | Native schema projection | Map the normalized contract subset and prove canonical round-trip equivalence | Normalized SDK application-tool input schema | Returns one `ParameterSchema`; mismatch is application-local readiness failure |
| `ApplicationAgentTool.prepareExecution(context,args,options)` | Native application-call preparation | Bind ordinary agent identity, enforce the pre-start abort check, resolve/normalize ordinary result mode, and return uncoerced arguments | Native `AgentContext`, provider-produced `Record<string, unknown>`, ordinary `ToolExecutionOptions` | Public override; must not call `super.prepareExecution`, validate against `ParameterSchema`, apply defaults, clone, or mutate args. The checked schema remains available through `getArgumentSchema()` for advertisement |
| `ApplicationAgentTool._execute(context,args,options)` | Native application-call projection | Invoke the bound route through the common capability with the raw prepared arguments and return the canonical result | Bound route plus arguments returned by the specialized preparation | Inherited `BaseTool.execute` retains its post-preparation abort check; application tools use the default `in_process` mode and introduce no worker timeout/retry/cancel protocol |
| `ApplicationRunOwnershipService.requireLiveApplicationToolProducer(input)` | Binding/producer ownership | Return verified caller evidence or fail | application/binding plus standalone producer or Team root/member producer | Supports task-created descendants via server-minted root Team identity |
| `ApplicationAgentToolGateway.invoke(route,args)` | Application tool execution | Govern complete call sequence and serve as the sole application-schema validator | Immutable route + raw JSON object | Strict Ajv sees the same uncoerced object for MCP and native before any worker call |
| `ApplicationAgentToolWorkerInvoker.invoke(command)` | Worker execution | Start/join allowed clean state and invoke once | application ID plus authorized worker command | Reject `failed`/`stopping`; no retry |
| `ApplicationEngineController.invokeApplicationAgentTool(applicationId,input)` | Attached worker request | Send the exact JSON-RPC method | application ID selected by worker invoker | Thin controller method |
| `ApplicationBackendHost.invokeAgentTool(input)` | Worker handler | Select handler/create context/validate result | declared tool name + args + `ApplicationAgentToolCaller` | Raw MCP/native context absent |
| `ApplicationAgentToolCallLifecycle.runAdmitted(applicationId,work)` | Call permit | Reject or count/settle exact-app calls | application ID | Counter hidden |
| `ApplicationAgentToolCallLifecycle.quiesceAndDrain(applicationId)` | App call lifecycle | Close admission and await admitted calls | application ID | Idempotent, no timer |
| `ApplicationCatalogTransitionService.runPackageTransition(input)` | Live package catalog transition | Serialize, capture old package apps, quiesce/stop, run command apply/stage/commit/finalize, reconcile/recover or roll back | `packageId`, operation kind, command-owned `applyBeforeStage`, optional `finalizeAfterCommit`, and `rollbackSource`; no caller-supplied application IDs/snapshots | Import has no old participants; reload/removal derive them from the live snapshot before `applyBeforeStage` |
| `ApplicationCatalogTransitionService.reloadAndReenter(applicationId)` | Live exact-application transition | Resolve current package/application, run the same staged lifecycle boundary, and return availability | Exact current `applicationId` from REST path | Does not expose bundle refresh or transition plans |
| `ApplicationReentryService.prepareParticipants(applicationIds)` | Per-application transition preparation | Mark reentering, close/drain tool admission, capture prior activation, and stop exact workers in deterministic order | IDs derived by catalog transition service from live target slice | Returns an opaque participant token; no bundle/catalog access |
| `ApplicationReentryService.recoverParticipants(token,currentIds)` / `quarantineParticipants(token,error)` | Per-application transition completion | Recover/resume/activate/reopen committed current participants or close/quarantine failures/removals | Opaque preparation token plus committed current ID set | Only catalog transition service calls these methods |
| `ApplicationBundleService.stagePackageCatalog(packageId)` / `stageApplicationCatalog(applicationId)` | Candidate bundle slice | Parse an immutable candidate without mutating live maps | Exact transition scope resolved before staging | Only transition service consumes it |
| `ApplicationBundleService.commitPreparedCatalogSlice(plan)` and `ApplicationAgentToolCatalog.commitPreparedDelta(delta)` | Live catalog state | Apply already-validated non-throwing assignments synchronously | Internally prepared plan/delta token | No I/O, validation, callbacks, or `await` during the paired commit |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Declaration parser | Yes | Yes | Low | Reject unsupported fields/subset; return normalized current shape |
| Static adapter name snapshot | Yes | Yes | Low | Name it for the complete registered set; never expose the configured-policy subset as application readiness policy |
| MCP session route composition | Yes | Yes | Low | Keep all-static application rejection separate from configured-MCP protected/prefer precedence in one catalog owner |
| Application tool capability | Yes | Yes | Low | Accept full execution/sender evidence; never name-only invocation |
| Application tool gateway | Yes | Yes | Low | Route contains the compound identity and declaration snapshot |
| Ownership query | Yes | Yes | Low | Use discriminated standalone/Team producer evidence |
| Worker invoker | Yes | Yes | Low | Keep start-state policy here, not in gateway/controller |
| Engine controller method | Yes | Yes | Medium | It accepts application ID internally, so expose it only to worker invoker; do not publish as application capability |
| Call lifecycle | Yes | Yes | Low | Keep application ID as its one state key; never route business calls |
| Checked native schema projection | Yes | Yes | Low | Accept only the normalized contract type and fail on any mapper round-trip mismatch |
| Native raw application-call preparation | Yes | Yes | Low | Keep checked schema advertisement separate from invocation; override only the bound adapter and forward the original object to the common gateway |
| Package catalog transition | Yes | Yes | Low | Caller supplies package identity and its own mutation/rollback only; service derives participants and candidates |
| Exact-application catalog transition | Yes | Yes | Low | Resolve package/snapshot internally from exact application ID; reuse the same commit owner |
| Prepared catalog slice commit | Yes | Yes | Low | Tokens are minted internally and commit synchronously; no raw external snapshot setter |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Canonical business tool | `ApplicationAgentTool` | Yes | Low | Use “MCP” only on transport adapter/files |
| Static declaration | `ApplicationAgentToolDeclaration` | Yes | Low | Do not also introduce `ApplicationMcpToolDefinition` |
| Immutable invocation route | `ApplicationAgentToolRoute` | Yes | Low | Keep identity/declaration inside one route, not parallel IDs |
| Current catalog | `ApplicationAgentToolCatalog` | Yes | Low | Do not call it global registry |
| Governing invocation owner | `ApplicationAgentToolGateway` | Yes | Medium | Document that it owns policy, not only forwarding |
| Per-app admission owner | `ApplicationAgentToolCallLifecycle` | Yes | Low | Avoid generic coordinator/helper names |
| Application tool capability port | `ApplicationAgentToolCapability` | Yes | Low | Keep exact subject; do not make a generic dynamic-tool plugin API |
| Worker boundary | `ApplicationAgentToolWorkerInvoker` | Yes | Low | Distinguish from handler and controller |
| Native schema compatibility owner | `ApplicationAgentToolNativeSchemaProjector` | Yes | Low | “Native” is appropriate here because this is specifically the AutoByteus adapter boundary, not the canonical business capability |
| Complete platform/static name boundary | `staticAdapterToolNames` | Yes | Low | Replaces misleading `protectedStaticToolNames`; “static adapter” denotes every catalog-registered Agent Tools MCP adapter independent of configured-MCP collision policy |
| Live catalog lifecycle owner | `ApplicationCatalogTransitionService` | Yes | Low | Replace vague refresh/reentry split; name the state transition it governs |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Shared authenticated MCP transport | Agent Tools MCP host/routes/session registry | Extend | Already owns protocol/auth/session cleanup | N/A |
| Platform/static name reservation | Agent Tools MCP catalog plus host read boundary | Extend | The catalog already owns the complete static adapter index and the host is the narrow cross-subsystem boundary | N/A |
| Runtime exposure policy | Runtime exposure + provider factory boundaries | Extend | Already supports different projections over common capabilities | N/A |
| Native bound tool | AutoByteus BaseTool construction | Extend with one specialized adapter override | Existing universal collaboration tools use this bound shape, while the application contract uniquely requires raw gateway validation | N/A |
| Package declaration | Application bundle manifest | Extend | Static/import-safe/current package authority | N/A |
| Business handler/context/storage | Application worker/backend definition | Extend | Correct application business owner | N/A |
| Binding/run authorization | ApplicationRunOwnershipService | Extend | Existing authoritative store/status policy | N/A |
| Exact worker request | Engine launcher/controller/client | Extend | Existing completion-coupled process boundary | N/A |
| Live package/application catalog transition | Current refresh coordinator, reentry service, bundle service, and catalog reconciliation | Clean Replace / Extend | The current split destructive mutation paths must become one authoritative staged transition; bundle/reconciliation remain owned mechanisms | N/A |
| Shutdown | Platform lifecycle | Extend | Existing top lifecycle owner must order the new lane | N/A |
| Application-local catalog/route/gateway/call lifecycle | No existing owner | Create New | Process registry and worker handler map each own a different subject and cannot safely absorb scoped route/lifecycle policy | Existing global registries would violate isolation; MCP catalog cannot own app worker lifecycle |
| Schema projection | Existing Agent Tools MCP JSON schema path plus native `McpSchemaMapper`/`ParameterSchema` | Reuse unchanged behind a new checked adapter | The portable subset is deliberately limited to canonical round-trip equivalence; fundamental native schema types do not change | N/A |
| Durable storage | Existing app/platform stores | Reuse unchanged | No new durable state is needed | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Application SDK contracts | declaration/schema/result/caller/handler types and v5/v7 constants | DS-001, DS-004, DS-008 | Package and worker | Extend | One canonical current representation |
| Application bundles/devkit | static parsing, diagnostics, generated packages | DS-001, DS-008 | Bundle/readiness | Extend | No backend import |
| Application agent tools | catalog, route, application tool capability, gateway, lifecycle, validation, worker invoker | DS-002–DS-007, DS-009 | Application platform | Create New | Feature-oriented folder with domain/services separation |
| Agent Tools MCP | immutable route union, list/call adapter, complete static-name reader, independent application/configured collision ordering | DS-001–DS-003, DS-005 | MCP host/session/catalog | Extend | No app business policy beyond reserved namespace projection and route precedence |
| AutoByteus backend | checked schema projection, raw application-call preparation, and selected bound-tool materialization | DS-002, DS-003, DS-005, DS-012 | Native backend factory / `ApplicationAgentTool` | Extend | Existing automatic exposure and fundamental schema/base-tool files unchanged |
| Application orchestration/platform | ownership query, readiness, staged catalog transition/reconcile, shutdown order | DS-001, DS-006, DS-007, DS-011 | Application runtime lifecycle | Clean Replace / Extend | Merge refresh/reentry live-mutation authority; no run-manager locator |
| Application engine worker | load validation, JSON-RPC method, handler context/result guard | DS-004, DS-005, DS-010 | Worker host | Extend | Completion-coupled, no retry/timeout |
| Maintained Brief Studio | real `get_brief_context` handler and selection | DS-004, DS-008 | Application worker/sample | Extend | Read-only existing durable data; no UI change |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| SDK `application-agent-tools.ts` | SDK contracts | Contract owner | Declaration, JSON-schema subset parser/normalizer, caller/result types | One portable contract subject | Yes |
| `application-agent-tool-declaration-snapshot.ts` | Application agent tools/domain | Catalog value object | Canonical fingerprint and immutable declaration snapshot | Pure reusable domain value | SDK declaration |
| `application-agent-tool-route.ts` | Application agent tools/domain | Runtime route value object | Compound execution identity + declaration snapshot | One immutable invocation selector | Snapshot/caller |
| `application-agent-tool-catalog.ts` | Application agent tools/services | Current catalog owner | Initialize/query and prepare/non-throwing-commit exact app/package deltas | One state owner | Snapshot |
| `application-agent-tool-capability.ts` | Application agent tools/services | Execution port/assembly | Resolve routes and sealed gateway invocation | One construction/execution boundary | Route/catalog |
| `application-agent-tool-call-lifecycle.ts` | Application agent tools/services | Admission owner | Per-app state/counter/drain | One state machine | No |
| `application-agent-tool-payload-validator.ts` | Application agent tools/services | Validation concern | Ajv input, MCP-safe result, JSON serializability, 1 MiB bound | One wire payload contract | SDK schemas/result |
| `application-agent-tool-worker-invoker.ts` | Application agent tools/services | Worker availability boundary | Engine-state start/join/reject and once-only controller call | One worker policy | Protocol command |
| `application-agent-tool-gateway.ts` | Application agent tools/services | Governing invocation owner | Ordered admission/current-state/auth/validate/invoke/result | One end-to-end use case owner | Route/validators |
| MCP catalog/host/application adapter | Agent Tools MCP | Namespace and projection boundary | Complete static-name snapshot; independent application-vs-static and configured-MCP-vs-static route order; route list/call conversion | Existing catalog/host own registration and public transport boundary | Static adapter index, route/result |
| Native schema projector | AutoByteus backend | Projection compatibility owner | Map normalized schema through current native model and assert canonical round-trip equivalence | One native-only fail-closed boundary | SDK schema + `McpSchemaMapper` |
| Native application tool/composer | AutoByteus backend | Projection adapter | Checked `BaseTool` advertisement, application-only raw `prepareExecution`, canonical result, and precedence-preserving merge | Runtime-specific only | Checked `ParameterSchema`, `ToolExecutionPreparation`, route/capability |
| Worker protocol/host changes | Application engine | Worker boundary | Load names, invoke command, exact handler and result | Existing files own these switch/dispatch concerns | SDK contract |
| `application-catalog-transition-plan.ts` | Application orchestration/domain | Immutable transition value | Old/next package or application slice, derived participants, prepared bundle/tool deltas, prior availability disposition | One testable transition subject; no live services | Bundle/tool snapshots |
| `application-catalog-transition-service.ts` | Application orchestration/services | Governing live catalog transition | Serialize, derive participants, use reentry lifecycle, execute command mutation, stage/prepare/commit, reconcile/recover/rollback/quarantine | One end-to-end catalog owner replacing split live mutation | Transition plan and existing owners |
| `application-bundle-service.ts` staged/commit methods | Application bundles | Bundle state owner | Build target package/application candidate without live mutation and apply internally prepared slice | Existing live bundle owner | Catalog candidate |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Application declaration/schema/result/caller contracts | `autobyteus-application-sdk-contracts/src/application-agent-tools.ts` | SDK contracts | Manifest, worker, devkit, host, and sample all need the same portable shape | Yes | Yes | Runtime authorization or MCP transport package |
| Normalized declaration + fingerprint | `application-agent-tool-declaration-snapshot.ts` | Application agent tools | Catalog, route, stale check, delta need identical semantics | Yes | Yes | Whole-app generation token or handler record |
| Compound route identity | `application-agent-tool-route.ts` | Application agent tools | MCP/native/gateway need one exact selector | Yes | Yes | Bag of optional IDs or caller-controlled selector |
| Payload validation/measurement | `application-agent-tool-payload-validator.ts` | Application agent tools | Host pre-dispatch and worker pre-return need the same result/limit semantics | Yes | Yes | Generic JSON utility |
| Complete registered static-adapter names | Existing MCP catalog plus `AgentToolsMcpHost.staticAdapterToolNames` | Agent Tools MCP | Readiness and route composition need the same reserved namespace, while configured-MCP precedence remains catalog-internal | Yes | Yes | Adapter objects, availability-filtered names, or `protect_static_adapter` subset exposed to application subsystem |
| Catalog transition participant/commit plan | `application-catalog-transition-plan.ts` | Application orchestration | Package commands, exact-app reentry, rollback, and tests need one derived old/next/removed/current participant meaning | Yes | Yes | Caller-supplied application ID list or mutable snapshot setter |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ApplicationAgentToolDeclaration` (`name`, `description`, `inputSchema`) | Yes | Yes | Low | No output schema/handler/function in static declaration |
| `ApplicationAgentToolDeclarationSnapshot` (`declaration`, `fingerprint`) | Yes | Yes | Low | Fingerprint is per declaration, not app-wide; declaration name is not duplicated top-level |
| `ApplicationAgentToolExecutionIdentity` | Yes | Yes | Low | Discriminate standalone producer vs Team producer; Team root evidence exists only on Team variant |
| `ApplicationAgentToolRoute` (`identity`, `declarationSnapshot`) | Yes | Yes | Low | Route table key must equal snapshot name; no separate application/tool selector fields |
| `ApplicationAgentToolCaller` | Yes | Yes | Low | Public flat fields are projected once for worker; internal Team root evidence is deliberately excluded |
| `ApplicationAgentToolResult` | Yes | Yes | Medium | Use one strict MCP-safe content union; do not keep a server-only second rich-result DTO |
| Normalized portable input schema | Yes | Yes | Low | Permit only the exact current native round-trip subset; reject nullable, length, closed-object, defaults, composition, and unknown keywords rather than keeping native/MCP variants |
| Native application invocation arguments | Yes | Yes | Low | Keep one provider-produced raw JSON object from `prepareExecution` through `_execute` into the common gateway; do not retain parallel raw/coerced or advertised-schema-validated forms |
| MCP session execution capability | Yes | Yes | Low | Add one nullable application capability to the tight base; general sessions receive `null`, not a mostly optional generic extension bag |
| Static adapter name snapshot | Yes | Yes | Low | One deterministic set means all registered static names only; do not mix active, configured-protected, configured-preferred, or requested-name sets into this cross-subsystem type |
| `ApplicationCatalogTransitionPlan` | Yes | Yes | Low | Derive old/current/removed/added IDs from exact old and staged target slices; do not duplicate package/application selectors or accept them from callers |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/application-agent-tools.ts` | SDK contracts | Current application-tool contract | Export name rule, portable schema subset parser/normalizer, declaration, caller, MCP-safe content/result | Shared package-level subject | Canonical source |
| `autobyteus-application-sdk-contracts/src/manifests.ts` | SDK contracts | Manifest contract | Set version `5`; add optional `agentTools` | Existing manifest owner | Application tool declaration |
| `autobyteus-application-sdk-contracts/src/index.ts` | SDK contracts | Backend contract | Set definition version `7`; define handler context/handler/map and exposure summary `agentTools` | Existing backend owner | Caller/result |
| `autobyteus-application-backend-sdk/src/index.ts` | Backend SDK | Author export surface | Re-export application tool types | Existing surface | SDK contract |
| `autobyteus-application-devkit/src/validation/application-root-validator.ts` | Devkit | Source validation | Accept/validate `agentTools` with shared parser | Existing validator owner | Shared parser |
| `autobyteus-server-ts/src/application-bundles/utils/application-manifest.ts` | Bundles | Import parser | Parse normalized declarations without app import | Existing parser owner | Shared parser |
| `autobyteus-server-ts/src/application-bundles/domain/models.ts` and provider mapping | Bundles | Bundle snapshot | Carry internal declarations on validated/current bundle | Existing bundle model | SDK declaration |
| `autobyteus-server-ts/src/application-bundles/services/application-bundle-service.ts` | Bundles | Live bundle state | Add immutable package/application staging and internally prepared synchronous slice commit; remove destructive public refresh/reload callers | Existing state owner | Package/application candidate |
| `autobyteus-server-ts/src/application-agent-tools/domain/application-agent-tool-declaration-snapshot.ts` | Application agent tools | Domain value | Canonical per-tool fingerprint/deep freeze/clone | One pure value concern | SDK declaration |
| `.../domain/application-agent-tool-route.ts` | Application agent tools | Domain value | Discriminated producer identity and immutable route | One exact selector | Snapshot/team identity |
| `.../domain/application-agent-tool-errors.ts` | Application agent tools | Error contract | Typed invalid-input, unavailable/stale, execution errors with safe messages | One feature error vocabulary | No |
| `.../services/application-agent-tool-catalog.ts` | Application agent tools | Current catalog | One-time initialize, query, prepare target delta, non-throwing commit, initialized readiness | One state owner | Snapshot |
| `.../services/application-agent-tool-capability.ts` | Application agent tools | Sealed execution port | Assembly, identity minting, selected route resolution, gateway call | One construction boundary | Catalog/route |
| `.../services/application-agent-tool-call-lifecycle.ts` | Application agent tools | Permit state machine | Open/quiesce/drain/close exact apps | One concurrency owner | No |
| `.../services/application-agent-tool-payload-validator.ts` | Application agent tools | Payload contract | Ajv schema cache; result union/serialization; 1 MiB payload bound | One validation boundary | SDK contract/snapshot |
| `.../services/application-agent-tool-worker-invoker.ts` | Application agent tools | Worker access | Allowed clean start/join, failed rejection, once-only invoke | One policy | Engine APIs |
| `.../services/application-agent-tool-gateway.ts` | Application agent tools | Governing invocation | Admission -> state -> authorization -> input -> worker -> result | One use-case owner | All feature boundaries |
| `autobyteus-server-ts/src/application-orchestration/services/application-run-ownership-service.ts` | Orchestration | Ownership authority | Add exact tool-producer query including Team root/descendant validation | Existing owner | Route identity |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-tool-route.ts` | MCP | Session route union | Add application route kind and deep clone | Existing route owner | Application route |
| `.../agent-tool-mcp-catalog.ts` and `.../application-agent-tool-mcp-adapter.ts` | MCP | Static namespace and route composition/adapter | Rename the complete reader to deterministic `listStaticAdapterToolNames` and remove ambiguous public readers; reject application route against any registered static adapter; otherwise preserve app-over-configured selection; retain configured-MCP protected/prefer behavior; list/call mapping | Existing catalog + thin projection | Static adapter index, application tool capability/result |
| `.../agent-tools-mcp-host.ts` | MCP host boundary | Cross-subsystem static-name reader | Replace `protectedStaticToolNames` with frozen complete `staticAdapterToolNames` sourced from the catalog | Existing host already encapsulates catalog construction | Static adapter names only |
| `.../agent-tool-mcp-session*.ts` / scoped authority | MCP | Session capability | Carry application tool capability only in application authority | Existing session owner | Capability reference |
| `autobyteus-server-ts/src/agent-execution/providers/agent-provider-factory-builder.ts` | Provider construction | Execution factory | Pass optional application capability to native factory; provider descriptor path unchanged | Existing factory boundary | Capability |
| `.../backends/autobyteus/application-agent-tools/application-agent-tool-native-schema-projector.ts` | AutoByteus | Schema compatibility boundary | Map normalized input with current `McpSchemaMapper`, canonicalize `ParameterSchema.toJsonSchema()`, require semantic equality, return checked schema | One native-specific concern | SDK schema/current native mapper |
| `.../backends/autobyteus/application-agent-tools/application-agent-tool.ts` | AutoByteus | Native adapter | Instance name/description/checked advertised schema; explicit raw `prepareExecution` preserving agent-ID, abort, and result-mode behavior; bound invoke returning canonical result | One adapter owns the full native translation seam | Projected `ParameterSchema`, `ToolExecutionPreparation`, route/capability |
| `autobyteus-ts/src/tools/base-tool.ts` | Fundamental native tool framework | Unchanged base contract | No source behavior change; existing coercion/validation remains authoritative for all ordinary subclasses and is bypassed only by polymorphic `ApplicationAgentTool.prepareExecution` | Guardrail rather than a new owner | Existing protected/public lifecycle APIs |
| `.../application-agent-tool-composer.ts` | AutoByteus | Native composition | Resolve app names first, exclude them from global materialization, merge by existing requested order | One precedence concern | Existing resolver |
| `.../autobyteus-agent-run-backend-factory.ts` | AutoByteus | Native construction | Use composer when application capability/context exists | Existing construction owner | Existing exposure unchanged |
| `autobyteus-server-ts/src/application-engine/runtime/protocol.ts` | Engine | IPC contract | Add load tool names and invoke input/result method | Existing protocol owner | SDK caller/result |
| `.../services/application-engine-controller.ts` | Engine | Attached request facade | Add narrow invoke method | Existing controller | Protocol |
| `.../services/application-engine-launcher.ts` | Engine | Worker start/load | Pass current declared names at load | Existing launcher | Bundle catalog |
| `.../worker/application-backend-definition-loader.ts` | Worker | Definition readiness | Permit `agentToolHandlers`; require exact declared/handler keys; report names | Existing strict loader | SDK handler map |
| `.../worker/application-handler-context-factory.ts` | Worker | Handler context | Add caller-aware application-tool context builder | Existing context owner | SDK caller |
| `.../worker/application-backend-host.ts` and `application-worker-entry.ts` | Worker | Invoke/dispatch | Add exact handler execution/result guard/switch | Existing worker boundary | Payload validator/result |
| `autobyteus-server-ts/src/application-platform/runtime/application-definition-runtime-readiness.ts` and validator | Platform | Readiness | Reject every declaration against complete `staticAdapterToolNames`; exact app/process selection union; per-app refresh | Existing readiness owner | Application catalog plus immutable name snapshot |
| `.../runtime/build-application-platform-runtime.ts`, orchestration construction, Studio/standalone composition inputs | Platform/composition | Collision snapshot wiring and application capability composition | Carry `staticAdapterToolNames` unchanged from MCP host to readiness; build catalog/lifecycle/assembly; inject only app scope; complete/abort | Composition roots only | Capability and immutable name snapshot; no adapter policy |
| `autobyteus-server-ts/src/application-orchestration/domain/application-catalog-transition-plan.ts` | Orchestration | Immutable transition plan | Derive exact old/next/current/removed participants and prepared bundle/tool deltas from target scope | Pure testable lifecycle value | Bundle/tool candidates |
| `autobyteus-server-ts/src/application-orchestration/services/application-catalog-transition-service.ts` | Orchestration | Authoritative live catalog lifecycle | Replace refresh coordinator and direct reentry catalog mutation with serialized participant preparation/mutate/stage/commit/reconcile/recover/rollback/quarantine | One governing DS-006/DS-011 owner | Transition plan, revised reentry, catalog boundaries |
| `autobyteus-server-ts/src/application-orchestration/services/application-reentry-service.ts` | Orchestration | Per-application lifecycle owner | Replace `reloadAndReenter` bundle mutation with prepare/recover/quarantine participant methods over availability, tool drain, worker stop, recovery, and events | Existing owner retains its coherent lifecycle concern beneath catalog transition | Call lifecycle/engine/recovery owners |
| `autobyteus-server-ts/src/application-packages/services/application-package-command-service.ts` | Packages | Package command owner | Wrap every import/reload/remove registry/install mutation and rollback in `runPackageTransition`; never refresh live catalogs directly | Existing command use-case owner | Catalog transition boundary |
| `autobyteus-server-ts/src/application-platform/runtime/application-catalog-reconciliation-service.ts`, definition caches/readiness | Platform | Targeted post-commit reconciliation | Reconcile/refresh only transition participants while their tool lanes remain closed | Existing policy owners | Transition participant IDs |
| `autobyteus-server-ts/src/compositions/build-studio-server.ts` and runtime contracts | Composition | Wiring | Supply the runtime-owned catalog transition boundary to package commands and REST facade; remove refresh coordinator construction | Composition root only | Transition service |
| `autobyteus-server-ts/src/application-packages/services/application-catalog-refresh-coordinator.ts` and old `ApplicationReentryService.reloadAndReenter` API | Removed legacy coordination | N/A | Remove after callers move to `ApplicationCatalogTransitionService`; do not retain forwarding wrappers or a direct bundle reload method | Clean-cut removal required by one live commit owner | N/A |
| `applications/brief-studio/application.json`, backend and Agent configs/prompts | Maintained app | Real proof | Declare/select/call `get_brief_context`; read current brief by caller binding | Existing app owner | SDK contract/context |
| Maintained app contract literals/config-generated output | Maintained apps/devkit | Clean transition | Move all maintained sources to v5/v7 and rebuild | Current source/build owners | Version constants |
| Unit/integration/architecture/API-E2E coverage under existing test folders | Tests | Evidence | Contract, isolation, runtime matrix, lifecycle, no-regression, maintained proof | Existing test organization | Production boundaries |

## Applied Patterns (If Any)

- **Immutable capability route:** same local pattern as scoped Agent Tools MCP routes, extended with application identity and declaration snapshot.
- **Complete namespace snapshot:** the MCP catalog retains adapter/policy mechanics and the host exports only the deterministic all-static name set needed by readiness. This is a narrow read boundary, not duplicated collision logic.
- **Sealed two-phase assembly:** same construction pattern as scoped MCP session authority. It solves the real construction cycle (`ApplicationExecutionScope` is needed before `ApplicationEngineLauncher`, while runtime backends need a stable application tool port). Completion is one-time and typed; it is not arbitrary late registration.
- **Bound adapter over common owner:** same product pattern as `send_message_to`/`delegate_task`; native and MCP adapters invoke one governing capability.
- **Checked adapter:** the native schema projector uses the existing mapper but accepts its result only after normalized JSON-schema round-trip equality; it does not teach the canonical contract about native types.
- **Specialized raw adapter preparation:** `ApplicationAgentTool` uses the existing public polymorphic preparation seam but replaces generic coercion/validation only for this subject. The specialization retains the tight base execution lifecycle and keeps application schema policy in the common gateway.
- **Nested lifecycle owners:** `ApplicationAgentToolCallLifecycle` owns only admission/drain, revised `ApplicationReentryService` owns per-application prepare/recover/quarantine, and `ApplicationCatalogTransitionService` owns the package/application catalog transaction that invokes those boundaries.
- **Staged package-slice commit:** package/application candidates and tool deltas are prepared without live mutation, then committed synchronously under one transition lock; unrelated package slices never enter the plan.
- **Strict current-contract replacement:** follows current manifest/backend version gates and rebuildable package workflow.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/application-agent-tools.ts` | File | Portable contract | Author/runtime shared tool shapes and schema subset | Contract package is dependency root | Server services, Ajv cache, MCP session |
| `autobyteus-server-ts/src/application-agent-tools/domain/` | Folder | Application tool domain | Route, snapshot, typed errors | Makes the new subject explicit without transport coupling | Controller/worker/provider logic |
| `autobyteus-server-ts/src/application-agent-tools/services/` | Folder | Application platform capability | Catalog, assembly, lifecycle, validation, gateway, worker invoker | Feature has multiple real owners and structural depth | MCP HTTP handlers or application business handlers |
| `autobyteus-server-ts/src/agent-tools/mcp/` | Folder | MCP static namespace and projection | Catalog-owned all-static name list, host snapshot, independent route collision order, thin application adapter/error mapping | Static adapter registration/policy already belongs here | Application catalog storage, authorization, worker routing, or readiness diagnostics |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/application-agent-tools/` | Folder | Native projection | Checked schema projector, bound BaseTool with raw application-only preparation, and precedence composer | Runtime-specific construction/translation concern | Automatic foundation/team exposure policy or generic `BaseTool` behavior |
| Existing `application-bundles/` files | Mixed Justified existing area | Static package owner | Carry declarations into catalog snapshot | Existing manifest/bundle depth is clear | Handler imports |
| Existing `application-engine/` runtime/services/worker files | Existing structural depths | Worker process boundary | Protocol/controller/loader/handler extensions | Current ownership already fits | Binding authorization or MCP routes |
| Existing `application-platform/runtime` and `application-orchestration/{domain,services}` | Existing structural depths | Readiness/catalog transition/shutdown/ownership | Add the transition plan/service and integrate the capability into current lifecycles | Lifecycle subject spans a pure plan and one governing service | Tool schema/handler duplication or package registry business logic |
| `applications/brief-studio/backend-src/agent-tools/` | Folder | Brief Studio business tool | `get-brief-context.ts` handler | Real app-specific business code | Platform test stub or cross-app access |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `application-agent-tools/domain` | Main-Line Domain-Control | Yes | Low | Pure route/snapshot/errors only |
| `application-agent-tools/services` | Main-Line Domain-Control + owned off-spine concerns | Yes | Medium | Each file has one owner; do not create a generic helpers file |
| `agent-tools/mcp/application-agent-tools` | Transport | Yes | Low | Thin application route projection only |
| `autobyteus/.../application-agent-tools` | Transport/runtime adapter | Yes | Low | Keeps native adapter out of canonical capability |
| `application-engine/runtime` | Transport | Yes | Low | Only IPC contracts/writer limits |
| `application-engine/worker` | Main-Line Domain-Control | Yes | Medium | Existing worker host is mixed by handler family but is the established single dispatch owner; add one narrow method rather than a second worker host |
| `applications/brief-studio/backend-src/agent-tools` | Main-Line Domain-Control | Yes | Low | App-specific handler remains application-owned |
| `application-orchestration/domain` | Main-Line Domain-Control | Yes | Low | Immutable catalog transition plan only; no services or stores |
| `application-orchestration/services` | Main-Line Domain-Control | Yes | Medium | One catalog transition service replaces two competing live mutation coordinators; keep package mutation callbacks in the package command owner |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

### Canonical package and backend shape

```json
{
  "manifestVersion": "5",
  "agentTools": [
    {
      "name": "get_brief_context",
      "description": "Read the current Brief Studio brief for this application binding.",
      "inputSchema": {
        "type": "object",
        "properties": {},
        "required": []
      }
    }
  ]
}
```

```ts
export default defineApplication({
  definitionContractVersion: "7",
  agentToolHandlers: {
    get_brief_context: async (_input, context) => ({
      content: [{ type: "text", text: "Current brief loaded." }],
      structuredContent: readBriefByBinding(
        context.storage.appDatabasePath,
        context.caller.bindingId,
      ),
    }),
  },
});
```

The real sample handler must handle a missing current brief as an explicit `isError: true` tool result or a safe empty-state result, not route using a `briefId` supplied by the model.

### Collision policy separation

Application declaration validity and configured-MCP precedence are deliberately independent:

| Registered static adapter with this name? | Application declaration/route? | Configured MCP source? | Static adapter's configured-MCP policy | Required outcome |
| --- | --- | --- | --- | --- |
| Yes | Yes | Any | `protect_static_adapter` or `prefer_configured_mcp` | Application readiness quarantines the application, even when the static adapter is currently unavailable. If route composition is reached defensively, it rejects instead of issuing an application route |
| No | Yes | Yes | N/A | Application route wins inside the owning application session; the configured MCP source retains its existing meaning elsewhere |
| No | Yes | No | N/A | Application route is issued normally |
| Yes | No | Yes | `protect_static_adapter` | Preserve current configured-MCP behavior: active static adapter wins; an unavailable protected static adapter yields the existing collision diagnostic/no configured route behavior |
| Yes | No | Yes | `prefer_configured_mcp` | Preserve current configured-MCP behavior: configured MCP route wins, as browser tools such as `open_tab` already allow |
| Yes | No | No | Either | Active static adapter is exposed; an unavailable adapter is absent |
| No | No | Yes | N/A | Configured MCP route is exposed normally |

The complete application-reserved set is `AgentToolMcpCatalog.listStaticAdapterToolNames()`, the exact rename of the current complete-but-ambiguous `listSupportedToolNames()` reader and backed directly by the registered adapter index. `AgentToolsMcpHost.staticAdapterToolNames` freezes that set for readiness. It is not `listProtectedStaticToolNames()`, the active-adapter set, or the requested-name set; the ambiguous old public readers are removed rather than retained as aliases.

### Canonical result shape

`ApplicationAgentToolResult` is the single author/worker/host shape:

```ts
type ApplicationAgentToolResult = Readonly<{
  content: readonly (
    | Readonly<{ type: "text"; text: string }>
    | Readonly<{ type: "image"; data: string; mimeType: string }>
    | Readonly<{ type: "audio"; data: string; mimeType: string }>
    | Readonly<{
        type: "resource";
        resource:
          | Readonly<{ uri: string; mimeType?: string; text: string }>
          | Readonly<{ uri: string; mimeType?: string; blob: string }>;
      }>
    | Readonly<{
        type: "resource_link";
        name: string;
        uri: string;
        description?: string;
        mimeType?: string;
        size?: number;
      }>
  )[];
  structuredContent?: Readonly<Record<string, unknown>>;
  isError?: boolean;
}>;
```

The current application contract does not add a second arbitrary content escape hatch or application-owned `_meta`. Any nested value must be JSON-serializable and finite. The worker/host validator rejects unknown content fields/types, a block with both `text` and `blob`, non-object `structuredContent`, or an over-limit envelope. This strict union is structurally projectable as an MCP tool result and can also be returned by the native bound tool without stringification.

### Route shape

```ts
type ApplicationAgentToolRoute = Readonly<{
  kind: "application_agent_tool";
  identity: Readonly<{
    applicationId: string;
    bindingId: string;
    producer:
      | Readonly<{ kind: "agent"; agentRunId: string }>
      | Readonly<{
          kind: "team_member";
          rootTeamRunId: string;
          memberAddress: AgentTeamAddress;
          agentRunId: string;
        }>;
  }>;
  declarationSnapshot: ApplicationAgentToolDeclarationSnapshot;
}>;
```

The route does not duplicate `toolName`, `applicationId`, or `agentRunId` at the top level. Its declaration name is the route-table key, and its identity is the only worker selector evidence.

### Schema subset

Tool names use the one provider-safe current rule `^[A-Za-z][A-Za-z0-9_.-]{0,127}$` and remain case-sensitive. Descriptions are trimmed and must remain non-empty.

The v5 contract deliberately accepts only the validation semantics that the current native `McpSchemaMapper -> ParameterSchema -> toJsonSchema()` path can reproduce. The normalized root is exactly `{type: "object", properties, required}`. Each named property has one non-null `type` from `string | integer | number | boolean | object | array`; property descriptions are trimmed or deterministically synthesized during normalization. Nested objects recursively use only `type`, `description`, `properties`, and `required`. Arrays require one recursively supported `items` schema. The only additional validation keywords are:

- `enum` containing unique strings on a string schema, mutually exclusive with `pattern`;
- `pattern` on a non-enum string schema;
- `minimum` and/or `maximum` on integer/number schemas, with `minimum <= maximum`.

Defaults, `null`/nullable forms, `minLength`, `maxLength`, `minItems`, `maxItems`, `additionalProperties`, `const`, `format`, `$ref`, `$id`, recursion, composition/unions/conditionals, boolean schemas, tuple items, executable/custom keywords, and every unlisted keyword are rejected at SDK/devkit/server package validation. Omitting `additionalProperties` intentionally retains ordinary JSON Schema open-object semantics; this ticket does not claim closed objects. A later richer contract must first extend the shared native schema model and its validation/serialization semantics rather than adding a package-only exception.

`ApplicationAgentToolNativeSchemaProjector` maps the normalized schema with the existing `McpSchemaMapper`, converts the result back through `ParameterSchema.toJsonSchema()`, canonicalizes both sides, and requires validation-semantic equality including every nested property and array item. A missing/dropped/changed keyword or property is an application-local readiness diagnostic. The MCP projection advertises the same normalized schema directly. Native `ApplicationAgentTool.getArgumentSchema()` returns the checked `ParameterSchema` for the provider-facing definition, but its application-only `prepareExecution` override does not invoke generic schema validation or coercion. Consequently both MCP and native calls reach the gateway's cached Ajv 8 strict/all-errors validator with raw JSON, and that gateway is the sole runtime-neutral application-schema authority before any worker call.

Accepted example:

```json
{
  "type": "object",
  "properties": {
    "query": { "type": "string", "description": "Search text.", "pattern": "^.{1,200}$" },
    "limit": { "type": "integer", "description": "Maximum records.", "minimum": 1, "maximum": 50 },
    "tags": { "type": "array", "description": "Optional tags.", "items": { "type": "string" } }
  },
  "required": ["query"]
}
```

Rejected examples include `{ "type": ["string", "null"] }`, `{ "type": "string", "minLength": 1 }`, and any object containing `"additionalProperties": false`; the native model cannot faithfully advertise those semantics today.

### Native raw preparation and parity

`ApplicationAgentTool` specializes the public polymorphic preparation method; it does not change `BaseTool`:

```ts
override async prepareExecution(
  context: AgentContext,
  args: Record<string, unknown> = {},
  options: ToolExecutionOptions = {},
): Promise<ToolExecutionPreparation<Record<string, unknown>>> {
  const toolName = this.getName();
  if (this.agentId === null && typeof context?.agentId === "string") {
    this.setAgentId(context.agentId);
  }
  if (options.signal?.aborted) {
    throw new Error(`Tool '${toolName}' execution aborted before start.`);
  }

  const resultExecutionMode = normalizeApplicationAgentToolResultMode(
    await this.getToolResultExecutionMode(context, args, options),
    toolName,
  );
  return { toolName, args, resultExecutionMode };
}
```

The adapter-local normalizer accepts exactly `in_process | external_result` and throws the same invalid-mode class of error otherwise because the base normalizer is private. The application adapter uses the inherited default `in_process` mode. It never calls `super.prepareExecution`, `getArgumentSchema().validateConfig`, or any conversion/defaulting function; it returns the same object reference. The native tool phase calls this override before its started event, and inherited `BaseTool.execute` calls it again then performs its existing post-preparation abort check before `_execute`. `_execute` forwards the prepared raw object to `ApplicationAgentToolCapability.invoke`. No worker cancellation protocol, timeout, or retry is added.

| Declared property | Raw call example | Native outcome | Claude/Codex MCP outcome |
| --- | --- | --- | --- |
| `integer` | `{ "limit": "3" }` | Common Ajv rejects; worker not invoked | Common Ajv rejects; worker not invoked |
| `number` | `{ "ratio": "3.5" }` | Common Ajv rejects; worker not invoked | Common Ajv rejects; worker not invoked |
| `boolean` | `{ "enabled": "true" }` | Common Ajv rejects; worker not invoked | Common Ajv rejects; worker not invoked |
| `array` | `{ "items": "" }` | Common Ajv rejects; worker not invoked | Common Ajv rejects; worker not invoked |
| nested `integer` / `boolean` | `{ "filters": { "limit": "3", "enabled": "yes" } }` | Common Ajv rejects without nested coercion; worker not invoked | Common Ajv rejects; worker not invoked |
| correctly typed values | `{ "limit": 3, "ratio": 3.5, "enabled": true, "items": [] }` | Common Ajv accepts the unchanged object | Common Ajv accepts the unchanged object |

### Catalog transition operation matrix

`runPackageTransition` receives one exact operation contract rather than a raw refresh callback:

```ts
type ApplicationPackageCatalogMutation<T> = Readonly<{
  kind: "import" | "reload" | "remove";
  packageId: string;
  applyBeforeStage: () => Promise<T>;
  finalizeAfterCommit?: (value: T) => Promise<void>;
  rollbackSource: (value: T | undefined, cause: unknown) => Promise<void>;
}>;
```

The functions own package registry/root/install actions only. They cannot receive bundle/tool catalogs, lifecycle services, worker handles, or application IDs. The transition service derives participants and owns every live-state action.

| Operation | Old participant handling before command mutation | Candidate/commit | Failure and rollback |
| --- | --- | --- | --- |
| Import | The target package is absent, so the old participant set is empty and no existing application lane is quiesced | Apply registry/root addition, stage the new package slice, commit new bundle/tool entries, refresh readiness; no worker is eagerly started solely for import | Remove the added root/record/managed install, stage the now-absent slice, and remove any committed new entries; existing package/application lanes were never participants |
| Reload package | Capture every live application whose `bundle.packageId` equals the target, mark reentering, drain, and stop those exact workers before built-in materialization or source rescan | Stage only the target package, commit its bundle/tool slice, then recover only previously active current applications; new inactive apps remain normally startable and removed apps stay closed | If the command can restore source state, restore then re-stage/recover it; an external or built-in source that cannot be restored leaves the affected apps quarantined while the pre-commit live slice is not presented as runnable against changed files |
| Remove package | Capture/drain/stop all old package applications before removing root/registry records | Stage an empty target slice, synchronously remove its live bundle/tool entries, reconcile removal, then finalize managed-install deletion while lanes remain closed | Restore root/record first, stage the actual restored package, recommit and recover prior active apps only if readable/valid; partial/unreadable restoration remains quarantined |
| Exact-application reentry | Resolve the current package and capture/drain/stop only the exact application before staging its current source | Commit only that application slice, validate handler readiness during recovery, activate/reopen on success | No package registry mutation exists to roll back; invalid/missing current source commits the diagnostic/removal outcome for that application and leaves it closed/quarantined |

The transition lock covers apply, stage, commit, finalize, and any rollback commit. It serializes catalog transitions, not ordinary tool calls. `ApplicationBundleService` builds candidates without clearing its live maps, and the prepared bundle/tool assignments contain no validation or I/O, so the paired live commit cannot yield or partially fail. Agent/Team definition cache refresh, availability reconciliation, worker load, and event recovery occur afterward while affected application admission remains closed.

### Fingerprint example

`fingerprint = sha256(canonicalJson({name, trimmedDescription, normalizedInputSchema}))`.

Canonicalization sorts object keys and set-like `required`/string-enum values but retains ordering where the supported schema treats an array as ordered. It is per tool. Adding another tool does not invalidate an unchanged route; changing this tool's name, description, or schema does.

### Good and avoided shapes

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Runtime universality | `native bound adapter -> ApplicationAgentToolGateway <- MCP adapter` | Make native call the local HTTP endpoint or copy handler policy into each provider | Universality is one business owner, not one transport |
| Isolation | `route.identity.applicationId -> current catalog/ownership -> exact worker` | `toolName -> global registry -> handler` | Same names across apps are safe only with compound identity |
| Authorization | Gateway passes full route to one ownership query | Gateway reads lookup store then binding store itself | Preserves the authoritative boundary and Team descendant rules |
| Reload | `close admission -> drain -> stop -> replace/validate -> reopen` | Replace catalog/stop worker while calls are running | Prevents ambiguous completion and stale rebinding |
| Native precedence | Resolve app route, omit that name from global native materialization, merge in requested order | Materialize configured MCP and app tool with duplicate name | Implements app-over-configured policy without changing automatic baselines |
| Static collision ownership | `catalog all-static names -> host snapshot -> readiness`, plus catalog defense before app precedence | Reuse `protect_static_adapter` subset for application declarations | Preserves every platform/static name while leaving configured-MCP/browser precedence unchanged |
| Construction | One-time application capability assembly completed after orchestration/launcher exists | Mutable global setter or service locator | Solves the real cycle without global state |
| Native schema parity | `normalized schema -> current mapper -> toJsonSchema -> canonical equality` | Accept nullable/length/closed-object keywords and hope the gateway compensates for a different advertised native schema | Fails unsupported author contracts at readiness instead of varying by runtime |
| Native input parity | `ApplicationAgentTool.prepareExecution(raw) -> common Ajv` | Inherit generic `BaseTool` coercion then ask common Ajv to validate transformed data | Makes schema-invalid strings/empty arrays/nested values fail identically across native and MCP without disturbing ordinary tools |
| Package removal | `package command -> catalog transition -> capture/drain old package apps -> mutate registry -> stage empty slice -> prepared live commit -> keep removed apps closed` | Remove registry root -> destructive global refresh -> later attempt worker reconciliation | Places lifecycle admission before the real supported mutation and preserves unrelated apps |
| Package rollback | `restore registry/source -> stage restored target slice -> prepared commit -> recover prior apps -> reopen` | Reinstall the captured old in-memory snapshot without checking restored files/handlers | Re-validates the actual rollback state and quarantines if restoration is incomplete |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Accept manifest v4 with implicit empty `agentTools` | Existing imported packages use v4 | Rejected | Bump to v5; rebuild/reinstall generated packages; strict diagnostic otherwise |
| Accept backend definition v6 with implicit empty handlers | Existing bundles use v6 | Rejected | Bump to v7; rebuild maintained bundles |
| Support both `mcpTools` and `agentTools` | Ticket terminology could suggest MCP field | Rejected | Use `agentTools` as the canonical transport-neutral business subject |
| Support both `tools` and `agentToolHandlers` in backend | Shorter field might seem convenient | Rejected | Use exact `agentToolHandlers` map only |
| Register application tools in `defaultToolRegistry` for native | Would make current resolver find them | Rejected | Bound application-native projection over the scoped capability |
| Create one MCP host/process per application | Makes physical separation obvious | Rejected | One existing host with immutable application routes and exact authorization |
| Keep old route working after declaration change | Could reduce session churn | Rejected | Per-tool fingerprint mismatch fails closed; new session receives current route |
| Retry or timeout application handler calls | Common resilience shortcut | Rejected | Completion-coupled single call; failed worker requires owning recovery/reentry |
| Accept nullable/length/closed-object schema keywords and rely on gateway-only validation | Richer author contract might seem useful | Rejected | Use the exact current native round-trip subset; expand the shared native schema model in a separate prerequisite before widening the application contract |
| Globally disable or refactor `BaseTool` coercion for parity | It would make native application calls raw | Rejected | Override `ApplicationAgentTool.prepareExecution` only; fundamental, configured, and other native tools retain their current coercion/validation behavior |
| Let the gateway accept native-coerced arguments but MCP raw arguments | The checked advertisement might make coercion look harmless | Rejected | Both adapters forward the original JSON object and the common strict Ajv validator alone determines application-schema validity |
| Reuse `configuredMcpCollisionPolicy` or `listProtectedStaticToolNames()` for application validity | A single “protected” set appears simpler | Rejected | Reserve every registered static-adapter name for applications; keep protected/prefer policy solely inside configured-MCP route resolution |
| Reserve only active or requested static adapters | Unavailable names might look reusable | Rejected | Readiness uses the registration-time all-static snapshot, so optional availability changes cannot silently transfer a platform name to application ownership |
| Retain `ApplicationCatalogRefreshCoordinator.refresh()` or the old `ApplicationReentryService.reloadAndReenter()` bundle mutation | Reduces call-site edits | Rejected | Remove both competing live mutation entrypoints; package commands and REST use `ApplicationCatalogTransitionService`, while reentry retains only participant lifecycle methods |

## Derived Layering (If Useful)

- **Portable contract:** SDK declarations/result/caller/handler types.
- **Application capability/domain-control:** catalog, route, lifecycle, gateway, worker access.
- **Runtime transport adapters:** Agent Tools MCP and AutoByteus bound BaseTool.
- **Application worker:** handler code/context/storage.
- **Lifecycle composition:** staged package/application catalog transition, application readiness, and platform shutdown.

This layering is explanatory only. Callers still use the authoritative boundaries above; for example, an MCP adapter cannot skip the capability/gateway to call the engine layer.

## Change / Refactor Sequence

1. **Make the current contract compile-break explicit.** Add the SDK application-tool contract with the exact non-null/no-length/no-closed-object current native round-trip subset, set manifest `5` and backend definition `7`, export backend handler types, update strict server/devkit readers, and update maintained source version literals. Do not add fallback readers.
2. **Carry static declarations, reserve the full platform/static namespace, and prove schema projection.** Extend internal bundle models/provider snapshots. Add normalized declaration snapshots, per-tool fingerprints, and `ApplicationAgentToolCatalog`. Rename the catalog's complete `listSupportedToolNames()` reader to `listStaticAdapterToolNames()`, remove public `listProtectedStaticToolNames()`, expose a frozen `AgentToolsMcpHost.staticAdapterToolNames`, pass it unchanged through Studio/standalone composition to `ApplicationDefinitionRuntimeReadiness`, and reject every colliding application declaration independent of availability/configured policy. Keep protected/prefer evaluation private to configured-MCP resolution. Add `ApplicationAgentToolNativeSchemaProjector` over the unchanged current mapper/model, with accepted-keyword round-trip fixtures and explicit rejection fixtures for nullable, length, defaults, `additionalProperties`, unions, references, and unknown keywords. Treat any mapper drop/change as readiness failure.
3. **Add worker support.** Extend load input with current declared names, require exact `agentToolHandlers`, add caller-aware context and invocation protocol/controller/host/entry method, and validate/measure results before the worker writer. Keep existing worker completion semantics.
4. **Add application invocation owners.** Implement payload validator, ownership-service exact producer query, call lifecycle, worker invoker, and gateway with the specified call order and typed safe failures.
5. **Solve composition once.** Add the one-time application tool capability assembly to `buildApplicationPlatformRuntime`; pass its stable capability into application MCP authority and provider construction; complete it after orchestration/engine launcher/gateway exist; abort it with execution-scope construction on failure. General process construction passes no application capability.
6. **Project to runtimes and preserve raw application arguments.** Add the MCP route/adapter and deterministic collision composition. In the catalog, resolve a registered static adapter independently from its active/protected views; reject an application route if any registered static adapter exists, otherwise let the application route precede configured MCP, and leave the no-application configured protected/prefer branch unchanged. Add native checked schema projection plus the bound tool/composer before `AgentConfig`; native construction relies on readiness rather than importing MCP policy. In `ApplicationAgentTool`, return the checked `ParameterSchema` for advertisement, override `prepareExecution` to bind agent identity/check abort/resolve and normalize result mode while returning the original arguments, and have `_execute` invoke the common capability with those raw arguments. Add direct preparation, inherited execution, native/MCP invalid-input parity, all-static readiness, defensive MCP collision, and configured-policy non-regression coverage. Do not call `super.prepareExecution`; leave `McpSchemaMapper`, `ParameterSchema`, `BaseTool`, every ordinary tool subclass, `resolveAutoByteusRuntimeAgentToolExposure`, `buildRuntimeAgentToolExposure`, Memory Compactor rules, and configured-MCP collision semantics unchanged.
7. **Replace destructive live catalog mutation before enabling package tools.** Add immutable package/application transition plans and staged `ApplicationBundleService` candidate/synchronous commit APIs. Revise `ApplicationReentryService` into participant-only prepare/recover/quarantine operations. Add `ApplicationCatalogTransitionService`, wire package commands and REST reentry through it, and remove `ApplicationCatalogRefreshCoordinator`, old `ApplicationReentryService.reloadAndReenter`, and direct `bundleService.refresh/reloadApplication` callers. Initialize/reconcile the application tool catalog before definition readiness; validate the exact-app selection union and complete platform/static collision set. Prove Settings/GraphQL reload/removal captures old package IDs and quiesces/drains/stops them before command mutation, commits only the prepared target slice, preserves unrelated lanes, recovers active current apps, closes removed apps, and re-stages actual rollback state. Extend platform shutdown with the same call lifecycle owner. Ensure failed worker calls are not lazily restarted by the tool boundary.
8. **Add the maintained proof.** Brief Studio declares/selects `get_brief_context`; the handler derives the brief from `caller.bindingId` and existing `brief_bindings`/brief repositories, returns read-only durable state, and prompts exercise it. Socratic Math remains a non-owning/cross-app visibility witness. Update all maintained apps to current contract versions.
9. **Remove/regenerate derived outputs.** Delete stale generated packages and build importable/standalone artifacts through devkit. No database migration runs.
10. **Validate in increasing scope.** Contract/unit/architecture tests, worker integration, MCP/native runtime construction tests, application isolation/reload/shutdown tests, then downstream Studio/standalone API/E2E runtime matrix for AutoByteus, Claude, and Codex.
11. **Final cleanup.** Remove provisional duplicate DTOs/branches and verify no application tool registration, per-app MCP listener, fixed timeout, retry, or old version reader remains.

## Key Tradeoffs

- **One canonical capability, two projections:** this is less superficially uniform than forcing native through HTTP, but it preserves current native fundamentals, avoids local network/auth overhead, and follows an established universal-tool pattern.
- **Static declarations plus worker handlers:** metadata and handler code live in two artifacts, so exact matching is required at worker load. The benefit is import-safe package discovery and lazy/isolated business code.
- **Per-tool fingerprint:** slightly more normalization work than an app-wide generation. It correctly lets unchanged routes survive unrelated tool additions and code-only updates while rejecting changed declarations.
- **One-time assembly:** introduces a narrow construction pattern, but it avoids a dependency cycle and mutable global state. It is completed once before lifecycle readiness and fails closed before completion/after close.
- **Portable JSON-schema subset:** excludes nullable values, length keywords, defaults, and closed objects even though Ajv/MCP could express them. This is intentionally narrower than the initial draft so the unchanged native mapper/model advertises the same validation semantics. A future richer contract must extend the shared native model first.
- **Checked advertisement, raw native invocation:** the native adapter intentionally does not use its checked `ParameterSchema` as a pre-gateway invocation validator. This small specialization duplicates only the base class's two-value result-mode guard because the base helper is private, but it avoids a global base-class change and guarantees that common Ajv sees the same raw JSON as MCP. The generic coercive behavior remains intact for every other tool.
- **All static names reserved, configured precedence preserved:** an application cannot reuse an inactive or configured-preferred static name, which is stricter than current IR-001 routing but exactly matches the approved ownership rule and prevents availability-dependent ownership. The complete set crosses the host as names only; adapter implementations and the existing browser/configured-MCP precedence remain internal to the MCP catalog.
- **One staged catalog transition owner:** removing the small refresh coordinator and narrowing reentry to participant lifecycle is more refactor work than inserting drain calls at two sites, but it prevents either supported path from bypassing lifecycle and gives package rollback one real before/after commit basis. The global transition mutex serializes catalog commits only; unrelated application tool calls remain open.
- **1 MiB application-tool payload limit:** rich content larger than 1 MiB is rejected, but this matches established application communication scale and leaves ample envelope headroom under the 4 MiB worker frame. Large data should be represented by application resources/artifacts, not embedded in a tool frame.
- **Fail closed after unexpected worker failure:** later calls remain unavailable until an owning recovery/reentry path restores the worker. This avoids turning tool invocation into a hidden restart/retry owner and is the approved resilience posture.

## Risks

1. **Task-created Team authorization:** persisted bindings do not enumerate every later descendant. The ownership extension must require the server-minted Team execution identity, verify its `rootTeamRunId` is the exact bound Team run, require its `agentRunId` to equal the application producer/sender, and enforce exact configured-member mapping when that address is in the persisted member list. Do not accept a free-form member/root tuple from tool arguments.
2. **Catalog transition rollback:** package source/registry rollback can itself fail or restore an unreadable package. `ApplicationCatalogTransitionService` must never reopen from the captured old in-memory snapshot alone; it restores command state, stages and validates the actual restored slice, then recovers. Failed restoration leaves only the affected participants closed/quarantined, reports aggregate errors, and releases the transition lock.
3. **Worker construction cycle:** directly injecting `ApplicationEngineLauncher` into `ApplicationExecutionScope` creates a cycle. Use the one-time capability assembly exactly; no module-global setter.
4. **Schema parity:** current mapper behavior includes permissive fallbacks and property drops for inputs outside its supported shape. The SDK parser must reject those shapes first, and the native projector must compare the mapped round trip and fail readiness rather than trusting the mapper. Contract tests must exercise every supported keyword recursively and every explicitly rejected family.
5. **Native pre-gateway parity:** accidentally calling `super.prepareExecution`, validating through the checked `ParameterSchema`, or cloning/normalizing arguments would reintroduce a native-only interpretation. Tests must cover direct `prepareExecution`, the real ToolPhase/inherited `execute` path, and common-gateway worker non-invocation for coercible strings, empty-string arrays, and nested values. Architecture coverage must prove the specialization exists only on `ApplicationAgentTool` and `BaseTool` is unchanged.
6. **Collision-policy regression:** the complete static set and configured-MCP protected subset are both derived from the same adapter index but have different meanings. A vague `protected` name or shared filtered set can reintroduce application shadowing; conversely treating all static names as configured-protected would break the existing browser `prefer_configured_mcp` contract. Tests and API names must keep the two policies separate.
7. **Native result semantics:** the bound tool must return the same canonical MCP-result envelope used by existing generic MCP tools; do not stringify structured/rich results in an application-only branch.
8. **Error leakage:** raw worker exception strings may contain paths or business data. MCP and native outward failures must use typed safe messages; logs must not record bearer tokens, arguments, or results.
9. **Generated artifacts:** strict version bumps will make stale built packages unusable. Maintained outputs must be regenerated in the same change and package validation must fail clearly for retired versions.
10. **Test environment:** the design stage's earlier worktree lacked Vitest, but IR-001 later established dependencies and CRR-001 executed a focused temporary Vitest collision probe successfully. The probe was removed. Corrected implementation and API/E2E stages must record durable or retained execution evidence under their own ownership.

## Guidance For Implementation

- Treat the exact names `agentTools`, `agentToolHandlers`, `ApplicationAgentTool*`, manifest `5`, backend definition `7`, and the 1 MiB payload limit as design decisions, not placeholders.
- Rename the current complete `AgentToolMcpCatalog.listSupportedToolNames()` reader to `listStaticAdapterToolNames()` and remove public `listProtectedStaticToolNames()`. Treat every returned name as reserved from application declarations. Build it directly from `adaptersByName`, sort deterministically, and do not filter by `isAvailable`, `configuredMcpCollisionPolicy`, configured MCP registry state, runtime exposure, selected applications, or requested tool names.
- Replace `AgentToolsMcpHost.protectedStaticToolNames` with `staticAdapterToolNames`, freeze/copy the complete catalog list once after adapter registration, and carry that exact set through Studio/standalone `buildApplicationPlatformRuntime` and orchestration construction into `ApplicationDefinitionRuntimeReadiness`. Do not expose catalog/adapters to readiness and do not retain a deprecated alias.
- Readiness must compare all declarations returned by `ApplicationAgentToolCatalog.listToolNames(applicationId)` with `staticAdapterToolNames`, even if no Agent currently selects the declaration or the static adapter is unavailable. Emit an application-specific platform/static collision diagnostic and quarantine/fail selected startup under the existing readiness contract.
- In `AgentToolMcpCatalog.resolveRuntimeSessionToolExposure`, keep three distinct static views: registered static adapter (any entry in `adaptersByName`), active static adapter (`isAvailable`), and configured-protected static adapter (`protect_static_adapter`). The application branch checks the registered view and rejects on any collision; only a non-colliding application route may precede configured MCP. The no-application configured branch continues using active/protected views exactly as today, including browser `prefer_configured_mcp` behavior.
- Add `ajv` 8 as a direct `autobyteus-server-ts` dependency; do not rely on a transitive copy. Configure strict/all-errors validation over only the normalized supported subset and cache validators by declaration fingerprint. Do not enable `useDefaults` or accept unlisted schema keywords.
- Keep `autobyteus-ts/src/tools/mcp/schema-mapper.ts`, `src/utils/parameter-schema.ts`, and `src/tools/base-tool.ts` behavior unchanged for this ticket. The application SDK parser rejects nullable, length, default, `additionalProperties`, composition/reference, and unknown semantics; the AutoByteus projector requires canonical mapper round-trip equality before constructing the bound tool.
- In `application-agent-tool.ts`, keep the projected `ParameterSchema` only for the advertised native tool definition. Override the public `prepareExecution` and do exactly four lifecycle tasks: set `agentId` from context when absent, reject an already-aborted signal with the ordinary pre-start error, call `getToolResultExecutionMode` with the raw object, and locally guard the result to `in_process | external_result`. Return that same object. Do not call `super.prepareExecution`, schema validation, coercion, defaulting, cloning, or normalization. The class uses the inherited default `in_process` mode, inherited `execute` post-preparation abort check, and ordinary canonical result path.
- `ApplicationAgentTool._execute` must pass the arguments received from preparation unchanged to `ApplicationAgentToolCapability.invoke`. The capability/gateway input boundary accepts the raw JSON object and performs serializability/size/schema validation before authorization-approved worker dispatch. Do not add a native-only validator, worker cancellation method, timeout, or retry.
- Validate request serialization/size and schema before `ApplicationEngineController` is called. Validate result shape/serialization/size inside the worker before `respondSuccess`, then validate again at the host gateway as defense in depth.
- Invocation order is normative: acquire permit -> require active/current route -> require live ownership -> validate input/size -> resolve allowed worker state -> invoke exactly once -> validate result -> release permit in `finally`.
- Worker-state policy is normative: `ready` invokes; a clean `stopped` or already-starting state may be started/joined; unexpected `failed` or `stopping` rejects. The failed invocation is never retried.
- Package transition order is normative: acquire catalog-transition lock -> capture old application IDs for the target package from the live snapshot -> mark them reentering and close/drain their application-tool lanes -> stop those exact workers -> execute the package command's registry/source mutation -> stage the next target-package slice without live mutation -> derive old/current/added/removed participants and prepare bundle/tool/readiness data -> synchronously commit the prepared bundle and application-tool slices with no `await` -> targeted reconciliation/definition refresh -> load/validate and recover previously active current apps -> activate/reopen successful participants; removed/invalid participants remain closed/quarantined -> release in `finally`. Unrelated package slices, workers, admissions, and routes are never transition participants.
- Exact-application REST reentry uses the same transition service and prepared commit mechanics with an application-scoped slice. Rollback is normative: command restores registry/source state -> service stages the actual restored slice -> prepared commit -> recover/reopen prior participants only if validation succeeds. Do not reinstall a captured in-memory snapshot over unreadable files.
- Shutdown order is normative: execution quiesce -> application-tool quiesce/drain -> existing ingress/gateway/artifact cleanup -> worker stop -> execution-scope run/session close -> application-tool capability close. Preserve aggregate cleanup behavior.
- Keep the application route pure data so session registry cloning remains safe. The capability reference belongs in session execution capabilities, not inside each route.
- Extend `AgentToolMcpCatalog` with the complete static-adapter-name reader exposed by `AgentToolsMcpHost`; do not hard-code names or expose/filter by configured-MCP protection in the application subsystem.
- The MCP session list uses the route's declaration snapshot; call uses the route plus current catalog fingerprint validation. `listChanged` remains false.
- For application-over-configured precedence, first prove no registered static adapter owns the name, then resolve the exact application's route before configured MCP. Every static adapter makes the application declaration invalid, including `prefer_configured_mcp` browser adapters and unavailable adapters. Native composition relies on the readiness gate and applies application-over-configured precedence without importing MCP static policy.
- Do not change `AUTOBYTEUS_DEFAULT_TOOL_NAMES`, `AUTOMATIC_TEAM_TOOL_NAMES`, their exposure builders, or compactor logic. Add regression assertions that their output/order/deduplication is byte-for-byte equivalent when no application route exists.
- Brief Studio's sample must derive current business state from `context.caller.bindingId`, use its existing database/repository layer, and remain read-only. It must not accept `applicationId`, `bindingId`, or arbitrary `briefId` as routing authority from model arguments.
- Architecture tests should assert dependency prohibitions: no imports of bundle stores/controller/launcher from MCP/native adapters; no default tool registry registration from `application-agent-tools`; no application capability in `GeneralProcessRunSupervisor`; no per-app MCP route/process construction; no MCP provider/catalog import from application readiness or native composer; and no application collision dependency named/derived as a configured-MCP protected subset.
- Architecture tests must also assert: package commands and REST reentry cannot import/call `ApplicationBundleService.refresh/reloadApplication`; `ApplicationCatalogRefreshCoordinator` and the old reentry bundle-mutation API are gone; `ApplicationReentryService` has no bundle/catalog dependency and is callable only by the transition owner for participant lifecycle; live bundle/tool commit methods are reachable only from `ApplicationCatalogTransitionService`; native application schema construction cannot bypass `ApplicationAgentToolNativeSchemaProjector`; `ApplicationAgentTool` owns an explicit raw `prepareExecution` override and never calls `super.prepareExecution`; and no production change disables or alters generic `BaseTool` coercion/validation.
- Native/MCP parity coverage must send each coercible-invalid family through the real adapters: integer string, number string, boolean strings/aliases, empty string for array, and nested coercible object/array-item values. Each path must present the original object to the common gateway, produce the same typed invalid-input outcome, and record zero worker invocations. Correctly typed numeric/boolean/array/nested values must still pass. Direct native preparation tests must also prove agent-ID binding, already-aborted rejection, default `in_process` result mode, invalid-mode rejection in a test subclass, unchanged object identity, and inherited execution reaching `_execute` without a second transformation.
- Collision coverage must enumerate every default static adapter provider and assert its name appears in `staticAdapterToolNames` regardless of configured policy/availability. At minimum, prove application `open_tab` fails readiness and defensive MCP composition under `prefer_configured_mcp`, prove a `protect_static_adapter` name fails identically, prove an unavailable static name remains reserved, prove non-static application-over-configured still wins, and prove configured `open_tab` still wins over the browser static adapter when no application declaration exists.
- Downstream API/E2E coverage should include: zero-tool non-regression; valid/missing/extra handler load; accepted schema round-trip and explicit nullable/length/closed-object/default rejection; raw invalid-input parity across AutoByteus/Claude/Codex; unselected absence; general/App A/App B isolation and same-name fixtures; all-platform/static collision quarantine; non-static app-over-configured collision; configured/static protected/prefer non-regression; AutoByteus/Claude/Codex selection and result; configured and task-created Team members; input/result/error bounds; unchanged/changed fingerprint reload; an admitted call overlapping the real Settings/GraphQL package removal path; package import with no existing-app interruption; rollback restoration and rollback quarantine; worker crash; session revocation; Studio/standalone shutdown; and the real Brief Studio durable-state tool.
