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
- `UC-013`: The generic host launches an application without requiring a platform-owned run-launch modal or preselected `runtimeTarget`, even though the host may still offer a separate persisted resource-configuration surface.
- `UC-014`: The application backend receives normalized runtime lifecycle and artifact events that include binding identity and concrete run identity.
- `UC-015`: An application frontend calls one application-owned business API through the platform-hosted backend mount and receives application-defined business data without the platform centralizing the app’s business schema.
- `UC-016`: An application owns a GraphQL schema, generates frontend types/client code from that schema in its own build, and the platform hosts that GraphQL surface under the application’s backend mount without translating it into a platform-owned schema.
- `UC-017`: An application chooses app-owned REST-style routes instead of GraphQL and still keeps its own schema/code-generation story without forcing the platform to define one universal business API model.
- `UC-018`: Bundled teaching applications such as Brief Studio and Socratic Math Teacher demonstrate real app-owned business APIs instead of remaining only thin runtime-target/bootstrap samples.
- `UC-019`: The application backend stores and reuses its own mapping between business records and platform `bindingId` values without the platform requiring a universal business-reference field.
- `UC-020`: An application persists a pending binding-establishment intent before `startRun(...)`, crashes after platform binding creation but before mapping commit, and later reconciles the intended business record back to the created binding without losing early lifecycle/artifact events.
- `UC-021`: An imported or bundled application has an invalid/missing/incompatible package state (for example stale path or unsupported manifest version), and AutoByteus still starts normally while quarantining that application and surfacing diagnostics.
- `UC-022`: A user opens a host-provided application resource-configuration screen and configures one app-declared agent/team resource for later use without starting a run immediately.
- `UC-023`: The application backend later reads the persisted resource configuration for one declared resource slot and uses that saved selection/defaults when deciding how to start or reuse a run.
- `UC-024`: A user repairs or reloads one quarantined application, and AutoByteus returns only that application to active availability without requiring a full platform restart.
- `UC-025`: A host setup flow reads declared resource-slot metadata for one application and receives validation errors when it tries to save an unknown `slotKey` or a resource selection that violates the slot declaration.
- `UC-026`: A user configures Brief Studio or Socratic Math Teacher through the host resource-configuration form, saves the selected agent/team resource, and later application-launched runs execute tools automatically without any host-managed per-tool approval step.
- `UC-027`: Brief Studio and Socratic Math Teacher present business-first primary UIs focused on briefs/lessons and their domain workflow, while low-level runtime controls such as model selection or tool-approval behavior stay out of the main business canvas.
- `UC-028`: A user launches Brief Studio or Socratic Math Teacher, the host first shows the pre-entry resource-configuration form (prefilled from any saved values), the user confirms or updates the required resource plus supported runtime defaults (such as model/runtime/workspace), and only then does the business app become actionable.
- `UC-029`: A user views Brief Studio or Socratic Math Teacher and sees business actions such as drafting, approving, rejecting, or asking follow-up questions in the primary canvas, while binding/run ids and raw runtime labels are moved to optional advanced diagnostic surfaces.

## Out of Scope

