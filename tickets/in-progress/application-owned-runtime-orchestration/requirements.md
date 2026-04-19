# Application-Owned Runtime Orchestration Requirements

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

AutoByteus currently treats a launched application as if it were fundamentally one live agent run or one live team run wrapped in an application shell. That model works for simple teaching samples, but it is too narrow for the broader platform direction.

The target product model is different:

- the platform launches and hosts the application runtime,
- the application backend owns domain logic and business state,
- the application backend decides whether and when to create runs,
- agents and agent teams are reusable execution resources,
- one application may create zero, one, or many runs over time,
- one application-defined business context may create zero, one, or many runs over time, and
- runtime outputs must flow back to the correct application-owned context because the application owns the business meaning of those outputs.

This ticket is therefore not about one special-case application. It is about making the platform itself support application-owned orchestration as the general model.

## Investigation Findings

Current repo evidence shows the following:

- Application bundles still declare one singular `runtimeTarget`, which makes the catalog and launch flow assume one launch-time agent/team identity for each application.
- `ApplicationSessionService.createApplicationSession(...)` launches the underlying agent or team run immediately and treats that run as the runtime identity of the application page/session.
- `ApplicationSessionStateStore.persistLiveSession(...)` clears the previous active session for the same application, which enforces one live launched session per application id.
- `publish_artifact` derives application ownership from injected `applicationSessionContext`, so publication routing is session-bound instead of application-execution-bound.
- The application backend gateway already routes by `applicationId`; `applicationSessionId` is optional context rather than the primary backend key.
- The application engine already has the correct high-level role: it starts the application backend worker and exposes app-owned queries, commands, routes, GraphQL, notifications, and event handlers.
- Agent and team run services are already reusable foundations; they are not the architectural problem.
- The frontend application host currently owns too much runtime-launch responsibility via launch preparation, launch modal behavior, route binding, session streaming, and session-based iframe bootstrap.
- The shared contracts and SDK packages still encode `runtimeTarget`, `applicationSessionId`, and session lifecycle semantics, so a real fix must cross project/package boundaries.

Taken together, the current platform already contains useful building blocks, but they are assembled under the wrong ownership model.

## Recommendations

The platform should move to a clean-cut application-owned orchestration model with the following principles:

1. Launching an application should launch the application host/runtime, not automatically create a worker run.
2. The application backend should be the authoritative owner of runtime-orchestration decisions.
3. Agents and agent teams should be treated as platform-managed execution resources rather than the identity of the application itself.
4. The platform should remain domain-agnostic and should not hardcode business objects such as ticket, brief, case, work item, or task into the orchestration core.
5. The platform should make durable `run binding` / `bindingId` identity the primary cross-boundary correlation concept rather than introducing one platform-owned generic business-reference field.
6. Runtime publications such as artifacts should route back through platform-owned run bindings plus injected execution context.
7. The platform should support both bundle-owned application resources and shared platform resources.
8. The generic host should stop owning low-level run launch forms and runtime-target assumptions for application launch.
9. The clean target may refactor server, web host, contracts, frontend SDK, backend SDK, and sample applications together instead of preserving the current architecture.
10. The target design should reject backward-compatibility wrappers for replaced in-scope session-owned behavior.
11. Each application should own its own business API schema and frontend/backend type-generation strategy rather than relying on one platform-owned business-schema layer.
12. The platform should host one application-scoped virtual backend mount keyed by `applicationId`, while the application remains free to expose GraphQL, routes, queries, commands, or a mix of those surfaces as its own business API.

In short:

- platform provides application hosting, runtime-control infrastructure, binding persistence, routing, and durable event delivery,
- application backend provides domain logic, business identity, business-object-to-binding mapping, orchestration policy, business-state projection, and application-owned business API/schema.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

## In-Scope Use Cases

