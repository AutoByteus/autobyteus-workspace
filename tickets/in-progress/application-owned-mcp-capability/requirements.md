# Application-Owned MCP Capability — Requirements

## Status (`Draft`/`Design-ready`/`Refined`)

`Draft — pending explicit user approval`

## Goal / Problem Statement

Enable an application package to declare and implement its own business-specific agent tools, and expose those tools through the existing authenticated Agent Tools MCP transport only to Agent/Team executions that belong to that application. Platform-owned tools and host-configured MCP tools remain process-owned shared capabilities. This ticket establishes the application MCP capability and its production boundary first; it does not publish or redesign the broader external developer-facing SDK journey.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | Platform/static and host-configured MCP tools can be exposed to Agent Tools MCP sessions; an application package cannot own a scoped tool catalog or handler set. | Each application may declare a static catalog of application-owned agent tools and implement the matching handlers in its own backend worker. | Platform/static tools and configured global MCP tools remain under their current process owners. | REQ-001, REQ-002, REQ-008; AC-001–AC-004 |
| BEH-002 | Application-owned Agent/Team definitions select `toolNames`, and readiness resolves those names only against the process-global registry. | Readiness resolves an application definition's selected names against the union of allowed process tools and that exact application's declared tools, with fail-closed missing/collision diagnostics. | Explicit selection remains mandatory; no tool is automatically granted merely because it exists. | REQ-003, REQ-004, REQ-009; AC-005–AC-009 |
| BEH-003 | One process MCP host issues authenticated execution-family-scoped sessions and routes platform/configured-MCP calls. | The same physical host composes an immutable effective route set per session, adding only the owning application's selected tools when authoritative application execution context is present. | Provider-neutral MCP descriptors, bearer authentication, session revocation, and separate general/application execution families remain unchanged. | REQ-005, REQ-006, REQ-012; AC-010–AC-014 |
| BEH-004 | Application workers execute lifecycle, query, command, route, GraphQL, event, artifact, and WebSocket handlers, but no agent-tool handler. | An application-tool call is authorized from the session's application/binding/producer identity, dispatched to the exact owning application worker, and returned as a bounded MCP-safe tool result. | The worker remains the owner of application business code and application storage; the platform remains the owner of transport, authorization, and execution routing. | REQ-007, REQ-010, REQ-011; AC-015–AC-020 |
| BEH-005 | Package reload/unmount and worker failure have no application-tool lifecycle to coordinate. | Application-tool admission follows package/worker lifecycle: reload blocks new calls, drains admitted calls before normal worker stop, and rejects removed or schema-changed routes from older sessions without retrying them. | Existing package reentry, binding recovery, run cleanup, and whole-platform shutdown outcomes remain unchanged outside the added tool lane. | REQ-013, REQ-014, REQ-015; AC-021–AC-027 |
| BEH-006 | Current package and backend-definition contracts contain no application-tool declaration/handler shape. | The current contracts gain one clean application-tool representation; maintained applications are rebuilt on that contract, while durable application/runtime data remains directly usable. | No database schema, binding identity, Agent/Team definition format, or global MCP configuration is rewritten. | REQ-016, REQ-017; AC-028–AC-031 |

## Investigation Findings

- The existing `AgentToolsMcpHost` is already the correct physical MCP transport owner. It owns the authenticated route, process/static catalog, configured-MCP resolution, session registry, dispatcher, and scoped session-authority factory.
- Each issued session already carries authoritative `ApplicationExecutionContext` (`applicationId`, `bindingId`, producer `agentRunId`) when the run was launched from an application binding. General-process sessions do not carry that context.
- The application backend worker is the current owner of application business handlers and storage, and the host/worker JSON-RPC boundary is the established application invocation path.
- Application package scanning and runtime-definition readiness happen without starting application workers. A static package declaration is therefore required; discovering tools by importing application code would violate current package-import safety and lazy worker startup.
- One `ApplicationExecutionScope` serves the current `ApplicationPlatformRuntime` lifetime and may serve multiple Studio applications. Application-tool isolation must therefore use the session's exact `applicationId`, not create one execution scope per application or add an application-to-manager router.
- The current engine request path has no fixed 30-second completion deadline. Application-tool calls can use the same completion-coupled request path and must not reintroduce timeout-driven ambiguous completion.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `application-owned-mcp-intended-behavior.md` | Intended-behavior contract and scope decision table | REQ-001–REQ-017 | AC-001–AC-031 | Draft — pending user approval with this document | Clarifies what “application MCP” means for this ticket, the visibility/collision/lifecycle policies, and the boundary from arbitrary application-hosted MCP servers. |