- `OOS-001`: Final code implementation details or the exact patch sequence for every file.
- `OOS-002`: Final product-specific UI design for any one application, including the software-engineering app.
- `OOS-003`: Final security policy for shared-resource authorization beyond the current product assumptions.
- `OOS-004`: Every downstream analytics, metrics, or admin/reporting surface that may eventually consume the new orchestration data.
- `OOS-005`: A full direct design for generic workspace-monitor navigation from iframe apps beyond exposing sufficient runtime identity.
- `OOS-006`: Preserving legacy session-owned behavior as a long-term supported architecture.
- `OOS-007`: A new generic host-managed mid-run human approval UX for individual tool calls inside application-launched runs.

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
- `R-024`: The generic host shall launch an application without requiring a platform-owned run-launch flow before the application UI becomes available; any host-provided resource-configuration flow shall be a separate persisted setup concern rather than implicit run creation.
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
- `R-044`: Application package discovery or validation failure for one imported, bundled, missing, or incompatible application shall be isolated to that application/package and shall not prevent AutoByteus core startup or use of other valid applications.
- `R-045`: The platform shall maintain and surface invalid/unavailable application diagnostics separately from the valid application catalog so users can inspect, repair, reload, or remove broken applications.
- `R-046`: Startup recovery and pending-event resume shall treat invalid/missing/incompatible applications as quarantined application state rather than as fatal platform startup errors; durable bindings/events for those applications shall remain recoverable after repair or reload.
- `R-047`: The platform shall support persisted application resource configuration for zero, one, or many app-declared runtime resource slots without conflating that setup with immediate run creation.
- `R-048`: The generic host may present an application resource-configuration screen at launch time or from settings, but that flow shall save resource selection and launch defaults for later use and shall not auto-start a run.
- `R-049`: The authoritative application/backend/runtime-control boundary shall allow applications to read platform-persisted resource configuration for their declared resource slots when deciding how to start or reuse runs.
- `R-050`: The application bundle or equivalent app-definition contract shall support optional application-declared runtime resource-slot metadata for host-managed configuration without reintroducing one singular launch-time `runtimeTarget` requirement.
- `R-051`: The platform shall support an authoritative per-application repair/reload flow that can transition one application from `QUARANTINED` to `REENTERING` to `ACTIVE` after its package becomes valid again, without requiring a full AutoByteus restart.
- `R-052`: During per-application re-entry, live backend/runtime-control/event-dispatch paths for that application shall observe one explicit retryable availability state instead of racing with lookup rebuild, observer attachment, or pending-event resume.
- `R-053`: `ApplicationManifestV3` shall be the authoritative declaration home for host-visible runtime resource slots, including stable `slotKey`, display name, allowed resource kinds/owners, required-vs-optional semantics, and any optional default resource reference.
- `R-054`: The platform shall validate persisted application resource-configuration writes and readback against the authoritative manifest-declared slot contract, including rejecting unknown `slotKey` values and resource references that violate the declared allowed kinds/owners.
- `R-055`: Host-facing slot-configuration read surfaces shall return declared slot metadata together with current persisted configuration state without implying immediate run launch semantics.
- `R-056`: The generic host-provided application resource-configuration flow introduced by this ticket shall normalize application-managed runs to `autoExecuteTools = true` rather than exposing a host-managed manual tool-approval mode that the generic application UX cannot operationalize.
- `R-057`: Brief Studio and Socratic Math Teacher shall teach this application-mode behavior explicitly by launching their configured runs with `autoExecuteTools = true` and without any host-managed or in-app per-tool approval prompt.
- `R-058`: The primary UI of Brief Studio and Socratic Math Teacher shall focus on their app-owned business records and workflow; low-level execution controls such as model identifier entry, tool-approval choices, workspace selection, or other raw runtime tuning shall live in host resource configuration or optional advanced/developer-only surfaces rather than the main business flow.
- `R-059`: When an application declares one or more required resource slots, the host launch flow shall collect or confirm that configuration before the application becomes actionable; the simple first-cut UX may satisfy this by showing the pre-entry configuration form on every launch, prefilled from any saved values.
- `R-060`: Persisted application resource configuration may include platform-owned launch defaults such as model identifier, runtime kind, workspace root path, and similar run-launch inputs when the slot declaration says those defaults are supported.
- `R-061`: Brief Studio and Socratic Math Teacher shall consume saved host-managed resource configuration for runtime/model/workspace concerns instead of collecting those values inline from the main application canvas.
- `R-062`: Business actions that trigger orchestration may remain in application UIs, but the primary business canvas shall use business wording and workflow framing rather than raw platform runtime wording such as `run`, `binding`, or `launch config`.
- `R-063`: Raw runtime identifiers and execution diagnostics such as `bindingId`, `runId`, bundled resource ids, or resource-kind badges shall not dominate the primary app canvas or primary application catalog cards; they shall move to secondary details, advanced diagnostics, or developer-focused surfaces.
- `R-064`: The pre-entry resource-configuration form shall intentionally mirror the existing agent-run / agent-team-run configuration UX for supported fields such as resource selection, model, runtime kind, and workspace root path, while keeping `autoExecuteTools` visible but locked to `true`.

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
- `AC-027`: The requirements explicitly state that one invalid or incompatible application package must not crash the whole AutoByteus startup path.
- `AC-028`: The requirements explicitly state that invalid/unavailable applications must surface diagnostics separately from valid applications.
- `AC-029`: The requirements explicitly state that recovery/dispatch treat invalid applications as quarantined and repairable instead of fatal startup blockers.
- `AC-030`: The requirements explicitly define persisted application resource configuration as separate from immediate run launch.
- `AC-031`: The requirements explicitly allow the generic host to reuse a resource-configuration screen for app-declared agent/team resources without turning that screen into a run-launch flow.
- `AC-032`: The requirements explicitly state that applications can later read host-persisted resource configuration through an authoritative platform boundary when orchestrating runs.
- `AC-033`: The requirements explicitly cover per-application repair/reload re-entry for quarantined applications without requiring a full platform restart.
- `AC-034`: The requirements explicitly state that live traffic for a repairing/reloading application observes one explicit unavailable/reloading behavior instead of racing recovery work.
- `AC-035`: The requirements explicitly state that app-configurable runtime resource slots are declared in the application manifest/bundle contract rather than inferred ad hoc from backend code or host UI.
- `AC-036`: The requirements explicitly cover validation of slot keys and allowed resource kinds/owners for persisted resource-configuration writes and readback.
- `AC-037`: The requirements explicitly require host setup surfaces to return declared slot metadata plus persisted configuration state without turning that setup surface back into run launch.
- `AC-038`: The requirements explicitly state that the generic application-mode resource-configuration flow uses automatic tool execution approval instead of a host-managed per-tool approval loop.
- `AC-039`: The requirements explicitly require Brief Studio and Socratic Math Teacher to teach auto-approved application-mode tool execution rather than showing approval-step UX they cannot operationalize.
- `AC-040`: The requirements explicitly require the teaching apps' main canvases to stay business-first instead of foregrounding low-level runtime configuration.
- `AC-041`: The requirements explicitly cover pre-entry launch-time resource configuration before the app becomes actionable, including the acceptable simple first-cut behavior of showing the form on every launch with saved values prefilled.
- `AC-042`: The requirements explicitly allow saved host-managed resource configuration to own model/runtime/workspace defaults so the teaching apps do not ask for those values inline.
- `AC-043`: The requirements explicitly distinguish valid business actions in the app UI from invalid runtime-detail leakage in the primary app canvas.
- `AC-044`: The requirements explicitly demote raw runtime ids/resource labels from the primary app canvas and primary catalog cards into secondary or advanced surfaces.
- `AC-045`: The requirements explicitly state that the pre-entry form should reuse the familiar agent/team config form shape, including workspace root path, while showing `autoExecuteTools` as locked-on for transparency.