- `UC-001`: A user launches an application, and the platform starts the application frontend/backend runtime without auto-starting an agent or team run.
- `UC-002`: The application backend receives a user action and decides to create one agent run or one agent-team run.
- `UC-003`: One application creates multiple concurrent runs for different application-owned business contexts.
- `UC-004`: One application creates multiple concurrent runs for the same business context when its own logic requires parallel work.
- `UC-005`: An application sends user input to one selected run and, when needed, to one selected member inside a team run.
- `UC-006`: A runtime publishes artifacts and the platform routes those publications back to the correct application-owned binding so the app backend can project them into its own business state.
- `UC-007`: The application UI shows ongoing and completed business entities whose visible state is projected from application-owned storage plus runtime outputs.
- `UC-008`: An application uses one bundled application-owned agent or team as a resource.
- `UC-009`: An application uses one shared platform agent or shared platform team as a resource.
- `UC-010`: Different applications use different orchestration patterns without forcing one universal app-to-run mapping.
- `UC-011`: A simple application that only ever needs one run still works as a subset of the general model.
- `UC-012`: After backend restart, the application can recover its domain state and its durable run bindings without losing ownership semantics.
- `UC-013`: The generic host launches an application without a platform-owned agent/team launch modal or preselected `runtimeTarget`.
- `UC-014`: The application backend receives normalized runtime lifecycle and artifact events that include binding identity and concrete run identity.
- `UC-015`: An application frontend calls one application-owned business API through the platform-hosted backend mount and receives application-defined business data without the platform centralizing the app’s business schema.
- `UC-016`: An application owns a GraphQL schema, generates frontend types/client code from that schema in its own build, and the platform hosts that GraphQL surface under the application’s backend mount without translating it into a platform-owned schema.
- `UC-017`: An application chooses app-owned REST-style routes instead of GraphQL and still keeps its own schema/code-generation story without forcing the platform to define one universal business API model.
- `UC-018`: Bundled teaching applications such as Brief Studio and Socratic Math Teacher demonstrate real app-owned business APIs instead of remaining only thin runtime-target/bootstrap samples.
- `UC-019`: The application backend stores and reuses its own mapping between business records and platform `bindingId` values without the platform requiring a universal business-reference field.
- `UC-020`: An application persists a pending binding-establishment intent before `startRun(...)`, crashes after platform binding creation but before mapping commit, and later reconciles the intended business record back to the created binding without losing early lifecycle/artifact events.

## Out of Scope

- `OOS-001`: Final code implementation details or the exact patch sequence for every file.
- `OOS-002`: Final product-specific UI design for any one application, including the software-engineering app.
- `OOS-003`: Final security policy for shared-resource authorization beyond the current product assumptions.
- `OOS-004`: Every downstream analytics, metrics, or admin/reporting surface that may eventually consume the new orchestration data.
- `OOS-005`: A full direct design for generic workspace-monitor navigation from iframe apps beyond exposing sufficient runtime identity.
- `OOS-006`: Preserving legacy session-owned behavior as a long-term supported architecture.

## Functional Requirements