## Design Health Assessment (Mandatory)

- Change posture: `Feature` / `Larger Requirement`
- Initial design issue signal: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`
- Refactor posture: `Likely Needed`
- Evidence basis: application business tools belong to the application package and worker lifecycle, while the only current dynamic MCP discovery/registration authority is process-global. Directly registering application tools into that registry would mix owners, allow cross-application leakage, and make package reload mutate unrelated process state. The transport/session infrastructure is healthy and reusable, but catalog composition and dispatch need an explicit application-owned capability boundary.
- Requirement or scope impact: the solution must add application-local declaration, validation, route composition, authorization, worker dispatch, and lifecycle coordination while preserving one shared transport and separate execution families.

## Recommendations

1. Implement **application-owned agent tools exposed through the existing Agent Tools MCP host**, not one network MCP server per application.
2. Keep static tool metadata package-owned and handlers worker-owned. Do not execute application code during package scan merely to discover tool schemas.
3. Compose tool routes per authenticated session. Never copy application tools into the process-global tool registry.
4. Use application-local precedence over host-configured MCP only inside the owning application's session, reject collisions with platform/static tools, and allow the same local tool name in different applications because application identity is part of the route.
5. Dispatch through an application-platform-owned gateway that validates current binding ownership and package declaration before invoking the worker. Do not give MCP transport code raw engine managers or application execution managers.
6. Make this a clean current-contract change with regenerated maintained application packages; do not add aliases, dual handler shapes, or old/new runtime branches.

## Scope Classification (`Small`/`Medium`/`Large`)

`Large`

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001`: an application package declares business-specific agent tools and implements their handlers.
- `UC-002`: an application-owned Agent, configured Team member, or task-created Team member explicitly receives selected platform/global and same-application tools.
- `UC-003`: an authenticated application Agent Tools MCP session lists and invokes a selected application tool against the owning worker.
- `UC-004`: two applications may declare the same local tool name without seeing or invoking each other's handler.
- `UC-005`: Studio and standalone enforce identical application-tool selection, authorization, dispatch, result, and cleanup behavior.
- `UC-006`: package reload, application removal, worker failure, run termination, and platform shutdown coordinate application-tool admission and stale-route behavior.
- `UC-007`: a maintained application demonstrates one real read-only application-owned tool through the production path.

### Out of Scope

- Publishing, versioning, or documenting the packages as a generally consumable external developer SDK.
- Redesigning the complete application authoring experience, framework integrations, scaffolding, or public documentation journey.
- Allowing an application package to install, spawn, or supply an arbitrary third-party `stdio`, SSE, or remote MCP server/configuration.
- Application-managed remote MCP credentials, marketplace/consent UI, billing, or per-user permission policy.
- Replacing the shared Agent Tools MCP endpoint, provider adapters, `ApplicationExecutionScope`, or `GeneralProcessRunSupervisor`.
- Automatically exposing every application or global tool to every Agent.
- A generic applicationId/runId execution-manager registry, service locator, or per-mounted-application execution scope.
- Background or detached application-tool jobs; this ticket covers completion-coupled tool calls only.

The minimum contract types needed to declare and implement application tools are in scope. Broader SDK publication and developer-experience work remains explicitly deferred.

### Preserved Behavior Boundary

