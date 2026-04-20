# Investigation Notes

## Investigation Status

- Bootstrap Status: Completed
- Current Status: Deep investigation completed; design reworked through architecture review round 5, and further deepened with startup isolation for invalid applications plus persisted application resource-configuration requirements
- Investigation Goal: Define a clean-cut application-owned runtime orchestration model that removes the current one-app-to-one-run/session assumption
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: The change crosses server runtime ownership, bundle contracts, backend SDK, frontend SDK, iframe bootstrap, frontend host flows, publication routing, and sample-application migration
- Scope Summary: Replace session-owned application launches with engine-first application launch plus backend-owned orchestration over zero/one/many durable run bindings, while also making app-owned business APIs/schemas first-class under one platform-hosted backend mount, isolating invalid application packages from core startup, and adding persisted host-managed resource configuration
- Primary Questions To Resolve:
  - Should `applicationSession` remain as a durable concept, or should it be removed from the target model?
  - How should the platform represent application-owned business context without hardcoding business semantics?
  - How should app backends create/control runs without bypassing platform boundaries?
  - How should runtime publications route back to the correct application-owned context after the session model is removed?
  - Which current frontend/SDK/contracts surfaces are structurally coupled to the old session model?
  - How should application-owned business API schemas and frontend/backend code generation work without turning app business schemas into platform-owned contracts?
  - Does the platform need one generic app-business reference field at all, or should `bindingId` be the primary cross-boundary correlation handle while business-record mapping stays app-owned?
  - How should invalid, stale, or incompatible imported applications be isolated so they never become fatal platform-startup dependencies?
  - How should the old launch configuration form be repurposed into persisted runtime-resource configuration without preserving run-launch semantics?

## Request Context