## Constraints / Dependencies

- Current bundled applications, frontend host flows, shared contracts, and SDKs are all aligned around session-owned launch behavior and therefore must be changed together.
- The existing application backend gateway and application engine are directionally correct and should be reused as foundations rather than discarded.
- Existing agent and team run services already exist and should remain the execution-resource layer behind a new orchestration boundary.
- Existing artifact publication and ordered at-least-once event delivery semantics are valuable and should remain part of the target direction.
- Existing sample apps such as Brief Studio currently encode the old model and therefore must be migrated if the target architecture is adopted cleanly.
- The platform can route and recover by `bindingId`, but it cannot infer application business meaning from that binding alone; app-owned state must carry any mapping back to tickets, briefs, lessons, or other domain records.
- The current frontend SDK is transport-oriented and does not yet provide one app-owned schema/codegen story for real applications, so the design must keep platform transport generic while allowing each application to own its own business API contracts.
- The current mounted backend route structure already lives under `applicationId`, but iframe/bootstrap transport still needs one clearer authoritative backend-base descriptor in the target model.
- Current application package discovery/validation can still fail too globally when one application/package is missing or incompatible, so startup isolation must be made explicit in the target model.
- The existing host launch-configuration form is useful as a resource-configuration UI shape, but its current coupling to immediate run launch must be removed.
- Current bundled teaching apps do not yet teach app-owned GraphQL-backed business APIs, so example-app upgrades are part of making the target model concrete for application authors.

## Assumptions