- `R-001`: Application launch shall start the application runtime independently from agent or team run creation.
- `R-002`: The application backend shall be the authoritative owner of runtime-orchestration decisions for that application.
- `R-003`: The platform shall provide an application-facing runtime-control capability that allows an application backend to create, control, inspect, and terminate runs.
- `R-004`: The platform shall provide one durable platform-owned `bindingId` for each started run so cross-boundary correlation does not depend on a platform-owned generic business-reference field.
- `R-005`: The platform shall persist the relationship between `applicationId`, runtime resource reference, platform binding identity, and concrete run identity.
- `R-006`: The platform shall support multiple concurrent runs for one application.
- `R-007`: The platform shall not enforce a permanent one-live-run-per-application rule for advanced applications.
- `R-008`: The platform shall remain domain-agnostic and shall not impose business-specific semantics such as ticket, brief, case, or task on all applications.
- `R-009`: The platform shall support both bundle-owned application runtime resources and shared platform runtime resources.
- `R-010`: Runtime publications, including artifacts, shall route back through platform-owned run bindings and injected execution context rather than through one singular live application session assumption.
- `R-011`: The application backend shall remain the owner of projection into application-owned business state after runtime publications are delivered.
- `R-012`: Application-owned backend surfaces such as queries, commands, routes, GraphQL, notifications, and event handlers shall remain the primary way application frontends interact with business state.
- `R-013`: The platform shall allow applications to address a selected run and, when supported by that run type, a selected team member for user input.
- `R-014`: The platform shall support restart-safe recovery of durable run bindings and publication routing.
- `R-015`: The platform shall expose enough runtime identity for applications to deep-link or hand off into lower-level execution monitoring when needed.
- `R-016`: The platform shall allow applications to exist that create no runs at startup and only allocate runtime resources in response to application-domain events.
- `R-017`: The application model shall support simple applications as a subset of the general model without making the simple case the governing platform assumption.
- `R-018`: The platform shall support application-owned business flows in which one app-owned business object may create zero, one, or many bindings/runs over time.
- `R-019`: The platform shall keep application domain meaning outside platform-owned runtime infrastructure while still providing durable routing, recovery, and observability.
- `R-020`: The platform shall treat the current singular `runtimeTarget` launch assumption as a limitation of the old model, not as a permanent architectural rule.
- `R-021`: The application bundle contract shall not require one singular launch-time `runtimeTarget` for an application to be valid.
- `R-022`: The application backend handler/lifecycle context shall expose runtime-control and runtime-resource access through one authoritative platform boundary rather than through direct access to lower-level run services.
- `R-023`: Frontend iframe/bootstrap and request-context contracts shall not require `applicationSessionId` as the identity that makes an application usable.
- `R-024`: The generic host shall launch an application without requiring a platform-owned low-level agent/team launch configuration flow before the application UI becomes available.
- `R-025`: Normalized runtime lifecycle events delivered to application backends shall carry platform binding identity and concrete run identity in addition to producer provenance.
- `R-026`: The target architecture shall allow coordinated clean-cut contract/version upgrades across server, contracts, frontend SDK, backend SDK, frontend host, and bundled applications rather than preserving replaced session-owned behavior via compatibility wrappers.
- `R-027`: The platform shall provide one unified resource reference model that can address both bundle-local resources and shared platform resources.
- `R-028`: The platform shall host application-owned backend APIs under one application-scoped virtual backend mount keyed by `applicationId` rather than by starting one separate HTTP server/socket endpoint per application.
- `R-029`: Each application shall remain the authoritative owner of its own business API schema, DTOs, and frontend/backend type-generation strategy.
- `R-030`: The platform shall not centralize, synthesize, or reinterpret application-specific business schemas such as ticket, brief, lesson, or repository models into one platform-owned universal schema layer.
- `R-031`: When an application exposes GraphQL, the platform shall host that GraphQL surface as the application’s own schema under the app backend mount rather than converting it into a different platform-owned GraphQL schema.
- `R-032`: When an application exposes REST-style routes, the platform shall preserve application-owned method/path/header/query/body semantics under the application-scoped backend mount rather than forcing those routes through a GraphQL-only abstraction.
- `R-033`: Platform query/command surfaces may remain available as application-facing conveniences, but they shall not be the only supported business-API model for real applications.
- `R-034`: Shared platform contracts and SDKs shall separate infrastructure/runtime/orchestration types from application-owned business API schemas and generated client types.
- `R-035`: Application build pipelines shall be able to generate frontend-usable business API types/clients from application-owned backend schemas or shared application-owned contracts before packaging, without requiring the platform runtime to generate those business schemas centrally.
- `R-036`: The in-repo teaching applications `brief-studio` and `socratic-math-teacher` shall be upgraded to teach real application-owned backend API patterns, including GraphQL-backed examples.
- `R-037`: Iframe/bootstrap transport contracts shall expose one authoritative application-scoped backend base URL, plus only any non-derivable transport channels, so app-owned generated clients can target the hosted backend mount without discovering per-app servers.
- `R-038`: The upgraded teaching applications shall demonstrate app-owned GraphQL schema artifacts and generated frontend clients as the primary business API path rather than relying only on handwritten query/command payload calls.
- `R-039`: Any mapping between application business records and platform `bindingId` values shall remain app-owned state rather than becoming one universal platform-owned business-reference field.
- `R-040`: Direct `runtimeControl.startRun(...)` flows shall support one opaque app-supplied `bindingIntentId` (or equivalently named start-run intent token) so an application can durably establish correlation before binding creation without turning business meaning into a platform-owned field.
- `R-041`: The platform shall persist `bindingIntentId` with the created run binding and include it in the returned binding summary and app-visible runtime event envelope for that binding.
- `R-042`: The platform shall expose one authoritative reconciliation lookup from `bindingIntentId` to run binding summary so an application can recover from crashes that occur after binding creation but before app-owned mapping commit completes.
- `R-043`: The application/platform contract shall support restart-safe reconciliation when app-owned mapping finalization happens after binding creation, including the case where early `runStarted` or artifact events are already in flight.