- User request: bootstrap the ticket properly, investigate deeply, and produce a strong design that is not constrained by the current architecture or current package/folder boundaries
- Additional user direction: refactoring and reorganizing across the contracts project, backend SDK, frontend SDK, server, and web host is allowed when needed to reach a more natural and flexible model
- Follow-up user clarification on `2026-04-20`: invalid or stale application packages must never crash AutoByteus startup, and the existing host launch-configuration form should be repurposed as persisted application resource configuration rather than deleted outright
- Ticket folder: `tickets/in-progress/application-owned-runtime-orchestration`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration`
- Current Branch: `codex/application-owned-runtime-orchestration`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin` succeeded on `2026-04-19`
- Task Branch: `codex/application-owned-runtime-orchestration`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): not yet specified; likely merge back toward `personal` or its then-current integration target
- Bootstrap Blockers: None
- Notes For Downstream Agents:
  - Authoritative ticket artifacts now live in the dedicated worktree, not in the shared `/autobyteus-workspace-superrepo` checkout
  - Existing draft ticket docs had been started untracked on branch `personal`; those drafts were copied into the dedicated worktree and superseded here

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-19 | Command | `git remote -v && git symbolic-ref refs/remotes/origin/HEAD && git status --short --branch` | Resolve bootstrap base branch and current repo state | `origin/HEAD` resolves to `origin/personal`; ticket docs were untracked in shared checkout | No |
| 2026-04-19 | Command | `git fetch origin && git worktree add -b codex/application-owned-runtime-orchestration /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration origin/personal` | Create mandatory dedicated ticket worktree from refreshed base | Dedicated worktree/branch created successfully | No |
| 2026-04-19 | Doc | `.codex/skills/autobyteus-solution-designer-3225/design-principles.md` | Use canonical design rules | Confirms no boundary bypass, spine-first design, and no backward-compatibility wrappers for in-scope replacement | No |
| 2026-04-19 | Doc | `autobyteus-server-ts/docs/modules/applications.md` | Understand current application bundle/catalog contract | `application.json` still requires singular `runtimeTarget`; applications module assumes a bound runtime target in catalog | Yes |
| 2026-04-19 | Doc | `autobyteus-server-ts/docs/modules/application_sessions.md` | Understand current session subsystem ownership | Current subsystem owns launch, active-session replacement, retained view, publication journal, and streaming around one live session per app | Yes |
| 2026-04-19 | Doc | `autobyteus-server-ts/docs/modules/application_backend_gateway.md` | Understand current backend boundary | Backend gateway is already keyed by `applicationId`; `applicationSessionId` is optional context, not the primary route key | No |
| 2026-04-19 | Doc | `autobyteus-server-ts/docs/modules/application_engine.md` and `application_storage.md` | Understand reusable host/runtime/storage foundations | Application engine already cleanly owns worker lifecycle; storage split between app DB and platform DB is useful and reusable | No |
| 2026-04-19 | Code | `autobyteus-server-ts/src/application-sessions/services/application-session-service.ts` | Verify how launch/runtime/session are currently coupled | `createApplicationSession(...)` launches the underlying agent/team run immediately and terminates any previous active session for the same app | Yes |
| 2026-04-19 | Code | `autobyteus-server-ts/src/application-sessions/stores/application-session-state-store.ts` and `application-storage/services/application-storage-lifecycle-service.ts` | Verify one-live-session enforcement and persisted tables | Per-app `platform.sqlite` has `__autobyteus_session_index` with a unique live-session-per-app index | Yes |
| 2026-04-19 | Code | `autobyteus-server-ts/src/application-sessions/tools/publish-artifact-tool.ts`, `application-publication-service.ts`, `application-producer-provenance.ts` | Verify publication routing model | `publish_artifact` resolves ownership from injected `applicationSessionContext`; publication routing is session-bound | Yes |
| 2026-04-19 | Code | `autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts` and `runtime/protocol.ts` | Verify backend SDK context and worker/host bridge limits | Worker context currently exposes storage, requestContext, and notifications only; there is no app-facing runtime-control bridge from worker to host | Yes |
| 2026-04-19 | Code | `autobyteus-server-ts/src/application-backend-gateway/services/application-backend-gateway-service.ts` | Verify what can already be reused | Gateway already has a clean app-owned boundary for queries/commands/routes/graphql and an internal `ensureApplicationEngine(...)` owner | Yes |
| 2026-04-19 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` and `src/agent-team-execution/services/team-run-service.ts` | Verify reusable run execution services | Agent/team run services already create, resolve, restore, terminate, and post input; current coupling to apps is only through injected session context | Yes |
| 2026-04-19 | Code | `autobyteus-server-ts/src/server-runtime.ts` and `autobyteus-server-ts/src/application-sessions/services/application-publication-dispatch-service.ts` | Verify what the current platform already treats as an explicit startup-resume owner | Server startup currently resumes pending publication dispatch explicitly, proving restart-safe behavior already needs named startup ownership rather than only durable tables | Yes |
| 2026-04-19 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts`, `services/agent-run-manager.ts`, `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts`, `services/agent-team-run-manager.ts` | Verify lifecycle observation boundaries and asymmetry between agent and team execution | Agent-side lifecycle observation is available only down at run-object level and lacks a service/manager boundary; team-side also has a manager subscription shape, but it is not the same authoritative interface | Yes |
| 2026-04-19 | Doc | `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` and `autobyteus-web/docs/applications.md` | Verify frontend host/session/bootstrap coupling | Iframe bootstrap v1 and application page flow both depend on `applicationSessionId`; host launch currently assumes a live session with runtime identity before the iframe is useful | Yes |
| 2026-04-19 | Code | `autobyteus-web/stores/applicationSessionStore.ts` and `types/application/ApplicationIframeContract.ts` | Verify concrete frontend owners that enforce old model | Frontend host owns launch config modal, session binding, session stream subscription, and runtime bootstrap based on one returned session snapshot | Yes |
| 2026-04-19 | Code | `autobyteus-application-sdk-contracts/src/index.ts`, `autobyteus-application-backend-sdk/src/index.ts`, `autobyteus-application-frontend-sdk/src/index.ts` | Verify shared author-facing contracts | Shared contracts still encode `runtimeTarget`, `applicationSessionId`, and session lifecycle event handler keys; backend SDK lacks runtime-control context; frontend SDK defaults requestContext to session-aware identity | Yes |
| 2026-04-19 | Code | `applications/brief-studio/application.json`, `backend-src/index.ts`, `backend-src/services/brief-projection-service.ts` | Verify how the teaching sample reflects current assumptions | Brief Studio hardcodes a singular bundled team via `runtimeTarget` and derives `briefId` from `applicationSessionId`, proving the sample is teaching the old ownership model | Yes |
| 2026-04-19 | Doc | `autobyteus-application-frontend-sdk/README.md` and `autobyteus-application-sdk-contracts/README.md` | Check whether the current app-facing SDK layer already gives applications one app-owned schema/codegen story | The frontend SDK is transport-oriented and the shared contracts package is platform-oriented; neither currently defines one app-owned business-schema/codegen layer | Yes |
| 2026-04-19 | Code/Doc | `applications/socratic-math-teacher/backend/dist/entry.mjs`, `applications/socratic-math-teacher/README.md`, `applications/brief-studio/README.md` | Understand how the two in-repo teaching apps currently teach the model | Socratic Math Teacher is intentionally minimal and not a real business-API example; Brief Studio is deeper but still does not teach app-owned GraphQL-backed API/schema patterns | Yes |
| 2026-04-19 | Code | `autobyteus-server-ts/src/api/rest/application-backends.ts` | Verify the exact current mounted backend path shapes and how much of the new virtual-backend-mount design already exists physically | Current backend surfaces already live under `/applications/:applicationId/backend/{status,queries,commands,graphql,routes/*}`; the target design should keep that mount and make one `backendBaseUrl` authoritative in iframe/bootstrap transport | No |
| 2026-04-19 | Spec | `tickets/in-progress/application-owned-runtime-orchestration/design-review-report.md` | Fold architecture review round 1 findings back into the authoritative design package | Review accepted the requirements basis but blocked the design on three items: concrete restart recovery ownership, unified lifecycle observation boundary, and single publication-ingress authority | Yes |
| 2026-04-19 | Spec | `tickets/in-progress/application-owned-runtime-orchestration/design-review-report.md` (round 2) | Fold architecture review round 2 findings back into the authoritative design package | Round 1 blockers were resolved; the remaining design gap is startup coordination: the design must explicitly serialize live `runtimeControl` / artifact ingress traffic against recovery-time lookup rebuild and observer reattachment | Yes |
| 2026-04-19 | Spec | `tickets/in-progress/application-owned-runtime-orchestration/design-review-report.md` (round 5) | Fold architecture review round 5 finding back into the authoritative design package | The binding-centric model is cleaner, but direct `startRun(...)` still needs one explicit pending-intent / reconciliation contract so newly created bindings can be durably attached to app business records before early events rely on that mapping | Yes |
| 2026-04-20 | Code | `autobyteus-server-ts/src/application-bundles/services/application-bundle-service.ts`, `application-bundles/providers/file-application-bundle-provider.ts`, `application-bundles/utils/application-manifest.ts` | Verify whether application bundle validation failures are isolated or fatal | `ApplicationBundleService.populateCache()` still lets one manifest parse/validation failure throw across the whole cache population path; `parseApplicationManifest(...)` throws on unsupported manifest version, so one bad imported app can poison startup-time application discovery | Yes |
| 2026-04-20 | Code | `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-recovery-service.ts`, `application-execution-event-dispatch-service.ts` | Verify whether the new orchestration startup flow currently depends on globally valid application discovery | Recovery and pending-event resume currently enumerate applications through `ApplicationBundleService.listApplications()`, so invalid app discovery must be quarantined explicitly in the design or startup still fails too globally | Yes |
| 2026-04-20 | Other | User-reported installed desktop behavior plus follow-up clarification in this ticket thread | Capture the new product/design requirement from observed desktop startup failure and UX feedback | User reported that stale or manifest-incompatible imported apps can crash startup after the server begins listening, and clarified that the old launch configuration form should survive as persisted resource configuration for app runtime resources rather than as a run-launch modal | Yes |
| 2026-04-20 | Spec/Code | `tickets/in-progress/application-owned-runtime-orchestration/design-review-report.md` (round 7), `autobyteus-application-sdk-contracts/src/index.ts`, `autobyteus-server-ts/src/application-bundles/utils/application-manifest.ts`, `autobyteus-server-ts/docs/modules/applications.md` | Resolve the round-7 blockers around quarantined-app re-entry and app-declared resource-slot metadata | The review requires one authoritative repair/reload -> quarantine-exit -> recovery/dispatch re-entry contract, and the existing manifest v3 contract is already the natural host-readable place to declare and validate app-configurable `resourceSlots` before any backend worker boots | Yes |
| 2026-04-20 | Code | `applications/brief-studio/frontend-src/brief-studio-runtime.js`, `applications/brief-studio/frontend-src/index.html`, `applications/brief-studio/backend-src/services/brief-run-launch-service.ts`, `applications/socratic-math-teacher/backend-src/services/lesson-runtime-service.ts` | Verify whether the teaching apps still leak runtime knobs into the primary app UI and whether application-mode tool execution is already auto-approved in sample backends | Brief Studio still asks for an LLM model identifier in the main app canvas, which dilutes the business-first teaching story; meanwhile both Brief Studio and Socratic Math Teacher backend launch services already hardcode `autoExecuteTools: true`, which matches the desired application-mode default and should be codified in the design | Yes |
| 2026-04-20 | Visual review | User-provided screenshots in this ticket thread showing Brief Studio detail view and Applications catalog cards | Validate whether the latest UI still overexposes runtime concepts in surfaces that should now be business-first | Screenshot 1 shows valid business actions (`Approve` / `Reject`) but still exposes raw runtime wording and diagnostics too prominently (`Launch draft run`, latest binding/run, execution history). Screenshot 2 shows the Applications catalog still foregrounding `Agent team` and bundle-resource details on the main card. The design should keep business actions but demote runtime ids/labels to advanced surfaces and use the pre-entry config gate for runtime/model/workspace setup. | Yes |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - Browser route `/applications/[id]`
  - `ApplicationShell.vue` -> `applicationSessionStore.bindApplicationRoute(...)`
  - `createApplicationSession` GraphQL mutation when the user launches/relaunches
