# Application Execution Scope Ownership And Spine Map

## Status And Use

- Status: `Design-ready`
- Purpose: make the proposed application-execution boundary, dependency direction, lifetime, and full production spines reviewable without reconstructing the object graph from source.
- Intended-behavior authority: `Yes`, within `REQ-001`–`REQ-010` and `AC-001`–`AC-011`.
- Approval state: the user explicitly authorized a design-first boundary-hardening refactor and asked for clear ownership, data-flow spines, simpler dependencies, and removal of implicit/redundant paths. This artifact narrows that approved goal; it does not add product behavior.

## Lifetime And Multiplicity

`ApplicationExecutionScope` exists **once per `ApplicationPlatformRuntime` lifetime**.

| Host | Platform-runtime multiplicity | Execution-scope multiplicity | Applications served | Reentry behavior |
| --- | --- | --- | --- | --- |
| Studio | One | One | All maintained/mounted applications admitted by the runtime | Reloads a worker/binding and resumes events; it does not rebuild the scope |
| Standalone | One | One | The selected application | Same scope remains until host/platform close |

This is not one scope per mounted application. Current source contains no supported lifecycle that destroys one application's manager family while preserving another. Adding such multiplicity would require the prohibited application-ID-to-manager registry or service-locator shape.

## Ownership Map

| Owner | Scope | Owns | Receives | Exposes | Must not own/expose |
| --- | --- | --- | --- | --- | --- |
| Studio/standalone composition root | Process/host | construction order and process unwind | configuration | explicit host handles | application run managers or application sessions |
| `GeneralProcessRunSupervisor` | Process-general execution | general Agent/Team managers, services, sessions, run cleanup | canonical definitions and process infrastructure | general run services | application execution internals |
| `ApplicationPlatformRuntime` | One application-platform lifetime | packages, storage, availability, workers, backend gateway, delivery queues, recovery/reentry, host projections, whole-platform lifecycle | process infrastructure and selected-app policy | lifecycle, REST, realtime, host-management projections | raw execution managers/registries/session manager |
| `ApplicationExecutionScope` | One platform-runtime lifetime | exact graph-local Agent/Team execution kernel, application MCP session scope, activation/resources, publication/projection/relay, memory/context, stream source, admission and ordered run/session close | canonical definitions, workspace and MCP factories, binding/artifact ports | immutable subject-specific execution, streaming, artifact, memory, readiness, and lifecycle capabilities | generic lookup, service bag, process-general manager, public transport routing |
| Application orchestration | Application binding/use case | binding authorization, launch/input/terminate coordination, recovery observation | only narrow scope capabilities plus its own stores | host service | execution internals or global getters |
| `RootTeamRun` | One Team run | task lifecycle/state/persistence/events and root-local task resolution | immutable member/task capability | member/session task capability | process-global Team lookup or application-ID routing |

## Exact Scope Capabilities

The concrete scope owns its internals, while consumers receive only the needed frozen view. These are semantic capabilities, not a `services` dictionary.

The normative TypeScript signatures, exact build inputs, admission semantics, getter disposition, and internal orchestration result are defined in `application-execution-scope-contracts.md`. The rows below are a responsibility summary and cannot be widened independently.

| Capability | Allowed operations | Intended consumers |
| --- | --- | --- |
| `ApplicationAgentExecution` | create and return immutable run identity; post input through restore-aware internal resolution; terminate; observe lifecycle | binding launch, orchestration input/terminate, binding observer |
| `ApplicationTeamExecution` | create preset/configured Team and return immutable root/member projection; post root/member input through restore-aware internal resolution; terminate; observe lifecycle | binding launch, orchestration input/terminate, binding observer |
| `ApplicationExecutionStreaming` | attach to the authorized exact Agent/Team target | application streaming service |
| `ApplicationPublishedArtifactAccess` | list projections and read revision text for a bound run/member | orchestration host |
| `ApplicationExecutionMemoryLookup` | resolve a Team member's memory location | orchestration host |
| `ApplicationExecutionToolReadiness` | expose the graph-local publication capability to tool readiness and assert scoped-session readiness | startup/tool readiness only |
| `ApplicationExecutionLifecycle` | `quiesce()`, `close()` | platform lifecycle only |

No capability exposes `AgentRunManager`, `AgentTeamRunManager`, `AgentRun`, `RootTeamRun`, activation/resource registries, or `ScopedAgentToolMcpSessionManager`. Agent/Team live aggregates are excluded from return values and remain private; input is expressed as commands and Team launch as a copied immutable root/member projection.