## Acceptance Criteria

- `AC-001`: The requirements clearly separate platform responsibilities from application-backend responsibilities.
- `AC-002`: The requirements explicitly state that launching an application is not the same thing as launching a run.
- `AC-003`: The requirements explicitly state that the application backend, not the frontend alone, is authoritative for runtime-orchestration decisions.
- `AC-004`: The requirements explicitly state that the platform must remain domain-agnostic and must not hardcode business-specific concepts for all applications.
- `AC-005`: The requirements explicitly cover applications that create multiple concurrent runs.
- `AC-006`: The requirements explicitly cover applications that create runs only in response to application-domain events after launch.
- `AC-007`: The requirements explicitly cover both bundle-owned and shared platform runtime resources.
- `AC-008`: The requirements explicitly describe the current one-app-to-one-live-run assumption as a limitation that blocks the desired general model.
- `AC-009`: The requirements explicitly state that runtime outputs such as artifacts are consumed by the application because the application owns the business meaning of those results.
- `AC-010`: The requirements provide general use cases that extend beyond one sample application.
- `AC-011`: The requirements explicitly cover restart-safe recovery of durable run bindings and publication routing.
- `AC-012`: The requirements are detailed enough to drive a concrete architecture design without first re-explaining the product intent.
- `AC-013`: The requirements explicitly state that the bundle contract must stop requiring a singular launch-time `runtimeTarget`.
- `AC-014`: The requirements explicitly state that the generic host launch flow should not require a platform-owned launch modal or session-owned runtime bootstrap.
- `AC-015`: The requirements explicitly allow a coordinated clean-cut refactor across server, contracts, SDKs, and frontend host without legacy compatibility wrappers for replaced in-scope behavior.
- `AC-016`: The requirements explicitly state that each application owns its own business API schema and that the platform must not centralize app-specific business schemas.
- `AC-017`: The requirements explicitly state that the platform hosts one application-scoped virtual backend mount instead of one separate app-owned HTTP server per application.
- `AC-018`: The requirements explicitly allow GraphQL and route-based application business APIs as first-class application-owned choices rather than forcing only query/command-style APIs.
- `AC-019`: The requirements explicitly state that application frontend type/code generation should come from application-owned schemas/contracts rather than from a platform-owned business-schema layer.
- `AC-020`: The requirements explicitly cover upgrading Brief Studio and Socratic Math Teacher into stronger app-owned API teaching samples.
- `AC-021`: The requirements explicitly state that app frontends receive one authoritative backend mount/base URL for hosted business API calls rather than discovering per-app servers or parallel endpoint roots.
- `AC-022`: The requirements explicitly state that the upgraded teaching apps should teach app-owned GraphQL schema artifacts plus generated frontend clients, not only handwritten payload calls.
- `AC-023`: The requirements explicitly state that `bindingId` is the primary cross-boundary correlation handle and that any mapping from business records to bindings remains app-owned.
- `AC-024`: The requirements explicitly define one opaque pending-binding/start-run intent token for direct `startRun(...)` flows so app-owned mapping can be established durably before binding creation races with event delivery.
- `AC-025`: The requirements explicitly state that the platform persists and echoes that start-run intent token in binding summaries and runtime event delivery for reconciliation.
- `AC-026`: The requirements explicitly cover restart-safe reconciliation when the backend crashes after platform binding creation but before app-owned mapping commit completes.

## Constraints / Dependencies