- Applications will continue to provide a backend bundle when they need durable business logic, persistence, and orchestration ownership.
- Application backends are trusted platform extensions within the existing application execution model.
- Not all applications need many concurrent runs, but the platform should support that model generally.
- Applications will continue to care primarily about durable projected business state and runtime outputs even when they also need lower-level run visibility.
- Some applications will need to use runtime resources that are not bundled inside the application package itself.
- Applications may declare runtime resource slots that the host configures and persists before those resources are used later by the app backend.
- Required resource-slot configuration may need to be collected before an app becomes actionable, especially for teaching apps whose main canvases should stay business-first.
- The platform should support per-application hot re-entry after repair or reload rather than requiring a full AutoByteus restart whenever one application package becomes valid again.
- App-configurable runtime resource slots should be declared in application manifest metadata so the host can render setup UI and validate persisted configuration before any backend worker boot.
- The generic host resource-configuration UI should not expose a manual per-tool approval toggle for application-managed runs in this ticket because no generic application-mode mid-run approval loop exists.

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
| `R-044` | `UC-021` |
| `R-045` | `UC-021` |
| `R-046` | `UC-012`, `UC-021` |
| `R-047` | `UC-022`, `UC-023` |
| `R-048` | `UC-013`, `UC-022` |
| `R-049` | `UC-023` |
| `R-050` | `UC-008`, `UC-009`, `UC-022`, `UC-023` |
| `R-051` | `UC-021`, `UC-024` |
| `R-052` | `UC-021`, `UC-024` |
| `R-053` | `UC-008`, `UC-009`, `UC-022`, `UC-023`, `UC-025` |
| `R-054` | `UC-022`, `UC-023`, `UC-025` |
| `R-055` | `UC-022`, `UC-025` |
| `R-056` | `UC-022`, `UC-023`, `UC-026` |
| `R-057` | `UC-018`, `UC-026` |
| `R-058` | `UC-018`, `UC-027` |
| `R-059` | `UC-013`, `UC-022`, `UC-028` |
| `R-060` | `UC-022`, `UC-023`, `UC-026`, `UC-028` |
| `R-061` | `UC-018`, `UC-026`, `UC-027`, `UC-028` |
| `R-062` | `UC-018`, `UC-027`, `UC-029` |
| `R-063` | `UC-018`, `UC-027`, `UC-029` |
| `R-064` | `UC-022`, `UC-026`, `UC-028` |

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
| `AC-027` | Forces invalid app/package content to be isolated from core platform startup. |
| `AC-028` | Forces one diagnostic surface for quarantined applications instead of silent disappearance or fatal startup. |
| `AC-029` | Forces recovery/dispatch to quarantine broken applications instead of treating them as fatal startup prerequisites. |
| `AC-030` | Forces persisted application resource configuration to remain distinct from run-launch semantics. |
| `AC-031` | Allows reuse of the existing host configuration form while removing its old launch-now meaning. |
| `AC-032` | Forces one authoritative backend/runtime boundary for reading persisted resource configuration later. |
| `AC-033` | Forces the design to make quarantined-app repair/reload re-entry explicit instead of leaving it as a restart-only implication. |
| `AC-034` | Forces one explicit live-traffic behavior while app-scoped re-entry is in progress. |
| `AC-035` | Forces one authoritative declaration home for app-configurable runtime resource slots. |
| `AC-036` | Forces persisted resource configuration to be validated against declared slot rules instead of trusting host guesses. |
| `AC-037` | Forces host setup read surfaces to expose declared slots plus persisted state without restoring launch-now semantics. |
| `AC-038` | Forces the design to choose one actionable tool-approval behavior for application-mode runs instead of leaving a dead approval toggle in the host. |
| `AC-039` | Forces the sample apps to teach auto-approved application-mode execution instead of approval UX they do not support. |
| `AC-040` | Forces the teaching apps' main UIs to stay focused on business workflow instead of surfacing runtime tuning as the primary story. |
| `AC-041` | Forces the design to define what happens when required resource configuration is missing at app launch. |
| `AC-042` | Forces model/runtime/workspace setup to live in saved host-managed configuration rather than leaking back into the teaching apps' main canvases. |
| `AC-043` | Forces the design to separate legitimate business actions from illegitimate runtime-detail leakage in the main app UI. |
| `AC-044` | Forces runtime ids/resource labels out of the main app canvas and main catalog cards. |
| `AC-045` | Forces the pre-entry form to feel like the familiar agent/team configuration UX while keeping application-mode tool execution locked on. |

## Approval Status

User directed the solution designer on `2026-04-19` to bootstrap the ticket, investigate deeply, and proceed with a strong design that may refactor across server, contracts, frontend SDK, backend SDK, and frontend host boundaries. Treating that direction as approval to proceed with design on top of this requirements basis.