BEH-001–BEH-006 preserve existing platform/static tools, configured global MCP tools, provider-neutral descriptors, GeneralProcessRunSupervisor/ApplicationExecutionScope separation, RootTeamRun-local task capability routing, application binding authorization, package import safety, Studio/standalone parity, application storage ownership, and current run/session cleanup. Application-tool routing must not weaken or bypass those owners.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, or operational contract is a `Requirement Gap`; it must return for explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It must not be treated as a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The solution designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Functional Requirements

- `REQ-001` — Each application may declare zero or more application-owned agent tools using one static package-owned definition per tool: provider-safe local name, non-empty description, and object-valued JSON input schema.
- `REQ-002` — The matching handler implementation executes only inside that application's backend worker and receives the ordinary application handler capabilities plus immutable caller identity derived by the host; application code must not register handlers in process-global state.
- `REQ-003` — Agent/Team `toolNames` remain the sole explicit selection mechanism. Declaring an application tool does not grant it to any Agent that did not select its name.
- `REQ-004` — Application runtime readiness must validate every selected tool name against the union of allowed process tools and the exact owning application's catalog. Missing tools, invalid declarations, duplicate local names, missing handlers at worker load, and forbidden collisions must fail closed with application-specific diagnostics.
- `REQ-005` — One physical `AgentToolsMcpHost` and one authenticated MCP route family must serve general and application execution. The feature must not create an MCP listener/process per application.
- `REQ-006` — A session may receive an application-tool route only when its authoritative execution context identifies an application, binding, and producer run that belong together. A general-process session or another application's session must not list or invoke the route.
- `REQ-007` — Application-tool dispatch must follow the exact route identity captured at session issuance and revalidate the current application, attached binding/producer, declaration fingerprint, availability, and worker before handler invocation. No caller-provided application ID or global run lookup may choose the target.
- `REQ-008` — The platform MCP host owns transport, authentication, session composition, and MCP result mapping; the application package owns declarations; the application worker owns handler code and business state; the application platform owns binding authorization, worker routing, and tool-call lifecycle.
- `REQ-009` — Tool-name policy must be deterministic: application declarations that collide with platform/static Agent Tools MCP names are invalid; same-name declarations in different applications are allowed; within an owning application session an application tool is authoritative over a host-configured MCP tool with the same name; outside that application the configured MCP tool retains its existing behavior.
- `REQ-010` — An application tool receives JSON-object arguments and may return bounded MCP-safe text/rich content and optional structured content with explicit tool-error status. Invalid, unserializable, or over-limit input/result values fail before crossing or leaving the worker boundary.
- `REQ-011` — The handler caller context must include the exact application ID, binding ID, producer agent-run ID, and resolved Team member address when applicable. The handler must not infer caller ownership from an arbitrary ID supplied in tool arguments.
- `REQ-012` — Application tool composition must preserve non-identical general and application session authorities, managers, and cleanup. The application route capability may be injected only into the application execution family.
- `REQ-013` — Normal package reload must block new application-tool admission for that application, await already admitted tool calls, stop/reload the worker and catalog, then reopen admission only after the current package is valid. No fixed completion timeout or automatic retry is introduced.
- `REQ-014` — A session route is immutable. A tool added after issuance is unavailable to that session; a removed or schema/description/name-changed declaration fails closed for that old route; a code-only handler update with an unchanged declaration may execute in the current worker after successful reentry.
- `REQ-015` — Worker crash/removal, run/session termination, application removal, and platform shutdown must reject new calls, settle or fail in-flight calls explicitly, and release owned state idempotently. The platform must never report a tool call as failed solely because of a local completion timeout while knowingly allowing it to continue.
- `REQ-016` — The package/backend contracts must make one clean current representation authoritative. The application manifest owns static tool declarations; the backend definition owns the exact matching handler map. No alias, dual representation, runtime fallback, or global-registration compatibility path is allowed.
- `REQ-017` — Current durable application databases, platform binding/journal state, Agent/Team definitions, and global MCP configuration remain directly usable without transformation. Generated/importable application package artifacts using the prior contract are rebuildable artifacts and must be regenerated on the current contract rather than migrated in place.