- Current execution flow:
  - `ApplicationCard/ApplicationShell` -> `applicationSessionStore.prepareLaunchDraft()`
  - host-owned launch modal builds low-level agent/team launch config from the bound `runtimeTarget`
  - `createApplicationSession` mutation -> `ApplicationSessionService.createApplicationSession(...)`
  - service immediately creates one agent run or one team run from the bundle `runtimeTarget`
  - session snapshot is persisted as the authoritative page/runtime identity
  - iframe bootstrap v1 receives `applicationSessionId`, runtime identity, and backend/session transport URLs
  - runtime `publish_artifact` calls resolve app identity via injected `applicationSessionContext`
  - platform updates retained session projection and journals an app event dispatch envelope
- Ownership or boundary observations:
  - `applicationSession` is overloaded: launch identity, live runtime identity, retained execution view, publication routing owner, and frontend route-binding owner all at once
  - application frontend host owns run launch configuration before the application backend gets a chance to apply domain logic
  - current application bundle discovery can still fail too globally when one imported application path is stale or one manifest is incompatible
  - the existing host launch configuration form is useful UX for resource setup, but today it is coupled to immediate run creation semantics
  - bundle manifest/catalog layer leaks singular runtime semantics into every downstream layer
  - backend gateway and engine are cleaner than the session model and are good foundations for the target design