## Acyclic Construction Order

1. `buildApplicationPlatformRuntime` creates outer storage, availability, controller, and delivery queues.
2. The same assembly root creates the orchestration persistence owners that the execution relay needs (`ApplicationRunBindingStore` and its sibling lookup/override/journal stores). Constructing them here does not transfer ownership to the platform builder; it is explicit assembly.
3. The builder creates `ApplicationExecutionScope` with the binding-store reader, artifact-delivery queue, canonical definitions, workspace owner, and Agent Tools session factory.
4. The builder creates orchestration services from the already-created stores and the scope's narrow capabilities.
5. It creates gateways, lifecycle, and the four public runtime projections.

There is no later-bound callback or deferred container. If a constructor after scope creation fails before the runtime is published, the concrete scope's assembly-only `abortConstruction()` synchronously closes its not-yet-live session scope and marks the scope closed. Normal callers never receive this method; they receive only `ApplicationExecutionLifecycle`. Scope construction itself tracks the raw session scope/session manager and closes whichever was created before rethrowing. The governing invariant is that construction cannot start a run.

## Spine Inventory

### DS-001 — Studio boot

`server runtime -> buildStudioServer -> canonical HostDefinitionServices + AgentToolsMcpRuntime -> separate GeneralProcessRunSupervisor -> buildApplicationPlatformRuntime -> ApplicationExecutionScope -> configured HTTP/WS surfaces -> lifecycle prepare/recover`

The Studio composition owns process order. The platform runtime owns its lifetime. The scope owns only application execution.

### DS-002 — Standalone boot

`startStandaloneApplicationHost -> process/migration/package validation -> canonical HostDefinitionServices + AgentToolsMcpRuntime -> separate GeneralProcessRunSupervisor -> buildApplicationPlatformRuntime(selected application) -> ApplicationExecutionScope -> listen -> recover`

The same internal application execution boundary is used; only host setup and exposed surfaces differ.

### DS-003 — Application launch/input

`application UI/worker capability -> engine context/orchestration host -> binding authorization + launch configuration -> ApplicationAgentExecution or ApplicationTeamExecution command -> scope-private exact service/manager/backend or RootTeamRun -> immutable launch/input disposition -> binding/event consequence`

The orchestration owner never receives a manager or live run aggregate. The scope enforces admission and exact graph identity, performs restore-aware input dispatch internally, and returns only `{runId}`, `{teamRunId,members}`, or the accepted/rejected/not-available disposition required by the use case.

### DS-004 — Streaming return

`application connection -> binding authorization lease -> ApplicationExecutionStreaming -> exact active Agent/Team run event source -> application event mapper/queue -> worker/frontend connection -> application UI`

The stream source has no singleton fallback. Binding authorization remains above the scope; the scope consumes an exact authorized target.

### DS-005 — Publication return

`authenticated /mcp/agent-tools/:sessionId -> scope-owned scoped session/catalog provider -> scope publication authority -> activation registry + exact run -> projection + run event -> scope relay -> artifact delivery queue -> worker ensure/controller -> application durable projection`

The route/catalog are process infrastructure; the session and graph-sensitive provider capability are scope-owned.

### DS-006 — Shutdown

`host close stops ingress -> platform lifecycle quiesces scope -> event/communication/backend/notification intake stops -> artifact delivery drains -> observers detach -> workers stop -> scope closes Teams -> scope closes Agents -> scope revokes/closes remaining sessions/resources -> streaming connections stop -> general/process infrastructure closes later`

`ApplicationExecutionScope.close()` is idempotent, continues independent cleanup after one failure, and aggregates failures. It does not close process-owned infrastructure.

### DS-007 — Reentry

`reload request -> ApplicationReentryService -> stop/reload worker bundle + availability -> binding recovery -> pending-event resumption -> same ApplicationExecutionScope and manager identities`

No execution-scope registry or replacement is introduced.

### DS-008 — Root-local task delegation (bounded local)

`RootTeamRun -> root-local MemberTaskRootResolver -> immutable member context -> scoped MCP/native delegate_task -> same RootTeamRun task lifecycle`

This passed design remains unchanged and stays inside the Team-run owner.

### DS-009 — Construction failure unwind (bounded local)

`scope creation -> create session scope -> create execution resources/services -> failure -> close only created execution-owned resources in reverse -> rethrow -> platform builder unwinds its already-created outer resources`