## Acceptance Criteria

- `AC-001` — A valid package with no application tools remains valid and its Agents retain their current platform/global tools.
- `AC-002` — A valid package can declare one application tool and load a backend definition with exactly one matching handler.
- `AC-003` — Duplicate declarations, invalid names/descriptions/schemas, missing handlers, and undeclared extra handlers are rejected with an application-local diagnostic.
- `AC-004` — Package scanning and validation discover tool metadata without importing or executing the application backend entry module.
- `AC-005` — An application-owned Agent selecting one application tool and one platform tool receives both.
- `AC-006` — An application-owned Agent that does not select a declared application tool cannot list or invoke it.
- `AC-007` — A selected application tool missing from that application's catalog quarantines/fails readiness for that application rather than being silently omitted.
- `AC-008` — Configured and task-created nested Team members preserve the same application context and tool visibility as directly configured members.
- `AC-009` — A shared Agent definition used inside an application resolves application-local names in that application's catalog, while the same definition outside application execution receives no application-local route.
- `AC-010` — Studio and standalone use the same shared MCP route and application-route composition contract.
- `AC-011` — A general-process Agent Tools MCP session cannot list or invoke an application tool, even when it requests the same name.
- `AC-012` — App A and App B may declare the same local name; an App A session invokes only App A's handler and an App B session invokes only App B's handler.
- `AC-013` — An application declaration colliding with a platform/static tool fails readiness; no platform/static adapter is shadowed.
- `AC-014` — In an application session, an application declaration wins deterministically over a configured global MCP tool of the same name; the configured tool remains unchanged in general/other-application sessions.
- `AC-015` — Tool invocation authorizes the session's application ID, binding ID, and producer run against the current attached binding before calling the worker.
- `AC-016` — The worker receives only the selected tool name, validated arguments, immutable caller context, and its normal application handler capabilities; it does not receive a process manager, registry, or raw MCP session.
- `AC-017` — A handler can read/write its own application storage and use allowed application context capabilities without crossing into another application's storage or worker.
- `AC-018` — Valid text/structured/rich results are returned through MCP without application-specific provider branches; an explicit application tool error is returned as an MCP tool error rather than a successful value.
- `AC-019` — Invalid or non-object arguments, non-serializable results, and request/result frames exceeding the single application-tool frame limit fail closed and do not execute or leak partial data beyond the owning boundary.
- `AC-020` — Handler throws and worker transport failures produce sanitized explicit MCP failure; the host does not automatically retry a possibly mutating handler.
- `AC-021` — During normal reload, a newly arriving application-tool call is rejected after quiesce begins and admitted calls settle before the worker is stopped.
- `AC-022` — After reload, an old session can call a code-updated handler only when the tool declaration fingerprint is unchanged.
- `AC-023` — After removal or declaration change, an old route fails closed; a newly issued session reflects the current catalog.
- `AC-024` — Removing/unmounting an application makes all of its application-tool routes unavailable without changing another application's routes or the process-global registry.
- `AC-025` — Run termination/session revocation prevents further calls through the prior bearer capability.
- `AC-026` — Platform shutdown blocks tool admission before stopping application workers and closes application-tool state idempotently without closing process infrastructure out of order.
- `AC-027` — No application-tool production path uses a fixed completion timeout, late unobserved continuation, or automatic retry.
- `AC-028` — Maintained application source and generated package artifacts use the one current manifest/backend-definition contract; retired generated outputs are regenerated rather than patched or dual-read.
- `AC-029` — Existing application databases, bindings, journals, launch overrides, Agent/Team definition files, and global MCP configurations remain byte/semantically usable without migration.
- `AC-030` — Studio with multiple maintained applications and standalone with the selected application both pass real application-tool declaration, launch, list, call, result, isolation, and cleanup scenarios.
- `AC-031` — One maintained application demonstrates a real read-only application tool whose result is derived from that application's own durable business state and whose caller binding belongs to the invoking run.