- Current behavior summary:
  - The current system is architecturally optimized for “one launched app page == one live run or team run” rather than “one application backend orchestrates zero/one/many runs over time”

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-bundles/domain/models.ts` | Application catalog entry shape | `ApplicationCatalogEntry` still includes singular `runtimeTarget` | Catalog contract must stop making runtime target the application identity |
| `autobyteus-server-ts/src/application-sessions/services/application-session-service.ts` | Launch, bind, input, terminate session | Launching an app always creates one underlying run and replaces prior live session | This owner must be replaced, not merely extended |
| `autobyteus-server-ts/src/application-sessions/services/application-publication-service.ts` | Session projection + journal + dispatch | Artifact routing and lifecycle events are session-based | Publication routing should move under run binding / execution context ownership |
| `autobyteus-server-ts/src/application-engine/services/application-engine-host-service.ts` | App worker lifecycle | Already starts/stops a backend worker independently of runs | Reuse as the backend runtime owner for application launch |
| `autobyteus-server-ts/src/application-backend-gateway/services/application-backend-gateway-service.ts` | App-owned backend transport boundary | Already keyed by `applicationId`; session context is secondary | Reuse and simplify instead of rebuilding |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | Standalone agent run lifecycle | Reusable execution resource service; current app coupling is injected context only | Reuse behind a higher orchestration boundary |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | Team run lifecycle | Reusable execution resource service with member-targeted input | Reuse behind a higher orchestration boundary |
| `autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts` | Worker-side backend context | Missing runtime-control API to host/orchestration layer | Add authoritative worker->host orchestration bridge here |
| `autobyteus-application-sdk-contracts/src/index.ts` | Shared author-facing types | Contracts are still session-centric and runtimeTarget-centric | Clean-cut contract version upgrade is required |
| `autobyteus-web/stores/applicationSessionStore.ts` | Frontend session cache + launch orchestration | Host UI owns launch draft/modal/session stream/runtime bootstrap | Replace with engine-first host launch; remove session-centric UI flow |
| `autobyteus-web/types/application/ApplicationIframeContract.ts` | Iframe bootstrap contract | v1 requires `applicationSessionId` and runtime identity up front | New bootstrap version must detach app launch from worker-run creation |
| `applications/brief-studio/backend-src/services/brief-projection-service.ts` | Sample app projection logic | `briefId` is derived from `applicationSessionId` | Sample app must be migrated to real app-owned business IDs plus app-owned `briefId -> bindingId` mapping |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-19 | Setup | Dedicated worktree creation from refreshed `origin/personal` | Authoritative artifacts are now isolated on `codex/application-owned-runtime-orchestration` | Safe to continue deeper work and design in the proper workspace |
| 2026-04-19 | Probe | Static code/doc tracing across server, web, SDK, and sample app | The old session-owned model is encoded in multiple layers, not one isolated service | Design must cover contracts + SDKs + frontend host + sample migration, not only server internals |
| 2026-04-19 | Probe | Search for `applicationSessionId`, `runtimeTarget`, `publish_artifact`, `targetMemberName` | Session identity and singular runtime target are the main coupling points; targeted member input itself is not the blocker | Focus the redesign on ownership/binding/publication, not on team-member addressing |

## External / Public Source Findings

- None required for this ticket; investigation is grounded in local repo code/docs and current artifact drafts

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures:
  - None for the design phase; investigation was static and architecture-level
- Required config, feature flags, env vars, or accounts:
  - None beyond normal repo access and git remote access for bootstrap
- External repos, samples, or artifacts cloned/downloaded for investigation:
  - None
- Setup commands that materially affected the investigation:
  - `git fetch origin`
  - `git worktree add -b codex/application-owned-runtime-orchestration /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration origin/personal`
- Cleanup notes for temporary investigation-only setup:
  - None yet; dedicated ticket worktree should remain active for downstream implementation

## Findings From Code / Docs / Data / Logs

- The current platform already has the right major foundations for the target model:
  - application bundle discovery/validation
  - application backend engine lifecycle
  - application-owned storage
  - application-scoped backend gateway
  - agent/team run execution services
  - durable at-least-once event dispatch to app backends
- The main architectural problem is ownership, not missing capabilities:
  - launch == session == run is the wrong governing model
  - the frontend host currently owns too much low-level runtime-launch responsibility
  - the bundle contract forces one singular launch-time runtime target
  - app-visible runtime outputs are projected into platform-retained session views instead of staying app-owned
- The cleanest target direction is to remove `applicationSession` as a durable authoritative concept and replace it with:
  - engine-first application launch,
  - platform-owned run bindings / `bindingId`,
  - app-owned business-record-to-binding mapping,
  - backend-owned orchestration through a worker->host bridge,
  - publication/event routing by binding + execution context rather than session
- The current platform already has a good app-scoped transport host in `application-backend-gateway`, but it still lacks one explicit design for app-owned business API/schema ownership:
  - the platform should host one virtual backend mount per `applicationId`,
  - the current mounted route family in `application-backends.ts` is already the right physical shape and should be formalized around one authoritative `backendBaseUrl`,
  - each app should own its own GraphQL/routes/DTO schema,
  - frontend type/code generation should come from app-owned schema artifacts or shared app-owned contracts during the app build, not from one platform-owned business-schema layer
- The cross-boundary correlation model is cleaner when the platform centers `bindingId` rather than one platform-owned generic business-reference field:
  - the platform needs durable `bindingId` + `runId` routing and recovery,
  - the application keeps any `ticketId` / `briefId` / `lessonId` -> `bindingId` mapping in app-owned state, and
  - normalized runtime events therefore need binding identity and run identity, not a platform-owned generic business reference
- Application/package validation failures are a platform robustness problem when they sit on the global startup path:
  - current bundle discovery still throws globally on one unsupported manifest or stale imported package path,
  - startup recovery and event-dispatch resume currently depend on successful application enumeration, and
  - the target design therefore must quarantine invalid applications as diagnostics rather than treating them as fatal startup prerequisites
- The existing host launch form should be reused as a persisted resource-configuration surface rather than deleted outright:
  - agent/team resource selection plus launch-default fields are still needed somewhere,
  - the wrong part of the old model is the implicit run-start semantics, not the existence of a configuration UI, and
  - the target design should separate persisted application resource setup from later app-owned `runtimeControl.startRun(...)` decisions
- Application-mode tool approval should be automatic in this ticket's generic app flow:
  - the sample backends already launch with `autoExecuteTools: true`,
  - the generic host does not own a per-tool mid-run approval loop, and
  - the design should therefore normalize application-mode launches to auto-approved tool execution instead of surfacing a dead approval toggle

- Latest user clarification on `2026-04-20` further tightens the teaching-app direction:
  - Brief Studio and Socratic Math Teacher should be redesigned as complete business-first apps rather than partial runtime demos,
  - runtime/model/workspace setup belongs in the pre-entry host resource-configuration flow rather than in the app canvases, and
  - the host should be able to collect required resource-slot configuration before those apps become actionable.

- Latest user clarification after the business-first sample-app discussion further tightens the host UX choice:
  - pre-entry configuration should happen before the app really opens,
  - the simple first-cut behavior of showing that configuration form on every launch is acceptable, as long as saved values are reused/prefilled, and
  - this reinforces that the app canvases themselves should not carry runtime/model/approval setup concerns.

- The latest screenshot review adds one more concrete UI-design obligation:
  - `Approve` / `Reject` in Brief Studio are acceptable because they are business review workflow,
  - but wording like `Launch draft run` and sections dominated by `bindingId` / `runId` / `execution history` are still too platform-exposed for the main business canvas, and
  - the Applications catalog should also stop foregrounding `Agent team` / bundle-resource labels on the primary card surface.
- Brief Studio's main canvas currently leaks low-level runtime tuning (`llmModelIdentifier`) into the business UI:
  - that field should move into host-managed resource configuration or an advanced/developer-only path,
  - the host-managed configuration should be able to own platform launch defaults such as model/runtime/workspace when those are needed by the app's configured resource slot,
  - missing required slot configuration should be collected before the teaching app becomes actionable, and
  - business review actions such as `approveBrief` / `rejectBrief` stay in the app because they are domain workflow, not runtime approval
- Quarantined-application repair/reload needs its own explicit owner and app-scoped availability contract:
  - restart-only recovery is not sufficient once the platform promises that broken imported apps are repairable in place,
  - the design therefore needs one owner for `repair/reload -> REENTERING -> per-app recovery slice -> dispatch resume -> ACTIVE`, and
  - live backend/runtime-control/event-dispatch behavior must be explicit while that app-scoped re-entry is in flight
- The cleanest authoritative resource-slot declaration home is the application manifest itself:
  - host setup must be able to read slot metadata before any worker boots or any app backend code runs,
  - bundle discovery is already the platform-owned validation point for application package metadata, and
  - persisted configuration writes can then validate `slotKey`, allowed resource kind/owner, and optional bundle-local default resource references against the same manifest-declared source of truth
- The two in-repo teaching applications should be strengthened as part of the target:
  - `brief-studio` should teach a richer real app business API rather than only query/command/event patterns,
  - `socratic-math-teacher` should stop being only a minimal runtime-target/bootstrap example and become a real app-owned API example as well,
  - their primary UIs should stay focused on briefs/lessons/business workflow rather than low-level runtime tuning,
  - business actions such as drafting, approving, rejecting, or asking follow-up questions may stay in-app, but raw runtime ids/labels should move out of the main canvas, and
  - application-mode tool execution should remain auto-approved in those teaching flows instead of surfacing a dead approval-step UX
- Architecture review round 1 exposed three concrete design obligations that the final design must satisfy:
  - restart recovery needs a named startup owner, authoritative store choice, lookup-index rebuild strategy, and eager observer reattachment story,
  - orchestration needs one normalized lifecycle-observation boundary above both agent execution and team execution,
  - artifact publications and lifecycle-generated app events must share one execution-event ingress authority rather than split routing ownership
- Architecture review round 2 added one more concrete design obligation:
  - startup readiness cannot be inferred from raw `app.listen(...)`; the design needs one authoritative gate that prevents live orchestration-sensitive traffic from racing with recovery-time rebuild work
- User direction after round 2 added one more product-design obligation:
  - the platform should host, not own, application business APIs/schemas, and the sample apps should teach that by exposing real app-owned GraphQL-backed APIs
- User clarification after the app-owned API deepening added one more design obligation:
  - the platform should not require one strange generic business-reference field in run bindings when `bindingId` plus app-owned mapping is the more natural correlation model
- Architecture review round 5 added one more concrete design obligation:
  - direct `startRun(...)` needs one explicit pending-intent / reconciliation contract so a newly created `bindingId` can be durably attached to the intended app business record before early lifecycle/artifact events rely on that mapping, including the crash window after binding creation but before app-owned mapping commit completes
- User clarification on `2026-04-20` added two more concrete design obligations:
  - invalid imported/bundled application content must be quarantined from core startup so one bad manifest or stale path never crashes AutoByteus itself, and
  - the old host launch form should be repurposed into persisted application resource configuration for app-declared runtime resources instead of being deleted as if no such setup UI were needed

## Constraints / Dependencies / Compatibility Facts

- Current bundled applications, SDKs, and frontend host code are all aligned around session-owned launch behavior; a real fix requires coordinated versioned contract changes
- Current backend gateway and engine lifecycle owners are good and should be reused rather than rewritten
- Current agent/team run services are useful execution-resource owners and should stay behind a new orchestration boundary
- Current per-app platform state is useful for app-scoped journaling, but publication routing by `runId` will need an efficient cross-app lookup strategy in the target design
- Current application discovery/cache population and orchestration startup flow are still coupled enough that invalid application content must be explicitly isolated in the target design
- The existing host launch configuration UI is a reusable asset, but its semantics must be rewritten around persisted resource setup rather than immediate run creation
- Existing sample apps such as Brief Studio currently teach the old model and therefore must be migrated as part of any clean-cut target
- The current frontend SDK intentionally stays transport-level, which means app-owned business API typing/code generation must be designed as an application-owned concern rather than as something inferred from platform transport types

## Open Unknowns / Risks

- Shared platform resource policy / authorization is still product-open and should remain abstract in the design
- The current host-native retained execution view may need to be removed before a richer app-owned replacement is available in every sample app
- A contract upgrade that removes `runtimeTarget` and `applicationSessionId` is broad; migration sequencing must be explicit even though the target state rejects legacy dual-path behavior
- The exact optional packaging/story for app-owned GraphQL schema artifacts, OpenAPI artifacts, or generated frontend clients should stay subordinate to the principle that business schemas belong to each application
- Launch-default normalization for persisted resource configuration still needs careful implementation detail work, but the authoritative slot declaration home itself should no longer remain open: it belongs in application manifest metadata that bundle discovery validates before worker boot

## Architecture Review Round 1 Rework Summary

- Review result: `Fail`
- Requirements basis status: sufficient
- Rework focus:
  - `AOR-DI-001`: add a concrete recovery/resume spine with explicit startup owner and authoritative/derived storage roles
  - `AOR-DI-002`: define one orchestration-facing lifecycle observation boundary and map the exact `agent-execution` / `agent-team-execution` extensions needed
  - `AOR-DI-003`: collapse execution-event publication and lifecycle journaling behind one authoritative ingress owner
- Authoritative design response:
  - `design-spec.md` now introduces `DS-007` governed by `ApplicationOrchestrationRecoveryService`
  - `design-spec.md` now defines `AgentRunService.observeAgentRunLifecycle(...)`, `TeamRunService.observeTeamRunLifecycle(...)`, and `ApplicationBoundRunLifecycleGateway`
  - `design-spec.md` now makes `ApplicationExecutionEventIngressService` the sole owner allowed to append immutable app-event journal rows

## Architecture Review Round 2 Rework Summary

- Review result: `Fail`
- Round-1 findings status:
  - `AOR-DI-001`: resolved
  - `AOR-DI-002`: resolved
  - `AOR-DI-003`: resolved
- Rework focus:
  - `AOR-DI-004`: define one authoritative startup coordination boundary so live orchestration-sensitive traffic cannot race with recovery-time lookup rebuild or observer reattachment
- Authoritative design response:
  - `design-spec.md` now makes `ApplicationOrchestrationStartupGate` the governing owner of `DS-007`
  - `design-spec.md` now adds a `Startup Coordination / Traffic Admission Contract`
  - `design-spec.md` now defines the exact enforcement points:
    - `server-runtime.ts` enters `runStartupRecovery(...)`
    - `ApplicationOrchestrationHostService` waits on `awaitReady()`
    - live `publish_artifact` traffic waits on `awaitReady()` before entering `ApplicationExecutionEventIngressService`

## Architecture Review Round 5 Rework Summary

- Review result: `Fail`
- Prior finding status:
  - round 1 blockers: resolved
  - round 2 blocker: resolved
  - round 5 introduced a new binding-establishment blocker
- Rework focus:
  - `AOR-DI-005`: define one authoritative pending-intent / reconciliation contract for direct `startRun(...)` flows so business-record-to-binding mapping is restart-safe and race-safe without restoring a generic business-reference field
- Authoritative design response:
  - requirements now add `R-040`..`R-043`, `AC-024`..`AC-026`, and `UC-020`
  - the design now introduces an explicit direct `startRun(...)` correlation-establishment contract based on app-owned pending binding intent plus opaque `bindingIntentId`
  - event envelopes and binding summaries are updated to carry `bindingIntentId`, and reconciliation lookup by `bindingIntentId` is added for crash recovery

## App-Owned API / Schema Deepening Summary

- User direction: each application should own its own frontend/backend schema story “like a normal application,” while the platform should host one app-scoped backend mount instead of spinning up a separate per-app server
- Design deepening focus:
  - make the app-owned business API/schema model explicit in requirements and design,
  - define the hosted virtual backend mount under `applicationId` around one authoritative `backendBaseUrl`,
  - keep platform transport/runtime contracts separate from app-owned business schema contracts,
  - make `bindingId` the primary cross-boundary correlation handle instead of a platform-owned generic business-reference field,
  - add one direct-start correlation-establishment contract based on app-owned pending binding intent plus reconciliation, and
  - upgrade `brief-studio` and `socratic-math-teacher` from thin samples to real app-owned API teaching samples with GraphQL-backed examples and generated clients
- Authoritative design direction:
  - app-owned GraphQL schemas should remain the application’s own schema and should not be translated into a platform-owned schema layer,
  - route-based application APIs should remain first-class for apps that choose that model,
  - `bindingId` should be the primary platform/app correlation handle while app business-record mapping stays app-owned,
  - direct `startRun(...)` should be guarded by an app-owned pending-binding intent plus opaque `bindingIntentId` and reconciliation lookup contract, and
  - query/command surfaces may remain as conveniences but should not be the only “real app” story

## Notes For Architect Reviewer

- User explicitly asked for a design that is not constrained by the current architecture and that may reorganize server/contracts/frontend SDK/backend SDK structure when needed
- The recommendation coming out of investigation is a clean-cut design that replaces `applicationSession` rather than trying to grow it into a multi-run abstraction
- Reuse should focus on: `application-engine`, `application-backend-gateway`, `application-storage`, `agent-run-service`, and `team-run-service`
- Major removals are likely necessary in: `application-sessions`, session streaming, session-bound iframe bootstrap, host launch-now semantics, and `runtimeTarget`-based app catalog assumptions
- The follow-up design pass should also make invalid-application startup isolation and persisted application resource configuration explicit so review does not infer that either concern remains out of scope
- Architecture review round 1 blockers have been incorporated into the revised design package
- Architecture review round 2 blocker has now been incorporated as an explicit startup gate / traffic-admission contract; re-review should concentrate on whether the new startup coordination boundary is now concrete enough for implementation
- This design pass also expands the ticket beyond orchestration-core mechanics so the resulting architecture clearly explains app-owned business API/schema ownership, binding-centric cross-boundary correlation, pending-binding-intent establishment/reconciliation, and stronger example-app teaching patterns

## Architecture Review Round 7 Rework Summary

- Review result: `Fail`
- Prior finding status:
  - round 1 blockers: resolved
  - round 2 blocker: resolved
  - round 5 blocker: resolved
  - round 7 introduced two new design-impact blockers
- Rework focus:
  - `AOR-DI-006`: define one authoritative repair/reload -> quarantine-exit -> recovery/dispatch re-entry contract for invalid applications
  - `AOR-DI-007`: choose one authoritative resource-slot declaration home and validation contract for persisted application resource configuration
- Authoritative design response direction:
  - the design should add one app-scoped availability/re-entry owner that supports per-application hot re-entry (`QUARANTINED -> REENTERING -> ACTIVE`) without requiring full platform restart,
  - bundle reload/validation should remain with `ApplicationBundleService`, but per-app recovery re-entry and dispatch resume should be coordinated through one orchestration-side owner,
  - live backend/runtime-control/event-dispatch behavior must be explicit while one app is re-entering, and
  - `ApplicationManifestV3.resourceSlots` should become the authoritative host-readable declaration contract for persisted slot setup, with manifest validation plus configuration-write validation both enforcing the same slot metadata rules.