Construction creates no live run. No process-owned definition, MCP runtime, workspace, or provider owner is closed by scope unwind.

## Allowed Dependency Direction

1. Studio/standalone composition -> process infrastructure, `GeneralProcessRunSupervisor`, `ApplicationPlatformRuntime`.
2. `ApplicationPlatformRuntime` -> `ApplicationExecutionScope`.
3. Orchestration/streaming/lifecycle -> one exact scope capability, never raw internals or live `AgentRun`/`RootTeamRun` return objects.
4. `ApplicationExecutionScope` -> explicitly injected canonical definitions, workspace/MCP/process infrastructure, and platform-owned binding/artifact ports.
5. Scope internals -> existing Agent/Team execution, memory, history, publication, and MCP implementations.
6. `RootTeamRun` -> immutable root-local task capability -> member/session/native task tools.

## Forbidden Dependencies

- Application paths -> `AgentRunManager.getInstance()`, `AgentTeamRunManager.getInstance()`, `getAgentRunService()`, or `getTeamRunService()`.
- Application paths -> application-ID/run-ID manager/service locator.
- An upstream consumer -> both a scope capability and a raw scope-owned manager/registry/session manager, or any outward capability returning `AgentRun`/`RootTeamRun`.
- Scope -> `GeneralProcessRunSupervisor` internals, or general execution -> scope internals.
- Routes/controllers -> execution managers.
- Scope -> package catalog, worker controller, availability, recovery/reentry, or public transport ownership.
- Public agent target/address resolution -> scope manager lookup; it remains a binding-authorization concern above the scope.

## Current To Target Structural Map

| Current shape | Target shape | Reason |
| --- | --- | --- |
| `createApplicationRunServices()` returns ten mixed-level mutable members | `ApplicationExecutionScope` privately constructs/owns the execution kernel | one authoritative mutable owner |
| `createApplicationOrchestrationServices()` receives/returns raw execution leaves | orchestration receives narrow scope capabilities and returns only sibling outer orchestration assembly handles used inside the platform builder | no mixed-level bypass; the internal assembly result is not an authoritative public boundary |
| lifecycle enumerates session manager + shutdown coordinator leaves | lifecycle uses `ApplicationExecutionLifecycle` | one owned quiesce/close boundary |
| stream source can fall back to process-global Agent manager | exact injected stream source inside scope | fail-closed graph identity |
| application builders call process getters | composition passes named process dependencies | visible dependency direction |
| run shutdown coordinator lives under platform-runtime assembly | renamed/moved inside application execution and retained as the real Team-before-Agent concern | file placement matches ownership |
| Agent/Team capabilities return live `AgentRun`/`RootTeamRun` so callers perform input/snapshot mutations outside the owner | scope retains live aggregates; exposes exact input commands and frozen Agent/Team launch projections | authoritative boundary governs behavior, not only construction |

## Immutable Command / Projection Boundary

- Agent creation returns a frozen `{ runId }` projection.
- Team creation returns a frozen `{ teamRunId, members: [{ memberAddress, agentRunId }] }` projection built recursively from configured nodes only; the binding owner still derives display names and public DTO fields.
- Agent/Team input commands resolve or restore the live run inside the scope and return only `ACCEPTED`, `REJECTED(message)`, or `NOT_AVAILABLE`.
- The orchestration host keeps target/binding authorization and exact public error wording. The scope keeps run resolution, `postUserMessage`/`postMessage`, and Team tree snapshot access.
- Lifecycle observation and termination remain explicit commands. Root-local task operations remain inside `RootTeamRun` and are not projected through the application boundary.

## Verification Obligations

- Architecture occurrence/import guards enforce the allowed/forbidden directions, exact named construction obligations, zero live-run types in outward scope contracts, and zero direct run resolution/post/snapshot calls in orchestration consumers.
- Construction tests prove one scope per platform runtime, no live run on construction, exact projection identity, and reverse failure unwind.
- Lifecycle tests preserve the full outer shutdown order and prove scope quiesce/close idempotence.
- Identity tests prove launch, stream, publication, memory, nested Team tasks, and cleanup reach one exact internal family; general/application identities remain non-identical.
- Dual-host realistic tests preserve launch/input, real streaming, real publication/projection, nested task/history, recovery/reentry, multi-application Studio isolation, selected standalone behavior, and cleanup.

Every production/test path and AFB-004 fixture/occurrence change is closed in `application-execution-scope-transition-inventory.md`.