## Constraints / Dependencies

- One shared process `AgentToolsMcpHost` remains the physical transport and session registry owner.
- `ApplicationExecutionScope` remains one per `ApplicationPlatformRuntime`, not one per application.
- `GeneralProcessRunSupervisor` and application execution managers/session authorities remain separate.
- Application identity must come from the existing binding-created `ApplicationExecutionContext`; do not introduce a run/application manager locator.
- Package discovery remains static and import-safe; handler execution remains worker-isolated.
- The existing completion-coupled engine request path and JSON-line frame writer are reused; one bounded application-tool frame limit may be added instead of a family of overlapping limits.
- Minimal contract and devkit changes needed for this capability are in scope; npm publication and polished external SDK experience are not.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: generated/importable package manifests and backend bundles; durable `platform.sqlite` application bindings/journals/overrides; per-application `app.sqlite`; file-owned Agent/Team definitions; global MCP configuration.
- Required outcome: `Discard or Rebuild` for generated/importable package artifacts on the prior contract; `Directly Usable — No Migration` for durable application/platform data and global MCP configuration.
- Existing data to preserve, discard/rebuild, transform, or quarantine: rebuild maintained package outputs from source on the current contract; preserve all durable runtime/application data unchanged; quarantine an imported package built for the retired contract until it is rebuilt/reinstalled.
- Unacceptable data loss or corruption: loss or rewrite of application business databases, bindings, journals, launch overrides, Agent/Team definitions, or user-configured global MCP servers/credentials.
- Relevant availability, maintenance-window, or rollout constraints: package/tool catalog replacement occurs through existing application reload/reentry; no database maintenance window is required.
- Related requirement and acceptance-criteria IDs: REQ-013–REQ-017; AC-021–AC-031.

## Assumptions

- “Application MCP” in this ticket means application-owned agent tools exposed through the platform's shared authenticated MCP host, not a package-bundled arbitrary MCP server process.
- Application business handlers run in the existing backend worker and may use only the application handler context/capabilities deliberately exposed to them.
- The maintained sample application can add one read-only business tool without changing its external UI/API contract.

## Risks / Open Questions

- The exact manifest and backend-definition contract version numbers are design details, but a clean current-contract bump and package rebuild are required by REQ-016/REQ-017.
- The exact MCP content union and one serialized frame-size value are design details; the behavior must satisfy REQ-010 and AC-018–AC-020.
- The exact maintained sample/tool name is a design choice; it must satisfy UC-007/AC-031 without introducing a new user-facing workflow.
- If the user instead intends application packages to bundle arbitrary external MCP server processes/configuration, that is a material scope expansion and requires renewed requirements approval.

## Requirement-To-Use-Case Coverage

| Use Case | Covered By |
| --- | --- |
| UC-001 | REQ-001, REQ-002, REQ-004, REQ-016, REQ-017 |
| UC-002 | REQ-003, REQ-004, REQ-006, REQ-009, REQ-012 |
| UC-003 | REQ-005–REQ-012 |
| UC-004 | REQ-006, REQ-007, REQ-009 |
| UC-005 | REQ-005, REQ-012, REQ-015 |
| UC-006 | REQ-013–REQ-017 |
| UC-007 | REQ-001–REQ-011, REQ-016 |

## Acceptance-Criteria-To-Scenario Intent

| Scenario Intent | Acceptance Criteria |
| --- | --- |
| Static package/handler contract and import safety | AC-001–AC-004 |
| Explicit selection and application-context propagation | AC-005–AC-009 |
| General/application and cross-application isolation/collision | AC-010–AC-014 |
| Authorized worker invocation, results, errors, and bounds | AC-015–AC-020 |
| Reload/removal/crash/session/shutdown lifecycle | AC-021–AC-027 |
| Clean contract transition, no data migration, maintained real proof | AC-028–AC-031 |

## Approval Status

Pending explicit user approval of this requirements document and `application-owned-mcp-intended-behavior.md`. Design production and architecture-review handoff remain blocked until approval.