- Current bundled applications, frontend host flows, shared contracts, and SDKs are all aligned around session-owned launch behavior and therefore must be changed together.
- The existing application backend gateway and application engine are directionally correct and should be reused as foundations rather than discarded.
- Existing agent and team run services already exist and should remain the execution-resource layer behind a new orchestration boundary.
- Existing artifact publication and ordered at-least-once event delivery semantics are valuable and should remain part of the target direction.
- Existing sample apps such as Brief Studio currently encode the old model and therefore must be migrated if the target architecture is adopted cleanly.
- The platform can route and recover by `bindingId`, but it cannot infer application business meaning from that binding alone; app-owned state must carry any mapping back to tickets, briefs, lessons, or other domain records.
- The current frontend SDK is transport-oriented and does not yet provide one app-owned schema/codegen story for real applications, so the design must keep platform transport generic while allowing each application to own its own business API contracts.
- The current mounted backend route structure already lives under `applicationId`, but iframe/bootstrap transport still needs one clearer authoritative backend-base descriptor in the target model.
- Current bundled teaching apps do not yet teach app-owned GraphQL-backed business APIs, so example-app upgrades are part of making the target model concrete for application authors.

## Assumptions

- Applications will continue to provide a backend bundle when they need durable business logic, persistence, and orchestration ownership.
- Application backends are trusted platform extensions within the existing application execution model.
- Not all applications need many concurrent runs, but the platform should support that model generally.
- Applications will continue to care primarily about durable projected business state and runtime outputs even when they also need lower-level run visibility.
- Some applications will need to use runtime resources that are not bundled inside the application package itself.

## Risks / Open Questions

- `Q-001`: What shared authorization policy should eventually govern access to shared platform agents/teams?
- `Q-002`: What exact public shape should runtime identity exposure take for generic host-side deep-link or workspace handoff helpers?
- `Q-003`: How much generic host-native execution UI should remain once application-owned orchestration becomes the governing model?
- `Q-004`: What is the cleanest unified lifecycle subscription point from agent/team execution owners into the new orchestration subsystem?
- `Q-005`: What optional first-class tooling, if any, should the platform provide for packaging or surfacing app-owned schema artifacts without turning application business schemas into platform-owned contracts?

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| `R-001` | `UC-001`, `UC-011`, `UC-013` |
| `R-002` | `UC-002`, `UC-003`, `UC-004`, `UC-012`, `UC-014` |
| `R-003` | `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-009`, `UC-012` |
| `R-004` | `UC-003`, `UC-004`, `UC-006`, `UC-012`, `UC-014`, `UC-019` |
| `R-005` | `UC-003`, `UC-004`, `UC-006`, `UC-012`, `UC-014`, `UC-019` |
| `R-006` | `UC-003`, `UC-004`, `UC-007`, `UC-010` |
| `R-007` | `UC-003`, `UC-004`, `UC-010` |
| `R-008` | `UC-007`, `UC-010`, `UC-011` |
| `R-009` | `UC-008`, `UC-009`, `UC-010` |
| `R-010` | `UC-006`, `UC-007`, `UC-012`, `UC-014` |
| `R-011` | `UC-006`, `UC-007`, `UC-010`, `UC-014` |
| `R-012` | `UC-001`, `UC-007`, `UC-010`, `UC-013` |
| `R-013` | `UC-005` |
| `R-014` | `UC-012` |
| `R-015` | `UC-007`, `UC-014` |
| `R-016` | `UC-001`, `UC-002`, `UC-013` |
| `R-017` | `UC-011` |
| `R-018` | `UC-003`, `UC-004`, `UC-010`, `UC-012`, `UC-019` |
| `R-019` | `UC-006`, `UC-007`, `UC-010`, `UC-012` |
| `R-020` | `UC-001` through `UC-014` |
| `R-021` | `UC-001`, `UC-008`, `UC-009`, `UC-013` |
| `R-022` | `UC-002`, `UC-003`, `UC-004`, `UC-008`, `UC-009`, `UC-014` |
| `R-023` | `UC-001`, `UC-013` |
| `R-024` | `UC-001`, `UC-013` |
| `R-025` | `UC-006`, `UC-012`, `UC-014`, `UC-019` |
| `R-026` | `UC-001` through `UC-014` |
| `R-027` | `UC-008`, `UC-009`, `UC-010` |
| `R-028` | `UC-015`, `UC-016`, `UC-017`, `UC-018` |
| `R-029` | `UC-015`, `UC-016`, `UC-017`, `UC-018` |
| `R-030` | `UC-015`, `UC-016`, `UC-017`, `UC-018` |
| `R-031` | `UC-016`, `UC-018` |
| `R-032` | `UC-017`, `UC-018` |
| `R-033` | `UC-015`, `UC-016`, `UC-017` |
| `R-034` | `UC-015`, `UC-016`, `UC-017`, `UC-018` |
| `R-035` | `UC-016`, `UC-017`, `UC-018` |
| `R-036` | `UC-018` |
| `R-037` | `UC-015`, `UC-016`, `UC-017` |
| `R-038` | `UC-016`, `UC-018` |
| `R-039` | `UC-003`, `UC-004`, `UC-007`, `UC-019` |
| `R-040` | `UC-002`, `UC-003`, `UC-004`, `UC-019`, `UC-020` |
| `R-041` | `UC-006`, `UC-014`, `UC-019`, `UC-020` |
| `R-042` | `UC-012`, `UC-019`, `UC-020` |
| `R-043` | `UC-006`, `UC-012`, `UC-014`, `UC-020` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001` | Prevents future design work from collapsing platform and application responsibilities into one mixed boundary. |
| `AC-002` | Confirms the core product-model correction. |
| `AC-003` | Confirms backend authority for orchestration and restart-safe ownership. |
| `AC-004` | Protects the platform from being overfit to one business domain. |
| `AC-005` | Confirms multi-run applications are first-class, not incidental. |
| `AC-006` | Confirms delayed run creation after application launch. |
| `AC-007` | Confirms reuse of both bundle-owned and shared execution resources. |
| `AC-008` | Anchors the requirements in a concrete current limitation. |
| `AC-009` | Confirms the role of runtime outputs in the overall model. |
| `AC-010` | Confirms the requirements are general rather than sample-specific. |
| `AC-011` | Confirms durable recovery as part of the required platform model. |
| `AC-012` | Confirms the requirements are substantial enough to guide architecture work. |
| `AC-013` | Forces the target design to remove the singular launch-time runtime target requirement. |
| `AC-014` | Forces the host launch flow to stop behaving like a disguised run-launch flow. |
| `AC-015` | Protects the design from being weakened into compatibility wrappers or mixed old/new ownership models. |
| `AC-016` | Forces app-owned business schema responsibility instead of a platform-owned business API abstraction. |
| `AC-017` | Forces one hosted application backend mount instead of separate per-app socket servers. |
| `AC-018` | Confirms GraphQL and route-based app business APIs remain first-class choices. |
| `AC-019` | Confirms type/code generation should stay app-owned and app-build-driven. |
| `AC-020` | Forces the example apps to teach the target model rather than only bootstrap/runtime-target mechanics. |
| `AC-021` | Forces one authoritative hosted backend-base descriptor for app-owned generated clients and frontend transport. |
| `AC-022` | Forces the upgraded teaching apps to teach app-owned schema artifacts plus generated clients, not only handwritten payload calls. |
| `AC-023` | Forces binding-centric cross-boundary correlation while keeping business-record mapping in app-owned state. |
| `AC-024` | Forces one explicit pending-intent/start-run correlation contract instead of leaving the handoff implicit. |
| `AC-025` | Forces the platform to echo/persist the intent token so early events and crash recovery can reconcile. |
| `AC-026` | Forces restart-safe reconciliation for the crash window between binding creation and app-owned mapping commit. |

## Approval Status

User directed the solution designer on `2026-04-19` to bootstrap the ticket, investigate deeply, and proceed with a strong design that may refactor across server, contracts, frontend SDK, backend SDK, and frontend host boundaries. Treating that direction as approval to proceed with design on top of this requirements basis.
